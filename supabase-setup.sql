-- FusionSolar Analysis Center — Supabase schema
-- Run once in Supabase Dashboard > SQL Editor as the project owner.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);

-- A compact, normalized copy of uploaded report data. The original Excel
-- binary is intentionally not stored. One dataset can feed both analyses and
-- be reused by every project in the same workspace.
create table if not exists public.shared_datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  fingerprint text not null,
  source_files text[] not null default '{}',
  normalized_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,fingerprint)
);

create index if not exists shared_datasets_workspace_idx on public.shared_datasets(workspace_id,updated_at desc);

create or replace function public.protect_workspace_owner()
returns trigger language plpgsql set search_path=public
as $$
begin
  if exists(select 1 from public.workspaces where id=old.workspace_id and owner_id=old.user_id)
     and (tg_op='DELETE' or new.role<>'admin') then
    raise exception 'workspace_owner_must_remain_admin';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_workspace_owner_member on public.workspace_members;
create trigger protect_workspace_owner_member before update or delete on public.workspace_members
for each row execute function public.protect_workspace_owner();

create table if not exists public.analysis_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('working_day','global_irradiance')),
  name text not null,
  period_key text,
  status text not null default 'draft' check (status in ('draft','in_progress','completed','archived')),
  source_files text[] not null default '{}',
  base_data jsonb not null default '{}'::jsonb,
  user_state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.analysis_projects
  add column if not exists dataset_id uuid references public.shared_datasets(id) on delete set null;

create index if not exists analysis_projects_workspace_idx on public.analysis_projects(workspace_id,updated_at desc) where deleted_at is null;
create index if not exists analysis_projects_type_idx on public.analysis_projects(analysis_type,period_key) where deleted_at is null;

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.analysis_projects(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_project_idx on public.activity_logs(project_id,created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,email,display_name)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'display_name',split_part(coalesce(new.email,''),'@',1)))
  on conflict(id) do update set email=excluded.email,updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles(id,email,display_name)
select id,coalesce(email,''),coalesce(raw_user_meta_data->>'display_name',split_part(coalesce(email,''),'@',1))
from auth.users on conflict(id) do update set email=excluded.email,updated_at=now();

create or replace function public.workspace_role(p_workspace uuid)
returns text language sql stable security definer set search_path=public
as $$ select role from public.workspace_members where workspace_id=p_workspace and user_id=auth.uid() $$;

create or replace function public.is_workspace_member(p_workspace uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=auth.uid()) $$;

create or replace function public.can_edit_workspace(p_workspace uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.workspace_role(p_workspace) in ('admin','editor'),false) $$;

create or replace function public.is_workspace_admin(p_workspace uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.workspace_role(p_workspace)='admin',false) $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.shared_datasets enable row level security;
alter table public.analysis_projects enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_same_workspace_select on public.profiles;
create policy profiles_same_workspace_select on public.profiles for select to authenticated
using(id=auth.uid() or exists(
  select 1 from public.workspace_members mine join public.workspace_members theirs using(workspace_id)
  where mine.user_id=auth.uid() and theirs.user_id=profiles.id
));

drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces for select to authenticated using(public.is_workspace_member(id));

drop policy if exists members_member_select on public.workspace_members;
create policy members_member_select on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists members_admin_insert on public.workspace_members;
create policy members_admin_insert on public.workspace_members for insert to authenticated with check(public.is_workspace_admin(workspace_id));
drop policy if exists members_admin_update on public.workspace_members;
create policy members_admin_update on public.workspace_members for update to authenticated using(public.is_workspace_admin(workspace_id)) with check(public.is_workspace_admin(workspace_id));
drop policy if exists members_admin_delete on public.workspace_members;
create policy members_admin_delete on public.workspace_members for delete to authenticated using(public.is_workspace_admin(workspace_id));

drop policy if exists datasets_member_select on public.shared_datasets;
create policy datasets_member_select on public.shared_datasets for select to authenticated
using(public.is_workspace_member(workspace_id));
drop policy if exists datasets_editor_insert on public.shared_datasets;
create policy datasets_editor_insert on public.shared_datasets for insert to authenticated
with check(public.can_edit_workspace(workspace_id) and created_by=auth.uid() and updated_by=auth.uid());
drop policy if exists datasets_editor_update on public.shared_datasets;
create policy datasets_editor_update on public.shared_datasets for update to authenticated
using(public.can_edit_workspace(workspace_id)) with check(public.can_edit_workspace(workspace_id));
drop policy if exists datasets_admin_delete on public.shared_datasets;
create policy datasets_admin_delete on public.shared_datasets for delete to authenticated
using(public.is_workspace_admin(workspace_id));

drop policy if exists projects_member_select on public.analysis_projects;
create policy projects_member_select on public.analysis_projects for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists projects_editor_insert on public.analysis_projects;
create policy projects_editor_insert on public.analysis_projects for insert to authenticated
with check(public.can_edit_workspace(workspace_id) and created_by=auth.uid() and updated_by=auth.uid());
drop policy if exists projects_editor_update on public.analysis_projects;
create policy projects_editor_update on public.analysis_projects for update to authenticated
using(public.can_edit_workspace(workspace_id)) with check(public.can_edit_workspace(workspace_id));

drop policy if exists logs_member_select on public.activity_logs;
create policy logs_member_select on public.activity_logs for select to authenticated using(public.is_workspace_member(workspace_id));

create or replace function public.save_analysis_project(
  p_project_id uuid,
  p_expected_version bigint,
  p_base_data jsonb,
  p_user_state jsonb,
  p_period_key text,
  p_source_files text[],
  p_change_summary jsonb default '{}'::jsonb
)
returns public.analysis_projects
language plpgsql security definer set search_path=public
as $$
declare v_project public.analysis_projects;
begin
  select * into v_project from public.analysis_projects where id=p_project_id and deleted_at is null;
  if not found then raise exception 'project_not_found' using errcode='P0002'; end if;
  if not public.can_edit_workspace(v_project.workspace_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if v_project.version<>p_expected_version then raise exception 'version_conflict' using errcode='40001'; end if;

  update public.analysis_projects set
    base_data=coalesce(p_base_data,base_data), user_state=coalesce(p_user_state,user_state),
    period_key=coalesce(p_period_key,period_key), source_files=coalesce(p_source_files,source_files),
    status=case when status='draft' then 'in_progress' else status end,
    version=version+1,updated_by=auth.uid(),updated_at=now()
  where id=p_project_id and version=p_expected_version returning * into v_project;

  if not found then raise exception 'version_conflict' using errcode='40001'; end if;
  insert into public.activity_logs(workspace_id,project_id,actor_id,action,details)
  values(v_project.workspace_id,v_project.id,auth.uid(),'save',coalesce(p_change_summary,'{}'::jsonb)||jsonb_build_object('version',v_project.version));
  return v_project;
end;
$$;

create or replace function public.soft_delete_project(p_project_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.analysis_projects where id=p_project_id and deleted_at is null;
  if not public.is_workspace_admin(v_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  update public.analysis_projects set deleted_at=now(),updated_at=now(),updated_by=auth.uid(),version=version+1 where id=p_project_id;
  insert into public.activity_logs(workspace_id,project_id,actor_id,action) values(v_workspace,p_project_id,auth.uid(),'archive');
end;
$$;

create or replace function public.add_workspace_member_by_email(p_workspace uuid,p_email text,p_role text)
returns void language plpgsql security definer set search_path=public
as $member$
declare v_user uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if p_role not in ('admin','editor','viewer') then raise exception 'invalid_role'; end if;
  if length(trim(coalesce(p_email,''))) not between 3 and 320 then raise exception 'invalid_email'; end if;
  select id into v_user from public.profiles where lower(email)=lower(trim(p_email));
  if v_user is null then raise exception 'user_not_found'; end if;
  if exists(select 1 from public.workspaces where id=p_workspace and owner_id=v_user) and p_role<>'admin'
    then raise exception 'workspace_owner_must_remain_admin'; end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(p_workspace,v_user,p_role)
  on conflict(workspace_id,user_id) do update set role=excluded.role;
  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'member_add_or_update',jsonb_build_object('user_id',v_user,'role',p_role));
end;
$member$;

create or replace function public.attach_dataset_to_project(p_project_id uuid,p_dataset_id uuid)
returns public.analysis_projects language plpgsql security definer set search_path=public
as $$
declare v_project public.analysis_projects; v_dataset public.shared_datasets;
begin
  select * into v_project from public.analysis_projects where id=p_project_id and deleted_at is null;
  if not found then raise exception 'project_not_found'; end if;
  if not public.can_edit_workspace(v_project.workspace_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  select * into v_dataset from public.shared_datasets where id=p_dataset_id and workspace_id=v_project.workspace_id;
  if not found then raise exception 'dataset_not_found'; end if;
  update public.analysis_projects set dataset_id=p_dataset_id,base_data='{}'::jsonb,
    source_files=v_dataset.source_files,updated_by=auth.uid(),updated_at=now(),version=version+1
  where id=p_project_id returning * into v_project;
  insert into public.activity_logs(workspace_id,project_id,actor_id,action,details)
  values(v_project.workspace_id,v_project.id,auth.uid(),'attach_dataset',jsonb_build_object('dataset_id',p_dataset_id,'dataset_name',v_dataset.name));
  return v_project;
end;
$$;

do $$
declare v_admin uuid; v_workspace uuid;
begin
  select id into v_admin from public.profiles where lower(email)='solargm123@gmail.com';
  if v_admin is null then raise exception 'Admin user solargm123@gmail.com was not found in Authentication > Users'; end if;
  select id into v_workspace from public.workspaces where owner_id=v_admin limit 1;
  if v_workspace is null then
    insert into public.workspaces(name,owner_id) values('BGPL Solar Engineering',v_admin) returning id into v_workspace;
  end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(v_workspace,v_admin,'admin')
  on conflict(workspace_id,user_id) do update set role='admin';
end $$;

grant usage on schema public to authenticated;
grant select on public.profiles,public.workspaces,public.workspace_members,public.shared_datasets,public.analysis_projects,public.activity_logs to authenticated;
grant insert,update on public.analysis_projects to authenticated;
grant insert,update,delete on public.shared_datasets to authenticated;
grant insert,update,delete on public.workspace_members to authenticated;
grant usage,select on sequence public.activity_logs_id_seq to authenticated;
grant execute on function public.workspace_role(uuid),public.is_workspace_member(uuid),public.can_edit_workspace(uuid),public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.save_analysis_project(uuid,bigint,jsonb,jsonb,text,text[],jsonb) to authenticated;
grant execute on function public.soft_delete_project(uuid),public.add_workspace_member_by_email(uuid,text,text) to authenticated;
grant execute on function public.attach_dataset_to_project(uuid,uuid) to authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='analysis_projects') then
    alter publication supabase_realtime add table public.analysis_projects;
  end if;
end $$;


-- ============================================================
-- DATABASE SAFETY HARDENING v2
-- All browser writes go through audited SECURITY DEFINER RPCs.
-- The publishable key may remain in the browser; authorization is
-- enforced here with auth.uid(), workspace membership and RLS.
-- ============================================================

create or replace function public.create_analysis_project(
  p_workspace uuid,
  p_analysis_type text,
  p_name text
)
returns public.analysis_projects
language plpgsql security definer set search_path=public
as $$
declare v_project public.analysis_projects;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.can_edit_workspace(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if p_analysis_type not in ('working_day','global_irradiance','pr_report') then raise exception 'invalid_analysis_type'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'invalid_project_name'; end if;

  insert into public.analysis_projects(workspace_id,analysis_type,name,created_by,updated_by)
  values(p_workspace,p_analysis_type,trim(p_name),auth.uid(),auth.uid())
  returning * into v_project;

  insert into public.activity_logs(workspace_id,project_id,actor_id,action,details)
  values(p_workspace,v_project.id,auth.uid(),'create',jsonb_build_object('analysis_type',p_analysis_type));
  return v_project;
end;
$$;

create or replace function public.upsert_shared_dataset(
  p_workspace uuid,
  p_name text,
  p_fingerprint text,
  p_source_files text[],
  p_normalized_data jsonb
)
returns public.shared_datasets
language plpgsql security definer set search_path=public
as $$
declare v_dataset public.shared_datasets;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.can_edit_workspace(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 180 then raise exception 'invalid_dataset_name'; end if;
  if length(trim(coalesce(p_fingerprint,''))) not between 1 and 2000 then raise exception 'invalid_fingerprint'; end if;
  if jsonb_typeof(coalesce(p_normalized_data,'{}'::jsonb)) <> 'object' then raise exception 'invalid_dataset_payload'; end if;
  if octet_length(coalesce(p_normalized_data,'{}'::jsonb)::text) > 15728640 then raise exception 'dataset_too_large'; end if;
  if coalesce(array_length(p_source_files,1),0) > 100 then raise exception 'too_many_source_files'; end if;

  insert into public.shared_datasets(
    workspace_id,name,fingerprint,source_files,normalized_data,created_by,updated_by
  )
  values(
    p_workspace,trim(p_name),trim(p_fingerprint),coalesce(p_source_files,'{}'),coalesce(p_normalized_data,'{}'),auth.uid(),auth.uid()
  )
  on conflict(workspace_id,fingerprint) do update set
    name=excluded.name,
    source_files=excluded.source_files,
    normalized_data=excluded.normalized_data,
    updated_by=auth.uid(),
    updated_at=now()
  returning * into v_dataset;

  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'dataset_upsert',
    jsonb_build_object('dataset_id',v_dataset.id,'dataset_name',v_dataset.name));
  return v_dataset;
end;
$$;

create or replace function public.save_analysis_project(
  p_project_id uuid,
  p_expected_version bigint,
  p_base_data jsonb,
  p_user_state jsonb,
  p_period_key text,
  p_source_files text[],
  p_change_summary jsonb default '{}'::jsonb
)
returns public.analysis_projects
language plpgsql security definer set search_path=public
as $$
declare v_project public.analysis_projects;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_project from public.analysis_projects where id=p_project_id and deleted_at is null;
  if not found then raise exception 'project_not_found' using errcode='P0002'; end if;
  if not public.can_edit_workspace(v_project.workspace_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if v_project.version<>p_expected_version then raise exception 'version_conflict' using errcode='40001'; end if;
  if p_base_data is not null and jsonb_typeof(p_base_data)<>'object' then raise exception 'invalid_base_data'; end if;
  if p_user_state is not null and jsonb_typeof(p_user_state)<>'object' then raise exception 'invalid_user_state'; end if;
  if octet_length(coalesce(p_base_data,'{}'::jsonb)::text)+octet_length(coalesce(p_user_state,'{}'::jsonb)::text)>15728640 then raise exception 'project_payload_too_large'; end if;
  if coalesce(array_length(p_source_files,1),0)>100 then raise exception 'too_many_source_files'; end if;
  if p_period_key is not null and length(p_period_key)>40 then raise exception 'invalid_period_key'; end if;

  update public.analysis_projects set
    base_data=coalesce(p_base_data,base_data),
    user_state=coalesce(p_user_state,user_state),
    period_key=coalesce(p_period_key,period_key),
    source_files=coalesce(p_source_files,source_files),
    status=case when status='draft' then 'in_progress' else status end,
    version=version+1,
    updated_by=auth.uid(),
    updated_at=now()
  where id=p_project_id and version=p_expected_version
  returning * into v_project;

  if not found then raise exception 'version_conflict' using errcode='40001'; end if;
  insert into public.activity_logs(workspace_id,project_id,actor_id,action,details)
  values(v_project.workspace_id,v_project.id,auth.uid(),'save',
    coalesce(p_change_summary,'{}'::jsonb)||jsonb_build_object('version',v_project.version));
  return v_project;
end;
$$;

create or replace function public.update_workspace_member_role(
  p_workspace uuid,
  p_user uuid,
  p_role text
)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if p_role not in ('admin','editor','viewer') then raise exception 'invalid_role'; end if;
  if exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user) and p_role<>'admin'
    then raise exception 'workspace_owner_must_remain_admin'; end if;
  update public.workspace_members set role=p_role where workspace_id=p_workspace and user_id=p_user;
  if not found then raise exception 'member_not_found' using errcode='P0002'; end if;
  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'member_role_change',jsonb_build_object('user_id',p_user,'role',p_role));
end;
$$;

create or replace function public.remove_workspace_member(
  p_workspace uuid,
  p_user uuid
)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if exists(select 1 from public.workspaces where id=p_workspace and owner_id=p_user)
    then raise exception 'workspace_owner_cannot_be_removed'; end if;
  delete from public.workspace_members where workspace_id=p_workspace and user_id=p_user;
  if not found then raise exception 'member_not_found' using errcode='P0002'; end if;
  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'member_remove',jsonb_build_object('user_id',p_user));
end;
$$;

create or replace function public.protect_analysis_project_identity()
returns trigger language plpgsql set search_path=public
as $$
begin
  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.analysis_type is distinct from old.analysis_type
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then raise exception 'immutable_project_fields'; end if;
  return new;
end;
$$;

drop trigger if exists protect_analysis_project_identity_trigger on public.analysis_projects;
create trigger protect_analysis_project_identity_trigger
before update on public.analysis_projects
for each row execute function public.protect_analysis_project_identity();

create or replace function public.protect_shared_dataset_identity()
returns trigger language plpgsql set search_path=public
as $$
begin
  if new.id is distinct from old.id
    or new.workspace_id is distinct from old.workspace_id
    or new.fingerprint is distinct from old.fingerprint
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
  then raise exception 'immutable_dataset_fields'; end if;
  return new;
end;
$$;

drop trigger if exists protect_shared_dataset_identity_trigger on public.shared_datasets;
create trigger protect_shared_dataset_identity_trigger
before update on public.shared_datasets
for each row execute function public.protect_shared_dataset_identity();

-- Members can read their own membership; only Admin can enumerate the team.
drop policy if exists members_member_select on public.workspace_members;
drop policy if exists members_self_or_admin_select on public.workspace_members;
create policy members_self_or_admin_select on public.workspace_members for select to authenticated
using(user_id=auth.uid() or public.is_workspace_admin(workspace_id));

-- Remove direct browser writes. RLS still protects every read, while the RPCs
-- above perform server-side authorization and set audit fields themselves.
revoke insert,update,delete on public.analysis_projects from authenticated,anon;
revoke insert,update,delete on public.shared_datasets from authenticated,anon;
revoke insert,update,delete on public.workspace_members from authenticated,anon;
revoke insert,update,delete on public.activity_logs from authenticated,anon;
revoke all on public.profiles,public.workspaces,public.workspace_members,public.shared_datasets,public.analysis_projects,public.activity_logs from anon;
grant select on public.profiles,public.workspaces,public.workspace_members,public.shared_datasets,public.analysis_projects,public.activity_logs to authenticated;

drop policy if exists members_admin_insert on public.workspace_members;
drop policy if exists members_admin_update on public.workspace_members;
drop policy if exists members_admin_delete on public.workspace_members;
drop policy if exists datasets_editor_insert on public.shared_datasets;
drop policy if exists datasets_editor_update on public.shared_datasets;
drop policy if exists datasets_admin_delete on public.shared_datasets;
drop policy if exists projects_editor_insert on public.analysis_projects;
drop policy if exists projects_editor_update on public.analysis_projects;

revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.protect_workspace_owner() from public,anon,authenticated;
revoke all on function public.protect_analysis_project_identity() from public,anon,authenticated;
revoke all on function public.protect_shared_dataset_identity() from public,anon,authenticated;

revoke all on function public.workspace_role(uuid) from public,anon;
revoke all on function public.is_workspace_member(uuid) from public,anon;
revoke all on function public.can_edit_workspace(uuid) from public,anon;
revoke all on function public.is_workspace_admin(uuid) from public,anon;
revoke all on function public.create_analysis_project(uuid,text,text) from public,anon;
revoke all on function public.upsert_shared_dataset(uuid,text,text,text[],jsonb) from public,anon;
revoke all on function public.save_analysis_project(uuid,bigint,jsonb,jsonb,text,text[],jsonb) from public,anon;
revoke all on function public.soft_delete_project(uuid) from public,anon;
revoke all on function public.add_workspace_member_by_email(uuid,text,text) from public,anon;
revoke all on function public.update_workspace_member_role(uuid,uuid,text) from public,anon;
revoke all on function public.remove_workspace_member(uuid,uuid) from public,anon;
revoke all on function public.attach_dataset_to_project(uuid,uuid) from public,anon;

grant execute on function public.workspace_role(uuid),public.is_workspace_member(uuid),public.can_edit_workspace(uuid),public.is_workspace_admin(uuid) to authenticated;
grant execute on function public.create_analysis_project(uuid,text,text) to authenticated;
grant execute on function public.upsert_shared_dataset(uuid,text,text,text[],jsonb) to authenticated;
grant execute on function public.save_analysis_project(uuid,bigint,jsonb,jsonb,text,text[],jsonb) to authenticated;
grant execute on function public.soft_delete_project(uuid),public.add_workspace_member_by_email(uuid,text,text) to authenticated;
grant execute on function public.update_workspace_member_role(uuid,uuid,text),public.remove_workspace_member(uuid,uuid) to authenticated;
grant execute on function public.attach_dataset_to_project(uuid,uuid) to authenticated;


-- ============================================================
-- ADMIN CONTROL CENTER
-- Archived work and destructive dataset actions are Admin-only.
-- ============================================================

drop policy if exists projects_member_select on public.analysis_projects;
create policy projects_member_select on public.analysis_projects for select to authenticated
using(
  public.is_workspace_member(workspace_id)
  and (deleted_at is null or public.is_workspace_admin(workspace_id))
);

create or replace function public.admin_list_archived_projects(p_workspace uuid)
returns table(
  id uuid,
  name text,
  analysis_type text,
  period_key text,
  status text,
  version bigint,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql security definer set search_path=public
as $admin$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  return query
    select p.id,p.name,p.analysis_type,p.period_key,p.status,p.version,p.updated_at,p.deleted_at
    from public.analysis_projects p
    where p.workspace_id=p_workspace and p.deleted_at is not null
    order by p.deleted_at desc;
end;
$admin$;

create or replace function public.admin_list_datasets(p_workspace uuid)
returns table(
  id uuid,
  name text,
  source_files text[],
  updated_at timestamptz,
  usage_count bigint
)
language plpgsql security definer set search_path=public
as $admin$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  return query
    select d.id,d.name,d.source_files,d.updated_at,count(p.id)::bigint
    from public.shared_datasets d
    left join public.analysis_projects p on p.dataset_id=d.id
    where d.workspace_id=p_workspace
    group by d.id,d.name,d.source_files,d.updated_at
    order by d.updated_at desc;
end;
$admin$;

create or replace function public.restore_analysis_project(p_project_id uuid)
returns public.analysis_projects
language plpgsql security definer set search_path=public
as $admin$
declare v_project public.analysis_projects;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_project from public.analysis_projects where id=p_project_id and deleted_at is not null;
  if not found then raise exception 'archived_project_not_found' using errcode='P0002'; end if;
  if not public.is_workspace_admin(v_project.workspace_id) then raise exception 'permission_denied' using errcode='42501'; end if;

  update public.analysis_projects
  set deleted_at=null,updated_at=now(),updated_by=auth.uid(),version=version+1
  where id=p_project_id
  returning * into v_project;

  insert into public.activity_logs(workspace_id,project_id,actor_id,action,details)
  values(v_project.workspace_id,v_project.id,auth.uid(),'restore',jsonb_build_object('version',v_project.version));
  return v_project;
end;
$admin$;

create or replace function public.delete_shared_dataset(p_dataset_id uuid)
returns void
language plpgsql security definer set search_path=public
as $admin$
declare v_workspace uuid; v_name text; v_usage bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select workspace_id,name into v_workspace,v_name from public.shared_datasets where id=p_dataset_id;
  if not found then raise exception 'dataset_not_found' using errcode='P0002'; end if;
  if not public.is_workspace_admin(v_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;

  select count(*) into v_usage from public.analysis_projects where dataset_id=p_dataset_id;
  if v_usage>0 then raise exception 'dataset_in_use:%',v_usage using errcode='23503'; end if;

  delete from public.shared_datasets where id=p_dataset_id;
  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(v_workspace,auth.uid(),'dataset_delete',jsonb_build_object('dataset_id',p_dataset_id,'dataset_name',v_name));
end;
$admin$;

revoke all on function public.admin_list_archived_projects(uuid) from public,anon;
revoke all on function public.admin_list_datasets(uuid) from public,anon;
revoke all on function public.restore_analysis_project(uuid) from public,anon;
revoke all on function public.delete_shared_dataset(uuid) from public,anon;
grant execute on function public.admin_list_archived_projects(uuid) to authenticated;
grant execute on function public.admin_list_datasets(uuid) to authenticated;
grant execute on function public.restore_analysis_project(uuid) to authenticated;
grant execute on function public.delete_shared_dataset(uuid) to authenticated;


-- ============================================================
-- PR REPORT FOUNDATION
-- Adds the project/data link only. PR formulas and guarantee rules
-- will be defined in a later phase.
-- ============================================================

alter table public.analysis_projects
  drop constraint if exists analysis_projects_analysis_type_check;
alter table public.analysis_projects
  add constraint analysis_projects_analysis_type_check
  check (analysis_type in ('working_day','global_irradiance','pr_report'));


-- ============================================================
-- ADMIN WORKSPACE BACKUP
-- Read-only JSON snapshot. Authentication passwords/tokens are excluded.
-- ============================================================

create or replace function public.admin_export_workspace_backup(p_workspace uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $backup$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;

  select jsonb_build_object(
    'backup_version',1,
    'exported_at',now(),
    'workspace',(
      select to_jsonb(w) from public.workspaces w where w.id=p_workspace
    ),
    'members',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id',m.user_id,
          'email',p.email,
          'display_name',p.display_name,
          'role',m.role,
          'created_at',m.created_at
        ) order by m.created_at
      )
      from public.workspace_members m
      join public.profiles p on p.id=m.user_id
      where m.workspace_id=p_workspace
    ),'[]'::jsonb),
    'shared_datasets',coalesce((
      select jsonb_agg(to_jsonb(d) order by d.updated_at)
      from public.shared_datasets d
      where d.workspace_id=p_workspace
    ),'[]'::jsonb),
    'analysis_projects',coalesce((
      select jsonb_agg(to_jsonb(pr) order by pr.updated_at)
      from public.analysis_projects pr
      where pr.workspace_id=p_workspace
    ),'[]'::jsonb),
    'activity_logs',coalesce((
      select jsonb_agg(to_jsonb(l) order by l.created_at)
      from public.activity_logs l
      where l.workspace_id=p_workspace
    ),'[]'::jsonb)
  ) into v_result;

  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'workspace_backup_export',
    jsonb_build_object(
      'project_count',jsonb_array_length(v_result->'analysis_projects'),
      'dataset_count',jsonb_array_length(v_result->'shared_datasets')
    ));

  return v_result;
end;
$backup$;

revoke all on function public.admin_export_workspace_backup(uuid) from public,anon;
grant execute on function public.admin_export_workspace_backup(uuid) to authenticated;


-- ============================================================
-- RESTORE PREVIEW
-- Validates a backup and reports conflicts. It never restores,
-- updates or deletes workspace data.
-- ============================================================

create or replace function public.admin_validate_workspace_backup(
  p_workspace uuid,
  p_backup jsonb
)
returns jsonb
language plpgsql security definer set search_path=public
as $preview$
declare
  v_workspace_match boolean;
  v_member_count bigint;
  v_dataset_count bigint;
  v_project_count bigint;
  v_log_count bigint;
  v_missing_members bigint;
  v_dataset_conflicts bigint;
  v_project_conflicts bigint;
  v_invalid_project_types bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if p_backup is null or jsonb_typeof(p_backup)<>'object' then raise exception 'invalid_backup_object'; end if;
  if coalesce((p_backup->>'backup_version')::integer,0)<>1 then raise exception 'unsupported_backup_version'; end if;
  if octet_length(p_backup::text)>52428800 then raise exception 'backup_too_large'; end if;
  if coalesce(jsonb_typeof(p_backup->'workspace'),'')<>'object'
    or coalesce(jsonb_typeof(p_backup->'members'),'')<>'array'
    or coalesce(jsonb_typeof(p_backup->'shared_datasets'),'')<>'array'
    or coalesce(jsonb_typeof(p_backup->'analysis_projects'),'')<>'array'
    or coalesce(jsonb_typeof(p_backup->'activity_logs'),'')<>'array'
  then raise exception 'invalid_backup_structure'; end if;

  v_workspace_match=coalesce(p_backup#>>'{workspace,id}','')=p_workspace::text;
  v_member_count=jsonb_array_length(p_backup->'members');
  v_dataset_count=jsonb_array_length(p_backup->'shared_datasets');
  v_project_count=jsonb_array_length(p_backup->'analysis_projects');
  v_log_count=jsonb_array_length(p_backup->'activity_logs');

  select count(*) into v_missing_members
  from jsonb_array_elements(p_backup->'members') b
  where coalesce(trim(b->>'email'),'')=''
    or not exists(
      select 1 from public.profiles p where lower(p.email)=lower(trim(b->>'email'))
    );

  select count(*) into v_dataset_conflicts
  from jsonb_array_elements(p_backup->'shared_datasets') b
  where exists(
    select 1 from public.shared_datasets d
    where d.workspace_id=p_workspace
      and (d.id::text=b->>'id' or d.fingerprint=b->>'fingerprint')
  );

  select count(*) into v_project_conflicts
  from jsonb_array_elements(p_backup->'analysis_projects') b
  where exists(
    select 1 from public.analysis_projects p
    where p.workspace_id=p_workspace and p.id::text=b->>'id'
  );

  select count(*) into v_invalid_project_types
  from jsonb_array_elements(p_backup->'analysis_projects') b
  where coalesce(b->>'analysis_type','') not in ('working_day','global_irradiance','pr_report');

  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'workspace_backup_preview',
    jsonb_build_object(
      'workspace_match',v_workspace_match,
      'project_count',v_project_count,
      'dataset_count',v_dataset_count,
      'project_conflicts',v_project_conflicts,
      'dataset_conflicts',v_dataset_conflicts
    ));

  return jsonb_build_object(
    'valid',v_workspace_match and v_invalid_project_types=0,
    'backup_version',p_backup->>'backup_version',
    'exported_at',p_backup->>'exported_at',
    'workspace_match',v_workspace_match,
    'members',v_member_count,
    'missing_member_accounts',v_missing_members,
    'datasets',v_dataset_count,
    'dataset_conflicts',v_dataset_conflicts,
    'projects',v_project_count,
    'project_conflicts',v_project_conflicts,
    'invalid_project_types',v_invalid_project_types,
    'activity_logs',v_log_count,
    'writes_performed',false
  );
end;
$preview$;

revoke all on function public.admin_validate_workspace_backup(uuid,jsonb) from public,anon;
grant execute on function public.admin_validate_workspace_backup(uuid,jsonb) to authenticated;


-- ============================================================
-- RESTORE MISSING DATA
-- Inserts only missing members, datasets and projects. Existing
-- rows are never updated and historical activity logs are not imported.
-- ============================================================

create or replace function public.admin_restore_workspace_backup_missing(
  p_workspace uuid,
  p_backup jsonb
)
returns jsonb
language plpgsql security definer set search_path=public
as $restore$
declare
  v_preview jsonb;
  v_item jsonb;
  v_user uuid;
  v_role text;
  v_dataset_id uuid;
  v_existing_dataset uuid;
  v_old_dataset_id text;
  v_mapped_dataset uuid;
  v_project_id uuid;
  v_source_files text[];
  v_row_count integer;
  v_members_restored integer:=0;
  v_members_skipped integer:=0;
  v_members_missing integer:=0;
  v_datasets_restored integer:=0;
  v_datasets_skipped integer:=0;
  v_projects_restored integer:=0;
  v_projects_skipped integer:=0;
  v_errors integer:=0;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;

  v_preview=public.admin_validate_workspace_backup(p_workspace,p_backup);
  if not coalesce((v_preview->>'valid')::boolean,false) then
    raise exception 'backup_not_ready_for_restore';
  end if;

  -- Memberships are matched by email to an existing Authentication profile.
  -- Existing roles are intentionally preserved.
  for v_item in select value from jsonb_array_elements(p_backup->'members')
  loop
    begin
      v_role=v_item->>'role';
      if v_role not in ('admin','editor','viewer') then v_errors=v_errors+1; continue; end if;
      select p.id into v_user from public.profiles p
      where lower(p.email)=lower(trim(v_item->>'email')) limit 1;
      if v_user is null then v_members_missing=v_members_missing+1; continue; end if;
      if exists(select 1 from public.workspaces w where w.id=p_workspace and w.owner_id=v_user)
        then v_role='admin';
      end if;

      insert into public.workspace_members(workspace_id,user_id,role)
      values(p_workspace,v_user,v_role)
      on conflict(workspace_id,user_id) do nothing;
      get diagnostics v_row_count=row_count;
      if v_row_count=1 then v_members_restored=v_members_restored+1;
      else v_members_skipped=v_members_skipped+1;
      end if;
    exception when others then
      v_errors=v_errors+1;
    end;
  end loop;

  -- Dataset IDs are retained when available so project relationships can be
  -- rebuilt. A matching ID or fingerprint is treated as existing and skipped.
  for v_item in select value from jsonb_array_elements(p_backup->'shared_datasets')
  loop
    begin
      v_dataset_id=(v_item->>'id')::uuid;
      select d.id into v_existing_dataset
      from public.shared_datasets d
      where d.workspace_id=p_workspace
        and (d.id=v_dataset_id or d.fingerprint=v_item->>'fingerprint')
      limit 1;

      if v_existing_dataset is not null then
        v_datasets_skipped=v_datasets_skipped+1;
        continue;
      end if;
      if length(trim(coalesce(v_item->>'name',''))) not between 1 and 180
        or length(trim(coalesce(v_item->>'fingerprint',''))) not between 1 and 2000
        or coalesce(jsonb_typeof(v_item->'normalized_data'),'')<>'object'
        or octet_length((v_item->'normalized_data')::text)>15728640
      then v_errors=v_errors+1; continue;
      end if;

      select coalesce(array_agg(value),'{}'::text[]) into v_source_files
      from jsonb_array_elements_text(coalesce(v_item->'source_files','[]'::jsonb));

      insert into public.shared_datasets(
        id,workspace_id,name,fingerprint,source_files,normalized_data,
        created_by,updated_by,created_at,updated_at
      ) values(
        v_dataset_id,p_workspace,trim(v_item->>'name'),trim(v_item->>'fingerprint'),
        v_source_files,v_item->'normalized_data',auth.uid(),auth.uid(),
        coalesce((v_item->>'created_at')::timestamptz,now()),
        coalesce((v_item->>'updated_at')::timestamptz,now())
      );
      v_datasets_restored=v_datasets_restored+1;
    exception when unique_violation then
      v_datasets_skipped=v_datasets_skipped+1;
    when others then
      v_errors=v_errors+1;
    end;
  end loop;

  -- Projects are restored only when their ID is missing. If a project points
  -- to a dataset, that dataset must exist or have a matching backup fingerprint.
  for v_item in select value from jsonb_array_elements(p_backup->'analysis_projects')
  loop
    begin
      v_project_id=(v_item->>'id')::uuid;
      if exists(select 1 from public.analysis_projects p where p.workspace_id=p_workspace and p.id=v_project_id) then
        v_projects_skipped=v_projects_skipped+1;
        continue;
      end if;
      if coalesce(v_item->>'analysis_type','') not in ('working_day','global_irradiance','pr_report')
        or length(trim(coalesce(v_item->>'name',''))) not between 1 and 120
        or coalesce(jsonb_typeof(v_item->'base_data'),'')<>'object'
        or coalesce(jsonb_typeof(v_item->'user_state'),'')<>'object'
      then v_errors=v_errors+1; continue;
      end if;

      v_old_dataset_id=v_item->>'dataset_id';
      v_mapped_dataset=null;
      if v_old_dataset_id is not null then
        select d.id into v_mapped_dataset
        from public.shared_datasets d
        where d.workspace_id=p_workspace and (
          d.id::text=v_old_dataset_id
          or d.fingerprint=(
            select b->>'fingerprint'
            from jsonb_array_elements(p_backup->'shared_datasets') b
            where b->>'id'=v_old_dataset_id
            limit 1
          )
        ) limit 1;
        if v_mapped_dataset is null then v_errors=v_errors+1; continue; end if;
      end if;

      select coalesce(array_agg(value),'{}'::text[]) into v_source_files
      from jsonb_array_elements_text(coalesce(v_item->'source_files','[]'::jsonb));

      insert into public.analysis_projects(
        id,workspace_id,analysis_type,name,period_key,status,source_files,
        base_data,user_state,dataset_id,version,created_by,updated_by,
        created_at,updated_at,deleted_at
      ) values(
        v_project_id,p_workspace,v_item->>'analysis_type',trim(v_item->>'name'),
        v_item->>'period_key',
        case when v_item->>'status' in ('draft','in_progress','completed','archived')
          then v_item->>'status' else 'draft' end,
        v_source_files,v_item->'base_data',v_item->'user_state',v_mapped_dataset,
        greatest(coalesce((v_item->>'version')::bigint,1),1),
        auth.uid(),auth.uid(),
        coalesce((v_item->>'created_at')::timestamptz,now()),
        coalesce((v_item->>'updated_at')::timestamptz,now()),
        (v_item->>'deleted_at')::timestamptz
      );
      v_projects_restored=v_projects_restored+1;
    exception when unique_violation then
      v_projects_skipped=v_projects_skipped+1;
    when others then
      v_errors=v_errors+1;
    end;
  end loop;

  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'workspace_backup_restore_missing',
    jsonb_build_object(
      'members_restored',v_members_restored,
      'datasets_restored',v_datasets_restored,
      'projects_restored',v_projects_restored,
      'errors',v_errors
    ));

  return jsonb_build_object(
    'mode','missing_only',
    'existing_rows_updated',0,
    'activity_logs_imported',0,
    'members_restored',v_members_restored,
    'members_skipped',v_members_skipped,
    'members_missing_accounts',v_members_missing,
    'datasets_restored',v_datasets_restored,
    'datasets_skipped',v_datasets_skipped,
    'projects_restored',v_projects_restored,
    'projects_skipped',v_projects_skipped,
    'errors',v_errors
  );
end;
$restore$;

revoke all on function public.admin_restore_workspace_backup_missing(uuid,jsonb) from public,anon;
grant execute on function public.admin_restore_workspace_backup_missing(uuid,jsonb) to authenticated;


-- ============================================================
-- ADMIN SYSTEM HEALTH CHECK
-- Read-only checks for RLS, RPC permissions and Realtime setup.
-- ============================================================

create or replace function public.admin_system_health(p_workspace uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $health$
declare
  v_rls_enabled boolean;
  v_direct_writes_blocked boolean;
  v_required_rpcs boolean;
  v_realtime_enabled boolean;
  v_admin_membership boolean;
  v_active_projects bigint;
  v_archived_projects bigint;
  v_datasets bigint;
  v_members bigint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;

  select bool_and(c.relrowsecurity) into v_rls_enabled
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('profiles','workspaces','workspace_members','shared_datasets','analysis_projects','activity_logs');

  v_direct_writes_blocked=
    not has_table_privilege('authenticated','public.analysis_projects','INSERT')
    and not has_table_privilege('authenticated','public.analysis_projects','UPDATE')
    and not has_table_privilege('authenticated','public.shared_datasets','INSERT')
    and not has_table_privilege('authenticated','public.shared_datasets','UPDATE')
    and not has_table_privilege('authenticated','public.shared_datasets','DELETE')
    and not has_table_privilege('authenticated','public.workspace_members','INSERT')
    and not has_table_privilege('authenticated','public.workspace_members','UPDATE')
    and not has_table_privilege('authenticated','public.workspace_members','DELETE');

  v_required_rpcs=
    to_regprocedure('public.create_analysis_project(uuid,text,text)') is not null
    and to_regprocedure('public.upsert_shared_dataset(uuid,text,text,text[],jsonb)') is not null
    and to_regprocedure('public.save_analysis_project(uuid,bigint,jsonb,jsonb,text,text[],jsonb)') is not null
    and to_regprocedure('public.admin_export_workspace_backup(uuid)') is not null
    and to_regprocedure('public.admin_validate_workspace_backup(uuid,jsonb)') is not null
    and to_regprocedure('public.admin_restore_workspace_backup_missing(uuid,jsonb)') is not null;

  select exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='analysis_projects'
  ) into v_realtime_enabled;

  select exists(
    select 1 from public.workspace_members
    where workspace_id=p_workspace and user_id=auth.uid() and role='admin'
  ) into v_admin_membership;

  select count(*) filter(where deleted_at is null),
         count(*) filter(where deleted_at is not null)
  into v_active_projects,v_archived_projects
  from public.analysis_projects where workspace_id=p_workspace;
  select count(*) into v_datasets from public.shared_datasets where workspace_id=p_workspace;
  select count(*) into v_members from public.workspace_members where workspace_id=p_workspace;

  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'system_health_check',
    jsonb_build_object(
      'rls_enabled',v_rls_enabled,
      'direct_writes_blocked',v_direct_writes_blocked,
      'required_rpcs',v_required_rpcs,
      'realtime_enabled',v_realtime_enabled
    ));

  return jsonb_build_object(
    'healthy',coalesce(v_rls_enabled,false)
      and v_direct_writes_blocked and v_required_rpcs
      and v_realtime_enabled and v_admin_membership,
    'schema_version','2026.09.14-health-1',
    'checked_at',now(),
    'checks',jsonb_build_object(
      'rls_enabled',coalesce(v_rls_enabled,false),
      'direct_browser_writes_blocked',v_direct_writes_blocked,
      'required_rpcs_available',v_required_rpcs,
      'analysis_realtime_enabled',v_realtime_enabled,
      'admin_membership_valid',v_admin_membership
    ),
    'counts',jsonb_build_object(
      'active_projects',v_active_projects,
      'archived_projects',v_archived_projects,
      'shared_datasets',v_datasets,
      'workspace_members',v_members
    )
  );
end;
$health$;

revoke all on function public.admin_system_health(uuid) from public,anon;
grant execute on function public.admin_system_health(uuid) to authenticated;


-- ============================================================
-- ADMIN WORKSPACE ACTIVITY
-- Centralized read-only audit history for Admin Control.
-- ============================================================

create or replace function public.admin_list_activity_logs(
  p_workspace uuid,
  p_limit integer default 50,
  p_action text default null
)
returns table(
  log_id bigint,
  action text,
  details jsonb,
  created_at timestamptz,
  project_id uuid,
  project_name text,
  actor_id uuid,
  actor_name text,
  actor_email text
)
language plpgsql security definer set search_path=public
as $activity$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;

  return query
    select
      l.id,l.action,l.details,l.created_at,l.project_id,pr.name,
      l.actor_id,coalesce(p.display_name,p.email),p.email
    from public.activity_logs l
    join public.profiles p on p.id=l.actor_id
    left join public.analysis_projects pr on pr.id=l.project_id
    where l.workspace_id=p_workspace
      and (p_action is null or l.action=p_action)
    order by l.created_at desc
    limit greatest(1,least(coalesce(p_limit,50),200));
end;
$activity$;

revoke all on function public.admin_list_activity_logs(uuid,integer,text) from public,anon;
grant execute on function public.admin_list_activity_logs(uuid,integer,text) to authenticated;


-- ============================================================
-- ADMIN PROJECT CONTROLS
-- Metadata-only management. Calculation payloads are not changed.
-- ============================================================

create or replace function public.admin_list_active_projects(p_workspace uuid)
returns table(
  project_id uuid,
  project_name text,
  analysis_type text,
  period_key text,
  status text,
  version bigint,
  updated_at timestamptz
)
language plpgsql security definer set search_path=public
as $project$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  return query
    select p.id,p.name,p.analysis_type,p.period_key,p.status,p.version,p.updated_at
    from public.analysis_projects p
    where p.workspace_id=p_workspace and p.deleted_at is null
    order by p.updated_at desc;
end;
$project$;

create or replace function public.admin_update_project_metadata(
  p_project_id uuid,
  p_name text,
  p_status text
)
returns public.analysis_projects
language plpgsql security definer set search_path=public
as $project$
declare
  v_project public.analysis_projects;
  v_old_name text;
  v_old_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_project from public.analysis_projects
  where id=p_project_id and deleted_at is null;
  if not found then raise exception 'project_not_found' using errcode='P0002'; end if;
  if not public.is_workspace_admin(v_project.workspace_id) then raise exception 'permission_denied' using errcode='42501'; end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 120 then raise exception 'invalid_project_name'; end if;
  if p_status not in ('draft','in_progress','completed') then raise exception 'invalid_project_status'; end if;

  v_old_name=v_project.name;
  v_old_status=v_project.status;
  update public.analysis_projects
  set name=trim(p_name),status=p_status,updated_by=auth.uid(),
      updated_at=now(),version=version+1
  where id=p_project_id
  returning * into v_project;

  insert into public.activity_logs(workspace_id,project_id,actor_id,action,details)
  values(v_project.workspace_id,v_project.id,auth.uid(),'project_metadata_update',
    jsonb_build_object(
      'old_name',v_old_name,'new_name',v_project.name,
      'old_status',v_old_status,'new_status',v_project.status,
      'version',v_project.version
    ));
  return v_project;
end;
$project$;

revoke all on function public.admin_list_active_projects(uuid) from public,anon;
revoke all on function public.admin_update_project_metadata(uuid,text,text) from public,anon;
grant execute on function public.admin_list_active_projects(uuid) to authenticated;
grant execute on function public.admin_update_project_metadata(uuid,text,text) to authenticated;

notify pgrst, 'reload schema';

-- Setup verification: this final query must return five TRUE values and the
-- configured admin email. If it does not, the script was run in the wrong
-- Supabase project or stopped before completion.
select
  to_regclass('public.workspace_members') is not null as workspace_members_ok,
  to_regclass('public.shared_datasets') is not null as shared_datasets_ok,
  to_regclass('public.analysis_projects') is not null as analysis_projects_ok,
  exists(select 1 from public.profiles where lower(email)='solargm123@gmail.com') as admin_profile_ok,
  exists(
    select 1 from public.workspace_members wm
    join public.profiles p on p.id=wm.user_id
    where lower(p.email)='solargm123@gmail.com' and wm.role='admin'
  ) as admin_membership_ok,
  to_regprocedure('public.create_analysis_project(uuid,text,text)') is not null
    and to_regprocedure('public.upsert_shared_dataset(uuid,text,text,text[],jsonb)') is not null
    and to_regprocedure('public.update_workspace_member_role(uuid,uuid,text)') is not null
    as safety_rpcs_ok,
  not has_table_privilege('authenticated','public.analysis_projects','INSERT')
    and not has_table_privilege('authenticated','public.analysis_projects','UPDATE')
    and not has_table_privilege('authenticated','public.shared_datasets','INSERT')
    and not has_table_privilege('authenticated','public.workspace_members','UPDATE')
    as direct_browser_writes_blocked,
  to_regprocedure('public.admin_export_workspace_backup(uuid)') is not null as backup_rpc_ok,
  to_regprocedure('public.admin_validate_workspace_backup(uuid,jsonb)') is not null as restore_preview_rpc_ok,
  to_regprocedure('public.admin_restore_workspace_backup_missing(uuid,jsonb)') is not null as restore_missing_rpc_ok,
  to_regprocedure('public.admin_system_health(uuid)') is not null as system_health_rpc_ok,
  to_regprocedure('public.admin_list_activity_logs(uuid,integer,text)') is not null as activity_log_rpc_ok,
  to_regprocedure('public.admin_list_active_projects(uuid)') is not null
    and to_regprocedure('public.admin_update_project_metadata(uuid,text,text)') is not null
    as project_controls_rpc_ok,
  'solargm123@gmail.com'::text as configured_admin;
