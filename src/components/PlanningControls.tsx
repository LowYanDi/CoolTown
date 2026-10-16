import { useState } from 'react';
import { Button } from './ui/button';
import { DEFAULT_OBJECTIVES, normaliseObjectives, objectiveLabels, optimiseScenario, scenarioMetrics, SCORE_METHOD, SCENARIO_ASSUMPTIONS, type Objectives, type Scenario } from '../algorithms/planning';
const keys = ['cooling', 'energy', 'biodiversity'] as const;
const money = (n: number) => 'RM ' + n.toLocaleString('en-MY', { maximumFractionDigits: 2 });
export function ObjectiveControls({ value, onChange }: {
    value: Objectives;
    onChange: (value: Objectives) => void;
}) {
    const normalised = normaliseObjectives(value);
    return <section className="panel">
    <div className="panel-heading"><div><h3>Planning objectives</h3><p>Shared by existing-township and future-township optimisation</p></div><Button variant="outline" onClick={() => onChange({ ...DEFAULT_OBJECTIVES })}>Equal importance</Button></div>
    <div className="form-grid">{keys.map(key => <label className="field" key={key}><span>{objectiveLabels[key]} · {(normalised[key] * 100).toFixed(1)}% of score</span><input type="range" aria-label={`${objectiveLabels[key]} importance`} min={0} max={10} step={1} value={value[key]} onChange={e => onChange({ ...value, [key]: Number(e.target.value) })}/><small>Importance {value[key]} / 10</small></label>)}</div>
    {!Object.values(normalised).some(Boolean) && <p className="error" role="alert">All objectives are off. No interventions will be selected until at least one importance is positive.</p>}
    <details><summary>How objective weights work</summary><p>{SCORE_METHOD}</p><p>Heat factor = clamp((LST − 30)/10, 0, 1). Different measures use different components and weights; open a recommendation to inspect its complete formula. Missing inputs are not invented. Totals are sums of points, not percentages or validated impact estimates.</p></details>
  </section>;
}
export function FutureBudgetComparison({ scenario, weights }: {
    scenario: Scenario;
    weights: Objectives;
}) {
    const [visible, setVisible] = useState(false);
    const result = optimiseScenario(scenario, weights), original = scenarioMetrics(scenario, weights);
    return <section className="panel">
    <div className="panel-heading"><div><h3>Future township budget optimisation</h3><p>Original scenario vs an exact budget-constrained combination · live updates after opening</p></div><Button disabled={!result.valid} onClick={() => setVisible(true)}>{visible ? 'Recalculate feasible plan' : 'Optimise this scenario'}</Button></div>
    <p className="source-note">Only checked planning options are candidates. Unchecked options are excluded. The proposed plan does not overwrite your original scenario or change its land-use allocation.</p>
    {!result.valid && <p className="error" role="alert">{result.errors.join(' ')}</p>}
    {scenario.options[1] && scenario.options[3] && <p className="error">The original scenario includes two competing whole-roof treatments. Optimisation selects at most one.</p>}
    {visible && result.valid && <>
      <div className="table-scroll"><table><thead><tr><th>Calculated indicator</th><th>Original scenario</th><th>Budget-constrained plan</th></tr></thead><tbody>
        {[
                ['Implementation cost', money(original.cost), money(result.plan.cost)],
                ['Budget', money(scenario.budget), money(scenario.budget)],
                ['Budget balance', money(scenario.budget - original.cost), money(result.plan.remaining)],
                ['Eligible selected programmes', original.count, result.plan.selected.length],
                ['Allocated green area (unchanged)', `${original.green} ha`, `${result.metrics.green} ha`],
                ['Funded tree / corridor area', `${original.greenIntervention.toLocaleString()} m²`, `${result.metrics.greenIntervention.toLocaleString()} m²`],
                ['Solar capacity estimate', `${original.capacity.toFixed(1)} kWp`, `${result.metrics.capacity.toFixed(1)} kWp`],
                ['Annual solar estimate', `${Math.round(original.generation).toLocaleString()} kWh`, `${Math.round(result.metrics.generation).toLocaleString()} kWh`],
                ['Heuristic planning points', original.score, result.plan.score]
            ].map(row => <tr key={row[0]}>{row.map((v, i) => <td key={i}>{v}</td>)}</tr>)}
      </tbody></table></div>
      {!result.plan.selected.length && <div className="notice">No positive-score eligible programme fits this budget and objective configuration. The feasible plan spends RM0.</div>}
      <div className="table-scroll"><table><thead><tr><th>Programme</th><th>Assumed cost</th><th>Score /100</th><th>Decision</th></tr></thead><tbody>{result.candidates.map((c, i) => {
                const chosen = result.plan.selected.some(x => x.id === c.id), conflict = result.plan.selected.some(x => c.group && x.group === c.group);
                return <tr key={c.id}><td>{c.name}</td><td>{money(c.cost)}</td><td>{c.score}</td><td>{chosen ? 'Included in optimal combination' : !scenario.options[i] ? 'Not enabled in original scenario' : !c.eligible ? 'Area / land-use requirement not met' : c.score === 0 ? 'No score under current objectives' : c.cost > scenario.budget ? 'Exceeds budget individually' : conflict ? 'Alternative uses same whole-roof area' : 'Another combination wins by score or lower-cost tie-break'}</td></tr>;
            })}</tbody></table></div>
      <details><summary>Future scoring, costs and verification</summary><p>{SCENARIO_ASSUMPTIONS}</p><p>Factors: green area / 10,000 m²; roof area / 2,000 m²; site area / 100 ha; generation / 100,000 kWh; adjusted yield / 1,500. All clamp to 0–1. Green deficit = 1 − clamp(green allocation / 40%, 0, 1).</p>{result.candidates.map(c => <p key={c.id}><b>{c.name}:</b> {c.scoring} Verification: {c.verification}</p>)}</details>
    </>}
  </section>;
}
