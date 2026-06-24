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
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-2xl shadow-2xl p-8">
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left: Goal Info */}
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Your Chess Journey</h2>
                  <p className="text-purple-100 text-sm mt-1">Track your path to mastery</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-purple-100 text-sm mb-1">Current ELO</p>
                  <p className="text-3xl font-bold">{goalProjections.currentElo}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-purple-100 text-sm mb-1">Target ELO</p>
                  <p className="text-3xl font-bold">{goalProjections.targetElo}</p>
                </div>
              </div>
            </div>

            {/* Right: Circular Progress */}
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  stroke="white"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-white">{Math.round(progressPercent)}%</p>
                <p className="text-sm text-purple-100">Progress</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
      </div>

      {/* Goal Settings */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Set Your Target</h3>
            <p className="text-sm text-slate-600">Define your chess goals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700">Target ELO Rating</label>
            <div className="relative">
              <input
                type="number"
                value={targetElo}
                onChange={(e) => setTargetElo(parseInt(e.target.value))}
                className="w-full px-4 py-3 pl-12 text-lg font-semibold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-slate-700">Target Achievement Date</label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 pl-12 text-lg font-semibold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-xl">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase">ELO Needed</h3>
          </div>
          <p className={`text-5xl font-bold mb-2 ${goalProjections.eloGain > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
            {goalProjections.eloGain > 0 ? '+' : ''}{goalProjections.eloGain}
          </p>
          <p className="text-sm text-slate-600">
            {goalProjections.currentElo} → {goalProjections.targetElo}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg border border-purple-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500 rounded-xl">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase">Time Left</h3>
          </div>
          <p className="text-5xl font-bold text-purple-600 mb-2">{goalProjections.monthsRemaining}</p>
          <p className="text-sm text-slate-600">months ({goalProjections.daysRemaining} days)</p>
        </div>

        <div className={`bg-gradient-to-br rounded-2xl shadow-lg border p-6 ${
          goalProjections.onTrack
            ? 'from-emerald-50 to-teal-50 border-emerald-200'
            : 'from-amber-50 to-orange-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${goalProjections.onTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={goalProjections.onTrack ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase">Status</h3>
          </div>
          <p className={`text-4xl font-bold mb-2 ${goalProjections.onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
            {goalProjections.onTrack ? '✓ On Track' : '⚠ Push Hard'}
          </p>
          <p className="text-sm text-slate-600">
            {goalProjections.onTrack ? 'Keep up the great work!' : 'Need stronger results'}
          </p>
        </div>
      </div>

      {/* Detailed Projections */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-indigo-50 p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Projection Analysis</h3>
              <p className="text-sm text-slate-600">Your path to the goal based on current performance</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Stats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-medium text-slate-700">Average Gain per Tournament</span>
                <span className="text-2xl font-bold text-indigo-600">{goalProjections.avgEloPerTournament}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-medium text-slate-700">Tournaments Needed</span>
                <span className="text-2xl font-bold text-purple-600">{goalProjections.tournamentsNeeded}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-medium text-slate-700">Projected ELO at Current Pace</span>
                <span className={`text-2xl font-bold ${goalProjections.projectedElo >= targetElo ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {Math.round(goalProjections.projectedElo)}
                </span>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-slate-600 mb-1">Current K-factor</p>
                <p className="text-lg font-bold text-blue-600">{goalProjections.kFactor}</p>
                <p className="text-xs text-slate-500 mt-1">Changed from K=40 after Lago Puelo</p>
              </div>
            </div>

            {/* Right: Next Tournament Target */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h4 className="text-xl font-bold">Next Tournament Target</h4>
              </div>

              <p className="text-purple-100 mb-6 text-sm">
                To stay on track for your goal, aim for approximately:
              </p>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center border border-white/30">
                <p className="text-6xl font-bold mb-2">{goalProjections.pointsNeededPer9Games}</p>
                <p className="text-lg text-purple-100 mb-4">points out of 9 games</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm bg-white/10 rounded-lg p-2">
                    <span className="font-medium">Example:</span>
                    <span>6W - 0D - 3L</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm bg-white/10 rounded-lg p-2">
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
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Achievement Badges</h3>
              <p className="text-sm text-slate-600">Celebrate your milestones</p>
            </div>
          </div>
          {achievements.length > 4 && (
            <button
              onClick={() => setShowAllAchievements(!showAllAchievements)}
              className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
            >
              {showAllAchievements ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>

        {achievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-slate-100 rounded-full inline-block mb-3">
              <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No badges yet</p>
            <p className="text-sm text-slate-400 mt-1">Keep playing to unlock achievements!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(showAllAchievements ? achievements : achievements.slice(0, 4)).map((badge, idx) => (
              <div key={idx} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-300 text-center card-hover">
                <div className="text-5xl mb-3">{badge.icon}</div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{badge.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Next Milestones */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Next Milestones</h3>
            <p className="text-sm text-slate-600">Upcoming achievements to unlock</p>
          </div>
        </div>

        <div className="space-y-4">
          {nextMilestones.map((milestone, idx) => (
            <div key={idx} className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${parseFloat(milestone.progress) >= 100 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={parseFloat(milestone.progress) >= 100 ? "M5 13l4 4L19 7" : "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"} />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-900">{milestone.title}</span>
                </div>
                <span className="text-sm font-semibold text-slate-600">
                  {milestone.current} / {milestone.target}
                </span>
              </div>

              <div className="relative">
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, parseFloat(milestone.progress))}%` }}
                  >
                    {parseFloat(milestone.progress) > 20 && (
                      <span className="text-xs font-bold text-white">{milestone.progress}%</span>
                    )}
                  </div>
                </div>
                {parseFloat(milestone.progress) <= 20 && (
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-slate-500">
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
