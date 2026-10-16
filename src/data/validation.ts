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
export const displayNumber = (value: number | null, digits = 2) => finite(value) ? value.toFixed(digits) : 'Unavailable';
