# Calculation Lock

## Layer boundary
Raw Data -> Normalization -> Working Day / GI -> PR/Yield -> Dashboard

Presentation changes must not cross backward into calculation layers.

## Locked by default
- Existing Working Day formula and day counts
- GI source/normalization and accepted edits
- PR normal vs PR with loss
- Yield, capacity, guarantee, exclusions
- Existing threshold/business rules unless explicitly requested

## Change protocol
For any requested formula change:
1. State old formula/rule.
2. State requested new formula/rule.
3. Identify affected outputs and historical data implications.
4. Change calculation in one canonical location where possible.
5. Test with at least one known/representative case.
6. Verify UI merely renders the result and does not duplicate the formula.

## UI-only shortcut
If request is alignment, popup, search, language, spacing, or responsive layout: do not inspect calculation SQL/functions unless UI code directly embeds the calculation.
