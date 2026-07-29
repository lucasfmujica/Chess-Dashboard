import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import {
  fetchConcepts,
  postConcept,
  putConcept,
  deleteConcept as deleteConceptApi,
  fetchBooks,
  postBooks,
  putBook,
  deleteBook as deleteBookApi,
} from '../../../api/client';
import { useGames } from '../../../context/GamesContext';
import { useModal } from '../../modals/ModalContext';
import {
  Card,
  Button,
  Badge,
  SegmentedControl,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  PageHeader,
  type Segment,
} from '../../ui';
import {
  ACTIVE_LIMITS,
  CAPPED_SOURCES,
  activeLimitBreach,
  bookProgressPct,
} from '../../../types/training';
import { parseLibrary } from '../../../utils/libraryImport';
import type {
  Concept,
  ConceptCategory,
  ConceptStatus,
  Book,
  BookStatus,
} from '../../../types/training';

/**
 * The study inventory: what has been read, and what of it has actually shown
 * up in the player's own games.
 *
 * The central rule is the "leído, no aprendido" marker. A concept with no
 * linked game is displayed as unlearned no matter its status, because the
 * difference between having read about a motif and being able to use it is
 * precisely whether it can be pointed to in a real game.
 */

type View = 'concepts' | 'books';

const VIEWS: Segment<View>[] = [
  { value: 'concepts', label: 'Conceptos' },
  { value: 'books', label: 'Libros' },
];

const CATEGORIES: { value: ConceptCategory; label: string }[] = [
  { value: 'opening', label: 'Apertura' },
  { value: 'middlegame', label: 'Medio juego' },
  { value: 'endgame', label: 'Finales' },
  { value: 'calculation', label: 'Cálculo' },
  { value: 'strategy', label: 'Estrategia' },
  { value: 'mindset', label: 'Mentalidad' },
];

const STATUSES: { value: ConceptStatus; label: string }[] = [
  { value: 'to-study', label: 'Por estudiar' },
  { value: 'studying', label: 'Estudiando' },
  { value: 'applied', label: 'Aplicado' },
  { value: 'mastered', label: 'Dominado' },
];

const SOURCE_TYPES = [
  { value: 'book', label: 'Libro' },
  { value: 'studer', label: 'Curso Studer' },
  { value: 'lesson-toto', label: 'Clase Toto' },
  { value: 'lesson-juancruz', label: 'Clase Juan Cruz' },
  { value: 'video', label: 'Video' },
];

const BOOK_STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'referencia', label: 'Referencia' },
  { value: 'archivado', label: 'Archivado' },
];

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded-lg focus:border-accent focus:ring-1 focus:ring-accent text-sm';

const emptyConcept = (): Partial<Concept> => ({
  name: '',
  category: 'middlegame',
  status: 'to-study',
  exampleFens: [],
  gameIds: [],
});

const ConceptsTab = () => {
  const { games } = useGames();
  const modal = useModal();
  const [view, setView] = useState<View>('concepts');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<Concept> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ConceptCategory>('all');

  const [bulkBooks, setBulkBooks] = useState('');
  const [savingBooks, setSavingBooks] = useState(false);

  const reload = useCallback(async () => {
    const [c, b] = await Promise.all([fetchConcepts(), fetchBooks()]);
    setConcepts(c);
    setBooks(b);
  }, []);

  useEffect(() => {
    reload().catch(err =>
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario')
    );
  }, [reload]);

  /** Newest games first, capped — a full 460-row select is unusable. */
  const linkableGames = useMemo(
    () =>
      [...games]
        .filter(g => g.id && g.date)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        .slice(0, 80),
    [games]
  );

  const visibleConcepts = useMemo(
    () =>
      categoryFilter === 'all'
        ? concepts
        : concepts.filter(c => c.category === categoryFilter),
    [concepts, categoryFilter]
  );

  const appliedCount = concepts.filter(c => c.gameIds.length > 0).length;

  const saveConcept = useCallback(async () => {
    if (!draft?.name?.trim()) return;
    try {
      if (editingId) await putConcept(editingId, draft);
      else await postConcept(draft);
      setDraft(null);
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el concepto');
    }
  }, [draft, editingId, reload]);

  const removeConcept = useCallback(
    async (concept: Concept) => {
      const ok = await modal.confirm(`¿Borrar "${concept.name}"?`, 'Borrar concepto');
      if (!ok) return;
      await deleteConceptApi(concept.id);
      await reload();
    },
    [modal, reload]
  );

  /** Live preview of the paste, so a format mistake is visible before writing. */
  const bulkPreview = useMemo(() => parseLibrary(bulkBooks), [bulkBooks]);

  /**
   * Bulk import so an entire library can be pasted in once.
   * Format: `Título | Autor | Fuente | Estado | Bloque o nota`.
   */
  const importBooks = useCallback(async () => {
    if (bulkPreview.length === 0) return;
    setSavingBooks(true);
    try {
      await postBooks(bulkPreview);
      setBulkBooks('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron importar los libros');
    } finally {
      setSavingBooks(false);
    }
  }, [bulkPreview, reload]);

  const activeBooks = useMemo(() => books.filter(b => b.status === 'activo'), [books]);

  /**
   * Enforce the cap that the whole plan rests on. This is a UI guard, not a
   * database constraint — a cross-row check would need a trigger, and the
   * value here is the visible refusal at the moment of the decision, which is
   * where the rule actually gets broken.
   */
  const changeBookStatus = useCallback(
    async (book: Book, status: BookStatus) => {
      if (status === 'activo' && book.status !== 'activo') {
        const breach = activeLimitBreach(book, books);
        if (breach) {
          await modal.alert(
            `Ya tenés ${breach.limit} ${breach.source} activo${breach.limit === 1 ? '' : 's'}: ` +
              `${breach.current.map(b => b.title).join(', ')}.\n\n` +
              `Nada nuevo hasta que algo llegue al 100%. Cerrá o archivá uno antes de activar "${book.title}".`,
            'Máximo de activos alcanzado'
          );
          return;
        }
      }
      await putBook(book.id, { status });
      await reload();
    },
    [books, modal, reload]
  );

  /** Per-source active counts, for the cap display. */
  const activeBySource = useMemo(
    () =>
      CAPPED_SOURCES.map(source => ({
        source,
        limit: ACTIVE_LIMITS[source],
        books: activeBooks.filter(b => (b.source ?? '').toLowerCase() === source),
      })),
    [activeBooks]
  );

  const removeBook = useCallback(
    async (book: Book) => {
      const ok = await modal.confirm(`¿Borrar "${book.title}"?`, 'Borrar libro');
      if (!ok) return;
      await deleteBookApi(book.id);
      await reload();
    },
    [modal, reload]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concepts & Books"
        subtitle="Un concepto que no está ligado a una partida tuya no lo aprendiste, lo leíste."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} />
        {view === 'concepts' && (
          <Button
            icon={PlusIcon}
            onClick={() => {
              setDraft(emptyConcept());
              setEditingId(null);
            }}
          >
            Nuevo concepto
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <p className="text-sm text-loss">{error}</p>
        </Card>
      )}

      {view === 'concepts' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <div className="text-label">Conceptos</div>
              <div className="text-h2 text-fg nums mt-1">{concepts.length}</div>
            </Card>
            <Card>
              <div className="text-label">Con partida propia</div>
              <div className="text-h2 text-fg nums mt-1">
                {appliedCount}
                <span className="text-fg-subtle text-base"> / {concepts.length}</span>
              </div>
            </Card>
            <Card>
              <div className="text-label">Libros</div>
              <div className="text-h2 text-fg nums mt-1">{books.length}</div>
            </Card>
          </div>

          {draft && (
            <Card>
              <h3 className="text-h3 text-fg mb-4">
                {editingId ? 'Editar concepto' : 'Nuevo concepto'}
              </h3>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-label block mb-1">Nombre</label>
                    <input
                      className={INPUT_CLASS}
                      placeholder="Ej: dominación de columnas"
                      value={draft.name ?? ''}
                      onChange={e => setDraft({ ...draft, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-label block mb-1">Categoría</label>
                    <select
                      className={INPUT_CLASS}
                      value={draft.category ?? 'middlegame'}
                      onChange={e =>
                        setDraft({ ...draft, category: e.target.value as ConceptCategory })
                      }
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-label block mb-1">Fuente</label>
                    <select
                      className={INPUT_CLASS}
                      value={draft.sourceType ?? ''}
                      onChange={e =>
                        setDraft({ ...draft, sourceType: e.target.value || undefined })
                      }
                    >
                      <option value="">Sin fuente</option>
                      {SOURCE_TYPES.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label block mb-1">Libro</label>
                    <select
                      className={INPUT_CLASS}
                      value={draft.bookId ?? ''}
                      onChange={e => setDraft({ ...draft, bookId: e.target.value || undefined })}
                    >
                      <option value="">Ninguno</option>
                      {books.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label block mb-1">Capítulo</label>
                    <input
                      className={INPUT_CLASS}
                      placeholder="Ej: cap. 3"
                      value={draft.sourceChapter ?? ''}
                      onChange={e => setDraft({ ...draft, sourceChapter: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-label block mb-1">Resumen</label>
                  <textarea
                    className={INPUT_CLASS}
                    rows={3}
                    placeholder="En tus palabras, no las del libro."
                    value={draft.summary ?? ''}
                    onChange={e => setDraft({ ...draft, summary: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-label block mb-1">
                    FENs de ejemplo (uno por línea)
                  </label>
                  <textarea
                    className={`${INPUT_CLASS} font-mono`}
                    rows={2}
                    value={(draft.exampleFens ?? []).join('\n')}
                    onChange={e =>
                      setDraft({
                        ...draft,
                        exampleFens: e.target.value.split('\n').map(f => f.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-label block mb-1">
                    Partidas tuyas donde apareció
                  </label>
                  <select
                    className={`${INPUT_CLASS} h-32`}
                    multiple
                    value={draft.gameIds ?? []}
                    onChange={e =>
                      setDraft({
                        ...draft,
                        gameIds: [...e.target.selectedOptions].map(o => o.value),
                      })
                    }
                  >
                    {linkableGames.map(g => (
                      <option key={g.id} value={g.id}>
                        vs {g.opp} · {g.date}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-fg-subtle mt-1">
                    Sin al menos una, el concepto queda marcado como leído y no aprendido.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-label block mb-1">Estado</label>
                    <select
                      className={INPUT_CLASS}
                      value={draft.status ?? 'to-study'}
                      onChange={e =>
                        setDraft({ ...draft, status: e.target.value as ConceptStatus })
                      }
                    >
                      {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-label block mb-1">Confianza (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className={INPUT_CLASS}
                      value={draft.confidence ?? ''}
                      onChange={e =>
                        setDraft({
                          ...draft,
                          confidence: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => void saveConcept()} disabled={!draft.name?.trim()}>
                    {editingId ? 'Guardar cambios' : 'Crear concepto'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDraft(null);
                      setEditingId(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                categoryFilter === 'all'
                  ? 'bg-surface-2 text-fg'
                  : 'text-fg-muted hover:bg-surface-2'
              }`}
            >
              Todas
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  categoryFilter === c.value
                    ? 'bg-surface-2 text-fg'
                    : 'text-fg-muted hover:bg-surface-2'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {visibleConcepts.length === 0 ? (
            <Card>
              <p className="text-sm text-fg-muted">
                Todavía no hay conceptos cargados. Empezá por lo último que viste con Toto o
                Juan Cruz y vinculalo a la partida donde apareció.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleConcepts.map(concept => {
                const unlearned = concept.gameIds.length === 0;
                const book = books.find(b => b.id === concept.bookId);
                return (
                  <Card key={concept.id}>
                    <div className={unlearned ? 'opacity-60' : ''}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-h3 text-fg">{concept.name}</h3>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setDraft(concept);
                              setEditingId(concept.id);
                            }}
                            className="p-1.5 text-accent hover:bg-surface-2 rounded-lg"
                            aria-label="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void removeConcept(concept)}
                            className="p-1.5 text-loss hover:bg-loss/10 rounded-lg"
                            aria-label="Borrar"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge>
                          {CATEGORIES.find(c => c.value === concept.category)?.label ??
                            concept.category}
                        </Badge>
                        <Badge tone={concept.status === 'mastered' ? 'win' : 'neutral'}>
                          {STATUSES.find(s => s.value === concept.status)?.label ??
                            concept.status}
                        </Badge>
                      </div>

                      {concept.summary && (
                        <p className="text-sm text-fg-muted mt-3">{concept.summary}</p>
                      )}

                      {(book || concept.sourceChapter) && (
                        <p className="text-xs text-fg-subtle mt-2">
                          {book?.title}
                          {book && concept.sourceChapter ? ' · ' : ''}
                          {concept.sourceChapter}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 border-t border-hairline pt-2">
                      {unlearned ? (
                        <span className="text-xs text-loss">
                          Leído, no aprendido — sin partida propia vinculada
                        </span>
                      ) : (
                        <span className="text-xs text-win nums">
                          {concept.gameIds.length} partida
                          {concept.gameIds.length > 1 ? 's' : ''} propias
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <Card>
            <h3 className="text-h3 text-fg flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-accent" />
              Importar tu biblioteca
            </h3>
            <p className="text-sm text-fg-muted mt-1">
              Una línea por libro:{' '}
              <span className="font-mono text-xs">
                Título | Autor | Fuente | Estado | Bloque o nota
              </span>
              . Sólo el título es obligatorio. Estado desconocido entra como{' '}
              <em>archivado</em>, nunca como activo.
            </p>
            <textarea
              className={`${INPUT_CLASS} mt-3 font-mono text-xs`}
              rows={8}
              placeholder={
                'How to Reassess Your Chess | Jeremy Silman | chessable | activo | viernes-conceptos · 215/516\n' +
                'Práctica de los finales de torre | Viktor Korchnói | pdf | referencia | consultar por posición'
              }
              value={bulkBooks}
              onChange={e => setBulkBooks(e.target.value)}
            />

            {bulkPreview.length > 0 && (
              <div className="mt-3 rounded-lg border border-hairline bg-surface-2 p-3">
                <div className="text-label">
                  Vista previa · {bulkPreview.length} libro
                  {bulkPreview.length > 1 ? 's' : ''}
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {bulkPreview.slice(0, 8).map((b, i) => (
                    <div key={i} className="text-xs text-fg-muted">
                      <span className="text-fg">{b.title}</span>
                      {b.author ? ` · ${b.author}` : ''} ·{' '}
                      <span
                        className={b.status === 'activo' ? 'text-accent' : ''}
                      >
                        {b.status}
                      </span>
                      {b.progressTotal ? ` · ${b.progressDone}/${b.progressTotal}` : ''}
                    </div>
                  ))}
                  {bulkPreview.length > 8 && (
                    <div className="text-xs text-fg-subtle">
                      …y {bulkPreview.length - 8} más
                    </div>
                  )}
                </div>
                {bulkPreview.filter(b => b.status === 'activo').length > 0 && (
                  <p className="text-xs text-fg-muted mt-2">
                    {bulkPreview.filter(b => b.status === 'activo').length} entran como activos.
                    El tope por fuente se revisa después en la tabla, no bloquea la importación.
                  </p>
                )}
              </div>
            )}

            <Button
              className="mt-3"
              onClick={() => void importBooks()}
              disabled={bulkPreview.length === 0 || savingBooks}
            >
              {savingBooks ? 'Importando…' : `Importar ${bulkPreview.length || ''}`.trim()}
            </Button>
          </Card>

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-label">Libros activos</div>
                <p className="text-sm text-fg-muted mt-1">
                  Nada nuevo hasta que algo llegue al 100%. El tope es por fuente: 2 de
                  Chessable y 1 curso de video. Los PDF de partidas no cuentan.
                </p>
              </div>
              <div className="flex gap-5">
                {activeBySource.map(({ source, limit, books: sourceBooks }) => (
                  <div key={source} className="text-right">
                    <div
                      className={`text-h2 nums ${
                        sourceBooks.length > limit ? 'text-loss' : 'text-fg'
                      }`}
                    >
                      {sourceBooks.length}
                      <span className="text-fg-subtle text-base"> / {limit}</span>
                    </div>
                    <div className="text-xs text-fg-muted">{source}</div>
                  </div>
                ))}
              </div>
            </div>
            {activeBooks.length > 0 && (
              <ul className="mt-4 space-y-3 border-t border-hairline pt-4">
                {activeBooks.map(book => {
                  const pct = bookProgressPct(book);
                  return (
                    <li key={book.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-fg">{book.title}</span>
                        <span className="text-fg-muted nums shrink-0">
                          {book.progressTotal
                            ? `${book.progressDone ?? 0}/${book.progressTotal} · ${pct}%`
                            : book.block ?? ''}
                        </span>
                      </div>
                      {pct !== undefined && (
                        <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {books.length > 0 && (
            <Card flush>
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>Título</TH>
                      <TH>Autor</TH>
                      <TH>Fuente</TH>
                      <TH>Estado</TH>
                      <TH align="right">Progreso</TH>
                      <TH>Bloque / nota</TH>
                      <TH align="right">Conceptos</TH>
                      <TH align="right"> </TH>
                    </TR>
                  </THead>
                  <TBody>
                    {books.map(book => {
                      const pct = bookProgressPct(book);
                      return (
                        <TR key={book.id}>
                          <TD>{book.title}</TD>
                          <TD muted>{book.author ?? '—'}</TD>
                          <TD muted>{book.source ?? '—'}</TD>
                          <TD>
                            <select
                              className="bg-transparent text-sm text-fg border border-hairline rounded px-2 py-1"
                              value={book.status}
                              onChange={e =>
                                void changeBookStatus(book, e.target.value as BookStatus)
                              }
                            >
                              {BOOK_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </TD>
                          <TD align="right" muted>
                            {book.progressTotal
                              ? `${book.progressDone ?? 0}/${book.progressTotal} · ${pct}%`
                              : '—'}
                          </TD>
                          <TD muted>{book.block ?? book.notes ?? '—'}</TD>
                          <TD align="right">
                            {concepts.filter(c => c.bookId === book.id).length}
                          </TD>
                          <TD align="right">
                            <button
                              onClick={() => void removeBook(book)}
                              className="p-1.5 text-loss hover:bg-loss/10 rounded-lg"
                              aria-label="Borrar libro"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ConceptsTab;
