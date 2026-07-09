import { useMemo, useState } from 'react';
import type { GameResult } from '../types/chess';

export type ResultFilter = 'all' | GameResult;

export interface GameFilterAccessors<T> {
  /** ISO date (YYYY-MM-DD) if known — undated items always pass the date filter. */
  date: (item: T) => string | undefined;
  result: (item: T) => GameResult;
  /** Free text to match the search query against (opponent, opening, tournament…). */
  searchText: (item: T) => string;
}

export interface UseGameFiltersResult<T> {
  query: string;
  setQuery: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  resultFilter: ResultFilter;
  setResultFilter: (value: ResultFilter) => void;
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

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(item => {
      if (q && !accessors.searchText(item).toLowerCase().includes(q)) return false;
      if (resultFilter !== 'all' && accessors.result(item) !== resultFilter) return false;
      const date = accessors.date(item);
      if (date) {
        if (dateFrom && date < dateFrom) return false;
        if (dateTo && date > dateTo) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, dateFrom, dateTo, resultFilter]);

  const hasActiveFilters = query.trim() !== '' || dateFrom !== '' || dateTo !== '' || resultFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setResultFilter('all');
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
    hasActiveFilters,
    clearFilters,
    filteredItems,
  };
}
