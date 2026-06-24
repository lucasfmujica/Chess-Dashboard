/**
 * Environment Configuration
 * Centralized access to environment variables with type safety
 */

interface EnvironmentConfig {
  app: {
    name: string;
    version: string;
    env: 'development' | 'production' | 'test';
  };
  features: {
    enableLichessSync: boolean;
    enableAnalytics: boolean;
    enableDebugMode: boolean;
  };
  storage: {
    prefix: string;
    maxSize: number;
  };
  devTools: {
    showComponentNames: boolean;
  };
}

// Vite exposes env vars prefixed with VITE_ on import.meta.env.
const viteEnv = import.meta.env as Record<string, string | undefined>;

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return viteEnv[key] || defaultValue;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = viteEnv[key];
  if (value === undefined) return defaultValue;
  return value === 'true';
};

const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = viteEnv[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const env: EnvironmentConfig = {
  app: {
    name: getEnvVar('VITE_APP_NAME', 'Chess Dashboard'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    env: getEnvVar('VITE_APP_ENV', import.meta.env.MODE) as EnvironmentConfig['app']['env'],
  },
  features: {
    enableLichessSync: getEnvBool('VITE_ENABLE_LICHESS_SYNC', true),
    enableAnalytics: getEnvBool('VITE_ENABLE_ANALYTICS', false),
    enableDebugMode: getEnvBool('VITE_ENABLE_DEBUG_MODE', false),
  },
  storage: {
    prefix: getEnvVar('VITE_STORAGE_PREFIX', 'chess-dashboard'),
    maxSize: getEnvNumber('VITE_MAX_STORAGE_SIZE', 10485760), // 10MB default
  },
  devTools: {
    showComponentNames: getEnvBool('VITE_SHOW_COMPONENT_NAMES', true),
  },
};

// Development helpers
export const isDevelopment = env.app.env === 'development';
export const isProduction = env.app.env === 'production';
export const isTest = env.app.env === 'test';

// Debug logger that only works in development
export const debugLog = (...args: any[]) => {
  if (env.features.enableDebugMode) {
    console.log('[Chess Dashboard Debug]', ...args);
  }
};

// Feature flag checker
export const isFeatureEnabled = (feature: keyof typeof env.features): boolean => {
  return env.features[feature];
};

export default env;
