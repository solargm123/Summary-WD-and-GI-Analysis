-- Merge the duplicate Thai SANKI project into the canonical English project.
-- Daily source_project_name values remain unchanged for import provenance.

do $$
declare
  v_source uuid;
  v_target uuid;
  v_state jsonb;
  v_array jsonb;
  v_override jsonb;
  v_province text;
  v_project record;
  v_thai constant text := 'บริษัท ซันกิ อีสเทิร์น (ไทยแลนด์) จำกัด';
  v_english constant text := 'SANKI EASTERN (THAILAND) COMPANY LIMITED';
begin
  select id into v_source from public.central_projects where standard_name=v_thai;
  select id into v_target from public.central_projects where standard_name=v_english;

  if v_source is not null and v_target is null then
    update public.central_projects
    set standard_name=v_english,
        normalized_name=lower(v_english),
        updated_at=now()
    where id=v_source;
    v_target:=v_source;
    v_source:=null;
  end if;

  if v_source is not null and v_target is not null then
    if exists (
      select 1
      from public.central_daily_records source_record
      join public.central_daily_records target_record
        on target_record.workspace_id=source_record.workspace_id
       and target_record.project_id=v_target
       and target_record.record_date=source_record.record_date
      where source_record.project_id=v_source
    ) then
      raise exception 'SANKI merge stopped: overlapping record dates detected';
    end if;

    update public.central_daily_records set project_id=v_target where project_id=v_source;
    update public.central_project_aliases set project_id=v_target where project_id=v_source;
    delete from public.central_projects where id=v_source;
  end if;

  for v_project in
    select id,user_state from public.analysis_projects
    where analysis_type='global_irradiance' and deleted_at is null
    for update
  loop
    v_state:=coalesce(v_project.user_state,'{}'::jsonb);
    v_province:=coalesce(v_state->'provinceOverrides'->>v_english,v_state->'provinceOverrides'->>v_thai,'พระนครศรีอยุธยา');
    v_state:=jsonb_set(v_state,'{provinceOverrides}',(coalesce(v_state->'provinceOverrides','{}'::jsonb)-v_thai)||jsonb_build_object(v_english,v_province),true);

    if jsonb_typeof(v_state->'selectedPlants')='array' then
      select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_array
      from (select distinct case when value=v_thai then v_english else value end value from jsonb_array_elements_text(v_state->'selectedPlants')) q;
      v_state:=jsonb_set(v_state,'{selectedPlants}',v_array,true);
    end if;

    if jsonb_typeof(v_state->'selectedTrendPlants')='array' then
      select coalesce(jsonb_agg(value order by value),'[]'::jsonb) into v_array
      from (select distinct case when value=v_thai then v_english else value end value from jsonb_array_elements_text(v_state->'selectedTrendPlants')) q;
      v_state:=jsonb_set(v_state,'{selectedTrendPlants}',v_array,true);
    end if;

    if jsonb_typeof(v_state->'overrides')='object' and (v_state->'overrides') ? v_thai then
      v_override:=coalesce(v_state->'overrides'->v_english,'{}'::jsonb)||(v_state->'overrides'->v_thai);
      v_state:=jsonb_set(v_state,'{overrides}',(v_state->'overrides'-v_thai)||jsonb_build_object(v_english,v_override),true);
    end if;

    update public.analysis_projects set user_state=v_state,version=version+1,updated_at=now() where id=v_project.id;
  end loop;
end
$$;

