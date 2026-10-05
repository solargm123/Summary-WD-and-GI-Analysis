# PR daily GI theory preparation

Status: NOT DEPLOYED. Requires access to Solar Supabase project lncoukvtjsgpeyhotukh; the connector currently lists only inactive Stock website.

Theoretical changes from a scaled original report baseline to effective Capacity × daily GI. Existing Working Day Capacity overrides and saved Global daily GI corrections are reused. Explicit Global GI deletion does not revert to original GI. PR, PR with Loss, Specific criteria, Loss factor and permissions remain unchanged.

SQL introduces get_pr_gi_theory_summary as a versioned, security-invoker RPC with the same arguments and grants as the old summary function. Existing get_pr_adjusted_summary and original records remain intact for rollback. Install the new RPC and compare sample results before releasing the frontend.

PR calculation-data GI button navigates to Global with project/month context. A per-tab sessionStorage token retains PR controls, selected projects, comparison periods, correction drafts and scroll position for at most 2 hours. Shared changes must finish saving before navigation or return. Return link is constrained to same origin and pr-report-r4.html. On return, Global overrides reload and PR data reloads before restoring correction drafts.

QA: inline scripts and cloud-core compile; numerical examples 100×4=400, edited GI5=500, Capacity120=600, zero/deleted GI=0; navigation passes correct project/month; draft and comparison-state snapshot survives; RPC name and security boundaries validated.

Not verified: live SQL execution, authenticated end-to-end return flow, browser session/history behavior in Cloudflare shell, live monthly/yearly summary equivalence. These must pass before publication.
