-- Fast PR portfolio summary for long periods and project-scoped detail reads.

create or replace function public.get_pr_period_summary(
  p_workspace uuid,p_date_from date default null,p_date_to date default null,
  p_day_mode text default 'pass',p_min_gi numeric default 3.5,
  p_min_specific numeric default 2.5,p_loss_factor numeric default 0.9
)
returns jsonb language sql stable security invoker set search_path=public as $$
  with scoped as (
    select p.id,p.standard_name,p.capacity_kwp project_capacity,
           min(r.record_date) over(partition by p.id) period_first,
           max(r.record_date) over(partition by p.id) period_last,
           r.record_date,r.capacity_kwp,r.global_irradiance,r.specific_energy,
           r.theoretical_yield_kwh,r.pv_yield_kwh,r.loss_due_export_kwh,
           (r.global_irradiance>=p_min_gi and r.specific_energy>=p_min_specific) passed
    from public.central_projects p
    left join public.central_daily_records r on r.project_id=p.id
      and (p_date_from is null or r.record_date>=p_date_from)
      and (p_date_to is null or r.record_date<p_date_to)
    where p.workspace_id=p_workspace and public.is_workspace_member(p_workspace)
  ), grouped as (
    select id,standard_name,max(coalesce(capacity_kwp,project_capacity)) capacity,
      min(record_date) first_date,max(record_date) last_date,count(record_date) record_count,
      count(distinct record_date) filter(where p_day_mode='all' or passed) day_pass,
      sum(pv_yield_kwh) filter(where p_day_mode='all' or passed) pv,
      sum(theoretical_yield_kwh) filter(where p_day_mode='all' or passed) theory,
      sum(loss_due_export_kwh) filter(where p_day_mode='all' or passed) loss
    from scoped group by id,standard_name
  )
  select jsonb_build_object('projects',coalesce(jsonb_agg(jsonb_build_object(
    'project',standard_name,'capacity',coalesce(capacity,0),'firstDate',first_date,
    'lastDate',last_date,'recordCount',record_count,'days',day_pass,
    'pr',case when theory>0 then pv/theory*100 end,
    'prLoss',case when theory>0 then (pv+loss*p_loss_factor)/theory*100 end
  ) order by standard_name),'[]'::jsonb)) from grouped
$$;

create or replace function public.get_pr_projects_page(
  p_workspace uuid,p_projects text[],p_date_from date default null,p_date_to date default null,
  p_after_date date default null,p_after_project uuid default null,p_limit integer default 5000
)
returns jsonb language sql stable security invoker set search_path=public as $$
  with page as (
    select r.project_id,r.record_date,coalesce(r.source_file,'') file_name,p.standard_name,
      coalesce(p.address,'') address,r.capacity_kwp,r.global_irradiance,r.specific_energy,
      r.theoretical_yield_kwh,r.pv_yield_kwh,r.loss_due_export_kwh
    from public.central_daily_records r join public.central_projects p on p.id=r.project_id
    where r.workspace_id=p_workspace and public.is_workspace_member(p_workspace)
      and (p_projects is null or p.standard_name=any(p_projects))
      and (p_date_from is null or r.record_date>=p_date_from)
      and (p_date_to is null or r.record_date<p_date_to)
      and (p_after_date is null or (r.record_date,r.project_id)>(p_after_date,p_after_project))
    order by r.record_date,r.project_id limit least(greatest(coalesce(p_limit,5000),1),5000)
  )
  select jsonb_build_object('records',coalesce(jsonb_agg(jsonb_build_object(
    'fileName',file_name,'project',standard_name,'address',address,'date',to_char(record_date,'YYYY-MM-DD'),
    'capacity',capacity_kwp,'gi',global_irradiance,'specific',specific_energy,
    'theoretical',theoretical_yield_kwh,'pv',pv_yield_kwh,'loss',loss_due_export_kwh
  ) order by record_date,project_id),'[]'::jsonb),
  'nextDate',(array_agg(to_char(record_date,'YYYY-MM-DD') order by record_date desc,project_id desc))[1],
  'nextProject',(array_agg(project_id::text order by record_date desc,project_id desc))[1]) from page
$$;

revoke all on function public.get_pr_period_summary(uuid,date,date,text,numeric,numeric,numeric) from public,anon;
revoke all on function public.get_pr_projects_page(uuid,text[],date,date,date,uuid,integer) from public,anon;
grant execute on function public.get_pr_period_summary(uuid,date,date,text,numeric,numeric,numeric) to authenticated;
grant execute on function public.get_pr_projects_page(uuid,text[],date,date,date,uuid,integer) to authenticated;

select 'PR summary functions installed successfully' as result;
