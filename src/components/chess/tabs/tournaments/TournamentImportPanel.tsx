import { useCallback, useMemo, useState } from 'react';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { Card, Button, Badge, resultTone } from '../../../ui';
import { parseRounds, roundsScore, type ParsedRound } from '../../../../utils/roundsImport';
import { postTournament, postGames } from '../../../../api/client';
import { useGames } from '../../../../context/GamesContext';

/**
 * Loads a tournament that has results but no moves.
 *
 * Team events at 12+3 are never notated, so the crosstable is the only record
 * that exists. Games are stored without PGN — safe, because every feature that
 * needs moves (blunder/endgame mining, analysis, replay, repertoire matching)
 * filters on `pgn` and skips the row. They show up in the statistics and stay
 * invisible to the engine.
 *
 * The official numbers are entered, not derived. For Copa Cultura AFA XX the
 * federation reports a 1750 performance where this app's formula gives ~1830
 * or ~1515 depending on how the unrated opponent is handled — showing a number
 * that contradicts the sheet you're holding is worse than showing none.
 */

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

const PLACEHOLDER =
  '1 | Romanelli, Gabriel | 2054 | B | ½\n' +
  '2 | Paredes, Ezequiel | 1725 | N | 0\n' +
  '3 | Duarte, Pablo | 1904 | B | 1';

interface Draft {
  name: string;
  kind: 'individual' | 'equipos';
  category: string;
  timeControl: string;
  startDate: string;
  affectsElo: boolean;
  myElo: string;
  officialPerformance: string;
  officialPlace: string;
  startingRank: string;
  eloChange: string;
  club: string;
  notes: string;
}

const emptyDraft = (): Draft => ({
  name: '',
  kind: 'equipos',
  category: '',
  timeControl: '12+3',
  startDate: '',
  affectsElo: false,
  myElo: '',
  officialPerformance: '',
  officialPlace: '',
  startingRank: '',
  eloChange: '',
  club: '',
  notes: '',
});

/** Blank -> undefined, so an untouched field doesn't write 0 into the row. */
const num = (raw: string): number | undefined => {
  const value = raw.trim();
  if (!value) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="text-label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-fg-subtle">{hint}</span>}
  </label>
);

const TournamentImportPanel = () => {
  const { refetchGames } = useGames();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [table, setTable] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  /** Live preview, so a bad column order is visible before anything is written. */
  const rounds = useMemo(() => parseRounds(table), [table]);
  const score = useMemo(() => roundsScore(rounds), [rounds]);

  /** Lines that looked like data but couldn't be read — the real failure mode. */
  const skipped = useMemo(
    () =>
      table
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('|') && !/ronda|rival/i.test(line))
        .filter(line => parseRounds(line).length === 0),
    [table]
  );

  const myElo = num(draft.myElo);
  const canImport = Boolean(draft.name.trim()) && rounds.length > 0 && myElo !== undefined && !saving;

  const handleImport = useCallback(async () => {
    if (!canImport || myElo === undefined) return;
    setSaving(true);
    setError(null);
    setDone(null);
    const name = draft.name.trim();
    try {
      // Upserts on name, so re-pasting a corrected table fixes the row
      // instead of failing on the unique constraint.
      await postTournament({
        name,
        kind: draft.kind,
        category: draft.category.trim() || undefined,
        timeControl: draft.timeControl.trim() || undefined,
        startDate: draft.startDate || undefined,
        affectsElo: draft.affectsElo,
        officialPerformance: num(draft.officialPerformance),
        officialPoints: score,
        officialPlace: num(draft.officialPlace),
        startingRank: num(draft.startingRank),
        eloBefore: myElo,
        eloChange: num(draft.eloChange),
        club: draft.club.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      });

      // postGames + refetch rather than the context's importPgnGames, whose
      // name would be a lie here: these rows deliberately carry no moves.
      await postGames(
        rounds.map((r: ParsedRound) => ({
          elo: myElo,
          color: r.color,
          result: r.result,
          opp: r.opponent,
          // Zero, never undefined: calculateExpectedScore only special-cases 0.
          opp_elo: r.opponentElo,
          eco: 'Unknown',
          tournament: name,
          // Rated for every statistic...
          rated: true,
          // ...but off the rating curve when the event doesn't move it.
          affectsElo: draft.affectsElo,
          source: 'otb' as const,
          date: draft.startDate || undefined,
          timeControl: draft.timeControl.trim() || undefined,
          eloChange: 0,
        }))
      );
      await refetchGames();

      setDone(`${name}: ${rounds.length} partidas, ${score} puntos.`);
      setDraft(emptyDraft());
      setTable('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar el torneo');
    } finally {
      setSaving(false);
    }
  }, [canImport, myElo, draft, rounds, score, refetchGames]);

  if (!open) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-h3 text-fg flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-accent" />
              Cargar un torneo sin PGN
            </h3>
            <p className="text-sm text-fg-muted mt-1">
              Pegá la tabla de rondas de un torneo por equipos o de cualquier evento del que no
              tengas las planillas.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Cargar torneo</Button>
        </div>
        {done && <p className="mt-3 text-sm text-win">{done}</p>}
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-h3 text-fg flex items-center gap-2">
        <ClipboardDocumentListIcon className="w-5 h-5 text-accent" />
        Cargar un torneo sin PGN
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nombre del torneo">
          <input
            className={`${INPUT_CLASS} mt-1`}
            placeholder="Copa Cultura AFA XIX"
            value={draft.name}
            onChange={e => set('name', e.target.value)}
          />
        </Field>
        <Field label="Tu ELO en el torneo" hint="Se guarda en cada partida.">
          <input
            className={`${INPUT_CLASS} mt-1`}
            inputMode="numeric"
            placeholder="1878"
            value={draft.myElo}
            onChange={e => set('myElo', e.target.value)}
          />
        </Field>
        <Field label="Fecha de inicio">
          <input
            type="date"
            className={`${INPUT_CLASS} mt-1`}
            value={draft.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="Tipo">
          <select
            className={`${INPUT_CLASS} mt-1`}
            value={draft.kind}
            onChange={e => set('kind', e.target.value as Draft['kind'])}
          >
            <option value="equipos">Por equipos</option>
            <option value="individual">Individual</option>
          </select>
        </Field>
        <Field label="Categoría" hint="reserva / superior — para comparar ediciones.">
          <input
            className={`${INPUT_CLASS} mt-1`}
            placeholder="reserva"
            value={draft.category}
            onChange={e => set('category', e.target.value)}
          />
        </Field>
        <Field label="Ritmo">
          <input
            className={`${INPUT_CLASS} mt-1`}
            placeholder="12+3"
            value={draft.timeControl}
            onChange={e => set('timeControl', e.target.value)}
          />
        </Field>
        <Field label="Performance oficial" hint="La de la planilla, no se recalcula.">
          <input
            className={`${INPUT_CLASS} mt-1`}
            inputMode="numeric"
            placeholder="1750"
            value={draft.officialPerformance}
            onChange={e => set('officialPerformance', e.target.value)}
          />
        </Field>
        <Field label="Puesto">
          <input
            className={`${INPUT_CLASS} mt-1`}
            inputMode="numeric"
            placeholder="40"
            value={draft.officialPlace}
            onChange={e => set('officialPlace', e.target.value)}
          />
        </Field>
        <Field label="Ranking inicial">
          <input
            className={`${INPUT_CLASS} mt-1`}
            inputMode="numeric"
            placeholder="14"
            value={draft.startingRank}
            onChange={e => set('startingRank', e.target.value)}
          />
        </Field>
        <Field label="Variación de ELO" hint="La informada por la federación (ej. 1.4).">
          <input
            className={`${INPUT_CLASS} mt-1`}
            inputMode="decimal"
            placeholder="1.4"
            value={draft.eloChange}
            onChange={e => set('eloChange', e.target.value)}
          />
        </Field>
        <Field label="Club">
          <input
            className={`${INPUT_CLASS} mt-1`}
            value={draft.club}
            onChange={e => set('club', e.target.value)}
          />
        </Field>
        <Field label="Nota">
          <input
            className={`${INPUT_CLASS} mt-1`}
            value={draft.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </Field>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-lg border border-hairline bg-surface-2 p-3">
        <input
          type="checkbox"
          className="mt-0.5 accent-[var(--accent)]"
          checked={!draft.affectsElo}
          onChange={e => set('affectsElo', !e.target.checked)}
        />
        <span className="text-sm text-fg">
          No afecta mi ELO
          <span className="mt-0.5 block text-xs text-fg-subtle">
            Las partidas cuentan para performance, rivales, colores, rachas y records, pero no
            mueven la curva de ELO ni la proyección al objetivo. Marcalo para los torneos por
            equipos.
          </span>
        </span>
      </label>

      <div className="mt-4">
        <span className="text-label">Tabla de rondas</span>
        <p className="text-sm text-fg-muted mt-1">
          Una línea por ronda:{' '}
          <span className="font-mono text-xs">Ronda | Rival | Elo | Color | Resultado</span>. El
          color acepta <span className="font-mono text-xs">B/N</span>,{' '}
          <span className="font-mono text-xs">□/■</span> o la palabra entera; el resultado acepta{' '}
          <span className="font-mono text-xs">1 / 0 / ½</span>. Un rival sin ELO se guarda como 0.
        </p>
        <textarea
          className={`${INPUT_CLASS} mt-2 font-mono text-xs`}
          rows={8}
          placeholder={PLACEHOLDER}
          value={table}
          onChange={e => setTable(e.target.value)}
        />
      </div>

      {rounds.length > 0 && (
        <div className="mt-3 rounded-lg border border-hairline bg-surface-2 p-3">
          <div className="text-label">
            Vista previa · {rounds.length} ronda{rounds.length > 1 ? 's' : ''} · {score} punto
            {score === 1 ? '' : 's'}
          </div>
          <div className="mt-2 space-y-1">
            {rounds.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-fg-muted">
                <span className="w-6 text-fg-subtle">{r.round ?? i + 1}</span>
                <Badge tone={resultTone(r.result)}>{r.result}</Badge>
                <span className="text-fg">{r.opponent}</span>
                <span>{r.opponentElo === 0 ? 'sin ELO' : r.opponentElo}</span>
                <span>{r.color === 'W' ? 'blancas' : 'negras'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <p className="mt-3 text-sm text-loss">
          {skipped.length} línea{skipped.length > 1 ? 's' : ''} no se pudo leer y no se va a
          importar: <span className="font-mono text-xs">{skipped[0]}</span>
        </p>
      )}

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={() => void handleImport()} disabled={!canImport}>
          {saving ? 'Importando…' : `Importar ${rounds.length || ''} partidas`}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        {!draft.myElo.trim() && rounds.length > 0 && (
          <span className="text-xs text-fg-subtle">Falta tu ELO en el torneo.</span>
        )}
      </div>
    </Card>
  );
};

export default TournamentImportPanel;
