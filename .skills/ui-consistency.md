# UI Consistency Skill

## Shared UI rules
- Reuse the same filter/popup/search patterns across pages.
- Keep Province, Plant, status, normal range, and edit controls aligned by shared layout tokens.
- Searchable selection dialogs should share keyboard/mobile behavior.
- Province selection should update available Plant choices consistently.
- TH/EN Plant/Province display must use one mapping/source of truth.
- Light/dark modes should use shared variables/tokens rather than duplicated literal styling.
- Preserve desktop and mobile usability.

## Edit strategy
For visual-only requests:
1. Locate exact component/selector.
2. Reuse existing component styles where possible.
3. Avoid backend/SQL reads unless data behavior is implicated.
4. Test target page + one shared component page if common CSS/JS changed.
