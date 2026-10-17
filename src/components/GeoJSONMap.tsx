import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, Geometry as GeoJSONGeometry } from 'geojson';
import type { Zone } from '../data/loader';
import { environmentalQuality, DEFAULT_MIN_COVERAGE, clamp01 } from '../data/validation';
import { priority } from '../algorithms/planning';

export function GeoJSONMap({ records, selected, onSelect, minimumCoverage = DEFAULT_MIN_COVERAGE, layer = 'Surface temperature', threshold = 36.5 }: {
    records: Zone[]; selected: string; onSelect: (id: string) => void;
    minimumCoverage?: number; layer?: string; threshold?: number;
}) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const polygons = useRef<L.GeoJSON | null>(null);
    const callback = useRef(onSelect);
    callback.current = onSelect;
    const [error, setError] = useState('');
    useEffect(() => {
        if (!container.current || !records.length) return;
        setError('');
        const map = L.map(container.current, { attributionControl: false });
        mapRef.current = map;
        try {
            const features: Feature<GeoJSONGeometry, Zone>[] = records.map(z => ({ type: 'Feature', geometry: z.geometry, properties: z }));
            const collection: import('geojson').FeatureCollection<GeoJSONGeometry, Zone> = { type: 'FeatureCollection', features };
            const group = L.geoJSON(collection, {
                onEachFeature: (feature, polygon) => {
                    const z = feature.properties as Zone;
                    const popup = document.createElement('div');
                    popup.textContent = [z.zone_name, 'Observed data (user declaration)', 'Observation: ' + z.observation_date, 'Source: ' + z.data_source,
                        'Valid coverage: ' + (z.data_coverage ?? 'missing') + '%', 'LST: ' + (z.lst_c ?? 'missing') + ' °C; NDVI: ' + (z.ndvi ?? 'missing'),
                        environmentalQuality(z, minimumCoverage).label, ...environmentalQuality(z, minimumCoverage).reasons].join(' | ');
                    polygon.bindPopup(popup);
                    polygon.on('click', () => callback.current(z.zone_id));
                }
            }).addTo(map);
            polygons.current = group;
            if (group.getBounds().isValid()) map.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 17 });
        } catch { setError('Unable to display imported geometry. Review validation messages.'); }
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(container.current);
        return () => { observer.disconnect(); map.remove(); mapRef.current = null; polygons.current = null; };
    }, [records, minimumCoverage]);
    useEffect(() => {
        polygons.current?.setStyle(feature => {
            const z = feature?.properties as Zone;
            const good = environmentalQuality(z, minimumCoverage).usable;
            let fill = '#c9cecb';
            if (layer === 'Land cover') fill = /vegetation|forest|park/i.test(z.landcover) ? '#80b796' : /water/i.test(z.landcover) ? '#b8d4d4' : '#d2c9ae';
            else if (good) {
                if (layer === 'Vegetation / NDVI') fill = `hsl(151 28% ${83 - clamp01(z.ndvi!) * 45}%)`;
                else if (layer === 'Heat hotspots') fill = z.lst_c! >= threshold ? '#de956e' : '#cad8ca';
                else if (layer === 'Intervention zones') fill = priority(z, minimumCoverage) > 55 ? '#80b89f' : '#d8dfd1';
                else fill = z.lst_c! >= 38 ? '#dd8e6d' : z.lst_c! >= 36 ? '#e4b77c' : z.lst_c! >= 34 ? '#c8cb99' : '#79b797';
            }
            return { color: z.zone_id === selected ? '#164e3f' : '#ffffff', weight: z.zone_id === selected ? 4 : 2, fillColor: fill, fillOpacity: .75 };
        });
    }, [records, selected, minimumCoverage, layer, threshold]);
    return <div>
        <p className="source-note">Observed data supplied locally; source declarations are not independently verified. Gray environmental polygons = Insufficient Data. No external basemap is requested.</p>
        {!records.length && <div className="notice">Observed data has not yet been imported. Choose a local GeoJSON file. No real geographic boundaries or satellite values are included.</div>}
        {error && <p role="alert" className="error">{error}</p>}
        <div ref={container} aria-label="Real GIS study area map" style={{ height: 420, position: 'relative', zIndex: 0, display: records.length ? 'block' : 'none' }}/>
        <div className="zone-candidates">{records.map(z => <button type="button" key={z.zone_id} aria-pressed={z.zone_id === selected} onClick={() => onSelect(z.zone_id)}>{z.zone_name} · {environmentalQuality(z, minimumCoverage).label}</button>)}</div>
    </div>;
}
