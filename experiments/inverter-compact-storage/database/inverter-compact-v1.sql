-- Additive Inverter backend v1: no changes to existing Solar tables.
create table public.inverter_devices (
 id integer generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id),
 project_id uuid references public.central_projects(id),
 source_project_name text not null check(length(source_project_name) between 1 and 500),
 device_name text not null check(length(device_name) between 1 and 500),
 unique(workspace_id,source_project_name,device_name)
);
create index inverter_devices_project_idx on public.inverter_devices(project_id);
create table public.inverter_sources (
 id integer generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id),
 name text not null check(length(name)<=1000), unique(workspace_id,name)
);
create table public.inverter_daily (
 device_id integer not null references public.inverter_devices(id),
 record_date date not null,
 capacity_milli bigint, pv_centi bigint, total_centi bigint,
 specific_milli bigint, peak_milli bigint, duration_milli bigint,
 source_id integer not null references public.inverter_sources(id), source_row integer,
 record_order integer not null default 0,
 primary key(device_id,record_date)
);
create function public.inverter_validate_workspace() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if TG_TABLE_NAME='inverter_devices' then
  if NEW.project_id is not null and not exists(select 1 from public.central_projects p where p.id=NEW.project_id and p.workspace_id=NEW.workspace_id) then raise exception 'Project workspace mismatch'; end if;
 else
  if not exists(select 1 from public.inverter_devices d join public.inverter_sources s on s.workspace_id=d.workspace_id where d.id=NEW.device_id and s.id=NEW.source_id) then raise exception 'Source workspace mismatch'; end if;
 end if;
 return NEW;
end;$$;
create trigger inverter_device_workspace before insert or update on public.inverter_devices for each row execute function public.inverter_validate_workspace();
create trigger inverter_daily_workspace before insert or update on public.inverter_daily for each row execute function public.inverter_validate_workspace();
alter table public.inverter_devices enable row level security;
alter table public.inverter_sources enable row level security;
alter table public.inverter_daily enable row level security;
create policy inverter_devices_read on public.inverter_devices for select to authenticated using(public.is_workspace_member(workspace_id));
create policy inverter_devices_insert on public.inverter_devices for insert to authenticated with check(public.can_edit_workspace(workspace_id));
create policy inverter_devices_admin_update on public.inverter_devices for update to authenticated using(public.is_workspace_admin(workspace_id)) with check(public.is_workspace_admin(workspace_id));
create policy inverter_sources_read on public.inverter_sources for select to authenticated using(public.is_workspace_member(workspace_id));
create policy inverter_sources_insert on public.inverter_sources for insert to authenticated with check(public.can_edit_workspace(workspace_id));
create policy inverter_daily_read on public.inverter_daily for select to authenticated using(exists(select 1 from public.inverter_devices d where d.id=device_id and public.is_workspace_member(d.workspace_id)));
create policy inverter_daily_insert on public.inverter_daily for insert to authenticated with check(exists(select 1 from public.inverter_devices d where d.id=device_id and public.can_edit_workspace(d.workspace_id)));
grant select,insert on public.inverter_devices,public.inverter_sources,public.inverter_daily to authenticated;
grant update(project_id) on public.inverter_devices to authenticated;
grant usage,select on sequence public.inverter_devices_id_seq,public.inverter_sources_id_seq to authenticated;
revoke all on public.inverter_devices,public.inverter_sources,public.inverter_daily from anon;
create function public.import_inverter_compact_batch(p_workspace uuid,p_rows jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare r jsonb; did integer; sid integer; old public.inverter_daily%rowtype; incoming public.inverter_daily%rowtype; added integer=0; skipped integer=0; mapped uuid; matches integer; last_did integer; device_order integer;
begin
 if not public.can_edit_workspace(p_workspace) then raise exception 'Inverter import permission denied' using errcode='42501'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>1000 then raise exception 'Expected at most 1000 rows'; end if;
 for r in select value from jsonb_array_elements(p_rows) order by value->>0,value->>1,value->>2 loop
  if jsonb_typeof(r) is distinct from 'array' or jsonb_array_length(r) not in (11,12) then raise exception 'Invalid inverter row'; end if;
  select count(*),min(id::text)::uuid into matches,mapped from public.central_projects where workspace_id=p_workspace and (standard_name=r->>0 or normalized_name=public.central_normalize_name(r->>0));
  if matches<>1 then mapped=null; end if;
  insert into public.inverter_devices(workspace_id,project_id,source_project_name,device_name) values(p_workspace,mapped,r->>0,r->>1) on conflict do nothing;
  select id into strict did from public.inverter_devices where workspace_id=p_workspace and source_project_name=r->>0 and device_name=r->>1;
  insert into public.inverter_sources(workspace_id,name) values(p_workspace,coalesce(r->>9,'')) on conflict do nothing;
  select id into strict sid from public.inverter_sources where workspace_id=p_workspace and name=coalesce(r->>9,'');
  incoming.device_id=did; incoming.record_date=(r->>2)::date;
  incoming.capacity_milli=(r->>3)::bigint;incoming.pv_centi=(r->>4)::bigint;incoming.total_centi=(r->>5)::bigint;
  incoming.specific_milli=(r->>6)::bigint;incoming.peak_milli=(r->>7)::bigint;incoming.duration_milli=(r->>8)::bigint;
  incoming.source_id=sid;incoming.source_row=(r->>10)::integer;incoming.record_order=coalesce((r->>11)::integer,0);
  -- Serialize concurrent imports for this device; held only for the bounded batch.
  perform pg_advisory_xact_lock(18417,did);
  if last_did is distinct from did then select coalesce(max(record_order),-1) into device_order from public.inverter_daily where device_id=did;last_did=did;end if;
  select * into old from public.inverter_daily where device_id=did and record_date=incoming.record_date;
  if found then
   if row(old.capacity_milli,old.pv_centi,old.total_centi,old.specific_milli,old.peak_milli,old.duration_milli) is distinct from row(incoming.capacity_milli,incoming.pv_centi,incoming.total_centi,incoming.specific_milli,incoming.peak_milli,incoming.duration_milli) then raise exception 'Inverter values differ: % / % / %',r->>0,r->>1,r->>2; end if;
   skipped=skipped+1;
  else
   incoming.record_order=greatest(incoming.record_order,device_order+1);device_order=incoming.record_order;
   insert into public.inverter_daily select incoming.*;added=added+1;
  end if;
 end loop;
 return jsonb_build_object('added',added,'skipped',skipped);
end;$$;
revoke all on function public.import_inverter_compact_batch(uuid,jsonb) from public,anon;
grant execute on function public.import_inverter_compact_batch(uuid,jsonb) to authenticated;
revoke all on function public.inverter_validate_workspace() from public,anon;

create table public.inverter_user_workspaces (
 workspace_id uuid not null references public.workspaces(id),
 user_id uuid not null default auth.uid() references auth.users(id),
 metadata jsonb not null check(jsonb_typeof(metadata)='object' and not(metadata ? 'daily') and pg_column_size(metadata)<=2097152),
 revision integer not null default 1 check(revision>0),
 primary key(workspace_id,user_id)
);
alter table public.inverter_user_workspaces enable row level security;
create policy inverter_user_workspace_read on public.inverter_user_workspaces for select to authenticated using(user_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
create policy inverter_user_workspace_insert on public.inverter_user_workspaces for insert to authenticated with check(user_id=(select auth.uid()) and public.can_edit_workspace(workspace_id));
create policy inverter_user_workspace_update on public.inverter_user_workspaces for update to authenticated using(user_id=(select auth.uid()) and public.can_edit_workspace(workspace_id)) with check(user_id=(select auth.uid()) and public.can_edit_workspace(workspace_id));
grant select,insert,update on public.inverter_user_workspaces to authenticated;
revoke all on public.inverter_user_workspaces from anon;
