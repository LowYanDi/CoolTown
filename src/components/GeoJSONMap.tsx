import { useEffect, useMemo, useRef, useState } from 'react';
import { prepareRealGIS } from '../data/gis';
import { DEFAULT_MIN_COVERAGE } from '../data/validation';

// Small Leaflet 1.9-compatible boundary keeps the optional library out of the default bundle.
// Pass a locally bundled Leaflet namespace and load its CSS in the host. No CDN or tiles fetched here.
type Bounds = { isValid(): boolean };
type MapInstance = { fitBounds(bounds: Bounds, options?: { padding: [number, number] }): unknown; remove(): void; invalidateSize(): unknown };
type Feature = ReturnType<typeof prepareRealGIS>['collection']['features'][number];
type FeatureLayer = { on(event: 'click', callback: () => void): unknown; bindPopup(content: HTMLElement): unknown };
export type LeafletRuntime = {
    map(element: HTMLElement): MapInstance;
    geoJSON(data: ReturnType<typeof prepareRealGIS>['collection'], options: {
        style(feature?: Feature): { color: string; fillColor: string; weight: number; fillOpacity: number };
        onEachFeature(feature: Feature, layer: FeatureLayer): void;
    }): { addTo(map: MapInstance): unknown; getBounds(): Bounds };
};
export function GeoJSONMap({ data, leaflet, selected, onSelect, minimumCoverage = DEFAULT_MIN_COVERAGE }: {
    data: unknown; leaflet?: LeafletRuntime; selected: string; onSelect: (id: string) => void; minimumCoverage?: number;
}) {
    const container = useRef<HTMLDivElement>(null);
    const dataset = useMemo(() => prepareRealGIS(data, minimumCoverage), [data, minimumCoverage]);
    const [error, setError] = useState('');
    useEffect(() => {
        setError('');
        if (!leaflet || !container.current || !dataset.collection.features.length) return;
        let map: MapInstance | undefined;
        let observer: ResizeObserver | undefined;
        try {
            map = leaflet.map(container.current);
            const layer = leaflet.geoJSON(dataset.collection, {
                style: feature => ({ color: feature?.properties.zone_id === selected ? '#164e3f' : '#ffffff', weight: feature?.properties.zone_id === selected ? 4 : 2, fillColor: feature?.properties.quality.usable ? '#80b89f' : '#c9cecb', fillOpacity: .7 }),
                onEachFeature: (feature, polygon) => {
                    const p = feature.properties;
                    const popup = document.createElement('div');
                    // textContent prevents imported source/name strings from injecting HTML.
                    popup.textContent = [p.zone_name, p.quality.label, 'Observation: ' + p.observation_date,
                        'Source: ' + p.data_source, 'Declared provenance: ' + p.data_status,
                        'Valid coverage: ' + (p.data_coverage ?? 'missing') + '%',
                        'LST: ' + (p.lst_c ?? 'missing') + ' °C; NDVI: ' + (p.ndvi ?? 'missing'),
                        ...p.quality.reasons].join(' | ');
                    polygon.bindPopup(popup);
                    polygon.on('click', () => onSelect(p.zone_id));
                }
            });
            layer.addTo(map);
            if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [20, 20] });
            observer = new ResizeObserver(() => map?.invalidateSize());
            observer.observe(container.current);
        } catch { observer?.disconnect(); map?.remove(); map = undefined; setError('Unable to initialise the optional GIS map. Check the Leaflet runtime and stylesheet.'); }
        return () => { observer?.disconnect(); map?.remove(); };
    }, [leaflet, dataset, selected, onSelect]);
    return <section className="panel"><h3>Optional geographic boundaries</h3>
        <p className="source-note">User-supplied observed records; provenance declarations are not independently verified. Gray = Insufficient Data. No basemap service is connected.</p>
        {!leaflet && <p>Leaflet is not configured. The main schematic map remains available.</p>}
        {!dataset.collection.features.length && <p>No observed GeoJSON records supplied. No real boundaries are invented.</p>}
        {dataset.issues.map((issue, i) => <p key={i} className="source-note">{issue}</p>)}
        {error && <p role="alert" className="error">{error}</p>}
        <div ref={container} aria-label="Optional GeoJSON map" style={{ height: 420, display: leaflet && dataset.collection.features.length ? 'block' : 'none' }}/>
        <div className="zone-candidates">{dataset.collection.features.map(f => <button type="button" key={f.properties.zone_id} aria-pressed={f.properties.zone_id === selected} onClick={() => onSelect(f.properties.zone_id)}>{f.properties.zone_name} · {f.properties.quality.label}</button>)}</div>
    </section>;
}
