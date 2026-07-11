import { useState, useMemo, useEffect } from 'react';
import {
  ClipboardDocumentCheckIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  StarIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import type { RepertoireLine } from '../../../types/chess';
import {
  fetchRepertoireLines,
  postRepertoireLine,
  putRepertoireLine,
  deleteRepertoireLine,
} from '../../../api/client';

type ColorFilter = 'all' | 'W' | 'B';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AFTER_DAYS = 30;

const TournamentPrepTab = () => {
  const modal = useModal();

  const [lines, setLines] = useState<RepertoireLine[]>([]);

  useEffect(() => {
    fetchRepertoireLines()
      .then(setLines)
      .catch(err => console.error('Failed to load repertoire lines', err));
  }, []);

  const [selectedLine, setSelectedLine] = useState<Partial<RepertoireLine> | null>(null);
  const [editingLine, setEditingLine] = useState<RepertoireLine | null>(null);
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');

  const saveLine = async (line: Partial<RepertoireLine>) => {
    if (editingLine) {
      const saved = await putRepertoireLine(editingLine.id, line);
      setLines(prev => prev.map(l => (l.id === saved.id ? saved : l)));
    } else {
      const saved = await postRepertoireLine({ color: 'W', ...line });
      setLines(prev => [...prev, saved]);
    }
    setEditingLine(null);
    setSelectedLine(null);
  };

  const removeLine = async (id: string) => {
    const confirmed = await modal.confirm('Delete this prep line?');
    if (confirmed) {
      await deleteRepertoireLine(id);
      setLines(prev => prev.filter(l => l.id !== id));
    }
  };

  const markReviewed = async (line: RepertoireLine) => {
    const saved = await putRepertoireLine(line.id, { ...line, lastReviewed: Date.now() });
    setLines(prev => prev.map(l => (l.id === saved.id ? saved : l)));
  };

  const filteredLines = useMemo(() => {
    const filtered = colorFilter === 'all' ? lines : lines.filter(l => l.color === colorFilter);
    return [...filtered].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  }, [lines, colorFilter]);

  const stats = useMemo(() => {
    const total = lines.length;
    const avgConfidence = total > 0
      ? Math.round((lines.reduce((sum, l) => sum + (l.confidence ?? 0), 0) / total) * 10) / 10
      : 0;
    const staleCount = lines.filter(l => {
      if (!l.lastReviewed) return true;
      return Date.now() - l.lastReviewed > STALE_AFTER_DAYS * DAY_MS;
    }).length;
    return { total, avgConfidence, staleCount };
  }, [lines]);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="relative px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-surface-2 rounded-lg">
                <ClipboardDocumentCheckIcon className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-fg">Tournament Prep</h2>
                <p className="text-fg-muted">Your prepared lines — plan, golden rule and confidence per line</p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedLine({});
                setEditingLine(null);
              }}
              className="px-6 py-3 bg-fg text-app rounded-lg hover:opacity-90 transition-all font-semibold flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              New Line
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <p className="text-sm font-medium text-fg-muted mb-2">Total Lines</p>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.total}</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <p className="text-sm font-medium text-fg-muted mb-2">Avg Confidence</p>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.avgConfidence} / 5</p>
            </div>
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <p className="text-sm font-medium text-fg-muted mb-2">Needs Review (30d+)</p>
              <p className="text-2xl font-bold text-fg tabular-nums">{stats.staleCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex items-center gap-2">
          {(['all', 'W', 'B'] as ColorFilter[]).map(c => (
            <button
              key={c}
              onClick={() => setColorFilter(c)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                colorFilter === c
                  ? 'bg-surface-2 border-accent text-fg'
                  : 'bg-surface border-hairline text-fg-muted hover:bg-surface-2'
              }`}
            >
              {c === 'all' ? 'All' : c === 'W' ? '⚪ White' : '⚫ Black'}
            </button>
          ))}
        </div>
      </div>

      {/* Line Form */}
      {selectedLine !== null && (
        <div className="bg-surface rounded-lg border border-hairline overflow-hidden animate-slideUp">
          <div className="px-6 py-4 bg-surface-2 border-b border-hairline">
            <h3 className="text-base font-semibold text-fg">
              {editingLine ? 'Edit Prep Line' : 'New Prep Line'}
            </h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-fg mb-2">Color</label>
                <select
                  value={selectedLine.color ?? 'W'}
                  onChange={(e) => setSelectedLine({ ...selectedLine, color: e.target.value as 'W' | 'B' })}
                  className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="W">White</option>
                  <option value="B">Black</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-fg mb-2">Vs Move</label>
                <input
                  type="text"
                  placeholder="1.e4 / 1.d4 / anti-Sicilian Bb5..."
                  value={selectedLine.vsMove || ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, vsMove: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-fg mb-2">ECO</label>
                <input
                  type="text"
                  placeholder="B33"
                  value={selectedLine.eco || ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, eco: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-fg mb-2">Line Name</label>
                <input
                  type="text"
                  placeholder="Dragón Acelerado – Bc4 principal con …a5"
                  value={selectedLine.lineName || ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, lineName: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-fg mb-2">Moves (SAN, up to the tabiya)</label>
              <textarea
                placeholder="1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.Nc3 Bg7 6.Be3 Nf6 7.Bc4..."
                value={selectedLine.movesSan || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, movesSan: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent h-20 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-fg mb-2">Key FEN (critical position)</label>
              <input
                type="text"
                placeholder="r1bqk2r/pp1pppbp/2n2np1/8/2BNP3/2N1B3/PPP2PPP/R2QK2R b KQkq - 0 7"
                value={selectedLine.keyFen || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, keyFen: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-fg mb-2">Plan</label>
              <textarea
                placeholder="The plan, in one sentence..."
                value={selectedLine.plan || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, plan: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-fg mb-2">Golden Rule / Trap to Avoid</label>
              <textarea
                placeholder="What NOT to fall for..."
                value={selectedLine.goldenRule || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, goldenRule: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-fg mb-2">Priority (1 = close out first)</label>
                <input
                  type="number"
                  min={1}
                  value={selectedLine.priority ?? ''}
                  onChange={(e) => setSelectedLine({ ...selectedLine, priority: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-4 py-3 bg-surface border border-hairline text-fg rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-fg mb-2">Confidence (1-5)</label>
                <div className="flex gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setSelectedLine({ ...selectedLine, confidence: rating })}
                      className={`p-2 rounded-lg transition-all ${
                        (selectedLine.confidence || 0) >= rating
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-surface-2 text-fg-subtle hover:bg-surface-2'
                      }`}
                    >
                      <StarIcon className="w-6 h-6" fill={(selectedLine.confidence || 0) >= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-fg mb-2">Lichess Study Link</label>
              <input
                type="text"
                placeholder="https://lichess.org/study/..."
                value={selectedLine.lichessUrl || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, lichessUrl: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-fg mb-2">Notes</label>
              <textarea
                placeholder="Anything else worth remembering about this line..."
                value={selectedLine.notes || ''}
                onChange={(e) => setSelectedLine({ ...selectedLine, notes: e.target.value })}
                className="w-full px-4 py-3 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg resize-none focus:border-accent focus:ring-1 focus:ring-accent h-24"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => saveLine(selectedLine)}
                className="flex-1 px-6 py-3 bg-fg text-app rounded-lg hover:opacity-90 transition-all font-bold"
              >
                {editingLine ? 'Update Line' : 'Save Line'}
              </button>
              <button
                onClick={() => {
                  setSelectedLine(null);
                  setEditingLine(null);
                }}
                className="px-6 py-3 text-fg bg-surface border border-hairline rounded-lg hover:bg-surface-2 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lines List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredLines.length > 0 ? (
          filteredLines.map(line => {
            const daysSinceReview = line.lastReviewed
              ? Math.floor((Date.now() - line.lastReviewed) / DAY_MS)
              : null;
            const isStale = daysSinceReview === null || daysSinceReview > STALE_AFTER_DAYS;
            return (
              <div key={line.id} className="bg-surface rounded-lg border border-hairline overflow-hidden hover:bg-surface-2 transition-colors">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-fg-muted mb-1">
                        <span>{line.color === 'W' ? '⚪' : '⚫'}</span>
                        {line.eco && <span className="font-mono font-bold text-accent">{line.eco}</span>}
                        {line.vsMove && <span>vs {line.vsMove}</span>}
                        {line.priority != null && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-surface-2 border border-hairline">
                            P{line.priority}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xl font-bold text-fg">{line.lineName || 'Untitled line'}</h4>
                    </div>

                    <div className="flex gap-2">
                      {line.lichessUrl && (
                        <a
                          href={line.lichessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Lichess study"
                          className="p-2 text-fg-muted hover:bg-surface-2 hover:text-fg rounded-lg transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedLine(line);
                          setEditingLine(line);
                        }}
                        className="p-2 text-accent hover:bg-surface-2 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removeLine(line.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {line.movesSan && (
                    <p className="text-sm font-mono text-fg-muted mb-3 line-clamp-2">{line.movesSan}</p>
                  )}

                  {line.plan && (
                    <p className="text-sm text-fg mb-2"><span className="font-semibold">Plan: </span>{line.plan}</p>
                  )}

                  {line.goldenRule && (
                    <p className="text-sm text-fg-muted mb-3"><span className="font-semibold">⚠️ Golden rule: </span>{line.goldenRule}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-hairline">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className="w-4 h-4 text-yellow-500"
                          fill={(line.confidence ?? 0) > i ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => markReviewed(line)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        isStale ? 'text-loss hover:bg-surface-2' : 'text-fg-muted hover:bg-surface-2'
                      }`}
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      {daysSinceReview === null ? 'Never reviewed' : `Reviewed ${daysSinceReview}d ago`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 bg-surface rounded-lg border border-hairline p-12 text-center">
            <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
              <ClipboardDocumentCheckIcon className="w-12 h-12 text-fg-subtle" />
            </div>
            <h3 className="text-base font-semibold text-fg mb-2">No prep lines yet</h3>
            <p className="text-fg-muted mb-4">Start uploading your tournament preparation, line by line.</p>
            <button
              onClick={() => {
                setSelectedLine({});
                setEditingLine(null);
              }}
              className="px-6 py-3 bg-fg text-app rounded-lg hover:opacity-90 transition-all font-bold"
            >
              Add First Line
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentPrepTab;
