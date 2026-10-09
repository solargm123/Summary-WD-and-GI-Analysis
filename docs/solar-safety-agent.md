# Solar Safety Agent — initial inspection

Date: 2026-10-09. Scope: Main, WD, GI, PR, Inverter current source plus selected shared modules; Solar Supabase read-only security inspection. No production data writes, formula changes, or runtime UI changes.

Source baseline: `2a8e46cd2c9b3ecba82a71566de14020d1a779c0`. All 11 inspected application files were verified against commit-pinned GitHub content. Tests ran in an isolated source snapshot, not a checked-out Git branch.

## Verified

- Static baseline: 11 current files, 35 script bodies compiled; no syntax errors, duplicate static DOM IDs, or detected privileged frontend keys. This is a limited scan, not a complete security assessment.
- Current navigation regression: same-origin route allowlist, route restore, project/month query preservation, legacy inverter route migration, and child-frame synchronization passed using mocks.
- Shared Threshold regression: union of existing settings, personal-only leaf writes, local edit preservation, conflict detection, audit ordering, empty scaffold handling, and network failure passed using synthetic data.
- Checker self-test: malformed JavaScript, duplicate IDs, floating dependency, missing file, and redacted secret detection passed.
- Solar public tables: read-only catalog query found no public ordinary tables without RLS. Policy correctness for all roles was not proven by this query.

## Confirmed test-harness fix

`tests/solar-shell.test.cjs` read `route-release/solar-shell.js`, absent in the repository. It failed with ENOENT before testing current code. The test now reads root `solar-shell.js` using its own directory and validates current route behavior without hardcoding obsolete release query strings. Application source unchanged.

The root `solar-shell.test.cjs` entry point had the same obsolete path; it now delegates to the maintained nested suite.

## Follow-up findings

1. Four current pages use a floating `supabase-js@2` CDN URL. Pin a verified exact release only after auth/read/save compatibility testing. No dependency replacement was made in this inspection.
2. Supabase Advisors reports mutable search_path on `central_normalize_name` and `jsonb_set_deep`. Review definitions and schema references before a backward-compatible migration. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
3. Advisors reports 36 public SECURITY DEFINER functions executable by signed-in users. This is not evidence of 36 vulnerabilities: verify member/admin/editor checks and cross-workspace denial, preserving legitimate RPC access. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
4. Leaked-password protection is disabled. Check plan availability and free alternatives before changing Auth settings; no paid feature was enabled. [Auth guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Not tested / blocked

- The legacy WD test requires jsdom; it was unavailable in this inspection environment. Missing dependency is not proof the WD app is broken.
- Authenticated real-browser workflows, real Excel output, complete role enforcement, live concurrent edits, all engineering formulas, and measured browser RAM/CPU are not covered by the passing baseline.
- No automatic GitHub merge gate or continuously running AI service has been installed. The Agent is invoked on demand in Codex. The tools add no external AI API or scheduled cloud job.

## Repeatable commands

Run from repository root with Node.js:

```sh
node tools/solar-safety/check.test.cjs
node tools/solar-safety/check.cjs .
node tests/solar-shell.test.cjs
node tests/inverter-shared.cjs
```

Use `$solar-safety-agent` in Codex for the full inspect → reproduce → isolated fix → tests → release verification workflow. A baseline PASS is not permission to skip protected-flow tests. Review source before executing tests and never point mutation fixtures at production.

## Release and recovery

This change adds tools/tests/documentation only. Active pages, data, SDK versions, roles, and calculations remain unchanged. Revert this infrastructure commit to remove it; that does not restore database data. Runtime fixes must have their own reproduction, targeted validation, expected base SHA, and recovery plan.
