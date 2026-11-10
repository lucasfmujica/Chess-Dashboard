import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  fetchTrainingSessions,
  fetchAnnotations,
  postTrainingSession,
  deleteTrainingSession,
} from '../../../../api/client';
import {
  programForDate,
  plannedMinutes,
  blocksForDay,
  WEEKLY_ANNOTATION_TARGET,
} from '../../../../constants/trainingProgram';
import { localDateKey, daysAgoKey, dateFromKey } from '../../../../utils/localDate';
import { useGames } from '../../../../context/GamesContext';
import { useUI } from '../../../../context/UIContext';
import { unanalyzedGames } from '../../../../utils/annotationMatching';
import { gameLabel } from '../../../../utils/gameMapping';
import { Card, Badge, Button, ClockBar, StatCard } from '../../../ui';
import ReflectionHistory from './ReflectionHistory';
import type { TrainingBlock, TrainingSession } from '../../../../types/training';
import type { AnnotatedGame } from '../../../../types/chess';

/**
 * The week: what the program prescribes, against what was actually logged.
 *
 * This absorbed the old free-form Planificador, which was a parallel system
 * that shared nothing with this one — it stored activities in localStorage
 * under ids (`tactics`, `games`, `rest`) that aren't `TrainingBlock` values,
 * so a week built there was invisible to Hoy, Semana and Registro alike. It
 * also always rendered the current week regardless of which week you had
 * navigated to. Rather than reconcile two vocabularies, the planner's blocks
 * are gone and the program is the plan.
 *
 * What survived the merge is what carried real content: the weekly
 * reflection and the per-day notes, which keep their existing localStorage
 * keys so everything already written is still here.
 *
 * The plan itself is static config; only what happened is stored. That's
 * deliberate — a mutable plan drifts to match whatever was done, and then
 * the comparison stops meaning anything.
 */

/** Monday of the week containing `date`, as a local 'YYYY-MM-DD' key. */
const mondayOf = (date: Date): string => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateKey(monday);
};

/** `weekStart` shifted by whole weeks, staying on a Monday. */
const shiftWeek = (weekStart: string, weeks: number): string => {
  const date = dateFromKey(weekStart);
  date.setDate(date.getDate() + weeks * 7);
  return localDateKey(date);
};

const WEEKDAY_NOTE_ROWS = 2;

interface WeekProgramProps {
  dailyNotes: Record<string, string>;
  updateDailyNote: (key: string, note: string) => void;
}

const WeekProgram = ({ dailyNotes, updateDailyNote }: WeekProgramProps) => {
  // The unfiltered list on purpose: the header filter defaults to OTB, and a
  // Thursday game played online is exactly the one this card is chasing.
  const { games } = useGames();
  const { setActiveTab, setPendingAnnotationGameId } = useUI();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [annotations, setAnnotations] = useState<AnnotatedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = useMemo(() => localDateKey(), []);
  const thisMonday = useMemo(() => mondayOf(new Date()), []);
  const [weekStart, setWeekStart] = useState(thisMonday);
  const isCurrentWeek = weekStart === thisMonday;

  const reload = useCallback(() => {
    setLoading(true);
    // The sessions endpoint takes a `since` date, so a past week is fetched
    // from its own Monday and then filtered to the seven days below.
    return Promise.all([fetchTrainingSessions(weekStart), fetchAnnotations()])
      .then(([s, a]) => {
        setSessions(s);
        setAnnotations(a);
      })
      .catch(err => console.error('Failed to load week program data', err))
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Tick a block off by hand.
   *
   * Until now the only thing that could write a session was the daily queue,
   * and it writes exactly one block, taken from its first item. Cross that
   * against what each day requires and no day of the week could ever be
   * complete: Martes asks for `lesson` and Jueves/Viernes/Sábado for
   * play/analysis/concept, none of which the queue can produce, and the
   * 5-minute Studer tail on Lun/Mié/Vie is a second block the queue never
   * logs either. Every past day therefore read "sin hacer" no matter what was
   * actually trained.
   *
   * Manual rows are marked `source: 'manual'` and only those can be unticked —
   * a queue session stands for exercises that were really resolved, and one
   * stray click should not be able to delete that record.
   */
  const [togglingBlock, setTogglingBlock] = useState<string | null>(null);

  const toggleBlock = useCallback(
    async (
      dateKey: string,
      block: TrainingBlock,
      minutes: number,
      existing: TrainingSession | undefined
    ) => {
      if (existing && existing.source !== 'manual') return;
      setTogglingBlock(`${dateKey}:${block}`);
      try {
        if (existing) {
          await deleteTrainingSession(existing.id);
        } else {
          // The plan's own figure for the block: a hand-ticked block still has
          // to contribute to the week's minutes, and 0 would silently deflate
          // the plan-vs-real comparison this whole view exists for.
          await postTrainingSession({ sessionDate: dateKey, block, minutes, source: 'manual' });
        }
        await reload();
      } catch (err) {
        console.error('Failed to toggle training block', err);
      } finally {
        setTogglingBlock(null);
      }
    },
    [reload]
  );

  /** The week's seven local date keys, Monday first. */
  const weekDays = useMemo(() => {
    const monday = dateFromKey(weekStart);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      return localDateKey(date);
    });
  }, [weekStart]);

  const weekEnd = weekDays[6];

  /**
   * One program per concrete date, so a week straddling the plan-final window
   * edge shows the plan only on the dates inside it.
   */
  const weekPrograms = useMemo(() => weekDays.map(programForDate), [weekDays]);
  const weekTrainingDays = useMemo(() => weekPrograms.filter(d => d.isTrainingDay), [weekPrograms]);
  const weeklyBlockTarget = weekTrainingDays.length;

  /** Only this week's sessions — `since` returns everything after it. */
  const weekSessions = useMemo(
    () => sessions.filter(s => s.sessionDate >= weekStart && s.sessionDate <= weekEnd),
    [sessions, weekStart, weekEnd]
  );

  /**
   * Games from the last 7 days with no annotated_games row. The rule is that
   * a game isn't finished until it has been analyzed, so this is surfaced as
   * a warning rather than left for memory to track. Only meaningful for the
   * current week — a past week's backlog was either cleared or never will be.
   */
  const unanalyzed = useMemo(
    () => (isCurrentWeek ? unanalyzedGames(games, annotations, daysAgoKey(7)) : []),
    [games, annotations, isCurrentWeek]
  );

  const doneMinutes = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
  const plannedTotal = weekTrainingDays.reduce((sum, d) => sum + plannedMinutes(d), 0);

  /**
   * The headline metric: blocks completed out of 6.
   *
   * A day counts when it has at least one logged session — not when its
   * minutes were met. The plan's own target is 5 of 6, which is a
   * consistency target, and grading it on minutes would let one long
   * Saturday paper over four days of nothing.
   */
  const blocksDone = useMemo(() => {
    const daysWithSessions = new Set(weekSessions.map(s => s.sessionDate));
    return weekPrograms.filter((d, i) => d.isTrainingDay && daysWithSessions.has(weekDays[i])).length;
  }, [weekSessions, weekDays, weekPrograms]);

  /** Games post-mortemed this week, against the plan's target of 2. */
  const annotationsThisWeek = useMemo(
    () => annotations.filter(a => a.date && a.date >= weekStart && a.date <= weekEnd).length,
    [annotations, weekStart, weekEnd]
  );

  // Same key the old planner wrote, so past reflections are still here.
  const summaryKey = `${weekStart}-summary`;

  const weekLabel = dateFromKey(weekStart).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWeekStart(w => shiftWeek(w, -1))}
            aria-label="Semana anterior"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <span className="text-label">Semana del {weekLabel}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWeekStart(w => shiftWeek(w, 1))}
            aria-label="Semana siguiente"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
          {!isCurrentWeek && (
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(thisMonday)}>
              Hoy
            </Button>
          )}
        </div>
        <p className="text-sm text-fg-muted">
          Tocá un bloque para marcarlo como hecho. Los que registró la cola de ejercicios quedan fijos.
        </p>
      </div>

      {/* Blocks first: it is the metric the plan actually grades on. */}
      <ClockBar>
        <StatCard
          title="Bloques"
          value={`${blocksDone} / ${weeklyBlockTarget}`}
          subtitle="días con algo hecho · objetivo 5"
          trend={blocksDone >= 5 ? 'up' : undefined}
        />
        <StatCard
          title="Partidas analizadas"
          value={`${annotationsThisWeek} / ${WEEKLY_ANNOTATION_TARGET}`}
          subtitle="esta semana"
          trend={annotationsThisWeek >= WEEKLY_ANNOTATION_TARGET ? 'up' : undefined}
        />
        <StatCard title="Minutos" value={`${doneMinutes} / ${plannedTotal}`} subtitle="hecho contra plan" />
      </ClockBar>

      {unanalyzed.length > 0 && (
        <Card>
          <h3 className="font-serif text-lg font-semibold text-fg">
            {unanalyzed.length} partida{unanalyzed.length > 1 ? 's' : ''} sin analizar
          </h3>
          <p className="text-sm text-fg-muted mt-1">
            Una partida no cuenta como jugada hasta que tiene su fila en la biblioteca de partidas.
          </p>
          <ul className="mt-2 space-y-1">
            {unanalyzed.slice(0, 5).map(g => (
              <li key={g.id ?? `${g.opp}-${g.date}`}>
                <button
                  onClick={() => {
                    if (g.id) setPendingAnnotationGameId(g.id);
                    setActiveTab('annotations');
                  }}
                  className="w-full text-left px-2 py-1 -mx-2 rounded text-sm text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors flex items-center justify-between gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span>{gameLabel(g)}</span>
                  <span className="text-xs text-accent shrink-0">Analizar →</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* The week as a seven-column sheet, like a printed planner. Scrolls
          sideways inside its own frame on narrow screens. */}
      <Card flush>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline px-5 py-4">
          <h2 className="font-serif text-xl font-semibold text-fg">Plan contra real</h2>
          <span className="text-xs text-fg-subtle">Semana del {weekLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[1050px] grid-cols-[repeat(7,minmax(150px,1fr))]">
            {weekPrograms.map((day, dayIndex) => {
              const dateKey = weekDays[dayIndex];
              const isToday = dateKey === todayKey;
              const isPast = dateKey < todayKey;
              const daySessions = weekSessions.filter(s => s.sessionDate === dateKey);
              const doneBlocks = new Set(daySessions.map(s => s.block));
              // The row backing each tick, so the toggle knows what to delete and
              // whether it may (only `source: 'manual'` rows are removable here).
              const sessionByBlock = new Map(daySessions.map(s => [s.block, s]));
              // A session row is per (day, block), but a day can prescribe the same
              // block twice — Miércoles has two `endgame` entries. Ticking either
              // one logs the block's whole planned time for the day, so the minutes
              // don't come out short.
              const blockMinutes = day.blocks.reduce<Record<string, number>>((acc, b) => {
                acc[b.block] = (acc[b.block] ?? 0) + b.minutes;
                return acc;
              }, {});
              const required = blocksForDay(day);
              // Vacuously true on the rest day, which is the wanted reading:
              // nothing was required, so nothing is outstanding.
              const complete = required.every(b => doneBlocks.has(b));
              const dayMinutes = daySessions.reduce((sum, s) => sum + s.minutes, 0);

              return (
                <section
                  key={dateKey}
                  aria-label={`${day.dayName} ${dateKey}`}
                  aria-current={isToday ? 'date' : undefined}
                  className={`flex flex-col border-r border-hairline last:border-r-0 ${isToday ? 'bg-carbon' : ''}`}
                >
                  <div
                    className={`flex items-baseline justify-between gap-2 border-b border-hairline-strong px-3 py-2.5 ${
                      isToday ? 'bg-carbon' : 'bg-surface-2'
                    }`}
                  >
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isToday ? 'text-fg' : 'text-fg-muted'}`}>
                      {day.dayName}
                      {isToday && <span className="sr-only"> (hoy)</span>}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-fg-muted">
                      {plannedMinutes(day)}′
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs">
                    <span className="font-mono tabular-nums text-fg-subtle">{dateKey.slice(5)}</span>
                    {complete ? (
                      <span className="text-win">hecho</span>
                    ) : isPast ? (
                      <Badge tone="alert">sin hacer</Badge>
                    ) : null}
                  </div>

                  {day.focus && <p className="px-3 pt-1 text-xs text-accent">{day.focus}</p>}

                  <ul className="mt-1">
                    {day.blocks.map((block, i) => {
                      const session = sessionByBlock.get(block.block);
                      const isDone = session !== undefined;
                      // A queue session is evidence of exercises actually resolved;
                      // it is shown as done but cannot be unticked from here.
                      const locked = isDone && session.source !== 'manual';
                      const busy = togglingBlock === `${dateKey}:${block.block}`;
                      return (
                        <li key={i} className="border-b border-hairline">
                          <button
                            type="button"
                            onClick={() =>
                              void toggleBlock(dateKey, block.block, blockMinutes[block.block], session)
                            }
                            disabled={locked || busy}
                            aria-pressed={isDone}
                            title={
                              locked
                                ? 'Registrado por la cola de ejercicios'
                                : isDone
                                  ? 'Desmarcar este bloque'
                                  : 'Marcar este bloque como hecho'
                            }
                            className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 ${
                              locked ? 'cursor-default' : isToday ? 'hover:bg-fg/5' : 'hover:bg-app'
                            } ${busy ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`font-serif text-[15px] leading-5 text-fg ${
                                isDone ? 'line-through decoration-accent decoration-2' : ''
                              }`}
                            >
                              {block.label}
                            </span>
                            <span className={`font-mono text-xs tabular-nums ${isToday ? 'text-fg-muted' : 'text-fg-subtle'}`}>
                              {block.minutes} min{isDone ? ' · hecho' : ''}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto px-3 pb-3 pt-2">
                    {dayMinutes > 0 && (
                      <p className="mb-2 font-mono text-xs tabular-nums text-fg-muted">{dayMinutes} min registrados</p>
                    )}
                    {/* Per-day note, carried over from the planner's day cards. */}
                    <textarea
                      aria-label={`Nota del ${day.dayName}`}
                      className="w-full rounded border border-hairline bg-surface px-2 py-1.5 font-serif text-sm text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
                      rows={WEEKDAY_NOTE_ROWS}
                      placeholder="Nota del día…"
                      value={dailyNotes[dateKey] ?? ''}
                      onChange={e => updateDailyNote(dateKey, e.target.value)}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-serif text-xl font-semibold text-fg">Reflexión de la semana</h3>
        <p className="text-sm text-fg-muted mt-1">
          ¿Qué funcionó, qué no, y qué cambia la semana que viene?
        </p>
        <textarea
          className="mt-3 w-full resize-none rounded border border-hairline bg-surface px-4 py-3 font-serif text-[15px] leading-6 text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
          rows={6}
          placeholder="Cómo fue la semana, qué salió bien, qué hay que corregir…"
          value={dailyNotes[summaryKey] ?? ''}
          onChange={e => updateDailyNote(summaryKey, e.target.value)}
        />
      </Card>

      <ReflectionHistory dailyNotes={dailyNotes} currentWeek={weekStart} />

      {loading && <p className="text-sm text-fg-muted">Cargando sesiones…</p>}
    </div>
  );
};

export default WeekProgram;
