import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useGames } from '../../../context/GamesContext';
import type { Game } from '../../../types/chess';
import { Card, CardHeader, ClockBar, StatCard, ResultMark } from '../../ui';

/** 3.5 → "3½". */
const fmtPoints = (n: number): string => {
  const whole = Math.floor(n);
  if (n - whole < 0.5) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
};

/** One line of the record book: label, what it was, the number. */
const RecordRow = ({ label, children, value, valueClass = '' }: { label: string; children: ReactNode; value: ReactNode; valueClass?: string }) => (
  <div className="grid grid-cols-1 gap-1 border-b border-hairline px-5 py-3.5 last:border-b-0 sm:grid-cols-[minmax(160px,220px)_1fr] sm:items-baseline sm:gap-4 sm:px-6">
    <dt className="text-label">{label}</dt>
    <dd className="flex min-w-0 items-baseline justify-between gap-4">
      <span className="min-w-0 font-serif text-[17px] leading-6 text-fg">{children}</span>
      <span className={`shrink-0 text-right font-mono text-xl font-medium tabular-nums text-fg ${valueClass}`}>{value}</span>
    </dd>
  </div>
);

/** Game enriched with optional per-game fields used for record-keeping. */
type RecordGame = Game & {
  moves?: unknown[];
  performanceRating?: number;
};

/** A single ELO-history datapoint. */
interface EloHistoryEntry {
  elo: number;
  /** Rating going into the game — the only place the pre-first-game rating exists. */
  eloBefore?: number;
  date?: string;
  game?: number;
  /** Present on the per-game history; used to name rating milestones. */
  tournament?: string;
}

/** Best-performing tournament aggregate. */
interface TournamentRecord {
  name: string;
  wins: number;
  draws: number;
  losses: number;
  total: number;
  score: string | number;
}

/** Most wins against a single opponent. */
interface MostWinsRecord {
  opponent: string;
  wins: number;
}

/** Favourite (most-played) opening. */
interface FavoriteOpeningRecord {
  opening: string;
  count: number;
}

/** Computed hall-of-fame records. */
interface Records {
  highestRating: number;
  highestRatingDate: string;
  /** Rating before the first game — not the lowest one reached since. */
  startingRating: number;
  longestWinStreak: number;
  longestUnbeatenStreak: number;
  bestTournament: TournamentRecord | null;
  highestRatedOpponent: RecordGame | null;
  mostWinsVsOpponent: MostWinsRecord | null;
  quickestWin: RecordGame | null;
  longestGame: RecordGame | null;
  favoriteOpening: FavoriteOpeningRecord | null;
  bestPerformance: RecordGame | null;
}

interface RecordsTabProps {
  games: RecordGame[];
  eloHistory?: EloHistoryEntry[];
}

const RecordsTab = ({ games, eloHistory }: RecordsTabProps) => {
  const { playerInfo, syncFideRating } = useGames();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncNow = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await syncFideRating();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'No se pudo sincronizar con FIDE');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate personal records
  const records = useMemo<Records>(() => {
    if (!games || games.length === 0) {
      return {
        highestRating: 0,
        highestRatingDate: '—',
        startingRating: 0,
        longestWinStreak: 0,
        longestUnbeatenStreak: 0,
        bestTournament: null,
        highestRatedOpponent: null,
        mostWinsVsOpponent: null,
        quickestWin: null,
        longestGame: null,
        favoriteOpening: null,
        bestPerformance: null
      };
    }

    // Highest Rating
    let highestRating = 0;
    let highestRatingDate = '';

    /**
     * Where the journey started: the rating going into the first game.
     *
     * This card used to show the *lowest* rating in the history, which is a
     * different number — every entry is a rating already updated by its own
     * game, so the rating you began with is never in the series. With a first
     * game won, the "starting rating" read the post-win figure and the gain
     * was understated by exactly that win.
     */
    const first = eloHistory?.[0];
    const startingRating = first?.eloBefore ?? first?.elo ?? 0;

    if (eloHistory && eloHistory.length > 0) {
      eloHistory.forEach(entry => {
        if (entry.elo > highestRating) {
          highestRating = entry.elo;
          highestRatingDate = entry.date || `partida ${entry.game}`;
        }
      });
    }

    // Longest Win Streak
    let longestWinStreak = 0;
    let currentWinStreak = 0;
    let longestUnbeatenStreak = 0;
    let currentUnbeatenStreak = 0;

    games.forEach(game => {
      if (game.result === 'W') {
        currentWinStreak++;
        currentUnbeatenStreak++;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else if (game.result === 'D') {
        currentWinStreak = 0;
        currentUnbeatenStreak++;
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, currentUnbeatenStreak);
      } else {
        currentWinStreak = 0;
        currentUnbeatenStreak = 0;
      }
    });

    // Best Tournament Performance
    const tournamentStats: Record<string, TournamentRecord> = {};
    games.forEach(game => {
      if (game.tournament) {
        if (!tournamentStats[game.tournament]) {
          tournamentStats[game.tournament] = {
            name: game.tournament,
            wins: 0,
            draws: 0,
            losses: 0,
            total: 0,
            score: 0
          };
        }
        tournamentStats[game.tournament].total++;
        if (game.result === 'W') tournamentStats[game.tournament].wins++;
        if (game.result === 'D') tournamentStats[game.tournament].draws++;
        if (game.result === 'L') tournamentStats[game.tournament].losses++;
      }
    });

    let bestTournament: TournamentRecord | null = null;
    Object.values(tournamentStats).forEach(t => {
      t.score = ((t.wins + t.draws * 0.5) / t.total * 100).toFixed(1);
      if (!bestTournament || parseFloat(String(t.score)) > parseFloat(String(bestTournament.score))) {
        bestTournament = t;
      }
    });

    // Highest Rated Opponent Defeated
    let highestRatedOpponent: RecordGame | null = null;
    games.forEach(game => {
      if (game.result === 'W' && game.opp_elo) {
        if (!highestRatedOpponent || parseInt(String(game.opp_elo)) > parseInt(String(highestRatedOpponent.opp_elo))) {
          highestRatedOpponent = game;
        }
      }
    });

    // Most Wins vs Same Opponent
    const opponentWins: Record<string, number> = {};
    games.forEach(game => {
      if (game.result === 'W' && game.opp) {
        opponentWins[game.opp] = (opponentWins[game.opp] || 0) + 1;
      }
    });

    let mostWinsVsOpponent: MostWinsRecord | null = null;
    Object.entries(opponentWins).forEach(([opponent, wins]) => {
      if (!mostWinsVsOpponent || wins > mostWinsVsOpponent.wins) {
        mostWinsVsOpponent = { opponent, wins };
      }
    });

    // Quickest Win (fewest moves)
    let quickestWin: RecordGame | null = null;
    games.forEach(game => {
      if (game.result === 'W' && game.moves) {
        const moveCount = game.moves.length;
        if (!quickestWin || moveCount < (quickestWin.moves?.length ?? Infinity)) {
          quickestWin = game;
        }
      }
    });

    // Longest Game (most moves)
    let longestGame: RecordGame | null = null;
    games.forEach(game => {
      if (game.moves) {
        const moveCount = game.moves.length;
        if (!longestGame || moveCount > (longestGame.moves?.length ?? 0)) {
          longestGame = game;
        }
      }
    });

    // Favorite Opening (most played)
    const openingCounts: Record<string, number> = {};
    games.forEach(game => {
      if (game.opening) {
        openingCounts[game.opening] = (openingCounts[game.opening] || 0) + 1;
      }
    });

    let favoriteOpening: FavoriteOpeningRecord | null = null;
    Object.entries(openingCounts).forEach(([opening, count]) => {
      if (!favoriteOpening || count > favoriteOpening.count) {
        favoriteOpening = { opening, count };
      }
    });

    // Best Performance Rating
    let bestPerformance: RecordGame | null = null;
    games.forEach(game => {
      if (game.performanceRating) {
        if (!bestPerformance || game.performanceRating > (bestPerformance.performanceRating ?? 0)) {
          bestPerformance = game;
        }
      }
    });

    return {
      highestRating,
      highestRatingDate,
      startingRating,
      longestWinStreak,
      longestUnbeatenStreak,
      bestTournament,
      highestRatedOpponent,
      mostWinsVsOpponent,
      quickestWin,
      longestGame,
      favoriteOpening,
      bestPerformance
    };
  }, [games, eloHistory]);

  // Every hundred crossed since the start, with where it first happened.
  const milestones = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) return [];
    const out: { elo: number; where: string; note: string }[] = [];
    for (let h = Math.floor(records.startingRating / 100) * 100 + 100; h <= records.highestRating; h += 100) {
      const hit = eloHistory.find(e => e.elo >= h);
      if (!hit) break;
      out.push({
        elo: h,
        where: hit.tournament || (hit.game ? `Partida ${hit.game}` : '—'),
        note: [hit.date, hit.game ? `partida ${hit.game}` : null].filter(Boolean).join(' · '),
      });
    }
    return out.reverse();
  }, [eloHistory, records.startingRating, records.highestRating]);

  const gain = records.highestRating - records.startingRating;
  const bt = records.bestTournament;

  return (
    <div className="space-y-8">
      <p className="text-sm text-fg-muted">
        <span className="font-mono tabular-nums">{games.length}</span> partidas cargadas
      </p>

      <ClockBar>
        <StatCard
          title="ELO FIDE hoy"
          value={playerInfo.current_elo}
          subtitle={
            <>
              Estándar{playerInfo.updated_at ? ` · ${playerInfo.updated_at.slice(0, 10)}` : ''} ·{' '}
              <button
                type="button"
                onClick={syncNow}
                disabled={syncing}
                className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:no-underline"
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar con FIDE'}
              </button>
              {syncError && <span className="mt-1 block text-loss">{syncError}</span>}
            </>
          }
        />
        <StatCard title="ELO máximo" value={records.highestRating} subtitle={records.highestRatingDate} />
        <StatCard title="ELO inicial" value={records.startingRating} subtitle="Antes de la primera partida" />
        <StatCard
          title="Mejora total"
          value={gain > 0 ? `+${gain}` : gain < 0 ? `−${Math.abs(gain)}` : '0'}
          trend={gain > 0 ? 'up' : gain < 0 ? 'down' : undefined}
          subtitle={`Del inicial al máximo, hasta ${records.highestRating}`}
        />
      </ClockBar>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card flush className="lg:col-span-2">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <CardHeader title="Libro de récords" />
          </div>
          <dl className="border-t border-hairline">
            {records.highestRatedOpponent && (
              <RecordRow label="Mejor victoria" value={records.highestRatedOpponent.opp_elo}>
                {records.highestRatedOpponent.opp}
                <span className="text-fg-muted">
                  {' · '}
                  {[records.highestRatedOpponent.tournament, records.highestRatedOpponent.opening].filter(Boolean).join(' · ')}
                </span>
              </RecordRow>
            )}
            {records.bestPerformance && (
              <RecordRow label="Mejor rendimiento" value={records.bestPerformance.performanceRating}>
                contra {records.bestPerformance.opp}
                <span className="text-fg-muted"> · {records.bestPerformance.tournament}</span>
              </RecordRow>
            )}
            <RecordRow label="Racha de victorias" value={records.longestWinStreak}>
              {records.longestWinStreak} seguida{records.longestWinStreak === 1 ? '' : 's'}
            </RecordRow>
            <RecordRow label="Invicto más largo" value={records.longestUnbeatenStreak}>
              {records.longestUnbeatenStreak} partida{records.longestUnbeatenStreak === 1 ? '' : 's'} sin perder
            </RecordRow>
            {bt && (
              <RecordRow label="Mejor puntaje en un torneo" value={`${Math.round(parseFloat(String(bt.score)))}%`}>
                {bt.name}
                <span className="text-fg-muted"> · {fmtPoints(bt.wins + bt.draws * 0.5)} de {bt.total}</span>
              </RecordRow>
            )}
            {records.mostWinsVsOpponent && (
              <RecordRow label="Más victorias contra un rival" value={records.mostWinsVsOpponent.wins}>
                {records.mostWinsVsOpponent.opponent}
              </RecordRow>
            )}
            {records.favoriteOpening && (
              <RecordRow label="Apertura más jugada" value={records.favoriteOpening.count}>
                {records.favoriteOpening.opening}
              </RecordRow>
            )}
            {records.quickestWin && (
              <RecordRow label="Victoria más corta" value={records.quickestWin.moves?.length}>
                contra {records.quickestWin.opp}
                {records.quickestWin.opening && <span className="text-fg-muted"> · {records.quickestWin.opening}</span>}
              </RecordRow>
            )}
            {records.longestGame && (
              <RecordRow label="Partida más larga" value={records.longestGame.moves?.length}>
                <span className="inline-flex items-center gap-2">
                  contra {records.longestGame.opp}
                  <ResultMark result={records.longestGame.result} outline />
                </span>
              </RecordRow>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Hitos de rating" subtitle="Cada centena, la primera vez que la pasaste" />
          {milestones.length > 0 ? (
            <ul className="mt-3 divide-y divide-hairline">
              {milestones.map(m => (
                <li key={m.elo} className="grid grid-cols-[72px_1fr] items-baseline gap-3 py-2.5">
                  <span className="font-mono text-lg font-medium tabular-nums text-accent">{m.elo}</span>
                  <span className="min-w-0">
                    <span className="block font-serif text-base leading-[22px] text-fg">{m.where}</span>
                    {m.note && <span className="text-xs text-fg-subtle">{m.note}</span>}
                  </span>
                </li>
              ))}
              <li className="grid grid-cols-[72px_1fr] items-baseline gap-3 py-2.5">
                <span className="font-mono text-lg font-medium tabular-nums text-fg-muted">{records.startingRating}</span>
                <span className="block font-serif text-base leading-[22px] text-fg-muted">Punto de partida</span>
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">Todavía no cruzaste una centena desde el inicio.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RecordsTab;
