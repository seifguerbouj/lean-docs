const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? 60);
const WINDOW_MS = 60_000;
const hits = new Map(); // apiKey -> { count, start }

// Fixed one-minute window per API key, kept in this process's memory.
export function rateLimit(req, res) {
  const key = req.headers['x-api-key'];
  if (!key) return true; // anonymous requests are not limited here

  const now = Date.now();
  let entry = hits.get(key);
  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { count: 0, start: now };
    hits.set(key, entry);
  }
  entry.count++;
  if (entry.count <= LIMIT) return true;

  const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
  res.writeHead(429, { 'content-type': 'application/json', 'retry-after': String(retryAfter) });
  res.end(JSON.stringify({ error: 'rate_limited' }));
  console.warn(`rate limited key=${key.slice(0, 6)}…`);
  return false;
}
