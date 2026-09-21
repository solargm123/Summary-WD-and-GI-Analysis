# Supabase Change Safety

## Principle
Schema and security changes are high-risk and must be backward-compatible whenever practical.

## Workflow
Current schema/RLS -> Proposed migration -> Data compatibility -> Permission check -> Frontend compatibility -> Apply

## Rules
- Prefer a new migration file for production changes instead of repeatedly rewriting the monolithic setup script as deployment history.
- Never weaken RLS just to make a frontend error disappear.
- Preserve admin/user boundaries.
- Avoid destructive column/table changes when additive migration can work.
- Backfill or default existing rows when a new required field is introduced.
- Keep RPC/function signatures compatible unless callers are updated in the same batch.
- Do not expose service-role keys or secrets to browser code.

## Test
Validate intended role can read/write; unintended role cannot; existing rows still load; frontend path using the changed object still works.
