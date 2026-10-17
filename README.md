# CoolTown Planner

React + TypeScript frontend-only planning prototype. Existing five-page design, schematic map, zone selection, multi-objective scoring, solar calculator, scenario comparisons and JSON export are retained. No backend, database, authentication, external API or machine learning is used. All current environmental records and coordinates are synthetic; costs and solar resources are assumptions.

## Run and build

Use Node.js 22.18+ or 24 (validated with 24). From the folder containing package.json:

```sh
npm ci
npm test
npm run build
npm run dev
```

In Windows PowerShell use `npm.cmd` if npm.ps1 is blocked. Deploy the newly generated `dist/`, not an older build. Do not commit node_modules. The update package includes rebuilt dist and a BUILD-MANIFEST.json recording source and build hashes. No new dependency is needed for the default application.

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
- src/components/GeoJSONMap.tsx: optional Leaflet 1.9-compatible component accepting a host-supplied Leaflet runtime, GeoJSON data, shared minimum coverage, selected ID and selection callback. It is not activated or bundled into the default map. It fetches no tiles or external services and invents no boundaries. It has selection buttons, safe text popups, source/date/coverage labels, resize handling and cleanup.

To activate later, locally install/bundle Leaflet and its CSS in the host, pass its namespace as the component's leaflet prop, pass actual GeoJSON as data, and wire selected/onSelect to the imported dataset state. Keep the current schematic until that integration is ready. The optional renderer was type-checked; it has not been tested with a live Leaflet runtime or real observations. Its API follows https://leafletjs.com/reference.html .

Properties include zone_id, zone_name, lst_c, ndvi, landcover, observation_date (YYYY-MM-DD), data_source, data_status, data_coverage (percent), area_ha, site_type and site suitability/solar inputs. Coordinates use [longitude,latitude]. See UPGRADE-NOTES.md for the complete contract. Declared observed provenance without date/source becomes unknown. Geometry validation is not topology or survey certification. No real observations are included.

## Validation and export

28 test groups cover the original 23 behaviours plus quality boundaries/missing data, consistent environmental exclusion, original roof conflicts, quality/conflict export and optional GIS provenance. See VALIDATION.txt. JSON export retains raw scenarios, error states, feasible alternatives, objective weights, coverage policy and per-zone quality reasons, selected interventions and the independent solar calculation. Session state resets on refresh.
