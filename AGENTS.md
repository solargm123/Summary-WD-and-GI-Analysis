# Credit-Efficient Coding Skill

## Purpose
Use this repository with a credit-efficient, low-rework workflow. Prefer precise, minimal, batched changes over broad exploration or repeated full-project scans.

## Default operating mode
1. Reuse context already established in the current task or previous verified work.
2. Do not rescan the entire repository unless the requested change genuinely requires it.
3. Inspect only files, functions, database objects, and UI flows that can affect the requested change.
4. Group related requested changes into one implementation batch whenever practical.
5. Avoid repetitive read -> edit -> read cycles when one focused pass is sufficient.
6. Prefer targeted searches for exact symbols, selectors, functions, tables, routes, or error messages.
7. Keep tool calls and external lookups to the minimum needed for correctness.
8. Test the affected flow first. Expand testing only when the change has a realistic wider impact.
9. Summarize what changed, affected files, risks, and test results once per batch.
10. Prefer one clean commit per coherent batch instead of many tiny commits.

## Preserve existing behavior
- Do not rewrite working code only for style.
- Do not change formulas, calculations, business rules, database schemas, RLS/security rules, API contracts, authentication flows, or stored data behavior unless the task explicitly requires it.
- For solar/reporting projects, preserve existing Working Day, Global Irradiance, PR, yield, capacity, exclusion, and guarantee calculations unless explicitly instructed otherwise.
- For investment/portfolio projects, preserve transaction history, average-cost accounting, holdings calculations, realized/unrealized P/L logic, authentication, and market-data behavior unless explicitly instructed otherwise.
- When touching shared code, make the smallest compatible change.
- Avoid unrelated refactors in the same batch.

## Efficient analysis
Before editing:
- Identify the smallest set of affected files.
- Identify dependencies and regression risks.
- Reuse known architecture and prior decisions.
- Do not reopen files whose relevant contents are already available and unchanged.
- If the issue is isolated to CSS/UI copy/layout, do not inspect backend/database code without evidence that it is involved.
- If the issue is isolated to backend/database logic, do not inspect unrelated UI pages.

## Batch implementation
When the user gives multiple changes:
- Build one consolidated checklist internally.
- Resolve shared causes once.
- Apply all compatible changes in the same pass.
- Do not stop after each minor item to request confirmation unless a destructive or security-sensitive decision truly requires it.
- Prefer completing the batch, testing it, then reporting once.

## Testing policy
Use the cheapest test that can reliably detect regressions:
1. Syntax/static validation for edited files.
2. Targeted functional checks for the affected feature.
3. Relevant integration/auth/database checks only when those areas were touched.
4. Full regression checks only for cross-cutting or high-risk changes.

Do not repeatedly run identical checks after unrelated edits.

## Git policy
- Keep changes scoped to the requested work.
- Review the final diff before commit.
- Do not include temporary files, debug logs, secrets, keys, tokens, or generated junk.
- Use a concise commit message describing the batch.
- If push permission is already explicitly granted for the current task, push once after the batch passes checks.
- If push permission is not granted, stop after preparing the commit/diff rather than repeatedly asking during implementation.

## Communication style
For coding work, keep updates compact:
- What was found.
- What is being changed.
- Any blocker or important risk.
- Final result and test status.

Do not narrate every file read, command, or low-level tool action.

## Priority order
When trade-offs are needed, prioritize:
1. Correctness and data safety.
2. Preserve existing working behavior.
3. Security and access control.
4. Minimal regression risk.
5. Credit/token efficiency.
6. Code cleanliness and optional refactoring.

## Trigger phrase
When the user says phrases such as "ประหยัดเครดิต", "โหมดประหยัดเครดิต", "batch", "ทำต่อจากเดิม", "ดำเนินการต่อ", or equivalent, apply this workflow automatically and reuse established context before exploring again.
