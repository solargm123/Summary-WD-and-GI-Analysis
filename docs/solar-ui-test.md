# Solar shared UI test V1

Standalone page: `solar-ui-test.html`. Open it directly; main menu and production pages are unchanged. Uses only synthetic sample data; no engineering formula validation or real DB connection. CSP blocks connect-src. Only optional Google Fonts network requests load Bai Jamjuree (fallback font if unavailable).

Try: search Yong then Capsule and keep selections; Cancel preserves applied state; Apply uses explicit checked items even when search remains; multi-month/year preserves other filters; module tabs have independent remembered test filters; refresh restores preferences; TH/EN and light/dark; empty selection shows no data. Preferences use ONLY `solar.shared-ui-lab.v1`, separate from production keys. This local demo key is browser-local and contains no user/account data.

Green export creates Excel SpreadsheetML `.xml`, not `.xlsx`, using displayed synthetic rows. Not a production report export.

Validation: JS compilation; isolated draft/apply/cancel model; empty state; status/review intersection; JSON roundtrip; unique static DOM IDs; no production scripts or DB connection. jsdom interaction tests passed search/tick/cancel/apply/year/tab separation/TH-EN/theme/persistence/Escape/empty state with dialog methods simulated. Real browser layout, native dialog focus and scrolling have not been verified. No performance claims.

Release scope: this HTML and this note only. No shared CSS, routes, menu, database, permissions, runtime formulas or existing application files modified. Delete these two files to remove the test.
