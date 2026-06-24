import type { ReactNode } from 'react';

interface ChartSkeletonProps {
  height?: number;
}

export const ChartSkeleton = ({ height = 300 }: ChartSkeletonProps) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="h-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg"></div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="animate-pulse bg-white rounded-xl shadow-lg p-6 border border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 w-24 bg-slate-200 rounded"></div>
      <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
    </div>
    <div className="space-y-3">
      <div className="h-8 w-20 bg-slate-300 rounded"></div>
      <div className="h-3 w-32 bg-slate-200 rounded"></div>
    </div>
  </div>
);

interface TableSkeletonProps {
  rows?: number;
}

export const TableSkeleton = ({ rows = 5 }: TableSkeletonProps) => (
  <div className="animate-pulse">
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="h-12 bg-slate-200"></div>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-16 border-t border-slate-100 bg-gradient-to-r from-transparent via-slate-50 to-transparent"></div>
      ))}
    </div>
  </div>
);

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
type SpinnerColor = 'indigo' | 'blue' | 'emerald' | 'purple';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
}

export const LoadingSpinner = ({ size = 'md', color = 'indigo' }: LoadingSpinnerProps) => {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses: Record<SpinnerColor, string> = {
    indigo: 'text-indigo-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <svg
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

interface ChartLoadingWrapperProps {
  isLoading: boolean;
  height?: number;
  children: ReactNode;
}

export const ChartLoadingWrapper = ({ isLoading, height = 300, children }: ChartLoadingWrapperProps) => {
  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }
  return <>{children}</>;
};
