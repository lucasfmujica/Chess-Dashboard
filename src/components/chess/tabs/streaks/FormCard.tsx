import ResultMark from '../../../ui/ResultMark';
import type { GameResult } from '../../../../types/chess';

export interface FormCardStats {
  subtitle: string;
  wins: number;
  draws: number;
  losses: number;
  percentage: string | number;
  results: GameResult[];
}

interface FormCardProps {
  title: string;
  badge: string;
  stats: FormCardStats;
  /** Kept for compatibility; the sheet styling is fixed now. */
  borderColor?: string;
  bgColor?: string;
  badgeColor?: string;
}

/** One column of the form sheet: + = − record, score and the results in order. */
const FormCard = ({ title, stats }: FormCardProps) => (
  <div className="p-4">
    <p className="text-label">{title}</p>
    <p className="mt-0.5 text-xs text-fg-subtle">{stats.subtitle}</p>
    <div className="mt-3 flex items-baseline justify-between gap-3">
      <span className="font-mono text-sm tabular-nums text-fg-muted">
        + {stats.wins} · = {stats.draws} · − {stats.losses}
      </span>
      <span className={`font-mono text-2xl tabular-nums ${Number(stats.percentage) >= 50 ? 'text-win' : 'text-loss'}`}>
        {stats.percentage}%
      </span>
    </div>
    {stats.results.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1 border-t border-hairline pt-3" aria-label="Resultados, la más reciente a la derecha">
        {[...stats.results].reverse().map((result, idx) => (
          <ResultMark key={idx} result={result} outline />
        ))}
      </div>
    )}
  </div>
);

export default FormCard;
