-- Shared Spare Parts inventory and append-only history. Excel history never changes opening stock.
create table public.spare_items (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 spare_code text not null check (length(btrim(spare_code))>0),
 part text not null check (length(btrim(part))>0),
 category text not null default '', brand text not null default '', model text not null default '',
 unit text not null default '', location text not null default '',
 project text not null default '', project_code text not null default '',
 project_id uuid references public.spare_project_catalog(id) on delete restrict,
 available numeric not null default 0 check(available>=0),
 reserved numeric not null default 0 check(reserved>=0),
 repair numeric not null default 0 check(repair>=0),
 min_stock numeric not null default 0 check(min_stock>=0),
 details jsonb not null default '{}'::jsonb,
 revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,spare_code)
);
create index spare_items_project_idx on public.spare_items(project_id) where project_id is not null;
create table public.spare_stock_movements (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 movement_code text not null check(length(btrim(movement_code))>0),
 item_id uuid references public.spare_items(id) on delete restrict,
 spare_code text not null default '',
 project_id uuid references public.spare_project_catalog(id) on delete restrict,
 project text not null default '', project_code text not null default '',
 movement_type text not null check(movement_type in ('Receive','Issue','Reserve','Return','Repair','Repair Return')),
 quantity numeric not null check(quantity>0),
 occurred_at text not null,
 historical_only boolean not null default false,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(workspace_id,movement_code)
);
create index spare_movements_item_idx on public.spare_stock_movements(item_id) where item_id is not null;
create index spare_movements_project_idx on public.spare_stock_movements(project_id) where project_id is not null;
create index spare_movements_history_idx on public.spare_stock_movements(workspace_id,occurred_at desc);
alter table public.spare_items enable row level security;
alter table public.spare_stock_movements enable row level security;
create policy spare_items_member_select on public.spare_items for select to authenticated using (public.is_workspace_member(workspace_id));
create policy spare_items_admin_insert on public.spare_items for insert to authenticated with check(public.workspace_role(workspace_id)='admin');
create policy spare_items_admin_update on public.spare_items for update to authenticated using(public.workspace_role(workspace_id)='admin') with check(public.workspace_role(workspace_id)='admin');
create policy spare_items_admin_delete on public.spare_items for delete to authenticated using(public.workspace_role(workspace_id)='admin');
create policy spare_movements_member_select on public.spare_stock_movements for select to authenticated using(public.is_workspace_member(workspace_id));
create policy spare_movements_admin_insert on public.spare_stock_movements for insert to authenticated with check(public.workspace_role(workspace_id)='admin' and (historical_only or current_setting('app.spare_rpc',true)='1'));
revoke all on public.spare_items, public.spare_stock_movements from public,anon,authenticated;
grant select,insert,update,delete on public.spare_items to authenticated;
grant select,insert on public.spare_stock_movements to authenticated;

-- Keep project and inventory references inside the same workspace even for direct API writes.
create function public.spare_check_stock_scope() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.project_id is not null and not exists(select 1 from public.spare_project_catalog p where p.id=new.project_id and p.workspace_id=new.workspace_id) then
  raise exception 'Spare project belongs to another workspace';
 end if;
 if tg_table_name='spare_stock_movements' then
  if new.item_id is not null and not exists(select 1 from public.spare_items i where i.id=new.item_id and i.workspace_id=new.workspace_id) then
   raise exception 'Spare item belongs to another workspace';
  end if;
 end if;
 return new;
end $$;
create trigger spare_items_scope before insert or update on public.spare_items for each row execute function public.spare_check_stock_scope();
create trigger spare_movements_scope before insert on public.spare_stock_movements for each row execute function public.spare_check_stock_scope();
revoke all on function public.spare_check_stock_scope() from public,anon,authenticated;

-- The database also guards deletes and renames when another browser has references.
create function public.spare_guard_catalog_references() returns trigger language plpgsql security invoker set search_path=public as $$
declare used boolean; check_refs boolean;
begin
 if tg_table_name='spare_project_catalog' then
  if tg_op='DELETE' then check_refs:=true;
  else check_refs:=new.project_name is distinct from old.project_name or new.project_code is distinct from old.project_code;end if;
  if check_refs then
   select exists(select 1 from public.spare_items i where i.workspace_id=old.workspace_id and (i.project_id=old.id or (i.project_id is null and (i.project_code=old.project_code and old.project_code is not null or lower(btrim(i.project))=lower(btrim(old.project_name)) and i.project<>''))))
    or exists(select 1 from public.spare_stock_movements m where m.workspace_id=old.workspace_id and (m.project_id=old.id or (m.project_id is null and (m.project_code=old.project_code and old.project_code is not null or lower(btrim(m.project))=lower(btrim(old.project_name)) and m.project<>'')))) into used;
  end if;
 else
  if tg_op='DELETE' then check_refs:=true;
  else check_refs:=new.name is distinct from old.name;end if;
  if check_refs then
   select exists(select 1 from public.spare_items i where i.workspace_id=old.workspace_id and lower(btrim(case old.master_type when 'categories' then i.category when 'brands' then i.brand when 'models' then i.model when 'locations' then i.location when 'units' then i.unit end))=lower(btrim(old.name)))
    or exists(select 1 from public.spare_stock_movements m where m.workspace_id=old.workspace_id and lower(btrim(case old.master_type when 'categories' then m.details->>'category' when 'brands' then m.details->>'brand' when 'models' then m.details->>'model' when 'locations' then m.details->>'location' when 'units' then m.details->>'unit' end))=lower(btrim(old.name))) into used;
  end if;
 end if;
 if used then raise exception 'Spare Parts data still references this record'; end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger spare_project_guard before update or delete on public.spare_project_catalog for each row execute function public.spare_guard_catalog_references();
create trigger spare_master_guard before update or delete on public.spare_master_data for each row execute function public.spare_guard_catalog_references();
revoke all on function public.spare_guard_catalog_references() from public,anon,authenticated;

-- One database transaction locks the item, changes stock, and appends history.
create function public.spare_post_movement(p_workspace uuid,p_spare_code text,p_payload jsonb,p_revision integer)
returns void language plpgsql security invoker set search_path=public as $$
declare item public.spare_items%rowtype; q numeric; t text; new_available numeric; new_reserved numeric; new_repair numeric; linked uuid;
begin
 if public.workspace_role(p_workspace) is distinct from 'admin' then raise exception 'Only workspace admins can write Spare Parts'; end if;
 select * into item from public.spare_items where workspace_id=p_workspace and spare_code=p_spare_code for update;
 if not found then raise exception 'Spare item not found'; end if;
 if item.revision<>p_revision then raise exception 'Inventory changed in another browser. Reload and retry'; end if;
 q=(p_payload->>'qty')::numeric;t=p_payload->>'type';
 if q is null or q<=0 or t not in ('Receive','Issue','Reserve','Return','Repair','Repair Return') then raise exception 'Invalid movement'; end if;
 new_available=item.available;new_reserved=item.reserved;new_repair=item.repair;
 if t='Receive' or t='Return' then new_available:=new_available+q;
 elsif t='Issue' then new_available:=new_available-q;
 elsif t='Reserve' then new_available:=new_available-q;new_reserved:=new_reserved+q;
 elsif t='Repair' then new_available:=new_available-q;new_repair:=new_repair+q;
 elsif t='Repair Return' then new_repair:=new_repair-q;new_available:=new_available+q; end if;
 if new_available<0 or new_repair<0 then raise exception 'Insufficient stock'; end if;
 perform set_config('app.spare_rpc','1',true);
 select id into linked from public.spare_project_catalog where workspace_id=p_workspace and project_code=nullif(p_payload->>'projectCode','') limit 1;
 update public.spare_items set available=new_available,reserved=new_reserved,repair=new_repair,revision=revision+1,updated_at=now() where id=item.id;
 insert into public.spare_stock_movements(workspace_id,movement_code,item_id,spare_code,project_id,project,project_code,movement_type,quantity,occurred_at,details)
 values(p_workspace,p_payload->>'id',item.id,item.spare_code,linked,coalesce(p_payload->>'project',''),coalesce(p_payload->>'projectCode',''),t,q,p_payload->>'date',p_payload);
end $$;
revoke all on function public.spare_post_movement(uuid,text,jsonb,integer) from public,anon;
grant execute on function public.spare_post_movement(uuid,text,jsonb,integer) to authenticated;
