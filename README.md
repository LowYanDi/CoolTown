# CoolTown Planner

React + TypeScript frontend-only planning prototype. Existing five-page design, schematic map, zone selection, multi-objective scoring, solar calculator, scenario comparisons and JSON export are retained. No backend, database, authentication or machine learning is used. The only external service requests are map basemap providers. Bundled demo records are synthetic; imported observations remain user-declared. Costs and solar resources are assumptions unless explicitly supplied.

## Run and build

Use Node.js 22.18+ or 24 (validated with 24). From the folder containing package.json:

```sh
npm ci
npm test
npm run build
npm run dev
```

In Windows PowerShell use `npm.cmd` if npm.ps1 is blocked. Deploy the newly generated `dist/`, not an older build. Do not commit node_modules. The update package includes rebuilt dist and a BUILD-MANIFEST.json recording source and build hashes. Every npm run build regenerates the manifest through scripts/build-manifest.mjs. Leaflet 1.9.4 and its CSS are bundled locally; package.json and package-lock.json must be updated together.

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

In Existing Township Analysis choose Synthetic Demo Map or Real GIS Study Area. Real mode starts empty until a local GeoJSON is accepted. Importing selects it for Overview, Analysis, Recommendations, Budget, Impact and JSON export. Future Township remains a separate synthetic scenario model. Switching datasets clears zone selection and per-candidate exclusions. The imported file remains in memory only and is discarded on refresh; it is not uploaded.

Imports accept a WGS84 FeatureCollection of up to 500 zones and 5 MB. Invalid geometries/duplicate IDs are skipped; invalid measurements become null with visible warnings. Missing/invalid date or source keeps its valid polygon visible with unknown provenance and excludes it from reliable environmental scoring. Absent data_status is treated as the user's observed declaration on import, but explicit synthetic/assumed/unknown records are excluded. This does not certify the observations. A failed import leaves the last accepted dataset unchanged. No actual Malaysian observations or boundaries are distributed.

The exact optimiser still supports at most 22 positive-score eligible candidates. Larger candidate sets show an explicit blocking error and no partial plan; exclusions can reduce the set. JSON export records that error. Missing area_ha contributes no area and is flagged; area-weighted indicators exclude missing/zero areas. No geometry-to-area estimate or site/solar assumptions are invented. Supplying only satellite observations may correctly yield no installable interventions: planting areas, roof exposure and solar suitability need separate evidence.

Properties include zone_id, zone_name, lst_c, ndvi, landcover, observation_date or observation_start / observation_end (YYYY-MM-DD), data_source, data_status, data_coverage (percent), area_ha, site_type and site suitability/solar inputs. Coordinates use [longitude,latitude]. See UPGRADE-NOTES.md for the complete contract. Declared observed provenance without date/source becomes unknown. Geometry validation is not topology or survey certification. No real observations are included.

## Validation and export

53 test groups cover the original 23 behaviours plus coverage, roof conflicts, local imports, selected-dataset export, provenance, missing solar inputs and oversized optimiser guards. See VALIDATION.txt. JSON export retains raw scenarios, error states, feasible alternatives, objective weights, coverage policy and per-zone quality reasons, selected interventions and the independent solar calculation. Session state resets on refresh.

## Environmental charts and two-stage planning update

EnvironmentalCharts uses finite observations passing the shared quality rule. No missing observation is plotted as zero. Temperature axes use numeric padded domains with unique ticks and one-decimal labels; NDVI uses two-decimal labels on [-1,1]. Zone IDs are shortened and angled; full IDs stay in tooltips and exports. Wide zone charts scroll horizontally. Display rounding never modifies stored measurements.

Import warnings are summarised into four expandable categories: missing environmental observations, insufficient coverage, missing solar inputs and unverified site suitability. A zone appears once per category. Additional rejected-record messages remain available. Missing solar inputs disable solar screening only, without invalidating otherwise usable environmental observations.

A. Preliminary Sustainability Opportunities uses valid environmental indicators and recognised land-cover context to suggest further cooling or biodiversity investigation. No cost/area/resource values are fabricated. These opportunities are never passed into the optimiser.

B. Screened Planning Candidates accepts either imported declarations of site verification with complete intervention inputs, or a separately declared Preliminary Site Assessment. The latter always remains Assumed / User-supplied / NOT VERIFIED, even when selected by the budget optimiser. Missing or unsuitable assessments create no candidates. Imported site_verified flags are never changed. Synthetic demo and Future Township workflows remain separate.

JSON export adds preliminary_opportunities and grouped_validation, preserving original observations and the feasible plan separately. The actual user Landsat/Sentinel-2 file was not available during this update; automated and browser checks use artificial fixtures, not claimed real observations.

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

