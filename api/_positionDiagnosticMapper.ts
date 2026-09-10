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
  /** {"1100": {played, sf_top, top_move, played_is_top}, ...} — ratings de Lichess. */
  maia_ladder: Record<string, {
    played: number;
    sf_top: number | null;
    top_move: string;
    played_is_top: boolean;
  }> | null;
  explanation: string | null;
  /** Ver migración 004. Solo se expone `culprits`: el resto alimenta la prosa. */
  evidence: {
    culprits?: { piece: string; square: string; blame_cp: number }[];
  } | null;
  created_at: string;
  // Vienen del JOIN con `games`: sin esto una divergencia no se puede ubicar.
  opponent: string;
  opponent_elo: number | null;
  played_date: string | null;
  tournament: string | null;
  color: string;
  result: string;
  eco: string | null;
  opening_name: string | null;
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
  maiaLadder: row.maia_ladder
    ? Object.entries(row.maia_ladder)
        .map(([rating, step]) => ({
          rating: Number(rating),
          played: step.played,
          sfTop: step.sf_top ?? undefined,
          topMove: step.top_move,
          playedIsTop: step.played_is_top,
        }))
        .sort((a, b) => a.rating - b.rating)
    : undefined,
  explanation: row.explanation ?? undefined,
  // Qué pieza rival se volvió peligrosa por culpa de la jugada, medido sacándola
  // del tablero. Es lo que se pinta sobre las casillas.
  culprits: row.evidence?.culprits?.map(c => ({
    piece: c.piece,
    square: c.square,
    blameCp: c.blame_cp,
  })),
  createdAt: new Date(row.created_at).getTime(),
  game: {
    opponent: row.opponent,
    opponentElo: row.opponent_elo ?? undefined,
    playedDate: row.played_date ?? undefined,
    tournament: row.tournament ?? undefined,
    color: row.color as 'W' | 'B',
    result: row.result as 'W' | 'D' | 'L',
    eco: row.eco ?? undefined,
    openingName: row.opening_name ?? undefined,
  },
});
