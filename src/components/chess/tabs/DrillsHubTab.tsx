import { lazy } from 'react';
import LazyTab from '../../LazyTab';
import { SegmentedControl, type Segment } from '../../ui';

const BlunderDrillsTab = lazy(() => import('./BlunderDrillsTab'));
const EndgameDrillsTab = lazy(() => import('./EndgameDrillsTab'));

/**
 * Cálculo and Finales under one tab. Both are "a position, a move, a verdict"
 * and both now run on the same `PuzzleBoard` grading; keeping them one click
 * apart makes switching between them part of a session rather than a
 * navigation decision.
 *
 * Each stays lazily loaded — the engine and the drill lists are the heaviest
 * chunks in the app, and merging the tabs shouldn't merge their bundles.
 */

export type DrillsView = 'calculation' | 'endgames';

const VIEWS: Segment<DrillsView>[] = [
  { value: 'calculation', label: 'Cálculo' },
  { value: 'endgames', label: 'Finales' },
];

/** Bare `drills` means cálculo; anything else is `drills-<view>`. */
export const drillsViewFromTab = (activeTab: string): DrillsView =>
  activeTab === 'drills-endgames' ? 'endgames' : 'calculation';

interface DrillsHubTabProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

const DrillsHubTab = ({ activeTab, onNavigate }: DrillsHubTabProps) => {
  const view = drillsViewFromTab(activeTab);

  return (
    <div className="space-y-6">
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={next => onNavigate(next === 'calculation' ? 'drills' : `drills-${next}`)}
        aria-label="Tipo de drill"
      />

      <LazyTab>{view === 'calculation' ? <BlunderDrillsTab /> : <EndgameDrillsTab />}</LazyTab>
    </div>
  );
};

export default DrillsHubTab;
