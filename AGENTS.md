# Summary-WD-and-GI-Analysis Agent Router

## Core mode
Use a credit-efficient workflow: reuse verified context, inspect only affected code, batch compatible changes, and preserve all established engineering formulas unless the task explicitly changes them.

## Route by task
- Working Day, GI, PR, yield, capacity, guarantee, exclusion rules -> read `.skills/calculation-lock.md`
- Layout, popup, filter, Province, Plant, TH/EN, responsive UI -> read `.skills/ui-consistency.md`
- Supabase table, migration, RLS, permissions, storage, schema -> read `.skills/supabase-safety.md`
- Bug or unknown failure -> read `.skills/bug-triage.md`
- Any code change that may affect existing behavior -> read `.skills/regression-guard.md`

## Protected behavior
UI work must not alter calculation logic. Database work must preserve existing data, access rules, and frontend compatibility. Formula work must be explicit and independently testable.

## Default execution
Classify layer -> load only relevant skill -> lock protected behavior -> smallest edit -> targeted test -> regression guard -> review diff -> one coherent commit.

See `WORKFLOW-NOTE.md` for the visual map.
