import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(join(root,'BUILD-MANIFEST.json'),'utf8'));
const hash=file=>createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
let checked=0;
for(const group of ['source_sha256','dist_sha256'])for(const [file,expected]of Object.entries(manifest[group])){
 if(hash(file)!==expected)throw Error('Manifest hash mismatch: '+file);
 checked++;
}
const walk=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
if(JSON.stringify(walk('dist').sort())!==JSON.stringify(Object.keys(manifest.dist_sha256).sort()))throw Error('Unrecorded or missing production assets.');
const original='src/assets/case-studies/CoolTown_Real_Zones_2026.geojson';
if(manifest.source_sha256[original]){
 const bundled=Object.keys(manifest.dist_sha256).find(file=>/\/CoolTown_Real_Zones_2026-[^/]+\.geojson$/.test(file));
 if(!bundled||hash(bundled)!==hash(original))throw Error('Bundled case-study asset differs from the supplied original.');
}
console.log(`Verified ${checked} source/production hashes and complete production asset inventory.`);
