-- Remove only the 167 migration-generated province-backfill events: one transaction,
-- exact timestamp, no authenticated reviewer. Keep all human review records intact.
delete from public.spare_project_review_events
where reviewed_by is null
  and reviewed_at = '2026-09-28 14:20:11.23978+00'::timestamptz
  and action = 'linked'
  and before_data->>'province_id' is null
  and after_data->>'province_id' is not null;

create function public.spare_stamp_project_review() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if old.match_status is distinct from new.match_status
    or old.central_project_id is distinct from new.central_project_id
    or old.capacity_kwp is distinct from new.capacity_kwp
    or old.province_id is distinct from new.province_id then
   if auth.uid() is not null then
     new.reviewed_by := auth.uid();
     new.reviewed_at := now();
   else
     new.reviewed_by := null;
     new.reviewed_at := null;
   end if;
 end if;
 return new;
end $$;
revoke all on function public.spare_stamp_project_review() from public,anon,authenticated;
create trigger spare_review_stamp before update on public.spare_project_catalog
for each row execute function public.spare_stamp_project_review();
