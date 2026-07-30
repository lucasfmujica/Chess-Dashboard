import { SegmentedControl, type Segment } from '../../ui';
import OpeningsFlashcardsTab from './OpeningsFlashcardsTab';
import MoveTrainerPanel from './repertoire/MoveTrainerPanel';

/**
 * The two repertoire trainers, which grade different things.
 *
 * Jugadas asks for the move, on a board, one position at a time — the ~530
 * decisions inside the study PGN. Planes asks for the plan and the golden
 * rule of a whole chapter, which is content that only exists in
 * `repertoire_lines` and never made it into the PGN.
 *
 * Kept side by side rather than merged because they run at different rhythms:
 * a plan is worth revisiting monthly, a move order that already cost a game
 * is worth revisiting this week.
 */

export type TrainView = 'moves' | 'plans';

const VIEWS: Segment<TrainView>[] = [
  { value: 'moves', label: 'Jugadas' },
  { value: 'plans', label: 'Planes' },
];

/** Bare `repertoire-train` means the board; `repertoire-train-plans` the cards. */
export const trainViewFromTab = (activeTab: string): TrainView =>
  activeTab === 'repertoire-train-plans' ? 'plans' : 'moves';

interface RepertoireTrainTabProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

const RepertoireTrainTab = ({ activeTab, onNavigate }: RepertoireTrainTabProps) => {
  const view = trainViewFromTab(activeTab);

  return (
    <div className="space-y-6">
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={next =>
          onNavigate(next === 'moves' ? 'repertoire-train' : 'repertoire-train-plans')
        }
        aria-label="Modo de entrenamiento"
      />

      {view === 'moves' ? <MoveTrainerPanel /> : <OpeningsFlashcardsTab />}
    </div>
  );
};

export default RepertoireTrainTab;
