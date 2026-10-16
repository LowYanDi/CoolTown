# CoolTown Planner

A React + TypeScript frontend prototype for the Sime Darby Property University Hackathon 2026, PLANET theme. All environmental records are synthetic, all financial and solar inputs are assumptions, and all interactions run locally in the browser. No authentication, database, backend, API keys or live satellite services are implemented in the application.

## Run

With Node.js 22.18+ or 24+ (native TypeScript configuration loading):

```sh
npm install
npm run dev
```

Build: `npm run build`. Validate algorithms: `npm test`. Deploy the generated `dist/` as a static website.

## Frontend architecture

- `src/data/zones.ts`: eight stable, centralised records with GeoJSON geometry and source status.
- `src/algorithms/planning.ts`: deterministic recommendation rules, exact subset optimisation, solar formulas and scenario calculations.
- `src/components/TownMap.tsx`: accessible interactive schematic map with selectable zones, five layers, zoom and reset. The schematic is deliberately labelled and does not claim surveyed or verified parcel boundaries. GeoJSON is retained for a future Leaflet adapter.
- `src/components/ui/button.tsx`: shadcn-style Radix Slot / class-variance-authority reusable button.
- `src/main.tsx`: five views with shared React state, Recharts, Lucide icons and JSON export.
- `src/styles.css`: responsive enterprise UI with Tailwind CSS integration.

State persists while navigating in the session and resets on refresh. The solar calculator is independent from per-zone solar assumptions. Both are exported. Future scenarios remain separate from the existing-township budget; the Impact view displays both explicitly.

## Rules and assumptions

Priority is `round(100 × (0.55 × clamp((LST − 30)/10,0,1) + 0.45 × (1 − NDVI)))`. These are illustrative weights and temperature anchors, not a validated rating. Hotspot threshold defaults to 36.5°C and is editable. NDVI deficit is `1 − NDVI`, a relative indicator rather than a measured area deficit.

Trees require hotspot status, NDVI < 0.4 and potential planting area. Rooftop solar requires roof type and at least 150 m² usable area with solar assumptions. Carports require parking type and at least 150 m². Cool roofs require exposed roof type. Conservation uses preliminary NDVI > 0.7 screening. All recommendations require site assessment.

Exact subset enumeration maximises total priority subject to budget, eligibility, user exclusions and mutually exclusive whole-roof interventions. Equal scores prefer lower cost. It is suitable only for the small demonstration dataset; larger inputs need a more scalable exact solver.

PV capacity is usable area × 0.16 kWp/m². Annual generation is capacity × 1,300 kWh/kWp/year × 0.85. Assumed PV cost is RM3,200/kWp, with a 35% premium for carport structures. Trees use RM18/m² potential planting space; cool roofs use RM65/m². Neither solar feasibility nor energy generation is inferred from surface temperature. Site feasibility requires irradiation, orientation, shading, structural and grid assessment.

Future scenario options use the same PV, tree and cool-roof assumptions plus fixed programme allowances of RM120,000 (carports), RM25,000 (shade structures) and RM18,000 (rain gardens). Future carport generation is excluded because no capacity is specified. Invalid land totals suppress comparison metrics. Future roof options may coexist as conceptual allowances; existing-zone roof projects are alternative whole-roof treatments.

## Replacing demo data

Preserve source product ID, acquisition dates, quality/cloud masks, coverage, units and verification status when replacing records. Ingest Landsat surface-temperature and Sentinel-2 reflectance/NDVI through a separately verified pipeline. Align spatial resolution and temporal coverage before aggregation. The current global Demo Data label must remain until genuinely verified records are integrated.

## Demo walkthrough

Open Existing Township, click Z001, inspect priority and inputs, generate recommendations, change the budget from RM50,000 to RM100,000, then explore Future Township. Adjust green-space allocation (maintaining 100% total) and usable roof area. Impact & Evidence shows the updated existing plan and future comparisons. Export downloads the full state as JSON.

