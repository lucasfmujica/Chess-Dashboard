import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const EloProgressionChart = ({ eloHistory }) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="mb-4 text-lg font-semibold">ELO Progression</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={eloHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="game" label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }} />
          <YAxis domain={[1400, 1950]} label={{ value: 'ELO', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="p-3 bg-white border border-gray-300 rounded shadow">
                    <p className="font-semibold">Game {data.game}</p>
                    <p className="text-sm text-gray-600">{data.tournament}</p>
                    <p className="text-sm">vs {data.opponent}</p>
                    <p className="text-sm text-gray-500">{data.opening}</p>
                    <p className="font-medium">ELO: {data.elo}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="elo" stroke="#3b82f6" strokeWidth={2} name="ELO" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EloProgressionChart;
