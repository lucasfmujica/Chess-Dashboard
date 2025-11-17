/**
 * Design System - Theme Configuration
 * Professional chess-themed color palette and design tokens
 */

export const colors = {
  // Chess Board Inspired Palette
  chess: {
    light: '#F0D9B5', // Light square
    dark: '#B58863',  // Dark square
    black: '#1a1a1a', // Black pieces
    white: '#f8f9fa', // White pieces
  },

  // Primary Brand Colors
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Secondary Colors (Gold for achievements)
  gold: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Status Colors
  success: {
    light: '#d1fae5',
    main: '#10b981',
    dark: '#065f46',
  },
  warning: {
    light: '#fed7aa',
    main: '#f59e0b',
    dark: '#92400e',
  },
  error: {
    light: '#fecaca',
    main: '#ef4444',
    dark: '#991b1b',
  },
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1e40af',
  },

  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

export const gradients = {
  primary: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600',
  success: 'bg-gradient-to-r from-green-400 to-emerald-500',
  warning: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  error: 'bg-gradient-to-r from-red-400 to-rose-500',
  info: 'bg-gradient-to-r from-blue-400 to-indigo-500',
  gold: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500',
  subtle: 'bg-gradient-to-br from-slate-50 to-slate-100',
  chess: 'bg-gradient-to-br from-amber-50 via-stone-50 to-slate-100',
};

export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  inner: 'shadow-inner',
  glow: 'shadow-lg shadow-emerald-500/20',
  goldGlow: 'shadow-lg shadow-amber-500/30',
};

export const animations = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  scaleIn: 'animate-scaleIn',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
};

export const spacing = {
  section: 'mb-8',
  card: 'p-6',
  cardLg: 'p-8',
  gap: 'gap-6',
};

export const borderRadius = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

export const typography = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-bold tracking-tight',
  h3: 'text-2xl font-semibold tracking-tight',
  h4: 'text-xl font-semibold',
  h5: 'text-lg font-semibold',
  body: 'text-base',
  small: 'text-sm',
  tiny: 'text-xs',
};

// Utility function to get result color
export const getResultColor = (result) => {
  const colorMap = {
    'W': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'D': 'text-amber-600 bg-amber-50 border-amber-200',
    'L': 'text-rose-600 bg-rose-50 border-rose-200',
  };
  return colorMap[result] || 'text-gray-600 bg-gray-50';
};

// Utility for trend indicators
export const getTrendColor = (trend) => {
  if (trend === 'up') return 'text-emerald-600 bg-emerald-50';
  if (trend === 'down') return 'text-rose-600 bg-rose-50';
  return 'text-blue-600 bg-blue-50';
};
