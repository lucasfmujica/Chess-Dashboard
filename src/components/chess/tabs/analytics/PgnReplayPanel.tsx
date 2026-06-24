import { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import { useGameViewer } from '../../../../context/GameViewerContext';

/**
 * Paste any PGN and open it in the interactive board replay viewer.
 */
const PgnReplayPanel = () => {
  const { openGameViewer } = useGameViewer();
  const [text, setText] = useState('');

  const headerValue = (key: string): string | undefined =>
    text.match(new RegExp(`\\[${key}\\s+"([^"]+)"\\]`))?.[1];

  const handleReplay = () => {
    if (!text.trim()) return;
    openGameViewer({
      pgn: text,
      white: headerValue('White'),
      black: headerValue('Black'),
      result: headerValue('Result'),
      title: headerValue('Event') || 'Game Replay',
    });
  };

  return (
    <div className="bg-surface rounded-lg border border-hairline p-5">
      <h3 className="text-sm font-semibold text-fg">Replay a game</h3>
      <p className="mt-1 text-xs text-fg-muted">
        Paste a PGN (with moves) to step through it on an interactive board.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        placeholder={'[Event "..."]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...'}
        className="mt-3 w-full rounded-md border border-hairline bg-surface text-fg placeholder-fg-subtle text-sm font-mono px-3 py-2 focus:border-accent focus:ring-1 focus:ring-accent resize-y"
      />
      <button
        onClick={handleReplay}
        disabled={!text.trim()}
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-fg text-app text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <PlayIcon className="w-4 h-4" />
        Replay on board
      </button>
    </div>
  );
};

export default PgnReplayPanel;
