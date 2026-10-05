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
