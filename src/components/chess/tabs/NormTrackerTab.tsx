import { useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import { useSourceFilteredGames } from '../../../context/GamesContext';
import { useGameStats } from '../../../hooks/useGameStats';
import { useNormTracker } from '../../../hooks/useNormTracker';
import { Badge, Button, Card, CardHeader, ClockBar, StatCard, Table, TBody, TD, TH, THead, TR } from '../../ui';
import type { NormAttempt, NormThresholds, NormTitle } from '../../../types/norms';

const TITLES: NormTitle[] = ['IM', 'GM', 'WIM', 'WGM'];

const emptyForm: Partial<NormAttempt> = { titleTarget: 'IM' };

const FIELD =
  'w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

const NormTrackerTab = () => {
  const modal = useModal();
  const games = useSourceFilteredGames();
  const { tournamentStats } = useGameStats(games.filter(g => g.rated));
  const { attempts, thresholds, loading, error, saveAttempt, removeAttempt, saveThresholds } = useNormTracker();

  const [form, setForm] = useState<Partial<NormAttempt> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingThresholds, setEditingThresholds] = useState<NormThresholds | null>(null);
  const [focusTitle, setFocusTitle] = useState<NormTitle>('IM');

  const applyTournament = (tournament: string) => {
    const stat = tournamentStats.find(t => t.tournament === tournament);
    setForm(f => ({
      ...f,
      tournament,
      gamesCount: stat?.total ?? f?.gamesCount,
      performanceRating: stat?.performanceRating ?? f?.performanceRating,
    }));
  };

  const save = async () => {
    if (!form?.tournament || !form.titleTarget) return;
    await saveAttempt(form, editingId ?? undefined);
    setForm(null);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    const confirmed = await modal.confirm('¿Borrar este torneo del seguimiento de normas?');
    if (confirmed) await removeAttempt(id);
  };

  const clearance = (a: NormAttempt) => {
    const threshold = thresholds[a.titleTarget];
    if (a.performanceRating == null) return null;
    return a.performanceRating >= threshold;
  };

  const sortedAttempts = useMemo(() => [...attempts].sort((a, b) => b.createdAt - a.createdAt), [attempts]);

  const focus = useMemo(() => {
    const forTitle = attempts.filter(a => a.titleTarget === focusTitle);
    const perfs = forTitle.map(a => a.performanceRating).filter((p): p is number => p != null);
    return {
      count: forTitle.length,
      best: perfs.length ? Math.max(...perfs) : null,
      titled: forTitle.reduce((sum, a) => sum + (a.titledOpponents ?? 0), 0),
      foreign: forTitle.reduce((sum, a) => sum + (a.foreignOpponents ?? 0), 0),
    };
  }, [attempts, focusTitle]);

  const numberInput = (key: 'gamesCount' | 'performanceRating' | 'titledOpponents' | 'foreignOpponents', id: string, label: string) => (
    <div>
      <label htmlFor={id} className="text-label mb-1.5 block">{label}</label>
      <input
        id={id}
        type="number"
        value={form?.[key] ?? ''}
        onChange={e => setForm({ ...form, [key]: e.target.value ? Number(e.target.value) : undefined })}
        className={`${FIELD} font-mono`}
      />
    </div>
  );

  const openForm = () => { setForm({ ...emptyForm, titleTarget: focusTitle }); setEditingId(null); };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Cargá cada torneo para seguir el camino a una norma de título.</p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="norm-focus" className="text-label">Título</label>
          <select
            id="norm-focus"
            value={focusTitle}
            onChange={e => setFocusTitle(e.target.value as NormTitle)}
            className="h-8 rounded border border-hairline bg-surface px-2 text-[13px] text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button variant="primary" size="sm" icon={PlusIcon} onClick={openForm}>
            Cargar torneo
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <ClockBar>
        <StatCard title="Objetivo" value={focusTitle} subtitle={`rendimiento ${thresholds[focusTitle]}`} />
        <StatCard
          title="Mejor rendimiento"
          value={focus.best ?? '—'}
          trend={focus.best != null ? (focus.best >= thresholds[focusTitle] ? 'up' : 'down') : undefined}
          subtitle={
            focus.best == null
              ? 'ningún torneo cargado'
              : focus.best >= thresholds[focusTitle]
                ? 'alcanza el umbral'
                : `faltan ${thresholds[focusTitle] - focus.best}`
          }
        />
        <StatCard title="Rivales titulados" value={focus.titled} subtitle={`en ${focus.count} ${focus.count === 1 ? 'torneo' : 'torneos'} cargados`} />
        <StatCard title="Rivales extranjeros" value={focus.foreign} subtitle="de otra federación" />
      </ClockBar>

      {form !== null && (
        <Card>
          <CardHeader title={editingId ? 'Editar torneo' : 'Cargar un torneo'} />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="norm-title" className="text-label mb-1.5 block">Título buscado</label>
              <select
                id="norm-title"
                value={form.titleTarget ?? 'IM'}
                onChange={e => setForm({ ...form, titleTarget: e.target.value as NormTitle })}
                className={FIELD}
              >
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="norm-tournament" className="text-label mb-1.5 block">Torneo</label>
              <input
                id="norm-tournament"
                type="text"
                list="norm-tournament-options"
                placeholder="Elegí o escribí el nombre del torneo"
                value={form.tournament ?? ''}
                onChange={e => applyTournament(e.target.value)}
                className={FIELD}
              />
              <datalist id="norm-tournament-options">
                {tournamentStats.map(t => <option key={t.tournament} value={t.tournament} />)}
              </datalist>
              <p className="mt-1 text-xs text-fg-subtle">Si elegís un torneo que ya tenés cargado, completa partidas y rendimiento.</p>
            </div>
            {numberInput('gamesCount', 'norm-games', 'Partidas jugadas')}
            {numberInput('performanceRating', 'norm-perf', 'Rendimiento')}
            {numberInput('titledOpponents', 'norm-titled', 'Rivales titulados')}
            {numberInput('foreignOpponents', 'norm-foreign', 'Rivales de otra federación')}
            <div className="md:col-span-2">
              <label htmlFor="norm-notes" className="text-label mb-1.5 block">Notas</label>
              <input
                id="norm-notes"
                type="text"
                placeholder="Lo que valga la pena recordar de este torneo"
                value={form.notes ?? ''}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className={FIELD}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => void save()}>{editingId ? 'Guardar cambios' : 'Guardar'}</Button>
            <Button variant="secondary" onClick={() => { setForm(null); setEditingId(null); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
        <Card flush className="overflow-hidden">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <CardHeader title="Torneos cargados" className="mb-4" />
          </div>
          {loading ? (
            <p className="px-6 pb-6 text-sm text-fg-muted">Cargando…</p>
          ) : sortedAttempts.length === 0 ? (
            <div className="border-t border-hairline px-6 py-8 text-center">
              <p className="font-serif text-[17px] text-fg">Todavía no cargaste ningún torneo.</p>
              <p className="mb-4 mt-1 text-sm text-fg-muted">
                Cargá uno con su rendimiento, rivales titulados y federaciones, y lo comparo contra los umbrales.
              </p>
              <Button onClick={openForm}>Cargar el primero</Button>
            </div>
          ) : (
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <Table>
                <THead>
                  <tr>
                    <TH>Torneo</TH>
                    <TH>Título</TH>
                    <TH align="right">P</TH>
                    <TH align="right">Rend.</TH>
                    <TH align="right">Titulados</TH>
                    <TH align="right">Extranjeros</TH>
                    <TH>Norma</TH>
                    <TH><span className="sr-only">Acciones</span></TH>
                  </tr>
                </THead>
                <TBody>
                  {sortedAttempts.map(a => {
                    const cleared = clearance(a);
                    return (
                      <TR key={a.id}>
                        <TD className="min-w-[180px]">
                          <div className="font-serif text-[15px] text-fg">{a.tournament}</div>
                          {a.notes && <div className="text-xs text-fg-subtle">{a.notes}</div>}
                        </TD>
                        <TD><Badge tone="accent">{a.titleTarget}</Badge></TD>
                        <TD align="right" className="font-mono">{a.gamesCount ?? '—'}</TD>
                        <TD align="right" className="font-mono">
                          {a.performanceRating ?? '—'}
                          <span className="block text-xs text-fg-subtle">de {thresholds[a.titleTarget]}</span>
                        </TD>
                        <TD align="right" className="font-mono">{a.titledOpponents ?? '—'}</TD>
                        <TD align="right" className="font-mono">{a.foreignOpponents ?? '—'}</TD>
                        <TD>
                          {cleared === null ? (
                            <span className="text-fg-subtle">—</span>
                          ) : (
                            <Badge tone={cleared ? 'win' : 'neutral'}>{cleared ? 'Alcanza' : 'No alcanza'}</Badge>
                          )}
                        </TD>
                        <TD>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => { setForm(a); setEditingId(a.id); }}
                              aria-label={`Editar ${a.tournament}`}
                              title="Editar"
                              className="rounded p-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => void remove(a.id)}
                              aria-label={`Borrar ${a.tournament}`}
                              title="Borrar"
                              className="rounded p-1.5 text-loss transition-colors hover:bg-carbon-pink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Umbrales"
            subtitle="rendimiento de referencia por título"
            actions={
              !editingThresholds ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingThresholds(thresholds)}>Editar</Button>
              ) : undefined
            }
            className="mb-2"
          />
          {editingThresholds ? (
            <>
              <div className="divide-y divide-hairline">
                {TITLES.map(title => (
                  <div key={title} className="flex items-center justify-between gap-3 py-2.5">
                    <label htmlFor={`threshold-${title}`} className="font-serif text-base text-fg">Rendimiento {title}</label>
                    <input
                      id={`threshold-${title}`}
                      type="number"
                      value={editingThresholds[title]}
                      onChange={e => setEditingThresholds({ ...editingThresholds, [title]: Number(e.target.value) })}
                      className={`${FIELD} w-24 text-right font-mono`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="sm" onClick={() => void saveThresholds(editingThresholds).then(() => setEditingThresholds(null))}>
                  Guardar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditingThresholds(null)}>Cancelar</Button>
              </div>
            </>
          ) : (
            <dl className="divide-y divide-hairline">
              {TITLES.map(title => (
                <div key={title} className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="font-serif text-base text-fg">Rendimiento {title}</dt>
                  <dd className="font-mono tabular-nums text-fg">{thresholds[title]}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-3 text-xs leading-5 text-fg-subtle">
            Son números de referencia, no el reglamento de FIDE: una norma real pide además rondas mínimas, un
            porcentaje de rivales titulados y extranjeros, y pisos de ELO que cambian según el título. Ajustalos si
            conocés el requisito exacto.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default NormTrackerTab;
