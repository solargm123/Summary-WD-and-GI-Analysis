# Bug Triage Workflow

## Classify first
UI -> State/Autosave -> Calculation -> Supabase/API -> Auth/Permissions

## Workflow
1. Reproduce the exact symptom from current evidence.
2. Search exact selector, field, function, table, RPC, or error message.
3. Inspect only that layer plus direct dependency.
4. Patch root cause, not visible symptom only.
5. Run targeted test.
6. If shared state was touched, verify one adjacent page/flow.
7. Stop broadening scope when evidence is exhausted.

Do not reopen large SQL/HTML files without a direct reason.
