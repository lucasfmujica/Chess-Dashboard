import { useState } from 'react';
import { CpuChipIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import type { LocalEngineState } from '../../hooks/useLocalEngine';
import type { EngineSettings } from '../../hooks/useEngineSettings';

interface EngineLinesProps {
  state: LocalEngineState;
  enabled: boolean;
  onToggle: () => void;
  settings: EngineSettings;
  setSettings: (s: EngineSettings) => void;
}

const HASH_OPTIONS = [16, 32, 64, 128, 256];

const EngineLines = ({ state, enabled, onToggle, settings, setSettings }: EngineLinesProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const patch = (p: Partial<EngineSettings>) => setSettings({ ...settings, ...p });

  return (
    <div className="rounded-lg border border-hairline bg-surface">
      <div className="px-4 py-2.5 border-b border-hairline flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CpuChipIcon className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-fg">Stockfish</h3>
          {enabled && (
            <span className="text-xs text-fg-subtle tabular-nums">
              {state.analyzing ? `d${state.depth}…` : `depth ${state.depth}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(s => !s)}
            aria-label="Engine settings"
            title="Engine settings"
            className="p-1.5 rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              enabled ? 'bg-accent/10 text-accent border-accent/30' : 'border-hairline text-fg-muted hover:bg-surface-2'
            }`}
          >
            {enabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-4 py-3 border-b border-hairline grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2 flex items-center gap-1">
            {(['depth', 'movetime'] as const).map(m => (
              <button
                key={m}
                onClick={() => patch({ mode: m })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  settings.mode === m ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                {m === 'depth' ? 'Fixed depth' : 'Fixed time'}
              </button>
            ))}
          </div>
          {settings.mode === 'depth' ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">Depth: {settings.depth}</span>
              <input type="range" min={8} max={24} value={settings.depth} onChange={e => patch({ depth: +e.target.value })} className="accent-accent" />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-fg-subtle">Time: {(settings.movetimeMs / 1000).toFixed(1)}s</span>
              <input type="range" min={500} max={5000} step={250} value={settings.movetimeMs} onChange={e => patch({ movetimeMs: +e.target.value })} className="accent-accent" />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-subtle">Lines: {settings.multipv}</span>
            <input type="range" min={1} max={5} value={settings.multipv} onChange={e => patch({ multipv: +e.target.value })} className="accent-accent" />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-fg-subtle">Memory (Hash)</span>
            <select
              value={settings.hashMb}
              onChange={e => patch({ hashMb: +e.target.value })}
              className="rounded-md border border-hairline bg-surface text-fg text-sm px-2 py-1.5 focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {HASH_OPTIONS.map(h => <option key={h} value={h}>{h} MB</option>)}
            </select>
          </label>
        </div>
      )}

      {!enabled ? (
        <p className="px-4 py-3 text-xs text-fg-muted">Turn the engine on to see the top moves for each position.</p>
      ) : state.lines.length === 0 ? (
        <p className="px-4 py-3 text-xs text-fg-muted">Thinking…</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {state.lines.map(line => (
            <li key={line.rank} className="px-4 py-1.5 flex items-baseline gap-3 text-sm">
              <span className={`w-12 flex-shrink-0 font-semibold tabular-nums ${line.evalCp >= 0 ? 'text-fg' : 'text-loss'}`}>
                {line.evalText}
              </span>
              <span className="text-fg-muted truncate">{line.sans.join(' ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EngineLines;
