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
  borderColor: string;
  bgColor: string;
  badgeColor: string;
}

const FormCard = ({ title, badge, stats, borderColor, bgColor, badgeColor }: FormCardProps) => {
  return (
    <div className={`p-5 ${bgColor} rounded-lg border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 ${badgeColor} rounded-lg`}>
          <span className="text-fg text-sm font-bold">{badge}</span>
        </div>
        <div>
          <h4 className="font-bold text-fg">{title}</h4>
          <p className="text-xs text-fg-muted">{stats.subtitle}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-muted">Record</span>
          <span className="text-lg font-bold text-fg tabular-nums">
            {stats.wins}-{stats.draws}-{stats.losses}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-fg-muted">Score</span>
          <span className={`text-2xl font-bold tabular-nums ${Number(stats.percentage) >= 50 ? 'text-win' : 'text-loss'}`}>
            {stats.percentage}%
          </span>
        </div>
        <div className={`pt-2 mt-2 border-t ${borderColor}`}>
          <div className="flex gap-1">
            {stats.results.map((result, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full ${
                  result === 'W' ? 'bg-green-500' :
                  result === 'D' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
              />
            ))}
          </div>
          <p className="text-xs text-fg-subtle mt-1 text-center">
            {stats.results.join(' • ')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormCard;
