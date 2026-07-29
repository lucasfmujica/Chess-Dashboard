import { useEffect, useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

/**
 * The clock for a calculation exercise.
 *
 * Juan Cruz and Studer both ask for 5-10 minutes on a position before looking
 * at anything. Without a clock that is a guess, and the honest failure mode is
 * spending ninety seconds and believing it was five. The marks are the whole
 * point of the component: it is not a stopwatch, it is a target.
 *
 * It counts up rather than down deliberately. A countdown that hits zero says
 * "time is up" — but going past ten minutes on a hard position is fine, and
 * being told to stop would train the wrong reflex.
 */

/** Below this you have not really calculated yet. */
export const THINK_FLOOR_SECONDS = 5 * 60;
/** Past this, a position is usually telling you something other than the answer. */
export const THINK_TARGET_SECONDS = 10 * 60;

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

interface ThinkTimerProps {
  /** Epoch millis the exercise started. */
  startedAt: number;
  /** Stops the clock — the answer is out, the calculation is over. */
  frozen?: boolean;
  /** Seconds to display when frozen, instead of counting from `startedAt`. */
  frozenSeconds?: number;
}

const ThinkTimer = ({ startedAt, frozen = false, frozenSeconds }: ThinkTimerProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [frozen]);

  const elapsed = frozen
    ? (frozenSeconds ?? 0)
    : Math.max(0, Math.floor((now - startedAt) / 1000));

  const reached = elapsed >= THINK_FLOOR_SECONDS;
  const deep = elapsed >= THINK_TARGET_SECONDS;

  const tone = deep
    ? 'border-accent/40 bg-accent/10 text-accent'
    : reached
      ? 'border-win/30 bg-win/10 text-win'
      : 'border-hairline bg-surface-2 text-fg-muted';

  const progress = Math.min(100, (elapsed / THINK_FLOOR_SECONDS) * 100);

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-2">
        <ClockIcon className="w-4 h-4 shrink-0" />
        <span className="nums text-sm font-semibold tabular-nums">{formatDuration(elapsed)}</span>
        <span className="text-xs opacity-80">
          {frozen
            ? 'de cálculo'
            : deep
              ? 'pasaste los 10 — decidí y anotá'
              : reached
                ? 'ya calculaste de verdad'
                : `faltan ${formatDuration(THINK_FLOOR_SECONDS - elapsed)} para los 5`}
        </span>
      </div>
      {!frozen && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              reached ? 'bg-win' : 'bg-fg-subtle'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ThinkTimer;
