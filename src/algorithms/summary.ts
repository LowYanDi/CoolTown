import { COVERAGE_POLICY, coverageThreshold, environmentalQuality } from '../data/validation.ts';
import { zones, source, demoDataset } from '../data/zones.ts';
import { recommend, optimise, optimiseScenario, scenarioMetrics, normaliseObjectives, solar, SCORE_METHOD, SCENARIO_ASSUMPTIONS, type Objectives, type Scenario, type Solar } from './planning.ts';
export type SummaryInput = {
    budget: number;
    excluded: string[];
    threshold: number; minimumCoverage?: number;
    objectives: Objectives;
    scenarios: Scenario[];
    solarInputs: Solar;
};
/** Pure export builder, shared by the UI and tests. Nothing is sent to a service. */
export function buildPlanningSummary(input: SummaryInput, exportedAt = new Date().toISOString()) {
    const candidates = recommend(input.threshold, input.objectives, zones, input.minimumCoverage);
    const plan = optimise(candidates, input.budget, input.excluded);
    return {
        schema_version: 2,
        application: 'CoolTown Planner',
        exported_at: exportedAt,
        data_source: source,
        data_validation: demoDataset.issues,
        environmental_quality: { minimum_coverage_percent: coverageThreshold(input.minimumCoverage), policy: COVERAGE_POLICY, zones: zones.map(z => ({ zone_id: z.zone_id, ...environmentalQuality(z, input.minimumCoverage) })) },
        notice: 'Synthetic frontend screening prototype. No observed satellite records, validated environmental impacts or engineering approvals.',
        zones,
        objectives: { raw: input.objectives, normalised: normaliseObjectives(input.objectives), method: SCORE_METHOD },
        methodology: { intervention_scoring: SCORE_METHOD, zone_priority: '55% clamped relative heat + 45% clamped vegetation deficit; unavailable if environmental inputs are invalid.', hotspot_threshold_c: input.threshold, optimisation: 'Exact subset enumeration with eligibility, exclusions, integer-cent budget and mutually exclusive whole-roof groups. Maximise weighted heuristic points; lower cost breaks ties.', future_assumptions: SCENARIO_ASSUMPTIONS },
        existing_township: { budget: input.budget, excluded: input.excluded, candidates, ...plan, green_intervention_area_m2: plan.selected.reduce((n, c) => n + c.green, 0), annual_generation_kwh: plan.selected.reduce((n, c) => n + c.generation, 0) },
        future_scenarios: input.scenarios.map(s => {
            const m = scenarioMetrics(s, input.objectives);
            return { ...s, valid: m.valid, errors: m.errors, metrics: m.valid ? m : null, budget_constrained: optimiseScenario(s, input.objectives) };
        }),
        solar_calculator: { inputs: input.solarInputs, ...solar(input.solarInputs), status: 'Independent calculator using assumed inputs; does not overwrite zone solar assumptions.' }
    };
}
