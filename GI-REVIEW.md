# GI Review R1.1

Daily acceptance and project/month review are separate.

- Click `?` beside an out-of-range daily value, check the value and confirm. Accepted values participate in the GI comparison average and accepted-day count. Missing, invalid and negative values cannot be accepted. `✓` opens the revoke dialog.
- Click the review button after Status for the selected month. This only marks the project/month as checked; it never clears daily alarms or accepts daily values. A month with some missing values can still be marked as reviewed, since review does not mean all data is valid.
- The selector beside Not found filters Reviewed, Unreviewed and Needs recheck. Select one month to use monthly review controls. A date/day filter does not narrow the monthly snapshot: the whole loaded month is checked.
- Changes, paste or restore invalidate acceptance for the changed day and mark previously reviewed months for recheck. Reverting a changed value does not re-accept it. Imported/remote changes are detected by value keys and monthly snapshots on load/render.
- Editor/Admin permissions and Completed project restrictions follow existing SolarCloud rules. Viewer can inspect states but cannot confirm.
- Review metadata lives under existing shared `overrides[plant].giReview.days[date]` and `months[YYYY-MM]`. The current field patch allowlist already supports the `overrides` root and depth <=8; no schema change is needed. Server field history remains the audit source. Per-browser review filter is local view state.
- PR reads GI overrides through the existing loader. Accepted GI values have a check mark in daily Comparison records; GI/Specific thresholds, theoretical yield, loss factor and PR aggregation formulas remain unchanged. Refresh PR after saving GI reviews.

Validation: `node tests/gi-review.spec.cjs` requires jsdom. Tests use an isolated DOM and fake save/dialog adapter, never production data. They verify daily acceptance, monthly independence, changed/reverted values, filtering, restore and partial-month retention, Viewer denial and PR thresholds. Production database writes require separate verification in the Solar workspace.

R1.1 UI: review controls use the existing Font Awesome icon set (22px monthly / 18px daily). Explicit icon markup prevents the shared UI decorator adding duplicate icons. Status colors use theme tokens and keyboard focus is visible.
