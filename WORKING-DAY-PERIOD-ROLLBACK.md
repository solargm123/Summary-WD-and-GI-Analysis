# Working Day period detection — 2026-10-01

## Backup

Production before this feature: `0e0b3cd9a1fe386f787d6b13b5d59eb9efdfc85e`.
Backup branch: `backup/working-day-before-period-detect-20261001`.
Working Day user-state snapshots were saved privately in `WorkingDay_State_Backup_20261001.json`: System Working Day version 391 and the earlier workspace version 17. No private state is published in this repository.

## Release

- Compact calculation-date button replaces ambiguous day-count input.
- First report date and prior history come from loaded records and the existing `get_pr_project_starts` RPC. Missing history is not proof of COD.
- Explicit COD comes from exact project-name matches in Spare Parts details and the latest PR workspace's COD overrides. Dates confirmed here are scoped to Working Day and do not overwrite the shared project COD.
- Confirmation stores one atomic JSON string under `overrides[@wdscope:<month>:<project>]`. Original day count and loss-day state are retained. Existing RPC permissions and schemas are unchanged.
- After confirmation, M1/M2 retain their established formulas but use the same inclusive date set for day count, loss-day PV, daily loss totals and Specific-based Sun Hours. Missing data blocks automatic confirmation; Manual requires final days and a reason.
- A changed scope invalidates review. “Restore pre-confirmation values” restores that project's original day/loss-date settings.
- Selected Loss Due Export is removed from visible calculation columns and result export. Raw Source Data remains available.
- Full-month projects without a confirmed scope retain previous results. Historical reduced counts are flagged, never converted to guessed dates.

## Roll back the UI

Restore `working-day-analysis.html` and `working-day-summary.js` from the backup branch in a new commit. This preserves later unrelated GI/PR changes and Git history. The new `working-day-period.js` may remain unreferenced or be removed. Do not force-reset main.

The old page ignores `@wdscope:` entries; existing day-count/loss settings remain intact. For an individual project, use the new period dialog's restore button before rolling back. If reverting other user edits as well, selectively restore the private JSON snapshot after comparing newer changes; do not blindly overwrite current workspace state.

## Validation

Run `npm ci --prefix tests` then `npm test --prefix tests`. Tests cover legacy M1/M2, prior-history vs first report, inclusive COD, excluded dates including late-month loss, trial/COD separation, Manual bounds/reason, review invalidation, capture/restore/month isolation, original-value reset, missing daily Loss, editor/viewer, TH/EN, Excel column/formula mapping, and compact metadata integration.

Known limitations: first recorded date is a suggestion, not a confirmed COD. Name matching is exact after Unicode/whitespace normalization; unmatched or renamed projects remain unverified. No automatic reconstruction of absent daily data or prorating of monthly-only Loss.
