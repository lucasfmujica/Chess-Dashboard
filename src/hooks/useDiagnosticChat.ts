import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../engine/stockfishEngine';
import { askDiagnosticChat, type ChatTurn as WireTurn } from '../api/client';

/** Un turno visible del chat. Los `tool_use` y `tool_result` no se muestran. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** Líneas que el modelo evaluó para contestar, para poder auditarlo. */
  evaluated?: string[];
}

const DEFAULT_DEPTH = 18;
const MAX_DEPTH = 22;
const MIN_DEPTH = 12;
/** Tope de vueltas del bucle: un modelo en loop no puede colgar el navegador. */
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
  const [error, setError] = useState<string | null>(null);
  const history = useRef<WireTurn[]>([]);
  const engine = useRef<StockfishEngine | null>(null);

  /**
   * Juega las jugadas desde la posición y evalúa lo que queda.
   *
   * La evaluación vuelve desde el lado que mueve en la posición RESULTANTE, no
   * desde el de Lucas: se dice explícitamente en el resultado para que el
   * modelo no tenga que deducir el signo.
   */
  const evaluate = useCallback(
    async (moves: string[], depth: number) => {
      const board = new Chess(fen);
      for (const san of moves) {
        try {
          board.move(san);
        } catch {
          return { error: `"${san}" no es legal en esa posición. Jugadas válidas hasta ahí: ${board.moves().join(', ')}` };
        }
      }
      if (board.isGameOver()) {
        return {
          fen: board.fen(),
          fin: board.isCheckmate() ? 'jaque mate' : 'tablas',
        };
      }
      if (!engine.current) {
        engine.current = new StockfishEngine();
        await engine.current.init();
      }
      const clamped = Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth));
      const result = await engine.current.evaluate(board.fen(), clamped);
      return {
        fen: board.fen(),
        mueve: board.turn() === 'w' ? 'blancas' : 'negras',
        evaluacion_cp: result.cp,
        mate_en: result.mate,
        nota: 'evaluacion_cp es desde el lado que mueve en esta posición',
        mejor_respuesta_uci: result.bestMove,
        profundidad: clamped,
      };
    },
    [fen]
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
          const results = await Promise.all(
            reply.toolCalls.map(async call => {
              evaluated.push(call.moves.length ? call.moves.join(' ') : '(la posición)');
              try {
                const out = await evaluate(call.moves, call.depth ?? DEFAULT_DEPTH);
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
        }
        setTurns(prev => [
          ...prev,
          { role: 'assistant', text: 'Me quedé dando vueltas evaluando. Probá preguntando algo más concreto.', evaluated },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo consultar');
      } finally {
        setThinking(false);
      }
    },
    [evaluate]
  );

  /** Descarta el hilo. La posición cambió, así que el contexto ya no aplica. */
  const reset = useCallback(() => {
    history.current = [];
    setTurns([]);
    setError(null);
  }, []);

  return { turns, thinking, error, ask, reset };
};
