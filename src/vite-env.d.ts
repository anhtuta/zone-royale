/// <reference types="vite/client" />

/** Vite-injected environment variables (`VITE_*` from `.env`). */
interface ImportMetaEnv {
  /** `'true'` / `'1'` → use PNG sprites for obstacles (e.g. trees). */
  readonly VITE_USE_OBSTACLE_IMAGES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
