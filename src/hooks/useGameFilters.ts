import { useMemo, useState } from 'react';
import type { GameResult } from '../types/chess';

export type ResultFilter = 'all' | GameResult;
/** `online` is every non-OTB source (today that is just Lichess). */
export type SourceFilter = 'all' | 'otb' | 'lichess' | 'online';
/** `otb-unset` matches games with no time class, i.e. OTB. */
export type SpeedFilter = 'all' | 'classical' | 'rapid' | 'blitz' | 'bullet' | 'otb-unset';

export interface GameFilterAccessors<T> {
  /** ISO date (YYYY-MM-DD) if known — undated items always pass the date filter. */
  date: (item: T) => string | undefined;
  result: (item: T) => GameResult;
  /** Free text to match the search query against (opponent, opening, tournament…). */
  searchText: (item: T) => string;
  /** 'otb' | 'lichess'. Absent is read as OTB, the `games.source` default. */
  source?: (item: T) => string | undefined;
  /** Time class; absent for OTB. Only an explicit speed filter excludes on it. */
  speed?: (item: T) => string | undefined;
}

/** Pure so the source/speed rules can be tested without React. */
export const matchesSourceSpeed = (
  source: string | undefined,
  speed: string | undefined,
  sourceFilter: SourceFilter,
  speedFilter: SpeedFilter
): boolean => {
  const src = source ?? 'otb';
  if (sourceFilter === 'otb' && src !== 'otb') return false;
  if (sourceFilter === 'lichess' && src !== 'lichess') return false;
  if (sourceFilter === 'online' && src === 'otb') return false;
  if (speedFilter === 'otb-unset') return !speed;
  if (speedFilter !== 'all' && speed !== speedFilter) return false;
  return true;
};

export interface UseGameFiltersResult<T> {
  query: string;
  setQuery: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  resultFilter: ResultFilter;
  setResultFilter: (value: ResultFilter) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (value: SourceFilter) => void;
  speedFilter: SpeedFilter;
  setSpeedFilter: (value: SpeedFilter) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filteredItems: T[];
}

/**
 * Shared search/date-range/result filtering for games-list views.
 * Items without a date are never excluded by an active date range —
 * a missing field shouldn't silently hide a game.
 */
export function useGameFilters<T>(items: T[], accessors: GameFilterAccessors<T>): UseGameFiltersResult<T> {
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [speedFilter, setSpeedFilter] = useState<SpeedFilter>('all');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(item => {
      if (q && !accessors.searchText(item).toLowerCase().includes(q)) return false;
      if (resultFilter !== 'all' && accessors.result(item) !== resultFilter) return false;
      if (
        (sourceFilter !== 'all' || speedFilter !== 'all') &&
        !matchesSourceSpeed(accessors.source?.(item), accessors.speed?.(item), sourceFilter, speedFilter)
      ) {
        return false;
      }
      const date = accessors.date(item);
      if (date) {
        if (dateFrom && date < dateFrom) return false;
        if (dateTo && date > dateTo) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, dateFrom, dateTo, resultFilter, sourceFilter, speedFilter]);

  const hasActiveFilters = query.trim() !== '' || dateFrom !== '' || dateTo !== '' ||
    resultFilter !== 'all' ||
    sourceFilter !== 'all' ||
    speedFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setResultFilter('all');
    setSourceFilter('all');
    setSpeedFilter('all');
  };

  return {
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
    filteredItems,
  };
}
