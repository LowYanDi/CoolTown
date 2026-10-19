# Final scoring, security and impact delivery — 19 October 2026

Implemented in the existing five-page frontend; no backend or new dependencies.

## Files
Added src/algorithms/impact.ts (pure carbon/financial/location validation) and src/components/ImpactPanel.tsx (compact impact, assumptions, strategic fit, research and pilot sections). Updated src/main.tsx (dataset-isolated assumptions, new sections, export), src/algorithms/summary.ts (schema 5), src/algorithms/planning.test.ts (four new groups), .gitignore, .env.example, README.md, UPGRADE-NOTES.md, VALIDATION.txt. Added env.example, SECURITY-SUBMISSION.md and ATTRIBUTIONS.md. Regenerated dist and BUILD-MANIFEST.json. No original observation, map, eligibility or optimiser source was changed.

## Security
Ignore rules exclude dependencies, source-deployment dist, local environment files, env.download, archives, logs and temporary files. Example configuration contains an empty public key placeholder. Local .env.local is preserved. This workspace has zero tracked dependency/local key files; the separate user VS Code repository was not changed. Clean source package contains no .git history, node_modules, dist or actual environment files; allowlist and key-value scan verify this. No provider restriction, key rotation, public repository or deployment action was performed. See SECURITY-SUBMISSION.md for exact untracking/fresh-repository commands and MapTiler/Netlify actions.

## Formulas and evidence
Selected generation × explicit displacement fraction × declared grid factor /1000 gives indicative tCO2e. Source preset: Energy Commission Peninsular 2024 provisional 0.740 kgCO2e/kWh, published 23 February 2026: https://myenergystats.st.gov.my/documents/d/guest/grid-emission-factor-gef-in-malaysia-2022-2024-provisional-
No displacement default; switching region clears all factor assumptions. No PV means zero. No corporate emissions reduction is established; actual co2_reduction remains null.
Financial value = self-consumed kWh × avoided price + exported kWh × export compensation. Net = value − O&M; payback = chosen solar installation cost / positive net. Missing inputs return Not estimated. No fixed TNB tariff; sources and inputs are user declarations. Research and strategic references are documented in README and linked in the app.

## Verification
78 algorithm groups passed (74 preserved plus four new groups); TypeScript passed in production build. Vite build succeeded; 48 source/production hashes and four-file dist inventory verified. Original supplied GeoJSON and bundled asset SHA256: 89e578f069ed0a5582d46a3bdad6d93d2410059a9071a9cd6c540263bff7a1be. Twenty polygons, eleven quality-valid and nine insufficient remain unchanged.

New tests: complete/incomplete and invalid carbon assumptions; selected PV only / zero PV / 50% and 100% displacement; no default Sabah factor; financial completeness, no unrelated candidate savings, export-compensation requirement, non-positive payback; actual guided portfolio/sensitivity/export/raw observations; location reference downgrade. Existing eligibility, exclusions, weights, budget, roof mutual exclusivity, future comparisons and data validation tests continue passing.

Local production browser checks actually performed:
- Default original dataset and 20/11/9 quality counts.
- Guided base RM140040; selected 32 kWp / 35360 kWh; initial carbon Not estimated.
- Explicit 100% Peninsular displacement -> 26.17 tCO2e/year; +10/+20 rows -> zero PV/carbon.
- Switching region to Sabah clears factor/year/source/displacement and returns Not estimated.
- Chosen carport with blank financial inputs -> Not estimated; hypothetical .5 RM/kWh, 80% self-consumption, .1 export, RM200 O&M and RM138240 installation -> RM14851.20 value, RM14651.20 net, 9.44-year simple payback.
- Reset Example -> 0 kWp, 0 generation and 0 associated carbon, no stale PV result.
- Satellite tiles loaded (4), attribution retained, 20 polygons and 9 grey/dashed. No local console errors observed.
- Mobile 390px test: document content width375 equals viewport client width375, no page overflow; impact disclosure and mobile page navigation work. Wide/default initial preview also inspected.
- Planning JSON downloaded and parsed: schema5, correct base/sensitivity/carbon, original GeoJSON deeply equal, actual co2_reduction null. Original GeoJSON download asset matches byte hash; no new manual custom-upload cycle performed this round (import adapter tests passed).

Public Netlify site: loaded default case on desktop; mobile width/no overflow and Existing Township navigation confirmed. Live site remains the earlier deployment and does not yet contain this upgrade. These checks are not a claim that new features are already deployed. Earlier broader workflow checks are recorded separately in FINAL-QA-REPORT.md.

## Remaining limitations / user actions
Apply changed files to your VS Code project, run npm.cmd test and npm.cmd run build, then commit/push source or deploy rebuilt dist. For clean submission use the separate clean-source ZIP and a fresh empty repository; no old history is included. Review/restrict the public browser key in MapTiler; configure VITE_MAPTILER_KEY for Netlify and rebuild. Do not upload local configuration. Select a project source licence and verify derived dataset redistribution permission; no licence was invented. Provider restrictions and GitHub history remain user-controlled.

Exact optimisation remains limited to22 eligible positive-score candidates; state is session-only. Financial/carbon outputs are assumptions, not verified savings or outcomes. Site source references are declarations, not authenticated verification. Build has a non-blocking roughly1MB JS chunk warning; no new dependencies were added. Optional descriptive correlation was not added: existing LST/NDVI scatter remains available and the small eligible sample does not establish causation. No measured pilot outcomes or partnerships are claimed.
