import type { Zone } from './loader.ts';
import { environmentalQuality, validLST, validNDVI, inRange, finite, DEFAULT_MIN_COVERAGE } from './validation.ts';
export const temperatureTickText = (v: unknown) => finite(v) ? v.toFixed(1) : '';
export const temperatureText = (v: unknown) => validLST(v) === null ? 'Insufficient Data' : (v as number).toFixed(1);
export const ndviText = (v: unknown) => validNDVI(v) === null ? 'Insufficient Data' : (v as number).toFixed(2);
export const coverageText = (v: unknown) => inRange(v,0,100) === null ? 'Insufficient Data' : (v as number).toFixed(1) + '%';
export const shortZone = (id: string) => id.length > 14 ? id.slice(0,6) + '…' + id.slice(-6) : id;
export function chartRecords(records: Zone[], minimum = DEFAULT_MIN_COVERAGE) {
    return records.filter(z => environmentalQuality(z,minimum).usable).map(z => ({ id:z.zone_id, lst_c:z.lst_c!, ndvi:z.ndvi! }));
}
/** At most seven distinct, padded numeric ticks. Minimum step 0.1 prevents duplicate one-decimal labels. */
export function temperatureAxis(values: unknown[]) {
    const good = values.filter(v => validLST(v) !== null) as number[];
    if (!good.length) return { domain:[20,40] as [number,number], ticks:[20,25,30,35,40] };
    const min=Math.min(...good), max=Math.max(...good), pad=Math.max(.2,(max-min)*.08);
    const low=min-pad, high=max+pad, raw=(high-low)/4;
    const power=10**Math.floor(Math.log10(raw));
    const step=Math.max(.1, [1,2,2.5,5,10].find(n=>n*power>=raw)!*power);
    const first=Math.floor(low/step)*step, last=Math.ceil(high/step)*step;
    const ticks=Array.from({length:Math.round((last-first)/step)+1},(_,i)=>Number((first+i*step).toFixed(6))).filter(finite);
    return {domain:[ticks[0],ticks[ticks.length-1]] as [number,number],ticks};
}
export function warningGroups(records: Zone[], minimum = DEFAULT_MIN_COVERAGE) {
    const groups = [
        {name:'Missing environmental observations',details:[] as {zone:string;message:string}[]},
        {name:'Insufficient data coverage',details:[] as {zone:string;message:string}[]},
        {name:'Missing solar inputs',details:[] as {zone:string;message:string}[]},
        {name:'Unverified site suitability',details:[] as {zone:string;message:string}[]}
    ];
    for(const z of records){
        const quality=environmentalQuality(z,minimum);
        if(validLST(z.lst_c)===null || validNDVI(z.ndvi)===null) groups[0].details.push({zone:z.zone_id,message:'Valid LST and/or NDVI missing; environmental scoring disabled.'});
        if(quality.coverage===null || quality.coverage<=0 || quality.coverage<quality.minimum) groups[1].details.push({zone:z.zone_id,message:'Coverage '+coverageText(z.data_coverage)+'; required minimum '+quality.minimum+'%.'});
        const s=z.solar_inputs;
        if(!s || [s.density,s.yield,s.factor,s.cost].some(v=>!finite(v)||v<=0) || s.status==='unknown' || !s.source || s.source==='Unknown solar source') groups[2].details.push({zone:z.zone_id,message:'Solar Screening unavailable; usable environmental observations remain valid.'});
        if(!z.site_verified || z.site_input_status==='unknown' || z.issues.some(issue=>/planting_area|estimated_usable_area|area_ha/.test(issue))) groups[3].details.push({zone:z.zone_id,message:'Site verification, suitability provenance or area information is missing. Environmental opportunities are preliminary. A separate complete user assessment may allow assumed budgeting; it never verifies the site.'});
    }
    return groups;
}
