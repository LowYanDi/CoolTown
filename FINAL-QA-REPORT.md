# CoolTown Planner — Final end-to-end QA report

## Result and scope

The deployed site https://cooltownplanner.netlify.app/ was tested through actual browser interaction. Two reproducible state bugs were found and fixed in the local source. The corrected production build was browser-tested separately at localhost:4180. No deployment or Netlify settings were changed. The live site still needs this patch.

## Successfully verified on the deployed site

- Refresh loads the original bundled Malaysian 2026 case study: 20 rendered polygons, 11 quality-valid records, 9 insufficient, one selected valid zone. Declared period is 2026-01-01 through 2026-10-17; Landsat/Sentinel sources and historical WorldCover 2021 labels are present.
- All five environmental layers render distinct colours and retain polygon coordinates/map position when switching layers. Nine polygons retain insufficient-data styling. Temperature and NDVI numeric legends, land-cover categories, hotspot and intervention legends were inspected.
- Street and satellite tiles loaded. Satellite only hides every polygon fill. Selecting NDVI restores overlays. Keyboard adjustment changed opacity to 79%. Selecting an insufficient zone showed Insufficient Data rather than reliable temperature, NDVI or priority, and no environmental recommendations.
- Guided example produced three separately assumed sites and four preliminary candidates. At default equal objectives and RM150,000: trees + carports cost RM140,040, leaving RM9,960 and scoring 75.68 preference points. At +10% costs the optimiser switches to trees + cool roofs at RM16,280. The algorithms, not preset result strings, generate these values.
- Changing to energy-only objectives selected rooftop PV at RM102,400 and 44.94 points. Lowering budget to RM10,000 produced an empty affordable plan. Reset restores the earlier budget and assessments; editing site area updates the proposal.
- Equal-budget mode applies shared 80 ha/RM200,000 constraints; switching back restores scenario B's independent 100 ha/RM6,000,000. Invalid land allocation disables optimisation. Conflicting whole-roof options show an infeasible original scenario; optimisation selects a conflict-free plan under budget. Installed PV naming and existing dimensional calculation tests are retained.
- Evidence categories, source declarations and unmeasured-outcome limitations are visible. Pilot verification without a note remains uncounted. Exports contain active dataset, provenance period/sources, selected zone, three assumptions, candidates, plan, objectives, sensitivity, checklist and limitations.
- Actual downloaded live export was checked against the displayed totals and supplied GeoJSON: original_geojson deep equality passed; RM140,040 / RM9,960 / 75.68 and +10% RM16,280 matched.
- Mobile viewport 390 × 844: navigation works; Existing Township remained within viewport width. Netlify's own badge remains visible; it is not part of the app source.

## Bugs discovered and actually fixed locally

1. **Stale pilot evidence after proposal changes.** A declared area reference for 100 m² still counted after changing the proposal to 200 m². Evidence now binds to a signature of proposal inputs, quantities, costs and verification context. Changed proposals require reassessment; objective weights alone do not invalidate site evidence. Guided example starts without borrowed evidence and reset restores the prior evidence state.
2. **Inconsistent map state across pages.** Satellite only remained selected while a remounted map reset to Street and default opacity. Basemap and opacity preferences now live in shared app state and persist between Overview and Existing Township. No imagery provider or geographic geometry changed.

Small accompanying corrections: example notes explicitly describe proposed hypothetical roofs/parking, not existing facilities inferred from historical bare land. Sensitivity reuses the base run instead of redundantly solving it twice; +10% and +20% still each rerun the optimiser.

## Executed local checks

- 74 algorithm test groups passed (73 existing groups plus proposal-evidence regression).
- Standalone TypeScript no-emit check passed.
- npm run build passed, including TypeScript, Vite and manifest regeneration.
- All 46 recorded source/production hashes and the complete four-file dist inventory verified.
- Original source GeoJSON SHA256 remains 89e578f069ed0a5582d46a3bdad6d93d2410059a9071a9cd6c540263bff7a1be; emitted GeoJSON is byte-identical.
- Actual corrected-build browser tests: 100 m² evidence counts 1/8, changing to 200 m² returns 0/8. Satellite-only state and 99% opacity persist after leaving/returning. Reset/restart does not reuse demonstration evidence. Export matches original GeoJSON, cost/sensitivity totals and zero stale supported checklist items.
- Corrected local production browser reported no console errors during the checks. Mobile future comparison controls worked at 390 px, with no page overflow or NaN/Infinity text.

## Remaining limitations and manual checks

- One transient MutationObserver error was recorded on the deployed site; the browser log did not identify its source. It did not block the tested workflow and was not reproduced in the corrected local build. Do not assume it is fixed: inspect normal-browser DevTools after redeployment, including Netlify-injected UI/scripts if it recurs.
- This was targeted desktop/mobile browser QA, not an exhaustive device/network compatibility or security audit. Offline and quota-failure paths retain their existing logic; a real provider outage was not forced during this review. Successful tile loads do not verify MapTiler billing, licensing or domain restrictions.
- Historical observations/provenance are user-declared. Geographic rendering was checked against supplied coordinates, not an independent boundary survey. Engineering facts, ownership and environmental benefits are not certified.
- Exact optimisation retains its 22-eligible-candidate limit. Session assumptions/checklists reset on refresh; export before refreshing. The non-fatal large JavaScript chunk warning remains.
- Apply this patch, build and deploy the new dist. In an ordinary browser, hard-refresh the public URL and repeat: default 20/11/9, satellite-only page round trip, evidence invalidation after changing area, guided reset, equal/independent mode, export and mobile navigation. Check Netlify deploy success and permitted MapTiler origins. No deployment is claimed here.
