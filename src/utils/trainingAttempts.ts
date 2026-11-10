import type { TrainingAttempt } from '../types/training';

/**
 * Los intentos de la cola diaria. Los `external` (conversión y guías, que no
 * tienen fila en la base) quedan afuera: las métricas de Hoy, Registro y el
 * resumen de Overview miden la cola diaria y no deben moverse por la pestaña
 * de Conversión.
 */
export const dailyQueueAttempts = (attempts: TrainingAttempt[]): TrainingAttempt[] =>
  attempts.filter(a => a.itemKind !== 'external');
