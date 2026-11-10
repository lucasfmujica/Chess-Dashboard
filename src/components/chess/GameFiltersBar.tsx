import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { ResultFilter, SourceFilter, SpeedFilter } from '../../hooks/useGameFilters';

interface GameFiltersBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  resultFilter: ResultFilter;
  onResultFilterChange: (value: ResultFilter) => void;
  /** Source / speed selects render only when both the value and setter are given. */
  sourceFilter?: SourceFilter;
  onSourceFilterChange?: (value: SourceFilter) => void;
  speedFilter?: SpeedFilter;
  onSpeedFilterChange?: (value: SpeedFilter) => void;
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

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'Toda fuente' },
  { value: 'otb', label: 'OTB' },
  { value: 'lichess', label: 'Lichess' },
  { value: 'online', label: 'Online' },
];

const SPEED_OPTIONS: { value: SpeedFilter; label: string }[] = [
  { value: 'all', label: 'Todo ritmo' },
  { value: 'classical', label: 'Clásico' },
  { value: 'rapid', label: 'Rápido' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'otb-unset', label: 'OTB (sin ritmo)' },
];

const SELECT =
  'rounded-md border border-hairline bg-surface text-fg text-xs px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent';

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
  sourceFilter,
  onSourceFilterChange,
  speedFilter,
  onSpeedFilterChange,
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

    {sourceFilter !== undefined && onSourceFilterChange && (
      <select
        value={sourceFilter}
        onChange={e => onSourceFilterChange(e.target.value as SourceFilter)}
        className={SELECT}
        aria-label="Filter by source"
      >
        {SOURCE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )}

    {speedFilter !== undefined && onSpeedFilterChange && (
      <select
        value={speedFilter}
        onChange={e => onSpeedFilterChange(e.target.value as SpeedFilter)}
        className={SELECT}
        aria-label="Filter by time control"
      >
        {SPEED_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )}

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
