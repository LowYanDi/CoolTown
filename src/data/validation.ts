/** Missing values stay missing. Out-of-range observations are rejected, not clamped. */
export function finite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}
export function inRange(value: unknown, min: number, max: number): number | null {
    return finite(value) && value >= min && value <= max ? value : null;
}
export const validNDVI = (value: unknown) => inRange(value, -1, 1);
// Broad ingestion sanity bounds, not heat-classification thresholds.
export const validLST = (value: unknown) => inRange(value, -100, 100);
export const clamp01 = (value: number) => finite(value) ? Math.max(0, Math.min(1, value)) : 0;
export function vegetationDeficit(value: unknown): number | null {
    const ndvi = validNDVI(value);
    // Negative NDVI is valid (e.g. water); do not infer plantability from it.
    return ndvi === null ? null : 1 - clamp01(ndvi);
}
export function weightedMean(records: {
    value: number | null;
    weight: number;
}[]): number | null {
    const usable = records.filter(r => finite(r.value) && finite(r.weight) && r.weight > 0);
    const denominator = usable.reduce((sum, r) => sum + r.weight, 0);
    if (!denominator)
        return null;
    const result = usable.reduce((sum, r) => sum + r.value! * (r.weight / denominator), 0);
    return finite(result) ? result : null;
}
export const displayNumber = (value: number | null, digits = 2) => finite(value) ? value.toFixed(digits) : 'Insufficient Data';

/** Illustrative quality policy, not a scientifically validated satellite standard. */
export const DEFAULT_MIN_COVERAGE = 80;
export const COVERAGE_POLICY = 'Require valid LST, NDVI and valid satellite coverage at or above the configured minimum (default 80%). Illustrative data-quality requirement, not scientific certification. Synthetic records remain synthetic.';
export function coverageThreshold(value = DEFAULT_MIN_COVERAGE): number {
    return inRange(value, 0, 100) ?? DEFAULT_MIN_COVERAGE;
}
export function environmentalQuality(z: { lst_c: unknown; ndvi: unknown; data_coverage: unknown }, minimum = DEFAULT_MIN_COVERAGE) {
    const min = coverageThreshold(minimum), coverage = inRange(z.data_coverage, 0, 100);
    const reasons: string[] = [];
    if (coverage === null) reasons.push('Valid satellite coverage is missing or invalid.');
    else if (coverage <= 0 || coverage < min) reasons.push('Valid satellite coverage is below the required minimum.');
    if (validLST(z.lst_c) === null) reasons.push('Valid surface temperature is missing.');
    if (validNDVI(z.ndvi) === null) reasons.push('Valid NDVI is missing.');
    return { usable: reasons.length === 0, label: reasons.length ? 'Insufficient Data' : 'Meets illustrative quality rule', minimum: min, coverage, reasons };
}
