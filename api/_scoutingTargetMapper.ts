export interface ScoutingTargetRow {
  id: string;
  name: string;
  lichess_username: string | null;
  tournament: string | null;
  notes: string | null;
  last_scouted_at: string | null;
  created_at: string;
}

export const rowToScoutingTarget = (row: ScoutingTargetRow) => ({
  id: row.id,
  name: row.name,
  lichessUsername: row.lichess_username ?? undefined,
  tournament: row.tournament ?? undefined,
  notes: row.notes ?? undefined,
  lastScoutedAt: row.last_scouted_at ? new Date(row.last_scouted_at).getTime() : undefined,
  createdAt: new Date(row.created_at).getTime(),
});
