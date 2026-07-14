import { useState } from 'react';

interface GoalProjections {
  currentElo: number;
  targetElo: number;
  eloGain: number;
  daysRemaining: number;
  monthsRemaining: string;
  avgEloPerTournament: string;
  tournamentsNeeded: number;
  pointsNeededPer9Games: string;
  kFactor: number;
  onTrack: boolean;
  projectedElo: number;
}

interface Achievement {
  name: string;
  icon: string;
  earned: boolean;
}

interface Milestone {
  title: string;
  current: number | string;
  target: number;
  progress: string;
}

interface GoalsTabProps {
  targetElo: number;
  setTargetElo: (v: number) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  goalProjections: GoalProjections;
  achievements: Achievement[];
  nextMilestones: Milestone[];
}

const GoalsTab = ({
  targetElo,
  setTargetElo,
  targetDate,
  setTargetDate,
  goalProjections,
  achievements,
  nextMilestones
}: GoalsTabProps) => {
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // Calculate progress percentage for circular progress
  const progressPercent = Math.min(100,
    ((goalProjections.currentElo - 1651) / (goalProjections.targetElo - 1651)) * 100
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Section with Circular Progress */}
      <div className="relative overflow-hidden bg-surface border border-hairline rounded-lg p-4 sm:p-6 lg:p-8">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left: Goal Info */}
            <div className="flex-1 text-fg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-surface-2 rounded-xl">
                  <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Your Chess Journey</h2>
                  <p className="text-fg-muted text-sm mt-1">Track your path to mastery</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-surface-2 rounded-xl p-4 border border-hairline">
                  <p className="text-fg-muted text-sm mb-1">Current ELO</p>
                  <p className="text-3xl font-bold tabular-nums">{goalProjections.currentElo}</p>
                </div>
                <div className="bg-surface-2 rounded-xl p-4 border border-hairline">
                  <p className="text-fg-muted text-sm mb-1">Target ELO</p>
                  <p className="text-3xl font-bold tabular-nums">{goalProjections.targetElo}</p>
                </div>
              </div>
            </div>

            {/* Right: Circular Progress */}
            <div className="relative text-accent">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  className="stroke-hairline"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-fg tabular-nums">{Math.round(progressPercent)}%</p>
                <p className="text-sm text-fg-muted">Progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Settings */}
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-surface-2 rounded-xl">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">Set Your Target</h3>
            <p className="text-sm text-fg-muted">Define your chess goals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 text-sm font-bold text-fg-muted">Target ELO Rating</label>
            <div className="relative">
              <input
                type="number"
                value={targetElo}
                onChange={(e) => setTargetElo(parseInt(e.target.value))}
                className="w-full px-4 py-3 pl-12 text-lg font-semibold border border-hairline bg-surface text-fg rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all tabular-nums"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-fg-muted">Target Achievement Date</label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 pl-12 text-lg font-semibold border border-hairline bg-surface text-fg rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-2 rounded-lg border border-hairline p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-surface rounded-xl">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-fg-muted uppercase">ELO Needed</h3>
          </div>
          <p className={`text-5xl font-bold mb-2 tabular-nums ${goalProjections.eloGain > 0 ? 'text-fg' : 'text-win'}`}>
            {goalProjections.eloGain > 0 ? '+' : ''}{goalProjections.eloGain}
          </p>
          <p className="text-sm text-fg-muted tabular-nums">
            {goalProjections.currentElo} → {goalProjections.targetElo}
          </p>
        </div>

        <div className="bg-surface-2 rounded-lg border border-hairline p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-surface rounded-xl">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-fg-muted uppercase">Time Left</h3>
          </div>
          <p className="text-5xl font-bold text-fg mb-2 tabular-nums">{goalProjections.monthsRemaining}</p>
          <p className="text-sm text-fg-muted tabular-nums">months ({goalProjections.daysRemaining} days)</p>
        </div>

        <div className="bg-surface-2 rounded-lg border border-hairline p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl bg-surface ${goalProjections.onTrack ? 'text-win' : 'text-draw'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={goalProjections.onTrack ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-fg-muted uppercase">Status</h3>
          </div>
          <p className={`text-4xl font-bold mb-2 ${goalProjections.onTrack ? 'text-win' : 'text-draw'}`}>
            {goalProjections.onTrack ? '✓ On Track' : '⚠ Push Hard'}
          </p>
          <p className="text-sm text-fg-muted">
            {goalProjections.onTrack ? 'Keep up the great work!' : 'Need stronger results'}
          </p>
        </div>
      </div>

      {/* Detailed Projections */}
      <div className="bg-surface rounded-lg border border-hairline overflow-hidden">
        <div className="bg-surface-2 p-6 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface rounded-xl">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-fg">Projection Analysis</h3>
              <p className="text-sm text-fg-muted">Your path to the goal based on current performance</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg border border-hairline">
                <span className="font-medium text-fg-muted">Average Gain per Tournament</span>
                <span className="text-2xl font-bold text-fg tabular-nums">{goalProjections.avgEloPerTournament}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg border border-hairline">
                <span className="font-medium text-fg-muted">Tournaments Needed</span>
                <span className="text-2xl font-bold text-fg tabular-nums">{goalProjections.tournamentsNeeded}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-lg border border-hairline">
                <span className="font-medium text-fg-muted">Projected ELO at Current Pace</span>
                <span className={`text-2xl font-bold tabular-nums ${goalProjections.projectedElo >= targetElo ? 'text-win' : 'text-draw'}`}>
                  {Math.round(goalProjections.projectedElo)}
                </span>
              </div>

              <div className="p-4 bg-surface-2 rounded-lg border border-hairline">
                <p className="text-sm text-fg-muted mb-1">Current K-factor</p>
                <p className="text-lg font-bold text-fg tabular-nums">{goalProjections.kFactor}</p>
                <p className="text-xs text-fg-subtle mt-1">Changed from K=40 after Lago Puelo</p>
              </div>
            </div>

            {/* Right: Next Tournament Target */}
            <div className="bg-surface-2 border border-hairline rounded-lg p-6 text-fg">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h4 className="text-xl font-bold">Next Tournament Target</h4>
              </div>

              <p className="text-fg-muted mb-6 text-sm">
                To stay on track for your goal, aim for approximately:
              </p>

              <div className="bg-surface rounded-lg p-6 text-center border border-hairline">
                <p className="text-6xl font-bold mb-2 tabular-nums">{goalProjections.pointsNeededPer9Games}</p>
                <p className="text-lg text-fg-muted mb-4">points out of 9 games</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm bg-surface-2 rounded-lg p-2">
                    <span className="font-medium">Example:</span>
                    <span>6W - 0D - 3L</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm bg-surface-2 rounded-lg p-2">
                    <span className="font-medium">Or:</span>
                    <span>5W - 3D - 1L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-2 rounded-xl">
              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-fg">Achievement Badges</h3>
              <p className="text-sm text-fg-muted">Celebrate your milestones</p>
            </div>
          </div>
          {achievements.length > 4 && (
            <button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="text-sm font-semibold text-accent hover:text-accent-strong transition-colors"
            >
              {showAllAchievements ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-surface-2 rounded-full inline-block mb-3">
              <svg className="w-12 h-12 text-fg-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-fg-muted font-medium">No badges yet</p>
            <p className="text-sm text-fg-subtle mt-1">Keep playing to unlock achievements!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(showAllAchievements ? achievements : achievements.slice(0, 4)).map((badge, idx) => (
              <div key={idx} className="bg-surface-2 rounded-lg p-5 border border-hairline text-center card-hover">
                <div className="text-5xl mb-3">{badge.icon}</div>
                <p className="text-sm font-bold text-fg leading-tight">{badge.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Milestones */}
      <div className="bg-surface rounded-lg border border-hairline p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-surface-2 rounded-xl">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-fg">Next Milestones</h3>
            <p className="text-sm text-fg-muted">Upcoming achievements to unlock</p>
          </div>
        </div>

        <div className="space-y-4">
          {nextMilestones.map((milestone, idx) => (
            <div key={idx} className="bg-surface-2 rounded-lg p-5 border border-hairline">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${parseFloat(milestone.progress) >= 100 ? 'bg-accent text-accent-fg' : 'bg-surface text-fg-subtle'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={parseFloat(milestone.progress) >= 100 ? "M5 13l4 4L19 7" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"} />
                    </svg>
                  </div>
                  <span className="font-bold text-fg">{milestone.title}</span>
                </div>
                <span className="text-sm font-semibold text-fg-muted tabular-nums">
                  {milestone.current} / {milestone.target}
                </span>
              </div>

              <div className="relative">
                <div className="w-full h-4 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, parseFloat(milestone.progress))}%` }}
                  >
                    {parseFloat(milestone.progress) > 20 && (
                      <span className="text-xs font-bold text-white tabular-nums">{milestone.progress}%</span>
                    )}
                  </div>
                </div>
                {parseFloat(milestone.progress) <= 20 && (
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-fg-muted tabular-nums">
                    {milestone.progress}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GoalsTab;
