import { PlayIcon } from '@heroicons/react/24/solid';
import type { Game, GameStats, PlayerColor } from '../../../types/chess';
import { useGameViewer } from '../../../context/GameViewerContext';
import { useGameFilters } from '../../../hooks/useGameFilters';
import GameFiltersBar from '../GameFiltersBar';
import { Badge, Card, CardHeader, ClockBar, ResultMark, StatCard, Table, TBody, TD, TH, THead, TR } from '../../ui';

/** Per-opening aggregate row attached to colored game stats. */
interface ColorOpeningStat {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: string;
  winRate: string;
}

type ColorStats = GameStats & { openings: ColorOpeningStat[] };

type SortBy = 'date' | 'opponent' | 'result';
type SortOrder = 'asc' | 'desc';

interface ColorGamesTabProps {
  color: PlayerColor;
  colorStats: ColorStats;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (v: SortOrder) => void;
  games: Game[];
  ecoNames: Record<string, string>;
}

const ColorGamesTab = ({
  color,
  colorStats,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  games,
  ecoNames
}: ColorGamesTabProps) => {
  const { openGameViewer } = useGameViewer();
  const colorLabel = color === 'W' ? 'Blancas' : 'Negras';
  const colorGamesAll = games
    .map((game, idx) => ({ ...game, gameNumber: idx + 1 }))
    .filter(game => game.color === color);
  const {
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    resultFilter,
    setResultFilter,
    sourceFilter,
    setSourceFilter,
    speedFilter,
    setSpeedFilter,
    hasActiveFilters,
    clearFilters,
    filteredItems: colorGames,
  } = useGameFilters(colorGamesAll, {
    date: g => g.date,
    result: g => g.result,
    source: g => g.source,
    speed: g => g.speed,
    searchText: g => `${g.opp} ${ecoNames[g.eco] || g.eco} ${g.tournament}`,
  });
  const total = colorStats.total;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const [points] = colorStats.score.split('/');
  const pointsNum = parseFloat(points) || 0;
  const scorePct = total > 0 ? Math.round((pointsNum / total) * 100) : 0;
  const fmtPts = (p: number) => {
    const whole = Math.floor(p);
    return p - whole >= 0.5 ? `${whole || ''}½` : String(whole);
  };

  const sortedGames = [...colorGames].sort((a, b) => {
    let compareA: number | string;
    let compareB: number | string;

    switch (sortBy) {
      case 'date':
        compareA = a.gameNumber;
        compareB = b.gameNumber;
        break;
      case 'opponent':
        compareA = (a.opp || '').toLowerCase();
        compareB = (b.opp || '').toLowerCase();
        break;
      case 'result': {
        const resultOrder: Record<string, number> = { 'W': 3, 'D': 2, 'L': 1 };
        compareA = resultOrder[a.result];
        compareB = resultOrder[b.result];
        break;
      }
      default:
        compareA = a.gameNumber;
        compareB = b.gameNumber;
    }

    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const sortButton = (key: SortBy, label: string, firstOrder: SortOrder) => {
    const active = sortBy === key;
    return (
      <button
        type="button"
        onClick={() => {
          if (key === 'result' || active) {
            if (!active) setSortBy(key);
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          } else {
            setSortBy(key);
            setSortOrder(firstOrder);
          }
        }}
        className="inline-flex items-center gap-1 uppercase hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {label}
        {active && <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
      </button>
    );
  };

  return (
    <div className="space-y-8">
      <ClockBar>
        <StatCard title={`Partidas con ${colorLabel.toLowerCase()}`} value={total} subtitle={`rival promedio ${colorStats.avgOppElo || '—'}`} />
        <StatCard
          title="Puntaje"
          value={`${scorePct}%`}
          subtitle={
            <>
              <span className="font-mono tabular-nums">
                {fmtPts(pointsNum)} de {total} · +{colorStats.wins} ={colorStats.draws} −{colorStats.losses}
              </span>
              <span className="mt-2 flex h-2 overflow-hidden rounded-sm bg-surface-2" aria-hidden="true">
                <span className="h-full bg-win" style={{ width: `${pct(colorStats.wins)}%` }} />
                <span className="h-full bg-draw/60" style={{ width: `${pct(colorStats.draws)}%` }} />
                <span className="h-full bg-loss" style={{ width: `${pct(colorStats.losses)}%` }} />
              </span>
            </>
          }
        />
        <StatCard title="Rendimiento" value={colorStats.performanceRating || '—'} subtitle="ELO de performance" />
      </ClockBar>

      <Card flush>
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CardHeader title={`Aperturas con ${colorLabel.toLowerCase()}`} subtitle="ordenadas por cantidad de partidas" className="mb-4" />
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <Table>
            <THead>
              <tr>
                <TH>Apertura</TH>
                <TH>ECO</TH>
                <TH align="right">P</TH>
                <TH align="right">+ = −</TH>
                <TH align="right">Pts</TH>
                <TH align="right">%</TH>
              </tr>
            </THead>
            <TBody>
              {colorStats.openings.map((opening) => {
                const pts = opening.wins + opening.draws / 2;
                return (
                  <TR key={opening.eco}>
                    <TD className="font-serif text-[15px]">{opening.name}</TD>
                    <TD><Badge>{opening.eco}</Badge></TD>
                    <TD align="right" className="font-mono">{opening.games}</TD>
                    <TD align="right" muted className="whitespace-nowrap font-mono">
                      +{opening.wins} ={opening.draws} −{opening.losses}
                    </TD>
                    <TD align="right" className="font-mono">{fmtPts(pts)}</TD>
                    <TD align="right" className="font-mono">
                      {opening.games > 0 ? Math.round((pts / opening.games) * 100) : 0}
                    </TD>
                  </TR>
                );
              })}
              {colorStats.openings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-fg-muted">Sin aperturas registradas con {colorLabel.toLowerCase()}.</td>
                </tr>
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`Partidas con ${colorLabel.toLowerCase()}`}
          subtitle="filtrá y repasá tus partidas"
          className="mb-4"
        />
        <div className="mb-4">
          <GameFiltersBar
            query={query}
            onQueryChange={setQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            resultFilter={resultFilter}
            onResultFilterChange={setResultFilter}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            speedFilter={speedFilter}
            onSpeedFilterChange={setSpeedFilter}
            hasActiveFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        </div>
        <Table>
          <THead>
            <tr>
              <TH aria-sort={sortBy === 'date' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                {sortButton('date', 'N.º', 'desc')}
              </TH>
              <TH align="right">Tu ELO</TH>
              <TH aria-sort={sortBy === 'opponent' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                {sortButton('opponent', 'Rival', 'asc')}
              </TH>
              <TH align="right">ELO</TH>
              <TH align="center" aria-sort={sortBy === 'result' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                {sortButton('result', 'Res.', 'desc')}
              </TH>
              <TH>Apertura</TH>
              <TH>Torneo</TH>
              <TH><span className="sr-only">Repasar</span></TH>
            </tr>
          </THead>
          <TBody>
            {sortedGames.map((game) => (
              <TR key={game.gameNumber}>
                <TD className="font-mono">{game.gameNumber}</TD>
                <TD align="right" muted className="font-mono">{game.elo}</TD>
                <TD className="whitespace-nowrap">{game.opp}</TD>
                <TD align="right" muted className="font-mono">{game.opp_elo || 'Sin ELO'}</TD>
                <TD align="center"><ResultMark result={game.result} outline /></TD>
                <TD>
                  <div className="font-serif text-[15px] text-fg">{ecoNames[game.eco] || game.eco}</div>
                  <div className="font-mono text-xs text-fg-subtle">{game.eco}</div>
                </TD>
                <TD muted>{game.tournament}</TD>
                <TD align="center">
                  {game.pgn && (
                    <button
                      onClick={() => openGameViewer({
                        pgn: game.pgn,
                        orientation: color === 'W' ? 'white' : 'black',
                        white: color === 'W' ? 'Vos' : game.opp,
                        black: color === 'W' ? game.opp : 'Vos',
                        title: game.tournament,
                      })}
                      aria-label={`Repasar la partida contra ${game.opp}`}
                      title="Repasar partida"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-hairline text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                  )}
                </TD>
              </TR>
            ))}
            {colorGames.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-fg-muted">Ninguna partida coincide con los filtros.</td>
              </tr>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
};

export default ColorGamesTab;
