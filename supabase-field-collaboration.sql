-- FusionSolar field-level collaboration
-- Safe additive migration. Existing project data and formulas are not changed.

create table if not exists public.analysis_field_versions (
  project_id uuid not null references public.analysis_projects(id) on delete cascade,
  field_key text not null,
  field_path text[] not null,
  version bigint not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key(project_id,field_key)
);

create index if not exists analysis_field_versions_project_version_idx
  on public.analysis_field_versions(project_id,version);

alter table public.analysis_field_versions enable row level security;

drop policy if exists field_versions_member_select on public.analysis_field_versions;
create policy field_versions_member_select
on public.analysis_field_versions for select to authenticated
using (
  exists (
    select 1
    from public.analysis_projects p
    where p.id=project_id
      and public.is_workspace_member(p.workspace_id)
  )
);

create or replace function public.jsonb_set_deep(
  p_target jsonb,
  p_path text[],
  p_value jsonb
)
returns jsonb
language plpgsql immutable
as $$
declare
  v_target jsonb := coalesce(p_target,'{}'::jsonb);
  v_cursor text[] := array[]::text[];
  v_key text;
begin
  if coalesce(array_length(p_path,1),0)=0 then return p_value; end if;
  if array_length(p_path,1)>1 then
    foreach v_key in array p_path[1:array_length(p_path,1)-1] loop
      v_cursor:=array_append(v_cursor,v_key);
      if jsonb_typeof(v_target #> v_cursor) is distinct from 'object' then
        v_target:=jsonb_set(v_target,v_cursor,'{}'::jsonb,true);
      end if;
    end loop;
  end if;
  return jsonb_set(v_target,p_path,coalesce(p_value,'null'::jsonb),true);
end;
$$;

create or replace function public.save_analysis_field_patches(
  p_project_id uuid,
  p_client_version bigint,
  p_patches jsonb,
  p_period_key text default null,
  p_change_summary jsonb default '{}'::jsonb,
  p_force boolean default false
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_project public.analysis_projects;
  v_patch jsonb;
  v_path text[];
  v_key text;
  v_last_version bigint;
  v_next_version bigint;
  v_state jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_patch_count integer;
  v_allowed text[];
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_project
  from public.analysis_projects
  where id=p_project_id and deleted_at is null
  for update;

  if not found then raise exception 'project_not_found' using errcode='P0002'; end if;
  if not public.can_edit_workspace(v_project.workspace_id) then
    raise exception 'permission_denied' using errcode='42501';
  end if;
  if v_project.status='completed' and not public.is_workspace_admin(v_project.workspace_id) then
    raise exception 'project_locked_completed' using errcode='42501';
  end if;
  if jsonb_typeof(coalesce(p_patches,'[]'::jsonb))<>'array' then
    raise exception 'invalid_patches';
  end if;

  v_patch_count:=jsonb_array_length(coalesce(p_patches,'[]'::jsonb));
  if v_patch_count>1000 then raise exception 'too_many_patches'; end if;
  if octet_length(coalesce(p_patches,'[]'::jsonb)::text)>1048576 then
    raise exception 'patch_payload_too_large';
  end if;
  if p_period_key is not null and length(p_period_key)>40 then
    raise exception 'invalid_period_key';
  end if;

  v_allowed:=case v_project.analysis_type
    when 'working_day' then array['overrides','lossFactor','sunHoursTarget','sunHoursMode','sunHoursCustom']
    when 'global_irradiance' then array['overrides','minIrr','maxIrr']
    when 'pr_report' then array['settings','guarantees','dailyNotes','monthlyNotes','projectNotes']
    else array[]::text[]
  end;

  for v_patch in select value from jsonb_array_elements(coalesce(p_patches,'[]'::jsonb))
  loop
    select coalesce(array_agg(value order by ord),array[]::text[])
    into v_path
    from jsonb_array_elements_text(v_patch->'path') with ordinality as x(value,ord);

    if coalesce(array_length(v_path,1),0)=0
       or array_length(v_path,1)>8
       or not (v_path[1]=any(v_allowed)) then
      raise exception 'invalid_patch_path';
    end if;

    v_key:=array_to_string(v_path,chr(31));
    select version into v_last_version
    from public.analysis_field_versions
    where project_id=p_project_id and field_key=v_key;

    if not p_force and coalesce(v_last_version,0)>coalesce(p_client_version,0) then
      v_conflicts:=v_conflicts||jsonb_build_array(jsonb_build_object(
        'path',to_jsonb(v_path),
        'serverValue',coalesce(v_project.user_state,'{}'::jsonb)#>v_path,
        'yourValue',v_patch->'value',
        'serverVersion',v_last_version
      ));
    end if;
  end loop;

  if jsonb_array_length(v_conflicts)>0 then
    return jsonb_build_object(
      'ok',false,
      'serverVersion',v_project.version,
      'conflicts',v_conflicts
    );
  end if;

  if v_patch_count=0 then
    return jsonb_build_object(
      'ok',true,
      'project',to_jsonb(v_project),
      'applied','[]'::jsonb
    );
  end if;

  v_next_version:=v_project.version+1;
  v_state:=coalesce(v_project.user_state,'{}'::jsonb);

  for v_patch in select value from jsonb_array_elements(p_patches)
  loop
    select array_agg(value order by ord)
    into v_path
    from jsonb_array_elements_text(v_patch->'path') with ordinality as x(value,ord);

    v_key:=array_to_string(v_path,chr(31));
    if coalesce((v_patch->>'delete')::boolean,false) then
      v_state:=v_state#-v_path;
    else
      v_state:=public.jsonb_set_deep(v_state,v_path,v_patch->'value');
    end if;

    insert into public.analysis_field_versions(
      project_id,field_key,field_path,version,updated_by,updated_at
    )
    values(
      p_project_id,v_key,v_path,v_next_version,auth.uid(),now()
    )
    on conflict(project_id,field_key) do update set
      field_path=excluded.field_path,
      version=excluded.version,
      updated_by=excluded.updated_by,
      updated_at=excluded.updated_at;
  end loop;

  update public.analysis_projects set
    user_state=v_state,
    period_key=coalesce(p_period_key,period_key),
    status=case when status='draft' then 'in_progress' else status end,
    version=v_next_version,
    updated_by=auth.uid(),
    updated_at=now()
  where id=p_project_id
  returning * into v_project;

  insert into public.activity_logs(
    workspace_id,project_id,actor_id,action,details
  )
  values(
    v_project.workspace_id,
    v_project.id,
    auth.uid(),
    'save',
    coalesce(p_change_summary,'{}'::jsonb)
      ||jsonb_build_object(
        'version',v_project.version,
        'patch_count',v_patch_count,
        'save_mode','field_level'
      )
  );

  return jsonb_build_object(
    'ok',true,
    'project',to_jsonb(v_project),
    'applied',p_patches
  );
end;
$$;

revoke all on table public.analysis_field_versions from anon;
grant select on public.analysis_field_versions to authenticated;
revoke all on function public.save_analysis_field_patches(uuid,bigint,jsonb,text,jsonb,boolean) from public,anon;
grant execute on function public.save_analysis_field_patches(uuid,bigint,jsonb,text,jsonb,boolean) to authenticated;

select 'FusionSolar field-level collaboration installed successfully' as result;
