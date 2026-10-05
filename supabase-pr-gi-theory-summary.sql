-- Versioned RPC: existing get_pr_adjusted_summary is preserved for rollback.
-- Summarize PR with the same Capacity, GI, PV Yield and Loss Due values as the detail view.
create or replace function public.get_pr_gi_theory_summary(
  p_workspace uuid,p_date_from date default null,p_date_to date default null,
  p_day_mode text default 'pass',p_min_gi numeric default 3.5,
  p_min_specific numeric default 2.5,p_loss_factor numeric default 0.9,
  p_capacity_overrides jsonb default '{}'::jsonb,p_gi_overrides jsonb default '{}'::jsonb,
  p_record_overrides jsonb default '{}'::jsonb
)
returns jsonb language sql stable security invoker set search_path=public as $$
  with scoped as (
    select p.id,p.standard_name,p.capacity_kwp project_capacity,r.record_date,r.specific_energy,
      r.capacity_kwp source_capacity,r.global_irradiance source_gi,r.theoretical_yield_kwh source_theory,r.pv_yield_kwh source_pv,
      coalesce(nullif(nullif(p_capacity_overrides->lower(p.standard_name)->>'cap','')::numeric,0),r.capacity_kwp) capacity,
      case when (p_gi_overrides->p.standard_name->'dates') ? to_char(r.record_date,'YYYY-MM-DD') then nullif(p_gi_overrides->p.standard_name->'dates'->>to_char(r.record_date,'YYYY-MM-DD'),'')::numeric else r.global_irradiance end gi,
      coalesce(nullif(p_record_overrides->(p.standard_name||'|'||to_char(r.record_date,'YYYY-MM-DD'))->>'pv','')::numeric,r.pv_yield_kwh) pv,
      coalesce(nullif(p_record_overrides->(p.standard_name||'|'||to_char(r.record_date,'YYYY-MM-DD'))->>'loss','')::numeric,r.loss_due_export_kwh) loss
    from public.central_projects p left join public.central_daily_records r
      on r.project_id=p.id and r.workspace_id=p_workspace
      and (p_date_from is null or r.record_date>=p_date_from)
      and (p_date_to is null or r.record_date<p_date_to)
    where p.workspace_id=p_workspace and public.is_workspace_member(p_workspace)
  ), calculated as (
    select *,capacity*gi theory,
      case when capacity is not distinct from source_capacity and pv is not distinct from source_pv then specific_energy
        when specific_energy>0 and source_capacity>0 and source_pv>0 and capacity>0
          then specific_energy*(pv/source_pv)*(source_capacity/capacity)
        when capacity>0 then pv/capacity else 0 end specific
    from scoped
  ), classified as (
    select *, (gi>=p_min_gi and specific>=p_min_specific) passed from calculated
  ), grouped as (
    select id,standard_name,max(coalesce(capacity,project_capacity)) capacity,
      min(record_date) first_date,max(record_date) last_date,count(record_date) record_count,
      count(distinct record_date) filter(where p_day_mode='all' or passed) day_pass,
      sum(pv) filter(where p_day_mode='all' or passed) sum_pv,
      sum(theory) filter(where p_day_mode='all' or passed) sum_theory,
      sum(loss) filter(where p_day_mode='all' or passed) sum_loss
    from classified group by id,standard_name
  )
  select jsonb_build_object('projects',coalesce(jsonb_agg(jsonb_build_object(
    'project',standard_name,'capacity',coalesce(capacity,0),'firstDate',first_date,
    'lastDate',last_date,'recordCount',record_count,'days',day_pass,
    'pr',case when sum_theory>0 then sum_pv/sum_theory*100 end,
    'prLoss',case when sum_theory>0 then (sum_pv+sum_loss*p_loss_factor)/sum_theory*100 end
  ) order by standard_name),'[]'::jsonb)) from grouped
$$;
revoke all on function public.get_pr_gi_theory_summary(uuid,date,date,text,numeric,numeric,numeric,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.get_pr_gi_theory_summary(uuid,date,date,text,numeric,numeric,numeric,jsonb,jsonb,jsonb) to authenticated;
