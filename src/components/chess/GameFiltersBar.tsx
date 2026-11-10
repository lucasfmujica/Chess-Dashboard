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

const RESULT_ARIA: Record<ResultFilter, string> = {
  all: 'Todos los resultados',
  W: 'Victorias',
  D: 'Tablas',
  L: 'Derrotas',
};

const RESULT_OPTIONS: { value: ResultFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'W', label: '1' },
  { value: 'D', label: '½' },
  { value: 'L', label: '0' },
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
  'h-9 rounded border border-hairline bg-surface px-2.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

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
  searchPlaceholder = 'Rival, apertura o torneo',
}: GameFiltersBarProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="relative min-w-[200px] flex-1">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
      <input
        type="search"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="h-9 w-full rounded border border-hairline bg-surface pl-9 pr-3 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>

    <div className="inline-flex border-b border-hairline" role="group" aria-label="Filtrar por resultado">
      {RESULT_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onResultFilterChange(opt.value)}
          aria-pressed={resultFilter === opt.value}
          aria-label={RESULT_ARIA[opt.value]}
          title={RESULT_ARIA[opt.value]}
          className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
            opt.value === 'all' ? '' : 'font-mono'
          } ${resultFilter === opt.value ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}
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
        aria-label="Filtrar por origen"
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
        aria-label="Filtrar por ritmo"
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
        className={`${SELECT} font-mono`}
        aria-label="Desde"
      />
      <span className="text-xs text-fg-subtle">–</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
        className={`${SELECT} font-mono`}
        aria-label="Hasta"
      />
    </div>

    {hasActiveFilters && (
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1 text-xs text-accent hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
        Limpiar filtros
      </button>
    )}
  </div>
);

export default GameFiltersBar;
