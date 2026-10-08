// Parses every mermaid diagram in the given markdown files with real mermaid, in headless Chrome.
//   node evals/diagrams.mjs docs/**/*.md
// Dev-time only (needs Chrome and network for mermaid from jsDelivr). The CLI stays dependency-free.
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// CHROME wins; then the macOS apps; then Chrome or Chromium on PATH (Linux). None: exit 3, and run.sh skips the check.
const onPath = (n) => { try { return execFileSync('which', [n], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const chrome = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']
  .find((p) => p && existsSync(p)) || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(onPath).find(Boolean);
if (process.argv[2] === '--find-chrome') { if (chrome) console.log(chrome); process.exit(chrome ? 0 : 3); }
if (!chrome) { console.log('no Chrome or Chromium found (set CHROME): diagram check skipped'); process.exit(3); }

const blocks = [];
for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    blocks.push({ file, line: text.slice(0, m.index).split('\n').length, code: m[1] });
  }
}

const html = `<!doctype html><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<pre id="out">pending</pre>
<script>
  const blocks = ${JSON.stringify(blocks)};
  mermaid.initialize({ startOnLoad: false });
  (async () => {
    const out = [];
    for (const b of blocks) {
      try { await mermaid.parse(b.code); out.push('ok'); }
      catch (e) { out.push('FAIL ' + String(e.message || e).split('\\n').slice(0, 3).join(' | ')); }
    }
    document.getElementById('out').textContent = JSON.stringify(out);
  })();
</script>`;

const dir = mkdtempSync(join(tmpdir(), 'lean-docs-diagrams-'));
writeFileSync(join(dir, 'd.html'), html);

const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--virtual-time-budget=15000', '--dump-dom', `file://${join(dir, 'd.html')}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const raw = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const results = JSON.parse(raw);

let failed = 0;
blocks.forEach((b, i) => {
  if (results[i] === 'ok') return;
  failed++;
  console.log(`${b.file}:${b.line}  ${results[i]}`);
});
console.log(`${blocks.length - failed}/${blocks.length} diagrams parse`);
process.exit(failed ? 1 : 0);
