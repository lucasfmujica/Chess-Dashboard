export interface PositionDiagnosticRow {
  id: string;
  game_id: string;
  ply: number;
  fen: string;
  move_played: string;
  cp_loss: number;
  sf_top3: {
    rank: number;
    move_san: string;
    move_uci: string;
    eval_cp: number;
    /** Variante en SAN con numeración. Ausente en filas anteriores a guardarla. */
    line?: string;
    maia_policy?: number;
  }[];
  maia_top_move: string;
  maia_policy_played: string | number | null;
  maia_policy_sf_top: string | number | null;
  category: 'brecha_conceptual' | 'jugada_inhumana' | 'error_propio';
  created_at: string;
}

// NUMERIC vuelve como string por el driver de Postgres, no como number.
const toNumber = (value: string | number | null) =>
  value === null ? undefined : typeof value === 'number' ? value : Number(value);

export const rowToPositionDiagnostic = (row: PositionDiagnosticRow) => ({
  id: row.id,
  gameId: row.game_id,
  ply: row.ply,
  // Número de jugada completa, para hablar el mismo idioma que la planilla.
  moveNumber: Math.floor((row.ply + 1) / 2),
  fen: row.fen,
  movePlayed: row.move_played,
  cpLoss: row.cp_loss,
  sfTop3: row.sf_top3.map(m => ({
    rank: m.rank,
    moveSan: m.move_san,
    moveUci: m.move_uci,
    evalCp: m.eval_cp,
    line: m.line || undefined,
    maiaPolicy: m.maia_policy,
  })),
  maiaTopMove: row.maia_top_move,
  maiaPolicyPlayed: toNumber(row.maia_policy_played),
  maiaPolicySfTop: toNumber(row.maia_policy_sf_top),
  category: row.category,
  createdAt: new Date(row.created_at).getTime(),
});
