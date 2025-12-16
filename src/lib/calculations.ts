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
// UE için --> UE-{DieNumber}-{Sequence}
// UE-212-001 --> 212 numaralı kalıbın 1. üretim emri
// IE için --> IE-{ProductionOrderSequence}-{ComponentSequence}
// IE-212-001-03 --> 212 numaralı kalıbın 1. üretim emrinin 3. bileşeni için iş emri


// UE numarası: UE-1100-001
export function generateProductionOrderNumber(
  dieNumber: string,
  sequence: number,
): string {
  const seq = String(sequence).padStart(3, '0'); // 1 → 001
  return `UE-${dieNumber}-${seq}`;
}

// IE numarası: IE-1100-001-02
export function generateWorkOrderNumber(
  dieNumber: string,
  productionSequence: number,
  componentSequence: number,
): string {
  const prodSeq = String(productionSequence).padStart(3, '0');
  const compSeq = String(componentSequence).padStart(2, '0');
  return `IE-${dieNumber}-${prodSeq}-${compSeq}`;
}
