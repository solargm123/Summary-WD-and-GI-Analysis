# GI Map full history and coordinate management

Version 20261002-map-v4fix2; parent c683a376.

- Root causes: previous adapter exported only loaded month and excluded coordinate-less projects; used only first coordinate.
- Independent read-only full-history RPC + all Central Data Hub projects. No restore of main page state. 3-minute in-memory raw-data cache, current GI edits overlaid.
- All projects retained in filters/dashboard; missing coordinates never become 0,0; missing GI never becomes zero.
- GI labels 3 decimals, 22px/18px; smaller project names. Labels at nearby/same positions are offset with leader lines; real coordinates unchanged.
- Additional project coordinates visible after project selection and included in Fit.
- Missing-coordinate list/search plus all-project toggle. Admin can add/edit 1–20 distinct coordinate pairs.
- Atomic security-invoker RPC retains RLS, checks admin/workspace/project, validates coordinates and compares expected previous values. Project-scoped transaction lock prevents concurrent RPC overwrite.
- No GI/PR/formula/review changes; no project-update grants added.
- Fixed Northeast region key to match V4 chips and HTML-escaped display names without corrupting search.

QA: full-history adapter and overlay regression; V4 runtime with mocked Leaflet including missing projects, year list, stacked markers, extra coordinates and coordinate editor; navigation/origin checks; live database admin add/edit/conflict/null guard and Editor rejection, all temporary fixture data rolled back. Existing 130 projects / 175 coordinate rows remain.

Browser visual/performance QA on company PC remains pending. Projects without coordinates remain off-map until added. Source data availability limits the history.
