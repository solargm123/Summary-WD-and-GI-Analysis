# Inverter compact storage preview

A separate preview adds explicit database Save/Open actions to the existing report implementation. The production Inverter Report remains unchanged, including its UI, formulas, legacy workspace format and Excel export.

## Database behavior

Daily records use normalized device/source dictionaries and scaled BIGINT metrics. Project links reuse unique exact/normalized central-name matches; unresolved names remain distinct. Device-level metrics never overwrite central plant totals.

All Inverter tables enforce RLS. The batch import RPC uses SECURITY INVOKER. Members can read, Admin/Editor can add, Viewer cannot write, and unrelated users cannot access records. Notes/settings/imported-monthly snapshots are private per user and use revision checks for concurrent saves. Authenticated clients have no daily UPDATE/DELETE grant.

Imports skip identical records and reject conflicting metrics instead of overwriting. Successful earlier batches remain safely retryable. Per-device advisory locks serialize collisions; original positions are retained for an initial complete import and later records append within devices. Metadata is saved after raw batches succeed.

Batch processing uses set-based conflict checks and inserts. Read policies evaluate permitted membership/device sets. Dictionaries are paginated; daily reads use keyset pagination. The existing Main Center session is reused on the same origin, without a service-role key. Upload is never automatic.

## QA status

Signed-in browser Save completed. After refreshing to an empty page, Open from DB restored the complete imported dataset and rendered daily and monthly reports. Canonical raw-field checksums matched the source file, including metric values and provenance. Duplicate-import checks added no extra rows. Permission checks passed for Viewer and unrelated users.

Transaction tests cover zero/null values, duplicate inputs, conflicting metrics and record order. Original report regression checks cover monthly calculations, daily graphs, notes/settings, legacy workspace save/open and spreadsheet export. Generated workbooks were independently parsed. Company data, filenames, project names, measurements and fixtures are intentionally excluded from this repository documentation.

## Limitations

Full Save/Open currently transfers the entire workspace and can be slow for large datasets. Keep the original workspace backup. The experimental compact ZIP is a compatibility test; use the original format for backups. Database normalization, rather than the experimental ZIP format, is the storage strategy.

Resolve unmapped names before manual linking. Linked projects cannot be deleted through cascading deletion. Device replacement/renaming identity requires an explicit future policy. Desktop spreadsheet visual verification is separate from parser validation.

## Local QA

`node verify.cjs /path/to/decoded-daily-fixture.json`

`node --max-old-space-size=4096 integration-qa.cjs /path/to/original-workspace`

The HTML runner requires jsdom (or JSDOM_PATH); INVERTER_PREVIEW_HTML can override the HTML path. User fixtures and generated reports must not be committed.
