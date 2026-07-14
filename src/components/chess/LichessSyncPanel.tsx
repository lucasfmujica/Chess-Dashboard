import { useState, useEffect } from 'react';
import type { Game } from '../../types/chess';

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
  const [lichessUsername, setLichessUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [maxGames, setMaxGames] = useState(50);
  const [perfType, setPerfType] = useState('classical,rapid,blitz');
  const [sinceDate, setSinceDate] = useState('');
  const [untilDate, setUntilDate] = useState('');

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

  const handleSync = async () => {
    if (!lichessUsername.trim()) {
      onError?.('Please enter a Lichess username');
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: 'loading', message: 'Fetching games from Lichess...' });

    try {
      const { fetchLichessGames, transformLichessGames } = await import('../../utils/lichessApi');

      // A date range implies "everything in that window", so the max-games cap is ignored.
      const hasDateRange = Boolean(sinceDate || untilDate);
      const since = sinceDate ? new Date(`${sinceDate}T00:00:00`).getTime() : null;
      const until = untilDate ? new Date(`${untilDate}T23:59:59`).getTime() : null;

      const lichessGames = await fetchLichessGames(lichessUsername, {
        max: hasDateRange || maxGames === 0 ? null : maxGames,
        perfType,
        rated: true,
        since,
        until,
      });

      if (lichessGames.length === 0) {
        setSyncStatus({ type: 'warning', message: 'No games found for this user' });
        setIsSyncing(false);
        return;
      }

      const transformedGames = transformLichessGames(lichessGames, lichessUsername);

      setSyncStatus({
        type: 'success',
        message: `Successfully fetched ${transformedGames.length} games!`
      });

      // Call parent callback with the new games
      onSyncComplete?.(transformedGames);

      // Success message will auto-clear via useEffect

    } catch (error) {
      console.error('Lichess sync error:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch games from Lichess';
      setSyncStatus({
        type: 'error',
        message: message || 'Failed to fetch games from Lichess'
      });
      onError?.(message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 rounded-lg border border-hairline bg-surface">
      <h3 className="flex items-center mb-4 text-lg font-semibold text-fg">
        <svg className="w-5 h-5 mr-2 text-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
        </svg>
        Lichess.org Integration
      </h3>

      <p className="mb-4 text-sm text-fg-muted">
        Automatically import your recent games from Lichess.org
      </p>

      <div className="space-y-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-fg-muted">
            Lichess Username
          </label>
          <input
            type="text"
            value={lichessUsername}
            onChange={(e) => setLichessUsername(e.target.value)}
            placeholder="Enter your Lichess username"
            className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
            disabled={isSyncing}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-fg-muted">
              Max Games to Import
            </label>
            <select
              value={maxGames}
              onChange={(e) => setMaxGames(parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
              disabled={isSyncing || Boolean(sinceDate || untilDate)}
            >
              <option value="20">20 games</option>
              <option value="50">50 games</option>
              <option value="100">100 games</option>
              <option value="200">200 games</option>
              <option value="0">No limit</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-fg-muted">
              Game Types
            </label>
            <select
              value={perfType}
              onChange={(e) => setPerfType(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
              disabled={isSyncing}
            >
              <option value="classical,rapid,blitz">All (Classical, Rapid, Blitz)</option>
              <option value="classical">Classical only</option>
              <option value="rapid">Rapid only</option>
              <option value="blitz">Blitz only</option>
              <option value="bullet">Bullet only</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-fg-muted">
              From date (optional)
            </label>
            <input
              type="date"
              value={sinceDate}
              onChange={(e) => setSinceDate(e.target.value)}
              max={untilDate || undefined}
              className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
              disabled={isSyncing}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-fg-muted">
              To date (optional)
            </label>
            <input
              type="date"
              value={untilDate}
              onChange={(e) => setUntilDate(e.target.value)}
              min={sinceDate || undefined}
              className="w-full px-4 py-2 rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle focus:border-accent focus:ring-1 focus:ring-accent"
              disabled={isSyncing}
            />
          </div>
        </div>

        {(sinceDate || untilDate) && (
          <p className="text-xs text-fg-subtle">
            A date range ignores the "Max Games" cap — every matching game in the range is imported.
          </p>
        )}

        <button
          onClick={handleSync}
          disabled={isSyncing || !lichessUsername.trim()}
          className={`w-full px-6 py-3 font-medium rounded-md transition-colors ${isSyncing || !lichessUsername.trim()
            ? 'bg-surface-2 text-fg-subtle cursor-not-allowed'
            : 'bg-fg text-app hover:opacity-90'
            }`}
        >
          {isSyncing ? (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </span>
          ) : (
            'Import Games from Lichess'
          )}
        </button>

        {syncStatus && (
          <div className={`p-4 rounded-md border ${syncStatus.type === 'success' ? 'bg-win/10 border-win/30 text-win' :
            syncStatus.type === 'error' ? 'bg-loss/10 border-loss/30 text-loss' :
              syncStatus.type === 'warning' ? 'bg-draw/10 border-draw/30 text-draw' :
                'bg-accent/10 border-accent/30 text-accent'
            }`}>
            <div className="flex items-start">
              <span className="mr-2 text-lg">
                {syncStatus.type === 'success' ? '✓' :
                  syncStatus.type === 'error' ? '✗' :
                    syncStatus.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <p className="text-sm font-medium">{syncStatus.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 mt-4 rounded-md border border-hairline bg-surface-2">
        <h4 className="mb-2 text-sm font-semibold text-fg">How it works:</h4>
        <ul className="space-y-1 text-xs text-fg-muted list-disc list-inside">
          <li>Enter your Lichess username (case-insensitive)</li>
          <li>Select how many recent games to import, or set a date range to grab everything in that window</li>
          <li>Games will be automatically added to your dashboard as "Online" — they won't mix with OTB games</li>
          <li>Only rated games are imported</li>
          <li>Duplicate games are automatically detected and merged</li>
        </ul>
      </div>
    </div>
  );
};

export default LichessSyncPanel;
