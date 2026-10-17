import type { Zone } from '../data/loader.ts';
import { environmentalQuality, DEFAULT_MIN_COVERAGE, finite } from '../data/validation.ts';
export type Opportunity = {id:string;zone:string;name:string;reason:string;required:string;stage:'preliminary';budgetEligible:false};
export function preliminaryOpportunities(records: Zone[], threshold: number, minimum=DEFAULT_MIN_COVERAGE): Opportunity[] {
    return records.flatMap(z=>{
        if(!environmentalQuality(z,minimum).usable)return [];
        const cover=z.landcover.toLowerCase().trim();
        if(!cover || cover==='unknown')return [];
        const result:Opportunity[]=[];
        const add=(name:string,reason:string,required:string)=>result.push({id:z.zone_id+'-'+name,zone:z.zone_id,name,reason,required,stage:'preliminary',budgetEligible:false});
        const water=/water|wetland|river|lake|air sungai/.test(cover);
        if(!water && finite(threshold) && z.lst_c!>=threshold && z.ndvi!<.4) add('Investigate shade trees / green corridors','Quality-screened heat and vegetation deficit indicate a potential cooling need in '+z.landcover+'.','Verify plantable area, ownership, utilities and site suitability before costing.');
        if(/built|urban|residential|commercial|institution|perumahan|bangunan/.test(cover) && finite(threshold) && z.lst_c!>=threshold) add('Investigate reflective roofs / public shade','Heat in built land cover suggests a cooling investigation; land cover does not establish roof availability.','Survey roof type, usable area, exposure and structural suitability.');
        if(!water && z.ndvi!>.7) add('Investigate biodiversity conservation','High NDVI suggests vegetation worth ecological assessment; NDVI is not a species survey.','Verify habitat, conservation area, site management feasibility and costs.');
        return result;
    });
}
/** Synthetic demo can illustrate assumed projects; actual observed projects require explicit verification. */
export function constructionEvidence(z: Zone) {
    return z.site_input_status !== 'unknown' && (z.data_status === 'synthetic' || z.site_verified === true);
}
