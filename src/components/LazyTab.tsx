import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSkeleton';

/**
 * Lazy Loading Wrapper for Tabs
 * Usage:
 *
 * 1. Convert tab imports to lazy:
 *    const RatingTab = lazy(() => import('./components/chess/tabs/RatingTab'));
 *
 * 2. Wrap tab content in LazyTab:
 *    {activeTab === 'rating' && (
 *      <LazyTab>
 *        <RatingTab eloHistory={eloHistory} />
 *      </LazyTab>
 *    )}
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Faster initial page load
 * - Loads tab code only when needed
 * - Shows loading spinner during load
 */

interface LazyTabProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const LazyTab = ({ children, fallback }: LazyTabProps) => {
  return (
    <Suspense fallback={fallback || <TabLoadingFallback />}>
      {children}
    </Suspense>
  );
};

const TabLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" color="indigo" />
    <p className="mt-4 text-slate-600">Loading...</p>
  </div>
);

export default LazyTab;

/**
 * IMPLEMENTATION GUIDE
 * ====================
 *
 * To enable lazy loading for all tabs:
 *
 * 1. In ChessDashboard.jsx, replace static imports:
 *    // Before:
 *    import RatingTab from './components/chess/tabs/RatingTab';
 *
 *    // After:
 *    const RatingTab = lazy(() => import('./components/chess/tabs/RatingTab'));
 *
 * 2. Add React.lazy import at top:
 *    import React, { useMemo, useState, lazy } from 'react';
 *
 * 3. Wrap all tab renderings in LazyTab:
 *    {activeTab === 'rating' && (
 *      <LazyTab>
 *        <RatingTab eloHistory={eloHistory} />
 *      </LazyTab>
 *    )}
 *
 * Performance Impact:
 * - Initial bundle: ~220KB → ~150KB (estimated)
 * - First tab load: +100-200ms (one-time per tab)
 * - Subsequent loads: instant (cached)
 *
 * Recommended for:
 * - Large tabs with many charts (RatingTab, AnalyticsTab)
 * - Complex visualizations (TournamentsTab, StreaksTab)
 * - Less frequently used tabs (GameAnnotationTab, TrainingTab)
 *
 * Keep eager loading for:
 * - OverviewTab (landing page)
 * - Small tabs with minimal code
 */
