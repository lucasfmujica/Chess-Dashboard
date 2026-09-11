import { Chess } from 'chess.js';
import { positionFacts } from './positionFacts';

/**
 * El bucle de herramientas del chat sobre posiciones, sin navegador.
 *
 * Vive acá y no dentro del hook por una razón de medición: la única forma
 * honesta de saber si un cambio en el prompt mejora las respuestas es correr la
 * misma pregunta antes y después, y eso no se puede hacer a mano en la UI. Con
 * el bucle separado, `scripts/chat-eval.mts` corre EXACTAMENTE este código con
 * un Stockfish nativo en lugar del WASM del navegador, así que lo que se mide
 * es lo que después contesta la app, no una reimplementación parecida.
 *
 * Lo único que se inyecta es de dónde salen los números (`scoreOf`), quién
 * contesta (`askChat`) y de dónde salen los conceptos (`searchConcepts`). Todo
 * el resto —caché, tope por vuelta, libreta de lo ya medido, cierre forzado— es
 * el mismo objeto en los dos lados.
 */

/** Lo que el modelo pidió, ya normalizado por el endpoint. */
export interface ChatToolCall {
  id: string;
  tool: string;
  moves: string[];
  depth?: number;
  square?: string;
  query?: string;
}

export type WireTurn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text?: string; toolCalls?: ChatToolCall[] }
  | { role: 'tool'; results: { id: string; output: string; isError?: boolean }[] };

export interface EngineScore {
  cp?: number;
  mate?: number;
  bestMove?: string;
  profundidad: number;
}

export interface ChatLoopDeps {
  /** La posición de partida del hilo. */
  fen: string;
  /** Evalúa un FEN. En la app es el Stockfish WASM; en el harness, el nativo. */
  scoreOf: (fen: string, depth: number) => Promise<EngineScore>;
  /**
   * Una vuelta contra el endpoint. `final` corta las herramientas del lado del
   * proveedor: en la última vuelta el modelo no puede pedir más mediciones ni
   * queriendo, así que la respuesta sale siempre.
   */
  askChat: (turns: WireTurn[], final: boolean) => Promise<{ text: string; toolCalls: ChatToolCall[] }>;
  searchConcepts: (query: string) => Promise<unknown>;
  /** Qué se está midiendo ahora, para que la espera no parezca un cuelgue. */
  onProgress?: (label: string | undefined) => void;
  onRound?: (round: { n: number; since: number }) => void;
  /**
   * Vuelve al comportamiento anterior: sin libreta, sin marcar las mediciones
   * repetidas, sin contestarle las que se descartan por el tope, y pidiendo la
   * respuesta final por texto en vez de cerrarle las herramientas.
   *
   * Existe SOLO para el banco de pruebas (`scripts/chat-eval.mts --legacy`): un
   * cambio en el prompt solo se puede juzgar contra la versión anterior corriendo
   * las dos, y sin esto habría que reimplementar el bucle viejo para medirlo, que
   * es justo lo que haría que la medición no valga. La app nunca lo pasa.
   */
  legacy?: boolean;
}

/**
 * Profundidad por defecto de las evaluaciones del chat.
 *
 * Baja a propósito frente a la del análisis batch (20): en la app el motor
 * corre en el navegador y una respuesta puede pedir quince líneas. A 18 eso son
 * varios minutos; a 14 es cosa de segundos, y para comparar dos jugadas la
 * diferencia entre 14 y 18 casi nunca cambia cuál es mejor.
 */
export const DEFAULT_DEPTH = 14;
const MAX_DEPTH = 20;
const MIN_DEPTH = 10;

/**
 * Tope de mediciones por vuelta. El motor las serializa, así que veinte pedidas
 * de golpe son veinte esperas seguidas — y las últimas casi nunca cambian la
 * respuesta.
 */
export const MAX_PER_ROUND = 8;

/** Vueltas totales. En la última se contesta con las herramientas cerradas. */
export const MAX_ROUNDS = 8;

/** Lo que quedó de una vuelta, para poder auditar y medir. */
export interface ChatLoopStats {
  /** Vueltas usadas, contando la del cierre. */
  rounds: number;
  /** Mediciones pedidas en total, incluidas las repetidas y las recortadas. */
  requested: number;
  /** Mediciones que de verdad corrieron el motor o la base. */
  executed: number;
  /** Pedidas que ya estaban medidas en el hilo. */
  cacheHits: number;
  /** Pedidas de más, que no se ejecutaron por el tope por vuelta. */
  dropped: number;
  /** Milisegundos esperando al modelo. */
  modelMs: number;
  /** Milisegundos esperando al motor y a la base. */
  toolMs: number;
  /** Por vuelta, qué pidió el modelo. Para leer cómo razonó. */
  perRound: { n: number; calls: string[]; cached: string[]; dropped: number; modelMs: number }[];
}

export interface ChatLoopResult {
  text: string;
  /** Etiquetas de todo lo que se midió, en orden. Es la auditoría del modelo. */
  evaluated: string[];
  /** Salidas crudas de las herramientas, para chequear si la respuesta se apoya en ellas. */
  outputs: { label: string; output: string }[];
  stats: ChatLoopStats;
  /** True si el modelo nunca cerró una respuesta. Con `final` no debería pasar. */
  exhausted: boolean;
}

/** Corre las jugadas desde la posición; devuelve el tablero o el error. */
const walk = (fen: string, moves: string[]) => {
  const board = new Chess(fen);
  for (const san of moves) {
    try {
      board.move(san);
    } catch {
      return {
        error: `"${san}" no es legal en esa posición. Jugadas válidas hasta ahí: ${board.moves().join(', ')}`,
      };
    }
  }
  return { board };
};

/** Etiqueta corta y estable de una medición: sirve de clave de caché y de auditoría. */
export const labelOf = (call: ChatToolCall): string => {
  const line = call.moves.length ? call.moves.join(' ') : '(la posición)';
  if (call.tool === 'concepto') return `concepto: ${call.query}`;
  if (call.tool === 'rasgos') return `rasgos de ${line}`;
  return call.square ? `${line} sin ${call.square}` : line;
};

/**
 * Una libreta de lo ya medido, al final del historial.
 *
 * El modelo repite mediciones que ya están en la conversación: en un hilo real
 * pidió Nxa4 y Bf5 cuatro veces cada una. La caché hace que repetir salga
 * gratis, pero sigue quemando vueltas, que es el recurso escaso. Razonando en
 * `low` no vuelve a leer diez bloques de JSON para acordarse de lo que midió,
 * así que se le deja el resumen a la vista, en una línea por medición.
 *
 * Se REEMPLAZA en cada vuelta en vez de acumularse: si se apilara, el historial
 * crecería con copias de sí mismo.
 */
const ledgerText = (
  measured: { label: string; gist: string }[],
  round: number,
  total: number
): string =>
  [
    `Vuelta ${round} de ${total}. Te quedan ${total - round} (en la última no vas a poder pedir mediciones: ahí se contesta).`,
    'Ya medido en este hilo — NO lo pidas de nuevo, ya lo tenés:',
    ...measured.map(m => `- ${m.label}: ${m.gist}`),
  ].join('\n');

/** Resumen de una línea de una salida de herramienta, para la libreta. */
const gistOf = (out: unknown): string => {
  if (out === null || typeof out !== 'object') return 'medido';
  const o = out as Record<string, unknown>;
  if (typeof o.error === 'string') return `no se pudo (${o.error.slice(0, 60)})`;
  if (typeof o.fin === 'string') return String(o.fin);
  if (o.con_la_pieza_cp !== undefined) {
    return `con ${pawns(o.con_la_pieza_cp)} / sin ${pawns(o.sin_la_pieza_cp)} (desde ${o.mueve})`;
  }
  if (o.evaluacion_cp !== undefined || o.mate_en !== undefined) {
    const ev = o.mate_en !== undefined && o.mate_en !== null ? `mate en ${o.mate_en}` : pawns(o.evaluacion_cp);
    return `${ev} desde ${o.mueve}`;
  }
  if (o.mobility !== undefined) {
    const m = o.mobility as { white: number; black: number };
    const p = o.pawns as { white: { doubled: number; isolated: number }; black: { doubled: number; isolated: number } };
    return (
      `movilidad ${m.white}/${m.black}, doblados ${p.white.doubled}/${p.black.doubled}, ` +
      `aislados ${p.white.isolated}/${p.black.isolated}`
    );
  }
  if (Array.isArray(out)) {
    return out.length === 0
      ? 'sin resultados'
      : `${out.length} concepto(s): ${out.map(c => (c as { name?: string }).name).filter(Boolean).join(', ')}`;
  }
  return 'medido';
};

const pawns = (cp: unknown): string =>
  typeof cp === 'number' ? `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(1)}` : 's/d';

/**
 * Pregunta y contesta, midiendo lo que haga falta en el medio.
 *
 * `history` se muta a propósito: es el hilo del chat y el llamador lo conserva
 * entre preguntas, porque el endpoint no guarda estado.
 */
export const runDiagnosticChat = async (
  history: WireTurn[],
  cache: Map<string, unknown>,
  deps: ChatLoopDeps
): Promise<ChatLoopResult> => {
  const { fen, scoreOf, askChat, searchConcepts, onProgress, onRound, legacy = false } = deps;

  const clampDepth = (depth: number) => Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth));

  const evaluate = async (moves: string[], depth: number) => {
    const walked = walk(fen, moves);
    if ('error' in walked) return walked;
    const { board } = walked;
    if (board.isGameOver()) {
      return { fen: board.fen(), fin: board.isCheckmate() ? 'jaque mate' : 'tablas' };
    }
    const r = await scoreOf(board.fen(), clampDepth(depth));
    return {
      fen: board.fen(),
      mueve: board.turn() === 'w' ? 'blancas' : 'negras',
      evaluacion_cp: r.cp,
      mate_en: r.mate,
      nota: 'evaluacion_cp es desde el lado que mueve en esta posición',
      mejor_respuesta_uci: r.bestMove,
      profundidad: r.profundidad,
    };
  };

  const facts = (moves: string[]) => {
    const walked = walk(fen, moves);
    if ('error' in walked) return walked;
    return {
      ...positionFacts(walked.board.fen()),
      nota:
        'movilidad = jugadas legales de cada bando. material en peones. ' +
        'Son hechos medidos, sin interpretar.',
    };
  };

  const ablate = async (moves: string[], square: string, depth: number) => {
    const walked = walk(fen, moves);
    if ('error' in walked) return walked;
    const { board } = walked;
    const piece = board.get(square as Parameters<Chess['get']>[0]);
    if (!piece) return { error: `No hay ninguna pieza en ${square}.` };
    if (piece.type === 'k') return { error: 'No se puede sacar un rey del tablero.' };

    const con = await scoreOf(board.fen(), clampDepth(depth));
    board.remove(square as Parameters<Chess['remove']>[0]);
    // Sacar una pieza puede dejar una posición que ningún motor acepta — por
    // ejemplo el rey que no mueve, en jaque.
    let sin;
    try {
      sin = await scoreOf(board.fen(), clampDepth(depth));
    } catch {
      return { error: `Sin la pieza de ${square} la posición queda ilegal y no se puede evaluar.` };
    }
    return {
      pieza: `${piece.color === 'w' ? 'blanca' : 'negra'} ${piece.type} en ${square}`,
      mueve: board.turn() === 'w' ? 'blancas' : 'negras',
      con_la_pieza_cp: con.cp,
      sin_la_pieza_cp: sin.cp,
      nota: 'ambas desde el lado que mueve. La diferencia es cuánto depende la posición de esa pieza',
      profundidad: con.profundidad,
    };
  };

  const evaluated: string[] = [];
  const outputs: { label: string; output: string }[] = [];
  const measured: { label: string; gist: string }[] = [];
  const stats: ChatLoopStats = {
    rounds: 0,
    requested: 0,
    executed: 0,
    cacheHits: 0,
    dropped: 0,
    modelMs: 0,
    toolMs: 0,
    perRound: [],
  };
  /** Índice de la libreta en el historial, para reemplazarla en vez de apilarla. */
  let ledgerAt = -1;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const isFinal = round === MAX_ROUNDS - 1;
    if (isFinal && legacy) {
      history.push({
        role: 'user',
        text:
          'Basta de mediciones: contestá ahora con lo que ya mediste. Si algo ' +
          'quedó sin verificar, decilo en una frase en vez de seguir buscando.',
      });
    }
    stats.rounds = round + 1;
    onRound?.({ n: round + 1, since: Date.now() });

    const startedModel = Date.now();
    // En la última vuelta se piden las herramientas cerradas. Antes esto era una
    // frase ("basta de mediciones") que el modelo podía ignorar —y lo hacía: las
    // pedía igual, se ejecutaban, y el bucle terminaba tirando "no logré cerrar
    // una respuesta" con todo medido al lado. Cerrarlas del lado del proveedor
    // hace que esa salida sea imposible.
    const reply = await askChat(history, isFinal && !legacy);
    const modelMs = Date.now() - startedModel;
    stats.modelMs += modelMs;

    history.push({
      role: 'assistant',
      text: reply.text || undefined,
      toolCalls: reply.toolCalls.length ? reply.toolCalls : undefined,
    });

    if (reply.toolCalls.length === 0) {
      stats.perRound.push({ n: round + 1, calls: [], cached: [], dropped: 0, modelMs });
      return { text: reply.text, evaluated, outputs, stats, exhausted: false };
    }

    stats.requested += reply.toolCalls.length;
    // Recortadas y no rechazadas: pedir de más es entusiasmo del modelo, no un
    // error, y las primeras son las que le importan. Las de más SÍ reciben
    // respuesta —abajo— porque un tool_call sin resultado rompe el formato de
    // las APIs compatibles con OpenAI, y además así se entera del tope.
    const calls = reply.toolCalls.slice(0, MAX_PER_ROUND);
    const overflow = reply.toolCalls.slice(MAX_PER_ROUND);
    stats.dropped += overflow.length;

    const roundCalls: string[] = [];
    const roundCached: string[] = [];
    let hechas = 0;
    const startedTools = Date.now();
    const results = await Promise.all(
      calls.map(async call => {
        const label = labelOf(call);
        const key = `${call.tool}|${label}|${call.depth ?? DEFAULT_DEPTH}`;
        roundCalls.push(label);
        evaluated.push(label);

        const cached = cache.get(key);
        if (cached !== undefined) {
          stats.cacheHits += 1;
          roundCached.push(label);
          // Se le dice que era repetida. Es la única señal que le llega
          // razonando en `low`: sin esto vuelve a pedir lo mismo sin notarlo.
          return {
            id: call.id,
            output: JSON.stringify(
              legacy
                ? (cached as Record<string, unknown>)
                : {
                    ya_medido:
                      'esto ya estaba medido en este hilo; es la misma respuesta de antes. ' +
                      'No vuelvas a pedirla: gastás una vuelta sin ganar información.',
                    ...(cached as Record<string, unknown>),
                  }
            ),
          };
        }

        onProgress?.(`${label} (${++hechas} de ${calls.length})`);
        try {
          const out =
            call.tool === 'concepto'
              ? await searchConcepts(call.query ?? '')
              : call.tool === 'rasgos'
                ? facts(call.moves)
                : call.square
                  ? await ablate(call.moves, call.square, call.depth ?? DEFAULT_DEPTH)
                  : await evaluate(call.moves, call.depth ?? DEFAULT_DEPTH);
          cache.set(key, out);
          stats.executed += 1;
          measured.push({ label, gist: gistOf(out) });
          const output = JSON.stringify(out);
          outputs.push({ label, output });
          return { id: call.id, output };
        } catch (err) {
          return {
            id: call.id,
            isError: true,
            output: err instanceof Error ? err.message : 'falló la evaluación',
          };
        }
      })
    );
    stats.toolMs += Date.now() - startedTools;

    for (const call of legacy ? [] : overflow) {
      results.push({
        id: call.id,
        isError: true,
        output:
          `No se ejecutó: pediste ${reply.toolCalls.length} mediciones y el tope es ` +
          `${MAX_PER_ROUND} por vuelta. Se corrieron las primeras ${MAX_PER_ROUND}. ` +
          'Pedí menos por vuelta y elegí las que deciden la respuesta.',
      });
    }

    history.push({ role: 'tool', results });
    stats.perRound.push({ n: round + 1, calls: roundCalls, cached: roundCached, dropped: overflow.length, modelMs });
    onProgress?.(undefined);

    // La libreta va SIEMPRE última: es lo que el modelo lee justo antes de
    // decidir la vuelta que viene. La anterior se saca del historial en vez de
    // quedar enterrada, así que hay exactamente una y no crece con copias.
    if (measured.length > 0 && !isFinal && !legacy) {
      if (ledgerAt >= 0) history.splice(ledgerAt, 1);
      ledgerAt = history.push({ role: 'user', text: ledgerText(measured, round + 2, MAX_ROUNDS) }) - 1;
    }
  }

  // Solo se llega acá si contestó con herramientas incluso con las herramientas
  // cerradas, que no debería poder pasar.
  return {
    text:
      'No logré cerrar una respuesta: el modelo siguió pidiendo mediciones. Lo medido ' +
      'está abajo por si sirve.',
    evaluated,
    outputs,
    stats,
    exhausted: true,
  };
};
