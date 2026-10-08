// Builds assets/demo.svg: an animated terminal replaying real lean-docs output (httpx audit, Hono bootstrap, status, a change kept in sync).
//   node assets/demo.mjs
import { writeFileSync } from 'node:fs';

// [kind, text, seconds after the previous line]
const script = [
  ['note', '# httpx: 23 doc pages, checked against the code', 0.4],
  ['cmd', '> are these docs still right? docs/', 0.9],
  ['out', 'lean-docs audit: docs/   ~400 claims checked, 20 wrong', 1.6],
  ['bad', 'wrong  advanced/transports.md:190  httpx.Mounts({...})       no such class', 0.5],
  ['bad', 'wrong  api.md:119                  URL.authority             not on httpx.URL', 0.4],
  ['bad', 'wrong  api.md:7                    "a Client enables HTTP/2"  off by default', 0.4],
  ['note', '# Hono: no feature docs yet', 1.4],
  ['cmd', '> document this repo', 0.9],
  ['out', 'lean-docs bootstrap: docs/features/   11 pages, coverage 0% → 30%', 1.8],
  ['ok', 'page   Defining routes and apps   src/hono.ts, src/hono-base.ts', 0.35],
  ['ok', 'page   CORS                       src/middleware/cors/', 0.35],
  ['ok', 'page   JWT authentication         src/middleware/jwt/, src/utils/jwt/', 0.35],
  ['note', '# after "document the next batch"', 1.4],
  ['cmd', '$ npx lean-docs', 0.9],
  ['out', 'lean-docs: 22 pages, covering 99 of 240 code files (41%)', 0.6],
  ['ok', '  stale: none', 0.3],
  ['ok', '  lint:  all pages pass', 0.3],
  ['note', '# a change undoes a real Hono fix: CSRF now checks OPTIONS', 1.4],
  ['cmd', '$ npx lean-docs affected', 0.9],
  ['bad', 'docs/features/csrf.md: code it covers changed (src/middleware/csrf/index.test.ts,', 0.6],
  ['bad', '  src/middleware/csrf/index.ts), the doc did not', 0.1],
  ['cmd', '> doc this feature', 0.9],
  ['ok', 'docs/features/csrf.md: updated for the change that stops treating OPTIONS as a safe method.', 1.8],
  ['ok', '  Now only GET and HEAD skip the check, and the diagram and Does not say so. Check ok.', 0.3],
];

const W = 860, LINE = 22, TOP = 52, LEFT = 22, HOLD = 4;
const times = [];
let t = 0;
for (const [, , dt] of script) times.push((t += dt));
const T = t + HOLD; // one loop, in seconds
const color = { note: '#8b949e', cmd: '#7ee787', out: '#e6edf3', bad: '#ffa198', ok: '#a5d6ff' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pct = (s) => ((100 * s) / T).toFixed(2);

const css = script.map((_, i) => {
  const a = pct(times[i]);
  return `@keyframes l${i}{0%,${a}%{opacity:0}${(+a + 0.01).toFixed(2)}%,96%{opacity:1}100%{opacity:0}}.l${i}{animation:l${i} ${T}s infinite}`;
}).join('');
const H = TOP + script.length * LINE + 20;
const rows = script.map(([kind, text], i) =>
  `<text class="l${i}" x="${LEFT}" y="${TOP + i * LINE}" fill="${color[kind]}"${kind === 'cmd' ? ' font-weight="700"' : ''}>${esc(text)}</text>`).join('\n');

writeFileSync(new URL('demo.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="lean-docs auditing httpx's docs, documenting Hono from scratch, and showing docs status">
<style>text{font:13.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;opacity:0}${css}</style>
<rect width="${W}" height="${H}" rx="10" fill="#0d1117" stroke="#30363d"/>
<circle cx="20" cy="18" r="6" fill="#ff5f56"/><circle cx="40" cy="18" r="6" fill="#ffbd2e"/><circle cx="60" cy="18" r="6" fill="#27c93f"/>
<text x="${W / 2}" y="22" fill="#8b949e" text-anchor="middle" style="opacity:1;font-size:12px">lean-docs, real output</text>
${rows}
</svg>
`);
console.log(`wrote assets/demo.svg (${script.length} lines, ${T.toFixed(1)} s loop)`);
