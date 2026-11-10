import { isWeakSignal, type CandidateSplit } from '../../../../utils/candidateSplit';

interface MomentSplitSummaryProps {
  split: CandidateSplit;
}

/**
 * The candidate split read from post-OTB moments. Shown beside the drill-based
 * split in Registro and Overview; `n = asked` is always visible and fewer than
 * 15 answers is called out as a weak signal rather than shown as a trend.
 */
const MomentSplitSummary = ({ split }: MomentSplitSummaryProps) => (
  <div className="text-xs text-fg-muted tabular-nums">
    <span className="font-medium text-fg">Partidas OTB:</span>{' '}
    {split.asked === 0 ? (
      'sin momentos respondidos todavía'
    ) : (
      <>
        {split.missedPct}% no se me ocurrió · {split.rejected} la descarté · <span className="font-mono">n = {split.asked}</span>
      </>
    )}
    {isWeakSignal(split.asked) && split.asked > 0 && (
      <span className="ml-1.5 rounded-sm border border-hairline bg-surface-2 px-1.5 py-0.5 text-fg-muted">señal débil</span>
    )}
  </div>
);

export default MomentSplitSummary;
