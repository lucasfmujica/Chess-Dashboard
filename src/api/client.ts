import type {
  Game,
  PlayerInfo,
  Repertoire,
  AnnotatedGame,
  OpeningCard,
} from '../types/chess';
import type { GameAnalysis } from '../engine/analyzeGame';

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
export const fetchGames = () => apiFetch<Game[]>('/games');
export const postGames = (games: Game[]) =>
  apiFetch<{ inserted: number }>('/games', { method: 'POST', body: JSON.stringify(games) });
export const patchGamePgn = (id: string, pgn: string | undefined) =>
  apiFetch<Game>(`/games/${id}`, { method: 'PATCH', body: JSON.stringify({ pgn: pgn ?? null }) });
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
  apiFetch<AnnotatedGame>(`/annotations/${id}`, { method: 'PUT', body: JSON.stringify(annotation) });
export const deleteAnnotation = (id: string) =>
  apiFetch<{ ok: true }>(`/annotations/${id}`, { method: 'DELETE' });

// Opening flashcards
export const fetchFlashcards = () => apiFetch<OpeningCard[]>('/flashcards');
export const putFlashcards = (cards: OpeningCard[]) =>
  apiFetch<OpeningCard[]>('/flashcards', { method: 'PUT', body: JSON.stringify(cards) });

// One-time migration
export interface MigratePayload {
  games?: Game[];
  mainRepertoire?: Repertoire;
  openingHeroes?: Record<string, string[]>;
  annotatedGames?: Partial<AnnotatedGame>[];
  openingFlashcards?: Omit<OpeningCard, 'id'>[];
  playerInfo?: PlayerInfo;
}
export const postMigrate = (payload: MigratePayload) =>
  apiFetch<{ migrated: boolean }>('/migrate', { method: 'POST', body: JSON.stringify(payload) });
