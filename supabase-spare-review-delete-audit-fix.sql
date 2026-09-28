-- An AFTER DELETE audit event must not reference the row that has been deleted.
-- Preserve its ID and all former values in before_data instead.
create or replace function public.spare_log_project_review()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='DELETE' then
  insert into public.spare_project_review_events
    (workspace_id,spare_project_id,project_code,action,before_data,reviewed_by)
  values
    (old.workspace_id,null,old.project_code,'delete',to_jsonb(old),auth.uid());
  return old;
 end if;
 if old.match_status is distinct from new.match_status
    or old.central_project_id is distinct from new.central_project_id
    or old.capacity_kwp is distinct from new.capacity_kwp
    or old.province_id is distinct from new.province_id then
  insert into public.spare_project_review_events
    (workspace_id,spare_project_id,project_code,action,before_data,after_data,reviewed_by)
  values
    (new.workspace_id,new.id,new.project_code,
     case when new.match_status='independent' then 'independent' else 'linked' end,
     to_jsonb(old),to_jsonb(new),auth.uid());
 end if;
 return new;
end $$;
revoke all on function public.spare_log_project_review() from public,anon,authenticated;
