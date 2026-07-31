import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  PlusIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { useModal } from '../../modals/ModalContext';
import { useGames } from '../../../context/GamesContext';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../ui';
import AnnotationCard from './annotations/AnnotationCard';
import AnnotationForm from './annotations/AnnotationForm';
import UnanalyzedQueue from './annotations/UnanalyzedQueue';
import { TAGS } from './annotations/annotationMeta';
import { unanalyzedGames } from '../../../utils/annotationMatching';
import {
  gameLabel,
  gameToAnnotationDraft,
  mergeAnnotationDraft,
  type AnnotationDraft,
} from '../../../utils/gameMapping';
import { daysAgoKey } from '../../../utils/localDate';
import type { AnnotatedGame, Game } from '../../../types/chess';
import {
  fetchAnnotations,
  postAnnotation,
  putAnnotation,
  deleteAnnotation as deleteAnnotationApi,
} from '../../../api/client';

/**
 * How far back the library chases missing post-mortems. Wider than the week
 * view's 7 days on purpose: that one grades the current week, this one is the
 * backlog you can still clear.
 */
const BACKLOG_DAYS = 14;

const GameAnnotationTab = () => {
  const modal = useModal();
  // The unfiltered list: the header filter defaults to OTB, but the rule that a
  // game isn't finished until it has a row here covers online games too.
  const { games } = useGames();
  const { pendingAnnotationGameId, setPendingAnnotationGameId } = useUI();

  const [annotatedGames, setAnnotatedGames] = useState<AnnotatedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<Partial<AnnotatedGame> | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<AnnotatedGame | null>(null);
  const [filterTag, setFilterTag] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * What the last auto-fill wrote, so changing the linked game can replace its
   * own previous values without ever touching what was typed by hand. Null
   * while editing a saved annotation — nothing there was auto-filled.
   */
  const autoFilled = useRef<AnnotationDraft | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnnotations()
      .then(setAnnotatedGames)
      .catch(err => console.error('Failed to load annotations', err));
  }, []);

  /**
   * Candidates for the "linked game" picker, newest first. Capped because a
   * 460-entry native select is unusable, and a post-mortem is written about a
   * recent game — older ones can still be linked by editing the row later.
   */
  const linkableGames = useMemo(
    () =>
      [...games]
        .filter(g => g.date && g.id)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        .slice(0, 60),
    [games]
  );

  const pending = useMemo(
    () => unanalyzedGames(games, annotatedGames, daysAgoKey(BACKLOG_DAYS)),
    [games, annotatedGames]
  );

  const linkedGame = useMemo(
    () => (selectedGame?.gameId ? games.find(g => g.id === selectedGame.gameId) : undefined),
    [games, selectedGame?.gameId]
  );

  /** Open a fresh post-mortem for a game, with everything the row already knows. */
  const startAnnotation = useCallback((game: Game) => {
    const draft = gameToAnnotationDraft(game);
    autoFilled.current = draft;
    setEditingAnnotation(null);
    setSelectedGame(draft);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }, []);

  // Handoff from the week view's "sin analizar" card. Cleared unconditionally
  // and first, so an id for a game that never loads can't wedge the tab.
  useEffect(() => {
    if (!pendingAnnotationGameId) return;
    const game = games.find(g => g.id === pendingAnnotationGameId);
    setPendingAnnotationGameId(null);
    if (game) startAnnotation(game);
  }, [pendingAnnotationGameId, games, setPendingAnnotationGameId, startAnnotation]);

  const openBlankAnnotation = () => {
    autoFilled.current = null;
    setEditingAnnotation(null);
    setSelectedGame({});
  };

  const editAnnotation = (annotation: AnnotatedGame) => {
    autoFilled.current = null;
    setSelectedGame(annotation);
    setEditingAnnotation(annotation);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const closeForm = () => {
    autoFilled.current = null;
    setSelectedGame(null);
    setEditingAnnotation(null);
  };

  const linkGame = (gameId: string) => {
    const game = gameId ? games.find(g => g.id === gameId) : undefined;
    setSelectedGame(prev => {
      const base = { ...(prev ?? {}), gameId: gameId || undefined };
      if (!game) {
        autoFilled.current = null;
        return base;
      }
      const draft = gameToAnnotationDraft(game);
      const merged = mergeAnnotationDraft(base, draft, autoFilled.current);
      autoFilled.current = draft;
      return merged;
    });
  };

  const saveAnnotation = async (annotation: Partial<AnnotatedGame>) => {
    if (editingAnnotation) {
      const saved = await putAnnotation(editingAnnotation.id, annotation);
      setAnnotatedGames(prev => prev.map(a => (a.id === saved.id ? saved : a)));
    } else {
      const saved = await postAnnotation(annotation);
      setAnnotatedGames(prev => [...prev, saved]);
    }
    closeForm();
  };

  const deleteAnnotation = async (id: string) => {
    const confirmed = await modal.confirm('¿Borrar este análisis?');
    if (confirmed) {
      await deleteAnnotationApi(id);
      setAnnotatedGames(prev => prev.filter(a => a.id !== id));
    }
  };

  const filteredAnnotations = useMemo(() => {
    let filtered = annotatedGames;

    if (filterTag !== 'all') {
      filtered = filtered.filter(a => a.tags?.includes(filterTag));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.gameName?.toLowerCase().includes(q) ||
          a.notes?.toLowerCase().includes(q) ||
          a.lesson?.toLowerCase().includes(q) ||
          a.keyMoments?.some(m => m.comment?.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  }, [annotatedGames, filterTag, searchQuery]);

  const tagCounts = useMemo(
    () =>
      new Map(TAGS.map(tag => [tag.id, annotatedGames.filter(a => a.tags?.includes(tag.id)).length])),
    [annotatedGames]
  );

  const avgRating =
    annotatedGames.length > 0
      ? Math.round(
          (annotatedGames.reduce((sum, a) => sum + (a.rating || 0), 0) / annotatedGames.length) * 10
        ) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg">
        <div className="relative px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-surface-2 rounded-lg">
                <DocumentTextIcon className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-fg">Game Library</h2>
                <p className="text-fg-muted">Tus partidas analizadas, con el tablero al lado</p>
              </div>
            </div>

            <Button variant="primary" icon={PlusIcon} onClick={openBlankAnnotation} className="shrink-0">
              Análisis en blanco
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <DocumentTextIcon className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-fg-muted">Partidas analizadas</p>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums">{annotatedGames.length}</p>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon
                  className={`w-5 h-5 ${pending.length > 0 ? 'text-loss' : 'text-win'}`}
                />
                <p className="text-sm font-medium text-fg-muted">Sin analizar</p>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${pending.length > 0 ? 'text-loss' : 'text-win'}`}
              >
                {pending.length}
              </p>
            </div>

            <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
              <div className="flex items-center gap-2 mb-2">
                <StarIcon className="w-5 h-5 text-accent" />
                <p className="text-sm font-medium text-fg-muted">Valoración media</p>
              </div>
              <p className="text-2xl font-bold text-fg tabular-nums">{avgRating} ★</p>
            </div>
          </div>
        </div>
      </div>

      <UnanalyzedQueue games={pending} onAnalyze={startAnnotation} />

      <div ref={formRef}>
        {selectedGame !== null && (
          <AnnotationForm
            draft={selectedGame}
            onChange={setSelectedGame}
            linkableGames={linkableGames}
            linkedGame={linkedGame}
            isEditing={!!editingAnnotation}
            onLinkGame={linkGame}
            onSave={() => saveAnnotation(selectedGame)}
            onCancel={closeForm}
          />
        )}
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              aria-label="Buscar análisis"
              placeholder="Buscar en los análisis..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-fg-muted" />
            <select
              aria-label="Filtrar por etiqueta"
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="px-4 py-2.5 bg-surface border border-hairline rounded-lg font-semibold text-fg focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="all">Todas las etiquetas</option>
              {TAGS.map(tag => (
                <option key={tag.id} value={tag.id}>
                  {tag.icon} {tag.label} ({tagCounts.get(tag.id) ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Saved annotations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredAnnotations.length > 0 ? (
          filteredAnnotations.map(annotation => (
            <AnnotationCard
              key={annotation.id}
              annotation={annotation}
              onEdit={editAnnotation}
              onDelete={deleteAnnotation}
            />
          ))
        ) : (
          <div className="col-span-full bg-surface rounded-lg border border-hairline p-12 text-center">
            <div className="p-4 bg-surface-2 rounded-full inline-block mb-4">
              <DocumentTextIcon className="w-12 h-12 text-fg-subtle" />
            </div>
            <h3 className="text-base font-semibold text-fg mb-2">Todavía no hay análisis</h3>
            <p className="text-fg-muted max-w-xl mx-auto">
              Jueves: jugás la 15+10. Después venís acá, la partida aparece arriba en «sin
              analizar», tocás <strong className="text-fg">Analizar</strong> y el tablero se abre
              con la partida cargada. Recorrés la partida y en cada punto donde giró tocás{' '}
              <strong className="text-fg">«Agregar momento»</strong>: se van apilando en una lista,
              cada uno con su comentario. Al final marcás con ★ el que la decidió y escribís la
              lección.
            </p>
            {pending.length > 0 && (
              <Button
                variant="primary"
                onClick={() => startAnnotation(pending[0])}
                className="mt-4"
              >
                Empezar con {gameLabel(pending[0])}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameAnnotationTab;
