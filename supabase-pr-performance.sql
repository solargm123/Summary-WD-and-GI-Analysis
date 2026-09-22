-- PR report cursor pagination and lightweight project-start lookup.
-- Additive only: no central records are copied or modified.

create index if not exists central_daily_records_workspace_date_project_idx
  on public.central_daily_records(workspace_id,record_date,project_id);

create or replace function public.get_pr_report_page(
  p_workspace uuid,
  p_date_from date default null,
  p_date_to date default null,
  p_after_date date default null,
  p_after_project uuid default null,
  p_limit integer default 5000
)
returns jsonb
language sql
stable
security invoker
set search_path=public
as $$
  with page as (
    select r.project_id,r.record_date,coalesce(r.source_file,'') file_name,
           p.standard_name,coalesce(p.address,'') address,r.capacity_kwp,
           r.global_irradiance,r.specific_energy,r.theoretical_yield_kwh,
           r.pv_yield_kwh,r.loss_due_export_kwh
    from public.central_daily_records r
    join public.central_projects p on p.id=r.project_id
    where r.workspace_id=p_workspace
      and public.is_workspace_member(p_workspace)
      and (p_date_from is null or r.record_date>=p_date_from)
      and (p_date_to is null or r.record_date<p_date_to)
      and (p_after_date is null or (r.record_date,r.project_id)>(p_after_date,p_after_project))
    order by r.record_date,r.project_id
    limit least(greatest(coalesce(p_limit,5000),1),5000)
  )
  select jsonb_build_object(
    'records',coalesce(jsonb_agg(jsonb_build_object(
      'fileName',file_name,'project',standard_name,'address',address,
      'date',to_char(record_date,'YYYY-MM-DD'),'capacity',capacity_kwp,
      'gi',global_irradiance,'specific',specific_energy,
      'theoretical',theoretical_yield_kwh,'pv',pv_yield_kwh,
      'loss',loss_due_export_kwh
    ) order by record_date,project_id),'[]'::jsonb),
    'nextDate',(array_agg(to_char(record_date,'YYYY-MM-DD') order by record_date desc,project_id desc))[1],
    'nextProject',(array_agg(project_id::text order by record_date desc,project_id desc))[1]
  )
  from page
$$;

create or replace function public.get_pr_project_starts(p_workspace uuid)
returns jsonb
language sql
stable
security invoker
set search_path=public
as $$
  select coalesce(jsonb_object_agg(q.standard_name,to_char(q.first_date,'YYYY-MM-DD')),'{}'::jsonb)
  from (
    select p.standard_name,min(r.record_date) first_date
    from public.central_daily_records r
    join public.central_projects p on p.id=r.project_id
    where r.workspace_id=p_workspace and public.is_workspace_member(p_workspace)
    group by p.id,p.standard_name
  ) q
$$;

revoke all on function public.get_pr_report_page(uuid,date,date,date,uuid,integer) from public,anon;
revoke all on function public.get_pr_project_starts(uuid) from public,anon;
grant execute on function public.get_pr_report_page(uuid,date,date,date,uuid,integer) to authenticated;
grant execute on function public.get_pr_project_starts(uuid) to authenticated;

select 'PR performance functions installed successfully' as result;
