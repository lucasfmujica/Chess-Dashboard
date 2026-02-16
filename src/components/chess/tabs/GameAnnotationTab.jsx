import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  DocumentTextIcon,
  PencilIcon,
  TagIcon,
  StarIcon,
  TrashIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';

const GameAnnotationTab = ({ games }) => {
  const modal = useModal();

  const [annotatedGames, setAnnotatedGames] = useState(() => {
    const stored = localStorage.getItem('chessDashboard_annotatedGames');
    return stored ? JSON.parse(stored) : [];
  });

  const [selectedGame, setSelectedGame] = useState(null);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [filterTag, setFilterTag] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Available tags
  const tags = useMemo(() => [
    { id: 'brilliant-attack', label: 'Brilliant Attack', color: 'emerald', icon: '⚔️' },
    { id: 'endgame-technique', label: 'Endgame Technique', color: 'blue', icon: '♔' },
    { id: 'tactical-shot', label: 'Tactical Shot', color: 'purple', icon: '⚡' },
    { id: 'positional-masterclass', label: 'Positional Masterclass', color: 'indigo', icon: '🎯' },
    { id: 'opening-trap', label: 'Opening Trap', color: 'amber', icon: '🎪' },
    { id: 'blunder', label: 'Blunder to Study', color: 'rose', icon: '❌' },
    { id: 'sacrifice', label: 'Brilliant Sacrifice', color: 'fuchsia', icon: '💎' },
    { id: 'defensive-resource', label: 'Defensive Resource', color: 'cyan', icon: '🛡️' }
  ], []);

  // Symbols for notation
  const symbols = [
    { symbol: '!', label: 'Good move', color: 'text-emerald-600' },
    { symbol: '!!', label: 'Brilliant move', color: 'text-emerald-700' },
    { symbol: '?', label: 'Mistake', color: 'text-amber-600' },
    { symbol: '??', label: 'Blunder', color: 'text-rose-600' },
    { symbol: '!?', label: 'Interesting move', color: 'text-indigo-600' },
    { symbol: '?!', label: 'Dubious move', color: 'text-amber-700' },
    { symbol: '±', label: 'White is better', color: 'text-slate-600' },
    { symbol: '∓', label: 'Black is better', color: 'text-slate-800' },
    { symbol: '=', label: 'Equal position', color: 'text-slate-500' }
  ];

  const saveAnnotation = (annotation) => {
    let updated;
    if (editingAnnotation) {
      updated = annotatedGames.map(a => a.id === annotation.id ? annotation : a);
    } else {
      annotation.id = Date.now();
      annotation.createdAt = Date.now();
      updated = [...annotatedGames, annotation];
    }
    setAnnotatedGames(updated);
    localStorage.setItem('chessDashboard_annotatedGames', JSON.stringify(updated));
    setEditingAnnotation(null);
    setSelectedGame(null);
  };

  const deleteAnnotation = async (id) => {
    const confirmed = await modal.confirm('Delete this annotation?');
    if (confirmed) {
      const updated = annotatedGames.filter(a => a.id !== id);
      setAnnotatedGames(updated);
      localStorage.setItem('chessDashboard_annotatedGames', JSON.stringify(updated));
    }
  };

  const filteredAnnotations = useMemo(() => {
    let filtered = annotatedGames;

    if (filterTag !== 'all') {
      filtered = filtered.filter(a => a.tags?.includes(filterTag));
    }

    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.gameName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.keyMoments?.some(m => m.comment?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [annotatedGames, filterTag, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = annotatedGames.length;
    const byTag = tags.map(tag => ({
      ...tag,
      count: annotatedGames.filter(a => a.tags?.includes(tag.id)).length
    }));
    const avgRating = annotatedGames.length > 0
      ? Math.round(annotatedGames.reduce((sum, a) => sum + (a.rating || 0), 0) / annotatedGames.length * 10) / 10
      : 0;

    return { total, byTag, avgRating };
  }, [annotatedGames, tags]);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>

        <div className="relative px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <DocumentTextIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Game Annotation Library</h2>
                <p className="text-cyan-100">Build your personal database of analyzed games</p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedGame({});
                setEditingAnnotation(null);
              }}
              className="px-6 py-3 text-white bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl hover:bg-white/30 transition-all font-semibold flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              New Annotation
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="w-5 h-5 text-yellow-300" />
                <p className="text-sm font-medium text-white/80">Total Annotations</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <StarIcon className="w-5 h-5 text-yellow-300" />
                <p className="text-sm font-medium text-white/80">Avg Rating</p>
              </div>
              <p className="text-2xl font-bold text-white">{stats.avgRating} ★</p>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <TagIcon className="w-5 h-5 text-emerald-300" />
                <p className="text-sm font-medium text-white/80">Most Used Tag</p>
              </div>
              <p className="text-lg font-bold text-white">
                {stats.byTag.sort((a, b) => b.count - a.count)[0]?.icon || '—'}{' '}
                {stats.byTag.sort((a, b) => b.count - a.count)[0]?.label.split(' ')[0] || 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-slate-600" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-4 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.icon} {tag.label} ({stats.byTag.find(t => t.id === tag.id)?.count || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Annotation Form */}
      {selectedGame !== null && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden animate-slideUp">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500">
            <h3 className="text-xl font-bold text-white">
              {editingAnnotation ? 'Edit Annotation' : 'New Game Annotation'}
            </h3>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Game Name / Event</label>
              <input
                type="text"
                placeholder="e.g., vs. GM Carlsen - Tata Steel 2024"
                value={selectedGame.gameName || ''}
                onChange={(e) => setSelectedGame({ ...selectedGame, gameName: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
                <input
                  type="date"
                  value={selectedGame.date || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Result</label>
                <select
                  value={selectedGame.result || ''}
                  onChange={(e) => setSelectedGame({ ...selectedGame, result: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                >
                  <option value="">Select result</option>
                  <option value="1-0">1-0 (Win)</option>
                  <option value="0-1">0-1 (Loss)</option>
                  <option value="1/2-1/2">1/2-1/2 (Draw)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Personal Rating (1-5 stars)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setSelectedGame({ ...selectedGame, rating })}
                    className={`p-3 rounded-xl transition-all ${
                      (selectedGame.rating || 0) >= rating
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <StarIcon className="w-6 h-6" fill={(selectedGame.rating || 0) >= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const isSelected = selectedGame.tags?.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const currentTags = selectedGame.tags || [];
                        const newTags = isSelected
                          ? currentTags.filter(t => t !== tag.id)
                          : [...currentTags, tag.id];
                        setSelectedGame({ ...selectedGame, tags: newTags });
                      }}
                      className={`px-4 py-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                        isSelected
                          ? `bg-${tag.color}-100 border-${tag.color}-300 text-${tag.color}-700`
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tag.icon} {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Overall Notes</label>
              <textarea
                placeholder="What made this game special? What did you learn? What patterns did you notice?"
                value={selectedGame.notes || ''}
                onChange={(e) => setSelectedGame({ ...selectedGame, notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent h-32"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-4">Key Moments & Variations</label>
              <div className="space-y-3">
                {(selectedGame.keyMoments || []).map((moment, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex gap-3 items-start">
                      <input
                        type="text"
                        placeholder="Move (e.g., 15.Nxe5)"
                        value={moment.move || ''}
                        onChange={(e) => {
                          const updated = [...(selectedGame.keyMoments || [])];
                          updated[idx] = { ...moment, move: e.target.value };
                          setSelectedGame({ ...selectedGame, keyMoments: updated });
                        }}
                        className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                      />
                      <select
                        value={moment.symbol || ''}
                        onChange={(e) => {
                          const updated = [...(selectedGame.keyMoments || [])];
                          updated[idx] = { ...moment, symbol: e.target.value };
                          setSelectedGame({ ...selectedGame, keyMoments: updated });
                        }}
                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Symbol</option>
                        {symbols.map(s => (
                          <option key={s.symbol} value={s.symbol}>{s.symbol} {s.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Comment / Variation"
                        value={moment.comment || ''}
                        onChange={(e) => {
                          const updated = [...(selectedGame.keyMoments || [])];
                          updated[idx] = { ...moment, comment: e.target.value };
                          setSelectedGame({ ...selectedGame, keyMoments: updated });
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          const updated = (selectedGame.keyMoments || []).filter((_, i) => i !== idx);
                          setSelectedGame({ ...selectedGame, keyMoments: updated });
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const updated = [...(selectedGame.keyMoments || []), { move: '', symbol: '', comment: '' }];
                    setSelectedGame({ ...selectedGame, keyMoments: updated });
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-indigo-600 bg-indigo-50 border-2 border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Key Moment
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => saveAnnotation(selectedGame)}
                className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all font-bold"
              >
                {editingAnnotation ? 'Update Annotation' : 'Save Annotation'}
              </button>
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setEditingAnnotation(null);
                }}
                className="px-6 py-3 text-slate-700 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotations List */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredAnnotations.length > 0 ? (
          filteredAnnotations.map(annotation => (
            <div key={annotation.id} className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-1">{annotation.gameName}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span>{annotation.date}</span>
                      <span className="font-bold">{annotation.result}</span>
                      {annotation.rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: annotation.rating }).map((_, i) => (
                            <StarIcon key={i} className="w-4 h-4 text-yellow-500" fill="currentColor" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedGame(annotation);
                        setEditingAnnotation(annotation);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteAnnotation(annotation.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {annotation.tags && annotation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {annotation.tags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <span key={tagId} className={`px-2 py-1 text-xs font-bold rounded-lg bg-${tag.color}-100 text-${tag.color}-700`}>
                          {tag.icon} {tag.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {annotation.notes && (
                  <p className="text-sm text-slate-700 mb-4 line-clamp-3">{annotation.notes}</p>
                )}

                {annotation.keyMoments && annotation.keyMoments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase">Key Moments:</p>
                    {annotation.keyMoments.slice(0, 3).map((moment, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded-lg text-sm">
                        <span className="font-mono font-bold text-indigo-600">{moment.move}</span>
                        {moment.symbol && <span className="ml-2 font-bold text-emerald-600">{moment.symbol}</span>}
                        {moment.comment && <span className="ml-2 text-slate-600">— {moment.comment}</span>}
                      </div>
                    ))}
                    {annotation.keyMoments.length > 3 && (
                      <p className="text-xs text-slate-500 italic">+ {annotation.keyMoments.length - 3} more moments</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/60 p-12 text-center">
            <div className="p-4 bg-slate-100 rounded-full inline-block mb-4">
              <DocumentTextIcon className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No annotations yet</h3>
            <p className="text-slate-600 mb-4">Start building your personal game library by annotating your best games!</p>
            <button
              onClick={() => {
                setSelectedGame({});
                setEditingAnnotation(null);
              }}
              className="px-6 py-3 text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all font-bold"
            >
              Create First Annotation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

GameAnnotationTab.propTypes = {
  games: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default GameAnnotationTab;
