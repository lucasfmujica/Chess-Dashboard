import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGames } from '../../context/GamesContext';
import type { Game } from '../../types/chess';
import type { ChessComTimeClass } from '../../utils/chessComApi';

/** Where the username is kept between visits, so the field isn't retyped every sync. */
const USERNAME_KEY = 'chesscom-username';

/** Suggested when nothing is stored yet. */
const DEFAULT_USERNAME = 'lmujica24';

/** Bullet is not an option on purpose: the dashboard does not track it. */
const TIME_CLASS_OPTIONS: { value: string; label: string; classes: ChessComTimeClass[] }[] = [
  { value: 'rapid', label: 'Rapid', classes: ['rapid'] },
  { value: 'rapid,blitz', label: 'Rapid + Blitz', classes: ['rapid', 'blitz'] },
];

type SyncStatusType = 'loading' | 'success' | 'warning' | 'error';

interface SyncStatus {
  type: SyncStatusType;
  message: string;
}

interface ChessComSyncPanelProps {
  onSyncComplete?: (games: Game[]) => void;
  onError?: (message: string) => void;
}

const ChessComSyncPanel = ({ onSyncComplete, onError }: ChessComSyncPanelProps) => {
  const { games } = useGames();
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY) ?? DEFAULT_USERNAME);
  const [timeClasses, setTimeClasses] = useState('rapid');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  /**
   * The day of the newest Chess.com game already saved. Like the Lichess panel,
   * the catch-up starts from that day, not the next: games upsert on their id,
   * so re-fetching a day is free and starting later could skip a game.
   */
  const lastSyncedDate = useMemo(() => {
    const dates = games
      .filter(g => g.source === 'chesscom' && g.date)
      .map(g => String(g.date).slice(0, 10));
    return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  }, [games]);

  useEffect(() => {
    if (syncStatus?.type === 'success') {
      const timeoutId = setTimeout(() => setSyncStatus(null), 3000);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [syncStatus?.type]);

  const handleSync = useCallback(
    async (sinceDate?: string) => {
      if (!username.trim()) {
        onError?.('Please enter a Chess.com username');
        return;
      }

      localStorage.setItem(USERNAME_KEY, username.trim());
      setIsSyncing(true);
      setSyncStatus({ type: 'loading', message: 'Trayendo partidas de Chess.com… (una por mes, puede tardar)' });

      try {
        const { fetchChessComGames, transformChessComGames } = await import('../../utils/chessComApi');
        const classes = TIME_CLASS_OPTIONS.find(o => o.value === timeClasses)?.classes ?? ['rapid'];

        const raw = await fetchChessComGames(username.trim(), { timeClasses: classes, sinceDate });

        if (raw.length === 0) {
          setSyncStatus({
            type: 'warning',
            message: sinceDate
              ? 'Ya estás al día — no hay partidas nuevas desde la última guardada.'
              : 'No se encontraron partidas para este usuario',
          });
          return;
        }

        const transformed = transformChessComGames(raw, username.trim());
        setSyncStatus({ type: 'success', message: `Se trajeron ${transformed.length} partidas.` });
        onSyncComplete?.(transformed);
      } catch (error) {
        console.error('Chess.com sync error:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch games from Chess.com';
        setSyncStatus({ type: 'error', message });
        onError?.(message);
      } finally {
        setIsSyncing(false);
      }
    },
    [username, timeClasses, onSyncComplete, onError]
  );

  const disabled = isSyncing || !username.trim();

  return (
    <div className="p-6 rounded-lg border border-hairline bg-surface">
      <h3 className="mb-4 text-lg font-semibold text-fg">Chess.com Integration</h3>

      <p className="mb-4 text-sm text-fg-muted">
        Importá tus partidas rapid (y opcionalmente blitz) de Chess.com. Bullet nunca se importa.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-fg-muted">Chess.com Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your Chess.com username"
              className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
              disabled={isSyncing}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-fg-muted">Game Types</label>
            <select
              value={timeClasses}
              onChange={e => setTimeClasses(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg focus:border-accent focus:ring-1 focus:ring-accent"
              disabled={isSyncing}
            >
              {TIME_CLASS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {lastSyncedDate && (
          <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-medium text-fg">Ponerse al día</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Tu última partida de Chess.com guardada es del{' '}
              <span className="nums font-medium text-fg">{lastSyncedDate}</span>.
            </p>
            <button
              onClick={() => void handleSync(lastSyncedDate)}
              disabled={disabled}
              className={`mt-3 w-full px-6 py-2.5 text-sm font-medium rounded-md transition-colors ${
                disabled ? 'bg-surface-2 text-fg-subtle cursor-not-allowed' : 'bg-accent text-accent-fg hover:opacity-90'
              }`}
            >
              {isSyncing ? 'Sincronizando…' : `Traer partidas nuevas desde ${lastSyncedDate}`}
            </button>
          </div>
        )}

        <button
          onClick={() => void handleSync()}
          disabled={disabled}
          className={`w-full px-6 py-3 font-medium rounded-md transition-colors ${
            disabled ? 'bg-surface-2 text-fg-subtle cursor-not-allowed' : 'bg-fg text-app hover:opacity-90'
          }`}
        >
          {isSyncing ? 'Syncing...' : lastSyncedDate ? 'Importar todo el historial de Chess.com' : 'Import Games from Chess.com'}
        </button>

        {syncStatus && (
          <div
            className={`p-4 rounded-md border ${
              syncStatus.type === 'success'
                ? 'bg-win/10 border-win/30 text-win'
                : syncStatus.type === 'error'
                  ? 'bg-loss/10 border-loss/30 text-loss'
                  : syncStatus.type === 'warning'
                    ? 'bg-draw/10 border-draw/30 text-draw'
                    : 'bg-accent/10 border-accent/30 text-accent'
            }`}
          >
            <p className="text-sm font-medium">{syncStatus.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessComSyncPanel;
