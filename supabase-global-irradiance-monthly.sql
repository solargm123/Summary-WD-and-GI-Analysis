-- FusionSolar Global Irradiance monthly loader
-- Safe additive update. No existing records are changed or deleted.

create or replace function public.get_global_irradiance_month(
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
  v_dates jsonb;
  v_files jsonb;
  v_plants jsonb;
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
      'plants','{}'::jsonb,
      'dates','[]'::jsonb,
      'availableMonths',v_months,
      'loadedMonth',null,
      'sourceFiles','[]'::jsonb
    );
  end if;

  if v_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'invalid_month';
  end if;

  v_start=(v_month||'-01')::date;
  v_end=(v_start+interval '1 month')::date;

  select coalesce(jsonb_agg(d order by d),'[]'::jsonb)
  into v_dates
  from (
    select distinct to_char(record_date,'YYYY-MM-DD') d
    from public.central_daily_records
    where workspace_id=p_workspace
      and record_date>=v_start
      and record_date<v_end
  ) q;

  select coalesce(jsonb_agg(x.file_name order by x.file_name),'[]'::jsonb)
  into v_files
  from (
    select distinct on (f.file_fingerprint) f.file_name,f.file_fingerprint
    from public.central_import_files f
    where f.workspace_id=p_workspace
      and f.status='completed'
      and (f.record_date is null or (f.record_date>=v_start and f.record_date<v_end))
  ) x;

  select coalesce(
    jsonb_object_agg(
      q.standard_name,
      jsonb_build_object(
        'capacity',q.capacity_kwp,
        'note','',
        'dates',q.dates
      )
    ),
    '{}'::jsonb
  )
  into v_plants
  from (
    select
      p.id,
      p.standard_name,
      max(coalesce(r.capacity_kwp,p.capacity_kwp)) capacity_kwp,
      jsonb_object_agg(
        to_char(r.record_date,'YYYY-MM-DD'),
        r.global_irradiance
        order by r.record_date
      ) dates
    from public.central_daily_records r
    join public.central_projects p on p.id=r.project_id
    where r.workspace_id=p_workspace
      and r.record_date>=v_start
      and r.record_date<v_end
    group by p.id,p.standard_name
  ) q;

  return jsonb_build_object(
    'plants',v_plants,
    'dates',v_dates,
    'availableMonths',v_months,
    'loadedMonth',v_month,
    'sourceFiles',v_files
  );
end $$;

revoke all on function public.get_global_irradiance_month(uuid,text) from public,anon;
grant execute on function public.get_global_irradiance_month(uuid,text) to authenticated;

select 'FusionSolar Global Irradiance monthly loader installed successfully' as result;
