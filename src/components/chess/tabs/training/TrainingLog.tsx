import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fetchTrainingSessions, fetchTrainingAttempts, fetchAnnotations } from '../../../../api/client';
import { daysAgoKey, localDateKey, dateFromKey } from '../../../../utils/localDate';
import { WEEKLY_ANNOTATION_TARGET } from '../../../../constants/trainingProgram';
import { Card, SegmentedControl, type Segment } from '../../../ui';
import type { TrainingSession, TrainingAttempt } from '../../../../types/training';
import type { AnnotatedGame, AnnotationErrorType } from '../../../../types/chess';

/**
 * The diagnostic view.
 *
 * The headline is the candidate-miss split, because it is the one number
 * that changes what to train: a majority of "never occurred to me" means the
 * problem is candidate breadth, and more calculation depth won't fix it —
 * while the reverse means the moves are being found and then mis-evaluated.
 * Everything else here is supporting volume/consistency data.
 */

type Range = '30' | '90' | '365';

const RANGES: Segment<Range>[] = [
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
  { value: '365', label: '1 año' },
];

const ERROR_LABELS: Record<AnnotationErrorType, string> = {
  'candidate-miss': 'Pérdida de candidato',
  calculation: 'Cálculo',
  evaluation: 'Evaluación',
  clock: 'Reloj',
  opening: 'Apertura',
  technique: 'Técnica',
  none: 'Sin error claro',
};

const BLOCK_LABELS: Record<string, string> = {
  calculation: 'Cálculo',
  endgame: 'Finales',
  repertoire: 'Repertorio',
  play: 'Partidas',
  analysis: 'Análisis',
  concept: 'Conceptos',
  lesson: 'Clases',
  tactics: 'Táctica',
};

/** ISO week key ('2026-W31') for grouping, derived from a local date key. */
const isoWeekKey = (dateKey: string): string => {
  const date = dateFromKey(dateKey);
  const target = new Date(date);
  target.setDate(target.getDate() - ((date.getDay() + 6) % 7) + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(
    firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3
  );
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const TrainingLog = () => {
  const [range, setRange] = useState<Range>('90');
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const [annotations, setAnnotations] = useState<AnnotatedGame[]>([]);
  const [loading, setLoading] = useState(true);

  const from = useMemo(() => daysAgoKey(Number(range)), [range]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTrainingSessions(from), fetchTrainingAttempts(from), fetchAnnotations()])
      .then(([s, a, ann]) => {
        setSessions(s);
        setAttempts(a);
        setAnnotations(ann);
      })
      .catch(err => console.error('Failed to load training log', err))
      .finally(() => setLoading(false));
  }, [from]);

  /**
   * The candidate split. Only failed attempts that were actually asked the
   * question count — `candidateMiss === undefined` means "not asked", and
   * folding those into either bucket would fabricate a trend.
   */
  const candidateSplit = useMemo(() => {
    const asked = attempts.filter(a => !a.correct && a.candidateMiss !== undefined);
    const missed = asked.filter(a => a.candidateMiss).length;
    const rejected = asked.length - missed;
    return {
      asked: asked.length,
      missed,
      rejected,
      missedPct: asked.length ? Math.round((missed / asked.length) * 100) : 0,
    };
  }, [attempts]);

  /** Candidate split per ISO week, to see whether the balance is shifting. */
  const candidateTrend = useMemo(() => {
    const sessionDates = new Map(sessions.map(s => [s.id, s.sessionDate]));
    const byWeek = new Map<string, { missed: number; rejected: number }>();
    attempts
      .filter(a => !a.correct && a.candidateMiss !== undefined)
      .forEach(a => {
        const dateKey = a.sessionId
          ? sessionDates.get(a.sessionId)
          : localDateKey(new Date(a.createdAt));
        if (!dateKey) return;
        const week = isoWeekKey(dateKey);
        const entry = byWeek.get(week) ?? { missed: 0, rejected: 0 };
        if (a.candidateMiss) entry.missed += 1;
        else entry.rejected += 1;
        byWeek.set(week, entry);
      });
    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, ...v }));
  }, [attempts, sessions]);

  const minutesByBlock = useMemo(() => {
    const byBlock = new Map<string, number>();
    sessions.forEach(s => byBlock.set(s.block, (byBlock.get(s.block) ?? 0) + s.minutes));
    return [...byBlock.entries()]
      .map(([block, minutes]) => ({ block: BLOCK_LABELS[block] ?? block, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  /** Consecutive days ending today (or yesterday) with at least one session. */
  const streak = useMemo(() => {
    const days = new Set(sessions.map(s => s.sessionDate));
    let count = 0;
    for (let i = 0; i < 400; i += 1) {
      const key = daysAgoKey(i);
      if (days.has(key)) count += 1;
      // A gap on day 0 alone doesn't break the streak — the day isn't over.
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const errorDistribution = useMemo(() => {
    const byType = new Map<string, number>();
    annotations.forEach(a => {
      if (!a.errorType) return;
      byType.set(a.errorType, (byType.get(a.errorType) ?? 0) + 1);
    });
    return [...byType.entries()]
      .map(([type, count]) => ({
        type: ERROR_LABELS[type as AnnotationErrorType] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [annotations]);

  /** Post-mortems written in this window, against 2 per week pro-rated. */
  const annotationsInRange = useMemo(
    () => annotations.filter(a => a.date && a.date >= from).length,
    [annotations, from]
  );
  const expectedAnnotations = Math.round((Number(range) / 7) * WEEKLY_ANNOTATION_TARGET);

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalAttempted = attempts.length;
  const totalSolved = attempts.filter(a => a.correct).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 text-fg">Registro</h2>
        <SegmentedControl options={RANGES} value={range} onChange={setRange} size="sm" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-label">Minutos</div>
          <div className="text-h2 text-fg nums mt-1">{totalMinutes}</div>
        </Card>
        <Card>
          <div className="text-label">Ejercicios</div>
          <div className="text-h2 text-fg nums mt-1">
            {totalSolved}
            <span className="text-fg-subtle text-base"> / {totalAttempted}</span>
          </div>
        </Card>
        <Card>
          <div className="text-label">Racha</div>
          <div className="text-h2 text-fg nums mt-1">
            {streak}
            <span className="text-fg-subtle text-base"> días</span>
          </div>
        </Card>
        <Card>
          <div className="text-label">Partidas analizadas</div>
          <div className="text-h2 text-fg nums mt-1">
            {annotationsInRange}
            <span className="text-fg-subtle text-base"> / {expectedAnnotations}</span>
          </div>
          <div className="text-xs text-fg-muted mt-0.5">
            objetivo {WEEKLY_ANNOTATION_TARGET} por semana
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-h3 text-fg">¿Por qué fallás?</h3>
        {candidateSplit.asked === 0 ? (
          <p className="text-sm text-fg-muted mt-2">
            Todavía no hay fallos registrados con la pregunta de candidatos. Aparece acá
            después de errar un ejercicio de cálculo en la cola de Hoy.
          </p>
        ) : (
          <>
            <p className="text-sm text-fg-muted mt-1">
              Sobre {candidateSplit.asked} fallo{candidateSplit.asked > 1 ? 's' : ''} de cálculo.
            </p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full"
                style={{
                  width: `${candidateSplit.missedPct}%`,
                  backgroundColor: 'rgb(var(--loss))',
                }}
              />
              <div
                className="h-full"
                style={{
                  width: `${100 - candidateSplit.missedPct}%`,
                  backgroundColor: 'rgb(var(--draw))',
                }}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-h3 nums" style={{ color: 'rgb(var(--loss))' }}>
                    {candidateSplit.missedPct}%
                  </span>
                  <span className="text-sm text-fg">nunca se me ocurrió</span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Falla de barrido — entrená generar candidatos, no calcular más hondo.
                </p>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-h3 nums" style={{ color: 'rgb(var(--draw))' }}>
                    {100 - candidateSplit.missedPct}%
                  </span>
                  <span className="text-sm text-fg">la descarté</span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Falla de cálculo o evaluación — la jugada aparecía y la juzgaste mal.
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {candidateTrend.length > 1 && (
        <Card>
          <h3 className="text-h3 text-fg mb-4">Evolución por semana</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={candidateTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="missed"
                  name="Nunca se me ocurrió"
                  stackId="a"
                  fill="rgb(var(--loss))"
                />
                <Bar
                  dataKey="rejected"
                  name="La descarté"
                  stackId="a"
                  fill="rgb(var(--draw))"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-h3 text-fg mb-4">Minutos por bloque</h3>
          {minutesByBlock.length === 0 ? (
            <p className="text-sm text-fg-muted">Sin sesiones registradas en este período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={minutesByBlock} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="block" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="minutes" name="Minutos" fill="rgb(var(--cat-1))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-h3 text-fg mb-4">Por qué perdés partidas</h3>
          {errorDistribution.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Ninguna partida analizada tiene todavía un tipo de error cargado. Se completa
              desde Game Library.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="type" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Partidas" fill="rgb(var(--cat-2))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {loading && <p className="text-sm text-fg-muted">Cargando…</p>}
    </div>
  );
};

export default TrainingLog;
