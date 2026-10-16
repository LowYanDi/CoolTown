import { zones, type Zone } from '../data/zones.ts';
import { clamp01, finite, inRange, validLST, validNDVI, vegetationDeficit, weightedMean } from '../data/validation.ts';
export type Objectives = {
    cooling: number;
    energy: number;
    biodiversity: number;
};
export const DEFAULT_OBJECTIVES: Objectives = { cooling: 1, energy: 1, biodiversity: 1 };
export const objectiveLabels = { cooling: 'Urban Cooling', energy: 'Renewable Energy', biodiversity: 'Biodiversity' };
export const SCORE_METHOD = 'Heuristic v2: component scores 0–100; weighted mean of cooling, energy and biodiversity. Non-negative relative weights normalise to 1. All zero selects no interventions. Scores are planning preferences, not scientifically validated impacts. NDVI deficit = 1 − clamp(NDVI, 0, 1); negative NDVI is valid but does not prove plantability.';
export function normaliseObjectives(w: Objectives): Objectives {
    const clean = (n: number) => finite(n) && n > 0 ? n : 0;
    const max = Math.max(clean(w.cooling), clean(w.energy), clean(w.biodiversity));
    if (!max)
        return { cooling: 0, energy: 0, biodiversity: 0 };
    const c = clean(w.cooling) / max, e = clean(w.energy) / max, b = clean(w.biodiversity) / max, total = c + e + b;
    return { cooling: c / total, energy: e / total, biodiversity: b / total };
}
export function planningScore(c: Objectives, weights: Objectives = DEFAULT_OBJECTIVES): number {
    const w = normaliseObjectives(weights);
    return Math.round(10000 * (clamp01(c.cooling / 100) * w.cooling + clamp01(c.energy / 100) * w.energy + clamp01(c.biodiversity / 100) * w.biodiversity)) / 100;
}
export const hasEnvironment = (z: Zone) => z.data_coverage !== 0 && validLST(z.lst_c) !== null && validNDVI(z.ndvi) !== null;
export const mean = weightedMean(zones.map(z => ({ value: z.lst_c, weight: 1 })));
/** Internal conservative fallback 0; UI must label missing environmental scores Unavailable. */
export const priority = (z: Zone) => hasEnvironment(z) ? Math.round(100 * (.55 * clamp01((z.lst_c! - 30) / 10) + .45 * vegetationDeficit(z.ndvi)!)) : 0;
export type Solar = {
    area: number;
    density: number;
    yield: number;
    factor: number;
    cost: number;
};
export function solar(s: Solar) {
    if (inRange(s.area, 0, 1e8) === null || inRange(s.density, 0, .3) === null || inRange(s.yield, 0, 3000) === null || inRange(s.factor, 0, 1) === null || inRange(s.cost, 0, 100000) === null)
        throw new Error('Solar values must be finite and non-negative; density ≤ 0.3, yield ≤ 3000, factor ≤ 1.');
    const capacity = s.area * s.density;
    return { capacity, generation: capacity * s.yield * s.factor, cost: capacity * s.cost };
}
export type SolarScreening = ReturnType<typeof solar> & {
    inputs: Solar;
    status: string;
    assumptions: string;
    verification: string;
};
const solarVerification = 'Verify irradiation / annual yield, shading, orientation, usable area, structural capacity, roof condition or vehicle clearance, permits and grid connection. Screening is not engineering approval.';
export function screenSolar(z: Zone): SolarScreening | null {
    const s = z.solar_inputs;
    if (!s || s.suitable !== true || !['Roof', 'Parking'].includes(z.site_type) || z.estimated_usable_area < 150 || s.status === 'unknown' || z.site_input_status === 'unknown' || !s.source || s.source === 'Unknown solar source')
        return null;
    if (![s.density, s.yield, s.factor, s.cost].every(v => finite(v) && v > 0))
        return null;
    const inputs: Solar = { area: z.estimated_usable_area, density: s.density!, yield: s.yield!, factor: s.factor!, cost: s.cost! };
    try {
        const result = solar(inputs), multiplier = z.site_type === 'Parking' ? 1.35 : 1;
        return { ...result, cost: result.cost * multiplier, inputs, status: `${s.status} solar inputs; ${z.site_verified ? 'site marked verified; solar provenance remains separate' : 'site NOT verified'}`, assumptions: `${inputs.area} m² × ${inputs.density} kWp/m²; ${inputs.yield} kWh/kWp/year × ${inputs.factor}; RM${inputs.cost}/kWp${multiplier > 1 ? ' × 1.35 carport structure allowance' : ''}. Source: ${s.source}. Installation suitability: ${z.site_input_status}.`, verification: solarVerification };
    }
    catch {
        return null;
    }
}
export type Candidate = {
    id: string;
    zone: string;
    name: string;
    cost: number;
    score: number;
    components: Objectives;
    scoring: string;
    reason: string;
    inputs: string;
    verification: string;
    benefit: string;
    eligible: boolean;
    group?: string;
    green: number;
    generation: number;
    capacity: number;
    preliminary?: boolean;
    solar?: SolarScreening;
    evidence: string;
};
function make(c: Omit<Candidate, 'score'>, w: Objectives): Candidate { return { ...c, cost: Math.ceil(c.cost * 100) / 100, score: planningScore(c.components, w) }; }
const vector = (c = 0, e = 0, b = 0): Objectives => ({ cooling: 100 * clamp01(c), energy: 100 * clamp01(e), biodiversity: 100 * clamp01(b) });
export function recommend(threshold: number, weights: Objectives = DEFAULT_OBJECTIVES, records: Zone[] = zones): Candidate[] {
    return records.flatMap(z => {
        const result: Candidate[] = [], h = validLST(z.lst_c) === null ? 0 : clamp01((z.lst_c! - 30) / 10), d = vegetationDeficit(z.ndvi) ?? 0, planting = clamp01(z.planting_area / 1500), roof = clamp01(z.estimated_usable_area / 500);
        const add = (name: string, cost: number, benefit: string, components: Objectives, scoring: string, reason: string, inputs: string, extra: Partial<Candidate> = {}) => { if (!finite(cost) || cost <= 0)
            return; result.push(make({ id: `${z.zone_id}-${name}`, zone: z.zone_id, name, cost, components, scoring, reason, inputs, benefit, eligible: true, green: 0, generation: 0, capacity: 0, verification: 'Verify ownership, dimensions, utilities and site suitability.', evidence: `Environment: ${z.data_status}; site inputs: ${z.site_input_status}; indicators: calculated heuristics; costs: assumed.`, ...extra }, weights)); };
        if (hasEnvironment(z) && finite(threshold) && z.lst_c! >= threshold && z.ndvi! < .4 && finite(z.planting_area) && z.planting_area > 0 && !['Water', 'Waterbody'].includes(z.landcover))
            add('Shade trees', z.planting_area * 18, 'Urban cooling', vector(.45 * h + .35 * d + .2 * planting, 0, .6 * planting + .4 * d), 'Cooling = 45% heat + 35% deficit + 20% planting area/1500. Biodiversity = 60% planting area/1500 + 40% deficit. Factors clamped to 0–1.', 'Heat, vegetation deficit and explicit planting space support assessment.', `LST ${z.lst_c}°C ≥ ${threshold.toFixed(1)}°C; NDVI ${z.ndvi} < 0.4; ${z.planting_area} m² planting.`, { green: z.planting_area });
        const pv = screenSolar(z);
        if (pv) {
            const carport = z.site_type === 'Parking';
            add(carport ? 'Solar carports' : 'Rooftop solar', pv.cost, 'Clean energy', vector(carport && z.shade_deficit ? .65 : 0, .75 * clamp01(pv.generation / 100000) + .25 * clamp01(pv.inputs.yield * pv.inputs.factor / 1500)), 'Energy = 75% generation/100000 kWh + 25% adjusted yield/1500. Carport cooling = 65 if shade deficit is explicitly true. No LST input.', 'Usable area, positive solar-resource assumptions and explicit suitability support screening.', pv.assumptions, { group: carport ? undefined : `${z.zone_id}-roof`, solar: pv, capacity: pv.capacity, generation: pv.generation, verification: pv.verification });
        }
        if (z.site_type === 'Roof' && z.roof_exposure && hasEnvironment(z) && finite(z.estimated_usable_area) && z.estimated_usable_area > 0)
            add('Cool roofs', z.estimated_usable_area * 65, 'Urban cooling', vector(.65 * h + .35 * roof), 'Cooling = 65% heat + 35% exposed usable roof area/500. No assumed energy or biodiversity benefit.', 'An exposed roof may suit reflective treatment.', `${z.estimated_usable_area} m²; explicit exposure; LST ${z.lst_c}°C.`, { group: `${z.zone_id}-roof` });
        const n = validNDVI(z.ndvi);
        if (z.data_coverage !== 0 && n !== null && n > .7)
            add('Biodiversity conservation', 15000, 'Biodiversity', vector(0, 0, .7 * clamp01(n) + .3 * clamp01(z.area_ha / 30)), 'Biodiversity = 70% NDVI + 30% zone area/30 ha. NDVI is not a habitat survey.', 'High vegetation index triggers a preliminary conservation assessment.', `NDVI ${n} > 0.70; area ${z.area_ha} ha.`, { preliminary: true, verification: 'Survey species, habitat quality, mature trees and ecological constraints.' });
        return result;
    });
}
/** Exact subset search: conservative integer cents and hundredths of objective points. */
export function optimise(candidates: Candidate[], budget: number, excluded: string[] = []) {
    if (!finite(budget) || budget < 0 || budget > 1e12)
        throw new Error('Budget must be finite and within 0–1 trillion RM.');
    if (new Set(candidates.map(c => c.id)).size !== candidates.length)
        throw new Error('Candidate IDs must be unique.');
    const eligible = candidates.filter(c => c.eligible && !excluded.includes(c.id) && finite(c.cost) && c.cost >= 0 && c.cost <= 1e12 && finite(c.score) && c.score > 0 && c.score <= 100);
    if (eligible.length > 22)
        throw new Error('Exact demo optimiser supports at most 22 eligible candidates.');
    const limit = Math.floor(budget * 100 + 1e-6);
    let best: Candidate[] = [], bestCost = 0, bestScore = 0;
    function visit(i: number, chosen: Candidate[], cost: number, score: number, groups: Set<string>) {
        if (cost > limit)
            return;
        if (i === eligible.length) {
            if (score > bestScore || (score === bestScore && cost < bestCost)) {
                best = [...chosen];
                bestCost = cost;
                bestScore = score;
            }
            return;
        }
        visit(i + 1, chosen, cost, score, groups);
        const c = eligible[i];
        if (!c.group || !groups.has(c.group)) {
            const next = new Set(groups);
            if (c.group)
                next.add(c.group);
            visit(i + 1, [...chosen, c], cost + Math.ceil(c.cost * 100 - 1e-6), score + Math.round(c.score * 100), next);
        }
    }
    visit(0, [], 0, 0, new Set());
    return { selected: best, cost: bestCost / 100, score: bestScore / 100, remaining: Math.round((budget - bestCost / 100) * 100) / 100 };
}
export type Scenario = {
    name: string;
    area: number;
    land: number[];
    roof: number;
    budget: number;
    options: boolean[];
    carportArea?: number;
};
export const optionNames = ['Tree planting & green corridors', 'Rooftop solar readiness', 'Solar carports', 'Cool-roof treatments', 'Public shade structures', 'Rain gardens'];
export function validateScenario(s: Scenario): string[] {
    const errors: string[] = [];
    if (inRange(s.area, .01, 10000) === null)
        errors.push('Land area must be 0.01–10,000 ha.');
    if (s.land.length !== 5 || s.land.some(x => inRange(x, 0, 100) === null) || Math.abs(s.land.reduce((a, b) => a + b, 0) - 100) > 1e-6)
        errors.push('Land-use percentages must be finite, 0–100, and total 100%.');
    if (inRange(s.roof, 0, s.area * 10000) === null)
        errors.push('Roof area cannot exceed total site area.');
    if (inRange(s.carportArea ?? 150, 0, s.area * 10000) === null)
        errors.push('Carport area cannot exceed total site area.');
    if (inRange(s.budget, 0, 1e12) === null)
        errors.push('Budget must be finite and non-negative.');
    if (s.options.length !== 6 || s.options.some(v => typeof v !== 'boolean'))
        errors.push('Six boolean options are required.');
    return errors;
}
export const SCENARIO_ASSUMPTIONS = 'Whole-programme choices; no partial quantities. Trees/corridors RM18/m² of allocated green space; cool roofs RM65/m²; shade RM25,000; rain gardens RM18,000. PV 0.16 kWp/m² × 1,300 kWh/kWp/year × 0.85; RM3,200/kWp. Carports use editable parking area (default 150 m²) and a 1.35 structural multiplier. Roof PV and cool roofs compete for the same whole-roof area in the optimised plan. Land allocations never change. Site/resource inputs are unverified assumptions.';
export function scenarioCandidates(s: Scenario, w: Objectives = DEFAULT_OBJECTIVES): Candidate[] {
    if (validateScenario(s).length)
        return [];
    const green = s.area * s.land[2] * 100, space = clamp01(green / 10000), deficit = 1 - clamp01(s.land[2] / 40), roof = clamp01(s.roof / 2000), shade = clamp01(s.area / 100);
    const pv = solar({ area: s.roof, density: .16, yield: 1300, factor: .85, cost: 3200 }), carport = solar({ area: s.carportArea ?? 150, density: .16, yield: 1300, factor: .85, cost: 3200 });
    const vectors = [vector(.5 * deficit + .5 * space, 0, .7 * space + .3 * deficit), vector(0, .75 * clamp01(pv.generation / 100000) + .25 * (1105 / 1500)), vector(.65, .75 * clamp01(carport.generation / 100000) + .25 * (1105 / 1500)), vector(.65 + .35 * roof), vector(.6 * deficit + .4 * shade), vector(.2 * space, 0, .6 * space + .4 * deficit)];
    const formulas = ['Cooling 50% green deficit + 50% green area factor; biodiversity 70% area + 30% deficit.', 'Energy 75% generation factor + 25% adjusted yield factor.', 'Energy 75% generation factor + 25% adjusted yield factor; cooling 65 assumes shade need.', 'Cooling 65% assumed exposure + 35% roof area factor.', 'Cooling 60% green deficit + 40% site area factor.', 'Cooling 20% green area; biodiversity 60% green area + 40% deficit. Drainage benefits not scored.'];
    const costs = [green * 18, pv.cost, carport.cost * 1.35, s.roof * 65, 25000, 18000], eligible = [green > 0, s.roof >= 150, (s.carportArea ?? 150) >= 150, s.roof > 0, s.land[3] + s.land[4] > 0, green >= 100];
    return optionNames.map((name, i) => make({ id: `future-${i}`, zone: s.name, name, cost: costs[i], components: vectors[i], scoring: formulas[i], reason: 'Enabled conceptual programme; suitability requires verification.', inputs: SCENARIO_ASSUMPTIONS, verification: i === 1 || i === 2 ? solarVerification : 'Verify area, ownership, site conditions, design and quantities.', benefit: i === 1 || i === 2 ? 'Clean energy' : i === 5 ? 'Biodiversity' : 'Urban cooling', eligible: eligible[i] && s.options[i], group: i === 1 || i === 3 ? 'future-whole-roof' : undefined, green: i === 0 ? green : 0, generation: i === 1 ? pv.generation : i === 2 ? carport.generation : 0, capacity: i === 1 ? pv.capacity : i === 2 ? carport.capacity : 0, evidence: 'Calculated from unverified scenario assumptions.' }, w));
}
export function scenarioMetrics(s: Scenario, w: Objectives = DEFAULT_OBJECTIVES) {
    const errors = validateScenario(s), active = scenarioCandidates(s, w).filter(c => c.eligible);
    return { valid: !errors.length, errors, green: errors.length ? 0 : s.area * s.land[2] / 100, greenIntervention: active.reduce((n, c) => n + c.green, 0), capacity: active.reduce((n, c) => n + c.capacity, 0), generation: active.reduce((n, c) => n + c.generation, 0), cost: Math.round(active.reduce((n, c) => n + c.cost, 0) * 100) / 100, shade: active.filter(c => ['future-0', 'future-2', 'future-4'].includes(c.id)).length, score: Math.round(active.reduce((n, c) => n + c.score, 0) * 100) / 100, count: active.length };
}
export function optimiseScenario(s: Scenario, w: Objectives = DEFAULT_OBJECTIVES) {
    const errors = validateScenario(s), candidates = scenarioCandidates(s, w);
    if (errors.length)
        return { valid: false as const, errors, candidates, scenario: null, metrics: null, plan: null };
    const plan = optimise(candidates, s.budget), scenario = { ...s, land: [...s.land], options: optionNames.map((_, i) => plan.selected.some(c => c.id === `future-${i}`)) };
    return { valid: true as const, errors, candidates, scenario, metrics: scenarioMetrics(scenario, w), plan };
}
