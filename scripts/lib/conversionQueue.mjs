// Lógica pura de scripts/build-conversion-queue.mjs: filtra, valida y (opcional)
// enriquece los ítems de la cola de conversión y de las guías. Separada del CLI
// para poder testearla con fixtures inventadas.
import { Chess } from 'chess.js';

/** Claves que pueden llegar al bundle del cliente (se descarga sin login). */
export const ALLOWED_KEYS = [
  'id',
  'fen',
  'color',
  'acceptedUci',
  'plan',
  'evalBefore',
  'evalAfter',
  'ply',
  'notes',
  'gameId',
  'source',
  'date',
];

export const SOURCES = ['lichess', 'chesscom', 'otb', 'libro', 'guia'];
export const CONVERSION_SOURCES = ['lichess', 'chesscom', 'otb'];

export const KINDS = {
  conversion: { prefix: 'conv', count: 90 },
  guide: { prefix: 'drill', count: 34 },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const MAX_ACCEPTED = 5;
const MAX_NOTES = 280;

/** Contenido que no puede aparecer en ningún string de un ítem. */
const FORBIDDEN_TEXT = [
  [/@/, '@'],
  [/http/i, 'http'],
  [/lichess\.org\//i, 'lichess.org/'],
  [/chess\.com\//i, 'chess.com/'],
  [/\d{4}-\d{2}-\d{2}/, 'fecha exacta'],
  [/lucas|mujica/i, 'nombre del jugador'],
];

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Solo las claves permitidas, en orden estable. Lo demás se descarta. */
export const pickAllowed = raw => {
  const out = {};
  for (const key of ALLOWED_KEYS) {
    if (raw[key] !== undefined) out[key] = raw[key];
  }
  return out;
};

const uciOf = move => `${move.from}${move.to}${move.promotion ?? ''}`;

/** Errores de un ítem ya filtrado. `kind`: 'conversion' | 'guide'. */
export const validateItem = (item, kind) => {
  const errors = [];
  const at = msg => errors.push(`${item.id ?? '(sin id)'}: ${msg}`);
  const { prefix } = KINDS[kind];

  if (typeof item.id !== 'string' || !new RegExp(`^${prefix}-\\d{3}$`).test(item.id)) {
    at(`id no matchea ${prefix}-NNN`);
  }

  // FEN, color y jugadas, contra chess.js.
  let chess = null;
  if (typeof item.fen !== 'string' || item.fen.trim().split(/\s+/).length !== 6) {
    at('fen debe tener 6 campos');
  } else {
    try {
      chess = new Chess(item.fen);
    } catch {
      at('fen ilegal');
    }
  }
  if (item.color !== 'white' && item.color !== 'black') {
    at('color debe ser white o black');
  } else if (chess && (chess.turn() === 'w' ? 'white' : 'black') !== item.color) {
    at('color no coincide con el turno del FEN');
  }
  if (chess) {
    if (chess.isGameOver()) at('la posición es mate o tablas');
    else if (chess.moves().length === 0) at('sin jugadas legales');
  }

  const accepted = item.acceptedUci;
  if (!Array.isArray(accepted)) {
    at('acceptedUci debe ser un array');
  } else {
    if (accepted.length > MAX_ACCEPTED) at(`acceptedUci tiene más de ${MAX_ACCEPTED} jugadas`);
    if (new Set(accepted).size !== accepted.length) at('acceptedUci repetido');
    const legal = chess ? new Set(chess.moves({ verbose: true }).map(uciOf)) : null;
    for (const uci of accepted) {
      if (typeof uci !== 'string' || !UCI.test(uci)) at(`acceptedUci con formato inválido: ${uci}`);
      else if (legal && !legal.has(uci)) at(`acceptedUci ilegal en el FEN: ${uci}`);
    }
  }
  const hasPlan = typeof item.plan === 'string' && item.plan.trim() !== '';
  if (item.plan !== undefined && typeof item.plan !== 'string') at('plan debe ser texto');
  if (!hasPlan && !(Array.isArray(accepted) && accepted.length >= 1)) {
    at('hace falta al menos una jugada aceptada o un plan');
  }

  // Fuente, partida y fecha.
  const sources = kind === 'conversion' ? CONVERSION_SOURCES : SOURCES;
  if (!sources.includes(item.source)) at(`source inválido para ${kind}: ${item.source}`);
  if (item.gameId !== null && !(typeof item.gameId === 'string' && UUID.test(item.gameId))) {
    at('gameId debe ser un uuid o null');
  }
  const bookLike = item.source === 'libro' || item.source === 'guia';
  if (bookLike && item.gameId !== null) at('gameId debe ser null en libro y guia');
  if (item.date === undefined || item.date === null) {
    if (!bookLike) at('date es obligatorio salvo en libro y guia');
  } else if (typeof item.date !== 'string' || !YEAR_MONTH.test(item.date)) {
    at('date debe ser YYYY-MM');
  }

  // Evaluaciones.
  if (kind === 'conversion') {
    if (!Number.isInteger(item.evalBefore) || item.evalBefore <= 0) {
      at('evalBefore es obligatorio y mayor que 0 en conversión');
    }
  } else if (item.evalBefore !== undefined && (!Number.isInteger(item.evalBefore) || item.evalBefore <= 0)) {
    at('evalBefore, si viene, es un entero mayor que 0');
  }
  if (item.evalAfter !== undefined && !Number.isInteger(item.evalAfter)) at('evalAfter debe ser entero');
  if (item.ply !== undefined && (!Number.isInteger(item.ply) || item.ply < 0)) at('ply debe ser un entero');

  if (item.notes !== undefined && (typeof item.notes !== 'string' || item.notes.length > MAX_NOTES)) {
    at(`notes debe ser texto de hasta ${MAX_NOTES} caracteres`);
  }

  // Privacidad: ningún string con datos personales o links.
  for (const [key, value] of Object.entries(item)) {
    const strings = Array.isArray(value) ? value : [value];
    for (const s of strings) {
      if (typeof s !== 'string') continue;
      for (const [re, label] of FORBIDDEN_TEXT) if (re.test(s)) at(`${key} contiene ${label}`);
    }
  }
  return errors;
};

const expectedIds = ({ prefix, count }) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(3, '0')}`);

/**
 * Valida un export `{version, count, items}`. Devuelve el archivo limpio
 * (solo claves permitidas) o lanza con todos los problemas juntos.
 * `expectedCount` se puede bajar en tests; el build usa 90 y 34.
 */
export const buildFile = (raw, kind, { expectedCount = KINDS[kind].count } = {}) => {
  const errors = [];
  if (!isPlainObject(raw) || !Array.isArray(raw.items)) {
    throw new Error(`${kind}: la raíz debe ser {version, count, items}`);
  }
  if (typeof raw.version !== 'string' || raw.version === '') errors.push(`${kind}: falta version`);
  if (raw.items.length !== expectedCount) {
    errors.push(`${kind}: se esperaban ${expectedCount} ítems y hay ${raw.items.length}`);
  }
  if (raw.count !== raw.items.length) errors.push(`${kind}: count (${raw.count}) no coincide con los ítems`);

  const items = raw.items.map(item => (isPlainObject(item) ? pickAllowed(item) : {}));
  for (const item of items) {
    if (item.gameId === undefined) item.gameId = null;
    errors.push(...validateItem(item, kind));
  }
  const ids = items.map(i => i.id);
  if (new Set(ids).size !== ids.length) errors.push(`${kind}: ids duplicados`);
  if (expectedCount === KINDS[kind].count) {
    const want = expectedIds(KINDS[kind]);
    const missing = want.filter(id => !ids.includes(id));
    if (missing.length) errors.push(`${kind}: faltan ids (${missing.slice(0, 5).join(', ')}…)`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  // `version` es la fecha del export (YYYY-MM-DD): en el bundle queda como
  // YYYY-MM, porque el assert de privacidad no deja pasar ninguna fecha exacta.
  const version = raw.version.replace(/^(\d{4}-\d{2})-\d{2}$/, '$1');
  return { version, count: items.length, items: items.map(pickAllowed) };
};

/** Falla si el mismo id aparece en los dos archivos. */
export const assertNoCrossDuplicates = (conversionItems, guideItems) => {
  const guideIds = new Set(guideItems.map(i => i.id));
  const dup = conversionItems.map(i => i.id).filter(id => guideIds.has(id));
  if (dup.length) throw new Error(`ids repetidos entre archivos: ${dup.join(', ')}`);
};

// --- Enriquecimiento de gameId desde un snapshot local de `games` -----------

/** Los primeros 4 campos del FEN: piezas, turno, enroque y al paso. */
export const fenKey = fen => fen.trim().split(/\s+/).slice(0, 4).join(' ');

/**
 * Reproduce cada PGN con chess.js y devuelve fenKey → [{gameId, ply}], donde
 * `ply` es la cantidad de medias jugadas jugadas antes de la posición. Los PGN
 * que no cargan se cuentan y se saltean.
 */
/** Quita comentarios, variantes y NAG: el PGN de OTB los trae y rompen el parser. */
const stripAnnotations = pgn =>
  pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/;[^\n]*/g, ' ');

const loadHistory = pgn => {
  for (const text of [pgn, stripAnnotations(pgn)]) {
    try {
      const chess = new Chess();
      chess.loadPgn(text);
      return chess.history({ verbose: true });
    } catch {
      // se prueba con el PGN limpio
    }
  }
  return null;
};

export const indexGames = games => {
  const index = new Map();
  const ids = new Set();
  const unparsableIds = new Set();
  let unparsable = 0;
  const add = (key, gameId, ply) => {
    const list = index.get(key);
    if (list) list.push({ gameId, ply });
    else index.set(key, [{ gameId, ply }]);
  };
  for (const game of games) {
    ids.add(game.id);
    const history = loadHistory(game.pgn);
    if (!history) {
      unparsable += 1;
      unparsableIds.add(game.id);
      continue;
    }
    history.forEach((move, ply) => add(fenKey(move.before), game.id, ply));
    if (history.length) add(fenKey(history[history.length - 1].after), game.id, history.length);
  }
  return { index, ids, unparsable, unparsableIds };
};

/**
 * Completa `gameId` en las conversiones que lo traen null y verifica los que ya
 * vienen. Completa solo si el match es único (priorizando el que coincide en
 * `ply`); con más de un candidato o ninguno queda null. No muta los ítems.
 *
 * Devuelve `{ items, report }`; el reporte tiene solo conteos e ids de ítem.
 */
export const enrichGameIds = (items, games) => {
  const { index, ids, unparsable, unparsableIds } = indexGames(games);
  const report = {
    games: games.length,
    unparsable,
    nullBefore: 0,
    filled: [],
    ambiguous: [],
    unmatched: [],
    knownConfirmed: [],
    knownMismatch: [],
    knownUnverifiable: [],
    knownNotInSnapshot: [],
  };
  const out = items.map(item => {
    const candidates = index.get(fenKey(item.fen)) ?? [];
    if (item.gameId) {
      if (!ids.has(item.gameId)) report.knownNotInSnapshot.push(item.id);
      else if (candidates.some(c => c.gameId === item.gameId)) report.knownConfirmed.push(item.id);
      else if (unparsableIds.has(item.gameId)) report.knownUnverifiable.push(item.id);
      else report.knownMismatch.push(item.id);
      return item;
    }
    report.nullBefore += 1;
    if (candidates.length === 0) {
      report.unmatched.push(item.id);
      return item;
    }
    const sameGame = new Set(candidates.map(c => c.gameId));
    let pick = null;
    if (sameGame.size === 1) {
      pick = candidates[0].gameId;
    } else {
      const byPly = candidates.filter(c => c.ply === item.ply);
      if (byPly.length === 1) pick = byPly[0].gameId;
    }
    if (!pick) {
      report.ambiguous.push(item.id);
      return item;
    }
    report.filled.push(item.id);
    return { ...item, gameId: pick };
  });
  return { items: out, report };
};
