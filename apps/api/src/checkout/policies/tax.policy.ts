export const DEFAULT_GST_RATE = 0.05;

export function calculateTax(params: {
  taxableAmount: number;
  rate?: number;
}): number {
  const rate = params.rate ?? DEFAULT_GST_RATE;
  return Math.round(params.taxableAmount * rate * 100) / 100;
}

export function resolveActiveTaxRate(rates: number[]): number {
  if (rates.length === 0) return DEFAULT_GST_RATE;
  return rates[0] ?? DEFAULT_GST_RATE;
}
