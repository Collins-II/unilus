type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many attempts. Please wait a few minutes and try again.");
    this.name = "RateLimitError";
  }
}

/** Fixed-window, per-process limiter. Throws RateLimitError once `limit` hits are exceeded within `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new RateLimitError(Math.ceil((bucket.resetAt - now) / 1000));
}

export function resetRateLimits() {
  buckets.clear();
}

type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

export function clientIp(headers: HeaderSource) {
  const read = (name: string) => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  return read("x-forwarded-for")?.split(",")[0]?.trim() || read("x-real-ip")?.trim() || "local";
}
