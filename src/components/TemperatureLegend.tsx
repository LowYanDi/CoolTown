import { temperatureScale } from '../data/temperatureScale';
import type { Zone } from '../data/loader';
export function TemperatureLegend({records,minimum}:{records:Zone[];minimum:number}){
 const scale=temperatureScale(records,minimum);
 return <div className="temperature-legend" aria-label="Relative temperature legend">
 <strong>Surface temperature · °C</strong>
 {!scale?<p>No quality-valid temperature observations. Gray = Insufficient Data.</p>:<>
 <div aria-hidden="true" style={{height:12,borderRadius:4,margin:'8px 0',background:scale.stops.length===1?scale.stops[0].color:`linear-gradient(to right, ${scale.stops.map(s=>s.color).join(', ')})`}}/>
 <div style={{display:'flex',justifyContent:'space-between',gap:12}}><span title={String(scale.min)+' °C'}>Min {scale.min.toFixed(1)}°C</span><span title={String(scale.max)+' °C'}>Max {scale.max.toFixed(1)}°C</span></div>
 <p className="source-note">{scale.min===scale.max?'All valid observations are equal; one colour is used. ':scale.max-scale.min<.1?'Range is below 0.1°C; rounded labels may match. Hover endpoints for full precision. ':''}Relative colours within this dataset ({scale.count} quality-valid zones), not scientifically validated thermal risk categories. Gray / dashed = Insufficient Data. Hotspot threshold is independent.</p>
 </>}
 </div>;
}
