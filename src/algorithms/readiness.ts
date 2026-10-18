import { planningResult,optimiseScenario,scenarioMetrics,type Candidate,type Scenario,type Objectives } from './planning.ts';
import type { Zone } from '../data/loader.ts';
import { environmentalQuality } from '../data/validation.ts';
import { emptyAssessment,screenAssessment,type SiteAssessments } from '../data/siteAssessment.ts';
export const EXAMPLE_NOTICE='DEMONSTRATION ASSUMPTIONS — NOT VERIFIED SITE DATA';
export function exampleAssessments(zones:Zone[],minimum:number):SiteAssessments{
 const valid=zones.filter(z=>environmentalQuality(z,minimum).usable).slice().sort((a,b)=>b.lst_c!-a.lst_c!||a.zone_id.localeCompare(b.zone_id)).slice(0,3);
 return Object.fromEntries(valid.map((z,i)=>[z.zone_id,{...emptyAssessment(),siteType:(['Walkway','Roof','Parking'] as const)[i],area:i===0?100:200,suitability:'potentially-suitable' as const,costsAcknowledged:true,roofExposed:i===1,shadeNeeded:true,solarEnabled:i>0,solar:{density:.16,annualYield:1300,factor:.85,unitCost:3200,source:'Illustrative hackathon assumptions; verify local irradiation, shading, structure and costs.'},notes:EXAMPLE_NOTICE+'; proposed hypothetical site, not an existing roof or parking facility inferred from historical land cover or satellite imagery.'}]));
}
export type ComparisonSettings={equal:boolean;area:number;budget:number};
export function comparisonScenarios(scenarios:Scenario[],settings:ComparisonSettings){return scenarios.map(s=>({...s,land:[...s.land],options:[...s.options],...(settings.equal?{area:settings.area,budget:settings.budget}:{})}));}
export function futureComparison(scenarios:Scenario[],settings:ComparisonSettings,weights:Objectives){return comparisonScenarios(scenarios,settings).map(s=>({scenario:s,original:scenarioMetrics(s,weights),optimised:optimiseScenario(s,weights)}));}
export function costSensitivity(candidates:Candidate[],budget:number,excluded:string[]=[]){
 const base=planningResult(candidates,budget,excluded),baseIds=base.selected.map(c=>c.id);
 return [0,10,20].map(percent=>{
  const adjusted=candidates.map(c=>({...c,cost:Math.ceil(Math.ceil(c.cost*100-1e-6)*(100+percent)/100)/100}));
  const plan=percent===0?base:planningResult(adjusted,budget,excluded),ids=plan.selected.map(c=>c.id);
  const preferredCost=adjusted.filter(c=>baseIds.includes(c.id)).reduce((s,c)=>s+c.cost,0);
  return {percent,plan,preferredCost,preferredFeasible:!base.error&&preferredCost<=budget,retained:baseIds.filter(id=>ids.includes(id)),removed:baseIds.filter(id=>!ids.includes(id)),added:ids.filter(id=>!baseIds.includes(id))};
 });
}
export const pilotItems=['Land ownership and site access','Available installation area','Structural suitability','Utilities and drainage constraints','Solar resource and shading','Preliminary cost validation','Local authority or regulatory permissions','Field assessment'] as const;
export type PilotEntry={status:'not-assessed'|'pending'|'verified'|'not-applicable';evidence:string};
export type PilotChecklist=Record<string,PilotEntry>;
export type PilotChecks=Record<string,PilotChecklist>;
export function pilotReadiness(checks:PilotChecklist={}){
 const entries=pilotItems.map(item=>({item,...(checks[item]??{status:'not-assessed' as const,evidence:''})}));
 const supported=entries.filter(e=>(e.status==='verified'||e.status==='not-applicable')&&!!e.evidence.trim());
 return {entries,supported:supported.length,total:pilotItems.length,complete:supported.length===pilotItems.length,notice:'Declared evidence only; not authenticated engineering, legal or regulatory approval. This checklist does not change intervention eligibility or map verification status.'};
}
export function screeningReasons(zone:Zone,assessment:SiteAssessments[string]|undefined,minimum:number){
 const reasons:string[]=[];
 if(!environmentalQuality(zone,minimum).usable)reasons.push('Insufficient environmental observations or coverage: environmental recommendations disabled.');
 if(assessment){const screened=screenAssessment(zone,assessment,minimum);reasons.push(...screened.issues);if(!assessment.solarEnabled)reasons.push('Solar screening disabled: solar assumptions have not been supplied.');if(assessment.area!==null&&assessment.area<150)reasons.push('Solar requires at least 150 m² of usable installation area.');}
 else {if(!zone.site_verified||!zone.site_verification_source)reasons.push('Site suitability not established with declared verification evidence; supply an explicitly preliminary assessment.');if(!zone.estimated_usable_area&&!zone.planting_area)reasons.push('Missing installation or planting area.');if(zone.solar_inputs?.suitable!==true)reasons.push('Missing solar resource or suitability inputs.');}
 return reasons;
}

/** Evidence is bound to proposal inputs, not just its stable display ID. Objective weights are not site facts. */
export type BoundPilotChecks=Record<string,{zone:string;signature:string;checks:PilotChecklist}>;
export function proposalSignature(c:Candidate){return JSON.stringify([c.zone,c.name,c.inputs,c.cost,c.green,c.capacity,c.generation,c.preliminary??false,c.evidence,c.verification]);}
export function bindPilotChecks(candidates:Candidate[],checks:PilotChecks):BoundPilotChecks{
 return Object.fromEntries(candidates.filter(c=>checks[c.id]).map(c=>[c.id,{zone:c.zone,signature:proposalSignature(c),checks:checks[c.id]}]));
}
export function currentPilotChecks(candidates:Candidate[],stored:BoundPilotChecks):PilotChecks{
 return Object.fromEntries(candidates.filter(c=>stored[c.id]?.signature===proposalSignature(c)).map(c=>[c.id,stored[c.id].checks]));
}
export function clearPilotZones(stored:BoundPilotChecks,zoneIds:string[]):BoundPilotChecks{return Object.fromEntries(Object.entries(stored).filter(([,entry])=>!zoneIds.includes(entry.zone)));}
