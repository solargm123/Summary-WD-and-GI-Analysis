-- FusionSolar Central Data Batch Storage Migration
-- Run once in Supabase Dashboard > SQL Editor after supabase-setup.sql.
-- This migration is additive and does not delete or change existing analysis data.

create table if not exists public.central_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  standard_name text not null,
  normalized_name text not null,
  platform text,
  capacity_kwp numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, normalized_name)
);

create table if not exists public.central_project_aliases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.central_projects(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(workspace_id, normalized_alias)
);

create table if not exists public.central_import_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  status text not null default 'processing' check(status in ('processing','completed','completed_with_errors','failed','cancelled')),
  total_files integer not null default 0 check(total_files>=0),
  processed_files integer not null default 0 check(processed_files>=0),
  success_files integer not null default 0 check(success_files>=0),
  duplicate_files integer not null default 0 check(duplicate_files>=0),
  failed_files integer not null default 0 check(failed_files>=0),
  inserted_records bigint not null default 0 check(inserted_records>=0),
  updated_records bigint not null default 0 check(updated_records>=0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.central_import_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  batch_id uuid not null references public.central_import_batches(id) on delete cascade,
  file_name text not null,
  file_fingerprint text not null,
  record_date date,
  status text not null default 'queued' check(status in ('queued','processing','completed','duplicate','failed')),
  inserted_records integer not null default 0,
  updated_records integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(workspace_id,file_fingerprint)
);

create table if not exists public.central_daily_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.central_projects(id) on delete cascade,
  record_date date not null,
  source_project_name text not null,
  capacity_kwp numeric,
  global_irradiance numeric,
  theoretical_yield_kwh numeric,
  pv_yield_kwh numeric,
  specific_energy numeric,
  loss_due_export_kwh numeric,
  source_file text,
  file_fingerprint text,
  import_batch_id uuid references public.central_import_batches(id) on delete set null,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,project_id,record_date)
);

create index if not exists central_daily_records_date_idx on public.central_daily_records(workspace_id,record_date);
create index if not exists central_daily_records_project_idx on public.central_daily_records(project_id,record_date);
create index if not exists central_import_batches_workspace_idx on public.central_import_batches(workspace_id,started_at desc);
create index if not exists central_import_files_batch_idx on public.central_import_files(batch_id,status);

alter table public.central_projects enable row level security;
alter table public.central_project_aliases enable row level security;
alter table public.central_import_batches enable row level security;
alter table public.central_import_files enable row level security;
alter table public.central_daily_records enable row level security;

drop policy if exists central_projects_select on public.central_projects;
create policy central_projects_select on public.central_projects for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists central_aliases_select on public.central_project_aliases;
create policy central_aliases_select on public.central_project_aliases for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists central_batches_select on public.central_import_batches;
create policy central_batches_select on public.central_import_batches for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists central_files_select on public.central_import_files;
create policy central_files_select on public.central_import_files for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists central_records_select on public.central_daily_records;
create policy central_records_select on public.central_daily_records for select to authenticated using(public.is_workspace_member(workspace_id));

revoke insert,update,delete on public.central_projects,public.central_project_aliases,public.central_import_batches,public.central_import_files,public.central_daily_records from authenticated,anon;

create or replace function public.central_normalize_name(p_name text)
returns text language sql immutable
as $$
  select trim(regexp_replace(regexp_replace(lower(coalesce(p_name,'')),
    '(company|public|limited|co\.?|ltd\.?|thailand|บริษัท|จำกัด|มหาชน)',' ','gi'),
    '[^a-z0-9ก-๙]+',' ','g'))
$$;

create or replace function public.begin_central_import(p_workspace uuid,p_total_files integer)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not public.can_edit_workspace(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  insert into public.central_import_batches(workspace_id,created_by,total_files)
  values(p_workspace,auth.uid(),greatest(coalesce(p_total_files,0),0)) returning id into v_id;
  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'central_import_started',jsonb_build_object('batch_id',v_id,'total_files',p_total_files));
  return v_id;
end $$;

create or replace function public.register_central_import_file(
  p_workspace uuid,p_batch uuid,p_file_name text,p_fingerprint text,p_record_date date default null
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_file uuid;v_existing public.central_import_files;
begin
  if not public.can_edit_workspace(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  select * into v_existing from public.central_import_files where workspace_id=p_workspace and file_fingerprint=p_fingerprint;
  if found then
    update public.central_import_batches set processed_files=processed_files+1,duplicate_files=duplicate_files+1,updated_at=now() where id=p_batch and workspace_id=p_workspace;
    return jsonb_build_object('duplicate',true,'file_id',v_existing.id,'previous_batch',v_existing.batch_id);
  end if;
  insert into public.central_import_files(workspace_id,batch_id,file_name,file_fingerprint,record_date,status)
  values(p_workspace,p_batch,p_file_name,p_fingerprint,p_record_date,'processing') returning id into v_file;
  return jsonb_build_object('duplicate',false,'file_id',v_file);
end $$;

create or replace function public.upsert_central_daily_batch(
  p_workspace uuid,p_batch uuid,p_file uuid,p_rows jsonb,p_aliases jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_row jsonb;v_source text;v_standard text;v_norm text;v_project uuid;
  v_inserted integer:=0;v_updated integer:=0;v_exists boolean;
begin
  if not public.can_edit_workspace(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  if jsonb_typeof(p_rows)<>'array' then raise exception 'rows_must_be_array'; end if;
  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_source=trim(v_row->>'project');
    if v_source='' or (v_row->>'date') is null then continue; end if;
    v_standard=coalesce(nullif(p_aliases->>v_source,''),v_source);
    v_norm=public.central_normalize_name(v_standard);
    select project_id into v_project from public.central_project_aliases where workspace_id=p_workspace and normalized_alias=public.central_normalize_name(v_source);
    if v_project is null then select id into v_project from public.central_projects where workspace_id=p_workspace and normalized_name=v_norm; end if;
    if v_project is null then
      insert into public.central_projects(workspace_id,standard_name,normalized_name,platform,capacity_kwp)
      values(p_workspace,v_standard,v_norm,nullif(v_row->>'platform',''),nullif(v_row->>'capacity','')::numeric) returning id into v_project;
    else
      update public.central_projects set standard_name=v_standard,capacity_kwp=coalesce(nullif(v_row->>'capacity','')::numeric,capacity_kwp),updated_at=now() where id=v_project;
    end if;
    insert into public.central_project_aliases(workspace_id,project_id,alias_name,normalized_alias,created_by)
    values(p_workspace,v_project,v_source,public.central_normalize_name(v_source),auth.uid())
    on conflict(workspace_id,normalized_alias) do update set project_id=excluded.project_id,alias_name=excluded.alias_name;
    select exists(select 1 from public.central_daily_records where workspace_id=p_workspace and project_id=v_project and record_date=(v_row->>'date')::date) into v_exists;
    insert into public.central_daily_records(workspace_id,project_id,record_date,source_project_name,capacity_kwp,global_irradiance,theoretical_yield_kwh,pv_yield_kwh,specific_energy,loss_due_export_kwh,source_file,file_fingerprint,import_batch_id,updated_by)
    values(p_workspace,v_project,(v_row->>'date')::date,v_source,nullif(v_row->>'capacity','')::numeric,nullif(v_row->>'gi','')::numeric,nullif(v_row->>'theoretical','')::numeric,nullif(v_row->>'pv','')::numeric,nullif(v_row->>'specific','')::numeric,nullif(v_row->>'loss','')::numeric,v_row->>'fileName',v_row->>'fingerprint',p_batch,auth.uid())
    on conflict(workspace_id,project_id,record_date) do update set source_project_name=excluded.source_project_name,capacity_kwp=excluded.capacity_kwp,global_irradiance=excluded.global_irradiance,theoretical_yield_kwh=excluded.theoretical_yield_kwh,pv_yield_kwh=excluded.pv_yield_kwh,specific_energy=excluded.specific_energy,loss_due_export_kwh=excluded.loss_due_export_kwh,source_file=excluded.source_file,file_fingerprint=excluded.file_fingerprint,import_batch_id=excluded.import_batch_id,updated_by=auth.uid(),updated_at=now();
    if v_exists then v_updated=v_updated+1;else v_inserted=v_inserted+1;end if;
  end loop;
  update public.central_import_files set status='completed',inserted_records=inserted_records+v_inserted,updated_records=updated_records+v_updated,completed_at=now() where id=p_file and workspace_id=p_workspace;
  update public.central_import_batches set processed_files=processed_files+1,success_files=success_files+1,inserted_records=inserted_records+v_inserted,updated_records=updated_records+v_updated,updated_at=now() where id=p_batch and workspace_id=p_workspace;
  return jsonb_build_object('inserted',v_inserted,'updated',v_updated);
exception when others then
  update public.central_import_files set status='failed',error_message=sqlerrm,completed_at=now() where id=p_file and workspace_id=p_workspace;
  update public.central_import_batches set processed_files=processed_files+1,failed_files=failed_files+1,last_error=sqlerrm,updated_at=now() where id=p_batch and workspace_id=p_workspace;
  raise;
end $$;

create or replace function public.complete_central_import(p_workspace uuid,p_batch uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_batch public.central_import_batches;
begin
  if not public.can_edit_workspace(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  update public.central_import_batches set status=case when failed_files>0 then 'completed_with_errors' else 'completed' end,completed_at=now(),updated_at=now()
  where id=p_batch and workspace_id=p_workspace returning * into v_batch;
  insert into public.activity_logs(workspace_id,actor_id,action,details)
  values(p_workspace,auth.uid(),'central_import_completed',jsonb_build_object('batch_id',p_batch,'success_files',v_batch.success_files,'duplicate_files',v_batch.duplicate_files,'failed_files',v_batch.failed_files,'inserted_records',v_batch.inserted_records,'updated_records',v_batch.updated_records));
  return to_jsonb(v_batch);
end $$;

create or replace function public.get_central_daily_records(
  p_workspace uuid,p_date_from date default null,p_date_to date default null,p_project uuid default null
)
returns table(project_id uuid,project_name text,source_project_name text,record_date date,capacity_kwp numeric,global_irradiance numeric,theoretical_yield_kwh numeric,pv_yield_kwh numeric,specific_energy numeric,loss_due_export_kwh numeric)
language sql stable security definer set search_path=public
as $$
  select r.project_id,p.standard_name,r.source_project_name,r.record_date,r.capacity_kwp,r.global_irradiance,r.theoretical_yield_kwh,r.pv_yield_kwh,r.specific_energy,r.loss_due_export_kwh
  from public.central_daily_records r join public.central_projects p on p.id=r.project_id
  where r.workspace_id=p_workspace and public.is_workspace_member(p_workspace)
    and (p_date_from is null or r.record_date>=p_date_from)
    and (p_date_to is null or r.record_date<=p_date_to)
    and (p_project is null or r.project_id=p_project)
  order by r.record_date,p.standard_name
$$;

revoke all on function public.begin_central_import(uuid,integer) from public,anon;
revoke all on function public.register_central_import_file(uuid,uuid,text,text,date) from public,anon;
revoke all on function public.upsert_central_daily_batch(uuid,uuid,uuid,jsonb,jsonb) from public,anon;
revoke all on function public.complete_central_import(uuid,uuid) from public,anon;
revoke all on function public.get_central_daily_records(uuid,date,date,uuid) from public,anon;
grant execute on function public.begin_central_import(uuid,integer) to authenticated;
grant execute on function public.register_central_import_file(uuid,uuid,text,text,date) to authenticated;
grant execute on function public.upsert_central_daily_batch(uuid,uuid,uuid,jsonb,jsonb) to authenticated;
grant execute on function public.complete_central_import(uuid,uuid) to authenticated;
grant execute on function public.get_central_daily_records(uuid,date,date,uuid) to authenticated;

select 'Central Data Batch Storage migration installed successfully' as result;
