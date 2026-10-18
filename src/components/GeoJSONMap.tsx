import { LayerLegend } from './LayerLegend';
import { overlayVisible } from '../data/layerColors';
import { ZoneNavigator } from './ZoneNavigator';
import { TemperatureLegend } from './TemperatureLegend';
import { temperatureScale } from '../data/temperatureScale';
import { temperatureText, ndviText, coverageText } from '../data/presentation';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Zone } from '../data/loader';
import { environmentalQuality, DEFAULT_MIN_COVERAGE } from '../data/validation';
import { priority, type Candidate } from '../algorithms/planning';
import type { Opportunity } from '../algorithms/opportunities';
import { observationPeriod,landcoverReference } from '../data/provenance';
import { candidateStage,polygonStyle,geographicBounds,resolveBasemap,type Basemap,type MapPreferences } from '../data/mapModel';
const EMPTY:Candidate[]=[]; const NO_OPPORTUNITIES:Opportunity[]=[];
const OSM_ATTR='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
export function GeoJSONMap({records,selected,onSelect,minimumCoverage=DEFAULT_MIN_COVERAGE,layer='Surface temperature',threshold=36.5,candidates=EMPTY,opportunities=NO_OPPORTUNITIES,onLayerChange,view,onViewChange}:{view:MapPreferences;onViewChange:(view:MapPreferences)=>void;records:Zone[];selected:string;onSelect:(id:string)=>void;minimumCoverage?:number;layer?:string;threshold?:number;candidates?:Candidate[];opportunities?:Opportunity[];onLayerChange?:(layer:string)=>void}){
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null),polygons=useRef<L.GeoJSON|null>(null),callback=useRef(onSelect);
 callback.current=onSelect;
 const {basemap,opacity}=view;
 const setBasemap=(basemap:Basemap)=>onViewChange({...view,basemap});
 const setOpacity=(opacity:number)=>onViewChange({...view,opacity});
 const [error,setError]=useState(''),[tileError,setTileError]=useState('');
 const overlay=overlayVisible(layer);
 const scale=useMemo(()=>temperatureScale(records,minimumCoverage),[records,minimumCoverage]);
 const previousSelection=useRef({records,selected});
 const zoomZone=(id:string)=>{const z=records.find(z=>z.zone_id===id);const bounds=z?geographicBounds([z]):null;if(bounds)mapRef.current?.fitBounds(bounds,{padding:[35,35],maxZoom:18,animate:false});};
 useEffect(()=>{const prev=previousSelection.current;previousSelection.current={records,selected};if(prev.records===records&&prev.selected!==selected)zoomZone(selected);},[records,selected]);
 const key=String(import.meta.env.VITE_MAPTILER_KEY??'').trim();
 const mode=resolveBasemap(basemap,key);
 useEffect(()=>{
  if(!container.current)return;
  const map=L.map(container.current,{attributionControl:true}).setView([4,102],6);mapRef.current=map;
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(container.current);
  return ()=>{observer.disconnect();map.remove();mapRef.current=null;};
 },[]);
 // Only a new dataset changes geometry and fits bounds. Visual controls never recreate the map.
 useEffect(()=>{
  const map=mapRef.current;if(!map)return;
  polygons.current?.remove();setError('');
  try{
   const collection:import('geojson').FeatureCollection={type:'FeatureCollection',features:records.map(z=>({type:'Feature' as const,geometry:z.geometry,properties:z}))};
   const group=L.geoJSON(collection,{onEachFeature:(feature,polygon)=>polygon.on('click',()=>callback.current(feature.properties.zone_id))}).addTo(map);
   polygons.current=group;const bounds=geographicBounds(records);if(bounds){map.invalidateSize();map.fitBounds(bounds,{padding:[20,20],maxZoom:17});}
  }catch{setError('Unable to display imported geometry. Review validation messages.');}
  return ()=>{polygons.current?.remove();polygons.current=null;};
 },[records]);
 useEffect(()=>{
  const map=mapRef.current;if(!map||!records.length)return;
  let active=true,tiles:L.TileLayer|undefined;const controller=new AbortController();
  setTileError(basemap==='satellite'&&!key?'Satellite imagery needs a public VITE_MAPTILER_KEY. Set it in .env.local beside package.json (or in your hosting build environment), then restart/rebuild. Restrict it to your website domains. Street fallback is shown.':'');
  const street=()=>{
   tiles?.remove();tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:OSM_ATTR,referrerPolicy:'strict-origin-when-cross-origin'});
   tiles.on('tileerror',()=>{if(active)setTileError('Street tiles could not load. Imported polygons remain available. Check connectivity or choose No basemap.');});tiles.addTo(map);
  };
  if(mode==='street')street();
  if(mode==='satellite'){
   const timer=setTimeout(()=>controller.abort(),12000);
   (async()=>{
    try{
     const response=await fetch('https://api.maptiler.com/tiles/satellite-v2/tiles.json?key='+encodeURIComponent(key),{signal:controller.signal});
     if(!response.ok)throw Error('Unavailable');const metadata=await response.json();
     const url=metadata.tiles?.find((t:unknown)=>typeof t==='string'&&t.startsWith('https://api.maptiler.com/'));
     if(!url)throw Error('Missing tiles');if(!active)return;
     // Convert provider attribution to text before placing it in Leaflet's HTML attribution control.
     const parsed=new DOMParser().parseFromString(String(metadata.attribution??''),'text/html');const safe=document.createElement('span');safe.textContent=parsed.body.textContent;
     const attribution='<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">&copy; MapTiler</a> '+safe.outerHTML+' '+OSM_ATTR;
     tiles=L.tileLayer(url,{tileSize:metadata.tileSize===512?512:256,maxZoom:20,maxNativeZoom:Number.isFinite(metadata.maxzoom)?metadata.maxzoom:18,attribution,referrerPolicy:'strict-origin-when-cross-origin'});
     tiles.once('tileerror',()=>{if(active){street();setTileError('Satellite tiles unavailable (key restrictions, quota, coverage or network). Street fallback is shown. Switch modes to retry.');}});tiles.addTo(map);
    }catch{if(active){street();setTileError('Satellite imagery unavailable. Check the public key, domain restrictions, quota and connectivity. Street fallback is shown.');}}
    finally{clearTimeout(timer);}
   })();
  }
  return ()=>{active=false;controller.abort();tiles?.remove();};
 },[mode,basemap,key,records]);
 useEffect(()=>{
  polygons.current?.setStyle(feature=>{const z=feature!.properties as Zone;return polygonStyle(z,selected,layer,threshold,minimumCoverage,opacity,candidateStage(z,candidates,opportunities),overlay,scale);});
  polygons.current?.eachLayer(polygon=>{
   const z=(polygon as L.Polygon & {feature:{properties:Zone}}).feature.properties;const quality=environmentalQuality(z,minimumCoverage);
   const popup=document.createElement('div');popup.textContent=[z.zone_id,z.zone_name,'LST: '+temperatureText(z.lst_c)+' °C; NDVI: '+ndviText(z.ndvi),'Land cover: '+z.landcover,landcoverReference(z),'Coverage: '+coverageText(z.data_coverage),'Observation: '+observationPeriod(z),'Source: '+z.data_source,'Classification: '+z.data_status,quality.label,quality.usable?(z.lst_c!>=threshold?'Hotspot':'Below hotspot threshold'):'Not classified as reliable hotspot','Priority: '+(quality.usable?priority(z,minimumCoverage)+'/100':'Unavailable'),'Site: '+(z.site_verified?(z.site_verification_source||'Verification claimed; evidence unavailable'):'Not verified'),candidateStage(z,candidates,opportunities),'Candidates: '+(candidates.filter(c=>c.zone===z.zone_id).map(c=>c.name).join(', ')||'None')].join(' | ');
   if(polygon.getPopup())polygon.setPopupContent(popup);else polygon.bindPopup(popup);
  });
 },[records,selected,layer,threshold,minimumCoverage,opacity,overlay,candidates,opportunities,scale]);
 return <div>
  {!records.length?<div className="notice">Observed data has not yet been imported. Choose a local GeoJSON file.</div>:<>
   <div className="form-grid"><label className="field"><span>Basemap</span><select aria-label="Basemap" value={basemap} onChange={e=>setBasemap(e.target.value as Basemap)}><option value="street">Street map</option><option value="satellite">Satellite imagery</option><option value="none">No basemap (offline)</option></select></label><label className="field"><span>Overlay opacity · {Math.round(opacity*100)}%</span><input aria-label="Overlay opacity" type="range" disabled={!overlay} min="0" max="100" value={opacity*100} onChange={e=>setOpacity(+e.target.value/100)}/></label></div>
   <p className="source-note">Environmental overlay: {overlay?layer:"hidden — Satellite only"}</p>
   {onLayerChange&&<div className="layer-tabs" role="group" aria-label="Map layers">{['Surface temperature','Vegetation / NDVI','Land cover','Heat hotspots','Intervention zones'].map(name=><button key={name} className={layer===name?'selected':''} aria-pressed={layer===name} onClick={()=>onLayerChange(name)}>{name}</button>)}<button className={!overlay?'selected':''} aria-pressed={!overlay} onClick={()=>{setBasemap('satellite');onLayerChange('Satellite only');}}>Satellite only</button></div>}
   <p className="source-note">Basemap imagery is geographic context, not real-time thermal data or the same-date satellite observation. Tile providers receive map-view requests; imported files remain local. Gray / dashed polygons: Insufficient Data; outlines and selection remain visible at 0% opacity.</p>
  </>}
  {tileError&&<p role="status" className="notice">{tileError}</p>}{error&&<p role="alert" className="error">{error}</p>}
  <div ref={container} aria-label="Real GIS study area map" style={{height:480,position:'relative',zIndex:0,display:records.length?'block':'none'}}/>
  <LayerLegend layer={layer} threshold={threshold}/>
  {records.length>0&&<><button type="button" className="text-link" onClick={()=>{const bounds=geographicBounds(records);if(bounds)mapRef.current?.fitBounds(bounds,{padding:[20,20],maxZoom:17,animate:false});}}>Fit study area</button>{layer==='Surface temperature'&&<TemperatureLegend records={records} minimum={minimumCoverage}/>}<ZoneNavigator records={records} selected={selected} minimum={minimumCoverage} onSelect={id=>{onSelect(id);zoomZone(id);}}/></>}
 </div>;
}

