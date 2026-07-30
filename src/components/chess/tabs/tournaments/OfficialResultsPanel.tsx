import { useMemo, useState } from 'react';
import { CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { Card, Button, Badge } from '../../../ui';
import { useModal } from '../../../modals/ModalContext';
import { useGames } from '../../../../context/GamesContext';
import { samePlayer } from '../../../../utils/playerNames';
import {
  fetchChessResultsCard,
  fetchChessResultsPgn,
  type PlayerCard,
  type PlayerCardRound,
} from '../../../../api/client';
import type { Game, Tournament } from '../../../../types/chess';

/**
 * Pulls a played tournament's official record off its chess-results player
 * card: performance, points, place, starting rank, and the moves of each game
 * the event published.
 *
 * Nothing is written until the numbers are on screen. The page is someone
 * else's HTML, and its figures are not always right — the arbiter of Copa
 * Cultura AFA XIX recorded a round-1 loss against an opponent who was never
 * played — so this panel shows what it found, flags where it disagrees with
 * the stored games, and lets each half be saved separately.
 */

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

/** A card round lined up against the stored game it appears to be. */
interface MatchedRound {
  round: PlayerCardRound;
  game?: Game;
  /** Where the card and the stored game disagree, in words. */
  conflicts: string[];
}

const matchRounds = (card: PlayerCard, games: Game[]): MatchedRound[] =>
  card.rounds
    .filter(round => !round.bye)
    .map(round => {
      const game = games.find(g => samePlayer(g.opp, round.opponent));
      const conflicts: string[] = [];
      if (!game) {
        conflicts.push('no está en tus partidas');
      } else {
        if (round.color && game.color !== round.color) {
          conflicts.push(`color: guardado ${game.color}, ficha ${round.color}`);
        }
        if (round.result && game.result !== round.result) {
          conflicts.push(`resultado: guardado ${game.result}, ficha ${round.result}`);
        }
        if ((game.opp_elo || 0) !== round.opponentElo) {
          conflicts.push(`elo rival: guardado ${game.opp_elo || 0}, ficha ${round.opponentElo}`);
        }
      }
      return { round, game, conflicts };
    });

const OfficialResultsPanel = () => {
  const { games, tournaments, updateTournament, updateGamePgn } = useGames();
  const modal = useModal();

  const [selectedName, setSelectedName] = useState('');
  const [url, setUrl] = useState('');
  const [card, setCard] = useState<PlayerCard | null>(null);
  const [reconciles, setReconciles] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Tournaments that already have games — the ones with an official record to fetch. */
  const played = useMemo(() => {
    const withGames = new Set(
      games.filter(g => (g.source ?? 'otb') === 'otb' && g.tournament).map(g => g.tournament)
    );
    return tournaments
      .filter(t => withGames.has(t.name))
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  }, [games, tournaments]);

  const selected: Tournament | undefined = played.find(t => t.name === selectedName);
  const selectedGames = useMemo(
    () => games.filter(g => g.tournament === selectedName),
    [games, selectedName]
  );

  const matched = useMemo(
    () => (card ? matchRounds(card, selectedGames) : []),
    [card, selectedGames]
  );
  const conflicted = matched.filter(m => m.conflicts.length > 0);
  const importable = matched.filter(m => m.round.pgnUrl && m.game && !m.game.pgn);

  const pick = (name: string) => {
    setSelectedName(name);
    setUrl(played.find(t => t.name === name)?.chessResultsUrl ?? '');
    setCard(null);
    setStatus(null);
    setError(null);
  };

  const loadCard = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await fetchChessResultsCard(url.trim());
      setCard(result.card);
      setReconciles(result.reconciles);
      if (result.warning) setError(result.warning);
    } catch (err) {
      setCard(null);
      setError(err instanceof Error ? err.message : 'No se pudo leer la ficha');
    } finally {
      setBusy(false);
    }
  };

  const saveOfficial = async () => {
    if (!selected || !card) return;
    // The official performance, points and place are all computed from the
    // rounds on the card. When a round is disputed those three figures are
    // wrong too, so saving them is not a neutral act — Copa Cultura AFA XIX is
    // exactly this case, and its numbers were deliberately left empty so the
    // app computes them from the stored games instead.
    if (conflicted.length > 0) {
      const go = await modal.confirm(
        `${conflicted.length} ronda(s) de esta ficha no coinciden con tus partidas. ` +
          'Performance, puntos y puesto oficiales están calculados sobre esas rondas, ' +
          'así que guardarlos escribe números que salen de datos en discusión. ¿Guardar igual?'
      );
      if (!go) return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateTournament(selected.id, {
        chessResultsUrl: url.trim(),
        startingRank: card.startingRank,
        officialPlace: card.place,
        officialPoints: card.points,
        officialPerformance: card.performanceRating,
        eloBefore: card.eloBefore,
        // The card's figure is what chess-results computes, which an unrated
        // event still publishes. `affectsElo` decides whether it moves the
        // curve, and it is not touched here.
        eloChange: card.eloChange,
      });
      setStatus('Datos oficiales guardados.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const importPgns = async () => {
    setBusy(true);
    setError(null);
    let saved = 0;
    const failed: string[] = [];
    for (const { round, game } of importable) {
      try {
        const result = await fetchChessResultsPgn(round.pgnUrl as string);
        if (!result.pgn) {
          failed.push(`R${round.round} ${round.opponent}`);
          continue;
        }
        await updateGamePgn((game as Game).id as string, result.pgn);
        saved++;
      } catch {
        failed.push(`R${round.round} ${round.opponent}`);
      }
    }
    setStatus(
      `${saved} PGN importados.` + (failed.length ? ` Sin movimientos: ${failed.join(', ')}.` : '')
    );
    setBusy(false);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <CloudArrowDownIcon className="w-5 h-5 text-accent" aria-hidden="true" />
        <h3 className="text-h3 text-fg">Datos oficiales de chess-results</h3>
      </div>
      <p className="text-sm text-fg-muted mb-4">
        Trae performance, puntos, puesto y ranking inicial de la ficha del jugador, y los
        movimientos de las partidas que el torneo haya publicado. Nada se guarda hasta que lo veas.
      </p>

      {/* A row per tournament rather than a dropdown: which events are still
          missing their official numbers is the thing you came here to see, and
          a <select> hides exactly that behind a click. */}
      <ul className="mb-4 divide-y divide-hairline rounded-lg border border-hairline">
        {played.map(t => {
          const tGames = games.filter(g => g.tournament === t.name);
          const withoutPgn = tGames.filter(g => !g.pgn).length;
          return (
            <li
              key={t.id}
              className={`flex flex-wrap items-center gap-2 px-3 py-2 ${
                t.name === selectedName ? 'bg-surface-2' : ''
              }`}
            >
              <button
                onClick={() => pick(t.name)}
                className="text-sm font-medium text-fg hover:text-accent text-left"
                aria-label={`Elegir ${t.name}`}
              >
                {t.name}
              </button>
              <span className="text-xs text-fg-subtle tabular-nums">{t.startDate ?? 's/f'}</span>
              <Badge tone={t.officialPerformance ? 'win' : 'neutral'}>
                {t.officialPerformance ? 'con datos oficiales' : 'sin datos oficiales'}
              </Badge>
              {withoutPgn > 0 && (
                <Badge tone="neutral">
                  {withoutPgn} de {tGames.length} sin PGN
                </Badge>
              )}
              {!t.chessResultsUrl && <Badge tone="neutral">sin enlace</Badge>}
            </li>
          );
        })}
      </ul>

      <label className="block mb-3">
        <span className="block text-sm font-medium text-fg mb-1">
          Enlace a la ficha del jugador{selectedName ? ` — ${selectedName}` : ''}
        </span>
        <input
          className={INPUT_CLASS}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://s3.chess-results.com/tnr… &art=9&snr=…"
          aria-label="Enlace a la ficha del jugador"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={loadCard} disabled={busy || !selectedName || !url.trim()}>
          {busy ? 'Leyendo…' : 'Traer ficha'}
        </Button>
        {selected?.chessResultsUrl && (
          <a
            className="text-sm text-accent hover:underline"
            href={selected.chessResultsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir en chess-results
          </a>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      {status && <p className="mt-3 text-sm text-win">{status}</p>}

      {card && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={reconciles ? 'win' : 'loss'}>
              {reconciles ? 'La ficha cierra con sus puntos' : 'La ficha NO cierra'}
            </Badge>
            {card.name && <span className="text-sm text-fg-muted">{card.name}</span>}
          </div>

          {!reconciles && (
            <p className="text-sm text-loss">
              Las rondas no suman los puntos oficiales de la propia página. Probablemente cambió el
              formato y se leyó de más o de menos — revisalo antes de guardar.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-sm">
            {[
              ['Elo previo', card.eloBefore],
              ['Performance', card.performanceRating],
              ['Elo +/-', card.eloChange],
              ['Puntos', card.points],
              ['Puesto', card.place],
              ['Ranking inicial', card.startingRank],
            ].map(([label, value]) => (
              <div key={label as string} className="p-3 rounded-lg bg-surface-2">
                <div className="text-xs text-fg-subtle">{label}</div>
                <div className="text-lg font-bold text-fg tabular-nums">{value ?? '—'}</div>
              </div>
            ))}
          </div>

          {selected && !selected.affectsElo && card.eloChange !== undefined && (
            <p className="text-sm text-fg-muted">
              Este torneo está marcado como que no mueve el ELO, así que ese {card.eloChange} queda
              guardado como referencia pero no entra en la curva.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase text-fg-subtle">Rd.</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-fg-subtle">Rival</th>
                  <th className="px-3 py-2 text-center text-xs uppercase text-fg-subtle">Elo</th>
                  <th className="px-3 py-2 text-center text-xs uppercase text-fg-subtle">Color</th>
                  <th className="px-3 py-2 text-center text-xs uppercase text-fg-subtle">Res.</th>
                  <th className="px-3 py-2 text-left text-xs uppercase text-fg-subtle">
                    Contra tus partidas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {matched.map(({ round, game, conflicts }) => (
                  <tr key={round.round}>
                    <td className="px-3 py-2 text-fg tabular-nums">{round.round}</td>
                    <td className="px-3 py-2 text-fg">{round.opponent}</td>
                    <td className="px-3 py-2 text-center text-fg-muted tabular-nums">
                      {round.opponentElo || 'S/E'}
                    </td>
                    <td className="px-3 py-2 text-center text-fg-muted">{round.color ?? '—'}</td>
                    <td className="px-3 py-2 text-center text-fg-muted">{round.result ?? '—'}</td>
                    <td className="px-3 py-2">
                      {conflicts.length === 0 ? (
                        <span className="text-fg-muted">
                          coincide
                          {round.pgnUrl && (game?.pgn ? ' · ya tiene PGN' : ' · PGN disponible')}
                        </span>
                      ) : (
                        <span className="text-loss">{conflicts.join('; ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {conflicted.length > 0 && (
            <p className="text-sm text-loss">
              {conflicted.length} ronda{conflicted.length !== 1 ? 's' : ''} no coincide
              {conflicted.length !== 1 ? 'n' : ''} con lo que tenés guardado. Guardar los datos
              oficiales no toca tus partidas — si la ficha está mal, dejalas como están.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveOfficial} disabled={busy || !selected}>
              {conflicted.length > 0
                ? `Guardar datos oficiales (${conflicted.length} en conflicto)`
                : 'Guardar datos oficiales'}
            </Button>
            <Button variant="secondary" onClick={importPgns} disabled={busy || importable.length === 0}>
              {importable.length > 0
                ? `Importar ${importable.length} PGN`
                : 'Sin PGN nuevos para importar'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default OfficialResultsPanel;
