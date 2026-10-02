# GI Map V4 live integration

Version 20261002-map-v4live. Baseline 6c62c64.

Source: uploaded GI_Map_V4.html and GI_Map_Handoff.md.

## Completed
- Map overview opens V4 in an isolated full-viewport iframe, lazy loaded.
- All uploaded namespaced CSS remains byte-for-byte identical. Original layout and controls retained. Only added UI is the requested Back button, using existing gimap-btn class.
- Back removes the iframe and restores original page focus/scroll and filter state.
- Demo bootstrap removed. Read-only adapter passes loaded real GI daily data, monthly averages, capacity, province and database coordinates.
- Missing coordinates are excluded, never guessed; count shown in data badge tooltip.
- Production rules 20 km, 3 independent sites, 10/20% below. Same-day comparison; co-located phases count as one site; configurable median/mean.
- Bounded comparison cache, no database writes or new persisted state.
- Fixed supplied dashboard array.map(gi) callback passing array index as year. No layout change.

## Validation
- Syntax of main and V4 scripts.
- CSS equality with uploaded source.
- No demo bootstrap; data/site/missing GI comparisons.
- Lazy entry, cancel race, origin-checked messaging, back cleanup/focus restoration.
- Existing peer regression tests.
- Live browser visual/performance QA remains pending. V4 retains its source minimum height and external Leaflet/font/tile dependencies.

Working Day, GI table/trend, PR formulas, review states and autosave are not changed.
