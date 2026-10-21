# CoolTown Planner

**From Heat Maps to Budget-Ready Sustainability Decisions**

**Team Keep Dancing** · Tunku Abdul Rahman University of Management and Technology (TAR UMT)  
**SDP University Hackathon 2026 — PLANET Challenge**

**Live Prototype:** https://cooltownplanner.netlify.app/

> **See the heat. Choose the action. Defend the budget.**

## 1. Overview

CoolTown Planner is a **frontend-only sustainability decision-support prototype** for Malaysian townships. It connects historical satellite environmental observations with preliminary site screening, explainable sustainability recommendations, **budget-constrained optimisation**, conceptual future-township comparisons, and traceable impact evidence.

The problem is not just identifying heat and low vegetation on a map. Township planners also need to ask: **Where should we investigate? What may be suitable? Which combination of interventions fits the budget? What still needs to be verified?**

CoolTown's contribution is a transparent workflow:

**OBSERVE → QUALITY-SCREEN → ASSESS SITE ASSUMPTIONS → OPTIMISE → REVIEW EVIDENCE**

The prototype does **not** claim to measure real-time air temperature, confirm land ownership or engineering suitability, predict measured cooling/biodiversity outcomes, or verify financial savings and carbon reductions.

## 2. Core Features

| Page | Features |
| --- | --- |
| **Overview** | High-level environmental indicators and navigation to planning tools. |
| **Existing Township** | Malaysian satellite case study, interactive street/satellite basemaps, five environmental layers, LST/NDVI, quality screening, provenance, zone selection, and local GeoJSON import. |
| **Future Township** | Conceptual township scenarios, land-use allocations, programme assumptions, and equal-area/equal-budget comparisons. |
| **Recommendations & Budget** | Preliminary opportunities, user-declared site assessments, eligible intervention candidates, explainable cooling/energy/biodiversity preferences, exact bounded budget optimisation, and cost sensitivity. |
| **Impact & Evidence** | Conditional solar generation, avoided grid-emissions and financial estimates, data/evidence status, pilot-verification checklist, and JSON export. |

### Five-minute demo path

1. Open **Existing Township** and review the historical case study, map, 20 analysis zones, source dates, and data-quality exclusions.
2. Click **Try Example Planning Scenario**. The example introduces **hypothetical** planting, roof and parking conditions; it does not treat satellite observations as construction permission.
3. Go to **Recommendations & Budget** and show the **RM150,000** demonstration budget and selected intervention portfolio.
4. Increase assumed costs by **10%** to show the optimizer selecting a different affordable portfolio, then briefly compare **Future Township** scenarios.
5. Restore the original solar-carport portfolio, open **Impact & Evidence**, enter the clearly labelled optional assumptions, review conditional calculations and evidence limits, and export the result.

## 3. Malaysian 2026 Case Study

The supplied, bundled `CoolTown_Real_Zones_2026.geojson` contains a declared satellite-composite study covering **1 January–17 October 2026**. The team-supplied analysis polygons cover approximately **167.69 hectares**.

| Indicator | Demo result |
| --- | ---: |
| Analysis zones | **20** |
| Quality-valid zones at the default 80% coverage setting | **11** |
| Insufficient-data zones | **9** |
| Relative LST hotspots | **3** |
| Approximate LST values in quality-valid zones | **39.27–44.98 °C** |
| Relative hotspot threshold | **~44.78 °C** (80th percentile of valid-zone LST) |

**Declared environmental data:** Landsat 8/9 Collection 2 Level 2 land-surface temperature (LST), Sentinel-2 SR Harmonized vegetation index (NDVI), and ESA WorldCover **2021** historical land-cover reference. Google Earth Engine was used in the declared observation-processing workflow.

**Important interpretation limits:**

- **LST is land-surface temperature**, not air temperature, thermal comfort or live street temperature.
- NDVI indicates vegetation conditions; it does **not** prove plantable land or measured biodiversity.
- WorldCover 2021 is not verified current land use, zoning, site access or ownership.
- Satellite/street basemaps provide geographic context and may not match composite observation dates.
- Study polygons do not certify Sime Darby Property ownership or site approvals.
- The bundled data retain original source declarations, but the frontend does not independently authenticate the underlying Earth Engine export.

### Environmental screening

The shared rule in `src/data/validation.ts` checks finite LST and NDVI, provenance, and meaningful observation coverage. The default minimum is **80% jointly usable coverage**, adjustable in the Existing Township interface. Inadequate records are labelled **Insufficient Data** and excluded from reliable environmental rankings and charts; they are not silently treated as zeros.

The environmental priority heuristic combines a **55% normalised LST component** with a **45% vegetation-deficit component**. These are relative investigation priorities, **not** scientific predictions of cooling, human heat risk or ecosystem improvement. Solar suitability is screened using its own declared installation/resource data, never inferred from LST alone.

## 4. Site Assessment and Explainable Recommendations

CoolTown separates **environmental opportunities** from **costed planning candidates**.

- **Preliminary opportunities** identify quality-screened zones that may merit further heat/vegetation investigation; they do not invent planting area, roof availability or cost.
- **Screened candidates** require declared usable area, site type, suitability and applicable cost/solar inputs. A user-entered assessment remains **Assumed / Not Verified**, even when the optimiser selects it.

The guided example uses up to three quality-valid zones and hypothetical walkway, roof and parking areas. It can produce **shade trees, rooftop solar, cool roofs and solar carports**, depending on eligibility. The system explains selection, exclusion, assumed costs and conflicting roof choices. Actual location, structural capacity, drainage, access, permits, solar resources and supplier prices need separate verification.

## 5. Budget Optimisation

The user controls relative **cooling, renewable-energy and biodiversity** weights, candidate exclusions and investment limits.

The solver uses **deterministic exhaustive subset search for up to 22 eligible positive-score candidates**. It checks budgets and mutually exclusive whole-roof interventions, and re-runs when costs or priorities change. Tied scores favour lower cost. It does not need to spend every ringgit; an all-zero objective setting selects no interventions.

The result is **exact within its bounded candidate set**, not globally optimal across all possible real-world projects. Weighted preference scores are planning heuristics, not physical environmental results.

### RM150,000 demonstration

| Cost scenario | Selected preliminary interventions | Assumed investment | Budget left |
| --- | --- | ---: | ---: |
| Base | Shade trees + solar carports | **RM140,040** | RM9,960 |
| +10% | Shade trees + cool roofs | **RM16,280** | RM133,720 |
| +20% | Shade trees + cool roofs | **RM17,760** | RM132,240 |

When costs increase 10%, the **original** trees-and-solar-carports combination would cost **RM154,044** and exceed the RM150,000 budget. CoolTown selects another eligible combination. The large amount left unspent reflects the limited hypothetical candidates; it does not mean there are no other valuable projects in the township.

Changing objective weights can also change the selected portfolio; these scenario results are preference comparisons, **not measured impact rankings**.

## 6. Solar, Carbon and Financial Screening

The values below are **illustrative, user-assumption-based estimates** for a selected solar-carport candidate with **200 m²** assumed usable area.

| Metric | Formula / input | Example result |
| --- | --- | ---: |
| PV capacity | 200 m² × 0.16 kWp/m² | **32.0 kWp** |
| Annual electricity generation | 32 × 1,300 kWh/kWp/year × 0.85 | **35,360 kWh/year** |
| Installed solar-carport cost | 32 kWp × RM3,200/kWp × 1.35 | **RM138,240** |
| Indicative avoided grid emissions | 35,360 × 100% displacement × 0.740 kgCO₂e/kWh ÷ 1,000 | **26.17 tCO₂e/year** |
| Annual electricity value | 35,360 × [(80% × RM0.50) + (20% × RM0.10)] | **RM14,851.20/year** |
| Net annual benefit | RM14,851.20 − RM200 annual O&M | **RM14,651.20/year** |
| Simple payback | RM138,240 ÷ RM14,651.20 | **9.44 years** |

The example grid factor is the **Energy Commission's provisional Peninsular Malaysia 2024 value of 0.740 kgCO₂e/kWh**. The 100% displacement, electricity values, export compensation, self-consumption, O&M and PV yield are declared demonstration assumptions—not verified data, an actual TNB tariff or a signed export agreement. Applicable factor/region and displacement assumptions must be explicitly entered; no automatic carbon claim is made from incomplete inputs.

The financial estimate excludes financing, module degradation, tax, replacements and curtailment. The indicative avoided-emissions result is **not** certified project emission savings or an established corporate Scope 1/2 reduction. Actual measured `co2_reduction` remains unverified.

**Portfolio consistency:** If cost sensitivity replaces solar carports with trees and cool roofs, do **not** continue attributing the original solar generation, carbon or payback values to the newly selected no-solar portfolio.

## 7. Future Township Scenarios

The Future Township page uses **synthetic conceptual plans**, separate from the observed Malaysian GIS study. In an equal-resource example, both scenarios use **100 ha and RM1,000,000**, while a conventional allocation has **10% green space** and a sustainability-focused allocation has **25%**. These are planning illustrations, not survey-grade parcel plans or measured future outcomes. Independent scenario budgets are supported, and incompatible whole-roof options cannot be jointly selected for the same roof.

## 8. Preliminary User Feedback

Four university-affiliated **general users** completed an exploratory five-question survey on **18–19 October 2026** (`n = 4`). The team reports:

- **4.0/5** mean perceived usefulness (ratings: 4, 3, 5 and 4).
- **4/4** considered urban heat and limited greenery important issues.
- Participants separately valued the heat map, recommendations, budget optimisation and future-township comparison.
- They requested more recent/traceable data, clearer information, real site checks, supplier quotations, and professional assessment.

This small convenience sample is **not** professional town-planner validation, measured workflow-time improvement, statistically representative demand or demonstrated commercial adoption. Respondent identity and original feedback records should be retained privately; obtain consent before sharing identifiable quotations.

## 9. Technical Architecture and Data Handling

- **Stack:** React, TypeScript, Vite, Leaflet, locally bundled Leaflet CSS, UI components and Recharts.
- **Architecture:** Frontend only; **no backend, database, authentication, machine learning or IoT**. External requests are primarily to map tile providers.
- **Environmental data:** Bundled historic GeoJSON, independently labelled synthetic demo, and optional local WGS84 GeoJSON import. Imported files remain in browser memory and are not sent to a project backend.
- **Data quality:** Shared environmental policy; provenance/source warnings; separate user-declared site assumptions.
- **Optimisation:** Deterministic bounded exact subset enumeration, objective weights, conservative cent-based budget arithmetic, eligibility and roof conflicts.
- **State and export:** User inputs and evidence declarations are session-only; **export before refreshing**. JSON includes observations, assumptions, selected options, sensitivities, evidence status and explicit unverified outcomes. Export is not professional certification.

### GeoJSON import requirements

Import a WGS84 `FeatureCollection` with `Polygon` or `MultiPolygon` features, coordinates in **[longitude, latitude]**, and valid, nondegenerate rings. The supplied project documents limits of **5 MB** and **500 zones**. Some relevant properties include:

`zone_id`, `zone_name`, `lst_c`, `ndvi`, `landcover`, `data_coverage`, `data_status`, `area_ha`, `data_source`, `observation_date` or `observation_start` / `observation_end`, `site_type`, and optional suitability/solar information.

The validator checks IDs, geometry, measurements and provenance. Invalid or missing measurements are not converted to fabricated observations. Missing/unknown source information can prevent reliable environmental scoring. Failed imports retain the last accepted dataset. Custom site assessments and observed satellite values are stored separately.

### Selected source files

| Path | Purpose |
| --- | --- |
| `src/data/validation.ts` | Shared data-quality policy. |
| `src/data/loader.ts` | GeoJSON parsing and validation. |
| `src/data/gis.ts` | Real-data environmental rendering preparation. |
| `src/components/GeoJSONMap.tsx` | Interactive Leaflet map, layers, source labels and zone selection. |
| `src/components/DatasetControls.tsx` | Dataset choices and local imports. |
| `src/algorithms/planning.ts` | Planning and optimisation rules. |
| `src/algorithms/impact.ts` | Conditional carbon/financial calculations. |
| `src/algorithms/planning.test.ts` | Automated test groups. |
| `src/assets/case-studies/CoolTown_Real_Zones_2026.geojson` | Team-supplied historical Malaysian case-study polygons and observations. |

Names describe the **v7 clean-source package**; if your submitted GitHub tree differs, update this table accordingly.

## 10. Run Locally

**Requirements:** Node.js **22.18+ or 24** (the supplied project notes report validation with Node.js 24), plus npm. Run from the directory containing `package.json`:

```bash
npm ci
npm test
npm run build
npm run dev
```

Vite prints the local URL to open. In Windows PowerShell, if `npm.ps1` is blocked by execution policy, use `npm.cmd`.

### Optional satellite basemap

Create `.env.local` using the supplied example environment file (`env.example` or `.env.example`, according to your checkout) and configure:

```dotenv
VITE_MAPTILER_KEY=your_public_maptiler_key
```

Restart development or rebuild for a changed `VITE_` variable. **Vite exposes these variables to the browser**, so use only a **public, domain-restricted** map key; do not put private secrets into frontend environment variables. Street tiles should remain available as a fallback. Satellite imagery is map context, not the source of real-time thermal measurements.

Map providers apply their own terms, required attributions, usage quotas and caching policies. Do not bulk-prefetch or strip attribution from OpenStreetMap tiles.

### Production build and repository safety

- Run `npm test` and `npm run build` from the **exact commit being submitted**.
- Deploy the **newly generated `dist/`**, rather than an older artifact. The supplied source includes build-manifest scripts and `BUILD-MANIFEST.json`; verify source/build consistency using the project's build process.
- Keep `package.json` and `package-lock.json` consistent.
- Do **not** commit `node_modules/`, `.env.local`, private keys, oversized temporary archives, or development caches.
- Restrict the public map key to localhost and approved deployment domains, and check provider quotas.
- A successful local build does **not automatically prove** the deployed Netlify site serves the same commit.

## 11. Automated Tests and QA Evidence

**82 automated test groups passed** when the v7 clean-source `src/algorithms/planning.test.ts` was executed on the reviewed source snapshot. The previous draft README listed **78** because it predated additional tests. This is a **code-level test result**, not proof of field performance or a deployed-production hash match.

Tests cover environmental validation, data status/provenance, GeoJSON behaviour, bounded optimisation, eligibility, roof conflicts, cost sensitivity, scenario state, conditional carbon and financial inputs, evidence handling and export integrity. Run `npm test` again on your final GitHub commit and confirm the count still matches. A separate TypeScript/production build is required to validate compilation and deployment assets.

## 12. Proposed Six-Week Professional Validation

A **future** pre-field evaluation could begin only after a partner and study scope are agreed:

| Timing | Proposed activity | Evidence to collect |
| --- | --- | --- |
| **Week 1** | Agree a partner, study boundary, permissions and comparison tasks. | Access/baseline checklist and task brief. |
| **Weeks 2–3** | Verify data provenance, roof/planting/parking conditions and local limitations with qualified reviewers. | Preliminary candidate register, expert comments and supplier quotations. |
| **Weeks 4–5** | Test comparable tasks with **3–5 intended professional users**; vary task order. | Completion time, errors, assistance and qualitative feedback. |
| **Week 6** | Review results and make a **go/no-go** decision about a subsequent approved field pilot. | Evidence assessment and documented decision. |

**Proposed success criteria, not completed achievements:** zero budget/roof-conflict violations, traceable sources and assumptions for shortlisted items, and at least **4/5 unaided task completions if five users are recruited**. There is **no signed partner agreement, approved construction project or measured post-installation impact** claimed.

## 13. Limitations and Responsible Interpretation

CoolTown is an early-stage prototype. In particular:

1. The quality gate, hotspot thresholds and weighted scores are **illustrative rules**, not externally calibrated environmental-risk or cooling models.
2. Satellite-derived land cover and surface temperature do not verify human heat exposure, actual planting capacity, land rights or structural feasibility.
3. Intervention eligibility relies on declared site assumptions; professional checks and supplier quotations are required before investment approval.
4. Solar electricity, emissions, financial benefits and payback are **conditional scenarios**, not achieved savings or certified carbon impacts.
5. The optimiser searches a **bounded candidate register** and cannot identify projects that were never entered.
6. Imported assessments and planning inputs are not permanently stored on a server; they may be lost on refresh.
7. Current general-user feedback does not establish professional planner adoption or willingness to pay.
8. The deployed website, original Earth Engine workflow and physical site conditions still require independent verification for real-world use.

## 14. References and Attribution

- **Sime Darby Property sustainability:** https://www.simedarbyproperty.com/sustainability/
- **USGS Landsat 8 Collection 2 Level 2 (Earth Engine catalog):** https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
- **Copernicus Sentinel-2 SR Harmonized (Earth Engine catalog):** https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED
- **ESA WorldCover:** https://esa-worldcover.org/
- **Energy Commission Malaysia, 2022–2024 provisional grid emission factor:** https://myenergystats.st.gov.my/documents/d/guest/grid-emission-factor-gef-in-malaysia-2022-2024-provisional-
- **QGIS:** https://qgis.org/
- **ArcGIS Urban:** https://www.esri.com/en-us/arcgis/products/arcgis-urban/overview
- **Global Solar Atlas:** https://globalsolaratlas.info/
- **MapTiler documentation:** https://docs.maptiler.com/cloud/api/tiles/
- **OpenStreetMap tile policy:** https://operations.osmfoundation.org/policies/tiles/
- **Research context:** Jumari et al. (2023), *Analysis of urban heat islands with Landsat satellite images and GIS in Kuala Lumpur Metropolitan City*, *Heliyon*, https://doi.org/10.1016/j.heliyon.2023.e18424.

Prior research motivates the topic and satellite indicators; it does **not** independently validate CoolTown's proposed interventions or their causal environmental effects. Refer to the project's attribution/security notes if included in the submitted repository.

## 15. Team

**Keep Dancing** — Tunku Abdul Rahman University of Management and Technology (**TAR UMT**)

| Member | Role |
| --- | --- |
| Low Yan Di | Team Leader |
| Lim Zhun Zi | Team Member |
| Tee Jun Hao | Team Member |
| Cham Xin Hui | Team Member |
| Tan Yi Jia | Team Member |

**Hackathon:** SDP University Hackathon 2026 — PLANET Challenge  
**Live prototype:** https://cooltownplanner.netlify.app/

---

**CoolTown Planner — See the heat. Choose the action. Defend the budget.**
