import React, { useState } from 'react';

const ArgentinaMap = ({ games }) => {
  const [hoveredProvince, setHoveredProvince] = useState(null);

  // Map tournaments to provinces with location data
  const provinceData = {
    'Buenos Aires': {
      tournaments: ['Club Argentino de Ajedrez', 'Torre Blanca', 'Masters Ciudad'],
      games: games.filter(g =>
        ['Club Argentino de Ajedrez', 'Torre Blanca', 'Masters Ciudad'].includes(g.tournament)
      ),
      coords: { x: '65%', y: '62%' }
    },
    'Chubut': {
      tournaments: ['Abierto Madryn', 'Abierto Lago Puelo'],
      games: games.filter(g =>
        ['Abierto Madryn', 'Abierto Lago Puelo'].includes(g.tournament)
      ),
      coords: { x: '48%', y: '82%' }
    }
  };

  const getProvinceStats = (provinceName) => {
    const data = provinceData[provinceName];
    if (!data || data.games.length === 0) return null;

    const wins = data.games.filter(g => g.result === 'W').length;
    const draws = data.games.filter(g => g.result === 'D').length;
    const losses = data.games.filter(g => g.result === 'L').length;

    return {
      total: data.games.length,
      wins,
      draws,
      losses,
      winRate: ((wins / data.games.length) * 100).toFixed(1),
      tournaments: data.tournaments
    };
  };

  // Map position percentages (relative to image dimensions)
  const provincePositions = {
    'Buenos Aires': { x: '65%', y: '62%' },
    'Chubut': { x: '48%', y: '82%' }
  };

  return (
    <div className="relative p-6 bg-white rounded-lg shadow-lg">
      <h3 className="mb-4 text-xl font-bold text-gray-800">Partidas por Provincia</h3>

      <div className="relative w-full max-w-md mx-auto">
        {/* Argentina map from Wikipedia */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/4/43/Argentina_Map.png"
          alt="Mapa de Argentina"
          className="w-full h-auto rounded-lg shadow-md"
          crossOrigin="anonymous"
        />

        {/* Province markers overlay */}
        {Object.entries(provinceData).map(([provinceName, data]) => {
          const stats = getProvinceStats(provinceName);
          const position = provincePositions[provinceName];

          if (!stats || !position) return null;

          // Color based on number of games
          let markerColor = 'bg-blue-500';
          let ringColor = 'ring-blue-600';
          if (stats.total >= 20) {
            markerColor = 'bg-blue-700';
            ringColor = 'ring-blue-900';
          } else if (stats.total >= 10) {
            markerColor = 'bg-blue-600';
            ringColor = 'ring-blue-700';
          }

          const isHovered = hoveredProvince === provinceName;

          return (
            <div
              key={provinceName}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: position.x, top: position.y }}
              onMouseEnter={() => setHoveredProvince(provinceName)}
              onMouseLeave={() => setHoveredProvince(null)}
            >
              {/* Animated marker */}
              <div className={`
                ${markerColor} ${ringColor}
                w-10 h-10 rounded-full
                flex items-center justify-center
                text-white font-bold text-sm
                shadow-lg ring-2
                cursor-pointer
                transition-all duration-200
                ${isHovered ? 'scale-125 shadow-2xl' : 'scale-100'}
              `}>
                {stats.total}
              </div>

              {/* Province label */}
              <div className={`
                absolute top-12 left-1/2 transform -translate-x-1/2
                bg-gray-900 text-white text-xs px-3 py-1 rounded-full
                whitespace-nowrap shadow-md
                transition-all duration-200
                ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
              `}>
                {provinceName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredProvince && getProvinceStats(hoveredProvince) && (
        <div className="p-4 mt-4 border-2 border-blue-300 rounded-lg shadow-xl bg-gradient-to-br from-blue-50 to-white">
          <h4 className="mb-3 text-lg font-bold text-blue-900">{hoveredProvince}</h4>
          {(() => {
            const stats = getProvinceStats(hoveredProvince);
            return (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-800">{stats.total}</p>
                  </div>
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <p className="text-xs text-gray-600">Win Rate</p>
                    <p className="text-xl font-bold text-blue-600">{stats.winRate}%</p>
                  </div>
                </div>
                <div className="flex gap-4 mb-3 text-sm">
                  <span className="font-semibold text-green-600">✓ {stats.wins}W</span>
                  <span className="font-semibold text-gray-600">⊟ {stats.draws}D</span>
                  <span className="font-semibold text-red-600">✗ {stats.losses}L</span>
                </div>
                <div className="pt-3 border-t">
                  <p className="mb-2 text-xs font-semibold text-gray-700">Torneos:</p>
                  {stats.tournaments.map(tournament => (
                    <p key={tournament} className="mb-1 text-xs text-gray-600">
                      • {tournament}
                    </p>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 p-3 mt-6 text-sm rounded-lg bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-xs font-bold text-white bg-blue-400 border-2 border-blue-500 rounded-full w-7 h-7">
            5
          </div>
          <span className="text-gray-700">1-9 partidas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-xs font-bold text-white bg-blue-500 border-2 border-blue-600 rounded-full w-7 h-7">
            15
          </div>
          <span className="text-gray-700">10-19 partidas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-xs font-bold text-white bg-blue-700 border-2 border-blue-900 rounded-full w-7 h-7">
            25
          </div>
          <span className="text-gray-700">20+ partidas</span>
        </div>
      </div>
    </div>
  );
};

export default ArgentinaMap;
