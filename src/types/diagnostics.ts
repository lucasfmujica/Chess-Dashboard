/** Una de las tres jugadas que Stockfish considera mejores en la posición. */
export interface SfCandidate {
  rank: number;
  moveSan: string;
  moveUci: string;
  /** Centipeones desde MI perspectiva: positivo es mejor para mí. */
  evalCp: number;
  /**
   * La variante que sostiene la evaluación, en SAN con numeración
   * ("10...Bf5 11. Qd1 Ne4"). Es lo que convierte "Bf5 era mejor" en una
   * explicación. Ausente en filas analizadas antes de que se guardara.
   */
  line?: string;
  /** Probabilidad 0..1 que Maia-1900 le da a esta jugada: qué tan encontrable es. */
  maiaPolicy?: number;
}

/**
 * Categorías del diagnóstico. El punto de cruzar Stockfish con Maia-1900 es
 * separar por qué fallé, no solo cuánto:
 *
 *  - brecha_conceptual: jugué la jugada top de Maia-1900 y estaba mal. Es un
 *    error compartido por toda una banda de rating, no un descuido mío.
 *
 *    Los ratings de Maia son de LICHESS, no FIDE: 1900 de Lichess es del orden
 *    de 1750-1800 FIDE, algo por debajo de 1880 FIDE. Por eso los textos dicen
 *    "un jugador online de ~1900" y no "un 1900" a secas.
 *  - jugada_inhumana: la jugada de Stockfish casi no aparece en la policy de
 *    Maia. El motor ve algo fuera del radar humano.
 *  - error_propio: el resto de las pérdidas grandes.
 */
export type DiagnosticCategory = 'brecha_conceptual' | 'jugada_inhumana' | 'error_propio';

export interface PositionDiagnostic {
  id: string;
  gameId: string;
  /** Ply 1-based de mi jugada, misma convención que blunder_drills. */
  ply: number;
  /** Número de jugada completa, para hablar como la planilla. */
  moveNumber: number;
  /** FEN de la posición ANTES de mi jugada. */
  fen: string;
  movePlayed: string;
  cpLoss: number;
  sfTop3: SfCandidate[];
  maiaTopMove: string;
  /** Probabilidad 0..1 que Maia-1900 le da a la jugada que jugué. */
  maiaPolicyPlayed?: number;
  /** Probabilidad 0..1 que Maia-1900 le da a la jugada top de Stockfish. */
  maiaPolicySfTop?: number;
  category: DiagnosticCategory;
  createdAt: number;
}

/** Un pedido de análisis encolado desde la app, pendiente de correr localmente. */
export interface DiagnosticRequest {
  gameId: string;
  requestedAt: number;
  /** Re-analizar una partida ya hecha. */
  force: boolean;
}

/** Lo que el script ya analizó, para saber si vale la pena pedir de nuevo. */
export interface DiagnosticRun {
  gameId: string;
  analyzedAt: number;
  depth: number;
  positions: number;
  findings: number;
}

export interface DiagnosticsStatus {
  requested: DiagnosticRequest[];
  analyzed: DiagnosticRun[];
}
