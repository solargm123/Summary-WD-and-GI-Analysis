-- Apply to the Solar Supabase project after supabase-spare-parts-stock.sql.
-- Corrections keep the original row for audit and atomically adjust the item balance.
begin;
alter table public.spare_stock_movements add column if not exists voided_at timestamptz;
alter table public.spare_stock_movements add column if not exists corrected_by uuid references public.spare_stock_movements(id);

create or replace function public.spare_correction_available()
returns boolean language sql stable security invoker set search_path=public as $$select true$$;
revoke all on function public.spare_correction_available() from public,anon;
grant execute on function public.spare_correction_available() to authenticated;

create or replace function public.spare_correct_movement(p_workspace uuid,p_movement_id uuid,p_payload jsonb,p_revision integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_row public.spare_stock_movements%rowtype; item public.spare_items%rowtype;
 old_a numeric:=0;old_r numeric:=0;old_p numeric:=0;
 new_a numeric:=0;new_r numeric:=0;new_p numeric:=0;
 q numeric;t text; linked uuid; replacement uuid;
begin
 if auth.uid() is null or public.workspace_role(p_workspace) is distinct from 'admin' then
  raise exception 'Only workspace admins can correct Spare Parts';
 end if;
 select * into old_row from public.spare_stock_movements where id=p_movement_id and workspace_id=p_workspace for update;
 if not found or old_row.voided_at is not null then raise exception 'Movement was already changed. Reload and retry';end if;
 if old_row.item_id is null then raise exception 'Historical movement has no linked inventory item';end if;
 select * into item from public.spare_items where id=old_row.item_id and workspace_id=p_workspace for update;
 if not found or item.revision<>p_revision then raise exception 'Inventory changed in another browser. Reload and retry';end if;
 if not old_row.historical_only then
  if old_row.movement_type in ('Receive','Return','Repair Return') then old_a:=old_row.quantity;else old_a:=-old_row.quantity;end if;
  if old_row.movement_type='Reserve' then old_r:=old_row.quantity;end if;
  if old_row.movement_type='Repair' then old_p:=old_row.quantity;elsif old_row.movement_type='Repair Return' then old_p:=-old_row.quantity;end if;
 end if;
 if p_payload is not null then
  q=(p_payload->>'qty')::numeric;t=p_payload->>'type';
  if q is null or q<=0 or t is null or t not in ('Receive','Issue','Reserve','Return','Repair','Repair Return')
   or nullif(btrim(p_payload->>'id'),'') is null or nullif(btrim(p_payload->>'date'),'') is null
   or p_payload->>'spareId' is distinct from item.spare_code then raise exception 'Invalid correction';end if;
  if not old_row.historical_only then
   if t in ('Receive','Return','Repair Return') then new_a:=q;else new_a:=-q;end if;
   if t='Reserve' then new_r:=q;end if;
   if t='Repair' then new_p:=q;elsif t='Repair Return' then new_p:=-q;end if;
  end if;
 end if;
 if item.available-old_a+new_a<0 or item.reserved-old_r+new_r<0 or item.repair-old_p+new_p<0 then
  raise exception 'Stock would become negative after correction';
 end if;
 update public.spare_items set available=item.available-old_a+new_a,reserved=item.reserved-old_r+new_r,
  repair=item.repair-old_p+new_p,revision=revision+1,updated_at=now() where id=item.id;
 if p_payload is not null then
  select id into linked from public.spare_project_catalog where workspace_id=p_workspace and project_code=nullif(p_payload->>'projectCode','') limit 1;
  insert into public.spare_stock_movements(workspace_id,movement_code,item_id,spare_code,project_id,project,project_code,movement_type,quantity,occurred_at,historical_only,details)
  values(p_workspace,p_payload->>'id',item.id,item.spare_code,linked,coalesce(p_payload->>'project',''),coalesce(p_payload->>'projectCode',''),t,q,p_payload->>'date',old_row.historical_only,p_payload)
  returning id into replacement;
 end if;
 update public.spare_stock_movements set voided_at=now(),corrected_by=replacement where id=old_row.id;
end $$;
revoke all on function public.spare_correct_movement(uuid,uuid,jsonb,integer) from public,anon;
grant execute on function public.spare_correct_movement(uuid,uuid,jsonb,integer) to authenticated;

commit;
