export function calculateTheoreticalConsumption(
  packageLengthMm: number,
  diameterMm: number
): number {
  const PI = Math.PI;
  const STEEL_DENSITY = 7.85;
  const consumption = (packageLengthMm * Math.pow(diameterMm, 2) * PI * STEEL_DENSITY) / 4_000_000;
  return Math.round(consumption * 100) / 100;
}

export function generateOrderNumber(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}
