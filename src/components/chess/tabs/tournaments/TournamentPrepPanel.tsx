import { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useGames } from '../../../../context/GamesContext';
import { fetchRepertoireLines } from '../../../../api/client';
import { buildPrepPlan, NEW_LINE_FREEZE_DAYS } from '../../../../utils/tournamentPrep';
import StartListScout from './StartListScout';
import { dateFromKey } from '../../../../utils/localDate';
import { Card, CardHeader, Badge, SegmentedControl, type Segment } from '../../../ui';
import type { RepertoireLine } from '../../../../types/chess';

/**
 * The prep plan for an upcoming tournament.
 *
 * Everything shown here is derived — no new tables, no new fields to fill in.
 * The one thing it needs that the app did not used to store is the tournament
 * itself, which is why upcoming events moved out of localStorage.
 */

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const formatDay = (key: string) => {
  const date = dateFromKey(key);
  return `${WEEKDAYS[(date.getDay() + 6) % 7]} ${date.getDate()}/${date.getMonth() + 1}`;
};

const lineLabel = (line: RepertoireLine) => line.lineName ?? line.eco ?? 'Sin nombre';

const TournamentPrepPanel = () => {
  const { upcomingTournaments, games } = useGames();
  const [lines, setLines] = useState<RepertoireLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRepertoireLines()
      .then(setLines)
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo leer el repertorio'));
  }, []);

  const tournament =
    upcomingTournaments.find(t => t.id === selectedId) ?? upcomingTournaments[0] ?? null;

  const plan = useMemo(
    () => (tournament && lines ? buildPrepPlan(tournament, lines, games) : null),
    [tournament, lines, games]
  );

  const options: Segment<string>[] = upcomingTournaments.map(t => ({
    value: t.id,
    label: t.name.length > 28 ? `${t.name.slice(0, 28)}…` : t.name,
  }));

  if (error) {
    return (
      <Card>
        <p className="text-sm text-loss">{error}</p>
      </Card>
    );
  }

  if (upcomingTournaments.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Plan de preparación"
          subtitle="Reparte el repaso del repertorio en los días que quedan hasta el torneo."
          className="mb-4"
        />
        <div className="py-8 text-center">
          <CalendarDaysIcon className="mx-auto mb-3 h-12 w-12 text-fg-subtle" />
          <p className="text-fg-muted">No hay ningún torneo con fecha futura cargado.</p>
          <p className="mt-1 text-sm text-fg-subtle">
            Cargá uno arriba con su fecha de inicio y su ritmo de juego, y el plan se arma solo.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Plan de preparación"
        subtitle="Reparte el repaso del repertorio en los días que quedan hasta el torneo."
        className="mb-4"
      />

      {options.length > 1 && (
        <div className="mb-4">
          <SegmentedControl
            options={options}
            value={tournament?.id ?? options[0].value}
            onChange={setSelectedId}
            aria-label="Torneo a preparar"
          />
        </div>
      )}

      {!plan ? (
        <p className="text-sm text-fg-muted">
          {lines === null ? 'Cargando el repertorio…' : 'Este torneo no tiene fecha de inicio.'}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <span className="text-3xl font-semibold tabular-nums text-fg">
                {plan.daysAvailable}
              </span>
              <span className="ml-2 text-sm text-fg-muted">
                día{plan.daysAvailable === 1 ? '' : 's'} hasta {plan.tournamentName}
              </span>
            </div>
            {tournament?.timeControl && <Badge tone="neutral">{tournament.timeControl}</Badge>}
          </div>

          {/* An honest caveat beats a ranking the data can't support. */}
          {!plan.ranked.srs && (
            <p className="mt-3 text-xs text-fg-muted">
              Todas las líneas están igual de vencidas y con la misma confianza, así que el orden
              lo decide sólo la prioridad que les pusiste. Drilleá unas cuantas y el repaso
              empieza a ordenarse por lo que de verdad flojea.
            </p>
          )}

          {plan.daysAvailable === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">
              El torneo empieza hoy. Ya no hay días para repartir.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plan.days.map(day => (
                <div
                  key={day.date}
                  className={`rounded-lg border p-4 ${
                    day.frozen ? 'border-draw/40 bg-draw/5' : 'border-hairline bg-surface-2'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-label">{formatDay(day.date)}</p>
                    {day.frozen ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-draw"
                        title={`Sin líneas nuevas en los últimos ${NEW_LINE_FREEZE_DAYS} días`}
                      >
                        <LockClosedIcon className="h-3 w-3" />
                        sólo repaso
                      </span>
                    ) : (
                      <span className="text-xs text-fg-subtle tabular-nums">{day.minutes} min</span>
                    )}
                  </div>
                  {day.lines.length === 0 ? (
                    <p className="mt-2 text-xs text-fg-subtle">Nada pendiente.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {day.lines.map(line => (
                        <li key={line.id} className="text-sm text-fg">
                          {lineLabel(line)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {plan.frozenOut.length > 0 && (
            <div className="mt-5 rounded-lg border border-draw/40 bg-draw/5 p-4">
              <p className="text-sm font-medium text-fg">
                {plan.frozenOut.length} línea{plan.frozenOut.length === 1 ? '' : 's'} fuera del plan
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Nunca las drilleaste, y faltan menos de {NEW_LINE_FREEZE_DAYS} días. Estrenar una
                línea sobre la fecha es cómo se llega a medio recordarla en el tablero.
              </p>
              <ul className="mt-2 space-y-1">
                {plan.frozenOut.map(line => (
                  <li key={line.id} className="text-sm text-fg-muted">
                    {lineLabel(line)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.overflow.length > 0 && (
            <p className="mt-4 text-xs text-fg-muted">
              {plan.overflow.length} línea{plan.overflow.length === 1 ? '' : 's'} vencida
              {plan.overflow.length === 1 ? '' : 's'} no entra
              {plan.overflow.length === 1 ? '' : 'n'} en los días que quedan.
            </p>
          )}

          {tournament && <StartListScout tournament={tournament} />}

          {plan.ecoFocus.length > 0 && (
            <div className="mt-6">
              <p className="text-label">Qué capítulos importan de verdad</p>
              <p className="mt-1 text-xs text-fg-muted">
                Frecuencia real cruzada contra tu score, sobre {plan.ecoGamesConsidered} partidas
                OTB con ECO conocido
                {plan.gamesWithoutEco > 0 && ` (${plan.gamesWithoutEco} quedaron afuera por no tenerlo)`}.
                Las online no cuentan: la prep es para clásicas.
              </p>
              <ul className="mt-3 space-y-1.5">
                {plan.ecoFocus.slice(0, 6).map(focus => (
                  <li key={focus.eco} className="flex items-center gap-3 text-sm">
                    <span className="w-10 font-medium text-fg">{focus.eco}</span>
                    <span className="tabular-nums text-fg-muted">
                      {focus.games} partidas · {Math.round(focus.score * 100)}%
                    </span>
                    {focus.lineIds.length === 0 && (
                      <Badge tone="loss">sin línea preparada</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default TournamentPrepPanel;
