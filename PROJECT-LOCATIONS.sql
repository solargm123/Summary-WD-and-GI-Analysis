create table public.central_project_locations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_id uuid references public.central_projects(id) on delete cascade,
 catalog_id uuid references public.spare_project_catalog(id) on delete set null,
 source_contract text not null,
 source_name text not null,
 ordinal integer not null check(ordinal>0),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 source_file text,
 source_row integer,
 imported_at timestamptz not null default now(),
 unique(workspace_id,source_contract,ordinal)
);
create index on public.central_project_locations(project_id);
alter table public.central_project_locations enable row level security;
grant select,insert,update,delete on public.central_project_locations to authenticated;
create policy locations_member_read on public.central_project_locations for select to authenticated using(public.is_workspace_member(workspace_id));
create policy locations_admin_write on public.central_project_locations for all to authenticated using(public.workspace_role(workspace_id)='admin') with check(public.workspace_role(workspace_id)='admin' and (project_id is null or exists(select 1 from public.central_projects p where p.id=project_id and p.workspace_id=central_project_locations.workspace_id)) and (catalog_id is null or exists(select 1 from public.spare_project_catalog c where c.id=catalog_id and c.workspace_id=central_project_locations.workspace_id)));
