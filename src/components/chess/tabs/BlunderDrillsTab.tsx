import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useBlunderDrills } from '../../../hooks/useBlunderDrills';
import { isDue, nextReviewAt } from '../../../utils/srs';
import { Card } from '../../ui/Card';
import Badge, { resultTone } from '../../ui/Badge';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import StatCard from '../../ui/StatCard';
import { PieceLabel } from '../../ui/PieceGlyph';
import { ecoNames } from '../../../constants/ecoNames';
import BlunderSolveBoard from '../BlunderSolveBoard';
import type { BlunderDrill } from '../../../types/blunders';

type Mode = 'review' | 'solve';
type ColorFilter = 'all' | 'W' | 'B';
type ListFilter = 'due' | 'all';

const fmtEval = (cp: number) => (Math.abs(cp) >= 9000 ? '#' : (cp / 100).toFixed(1));

const uciSquares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/** UCI of the move actually played, derived from its stored SAN (for the "reveal" arrow). */
const playedUciFor = (drill: BlunderDrill): string | undefined => {
  try {
    const move = new Chess(drill.fenBefore).move(drill.playedSan);
    return move ? move.from + move.to : undefined;
  } catch {
    return undefined;
  }
};

const drillTitle = (drill: BlunderDrill) =>
  drill.game.openingName || (drill.game.eco ? ecoNames[drill.game.eco] || drill.game.eco : 'Blunder');

const BlunderDrillsTab = () => {
  const {
    drills,
    loading,
    mining,
    batch,
    pendingAnalysisCount,
    error,
    mine,
    analyzeAndMine,
    cancelBatch,
    review,
    solve,
  } = useBlunderDrills();
  const [mode, setMode] = useState<Mode>('review');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [listFilter, setListFilter] = useState<ListFilter>('due');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const now = Date.now();

  const filtered = useMemo(() => {
    let f = drills;
    if (colorFilter !== 'all') f = f.filter(d => d.game.color === colorFilter);
    if (listFilter === 'due') f = f.filter(d => isDue(d.lastReviewed, d.confidence, now));
    return [...f].sort((a, b) => nextReviewAt(a.lastReviewed, a.confidence) - nextReviewAt(b.lastReviewed, b.confidence));
  }, [drills, colorFilter, listFilter, now]);

  useEffect(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
  }, [mode, colorFilter, listFilter]);

  const current = filtered[currentIndex];

  const stats = useMemo(() => {
    const total = drills.length;
    const due = drills.filter(d => isDue(d.lastReviewed, d.confidence, now)).length;
    const mastered = drills.filter(d => (d.confidence ?? 0) >= 5).length;
    const scored = drills.filter(d => d.confidence);
    const avgConfidence = scored.length
      ? Math.round((scored.reduce((s, d) => s + (d.confidence ?? 0), 0) / scored.length) * 10) / 10
      : 0;
    return { total, due, mastered, avgConfidence };
  }, [drills, now]);

  const goPrev = () => {
    setShowAnswer(false);
    setCurrentIndex(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
  };
  const goNext = () => {
    setShowAnswer(false);
    setCurrentIndex(i => (filtered.length ? (i + 1) % filtered.length : 0));
  };

  const handleReview = async (correct: boolean) => {
    if (!current) return;
    await review(current.id, correct);
    goNext();
  };

  const orientation: 'white' | 'black' = current?.game.color === 'B' ? 'black' : 'white';
  const playedUci = current ? playedUciFor(current) : undefined;

  const reviewArrows = useMemo(() => {
    if (!current || !showAnswer) return [];
    const list: { startSquare: string; endSquare: string; color: string }[] = [];
    const best = uciSquares(current.bestMoveUci);
    list.push({ startSquare: best.from, endSquare: best.to, color: 'rgb(var(--win) / 0.7)' });
    if (playedUci) {
      const played = uciSquares(playedUci);
      list.push({ startSquare: played.from, endSquare: played.to, color: 'rgb(var(--loss) / 0.7)' });
    }
    return list;
  }, [current, showAnswer, playedUci]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-2 rounded-lg">
              <ExclamationTriangleIcon className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-h2 text-fg">Blunder Drills</h2>
              <p className="text-sm text-fg-muted">Drill the mistakes from your own analyzed games</p>
            </div>
          </div>
          {batch ? (
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.round((batch.done / batch.total) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-fg-muted tabular-nums">
                Analyzing {batch.done}/{batch.total} · {batch.name}
              </span>
              <Button variant="secondary" size="sm" onClick={cancelBatch}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {pendingAnalysisCount > 0 && (
                <Button variant="secondary" onClick={() => void mine()} disabled={mining}>
                  {mining ? 'Scanning…' : 'Scan already-analyzed'}
                </Button>
              )}
              <Button variant="secondary" icon={ArrowPathIcon} onClick={() => void analyzeAndMine()} disabled={mining}>
                {mining
                  ? 'Scanning…'
                  : pendingAnalysisCount > 0
                    ? `Analyze & scan (${pendingAnalysisCount})`
                    : 'Scan for new blunders'}
              </Button>
            </div>
          )}
        </div>
        {batch && (
          <p className="mt-3 text-xs text-fg-subtle">
            Running Stockfish over your unanalyzed games first — this can take a while for a large batch.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Drills" value={stats.total} icon={ExclamationTriangleIcon} />
        <StatCard title="Due Now" value={stats.due} icon={ClockIcon} />
        <StatCard title="Mastered" value={stats.mastered} icon={SparklesIcon} subtitle="Confidence 5/5" />
        <StatCard title="Avg Confidence" value={`${stats.avgConfidence}/5`} />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-label mb-2">Mode</p>
            <SegmentedControl
              aria-label="Drill mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'review', label: 'Review' },
                { value: 'solve', label: 'Solve' },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Queue</p>
            <SegmentedControl
              aria-label="Queue filter"
              value={listFilter}
              onChange={setListFilter}
              options={[
                { value: 'due', label: `Due (${stats.due})` },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
          <div>
            <p className="text-label mb-2">Color</p>
            <SegmentedControl
              aria-label="Color filter"
              value={colorFilter}
              onChange={setColorFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'W', label: <PieceLabel color="W" /> },
                { value: 'B', label: <PieceLabel color="B" /> },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Drill */}
      {loading ? (
        <Card className="p-12 text-center text-fg-muted">Loading…</Card>
      ) : filtered.length > 0 && current ? (
        <Card flush className="overflow-hidden">
          <div className="px-6 py-3 bg-surface-2 border-b border-hairline">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">
                {currentIndex + 1} of {filtered.length}
              </span>
              <span className="text-sm text-fg-muted">
                Confidence: <span className="font-bold text-accent tabular-nums">{current.confidence ?? '—'}/5</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / filtered.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-6 flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-[420px] flex-shrink-0">
              {mode === 'solve' ? (
                <BlunderSolveBoard
                  fen={current.fenBefore}
                  bestMoveUci={current.bestMoveUci}
                  orientation={orientation}
                  resetKey={current.id}
                  onResult={correct => void solve(current.id, correct)}
                />
              ) : (
                <div className="rounded-lg overflow-hidden border border-hairline">
                  <Chessboard
                    options={{
                      position: current.fenBefore,
                      boardOrientation: orientation,
                      allowDragging: false,
                      showNotation: true,
                      arrows: reviewArrows,
                      lightSquareStyle: { backgroundColor: 'rgb(var(--board-light))' },
                      darkSquareStyle: { backgroundColor: 'rgb(var(--board-dark))' },
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral"><PieceLabel color={current.game.color} /></Badge>
                {current.game.eco && <Badge tone="neutral">{current.game.eco}</Badge>}
                <Badge tone={resultTone(current.game.result)}>{current.game.result}</Badge>
              </div>
              <h3 className="text-h3 text-fg">{drillTitle(current)}</h3>
              <p className="text-sm text-fg-muted">
                vs {current.game.opponent}
                {current.game.playedDate && ` · ${current.game.playedDate}`}
              </p>

              {mode === 'review' && !showAnswer && (
                <div className="p-6 bg-surface-2 rounded-lg border border-hairline">
                  <p className="text-base font-semibold text-fg mb-1">What went wrong here?</p>
                  <p className="text-sm text-fg-muted">Find the best move in your head, then reveal.</p>
                </div>
              )}

              {mode === 'review' && showAnswer && (
                <div className="space-y-3 animate-slideUp">
                  <div className="p-5 bg-surface-2 rounded-lg border border-hairline">
                    <p className="text-label mb-2">You played</p>
                    <p className="text-lg font-bold text-loss font-mono">{current.playedSan}</p>
                  </div>
                  <div className="p-5 bg-surface-2 rounded-lg border border-hairline">
                    <p className="text-label mb-2">Eval swing</p>
                    <p className="text-sm text-fg tabular-nums">
                      {fmtEval(current.evalBefore)} → {fmtEval(current.evalAfter)}{' '}
                      <span className="text-loss">(−{(current.cpLoss / 100).toFixed(1)})</span>
                    </p>
                  </div>
                </div>
              )}

              {mode === 'review' && (
                <div className="flex gap-3">
                  {!showAnswer ? (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="flex-1 px-6 py-4 text-base font-bold text-app bg-fg rounded-lg hover:opacity-90 transition-all"
                    >
                      Show answer
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => void handleReview(false)}
                        className="flex-1 px-6 py-4 text-base font-bold text-app bg-loss rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircleIcon className="w-5 h-5" /> Missed it
                      </button>
                      <button
                        onClick={() => void handleReview(true)}
                        className="flex-1 px-6 py-4 text-base font-bold text-app bg-win rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircleIcon className="w-5 h-5" /> Got it
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={goPrev}>← Previous</Button>
                <Button variant="secondary" onClick={goNext}>Next →</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
            <CheckCircleIcon className="w-12 h-12 text-win" />
          </div>
          {drills.length === 0 ? (
            <>
              <h3 className="text-h3 text-fg mb-2">No blunder drills yet</h3>
              <p className="text-fg-muted">
                Click <span className="font-semibold text-fg">"Analyze &amp; scan"</span> above to run Stockfish over
                your games and pull out your blunders — no need to analyze them one by one first.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-h3 text-fg mb-2">All caught up!</h3>
              <p className="text-fg-muted">No drills due for review. Switch to "All" to keep practicing.</p>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default BlunderDrillsTab;
