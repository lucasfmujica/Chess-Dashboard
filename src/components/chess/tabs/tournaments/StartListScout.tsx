import { useState } from 'react';
import {
  fetchChessResultsStartList,
  fetchScoutingTargets,
  postScoutingTarget,
  type StartListMatch,
} from '../../../../api/client';
import Button from '../../../ui/Button';
import Badge from '../../../ui/Badge';
import type { Tournament } from '../../../../types/chess';

/**
 * Reads the tournament's chess-results start list and offers the entrants you
 * have already faced as scouting targets.
 *
 * Nothing is created without a click. The server parses someone else's HTML,
 * and `scouting_targets` is a short list the user curates by hand — silently
 * filling it from a page that changed layout would be worse than doing
 * nothing.
 */

interface StartListScoutProps {
  tournament: Tournament;
}

const StartListScout = ({ tournament }: StartListScoutProps) => {
  const [matches, setMatches] = useState<StartListMatch[] | null>(null);
  const [entryCount, setEntryCount] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  if (!tournament.chessResultsUrl) {
    return (
      <div className="mt-6 rounded-lg border border-hairline bg-surface-2 p-4">
        <p className="text-label">Rivales</p>
        <p className="mt-1 text-sm text-fg-muted">
          Cargá el link de chess-results del torneo y se cruza la lista de inscriptos contra tus
          partidas para encontrar rivales que ya enfrentaste.
        </p>
      </div>
    );
  }

  const scan = async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const result = await fetchChessResultsStartList(tournament.chessResultsUrl as string);
      setMatches(result.matches);
      setEntryCount(result.entries.length);
      setWarning(result.warning ?? null);
      // Anything already scouted is not offered again.
      const existing = await fetchScoutingTargets();
      setAdded(new Set(existing.map(t => t.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la lista de inscriptos');
    } finally {
      setLoading(false);
    }
  };

  const add = async (match: StartListMatch) => {
    try {
      await postScoutingTarget({
        name: match.entry.name,
        tournament: tournament.name,
        notes: `Ya jugaron ${match.games} vez${match.games === 1 ? '' : 'es'}: ${match.score}/${match.games}.`,
      });
      setAdded(prev => new Set(prev).add(match.entry.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el scouting target');
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-hairline bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label">Rivales</p>
          <p className="mt-1 text-sm text-fg-muted">
            Cruza la lista de inscriptos contra tus partidas.
          </p>
        </div>
        <Button onClick={() => void scan()} disabled={loading}>
          {loading ? 'Leyendo…' : 'Leer inscriptos'}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      {warning && <p className="mt-3 text-sm text-draw">{warning}</p>}

      {matches !== null && !warning && (
        <>
          <p className="mt-3 text-sm text-fg-muted tabular-nums">
            {entryCount} inscriptos · {matches.length} que ya enfrentaste.
          </p>
          {matches.length === 0 ? (
            <p className="mt-1 text-xs text-fg-subtle">
              Ninguno figura en tus partidas. Con tan pocos rivales OTB repetidos es el resultado
              esperable — sirve más cuando el torneo es de un circuito que ya jugaste.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {matches.map(match => (
                <li
                  key={match.entry.name}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                >
                  {match.entry.title && <Badge tone="neutral">{match.entry.title}</Badge>}
                  <span className="font-medium text-fg">{match.entry.name}</span>
                  {match.entry.rating && (
                    <span className="tabular-nums text-fg-subtle">{match.entry.rating}</span>
                  )}
                  <span className="tabular-nums text-fg-muted">
                    {match.score}/{match.games} a favor tuyo
                  </span>
                  {added.has(match.entry.name) ? (
                    <span className="text-xs text-fg-subtle">ya está en scouting</span>
                  ) : (
                    <button
                      onClick={() => void add(match)}
                      className="text-xs font-medium text-accent hover:opacity-80"
                    >
                      Agregar a scouting
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default StartListScout;
