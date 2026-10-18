export { INSUFFICIENT_COLOR as INSUFFICIENT } from './temperatureScale.ts';
import { INSUFFICIENT_COLOR as INSUFFICIENT } from './temperatureScale.ts';
export const landPalette = {'Tree cover':'#165b33',Shrubland:'#79852f',Grassland:'#a6cb67',Cropland:'#efd048','Built-up':'#b85454','Bare land':'#b88858',Water:'#246db6',Wetland:'#54bfd1',Mangroves:'#147f79','Other / Unknown':'#727a80'};
export function landCategory(value:string):keyof typeof landPalette{
 const s=value.trim().toLowerCase().replaceAll('_',' ').replaceAll('-',' ');
 if(/mangrove/.test(s))return 'Mangroves';if(/wetland|herbaceous wet/.test(s))return 'Wetland';if(/water|river|lake/.test(s))return 'Water';
 if(/tree cover|forest|woodland/.test(s))return 'Tree cover';if(/shrub/.test(s))return 'Shrubland';if(/grass|park|^(vegetation)$/.test(s))return 'Grassland';if(/crop/.test(s))return 'Cropland';if(/built|urban|residential|commercial/.test(s))return 'Built-up';if(/bare|sparse/.test(s))return 'Bare land';return 'Other / Unknown';
}
export const ndviStops=[{value:-1,color:'#88441b'},{value:0,color:'#b7772d'},{value:.3,color:'#f3d34a'},{value:.6,color:'#72ae42'},{value:1,color:'#126438'}];
export function ndviColor(value:number|null){
 if(value===null||!Number.isFinite(value)||value< -1||value>1)return INSUFFICIENT;
 const hi=ndviStops.findIndex(s=>s.value>=value);if(hi===0)return ndviStops[0].color;
 const a=ndviStops[hi-1],b=ndviStops[hi],t=(value-a.value)/(b.value-a.value);
 return '#'+[1,3,5].map(i=>Math.round(parseInt(a.color.slice(i,i+2),16)*(1-t)+parseInt(b.color.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
}
export const stageColors={opportunity:'#3584bd',preliminary:'#e6a126',verified:'#16724a',none:'#e6dfd0'};
export const hotspotColors={hot:'#c74a35',below:'#79aaba'};
export const overlayVisible=(layer:string)=>layer!=='Satellite only';
