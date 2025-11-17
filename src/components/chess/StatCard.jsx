import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, trend }) => (
  <div className="p-6 bg-white border rounded-lg shadow-md border-slate-200">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-lg ${trend === 'up' ? 'bg-emerald-50' : trend === 'down' ? 'bg-rose-50' : 'bg-blue-50'}`}>
          <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-blue-600'}`} />
        </div>
      )}
    </div>
  </div>
);

export default StatCard;
