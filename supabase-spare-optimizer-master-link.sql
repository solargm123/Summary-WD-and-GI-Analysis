-- Link only the category/brand/model combination already observed in inventory.
-- Huawei remains one shared Brand across Inverter and Optimizer.
with observed as (
 select distinct i.workspace_id,c.id category_id,b.id brand_id
 from public.spare_items i
 join public.spare_master_data c on c.workspace_id=i.workspace_id
  and c.master_type='categories' and c.name=i.category
 join public.spare_master_data b on b.workspace_id=i.workspace_id
  and b.master_type='brands' and b.name=i.brand
 join public.spare_master_data m on m.workspace_id=i.workspace_id
  and m.master_type='models' and m.name=i.model and m.brand=i.brand
 where i.category='Optimizer' and i.brand='Huawei' and i.model='MERC1300'
)
insert into public.spare_category_brands(workspace_id,category_id,brand_id)
select workspace_id,category_id,brand_id from observed on conflict do nothing;

update public.spare_master_data m set category_brand_id=cb.id
from public.spare_category_brands cb
join public.spare_master_data c on c.id=cb.category_id and c.master_type='categories' and c.name='Optimizer'
join public.spare_master_data b on b.id=cb.brand_id and b.master_type='brands' and b.name='Huawei'
where m.workspace_id=cb.workspace_id and m.master_type='models'
 and m.name='MERC1300' and m.brand='Huawei' and m.category_brand_id is null
 and exists(select 1 from public.spare_items i where i.workspace_id=m.workspace_id
  and i.category=c.name and i.brand=b.name and i.model=m.name);
