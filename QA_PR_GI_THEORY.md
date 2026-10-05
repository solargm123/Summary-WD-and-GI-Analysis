# PR Global GI theory release · 20261005-pr-gi-theory1

Theoretical now equals effective Capacity × daily GI from Global. Saved Global GI corrections and Working Day Capacity overrides are reused. Explicit GI deletion does not revert to raw GI. PR / PR with Loss criteria and Loss factor remain unchanged. Original imported theoretical values remain stored.

New additive RPC get_pr_gi_theory_summary installed in Solar via migration pr_global_gi_theory_summary_v1. Existing get_pr_adjusted_summary retained for rollback. The new function is SECURITY INVOKER, has a fixed search_path, is denied to anon/PUBLIC, and is executable by authenticated. No raw data was changed.

Database QA under authenticated role: September 2026 independent Capacity×GI calculations match new RPC for PR and PR with Loss across 126 projects (0 mismatches). A separate test passed simulated GI and Capacity overrides without changing stored values.

Frontend QA: inline scripts/cloud syntax, formula examples, zero/deleted GI, PR-to-GI project/month navigation, full return-state simulation (active view, project filters, selected projects, compare periods, unsaved PV/Loss drafts, scroll), and blocked navigation when shared changes remain unsaved. GI fetch errors now show an error instead of silently substituting original values.

GI edits are still made in Global, using existing role checks and autosave. Back to PR waits for saved shared changes, validates same-origin destination, reloads GI and restores a per-tab return snapshot (2-hour lifetime).

Limit: authenticated graphical browser end-to-end QA has not been completed; return flow is tested in DOM simulation. Existing security-advisor warnings concern other functions, not the new invoker function.

Rollback: revert this frontend release commit. The previous RPC remains installed and original theoretical/source data are untouched.
