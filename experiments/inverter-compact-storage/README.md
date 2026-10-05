# Inverter compact adapter test v1

Experimental data adapter; no production HTML changes or database migration.

QA using Inverter_Analysis_Workspace_2026-10-04(1).iaw:
- 346,182 daily rows, 562 project-device pairs, 1,323 source names.
- Every restored field identical, including null, zero and source provenance.
- PV Yield/grid-duration totals identical across 12,498 device-month groups.
- BIGINT values serialized as strings; decimals beyond supported scales rejected, never rounded.

PostgreSQL temporary-table size experiment: 1,001 actual evenly sampled rows replicated to 346,182 rows; heap 31,940,608 bytes, unique index 7,798,784 bytes, total 39,763,968 bytes. Transaction rolled back. Estimated final additional storage 40–50 MB; metadata, RLS design and indexing remain to be finalized. This is not a full actual-data PostgreSQL import.

Remaining before production: resolve 3 project aliases with user; confirm device identity across replacement/renaming; design workspace RLS, import conflict handling and provenance; full database roundtrip; integrate adapter; actual UI graph/XLSX/.iaw regression checks. Existing formulas and raw project totals must remain unchanged. The standalone monthly sum check here is data fidelity validation, not the complete production monthly report algorithm.

Run: node verify.cjs /path/to/decoded-daily-fixture.json
Fixture is intentionally not committed to GitHub.

## Browser integration preview

Current preview: inverter-analysis-compact-test.html (repository root) (standalone, embedded libraries).
Open the original .iaw using Open Workspace. New sidebar controls Compact Test Save/Open write/read .iactest files. Standard report import, .iaw saving and Excel exports remain original. No Supabase data writes or central-project auto-mapping.

Compact preview uses 25,000-row batches with event-loop yields, preserving all metadata and imported monthly records separately. This is an adapter compatibility test, not a finished database connection. The .iactest archive measured 7,496,504 bytes, larger than the original 6,493,824-byte .iaw; keep the original .iaw for compressed backups. Estimated PostgreSQL storage savings come from normalized tables/scaled integers, not this test archive.

Runtime QA via JSDOM: actual production reader, monthly analysis, monthly table, note/settings persistence, legacy .iaw writer/reader and actual presentation Excel writer. Excel independently read with openpyxl: 532 inverter-month rows and 126 project summaries for September 2026, including all 4 Yong Thai Rubber inverters. Desktop Excel and real-browser visual/interaction QA remain pending.

Integration test: node --max-old-space-size=4096 integration-qa.cjs /path/to/original.iaw
The runner requires jsdom (or JSDOM_PATH). INVERTER_PREVIEW_HTML can override the preview HTML path. No data fixtures are committed.

Additional QA passed: original daily SVG output identical before/after compact reload for Yong Thai Rubber September 2026; every raw field identical after legacy .iaw save/reopen. No runtime errors.
