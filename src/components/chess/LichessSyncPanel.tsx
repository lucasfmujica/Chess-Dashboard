import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGames } from '../../context/GamesContext';
import type { Game } from '../../types/chess';
import { Button, Card, CardHeader } from '../ui';

const FIELD =
  'h-9 w-full rounded border border-hairline bg-surface px-3 text-sm text-fg placeholder-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60';

/** Where the username is kept between visits, so the field isn't retyped every sync. */
const USERNAME_KEY = 'lichess-username';

/** Suggested when nothing is stored yet. */
const DEFAULT_USERNAME = 'lmujica24';

/** Rapid + classical: what the dashboard tracks. Blitz and bullet are opt-in. */
const DEFAULT_PERF_TYPE = 'rapid,classical';

type SyncStatusType = 'loading' | 'success' | 'warning' | 'error';

interface SyncStatus {
  type: SyncStatusType;
  message: string;
}

interface LichessSyncPanelProps {
  onSyncComplete?: (games: Game[]) => void;
  onError?: (message: string) => void;
}

const LichessSyncPanel = ({ onSyncComplete, onError }: LichessSyncPanelProps) => {
  const { games } = useGames();
  const [lichessUsername, setLichessUsername] = useState(
    () => localStorage.getItem(USERNAME_KEY) ?? DEFAULT_USERNAME
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [maxGames, setMaxGames] = useState(50);
  const [perfType, setPerfType] = useState(DEFAULT_PERF_TYPE);
  const [sinceDate, setSinceDate] = useState('');
  const [untilDate, setUntilDate] = useState('');

  /**
   * The day of the newest Lichess game already saved.
   *
   * The incremental sync starts from that day rather than the one after it,
   * on purpose: games are upserted on `lichess_game_id`, so re-fetching a day
   * costs nothing and duplicates nothing, while starting a day later would
   * silently skip any game from that date that was not in the last pull.
   */
  const lastSyncedDate = useMemo(() => {
    const dates = games
      .filter(g => g.source === 'lichess' && g.date)
      .map(g => String(g.date).slice(0, 10));
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  }, [games]);

  // Cleanup timer when success status is set
  useEffect(() => {
    if (syncStatus?.type === 'success') {
      const timeoutId = setTimeout(() => {
        setSyncStatus(null);
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [syncStatus?.type]);

  const handleSync = useCallback(async (overrideSince?: string) => {
    if (!lichessUsername.trim()) {
      onError?.('Falta tu usuario de Lichess');
      return;
    }

    localStorage.setItem(USERNAME_KEY, lichessUsername.trim());
    setIsSyncing(true);
    setSyncStatus({ type: 'loading', message: 'Trayendo partidas de Lichess…' });

    try {
      const { fetchLichessGames, transformLichessGames } = await import('../../utils/lichessApi');

      const fromDate = overrideSince ?? sinceDate;
      // A date range implies "everything in that window", so the max-games cap is ignored.
      const hasDateRange = Boolean(fromDate || untilDate);
      const since = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const until = untilDate ? new Date(`${untilDate}T23:59:59`).getTime() : null;

      const lichessGames = await fetchLichessGames(lichessUsername, {
        max: hasDateRange || maxGames === 0 ? null : maxGames,
        perfType,
        rated: true,
        since,
        until,
      });

      if (lichessGames.length === 0) {
        setSyncStatus({
          type: 'warning',
          message: overrideSince
            ? 'Ya estás al día: no hay partidas nuevas desde la última guardada.'
            : 'No se encontraron partidas para este usuario.',
        });
        setIsSyncing(false);
        return;
      }

      const transformedGames = transformLichessGames(lichessGames, lichessUsername);

      setSyncStatus({
        type: 'success',
        message: `Se trajeron ${transformedGames.length} ${transformedGames.length === 1 ? 'partida' : 'partidas'}.`
      });

      // Call parent callback with the new games
      onSyncComplete?.(transformedGames);

      // Success message will auto-clear via useEffect

    } catch (error) {
      console.error('Lichess sync error:', error);
      const message = error instanceof Error ? error.message : 'No se pudieron traer las partidas de Lichess.';
      setSyncStatus({
        type: 'error',
        message: message || 'No se pudieron traer las partidas de Lichess.'
      });
      onError?.(message);
    } finally {
      setIsSyncing(false);
    }
  }, [lichessUsername, sinceDate, untilDate, maxGames, perfType, onSyncComplete, onError]);

  const STATUS_CLS: Record<SyncStatusType, string> = {
    loading: 'bg-surface-2 text-fg-muted',
    success: 'bg-surface-2 text-win',
    warning: 'bg-carbon text-fg',
    error: 'bg-carbon-pink text-fg',
  };

  return (
    <Card>
      <CardHeader
        title="Sincronizar Lichess"
        subtitle="Trae tus partidas recientes de Lichess. Entran como online y no se mezclan con las de torneo."
      />

      {/* The incremental sync, first: "everything since the last one" is what
          this panel is actually asked for, and making it the default path
          means the date never has to be looked up by hand. */}
      {lastSyncedDate && (
        <div className="mt-4 border-t-[3px] border-hairline-strong bg-surface-2 p-4">
          <p className="text-label">Ponerse al día</p>
          <p className="mt-1 text-sm text-fg-muted">
            Tu última partida guardada es del{' '}
            <span className="font-mono tabular-nums text-fg">{lastSyncedDate}</span>. Trae todo lo
            jugado desde entonces.
          </p>
          <Button
            variant="primary"
            onClick={() => void handleSync(lastSyncedDate)}
            disabled={isSyncing || !lichessUsername.trim()}
            className="mt-3 w-full"
          >
            {isSyncing ? 'Sincronizando…' : `Traer partidas nuevas desde ${lastSyncedDate}`}
          </Button>
          {!lichessUsername.trim() && (
            <p className="mt-2 text-xs text-fg-subtle">Falta tu usuario de Lichess, abajo.</p>
          )}
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="lichess-user" className="text-label mb-1.5 block">
            Usuario de Lichess
          </label>
          <input
            id="lichess-user"
            type="text"
            value={lichessUsername}
            onChange={(e) => setLichessUsername(e.target.value)}
            placeholder="Tu usuario de Lichess"
            className={FIELD}
            disabled={isSyncing}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="lichess-max" className="text-label mb-1.5 block">
              Cuántas partidas
            </label>
            <select
              id="lichess-max"
              value={maxGames}
              onChange={(e) => setMaxGames(parseInt(e.target.value))}
              className={FIELD}
              disabled={isSyncing || Boolean(sinceDate || untilDate)}
            >
              <option value="20">20 partidas</option>
              <option value="50">50 partidas</option>
              <option value="100">100 partidas</option>
              <option value="200">200 partidas</option>
              <option value="0">Sin límite</option>
            </select>
          </div>

          <div>
            <label htmlFor="lichess-perf" className="text-label mb-1.5 block">
              Ritmos
            </label>
            <select
              id="lichess-perf"
              value={perfType}
              onChange={(e) => setPerfType(e.target.value)}
              className={FIELD}
              disabled={isSyncing}
            >
              <option value="rapid,classical">Rápido y clásico</option>
              <option value="classical,rapid,blitz">Todos (clásico, rápido, blitz)</option>
              <option value="classical">Solo clásico</option>
              <option value="rapid">Solo rápido</option>
              <option value="blitz">Solo blitz</option>
              <option value="bullet">Solo bullet</option>
            </select>
          </div>

          <div>
            <label htmlFor="lichess-since" className="text-label mb-1.5 block">
              Desde (opcional)
            </label>
            <input
              id="lichess-since"
              type="date"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              max={untilDate || undefined}
              className={`${FIELD} font-mono`}
              disabled={isSyncing}
            />
          </div>

          <div>
            <label htmlFor="lichess-until" className="text-label mb-1.5 block">
              Hasta (opcional)
            </label>
            <input
              id="lichess-until"
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              min={sinceDate || undefined}
              className={`${FIELD} font-mono`}
              disabled={isSyncing}
            />
          </div>
        </div>

        {(sinceDate || untilDate) && (
          <p className="text-xs text-fg-subtle">
            Con un rango de fechas no hay tope de cantidad: se importa cada partida de ese período.
          </p>
        )}

        <Button
          onClick={() => void handleSync()}
          disabled={isSyncing || !lichessUsername.trim()}
          className="w-full"
        >
          {isSyncing ? 'Sincronizando…' : 'Importar partidas de Lichess'}
        </Button>

        {syncStatus && (
          <p role="status" className={`rounded border border-hairline px-3 py-2 text-sm font-medium ${STATUS_CLS[syncStatus.type]}`}>
            {syncStatus.message}
          </p>
        )}
      </div>

      <div className="mt-5 border-t border-hairline pt-4">
        <h4 className="text-label mb-2">Cómo funciona</h4>
        <ul className="list-inside list-disc space-y-1 text-xs text-fg-muted">
          <li>El usuario de Lichess no distingue mayúsculas.</li>
          <li>Elegí cuántas partidas recientes traer, o poné un rango de fechas para traer todo ese período.</li>
          <li>Las partidas entran como online: no se mezclan con las de torneo.</li>
          <li>Solo se importan partidas con rating.</li>
          <li>
            Los duplicados se detectan y se fusionan solos: volver a sincronizar un día ya traído no
            rompe nada, por eso «ponerse al día» arranca desde la última fecha guardada y no desde el
            día siguiente.
          </li>
        </ul>
      </div>
    </Card>
  );
};

export default LichessSyncPanel;
