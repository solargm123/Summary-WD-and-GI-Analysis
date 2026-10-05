# Inverter Analysis V1.19D1

Monthly Inverter Detail now shows 14 columns: month, project, inverter, capacity, PV Yield, Grid Duration, Reference, Lost Hours, Availability, Specific Yield, Max Specific Yield, Specific vs Best, status, note. Max Specific Yield reuses the existing project/month best Specific used by Specific vs Best; calculation outcomes remain unchanged.

Monthly note popup offers 10 reason presets, free text, save and cancel; storage remains monthlyNotes keyed by month/project/inverter. Workspace (.iaw) saving is required for persistence. Existing note text and workspace format are preserved.

Easy Monthly Report is a separate export style. It contains Monthly_Report, Inverter_Detail, Report_Guide and Report_Info; Original Review Excel remains available. The page shortcut defaults to Current Period and the active project, while explicit export settings can be changed. Status filter on the page is not an export scope; use Alarm Only when needed.

Summary PV Yield sums recorded inverter yields, not revenue meter data. Availability averages valid inverter relative availability, not contractual plant availability. Lost Hours totals inverter-hours, not plant outage time. Missing/unknown coverage is explained in the guide; no data completeness is inferred for imported Monthly rows.

QA passed: inline JavaScript compilation, unique DOM IDs, 14 header/body cells, note button opens popup, draft/cancel/save and month isolation, unchanged old vs new calculation outputs after removing new display-only bestSpecific field, sample summary totals and reference, original and simplified XLSX generated using actual export function, ZIP/XML parsing and openpyxl reading.

Limit: Microsoft Excel desktop and authenticated live browser have not been exercised. Existing temporarily hidden Overview/Data Quality pages and raw data are retained.
