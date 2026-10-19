import { PENINSULAR_2024, EMPTY_GRID, EMPTY_FINANCE, type GridAssumptions, type FinancialInputs } from './impact.ts';
import type { Candidate } from './planning.ts';

/** Illustrative review prompts, not tariff limits, scientific bounds or input restrictions. */
export const PLAUSIBILITY_POLICY = 'Advisory only. Review factor > 1.5 kgCO2e/kWh, electricity prices > RM2/kWh, export price above avoided price, annual O&M > 20% of installation cost, installation outside 0.25–4 times the selected estimate, or simple payback below one year. These illustrative prompts never change inputs or calculations.';
export const DEMO_CLARITY = 'Satellite observations are historical. Guided Demo rooftop, parking and planting spaces are hypothetical, not facilities identified by satellite. Carbon and financial estimates depend on declared assumptions. Site ownership, engineering feasibility and actual environmental outcomes are not independently verified.';
export function safeReferenceURL(reference: string): string | null {
 try { const u = new URL(reference.trim()); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function referenceReview(reference: string): string[] {
 if (!reference.trim()) return ['Source reference missing. Add a publisher/provider, document title, date and link or document identifier.'];
 if (!safeReferenceURL(reference) && /\b(?:hypothetical|demo|example|test|assumed|assumption)\b/i.test(reference)) return ['This reference describes hypothetical assumptions, not a verified factor or electricity tariff.'];
 if (!safeReferenceURL(reference) && !(reference.trim().length >= 30 && /\b(?:19|20)\d{2}\b/.test(reference))) return ['Source traceability is unclear. Add publisher/provider, document title, date and a URL or document identifier.'];
 return ['Reference supplied; its credibility, applicability and contents have not been independently verified.'];
}
/** Fresh opt-in object; the factor is sourced, but displacement is explicitly hypothetical. */
export function hypotheticalCarbonDemo(): GridAssumptions {
 return {...PENINSULAR_2024, displacementPercent:100, displacementNote:'HYPOTHETICAL CARBON DEMO: assume 100% of estimated solar generation displaces Peninsular Malaysia grid electricity. This is not verified usage, export or contractual evidence; assess applicability before any claim.'};
}
export function carbonWarnings(grid: GridAssumptions = EMPTY_GRID): string[] {
 const warnings = referenceReview(grid.source);
 if (Number.isFinite(grid.factor) && grid.factor! > 1.5) warnings.push('Unusually high grid factor (>1.5 kgCO2e/kWh). Check units, year, grid region and source; your value has not been changed.');
 if (grid.displacementPercent === 100) warnings.push('100% displacement assumes all estimated generation replaces grid electricity. Verify self-consumption, exports, curtailment and contractual treatment.');
 return warnings;
}
export function financialWarnings(input: FinancialInputs = EMPTY_FINANCE, candidate?: Candidate, payback?:number|null): string[] {
 const warnings = referenceReview(input.source);
 if ([input.price,input.exportPrice].some(v=>v!==null&&Number.isFinite(v)&&v>2)) warnings.push('High electricity value (>RM2/kWh). Check units, customer category and applicable electricity arrangement; this is not a universal tariff ceiling.');
 if (input.price!==null && input.exportPrice!==null && input.exportPrice>input.price) warnings.push('Export compensation exceeds avoided electricity value. Confirm both rates apply to this arrangement.');
 if (input.installation!==null && input.installation>0 && input.om!==null && input.om>input.installation*.2) warnings.push('Annual O&M exceeds 20% of installation cost. Check annual versus lifetime amounts.');
 if (candidate && candidate.cost>0 && input.installation!==null && Number.isFinite(input.installation) && (input.installation<candidate.cost*.25 || input.installation>candidate.cost*4)) warnings.push('Installation cost differs substantially from the selected proposal estimate (outside 0.25–4 times). Check scope, units and supplier evidence.');
 if (payback!==null && payback!==undefined && Number.isFinite(payback) && payback<1) warnings.push('Simple payback is below one year. Review costs, tariffs and generation assumptions; this is not verified savings.');
 if (input.selfConsumption===100) warnings.push('100% self-consumption needs an appropriate demand profile; it is a user assumption, not measured consumption.');
 return warnings;
}

