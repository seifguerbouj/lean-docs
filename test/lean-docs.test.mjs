// npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, codePaths, codeRows, affected, coverage, reviewedIn, sharedWithoutSymbols, parseNameStatus, index, wiki, obsidian, notion, relink, fileUrl, pythonEnclosing, VERSION } from '../skills/lean-docs/scripts/lean-docs.mjs';

const tail = '\n## Code\n\n- `package.json`\n\n## Does not\n\n- y\n\n## Breaks when\n\n- z\n';
const ok = '# X\n\nDoes a thing.\n\n## How it works\n\n1. A\n2. B\n' + tail;
const msgs = (md, o) => check(md, o).map((p) => p.msg).join('\n');
const how = (diagram) => '# X\n\nDoes a thing.\n\n## How it works\n\n```mermaid\n' + diagram + '\n```\n' + tail;

test('minimal doc passes', () => assert.deepEqual(check(ok), []));

test('examples: before fails, after passes', () => {
  const dir = new URL('../examples/', import.meta.url);
  assert.ok(check(readFileSync(new URL('before.md', dir), 'utf8')).length > 20);
  assert.deepEqual(check(readFileSync(new URL('after.md', dir), 'utf8')), []);
});

// shape
test('required sections', () => assert.match(msgs('# X\n\nHi.\n'), /missing "## How it works"[\s\S]*missing "## Does not"/));
test('how it works needs a diagram or steps', () =>
  assert.match(msgs('# X\n\nHi.\n\n## How it works\n\nIt works.\n' + tail), /needs a mermaid diagram/));
test('banned section', () => assert.match(msgs(ok + '\n## Overview\n\nhi\n'), /"Overview" is not allowed/));
test('sub-heading', () => assert.match(msgs(ok + '\n### More\n'), /sub-heading/));
test('missing opening', () => assert.match(msgs('# X\n\n## How it works\n\n1. a\n' + tail), /missing an opening/));
test('long opening', () => assert.match(msgs(ok.replace('Does a thing.', 'A. B. C.')), /3 sentences/));
test('jargon opening', () => assert.match(msgs(ok.replace('Does a thing.', 'Calls `a` then `b`.')), /opening has 2 code names/));
test('too long', () => assert.match(msgs(ok + 'line\n'.repeat(60)), /max 60/));
test('diagram lines do not count', () =>
  assert.deepEqual(check(how('flowchart TD\n' + Array.from({ length: 70 }, (_, i) => `N${i} --> N${i + 1}`).join('\n'))), []));

// readability
test('long sentence', () => assert.match(msgs(ok + '\n' + 'word '.repeat(31) + '\n'), /31-word sentence/));
test('code-name wall', () => assert.match(msgs(ok + '\nUse `a`, `b`, `c` and `d`.\n'), /4 code names/));
test('code names are counted per sentence, not per paragraph', () => assert.deepEqual(check(ok + '\nUse `a` and `b`. Then `c` and `d`. Or `e`.\n'), []));
test('code names fine in tables and Code', () =>
  assert.deepEqual(check(ok + '\n## Code\n\n`a` `b` `c` `d` live here.\n\n| `a` `b` `c` `d` | x |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n'), []));

// bloat
test('filler word', () => assert.match(msgs(ok + '\nA robust thing.\n'), /filler word \("robust"\)/));
test('filler inside code is fine', () => assert.deepEqual(check(ok + '\nRun `simply --robust`.\n'), []));
test('one-row table', () => assert.match(msgs(ok + '\n| a | b |\n|---|---|\n| 1 | 2 |\n'), /table with 1 row/));
test('tiny flow', () => assert.match(msgs(how('flowchart LR\nA --> B')), /2 boxes/));
test('parentheses in a label must be quoted', () => {
  assert.match(msgs(how('flowchart LR\nA[call foo(x)] --> B --> C')), /unquoted \( \)/);
  assert.match(msgs(how('flowchart LR\nA --> B{ok (yes)?} --> C')), /unquoted \( \)/);
  assert.deepEqual(check(how('flowchart LR\nA["call foo(x)"] --> B --> C')), []);
  assert.deepEqual(check(how('flowchart LR\nA((start)) --> B --> C')), [], 'round node shape is fine');
});
test('quotes inside edge labels are flagged', () => {
  assert.match(msgs(how('flowchart TD\nA --> B\nB -- yes, not "Bearer token" --> C')), /edge label/);
  assert.match(msgs(how('flowchart TD\nA --> B\nB -->|not "Bearer"| C')), /edge label/);
  assert.deepEqual(check(how('flowchart TD\nA --> B\nB -->|"no Bearer token"| C')), []);
  assert.deepEqual(check(how('flowchart TD\nA --> B\nB -- yes --> C')), []);
  assert.deepEqual(check(how('flowchart TD\nA --> B\nB -- "no, or URL won\'t parse" --> C')), [], 'fully quoted inline label is fine');
});
test('three-step flow ok', () => assert.deepEqual(check(how('flowchart LR\nA --> B --> C')), []));
test('one-way sequence', () => assert.match(msgs(how('sequenceDiagram\nA->>B: x\nB->>C: y\nC->>D: z')), /back-and-forth/));
test('real sequence ok', () => assert.deepEqual(check(how('sequenceDiagram\nA->>B: req\nB->>C: q\nC-->>B: rows\nB-->>A: res')), []));
test('other diagram types', () => assert.match(msgs(how('pie\n"a": 1')), /only flowchart and sequenceDiagram/));

// portability
test('raw HTML', () => assert.match(msgs(ok + '\n<details>x</details>\n'), /raw HTML/));
test('admonition', () => assert.match(msgs(ok + '\n> [!NOTE]\n> hi\n'), /admonition/));
test('footnote', () => assert.match(msgs(ok + '\nSee this[^1].\n'), /footnote/));
test('relative link', () => assert.match(msgs(ok + '\nSee [code](../src/a.ts).\n'), /relative link/));
test('absolute link ok', () => assert.deepEqual(check(ok + '\nSee [RFC](https://example.com).\n'), []));
test('frontmatter skipped', () => assert.deepEqual(check('---\ntitle: X\nsidebar_position: 3\n---\n' + ok), []));

// staleness
test('stale path with root', () => {
  assert.match(msgs(ok + '\nIn `nope/missing.ts`.\n', { root: '.' }), /does not exist/);
  const repo = new URL('../', import.meta.url).pathname;
  assert.deepEqual(check(ok + '\nIn `skills/lean-docs/SKILL.md`.\n', { root: repo }), []);
});

test('keep-shape allows site features and API name lists', () => {
  const guide = '# Guide\n\n!!! note\n    Admonition.\n\n<details>x</details>\n\nUse `get`, `post`, `put` and `delete`.\n';
  assert.deepEqual(check(guide, { keepShape: true }), []);
  assert.match(msgs(guide + '\nA robust thing.\n', { keepShape: true }), /filler/);
});
test('bare < or { outside backticks is flagged (MDX fails on it), code spans are fine', () => {
  // The two real lines: a Java library's code-shrinking.md, a Python library's sending-requests.md
  assert.match(msgs(ok + '\n| x | "new TypeToken<...>() {}" | y |\n| a | b | c |\n'), /bare < or \{/);
  assert.match(msgs(ok + '\nIt warns "cookies=<...> is deprecated".\n'), /bare < or \{/);
  assert.deepEqual(check(ok + '\nUse `List<T>` and `{}` when a < b.\n'), []);
});
test('keep-shape allows relative links between site pages', () => {
  assert.deepEqual(check('# Guide\n\nSee [completions](completions/_index.md).\n', { keepShape: true }), []);
  assert.match(msgs(ok + '\nSee [completions](completions/_index.md).\n'), /relative link/);
});
test('keep-shape skips shape rules, keeps bloat rules', () => {
  const doc = '# Runbook\n\nA. B. C.\n\n## Overview\n\n### Step 1\n\n' + 'x\n'.repeat(70);
  assert.deepEqual(check(doc, { keepShape: true }), []);
  assert.match(msgs(doc + '\nA robust thing.\n', { keepShape: true }), /filler/);
});

// affected + index

test('codePaths reads the Code section only', () => {
  const doc = '# X\n\nSee `src/elsewhere.ts`.\n\n## Code\n\n| Where | What |\n|---|---|\n| `src/a.ts` `fnName` | x |\n| `src/lib/` | y |\n| `src/b.ts:12-40` | z |\n';
  assert.deepEqual(codePaths(doc), ['src/a.ts', 'src/lib/', 'src/b.ts']);
});

test('affected: code changed, doc not', () => {
  const docs = [{ file: 'docs/a.md', paths: ['src/a.ts', 'src/lib'] }, { file: 'docs/b.md', paths: ['src/b.ts'] }];
  assert.deepEqual(affected(docs, ['src/lib/x.ts', 'README.md']), [{ file: 'docs/a.md', because: ['src/lib/x.ts'] }]);
  assert.deepEqual(affected(docs, ['src/a.ts', 'docs/a.md']), [], 'doc updated in the same change');
  assert.deepEqual(affected(docs, ['src/library.ts']), [], 'prefix of a name is not a folder match');
});

test('CLI affected in a repo with no commits compares against the empty tree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-unborn-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  writeFileSync(join(dir, 'a.ts'), 'v1');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  const out = execFileSync('node', [cli, 'affected', '--strict'], { cwd: dir, encoding: 'utf8' });
  assert.equal(out, 'lean-docs: no stale docs (1 changed file, since the empty tree, no commits yet, uncommitted included)\n');
});

test('CLI affected + index on a real git repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-test-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'src')); mkdirSync(join(dir, 'docs/features'), { recursive: true });
  writeFileSync(join(dir, 'src/a.ts'), 'v1');
  writeFileSync(join(dir, 'docs/features/a.md'), '# Feature A\n\nDoes A. More.\n\n## Breaks when\n\n- x\n\n## Code\n\n| Where | What |\n|---|---|\n| `src/a.ts` | all |\n| `src/z.ts` | none |\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'src/a.ts'), 'v2');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  const out = execFileSync('node', [cli, 'affected'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /docs\/features\/a\.md: code it covers changed \(src\/a\.ts\)/);
  assert.throws(() => execFileSync('node', [cli, 'affected', '--strict'], { cwd: dir, stdio: 'ignore' }));
  const hookIn = (extra) => execFileSync('node', [cli, 'hook'], { cwd: dir, encoding: 'utf8', input: JSON.stringify({ cwd: dir, session_id: 'test-' + Date.now(), ...extra }) });
  const sid = 'test-' + Math.random();
  const hook = JSON.parse(hookIn({ session_id: sid }));
  assert.equal(hook.decision, 'block');
  assert.match(hook.reason, /docs\/features\/a\.md \(covers src\/a\.ts\)/);
  assert.equal(hookIn({ session_id: sid }), '', 'asks only once for the same stale set');
  assert.equal(hookIn({ stop_hook_active: true }), '', 'never while continuing from the hook');
  run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'committed change');
  assert.equal(hookIn({ session_id: 'fresh-' + Math.random() }), '', 'a committed change is CI\'s job, not the hook\'s');
  writeFileSync(join(dir, 'src/a.ts'), 'v3');
  assert.equal(execFileSync('node', [cli, 'hook'], { cwd: tmpdir(), encoding: 'utf8', input: '{}' }), '', 'silent outside a repo');
  const status = execFileSync('node', [cli], { cwd: dir, encoding: 'utf8' });
  assert.match(status, /lean-docs: 1 page, covering 1 of 1 code file \(100%\)/);
  assert.match(status, /stale: docs\/features\/a\.md/);
  assert.match(status, /lint: {2}docs\/features\/a\.md/, 'the sample page lacks required sections');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  const msg = join(dir, '.git', 'MSG');
  writeFileSync(msg, 'refactor\n');
  assert.throws(() => execFileSync('node', [cli, 'affected', '--staged', '--strict', '--message', msg], { cwd: dir, stdio: 'ignore' }));
  writeFileSync(msg, 'refactor\n\nlean-docs-ok: docs/features/a.md\n');
  execFileSync('node', [cli, 'affected', '--staged', '--strict', '--message', msg], { cwd: dir, stdio: 'ignore' });
  assert.match(execFileSync('node', [cli, '--oneline'], { cwd: dir, encoding: 'utf8' }), /^docs 100% · 1 stale · 1 lint\n$/);
  const outside = spawnSync('node', [cli], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(outside.status, 2, 'outside a git repo: exit 2');
  assert.equal(outside.stderr, 'lean-docs: not a git repository. Run it inside one.\n');
  const outsideAffected = spawnSync('node', [cli, 'affected'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(outsideAffected.status, 2);
  assert.equal(outsideAffected.stderr, outside.stderr, 'no git command or --base in the message');
  writeFileSync(join(dir, 'docs/features/b.mdx'), '# Feature B\n\nDoes B.\n\n## Breaks when\n\n- x\n\n## Code\n\n- `src/a.ts`\n');
  assert.match(execFileSync('node', [cli, 'affected'], { cwd: dir, encoding: 'utf8' }), /docs\/features\/a\.md/);
  assert.match(execFileSync('node', [cli], { cwd: dir, encoding: 'utf8' }), /2 pages/, '.mdx pages count');
  const idx = execFileSync('node', [cli, 'index', 'docs/features'], { cwd: dir, encoding: 'utf8' });
  assert.match(idx, /\| \[Feature A\]\(a\.md\) \| Does A\. \|/);
});

test('coverage counts source files only and ranks the gaps', () => {
  const files = ['src/a.ts', 'src/b.ts', 'src/lib/c.ts', 'src/lib/d.ts', 'src/lib/e.ts', 'src/a.test.ts', 'tests/x.py', 'docs/a.md', 'README.md', 'types.d.ts'];
  const c = coverage(files, [{ file: 'docs/a.md', paths: ['src/a.ts'] }]);
  assert.equal(c.total, 5);
  assert.equal(c.covered, 1);
  assert.deepEqual(c.gaps, [['src/lib/', 3], ['src/', 1]]);
  const g = coverage(['api/migrations/versions/0001_init.py', 'db/migrate/20240101_create_users.rb', 'api/models_pb2.py', 'web/api.gen.ts', 'web/__generated__/q.ts', 'benchmarks/jsx/a.ts', 'scripts/release.js', 'api/app.py', 'skills/x/scripts/cli.mjs'], []);
  assert.equal(g.total, 2, 'migrations, generated code, benchmarks and top-level scripts/ are not counted');
  assert.equal(coverage(['.php-cs-fixer.dist.php', 'web/.eslintrc.js', 'src/Client.php'], []).total, 1, 'dotfile configs are not code');
  assert.equal(coverage(['src/App.Tests/RuleTests.cs', 'src/App.UnitTests/A.cs', 'src/App.Tests.Benchmarks/B.cs', 'src/App.Specs/C.cs', 'src/App/Validator.cs', 'src/App.Testing/Helper.cs'], []).total, 2, '.NET test and benchmark projects are not code');
  assert.equal(coverage(['doc/man_docs.go', 'docs/site.js'], []).total, 1, 'a Go doc/ package is code; docs/ is not');
  assert.equal(coverage(['Tests/SessionTests.swift', 'Example/Source/App.swift', 'Source/Core/Session.swift'], []).total, 1, 'SwiftPM Tests/ and Example/ are not code');
  assert.equal(coverage(['test.c', 'src/test.c', 'hiredis.c', 'adapters/libuv.h'], []).total, 2, 'a C test.c suite is not code');
  assert.equal(coverage(['hc/test.py', 'polls/tests.py', 'polls/views.py', 'polls/contest.py'], []).total, 2, 'Django test.py and tests.py are not code');
  assert.equal(coverage(['include/spdlog/fmt/bundled/format.h', 'include/spdlog/fmt/fmt.h', 'src/bundled_fmtlib_format.cpp'], []).total, 2, 'a vendored bundled/ copy is not code');
  assert.equal(coverage(['example_dart/lib/dio.dart', 'example_flutter_app/lib/main.dart', 'dio_test/lib/tests.dart', 'dio/lib/src/dio.dart', 'lib/example_utils.dart'], []).total, 2, 'example_x/ and x_test/ folders are not code');
  assert.equal(coverage(['src/components/svg/BarChart.tsx', 'src/components/Chart.tsx'], []).total, 1, 'generated svg/ icon components are not code');
  assert.equal(coverage(['www/docusaurus.config.ts', 'www/src/components/Hero.tsx', 'packages/server/src/router.ts'], []).total, 1, 'a Docusaurus site folder is not code');
});

test('lean-docs-ok trailers clear a stale doc', () => {
  const docs = [{ file: 'docs/a.md', paths: ['src/a.ts'] }, { file: 'docs/b.md', paths: ['src/b.ts'] }];
  const ok = reviewedIn('Rename a var\n\nlean-docs-ok: docs/a.md\n');
  assert.deepEqual(affected(docs, ['src/a.ts', 'src/b.ts'], ok).map((d) => d.file), ['docs/b.md']);
  assert.deepEqual(affected(docs, ['src/a.ts', 'src/b.ts'], reviewedIn('x\n\nLean-Docs-OK: all')), []);
});

test('line numbers in pages are flagged', () => {
  assert.match(msgs(ok + '\nSee `src/retry.py:14`.\n'), /line numbers drift/);
  assert.deepEqual(check(ok + '\nSee `src/retry.py`.\n'), []);
});

test('Code rows can name symbols; only changes to them make the page stale', () => {
  const doc = '# X\n\n## Code\n\n| Where | What |\n|---|---|\n| `src/cli.mjs` `hook`, `index()` | the `check` command |\n| `src/other.ts` | all |\n';
  assert.deepEqual(codeRows(doc), [{ path: 'src/cli.mjs', symbols: ['hook', 'index', 'check'], fromWhat: ['check'] }, { path: 'src/other.ts', symbols: [] }]);
  const docs = [{ file: 'docs/a.md', rows: codeRows(doc) }];
  const diff = { 'src/cli.mjs': '@@ -1 +1 @@ function coverage() {\n-  a\n+  b\n' };
  assert.deepEqual(affected(docs, ['src/cli.mjs'], new Set(), (f) => diff[f] ?? ''), [], 'coverage() changed, page covers hook and index');
  diff['src/cli.mjs'] = '@@ -9 +9 @@\n export function index(docs) {\n-  x\n+  y\n';
  assert.equal(affected(docs, ['src/cli.mjs'], new Set(), (f) => diff[f] ?? '').length, 1, 'index() changed');
  assert.deepEqual(affected(docs, ['src/cli.mjs'], new Set(), (f) => diff[f] ?? '')[0].symbols, { 'src/cli.mjs': ['index'] }, 'says which function changed');
  assert.equal(affected(docs, ['src/other.ts'], new Set(), () => '')[0].symbols, undefined, 'a whole-file row has nothing narrower to say');
  const near = '@@ -1,3 +1,3 @@\n const hook = 1\n-const index = 2\n+const index = 3\n';
  assert.deepEqual(affected(docs, ['src/cli.mjs'], new Set(), () => near)[0].symbols, { 'src/cli.mjs': ['index'] }, 'a neighbour in the context is not named');
  assert.equal(affected(docs, ['src/other.ts'], new Set(), () => '').length, 1, 'no symbols: any change counts');
});

test('a change that only calls a page\'s symbol does not flag that page', () => {
  const docs = [{ file: 'rooms.md', rows: [{ path: 'room.rb', symbols: ['memberships'] }] }, { file: 'unread.md', rows: [{ path: 'room.rb', symbols: ['unread_memberships'] }] }];
  const call = '@@ -105,3 +105,3 @@\n     def unread_memberships(message)\n-      memberships.visible.update_all(a: 1, b: 2)\n+      memberships.visible.update_all(a: 1)\n     end\n';
  assert.deepEqual(affected(docs, ['room.rb'], new Set(), () => call).map((d) => d.file), ['unread.md']);
  const def = '@@ -3,3 +3,3 @@\n class Room\n-  has_many :memberships\n+  has_many :memberships, dependent: :destroy\n';
  assert.deepEqual(affected(docs, ['room.rb'], new Set(), () => def).map((d) => d.file), ['rooms.md'], 'the association line defines it');
});

test('a parameter or argument named like a page\'s symbol does not flag that page', () => {
  const docs = [{ file: 'requests.md', rows: [{ path: 'Session.swift', symbols: ['request'] }] }, { file: 'uploads.md', rows: [{ path: 'Session.swift', symbols: ['performUpload'] }] }];
  const param = '@@ -1,5 +1,5 @@\n    func performUpload(_ request: UploadRequest) {\n-        setup(for: request, queue: q)\n+        setup(for: request, queue: q, log)\n        finish(with: request)\n    }\n';
  assert.deepEqual(affected(docs, ['Session.swift'], new Set(), () => param).map((d) => d.file), ['uploads.md']);
  const def = '@@ -1,4 +1,4 @@\n    open func request(_ url: URL) {\n-        make(url)\n+        make(url, log)\n    }\n';
  assert.deepEqual(affected(docs, ['Session.swift'], new Set(), () => def).map((d) => d.file), ['requests.md']);
  const cfg = [{ file: 'cfg.md', rows: [{ path: 'Cfg', symbols: ['timeout'] }] }];
  for (const line of ['data class Cfg(val timeout: Int = 10)', 'class C { constructor(private timeout: number = 10) {} }']) {
    assert.deepEqual(affected(cfg, ['Cfg'], new Set(), () => `@@ -1 +1 @@\n+${line}\n`).map((d) => d.file), ['cfg.md'], 'a declared property is API: ' + line);
  }
});

test('Windows line endings', () => {
  const doc = '---\ntitle: X\n---\n' + ok;
  assert.deepEqual(check(doc.replace(/\n/g, '\r\n')), []);
  assert.deepEqual(codePaths(ok.replace(/\n/g, '\r\n')), ['package.json']);
});

test('a Code section inside a code fence is not the page\'s', () => {
  assert.deepEqual(codePaths('# Template\n\n````markdown\n## Code\n| `src/x.ts` | y |\n````\n'), []);
  assert.deepEqual(codePaths('# Page\n\n```js\nconst a = 1\n```\n\n## Code\n\n- `src/a.ts`\n'), ['src/a.ts']);
});

test('files shared by pages without symbols are reported', () => {
  const docs = [
    { file: 'a.md', rows: [{ path: 'src/app.ts', symbols: [] }, { path: 'src/lib/', symbols: [] }] },
    { file: 'b.md', rows: [{ path: 'src/app.ts', symbols: [] }, { path: 'src/lib/', symbols: [] }] },
    { file: 'c.md', rows: [{ path: 'src/app.ts', symbols: ['route'] }] },
  ];
  assert.deepEqual(sharedWithoutSymbols(docs), [['src/app.ts', ['a.md', 'b.md']]]);
});

test('renames and deletions are tracked under the old name', () => {
  const { files, notes } = parseNameStatus('R100\tsrc/a.ts\tsrc/b.ts\nD\tsrc/gone.ts\nM\tsrc/c.ts\n');
  assert.deepEqual(files, ['src/a.ts', 'src/b.ts', 'src/gone.ts', 'src/c.ts']);
  assert.equal(notes.get('src/a.ts'), 'renamed to src/b.ts');
  assert.equal(notes.get('src/gone.ts'), 'deleted');
  assert.equal(affected([{ file: 'd.md', paths: ['src/a.ts'] }], files).length, 1, 'page on the old name is stale');
});

test('index links pages in subfolders relative to the index', () => {
  const page = (t) => `# ${t}\n\nDoes ${t}.\n\n## Breaks when\n\n- x\n`;
  const out = index([{ file: 'docs/features/payments/refunds.md', text: page('Refunds') }, { file: 'docs/features/auth.md', text: page('Auth') }], 'docs/features');
  assert.match(out, /\[Refunds\]\(payments\/refunds\.md\)/);
  assert.match(out, /\[Auth\]\(auth\.md\)/);
});

test('index marker is valid MDX; the old HTML-comment marker is still recognised', () => {
  const page = '# A\n\nDoes A.\n\n## Breaks when\n\n- x\n';
  assert.match(index([{ file: 'd/a.md', text: page }], 'd'), /^\[\/\/\]: # \(generated by lean-docs index\)\n/);
  assert.equal(index([{ file: 'd/README.md', text: '<!-- generated by lean-docs index -->\n' + page }, { file: 'd/a.md', text: page }], 'd').split('\n').filter((l) => l.startsWith('| [')).length, 1);
});

test('a change in one Python method only flags the page naming that method', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-py-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const body = (n) => `        x = ${n}\n` + '        pass\n'.repeat(40);
  writeFileSync(join(dir, 'client.py'), `class Client:\n    def send(self):\n${body(1)}\n    def get(self):\n${body(2)}`);
  const page = (sym) => `# ${sym}\n\n## Code\n\n- \`client.py\` \`${sym}\`\n`;
  writeFileSync(join(dir, 'docs/features/send.md'), page('send'));
  writeFileSync(join(dir, 'docs/features/get.md'), page('get'));
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'client.py'), `class Client:\n    def send(self):\n${body(1)}\n    def get(self):\n${body(3)}`);
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /get\.md/);
  assert.doesNotMatch(out, /send\.md/);
});

test('a change in one TypeScript method only flags the page naming that method', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-ts-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const src = (n) => `export class App {\n  route(path: string) {\n    if (path) {\n      this.add(path)\n    }\n    return this\n  }\n\n  async fetch(req: Request): Promise<Response> {\n    for (const r of this.routes) {\n      log(r, ${n})\n    }\n    return new Response('ok')\n  }\n\n  static create = () => new App()\n}\n`;
  writeFileSync(join(dir, 'app.ts'), src(1));
  const page = (sym) => `# ${sym}\n\n## Code\n\n- \`app.ts\` \`${sym}\`\n`;
  for (const sym of ['route', 'fetch', 'create']) writeFileSync(join(dir, `docs/features/${sym}.md`), page(sym));
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'app.ts'), src(2));
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /fetch\.md/);
  assert.doesNotMatch(out, /route\.md|create\.md/);
});

test('a change in one Swift method only flags the page naming that method', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-swift-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const src = (n) => `open class Session {\n    public let rootQueue: DispatchQueue\n\n    open func upload(_ data: Data) {\n        guard !data.isEmpty else { return }\n        log(data)\n    }\n\n    func perform(_ r: Request) {\n        if r.isCancelled {\n            log(${n})\n        }\n    }\n}\n\nextension Session {\n    public var startImmediately: Bool {\n        true\n    }\n\n    public func retryResult(for r: Request) {\n        log(r)\n    }\n}\n`;
  writeFileSync(join(dir, 'Session.swift'), src(1));
  for (const sym of ['upload', 'perform', 'retryResult']) writeFileSync(join(dir, `docs/features/${sym}.md`), `# ${sym}\n\n## Code\n\n- \`Session.swift\` \`${sym}\`\n`);
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'Session.swift'), src(2));
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /perform\.md/);
  assert.doesNotMatch(out, /upload\.md|retryResult\.md/);
});

test('a change in one Dart method only flags the page naming that method', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-dart-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const src = (n) => `abstract class Session {\n  final String root = '';\n\n  /// Sends one upload.\n  Future<T> upload<T>(List<int> data) async {\n    log(data);\n    return send<T>(data);\n  }\n\n  @override\n  void perform(\n    Request r, {\n    bool force = false,\n  }) {\n    if (r.isCancelled) {\n      log(${n});\n    }\n  }\n\n  String get name => root;\n}\n\nvoid retryResult(Request r) {\n  log(r);\n}\n`;
  writeFileSync(join(dir, 'session.dart'), src(1));
  for (const sym of ['upload', 'perform', 'retryResult']) writeFileSync(join(dir, `docs/features/${sym}.md`), `# ${sym}\n\n## Code\n\n- \`session.dart\` \`${sym}\`\n`);
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'session.dart'), src(2));
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /perform\.md/);
  assert.doesNotMatch(out, /upload\.md|retryResult\.md/);
});

test('a reformat or a comment edit doesn\'t flag a page, a deprecation or a code edit does; a deprecation is likely', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-cosmetic-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const src = 'export function foo(a, b) {\n  // add them\n  const s = a + b\n  return s\n}\n';
  writeFileSync(join(dir, 'foo.ts'), src);
  writeFileSync(join(dir, 'docs/features/foo.md'), '# foo\n\n## Code\n\n- `foo.ts` `foo`\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  for (const [edit, flagged] of [
    ['export function foo(a, b) {\n    // add them\n    const s =\n      a+b\n    return s\n}\n', false],
    [src.replace('add them', 'sum them'), false],
    ['// @deprecated use bar\n' + src, true],
    ['/** @deprecated use bar */\n' + src, 'likely'],
    [src.replace('a + b', 'a - b'), true],
  ]) {
    writeFileSync(join(dir, 'foo.ts'), edit);
    const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
    (flagged ? assert.match : assert.doesNotMatch)(out, /foo\.md/, edit);
    if (flagged === 'likely') assert.doesNotMatch(out, /\(check:/, edit);
  }
});

test('a statement moved past an unchanged line flags the page', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-moved-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  writeFileSync(join(dir, 'store.js'), 'export function store(x) {\n  check(x)\n  save(x)\n  return x\n}\n');
  writeFileSync(join(dir, 'docs/features/store.md'), '# store\n\n## Code\n\n- `store.js` `store`\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'store.js'), 'export function store(x) {\n  save(x)\n  check(x)\n  return x\n}\n');
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /store\.md/);
});

test('an edit inside one command of a big main block only flags that command\'s page', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-main-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const cmd = (name) => [`  if (command === '${name}') {`, `    const n = (args[0] ? ${name}(args) : 0);`, ...Array(6).fill(`    log(n);`), `    process.exit(0);`, '  }', ''];
  const src = ['if (import.meta.main) {', '  const args = process.argv.slice(2);', '  const here = (p) => p.trim();', '  const command = args.shift();', '', ...cmd('build'), ...cmd('serve'), ...cmd('lint'), '}', ''];
  writeFileSync(join(dir, 'cli.mjs'), src.join('\n'));
  for (const sym of ['build', 'serve', 'lint']) writeFileSync(join(dir, `docs/features/${sym}.md`), `# ${sym}\n\n## Code\n\n- \`cli.mjs\` \`${sym}\`\n`);
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  const at = src.indexOf("  if (command === 'serve') {");
  // First line, a middle line, the last line and the closing brace of the serve block. `const n = (`
  // looks like an arrow to git, so for an edit just below it git's hunk opens at the blank line above `if`.
  for (const i of [at, at + 2, at + 8, at + 9]) {
    writeFileSync(join(dir, 'cli.mjs'), src.map((l, j) => (j === i ? l + ' // x' : l)).join('\n'));
    const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
    assert.match(out, /serve\.md/, `line ${i + 1}`);
    assert.doesNotMatch(out, /build\.md|lint\.md/, `line ${i + 1}`);
  }
});

test('a symbol that is no longer in its file is reported', () => {
  const repo = new URL('../', import.meta.url).pathname;
  const doc = ok + '\n## Code\n\n- `skills/lean-docs/scripts/lean-docs.mjs` `affected`, `notARealFunction`\n';
  const m = msgs(doc.replace('\n## Code\n\n- `package.json`\n', '\n'), { root: repo });
  assert.match(m, /`notARealFunction` isn't in skills\/lean-docs\/scripts\/lean-docs\.mjs/);
  assert.doesNotMatch(m, /`affected` isn't/);
});

test('affected ranks a flag likely when the change shares a name, string or number with the doc', () => {
  const text = 'Retries `maxRetries` times, 3 by default, then says "gave up".\n\n## Code\n\n| Where | What |\n|---|---|\n| `src/a.ts` `send` | `retryDelay` |\n';
  const docs = [{ file: 'a.md', text, rows: codeRows(text), paths: ['src/a.ts'] }];
  const edit = (from, to) => () => `@@ -1,3 +1,3 @@\n function send() {\n-  ${from}\n+  ${to}\n }\n`;
  const likely = (from, to) => affected(docs, ['src/a.ts'], new Set(), edit(from, to))[0].likely;
  assert.equal(likely('let n = 3;', 'let n = maxRetries;'), true, 'a camelCase name the doc states');
  assert.equal(likely('log("gave up");', 'log("failed");'), true, 'a string the doc quotes');
  assert.equal(likely('let n = retryDelay;', 'let n = retryDelay * 2;'), false, 'a name only the Code table holds');
  assert.equal(likely('const args = by(times);', 'const args = by(times, 1);'), false, 'plain words match prose, so they do not count');
});

test('a function named only in the What cell of a row with symbols still flags the page', () => {
  const doc = '## Code\n\n| Where | What |\n|---|---|\n| `net.c` `f1` | `f1`, `f2` (reads 16 KiB into `buf`), `sds.h` |\n| `x.c` | `f2` |\n';
  const docs = [{ file: 'a.md', rows: codeRows(doc) }];
  const edit = (fn) => () => `@@ -9,2 +9,2 @@\n int ${fn}(void) {\n-  char buf[1024*16];\n+  char buf[1024*32];\n`;
  assert.deepEqual(affected(docs, ['net.c'], new Set(), edit('f2')), [{ file: 'a.md', because: ['net.c'], symbols: { 'net.c': ['f2'] } }]);
  assert.deepEqual(affected(docs, ['net.c'], new Set(), edit('f3')), [], 'f3 is named nowhere; `buf` from What is only a mention');
  const docced = (fn) => () => `@@ -9,4 +9,4 @@\n /* Reads the socket.\n  * Then call g(). */\n int ${fn}(void) {\n-  char buf[1024*16];\n+  char buf[1024*32];\n`;
  assert.equal(affected(docs, ['net.c'], new Set(), docced('f1')).length, 1, 'a C function under its doc comment (Where)');
  assert.equal(affected(docs, ['net.c'], new Set(), docced('f2')).length, 1, 'a C function under its doc comment (What)');
  assert.deepEqual(codeRows(doc)[1], { path: 'x.c', symbols: [] }, 'a whole-file row ignores What');
  assert.deepEqual(check(doc, { root: '/nonexistent' }).filter((m) => /f2/.test(m)), [], 'check does not ask What names to exist');
});

test('list-form Code rows: symbols come from before the colon only', () => {
  assert.deepEqual(codeRows('## Code\n\n- `src/cli.mjs` `status`, `USAGE`: the `noisy:` line and `--help`.\n'), [{ path: 'src/cli.mjs', symbols: ['status', 'USAGE'] }]);
});

test('qualified symbols match by their last part; Class.method is a symbol, not a path', () => {
  assert.deepEqual(codeRows('## Code\n\n- `crates/core/search.rs` `SearchWorker::search_decompress`, `Client.send()`: x\n'),
    [{ path: 'crates/core/search.rs', symbols: ['search_decompress', 'send'] }]);
  assert.deepEqual(codePaths('## Code\n\n- `client.py` `Client.send`\n- `pkg/__init__.py`\n'), ['client.py', 'pkg/__init__.py']);
});

test('double-backtick code spans are code, not prose', () => {
  assert.deepEqual(check(ok + '\nThe message is ``isn\'t in <file>: renamed?``.\n'), []);
});

test('non-ASCII file names are tracked', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-utf8-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'src')); mkdirSync(join(dir, 'docs/features'), { recursive: true });
  writeFileSync(join(dir, 'src/café.ts'), 'v1');
  writeFileSync(join(dir, 'docs/features/a.md'), '# A\n\n## Code\n\n- `src/café.ts`\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'src/café.ts'), 'v2');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  assert.match(execFileSync('node', [cli, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' }), /src\/café\.ts/);
  assert.match(execFileSync('node', [cli, 'coverage'], { cwd: dir, encoding: 'utf8' }), /1 of 1 code file/);
});

test('repo-wide commands work from a subfolder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-sub-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'src')); mkdirSync(join(dir, 'docs/features'), { recursive: true });
  writeFileSync(join(dir, 'src/a.ts'), 'v1');
  writeFileSync(join(dir, 'docs/features/a.md'), '# A\n\nDoes A.\n\n## How it works\n\n1. a\n\n## Does not\n\n- x\n\n## Breaks when\n\n- y\n\n## Code\n\n- `src/a.ts`: all\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'src/a.ts'), 'v2');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  const sub = join(dir, 'src');
  assert.match(execFileSync('node', [cli, 'affected', '--base', 'HEAD'], { cwd: sub, encoding: 'utf8' }), /docs\/features\/a\.md/);
  assert.match(execFileSync('node', [cli, '--oneline'], { cwd: sub, encoding: 'utf8' }), /docs 100% · 1 stale/);
  assert.match(execFileSync('node', [cli, 'check'], { cwd: sub, encoding: 'utf8' }), /a\.md: ok/);
  assert.match(execFileSync('node', [cli, 'coverage', '.'], { cwd: sub, encoding: 'utf8' }), /1 of 1 code file in src\//);
});

test('relative links that point at nothing are reported', () => {
  const repo = new URL('../', import.meta.url).pathname;
  const file = join(repo, 'docs/reference.md');
  const guide = '# Guide\n\nSee [the README](../README.md) and [gone](missing.md#x), and `[x](../y.md)` in code.\n';
  const m = check(guide, { keepShape: true, root: repo, file }).map((p) => p.msg);
  assert.deepEqual(m, ['link to missing.md#x points at nothing']);
});

test('mentions are not uses: link text, quoted phrases', () => {
  assert.deepEqual(check(ok + '\nSee [this page](https://example.com), unedited.\n'), []);
  assert.deepEqual(check(ok + '\nIt rejects "Future work" sections.\n'), []);
  assert.match(msgs(ok + '\nThis document describes the export.\n'), /introduction/);
});

test('Use it: allowed, not counted toward the line cap, but one example stays short', () => {
  const code = (n) => '\n## Use it\n\n```ts\n' + Array.from({ length: n }, (_, i) => `call(${i})`).join('\n') + '\n```\n';
  const long = ok + '\nfiller line.\n'.repeat(40);
  assert.deepEqual(check(long + code(15)).filter((p) => /lines/.test(p.msg)), []);
  assert.match(msgs(ok + code(16)), /example is 16 lines, max 15/);
  assert.deepEqual(check(ok + code(16), { keepShape: true }), []);
  assert.match(msgs(ok + code(3) + '\n```py\nx\n```\n'), /one example in "## Use it"/);
});

test('a Code row inside a folder row is redundant', () => {
  const md = ok.replace('- `package.json`', '| Where | What |\n|---|---|\n| `src/cors/` | all of it |\n| `src/cors/index.ts` | cors() |\n| `src/corsx.ts` | other |');
  const m = msgs(md);
  assert.match(m, /`src\/cors\/index.ts` is inside `src\/cors\/`/);
  assert.doesNotMatch(m, /corsx/);
});

test('status counts a Sphinx or AsciiDoc site as existing docs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-rst-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs')); mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.py'), 'x = 1\n');
  writeFileSync(join(dir, 'docs/guide.rst'), 'Guide\n=====\n');
  writeFileSync(join(dir, 'docs/api.adoc'), '= API\n');
  writeFileSync(join(dir, 'CHANGES.rst'), 'v1\n');
  run('add', '-A');
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /2 other docs found/);
});

test('a link to a page in the same folder is portable', () => {
  assert.doesNotMatch(msgs(ok + '\nSee [Retries](retries.md) and [its config](retries.md#config).\n'), /relative link/);
  assert.match(msgs(ok + '\nSee [Retries](sub/retries.md).\n'), /relative link/);
  assert.match(msgs(ok + '\nSee [Retries](retries.md).\n', { root: '.', file: 'docs/features/x.md' }), /link to retries.md points at nothing/);
});

test('a one-row Code table is fine; a one-row table elsewhere is not', () => {
  const one = '| Where | What |\n|---|---|\n| `package.json` | all |';
  assert.doesNotMatch(msgs(ok.replace('- `package.json`', one)), /1 row/);
  assert.match(msgs(ok + '\n## Config\n\n| Setting | Default |\n|---|---|\n| a | b |\n'), /table with 1 row/);
});

test('coverage skips vendored, compiled, minified and __dunder__ folders', () => {
  const files = ['src/a.ts', 'src/compiled/babel.js', 'third_party/x.c', 'lib/app.min.js', 'src/__testfixtures__/f.ts', 'src/__mocks__/m.ts', 'src/vendored/y.js'];
  assert.equal(coverage(files, []).total, 1);
});

test('a repo whose file list is over 1 MB still works', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-big-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  mkdirSync(join(dir, 'src'));
  const long = 'x'.repeat(40);
  for (let i = 0; i < 25000; i++) writeFileSync(join(dir, 'src', `${long}${i}.js`), '');
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'coverage'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /0 of 25000 code files/);
});

test('coverage counts Lua, Zig, Objective-C and other common languages', () => {
  assert.equal(coverage(['lua/nvim/init.lua', 'src/main.zig', 'Sources/App.m', 'src/core.clj', 'contracts/Token.sol', 'README.md'], []).total, 5);
});

test('affected says what it compared when nothing is stale', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-none-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'a.js'), '1');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'a.js'), '2');
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /^lean-docs: no stale docs \(1 changed file, since HEAD, uncommitted included\)/);
});

test('a top-level change is not pinned on the function above it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-top-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const go = (n) => `package x\n\nfunc A() int {\n\treturn 1\n}\n\nconst Limit = ${n}\n\nfunc B() int {\n\treturn Limit\n}\n`;
  const py = (n) => `def main():\n    return 1\n\n\nif __name__ == "__main__":\n    print(${n})\n`;
  writeFileSync(join(dir, 'x.go'), go(1));
  writeFileSync(join(dir, 'cli.py'), py(1));
  const page = (row) => `# P\n\n## Code\n\n- ${row}\n`;
  writeFileSync(join(dir, 'docs/features/a.md'), page('`x.go` `A`'));
  writeFileSync(join(dir, 'docs/features/limit.md'), page('`x.go` `Limit`'));
  writeFileSync(join(dir, 'docs/features/file.md'), page('`x.go`'));
  writeFileSync(join(dir, 'docs/features/main.md'), page('`cli.py` `main`'));
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'x.go'), go(2));
  writeFileSync(join(dir, 'cli.py'), py(2));
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /limit\.md/);
  assert.match(out, /file\.md/);
  assert.doesNotMatch(out, /\/a\.md|main\.md/);
});

test('CLI: a mistyped command prints usage, help is -h', () => {
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  const typo = spawnSync('node', [cli, 'afected'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(typo.status, 1);
  assert.match(typo.stderr, /unknown command 'afected'\nusage:/);
  assert.match(execFileSync('node', [cli, 'help'], { encoding: 'utf8' }), /^usage:/);
});

test('CLI: a typo fails instead of passing CI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-typo-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'src')); mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'src/a.ts'), 'v1'); writeFileSync(join(dir, 'docs/x.md'), '# X\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  const lean = (...a) => spawnSync('node', [cli, ...a], { cwd: dir, encoding: 'utf8' });
  for (const [a, msg] of [[['coverage', '--json'], /unknown option --json\nusage:/], [['affected', '--strict', '--bse', 'HEAD'], /unknown option --bse/],
    [['check', '--keepshape', 'docs/x.md'], /unknown option --keepshape/], [['coverage', 'nosuchdir', '--min', '70'], /no such folder: nosuchdir/], [['index', 'nosuchdir'], /no such folder: nosuchdir/]]) {
    const r = lean(...a);
    assert.equal(r.status, 2, a.join(' '));
    assert.match(r.stderr, msg);
  }
  // A folder with no code files measures nothing: it says so, never 100%, and a --min gate fails.
  const empty = lean('coverage', 'docs', '--min', '70');
  assert.equal(empty.status, 1);
  assert.match(empty.stdout, /no code files/);
  assert.doesNotMatch(empty.stdout, /100%/);
  assert.equal(lean('coverage', 'docs').status, 0);
  assert.equal(lean('coverage', '--min', '0', 'src').status, 0, 'documented flags still work');
  assert.equal(lean('affected', '--base', 'HEAD', '--strict').status, 0);
});

test('a lean-docs-code line ties a guide to its code, outside code fences only', () => {
  const guide = '[//]: # (lean-docs-code: httpx/_config.py Timeout, `src/client.py` `Client.send`, src/lib/)\n# Timeouts\n\nSome guide.\n\n```md\n[//]: # (lean-docs-code: src/fenced.py)\n```\n';
  assert.deepEqual(codeRows(guide), [
    { path: 'httpx/_config.py', symbols: ['Timeout'], marker: true },
    { path: 'src/client.py', symbols: ['send'], marker: true },
    { path: 'src/lib/', symbols: [], marker: true },
  ]);
  // Not a page: no section demands with --keep-shape, but a path that isn't there is stale.
  const repo = new URL('../', import.meta.url).pathname;
  const marked = (p) => `[//]: # (lean-docs-code: ${p} affected)\n# Guide\n\n## Install\n\nRun it.\n`;
  assert.deepEqual(check(marked('skills/lean-docs/scripts/lean-docs.mjs'), { root: repo, keepShape: true }), []);
  assert.match(msgs(marked('src/gone.mjs'), { root: repo, keepShape: true }), /`src\/gone\.mjs` in the lean-docs-code line does not exist/);
});

test('affected flags a guide carrying a lean-docs-code line when its symbol changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-guide-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/advanced'), { recursive: true });
  const body = (n) => `        x = ${n}\n` + '        pass\n'.repeat(40);
  const src = (a, b) => `class Timeout:\n    def __init__(self):\n${body(a)}\n\nclass Limits:\n    def __init__(self):\n${body(b)}`;
  writeFileSync(join(dir, 'config.py'), src(1, 1));
  writeFileSync(join(dir, 'docs/advanced/timeouts.md'), '[//]: # (lean-docs-code: config.py Timeout)\n# Timeouts\n\n## Setting a timeout\n\nPass `timeout=`.\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  const affectedOut = () => execFileSync('node', [cli, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  writeFileSync(join(dir, 'config.py'), src(1, 2));
  assert.doesNotMatch(affectedOut(), /timeouts\.md/);
  writeFileSync(join(dir, 'config.py'), src(2, 1));
  assert.match(affectedOut(), /timeouts\.md/);
  // `lean-docs check` alone checks the guide as a guide: its own sections are fine.
  assert.match(execFileSync('node', [cli, 'check'], { cwd: dir, encoding: 'utf8' }), /timeouts\.md: ok/);
});

test('wiki: a reader view with areas, no code in the body, one glossary and one troubleshooting page', () => {
  const page = (t, term) => `# ${t}\n\n${t} does a thing for users.\n\n## How it works\n\n1. a\n2. b\n\n## Use it\n\n\`\`\`js\ncall()\n\`\`\`\n\n## Terms\n| Term | Meaning |\n|---|---|\n| ${term} | means ${t} |\n| Ledger | a record book |\n\n## Does not\n\n- fly\n\n## Breaks when\n\n| Symptom | Likely cause | Check |\n|---|---|---|\n| \`Error ${t}\` | x | y |\n\n## Code\n\n| Where | What |\n|---|---|\n| \`src/${t}.js\` \`run\` | all |\n`;
  const docs = [
    { file: 'docs/features/a.md', text: page('Alpha', 'Widget') },
    { file: 'docs/features/b.md', text: page('Beta', 'Gadget') },
    { file: 'docs/features/c.md', text: page('Gamma', 'Thing') },
    { file: 'docs/features/overview.md', text: '# Shop\n\nSells things.\n\n## How it fits together\n\n1. a\n2. b\n\n## Areas\n\n- **Intake**: [Alpha](a.md), [Beta](b.md)\n' },
  ];
  const out = wiki(docs);
  const by = Object.fromEntries(out.map((p) => [p.file, p]));
  assert.deepEqual(out.map((p) => p.file), ['overview.md', 'area-intake.md', 'area-other-features.md', 'a.md', 'b.md', 'c.md', 'glossary.md', 'troubleshooting.md']);
  assert.equal(by['overview.md'].title, 'Shop');
  assert.equal(by['a.md'].parent, 'area-intake.md');
  assert.equal(by['c.md'].parent, 'area-other-features.md'); // a page the overview forgot still gets a home
  const body = by['a.md'].body;
  const [main, eng] = body.split('## For engineers');
  assert.doesNotMatch(main, /src\/Alpha\.js|call\(\)/); // code stays out of the reader's part
  assert.match(eng, /src\/Alpha\.js/); assert.match(eng, /call\(\)/);
  assert.match(main, /## Limits[\s\S]*fly/); assert.match(main, /## When something goes wrong/);
  assert.match(by['glossary.md'].body, /\| Ledger \| a record book \| \[Alpha\]\(a\.md\), \[Beta\]\(b\.md\), \[Gamma\]\(c\.md\) \|/);
  assert.match(by['troubleshooting.md'].body, /Error Alpha[\s\S]*Error Beta[\s\S]*Error Gamma/);
  assert.equal(wiki(docs)[3].hash, by['a.md'].hash, 'same input, same hash: republish skips it');
  docs[0].text = docs[0].text.replace('fly', 'swim');
  assert.notEqual(wiki(docs)[3].hash, by['a.md'].hash);
});

test('wiki CLI writes the pages and pages.json; the overview keeps its own shape in check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-wiki-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  writeFileSync(join(dir, 'docs/features/a.md'), ok);
  writeFileSync(join(dir, 'docs/features/overview.md'), '# Shop\n\nSells things.\n\n## Areas\n\n- **Core**: [X](a.md)\n');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  assert.match(execFileSync('node', [cli, 'wiki'], { cwd: dir, encoding: 'utf8' }), /5 pages in \.lean-docs\/wiki/);
  const tree = JSON.parse(readFileSync(join(dir, '.lean-docs/wiki/pages.json'), 'utf8'));
  assert.deepEqual(tree.map((p) => [p.file, p.parent]), [['overview.md', null], ['area-core.md', 'overview.md'], ['a.md', 'area-core.md'], ['glossary.md', 'overview.md'], ['troubleshooting.md', 'overview.md']]);
  assert.match(readFileSync(join(dir, '.lean-docs/wiki/a.md'), 'utf8'), /^# X\n/);
  assert.deepEqual(check(readFileSync(join(dir, 'docs/features/overview.md'), 'utf8'), { file: 'docs/features/overview.md' }), []);
});

test('obsidian: area folders, title file names, wikilinks that resolve, a folded engineers callout', () => {
  const page = (t) => `# ${t}\n\n${t} does a thing.\n\n## How it works\n\n1. a\n2. b\n\n## Does not\n\n- fly, see [Beta](b.md)\n\n## Breaks when\n\n| Symptom | Likely cause | Check |\n|---|---|---|\n| x | y | z |\n\n## Code\n\n| Where | What |\n|---|---|\n| \`src/${t}.js\` | all |\n`;
  const docs = [{ file: 'docs/features/a.md', text: page('Alpha') }, { file: 'docs/features/b.md', text: page('Beta: two') },
    { file: 'docs/features/overview.md', text: '# Shop\n\nSells.\n\n## Areas\n\n- **Intake**: [Alpha](a.md)\n' }];
  const notes = obsidian(wiki(docs), { repo: 'shop' });
  const by = Object.fromEntries(notes.map((n) => [n.path, n]));
  assert.deepEqual(notes.map((n) => n.path).sort(), ['Glossary.md', 'Intake/Alpha.md', 'Intake/Intake.md', 'Other features/Beta- two.md', 'Other features/Other features.md', 'Shop.md', 'Troubleshooting.md']);
  const a = by['Intake/Alpha.md'].body;
  assert.match(a, /^---\nsource: "shop\/docs\/features\/a\.md"\ngenerated-by: lean-docs/);
  assert.match(a, /\[\[Beta- two\|Beta\]\]/); // the link follows the renamed note
  assert.match(a, /^> \[!info\]- For engineers\n> [\s\S]*`src\/Alpha\.js`/m);
  assert.doesNotMatch(a, /^## For engineers/m);
  const names = new Set(notes.map((n) => n.path.split('/').pop().replace(/\.md$/, '')));
  for (const n of notes) for (const [, t] of n.body.matchAll(/\[\[([^\]|]+)/g)) assert.ok(names.has(t), `${n.path} links to missing note ${t}`);
});

test('notion: tables become <table> blocks, For engineers folds under a toggle heading, text is escaped outside code', () => {
  const [p] = notion([{ file: 'a.md', title: 'A', body: 'Costs $5 for <dir> but `keep $5 <dir>`.\n\n| Symptom | Cause |\n|---|---|\n| `x \\| y` | z |\n\n## For engineers\n\nCalled like:\n\n```sh\nrun <dir>\n```' }]);
  assert.match(p.body, /^Costs \\\$5 for \\<dir\\> but `keep \$5 <dir>`\./);
  assert.match(p.body, /<table header-row="true">\n\t<tr>\n\t\t<td>Symptom<\/td>/);
  assert.match(p.body, /<td>`x \| y`<\/td>/);
  assert.match(p.body, /## For engineers \{toggle="true"\}\n\n?\tCalled like:\n\n\t```sh\n\trun <dir>\n\t```/);
  assert.doesNotMatch(p.body, /^\|/m);
});

test('wiki: owners from the Areas list, a generated line, bare page names become links', () => {
  const page = (t, extra = '') => `# ${t}\n\n${t} does a thing.${extra}\n\n## How it works\n\n1. a\n2. b\n\n## Does not\n\n- fly\n\n## Breaks when\n\n| Symptom | Likely cause | Check |\n|---|---|---|\n| x | y | z |\n\n## Code\n\n| Where | What |\n|---|---|\n| \`src/${t}.js\` | all |\n`;
  const docs = [{ file: 'docs/features/a.md', text: page('Alpha', ' See b.md, not `b.md` in code.') }, { file: 'docs/features/b.md', text: page('Beta') },
    { file: 'docs/features/overview.md', text: '# Shop\n\nSells.\n\n## Areas\n\n- **Intake** (owner: Jana, payments): [Alpha](a.md), [Beta](b.md)\n' }];
  const out = wiki(docs, { repo: 'https://github.com/o/shop' });
  const by = Object.fromEntries(out.map((p) => [p.file, p]));
  assert.match(by['a.md'].body, /^Generated from \[docs\/features\/a\.md\]\(https:\/\/github\.com\/o\/shop\/blob\/main\/docs\/features\/a\.md\)\. Edit it there; changes here are overwritten\.\n\nOwner: Jana, payments\n/);
  assert.match(by['area-intake.md'].body, /Owner: Jana, payments/);
  assert.match(by['a.md'].body, /See \[Beta\]\(b\.md\), not `b\.md` in code\./);
  assert.doesNotMatch(by['a.md'].body, /Source page:/); // the generated line already says it
  assert.equal(wiki(docs)[0].body.startsWith('Generated'), false, 'no repo, no generated line');
});

test('notion: file names go in code so Notion does not link them; relink points page links at the published pages', () => {
  const [p] = notion([{ file: 'a.md', title: 'A', body: 'Edit run.sh or docs/x.md, see [Beta](b.md) and [site](https://x.io/a.md).' }]);
  assert.equal(p.body, 'Edit `run.sh` or `docs/x.md`, see [Beta](b.md) and [site](https://x.io/a.md).');
  const rec = (tool) => ({ target: { tool }, pages: { 'b.md': { id: 'ab-cd', url: tool === 'notion' ? undefined : 'https://wiki.example/b' } } });
  assert.equal(relink(p.body, rec('notion')), 'Edit `run.sh` or `docs/x.md`, see <mention-page url="https://www.notion.so/abcd">Beta</mention-page> and [site](https://x.io/a.md).');
  assert.match(relink('[Beta](b.md)', { target: { tool: 'notion' }, pages: [{ file: 'b.md', pageId: 'x-y' }] }), /notion\.so\/xy/); // an array record works too
  assert.match(relink('see [Beta](b.md#limits) and [C](c.md)', rec('confluence')), /^see \[Beta\]\(https:\/\/wiki\.example\/b\) and \[C\]\(c\.md\)$/); // unpublished pages keep their link
});

test('affected names the owner; status says when the published wiki is behind', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-owner-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true }); mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.js'), '1');
  writeFileSync(join(dir, 'docs/features/a.md'), ok.replace('- `package.json`', '- `src/a.js`'));
  writeFileSync(join(dir, 'docs/features/overview.md'), '# Shop\n\nSells.\n\n## Areas\n\n- **Core** (owner: Jana): [X](a.md)\n');
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  const cli = new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname;
  writeFileSync(join(dir, 'src/a.js'), '2');
  assert.match(execFileSync('node', [cli, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' }), /^docs\/features\/a\.md \(owner: Jana\): code it covers changed/);
  execFileSync('node', [cli, 'wiki'], { cwd: dir });
  const pages = JSON.parse(readFileSync(join(dir, '.lean-docs/wiki/pages.json'), 'utf8'));
  writeFileSync(join(dir, '.lean-docs/publish.json'), JSON.stringify({ pages: Object.fromEntries(pages.map((p) => [p.file, { id: 'x', hash: p.hash, source: p.source }])) }));
  assert.doesNotMatch(execFileSync('node', [cli], { cwd: dir, encoding: 'utf8' }), /wiki:/);
  writeFileSync(join(dir, 'docs/features/a.md'), readFileSync(join(dir, 'docs/features/a.md'), 'utf8').replace('Does a thing.', 'Does two things.'));
  assert.match(execFileSync('node', [cli], { cwd: dir, encoding: 'utf8' }), /wiki: {2}2 of 5 published pages are behind the docs/); // the page and its area list, which quotes its opening
});

test('wiki hashes follow the source docs, not the output: a lean-docs upgrade does not make pages look behind', () => {
  const docs = [{ file: 'docs/features/a.md', text: ok.replace('# X', '# Alpha') }];
  const before = wiki(docs, { repo: 'old-name' });
  const after = wiki(docs, { repo: 'https://github.com/o/new' }); // different generated line, same docs
  assert.deepEqual(after.map((p) => p.hash), before.map((p) => p.hash));
  docs[0].text = docs[0].text.replace('Does a thing.', 'Does two things.');
  const changed = wiki(docs, { repo: 'old-name' }).filter((p, i) => p.hash !== before[i].hash).map((p) => p.file);
  assert.deepEqual(changed, ['overview.md', 'a.md']); // the page, and the overview that quotes its opening
});

test('python: an example def inside a docstring does not steal the edit from the real method', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lean-docs-pydoc-'));
  const run = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  run('init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'docs/features'), { recursive: true });
  const src = (n) => ['class APIRouter:', '    def include_router(self, router, prefix=""):', '        """', '        Include another router.', '',
    '        ```python', '        @users_router.get("/users/")', '        def read_users():', '            return []', '        ```', '        """',
    `        x = ${n}`, '        return x', '', '    def other(self):', '        return 2', ''].join('\n');
  writeFileSync(join(dir, 'routing.py'), src(1));
  const page = (sym) => `# ${sym}\n\n## Code\n\n- \`routing.py\` \`${sym}\`\n`;
  writeFileSync(join(dir, 'docs/features/include.md'), page('include_router'));
  writeFileSync(join(dir, 'docs/features/other.md'), page('other'));
  run('add', '-A'); run('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  writeFileSync(join(dir, 'routing.py'), src(2));
  const out = execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, 'affected', '--base', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  assert.match(out, /include\.md/);
  assert.doesNotMatch(out, /other\.md/);
});

test('the ( ) hint quotes just the box; backticked URLs are not code names', () => {
  assert.match(msgs(how('flowchart TD\n  A[call send(x)] --> B{retry(n)?}')), /write A\["call send\(x\)"\]/);
  assert.match(msgs(how('flowchart TD\n  B{retry(n)?} --> C')), /write B\{"retry\(n\)\?"\}/);
  assert.doesNotMatch(msgs(ok + '\nSee `https://a.dev/x`, `https://b.dev/y`, `https://c.dev/z` and `https://d.dev/w`.\n'), /code names/);
  assert.match(msgs(ok + '\nCall `a`, `b`, `c` and `d`.\n'), /4 code names/);
  assert.doesNotMatch(msgs(ok + '\nA `GET /items/` redirects to `/items/{id}` with `307`, or `404` and `/login`.\n'), /code names/);
});

test('fileUrl: a link to the file on the forge, with the branch', () => {
  assert.equal(fileUrl('https://github.com/o/r', 'main', 'docs/a.md'), 'https://github.com/o/r/blob/main/docs/a.md');
  assert.equal(fileUrl('https://gitlab.com/g/r', 'dev', 'docs/a.md'), 'https://gitlab.com/g/r/-/blob/dev/docs/a.md');
  assert.equal(fileUrl('https://bitbucket.org/t/r', 'main', 'a.md'), 'https://bitbucket.org/t/r/src/main/a.md');
  assert.equal(fileUrl('my-repo', 'main', 'docs/a.md'), 'my-repo/docs/a.md');
});

test('coverage says how many covered files are covered only in part', () => {
  const docs = [{ paths: ['src/routing.py', 'src/app.py'], rows: [{ path: 'src/routing.py', symbols: ['include_router'] }, { path: 'src/app.py', symbols: [] }] }];
  const c = coverage(['src/routing.py', 'src/app.py', 'src/x.py'], docs);
  assert.deepEqual([c.total, c.covered, c.partial], [3, 2, 1]);
});

test('python: an edit to a multi-line signature, such as its return type, belongs to that method', () => {
  const src = ['class APIRouter:', '    def include_router(', '        self,', '        router: "APIRouter",', '        *,', '        prefix: str = "",', '    ) -> None:', '        """Doc."""', '        return None', ''].join('\n');
  for (const line of [3, 6, 7]) assert.equal(pythonEnclosing(src, line), '    def include_router(', `line ${line}`);
  assert.equal(pythonEnclosing(src, 9), '    def include_router(');
  assert.equal(pythonEnclosing(src, 1), 'class APIRouter:');
});

test('one version everywhere: the CLI, package.json and both plugin manifests', () => {
  const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
  assert.equal(read('package.json').version, VERSION);
  assert.equal(read('.claude-plugin/plugin.json').version, VERSION);
  assert.equal(read('.claude-plugin/marketplace.json').plugins[0].version, VERSION);
  assert.equal(execFileSync('node', [new URL('../skills/lean-docs/scripts/lean-docs.mjs', import.meta.url).pathname, '--version'], { encoding: 'utf8' }).trim(), VERSION);
});

test('the opening may hold URL paths and status codes; they are not code names', () => {
  assert.doesNotMatch(msgs('# X\n\nA request to `/items/` gets `307` from `fetchItems`.\n\n## How it works\n\n1. A\n2. B\n' + tail), /opening has/);
  assert.match(msgs('# X\n\nCalls `a` and `b`.\n\n## How it works\n\n1. A\n2. B\n' + tail), /opening has 2 code names/);
});
