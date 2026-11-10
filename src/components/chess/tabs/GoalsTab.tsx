import { useState } from 'react';
import { Button, Card, CardHeader, ClockBar, StatCard } from '../../ui';

/** Where the ELO curve started; the progress bar runs from here to the goal. */
const START_ELO = 1651;

const FIELD =
  'w-full rounded border border-hairline bg-surface px-3 py-2 font-mono text-base tabular-nums text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

/** Done / pending mark in the same square as a result: ✓ in win ink, · in draw. */
const Mark = ({ done }: { done: boolean }) => (
  <span
    role="img"
    aria-label={done ? 'Logrado' : 'Pendiente'}
    className={`inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-sm border border-current font-mono text-[13px] font-medium leading-none ${done ? 'text-win' : 'text-draw'}`}
  >
    {done ? '✓' : '·'}
  </span>
);

interface GoalProjections {
  currentElo: number;
  targetElo: number;
  eloGain: number;
  daysRemaining: number;
  monthsRemaining: string;
  avgEloPerTournament: string;
  tournamentsNeeded: number;
  pointsNeededPer9Games: string;
  kFactor: number;
  onTrack: boolean;
  projectedElo: number;
}

interface Achievement {
  name: string;
  icon: string;
  earned: boolean;
}

interface Milestone {
  title: string;
  current: number | string;
  target: number;
  progress: string;
}

interface GoalsTabProps {
  targetElo: number;
  setTargetElo: (v: number) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  goalProjections: GoalProjections;
  achievements: Achievement[];
  nextMilestones: Milestone[];
}

const GoalsTab = ({
  targetElo,
  setTargetElo,
  targetDate,
  setTargetDate,
  goalProjections,
  achievements,
  nextMilestones
}: GoalsTabProps) => {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // Calculate progress percentage for circular progress
  const progressPercent = Math.max(0, Math.min(100,
    ((goalProjections.currentElo - START_ELO) / (goalProjections.targetElo - START_ELO)) * 100
  ));

  const gain = goalProjections.eloGain;
  const reached = gain <= 0;
  const visibleAchievements = showAllAchievements ? achievements : achievements.slice(0, 6);
  const fmtDate = (d: string) => {
    if (!d) return 'sin fecha';
    const [y, m, day] = d.split('-').map(Number);
    if (!y || !m || !day) return d;
    return new Date(y, m - 1, day).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-fg-muted">
        Meta <span className="font-mono tabular-nums text-fg">{goalProjections.targetElo}</span> para el {fmtDate(targetDate)} · K{' '}
        <span className="font-mono tabular-nums">{goalProjections.kFactor}</span> desde Lago Puelo (antes K 40)
      </p>

      <section aria-label="Progreso hacia la meta" className="space-y-0">
        <ClockBar className="rounded-b-none">
          <StatCard title="ELO hoy" value={goalProjections.currentElo} subtitle={`meta ${goalProjections.targetElo}`} />
          <StatCard
            title="Faltan"
            value={reached ? '0' : gain}
            trend={reached ? 'up' : undefined}
            subtitle={reached ? 'meta alcanzada' : 'puntos'}
          />
          <StatCard
            title="Ritmo"
            value={goalProjections.avgEloPerTournament}
            subtitle="por torneo, promedio"
          />
          <StatCard
            title="Al ritmo actual"
            value={goalProjections.tournamentsNeeded}
            trend={goalProjections.onTrack ? 'up' : 'down'}
            subtitle={`torneos para llegar · ${goalProjections.onTrack ? 'vas a tiempo' : 'no alcanza el tiempo'}`}
          />
        </ClockBar>
        <div className="rounded-b border border-t-0 border-hairline bg-surface px-5 pb-5 pt-4 sm:px-6">
          <div
            className="h-2.5 overflow-hidden rounded-sm bg-surface-2"
            role="progressbar"
            aria-valuemin={START_ELO}
            aria-valuemax={goalProjections.targetElo}
            aria-valuenow={goalProjections.currentElo}
            aria-label="ELO entre el inicio y la meta"
          >
            <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-2 flex justify-between gap-2 font-mono text-xs tabular-nums text-fg-muted">
            <span>{START_ELO} · inicio</span>
            <span className="text-accent">{goalProjections.currentElo} · hoy ({Math.round(progressPercent)}%)</span>
            <span>{goalProjections.targetElo} · meta</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Lo que pide la meta" className="mb-4" />
            <div className="space-y-3.5 font-serif text-base leading-6 text-fg">
              {reached ? (
                <p>Ya estás en la meta: {goalProjections.currentElo} contra {goalProjections.targetElo}. Es momento de subirla.</p>
              ) : (
                <p>
                  Te faltan <span className="font-mono tabular-nums">{gain}</span> puntos en{' '}
                  <span className="font-mono tabular-nums">{goalProjections.monthsRemaining}</span> meses (
                  <span className="font-mono tabular-nums">{goalProjections.daysRemaining}</span> días). Con K{' '}
                  {goalProjections.kFactor}, en un torneo de 9 rondas necesitás alrededor de{' '}
                  <span className="font-mono tabular-nums">{goalProjections.pointsNeededPer9Games}</span> puntos para ir a tiempo:
                  por ejemplo +6 =0 −3, o +5 =3 −1.
                </p>
              )}
              <p>
                Sumás en promedio <span className="font-mono tabular-nums">{goalProjections.avgEloPerTournament}</span> por torneo.
                A ese ritmo llegarías a{' '}
                <span className="font-mono tabular-nums">{Math.round(goalProjections.projectedElo)}</span> para la fecha
                {goalProjections.projectedElo >= targetElo ? ', por encima de la meta.' : ', todavía debajo de la meta.'}
              </p>
              <p className="text-fg-muted">
                {goalProjections.onTrack
                  ? 'Vas a tiempo. Sostener el ritmo alcanza.'
                  : 'Al ritmo actual no llegás: hace falta un torneo bastante mejor que el promedio.'}
              </p>
            </div>
          </Card>

          {nextMilestones.length > 0 && (
            <Card>
              <CardHeader title="Próximos hitos" className="mb-2" />
              <ul className="divide-y divide-hairline">
                {nextMilestones.map((milestone, idx) => {
                  const pct = Math.min(100, parseFloat(milestone.progress) || 0);
                  return (
                    <li key={idx} className="py-3.5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-3">
                          <Mark done={pct >= 100} />
                          <span className="font-serif text-base text-fg">{milestone.title}</span>
                        </span>
                        <span className="shrink-0 font-mono text-sm tabular-nums text-fg-muted">
                          {milestone.current} / {milestone.target}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-sm bg-surface-2" aria-hidden="true">
                          <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right font-mono text-xs tabular-nums text-fg-subtle">{milestone.progress}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Logros"
              actions={
                achievements.length > 6 ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllAchievements(!showAllAchievements)}>
                    {showAllAchievements ? 'Ver menos' : `Ver los ${achievements.length}`}
                  </Button>
                ) : undefined
              }
              className="mb-2"
            />
            {achievements.length === 0 ? (
              <p className="py-4 font-serif text-base text-fg-muted">Todavía no hay logros. Aparecen a medida que jugás.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {visibleAchievements.map((badge, idx) => (
                  <li key={idx} className="flex items-center gap-3 py-3">
                    <Mark done={badge.earned} />
                    <span className={`font-serif text-base leading-snug ${badge.earned ? 'text-fg' : 'text-fg-muted'}`}>{badge.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Cambiar meta" className="mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="goal-elo" className="text-label mb-1.5 block">ELO</label>
                <input
                  id="goal-elo"
                  type="number"
                  value={targetElo}
                  onChange={(e) => setTargetElo(parseInt(e.target.value))}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="goal-date" className="text-label mb-1.5 block">Fecha</label>
                <input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={FIELD}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-fg-subtle">Los cambios se guardan solos.</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoalsTab;
