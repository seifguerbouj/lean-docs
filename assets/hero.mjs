// Rebuilds assets/hero.png: real audit output (assets/hero-audit.txt) next to a real page as GitHub renders it.
// Needs Chrome and network (marked + mermaid from jsDelivr).   node assets/hero.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const audit = read('assets/hero-audit.txt').trimEnd().split('\n').map((l) => {
  const cls = l.startsWith('wrong') ? 'w' : l.startsWith('code?') ? 'c' : l.startsWith('lean-docs') ? 'h' : l.startsWith('>') ? 'p' : '';
  return `<div class="${cls}">${esc(l) || '&nbsp;'}</div>`;
}).join('');
const proof = read('assets/hero-proof.txt').trimEnd().split('\n').map((l) =>
  `<div class="${l.startsWith('>') ? 'p' : ''}">${esc(l) || '&nbsp;'}</div>`).join('');
const page = read('examples/axios-sensitive-headers.md').replace(/^---[\s\S]*?\n---\n/, '');

const html = `<!doctype html><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
body{margin:0;background:#0d1117;color:#e6edf3;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;padding:44px;width:1712px}
h1.t{font-size:42px;margin:0 0 8px;letter-spacing:-.7px} p.sub{margin:0 0 30px;color:#8b949e;font-size:19px}
.grid{display:grid;grid-template-columns:880px 1fr;gap:28px;align-items:start}
.col{border:1px solid #30363d;border-radius:12px;background:#0d1117;overflow:hidden}
.hd{padding:12px 18px;border-bottom:1px solid #30363d;background:#161b22;display:flex;justify-content:space-between;font-weight:600;font-size:14px}
.hd .n{color:#8b949e;font-weight:500}
pre.term{margin:0;padding:18px 20px;font:12.4px/1.75 ui-monospace,Menlo,monospace;white-space:pre;color:#c9d1d9;overflow:hidden}
.term .p{color:#3fb950;font-weight:600} .term .h{color:#e6edf3;font-weight:700;margin-top:6px}
.term .w{color:#ffa198} .term .c{color:#e3b341}
.md{padding:6px 30px 20px;font-size:14.5px}
.md h1{font-size:25px;border-bottom:1px solid #30363d;padding-bottom:8px;margin:18px 0 12px}
.md h2{font-size:19px;border-bottom:1px solid #30363d;padding-bottom:6px;margin:20px 0 10px}
.md p{margin:0 0 12px} .md ul{margin:0 0 12px;padding-left:22px}
.md code{background:#6e768166;border-radius:6px;padding:.15em .4em;font:85% ui-monospace,Menlo,monospace}
.md pre{background:#151b23;border-radius:6px;padding:12px 16px;overflow:hidden}.md pre code{background:none;padding:0;font-size:12.5px;line-height:1.5}
.md table{border-collapse:collapse;margin:0 0 14px;font-size:13.5px;width:100%}
.md th,.md td{border:1px solid #30363d;padding:5px 10px;text-align:left;vertical-align:top} .md tr:nth-child(2n){background:#161b22}
.md .mermaid{display:flex;justify-content:center;margin:4px 0 10px} .md .mermaid svg{max-height:800px;width:auto}
.stack{display:grid;gap:28px}
.fade{position:relative;max-height:${process.env.PAGE_MAX || 1640}px;overflow:hidden}
.fade:after{content:"";position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(transparent,#0d1117)}
</style>
<h1 class="t">Your docs are lying. lean-docs finds where, then writes the page that doesn't.</h1>
<p class="sub">Left: real audits of httpx, axios and FastAPI docs, every finding checked against their code. Right: a page it wrote from one axios commit, unedited.</p>
<div class="grid">
  <div class="stack">
    <div class="col"><div class="hd"><span>are these docs still right?</span><span class="n">read-only audit</span></div><pre class="term">${audit}</pre></div>
    <div class="col"><div class="hd"><span>writing and keeping docs</span><span class="n">measured</span></div><pre class="term">${proof}</pre></div>
  </div>
  <div class="col"><div class="hd"><span>doc this feature: axios 6bb12c1</span><span class="n">105 s, one page, diagram included</span></div><div class="fade"><div class="md" id="md"></div></div></div>
</div>
<script>
  const src = ${JSON.stringify(page)};
  document.getElementById('md').innerHTML = marked.parse(src).replace(/<pre><code class="language-mermaid">([\\s\\S]*?)<\\/code><\\/pre>/, (_, d) => '<div class="mermaid">' + d.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&') + '</div>');
  mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { fontSize: '13px' } });
  mermaid.run();
</script>`;

const dir = mkdtempSync(join(tmpdir(), 'lean-docs-hero-'));
writeFileSync(join(dir, 'hero.html'), html);
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
  '--virtual-time-budget=9000', `--window-size=1800,${process.env.HEIGHT || 1900}`,
  `--screenshot=${join(root, 'assets/hero.png')}`, `file://${join(dir, 'hero.html')}`], { stdio: 'ignore' });
console.log('wrote assets/hero.png');
