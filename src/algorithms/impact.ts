import type { Candidate } from './planning.ts';
export const GEF_SOURCE='https://myenergystats.st.gov.my/documents/d/guest/grid-emission-factor-gef-in-malaysia-2022-2024-provisional-';
export const IMPACT_NOTICE='Estimated, not measured or verified. Actual generation, grid displacement, contractual electricity arrangements and applicable carbon-accounting rules must be assessed before any verified emissions-reduction claim.';
export type GridAssumptions={region:string;factor:number|null;year:string;source:string;displacementPercent:number|null;displacementNote:string};
export const EMPTY_GRID:GridAssumptions={region:'',factor:null,year:'',source:'',displacementPercent:null,displacementNote:''};
export const PENINSULAR_2024:GridAssumptions={...EMPTY_GRID,region:'Peninsular Malaysia',factor:.740,year:'2024 provisional',source:GEF_SOURCE};
export type FinancialInputs={price:number|null;selfConsumption:number|null;exportPrice:number|null;om:number|null;installation:number|null;source:string};
export const EMPTY_FINANCE:FinancialInputs={price:null,selfConsumption:null,exportPrice:null,om:null,installation:null,source:''};
export type StudyLabel={label:string;status:'unavailable'|'approximate'|'source-verified';reference:string};
export const EMPTY_STUDY:StudyLabel={label:'',status:'unavailable',reference:''};
export function studyLabel(value:StudyLabel){return {...value,status:!value.label.trim()?'unavailable':value.status==='source-verified'&&!value.reference.trim()?'approximate':value.status};}
const nonnegative=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const percent=(v:unknown):v is number=>nonnegative(v)&&v<=100;
export const isSolar=(c:Candidate)=>c.eligible&&c.capacity>0&&nonnegative(c.capacity)&&nonnegative(c.generation);
export function portfolioImpact(selected:Candidate[],grid:GridAssumptions=EMPTY_GRID){
 const pv=selected.filter(isSolar),generation=pv.reduce((s,c)=>s+c.generation,0),capacity=pv.reduce((s,c)=>s+c.capacity,0);
 const complete=!!grid.region.trim()&&nonnegative(grid.factor)&&!!grid.year.trim()&&!!grid.source.trim()&&percent(grid.displacementPercent)&&!!grid.displacementNote.trim();
 const displaced=pv.length?(complete?generation*grid.displacementPercent!/100:null):0;
 const emissions=displaced===null?null:pv.length?displaced*grid.factor!/1000:0;
 return {capacity_kwp:capacity,annual_generation_kwh:generation,grid_displaced_kwh:displaced,avoided_grid_emissions_tco2e:emissions!==null&&Number.isFinite(emissions)?emissions:null,portfolio_investment_rm:selected.reduce((s,c)=>s+c.cost,0),solar_investment_rm:pv.reduce((s,c)=>s+c.cost,0),assumptions:grid,solar_assumptions:pv.map(c=>({id:c.id,inputs:c.solar?.inputs??c.inputs,evidence:c.evidence,verification:c.verification})),formula:'Selected solar generation × declared grid displacement % / 100 × applicable kgCO2e/kWh / 1000',notice:IMPACT_NOTICE,status:'Assumption-based estimate; not corporate Scope 1/2 accounting'};
}
export function financialScenario(candidate:Candidate|undefined,input:FinancialInputs=EMPTY_FINANCE){
 const complete=!!candidate&&isSolar(candidate)&&nonnegative(input.price)&&percent(input.selfConsumption)&&nonnegative(input.om)&&nonnegative(input.installation)&&!!input.source.trim()&&(input.selfConsumption===100||nonnegative(input.exportPrice));
 const generation=candidate?.generation??0;
 const value=complete?generation*(input.selfConsumption!/100)*input.price!+generation*(1-input.selfConsumption!/100)*(input.exportPrice??0):null;
 const net=value===null?null:value-input.om!;
 const payback=net!==null&&net>0?input.installation!/net:null;
 return {candidate_id:candidate?.id??null,inputs:input,annual_value_rm:value!==null&&Number.isFinite(value)?value:null,annual_net_benefit_rm:net!==null&&Number.isFinite(net)?net:null,simple_payback_years:payback!==null&&Number.isFinite(payback)?payback:null,formula:'generation × self-consumption fraction × avoided price + generation × export fraction × export compensation; net = value − annual O&M; payback = initial installation cost / positive net',notice:'Assumption-based, not verified TNB bill savings. Export fraction assumes all non-self-consumed generation is exported under the declared arrangement. Excludes financing, degradation, taxes, replacement and curtailment.'};
}
