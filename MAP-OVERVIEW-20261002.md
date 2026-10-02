# Map overview preview 20261002-map-preview1

Adds a lazy-loaded Leaflet 1.9.4 / OpenStreetMap tab to Global Irradiance. Load Project Update.xlsx through Load coordinates. Exact normalized unique names match automatically; unmatched records require explicit project selection. Coordinates remain in this tab's memory, not in the public repository or production database. Missing coordinates can be added in the preview. Keep original source file to reload after closing the tab.

Uses table selected plants, province, date, status and monthly review filters. Map GI average includes all valid readings, including alarms; it is explicitly labeled and does not replace table's normal/accepted average or PR rules. Identical primary coordinates show a grouped marker, individual project values stay separate. First source point is the provisional main point; sublocations available on selection. Map instance removed on tab exit. OSM attribution remains visible, browser caching preserved, no tile prefetch or offline download.

QA: tests/gi-map.cjs passes syntax, parsing, exact matching, unmatched names, manual preview, multipoint, average/alarms, filters, cleanup. Browser screenshot QA could not run because this environment has no Chromium executable. Actual CDN/tile loading and live Excel import still require browser acceptance testing. No production coordinate migration or data writes performed.

Rollback: revert the map feature commit. Existing cloud-core and calculation formulas unchanged.
