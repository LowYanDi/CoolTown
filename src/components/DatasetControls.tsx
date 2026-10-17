import { warningGroups } from '../data/presentation';
import { DEFAULT_MIN_COVERAGE } from '../data/validation';
import { useRef, useState } from 'react';
import { importStudyArea, MAX_IMPORT_BYTES, type PlanningDataset } from '../data/dataset';
export function DatasetControls({ mode, onMode, imported, onImport, minimumCoverage = DEFAULT_MIN_COVERAGE }: {
    minimumCoverage?: number; mode: 'demo' | 'real'; onMode: (mode: 'demo' | 'real') => void;
    imported: PlanningDataset | null; onImport: (dataset: PlanningDataset) => void;
}) {
    const groups = warningGroups(imported?.zones ?? [], minimumCoverage);
    const otherIssues = imported?.issues.filter(issue => !/solar|lst_c|ndvi|coverage|site|planting_area|estimated_usable_area|area_ha/i.test(issue)) ?? [];
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const ticket = useRef(0);
    return <section className="panel">
        <div className="layer-tabs" role="group" aria-label="Study dataset">
            <button type="button" aria-pressed={mode === 'demo'} className={mode === 'demo' ? 'selected' : ''} onClick={() => onMode('demo')}>Synthetic Demo Map</button>
            <button type="button" aria-pressed={mode === 'real'} className={mode === 'real' ? 'selected' : ''} onClick={() => onMode('real')}>Real GIS Study Area</button>
        </div>
        <label className="field"><span>Import local GeoJSON</span><input aria-label="Import local GeoJSON" type="file" accept=".geojson,.json,application/geo+json,application/json" disabled={busy} onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
            const current = ++ticket.current; setError(''); setBusy(true);
            try {
                if (file.size > MAX_IMPORT_BYTES) throw new Error('File exceeds the 5 MB local import limit.');
                const result = importStudyArea(await file.text(), file.name);
                if (ticket.current === current) onImport(result);
            } catch (err) { if (ticket.current === current) setError(err instanceof Error ? err.message : 'Unable to read GeoJSON.'); }
            finally { if (ticket.current === current) setBusy(false); }
        }}/></label>
        <p className="source-note">Files stay in this browser session and are never uploaded to a server. Imported observations are user-declared, not independently verified. Valid records replace the active study dataset; invalid records are skipped or flagged. Refreshing clears the import.</p>
        {busy && <p role="status">Validating GeoJSON…</p>}
        {error && <p role="alert" className="error">{error} The last accepted dataset is unchanged.</p>}
        {imported && <p>{imported.title}: {imported.zones.length} observed zones accepted; {groups.filter(g=>g.details.length).length} warning categories.</p>}
        {imported && <div><p className="source-note">These summaries describe the imported records, not separately saved site assessments. Missing imported solar inputs disable imported Solar Screening only. They do not invalidate usable Landsat / Sentinel-2 observations. Site warnings affect construction candidates, not environmental quality.</p>{groups.map(group=><details key={group.name}><summary>{group.name} — {group.details.length} zones</summary>{group.details.length ? <ul>{group.details.map(d=><li key={d.zone}><b>{d.zone}</b>: {d.message}</li>)}</ul> : <p>No warnings in this category.</p>}</details>)}{otherIssues.length>0 && <details><summary>Other import / rejected-record messages — {otherIssues.length}</summary><ul>{otherIssues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details>}</div>}
        <details><summary>Required GeoJSON properties</summary><p>WGS84 FeatureCollection with Polygon/MultiPolygon geometry, coordinates [longitude, latitude], unique zone_id, lst_c (°C), ndvi (−1 to 1), landcover, data_coverage (0–100%), observation_date (YYYY-MM-DD), data_source. Missing data_status is treated as a user-declared observed import only when date and source are valid. Explicit synthetic/assumed/unknown records are excluded.</p><p>Optional area_ha supports area-weighted summaries; missing area stays unknown. Site/planting areas, exposure and solar_inputs must be supplied explicitly for relevant intervention eligibility. No solar suitability is inferred from satellite heat.</p></details>
    </section>;
}
