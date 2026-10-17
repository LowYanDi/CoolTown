import { loadGeoJSON } from './loader.ts';
import { environmentalQuality, DEFAULT_MIN_COVERAGE } from './validation.ts';
/** Explicit real-data handoff. Synthetic/assumed/unknown records never become real GIS features. */
export function prepareRealGIS(input: unknown, minimum = DEFAULT_MIN_COVERAGE) {
    const loaded = loadGeoJSON(input);
    const records = loaded.zones.filter(z => z.data_status === 'observed');
    const issues = [...loaded.issues];
    if (records.length !== loaded.zones.length) issues.push('Non-observed records excluded from optional real GIS layer.');
    return { issues, collection: { type: 'FeatureCollection' as const, features: records.map(z => ({
        type: 'Feature' as const, geometry: z.geometry,
        properties: { ...z, quality: environmentalQuality(z, minimum) }
    })) } };
}
