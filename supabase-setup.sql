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
as $$
declare v_user uuid;
begin
  if not public.is_workspace_admin(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if p_role not in ('admin','editor','viewer') then raise exception 'invalid_role'; end if;
  select id into v_user from public.profiles where lower(email)=lower(trim(p_email));
  if v_user is null then raise exception 'user_not_found'; end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(p_workspace,v_user,p_role)
  on conflict(workspace_id,user_id) do update set role=excluded.role;
end;
$$;

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
  'solargm123@gmail.com'::text as configured_admin;
