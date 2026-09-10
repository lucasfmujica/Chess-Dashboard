import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type Anthropic from '@anthropic-ai/sdk';
import { StockfishEngine } from '../engine/stockfishEngine';
import { askDiagnosticChat } from '../api/client';

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
  const history = useRef<Anthropic.MessageParam[]>([]);
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
      history.current.push({ role: 'user', content: `${opening}${question}` });

      const evaluated: string[] = [];
      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const reply = await askDiagnosticChat(history.current);
          history.current.push({ role: 'assistant', content: reply.content });

          const toolUses = reply.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          );
          if (toolUses.length === 0) {
            const text = reply.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map(b => b.text)
              .join('\n')
              .trim();
            setTurns(prev => [
              ...prev,
              { role: 'assistant', text: text || 'No pude contestar eso.', evaluated },
            ]);
            return;
          }

          // Las evaluaciones de una misma vuelta van todas juntas en UN mensaje:
          // partirlas le enseña al modelo a dejar de pedirlas en paralelo.
          const results = await Promise.all(
            toolUses.map(async use => {
              const input = use.input as { jugadas?: string[]; profundidad?: number };
              const moves = input.jugadas ?? [];
              evaluated.push(moves.length ? moves.join(' ') : '(la posición)');
              try {
                const out = await evaluate(moves, input.profundidad ?? DEFAULT_DEPTH);
                return {
                  type: 'tool_result' as const,
                  tool_use_id: use.id,
                  content: JSON.stringify(out),
                };
              } catch (err) {
                return {
                  type: 'tool_result' as const,
                  tool_use_id: use.id,
                  is_error: true,
                  content: err instanceof Error ? err.message : 'falló la evaluación',
                };
              }
            })
          );
          history.current.push({ role: 'user', content: results });
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
