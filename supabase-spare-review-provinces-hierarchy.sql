-- Shared province choices and admin review. Existing project/GI values remain intact.
create table public.province_catalog (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name_th text not null check(length(btrim(name_th))>0),
 name_en text not null default '',
 aliases text[] not null default '{}',
 created_at timestamptz not null default now(),
 unique(workspace_id,name_th)
);
alter table public.province_catalog enable row level security;
create policy province_member_read on public.province_catalog for select to authenticated using(public.is_workspace_member(workspace_id));
create policy province_admin_add on public.province_catalog for insert to authenticated with check(public.workspace_role(workspace_id)='admin');
create unique index province_unique_normalized on public.province_catalog(workspace_id,lower(btrim(name_th)));
revoke all on public.province_catalog from public,anon,authenticated;
grant select,insert on public.province_catalog to authenticated;

alter table public.spare_project_catalog add column province_id uuid references public.province_catalog(id) on delete restrict;
alter table public.spare_project_catalog add column reviewed_at timestamptz;
alter table public.spare_project_catalog add column reviewed_by uuid;
alter table public.spare_project_catalog add column capacity_source text check(capacity_source in ('central','excel'));
alter table public.spare_project_catalog add column province_source text check(province_source in ('catalog','excel','address','manual'));
alter table public.spare_project_catalog drop constraint spare_project_catalog_match_status_check;
alter table public.spare_project_catalog add constraint spare_project_catalog_match_status_check check(match_status in ('linked','needs_review','independent'));
create index spare_project_province_idx on public.spare_project_catalog(province_id) where province_id is not null;
create function public.spare_check_project_province() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.province_id is not null and not exists(select 1 from public.province_catalog p where p.id=new.province_id and p.workspace_id=new.workspace_id and p.name_th=new.province) then
  raise exception 'Selected province does not belong to this workspace';
 end if;return new;
end $$;
revoke all on function public.spare_check_project_province() from public,anon,authenticated;
create trigger spare_project_province_scope before insert or update on public.spare_project_catalog for each row execute function public.spare_check_project_province();

create table public.spare_project_review_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 spare_project_id uuid references public.spare_project_catalog(id) on delete set null,
 project_code text,action text not null check(action in ('linked','independent','delete')),
 before_data jsonb not null,after_data jsonb,reviewed_by uuid,reviewed_at timestamptz not null default now()
);
alter table public.spare_project_review_events enable row level security;
create policy spare_review_member_read on public.spare_project_review_events for select to authenticated using(public.is_workspace_member(workspace_id));
create policy spare_review_admin_insert on public.spare_project_review_events for insert to authenticated with check(public.workspace_role(workspace_id)='admin');
revoke all on public.spare_project_review_events from public,anon,authenticated;
grant select,insert on public.spare_project_review_events to authenticated;
create function public.spare_log_project_review() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='DELETE' then
  insert into public.spare_project_review_events(workspace_id,spare_project_id,project_code,action,before_data,reviewed_by)
  values(old.workspace_id,old.id,old.project_code,'delete',to_jsonb(old),auth.uid());return old;
 end if;
 if old.match_status is distinct from new.match_status or old.central_project_id is distinct from new.central_project_id or old.capacity_kwp is distinct from new.capacity_kwp or old.province_id is distinct from new.province_id then
  insert into public.spare_project_review_events(workspace_id,spare_project_id,project_code,action,before_data,after_data,reviewed_by)
  values(new.workspace_id,new.id,new.project_code,case when new.match_status='independent' then 'independent' else 'linked' end,to_jsonb(old),to_jsonb(new),auth.uid());
 end if;
 return new;
end $$;
revoke all on function public.spare_log_project_review() from public,anon,authenticated;
create trigger spare_review_update after update on public.spare_project_catalog for each row execute function public.spare_log_project_review();
create trigger spare_review_delete after delete on public.spare_project_catalog for each row execute function public.spare_log_project_review();

-- A brand is reusable under several categories; models belong to one category/brand pair.
create table public.spare_category_brands (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 category_id uuid not null references public.spare_master_data(id) on delete restrict,
 brand_id uuid not null references public.spare_master_data(id) on delete restrict,
 unique(workspace_id,category_id,brand_id)
);
alter table public.spare_category_brands enable row level security;
create policy spare_category_brand_read on public.spare_category_brands for select to authenticated using(public.is_workspace_member(workspace_id));
create policy spare_category_brand_add on public.spare_category_brands for insert to authenticated with check(public.workspace_role(workspace_id)='admin');
revoke all on public.spare_category_brands from public,anon,authenticated;
grant select,insert on public.spare_category_brands to authenticated;
create function public.spare_check_category_brand() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from public.spare_master_data c where c.id=new.category_id and c.workspace_id=new.workspace_id and c.master_type='categories')
 or not exists(select 1 from public.spare_master_data b where b.id=new.brand_id and b.workspace_id=new.workspace_id and b.master_type='brands')
 then raise exception 'Category and brand must belong to this workspace';end if;
 return new;
end $$;
revoke all on function public.spare_check_category_brand() from public,anon,authenticated;
create trigger spare_category_brand_scope before insert on public.spare_category_brands for each row execute function public.spare_check_category_brand();
alter table public.spare_master_data add column category_brand_id uuid references public.spare_category_brands(id) on delete restrict;
create index spare_model_pair_idx on public.spare_master_data(category_brand_id) where category_brand_id is not null;

create function public.spare_check_master_pair() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.category_brand_id is not null and not exists(
  select 1 from public.spare_category_brands cb join public.spare_master_data c on c.id=cb.category_id join public.spare_master_data b on b.id=cb.brand_id
  where cb.id=new.category_brand_id and cb.workspace_id=new.workspace_id and new.master_type='models'
   and c.workspace_id=new.workspace_id and c.master_type='categories'
   and b.workspace_id=new.workspace_id and b.master_type='brands' and b.name=new.brand
 ) then raise exception 'Model category/brand relation is invalid';end if;
 return new;
end $$;
revoke all on function public.spare_check_master_pair() from public,anon,authenticated;
create trigger spare_model_pair_scope before insert or update on public.spare_master_data for each row execute function public.spare_check_master_pair();

-- Backfill links only when project/inventory evidence identifies exactly one category.
with observed as (
 select m.id,m.workspace_id, c.id category_id,b.id brand_id from public.spare_master_data m
 join public.spare_master_data b on b.workspace_id=m.workspace_id and b.master_type='brands' and b.name=m.brand
 join public.spare_master_data c on c.workspace_id=m.workspace_id and c.master_type='categories'
 where m.master_type='models' and (
  c.name='PV Module' and (exists(select 1 from public.spare_project_catalog p where p.workspace_id=m.workspace_id and p.details->>'pvModuleModel'=m.name) or exists(select 1 from public.spare_items i where i.workspace_id=m.workspace_id and i.category='PV Module' and i.model=m.name))
  or c.name='Inverter' and exists(select 1 from public.spare_project_catalog p where p.workspace_id=m.workspace_id and m.name in (p.details->>'inverter1',p.details->>'inverter2',p.details->>'inverter3'))
 )
), certain as (select * from observed o where (select count(*) from observed q where q.id=o.id)=1)
insert into public.spare_category_brands(workspace_id,category_id,brand_id)
select distinct workspace_id,category_id,brand_id from certain on conflict do nothing;
with observed as (
 select m.id,c.id category_id,b.id brand_id from public.spare_master_data m
 join public.spare_master_data b on b.workspace_id=m.workspace_id and b.master_type='brands' and b.name=m.brand
 join public.spare_master_data c on c.workspace_id=m.workspace_id and c.master_type='categories'
 where m.master_type='models' and (
  c.name='PV Module' and (exists(select 1 from public.spare_project_catalog p where p.workspace_id=m.workspace_id and p.details->>'pvModuleModel'=m.name) or exists(select 1 from public.spare_items i where i.workspace_id=m.workspace_id and i.category='PV Module' and i.model=m.name))
  or c.name='Inverter' and exists(select 1 from public.spare_project_catalog p where p.workspace_id=m.workspace_id and m.name in (p.details->>'inverter1',p.details->>'inverter2',p.details->>'inverter3'))
 )
), certain as (select * from observed o where (select count(*) from observed q where q.id=o.id)=1)
update public.spare_master_data m set category_brand_id=cb.id from certain o join public.spare_category_brands cb on cb.category_id=o.category_id and cb.brand_id=o.brand_id where m.id=o.id;

-- Seed the same canonical Thai/English province names already used by GI.
insert into public.province_catalog(workspace_id,name_th,name_en)
select w.workspace_id,p.name_th,p.name_en from (select distinct workspace_id from public.spare_project_catalog) w cross join (values
 ('กรุงเทพมหานคร','Bangkok'),
 ('กระบี่','Krabi'),
 ('กาญจนบุรี','Kanchanaburi'),
 ('กาฬสินธุ์','Kalasin'),
 ('กำแพงเพชร','Kamphaeng Phet'),
 ('ขอนแก่น','Khon Kaen'),
 ('จันทบุรี','Chanthaburi'),
 ('ฉะเชิงเทรา','Chachoengsao'),
 ('ชลบุรี','Chon Buri'),
 ('ชัยนาท','Chai Nat'),
 ('ชัยภูมิ','Chaiyaphum'),
 ('ชุมพร','Chumphon'),
 ('เชียงราย','Chiang Rai'),
 ('เชียงใหม่','Chiang Mai'),
 ('ตรัง','Trang'),
 ('ตราด','Trat'),
 ('ตาก','Tak'),
 ('นครนายก','Nakhon Nayok'),
 ('นครปฐม','Nakhon Pathom'),
 ('นครพนม','Nakhon Phanom'),
 ('นครราชสีมา','Nakhon Ratchasima'),
 ('นครศรีธรรมราช','Nakhon Si Thammarat'),
 ('นครสวรรค์','Nakhon Sawan'),
 ('นนทบุรี','Nonthaburi'),
 ('นราธิวาส','Narathiwat'),
 ('น่าน','Nan'),
 ('บึงกาฬ','Bueng Kan'),
 ('บุรีรัมย์','Buri Ram'),
 ('ปทุมธานี','Pathum Thani'),
 ('ประจวบคีรีขันธ์','Prachuap Khiri Khan'),
 ('ปราจีนบุรี','Prachin Buri'),
 ('ปัตตานี','Pattani'),
 ('พระนครศรีอยุธยา','Phra Nakhon Si Ayutthaya'),
 ('พะเยา','Phayao'),
 ('พังงา','Phang Nga'),
 ('พัทลุง','Phatthalung'),
 ('พิจิตร','Phichit'),
 ('พิษณุโลก','Phitsanulok'),
 ('เพชรบุรี','Phetchaburi'),
 ('เพชรบูรณ์','Phetchabun'),
 ('แพร่','Phrae'),
 ('ภูเก็ต','Phuket'),
 ('มหาสารคาม','Maha Sarakham'),
 ('มุกดาหาร','Mukdahan'),
 ('แม่ฮ่องสอน','Mae Hong Son'),
 ('ยโสธร','Yasothon'),
 ('ยะลา','Yala'),
 ('ร้อยเอ็ด','Roi Et'),
 ('ระนอง','Ranong'),
 ('ระยอง','Rayong'),
 ('ราชบุรี','Ratchaburi'),
 ('ลพบุรี','Lop Buri'),
 ('ลำปาง','Lampang'),
 ('ลำพูน','Lamphun'),
 ('เลย','Loei'),
 ('ศรีสะเกษ','Si Sa Ket'),
 ('สกลนคร','Sakon Nakhon'),
 ('สงขลา','Songkhla'),
 ('สตูล','Satun'),
 ('สมุทรปราการ','Samut Prakan'),
 ('สมุทรสงคราม','Samut Songkhram'),
 ('สมุทรสาคร','Samut Sakhon'),
 ('สระแก้ว','Sa Kaeo'),
 ('สระบุรี','Saraburi'),
 ('สิงห์บุรี','Sing Buri'),
 ('สุโขทัย','Sukhothai'),
 ('สุพรรณบุรี','Suphan Buri'),
 ('สุราษฎร์ธานี','Surat Thani'),
 ('สุรินทร์','Surin'),
 ('หนองคาย','Nong Khai'),
 ('หนองบัวลำภู','Nong Bua Lam Phu'),
 ('อ่างทอง','Ang Thong'),
 ('อำนาจเจริญ','Amnat Charoen'),
 ('อุดรธานี','Udon Thani'),
 ('อุตรดิตถ์','Uttaradit'),
 ('อุทัยธานี','Uthai Thani'),
 ('อุบลราชธานี','Ubon Ratchathani')
) p(name_th,name_en) on conflict(workspace_id,name_th) do nothing;
update public.spare_project_catalog s set province_id=p.id from public.province_catalog p where s.workspace_id=p.workspace_id and s.province=p.name_th and s.province_id is null;
