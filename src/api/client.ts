import type {
  Game,
  PlayerInfo,
  Repertoire,
  AnnotatedGame,
  RepertoireLine,
  ScoutingTarget,
} from '../types/chess';
import type { GameAnalysis } from '../engine/analyzeGame';
import type { MinedBlunder, BlunderDrill } from '../types/blunders';
import type { MinedEndgame, EndgameDrill } from '../types/endgames';
import type { NormAttempt, NormThresholds } from '../types/norms';
import type {
  TrainingSession,
  TrainingAttempt,
  Book,
  Concept,
  Homework,
} from '../types/training';

const API_KEY = import.meta.env.VITE_API_SECRET as string | undefined;

const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const isMutating = options.method && options.method !== 'GET';
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(isMutating && API_KEY ? { 'x-api-key': API_KEY } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
};

// Games

/** Minutes since midnight for a `Game.time` value. Handles both 24h ("14:05") and
 * Lichess's locale-formatted 12h ("02:05 PM") strings; unparseable/missing times sort first. */
const timeToMinutes = (time?: string): number => {
  const match = time?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

/** Sort key combining a game's played date and time of day. Games are stored with
 * `created_at` as the insert timestamp, which does NOT reflect play order once games
 * are bulk-imported (e.g. a Lichess sync) — chronological features (ELO progression,
 * streaks) need this real order instead. */
const gameSortKey = (game: Game): number => {
  if (!game.date) return 0;
  return new Date(`${game.date}T00:00:00Z`).getTime() + timeToMinutes(game.time) * 60_000;
};

export const fetchGames = () =>
  apiFetch<Game[]>('/games').then(games => [...games].sort((a, b) => gameSortKey(a) - gameSortKey(b)));
export const postGames = (games: Game[]) =>
  apiFetch<{ inserted: number }>('/games', { method: 'POST', body: JSON.stringify(games) });
export const patchGamePgn = (id: string, pgn: string | undefined) =>
  apiFetch<Game>(`/games?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ pgn: pgn ?? null }),
  });
export const deleteGamesBySource = (source: string) =>
  apiFetch<{ deleted: number }>(`/games?source=${encodeURIComponent(source)}`, { method: 'DELETE' });

// Profile
export const fetchProfile = async (): Promise<PlayerInfo | null> => {
  const res = await fetch('/api/profile');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /profile failed: ${res.status}`);
  return res.json() as Promise<PlayerInfo>;
};
export const putProfile = (profile: PlayerInfo) =>
  apiFetch<PlayerInfo>('/profile', { method: 'PUT', body: JSON.stringify(profile) });

// Repertoire
export const fetchRepertoire = () => apiFetch<Repertoire>('/repertoire');
export const putRepertoire = (repertoire: Repertoire) =>
  apiFetch<Repertoire>('/repertoire', { method: 'PUT', body: JSON.stringify(repertoire) });

// Opening heroes
export const fetchOpeningHeroes = () => apiFetch<Record<string, string[]>>('/opening-heroes');
export const putOpeningHeroes = (heroes: Record<string, string[]>) =>
  apiFetch<Record<string, string[]>>('/opening-heroes', { method: 'PUT', body: JSON.stringify(heroes) });

// Tournament -> city overrides (Geography tab)
export const fetchTournamentLocations = () => apiFetch<Record<string, string>>('/tournament-locations');
export const putTournamentLocations = (locations: Record<string, string>) =>
  apiFetch<Record<string, string>>('/tournament-locations', { method: 'PUT', body: JSON.stringify(locations) });

// Analysis cache
export interface AnalysisEntry {
  pgnHash: string;
  analysis: GameAnalysis;
}
export const fetchAnalyses = () => apiFetch<AnalysisEntry[]>('/analyses');
export const postAnalysis = (pgnHash: string, analysis: GameAnalysis) =>
  apiFetch<{ ok: true }>('/analyses', { method: 'POST', body: JSON.stringify({ pgnHash, analysis }) });

// Annotated games
export const fetchAnnotations = () => apiFetch<AnnotatedGame[]>('/annotations');
export const postAnnotation = (annotation: Partial<AnnotatedGame>) =>
  apiFetch<AnnotatedGame>('/annotations', { method: 'POST', body: JSON.stringify(annotation) });
export const putAnnotation = (id: string, annotation: Partial<AnnotatedGame>) =>
  apiFetch<AnnotatedGame>(`/annotations?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(annotation),
  });
export const deleteAnnotation = (id: string) =>
  apiFetch<{ ok: true }>(`/annotations?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// Repertoire prep lines (tournament study)
export const fetchRepertoireLines = () => apiFetch<RepertoireLine[]>('/repertoire-lines');
export const postRepertoireLine = (line: Partial<RepertoireLine>) =>
  apiFetch<RepertoireLine>('/repertoire-lines', { method: 'POST', body: JSON.stringify(line) });
/**
 * NOTE: this PUT is a *full replace* — every column is set from the body, so
 * a partial patch nulls plan/goldenRule/notes. Always spread the whole line.
 * `reviewCountInc` is the exception: it's a server-side delta.
 */
export type RepertoireLineWrite = Partial<RepertoireLine> & { reviewCountInc?: number };
export const putRepertoireLine = (id: string, line: RepertoireLineWrite) =>
  apiFetch<RepertoireLine>(`/repertoire-lines?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(line),
  });
export const deleteRepertoireLine = (id: string) =>
  apiFetch<{ ok: true }>(`/repertoire-lines?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// Blunder drills (mined from the player's own analyzed games) and scouting
// targets (Opponent Prep) share one Vercel function (`api/prep.ts`, dispatched
// by `?resource=`) to stay under the Hobby-plan serverless function limit.
export const fetchBlunderDrills = () => apiFetch<BlunderDrill[]>('/prep?resource=blunder-drills');
export const postBlunderDrills = (drills: MinedBlunder[]) =>
  apiFetch<{ inserted: number }>('/prep?resource=blunder-drills', { method: 'POST', body: JSON.stringify(drills) });
export interface BlunderDrillPatch {
  confidence?: number;
  lastReviewed?: number;
  archived?: boolean;
  /**
   * Counter deltas, applied server-side. Prefer these over absolute totals:
   * two screens can drill the same item, and a total computed from a stale
   * local copy silently overwrites the other's increment.
   */
  reviewCountInc?: number;
  solvedCountInc?: number;
  /** @deprecated Absolute totals — kept for compatibility, prefer the *Inc fields. */
  reviewCount?: number;
  solvedCount?: number;
}
export const putBlunderDrill = (id: string, patch: BlunderDrillPatch) =>
  apiFetch<BlunderDrill>(`/prep?resource=blunder-drills&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
export const deleteBlunderDrill = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=blunder-drills&id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// Scouting targets (Opponent Prep)
export const fetchScoutingTargets = () => apiFetch<ScoutingTarget[]>('/prep?resource=scouting-targets');
export const postScoutingTarget = (target: Partial<ScoutingTarget>) =>
  apiFetch<ScoutingTarget>('/prep?resource=scouting-targets', { method: 'POST', body: JSON.stringify(target) });
export const putScoutingTarget = (id: string, target: Partial<ScoutingTarget>) =>
  apiFetch<ScoutingTarget>(`/prep?resource=scouting-targets&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(target),
  });
export const deleteScoutingTarget = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=scouting-targets&id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// Endgame drills (mined from the player's own games — no analysis required)
export const fetchEndgameDrills = () => apiFetch<EndgameDrill[]>('/prep?resource=endgame-drills');
export const postEndgameDrills = (drills: MinedEndgame[]) =>
  apiFetch<{ inserted: number }>('/prep?resource=endgame-drills', { method: 'POST', body: JSON.stringify(drills) });
export interface EndgameDrillPatch {
  confidence?: number;
  lastReviewed?: number;
  archived?: boolean;
  /** See BlunderDrillPatch — server-side counter deltas. */
  reviewCountInc?: number;
  solvedCountInc?: number;
  /** @deprecated Absolute totals — kept for compatibility, prefer the *Inc fields. */
  reviewCount?: number;
  solvedCount?: number;
}
export const putEndgameDrill = (id: string, patch: EndgameDrillPatch) =>
  apiFetch<EndgameDrill>(`/prep?resource=endgame-drills&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
export const deleteEndgameDrill = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=endgame-drills&id=${encodeURIComponent(id)}`, { method: 'DELETE' });

// Norm Tracker (FIDE-title norm attempts, tracked against editable thresholds)
export const fetchNormAttempts = () => apiFetch<NormAttempt[]>('/prep?resource=norm-attempts');
export const postNormAttempt = (attempt: Partial<NormAttempt>) =>
  apiFetch<NormAttempt>('/prep?resource=norm-attempts', { method: 'POST', body: JSON.stringify(attempt) });
export const putNormAttempt = (id: string, attempt: Partial<NormAttempt>) =>
  apiFetch<NormAttempt>(`/prep?resource=norm-attempts&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(attempt),
  });
export const deleteNormAttempt = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=norm-attempts&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const fetchNormThresholds = () => apiFetch<NormThresholds>('/prep?resource=norm-thresholds');
export const putNormThresholds = (thresholds: NormThresholds) =>
  apiFetch<NormThresholds>('/prep?resource=norm-thresholds', { method: 'PUT', body: JSON.stringify(thresholds) });

// Training log: what was actually trained, and why exercises were missed.
export const fetchTrainingSessions = (from?: string) =>
  apiFetch<TrainingSession[]>(
    `/prep?resource=training-sessions${from ? `&from=${encodeURIComponent(from)}` : ''}`
  );
export const postTrainingSession = (session: Partial<TrainingSession>) =>
  apiFetch<TrainingSession>('/prep?resource=training-sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
export const putTrainingSession = (id: string, session: Partial<TrainingSession>) =>
  apiFetch<TrainingSession>(`/prep?resource=training-sessions&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(session),
  });
export const deleteTrainingSession = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=training-sessions&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const fetchTrainingAttempts = (from?: string) =>
  apiFetch<TrainingAttempt[]>(
    `/prep?resource=training-attempts${from ? `&from=${encodeURIComponent(from)}` : ''}`
  );
/** Bulk-only: the daily queue flushes a whole session's attempts at once. */
export const postTrainingAttempts = (attempts: Partial<TrainingAttempt>[]) =>
  apiFetch<{ inserted: number }>('/prep?resource=training-attempts', {
    method: 'POST',
    body: JSON.stringify(attempts),
  });

// Books and concepts (the study inventory)
export const fetchBooks = () => apiFetch<Book[]>('/prep?resource=books');
/** Accepts one book or many, so a whole library can be pasted in at once. */
export const postBooks = (books: Partial<Book>[]) =>
  apiFetch<Book[]>('/prep?resource=books', { method: 'POST', body: JSON.stringify(books) });
export const putBook = (id: string, book: Partial<Book>) =>
  apiFetch<Book>(`/prep?resource=books&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(book),
  });
export const deleteBook = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=books&id=${encodeURIComponent(id)}`, { method: 'DELETE' });

export const fetchConcepts = () => apiFetch<Concept[]>('/prep?resource=concepts');
export const postConcept = (concept: Partial<Concept>) =>
  apiFetch<Concept>('/prep?resource=concepts', { method: 'POST', body: JSON.stringify(concept) });
export const putConcept = (id: string, concept: Partial<Concept>) =>
  apiFetch<Concept>(`/prep?resource=concepts&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(concept),
  });
export const deleteConcept = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=concepts&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

// Homework assigned in coaching sessions
export const fetchHomework = () => apiFetch<Homework[]>('/prep?resource=homework');
/** Accepts one or many, so an importer can push a whole session at once. */
export const postHomework = (items: Partial<Homework>[]) =>
  apiFetch<Homework[]>('/prep?resource=homework', {
    method: 'POST',
    body: JSON.stringify(items),
  });
export const putHomework = (id: string, item: Partial<Homework>) =>
  apiFetch<Homework>(`/prep?resource=homework&id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
export const deleteHomework = (id: string) =>
  apiFetch<{ ok: true }>(`/prep?resource=homework&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

/**
 * Bulk-write the results of matching games against repertoire lines.
 * One request instead of ~460, since matching runs over the whole game list.
 */
export const patchGameRepertoireMatches = (
  matches: { id: string; repertoireLineId: string | null; bookExitPly: number | null }[]
) => apiFetch<{ updated: number }>('/games', { method: 'PATCH', body: JSON.stringify(matches) });

// One-time migration
export interface MigratePayload {
  games?: Game[];
  mainRepertoire?: Repertoire;
  openingHeroes?: Record<string, string[]>;
  annotatedGames?: Partial<AnnotatedGame>[];
  playerInfo?: PlayerInfo;
}
export const postMigrate = (payload: MigratePayload) =>
  apiFetch<{ migrated: boolean }>('/migrate', { method: 'POST', body: JSON.stringify(payload) });
