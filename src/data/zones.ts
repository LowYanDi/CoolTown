import { loadGeoJSON } from './loader.ts';
export type { Zone } from './loader.ts';
// Illustrative coordinates near Klang Valley, Malaysia. Not surveyed parcel boundaries.
const rows: [
    string,
    number,
    number,
    string,
    string,
    number,
    number,
    number,
    boolean
][] = [['Civic quarter', 38.2, .18, 'Built-up', 'Public walkway', 1200, 18, 1400, true], ['Taman residential', 35.4, .36, 'Residential', 'Roof', 220, 24, 0, true], ['Central commons', 31.8, .72, 'Vegetation', 'Park', 0, 22, 0, false], ['Commercial district', 39.1, .12, 'Commercial', 'Roof', 360, 16, 0, true], ['Transit interchange', 37.6, .21, 'Paved', 'Parking', 180, 12, 700, false], ['Western neighbourhood', 34.7, .43, 'Residential', 'Roof', 160, 26, 900, true], ['Riverside reserve', 30.6, .81, 'Vegetation', 'Reserve', 0, 30, 0, false], ['Community campus', 36.8, .29, 'Institutional', 'Roof', 280, 20, 1100, true]];
const records = rows.map((r, i) => { const x = 101.52 + (i % 4) * .007, y = 3.08 + Math.floor(i / 4) * .007; return { zone_id: `Z00${i + 1}`, zone_name: r[0], geometry: { type: 'Polygon', coordinates: [[[x, y], [x + .006, y], [x + .006, y + .006], [x, y + .006], [x, y]]] }, lst_c: r[1], ndvi: r[2], data_coverage: 100, landcover: r[3], site_type: r[4], estimated_usable_area: r[5], area_ha: r[6], planting_area: r[7], roof_exposure: r[8], site_verified: false, solar_inputs: { density: .16, yield: 1300, factor: .85, cost: 3200, suitable: true, status: 'assumed', source: 'Demo solar assumptions; no measured irradiation' }, data_status: 'synthetic', observation_date: null, data_source: 'Local synthetic demonstration v1', site_input_status: 'assumed', shade_deficit: r[1] > 36 }; });
export const source = { id: 'klang-valley-illustrative-v1', title: 'Klang Valley · Illustrative township', status: 'Synthetic demonstration', description: 'Eight invented planning zones; no satellite observations or verified developer locations.' };
export const demoGeoJSON = { type: 'FeatureCollection', features: records.map(({ geometry, ...properties }) => ({ type: 'Feature', geometry, properties })) };
export const demoDataset = loadGeoJSON(demoGeoJSON);
export const zones = demoDataset.zones;
