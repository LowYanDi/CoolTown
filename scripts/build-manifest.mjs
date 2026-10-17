import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]);
const hash = file => createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
const sources = [...walk('src'), ...walk('scripts'), 'package.json', 'package-lock.json', 'index.html', 'tsconfig.json', 'vite.config.ts'];
const assets = walk('dist');
const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="\/([^"?]+)"/g)) {
    if (!existsSync(join(root, 'dist', match[1]))) throw new Error('Build references missing asset: ' + match[1]);
}
writeFileSync(join(root, 'BUILD-MANIFEST.json'), JSON.stringify({ generated_at: new Date().toISOString(), node: process.version, build_command: 'tsc --noEmit && vite build --configLoader native', source_sha256: Object.fromEntries(sources.map(f => [f, hash(f)])), dist_sha256: Object.fromEntries(assets.map(f => [f, hash(f)])) }, null, 2));
console.log('Build manifest regenerated for ' + assets.length + ' production files.');
