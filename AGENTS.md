# Summary-WD-and-GI-Analysis Agent Router

## Core mode
Use a credit-efficient workflow: reuse verified context, inspect only affected code, batch compatible changes, and preserve all established engineering formulas unless the task explicitly changes them.

## Route by task
- Working Day, GI, PR, yield, capacity, guarantee, exclusion rules -> read `.skills/calculation-lock.md`
- Layout, popup, filter, Province, Plant, TH/EN, responsive UI -> read `.skills/ui-consistency.md`
- Supabase table, migration, RLS, permissions, storage, schema -> read `.skills/supabase-safety.md`
- Bug or unknown failure -> read `.skills/bug-triage.md`
- Ambiguous, complex, underspecified, suspicious, or multi-path request -> read `.skills/clarification-gate.md`
- Repeated workflow/pattern worth standardizing -> read `.skills/skill-evolution.md`
- Any code change that may affect existing behavior -> read `.skills/regression-guard.md`

## Clarify before execute
If the request is complex, ambiguous, missing key details, suspicious, or has multiple materially different implementation paths, do not start editing immediately. First:
1. Identify what is unclear or suspicious.
2. Explain the risk or ambiguity briefly.
3. Ask only the minimum questions needed, or propose one concrete interpretation with assumptions.
4. Confirm scope, expected behavior, protected behavior, and completion criteria.
5. Start implementation only after the task is sufficiently unambiguous.

Do not ask questions when the request is already clear enough to execute safely.

## Suspicious command flagging
Always call out commands that may:
- delete/reset/overwrite production data,
- alter WD/GI/PR/yield/capacity/guarantee formulas or historical results,
- weaken Supabase RLS/admin-user boundaries,
- expose keys/tokens/secrets,
- make destructive schema changes,
- push high-risk changes directly to main without validation,
- refer to an unclear "old version", "latest file", or "same as before" when multiple candidates exist.

## Protected behavior
UI work must not alter calculation logic. Database work must preserve existing data, access rules, and frontend compatibility. Formula work must be explicit and independently testable.

## Default execution
Clarify if needed -> classify layer -> load only relevant skill -> lock protected behavior -> smallest edit -> targeted test -> regression guard -> review diff -> one coherent commit.

See `WORKFLOW-NOTE.md` for the visual map.
