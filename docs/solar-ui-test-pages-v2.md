Solar Detached UI Test V2

Open solar-ui-tests.html, then choose PR / Working Day / GI / Inverter.
Each test page is a copy of the existing page, not a unified dashboard.
Only control appearance is standardized: button sizing, borders, typography, dropdowns and popup header/footer. Original layout and page-specific controls remain.
Data: synthetic fixtures only. Source engineering routines are retained but this is not a formula certification.
Save/autosave: sandbox session/browser only. API fetch, XHR, websocket and beacons blocked; CSP connect-src none. Production cloud-core and Supabase bootstrap tags removed. No DB writes.
Browser storage namespaced solar.detached-ui-v2. Never use test fixture edits for real reports.
Internet is needed for existing font/chart/Tailwind CDN assets. The test introduces no paid API or SDK upgrade.
Known limitation: original filter behaviors remain; the earlier filter-behavior backlog is not implemented here. UI colors on semantic statuses are preserved. Native select remains native; this round changes appearance, not event wiring.
Validation: script compilation, all four pages seeded and initialized using jsdom, no uncaught exceptions; 4 projects in PR/WD/GI and 672 inverter sample rows. Chart/canvas/ResizeObserver were mocked in jsdom, so real chart rendering, PC scroll and native keyboard interactions need browser testing.
Rollback: remove detached test files only. Original application files unchanged. This is not a DB backup.
Baseline: 01d7a8545c11025bd2a506332afab9a7f7d18819
