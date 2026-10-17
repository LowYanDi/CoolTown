import type { Zone } from './loader.ts';
import type { PlanningDataset } from './dataset.ts';
import { environmentalQuality, DEFAULT_MIN_COVERAGE } from './validation.ts';
export const SCIENTIFIC_LIMITATIONS = [
 'Landsat LST measures land surface temperature, not ambient air temperature.',
 'Sentinel-2 NDVI describes vegetation characteristics, not direct tree-canopy coverage.',
 'Composites combine dates; Landsat and Sentinel-2 observations may not be simultaneous.',
 'Recent observations are not real-time thermal monitoring. Basemap imagery dates may differ from environmental observations.',
 'Land-cover references describe their declared historical period, not verified current land use.',
 'Environmental indicators cannot verify site or construction suitability. Sources and dates are user declarations, not independently authenticated.'
];
export function observationPeriod(z:Zone):string {
 if(z.observation_start || z.observation_end) return `${z.observation_start ?? 'Start unavailable'} – ${z.observation_end ?? 'End unavailable'}`;
 return z.observation_date ?? 'Unavailable';
}
export function landcoverReference(z:Zone):string {
 const source=z.landcover_source || (/WorldCover/i.test(z.data_source)?z.data_source:'');
 if(!source)return 'Unavailable';
 return `${source}${z.landcover_year ? ' · '+z.landcover_year : ''} · historical reference, not verified current land use`;
}
export const firstQualityZone=(records:Zone[],minimum=DEFAULT_MIN_COVERAGE)=> (records.find(z=>environmentalQuality(z,minimum).usable) ?? records[0])?.zone_id ?? '';
export function datasetProvenance(dataset:PlanningDataset,minimum=DEFAULT_MIN_COVERAGE){
 const details=dataset.zones.map(z=>({zone_id:z.zone_id,period:observationPeriod(z),observation_start:z.observation_start??null,observation_end:z.observation_end??null,observation_date:z.observation_date,source:z.data_source==='Unknown source'?'Unavailable':z.data_source,classification:z.data_status,landcover_reference:landcoverReference(z)}));
 const periods=[...new Set(details.map(d=>d.period))],sources=[...new Set(details.map(d=>d.source))],landcover=[...new Set(details.map(d=>d.landcover_reference))];
 const passing=dataset.zones.filter(z=>environmentalQuality(z,minimum).usable).length;
 return {filename:dataset.title,period:periods.length>1?'Mixed observation periods':periods[0]??'Unavailable',sources_label:sources.length>1?'Multiple declared sources':sources[0]??'Unavailable',declared_sources:sources,landcover_references:landcover,classification:[...new Set(details.map(d=>d.classification))],derived:'Environmental scores, hotspots and planning indicators',assumed:'User-supplied site inputs and costs',synthetic:'Future scenarios; demo dataset only when selected',total_zones:details.length,quality_pass:passing,insufficient:details.length-passing,minimum_coverage_percent:minimum,details,limitations:SCIENTIFIC_LIMITATIONS};
}
