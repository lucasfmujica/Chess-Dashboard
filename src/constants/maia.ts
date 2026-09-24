import type { BlunderDrill } from '../types/blunders';

/**
 * Qué tan encontrable tiene que ser la solución para que el drill entre.
 *
 * Los drills se minan por pérdida de centipeones, así que los más grandes
 * suelen ser tácticas profundas cuya solución un humano de esta banda no ve: en
 * este set, los que tienen menos de 2% de policy en Maia promedian 1215cp de
 * pérdida. Entrenar con eso frustra y no enseña, pero mirarlos sí sirve, así que
 * se filtran en vez de borrarlos.
 *
 * El umbral es policy de Maia-1900, que es rating de LICHESS (~1750-1800 FIDE).
 * Debajo de esto, la solución es prácticamente invisible en el tablero.
 */
export const ENGINE_ONLY_POLICY = 0.02;

/** Solución que sólo ve el motor. Sin policy calculada no cuenta como tal. */
export const isEngineOnly = (d: BlunderDrill): boolean =>
  d.maiaPolicy !== undefined && d.maiaPolicy < ENGINE_ONLY_POLICY;
