import {datasetProvenance,observationPeriod,firstQualityZone} from '../data/provenance.ts';
import {geographicBounds,polygonStyle,candidateStage,resolveBasemap} from '../data/mapModel.ts';
import { emptyAssessment, screenAssessment, type SiteAssessment } from '../data/siteAssessment.ts';
import { chartRecords, temperatureAxis, temperatureTickText, temperatureText, ndviText, coverageText, warningGroups, shortZone } from '../data/presentation.ts';
import { preliminaryOpportunities } from './opportunities.ts';
import { importStudyArea, selectDataset, DEMO_DATASET, MAX_IMPORT_BYTES } from '../data/dataset.ts';
import { planningResult } from './planning.ts';
import { environmentalQuality, coverageThreshold } from '../data/validation.ts';
import { prepareRealGIS } from '../data/gis.ts';
import assert from 'node:assert/strict';
import { buildPlanningSummary } from './summary.ts';
import { recommend, optimise, solar, screenSolar, scenarioMetrics, optimiseScenario, validateScenario, planningScore, normaliseObjectives, priority, hasEnvironment, DEFAULT_OBJECTIVES, type Candidate, type Scenario } from './planning.ts';
import { zones, demoGeoJSON, demoDataset } from '../data/zones.ts';
import { loadGeoJSON, parseGeoJSON, type Zone } from '../data/loader.ts';
import { validNDVI, vegetationDeficit, weightedMean } from '../data/validation.ts';
let passed = 0;
function test(name: string, run: () => void) { run(); passed++; console.log(`PASS ${name}`); }
const candidate = (id: string, cost: number, score: number, group?: string): Candidate => ({ id, cost, score, group, zone: 'Z001', name: id, reason: 'test', inputs: 'test', verification: 'test', benefit: 'test', eligible: true, green: 0, generation: 0, capacity: 0, components: { cooling: score, energy: 0, biodiversity: 0 }, scoring: 'fixture', evidence: 'test' });
const fixture = [candidate('a', 6, 11), candidate('b', 5, 9), candidate('c', 5, 9)];
const cooling = { cooling: 10, energy: 0, biodiversity: 0 }, energy = { cooling: 0, energy: 10, biodiversity: 0 }, bio = { cooling: 0, energy: 0, biodiversity: 10 };
const scenario: Scenario = { name: 'Test site', area: 100, land: [40, 15, 25, 15, 5], roof: 2000, budget: 200000, carportArea: 200, options: [true, true, true, true, true, true] };
test('exact optimum defeats greedy score and ratio', () => assert.deepEqual(optimise(fixture, 10).selected.map(c => c.id), ['b', 'c']));
test('empty, zero budget and exclusions', () => { assert.equal(optimise([], 100).cost, 0); assert.equal(optimise(fixture, 0).selected.length, 0); assert.deepEqual(optimise(fixture, 10, ['b']).selected.map(c => c.id), ['a']); });
test('eligibility, mutually exclusive groups, tie-break', () => { assert.equal(optimise([{ ...fixture[0], eligible: false }], 100).selected.length, 0); assert.equal(optimise([candidate('pv', 5, 10, 'roof'), candidate('cool', 5, 9, 'roof'), candidate('trees', 5, 8)], 15).score, 18); assert.equal(optimise([candidate('expensive', 10, 10), candidate('cheap', 5, 10)], 10).cost, 5); });
test('invalid solver inputs cannot inflate the plan', () => { for (const b of [-1, NaN, Infinity])
    assert.throws(() => optimise(fixture, b)); assert.throws(() => optimise([fixture[0], fixture[0]], 100)); assert.equal(optimise([candidate('bad', -5, 90), candidate('nan', 1, NaN), candidate('inf', Infinity, 10)], 10).cost, 0); assert.throws(() => optimise(Array.from({ length: 23 }, (_, i) => candidate(String(i), 1, 1)), 23)); });
test('fractional costs never exceed budget', () => { const p = optimise([candidate('a', .1, 10), candidate('b', .2, 10)], .3); assert.equal(p.cost, .3); assert.equal(p.remaining, 0); assert.equal(optimise([candidate('a', .301, 10)], .3).selected.length, 0); });
test('exact solver agrees with independent bitmask oracle', () => {
    const cs = Array.from({ length: 8 }, (_, i) => candidate(String(i), i % 3 + 2, (i * 7) % 13 + 1, i === 1 || i === 5 ? 'roof' : undefined));
    for (const budget of [3, 8, 13, 21]) {
        let bestScore = 0, bestCost = 0;
        for (let mask = 0; mask < 1 << cs.length; mask++) {
            const chosen = cs.filter((_, i) => mask & (1 << i));
            const groups = chosen.flatMap(c => c.group ? [c.group] : []);
            if (groups.length !== new Set(groups).size)
                continue;
            const cost = chosen.reduce((n, c) => n + c.cost, 0), score = chosen.reduce((n, c) => n + c.score, 0);
            if (cost <= budget && (score > bestScore || (score === bestScore && cost < bestCost))) {
                bestScore = score;
                bestCost = cost;
            }
        }
        assert.equal(optimise(cs, budget).score, bestScore);
        assert.equal(optimise(cs, budget).cost, bestCost);
    }
});
test('objective weights normalise and scores remain 0–100', () => { assert.deepEqual(normaliseObjectives({ cooling: 0, energy: 0, biodiversity: 0 }), { cooling: 0, energy: 0, biodiversity: 0 }); assert.equal(planningScore({ cooling: 100, energy: 0, biodiversity: 0 }, cooling), 100); assert.equal(planningScore({ cooling: 100, energy: 0, biodiversity: 0 }, energy), 0); assert.equal(planningScore({ cooling: NaN, energy: Infinity, biodiversity: -10 }), 0); assert.equal(planningScore({ cooling: 100, energy: 100, biodiversity: 100 }, { cooling: Number.MAX_VALUE, energy: Number.MAX_VALUE, biodiversity: 0 }), 100); });
test('different intervention scores in same zone', () => { const cs = recommend(36.5); const roof = cs.filter(c => c.zone === 'Z004'); assert.equal(roof.length, 2); assert.notEqual(roof[0].score, roof[1].score); assert.ok(cs.every(c => Number.isFinite(c.score) && c.score >= 0 && c.score <= 100)); });
test('existing optimiser changes with objectives', () => { const c = optimise(recommend(36.5, cooling), 200000), e = optimise(recommend(36.5, energy), 200000), b = optimise(recommend(36.5, bio), 200000); assert.ok(c.selected.every(x => x.components.cooling > 0)); assert.ok(e.selected.some(x => x.generation > 0)); assert.ok(b.selected.some(x => x.name === 'Biodiversity conservation')); assert.notDeepEqual(c.selected.map(x => x.id), e.selected.map(x => x.id)); assert.equal(optimise(recommend(36.5, { cooling: 0, energy: 0, biodiversity: 0 }), 1e6).selected.length, 0); });
test('threshold, selection and budget workflows remain', () => { assert.ok(recommend(36.5).some(c => c.zone === 'Z001' && c.name === 'Shade trees')); assert.ok(!recommend(45).some(c => c.name === 'Shade trees')); assert.ok(recommend(45).some(c => c.name === 'Rooftop solar')); for (const budget of [0, 50000, 100000, 250000]) {
    const p = optimise(recommend(36.5), budget);
    assert.ok(p.cost <= budget);
    const groups = p.selected.flatMap(c => c.group ? [c.group] : []);
    assert.equal(groups.length, new Set(groups).size);
} assert.ok(optimise(recommend(36.5), 100000).score >= optimise(recommend(36.5), 50000).score); });
test('solar dimensions and invalid numbers', () => { assert.deepEqual(solar({ area: 200, density: .16, yield: 1300, factor: .85, cost: 3200 }), { capacity: 32, generation: 35360, cost: 102400 }); for (const v of [-1, NaN, Infinity])
    assert.throws(() => solar({ area: v, density: .16, yield: 1300, factor: .85, cost: 3200 })); assert.throws(() => solar({ area: 200, density: .16, yield: 1300, factor: 1.1, cost: 3200 })); });
test('solar independent of heat and requires resource + suitability', () => { const roof = zones[1]; const hot = screenSolar({ ...roof, lst_c: 80 }), missing = screenSolar({ ...roof, lst_c: null, ndvi: null }); assert.deepEqual(hot, missing); assert.ok(missing); assert.equal(screenSolar({ ...roof, solar_inputs: { ...roof.solar_inputs, suitable: false } }), null); assert.equal(screenSolar({ ...roof, solar_inputs: { ...roof.solar_inputs, suitable: null } }), null); assert.equal(screenSolar({ ...roof, solar_inputs: { ...roof.solar_inputs, yield: null } }), null); assert.equal(screenSolar({ ...roof, solar_inputs: { ...roof.solar_inputs, status: 'unknown' } }), null); assert.equal(screenSolar({ ...roof, estimated_usable_area: 149 }), null); assert.equal(screenSolar({ ...roof, site_type: 'Park' }), null); const p = screenSolar(zones[4])!; assert.equal(p.cost, solar(p.inputs).cost * 1.35); });
test('NDVI physical range and priority handling', () => { assert.equal(validNDVI(-1), -1); assert.equal(vegetationDeficit(-1), 1); assert.equal(vegetationDeficit(1), 0); for (const n of [NaN, Infinity, 1.1, -1.1]) {
    assert.equal(validNDVI(n), null);
    assert.equal(priority({ ...zones[0], ndvi: n }), 0);
} assert.equal(hasEnvironment({ ...zones[0], lst_c: null }), false); assert.equal(priority({ ...zones[0], ndvi: -1 }), 90); assert.equal(recommend(36.5, DEFAULT_OBJECTIVES, [{ ...zones[0], ndvi: null }]).length, 0); assert.ok(recommend(36.5, energy, [{ ...zones[1], lst_c: null, ndvi: null }]).some(c => c.name === 'Rooftop solar')); });
test('missing values excluded from weighted means', () => { assert.equal(weightedMean([{ value: null, weight: 10 }, { value: .5, weight: 2 }]), .5); assert.equal(weightedMean([{ value: NaN, weight: 1 }]), null); assert.equal(weightedMean([]), null); });
test('central demo loaded through adapter', () => { assert.equal(zones.length, 8); assert.equal(demoDataset.issues.length, 0); assert.ok(zones.every(z => z.data_status === 'synthetic' && z.observation_date === null)); });
test('GeoJSON missing data preserved, no fabricated observations', () => { const raw = structuredClone(demoGeoJSON) as any; raw.features[0].properties.ndvi = 2; raw.features[0].properties.lst_c = null; raw.features[0].properties.data_status = 'observed'; raw.features[0].properties.observation_date = '2026-02-30'; const loaded = loadGeoJSON(raw); assert.equal(loaded.zones[0].ndvi, null); assert.equal(loaded.zones[0].lst_c, null); assert.equal(loaded.zones[0].data_status, 'unknown'); assert.ok(loaded.issues.length > 0); raw.features[0].properties.observation_date = '2026-02-28'; raw.features[0].properties.data_source = 'Fixture observation source'; assert.equal(loadGeoJSON(raw).zones[0].data_status, 'observed'); });
test('GeoJSON validity, duplicates and MultiPolygon', () => { assert.equal(parseGeoJSON('{bad').zones.length, 0); assert.equal(loadGeoJSON({}).zones.length, 0); const raw = structuredClone(demoGeoJSON) as any; raw.features.push(structuredClone(raw.features[0])); assert.equal(loadGeoJSON(raw).zones.length, 8); raw.features[0].geometry.coordinates[0][0][0] = 999; assert.equal(loadGeoJSON(raw).zones.length, 8); const f = structuredClone(demoGeoJSON.features[1]) as any; f.geometry = { type: 'MultiPolygon', coordinates: [f.geometry.coordinates] }; assert.equal(loadGeoJSON({ type: 'FeatureCollection', features: [f] }).zones[0].geometry.type, 'MultiPolygon'); });
test('zero coverage prevents environmental inference', () => { const raw = structuredClone(demoGeoJSON) as any; raw.features[0].properties.data_coverage = 0; const z = loadGeoJSON(raw).zones[0]; assert.equal(z.ndvi, null); assert.equal(z.lst_c, null); assert.equal(recommend(36.5, DEFAULT_OBJECTIVES, [z]).length, 0); });
test('future optimisation feasible and original remains unchanged', () => { const original = JSON.stringify(scenario); const r = optimiseScenario(scenario); assert.ok(r.valid); assert.ok(r.plan.cost <= scenario.budget); assert.ok(r.plan.selected.length > 0); assert.equal(JSON.stringify(scenario), original); assert.deepEqual(r.scenario.land, scenario.land); assert.ok(!(r.scenario.options[1] && r.scenario.options[3])); assert.equal(r.metrics.cost, r.plan.cost); });
test('future objectives, zero budget, disabled options and invalid allocations', () => { const c = optimiseScenario(scenario, cooling), e = optimiseScenario(scenario, energy); assert.ok(c.valid && e.valid); assert.notDeepEqual(c.scenario.options, e.scenario.options); assert.equal(optimiseScenario({ ...scenario, budget: 0 }).plan?.cost, 0); assert.equal(optimiseScenario({ ...scenario, options: [false, false, false, false, false, false] }).plan?.selected.length, 0); assert.equal(optimiseScenario({ ...scenario, land: [1, 2, 3, 4, 5] }).valid, false); assert.ok(validateScenario({ ...scenario, roof: Infinity }).length); assert.equal(scenarioMetrics({ ...scenario, area: NaN }).valid, false); });
test('future solar capacity and cost use parking area', () => { const s = { ...scenario, options: [false, false, true, false, false, false] }; const m = scenarioMetrics(s); assert.equal(m.capacity, 32); assert.equal(m.generation, 35360); assert.equal(m.cost, 138240); });
test('export-ready data contain finite scores and nullable missing observations', () => { const payload = { zones, objectives: DEFAULT_OBJECTIVES, plan: optimise(recommend(36.5), 100000), future: optimiseScenario(scenario) }; const copy = JSON.parse(JSON.stringify(payload)); assert.equal(copy.zones[0].observation_date, null); assert.ok(copy.plan.cost <= 100000); assert.ok(copy.future.plan.cost <= scenario.budget); });
test('actual JSON export includes objectives, original and optimised scenarios', () => {
    const input = { budget: 100000, excluded: [], threshold: 36.5, objectives: energy, scenarios: [scenario, { ...scenario, land: [0, 0, 0, 0, 0] }], solarInputs: { area: 200, density: .16, yield: 1300, factor: .85, cost: 3200 } };
    const result = JSON.parse(JSON.stringify(buildPlanningSummary(input, '2026-10-16T00:00:00Z')));
    assert.equal(result.schema_version, 3);
    assert.equal(result.objectives.normalised.energy, 1);
    assert.ok(result.existing_township.cost <= 100000);
    assert.ok(result.future_scenarios[0].budget_constrained.plan.cost <= scenario.budget);
    assert.equal(result.future_scenarios[1].metrics, null);
    assert.equal(result.future_scenarios[1].budget_constrained.plan, null);
    assert.equal(result.solar_calculator.generation, 35360);
    assert.ok(result.existing_township.candidates.every((c: Candidate) => c.evidence && c.scoring));
});

test('coverage boundary and missing values fail closed', () => {
    for (const coverage of [null, undefined, NaN, Infinity, -1, 0, 79.99, 101]) {
        const z = { ...zones[0], data_coverage: coverage } as Zone;
        assert.equal(environmentalQuality(z).usable, false);
        assert.equal(environmentalQuality(z).label, 'Insufficient Data');
        assert.equal(hasEnvironment(z), false); assert.equal(priority(z), 0);
        assert.equal(recommend(30, DEFAULT_OBJECTIVES, [z]).length, 0);
    }
    assert.equal(hasEnvironment({ ...zones[0], data_coverage: 80 }), true);
    assert.equal(hasEnvironment({ ...zones[0], data_coverage: 79 }, 75), true);
    assert.equal(hasEnvironment({ ...zones[0], data_coverage: 0 }, 0), false);
    assert.equal(coverageThreshold(NaN), 80);
});
test('all environmental recommendations share coverage and both valid observations', () => {
    for (const z of zones) for (const patch of [{ data_coverage: null }, { data_coverage: 79 }, { ndvi: null }, { lst_c: null }]) {
        const record = { ...z, ...patch };
        const cs = recommend(30, DEFAULT_OBJECTIVES, [record]);
        assert.ok(cs.every(c => !!c.solar));
        assert.equal(priority(record), 0);
    }
    const z = { ...zones[0], data_coverage: 75 };
    assert.ok(recommend(30, DEFAULT_OBJECTIVES, [z], 70).some(c => c.name === 'Shade trees'));
    assert.equal(recommend(30, DEFAULT_OBJECTIVES, [z], 80).length, 0);
});
test('original roof conflict withholds metrics and optimiser resolves without mutation', () => {
    const before = JSON.stringify(scenario), m = scenarioMetrics(scenario);
    assert.equal(m.valid, false); assert.ok(m.errors.some(e => e.includes('whole-roof')));
    assert.equal(m.count, 0); assert.equal(m.generation, 0); assert.equal(m.cost, 0);
    const result = optimiseScenario(scenario); assert.ok(result.valid && result.metrics.valid);
    assert.ok(!(result.scenario.options[1] && result.scenario.options[3]));
    assert.equal(JSON.stringify(scenario), before);
    assert.equal(scenarioMetrics({ ...scenario, options: [false, true, false, false, false, false] }).valid, true);
});
test('export carries quality policy and no conflicting original totals', () => {
    const output = buildPlanningSummary({ budget: 100000, threshold: 30, minimumCoverage: 95, excluded: [], objectives: energy, scenarios: [scenario], solarInputs: { area: 200, density: .16, yield: 1300, factor: .85, cost: 3200 } });
    assert.equal(output.environmental_quality.minimum_coverage_percent, 95);
    assert.equal(output.future_scenarios[0].metrics, null);
    assert.equal(output.future_scenarios[0].valid, false);
    assert.ok(output.future_scenarios[0].budget_constrained.metrics?.valid);
});
test('optional GIS excludes demo and retains observation provenance and quality', () => {
    assert.equal(prepareRealGIS(demoGeoJSON).collection.features.length, 0);
    const raw = structuredClone(demoGeoJSON) as any;
    raw.features[0].properties = { ...raw.features[0].properties, data_status: 'observed', observation_date: '2026-01-01', data_source: 'TEST FIXTURE ONLY', data_coverage: 79 };
    const gis = prepareRealGIS(raw);
    assert.equal(gis.collection.features.length, 1);
    const f = gis.collection.features[0]; assert.equal(f.properties.observation_date, '2026-01-01');
    assert.equal(f.properties.quality.label, 'Insufficient Data');
    assert.deepEqual(f.geometry, raw.features[0].geometry);
    assert.equal(prepareRealGIS(raw, 70).collection.features[0].properties.quality.usable, true);
    raw.features[0].properties.observation_date = null;
    assert.equal(prepareRealGIS(raw).collection.features.length, 0);
});

// Artificial fixtures only; never shipped as authentic Malaysian observations.
const importedFixture = () => {
    const raw = structuredClone(demoGeoJSON) as any;
    raw.features = raw.features.slice(0, 2);
    raw.features.forEach((f: any, i: number) => { f.properties = { ...f.properties, zone_id: 'TEST-ONLY-' + i, zone_name: 'ARTIFICIAL TEST FIXTURE ' + i, observation_date: '2026-01-01', data_source: 'ARTIFICIAL UNIT TEST - NOT SATELLITE DATA' }; delete f.properties.data_status; });
    return raw;
};
test('import validates date/source and explicit provenance without inventing observations', () => {
    const raw = importedFixture();
    let d = importStudyArea(JSON.stringify(raw), 'test-only.geojson');
    assert.equal(d.zones.length, 2); assert.equal(d.mode, 'real');
    assert.equal(d.zones[0].data_status, 'observed');
    assert.deepEqual(d.zones[0].geometry, raw.features[0].geometry);
    raw.features[0].properties.observation_date = '2026-02-30';
    d = importStudyArea(JSON.stringify(raw), 'test-only.geojson'); assert.equal(d.zones.length, 2); assert.equal(hasEnvironment(d.zones[0]),false);
    raw.features[1].properties.data_status = 'synthetic';
    assert.equal(importStudyArea(JSON.stringify(raw), 'test.geojson').zones.length,1); raw.features[0].properties.data_status='synthetic'; assert.throws(()=>importStudyArea(JSON.stringify(raw),'test'),/No usable observed/);
});
test('import rejects malformed, oversized and empty datasets', () => {
    for (const text of ['{bad', '{}', '{"type":"FeatureCollection","features":[]}']) assert.throws(() => importStudyArea(text, 'test'));
    assert.throws(() => importStudyArea(' '.repeat(MAX_IMPORT_BYTES + 1), 'huge'), /5 MB/);
    const raw = importedFixture(); raw.features = Array.from({length:501}, () => raw.features[0]);
    assert.throws(() => importStudyArea(JSON.stringify(raw), 'many'), /500/);
});
test('import flags invalid observations and never borrows demo solar suitability', () => {
    const raw = importedFixture(); raw.features[0].properties.data_coverage = 79;
    raw.features[1].properties.ndvi = 4; delete raw.features[1].properties.solar_inputs;
    const d = importStudyArea(JSON.stringify(raw), 'quality');
    assert.equal(d.zones.length, 2); assert.ok(d.issues.length);
    assert.equal(recommend(30, energy, d.zones).length, 0);
    assert.equal(d.zones[1].ndvi, null); assert.equal(screenSolar(d.zones[1]), null);
});
test('selected real dataset and empty real mode never fall back to demo zones', () => {
    const empty = selectDataset('real', null); assert.equal(empty.zones.length, 0);
    const d = importStudyArea(JSON.stringify(importedFixture()), 'test.geojson');
    assert.equal(selectDataset('real', d), d); assert.equal(selectDataset('demo', d), DEMO_DATASET);
    const input = { budget:100000, threshold:30, excluded:[], objectives:DEFAULT_OBJECTIVES, scenarios:[scenario], solarInputs:{area:200,density:.16,yield:1300,factor:.85,cost:3200} };
    for (const dataset of [empty, d]) {
        const result = buildPlanningSummary({...input,dataset});
        assert.deepEqual(result.zones.map(z=>z.zone_id), dataset.zones.map(z=>z.zone_id));
        assert.ok(result.existing_township.candidates.every(c=>dataset.zones.some(z=>z.zone_id===c.zone)));
        assert.equal(result.data_source.mode, 'real');
        assert.equal(result.environmental_quality.zones.length,dataset.zones.length);
    }
    assert.equal(buildPlanningSummary({...input,dataset:empty}).existing_township.candidates.length,0);
});
test('large imported candidate sets fail explicitly and exclusions restore exact optimisation', () => {
    const cs = Array.from({length:23},(_,i)=>candidate(String(i),1,1));
    const blocked = planningResult(cs,100); assert.match(blocked.error!, /22/); assert.equal(blocked.selected.length,0);
    const allowed = planningResult(cs,100,['22']); assert.equal(allowed.error,null); assert.equal(allowed.selected.length,22);
});

test('chart values exclude invalid observations and preserve full precision',()=>{
    const z={...zones[0],lst_c:37.123456,ndvi:.123456};
    const rows=chartRecords([z,{...z,zone_id:'bad',lst_c:NaN},{...z,zone_id:'null',ndvi:null},{...z,zone_id:'low',data_coverage:79}]);
    assert.equal(rows.length,1);assert.equal(rows[0].lst_c,37.123456);assert.equal(rows[0].ndvi,.123456);
    assert.equal(temperatureText(z.lst_c),'37.1');assert.equal(ndviText(z.ndvi),'0.12');assert.equal(coverageText(99.999),'100.0%');
    assert.equal(temperatureText(null),'Insufficient Data');assert.equal(coverageText(101),'Insufficient Data');
    assert.ok(shortZone('A'.repeat(100)).length<20);
});
test('temperature ticks are finite unique readable and span observations',()=>{
    for(const values of [[37.123,37.124],[36,36],[-10,45],[20,21,22,23],[-100,100],[],[null,NaN,Infinity]]){
        const axis=temperatureAxis(values);assert.ok(axis.ticks.length<=7);
        assert.equal(new Set(axis.ticks.map(temperatureTickText)).size,axis.ticks.length);
        assert.ok(axis.ticks.every(Number.isFinite));
        for(const value of values)if(typeof value==='number'&&Number.isFinite(value)){assert.ok(axis.domain[0]<=value);assert.ok(axis.domain[1]>=value);}
    }
});
test('warnings group zones once per category and keep environmental usability',()=>{
    const raw=importedFixture();delete raw.features[0].properties.solar_inputs;
    raw.features[1].properties.data_coverage=60;
    const d=importStudyArea(JSON.stringify(raw),'warnings'),g=warningGroups(d.zones);
    assert.equal(g.length,4);assert.equal(g[0].details.length,0);assert.equal(g[1].details.length,1);
    assert.equal(g[2].details.length,1);assert.equal(g[3].details.length,2);
    assert.equal(chartRecords(d.zones).length,1);assert.equal(screenSolar(d.zones[0]),null);
});
test('observed environmental opportunities do not become construction candidates',()=>{
    const z={...zones[0],data_status:'observed' as const,site_verified:false,site_input_status:'unknown' as const,planting_area:0};
    assert.ok(preliminaryOpportunities([z],36.5).length>0);assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[z]).length,0);
    assert.equal(preliminaryOpportunities([{...z,data_coverage:79}],36.5).length,0);
    assert.equal(preliminaryOpportunities([{...z,landcover:'Unknown'}],36.5).length,0);
    assert.equal(preliminaryOpportunities([{...z,landcover:'Waterbody'}],36.5).length,0);
    const ready={...z,site_verified:true,site_input_status:'observed' as const,planting_area:100};
    assert.ok(recommend(36.5,DEFAULT_OBJECTIVES,[ready]).some(c=>c.name==='Shade trees'));
    assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[{...ready,planting_area:0}]).length,0);
});
test('solar screening stays independent while observed construction requires verification',()=>{
    const roof={...zones[1],data_status:'observed' as const,site_verified:false,lst_c:null,ndvi:null};
    assert.ok(screenSolar(roof));assert.equal(recommend(36.5,energy,[roof]).length,0);
    assert.ok(recommend(36.5,energy,[{...roof,site_verified:true}]).some(c=>!!c.solar));
});
test('exports preserve raw precision and separate opportunities from budget',()=>{
    const d=importStudyArea(JSON.stringify(importedFixture()),'test');d.zones[0].lst_c=38.123456789;
    const result=buildPlanningSummary({dataset:d,budget:100000,threshold:36.5,excluded:[],objectives:DEFAULT_OBJECTIVES,scenarios:[scenario],solarInputs:{area:200,density:.16,yield:1300,factor:.85,cost:3200}});
    assert.equal(result.zones[0].lst_c,38.123456789);assert.ok(result.preliminary_opportunities.length);
    assert.ok(result.preliminary_opportunities.every(o=>!o.budgetEligible));assert.equal(result.existing_township.selected.length,0);
    assert.equal(result.grouped_validation.length,4);
});

const readyAssessment = (patch:Partial<SiteAssessment>={}):SiteAssessment => ({...emptyAssessment(),siteType:'Walkway',area:100,suitability:'potentially-suitable',costsAcknowledged:true,...patch});
test('incomplete and unsuitable assessment inputs cannot create budget candidates',()=>{
    const z={...zones[0],data_status:'observed' as const,site_verified:false,site_input_status:'unknown' as const,planting_area:0};
    for(const a of [emptyAssessment(),readyAssessment({area:null}),readyAssessment({area:NaN}),readyAssessment({area:-1}),readyAssessment({suitability:'unsuitable'}),readyAssessment({costsAcknowledged:false})]){
        assert.equal(screenAssessment(z,a).zone,null);assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[z],80,{[z.zone_id]:a}).length,0);
    }
});
test('assumed site inputs generate clearly labelled candidates without mutating observations',()=>{
    const z={...zones[0],data_status:'observed' as const,site_verified:false,planting_area:0};const original=JSON.stringify(z),a=readyAssessment();const before=JSON.stringify(a);
    const cs=recommend(36.5,DEFAULT_OBJECTIVES,[z],80,{[z.zone_id]:a});assert.equal(cs.length,1);
    assert.equal(cs[0].preliminary,true);assert.match(cs[0].evidence,/NOT VERIFIED/);assert.equal(cs[0].cost,1800);assert.equal(cs[0].green,100);
    assert.equal(JSON.stringify(z),original);assert.equal(JSON.stringify(a),before);assert.equal(screenAssessment(z,a).zone?.site_verified,false);
});
test('20-zone fixture keeps nine insufficient zones out of assessed recommendations',()=>{
    const records=Array.from({length:20},(_,i)=>({...zones[0],zone_id:'ARTIFICIAL-'+i,data_status:'observed' as const,site_verified:false,data_coverage:i<11?85:79}));
    const assessments=Object.fromEntries(records.map(z=>[z.zone_id,readyAssessment()]));
    assert.equal(chartRecords(records).length,11);assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,records,80,assessments).length,11);
    for(const z of records.slice(11))assert.equal(screenAssessment(z,assessments[z.zone_id]).zone,null);
});
test('assessed rooftop candidates use declared solar inputs and preserve budget exclusivity',()=>{
    const z={...zones[1],data_status:'observed' as const,site_verified:false};const a=readyAssessment({siteType:'Roof',area:200,roofExposed:true,solarEnabled:true,solar:{density:.16,annualYield:1300,factor:.85,unitCost:3200,source:'ARTIFICIAL TEST ASSUMPTIONS'}});
    const cs=recommend(36.5,DEFAULT_OBJECTIVES,[z],80,{[z.zone_id]:a});assert.equal(cs.length,2);assert.ok(cs.every(c=>c.preliminary));
    const result=optimise(cs,200000);assert.equal(result.selected.length,1);assert.ok(result.cost<=200000);assert.equal(optimise(cs,100).selected.length,0);
    assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[z],80,{[z.zone_id]:{...a,solar:{...a.solar,annualYield:null}}}).filter(c=>c.solar).length,0);
    const pv=cs.find(c=>c.solar)!;assert.equal(pv.generation,35360);
    assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[{...z,lst_c:32}],80,{[z.zone_id]:a}).find(c=>c.solar)?.generation,pv.generation);
});
test('original GeoJSON and assessment provenance are exported separately',()=>{
    const raw=importedFixture(),text=JSON.stringify(raw),d=importStudyArea(text,'test');const a=readyAssessment();
    const result=buildPlanningSummary({dataset:d,siteAssessments:{[d.zones[0].zone_id]:a},budget:5000,threshold:36.5,excluded:[],objectives:DEFAULT_OBJECTIVES,scenarios:[scenario],solarInputs:{area:200,density:.16,yield:1300,factor:.85,cost:3200}});
    assert.deepEqual(result.original_geojson,JSON.parse(text));assert.equal(result.zones[0].site_verified,false);
    assert.deepEqual(result.site_assessments[d.zones[0].zone_id],a);assert.equal(result.dataset_provenance.filename,'test');assert.ok(!('historical_study_context' in result));
    assert.ok(result.existing_township.selected.every(c=>c.preliminary));assert.equal(result.zones[0].planting_area,d.zones[0].planting_area);
});
test('clearing assessment restores imported screening, and another zone cannot borrow inputs',()=>{
    const z={...zones[0],data_status:'observed' as const,site_verified:false};const a=readyAssessment();
    assert.ok(recommend(36.5,DEFAULT_OBJECTIVES,[z],80,{[z.zone_id]:a}).length);
    assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[z],80,{}).length,0);
    assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,[{...z,zone_id:'OTHER'}],80,{[z.zone_id]:a}).length,0);
});

test('dynamic observation windows support recent historical and future files',()=>{
 for(const [start,end]of [['2026-01-01','2026-10-17'],['2024-01-01','2025-12-31'],['2031-01-01','2031-04-30']]){
  const raw=importedFixture();raw.features.forEach((f:any)=>{delete f.properties.observation_date;f.properties.observation_start=start;f.properties.observation_end=end;f.properties.landcover_source='ESA WorldCover';f.properties.landcover_year=2021;});
  const d=importStudyArea(JSON.stringify(raw),'variable-name.geojson'),p=datasetProvenance(d);
  assert.equal(p.filename,'variable-name.geojson');assert.equal(p.period,start+' – '+end);assert.equal(p.quality_pass,2);assert.match(p.landcover_references[0],/2021.*historical/);assert.deepEqual(d.originalGeoJSON,raw);
 }
});
test('missing and invalid provenance is unavailable and cannot yield reliable scores',()=>{
 const raw=importedFixture();raw.features.forEach((f:any)=>{delete f.properties.observation_date;delete f.properties.data_source;});
 const d=importStudyArea(JSON.stringify(raw),'missing.geojson'),p=datasetProvenance(d);
 assert.equal(d.zones.length,2);assert.equal(p.period,'Unavailable');assert.equal(p.sources_label,'Unavailable');assert.equal(p.quality_pass,0);assert.ok(d.zones.every(z=>priority(z)===0));assert.equal(recommend(36.5,DEFAULT_OBJECTIVES,d.zones).length,0);
 raw.features[0].properties.observation_start='2026-12-01';raw.features[0].properties.observation_end='2026-01-01';
 assert.equal(observationPeriod(importStudyArea(JSON.stringify(raw),'bad-period').zones[0]),'Unavailable');
});
test('mixed periods and sources remain per-zone declarations',()=>{
 const raw=importedFixture();raw.features[1].properties.observation_date='2025-03-04';raw.features[1].properties.data_source='SECOND ARTIFICIAL SOURCE';
 const p=datasetProvenance(importStudyArea(JSON.stringify(raw),'mixed'));
 assert.equal(p.period,'Mixed observation periods');assert.equal(p.sources_label,'Multiple declared sources');assert.equal(p.details[1].observation_date,'2025-03-04');assert.equal(p.declared_sources.length,2);
});
test('bounds preserve longitude latitude order and choose first quality-valid zone',()=>{
 const raw=importedFixture();raw.features[0].geometry={type:'Polygon',coordinates:[[[101,3],[102,3],[102,4],[101,4],[101,3]]]};raw.features[1].geometry={type:'MultiPolygon',coordinates:[[[[103,5],[104,5],[104,6],[103,6],[103,5]]]]};raw.features[0].properties.data_coverage=79;
 const d=importStudyArea(JSON.stringify(raw),'coords');assert.deepEqual(geographicBounds(d.zones),[[3,101],[6,104]]);assert.equal(firstQualityZone(d.zones),d.zones[1].zone_id);assert.deepEqual(d.zones[0].geometry,raw.features[0].geometry);assert.equal(geographicBounds([]),null);
});
test('opacity changes only presentation and keeps selection and insufficient outlines',()=>{
 const z=zones[0],before=JSON.stringify(z),a=polygonStyle(z,z.zone_id,'Surface temperature',36.5,80,.5,'');
 const b=polygonStyle(z,z.zone_id,'Surface temperature',36.5,80,0,'');assert.equal(b.fillOpacity,0);assert.equal(a.fillColor,b.fillColor);assert.equal(b.weight,4);assert.equal(JSON.stringify(z),before);
 const low={...z,data_coverage:79};assert.equal(polygonStyle(low,'','Land cover',36.5,80,1,'').fillColor,'#c9cecb');assert.equal(polygonStyle(low,'','Heat hotspots',36.5,80,0,'').dashArray,'5 4');
 assert.notEqual(polygonStyle(z,'','Heat hotspots',30,80,.5,'').fillColor,polygonStyle(z,'','Heat hotspots',45,80,.5,'').fillColor);
});
test('candidate map stages never infer verification from environmental priority',()=>{
 const z={...zones[0],site_verified:true};assert.equal(candidateStage(z,[],[{zone:z.zone_id}]),'Environmental opportunity · investigation required');
 assert.match(candidateStage(z,[{zone:z.zone_id,preliminary:true}],[]),/Assumed.*Not verified/);
 assert.match(candidateStage(z,[{zone:z.zone_id}],[]),/evidence unavailable/);
 assert.match(candidateStage({...z,site_verification_source:'ARTIFICIAL TEST SURVEY'},[{zone:z.zone_id}],[]),/Independent verification declared/);
});
test('missing satellite key falls back without changing independent planning state',()=>{
 assert.equal(resolveBasemap('satellite',''),'street');assert.equal(resolveBasemap('satellite','test-public-key'),'satellite');assert.equal(resolveBasemap('none',''),'none');assert.equal(resolveBasemap('street',''),'street');
});
test('export includes dynamic provenance scores and selection without fixed-year context',()=>{
 const d=importStudyArea(JSON.stringify(importedFixture()),'export-fixture');const result=buildPlanningSummary({dataset:d,selectedZoneIds:[d.zones[0].zone_id,'MISSING'],budget:5000,threshold:36.5,excluded:[],objectives:DEFAULT_OBJECTIVES,scenarios:[scenario],solarInputs:{area:200,density:.16,yield:1300,factor:.85,cost:3200}});
 assert.equal(result.dataset_provenance.filename,d.title);assert.equal(result.dataset_provenance.period,'2026-01-01');assert.deepEqual(result.selected_zone_ids,[d.zones[0].zone_id]);assert.equal(result.environmental_scores.length,2);assert.ok(!('historical_study_context'in result));assert.ok(result.dataset_provenance.limitations.length>0);
});
console.log(`${passed} test groups passed.`);





