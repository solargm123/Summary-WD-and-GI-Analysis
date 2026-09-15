-- FusionSolar analysis bootstrap
-- Safe additive update. No existing data is changed.

create or replace function public.get_analysis_bootstrap(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare
  v_project public.analysis_projects;
  v_role text;
  v_workspace_name text;
  v_summary jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select * into v_project
  from public.analysis_projects
  where id=p_project_id and deleted_at is null;

  if not found then raise exception 'project_not_found' using errcode='P0002'; end if;
  if not public.is_workspace_member(v_project.workspace_id) then raise exception 'permission_denied' using errcode='42501'; end if;

  select wm.role,w.name into v_role,v_workspace_name
  from public.workspace_members wm join public.workspaces w on w.id=wm.workspace_id
  where wm.workspace_id=v_project.workspace_id and wm.user_id=auth.uid();

  v_summary=public.get_central_summary(v_project.workspace_id);

  return jsonb_build_object(
    'membership',jsonb_build_object(
      'workspace_id',v_project.workspace_id,
      'role',v_role,
      'workspaces',jsonb_build_object('name',v_workspace_name)
    ),
    'project',jsonb_build_object(
      'id',v_project.id,
      'workspace_id',v_project.workspace_id,
      'name',v_project.name,
      'analysis_type',v_project.analysis_type,
      'period_key',v_project.period_key,
      'status',v_project.status,
      'version',v_project.version,
      'dataset_id',v_project.dataset_id,
      'base_data',v_project.base_data,
      'user_state',v_project.user_state,
      'source_files',v_project.source_files,
      'updated_at',v_project.updated_at,
      'updated_by',v_project.updated_by
    ),
    'summary',v_summary
  );
end $$;

revoke all on function public.get_analysis_bootstrap(uuid) from public,anon;
grant execute on function public.get_analysis_bootstrap(uuid) to authenticated;

select 'FusionSolar analysis bootstrap installed successfully' as result;
