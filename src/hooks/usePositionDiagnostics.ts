import { useCallback, useEffect, useState } from 'react';
import {
  cancelPositionDiagnostics,
  fetchDiagnosticsStatus,
  fetchPositionDiagnostics,
  requestPositionDiagnostics,
} from '../api/client';
import type { DiagnosticRun, PositionDiagnostic } from '../types/diagnostics';

export type DiagnosticsState = 'sin-analizar' | 'pedida' | 'analizada';

/**
 * Diagnóstico de una partida, más el estado de su pedido.
 *
 * Pedir no dispara nada: el análisis necesita Stockfish y lc0 corriendo minutos
 * por partida, así que solo se encola y lo levanta el script local con
 * `--requested`. Por eso `state` distingue "pedida" de "analizada": entre las
 * dos hay una corrida manual.
 */
export const usePositionDiagnostics = (gameId?: string) => {
  const [diagnostics, setDiagnostics] = useState<PositionDiagnostic[]>([]);
  const [run, setRun] = useState<DiagnosticRun>();
  const [state, setState] = useState<DiagnosticsState>('sin-analizar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!gameId) return;
    const [rows, status] = await Promise.all([
      fetchPositionDiagnostics(gameId),
      fetchDiagnosticsStatus(),
    ]);
    const analyzed = status.analyzed.find(a => a.gameId === gameId);
    setDiagnostics(rows);
    setRun(analyzed);
    // El pedido gana sobre el análisis viejo: si está encolada de nuevo, lo que
    // importa es que hay algo por correr, aunque ya tenga resultados.
    setState(
      status.requested.some(r => r.gameId === gameId)
        ? 'pedida'
        : analyzed
          ? 'analizada'
          : 'sin-analizar'
    );
  }, [gameId]);

  useEffect(() => {
    if (!gameId) {
      setDiagnostics([]);
      setRun(undefined);
      setState('sin-analizar');
      return;
    }
    setLoading(true);
    setError(null);
    refetch()
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar el diagnóstico'))
      .finally(() => setLoading(false));
  }, [gameId, refetch]);

  const request = useCallback(
    async (force = false) => {
      if (!gameId) return;
      setError(null);
      try {
        await requestPositionDiagnostics(gameId, force);
        setState('pedida');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo pedir el análisis');
      }
    },
    [gameId]
  );

  const cancel = useCallback(async () => {
    if (!gameId) return;
    setError(null);
    try {
      await cancelPositionDiagnostics(gameId);
      setState(run ? 'analizada' : 'sin-analizar');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar el pedido');
    }
  }, [gameId, run]);

  return { diagnostics, run, state, loading, error, request, cancel, refetch };
};
