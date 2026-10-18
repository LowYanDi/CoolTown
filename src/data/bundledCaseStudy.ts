import { CASE_FILENAME,loadCaseStudy } from './caseStudyModel';
// Optional globs: a missing asset must not cause a build-time import failure.
const contents=import.meta.glob('../assets/case-studies/*.geojson',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const urls=import.meta.glob('../assets/case-studies/*.geojson',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
const path='../assets/case-studies/'+CASE_FILENAME;
export const bundledCaseStudy=loadCaseStudy(contents[path]);
export const caseStudyAssetURL=urls[path];
