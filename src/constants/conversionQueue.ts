import conversionFile from './conversionQueue.json';
import guideFile from './guideDrills.json';
import classFile from './classDrills.json';

/**
 * Cola estática de conversión (partidas propias donde se escapó una ventaja),
 * ejercicios de las guías y finales de las clases. Los tres JSON los genera `scripts/build-conversion-queue.mjs`
 * a partir de los exports de Segundo; acá solo se tipan y se unen.
 *
 * Los JSON viajan en el bundle del cliente, que se descarga sin login, así que
 * solo llevan lo mínimo (ver `ALLOWED_KEYS` del script). Este módulo se importa
 * solo desde chunks lazy: `scripts/assert-conversion-privacy.mjs` revisa el build.
 */

export type ConversionKind = 'conversion' | 'guide' | 'class';
export type ConversionSource = 'lichess' | 'chesscom' | 'otb' | 'libro' | 'guia' | 'clase';

/** Un ítem tal como sale del JSON. */
export interface ConversionItemData {
  id: string;
  fen: string;
  /** El lado que mueve en el FEN. */
  color: 'white' | 'black';
  /** 0 a 5 jugadas UCI válidas; vacío cuando manda `plan`. */
  acceptedUci: string[];
  plan?: string;
  /** Centipeones desde el lado que mueve; ±100000 es mate. */
  evalBefore?: number;
  evalAfter?: number;
  ply?: number;
  notes?: string;
  /** `games.id` (uuid opaco) o null. */
  gameId: string | null;
  source: ConversionSource;
  /** `YYYY-MM`. */
  date?: string | null;
  /** Solo en clases: la posición acepta varias jugadas y conviene consultarla. */
  needsReview?: boolean;
}

export interface ConversionItem extends ConversionItemData {
  kind: ConversionKind;
}

interface ConversionFile {
  version: string;
  count: number;
  items: ConversionItemData[];
}

const withKind = (file: ConversionFile, kind: ConversionKind): ConversionItem[] =>
  file.items.map(item => ({ ...item, kind }));

export const CONVERSION_ITEMS: ConversionItem[] = withKind(conversionFile as ConversionFile, 'conversion');
export const GUIDE_ITEMS: ConversionItem[] = withKind(guideFile as ConversionFile, 'guide');
export const CLASS_ITEMS: ConversionItem[] = withKind(classFile as ConversionFile, 'class');
/** Las tres fuentes juntas: 90 + 35 + 29 = 154. */
export const ALL_CONVERSION_ITEMS: ConversionItem[] = [...CONVERSION_ITEMS, ...GUIDE_ITEMS, ...CLASS_ITEMS];
