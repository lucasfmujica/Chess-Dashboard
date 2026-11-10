import type { ConversionKind } from './conversionQueue';

/**
 * Los ids de la cola (`conv-001..090`, `drill-001..035` (guías), `drill-036..064` (clases)) sin las posiciones.
 *
 * Los usa la tarjeta de Hoy para contar "N para hoy" sin cargar el chunk
 * `conversion-data` (FEN, jugadas, notas). `conversionQueue.test.ts` verifica
 * que esta lista coincide con los tres JSON.
 */
const range = (prefix: string, first: number, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${String(first + i).padStart(3, '0')}`);

export const CONVERSION_IDS: { id: string; kind: ConversionKind }[] = [
  ...range('conv', 1, 90).map(id => ({ id, kind: 'conversion' as const })),
  ...range('drill', 1, 35).map(id => ({ id, kind: 'guide' as const })),
  ...range('drill', 36, 29).map(id => ({ id, kind: 'class' as const })),
];
