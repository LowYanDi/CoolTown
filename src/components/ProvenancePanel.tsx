import type { PlanningDataset } from '../data/dataset';
import { datasetProvenance } from '../data/provenance';
export function ProvenancePanel({dataset,minimum}:{dataset:PlanningDataset;minimum:number}){
 const p=datasetProvenance(dataset,minimum);
 return <section className="panel"><div className="panel-heading"><div><h3>Environmental Data Provenance</h3><p>{p.filename}</p></div></div>
 <dl className="zone-details"><div><dt>Declared observation period</dt><dd>{p.period}</dd></div><div><dt>Declared sources</dt><dd>{p.sources_label}</dd></div><div><dt>Environmental quality</dt><dd>{p.quality_pass}/{p.total_zones} pass · {p.insufficient} Insufficient Data</dd></div><div><dt>Imported classification</dt><dd>{p.classification.join(', ') || 'Unavailable'} · user-declared</dd></div><div><dt>Land-cover reference</dt><dd>{p.landcover_references.join('; ')||'Unavailable'}</dd></div></dl>
 <p className="source-note">Derived: scores and hotspots · Assumed: site inputs and costs · Synthetic: future scenarios. Dates are declared periods, not proof of a valid acquisition in every zone. Missing provenance stays unavailable.</p>
 <details><summary>Zone-level dates and sources</summary>{p.details.map(d=><p key={d.zone_id}><b>{d.zone_id}</b> · {d.period} · {d.source} · {d.classification}<br/>{d.landcover_reference}</p>)}</details>
 <details><summary>Scientific limitations and methodology</summary><ul>{p.limitations.map(l=><li key={l}>{l}</li>)}</ul><p>Coverage threshold {minimum}% is an illustrative screening requirement, not scientific certification. No scene acquisition dates are inferred from a filename.</p></details></section>;
}
