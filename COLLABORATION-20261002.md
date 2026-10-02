# Collaboration release 20261002-collaboration2

Changes: canonical Working Day calculation fingerprints retain legacy review fingerprints; unchanged valid reviews preserve reviewer/time. Drafts show pending rather than premature review-again. Actual saved calculation changes still require recheck. Private workspace presence supplements legacy per-analysis presence, with a 60-second heartbeat. Remote refresh is deferred during typing, drafts, hidden tabs, and editing popups. Disjoint save responses cannot resend stale unrelated fields; editing a deferred field requires an explicit conflict choice. Personal filters stay local.

No changes to M1/M2 equations or production records. No forced reload. Older active tabs retain their prior client behavior until voluntarily reopened.

QA: working-day-period.cjs, safe-priority.cjs, collaboration.cjs pass with jsdom 26.1.0. Simulated two clients cover cross-page presence, in-flight read protection, disjoint save, same-field conflict, explicit latest selection, and personal filters. Database transaction tested two workspace members and denied outsiders/presence broadcast; test rows rolled back. Presence SELECT/INSERT policies installed and read back.

Backup: backup/working-day-before-collaboration-20261002 at 3b13f38d8c1caa45e5ba6dbe17e15cb868ccaaae. Roll back client files via a revert commit; additive presence policies can stay installed while old clients run. Do not restore production user_state to roll back code.

Remaining: real authenticated two-browser acceptance testing; obtain Yong Thai Rubber Sept 4-8 source rows before any data repair. Invalid existing reviews are intentionally not auto-approved.
