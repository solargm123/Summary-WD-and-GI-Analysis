-- Additive migration: retain Plant Report Address and return it to Global Irradiance.
alter table public.central_projects add column if not exists address text;

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
      insert into public.central_projects(workspace_id,standard_name,normalized_name,platform,capacity_kwp,address)
      values(p_workspace,v_standard,v_norm,nullif(v_row->>'platform',''),nullif(v_row->>'capacity','')::numeric,nullif(trim(v_row->>'address'),'')) returning id into v_project;
    else
      update public.central_projects set standard_name=v_standard,capacity_kwp=coalesce(nullif(v_row->>'capacity','')::numeric,capacity_kwp),address=coalesce(nullif(trim(v_row->>'address'),''),address),updated_at=now() where id=v_project;
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

create or replace function public.get_global_irradiance_month(p_workspace uuid,p_month text default null)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare v_month text;v_start date;v_end date;v_months jsonb;v_dates jsonb;v_files jsonb;v_plants jsonb;
begin
  if not public.is_workspace_member(p_workspace) then raise exception 'permission_denied' using errcode='42501'; end if;
  select coalesce(jsonb_agg(m order by m desc),'[]'::jsonb) into v_months from (select distinct to_char(record_date,'YYYY-MM') m from public.central_daily_records where workspace_id=p_workspace) q;
  v_month=coalesce(nullif(p_month,''),v_months->>0);
  if v_month is null then return jsonb_build_object('plants','{}'::jsonb,'dates','[]'::jsonb,'availableMonths',v_months,'loadedMonth',null,'sourceFiles','[]'::jsonb); end if;
  if v_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'invalid_month'; end if;
  v_start=(v_month||'-01')::date;v_end=(v_start+interval '1 month')::date;
  select coalesce(jsonb_agg(d order by d),'[]'::jsonb) into v_dates from (select distinct to_char(record_date,'YYYY-MM-DD') d from public.central_daily_records where workspace_id=p_workspace and record_date>=v_start and record_date<v_end) q;
  select coalesce(jsonb_agg(x.file_name order by x.file_name),'[]'::jsonb) into v_files from (select distinct on (f.file_fingerprint) f.file_name,f.file_fingerprint from public.central_import_files f where f.workspace_id=p_workspace and f.status='completed' and (f.record_date is null or (f.record_date>=v_start and f.record_date<v_end))) x;
  select coalesce(jsonb_object_agg(q.standard_name,jsonb_build_object('capacity',q.capacity_kwp,'address',coalesce(q.address,''),'province','','note','','dates',q.dates)),'{}'::jsonb) into v_plants
  from (select p.id,p.standard_name,p.address,max(coalesce(r.capacity_kwp,p.capacity_kwp)) capacity_kwp,jsonb_object_agg(to_char(r.record_date,'YYYY-MM-DD'),r.global_irradiance order by r.record_date) dates from public.central_daily_records r join public.central_projects p on p.id=r.project_id where r.workspace_id=p_workspace and r.record_date>=v_start and r.record_date<v_end group by p.id,p.standard_name,p.address) q;
  return jsonb_build_object('plants',v_plants,'dates',v_dates,'availableMonths',v_months,'loadedMonth',v_month,'sourceFiles',v_files);
end $$;

revoke all on function public.get_global_irradiance_month(uuid,text) from public,anon;
grant execute on function public.get_global_irradiance_month(uuid,text) to authenticated;
