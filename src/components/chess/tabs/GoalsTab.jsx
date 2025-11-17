import React from 'react';

const GoalsTab = ({
  targetElo,
  setTargetElo,
  targetDate,
  setTargetDate,
  goalProjections,
  achievements,
  nextMilestones
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 border border-purple-200 rounded-lg shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
        <h3 className="mb-4 text-lg font-semibold">Set Your Goal</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Target ELO</label>
            <input
              type="number"
              value={targetElo}
              onChange={(e) => setTargetElo(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-2 text-sm font-medium text-gray-600">ELO Needed</h3>
          <p className={`text-4xl font-bold ${goalProjections.eloGain > 0 ? 'text-blue-600' : 'text-green-600'}`}>
            {goalProjections.eloGain > 0 ? '+' : ''}{goalProjections.eloGain}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {goalProjections.currentElo} → {goalProjections.targetElo}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-2 text-sm font-medium text-gray-600">Time Remaining</h3>
          <p className="text-4xl font-bold text-purple-600">{goalProjections.monthsRemaining}</p>
          <p className="mt-1 text-sm text-gray-500">months ({goalProjections.daysRemaining} days)</p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-2 text-sm font-medium text-gray-600">Status</h3>
          <div className={`text-3xl font-bold ${goalProjections.onTrack ? 'text-green-600' : 'text-orange-600'}`}>
            {goalProjections.onTrack ? '✓ On Track' : '⚠ Challenging'}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Projection Analysis</h3>
        <p className="mb-4 text-sm text-gray-600">Current K-factor: {goalProjections.kFactor} (changed from K=40 after Abierto Lago Puelo)</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Current ELO</span>
              <span className="font-semibold">{goalProjections.currentElo}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Average Gain per Tournament</span>
              <span className="font-semibold">{goalProjections.avgEloPerTournament}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Tournaments Needed</span>
              <span className="font-semibold">{goalProjections.tournamentsNeeded}</span>
            </div>
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Projected ELO (at current pace)</span>
              <span className={`font-semibold ${goalProjections.projectedElo >= targetElo ? 'text-green-600' : 'text-orange-600'}`}>
                {Math.round(goalProjections.projectedElo)}
              </span>
            </div>
          </div>

          <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <h4 className="mb-3 font-semibold">Next Tournament Target</h4>
            <p className="mb-4 text-sm text-gray-700">
              To stay on track for your goal, aim for approximately:
            </p>
            <div className="p-4 text-center bg-white rounded-lg">
              <p className="text-4xl font-bold text-blue-600">{goalProjections.pointsNeededPer9Games}</p>
              <p className="mt-2 text-sm text-gray-600">points out of 9 games</p>
              <p className="mt-1 text-xs text-gray-500">
                (e.g., 6W-0D-3L or 5W-3D-1L)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Achievement Badges</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {achievements.map((badge, idx) => (
            <div key={idx} className="p-4 text-center border-2 border-yellow-300 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50">
              <div className="mb-2 text-4xl">{badge.icon}</div>
              <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
            </div>
          ))}
        </div>
        {achievements.length === 0 && (
          <p className="py-8 text-center text-gray-500">Keep playing to earn badges!</p>
        )}
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="mb-4 text-lg font-semibold">Next Milestones</h3>
        <div className="space-y-4">
          {nextMilestones.map((milestone, idx) => (
            <div key={idx} className="p-4 border rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-gray-900">{milestone.title}</span>
                <span className="text-sm text-gray-600">{milestone.current} / {milestone.target}</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 transition-all rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${Math.min(100, milestone.progress)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{milestone.progress}% complete</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GoalsTab;
