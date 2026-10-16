// Fixed-window rate limiter for the login endpoint. State is per server
// process: with several instances each keeps its own counters (Supabase Auth
// applies its own limits on top). For a multi-instance deployment, swap this
// for a shared store such as Redis/Upstash.

type Window = { count: number; resetAt: number };

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt; returns whether it is allowed and when the window resets. */
  hit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    this.sweep(now);
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0, remaining: this.limit - 1 };
    }
    w.count++;
    const allowed = w.count <= this.limit;
    return { allowed, retryAfterSeconds: allowed ? 0 : Math.ceil((w.resetAt - now) / 1000), remaining: Math.max(0, this.limit - w.count) };
  }

  reset(key: string) {
    this.windows.delete(key);
  }

  private sweep(now: number) {
    if (this.windows.size < 5000) return;
    for (const [k, w] of this.windows) if (w.resetAt <= now) this.windows.delete(k);
  }
}

/** 5 failed sign-ins per email+IP and 30 per IP, per 15 minutes. */
export const loginLimiterByAccount = new RateLimiter(5, 15 * 60_000);
export const loginLimiterByIp = new RateLimiter(30, 15 * 60_000);
