// Simple sliding-window rate limiter per key (e.g., user+room).
const WINDOW_MS = 10_000;
const MAX_COUNT = 5;

const buckets: Map<string, number[]> = new Map();

export function canSend(key: string): boolean {
  const now = Date.now();
  const arr = buckets.get(key) || [];
  const filtered = arr.filter(ts => now - ts < WINDOW_MS);
  if (filtered.length >= MAX_COUNT) {
    buckets.set(key, filtered);
    return false;
  }
  filtered.push(now);
  buckets.set(key, filtered);
  return true;
}
