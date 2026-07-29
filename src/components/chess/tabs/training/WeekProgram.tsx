import { useEffect, useMemo, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { fetchTrainingSessions, fetchAnnotations } from '../../../../api/client';
import {
  trainingProgram,
  trainingDays,
  plannedMinutes,
  blocksForDay,
  WEEKLY_BLOCK_TARGET,
  WEEKLY_ANNOTATION_TARGET,
} from '../../../../constants/trainingProgram';
import { localDateKey, daysAgoKey, dateFromKey } from '../../../../utils/localDate';
import { useGames } from '../../../../context/GamesContext';
import { Card, Badge } from '../../../ui';
import type { TrainingSession } from '../../../../types/training';
import type { AnnotatedGame } from '../../../../types/chess';

/**
 * Plan versus actual for the current week.
 *
 * The plan is static config; only what happened is stored. So this compares
 * each weekday's prescribed blocks against the training_sessions rows that
 * actually landed on that date — which is the only way the comparison stays
 * honest, since a mutable plan drifts to match whatever was done.
 */

/** Monday of the week containing `date`, as a local 'YYYY-MM-DD' key. */
const mondayOf = (date: Date): string => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateKey(monday);
};

const WeekProgram = () => {
  const { games } = useGames();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [annotations, setAnnotations] = useState<AnnotatedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = useMemo(() => localDateKey(), []);
  const weekStart = useMemo(() => mondayOf(new Date()), []);

  useEffect(() => {
    Promise.all([fetchTrainingSessions(weekStart), fetchAnnotations()])
      .then(([s, a]) => {
        setSessions(s);
        setAnnotations(a);
      })
      .catch(err => console.error('Failed to load week program data', err))
      .finally(() => setLoading(false));
  }, [weekStart]);

  /** The week's seven local date keys, Monday first. */
  const weekDays = useMemo(() => {
    const monday = dateFromKey(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      return localDateKey(date);
    });
  }, [weekStart]);

  /**
   * Games from the last 7 days with no annotated_games row. The rule is that
   * a game isn't finished until it has been analyzed, so this is surfaced as
   * a warning rather than left for memory to track.
   */
  const unanalyzed = useMemo(() => {
    const cutoff = daysAgoKey(7);
    const annotatedGameIds = new Set(annotations.map(a => a.gameId).filter(Boolean));
    // Fall back to opponent+date for rows created before game_id existed.
    const annotatedKeys = new Set(annotations.map(a => `${a.opponent ?? ''}|${a.date ?? ''}`));
    return games.filter(
      g =>
        g.date &&
        g.date >= cutoff &&
        !annotatedGameIds.has(g.id) &&
        !annotatedKeys.has(`${g.opp}|${g.date}`)
    );
  }, [games, annotations]);

  const doneMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const plannedTotal = trainingDays.reduce((sum, d) => sum + plannedMinutes(d), 0);

  /**
   * The headline metric: blocks completed out of 6.
   *
   * A day counts when it has at least one logged session — not when its
   * minutes were met. The plan's own target is 5 of 6, which is a
   * consistency target, and grading it on minutes would let one long
   * Saturday paper over four days of nothing.
   */
  const blocksDone = useMemo(() => {
    const daysWithSessions = new Set(sessions.map(s => s.sessionDate));
    return trainingDays.filter(d => daysWithSessions.has(weekDays[d.weekday])).length;
  }, [sessions, weekDays]);

  /** Games post-mortemed this week, against the plan's target of 2. */
  const annotationsThisWeek = useMemo(
    () => annotations.filter(a => a.date && a.date >= weekStart).length,
    [annotations, weekStart]
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-label">Semana del {weekStart}</div>
            <h2 className="text-h2 text-fg mt-1">Plan contra real</h2>
          </div>
          <div className="flex flex-wrap gap-8">
            {/* Blocks first: it is the metric the plan actually grades on. */}
            <div className="text-right">
              <div
                className={`text-h2 nums ${
                  blocksDone >= 5 ? 'text-win' : blocksDone >= 3 ? 'text-fg' : 'text-loss'
                }`}
              >
                {blocksDone}
                <span className="text-fg-subtle text-base"> / {WEEKLY_BLOCK_TARGET}</span>
              </div>
              <div className="text-xs text-fg-muted">bloques · objetivo 5</div>
            </div>
            <div className="text-right">
              <div
                className={`text-h2 nums ${
                  annotationsThisWeek >= WEEKLY_ANNOTATION_TARGET ? 'text-win' : 'text-loss'
                }`}
              >
                {annotationsThisWeek}
                <span className="text-fg-subtle text-base"> / {WEEKLY_ANNOTATION_TARGET}</span>
              </div>
              <div className="text-xs text-fg-muted">partidas analizadas</div>
            </div>
            <div className="text-right">
              <div className="text-h2 text-fg nums">
                {doneMinutes}
                <span className="text-fg-subtle text-base"> / {plannedTotal}</span>
              </div>
              <div className="text-xs text-fg-muted">minutos</div>
            </div>
          </div>
        </div>
      </Card>

      {unanalyzed.length > 0 && (
        <Card>
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-loss shrink-0 mt-0.5" />
            <div>
              <h3 className="text-fg font-medium">
                {unanalyzed.length} partida{unanalyzed.length > 1 ? 's' : ''} sin analizar
              </h3>
              <p className="text-sm text-fg-muted mt-1">
                Una partida no cuenta como jugada hasta que tiene su fila en Game Library.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-fg-muted">
                {unanalyzed.slice(0, 5).map(g => (
                  <li key={g.id}>
                    vs {g.opp} · {g.date}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trainingProgram.map(day => {
          const dateKey = weekDays[day.weekday];
          const isToday = dateKey === todayKey;
          const isPast = dateKey < todayKey;
          const daySessions = sessions.filter(s => s.sessionDate === dateKey);
          const doneBlocks = new Set(daySessions.map(s => s.block));
          const required = blocksForDay(day);
          const complete = required.every(b => doneBlocks.has(b));
          const dayMinutes = daySessions.reduce((sum, s) => sum + s.minutes, 0);

          return (
            <Card key={day.weekday}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-h3 text-fg">{day.dayName}</h3>
                    {isToday && <Badge tone="accent">Hoy</Badge>}
                  </div>
                  <p className="text-xs text-fg-subtle nums">{dateKey}</p>
                </div>
                {complete ? (
                  <CheckCircleIcon className="w-5 h-5 text-win shrink-0" />
                ) : isPast ? (
                  <span className="text-xs text-loss shrink-0">sin hacer</span>
                ) : null}
              </div>

              <p className="text-sm text-accent mt-2">{day.focus}</p>

              <ul className="mt-3 space-y-2">
                {day.blocks.map((block, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span
                      className={`shrink-0 nums w-12 ${
                        doneBlocks.has(block.block) ? 'text-win' : 'text-fg-subtle'
                      }`}
                    >
                      {block.minutes}m
                    </span>
                    <span
                      className={doneBlocks.has(block.block) ? 'text-fg' : 'text-fg-muted'}
                    >
                      {block.label}
                    </span>
                  </li>
                ))}
              </ul>

              {dayMinutes > 0 && (
                <p className="mt-3 border-t border-hairline pt-2 text-xs text-fg-muted nums">
                  {dayMinutes} min registrados
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {loading && <p className="text-sm text-fg-muted">Cargando sesiones…</p>}
    </div>
  );
};

export default WeekProgram;
