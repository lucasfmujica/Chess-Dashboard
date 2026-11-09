/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_ENV?: 'development' | 'production' | 'test';
  readonly VITE_ENABLE_LICHESS_SYNC?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_DEBUG_MODE?: string;
  readonly VITE_STORAGE_PREFIX?: string;
  readonly VITE_MAX_STORAGE_SIZE?: string;
  readonly VITE_SHOW_COMPONENT_NAMES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
