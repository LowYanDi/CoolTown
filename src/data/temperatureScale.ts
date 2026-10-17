import type { Zone } from './loader.ts';
import { environmentalQuality, finite, clamp01, DEFAULT_MIN_COVERAGE } from './validation.ts';
export const INSUFFICIENT_COLOR = '#c9cecb';
const PALETTE = ['#3275a8', '#f0cf73', '#bd493b'] as const;
export type TemperatureScale = {min:number;max:number;count:number;stops:{value:number;color:string}[]};
/** Relative visual comparison only. This never changes observations, hotspot thresholds or scores. */
export function temperatureScale(records:Zone[], minimum=DEFAULT_MIN_COVERAGE):TemperatureScale|null {
 const values=records.filter(z=>environmentalQuality(z,minimum).usable).map(z=>z.lst_c!);
 if(!values.length)return null;
 const min=Math.min(...values),max=Math.max(...values);
 const scale={min,max,count:values.length,stops:[] as TemperatureScale['stops']};
 scale.stops=min===max?[{value:min,color:PALETTE[1]}]:[min,min+(max-min)/2,max].map(value=>({value,color:temperatureColor(value,scale)}));
 return scale;
}
export function temperatureColor(value:number|null,scale:TemperatureScale|null):string {
 if(!finite(value)||!scale)return INSUFFICIENT_COLOR;
 const t=scale.max === scale.min ? .5 : clamp01((value-scale.min)/(scale.max-scale.min));
 const i=t<.5?0:1,local=t<.5?t*2:(t-.5)*2;
 const rgb=(hex:string)=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16));
 const a=rgb(PALETTE[i]),b=rgb(PALETTE[i+1]);
 return '#'+a.map((n,j)=>Math.round(n+(b[j]-n)*local).toString(16).padStart(2,'0')).join('');
}
export function filterZones(records:Zone[],query:string):Zone[]{
 const q=query.trim().toLocaleLowerCase();
 return q?records.filter(z=>z.zone_id.toLocaleLowerCase().includes(q)||z.zone_name.toLocaleLowerCase().includes(q)):records;
}
