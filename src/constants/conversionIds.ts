import type { ConversionKind } from './conversionQueue';

/**
 * Los ids de la cola (`conv-001..090`, `drill-001..034`) sin las posiciones.
 *
 * Los usa la tarjeta de Hoy para contar "N para hoy" sin cargar el chunk
 * `conversion-data` (FEN, jugadas, notas). `conversionQueue.test.ts` verifica
 * que esta lista coincide con los dos JSON.
 */
const range = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(3, '0')}`);

export const CONVERSION_IDS: { id: string; kind: ConversionKind }[] = [
  ...range('conv', 90).map(id => ({ id, kind: 'conversion' as const })),
  ...range('drill', 34).map(id => ({ id, kind: 'guide' as const })),
];
