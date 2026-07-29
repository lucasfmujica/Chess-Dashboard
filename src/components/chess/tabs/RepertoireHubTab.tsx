import { lazy, type ComponentProps } from 'react';
import LazyTab from '../../LazyTab';
import { SegmentedControl, type Segment } from '../../ui';
import { RepertoireLinesProvider } from '../../../context/RepertoireLinesContext';
import RepertoireTab from './RepertoireTab';
import OpeningsFlashcardsTab from './OpeningsFlashcardsTab';
import TournamentPrepTab from './TournamentPrepTab';

const RepertoireStudyTab = lazy(() => import('./RepertoireStudyTab'));

/**
 * The four repertoire views under one tab.
 *
 * They were four sidebar entries reading the same `repertoire_lines` table
 * into four independent copies. Sharing the provider is the point of the
 * merge — the shorter sidebar is a side effect.
 *
 * Sub-tab ids follow the `parent-child` convention the sidebar already keys
 * its active state on (`Sidebar.tsx`, `activeTab.startsWith(`${id}-`)`).
 * `repertoire-study` deliberately keeps the id it had as a top-level tab.
 */

export type RepertoireView = 'map' | 'lines' | 'train' | 'study';

const VIEWS: Segment<RepertoireView>[] = [
  { value: 'map', label: 'Mapa' },
  { value: 'lines', label: 'Líneas' },
  { value: 'train', label: 'Entrenar' },
  { value: 'study', label: 'Estudio' },
];

/** Bare `repertoire` means the map; anything else is `repertoire-<view>`. */
export const viewFromTab = (activeTab: string): RepertoireView => {
  const suffix = activeTab.slice('repertoire-'.length);
  return VIEWS.some(v => v.value === suffix) ? (suffix as RepertoireView) : 'map';
};

interface RepertoireHubTabProps extends ComponentProps<typeof RepertoireTab> {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

const RepertoireHubTab = ({ activeTab, onNavigate, ...mapProps }: RepertoireHubTabProps) => {
  const view = viewFromTab(activeTab);

  return (
    <RepertoireLinesProvider>
      <div className="space-y-6">
        <SegmentedControl
          options={VIEWS}
          value={view}
          onChange={next => onNavigate(next === 'map' ? 'repertoire' : `repertoire-${next}`)}
          aria-label="Vista de repertorio"
        />

        {view === 'map' && <RepertoireTab {...mapProps} />}
        {view === 'lines' && <TournamentPrepTab />}
        {view === 'train' && <OpeningsFlashcardsTab />}
        {view === 'study' && (
          <LazyTab>
            <RepertoireStudyTab />
          </LazyTab>
        )}
      </div>
    </RepertoireLinesProvider>
  );
};

export default RepertoireHubTab;
