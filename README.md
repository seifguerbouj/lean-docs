# lean-docs

**Your docs are lying. lean-docs finds where, then writes the page that doesn't.**

Short docs that match your code: your coding agent writes them, a free script keeps them true.

[![npm](https://img.shields.io/npm/v/lean-docs)](https://www.npmjs.com/package/lean-docs) [![CI](https://github.com/seifguerbouj/lean-docs/actions/workflows/test.yml/badge.svg)](https://github.com/seifguerbouj/lean-docs/actions/workflows/test.yml) [![MIT license](https://img.shields.io/npm/l/lean-docs)](LICENSE)

lean-docs is a plugin for Claude Code and Codex, and a skill for any agent that reads `SKILL.md` (tested with Claude Code and Codex). It writes one page per feature for a new teammate: about 650 words with a diagram, a 3-minute read. It checks every claim in your docs against the code. And it tells you which docs went stale when the code changed, in CI, with no AI.

![lean-docs on a small example repo: the agent writes a page, the end-of-turn hook flags it after a code change, the agent fixes one row, CI fails then passes](assets/demo.gif)

| | Agent (the plugin or skill) | Script (`npx lean-docs`) |
|---|---|---|
| **Uses AI?** | Yes: your Claude Code or Codex, on your subscription | **No, and no tokens** |
| **Runs** | Inside Claude Code, Codex or another agent | Anywhere Node 18+ runs: a terminal, CI, a pre-commit hook |
| **Does** | Writes pages, checks claims against the code, fixes stale lines, rewrites pages for the wiki | Finds stale pages, lints, measures coverage, builds the wiki view |

## Quickstart (60 seconds)

1. **Install** in Claude Code:

   ```
   /plugin marketplace add seifguerbouj/lean-docs
   /plugin install lean-docs@lean-docs
   ```

   Shortcut on Claude Code 2.1.275 or later: `/plugin install lean-docs --marketplace seifguerbouj/lean-docs`. Codex and other agents: see [Install](#install).
2. **Look** at your docs, with no AI: `npx lean-docs` (or `/lean-docs:coverage`). It shows how many pages you have, how much code they cover, what's stale, and where the gaps are.
3. **Check** what you already have: `/lean-docs:audit docs/`. It's read-only and lists the claims the code contradicts.
4. **Fill the gaps:** `/lean-docs:bootstrap` writes the first batch of pages for the biggest gaps.
5. **Keep them true:** add the GitHub Action ([In CI](#in-ci)), so every PR names the pages it made stale.

Without the plugin, say the same things in words: "docs coverage", "are these docs still right?", "document this repo".


## Install

**Claude Code** (adds five commands, `/lean-docs:doc`, `/lean-docs:audit`, `/lean-docs:bootstrap`, `/lean-docs:coverage`, `/lean-docs:publish`, and the end-of-turn hook):

```
/plugin marketplace add seifguerbouj/lean-docs
/plugin install lean-docs@lean-docs
```

Shortcut on Claude Code 2.1.275 or later: `/plugin install lean-docs --marketplace seifguerbouj/lean-docs`.

**Codex:**

```bash
codex plugin marketplace add seifguerbouj/lean-docs
codex plugin add lean-docs@lean-docs
```

**Any other agent** (just the skill):

```bash
npx skills add seifguerbouj/lean-docs
```

That copies the skill into your project (`.claude/skills/` or `.agents/skills/`). The CLI also offers other agents that read `SKILL.md`, such as GitHub Copilot and Zed; those are untested.

### What runs where

The table above is the whole picture. The skill brings its own copy of the script and runs it for the mechanical steps, so inside an agent you need nothing else. `npx lean-docs` runs the same script without an agent, for CI, pre-commit hooks, a teammate's terminal or a status line. It can tell you which page a change made stale and who owns it. Writing or fixing the page takes the agent.

## Results on real projects

Run on Python (including a Django app), TypeScript (including a pnpm monorepo and a Next.js app), Go, Rust, Java, Kotlin, Swift, Dart, C, C++, C#, Ruby (a Rails app) and PHP. Docs drift in every project, including very well-run ones. These are single runs, each checked against the code of the version it ran on.

| What lean-docs ran on | What it did | What it found |
|---|---|---|
| A Python HTTP client library | audited all of `docs/`: 23 pages, about 400 claims, 2 min 32 s, $1.53 | 20 claims that no longer match the code. |
| A JavaScript HTTP client library | audited its `README.md` | 26 claims that no longer match the code. |
| A Python API framework | **doc this feature** on native OpenTelemetry, a 5,251-line change | A page was written from it, unedited, in 69 s for $0.69. Two readers given only the page scored 6/7 and 5.5/7 on 7 questions written from the code (2026-10-08). Both caught that gRPC and a missing SDK extra fail at startup. Both said the per-signal export URL isn't in the page. |
| A Go command-line library | **document this repo** | 12 pages, coverage 0% → 100%, $3.36. |
| A Java JSON library | **document this repo** | 18 pages in under 6 minutes for $6.86, coverage 0% → 83%, all 18 diagrams parse. |
| Generated pages for a TypeScript web framework, a Python web framework, the Go library and a Ruby on Rails app | **keeping them true**: five code changes replayed, four of them real fixes reverted | `affected` named the right page every time, with no AI. **doc this feature** then fixed only the untrue lines, in under 40 s for under $0.45. On 30 ordinary commits each for the TypeScript framework and the Go library it missed no stale page, and it also flagged pages that needed no edit ([Known limitations](#known-limitations)). |
| 46 generated pages for the TypeScript and Python web frameworks | **audit of lean-docs' own output** | About 98% right: 26 of about 1,220 claims wrong. 11 of 12 TypeScript examples type-check and run. [How accurate it is](docs/reference.md#how-accurate-it-is). |

[More results](docs/reference.md#more-results): bootstraps and audits on more open-source projects, and a change in a TypeScript RPC library that shipped with its own guide.

A real page lean-docs wrote on a small demo repo: [examples/rate-limiter.md](examples/rate-limiter.md).

![A page lean-docs wrote for a small example repo: a diagram, the cut list and a "Breaks when" table](assets/page-example.png)


## What you get

- **One page that explains.** A plain-language opening and a mermaid diagram of how it works, error path included. Then the common call, what it *doesn't* do, and a symptom → cause → check table for when it breaks. The shape follows [Google's and GitLab's doc practices](docs/reference.md#why-this-shape).
- **Docs that are true.** Every claim is checked against the code, and code examples are claims too. "Are these docs still right?" is a read-only audit that ranks the wrong claims by danger. When a change ships its own guide, "doc this feature" checks that guide too.
- **Docs that stay true.** Each page lists the files it covers, down to the functions when a big file is shared. `npx lean-docs affected` tells you which docs a change made stale, and the GitHub Action says so in a PR comment. It needs no AI and takes 0.09 s on a mid-sized JavaScript library. Docs you already have, like a README or a tutorial, can be tracked too: one hidden line, `[//]: # (lean-docs-code: src/client.py send)`, ties them to the code without changing them. Docs with neither a Code table nor that line aren't tracked.
- **A wiki for everyone else.** The same pages, rebuilt for people who don't read code and published to Confluence, Notion or a docs site. See [Share with your team](#share-with-your-team).

## How docs grow

```mermaid
flowchart LR
    A[Repo with no docs] -->|document this repo| B[One page per feature, an index, coverage %]
    B --> C[You change code]
    C -->|doc this feature, or the end-of-turn reminder| D[Pages that cover the change are edited, new features get pages]
    D --> C
    C -->|lean-docs affected in CI| E{Doc updated?}
    E -->|no| F[PR fails, names the stale page]
    E -->|yes| C
    B -.->|are these docs still right?| G[Audit, wrong claims ranked]
```

1. **Start.** "Document this repo" maps the repo from its file list, README and git history, without reading all the code. It proposes a feature list, then writes one page per feature, reading only that feature's files (with subagents in parallel on big repos). It finishes with an index and the coverage before and after.
2. **Grow.** As you build, "doc this feature" edits the pages that cover your change and adds pages for new features. Pages name exact identifiers, so agents find and fix them on their own. When they've been told to keep a change minimal they don't, and that's what the end-of-turn hook is for. In our test on 2026-10-08 ("a one-line edit", 5 runs each), the plugin's 5 runs all updated the page. Without it, 0 of 5 updated it and 0 of 5 were silent. All 5 named the page as stale and asked first; 3 named only 2 of the 3 stale lines.
3. **Keep.** `npx lean-docs affected --strict` fails a PR that changed code without its page, and `npx lean-docs coverage --min 70` fails one that drops coverage. Run "are these docs still right?" before a release.

## How it compares

As of October 2026, from each tool's public docs. These tools change, so check theirs.

| | lean-docs | DeepWiki | Mintlify | "Hey agent, write docs" |
|---|---|---|---|---|
| Where docs live | Your repo, plain markdown | deepwiki.com (hosted) | A hosted docs site, built from MDX in your repo | Your repo |
| Checks claims against the code | Yes: audit marks `wrong` and `code?` | Chat answers cite the code | Its agent can run scheduled audits | If you ask. Just as accurate in [our test](docs/reference.md#how-accurate-it-is) |
| Fails a PR when a doc goes stale | Yes, free script | No | No: its agent opens a docs PR after code merges | No |
| Works inside your coding agent | Claude Code and Codex (tested); other SKILL.md agents, untested | Read-only, through MCP | A skill and MCP for writing its pages | Yes |
| Keeps each page short and readable | Yes, linted | Generated wiki | Your own format | No: twice the words, no diagrams |
| Price | Free, MIT. You pay your agent's tokens | Free for public repos; private through Devin | Free starter plan; automations on paid plans | Tokens |

Use DeepWiki to explore a repo you don't own. Use Mintlify for a hosted public docs site. Use lean-docs to keep your own repo's docs short and true, inside the agent you already code with.

## Use

Tell your agent:

| You say | It does |
|---|---|
| **document this repo** | Maps the repo, proposes features, writes one page each, an index, and the coverage before and after |
| **doc this feature** | Reads the diff and the code around it, then edits the pages it touches or writes a new one, in your repo's docs folder |
| **trim these docs** | Rewrites existing docs, checks every claim against the code, and lists what was `wrong` |
| **are these docs still right?** | Read-only audit: checks every claim in your docs against the code and lists the ones that are wrong, most dangerous first |
| **publish the docs to Confluence** | Builds a reader version of the pages (no code, an overview, a glossary, one troubleshooting page) and publishes it as a page tree. See below |

New pages, trims and bootstraps end with a cut list: what was cut and why, the claims the code contradicts (`wrong`), what was added, and the facts that were kept. Everyday edits get one line per page.

## Share with your team

**Preview.** Tested on Notion (a private page), Obsidian, plain folders and a stand-in for the Confluence connector. It hasn't been tried on a live Confluence space yet.

The repo pages are for engineers and agents. Product, support, ops and new joiners get a wiki built from them: same facts, no code.

```
/lean-docs:publish Confluence space DOCS under "Engineering"
/lean-docs:publish Notion page "Handbook", in German
/lean-docs:publish my Obsidian vault ~/Notes, folder "Our system"
/lean-docs:publish docs/handbook          (a Docusaurus or MkDocs folder)
```

In Codex or without the plugin, say "publish the docs to Confluence, space DOCS under Engineering".

What readers get:

```
<Your system>                      what it does end to end, with one diagram
├── Intake, Matching, Export …     one page per area, listing its features
│   └── <Feature>                  what it does, how it works, settings, limits, what to do when it fails
├── Glossary                       every term from every page, in one table
└── Troubleshooting                every known error message: likely cause, what to check
```

- **No code in the reader's part.** File names, functions and examples move to a "For engineers" section at the bottom of each page, with the path of the source page.
- **Plain language, any language.** The agent rewrites each page for the readers you pick (people who don't read code, engineers, or both) without adding a fact. It keeps every error message exactly, so people can search for it. Ask for German, French or another language and it translates.
- **Easy to keep current.** The wiki is generated from the repo pages, and every page says so. It doesn't update itself: `npx lean-docs` tells you when published pages are behind, and publishing again rewrites only the changed pages, in place.
- **Owners.** Name an owner per area in `docs/features/overview.md` (`- **Matching** (owner: Jana): ...`). The wiki shows it, and `affected`, the end-of-turn hook and the PR comment name the owner next to each stale page. `.lean-docs/publish.json` records the page ids; commit it so your team updates the same pages.
- **Obsidian too.** Point it at a vault folder: areas become folders, links become `[[links]]`, code folds away.
- **Diagrams.** Notion, Obsidian, Docusaurus, MkDocs, GitHub and GitLab draw them. Confluence needs a Mermaid app, and its connector can't upload images, so without one each diagram becomes a numbered step-by-step list.

Connect once:

| | Claude Code | Codex |
|---|---|---|
| Confluence | `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp`, then `/mcp` to log in | `codex mcp add atlassian --url https://mcp.atlassian.com/v2/mcp`, then `codex mcp login atlassian` |
| Notion | `claude mcp add --transport http notion https://mcp.notion.com/mcp`, then `/mcp` | `codex mcp add notion --url https://mcp.notion.com/mcp`, then `codex mcp login notion` |

To see the reader version before publishing anything: `npx lean-docs wiki docs/features` writes it to `.lean-docs/wiki/`, with no AI and no connector.

## In CI

```yaml
permissions: { contents: read, pull-requests: write }
steps:
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }
- uses: seifguerbouj/lean-docs@v0
  with: { paths: docs/features/*.md, fail-on-stale: true, min-coverage: 50 }
```

If a change didn't make a doc wrong (a rename, a refactor), add `lean-docs-ok: docs/features/x.md` to a commit message and the check passes. A PR with something to fix gets one comment, edited on each push. It lists the docs the PR made stale, the pages it updated, the coverage and its biggest gaps, and any lint problems. The same checks run locally with `npx lean-docs affected`, `npx lean-docs coverage` and `npx lean-docs check`, or as [pre-commit hooks](docs/reference.md#docs-that-keep-up-with-the-code). They need no AI and cost no tokens.

## Known limitations

- **Single runs.** The results above are one run each on the projects named, not benchmarks. Costs and times vary with the repo and the agent.
- **Agents.** Tested with Claude Code and Codex. Other agents that read `SKILL.md` may work; they are untested.
- **Confluence.** Publishing is a preview. It was tried on Notion, Obsidian, plain folders and a stand-in for the Confluence connector, not on a live Confluence space.
- **`affected` favours not missing a page over precision.** On 30 commits to a Go library it missed no stale page, but 13 of its 67 flags were real; the rest were pages that needed no edit. `lean-docs-ok:` in a commit message clears a flag.
- **Tracking needs a link to the code.** A page is tracked only if it has a Code table or a `lean-docs-code` line. Other docs aren't tracked.
- **Audits aren't proofs.** Pages the agent writes are about 98% right on our audits, so run "are these docs still right?" on generated pages too. `code?` and `unver` mark what it couldn't settle.

## Roadmap

No dates. These are directions, not promises.

- Try publishing on a live Confluence space and fix what turns up.
- Test more agents that read `SKILL.md`.
- Make `affected` flag fewer pages that need no edit.

Ideas and bug reports are welcome: [open an issue](https://github.com/seifguerbouj/lean-docs/issues/new/choose).

## More

This repo documents itself with lean-docs: [`docs/features/`](docs/features/README.md), checked by its own Action on every PR. [`docs/reference.md`](docs/reference.md) has the page shape, every CLI command, the linter rules, measured costs, where the output renders, and how it's tested. [`examples/`](examples/) has a real page lean-docs wrote on a small demo repo, [`rate-limiter.md`](examples/rate-limiter.md), unedited, and a bloated agent doc next to [its lean rewrite](examples/after.md).

## License

MIT
