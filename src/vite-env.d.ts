/// <reference types="vite/client" />

/** Vite-injected environment variables (`VITE_*` from `.env`). */
interface ImportMetaEnv {
  /** `'true'` / `'1'` → use PNG sprites for obstacles (e.g. trees). */
  readonly VITE_USE_OBSTACLE_IMAGES?: string;
  /** `'true'` / `'1'` → draw obstacle collision outlines (local debug). */
  readonly VITE_DEBUG_OBSTACLE_COLLISION?: string;
}

/** Vite `import.meta` shape for this app. */
interface ImportMeta {
  /** Injected `VITE_*` variables. */
  readonly env: ImportMetaEnv;
}
