import { loadGeoJSON, type Zone } from './loader.ts';
import { zones, source, demoDataset } from './zones.ts';
export type PlanningDataset = { id: string; title: string; mode: 'demo' | 'real'; zones: Zone[]; issues: string[]; originalGeoJSON?: unknown };
export const DEMO_DATASET: PlanningDataset = { id: source.id, title: source.title, mode: 'demo', zones, issues: demoDataset.issues };
export const EMPTY_REAL_DATASET: PlanningDataset = { id: 'real-unloaded', title: 'Real GIS Study Area — no observations imported', mode: 'real', zones: [], issues: [] };
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/** Local import is an assertion by the file provider, never independent satellite verification. */
export function importStudyArea(text: string, filename: string): PlanningDataset {
    if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('GeoJSON exceeds the 5 MB local import limit.');
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { throw new Error('Invalid JSON. Select a GeoJSON FeatureCollection.'); }
    if (!raw || typeof raw !== 'object' || !('type' in raw) || raw.type !== 'FeatureCollection' || !('features' in raw) || !Array.isArray(raw.features)) throw new Error('Expected a GeoJSON FeatureCollection.');
    if (raw.features.length > 500) throw new Error('This prototype supports at most 500 imported zones. Split the study area.');
    // Only absent provenance defaults to the import mode; explicit synthetic/unknown claims remain excluded.
    const features = raw.features.map(f => {
        if (!f || typeof f !== 'object') return f;
        const p = f.properties && typeof f.properties === 'object' && !Array.isArray(f.properties) ? f.properties : {};
        return { ...f, properties: { ...p, data_status: p.data_status ?? 'observed' } };
    });
    const loaded = loadGeoJSON({ type: 'FeatureCollection', features });
    const records = loaded.zones.filter(z => z.data_status === 'observed');
    const issues = [...loaded.issues];
    for (const z of loaded.zones.filter(z => z.data_status !== 'observed')) issues.push(z.zone_id + ': excluded from real dataset; valid observed date/source declaration required.');
    for (const z of records) if (z.landcover === 'Unknown') issues.push(z.zone_id + ': missing land cover; verify before planning.');
    if (!records.length) throw new Error('No usable observed records. Check polygon geometry, unique zone_id, observation_date (YYYY-MM-DD), data_source and data_status. ' + issues.slice(0, 5).join(' '));
    return { id: 'local-' + filename, title: filename, mode: 'real', zones: records, issues, originalGeoJSON: raw };
}
export function selectDataset(mode: 'demo' | 'real', imported: PlanningDataset | null): PlanningDataset {
    return mode === 'demo' ? DEMO_DATASET : imported ?? EMPTY_REAL_DATASET;
}
