import type { ComponentType, ReactNode } from 'react';

type Trend = 'up' | 'down';

interface StatCardProps {
  title: ReactNode;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  trend?: Trend;
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend }: StatCardProps) => {
  // Gradient and color based on trend
  const getCardStyle = () => {
    if (trend === 'up') {
      return {
        gradient: 'from-emerald-500 to-teal-600',
        shadow: 'shadow-emerald-500/20',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        accentColor: 'text-emerald-600',
      };
    } else if (trend === 'down') {
      return {
        gradient: 'from-rose-500 to-pink-600',
        shadow: 'shadow-rose-500/20',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        accentColor: 'text-rose-600',
      };
    } else {
      return {
        gradient: 'from-blue-500 to-indigo-600',
        shadow: 'shadow-blue-500/20',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        accentColor: 'text-blue-600',
      };
    }
  };

  const style = getCardStyle();

  return (
    <div className="group relative overflow-hidden">
      {/* Main Card */}
      <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg ${style.shadow} border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 card-hover`}>
        {/* Gradient Accent Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`}></div>

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title */}
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
                {title}
              </p>

              {/* Value */}
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold text-slate-900 tracking-tight">
                  {value}
                </p>
                {trend && (
                  <div className={`flex items-center gap-1 ${style.accentColor}`}>
                    {trend === 'up' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {trend === 'down' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                )}
              </div>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-sm text-slate-500 font-medium">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Icon */}
            {Icon && (
              <div className={`flex-shrink-0 ${style.iconBg} p-3 rounded-xl transition-transform duration-300 group-hover:scale-110`}>
                <Icon className={`w-7 h-7 ${style.iconColor}`} />
              </div>
            )}
          </div>
        </div>

        {/* Hover Effect Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none rounded-2xl`}></div>
      </div>

      {/* Decorative Element */}
      <div className={`absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br ${style.gradient} rounded-full opacity-5 group-hover:opacity-10 transition-opacity duration-300 blur-2xl pointer-events-none`}></div>
    </div>
  );
};

export default StatCard;
