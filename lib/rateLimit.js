const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100;

const hits = new Map(); // ip -> { count, resetAt }

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now > entry.resetAt) hits.delete(ip);
  }
}, 5 * 60_000).unref();

export default function rateLimit(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  let entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    hits.set(ip, entry);
  } else {
    entry.count++;
  }

  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

  res.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.set("X-RateLimit-Remaining", String(remaining));
  res.set("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > MAX_REQUESTS) {
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      retryAfter,
    });
  }

  next();
}
