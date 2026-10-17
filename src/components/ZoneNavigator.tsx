import { useEffect,useState } from 'react';
import type { Zone } from '../data/loader';
import { environmentalQuality } from '../data/validation';
import { filterZones } from '../data/temperatureScale';
export function ZoneNavigator({records,selected,minimum,onSelect}:{records:Zone[];selected:string;minimum:number;onSelect:(id:string)=>void}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false);
 useEffect(()=>{setQuery('');setOpen(false);},[records]);
 const matches=filterZones(records,query);
 return <details className="zone-navigator" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
 <summary>Zone Navigator · {records.length} zones · Selected: {selected||'None'}</summary>
 <label className="field"><span>Search Zone ID or name</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search zones"/></label>
 <p className="source-note" role="status">{matches.length} matching zones. Insufficient-data zones remain selectable.</p>
 <div className="zone-navigator-results">{matches.map(z=>{const valid=environmentalQuality(z,minimum).usable;return <button type="button" key={z.zone_id} aria-pressed={selected===z.zone_id} onClick={()=>{onSelect(z.zone_id);setOpen(false);}}><strong>{z.zone_id}</strong><span>{z.zone_name}</span><small>{valid?'Valid environmental data':'Insufficient Data'}</small></button>;})}</div>
 {!matches.length&&<p>No matching zones. Clear the search to show all zones.</p>}
 </details>;
}
