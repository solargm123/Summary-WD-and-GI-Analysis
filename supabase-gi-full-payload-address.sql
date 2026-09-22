-- Keep the Global Irradiance full/trend payload province-aware.
-- The monthly payload already includes each project's address; the full payload
-- must expose the same field so the frontend can consistently detect Province.

create or replace function public.get_central_analysis_payload(
  p_workspace uuid,
  p_analysis_type text
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_payload jsonb;
  v_files jsonb;
begin
  if not public.is_workspace_member(p_workspace) then
    raise exception 'permission_denied' using errcode='42501';
  end if;
  if p_analysis_type not in ('working_day','global_irradiance','pr_report') then
    raise exception 'invalid_analysis_type';
  end if;

  select coalesce(jsonb_agg(x.file_name order by x.file_name),'[]'::jsonb)
  into v_files
  from (
    select distinct on (file_fingerprint) file_name,file_fingerprint
    from public.central_import_files
    where workspace_id=p_workspace and status='completed'
  ) x;

  if p_analysis_type='working_day' then
    select jsonb_build_object(
      'records',coalesce(jsonb_agg(jsonb_build_object(
        'fileName',coalesce(r.source_file,''),'name',p.standard_name,'cap',r.capacity_kwp,
        'pv',r.pv_yield_kwh,'specEnergy',r.specific_energy,'loss',r.loss_due_export_kwh,
        'recordDay',extract(day from r.record_date)::integer,'monthKey',to_char(r.record_date,'YYYY-MM')
      ) order by r.record_date,p.standard_name),'[]'::jsonb),
      'detectedMonths',coalesce((select jsonb_agg(m order by m desc) from (
        select distinct to_char(record_date,'YYYY-MM') m
        from public.central_daily_records
        where workspace_id=p_workspace
      ) q),'[]'::jsonb)
    ) into v_payload
    from public.central_daily_records r
    join public.central_projects p on p.id=r.project_id
    where r.workspace_id=p_workspace;

  elsif p_analysis_type='global_irradiance' then
    select jsonb_build_object(
      'plants',coalesce(jsonb_object_agg(
        q.standard_name,
        jsonb_build_object(
          'capacity',q.capacity_kwp,
          'address',coalesce(q.address,''),
          'province','',
          'note','',
          'dates',q.dates
        )
      ),'{}'::jsonb),
      'dates',coalesce((select jsonb_agg(d order by d) from (
        select distinct to_char(record_date,'YYYY-MM-DD') d
        from public.central_daily_records
        where workspace_id=p_workspace
      ) z),'[]'::jsonb),
      'sourceFiles',v_files
    ) into v_payload
    from (
      select
        p.id,
        p.standard_name,
        p.address,
        max(coalesce(r.capacity_kwp,p.capacity_kwp)) capacity_kwp,
        jsonb_object_agg(to_char(r.record_date,'YYYY-MM-DD'),r.global_irradiance order by r.record_date) dates
      from public.central_daily_records r
      join public.central_projects p on p.id=r.project_id
      where r.workspace_id=p_workspace
      group by p.id,p.standard_name,p.address
    ) q;

  else
    select jsonb_build_object('pr_report',jsonb_build_object(
      'records',coalesce(jsonb_agg(jsonb_build_object(
        'fileName',coalesce(r.source_file,''),'project',p.standard_name,'date',to_char(r.record_date,'YYYY-MM-DD'),
        'capacity',r.capacity_kwp,'gi',r.global_irradiance,'specific',r.specific_energy,
        'theoretical',r.theoretical_yield_kwh,'pv',r.pv_yield_kwh,'loss',r.loss_due_export_kwh
      ) order by r.record_date,p.standard_name),'[]'::jsonb),'sourceFiles',v_files),'sourceFiles',v_files)
    into v_payload
    from public.central_daily_records r
    join public.central_projects p on p.id=r.project_id
    where r.workspace_id=p_workspace;
  end if;

  return coalesce(v_payload,'{}'::jsonb);
end
$$;

revoke all on function public.get_central_analysis_payload(uuid,text) from public,anon;
grant execute on function public.get_central_analysis_payload(uuid,text) to authenticated;

