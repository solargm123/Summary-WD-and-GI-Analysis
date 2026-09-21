# Regression Guard

## Protected Solar flows
- Working Day calculation and stored values
- Global Irradiance normalization, filters, edits, and monthly values
- PR / PR with loss / yield / capacity / guarantee logic
- Province <-> Plant relationships
- TH/EN display mapping
- Autosave/history behavior
- Supabase RLS and admin/user boundaries
- Existing project data

## Before edit
Define: requested change, affected layer, protected behaviors, smallest file/function set.

## After edit
1. Syntax/static check.
2. Targeted feature check.
3. One adjacent protected-flow check if shared code changed.
4. Diff review for formula drift, duplicated mappings, schema side effects, secrets, or debug artifacts.

UI-only changes should not trigger formula/database rewrites.
