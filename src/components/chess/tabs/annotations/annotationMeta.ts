import type { AnnotationErrorType } from '../../../../types/chess';

/** Badge tones available in the design system. */
type Tone = 'neutral' | 'accent' | 'win' | 'draw' | 'loss';

/**
 * The closed set of post-mortem error types. Deliberately short: a list long
 * enough to describe every game precisely is a list whose counts mean nothing.
 * Mirrors the DB CHECK constraint on `annotated_games.error_type`.
 */
export const ERROR_TYPE_OPTIONS: { value: AnnotationErrorType; label: string }[] = [
  { value: 'candidate-miss', label: 'Pérdida de candidato — no se me ocurrió' },
  { value: 'calculation', label: 'Cálculo — la vi y la calculé mal' },
  { value: 'evaluation', label: 'Evaluación — juzgué mal la posición' },
  { value: 'clock', label: 'Reloj — apuro de tiempo' },
  { value: 'opening', label: 'Apertura — salí mal del libro' },
  { value: 'technique', label: 'Técnica — no convertí' },
  { value: 'none', label: 'Sin error claro' },
];

export interface AnnotationTag {
  id: string;
  label: string;
  icon: string;
  tone: Tone;
}

/**
 * Free-form labels for browsing the library later.
 *
 * The tone comes from the `Badge` palette rather than a color name: these used
 * to build classes by interpolation (`bg-${color}-100`), which Tailwind never
 * emitted, so the pills had been rendering unstyled.
 */
export const TAGS: AnnotationTag[] = [
  { id: 'brilliant-attack', label: 'Ataque', icon: '⚔️', tone: 'win' },
  { id: 'endgame-technique', label: 'Técnica de final', icon: '♔', tone: 'accent' },
  { id: 'tactical-shot', label: 'Golpe táctico', icon: '⚡', tone: 'accent' },
  { id: 'positional-masterclass', label: 'Posicional', icon: '🎯', tone: 'accent' },
  { id: 'opening-trap', label: 'Trampa de apertura', icon: '🎪', tone: 'draw' },
  { id: 'blunder', label: 'Blunder para estudiar', icon: '❌', tone: 'loss' },
  { id: 'sacrifice', label: 'Sacrificio', icon: '💎', tone: 'win' },
  { id: 'defensive-resource', label: 'Recurso defensivo', icon: '🛡️', tone: 'neutral' },
];

export interface NotationSymbol {
  symbol: string;
  label: string;
}

/** Move-suffix glyphs offered on key moments. */
export const NOTATION_SYMBOLS: NotationSymbol[] = [
  { symbol: '!', label: 'Buena jugada' },
  { symbol: '!!', label: 'Brillante' },
  { symbol: '?', label: 'Error' },
  { symbol: '??', label: 'Blunder' },
  { symbol: '!?', label: 'Interesante' },
  { symbol: '?!', label: 'Dudosa' },
  { symbol: '±', label: 'Mejor las blancas' },
  { symbol: '∓', label: 'Mejor las negras' },
  { symbol: '=', label: 'Igualdad' },
];

export const errorTypeLabel = (value: AnnotationErrorType): string =>
  ERROR_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
