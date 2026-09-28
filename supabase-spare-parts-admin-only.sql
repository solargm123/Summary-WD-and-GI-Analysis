-- Only workspace admins may write to the two Spare Parts catalogue tables.
-- SELECT policies stay unchanged so members retain read access.
drop policy if exists spare_projects_editor_insert on public.spare_project_catalog;
drop policy if exists spare_projects_editor_update on public.spare_project_catalog;
drop policy if exists spare_masters_editor_insert on public.spare_master_data;
drop policy if exists spare_masters_editor_update on public.spare_master_data;

create policy spare_projects_admin_insert on public.spare_project_catalog
  for insert to authenticated
  with check (public.workspace_role(workspace_id) = 'admin' and
    (central_project_id is null or exists (
      select 1 from public.central_projects p
      where p.id = central_project_id and p.workspace_id = spare_project_catalog.workspace_id)));

create policy spare_projects_admin_update on public.spare_project_catalog
  for update to authenticated
  using (public.workspace_role(workspace_id) = 'admin')
  with check (public.workspace_role(workspace_id) = 'admin' and
    (central_project_id is null or exists (
      select 1 from public.central_projects p
      where p.id = central_project_id and p.workspace_id = spare_project_catalog.workspace_id)));

create policy spare_masters_admin_insert on public.spare_master_data
  for insert to authenticated with check (public.workspace_role(workspace_id) = 'admin');

create policy spare_masters_admin_update on public.spare_master_data
  for update to authenticated
  using (public.workspace_role(workspace_id) = 'admin')
  with check (public.workspace_role(workspace_id) = 'admin');
