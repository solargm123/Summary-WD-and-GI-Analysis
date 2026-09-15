-- FusionSolar database storage monitor
-- Safe additive update. No application data is changed.

create or replace function public.get_database_storage_status(
  p_workspace uuid,
  p_limit_bytes bigint default 524288000
)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare
  v_database_bytes bigint;
  v_central_bytes bigint;
  v_limit bigint:=greatest(coalesce(p_limit_bytes,524288000),1);
begin
  if not public.is_workspace_member(p_workspace) then
    raise exception 'permission_denied' using errcode='42501';
  end if;

  select pg_database_size(current_database()) into v_database_bytes;
  select coalesce(sum(pg_total_relation_size(c.oid)),0) into v_central_bytes
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('central_projects','central_project_aliases','central_import_batches','central_import_files','central_daily_records');

  return jsonb_build_object(
    'database_bytes',v_database_bytes,
    'central_data_bytes',v_central_bytes,
    'limit_bytes',v_limit,
    'remaining_bytes',greatest(v_limit-v_database_bytes,0),
    'used_percent',least(round((v_database_bytes::numeric/v_limit::numeric)*100,2),100)
  );
end $$;

revoke all on function public.get_database_storage_status(uuid,bigint) from public,anon;
grant execute on function public.get_database_storage_status(uuid,bigint) to authenticated;

select 'FusionSolar database storage monitor installed successfully' as result;
