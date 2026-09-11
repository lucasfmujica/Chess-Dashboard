import { useCallback, useRef, useState } from 'react';
import { StockfishEngine } from '../engine/stockfishEngine';
import { askDiagnosticChat, searchConcepts } from '../api/client';
import { runDiagnosticChat, type WireTurn } from '../engine/diagnosticChatLoop';

/** Un turno visible del chat. Los `tool_use` y `tool_result` no se muestran. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** Líneas que el modelo evaluó para contestar, para poder auditarlo. */
  evaluated?: string[];
}

/**
 * Preguntas sobre una posición, contestadas con Stockfish.
 *
 * El bucle de herramientas vive en `engine/diagnosticChatLoop`, no acá: es el
 * mismo código que corre `scripts/chat-eval.mts` con un Stockfish nativo para
 * medir si un cambio en el prompt mejora las respuestas. Este hook aporta las
 * dos cosas que solo existen en el navegador —el motor WASM y el estado de
 * React— y nada más.
 *
 * El endpoint es un proxy sin estado, así que el historial completo lo sostiene
 * este hook y viaja en cada vuelta.
 *
 * El modelo tiene prohibido analizar de su cabeza; su única fuente son las
 * herramientas. Por eso se guarda qué midió: sin eso no habría forma de saber si
 * contestó con datos o inventó.
 */
export const useDiagnosticChat = (fen: string) => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  /** Qué está midiendo ahora mismo, para que la espera no parezca un cuelgue. */
  const [progress, setProgress] = useState<string>();
  /**
   * Vuelta actual y segundos transcurridos.
   *
   * Mientras el modelo razona no hay nada que medir, así que el indicador de
   * mediciones queda vacío y la pantalla decía "Pensando…" sin más. Una espera
   * de medio minuto sin señal se lee como un cuelgue; con la vuelta y el reloj
   * se lee como trabajo.
   */
  const [round, setRound] = useState<{ n: number; since: number }>();
  const [error, setError] = useState<string | null>(null);
  const history = useRef<WireTurn[]>([]);
  const engine = useRef<StockfishEngine | null>(null);
  /**
   * Evaluaciones ya hechas en este hilo.
   *
   * El modelo vuelve a pedir líneas que ya midió — en una conversación real
   * pidió Nxa4 y Bf5 cuatro veces cada una. Cachearlas hace que repetir salga
   * gratis en vez de costar otra búsqueda de Stockfish, que corre en esta misma
   * máquina.
   */
  const cache = useRef<Map<string, unknown>>(new Map());

  const scoreOf = useCallback(async (positionFen: string, depth: number) => {
    if (!engine.current) {
      engine.current = new StockfishEngine();
      await engine.current.init();
    }
    return { ...(await engine.current.evaluate(positionFen, depth)), profundidad: depth };
  }, []);

  const ask = useCallback(
    async (question: string, context: string) => {
      setError(null);
      setThinking(true);
      setTurns(prev => [...prev, { role: 'user', text: question }]);

      // El contexto del diagnóstico va una sola vez, en el primer mensaje.
      const opening = history.current.length === 0 ? `${context}\n\nPregunta: ` : '';
      history.current.push({ role: 'user', text: `${opening}${question}` });

      try {
        const result = await runDiagnosticChat(history.current, cache.current, {
          fen,
          scoreOf,
          askChat: (turnsToSend, final) => askDiagnosticChat(turnsToSend, final),
          searchConcepts,
          onProgress: setProgress,
          onRound: setRound,
        });
        setTurns(prev => [
          ...prev,
          {
            role: 'assistant',
            text: result.text || 'No pude contestar eso.',
            evaluated: result.evaluated,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo consultar');
      } finally {
        setThinking(false);
        setProgress(undefined);
        setRound(undefined);
      }
    },
    [fen, scoreOf]
  );

  /** Descarta el hilo. La posición cambió, así que el contexto ya no aplica. */
  const reset = useCallback(() => {
    history.current = [];
    cache.current.clear();
    setTurns([]);
    setError(null);
  }, []);

  return { turns, thinking, progress, round, error, ask, reset };
};
