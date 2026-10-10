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
- tests/pr-110-workflow.cjs: PASS after repairing stale synthetic capacities. Existing PR 75%, PR with loss 81.75%, note exclusions and summary expectations remain unchanged. Added an assertion that altering legacy theoretical yield does not affect Capacity × GI. No production formula change.
- git diff --check: PASS.

Not verified: interactive real-browser clicks, authenticated production workflows, actual concurrent users, RAM/CPU measurements, PR detailed refresh restoration and Inverter database loading. Keep this branch as draft staging until those checks pass. Main is not promoted.

Rollback: discard this branch; production main and database were not modified.

## Continuation verification

Starting remote head: bdccbded5848a65ef7b191d49300653070b15d4d. Isolated local worktree used; remote main remains ea3eceb91d459ca4f03eaa9955cfd73b05225c3e.

Pain points confirmed: stale PR test fixture contradicts Capacity × GI; draft #40 does not yet contain #39's safe project-name event handling; interactive and authenticated restoration QA remains incomplete.

Integrated the three project-name event fixes from draft PR #39 (main picker, comparison picker, overview note). PR #39 itself remains separate and unmerged. Special-character and injection fixtures pass in tests/pr-project-events.test.cjs.

New tests/pr-view-state.cjs passes actual PR adapter capture/restore for projects, months and record status; an ordinary data reload preserves live selections. Actual cloud-core local storage helpers isolate users and analysis projects and exclude shared notes. This is synthetic DOM/VM evidence, not an authenticated browser refresh test.

All seven targeted suites pass: filter-transactions, pr-filter-dom, pr-project-events, pr-view-state, pr-110-workflow, working-day-period and inverter-shared. Static baseline: 0 errors, 4 unchanged CDN warnings. Diff whitespace check passes. No engineering formula, threshold, raw-data or database change.

BLOCKED: real browser interaction. Playwright is installed but Chromium is absent; installation returned invalid/truncated archives. BLOCKED: Cloudflare build root cause. GitHub reports Workers Builds: app failed for build 403bd48e-f714-44c0-aaf3-d66b8bfc1b1d, with no error text or annotations; full Cloudflare dashboard logs are required. No usable preview URL was returned.

Do not promote to main until real-browser Apply/Cancel/Reset, authenticated refresh restoration and the Cloudflare build failure are resolved. Rollback for this continuation: previous staging head bdccbded5848a65ef7b191d49300653070b15d4d; code rollback only, no DB changes occurred.
