-- FusionSolar Working Day MKT Estimate support
-- Safe update: only replaces the monthly read function.
-- Existing records, calculations and project edits are not changed.

create or replace function public.get_working_day_month(
  p_workspace uuid,
  p_month text default null
)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare
  v_month text;
  v_start date;
  v_end date;
  v_months jsonb;
  v_records jsonb;
begin
  if not public.is_workspace_member(p_workspace) then
    raise exception 'permission_denied' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(m order by m desc),'[]'::jsonb)
  into v_months
  from (
    select distinct to_char(record_date,'YYYY-MM') m
    from public.central_daily_records
    where workspace_id=p_workspace
  ) q;

  v_month=coalesce(nullif(p_month,''),v_months->>0);

  if v_month is null then
    return jsonb_build_object(
      'records','[]'::jsonb,
      'detectedMonths',v_months,
      'availableMonths',v_months,
      'loadedMonth',null,
      'payloadVersion',2
    );
  end if;

  if v_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'invalid_month';
  end if;

  v_start=(v_month||'-01')::date;
  v_end=(v_start+interval '1 month')::date;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'projectId',p.id,
        'fileName',coalesce(r.source_file,''),
        'name',p.standard_name,
        'cap',r.capacity_kwp,
        'pv',r.pv_yield_kwh,
        'specEnergy',r.specific_energy,
        'loss',r.loss_due_export_kwh,
        'recordDay',extract(day from r.record_date)::integer,
        'monthKey',to_char(r.record_date,'YYYY-MM')
      )
      order by r.record_date,p.standard_name
    ),
    '[]'::jsonb
  )
  into v_records
  from public.central_daily_records r
  join public.central_projects p on p.id=r.project_id
  where r.workspace_id=p_workspace
    and r.record_date>=v_start
    and r.record_date<v_end;

  return jsonb_build_object(
    'records',v_records,
    'detectedMonths',v_months,
    'availableMonths',v_months,
    'loadedMonth',v_month,
    'payloadVersion',2
  );
end $$;

revoke all on function public.get_working_day_month(uuid,text) from public,anon;
grant execute on function public.get_working_day_month(uuid,text) to authenticated;

select 'FusionSolar Working Day MKT support installed successfully' as result;
