# CoolTown Planner

React + TypeScript frontend-only planning prototype. Existing five-page design, schematic map, zone selection, multi-objective scoring, solar calculator, scenario comparisons and JSON export are retained. No backend, database, authentication or machine learning is used. The only external service requests are map basemap providers. The default bundled Malaysian 2026 case contains historical observations with declared provenance; the separate eight-zone demo is synthetic. Costs and solar resources are assumptions unless explicitly supplied.

## Run and build

Use Node.js 22.18+ or 24 (validated with 24). From the folder containing package.json:

```sh
npm ci
npm test
npm run build
npm run dev
```

In Windows PowerShell use `npm.cmd` if npm.ps1 is blocked. Deploy the newly generated `dist/`, not an older build. Do not commit node_modules. The update package includes rebuilt dist and a BUILD-MANIFEST.json recording source and build hashes. Every npm run build regenerates the manifest through scripts/build-manifest.mjs and verifies all recorded hashes, the complete production inventory and the original case-study asset through scripts/verify-manifest.mjs. Leaflet 1.9.4 and its CSS are bundled locally; package.json and package-lock.json must be updated together.

## Environmental quality

`src/data/validation.ts` owns the shared rule: valid finite LST in [-100,100] °C, NDVI in [-1,1], and valid coverage in (0,100] at or above the configured minimum. The default minimum is 80%, adjustable under Existing Township Analysis. This is an illustrative data-quality requirement, not a scientifically validated satellite standard. Invalid thresholds fall back to 80%; missing coverage never defaults to full coverage. A zero minimum still cannot admit zero or missing coverage.

Overview averages, hotspot count, charts, schematic environmental layers, rankings and environmental recommendations apply this rule. Insufficient records appear as “Insufficient Data”, use gray map colours and have no environmental ranking or recommendations. Land-cover labels remain descriptive. Solar eligibility remains independent: it uses solar-resource and installation inputs, never LST. All synthetic records remain explicitly synthetic even if they pass this rule. Coverage is the percentage of the zone with jointly usable environmental observations; a future ingestion pipeline must align dates, resolutions and quality masks before aggregation.

Zone priority is round(100 × [0.55 × clamp((LST−30)/10) + 0.45 × (1−clamp(NDVI,0,1))]). Negative NDVI is valid but does not establish plantability. Missing/invalid environmental priority has an internal zero fallback and must always be rendered as Insufficient Data. LST mean uses equal valid-zone weights; mean NDVI uses valid-zone area weights.

## Objectives and exact optimisation

Cooling, renewable energy and biodiversity sliders set relative weights. Each intervention has its own documented component formula. The weighted score is a preference heuristic, not scientific environmental impact. All-zero objectives produce no selected interventions. See UPGRADE-NOTES.md for the complete formulas and saturation assumptions.

Both budget optimisers use deterministic exhaustive search, preserve eligibility and exclusions, enforce whole-roof exclusivity and never exceed the budget. Equal scores prefer lower cost; fully equal ties retain deterministic traversal order. Costs use conservative integer cents. At most 22 eligible candidates are supported; this is a small-prototype solver.

## Solar and future scenarios

Capacity = usable area × 0.16 kWp/m². Annual generation = capacity × 1300 kWh/kWp/year × 0.85. Cost = capacity × RM3200/kWp; carport cost adds a 1.35 structural multiplier. Both rooftop and carport generation are included in future totals. Carport usable area is editable, initially 150 m². For example 200 m² carports yield 32 kWp, 35,360 kWh/year and RM138,240. Assumptions require irradiation, shading, orientation, structural, clearance, permit and grid verification. The standalone solar calculator is independently editable and exported.

Trees/corridors cost RM18/m² of planting area; cool roofs RM65/m²; future public shade RM25,000; rain gardens RM18,000. Future optimisation selects whole enabled programmes within the entered budget, with fixed original quantities and land allocation. It never overwrites the original selections.

Whole-roof solar and cool roofs are mutually exclusive in BOTH original and optimised scenarios. Conflicting original selections show an infeasibility warning; original implementation totals are withheld in comparisons and exported as metrics:null with errors. The optimiser remains available to resolve the conflict by choosing at most one treatment. No silently combined roof estimate is presented. Numeric invalid inputs still block optimisation.

## Data and optional GIS

- src/data/loader.ts: validates WGS84 Polygon/MultiPolygon FeatureCollections, unique IDs, coordinate ranges, closed nondegenerate rings, observations and provenance.
- src/data/validation.ts: shared environmental quality policy.
- src/data/gis.ts: prepares the optional real-data layer; excludes synthetic, assumed and unknown records.
- src/components/TownMap.tsx: active schematic map, unchanged overall design.
- src/data/dataset.ts: selected dataset model and local import validation; no real-mode fallback to demo records.
- src/components/DatasetControls.tsx: local file input, dataset toggle, import errors and validation report.
- src/components/GeoJSONMap.tsx: active Leaflet renderer with locally bundled CSS. Uses selected validated records, all five map layers, date/source popups, keyboard-accessible zone buttons and shared quality policy. Street tiles and optional MapTiler satellite tiles provide geographic context.

In Existing Township Analysis choose Malaysian 2026 Case Study, Synthetic Demo Dataset or Import Custom GeoJSON. The supplied bundled case study is selected at startup when present and valid. Custom import starts empty until a local GeoJSON is accepted. Importing selects it for Overview, Analysis, Recommendations, Budget, Impact and JSON export. Future Township remains a separate synthetic scenario model. Switching datasets selects the first quality-valid zone (or the first visible zone when none pass) and clears per-candidate exclusions. The imported file remains in memory only and is discarded on refresh; it is not uploaded.

Imports accept a WGS84 FeatureCollection of up to 500 zones and 5 MB. Invalid geometries/duplicate IDs are skipped; invalid measurements become null with visible warnings. Missing/invalid date or source keeps its valid polygon visible with unknown provenance and excludes it from reliable environmental scoring. Absent data_status is treated as the user's observed declaration on import, but explicit synthetic/assumed/unknown records are excluded. This does not certify the observations. A failed import leaves the last accepted dataset unchanged. The supplied original Malaysian case-study GeoJSON is bundled unchanged; no boundaries or measurements are fabricated.

The exact optimiser still supports at most 22 positive-score eligible candidates. Larger candidate sets show an explicit blocking error and no partial plan; exclusions can reduce the set. JSON export records that error. Missing area_ha contributes no area and is flagged; area-weighted indicators exclude missing/zero areas. No geometry-to-area estimate or site/solar assumptions are invented. Supplying only satellite observations may correctly yield no installable interventions: planting areas, roof exposure and solar suitability need separate evidence.

Properties include zone_id, zone_name, lst_c, ndvi, landcover, observation_date or observation_start / observation_end (YYYY-MM-DD), data_source, data_status, data_coverage (percent), area_ha, site_type and site suitability/solar inputs. Coordinates use [longitude,latitude]. See UPGRADE-NOTES.md for the complete contract. Declared observed provenance without date/source becomes unknown. Geometry validation is not topology or survey certification. The bundled real case study retains the original source declarations; the frontend does not independently certify their accuracy.

## Validation and export

78 test groups cover the original 23 behaviours plus coverage, roof conflicts, local imports, selected-dataset export, provenance, missing solar inputs and oversized optimiser guards. See VALIDATION.txt. JSON export retains raw scenarios, error states, feasible alternatives, objective weights, coverage policy and per-zone quality reasons, selected interventions and the independent solar calculation. Session state resets on refresh.

## Environmental charts and two-stage planning update

EnvironmentalCharts uses finite observations passing the shared quality rule. No missing observation is plotted as zero. Temperature axes use numeric padded domains with unique ticks and one-decimal labels; NDVI uses two-decimal labels on [-1,1]. Zone IDs are shortened and angled; full IDs stay in tooltips and exports. Wide zone charts scroll horizontally. Display rounding never modifies stored measurements.

Import warnings are summarised into four expandable categories: missing environmental observations, insufficient coverage, missing solar inputs and unverified site suitability. A zone appears once per category. Additional rejected-record messages remain available. Missing solar inputs disable solar screening only, without invalidating otherwise usable environmental observations.

A. Preliminary Sustainability Opportunities uses valid environmental indicators and recognised land-cover context to suggest further cooling or biodiversity investigation. No cost/area/resource values are fabricated. These opportunities are never passed into the optimiser.

B. Screened Planning Candidates accepts either imported declarations of site verification with complete intervention inputs, or a separately declared Preliminary Site Assessment. The latter always remains Assumed / User-supplied / NOT VERIFIED, even when selected by the budget optimiser. Missing or unsuitable assessments create no candidates. Imported site_verified flags are never changed. Synthetic demo and Future Township workflows remain separate.

JSON export adds preliminary_opportunities and grouped_validation, preserving original observations and the feasible plan separately. The supplied CoolTown_Real_Zones_2026.geojson was tested directly: 20 polygons, 11 passing the default 80% quality threshold and 9 insufficient. The original supplied JSON and exported original_geojson match.

## Preliminary Site Assessment

Select a quality-valid zone in Existing Township Analysis. Choose Roof, Walkway, Parking or Open Space, enter assumed usable area, declare potentially suitable status, and acknowledge assumed costs. Roof exposure and shade need are explicit assumptions. Optional solar fields start blank and require density, yield, adjustment, unit cost and a rationale/source; incomplete solar inputs disable solar only. Existing threshold, eligibility and mutually exclusive whole-roof rules still apply. Assumptions do not guarantee a candidate if other screening rules fail.

Assessments are stored separately in React state per dataset mode and zone. Switching modes preserves each mode; importing a replacement real dataset clears its assessments. Refresh clears session state. JSON exports original_geojson, unchanged validated zones and site_assessments separately. No imported measurements, source properties or original verification flags are overwritten.

The Environmental Data Provenance panel derives dates, sources and land-cover references from imported records. It has no fixed dataset year or scene dates. Mixed records retain zone-level details.

## Dynamic GIS upgrade

The map separates basemap, environmental layer and opacity (default 50%). Street mode uses standard OpenStreetMap raster tiles with visible attribution and normal browser caching/referrer behaviour. Satellite uses MapTiler satellite-v2 TileJSON and its declared attribution. Satellite is visual context only: no imagery-date equivalence or real-time claim. Missing keys or load errors fall back to street tiles; offline/no-basemap mode retains polygons. A new import fits WGS84 bounds; visual controls do not recreate the map or reset selection. The first quality-valid zone is selected.

Copy .env.example to .env.local and set your public VITE_MAPTILER_KEY. Restart development or rebuild; production hosting must set this build-time variable before deploying. Restrict the key to localhost for local use and your actual production domain. Never supply a private server credential. MapTiler plans, allowed use and quotas apply; satellite service is not guaranteed to be free or unlimited. No account is created or billed by this code.

Optional provenance properties: observation_start, observation_end, observation_date, data_source, data_status, landcover_source, landcover_year and site_verification_source. Valid date pairs can replace a single observation_date. Invalid/reversed dates are flagged; missing metadata is Unavailable. Original JSON is retained separately. Metadata-missing records are unknown and excluded from reliable environmental charts/scores; explicit synthetic/assumed/unknown imports remain excluded from real mode. A verified-site boolean without a supporting source is displayed as a claim with evidence unavailable, never independently authenticated.

Export schema 3 contains dataset_provenance, selected_zone_ids and nullable environmental_scores, with original observations and site assumptions separate. The obsolete historical_study_context export is removed. mapModel.ts defines a future thermal-raster adapter contract only; no raw GeoTIFF renderer or interpolated thermal surface is implemented.

Provider references: https://docs.maptiler.com/cloud/api/tiles/ ; https://docs.maptiler.com/guides/credentials/api-key/ ; https://www.maptiler.com/copyright/ ; https://operations.osmfoundation.org/policies/tiles/ . Do not bulk download/prefetch OSM tiles, disable caching/referrers, or assume an SLA. Use a suitable hosted plan for traffic beyond a small interactive prototype.


## Relative temperature colours and Zone Navigator

Temperature colours linearly interpolate blue → warm yellow → red across the active dataset’s quality-valid LST minimum/midpoint/maximum. The map and Celsius legend use the same scale. Coverage-invalid, missing or provenance-invalid records cannot set the range and remain gray. Colour is relative within the selected dataset, not a scientific risk category; comparisons between datasets require reading the Celsius values. Raw observations, scores, solar screening and hotspot thresholds are unchanged. Equal-temperature datasets use one colour; empty valid sets show an unavailable legend. Endpoint labels use one decimal with full-precision hover text for narrow ranges. Demo maps use the same scale.

The Zone Navigator is collapsed initially and searches IDs or names case-insensitively. Results are bounded in a scrolling area, include data-quality status and retain insufficient zones. Choosing a result highlights/zooms to its bounds and collapses the list. Fit study area restores all polygons. New imports still fit the full dataset and select the first quality-valid zone; if none passes, the first zone remains visible as insufficient. Layer, opacity and basemap changes never change selection.

MapTiler remains configured by VITE_MAPTILER_KEY. Missing-key instructions now explain .env.local / hosting environment setup and restart/rebuild; street fallback remains available. Do not replace your existing public key or domain restrictions when applying this source patch.

## Bundled Malaysian 2026 case study and relative hotspots

The original asset lives at src/assets/case-studies/CoolTown_Real_Zones_2026.geojson. Optional Vite globs allow builds without it; missing/invalid assets display a message and retain demo/custom options. A valid asset is emitted as an unchanged static download. Custom uploads remain local browser memory. Case, demo and custom assessments and manual thresholds have separate state; refresh restores defaults. Replacing a custom import resets only that custom dataset’s assumptions and threshold.

Real datasets initialise the hotspot threshold from quality-valid LST using linear interpolation at sorted index (n−1) × 0.8. At the default 80% coverage, this supplied file yields 44.78442955698896°C and 3 zones at or above the threshold. Display rounding does not change calculation precision. This is relative surface heat, not a medical or scientifically certified danger threshold. Ordinary map interactions and coverage changes do not overwrite manual thresholds. Empty valid sets use 36.5°C as a control fallback with no reliable hotspots; constant datasets use their common temperature and all valid zones meet the inclusive threshold.

The supplied metadata describes historical composites from 2026-01-01 through 2026-10-17, not real-time measurements. ESA WorldCover 2021 is historical reference land cover, not verified current land use. The case study creates no construction candidates without separate eligible site inputs. Public MapTiler keys belong in local/deployment configuration; example configuration deliberately contains no actual key. Existing deployment variables are unchanged.

## Hackathon readiness update

The five pages and visual identity are retained. No new dependencies or backend are required. Map visibility follows the chosen layer: Satellite only hides polygon fill; choosing any environmental layer restores it without changing the basemap or selected zone. Opacity is disabled while overlays are hidden. Both real and schematic maps use shared NDVI, land-cover, hotspot and candidate colours. NDVI uses explicit reference stops -1, 0, 0.3, 0.6 and 1 (brown to yellow to green); this represents zone averages, not finer-resolution vegetation. Land-cover aliases include ESA Tree cover, Bare/sparse vegetation and Herbaceous wetland. All insufficient zones retain gray fill and dashed real-map outlines.

Try Example Planning Scenario is opt-in and available only for the bundled case study. It sorts quality-valid zones by descending LST, then Zone ID, selecting at most three. It assigns a 100 m² walkway, 200 m² roof and 200 m² parking area as explicitly hypothetical assessments, acknowledges assumed costs, and sets a RM150,000 demonstration budget. PV assumptions are 0.16 kWp/m², 1300 kWh/kWp/year, 0.85 adjustment and RM3200/kWp, with the existing 1.35 carport multiplier. Existing rules determine all actual candidates and plans. Edit assumptions in the existing form. Reset restores the pre-example case assessments, budget and exclusions (including discarding edits made during the example). Imported measurements and geometry never change.

Equal Budget Comparison projects a shared area and budget onto both future scenarios without mutating saved independent area/budget values. Land allocation, roof/carport areas and enabled options remain separate. Switching back restores the independent values. Changes to common constraints are validated by the existing scenario rules. Rooftop Solar Installation means installed PV capacity, costs and generation; whole-roof exclusivity is unchanged.

Cost sensitivity runs exact optimisation three times at base, +10% and +20% costs with identical eligibility, objectives, exclusions and budget. It rounds adjusted costs conservatively to cents, reports replacements, and checks whether the original preferred combination remains affordable. It does not predict inflation or change base candidate assumptions.

Impact & Evidence distinguishes observed/synthetic baseline, calculated indicators, assumed estimates and unmeasured outcomes. Pilot checklist entries are scoped to the active dataset and candidate. Verified and not-applicable claims need an evidence reference or reason to count; entries are user declarations and do not change screening or independently verify construction. Session refresh clears checklist/assumption state. A replacement custom import clears that dataset's checklist. Review evidence again whenever a proposal changes.

Export schema 5 preserves the earlier fields and adds cost_sensitivity, comparison_constraints, future_comparison, guided_example, pilot_checklists and explicit null unverified environmental outcomes. The original future_scenarios retain saved independent inputs; future_comparison contains the active comparison projection.

## Final end-to-end reliability patch

Pilot evidence is bound to the proposal inputs it assessed. If quantities, site assumptions, costs or verification context change, earlier evidence no longer counts for the revised candidate. Objective-weight changes alone do not invalidate it. Guided-example reset restores prior evidence. Basemap/opacity preferences now persist across page transitions. See FINAL-QA-REPORT.md for actual live and local browser results, remaining limits and deployment follow-up.

## Final scoring, impact and submission upgrade

Live prototype: https://cooltownplanner.netlify.app/ (deployment is separate from this source package).
CoolTown links environmental opportunities to explicitly assumed site conditions and an exact constrained budget decision. This goes beyond displaying GIS layers: eligibility, conflicting roof choices, affordability and preference weights determine an inspectable portfolio.

PLANET alignment: climate resilience through relative heat investigation; energy/carbon through conditional solar screening; biodiversity through NDVI and historical-cover investigation. SDP's Sustainability Strategy and Roadmap 2030 includes a 40% Scope 1/2 reduction target. CoolTown does not establish corporate emissions-accounting contributions. Source: https://www.simedarbyproperty.com/sustainability/

REAL means historical Landsat/Sentinel-2/WorldCover-derived observations with declared provenance, not independently authenticated measurements. ASSUMED means site area, suitability, solar resources, costs and sensitivity scenarios. CALCULATED means heuristic scores, selected portfolios and conditional estimates. UNVERIFIED means ownership, engineering approval, actual cooling, biodiversity, realised savings and achieved emissions reduction. The bundled 20 polygons retain 11 quality-valid / 9 insufficient-data zones at 80%. The declared 2026 composite window ends 17 October 2026; WorldCover 2021 is historical reference. Neither denotes current land ownership or real-time conditions.

### Conditional solar impact and finance

Impact & Evidence totals only selected solar candidates in the current optimised existing-township portfolio. The separate solar calculator does not contribute. Each +10/+20% sensitivity row uses its own reoptimised portfolio. No selected PV means zero generation and zero associated avoidance. Otherwise missing applicable region, factor/year/source or declared displacement percentage/arrangement produces Not estimated. Selecting another region clears the previous factor; Peninsular data is never automatically assigned to Sabah/Sarawak.

Avoided grid emissions (tCO2e/year) = selected annual generation × explicitly assumed displacement percentage / 100 × applicable kgCO2e/kWh / 1000. The optional Peninsular Malaysia preset uses the 2024 provisional 0.740 factor published 23 February 2026 by the Energy Commission. Its Gg/GWh units equal kg/kWh. Source: https://myenergystats.st.gov.my/documents/d/guest/grid-emission-factor-gef-in-malaysia-2022-2024-provisional-
The published generation mix includes generators that may issue RECs; contractual and accounting treatment requires separate review. This is not verified corporate Scope 1/2 reduction. With explicit 100% displacement, 35,360 kWh × .740 / 1000 = 26.1664 tCO2e. The actual co2_reduction outcome remains null. JSON schema 5 exports formulas, inputs, sources and sensitivity estimates separately.

Financial screening requires choosing a selected solar intervention and explicitly entering an avoided price, self-consumption percentage, applicable export compensation, O&M, installation cost and provider/arrangement reference. No universal TNB tariff is supplied. The remaining fraction is assumed exported, so users must assess the actual arrangement; curtailment is not modelled. Value = generation × self-consumed fraction × avoided RM/kWh + generation × exported fraction × export RM/kWh. Net benefit = value − annual O&M. Simple payback = installation cost / positive annual net benefit. Incomplete inputs give Not estimated; non-positive net gives no payback. Financing, degradation, taxes, replacement and verified bill savings are excluded. Inputs are session-only and isolated by dataset; a new import clears that dataset's impact assumptions.

### Research and pilot evidence

Jumari et al. (2023), Analysis of urban heat islands with Landsat satellite images and GIS in Kuala Lumpur Metropolitan City, Heliyon 9 e18424: https://doi.org/10.1016/j.heliyon.2023.e18424 . The paper motivates examining urban development, vegetation and satellite surface heat in Malaysia.
Green Spaces Growth Impact on the Urban Microclimate (2013), Shah Alam: https://doi.org/10.1016/j.sbspro.2013.11.058 . It examines vegetation/land-cover and LST across historical Landsat dates. These studies support the problem and indicator choices; they do not validate this app's causal intervention effects. LST is not air temperature; NDVI is not a biodiversity census. Composite timing, coverage, spatial aggregation and the small 11-zone eligible sample limit generalisation. No interviews or user-validation results are claimed.

The compact proposed pilot plan in Impact & Evidence covers partner/boundary selection, ownership/access/site verification, professional assessment and quotations, one or two approved interventions, monitoring and repeatability. Required participants and proposed indicators are listed, with no approved partner or measured outcome implied. Location labels remain separate user declarations; source-verified labels require a reference and never prove ownership.

### Five-minute judge demonstration

1. Open the default Malaysian 2026 case. Show 20 polygons, 11 valid and 9 grey; inspect dates and relative temperature legend.
2. Start the Guided Demo explicitly. Explain the three hypothetical site assessments, not inferred existing facilities.
3. Open Recommendations & Budget: at RM150,000 the base plan is trees + carports, RM140,040, with 32 kWp / 35,360 kWh/year. Change objective weights or budget, then restore equal weights / RM150,000.
4. Show cost sensitivity: +10/+20% selects trees + cool roofs, without solar. Compare original/future optimised scenarios and roof-conflict validation.
5. Open Impact & Evidence. Apply the Peninsular preset, explicitly enter 100% displacement and a hypothetical arrangement note: 26.17 tCO2e/year; sensitivity rows show zero. Leave financial inputs blank to demonstrate Not estimated, then optionally enter clearly hypothetical values. Inspect unverified outcomes, pilot checklist and export JSON.

### Current validation

78 automated test groups pass, including selected-only carbon, incomplete assumptions, region/missing-factor handling, zero-PV sensitivity, financial completeness/positive-net payback, location evidence and original GeoJSON preservation. TypeScript and production build are required for every delivery; BUILD-MANIFEST.json is regenerated and all source/dist hashes verified. See FINAL-SCORING-REPORT.md for actual browser verification and limitations. See SECURITY-SUBMISSION.md for clean source and deployment actions; ATTRIBUTIONS.md for licensing status.

