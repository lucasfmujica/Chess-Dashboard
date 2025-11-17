import React from 'react';

const RepertoireTab = ({
  openingRecommendations,
  openingRepertoireAnalysis,
  mainRepertoire,
  setMainRepertoire
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 border border-blue-200 rounded-lg shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="flex items-center mb-4 text-lg font-semibold">
          <span className="mr-2 text-2xl">💡</span>
          Opening Recommendations
        </h3>
        {openingRecommendations.length > 0 ? (
          <div className="space-y-3">
            {openingRecommendations.map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${rec.priority === 'high' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
                }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{rec.opening}</p>
                    <p className="text-sm text-gray-600">{rec.eco}</p>
                    <p className="mt-1 text-sm">{rec.reason}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rec.priority === 'high' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                    }`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No critical issues found. Your opening repertoire looks solid!</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">White Repertoire</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-600">Main openings (click to toggle):</p>
            <div className="flex flex-wrap gap-2">
              {openingRepertoireAnalysis.white.slice(0, 8).map((opening, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newRepertoire = { ...mainRepertoire };
                    if (newRepertoire.white.includes(opening.eco)) {
                      newRepertoire.white = newRepertoire.white.filter(e => e !== opening.eco);
                    } else {
                      newRepertoire.white.push(opening.eco);
                    }
                    setMainRepertoire(newRepertoire);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${opening.isMain
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {opening.eco}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">Opening</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Games</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Score</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {openingRepertoireAnalysis.white.map((opening, idx) => (
                  <tr key={idx} className={opening.isMain ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{opening.name}</div>
                      <div className="text-xs text-gray-500">{opening.eco}</div>
                    </td>
                    <td className="px-3 py-2 text-center">{opening.games}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {opening.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {opening.needsWork ? (
                        <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                          Needs Work
                        </span>
                      ) : opening.isMain ? (
                        <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                          Main
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                          Backup
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-4 text-lg font-semibold">Black Repertoire</h3>
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-600">Main defenses (click to toggle):</p>
            <div className="flex flex-wrap gap-2">
              {openingRepertoireAnalysis.black.slice(0, 8).map((opening, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newRepertoire = { ...mainRepertoire };
                    if (newRepertoire.black.includes(opening.eco)) {
                      newRepertoire.black = newRepertoire.black.filter(e => e !== opening.eco);
                    } else {
                      newRepertoire.black.push(opening.eco);
                    }
                    setMainRepertoire(newRepertoire);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${opening.isMain
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {opening.eco}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-left text-gray-500">Opening</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Games</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Score</th>
                  <th className="px-3 py-2 text-xs font-medium text-center text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {openingRepertoireAnalysis.black.map((opening, idx) => (
                  <tr key={idx} className={opening.isMain ? 'bg-gray-100' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{opening.name}</div>
                      <div className="text-xs text-gray-500">{opening.eco}</div>
                    </td>
                    <td className="px-3 py-2 text-center">{opening.games}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${opening.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {opening.winRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {opening.needsWork ? (
                        <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">
                          Needs Work
                        </span>
                      ) : opening.isMain ? (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded">
                          Main
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                          Backup
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepertoireTab;
