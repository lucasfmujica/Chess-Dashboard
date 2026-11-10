import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
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
  StatCard,
  ClockBar,
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
import { SOURCE_TYPES, sourceOptions } from './conceptSources';

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
  { value: 'archivado', label: 'Archivado' },
];

const BOOK_STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'referencia', label: 'Referencia' },
  { value: 'archivado', label: 'Archivado' },
];

const INPUT_CLASS =
  'w-full px-3 py-2 bg-surface border border-hairline text-fg placeholder-fg-subtle rounded focus:border-accent focus:ring-1 focus:ring-accent text-sm';

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
      <p className="text-sm text-fg-muted">
        Un concepto que no está ligado a una partida tuya no lo aprendiste, lo leíste.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl options={VIEWS} value={view} onChange={setView} aria-label="Conceptos o libros" />
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
          <ClockBar>
            <StatCard title="Conceptos" value={concepts.length} subtitle="cargados" />
            <StatCard
              title="Con partida propia"
              value={`${appliedCount} / ${concepts.length}`}
              subtitle="aprendidos, no solo leídos"
            />
            <StatCard title="Libros" value={books.length} subtitle={`${activeBooks.length} activos`} />
          </ClockBar>

          {draft && (
            <Card>
              <h3 className="mb-4 font-serif text-xl font-semibold text-fg">
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
                      {sourceOptions(draft.sourceType).map(s => (
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

          <SegmentedControl
            size="sm"
            aria-label="Filtrar por categoría"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'all', label: 'Todas' },
              ...CATEGORIES.map(c => ({ value: c.value, label: c.label })),
            ]}
          />

          {visibleConcepts.length === 0 ? (
            <Card>
              <p className="text-sm text-fg-muted">
                Todavía no hay conceptos cargados. Empezá por lo último que viste con el profe o
                Juan Cruz y vinculalo a la partida donde apareció.
              </p>
            </Card>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Concepto</TH>
                  <TH>Categoría</TH>
                  <TH>Fuente</TH>
                  <TH>Partida propia</TH>
                  <TH>Confianza</TH>
                  <TH align="right">
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {visibleConcepts.map(concept => {
                  const unlearned = concept.gameIds.length === 0;
                  const book = books.find(b => b.id === concept.bookId);
                  const confidence = concept.confidence ?? 0;
                  return (
                    <TR key={concept.id} className="align-top">
                      <TD className="min-w-[220px]">
                        <p className="font-serif text-[15px] font-semibold leading-snug text-fg">{concept.name}</p>
                        {concept.summary && (
                          <p className="mt-1 max-w-prose font-serif text-sm leading-snug text-fg-muted">
                            {concept.summary}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-fg-subtle">
                          {STATUSES.find(st => st.value === concept.status)?.label ?? concept.status}
                        </p>
                      </TD>
                      <TD>
                        <Badge>
                          {CATEGORIES.find(c => c.value === concept.category)?.label ??
                            concept.category}
                        </Badge>
                      </TD>
                      <TD muted className="min-w-[140px]">
                        {book || concept.sourceChapter ? (
                          <>
                            {book?.title}
                            {book && concept.sourceChapter ? ' · ' : ''}
                            {concept.sourceChapter}
                          </>
                        ) : (
                          SOURCE_TYPES.find(st => st.value === concept.sourceType)?.label ??
                          (concept.sourceType?.startsWith('lesson-') ? 'Clase' : '—')
                        )}
                      </TD>
                      <TD className="whitespace-nowrap">
                        {unlearned ? (
                          <span className="text-xs text-fg-subtle" title="Sin partida propia vinculada">
                            Leído, no aprendido
                          </span>
                        ) : (
                          <Badge tone="accent">
                            <span className="font-mono tabular-nums">{concept.gameIds.length}</span>
                            {concept.gameIds.length > 1 ? ' partidas' : ' partida'}
                          </Badge>
                        )}
                      </TD>
                      <TD>
                        <span
                          className="inline-flex gap-[3px] pt-1"
                          role="img"
                          aria-label={concept.confidence ? `Confianza ${confidence} de 5` : 'Sin confianza cargada'}
                        >
                          {[1, 2, 3, 4, 5].map(n => (
                            <i
                              key={n}
                              className={`h-2 w-2 rounded-[1px] border ${
                                n <= confidence ? 'border-fg bg-fg' : 'border-fg-subtle'
                              }`}
                            />
                          ))}
                        </span>
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        <button
                          onClick={() => {
                            setDraft(concept);
                            setEditingId(concept.id);
                          }}
                          className="rounded p-1.5 text-accent hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                          aria-label={`Editar ${concept.name}`}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void removeConcept(concept)}
                          className="rounded p-1.5 text-loss hover:bg-carbon-pink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                          aria-label={`Borrar ${concept.name}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </>
      ) : (
        <>
          <Card>
            <h3 className="font-serif text-xl font-semibold text-fg">Importar tu biblioteca</h3>
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
              <div className="mt-3 rounded border border-hairline bg-surface-2 p-3">
                <div className="text-label">
                  Vista previa · {bulkPreview.length} libro
                  {bulkPreview.length > 1 ? 's' : ''}
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {bulkPreview.slice(0, 8).map((b, i) => (
                    <div key={i} className="text-xs text-fg-muted">
                      <span className="font-serif text-sm text-fg">{b.title}</span>
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
                <h3 className="font-serif text-xl font-semibold text-fg">Libros activos</h3>
                <p className="text-sm text-fg-muted mt-1">
                  Nada nuevo hasta que algo llegue al 100%. El tope es por fuente: 2 de
                  Chessable y 1 curso de video. Los PDF de partidas no cuentan.
                </p>
              </div>
              <div className="flex gap-5">
                {activeBySource.map(({ source, limit, books: sourceBooks }) => (
                  <div key={source} className="text-right">
                    <div
                      className={`font-mono text-2xl tabular-nums ${
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
              <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
                {activeBooks.map(book => {
                  const pct = bookProgressPct(book);
                  return (
                    <li key={book.id} className="py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-serif text-base font-semibold leading-snug text-fg">{book.title}</span>
                          {(book.author || book.block) && (
                            <span className="text-xs text-fg-subtle">
                              {[book.author, book.progressTotal ? book.block : undefined].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-mono text-[13px] tabular-nums text-fg-muted">
                          {book.progressTotal
                            ? `${book.progressDone ?? 0}/${book.progressTotal} · ${pct}%`
                            : book.block ?? ''}
                        </span>
                      </div>
                      {pct !== undefined && (
                        <div className="mt-2 h-1.5 rounded-[1px] bg-surface-2 overflow-hidden">
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
                          <TD className="font-serif">{book.title}</TD>
                          <TD muted>{book.author ?? '—'}</TD>
                          <TD muted>{book.source ?? '—'}</TD>
                          <TD>
                            <select
                              aria-label={`Estado de ${book.title}`}
                              className="rounded border border-hairline bg-transparent px-2 py-1 text-sm text-fg focus:border-accent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
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
                          <TD align="right" muted className="whitespace-nowrap font-mono">
                            {book.progressTotal
                              ? `${book.progressDone ?? 0}/${book.progressTotal} · ${pct}%`
                              : '—'}
                          </TD>
                          <TD muted>{book.block ?? book.notes ?? '—'}</TD>
                          <TD align="right" className="font-mono">
                            {concepts.filter(c => c.bookId === book.id).length}
                          </TD>
                          <TD align="right">
                            <button
                              onClick={() => void removeBook(book)}
                              className="rounded p-1.5 text-loss hover:bg-carbon-pink/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                              aria-label={`Borrar ${book.title}`}
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
