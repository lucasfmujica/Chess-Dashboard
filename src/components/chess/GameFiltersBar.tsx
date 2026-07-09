import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { ResultFilter } from '../../hooks/useGameFilters';

interface GameFiltersBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  resultFilter: ResultFilter;
  onResultFilterChange: (value: ResultFilter) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
  searchPlaceholder?: string;
}

const RESULT_OPTIONS: { value: ResultFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'W', label: 'Win' },
  { value: 'D', label: 'Draw' },
  { value: 'L', label: 'Loss' },
];

/** Shared search + date-range + result filter bar for games-list views. */
const GameFiltersBar = ({
  query,
  onQueryChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  resultFilter,
  onResultFilterChange,
  hasActiveFilters,
  onClear,
  searchPlaceholder = 'Search opponent, opening, tournament…',
}: GameFiltersBarProps) => (
  <div className="flex flex-wrap items-center gap-3">
    <div className="relative flex-1 min-w-[200px]">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
      <input
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle text-sm pl-9 pr-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>

    <div className="inline-flex gap-1 rounded-md border border-hairline bg-surface p-1" role="group" aria-label="Filter by result">
      {RESULT_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onResultFilterChange(opt.value)}
          aria-pressed={resultFilter === opt.value}
          className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            resultFilter === opt.value ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={dateFrom}
        onChange={e => onDateFromChange(e.target.value)}
        className="rounded-md border border-hairline bg-surface text-fg text-xs px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
        aria-label="From date"
      />
      <span className="text-fg-subtle text-xs">–</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
        className="rounded-md border border-hairline bg-surface text-fg text-xs px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
        aria-label="To date"
      />
    </div>

    {hasActiveFilters && (
      <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
        <XMarkIcon className="w-3.5 h-3.5" />
        Clear
      </button>
    )}
  </div>
);

export default GameFiltersBar;
