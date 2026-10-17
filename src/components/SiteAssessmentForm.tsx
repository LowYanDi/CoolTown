import { useState } from 'react';
import type { Zone } from '../data/loader';
import { environmentalQuality } from '../data/validation';
import { emptyAssessment, screenAssessment, siteTypes, type SiteAssessment } from '../data/siteAssessment';
export function SiteAssessmentForm({zone,value,onChange,onRemove,minimumCoverage}:{zone:Zone;value?:SiteAssessment;onChange:(value:SiteAssessment)=>void;onRemove:()=>void;minimumCoverage:number}) {
    const a=value??emptyAssessment();
    const usable=environmentalQuality(zone,minimumCoverage).usable;
    const update=(patch:Partial<SiteAssessment>)=>onChange({...a,...patch});
    const screening=screenAssessment(zone,a,minimumCoverage);
    const number=(label:string,v:number|null,change:(n:number|null)=>void,max:number,step='any')=><label className="field"><span>{label}</span><input type="number" aria-label={label} min="0" max={max} step={step} value={v??''} onChange={e=>change(Number.isFinite(e.target.valueAsNumber)?e.target.valueAsNumber:null)}/></label>;
    return <section className="panel">
        <div className="panel-heading"><div><h3>Preliminary Site Assessment · {zone.zone_id}</h3><p>User-supplied assumptions · not satellite observations or verified engineering facts</p></div>{value&&<button type="button" className="text-link" onClick={onRemove}>Clear site assumptions</button>}</div>
        <p className="source-note">Environmental opportunity → preliminary intervention → independent site verification. This form supports the middle stage only. It never marks a site verified. Estimates are for demonstration budgeting, not construction approval.</p>
        {!usable&&<p className="error">Insufficient Data. This zone stays gray; assessment inputs are disabled and saved assumptions cannot generate preliminary candidates until environmental quality passes.</p>}
        <fieldset disabled={!usable} style={{border:0,padding:0,margin:0}}><div className="form-grid">
            <label className="field"><span>Candidate site type</span><select aria-label="Candidate site type" value={a.siteType} onChange={e=>update({siteType:e.target.value as SiteAssessment['siteType']})}><option value="">Choose site type</option>{siteTypes.map(t=><option key={t}>{t}</option>)}</select></label>
            {number('Assumed usable area (m²)',a.area,n=>update({area:n}),1e8)}
            <label className="field"><span>Preliminary suitability status</span><select aria-label="Preliminary suitability status" value={a.suitability} onChange={e=>update({suitability:e.target.value as SiteAssessment['suitability']})}><option value="not-assessed">Not assessed</option><option value="potentially-suitable">Potentially suitable — assumed, not verified</option><option value="unsuitable">Unsuitable</option></select></label>
            <label className="field"><span>Site assessment notes</span><textarea aria-label="Site assessment notes" value={a.notes} maxLength={2000} rows={3} onChange={e=>update({notes:e.target.value})}/></label>
        </div>
        <div className="option-list">
            {a.siteType==='Roof'&&<label><input type="checkbox" checked={a.roofExposed} onChange={e=>update({roofExposed:e.target.checked})}/>Assume exposed roof suitable for cool-roof investigation</label>}
            <label><input type="checkbox" checked={a.shadeNeeded} onChange={e=>update({shadeNeeded:e.target.checked})}/>Assume shade is needed at the candidate site</label>
            <label><input type="checkbox" checked={a.solarEnabled} onChange={e=>update({solarEnabled:e.target.checked})}/>Supply optional solar resource assumptions</label>
        </div>
        {a.solarEnabled&&<><p className="source-note">Solar requires Roof/Parking, at least 150 m², positive resource/cost inputs and an assumption source. No values are prefilled from LST or NDVI.</p><div className="form-grid">
            {number('Assumed power density (kWp/m²)',a.solar.density,n=>update({solar:{...a.solar,density:n}}),.3)}
            {number('Assumed annual solar yield (kWh/kWp/year)',a.solar.annualYield,n=>update({solar:{...a.solar,annualYield:n}}),3000)}
            {number('Assumed performance adjustment (0–1)',a.solar.factor,n=>update({solar:{...a.solar,factor:n}}),1)}
            {number('Assumed solar unit cost (RM/kWp)',a.solar.unitCost,n=>update({solar:{...a.solar,unitCost:n}}),100000)}
            <label className="field"><span>Solar assumption source / rationale</span><input aria-label="Solar assumption source / rationale" value={a.solar.source} maxLength={500} onChange={e=>update({solar:{...a.solar,source:e.target.value}})}/></label>
        </div></>}
        <p className="source-note">Assumed costing: trees RM18/m² of declared usable plantable area (Walkway/Open Space); cool roofs RM65/m²; PV capacity = area × density; generation = capacity × yield × adjustment; cost = capacity × unit cost, with ×1.35 for carports. Whole-roof PV and cool roofs are alternatives. These assumptions are not quotes or engineering facts.</p>
        <label><input type="checkbox" checked={a.costsAcknowledged} onChange={e=>update({costsAcknowledged:e.target.checked})}/> I acknowledge the declared area/suitability and costing inputs are preliminary assumptions.</label>
        </fieldset>
        {value&&<details open={!screening.zone}><summary>Assessment screening status</summary>{screening.issues.map(issue=><p key={issue}>{issue}</p>)}{screening.zone&&<p>Assessment inputs are ready for intervention-specific checks. Candidate generation still depends on area, site type, environmental rules and solar inputs; no approval is implied.</p>}</details>}
        <p className="source-note">Saved separately in this browser session for this dataset and zone. Importing a replacement dataset clears its assessments. Export includes assumptions separately from observations.</p>
    </section>;
}
