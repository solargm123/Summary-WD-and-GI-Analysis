# Map coordinates database release 20261002-map-db1

Project Update.xlsx imported using existing contract matches plus unambiguous central names/aliases: 175 coordinate points across 160 contracts; 119 linked central projects, 41 staged catalogue projects. SRIFA GROUP skipped because no matching existing project was found. Blank source cells skipped. No new central projects, capacity/COD/province changes, review changes, or analysis user_state updates.

New central_project_locations stores ordinal points with contract/source provenance. Primary point is ordinal 1. Central deletion cascades its locations; removing the Spare Parts catalogue link preserves linked central locations. Unlinked locations remain staged. Duplicate imports use a workspace/contract/ordinal unique key and do not overwrite conflicts.

RLS verified in a rolled-back transaction: editor reads, editor cannot insert, outsider cannot read, admin can insert. All 175 saved coordinates exactly match source latitude/longitude. No QA rows retained. Security advisor did not identify new table RLS problems; existing unrelated mutable search-path and callable-definer warnings remain for separate review.

Map now loads database locations automatically for the active analysis workspace and joins known aliases. Ambiguous names do not auto-bind. New plants loaded when period changes rebind cached coordinate data. Manual Add location and Excel override remain local previews, clearly labeled. Browser acceptance testing remains pending; mock runtime tests pass.

Schema reference: PROJECT-LOCATIONS.sql. Data payload and workbook not committed to the public repository. Code rollback: revert this release commit; retain coordinate data unless explicitly requesting data rollback.
