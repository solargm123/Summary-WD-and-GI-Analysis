# PR project-name event hardening
Base: ea3eceb91d459ca4f03eaa9955cfd73b05225c3e (9 Oct 2026)
Scope: pr-report-r4.html only; 3 HTML event templates.
- Pass project names via HTML-escaped data attributes rather than interpolating names into executable inline JavaScript.
- Affects main plant picker, comparison picker, overview note button.
- No formula, JSON schema, DB, auth, state-save, filtering algorithm or UI styling changes.

Verification:
- Baseline synthetic DOM test (jsdom, no resources/network): injection marker=1; fixed marker absent and exact full project name delivered.
- Dependency-free regression test covers apostrophes, double quotes, Thai, HTML-like and JS-like project names; select/unselect; multiple searches preserving selections; 4-project limit; note target.
- Static checker: 35 scripts compiled; 0 errors; 4 pre-existing floating-Supabase-CDN warnings.
- Shell and shared-threshold synthetic regression tests passed.
- git diff --check passed.
NOT TESTED: real browser/authenticated flows, API role matrix, real DB writes, visual 110% zoom/theme/language, Excel, production exploit chain.
The synthetic DOM reproducer is not a real browser test.

Other audit findings remain separate: CDN pinning/inventory, full privileged RPC review, logout error behavior. No production change or DB mutation in this work.
Rollback after eventual promotion: revert this PR's source change; code-only recovery, not a DB backup.
