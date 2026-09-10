import { useState } from 'react';
import { Button } from '../../../ui';
import ConceptQuickAdd from '../../ConceptQuickAdd';
import { postBlunderDrills } from '../../../../api/client';
import type { PositionDiagnostic } from '../../../../types/diagnostics';

const CATEGORY_HINT: Record<string, string> = {
  brecha_conceptual: 'Error compartido por la banda de ~1900 de Lichess',
  jugada_inhumana: 'La jugada correcta está fuera del radar de esa banda',
  error_propio: 'Error propio: ningún nivel de Maia lo comete',
};

/**
 * Convierte un hallazgo en entrenamiento.
 *
 * Sin esto el diagnóstico es un informe: mirás en qué te equivocás y ahí termina.
 * La app ya tiene drills y conceptos, y un hallazgo trae todo lo que un drill
 * necesita — la posición previa, lo que jugaste, lo que había que jugar y cuánto
 * costó — así que la conversión es directa.
 *
 * El drill nace con la policy de Maia de la solución, así que cae solo del lado
 * correcto del filtro "encontrable" en vez de entrar sin clasificar.
 */
const FindingActions = ({ finding }: { finding: PositionDiagnostic }) => {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const best = finding.sfTop3[0];

  const createDrill = async () => {
    if (!best) return;
    setState('saving');
    try {
      await postBlunderDrills([
        {
          gameId: finding.gameId,
          ply: finding.ply,
          fenBefore: finding.fen,
          playedSan: finding.movePlayed,
          bestMoveUci: best.moveUci,
          cpLoss: finding.cpLoss,
          evalBefore: best.evalCp,
          // El eval después de mi jugada no se guarda aparte, pero es
          // exactamente lo que el motor tenía menos lo que costó la jugada.
          evalAfter: best.evalCp - finding.cpLoss,
          maiaPolicy: best.maiaPolicy,
        },
      ]);
      setState('saved');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Button size="sm" onClick={createDrill} disabled={state !== 'idle' || !best}>
        {state === 'saving' ? 'Creando…' : state === 'saved' ? 'Drill creado' : 'Hacer drill'}
      </Button>
      <ConceptQuickAdd
        label="Es un concepto"
        defaults={{
          name: `${finding.movePlayed} en vez de ${best?.moveSan ?? '?'}`,
          summary: finding.explanation ?? CATEGORY_HINT[finding.category],
          exampleFens: [finding.fen],
          gameIds: [finding.gameId],
        }}
      />
      {state === 'error' && <span className="text-xs text-loss">No se pudo crear el drill.</span>}
      {state === 'saved' && (
        <span className="text-xs text-fg-subtle">Ya está en la cola de drills.</span>
      )}
    </div>
  );
};

export default FindingActions;
