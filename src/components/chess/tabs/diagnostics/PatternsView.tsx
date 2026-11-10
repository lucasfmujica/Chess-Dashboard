import { useEffect, useState } from 'react';
import { Badge, Card } from '../../../ui';
import { fetchDiagnosticPatterns, fetchAllPositionDiagnostics } from '../../../../api/client';
import type { DiagnosticPattern, PositionDiagnostic } from '../../../../types/diagnostics';

/**
 * Los temas: divergencias que comparten mecanismo.
 *
 * Una lista de errores no es un plan de estudio. Si varios comparten mecanismo
 * —cambios equivocados de piezas menores, columnas mal disputadas— eso deja de
 * ser una lista y pasa a ser UN tema, que es lo que se puede trabajar.
 *
 * El agrupamiento lo hace un modelo sobre las explicaciones ya calculadas, así
 * que cada tema muestra de qué divergencias salió: sin eso habría que creerle.
 */
const PatternsView = () => {
  const [patterns, setPatterns] = useState<DiagnosticPattern[]>([]);
  const [byId, setById] = useState<Map<string, PositionDiagnostic>>(new Map());
  const [openId, setOpenId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchDiagnosticPatterns(), fetchAllPositionDiagnostics(500)])
      .then(([pats, rows]) => {
        setPatterns(pats);
        setById(new Map(rows.map(r => [r.id, r])));
      })
      .catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-fg-muted">Cargando temas…</p>;
  if (error) return <p className="text-sm text-loss">{error}</p>;
  if (patterns.length === 0) {
    return (
      <Card>
        <p className="text-sm text-fg-muted">
          Todavía no se agruparon temas. Requiere las divergencias ya explicadas, y después{' '}
          <code className="font-mono text-xs text-fg">python3 scripts/position_diagnostics.py --patterns</code>.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Divergencias que comparten mecanismo. Un tema agrupa varias, así que es algo que se puede
        estudiar en vez de una lista de errores sueltos.
      </p>

      {patterns.map(pattern => {
        const open = openId === pattern.id;
        // Un id que ya no existe (una divergencia reclasificada o descartada) se
        // omite en vez de dejar un hueco sin explicar.
        const findings = pattern.findingIds
          .map(id => byId.get(id))
          .filter((f): f is PositionDiagnostic => !!f);
        return (
          <Card key={pattern.id} flush>
            <button
              onClick={() => setOpenId(open ? undefined : pattern.id)}
              aria-expanded={open}
              className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-6"
            >
              <div className="min-w-0">
                <h3 className="font-serif text-xl font-semibold leading-tight text-fg">{pattern.name}</h3>
                <p className="mt-1 text-sm text-fg-muted">{pattern.summary}</p>
              </div>
              <Badge tone="accent">
                <span className="font-mono tabular-nums">{findings.length || pattern.findingIds.length}</span>
              </Badge>
            </button>

            {pattern.studyNote && (
              <p className="px-5 pb-4 font-serif text-[15px] italic leading-relaxed text-accent sm:px-6">
                {pattern.studyNote}
              </p>
            )}

            {open && (
              <ul className="border-t border-hairline px-5 py-2 sm:px-6">
                {findings.length === 0 && (
                  <li className="py-2 text-xs text-fg-subtle">
                    Las divergencias de este tema ya no están en el corpus — probablemente se
                    reclasificaron. Volvé a correr <code>--patterns</code>.
                  </li>
                )}
                {findings.map(f => (
                  <li key={f.id} className="border-b border-hairline py-2 last:border-0">
                    <p className="font-serif text-[15px] text-fg">
                      <span className="font-mono text-xs tabular-nums text-fg-subtle">{f.moveNumber}.</span>{' '}
                      {f.movePlayed} <span className="font-sans text-sm text-fg-subtle">en vez de</span>{' '}
                      {f.sfTop3[0]?.moveSan}{' '}
                      <span className="font-sans text-xs text-fg-subtle">
                        (<span className="font-mono tabular-nums">−{f.cpLoss} cp</span>, {f.game?.opponent})
                      </span>
                    </p>
                    {f.explanation && (
                      <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{f.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default PatternsView;
