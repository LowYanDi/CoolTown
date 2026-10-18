# CoolTown Planner — planning logic update

This update preserves the original five pages, visual styling, demo map, zone selection, charts, scenario A/B editing and JSON download. It introduces no package, backend, authentication, API, database or machine learning. State remains browser-session state. CSS, package.json and package-lock.json are unchanged.

## Objective scoring

The zone environmental screening priority remains separate from intervention planning utility. A score is a transparent preference heuristic, not a measured environmental benefit, impact percentage or scientific rating.

Each intervention has cooling, renewable-energy and biodiversity components in [0,100]. The shared three sliders use relative importance 0–10, normalised by their sum. A candidate's final score is the weighted mean, rounded to two decimals. All-zero objectives yield score zero and an empty optimised plan. Total plan score is the sum of candidate points and may exceed 100. The exact optimiser does not consider cost as an objective; cost is a constraint and lower cost breaks score ties. Saturation anchors below are explicit demo policy choices.

Existing-zone factors, all clamped to [0,1]:

- H = (LST − 30)/10; D = 1 − clamp(NDVI,0,1).
- P = potential planting area/1500 m²; R = usable roof area/500 m².
- G = annual generation/100000 kWh; Y = annual yield × adjustment/1500.
- N = NDVI clamped to [0,1]; A = zone area/30 ha.

Component formulas (multiply factors by 100):

| Intervention | Cooling | Energy | Biodiversity |
|---|---|---|---|
| Shade trees | .45H + .35D + .20P | 0 | .60P + .40D |
| Rooftop solar | 0 | .75G + .25Y | 0 |
| Solar carports | .65 if an explicit shade deficit exists | .75G + .25Y | 0 |
| Cool roofs | .65H + .35R | 0 | 0 |
| Conservation | 0 | 0 | .70N + .30A |

Missing LST or NDVI disables environmental priority and environmental eligibility dependent on it; the UI shows Unavailable. Solar can remain eligible without environmental temperatures if its own inputs are suitable and complete. No environmental coefficient is used for solar generation or energy score. Low NDVI does not by itself prove planting suitability. Known water land cover is excluded from tree screening; all sites still need verification.

## Solar screening

Roof/parking category, at least 150 m² usable area, explicit suitability = true, known assumption/provenance status, positive finite density/yield/performance/cost are required. Unknown or unsuitable records produce no solar candidate. Defaults are explicitly assumed, not measured irradiation:

- Capacity = area × 0.16 kWp/m².
- Generation = capacity × 1300 kWh/kWp/year × 0.85.
- Cost = capacity × RM3200/kWp, with a 1.35 carport structure multiplier.

Candidate cards show capacity, generation, installation cost, resource assumptions, provenance and required verification. Site verification is distinct from the provenance of solar-resource inputs. Structural capacity, grid access, irradiation, shading, orientation and permits still need review.

## Future budget optimisation

The comparison considers only the options checked in the original scenario, retaining original quantities. It selects complete programmes; it cannot buy a fraction of a programme. Land allocations do not change. It does not overwrite the original scenario. It updates live after opening the budget comparison. The Impact page also offers this comparison for the scenario most recently edited. JSON export includes both scenarios and both optimised results, even before opening the comparison.

Costs: trees/corridors RM18/m² of allocated green space; cool roofs RM65/m² of usable roof; public shade RM25000; rain gardens RM18000. Rooftop and carport PV use the formulas above; usable parking area is editable (default 150 m²). Carport generation is now included, and roof + carport totals are labelled accordingly.

Future factors: D = 1 − clamp(green percentage/40), S = clamp(green m²/10000), R = clamp(roof m²/2000), A = clamp(site ha/100), G and Y as above. Component formulas:

- Trees/corridors: cooling .5D+.5S; biodiversity .7S+.3D.
- Rooftop: energy .75G+.25Y.
- Carports: energy .75G+.25Y; cooling .65 assumes shade need.
- Cool roof: cooling .65+.35R assumes exposure.
- Public shade: cooling .6D+.4A.
- Rain gardens: cooling .2S; biodiversity .6S+.4D. Drainage benefits are not scored by these three objectives.

Tree planting needs positive green area; rain gardens need at least 100 m² green allocation; public shade needs road/infrastructure or other/public-space allocation. PV needs at least 150 m². Invalid area, budget, roof/parking area or land totals block optimisation. Original scenario metrics count eligible enabled programmes; the decision table explains ineligible options.

Whole-roof PV and cool-roof treatments are mutually exclusive in both optimisers. An original scenario may still contain both so the user's input is preserved, but it is explicitly infeasible: all original implementation metrics are withheld in the UI and exported as null with errors. The optimiser can resolve the selection without overwriting it; the optimised scenario is conflict-free.

## Exact solver

Enumerates all subsets for the small demo dataset. Filters excluded/ineligible/invalid/zero-score candidates, enforces group exclusivity and budget in conservative integer cents. Duplicate IDs or more than 22 eligible candidates raise explicit errors. Scores use integer hundredths for stable comparisons. Larger future datasets require a scalable solver; this is not intended for arbitrary city-scale inputs.

## Data validation and future GIS

The original eight demo records now pass through `loadGeoJSON()` in `src/data/loader.ts`. The demo still drives the schematic; the original supplied Malaysian 2026 case study is bundled; a local upload UI now validates and selects observed records. To integrate future data, call `parseGeoJSON(text)` or `loadGeoJSON(object)` and examine its `{zones, issues}` result before connecting it to application state and a real map renderer.

The supported contract is a WGS84 FeatureCollection containing Polygon or MultiPolygon Features. Rings must close, have at least four positions, finite longitude/latitude within bounds, and non-zero signed area. Validation does not certify topology (self-intersections/holes), survey accuracy or provenance authenticity. IDs must be non-empty and unique. Invalid geometry/duplicate-ID features are skipped with issues.

Properties: `zone_id`, `zone_name`, `lst_c`, `ndvi`, `landcover`, `observation_date` (YYYY-MM-DD), `data_source`, `data_status` (synthetic/observed/assumed/unknown), `data_coverage` (0–100), `area_ha`, `site_type`, `site_verified`, `site_input_status`, `estimated_usable_area`, `planting_area`, `roof_exposure`, `shade_deficit`, and optional `solar_inputs` (`density`, `yield`, `factor`, `cost`, `suitable`, `status`, `source`). Unknown site area defaults conservatively to zero with an issue; missing site booleans do not become eligibility approvals. Strings are not coerced into numbers.

NDVI values within [-1,1], including negative values, remain valid. Out-of-range values become null with a warning. LST ingestion sanity bounds are [-100,100] °C, not classification thresholds. Zero environmental coverage nulls LST/NDVI. Missing indicators never become observed zeroes. Weighted means exclude any record failing the shared environmental-quality rule: finite LST and NDVI, known positive coverage at or above the configured minimum (default 80%). This illustrative requirement is adjustable in Existing Township Analysis and shared with maps, Overview, hotspots, rankings, environmental recommendation rules and JSON export. Missing or insufficient coverage displays Insufficient Data. Solar uses separate site/resource suitability. An observed claim without a valid date and source becomes unknown. Provenance is metadata supplied by the dataset, not independently verified by this frontend. Current synthetic records have no invented observation dates. Calculated metrics and assumed costs remain separately labelled.

## Validation

Run with Node.js 22.18+ or 24+:

```
npm.cmd test
npm.cmd run build
```

On Linux/macOS use `npm` instead of `npm.cmd`. Existing dependencies suffice. The updated test file exercises the solver against an independent exhaustive oracle, budget bounds, objective changes, eligibility/exclusivity, nullable/environmental validation, solar independence, GeoJSON loading, future optimisation and the actual JSON summary builder.

## Activated real-data integration

Existing Township Analysis now includes Malaysian 2026 Case Study / Synthetic Demo Dataset / Import Custom GeoJSON and a local GeoJSON file input. Leaflet 1.9.4 and CSS are imported locally. Both map modes use the same active dataset as statistics, quality rules, recommendations, exact optimisation and export. Empty real mode has zero records; no synthetic fallback occurs. All five map layers and interactive selection work with imported polygons. Observation dates and source declarations are shown in popups, the selected-zone panel and exported records.

The importer accepts up to 500 zones / 5 MB and uses loadGeoJSON. Without explicit data_status, import mode asserts observed provenance only with valid date/source metadata; explicit synthetic/unknown/assumed records are excluded. Invalid measurements are flagged and remain null; invalid geometry/duplicate IDs are skipped. Missing site and solar inputs are not filled from demo assumptions. The 80% configurable shared quality requirement is preserved. The UI warns when more than 22 eligible candidates prevent exact optimisation; no silent truncation occurs.

The independent Future Township scenarios stay synthetic. Costs remain assumed; environmental scores remain derived heuristics. Imported declarations are not independent satellite verification. The supplied original case study is included unchanged; street and optional MapTiler satellite basemaps provide geographic context. See README.md and VALIDATION.txt.

## Chart, warning and planning-stage update

See README.md for the active two-stage rules. Observed-zone budget candidates require complete intervention inputs plus either imported site verification/provenance or a separately declared, complete preliminary assessment. Assessment-derived candidates remain explicitly assumed and unverified. Preliminary opportunities remain separate and uncosted. Grouped warning categories do not invalidate environmental data for absent solar inputs. Charts filter invalid data and use finite numeric ticks; measurements retain full original precision in JSON.

## Site assessment update

New files: src/data/siteAssessment.ts and src/components/SiteAssessmentForm.tsx. recommend accepts optional SiteAssessments as its fifth argument. A validated working projection supplies site assumptions to screening without mutating imported records. The original GeoJSON is preserved for export. No dependencies were added. Use the included installation guide to merge changed source files into the previous charts/planning-stage version.

## Dynamic provenance / GIS

Fixed historical context state, checkbox and export were removed. Date ranges and per-zone metadata now drive the panel and export. Records with valid geometry but incomplete provenance remain visible, gray and excluded from reliable environmental analysis. Map layer colours use actual recommendations/opportunities rather than a priority shortcut. No new npm dependencies. Add .env.local with a public domain-restricted VITE_MAPTILER_KEY for satellite imagery. Street/offline fallback works without a key. See README and INSTALL-CHANGES.md.

## Map usability patch

New temperatureScale.ts, TemperatureLegend.tsx and ZoneNavigator.tsx. GeoJSONMap/TownMap use a shared quality-valid relative Celsius colour scale. The real-map long zone button list is replaced by collapsed searchable bounded navigation. Zoom on explicit selection, full-study reset, and first-valid import selection are preserved. No planning data or algorithms changed. No new dependencies.

## Final reliability update

Added optional bundled case-study loading and separate case/custom/demo state. Added a quality-filtered, interpolated 80th-percentile initial hotspot threshold for real data. Manual thresholds persist across map interactions and dataset switching. New imports reset only their own threshold and assessments. Original observations and GeoJSON remain separate from site assumptions. Added four test groups (63 total) and automatic manifest/hash/inventory verification. No new dependencies or visual redesign. See INSTALL-CHANGES.md for the exact replacement files.
