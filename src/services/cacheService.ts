
/**
 * @fileOverview A simple in-memory caching service with a Time-to-Live (TTL).
 * This is useful for reducing redundant API calls for frequently requested data
 * within the lifecycle of a server instance.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Cache TTL: 10 minutes, a standard for weather data to remain fresh.
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/**
 * Retrieves an item from the cache if it exists and has not expired.
 * @param key The unique key for the cache item.
 * @returns The cached data, or null if not found or expired.
 */
function get<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > DEFAULT_TTL_MS) {
    console.log(`[Cache] EXPIRED for key: ${key}. Removing from cache.`);
    cache.delete(key);
    return null;
  }

  console.log(`[Cache] HIT for key: ${key}. Returning saved data.`);
  return entry.data as T;
}

/**
 * Stores an item in the cache with the current timestamp.
 * @param key The unique key for the cache item.
 * @param data The data to store.
 */
function set<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  cache.set(key, entry);
  console.log(`[Cache] SET for key: ${key}. Will expire in ${DEFAULT_TTL_MS / 1000} seconds.`);
}

/**
 * Removes an item from the cache.
 * @param key The unique key of the item to remove.
 */
function clear(key: string): void {
  cache.delete(key);
  console.log(`[Cache] CLEARED key: ${key}`);
}


export const cacheService = {
  get,
  set,
  clear,
};
