# PR workflow and desktop scale — 20261005-pr110-workflow1

Main Center, Working Days, GI and PR use 110% desktop workspace scaling. Existing viewport-sized dialogs compensate for workspace zoom.

PR changes: main project picker uses a draft selection, keeps multiple searched selections, and applies to overview without navigating to detail. Project name links explicitly open that project with the latest month in Central Data Hub. Chart period adds a continuous multi-month timeline alongside existing comparison modes. Calculation criteria move into Filter PR; Guarantee control is compact. Daily Notes can exclude a project/date from both PR calculations and included-day counts, with a required reason. Existing notes remain included by default. Removing the exclusion restores normal threshold behavior.

The existing dailyNotes persistence path is reused. No schema migration or production data rewrite. Summary views fetch daily rows only for projects affected by exclusions and calculate them with the canonical frontend aggregate. Underlying PV/Loss and WD/GI formulas are preserved. Future WD PV/Loss editing remains deferred.

Validation: all four pages' inline JavaScript parses; no duplicate element IDs; JSDOM tests pass for multi-search selection, applying search-only filters, staying in overview, explicit project navigation/latest-month default, continuous multi-month selection/cancel, note reason validation, exclusion in pass/all day modes, project isolation, summary correction, restoring days, view-only account protection and criteria persistence. Cloud core syntax passes; its only change is route cache versions.

Limitations: tests use simulated records and cloud responses. No authenticated production save, real Excel export, or rendered browser layout verification in this run. Latest default month refers to the latest report month in Central Data Hub; a project without data that month displays no data. Lifetime exclusion summaries may need additional data loading for affected projects.

Rollback: parent commit e991633ef2b9aa33d107baf0e8f5927c9e35d850.
