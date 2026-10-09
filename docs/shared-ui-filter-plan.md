# Shared UI and filter backlog
Date: 2026-10-09 (Asia/Bangkok). Status: analysis/proposal only; runtime not changed.

## Deferred filter behavior work requested by user
- GI Select Plants: separate draft from applied selection; searched matches must not overwrite explicit multi-selection on Apply. Preserve existing search-only behavior through an explicit, labelled action.
- GI period and Trend: defer expensive render/load until Apply; Cancel restores applied state.
- WD project selector: draft visibility; distinguish search within picker from table quick search; preserve review/MKT/method filters.
- PR Compare: preserve valid record filters; Reset edits draft without automatically closing/applying.
- PR records: proposed multiple-project subset independent from chart selection.
- PR persistence: complete per-user/per-workspace view state; do not publish personal filters as shared data.
- Inverter: retain per-project device selection and periods; do not match devices between projects by display label alone.
- All: applied-filter summary, empty state and loading context; reject stale responses.

## Shared visual proposal
Scope first: Main, WD, GI, PR, Inverter. Map and Spare Parts need their own visual inventory before applying broad rules.
Buttons 36px standard / 30px dense table; 8px radius; 16px outline icons; text 13-14px Bai Jamjuree 600/700, headings 16-18px. Proposal sizes are CSS units, not a global zoom change. Blue primary Apply, neutral secondary, green Export Excel; semantic review/status colors preserved.
Shared popup structure: title and Close, scrollable body, footer Cancel/Apply. Project picker multi-select only where business flow supports it; period picker month/year presets; Status and Review independent; active-filter summary above data.

## Risks and mitigation
- Global .btn/.modal overrides can affect uploads, notes, nested popups, maps: use scoped solar-ui classes and explicit opt-in.
- Replacing DOM IDs/handlers can break saving and selection: preserve IDs and event contracts; migrate one component at a time.
- Dialog/overlay mixed systems can lose focus or place popup behind shell: shared portal within page, focus return, Escape/Cancel, nested-dialog tests; avoid changing all event wiring in a CSS release.
- Thai/English and 110% zoom may overflow: test both languages, desktop widths, browser zoom and existing page scaling; no arbitrary new zoom.
- Filter persistence may leak between users: namespace by workspace/user/page; no shared mutation for personal selection.
- Color is ambiguous/accessibility: retain label + icon; validate light/dark contrast.
- Motion can increase CPU: transition opacity/color briefly; reduced-motion; no chart rebuild from hover or checkbox draft.
- Draft cancellation, unsaved calculation edits and async reload: explicit state transaction, dirty-edit guard and request version check; retain last applied state on error.

## Release sequence
1. Inventory components and user approval of visual preview.
2. Scoped tokens/buttons, one page pilot; no formulas or data/schema change.
3. Popup appearance, retain handlers; tests keyboard/focus/scroll/themes/TH-EN.
4. Filter behavior separately with synthetic and authenticated workflow tests.
5. Staged page rollout with previous commit recorded and tested rollback.

No runtime changes, billing, dependency upgrade or database writes are authorized by this note.
