import type { Zone } from './loader.ts';
import { environmentalQuality, inRange, DEFAULT_MIN_COVERAGE } from './validation.ts';
export const siteTypes = ['Roof', 'Walkway', 'Parking', 'Open Space'] as const;
export type SiteAssessment = {
    siteType: '' | typeof siteTypes[number];
    area: number | null;
    suitability: 'not-assessed' | 'potentially-suitable' | 'unsuitable';
    costsAcknowledged: boolean;
    roofExposed: boolean;
    shadeNeeded: boolean;
    notes: string;
    solarEnabled: boolean;
    solar: { density:number|null; annualYield:number|null; factor:number|null; unitCost:number|null; source:string };
};
export type SiteAssessments = Record<string, SiteAssessment>;
export const emptyAssessment = (): SiteAssessment => ({siteType:'',area:null,suitability:'not-assessed',costsAcknowledged:false,roofExposed:false,shadeNeeded:false,notes:'',solarEnabled:false,solar:{density:null,annualYield:null,factor:null,unitCost:null,source:''}});
/** Working projection only: never mutates observations, original site flags or user assessment. */
export function screenAssessment(original:Zone, assessment:SiteAssessment, minimum=DEFAULT_MIN_COVERAGE) {
    const issues:string[]=[];
    if(!environmentalQuality(original,minimum).usable) issues.push('Insufficient Data: environmental coverage/observations do not meet the shared rule.');
    if(!siteTypes.includes(assessment.siteType as typeof siteTypes[number])) issues.push('Choose a candidate site type.');
    if(inRange(assessment.area,0,1e8)===null || assessment.area!<=0) issues.push('Enter a positive finite assumed usable area.');
    if(assessment.suitability!=='potentially-suitable') issues.push('Declare preliminary suitability as potentially suitable; this is not verification.');
    if(!assessment.costsAcknowledged) issues.push('Acknowledge the assumed costing method before budget screening.');
    if(issues.length)return {zone:null,issues};
    const s=assessment.solar;
    const solarComplete=assessment.solarEnabled && ['Roof','Parking'].includes(assessment.siteType)
        && inRange(s.density,0,.3)!==null && s.density!>0 && inRange(s.annualYield,0,3000)!==null && s.annualYield!>0
        && inRange(s.factor,0,1)!==null && s.factor!>0 && inRange(s.unitCost,0,100000)!==null && s.unitCost!>0 && !!s.source.trim();
    if(assessment.solarEnabled&&!solarComplete)issues.push('Solar inputs incomplete/invalid or site is not Roof/Parking. Solar Screening is disabled; other eligible measures may remain.');
    const zone:Zone={...original,site_type:assessment.siteType,site_verified:false,site_input_status:'assumed',
        estimated_usable_area:assessment.area!,planting_area:['Walkway','Open Space'].includes(assessment.siteType)?assessment.area!:0,
        roof_exposure:assessment.siteType==='Roof'&&assessment.roofExposed,shade_deficit:assessment.shadeNeeded,
        solar_inputs:solarComplete?{density:s.density,yield:s.annualYield,factor:s.factor,cost:s.unitCost,suitable:true,status:'assumed',source:'User-supplied assumption: '+s.source.trim()}:{density:null,yield:null,factor:null,cost:null,suitable:null,status:'unknown',source:'No complete user-supplied solar assumptions'}
    };
    return {zone,issues};
}
export const STUDY_CONTEXT = 'User-supplied historical study context: Landsat / Sentinel-2 environmental observations are 2024–2025 composites. ESA WorldCover 2021 is a historical land-cover reference, not current verified land use. Composite periods are not single acquisition dates. Imported source/date fields remain unchanged; confirm this context matches the selected file.';
