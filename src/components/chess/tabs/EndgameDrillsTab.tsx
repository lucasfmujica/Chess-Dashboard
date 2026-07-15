import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  ShieldCheckIcon,
  ClockIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEndgameDrills } from '../../../hooks/useEndgameDrills';
import { formatMaterialDelta } from '../../../engine/mineEndgames';
import { isDue, nextReviewAt } from '../../../utils/srs';
import { Card } from '../../ui/Card';
import Badge, { resultTone } from '../../ui/Badge';
import Button from '../../ui/Button';
import SegmentedControl from '../../ui/SegmentedControl';
import StatCard from '../../ui/StatCard';
import { PieceLabel } from '../../ui/PieceGlyph';
import { ecoNames } from '../../../constants/ecoNames';
import EndgameContinuationReplay from '../EndgameContinuationReplay';
import type { EndgameDrill, EndgameType } from '../../../types/endgames';

type ColorFilter = 'all' | 'W' | 'B';
type ListFilter = 'due' | 'all';
type TypeFilter = 'all' | EndgameType;

const TYPE_LABEL: Record<EndgameType, string> = {
  pawn: 'Pawn ending',
  rook: 'Rook ending',
  minor: 'Minor-piece ending',
  queen: 'Queen ending',
  mixed: 'Mixed ending',
};

const drillTitle = (drill: EndgameDrill) =>
  drill.game.openingName || (drill.game.eco ? ecoNames[drill.game.eco] || drill.game.eco : TYPE_LABEL[drill.endgameType]);

const EndgameDrillsTab = () => {
  const { drills, loading, mining, error, mine, review } = useEndgameDrills();
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [listFilter, setListFilter] = useState<ListFilter>('due');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showContinuation, setShowContinuation] = useState(false);

  const now = Date.now();

  const filtered = useMemo(() => {
    let f = drills;
    if (colorFilter !== 'all') f = f.filter(d => d.game.color === colorFilter);
    if (typeFilter !== 'all') f = f.filter(d => d.endgameType === typeFilter);
    if (listFilter === 'due') f = f.filter(d => isDue(d.lastReviewed, d.confidence, now));
    return [...f].sort((a, b) => nextReviewAt(a.lastReviewed, a.confidence) - nextReviewAt(b.lastReviewed, b.confidence));
  }, [drills, colorFilter, typeFilter, listFilter, now]);

  useEffect(() => {
    setCurrentIndex(0);
    setShowContinuation(false);
  }, [colorFilter, typeFilter, listFilter]);

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
    setShowContinuation(false);
    setCurrentIndex(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
  };
  const goNext = () => {
    setShowContinuation(false);
    setCurrentIndex(i => (filtered.length ? (i + 1) % filtered.length : 0));
  };

  const handleReview = async (correct: boolean) => {
    if (!current) return;
    await review(current.id, correct);
    goNext();
  };

  const orientation: 'white' | 'black' = current?.game.color === 'B' ? 'black' : 'white';

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-surface-2 rounded-lg">
              <ShieldCheckIcon className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h2 className="text-h2 text-fg">Endgame Drills</h2>
              <p className="text-sm text-fg-muted">Practice the endgames your own games actually reached</p>
            </div>
          </div>
          <Button variant="secondary" icon={ArrowPathIcon} onClick={() => void mine()} disabled={mining}>
            {mining ? 'Scanning…' : 'Scan for endgames'}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-loss">{error}</p>}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total Drills" value={stats.total} icon={ShieldCheckIcon} />
        <StatCard title="Due Now" value={stats.due} icon={ClockIcon} />
        <StatCard title="Mastered" value={stats.mastered} icon={SparklesIcon} subtitle="Confidence 5/5" />
        <StatCard title="Avg Confidence" value={`${stats.avgConfidence}/5`} />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-6">
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
          <div>
            <p className="text-label mb-2">Type</p>
            <SegmentedControl
              aria-label="Endgame type filter"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'pawn', label: 'Pawn' },
                { value: 'rook', label: 'Rook' },
                { value: 'minor', label: 'Minor' },
                { value: 'queen', label: 'Queen' },
                { value: 'mixed', label: 'Mixed' },
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
              {showContinuation ? (
                <EndgameContinuationReplay gameId={current.gameId} fromPly={current.ply} orientation={orientation} />
              ) : (
                <div className="rounded-lg overflow-hidden border border-hairline">
                  <Chessboard
                    options={{
                      position: current.fen,
                      boardOrientation: orientation,
                      allowDragging: false,
                      showNotation: true,
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
                <Badge tone="accent">{TYPE_LABEL[current.endgameType]}</Badge>
                <Badge tone={resultTone(current.game.result)}>{current.game.result}</Badge>
              </div>
              <h3 className="text-h3 text-fg">{drillTitle(current)}</h3>
              <p className="text-sm text-fg-muted">
                vs {current.game.opponent}
                {current.game.playedDate && ` · ${current.game.playedDate}`}
              </p>

              <div className="p-6 bg-surface-2 rounded-lg border border-hairline">
                <p className="text-base font-semibold text-fg mb-1">
                  {formatMaterialDelta(current.materialDelta)} — how do you continue?
                </p>
                <p className="text-sm text-fg-muted">
                  Work out a plan, then reveal how this game actually went.
                </p>
              </div>

              <div className="flex gap-3">
                {!showContinuation ? (
                  <button
                    onClick={() => setShowContinuation(true)}
                    className="flex-1 px-6 py-4 text-base font-bold text-app bg-fg rounded-lg hover:opacity-90 transition-all"
                  >
                    Show continuation
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
              <h3 className="text-h3 text-fg mb-2">No endgame drills yet</h3>
              <p className="text-fg-muted">
                Click <span className="font-semibold text-fg">"Scan for endgames"</span> above — this scans every
                game's own moves for the first position where material dropped to an endgame, no analysis needed.
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

export default EndgameDrillsTab;
