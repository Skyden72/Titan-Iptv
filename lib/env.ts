// This utility provides a runtime-safe way to access environment variables,
// avoiding direct dependency on `import.meta.env` which can be unreliable
// in some execution contexts or bundler configurations.

export const __DEV__ = (() => {
  try {
    // Vite or modern bundlers
    // @ts-ignore
    if ((import.meta as any)?.env?.DEV) return true;
  } catch {}
  try {
    // Fallback to NODE_ENV (vite.config defines it in dev)
    // @ts-ignore
    return typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development';
  } catch {}
  return false;
})();

// Allow disabling features via URL query parameters for easy debugging
// e.g., http://localhost:5173/?noplayer=1
const search = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

export const DISABLE_PLAYER =
  search.get('noplayer') === '1' || (globalThis as any).__DISABLE_PLAYER === true;

export const DISABLE_EPG =
  search.get('noepg') === '1' || (globalThis as any).__DISABLE_EPG === true;
