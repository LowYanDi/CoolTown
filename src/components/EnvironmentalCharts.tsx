import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ScatterChart, Scatter } from 'recharts';
import type { Zone } from '../data/loader';
import { chartRecords, temperatureAxis, temperatureTickText, temperatureText, ndviText, shortZone } from '../data/presentation';
import { priority } from '../algorithms/planning';
import { DEFAULT_MIN_COVERAGE } from '../data/validation';
export function ZoneChart({records,selected,kind='lst',minimum=DEFAULT_MIN_COVERAGE}:{records:Zone[];selected:string;kind?:'lst'|'ndvi'|'priority';minimum?:number}) {
    const eligible=chartRecords(records,minimum);
    const byId=new Map(records.map(z=>[z.zone_id,z]));
    const data=eligible.map(z=>({...z,value:kind==='lst'?z.lst_c:kind==='ndvi'?z.ndvi:priority(byId.get(z.id)!,minimum)}));
    const axis=temperatureAxis(eligible.map(z=>z.lst_c));
    const formatter=(v: unknown)=>kind==='lst'?temperatureTickText(v):kind==='ndvi'?ndviText(v):String(Math.round(Number(v)));
    if(!data.length)return <p className="source-note">Insufficient Data — no observations meet the shared environmental quality rule.</p>;
    return <div style={{overflowX:'auto'}}><div style={{minWidth:Math.max(320,data.length*48)}}><ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{top:16,right:20,bottom:32,left:8}}>
            <CartesianGrid vertical={false} stroke="#edf0ee"/>
            <XAxis dataKey="id" type="category" height={66} angle={-35} textAnchor="end" tickFormatter={shortZone} interval="preserveStartEnd" minTickGap={18} tick={{fontSize:11}}/>
            <YAxis type="number" width={64} domain={kind==='lst'?axis.domain:kind==='ndvi'?[-1,1]:[0,100]} ticks={kind==='lst'?axis.ticks:kind==='ndvi'?[-1,-.5,0,.5,1]:[0,25,50,75,100]} tickFormatter={formatter} minTickGap={16} tick={{fontSize:11}}/>
            <Tooltip formatter={(value)=>[formatter(value),kind==='lst'?'Surface temperature (°C)':kind==='ndvi'?'NDVI':'Priority /100']} labelFormatter={label=>String(label)}/>
            <Bar isAnimationActive={false} dataKey="value" radius={[4,4,0,0]}>{data.map(z=><Cell key={z.id} fill={z.id===selected?'#164f3d':'#88b7a2'}/>)}</Bar>
        </BarChart>
    </ResponsiveContainer></div><p className="source-note">{data.length} valid zones shown; {records.length-data.length} excluded for Insufficient Data. Hover for full Zone IDs and values.</p></div>;
}
export function EnvironmentScatter({records,selected,onSelect,minimum=DEFAULT_MIN_COVERAGE}:{records:Zone[];selected:string;onSelect:(id:string)=>void;minimum?:number}) {
    const data=chartRecords(records,minimum), axis=temperatureAxis(data.map(z=>z.lst_c));
    if(!data.length)return <p className="source-note">Insufficient Data — no valid paired observations.</p>;
    return <ResponsiveContainer width="100%" height={320}><ScatterChart margin={{top:20,right:28,bottom:38,left:16}}>
        <CartesianGrid stroke="#edf0ee"/>
        <XAxis type="number" dataKey="ndvi" name="NDVI" domain={[-1,1]} ticks={[-1,-.5,0,.5,1]} tickFormatter={ndviText} tick={{fontSize:11}} minTickGap={25} height={42} label={{value:'NDVI',position:'bottom',offset:12}}/>
        <YAxis type="number" dataKey="lst_c" name="Surface temperature" domain={axis.domain} ticks={axis.ticks} tickFormatter={temperatureTickText} tick={{fontSize:11}} minTickGap={18} width={64}/>
        <Tooltip content={({active,payload})=>{const z=payload?.[0]?.payload as typeof data[number]|undefined;return active&&z?<div className="panel" style={{padding:12}}><b>{z.id}</b><p>Surface temperature: {temperatureText(z.lst_c)} °C</p><p>NDVI: {ndviText(z.ndvi)}</p></div>:null;}}/>
        <Scatter isAnimationActive={false} name="Selected study zones" data={data} onClick={z=>onSelect(z.id)}>{data.map(z=><Cell key={z.id} fill={z.id===selected?'#dc9a62':'#176b52'}/>)}</Scatter>
    </ScatterChart></ResponsiveContainer>;
}
