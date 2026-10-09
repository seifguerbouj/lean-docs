# Bootstrap mode: "document this repo"

For a repo, or a large part of one, with no feature docs. Read `page.md` first for the shape of each page.

What keeps this cheap on a big repo: **map the repo from its outline, then read code one feature at a time.** Never load the whole codebase into one context.

## 1. Map it, without reading code

- `lean-docs coverage`: which folders have no docs, and how many files each holds.
- The file list (`git ls-files`), the README, and the manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`): entry points, commands, exports.
- `git log --since=1.year --format= --name-only | sort | uniq -c | sort -rn | head -40`: what changes most needs docs first.
- **Existing docs** (`git ls-files '*.md' '*.mdx' '*.rst' '*.adoc'`): read only their headings to see which features they cover.

## 2. Propose the feature list

A feature is something a user or caller can do, or a part of the system with one clear entry point ("Retries", "Auth", "The export job"). Folders and files are not features.

- Each feature: a name in a user's words, one line on what it covers, its files (5 to 15 is typical).
- Start with 5 to 12, most-used and most-changed first.
- **One thing a reader would look up per page.** A name that needs "and" or a list ("Timeouts, limits, SSL") is several features, even if they share files.
- **Split shared files here.** When a file belongs to several features, decide which functions or types each covers (`defs.rs`: the `json` flags for "JSON output", the `color` flags for "Colors"). Page writers can't see each other's pages, so only the map can.
- Show the list as a table (feature, covers, files) with a rough cost (in Claude Code with Sonnet writers, about $0.25–0.45 a page), and ask the user to confirm, unless they said to go ahead.

**Old docs are a source, not the truth.** Pass the matching section to the page writer; every fact it keeps must check out against the code. Verify each contradiction yourself before reporting it as `wrong`, and skip historical docs (changelogs, migration guides, release notes, ADRs), which describe the version they name. Don't edit or delete old docs unless asked. At the end, offer to replace each old section with a one-line pointer to its new page.

## 3. Write one page per feature

- Read only the feature's files, plus functions they call directly when the flow needs them. In a file over about 500 lines, read only the parts the map gave you (grep for them, read those ranges).
- With subagents, give each feature its own: the feature name, its files and symbols from the map, this skill's `reference/page.md`, the target path. Each returns its page and check result. Contexts stay small and pages are written in parallel.
- **Run page subagents on a smaller model** when you can pick one (in Claude Code, `model: "sonnet"`). Keep the main model for the map and the final check.
- Each `Code` table lists the files from the map, with their symbols for shared files (`` `src/client.py` `send`, `retry` ``). `affected` and `coverage` depend on it.
- Don't repeat another page. Explain a shared mechanism once and link that page from the other (`see [Retries](retries.md)`).

## 4. Finish

- Link pages that name each other (`see [Retries](retries.md)`). Writers ran in parallel, so their sibling pages didn't exist yet.
- Write `<folder>/overview.md`, the page a newcomer or a wiki reader opens first:

  ```markdown
  # <What the system is called>

  <Two or three plain sentences: what the system does, for whom, end to end.>

  ## How it fits together

  <One flowchart where each box is a feature, in the order work flows through them, with links in the text below.>

  ## Areas

  - **<Area>** (owner: <person or team>): [<Page title>](<page>.md), [<Page title>](<page>.md)
  ```

  Areas group the pages the way a reader thinks about the system (Intake, Matching, Export), 2 to 6 areas, every page in one area. `lean-docs wiki` builds the published page tree from this list. Ask the user who owns each area. Leave out `(owner: …)` when they don't say; never guess one. An owner is named next to each stale page in `affected`, the end-of-turn hook and the PR comment.
- `lean-docs check --root . <folder>/*` until every page passes.
- `lean-docs index <folder> > <folder>/README.md`.
- Do `write.md` step 4's nav and mermaid checks.
- Run `lean-docs` (status). Fix any `noisy:` rows (shared files without symbols), then report coverage before and after ("0% → 74%") and offer the biggest gaps as the next batch.
- Offer to audit the new pages: generated pages are about 98% right, and an audit catches most of the rest for about half a cent per claim.
- Offer one line in the agent instructions (`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex and others; create whichever is missing): `Feature docs: docs/features/README.md. Read the matching page before exploring the code, and update it when you change that code.` And one for people in the README: `Feature docs: [docs/features/](docs/features/README.md)`. Add them only if the user says yes.

## Report

```
lean-docs bootstrap: docs/features/   9 pages, coverage 0% → 78%, 3 old claims wrong

page   Sending requests            mylib/_client.py, _api.py, _models.py
page   Timeouts                    mylib/_config.py, _transports/default.py
...
wrong  docs/GUIDE.md:212  "retries 3 times"   retry.py:14 retries 5 times
next   mylib/_urlparse.py, mylib/_multipart.py   (6 files, no docs yet)
```
