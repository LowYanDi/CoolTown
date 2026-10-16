import { finite, inRange, validLST, validNDVI } from './validation.ts';
export type Evidence = 'synthetic' | 'observed' | 'assumed' | 'unknown';
export type Geometry = {
    type: 'Polygon';
    coordinates: number[][][];
} | {
    type: 'MultiPolygon';
    coordinates: number[][][][];
};
export type SolarInputs = {
    density: number | null;
    yield: number | null;
    factor: number | null;
    cost: number | null;
    suitable: boolean | null;
    status: Evidence;
    source: string;
};
export type Zone = {
    zone_id: string;
    zone_name: string;
    geometry: Geometry;
    lst_c: number | null;
    ndvi: number | null;
    data_coverage: number | null;
    landcover: string;
    site_type: string;
    site_verified: boolean;
    estimated_usable_area: number;
    area_ha: number;
    planting_area: number;
    roof_exposure: boolean;
    shade_deficit: boolean;
    solar_inputs: SolarInputs;
    data_status: Evidence;
    observation_date: string | null;
    data_source: string;
    site_input_status: Evidence;
    issues: string[];
};
type Dict = Record<string, unknown>;
const object = (v: unknown): Dict => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Dict : {};
const label = (v: unknown, fallback: string) => typeof v === 'string' && v.trim() ? v.trim() : fallback;
function date(value: unknown): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? value : null;
}
function evidence(v: unknown): Evidence {
    return v === 'synthetic' || v === 'observed' || v === 'assumed' ? v : 'unknown';
}
function ring(v: unknown): boolean {
    if (!Array.isArray(v) || v.length < 4)
        return false;
    if (!v.every(p => Array.isArray(p) && p.length >= 2 && inRange(p[0], -180, 180) !== null && inRange(p[1], -90, 90) !== null))
        return false;
    const first = v[0], last = v[v.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1])
        return false;
    let area = 0;
    for (let i = 0; i < v.length - 1; i++)
        area += v[i][0] * v[i + 1][1] - v[i + 1][0] * v[i][1];
    return Math.abs(area) > 1e-12;
}
const polygon = (v: unknown): boolean => Array.isArray(v) && v.length > 0 && v.every(ring);
function geometry(v: unknown): Geometry | null {
    const g = object(v);
    if (g.type === 'Polygon' && polygon(g.coordinates))
        return g as unknown as Geometry;
    if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(polygon))
        return g as unknown as Geometry;
    return null;
}
/** Local-only GeoJSON adapter. It validates structure, not topology, survey accuracy or provenance authenticity. */
export function loadGeoJSON(input: unknown): {
    zones: Zone[];
    issues: string[];
} {
    const collection = object(input);
    if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features))
        return { zones: [], issues: ['Expected a GeoJSON FeatureCollection.'] };
    const zones: Zone[] = [], issues: string[] = [], ids = new Set<string>();
    collection.features.forEach((raw, index) => {
        const feature = object(raw), p = object(feature.properties), g = geometry(feature.geometry);
        const id = label(p.zone_id, '');
        if (feature.type !== 'Feature' || !g || !id || ids.has(id)) {
            issues.push(`Feature ${index}: invalid geometry, missing ID or duplicate ID; skipped.`);
            return;
        }
        ids.add(id);
        const warnings: string[] = [];
        const read = (key: string, min: number, max: number) => { const value = inRange(p[key], min, max); if (value === null)
            warnings.push(`${key}: missing or invalid`); return value; };
        let lst = validLST(p.lst_c), ndvi = validNDVI(p.ndvi);
        if (lst === null)
            warnings.push('lst_c: missing or invalid');
        if (ndvi === null)
            warnings.push('ndvi: missing or outside [-1, 1]');
        const coverage = read('data_coverage', 0, 100);
        if (coverage === 0) {
            lst = null;
            ndvi = null;
            warnings.push('Zero coverage: environmental indicators unavailable.');
        }
        const observed = date(p.observation_date), source = label(p.data_source, 'Unknown source');
        let status = evidence(p.data_status);
        if (status === 'observed' && (!observed || source === 'Unknown source')) {
            status = 'unknown';
            warnings.push('Observed claim lacks valid observation date or source.');
        }
        const s = object(p.solar_inputs);
        const solar: SolarInputs = { density: inRange(s.density, 0, .3), yield: inRange(s.yield, 0, 3000), factor: inRange(s.factor, 0, 1), cost: inRange(s.cost, 0, 100000), suitable: typeof s.suitable === 'boolean' ? s.suitable : null, status: evidence(s.status), source: label(s.source, 'Unknown solar source') };
        if ([solar.density, solar.yield, solar.factor, solar.cost].some(v => v === null) || solar.suitable === null)
            warnings.push('Solar inputs or installation suitability missing/invalid. Solar screening unavailable.');
        const z: Zone = { zone_id: id, zone_name: label(p.zone_name, id), geometry: g, lst_c: lst, ndvi, data_coverage: coverage, landcover: label(p.landcover, 'Unknown'), site_type: label(p.site_type, 'Unknown'), site_verified: p.site_verified === true, estimated_usable_area: read('estimated_usable_area', 0, 1e8) ?? 0, area_ha: read('area_ha', 0, 1e6) ?? 0, planting_area: read('planting_area', 0, 1e8) ?? 0, roof_exposure: p.roof_exposure === true, shade_deficit: p.shade_deficit === true, solar_inputs: solar, data_status: status, observation_date: observed, data_source: source, site_input_status: evidence(p.site_input_status), issues: warnings };
        zones.push(z);
        issues.push(...warnings.map(w => `${id}: ${w}`));
    });
    return { zones, issues };
}
export function parseGeoJSON(text: string) {
    try {
        return loadGeoJSON(JSON.parse(text));
    }
    catch {
        return { zones: [], issues: ['Invalid JSON.'] };
    }
}
