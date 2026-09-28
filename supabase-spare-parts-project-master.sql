-- Solar Spare Parts, first import: project catalogue and master data only.
-- Central Data Hub remains authoritative for matched project names and capacity.
create table if not exists public.spare_project_catalog (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  central_project_id uuid references public.central_projects(id) on delete set null,
  project_code text,
  project_name text not null check (length(btrim(project_name)) > 0),
  source_name text not null,
  capacity_kwp numeric,
  province text,
  province_original text,
  match_status text not null check (match_status in ('linked','needs_review')),
  details jsonb not null default '{}'::jsonb,
  source_file text not null,
  source_row integer not null check (source_row > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id,source_file,source_row),
  check (capacity_kwp is null or capacity_kwp >= 0),
  check ((match_status='linked') = (central_project_id is not null))
);
create unique index if not exists spare_project_code_unique on public.spare_project_catalog(workspace_id,project_code) where project_code is not null;
create unique index if not exists spare_central_project_unique on public.spare_project_catalog(workspace_id,central_project_id) where central_project_id is not null;
create index if not exists spare_project_central_fk_idx on public.spare_project_catalog(central_project_id) where central_project_id is not null;
create index if not exists spare_project_status_idx on public.spare_project_catalog(workspace_id,match_status);
create table if not exists public.spare_master_data (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  master_type text not null check(master_type in ('categories','brands','models','locations','units')),
  source_id text not null,
  name text not null check(length(btrim(name)) > 0),
  brand text,
  note text,
  source_file text not null,
  created_at timestamptz not null default now(),
  unique(workspace_id,master_type,source_id)
);
create index if not exists spare_master_lookup_idx on public.spare_master_data(workspace_id,master_type,name);
alter table public.spare_project_catalog enable row level security;
alter table public.spare_master_data enable row level security;
create policy spare_projects_member_select on public.spare_project_catalog for select to authenticated using (public.is_workspace_member(workspace_id));
create policy spare_projects_editor_insert on public.spare_project_catalog for insert to authenticated with check (
  public.can_edit_workspace(workspace_id) and
  (central_project_id is null or exists(select 1 from public.central_projects p where p.id=central_project_id and p.workspace_id=spare_project_catalog.workspace_id))
);
create policy spare_projects_editor_update on public.spare_project_catalog for update to authenticated
  using (public.can_edit_workspace(workspace_id))
  with check (public.can_edit_workspace(workspace_id) and
    (central_project_id is null or exists(select 1 from public.central_projects p where p.id=central_project_id and p.workspace_id=spare_project_catalog.workspace_id)));
create policy spare_masters_member_select on public.spare_master_data for select to authenticated using (public.is_workspace_member(workspace_id));
create policy spare_masters_editor_insert on public.spare_master_data for insert to authenticated with check (public.can_edit_workspace(workspace_id));
create policy spare_masters_editor_update on public.spare_master_data for update to authenticated using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
revoke all on public.spare_project_catalog,public.spare_master_data from anon,public;
grant select,insert,update on public.spare_project_catalog,public.spare_master_data to authenticated;
