import { INSUFFICIENT,landCategory,landPalette,ndviColor,stageColors,hotspotColors } from './layerColors.ts';
import { temperatureColor, type TemperatureScale } from './temperatureScale.ts';
import type { Zone } from './loader.ts';
import type { Candidate } from '../algorithms/planning.ts';
import type { Opportunity } from '../algorithms/opportunities.ts';
import { environmentalQuality,clamp01 } from './validation.ts';
export type Basemap='street'|'satellite'|'none';
export function resolveBasemap(mode:Basemap,key:string){return mode==='satellite'&&!key.trim()?'street':mode;}
export function candidateStage(z:Zone,candidates:Pick<Candidate,'zone'|'preliminary'>[],opportunities:Pick<Opportunity,'zone'>[]){
 const cs=candidates.filter(c=>c.zone===z.zone_id);
 if(cs.some(c=>c.preliminary))return 'Preliminary · Assumed · Not verified';
 if(cs.length && z.site_verified && z.site_verification_source?.trim())return 'Independent verification declared (not authenticated)';
 if(cs.length)return 'Screened candidate · verification evidence unavailable';
 return opportunities.some(o=>o.zone===z.zone_id)?'Environmental opportunity · investigation required':'No screened candidates';
}
export function polygonStyle(z:Zone,selected:string,layer:string,threshold:number,minimum:number,opacity:number,stage:string,visible=true,scale:TemperatureScale|null=null){
 const good=environmentalQuality(z,minimum).usable;
 let fill=INSUFFICIENT;
 if(good){
  if(layer==='Land cover')fill=landPalette[landCategory(z.landcover)];
  else if(layer==='Vegetation / NDVI')fill=ndviColor(z.ndvi);
  else if(layer==='Heat hotspots')fill=z.lst_c!>=threshold?hotspotColors.hot:hotspotColors.below;
  else if(layer==='Intervention zones')fill=stage.startsWith('Independent')?stageColors.verified:stage.startsWith('Preliminary')?stageColors.preliminary:stage.startsWith('Environmental')?stageColors.opportunity:stageColors.none;
  else fill=temperatureColor(z.lst_c,scale);
 }
 return {color:z.zone_id===selected?'#102f28':!good?'#68706b':'#ffffff',weight:z.zone_id===selected?4:2,dashArray:good?undefined:'5 4',fillColor:fill,fillOpacity:visible?clamp01(opacity):0};
}
/** GeoJSON stays [longitude,latitude]; Leaflet receives [latitude,longitude] only for bounds. */
export function geographicBounds(records:Zone[]):[[number,number],[number,number]]|null{
 const points=records.flatMap(z=>z.geometry.type==='Polygon'?z.geometry.coordinates.flat():z.geometry.coordinates.flat(2));
 if(!points.length)return null;
 let west=180,east=-180,south=90,north=-90;
 for(const [lon,lat]of points){west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);}
 return [[south,west],[north,east]];
}
/** Future adapter contract only. Raw GeoTIFF needs a geospatial decoder before rendering. No synthetic interpolation. */
export type ThermalRasterSource = {kind:'georeferenced-image';url:string;bounds:[[number,number],[number,number]];crs:'EPSG:4326';observationStart:string;observationEnd:string;source:string;units:'°C'} | {kind:'tiles';urlTemplate:string;source:string;observationStart:string;observationEnd:string;units:'°C'} | {kind:'geotiff';file:File;requiresDecoder:true};
