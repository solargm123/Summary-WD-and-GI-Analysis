-- Delete affects only Spare Parts catalogue rows; Central and analysis tables are untouched.
create policy spare_projects_admin_delete on public.spare_project_catalog
  for delete to authenticated
  using (public.workspace_role(workspace_id) = 'admin');

create policy spare_masters_admin_delete on public.spare_master_data
  for delete to authenticated
  using (public.workspace_role(workspace_id) = 'admin');

grant delete on public.spare_project_catalog, public.spare_master_data to authenticated;
