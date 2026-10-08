# lean-docs reference

The details behind the [README](../README.md): the page shape, the CLI, the linter rules, CI, costs and tests.

## The cut list

New pages, trims and bootstraps end with a cut list (everyday edits get one line per page, audits their own block):

```
lean-docs: docs/features/invoice-export.md   59 → 25 lines

cut    Table of Contents                 11  one page needs no map
cut    Introduction + Conclusion          5  said the title twice
cut    Backend walkthrough                3  restated export.ts line by line
cut    Future work                        6  -> open issues instead
wrong  "exports are emailed"              1  no email code in src/
added  How it works diagram                  count-before-fetch and the 413 branch
kept   EXPORT_MAX_ROWS=10000, 413 + error text, dates in UTC
```

## The page

```
# Feature name
One or two plain sentences: what it does, for whom.

## How it works      a mermaid diagram, error path included
## Use it            the common call, copied from tests or examples
## Terms             only if there's jargon
## Config            setting | default | what it changes
## Does not          the limits people assume away
## Breaks when       symptom | likely cause | check
## Code              where | what
```

Over 86 pages (76 from six real-repo bootstraps, plus this repo's own), the median page is 647 words and 468 of them are prose outside code blocks and `## Code`. That's about 2.7 minutes for the whole page at the 238 words per minute [measured for adults reading non-fiction](https://doi.org/10.1016/j.jml.2019.104047); the longest 10% take over 3.3.

Examples, which GitHub renders with their diagrams: real pages written from [an axios commit](../examples/axios-sensitive-headers.md) and [a FastAPI commit](../examples/fastapi-opentelemetry.md), and [a bloated agent doc](../examples/before.md) next to [its lean rewrite](../examples/after.md).

### Why this shape

Each rule comes from how large engineering teams already write docs:

| Practice | Where it comes from | In lean-docs |
|---|---|---|
| Start with a concept, then a task or reference; troubleshooting gets its own topic | [GitLab's topic types](https://docs.gitlab.com/development/documentation/topic_types/) | How it works, Use it, Config, Breaks when |
| A small set of fresh, accurate docs beats a large one in disrepair | [Google's documentation best practices](https://github.com/google/styleguide/blob/gh-pages/docguide/best_practices.md) | 60-line pages, the cut list, trim mode |
| Update docs in the same change as the code | Google's best practices | `affected` in CI, the end-of-turn hook |
| Delete or flag dead docs; duplication is evil | Google's best practices | audit mode, one page per feature |
| A TL;DR for readers who stumble in, consistent structure for readers who seek | [Software Engineering at Google, ch. 10](https://abseil.io/resources/swe-book/html/ch10.html) | the two-sentence opening, fixed sections |
| Review for accuracy, for the audience, and for writing | Software Engineering at Google, ch. 10 | audit, the doc-only reader in the evals, the linter |
| Show a real, working example | [Stripe's docs](https://docs.stripe.com) | Use it, copied from tests or examples |
| Don't mix tutorials into reference | [Diátaxis](https://diataxis.fr) | feature pages only; tutorials stay as guides (`--keep-shape`) |

Google tracks freshness with review dates and owners. lean-docs ties each page to the code it describes instead, so a page goes stale when that code changes, not when a calendar says so.

## Docs that keep up with the code

Each page's `Code` table lists the files it describes. That one table is what keeps docs alive on a large repo, with no AI and no tokens:

```bash
npx lean-docs                     # status: pages, coverage, stale pages, lint, next gaps
npx lean-docs affected            # docs whose code changed on this branch but weren't updated
npx lean-docs affected --strict   # same, exit 1: fail the PR
# a doc that's still right after a change: add "lean-docs-ok: docs/features/x.md" (or "all") to a commit message
npx lean-docs coverage            # share of code files some page covers, and the folders with none
npx lean-docs coverage --min 70   # same, exit 1 below 70%
npx lean-docs coverage packages/api   # one package of a monorepo
npx lean-docs index docs/features > docs/features/README.md   # one table of every feature
```

A guide that keeps its own shape (a public docs site, a runbook) is tied to its code by one line that no renderer shows. It goes anywhere outside a code fence. Each comma-separated item is a path and, optionally, the functions or classes it describes. `affected`, `coverage`, the Stop hook and the Action then treat it like a Code table. `check` treats the doc as a guide and flags a path or name that's gone:

```markdown
[//]: # (lean-docs-code: httpx/_config.py Timeout, httpx/_client.py)
```

On httpx, that line on `docs/advanced/timeouts.md` flagged the guide when the default timeout changed, and stayed quiet for an edit to `Limits` in the same file.

Without the Claude Code plugin (Codex, Cursor, people), a git `commit-msg` hook does the same job locally. It blocks a commit that changes covered code without its page, unless the message says the page is still right:

```bash
#!/bin/sh
# .git/hooks/commit-msg  (chmod +x)
npx lean-docs affected --staged --strict --message "$1"
```

To keep docs health in view while you code, put the one-line status in Claude Code's status line, or in a shell prompt. Install it once with `npm i -g lean-docs` so it starts fast, then in `.claude/settings.json`:

```json
{ "statusLine": { "type": "command", "command": "lean-docs --oneline" } }
```

It prints `docs 41% ✓`, or `docs 41% · 2 stale · 1 lint` when something needs attention, in about 0.1 s.

With [pre-commit](https://pre-commit.com), the same two checks:

```yaml
# .pre-commit-config.yaml
- repo: https://github.com/seifguerbouj/lean-docs
  rev: v0
  hooks: [{ id: lean-docs-check }, { id: lean-docs-stale }]
```

Then run `pre-commit install --hook-type pre-commit --hook-type commit-msg`. `lean-docs-check` lints changed feature pages; `lean-docs-stale` blocks a commit that changes covered code without its page, unless the message says `lean-docs-ok:`.

```
$ npx lean-docs affected
lib/adapters/redirect-sensitive-headers.md: code it covers changed (lib/adapters/http.js), the doc did not
```

- **Pages are easy for agents to find.** Exact env vars, error strings and a `Code` table mean an agent's own search lands on the right page. In our tests, agents updated the page in the same change even without the plugin. Claude Code did on a 4-file repo and on FastAPI, and Haiku did on FastAPI in 4 of 4 runs. The hook matters when the agent was told to keep a change minimal ("a one-line edit in src/rateLimit.js"). On 2026-10-08, 5 runs each: with the plugin 5 of 5 runs updated the page, and the hook fired once per run. Without it, 0 of 5 updated it and 0 of 5 were silent. All 5 named the page as stale and asked first; 3 named only 2 of the 3 stale lines. The hook cost about $0.03 more per run (mean $0.252 vs $0.219).
- **In Claude Code**, the plugin's end-of-turn hook is the safety net. It looks only at uncommitted work, meaning what the agent just changed; older commits on the branch are CI's job. If that work touched code a page describes and not the page, the agent is asked to fix it or say why it's still right. Each page is asked about at most once per session. `LEAN_DOCS_HOOK=off` disables it. Most flags are false (54 of 67 on Cobra), so we measured a false fire on 2026-10-08: two Cobra commits whose page stays right, 3 runs per arm each. The hook fired in 6 of 6 runs; each time the agent searched the page once, said it was still right and edited no doc. A false fire added $0.028, 2.9 s and 2 turns per run (mean $0.249 vs $0.221).
- **In the agent**, "doc this feature" starts from `affected`. It edits the pages that already cover the change before it writes new ones, and reads only the diff and the files it touches.
- **Without an agent**, add `npx lean-docs affected --strict` to pre-commit or CI.

## The linter

The skill won't finish until the doc passes. Run it yourself, or in CI:

```bash
npx lean-docs check               # every page with a Code table, paths and symbols included
npx lean-docs check --root . docs/features/*.md
```

```yaml
# .github/workflows/docs.yml
on: pull_request
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }        # needed to compare against the target branch
      - uses: seifguerbouj/lean-docs@v0
        with:
          paths: docs/features/*.md     # lint these
          fail-on-stale: true           # fail when code changed but its doc didn't
          min-coverage: 50              # fail below 50% docs coverage
```

Every PR gets a summary: the pages it updated, the docs it made stale, the coverage and its biggest gaps, and any lint problems.

| Checks | Fails on |
|---|---|
| Shape | no opening, no `How it works` diagram (or numbered steps for a short feature), missing `Does not` / `Breaks when` / `Code`, more than 60 lines, a `Use it` example over 15 lines |
| Readability | sentences over 30 words, more than 3 code names in one sentence, an opening over 2 sentences or with more than 1 code name |
| Bloat | "This document…", "Future work", filler words, one-row tables, two-box diagrams |
| Portability | raw HTML, admonitions, footnotes, relative links outside the page's folder, a bare `<` or `{` outside backticks (Docusaurus parses `.md` as MDX and fails on it) |
| Staleness | a file path that doesn't exist, or a function named in a `Code` row that isn't in its file (with `--root`, or bare `check`) |

Runbooks, ADRs and public guides keep their own structure. Pass `--keep-shape` to skip the shape rules, the portability rules (a docs site's admonitions, HTML and links between pages are fine there), and the code-name limit (API guides list names). Long sentences, filler and introductions are still flagged. On real guides this drops the noise a lot: httpx's MkDocs docs go from 126 problems to 31, and Hono's from 10 to 0.

## Light on tokens

Bootstrap costs about $0.25–0.45 a page, mostly Sonnet page writers; bigger source files cost more. The skill loads a ~650-token core, then only the files for the mode in use. That's about 1,400 tokens for an audit, 2,300–2,600 to write or trim, and 3,100 to document a whole repo. Installed as a plugin, what sits in every session (the skill and command descriptions) is about 380 tokens, as `claude plugin details lean-docs` reports it. Finding stale docs, linting and indexing are plain scripts, so they cost no tokens at all.

Measured with Claude Code, at list prices:

| Run | Repo size | Time | Cost |
|---|---|---|---|
| document this repo, httpx (16 pages, coverage 0% → 87%) | 23 source files | ~3 min | $3.68 |
| doc this feature, FastAPI OpenTelemetry (5,251-line change) | 3,181 files | 69 s | $0.69 |
| doc this feature, axios security fix | 493 files | 105 s | $0.61 |
| doc this feature, small service | 4 files | 26 s | $0.30 |
| doc this feature, an everyday edit (Hono CORS default) | 237 source files, 22 pages | 21 s | $0.32 |
| audit 6 FastAPI doc pages (5 runs; cost depends on how deep it checks) | 3,181 files | 1–2 min | $0.48–$2.22 |
| audit all of httpx `docs/` (23 pages, ~400 claims, subagents on Sonnet) | 23 source files | 2 min 32 s | $1.53 |
| document this repo, a private app (16 pages, coverage 0% → 55%) | a few hundred source files | ~4 min | $5.37 |
| document this repo, Hono (11 pages, coverage 0% → 30%) | 237 source files | 2 min 22 s | $2.96 |
| document this repo, Cobra (12 pages, 0% → 100%) | 19 source files | ~3 min | $3.36 |
| document this repo, ripgrep (two runs: 18 pages for $8.10, 12 pages for $5.24) | 90 source files | 3–4 min | ~$0.45 a page |
| `lean-docs affected` | 3,181 files | 0.30 s | $0 |

Haiku page writers don't save money. On Cobra (one run each, 13 pages, both 0% → 100%), Haiku writers cost $4.36 in 477 s against $4.17 in 230 s with Sonnet. The main model spent $1.98 instead of $0.96 finding and fixing their mistakes. On 2 hand-checked pages per arm, 4 of 44 Haiku claims were wrong or half right, against 3 of 58 for Sonnet.

## Where it works

| Where | How | Diagrams |
|---|---|---|
| GitHub, GitLab | the file in your repo | rendered |
| Docusaurus, MkDocs, Backstage TechDocs | follows your `docs/` folder, frontmatter and `.md`/`.mdx` extension | need the mermaid plugin on |
| Notion | `/lean-docs:publish` or "publish the docs to Notion": a page tree for readers | rendered |
| Confluence | `/lean-docs:publish` or "publish the docs to Confluence": a page tree for readers | a numbered step list, or a diagram if the space has a Mermaid app |

Confluence publishing was tested against a fake Atlassian connector: a local MCP server with the real tool names that records every call, not a live space. All 9 runs (3 on a feature page, 6 on a guide) created the page under the right parent. Each used the H1 as the title, left it out of the body and sent `contentFormat: "markdown"`. Each reply warned that mermaid shows as code without a Mermaid app. In all 6 guide runs, relative links became plain text and the `lean-docs-code` line was dropped. On a guide, though, the skill didn't load in 3 of 3 runs, and 2 of those left out the `Source:` line. After the skill description named "publish this to Confluence" and "any repo doc", the next 3 of 3 loaded it and followed every rule. How Confluence renders the body, Notion and updating an existing page are untested.

The wiki publishing (`/lean-docs:publish`) was tested on a private app, with 12 generated pages:
- **To a folder, in German, for engineers and non-engineers:** 19 pages (an overview the agent wrote, 4 areas, 12 features, a glossary and a troubleshooting page) for $4.04. Every diagram became a numbered step list, with error branches; code stayed in "For engineers".
- **To the fake Confluence connector:** 19 pages created in 6.6 minutes for $5.24. All 19 landed under the right parent, none kept its `#` title in the body, and a second pass left no `page.md` link unresolved. The agent also noticed that the repo's `.gitignore` ignored the publish record and said how to commit it.
- **Republishing after one changed line:** 0 pages created, 1 updated, the right page id, in 54 s for $0.47.

- **To an Obsidian vault (the same app's pages, local):** 19 notes in area folders for $3.11. Diagrams were kept as diagrams, code went into folded callouts, and all 19 distinct `[[links]]` resolve to a note.
- **To Notion (this repo's own docs, under a private page):** 19 pages in 9 minutes for $3.61, every one under the private parent; nothing else was created in the workspace. Diagrams were kept as diagrams, and links between pages became Notion mentions. That run converted tables with a throwaway script, so `--format notion` now does it. A page built with it showed up in Notion with a native table and a folded engineers section.

- **The same private app, published to that private Notion page and then republished:** the first publish took 8 minutes and $6.46, with links and file names fixed by hand. The script now handles both. It turns plain page names into links and keeps file names from becoming Notion web links. It also writes the "Generated from" line, and `relink` runs the second pass. With those, the republish wrote no files of its own and created no pages. It updated 6 pages in place and left 13 alone, in 2 minutes for $1.04. That run also showed the drift check counting a lean-docs upgrade as changed docs, so page hashes now come from the source docs.

Not tested: a live Confluence space.

Tested by building 102 generated pages (six repos plus this repo's own) with Docusaurus 3.10.2, the default `classic` site, and MkDocs Material 9.7.7 with `mkdocs build --strict`. MkDocs built all of them. Docusaurus failed on 9: 7 indexes on the old HTML-comment marker, and 2 pages with a bare `<...>`. With the new marker and those 2 lines in backticks, which `check` now asks for, both build with 0 errors and 0 warnings.

We also tried a real site config: httpx's `mkdocs.yml`, with an explicit `nav:` and no mermaid fence. Asked to "document the timeouts feature", 2 of 2 runs left the new page out of the built nav and didn't mention that mermaid was off. With the nav and mermaid rule in write step 4, 2 of 2 runs had the page in the built nav. One added a nav entry, and one edited the page already listed there. Both named the missing `pymdownx.superfences` mermaid fence. An earlier wording broke httpx's nav in 1 of 2 runs, which is why the rule now says no other entry may move.

## More results

| Project | What lean-docs did | What it found |
|---|---|---|
| [FastAPI](https://github.com/fastapi/fastapi) `94918c1` | audited 6 pages of `docs/en/docs/advanced/` | 6 wrong claims. With a `response_model`, the data is serialized by Pydantic, not by `jsonable_encoder` as `custom-response.md` says. The proxy guide says the server reads `X-Forwarded-Host`, but uvicorn only reads `-Proto` and `-For`. |
| axios `6bb12c1` | **doc this feature** on a security fix | [This page](../examples/axios-sensitive-headers.md), unedited. It took 105 s and $0.61 on a 493-file repo. A second agent that read only the page answered 6/6 questions, including writing the call. The page also surfaced two traps: a custom transport or `maxRedirects: 0` skips the strip, and a user `beforeRedirect` can put a stripped header back. It followed the repo's `AGENTS.md`, which keeps unreleased features out of the published docs site. |
| httpx `b5addb6` | **document this repo**, starting with no feature docs | 16 pages (timeouts, pool limits, redirects, proxies, SSL, auth, cookies, event hooks, …) and an index, in about 3 minutes for $3.68. The page writers ran on Sonnet, Opus only planned. Coverage went from 0% to 87%, all 16 diagrams parse, and a reader answered 5/5 from the timeouts page alone. An earlier run also caught a bug in httpx: the `WSGITransport` docstring shows `httpx.Client(app=app)`, but `Client` has no `app` argument. |
| A private production app with a large set of existing docs | **document this repo** | 16 pages in under 4 minutes for $5.37, coverage 0% → 55%. The old docs were used as a source and checked against the code: 7 of their claims were wrong. A reader answered 5/5 from one page alone. |
| httpx | **trim** `docs/advanced/timeouts.md` | 49 → 31 lines, with four traps added from the code. One of them: a per-request timeout replaces the client's instead of merging. A reader answered 4/5 from the original page and 5/5 from the trimmed one. |
| [httpx](https://github.com/encode/httpx) `b5addb6` | audited all of `docs/` (23 pages, about 400 claims) in 2 min 32 s for $1.53 | 20 wrong. Examples that crash: `httpx.Mounts` doesn't exist, the custom transport uses the pre-0.18 `handle_request` signature. The API reference lists `Response.next()` and `URL.authority`, which don't exist, and says a `Client` enables HTTP/2 (it's off by default). |
| [axios](https://github.com/axios/axios) `2b169bb` | audited `README.md` | 26 wrong claims. `headers.setContentEncoding()` is in the README and the TypeScript types, but throws at runtime. A `rewrite` function is never called. The CDN snippet pins `1.13.2`, but the package is at `1.20.0`. |
| [FastAPI](https://github.com/fastapi/fastapi) `4b3949c` | **doc this feature** on "Add native OpenTelemetry support", a 5,251-line change in a 3,181-file repo | [This page](../examples/fastapi-opentelemetry.md), unedited. It took 69 s and $0.69, reading the change and not the repo. On 2026-10-08, two reader agents given only the page scored 6/7 and 5.5/7 on 7 questions written from the code (5 traps). Both said the per-signal export URL (`/v1/traces`) is not in the page. Two traps that are easy to miss: with lifespan off, nothing is exported, and the contrib `opentelemetry-instrumentation-fastapi` middleware switches native telemetry off. |
| [Flask](https://github.com/pallets/flask) `d086db8` | **document this repo**, with an existing Sphinx site | 12 pages for $4.46, coverage 0% → 83%, each with a working example. A reader answered 4/4 from the sessions page alone, including why a deploy logs everyone out. Flask's own docs had 9 wrong claims. Two examples crash: `request.arg.get` (it's `request.args`) and a `user_id` view argument on a route that has none. |
| [Hono](https://github.com/honojs/hono) `5f36607` (TypeScript) | **document this repo**, then **the next batch** | First batch: 11 pages (routing, routers, context, validation, RPC client, JWT, CORS, static files, JSX, streaming, cookies) in 2 min 22 s for $2.96, coverage 0% → 30%. Next batch: 11 more pages (auth, CSRF, compression, WebSockets, SSG, …) for $2.25, coverage 30% → 41%, no duplicates. It also fixed a diagram the checker had flagged in the first batch. A reader answered 4/4 from the CORS page alone, including the trap that `credentials: true` with the default origin `*` is a header pair browsers reject. An audit of `MIGRATION.md` found a snippet that doesn't parse (`cf?.hostMetadata?`). |
| [Cobra](https://github.com/spf13/cobra) `adbc881` (Go) | **document this repo**, with an existing docs site | 12 pages in about 3 minutes for $3.36, coverage 0% → 100%. A reader answered 4/4 from the arguments page alone. Checked against the code, Cobra's own site had 4 wrong claims, including a method name that won't compile (`SetHelpCommandGroupId`; it's `SetHelpCommandGroupID`) and a `linkHandler` parameter `GenYamlCustom` never calls. Trimming its 675-line user guide fixed 13 wrong claims (suggestion rules, the `Args` default, `--version`) and kept every heading. |
| [ripgrep](https://github.com/BurntSushi/ripgrep) `3fce3b5` (Rust) | **document this repo** across its crates | 18 pages for $8.10, coverage 0% → 73%, all 18 diagrams parse. ripgrep's own `--help` says `--json` with `--files`, `-l` or `-c` reports an error; no code does that, the last mode just wins. `defs.rs` is shared by 6 pages, and with symbol rows a change to the `--json` flag flags 2 of them. |
| [Gson](https://github.com/google/gson) `845664b` (Java) | **document this repo** across its modules | 18 pages in 5 min 42 s for $6.86, coverage 0% → 83%, all 18 diagrams parse. 37 claims on 3 pages checked by hand, none wrong. Gson's `UserGuide.md` had 6 wrong claims: inner classes do deserialize (Gson falls back to `Unsafe`) and serialize by default, only `Object` adapters are rejected (not `JsonElement`), and the `JsonFormatter` and `JsonCompactFormatter` it names don't exist (it's the public `FormattingStyle`). |
| [Campfire](https://github.com/basecamp/once-campfire) `008ea1a` (Ruby on Rails app) | **document this repo** | 12 pages by user-facing feature (rooms, messages, unread rooms, push notifications, bots, search, banning, …) in 4 min 27 s for $3.97, coverage 0% → 41%, all 12 diagrams parse. 101 claims on 3 pages checked by hand, 1 wrong: the push page gives `/users/push_subscriptions`, the route is `/users/me/push_subscriptions`. The run also found that one private session IP makes a ban roll back, so the user stays unbanned. Coverage now skips Rails' `db/migrate/`. |
| [Guzzle](https://github.com/guzzle/guzzle) `9393947` (PHP) | audited all of `docs/` (15 pages, about 730 claims) in 4 min 59 s for $5.79 | 9 wrong; checked by hand, 8 hold and 1 is half right (it asks for libcurl 8.13.1, the code needs 8.13.0; the PHP 8.4 part it doubted is right). The HTTP/3 example `['version' => 3.1]` throws `HTTP/3.1 is not supported by the cURL handler`. The `idn_conversion` example says `яндекс.рф` is converted by default, but the default is `false`. Copying the `Pool` example's 3-argument callback into `Pool::batch()` throws `ArgumentCountError`. Coverage no longer counts dotfile configs such as `.php-cs-fixer.dist.php`. |
| [FluentValidation](https://github.com/FluentValidation/FluentValidation) `fa3c160` (C#) | **document this repo**, with an existing docs site | 12 pages in 4 min 14 s for $4.17, coverage 0% → 91% (59 of the covered files are one translations folder), all 12 diagrams parse. 36 claims on 2 pages checked by hand, 0 wrong. Of 9 wrong claims it reported in the old docs, 7 hold and 2 don't. Four of the 7 fail to compile: `using FluentValidation.DependencyInjectionExtensions;` (that namespace doesn't exist), `WithoutMessage` (it's `WithoutErrorMessage`), `x.HeadQuarters` and a `ContactBaseValidatoR()` constructor. Coverage no longer counts .NET test projects such as `src/FluentValidation.Tests/`. |
| [tRPC](https://github.com/trpc/trpc) `d756e59` (pnpm/turbo TypeScript monorepo) | **document this repo** across its packages, with an existing docs site in `www/` | 13 pages by feature, not by package (middleware, routers, WebSockets, SSE, streaming, …), in a new root `docs/features/`, apart from the Docusaurus site, in 4 min 47 s for $5.71. Coverage 0% → 46% (91 of 199), all 13 diagrams parse. 60 claims on 2 pages checked by hand, 2 wrong: the WebSockets page says in-flight queries fail with "WebSocket closed" (they get "Unknown error"), and that Node needs a `WebSocket` ponyfill (Node 22+ has one built in). No page links its counterpart in `www/docs`. Coverage no longer counts a Docusaurus site's own code (65 files in `www/`). |
| [Moshi](https://github.com/square/moshi) `889013e` (Kotlin, Gradle multi-module) | **document this repo** | 14 pages by feature across `moshi`, `moshi-adapters`, `moshi-kotlin` and the KSP codegen module, in 4 min 53 s for $5.32. Coverage 0% → 78% (52 of 67), all 14 diagrams parse; Kotlin test folders, test modules and `examples/` were already skipped. 58 claims on 2 pages (KSP codegen, adapter modifiers) checked by hand, 0 wrong. It reported 4 wrong claims in Moshi's docs, all 4 hold: the README says the reflection adapter uses `kotlin-reflect` (it uses `kotlin-metadata-jvm`), says to enable kapt (there is only a KSP processor), says properties must be `internal` or `public` (`protected` works too), and a KDoc gives a nesting limit of 31 (it's 256). It also un-ignored `docs/features/` in a `.gitignore` that ignored all of `docs/`, and said so. `affected` with git's kotlin driver: an edit inside `lenient()` flagged only the modifiers page; one inside `generatedAdapter` also flagged a page naming `isKotlin`, a top-level property git's kotlin rule doesn't see as a boundary. |
| [Alamofire](https://github.com/Alamofire/Alamofire) `bda9ed5` (Swift, SwiftPM) | **document this repo**, with existing `Documentation/` guides | 14 pages in 4 min 39 s for $5.27, coverage 0% → 51% (27 of 53), all 14 diagrams parse. The run found SwiftPM's `Tests/` and `Example/` counted as code (101 files instead of 53); `coverage` now skips them. 58 claims on 3 pages (retry policy, HTTP headers, offline retrier) checked by hand, 1 half right: a missing executable name in the `User-Agent` falls back to the process name before `Unknown`. It reported 11 wrong claims in Alamofire's guides, all 11 hold, for example the documented `Accept-Encoding` qualities (0.8, 0.6 instead of 0.9, 0.8), `cancelAllRequests(completingOn:)` (the label is `completingOnQueue:`) and `AF.download(...).serializingURL()` (no such method, it's `serializingDownloadedFileURL()`). `affected`: git has no Swift finder and only sees column-0 lines, so any edit inside `Session` flagged all 5 pages naming its methods. With a lean-docs Swift pattern, an edit inside `performUploadRequest` flags the uploads page plus one page naming `request`, which is also the method's parameter name; an edit in a method no page names flags only that `request` page, and edits to properties and to the `extension` line flag none. |
| [hiredis](https://github.com/redis/hiredis) `058ebcd` (C) | **document this repo**, with only a README | 11 pages in 4 min 27 s for $5.00, coverage 0% → 86% (30 of 35), all 11 diagrams parse. The run found hiredis's `test.c` suite counted as code; `coverage` now skips `test.c`. 44 claims on 3 pages (sending commands, timeouts, reply parsing) checked by hand: 1 wrong (a sync command timeout is `Resource temporarily unavailable`, not `recv timeout`, on macOS and Linux) and 1 half right (the connect-timeout message is the OS's). It reported 9 wrong claims in the README: 7 hold (it says the reply parser limits nesting to 7 levels; the limit is 1024, and two of its option snippets don't compile), 1 is only incomplete (the adapter list) and 1 doesn't (async push replies are still freed). 6 of its 10 C examples ran against Redis (a statement snippet once wrapped in `main`; the libevent one never exits). `affected`: edits to `redisContextTimeoutMsec` and `redisSetTimeout` flagged the timeouts page, an edit to a function no page names flagged none, and an edit to the 16 KiB read buffer in `redisBufferRead` was missed, because that page's Code row names the function only in its description. |
| [umami](https://github.com/umami-software/umami) `ec0ff50` (Next.js app router, React/TSX, Prisma + ClickHouse) | **document this repo** | 12 pages (event collection, tracking script, session replay, heatmaps, short links, pixels, login, API keys, 2FA, share links, MCP server, boards) in 3 min 10 s for $3.53, all 12 diagrams parse. Coverage 0% → 21% (215 of 1,022): the first batch leaves the dashboards and reports for the next one. The run found 45 svgr-generated icon components in `src/components/svg/` counted as code; `coverage` now skips `svg/` folders. 71 claims on 3 pages (event collection, short links, API keys) checked by hand: 2 wrong (a visit id rotates 30 minutes after the visit started, not after 30 idle minutes; ClickHouse does store revenue, through a materialized view) and 3 half right (the MaxMind default is a file, not a folder; the revenue rule holds only for the relational database; the short-link `curl` example redirects but saves no visit, because curl's user agent is a bot). `affected`: an edit inside a component of a file a page names flagged that page, an edit inside a component no page names flagged none, and a prop rename flagged the page naming the file. A prop rename in a shared component also flagged the two pages whose folder rows hold its callers. |
| [healthchecks](https://github.com/healthchecks/healthchecks) `e623fa3` (Django app) | **document this repo** | 12 pages (sending pings, email pings, ping bodies, schedules, going down, notifications, management API, badges, login, 2FA, teams, reports) in 5 min 57 s for $4.91, coverage 0% → 68% (176 of 260), all 12 diagrams parse. Tests in per-app `tests/` folders were already skipped; `coverage` now also skips a Django `test.py` or `tests.py`. 62 claims on 3 pages (sending pings, going down, badges) checked by hand: 1 wrong (on shutdown `sendalerts` prints `Terminated, finishing...`, not `SIGTERM, finishing...`) and 1 half right (body filtering does not override a ping already ignored because the check accepts only `POST`). `affected`: an edit inside `ping_by_slug` flagged only the pings page, and an edit to the `metrics` view, which no page names, flagged none. |
| [spdlog](https://github.com/gabime/spdlog) `d6c93f3` (C++, header-only) | **document this repo**, with only a README | 12 pages in 4 min 25 s for $3.52, coverage 0% → 58% (58 of 100), all 12 diagrams parse. The run found spdlog's vendored fmt copy in `include/spdlog/fmt/bundled/` counted as code; `coverage` now skips `bundled/` folders. 80 claims on 3 pages (rotating files, log pattern, async logging) checked by hand: 1 wrong (`%z` prints `+??:??` with `SPDLOG_NO_TZ_OFFSET`, not `+??.??`) and 2 half right (one: a custom flag also compiles through `spdlog::set_formatter`, not only `set_pattern`). It reported 3 wrong old claims, all hold: the README calls `dump_backtrace(32)`, which takes no argument, and two code comments are wrong. All 12 C++ examples compile as pasted and run; one comment miscounts the messages in a backtrace dump. `affected`: edits to an out-of-class `logger::flush_()`, inline class-body methods and namespace functions all flagged the right page; 6 extra flags came from three files four pages share, whose Code rows name their functions only in the description. |
| [dio](https://github.com/cfug/dio) `4684e29` (Dart, melos workspace) | **document this repo** across its packages | 17 pages in 7 min 39 s for $7.58, coverage 0% → 100% (65 of 65), all 17 diagrams parse. The run found dio's `example_dart/`, `example_flutter_app/` and shared-tests `dio_test/` counted as code (117 files); `coverage` now skips `example_<x>/` and `<x>_test/` folders. 68 claims on 2 pages (interceptors, errors) checked by hand: 0 wrong, 1 half right (a throwing custom error-text builder logs a warning only outside release builds). It reported 8 wrong old claims, all hold: the README says uploads get `files[]` keys, that `BackgroundTransformer` is the default and that `transformRequest` runs only for PUT/POST/PATCH. `affected`: git has no Dart function finder, so an edit in any `DioMixin` method flagged the pages for its sibling methods. With a Dart pattern and `@override` lines skipped, 6 probe edits went from 12 flags (4 real) to 7 (the same 4 real). |
| Hono, its own 22 pages | **audit of lean-docs' own output** | 9 of 430 claims wrong (2%), mostly generalizing from one branch. After a rule for those sentences, the 4 worst pages went from 4 wrong to 1. Details in [How accurate it is](#how-accurate-it-is). |
| [tRPC](https://github.com/trpc/trpc) `9109554a` | **doc this feature** on per-procedure error formatters, a 56-file change that shipped its own guides | One page with the example and the trap that a claimed error skips the global `errorFormatter`, in 80 s for $0.58. It also checked the shipped guide: "Exactly one side is ever set" is wrong for `safe()`, which returns `[undefined, undefined]` when a procedure returns nothing. Still on `main` at `d756e591`. |
| Hono `5f36607`, with its 22 generated pages | **keeping pages true**: two real fixes reverted as uncommitted changes (CSRF exempting `OPTIONS`, ETag lowercasing `retainedHeaders`) | `lean-docs affected` flagged exactly the CSRF page and exactly the ETag page, with no AI. Then **doc this feature** edited each page in place, changing only the lines the code made untrue, in 21–37 s for $0.32–0.41. It also called the ETag revert a regression, because the change deleted the test for mixed-case names. |
| Flask `d086db8`, with its 12 generated pages | **keeping pages true**: the change that made `redirect` default to 303 reverted | `affected` flagged only the URL-building page, naming `redirect` in `helpers.py` and in the 1,000-line `sansio/app.py`. Eight other pages list one of those two files. **doc this feature** changed 303 to 302 on that page, in 22 s for $0.30. It also caught that the change's own edit to `docs/api.rst` swaps a correct 308 for a wrong 301. |
| Cobra `adbc881`, with its 12 generated pages | **keeping pages true**: the default `--version` template changed from `.DisplayName` to `.Name` | `affected` flagged the version page and the help page. The help page was a false positive: the template is a top-level constant, so git's context pulled in the help function next to it. **doc this feature** left the help page alone and said why. It updated the version page and added `defaultVersionTemplate` to its Code row, so the same change will match exactly next time. It also noted that the template and the default print now disagree. That took 39 s for $0.40. |
| Campfire `008ea1a` (Ruby on Rails), with its 12 generated pages | **keeping pages true**: the upstream fix that stops pushes to banned users (`.merge(User.active)`, PR #338) reverted | `affected` flagged only the push page, and no other page claims anything about it. **doc this feature** fixed the 3 untrue lines and called the revert a regression: banned users would get every message's text on their devices. That took 36 s for $0.379. One-line edits inside single methods of `room.rb`, which 3 pages list: an edit to `push_later` flagged only the push page, but an edit to `unread_memberships` also flagged the rooms page, because that page names the `memberships` association and the edited line calls it. |
| Hono `5f36607`, with 12 generated pages | **keeping pages true on ordinary commits**: the last 30 commits before `5f36607` that touch `src/`, each replayed under those pages | `affected` flagged a page on 11 of 30 commits, one page each. By hand, 4 of the 11 flags were real: the v5 deprecation of `hono/aws-lambda`, a change to which content types count as binary, `JwtTokenInvalid` for an undecodable signature, and the body cache keeping the request's `Content-Type`. 7 were not: 3 comment or formatting edits, 1 type-only edit, and 3 fixes below the page's level of detail. On the 19 unflagged commits, no page line went wrong. `lean-docs-ok` clears a false flag. Since a reformat or a comment-only edit no longer counts, the same replay gives 9 flags: the JSDoc-text and formatting ones are gone, the 4 real ones stay, and so does a `@deprecated` JSDoc line no page mentions. |
| Cobra `adbc881`, with its 12 generated pages (100% coverage) | **what `affected` misses**: the last 30 commits up to `adbc881` that touch non-test `.go` files, each replayed under those pages | `affected` flagged 26 of 30 commits, 67 flags in all. By hand, 13 were real and 54 were not, mostly edits inside `execute`, `getCompletions` or `ExecuteC`, which four pages name in their Code rows (35 flags there, 2 real). Every page was then grepped for what each diff changed: on 30 Cobra commits it missed 0 stale pages, so recall was 13 of 13 and precision 13 of 67. Re-checking each page's Code table with an agent, with and without the page rule "name the functions that hold this feature's logic, not one that only calls it": 72 flags (13 real) with the rule, 90 (13 real) without. The rule removed the caller rows (flag-groups went from 11 false flags to 0), but both re-checks added `execute` to other pages, so neither beat the original 67. On the original 67, `affected` now lists first the 22 flags whose changed lines share a camelCase or snake_case name, a string or a number with the page (11 real) and marks the other 45 `check` (2 real); on the Hono replay, 2 likely (2 real) and 7 check (2 real). A changed line that mentions deprecation now counts as likely too: Hono moves to 4 likely (3 real: the `hono/aws-lambda` deprecation joins) and 5 check (1 real); the other one is `app.mount`'s `@deprecated` JSDoc line, which no page mentions. Cobra has no deprecation edits, so its 22 and 45 stay. |
| [Vite](https://github.com/vitejs/vite) `8a4c19c` | audited `docs/config/server-options.md` (~45 claims, 81 s, $0.68) | The page is accurate: 2 small mismatches. The doc quotes a `#server-ws` link where the client prints `#server-hmr`, and Deno workspaces are missing from the workspace-root list. Good docs get a short report, not invented problems. |

## How accurate it is

We audited lean-docs' own output. On the 22 pages it wrote for Hono, the audit checked 430 claims and found 9 wrong (2%). Six came from generalizing one branch of the code ("the handler never runs", when it only doesn't run for dynamic routes). Two came from shortened lists. The skill now re-checks every *only*, *never*, *always*, version and list before it finishes. With that rule, the four worst pages went from 4 wrong claims to 1 in about 80. Run "are these docs still right?" on generated pages too. It's the same check, and it catches what's left.

On the 12 pages it wrote for Flask, an audit checked about 450 claims and found 8 wrong (1.8%). We confirmed them by running Flask. Of the 7 complete `Use it` examples, 6 ran as written and 1 crashed. That example calls `url_for` in a test request context, where `url_value_preprocessor` never runs. Examples now have to be copied from tests, run, or traced call by call. In 3 rewrites of that page with the rule, all 3 examples worked.

A second Hono batch, written with the current rules, gave 12 pages with an example on every page. An audit that type-checked and ran each example found 9 wrong claims in about 340 (2.6%). 11 of the 12 examples type-check and work, some once you add the obvious imports. One fails to compile: it calls `c.set` on an app declared without `Variables`.

For Gson (Java), we compiled and ran the 17 Java examples on JDK 17 against Gson built from the same commit. 10 work with only the imports added, and 1 more also needs `throws IOException` on `main`. 5 work only once you declare a class or variable the snippet assumes, such as `PersonName`. One doesn't compile: the custom-adapters sketch has `class Money { ... }` and 8 adapter types it never declares. None printed output that contradicts its page. The 18th example, a ProGuard rule, matches Gson's own shrinker test config. Since then the skill asks for examples that declare what they use. We had the agent rewrite three of the pages that assumed or failed (custom-adapters, generic-types, polymorphic-types), once with the old rule and once with the new one. With imports only, 2 of 3 compiled before and 3 of 3 after. On polymorphic-types we ran each version 3 times. 0 of 3 compiled before: each calls the test's `CreditCard(String, int)` constructor without declaring it. 3 of 3 compiled after and print what their comments say.

For FluentValidation (C#), we pasted the 12 examples unchanged into a .NET 8 `Program.cs`. 3 compile as pasted (they only declare types) and 2 with only a `using` added. 4 compile once the statements move above the classes (CS8803), and 1 needs that plus the `Microsoft.Extensions.DependencyInjection` package. 2 need a class the snippet only names in a comment or not at all. None calls an API that doesn't exist, and once fixed all 12 run and print what their comments say. The skill now asks for examples in the language's usual one-file form, such as C# statements before types. Asked to rewrite the rulesets example, the agent put the statements first 3 of 3 times with either rule. So that A/B shows no gain yet.

Is it better than just asking the agent? On [click](https://github.com/pallets/click) `2247b35`, the same model wrote 3 pages two ways. One prompt was "write a documentation page for a new teammate, check it against the code". The other was `/lean-docs:doc`. A blind auditor, then a hand check of every flag, found 4 wrong claims in each arm. That's about 3.4% of ~118 claims for lean-docs and about 2.2% of ~180 for the plain agent, so the plain pages were no less accurate. A reader with only the page answered 9 of 15 code-derived questions from the lean pages and 9.5 from the plain ones. The real differences were elsewhere. The lean pages were half as long (2,061 vs 4,040 words), had 3 of 3 parsing diagrams against none, and cost $1.88 vs $2.63 in 230 s vs 408 s. One plain page also shipped a test example whose assert fails. That's 3 features, one run each, so the accuracy and reader numbers are a tie, not a win.

Is it better than the docs the maintainers wrote? We took 15 questions users asked in public issues and discussions: 5 each on httpx timeouts, Cobra positional args and Gson field exclusion. We wrote each answer from the code first. A Sonnet reader given only one doc answered them twice per doc, and the answers were graded blind. From the lean-docs pages (2,345 words) it scored 12 and 11.5 of 15, an average of 11.75. From the matching sections of the projects' own docs (1,104 words) it scored 4.5 and 6, an average of 5.25. Neither arm answered whether requests yielded by a custom httpx auth flow get the client's timeout. On two questions (never time out, exclude one field without `@Expose` everywhere) the arms tied 2 to 2. The lean pages are about twice as long, each official arm is one section of a larger site, and that's 3 features with 2 runs per arm.

Checking docs went the same way. On httpx `b5addb6`, `docs/` was audited twice with the same model. One run used lean-docs and the other used a plain prompt asking to "check every claim in docs/ against the code". The hand check found 32 wrong claims across both runs. The plain prompt found 28 of them with 0 false flags. lean-docs found 24 with 1 false flag, for $2.06 in 126 s against $2.75 in 175 s. That's one run per arm on one repo, and the plain agent did not do worse. What lean-docs adds there is the fixed one-line-per-claim report, an `unver` list of what it couldn't check, cheaper Sonnet checkers, and trim mode to fix the findings.

## How it's tested

```bash
npm test          # the CLI's unit tests
evals/run.sh      # end to end, with a real agent
evals/action.sh   # the GitHub Action's script on 10 local PR scenarios, stub gh, no network
AGENT='npx -y @openai/codex exec -s workspace-write -' evals/run.sh   # the same, with Codex
```

On 2026-10-08, `npm test` (79 tests), `evals/action.sh` (10 of 10) and every CLI command run from an installed `npm pack` tarball passed on Node 18.20.8, 20.20.2 and 22.23.3. Those are the official `node:18`, `node:20` and `node:22` Docker images.

On 2026-10-08, `npx skills add <local clone> -a claude-code` (skills CLI 1.7.1) copied `SKILL.md`, `reference/` and `scripts/` into `.claude/skills/lean-docs/` of a 5-file test project, and `-a codex` into `.agents/skills/lean-docs/`, with nothing global changed. Without the plugin, `claude -p "docs coverage"` loaded the skill and ran the script ($0.23). "Document this repo" wrote 3 pages that pass `check` with coverage 0% to 100% ($0.39). Codex 0.161.0 answered "docs coverage" from the script too. Installing from GitHub (`seifguerbouj/lean-docs`) is not tested yet.

Each eval hands a small repo to an agent with the skill installed, then grades what it wrote:

1. The doc passes the linter, and every file path in it exists.
2. Facts from the code are in the doc. Facts that aren't in the code are not.
3. A false claim planted in the old doc ("every export is also emailed") is gone.
4. After a code change, the existing page is edited in place, not duplicated, and the outdated facts are gone.
5. Every mermaid diagram parses with real mermaid, the way GitHub renders it (needs Chrome; skipped without it).
6. An audit of a doc with three planted errors reports all three as `wrong`, in the block format, and changes no files.
7. Bootstrapping a repo with an old guide leaves the guide untouched, keeps its true facts, and reports its false ones as `wrong`.
8. After a covered file moves, the page's `Code` table points at the new path.
9. A change that ships its own guide with two false claims: both are reported as `wrong`, and the guide's text is left as the author wrote it. Without that rule, 3 of 3 runs rewrote or deleted the author's section; with it, 2 of 2 left it alone.
10. Through the plugin only: with "keep the change minimal", the page is never left silently stale. It's updated, or the reply names it.
11. **A second agent that sees only the doc answers a newcomer's questions**, such as "Are requests without an API key limited?" or "We run 3 instances; what's the real limit?". If the reader can't answer, the doc failed.

On 2026-10-08, Codex 0.161.0 (model gpt-6-astra) passed all 8 evals that don't need the Claude Code plugin, one run each. Only the Stop hook eval is Claude Code only.

