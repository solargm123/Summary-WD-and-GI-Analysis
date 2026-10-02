create or replace function public.save_gi_project_locations(
 p_workspace uuid,p_project uuid,p_points jsonb,p_expected jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare old_points jsonb; contract text; source_label text; old_catalog uuid; item jsonb; seq integer:=0;
begin
 if auth.uid() is null or coalesce(public.workspace_role(p_workspace),'')<>'admin' then raise exception 'permission_denied' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace::text||':'||p_project::text,0));
 select standard_name into source_label from public.central_projects where id=p_project and workspace_id=p_workspace;
 if not found then raise exception 'project_not_found'; end if;
 if p_points is null or jsonb_typeof(p_points)<>'array' or jsonb_array_length(p_points)<1 or jsonb_array_length(p_points)>20 then raise exception 'enter_1_to_20_locations'; end if;
 if exists(select 1 from jsonb_array_elements(p_points) x where jsonb_typeof(x->'lat')<>'number' or jsonb_typeof(x->'lng')<>'number' or not(x ? 'lat' and x ? 'lng') or (x->>'lat')::numeric not between -90 and 90 or (x->>'lng')::numeric not between -180 and 180) then raise exception 'invalid_coordinates'; end if;
 if (select count(*) from jsonb_array_elements(p_points))<>(select count(distinct jsonb_build_array(x->'lat',x->'lng')) from jsonb_array_elements(p_points) x) then raise exception 'duplicate_coordinates'; end if;
 perform 1 from public.central_project_locations where project_id=p_project and workspace_id=p_workspace for update;
 select coalesce(jsonb_agg(jsonb_build_object('ordinal',ordinal,'latitude',latitude,'longitude',longitude) order by ordinal),'[]'::jsonb) into old_points from public.central_project_locations where project_id=p_project and workspace_id=p_workspace;
 if old_points is distinct from coalesce(p_expected,'[]'::jsonb) then raise exception 'locations_changed_refresh_and_retry'; end if;
 select source_contract,catalog_id into contract,old_catalog from public.central_project_locations where project_id=p_project and workspace_id=p_workspace order by ordinal limit 1;
 contract:=coalesce(contract,'gi-project:'||p_project::text);
 delete from public.central_project_locations where project_id=p_project and workspace_id=p_workspace;
 for item in select value from jsonb_array_elements(p_points) loop
 seq:=seq+1;
 insert into public.central_project_locations(workspace_id,project_id,catalog_id,source_contract,source_name,ordinal,latitude,longitude,source_file)
 values(p_workspace,p_project,old_catalog,contract,source_label,seq,(item->>'lat')::double precision,(item->>'lng')::double precision,'GI Map · admin edit');
 end loop;
 return jsonb_build_object('saved',seq);
end $$;
revoke all on function public.save_gi_project_locations(uuid,uuid,jsonb,jsonb) from public;
grant execute on function public.save_gi_project_locations(uuid,uuid,jsonb,jsonb) to authenticated;
