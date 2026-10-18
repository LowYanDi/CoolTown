import { importStudyArea, type PlanningDataset } from './dataset.ts';
import { environmentalQuality, DEFAULT_MIN_COVERAGE } from './validation.ts';
import type { Zone } from './loader.ts';
export const CASE_FILENAME = 'CoolTown_Real_Zones_2026.geojson';
export type DatasetChoice = 'demo' | 'case' | 'real';
export function loadCaseStudy(text:string|undefined):{dataset:PlanningDataset|null;message:string}{
 if(text===undefined)return {dataset:null,message:'Malaysian 2026 case-study asset is missing. Use the synthetic demo or import your own GeoJSON.'};
 try{
  const dataset=importStudyArea(text,CASE_FILENAME);
  if(!dataset.zones.some(z=>environmentalQuality(z).usable))return {dataset:null,message:'Case-study asset has no quality-valid environmental zones. Use custom import to inspect its data-quality warnings.'};
  return {dataset:{...dataset,id:'bundled-malaysian-2026'},message:'Bundled original GeoJSON · historical 2026 satellite composites, not real-time thermal measurements.'};
 }catch{return {dataset:null,message:'Case-study asset is invalid and could not be loaded. Use the synthetic demo or import a valid GeoJSON.'};}
}
/** Linear interpolated sample percentile: sorted values at index (n-1)*0.8. No observation rounding. */
export function relativeHotspotThreshold(records:Zone[],minimum=DEFAULT_MIN_COVERAGE):number|null{
 const values=records.filter(z=>environmentalQuality(z,minimum).usable).map(z=>z.lst_c!).sort((a,b)=>a-b);
 if(!values.length)return null;
 const index=(values.length-1)*.8,low=Math.floor(index),high=Math.ceil(index);
 return values[low]+(values[high]-values[low])*(index-low);
}
export const initialHotspotThreshold=(dataset:PlanningDataset|null,minimum=DEFAULT_MIN_COVERAGE)=>dataset?.mode==='real'?(relativeHotspotThreshold(dataset.zones,minimum)??36.5):36.5;
