create or replace function public.import_inverter_compact_batch(p_workspace uuid,p_rows jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare vals jsonb; resolved jsonb; bad record; did integer; added integer; total integer;
begin
 if not public.can_edit_workspace(p_workspace) then raise exception 'Inverter import permission denied' using errcode='42501'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>1000 then raise exception 'Expected at most 1000 rows'; end if;
 total=jsonb_array_length(p_rows);
 if exists(select 1 from jsonb_array_elements(p_rows) x where jsonb_typeof(x) is distinct from 'array' or jsonb_array_length(x) not in (11,12)) then raise exception 'Invalid inverter row'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('project',x->>0,'device',x->>1,'date',(x->>2)::date,'capacity',(x->>3)::bigint,'pv',(x->>4)::bigint,'total',(x->>5)::bigint,'specific',(x->>6)::bigint,'peak',(x->>7)::bigint,'duration',(x->>8)::bigint,'source',coalesce(x->>9,''),'source_row',(x->>10)::integer,'position',coalesce((x->>11)::integer,0),'ordinal',n)), '[]') into vals from jsonb_array_elements(p_rows) with ordinality a(x,n);
 select x->>'project' as project,x->>'device' as device,x->>'date' as date into bad from jsonb_array_elements(vals) x group by x->>'project',x->>'device',x->>'date' having count(distinct jsonb_build_array(x->'capacity',x->'pv',x->'total',x->'specific',x->'peak',x->'duration'))>1 limit 1;
 if found then raise exception 'Inverter values differ: % / % / %',bad.project,bad.device,bad.date; end if;
 insert into public.inverter_devices(workspace_id,project_id,source_project_name,device_name)
 select p_workspace,case when p.matches=1 then p.mapped else null end,n.project,n.device from (select distinct x->>'project' project,x->>'device' device from jsonb_array_elements(vals) x) n
 left join lateral (select count(*) matches,min(c.id::text)::uuid mapped from public.central_projects c where c.workspace_id=p_workspace and (c.standard_name=n.project or c.normalized_name=public.central_normalize_name(n.project))) p on true
 where not exists(select 1 from public.inverter_devices d where d.workspace_id=p_workspace and d.source_project_name=n.project and d.device_name=n.device)
 order by n.project,n.device on conflict do nothing;
 insert into public.inverter_sources(workspace_id,name) select p_workspace,x->>'source' from jsonb_array_elements(vals) x group by x->>'source' order by x->>'source' on conflict do nothing;
 select coalesce(jsonb_agg(x||jsonb_build_object('device_id',d.id,'source_id',s.id)), '[]') into resolved from jsonb_array_elements(vals) x join public.inverter_devices d on d.workspace_id=p_workspace and d.source_project_name=x->>'project' and d.device_name=x->>'device' join public.inverter_sources s on s.workspace_id=p_workspace and s.name=x->>'source';
 if jsonb_array_length(resolved)<>total then raise exception 'Incomplete device/source dictionary'; end if;
 for did in select distinct (x->>'device_id')::integer from jsonb_array_elements(resolved) x order by 1 loop perform pg_advisory_xact_lock(18417,did); end loop;
 select x->>'project' project,x->>'device' device,x->>'date' date into bad from jsonb_array_elements(resolved) x join public.inverter_daily d on d.device_id=(x->>'device_id')::integer and d.record_date=(x->>'date')::date
 where row(d.capacity_milli,d.pv_centi,d.total_centi,d.specific_milli,d.peak_milli,d.duration_milli) is distinct from row((x->>'capacity')::bigint,(x->>'pv')::bigint,(x->>'total')::bigint,(x->>'specific')::bigint,(x->>'peak')::bigint,(x->>'duration')::bigint) limit 1;
 if found then raise exception 'Inverter values differ: % / % / %',bad.project,bad.device,bad.date; end if;
 with incoming as (select distinct on ((x->>'device_id')::integer,(x->>'date')::date) x,(x->>'device_id')::integer device_id,(x->>'date')::date record_date from jsonb_array_elements(resolved) x order by (x->>'device_id')::integer,(x->>'date')::date,(x->>'ordinal')::integer),
 fresh as (select i.* from incoming i where not exists(select 1 from public.inverter_daily d where d.device_id=i.device_id and d.record_date=i.record_date)),
 numbered as (select f.*,row_number() over(partition by device_id order by record_date)::integer rn from fresh f),
 base as (select n.*,coalesce((select max(d.record_order) from public.inverter_daily d where d.device_id=n.device_id),-1) old_max from numbered n),
 ordered as (select b.*,rn+greatest(old_max,max((x->>'position')::integer-rn) over(partition by device_id order by record_date rows unbounded preceding)) record_order from base b)
 insert into public.inverter_daily(device_id,record_date,capacity_milli,pv_centi,total_centi,specific_milli,peak_milli,duration_milli,source_id,source_row,record_order)
 select device_id,record_date,(x->>'capacity')::bigint,(x->>'pv')::bigint,(x->>'total')::bigint,(x->>'specific')::bigint,(x->>'peak')::bigint,(x->>'duration')::bigint,(x->>'source_id')::integer,(x->>'source_row')::integer,record_order from ordered order by device_id,record_date;
 get diagnostics added=row_count;
 return jsonb_build_object('added',added,'skipped',total-added);
end;$$;

alter policy inverter_devices_read on public.inverter_devices using (workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id=(select auth.uid())));
alter policy inverter_sources_read on public.inverter_sources using (workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id=(select auth.uid())));
alter policy inverter_daily_read on public.inverter_daily using (device_id in (select d.id from public.inverter_devices d));
alter policy inverter_daily_insert on public.inverter_daily with check (device_id in (select d.id from public.inverter_devices d where d.workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id=(select auth.uid()) and m.role in ('admin','editor'))));