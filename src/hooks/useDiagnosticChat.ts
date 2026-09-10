import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../engine/stockfishEngine';
import { positionFacts } from '../engine/positionFacts';
import { askDiagnosticChat, searchConcepts, type ChatTurn as WireTurn } from '../api/client';

/** Un turno visible del chat. Los `tool_use` y `tool_result` no se muestran. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** Líneas que el modelo evaluó para contestar, para poder auditarlo. */
  evaluated?: string[];
}

/**
 * Profundidad por defecto de las evaluaciones del chat.
 *
 * Baja a propósito frente a la del análisis batch (20): acá el motor corre en el
 * navegador, no en la máquina, y una respuesta puede pedir quince o veinte
 * líneas. A 18 eso son varios minutos de espera; a 14 es cosa de segundos, y
 * para comparar dos jugadas la diferencia entre 14 y 18 casi nunca cambia cuál
 * es mejor. El modelo puede pedir más profundidad cuando la necesite.
 */
const DEFAULT_DEPTH = 14;
const MAX_DEPTH = 20;
const MIN_DEPTH = 10;

/**
 * Tope de evaluaciones por vuelta. El motor las serializa, así que veinte
 * pedidas de golpe son veinte esperas seguidas — y las últimas casi nunca
 * cambian la respuesta.
 */
const MAX_PER_ROUND = 8;
/**
 * Vueltas antes de exigir una respuesta.
 *
 * En la anteúltima se le avisa que se quedó sin mediciones y que conteste con lo
 * que tiene. Antes el tope simplemente cortaba y devolvía "probá algo más
 * concreto", que le echa la culpa al usuario de que el modelo no supo parar:
 * había medido treinta y seis líneas, repetido varias y buscado conceptos ocho
 * veces. Con una pregunta amplia eso no es raro, y la respuesta tiene que salir
 * igual.
 */
const MAX_ROUNDS = 8;

/**
 * Preguntas sobre una posición, contestadas con Stockfish.
 *
 * El bucle de herramientas vive acá y no en el servidor porque el motor vive
 * acá: la app tiene Stockfish en WASM y una función de Vercel no puede tener
 * uno. El endpoint es un proxy sin estado, así que el historial completo lo
 * sostiene este hook y viaja en cada vuelta.
 *
 * El modelo tiene prohibido analizar de su cabeza; su única fuente es lo que
 * devuelve `evaluar`. Por eso se guarda qué líneas evaluó: sin eso no habría
 * forma de saber si contestó con datos o inventó.
 */
export const useDiagnosticChat = (fen: string) => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  /** Qué está midiendo ahora mismo, para que la espera no parezca un cuelgue. */
  const [progress, setProgress] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const history = useRef<WireTurn[]>([]);
  const engine = useRef<StockfishEngine | null>(null);
  /**
   * Evaluaciones ya hechas en este hilo.
   *
   * El modelo vuelve a pedir líneas que ya midió — en una conversación real pidió
   * Nxa4 y Bf5 cuatro veces cada una. Cachearlas hace que repetir salga gratis en
   * vez de costar otra búsqueda de Stockfish, que corre en esta misma máquina.
   */
  const cache = useRef<Map<string, unknown>>(new Map());

  /**
   * Juega las jugadas desde la posición y evalúa lo que queda.
   *
   * La evaluación vuelve desde el lado que mueve en la posición RESULTANTE, no
   * desde el de Lucas: se dice explícitamente en el resultado para que el
   * modelo no tenga que deducir el signo.
   */
  /** Corre las jugadas desde la posición; devuelve el tablero o el error. */
  const walk = useCallback(
    (moves: string[]) => {
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
    },
    [fen]
  );

  const scoreOf = useCallback(async (positionFen: string, depth: number) => {
    if (!engine.current) {
      engine.current = new StockfishEngine();
      await engine.current.init();
    }
    const clamped = Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth));
    return { ...(await engine.current.evaluate(positionFen, clamped)), profundidad: clamped };
  }, []);

  const evaluate = useCallback(
    async (moves: string[], depth: number) => {
      const walked = walk(moves);
      if ('error' in walked) return walked;
      const { board } = walked;
      if (board.isGameOver()) {
        return { fen: board.fen(), fin: board.isCheckmate() ? 'jaque mate' : 'tablas' };
      }
      const r = await scoreOf(board.fen(), depth);
      return {
        fen: board.fen(),
        mueve: board.turn() === 'w' ? 'blancas' : 'negras',
        evaluacion_cp: r.cp,
        mate_en: r.mate,
        nota: 'evaluacion_cp es desde el lado que mueve en esta posición',
        mejor_respuesta_uci: r.bestMove,
        profundidad: r.profundidad,
      };
    },
    [walk, scoreOf]
  );

  /**
   * Ablación: la misma posición con y sin una pieza.
   *
   * Una evaluación dice cuánto vale una posición; esto dice de quién depende. Es
   * lo único que puede separar "es mejor porque desarrolla" de "es mejor porque
   * echa a la dama", que una evaluación sola no distingue.
   */
  /**
   * Rasgos medidos de una posición. Sin motor: se calculan del tablero, así que
   * son instantáneos y no compiten con las evaluaciones por la CPU.
   */
  const facts = useCallback(
    (moves: string[]) => {
      const walked = walk(moves);
      if ('error' in walked) return walked;
      return {
        ...positionFacts(walked.board.fen()),
        nota: 'movilidad = jugadas legales de cada bando. material en peones. '
          + 'Son hechos medidos, sin interpretar.',
      };
    },
    [walk]
  );

  const ablate = useCallback(
    async (moves: string[], square: string, depth: number) => {
      const walked = walk(moves);
      if ('error' in walked) return walked;
      const { board } = walked;
      const piece = board.get(square as Parameters<Chess['get']>[0]);
      if (!piece) return { error: `No hay ninguna pieza en ${square}.` };
      if (piece.type === 'k') return { error: 'No se puede sacar un rey del tablero.' };

      const con = await scoreOf(board.fen(), depth);
      board.remove(square as Parameters<Chess['remove']>[0]);
      // Sacar una pieza puede dejar una posición que ningún motor acepta —
      // por ejemplo el rey que no mueve en jaque.
      let sin;
      try {
        sin = await scoreOf(board.fen(), depth);
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
    },
    [walk, scoreOf]
  );

  const ask = useCallback(
    async (question: string, context: string) => {
      setError(null);
      setThinking(true);
      setTurns(prev => [...prev, { role: 'user', text: question }]);

      // El contexto del diagnóstico va una sola vez, en el primer mensaje.
      const opening = history.current.length === 0 ? `${context}\n\nPregunta: ` : '';
      history.current.push({ role: 'user', text: `${opening}${question}` });

      const evaluated: string[] = [];
      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          // Última vuelta: se corta la exploración y se pide la respuesta.
          if (round === MAX_ROUNDS - 1) {
            history.current.push({
              role: 'user',
              text:
                'Basta de mediciones: contestá ahora con lo que ya mediste. Si algo ' +
                'quedó sin verificar, decilo en una frase en vez de seguir buscando.',
            });
          }
          const reply = await askDiagnosticChat(history.current);
          history.current.push({
            role: 'assistant',
            text: reply.text || undefined,
            toolCalls: reply.toolCalls.length ? reply.toolCalls : undefined,
          });

          if (reply.toolCalls.length === 0) {
            setTurns(prev => [
              ...prev,
              { role: 'assistant', text: reply.text || 'No pude contestar eso.', evaluated },
            ]);
            return;
          }

          // Las evaluaciones de una misma vuelta van todas juntas en UN turno:
          // partirlas le enseña al modelo a dejar de pedirlas en paralelo.
          // Recortadas y no rechazadas: pedir de más es un exceso de entusiasmo
          // del modelo, no un error, y las primeras son las que le importan.
          const calls = reply.toolCalls.slice(0, MAX_PER_ROUND);
          let hechas = 0;
          const results = await Promise.all(
            calls.map(async call => {
              const line = call.moves.length ? call.moves.join(' ') : '(la posición)';
              const label =
                call.tool === 'concepto'
                  ? `concepto: ${call.query}`
                  : call.tool === 'rasgos'
                    ? `rasgos de ${line}`
                    : call.square
                      ? `${line} sin ${call.square}`
                      : line;
              const key = `${call.tool}|${label}|${call.depth ?? DEFAULT_DEPTH}`;
              const cached = cache.current.get(key);
              if (cached !== undefined) {
                // Se anota igual, para que la lista muestre en qué se apoyó la
                // respuesta aunque el motor no haya vuelto a correr.
                evaluated.push(label);
                return { id: call.id, output: JSON.stringify(cached) };
              }
              evaluated.push(label);
              setProgress(`${label} (${++hechas} de ${calls.length})`);
              try {
                const out =
                  call.tool === 'concepto'
                    ? await searchConcepts(call.query ?? '')
                    : call.tool === 'rasgos'
                      ? facts(call.moves)
                      : call.square
                        ? await ablate(call.moves, call.square, call.depth ?? DEFAULT_DEPTH)
                        : await evaluate(call.moves, call.depth ?? DEFAULT_DEPTH);
                cache.current.set(key, out);
                return { id: call.id, output: JSON.stringify(out) };
              } catch (err) {
                return {
                  id: call.id,
                  isError: true,
                  output: err instanceof Error ? err.message : 'falló la evaluación',
                };
              }
            })
          );
          history.current.push({ role: 'tool', results });
          setProgress(undefined);
        }
        // Solo se llega acá si pidió herramientas incluso después de que se le
        // dijera que contestara. Es un fallo del modelo, no de la pregunta.
        setTurns(prev => [
          ...prev,
          {
            role: 'assistant',
            text:
              'No logré cerrar una respuesta: seguí pidiendo mediciones aun después de ' +
              'que se le pidiera contestar. Lo medido está abajo por si sirve.',
            evaluated,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo consultar');
      } finally {
        setThinking(false);
        setProgress(undefined);
      }
    },
    [evaluate, ablate, facts]
  );

  /** Descarta el hilo. La posición cambió, así que el contexto ya no aplica. */
  const reset = useCallback(() => {
    history.current = [];
    cache.current.clear();
    setTurns([]);
    setError(null);
  }, []);

  return { turns, thinking, progress, error, ask, reset };
};
