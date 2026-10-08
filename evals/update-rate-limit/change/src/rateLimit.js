const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? 100);
const ANON_LIMIT = Number(process.env.RATE_LIMIT_ANON_PER_MIN ?? 10);
const WINDOW_MS = 60_000;
const hits = new Map(); // "key:<apiKey>" or "ip:<address>" -> { count, start }

// Fixed one-minute window, kept in this process's memory.
// Keyed requests count per API key; anonymous ones per client IP, with a lower limit.
export function rateLimit(req, res) {
  const key = req.headers['x-api-key'];
  const id = key ? `key:${key}` : `ip:${req.socket.remoteAddress}`;
  const limit = key ? LIMIT : ANON_LIMIT;

  const now = Date.now();
  let entry = hits.get(id);
  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { count: 0, start: now };
    hits.set(id, entry);
  }
  entry.count++;
  if (entry.count <= limit) return true;

  const retryAfter = Math.ceil((entry.start + WINDOW_MS - now) / 1000);
  res.writeHead(429, { 'content-type': 'application/json', 'retry-after': String(retryAfter) });
  res.end(JSON.stringify({ error: 'rate_limited' }));
  console.warn(`rate limited ${id.slice(0, 9)}…`);
  return false;
}
