# Filter interaction staging checkpoint

Baseline: GitHub main ea3eceb91d459ca4f03eaa9955cfd73b05225c3e.

Changes: GI and Working Day project selection is temporary until Apply; closing cancels. Search narrows checkbox choices only, and does not replace selected projects. GI date loading waits for Apply. GI Trend project/date selection has Apply/Cancel. PR comparison Reset clears only the draft; Apply preserves eligible record filters. PR records allow multiple projects without changing chart projects. PR detail selection is captured as personal view state keyed by user/workspace through the existing local-state mechanism. Inverter automatic loading restores the current project's remembered device selection. Applied filter summaries are event driven without timers or network calls.

Synthetic test pages: gi-ui-test.html, working-day-ui-test.html, pr-report-ui-test.html, inverter-ui-test.html. Built by tests/build-filter-previews.cjs. CSP blocks connections and solar-test-sandbox.js blocks API/XHR/WebSocket requests and namespaces storage. Old solar-test-interactions-v3.js overrides are deliberately omitted so testers exercise the actual changed controls.

Validation:
- tests/filter-transactions.cjs: PASS (GI/WD draft, Cancel, Apply independent of search; PR draft Reset and retained filter).
- tests/pr-filter-dom.cjs: PASS using actual PR markup/functions in jsdom (multiselect, Apply/Cancel, selections retained during search, chart project set unchanged).
- tests/working-day-period.cjs: PASS, including unchanged method 1/2 equations, notes and review invalidation.
- tests/inverter-shared.cjs: PASS (threshold merging and personal-only writes).
- Solar safety static checker: 0 errors, 4 existing floating Supabase CDN warnings.
- tests/pr-110-workflow.cjs: FAIL, actual 37.5 vs expected 75. Identical failure reproduced on pristine baseline. No calculation change made to suppress it.
- git diff --check: PASS.

Not verified: interactive real-browser clicks, authenticated production workflows, actual concurrent users, RAM/CPU measurements, PR detailed refresh restoration and Inverter database loading. Keep this branch as draft staging until those checks pass. Main is not promoted.

Rollback: discard this branch; production main and database were not modified.
