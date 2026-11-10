import { useMemo, useState } from 'react';
import { useGames, useComputedStats } from '../../../context/GamesContext';
import { useUI } from '../../../context/UIContext';
import { useGeographyStats, resolveCityKey } from '../../../hooks/useGeographyStats';
import { CITY_OPTIONS, CITY_DIRECTORY } from '../../../constants/locations';
import GeoMap from '../../charts/GeoMap';
import { Card, CardHeader, ClockBar, SegmentedControl, StatCard, Table, TBody, TD, TH, THead, TR, type Segment } from '../../ui';

type GroupBy = 'city' | 'country';

const GROUPS: Segment<GroupBy>[] = [
  { value: 'city', label: 'Por ciudad' },
  { value: 'country', label: 'Por país' },
];

/** '12.5/20' → { pts: '12½', pct: 63 }. */
const readScore = (score: string, total: number) => {
  const pts = parseFloat(String(score).split('/')[0]) || 0;
  const whole = Math.floor(pts);
  return { pts: pts - whole >= 0.5 ? `${whole || ''}½` : String(whole), pct: total > 0 ? Math.round((pts / total) * 100) : 0 };
};

const GeographyTab = () => {
  const { tournamentLocations, setTournamentLocations } = useGames();
  const { gameFilter } = useUI();
  const { filteredGames } = useComputedStats(gameFilter);
  const geo = useGeographyStats(filteredGames, tournamentLocations);
  const [groupBy, setGroupBy] = useState<GroupBy>('city');

  // All tournaments present in the current games, with their resolved city.
  const tournaments = useMemo(() => {
    const names = Array.from(new Set(filteredGames.map(g => g.tournament))).sort();
    return names.map(name => ({ name, cityKey: resolveCityKey(name, tournamentLocations) ?? '' }));
  }, [filteredGames, tournamentLocations]);

  const assignCity = (tournament: string, cityKey: string) => {
    const next = { ...tournamentLocations };
    if (cityKey) next[tournament] = cityKey;
    else delete next[tournament];
    setTournamentLocations(next);
  };

  const ranked = [...geo.byCity].map(c => ({ ...c, pct: readScore(c.score, c.total).pct })).sort((a, b) => b.pct - a.pct);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const unmapped = geo.unmappedTournaments.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-fg-muted">Dónde jugaste y cómo te fue en cada lugar.</p>
        <SegmentedControl options={GROUPS} value={groupBy} onChange={setGroupBy} aria-label="Agrupar" size="sm" />
      </div>

      <ClockBar>
        <StatCard
          title="Ciudades"
          value={geo.byCity.length}
          subtitle={`${geo.byCountry.length} ${geo.byCountry.length === 1 ? 'país' : 'países'}`}
        />
        <StatCard
          title="Partidas ubicadas"
          value={geo.totalLocatedGames}
          subtitle={unmapped > 0 ? `${unmapped} ${unmapped === 1 ? 'torneo' : 'torneos'} sin lugar cargado` : 'todos los torneos tienen lugar'}
        />
        <StatCard
          title="Mejor sede"
          value={best ? `${best.pct}%` : '—'}
          trend={best ? 'up' : undefined}
          subtitle={best ? `${best.city} · ${best.total} partidas` : 'sin sedes'}
        />
        <StatCard
          title="Sede más dura"
          value={worst ? `${worst.pct}%` : '—'}
          trend={worst ? 'down' : undefined}
          subtitle={worst ? `${worst.city} · ${worst.total} partidas` : 'hace falta más de una sede'}
        />
      </ClockBar>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title="Mapa de sedes" subtitle="tamaño del punto = partidas jugadas ahí" className="mb-4" />
          <GeoMap markers={geo.byCity} />
        </Card>

        <Card flush className="xl:col-span-2">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <CardHeader title={groupBy === 'city' ? 'Por ciudad' : 'Por país'} className="mb-4" />
          </div>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            {groupBy === 'city' ? (
              <Table>
                <THead>
                  <tr>
                    <TH>Ciudad</TH>
                    <TH align="right">P</TH>
                    <TH align="right">+ = −</TH>
                    <TH align="right">Pts</TH>
                    <TH align="right">%</TH>
                    <TH align="right">Perf.</TH>
                  </tr>
                </THead>
                <TBody>
                  {geo.byCity.map(c => {
                    const { pts, pct } = readScore(c.score, c.total);
                    return (
                      <TR key={c.key}>
                        <TD>
                          <div className="font-serif text-[15px] text-fg">{c.city}</div>
                          <div className="text-xs text-fg-subtle">{c.province ? `${c.province}, ` : ''}{c.country}</div>
                        </TD>
                        <TD align="right" className="font-mono">{c.total}</TD>
                        <TD align="right" muted className="whitespace-nowrap font-mono">+{c.wins} ={c.draws} −{c.losses}</TD>
                        <TD align="right" className="font-mono">{pts}</TD>
                        <TD align="right" className="font-mono">{pct}</TD>
                        <TD align="right" muted className="font-mono">{c.performanceRating || '—'}</TD>
                      </TR>
                    );
                  })}
                  {geo.byCity.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-fg-muted">Ninguna partida tiene lugar todavía.</td></tr>
                  )}
                </TBody>
              </Table>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>País</TH>
                    <TH align="right">Ciudades</TH>
                    <TH align="right">P</TH>
                    <TH align="right">Pts</TH>
                    <TH align="right">%</TH>
                    <TH align="right">Perf.</TH>
                  </tr>
                </THead>
                <TBody>
                  {geo.byCountry.map(c => {
                    const { pts, pct } = readScore(c.score, c.total);
                    return (
                      <TR key={c.country}>
                        <TD className="font-serif text-[15px]">{c.country}</TD>
                        <TD align="right" muted className="font-mono">{c.cities}</TD>
                        <TD align="right" className="font-mono">{c.total}</TD>
                        <TD align="right" className="font-mono">{pts}</TD>
                        <TD align="right" className="font-mono">{pct}</TD>
                        <TD align="right" muted className="font-mono">{c.performanceRating || '—'}</TD>
                      </TR>
                    );
                  })}
                  {geo.byCountry.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-fg-muted">Ninguna partida tiene lugar todavía.</td></tr>
                  )}
                </TBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Lugar de cada torneo"
          subtitle="asigná una ciudad a cada torneo para que sus partidas aparezcan en el mapa"
          className="mb-1"
        />
        {unmapped > 0 && (
          <p className="mb-3 text-sm text-fg-muted">
            Faltan <span className="font-mono tabular-nums text-fg">{unmapped}</span> {unmapped === 1 ? 'torneo' : 'torneos'}.
          </p>
        )}
        <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
          {tournaments.map(t => (
            <li key={t.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate font-serif text-[15px] text-fg">{t.name}</span>
              <select
                value={t.cityKey}
                onChange={e => assignCity(t.name, e.target.value)}
                className="max-w-full shrink-0 rounded border border-hairline bg-surface px-2 py-1.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label={`Ciudad de ${t.name}`}
              >
                <option value="">Sin asignar</option>
                {CITY_OPTIONS.map(key => (
                  <option key={key} value={key}>
                    {CITY_DIRECTORY[key].city} ({CITY_DIRECTORY[key].country})
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default GeographyTab;
