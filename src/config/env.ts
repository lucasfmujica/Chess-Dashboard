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

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true';
};

const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const env: EnvironmentConfig = {
  app: {
    name: getEnvVar('REACT_APP_NAME', 'Chess Dashboard'),
    version: getEnvVar('REACT_APP_VERSION', '1.0.0'),
    env: getEnvVar('REACT_APP_ENV', 'development') as EnvironmentConfig['app']['env'],
  },
  features: {
    enableLichessSync: getEnvBool('REACT_APP_ENABLE_LICHESS_SYNC', true),
    enableAnalytics: getEnvBool('REACT_APP_ENABLE_ANALYTICS', false),
    enableDebugMode: getEnvBool('REACT_APP_ENABLE_DEBUG_MODE', false),
  },
  storage: {
    prefix: getEnvVar('REACT_APP_STORAGE_PREFIX', 'chess-dashboard'),
    maxSize: getEnvNumber('REACT_APP_MAX_STORAGE_SIZE', 10485760), // 10MB default
  },
  devTools: {
    showComponentNames: getEnvBool('REACT_APP_SHOW_COMPONENT_NAMES', true),
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
