import {carbonWarnings,financialWarnings,PLAUSIBILITY_POLICY,DEMO_CLARITY} from './assumptionWarnings.ts';
import { portfolioImpact,financialScenario,studyLabel,EMPTY_STUDY,type GridAssumptions,type FinancialInputs,type StudyLabel } from './impact.ts';
import { costSensitivity,futureComparison,pilotReadiness,type PilotChecks,type ComparisonSettings } from './readiness.ts';
import { relativeHotspotThreshold } from '../data/caseStudyModel.ts';
import { type SiteAssessments } from '../data/siteAssessment.ts';
import { datasetProvenance } from '../data/provenance.ts';
import { priority } from './planning.ts';
import { preliminaryOpportunities } from './opportunities.ts';
import { warningGroups } from '../data/presentation.ts';
import { DEMO_DATASET, type PlanningDataset } from '../data/dataset.ts';
import { COVERAGE_POLICY, coverageThreshold, environmentalQuality } from '../data/validation.ts';
import { zones, source, demoDataset } from '../data/zones.ts';
import { recommend, planningResult, optimiseScenario, scenarioMetrics, normaliseObjectives, solar, SCORE_METHOD, SCENARIO_ASSUMPTIONS, type Objectives, type Scenario, type Solar } from './planning.ts';
export type SummaryInput = {
    grid?:GridAssumptions; financialInputs?:Record<string,FinancialInputs>; financialCandidateId?:string; study?:StudyLabel;
    comparison?:ComparisonSettings; pilotChecks?:PilotChecks; exampleZoneIds?:string[];
    siteAssessments?: SiteAssessments; selectedZoneIds?: string[]; budget: number; dataset?: PlanningDataset;
    excluded: string[];
    threshold: number; minimumCoverage?: number;
    objectives: Objectives;
    scenarios: Scenario[];
    solarInputs: Solar;
};
/** Pure export builder, shared by the UI and tests. Nothing is sent to a service. */
export function buildPlanningSummary(input: SummaryInput, exportedAt = new Date().toISOString()) {
    const dataset = input.dataset ?? DEMO_DATASET, zones = dataset.zones;
    const candidates = recommend(input.threshold, input.objectives, zones, input.minimumCoverage, input.siteAssessments);
    const plan = planningResult(candidates, input.budget, input.excluded);
    return {
        schema_version: 5,
        assumption_review:{policy:PLAUSIBILITY_POLICY,notice:DEMO_CLARITY,carbon:carbonWarnings(input.grid),financial:input.financialCandidateId?financialWarnings(input.financialInputs?.[input.financialCandidateId],plan.selected.find(c=>c.id===input.financialCandidateId),financialScenario(plan.selected.find(c=>c.id===input.financialCandidateId),input.financialInputs?.[input.financialCandidateId]).simple_payback_years):[]},
        source_references:{environmental:zones.map(z=>({zone_id:z.zone_id,source:z.data_source,observation_date:z.observation_date,observation_start:z.observation_start??null,observation_end:z.observation_end??null,landcover_source:z.landcover_source??null})),carbon:input.grid?.source??'',financial:input.financialInputs?.[input.financialCandidateId??'']?.source??'',notice:'References are user-declared and not independently authenticated.'},
        estimated_solar_carbon_impact:portfolioImpact(plan.selected,input.grid),
        financial_scenario:financialScenario(plan.selected.find(c=>c.id===input.financialCandidateId),input.financialInputs?.[input.financialCandidateId??'']),
        study_location:studyLabel(input.study??EMPTY_STUDY),
        ownership_notice:'Independent land ownership and township-boundary verification have not been completed.',
        application: 'CoolTown Planner',
        exported_at: exportedAt,
        data_source: { id: dataset.id, title: dataset.title, mode: dataset.mode },
        original_geojson: dataset.originalGeoJSON ?? null,
        site_assessments: input.siteAssessments ?? {},
        site_assessment_notice: 'User-supplied assumptions stored separately; never verified engineering facts or satellite measurements.',
        dataset_provenance: datasetProvenance(dataset,input.minimumCoverage),
        selected_zone_ids:(input.selectedZoneIds ?? []).filter(id=>zones.some(z=>z.zone_id===id)),
        environmental_scores:zones.map(z=>({zone_id:z.zone_id,priority:environmentalQuality(z,input.minimumCoverage).usable?priority(z,input.minimumCoverage):null})),
        data_validation: dataset.issues,
        grouped_validation: warningGroups(zones,input.minimumCoverage),
        preliminary_opportunities: preliminaryOpportunities(zones,input.threshold,input.minimumCoverage),
        environmental_quality: { minimum_coverage_percent: coverageThreshold(input.minimumCoverage), policy: COVERAGE_POLICY, zones: zones.map(z => ({ zone_id: z.zone_id, ...environmentalQuality(z, input.minimumCoverage) })) },
        notice: dataset.mode === 'demo' ? 'Synthetic demonstration. No observed satellite data.' : 'User-imported observed records; provenance is declared, not independently verified. Derived indicators and assumed costs are not engineering approval.',
        zones,
        objectives: { raw: input.objectives, normalised: normaliseObjectives(input.objectives), method: SCORE_METHOD },
        methodology: { intervention_scoring: SCORE_METHOD, zone_priority: '55% clamped relative heat + 45% clamped vegetation deficit; unavailable if environmental inputs are invalid.', hotspot_threshold_c: input.threshold, relative_hotspot_reference_c: dataset.mode==='real'?relativeHotspotThreshold(zones,input.minimumCoverage):null, hotspot_initialisation:'Real datasets initialise at the linear-interpolated 80th percentile of quality-valid LST; manual threshold remains independent. Relative surface heat, not a certified danger threshold.', optimisation: 'Exact subset enumeration with eligibility, exclusions, integer-cent budget and mutually exclusive whole-roof groups. Maximise weighted heuristic points; lower cost breaks ties.', future_assumptions: SCENARIO_ASSUMPTIONS },
        existing_township: { budget: input.budget, excluded: input.excluded, candidates, ...plan, green_intervention_area_m2: plan.selected.reduce((n, c) => n + c.green, 0), annual_generation_kwh: plan.selected.reduce((n, c) => n + c.generation, 0) },
        future_scenarios: input.scenarios.map(s => {
            const m = scenarioMetrics(s, input.objectives);
            return { ...s, evidence: 'Synthetic planning scenario with assumed costs and solar resources; not derived from imported boundaries.', valid: m.valid, errors: m.errors, metrics: m.valid ? m : null, budget_constrained: optimiseScenario(s, input.objectives) };
        }),
        cost_sensitivity: costSensitivity(candidates,input.budget,input.excluded).map(row=>({...row,estimated_solar_carbon_impact:portfolioImpact(row.plan.selected,input.grid)})),
        comparison_constraints: input.comparison??{equal:false,area:100,budget:1000000},
        future_comparison: futureComparison(input.scenarios,input.comparison??{equal:false,area:100,budget:1000000},input.objectives),
        guided_example: {zone_ids:input.exampleZoneIds??[],notice:'Demonstration assumptions, not verified site data.'},
        pilot_checklists: Object.fromEntries(candidates.map(c=>[c.id,pilotReadiness(input.pilotChecks?.[c.id])])),
        unverified_outcomes: {temperature_reduction:null,biodiversity_improvement:null,co2_reduction:null,thermal_comfort_improvement:null,notice:'No achieved environmental outcomes measured.'},
        solar_calculator: { inputs: input.solarInputs, ...solar(input.solarInputs), status: 'Independent calculator using assumed inputs; does not overwrite zone solar assumptions.' }
    };
}
