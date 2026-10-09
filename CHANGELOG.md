# Changelog

## 0.1.3 (2026-10-09)

Docs and repo files only. No code changes.

- README: a new top (what it is in one sentence, badges, a demo GIF, an agent vs script table, a 60-second quickstart), "Results on real projects", a "Known limitations" section and a short roadmap. The install order is Claude Code plugin, then Codex, then `npx skills add`.
- Results and the reference page describe other projects' docs neutrally ("claims that no longer match the code") and no longer list their individual mismatches.
- The social preview and the README images are new, from a small example repo, and name no other project. The old dark hero image and the terminal SVG builders are gone.
- `docs/features/agent-modes.md` lists the install paths in the same order and all five commands.
- Added `CODE_OF_CONDUCT.md`, a pull request template, and a private security-report link in the issue chooser.

## 0.1.2 (2026-10-08)

- `lean-docs --version`.
- The plugin manifests carry the package version; a test keeps the four version fields equal.
- A page's opening may name URL paths and status codes (`/items/`, `307`) without counting them as code names.
- The unit tests moved to `test/`, so `npx skills add` no longer copies them into your project.
- Docs: a page edited in the same diff as its code counts as updated, even before it's committed.

## 0.1.1 (2026-10-08)

- A clearer npm description and keywords. No code changes.

## 0.1.0 (2026-10-08)

The first release.

- **Writes docs:** one page per feature, with a mermaid diagram, a `Use it` example, limits and a symptom → cause → check table. Its Code table ties the page to its files and functions. "Doc this feature" works from a change; "document this repo" works from scratch, in batches.
- **Checks docs:** a read-only audit of any docs against the code, wrong claims first. Guides shipped with a change are checked too.
- **Keeps them true:** `lean-docs affected` names the pages a change made stale, down to the function, and the area owner. The end-of-turn hook (Claude Code), the GitHub Action (one PR comment) and pre-commit hooks use it. No AI, no tokens.
- **Shares them (preview):** `/lean-docs:publish` builds a wiki for readers who don't open the code: an overview, areas, a glossary and a troubleshooting page. It goes to Notion, Obsidian, Confluence (through its connector) or a docs site. `lean-docs wiki` previews it without AI.
- **Works with** Claude Code (plugin and skill), Codex (plugin and skill) and other agents that read `SKILL.md`. Node 18 or later, no dependencies.
