import { useMemo } from 'react';
import { GlobeAltIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useGames, useComputedStats } from '../../../context/GamesContext';
import { useUI } from '../../../context/UIContext';
import { useGeographyStats, resolveCityKey } from '../../../hooks/useGeographyStats';
import { CITY_OPTIONS, CITY_DIRECTORY } from '../../../constants/locations';
import GeoMap from '../../charts/GeoMap';

const GeographyTab = () => {
  const { tournamentLocations, setTournamentLocations } = useGames();
  const { gameFilter } = useUI();
  const { filteredGames } = useComputedStats(gameFilter);
  const geo = useGeographyStats(filteredGames, tournamentLocations);

  // All tournaments present in the current games, with their resolved city.
  const tournaments = useMemo(() => {
    const names = Array.from(new Set(filteredGames.map(g => g.tournament))).sort();
    return names.map(name => ({ name, cityKey: resolveCityKey(name, tournamentLocations) ?? '' }));
  }, [filteredGames, tournamentLocations]);

  const assignCity = (tournament: string, cityKey: string) => {
    setTournamentLocations(prev => {
      const next = { ...prev };
      if (cityKey) next[tournament] = cityKey;
      else delete next[tournament];
      return next;
    });
  };

  const best = geo.byCity[0];
  const worst = geo.byCity.length > 1 ? [...geo.byCity].sort((a, b) => a.winRate - b.winRate)[0] : undefined;

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-hairline bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Located games</p>
          <p className="mt-2 text-2xl font-semibold text-fg tabular-nums">{geo.totalLocatedGames}</p>
          <p className="mt-1 text-xs text-fg-muted">{geo.byCity.length} cities · {geo.byCountry.length} countries</p>
        </div>
        <div className="rounded-lg border border-hairline bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Best venue</p>
          <p className="mt-2 text-2xl font-semibold text-fg">{best ? best.city : '—'}</p>
          {best && <p className="mt-1 text-xs text-win tabular-nums">{best.winRate}% win rate · {best.total} games</p>}
        </div>
        <div className="rounded-lg border border-hairline bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Toughest venue</p>
          <p className="mt-2 text-2xl font-semibold text-fg">{worst ? worst.city : '—'}</p>
          {worst && <p className="mt-1 text-xs text-loss tabular-nums">{worst.winRate}% win rate · {worst.total} games</p>}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <GlobeAltIcon className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Results by location</h3>
        </div>
        <GeoMap markers={geo.byCity} />
      </div>

      {/* City ranking */}
      {geo.byCity.length > 0 && (
        <div className="rounded-lg border border-hairline bg-surface overflow-hidden">
          <h3 className="px-5 py-3 text-sm font-semibold text-fg border-b border-hairline">By city</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium uppercase text-fg-subtle">City</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Games</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">W-D-L</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Score</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Win rate</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Perf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {geo.byCity.map(c => (
                  <tr key={c.key} className="hover:bg-surface-2">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-fg">{c.city}</div>
                      <div className="text-xs text-fg-subtle">{c.province ? `${c.province}, ` : ''}{c.country}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-fg-muted tabular-nums">{c.total}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">
                      <span className="text-win">{c.wins}</span>-<span className="text-draw">{c.draws}</span>-<span className="text-loss">{c.losses}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-fg tabular-nums">{c.score}</td>
                    <td className="px-4 py-2.5 text-center font-semibold tabular-nums">
                      <span className={c.winRate >= 50 ? 'text-win' : 'text-loss'}>{c.winRate}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-fg-muted tabular-nums">{c.performanceRating || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Country breakdown */}
      {geo.byCountry.length > 0 && (
        <div className="rounded-lg border border-hairline bg-surface overflow-hidden">
          <h3 className="px-5 py-3 text-sm font-semibold text-fg border-b border-hairline">By country</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th scope="col" className="px-5 py-2.5 text-left text-xs font-medium uppercase text-fg-subtle">Country</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Cities</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Games</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Win rate</th>
                  <th scope="col" className="px-4 py-2.5 text-center text-xs font-medium uppercase text-fg-subtle">Perf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {geo.byCountry.map(c => (
                  <tr key={c.country} className="hover:bg-surface-2">
                    <td className="px-5 py-2.5 font-medium text-fg">{c.country}</td>
                    <td className="px-4 py-2.5 text-center text-fg-muted tabular-nums">{c.cities}</td>
                    <td className="px-4 py-2.5 text-center text-fg-muted tabular-nums">{c.total}</td>
                    <td className="px-4 py-2.5 text-center font-semibold tabular-nums">
                      <span className={c.winRate >= 50 ? 'text-win' : 'text-loss'}>{c.winRate}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-fg-muted tabular-nums">{c.performanceRating || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tournament location editor */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="mb-1 flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Tournament locations</h3>
        </div>
        <p className="mb-4 text-xs text-fg-muted">
          Assign a city to each tournament so its games appear on the map.
          {geo.unmappedTournaments.length > 0 && (
            <span className="text-loss"> {geo.unmappedTournaments.length} still unassigned.</span>
          )}
        </p>
        <div className="space-y-2">
          {tournaments.map(t => (
            <div key={t.name} className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-2 px-3 py-2">
              <span className="text-sm text-fg truncate">{t.name}</span>
              <select
                value={t.cityKey}
                onChange={e => assignCity(t.name, e.target.value)}
                className="flex-shrink-0 rounded-md border border-hairline bg-surface text-fg text-sm px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
                aria-label={`City for ${t.name}`}
              >
                <option value="">— Unassigned —</option>
                {CITY_OPTIONS.map(key => (
                  <option key={key} value={key}>
                    {CITY_DIRECTORY[key].city} ({CITY_DIRECTORY[key].country})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeographyTab;
