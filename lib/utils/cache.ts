/**
 * Persistent cache backed by localStorage + in-memory Map.
 *
 * - Reads from memory first (fast path)
 * - Falls back to localStorage on cache miss (survives page refresh)
 * - Writes to both on set
 */

const LS_PREFIX = 'rgbpp_cache:';

/** In-memory layer (avoids JSON.parse on every read) */
const memoryCache = new Map<string, unknown>();

/** Initialize memory cache from localStorage on first load */
let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            memoryCache.set(key, JSON.parse(raw));
          } catch {
            // corrupted entry, skip
          }
        }
      }
    }
  } catch {
    // localStorage unavailable (SSR, private browsing, etc.)
  }
}

export function cacheGet<T>(namespace: string, key: string): T | undefined {
  ensureInit();
  const fullKey = `${LS_PREFIX}${namespace}:${key}`;

  // Memory first
  const mem = memoryCache.get(fullKey);
  if (mem !== undefined) return mem as T;

  // localStorage fallback
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      memoryCache.set(fullKey, parsed);
      return parsed;
    }
  } catch {
    // unavailable
  }
  return undefined;
}

export function cacheSet<T>(namespace: string, key: string, value: T): void {
  const fullKey = `${LS_PREFIX}${namespace}:${key}`;
  memoryCache.set(fullKey, value);
  try {
    localStorage.setItem(fullKey, JSON.stringify(value));
  } catch {
    // quota exceeded or unavailable — memory cache still works
  }
}
