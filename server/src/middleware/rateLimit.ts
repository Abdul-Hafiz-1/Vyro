import { Request, Response, NextFunction } from 'express';

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-memory sliding-window IP rate limiter.
 * Protects auth, AI, and payment endpoints without requiring external Redis.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  label: string;
}) {
  const buckets = new Map<string, RateBucket>();

  // Periodically prune expired buckets so memory stays bounded
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, Math.max(options.windowMs, 60_000));
  cleanup.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.label}:${ip}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: `Too many ${options.label} requests. Please wait ${retryAfterSec}s and try again.`
      });
    }

    return next();
  };
}
