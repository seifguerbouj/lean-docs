# Publish: "publish the docs to Confluence / Notion", "make a wiki version"

The repo pages are written for engineers and agents. A wiki reader (product, ops, support, a new joiner) needs the same facts without the code. So publishing builds a reader view from the pages, then copies it into the user's wiki. The repo stays the only place anyone edits.

Only when the user asks. Publishing makes pages visible to others, so confirm the target (Confluence space and parent page, Notion parent page) before the first publish.

## 1. Connect, once

Look for the target's tools first (Confluence: a tool like `createConfluencePage`; Notion: `notion-create-pages`). If they're missing, give the user the exact steps for their agent and stop:

| | Claude Code | Codex |
|---|---|---|
| Confluence (Atlassian) | `claude mcp add --transport http atlassian https://mcp.atlassian.com/v2/mcp`, then `/mcp` to log in. On claude.ai, connect Atlassian under Settings, Connectors | `codex mcp add atlassian --url https://mcp.atlassian.com/v2/mcp`, then `codex mcp login atlassian` |
| Notion | `claude mcp add --transport http notion https://mcp.notion.com/mcp`, then `/mcp` | `codex mcp add notion --url https://mcp.notion.com/mcp`, then `codex mcp login notion` |

No connector needed for Obsidian, a docs site (Docusaurus, MkDocs) or files the user uploads themselves: the target is a folder they name.

## 2. Build the reader view

Run `lean-docs wiki docs/features`. It writes `.lean-docs/wiki/`: an overview, one page per area, every feature page with its code moved into a "For engineers" section, one glossary from all `Terms` tables, one troubleshooting page from all `Breaks when` tables, and `pages.json` (title, parent, source page, hash for each page). It needs no AI. Suggest adding `.lean-docs/wiki/` to `.gitignore`.

For Obsidian, add `--format obsidian`: areas become folders, each note is named after its title, links become `[[wikilinks]]`, "For engineers" becomes a folded `> [!info]-` callout, and each note gets `source` and `generated-by` properties. The manifest is `.lean-docs-pages.json`, with each note's `path`. Always build into `.lean-docs/wiki/`, never straight into the vault, so a rebuild can't overwrite notes you already rewrote.

For Notion, add `--format notion`: tables become Notion `<table>` blocks, "For engineers" becomes a toggle heading with its content indented under it, the `#` line is dropped, and characters Notion treats as markup are escaped outside code. Send each file's text as the page content, unchanged in structure.

If the folder has no `overview.md`, write one first (see `bootstrap.md`, step 4), check it with `lean-docs check --keep-shape`, and run `lean-docs wiki` again.

## 3. Rewrite each page for its readers

Ask once who reads the wiki: people who don't read code, engineers, or both (the default). Then rewrite each generated page in place, for those readers:
- Keep every fact, limit, symptom and setting. Add none. A fact that isn't in the source page doesn't go in.
- Say it in the reader's words: what happens, to whom, when. Function, file and variable names leave the prose; they stay in "For engineers". For "both", keep that section; for non-coders, keep only its source-page line.
- Keep error messages, log lines, status names and setting names exactly, in backticks. They're what readers search for.
- In "When something goes wrong", the Check column says what a person can look at (a log line, a screen, a setting), not a function.
- Keep the first lines the script wrote ("Generated from …", "Owner: …"), the headings, the links the script made (`[x](page.md)` or `[[Note]]`), the properties block, the `> ` lines of a callout, and Notion's `<table>` blocks and tab-indented toggle content. Don't add sections: the overview, area, glossary and troubleshooting pages have no "For engineers" part.
- If the user asked for another language, translate here. Keep quoted messages and setting names as they are.

Only rewrite pages whose `hash` differs from the last publish (step 5). The rest are unchanged.

## 4. Diagrams

- Obsidian, Notion, GitHub, GitLab, Docusaurus and MkDocs draw `mermaid` blocks. Keep them.
- Confluence draws them only with a Mermaid app, and its connector can't upload images. Ask once whether the space has a Mermaid app. If not, replace each diagram with "Step by step": a numbered list that walks every box and branch of the diagram, error paths included. Then move the mermaid source to the end of "For engineers".

## 5. Publish, and keep a record

The script already put two lines on top of each page: where it's generated from (the repo's web address, never a local path), and the area's owner if `overview.md` names one. Keep both.

- **Confluence:** create every page in `pages.json` order, under its parent (the overview goes under the page the user named), with `contentFormat: "markdown"`. The title goes in the title field.
- **Notion:** build with `--format notion` and create the same tree with the Notion connector, each page under its parent. If the user named no parent, create the overview as a private page (draft mode), never in a teamspace.
- **Obsidian:** copy the changed notes into `<vault>/<folder the user named>/`, keeping their folder paths. Nothing else in the vault is touched.
- **Folder or site:** copy the files with their links as they are, and add them to an explicit nav or sidebar if the site has one.

Write `.lean-docs/publish.json` as you go:

```json
{ "target": { "tool": "notion", "parent": "<page id or space and parent title>" }, "readers": "both", "language": "en", "diagrams": "mermaid",
  "pages": { "overview.md": { "id": "<page id>", "url": "<page url>", "hash": "<hash from pages.json>", "source": "docs/features/overview.md" } } }
```

**Second pass (Confluence and Notion):** pages link to pages created after them. Once every page has an id, run `lean-docs relink .lean-docs/wiki/*.md` (it reads the record), and update each page whose file changed. Notion links become page mentions.

Tell the user to commit the record, so teammates and CI update the same pages. Next time, read it and update existing pages in place: no duplicates, no new tree. Only pages whose hash changed are rewritten and updated. A page that's no longer in `pages.json` gets reported, not deleted. `lean-docs` (status) says when published pages are behind the docs.

## Report

```
lean-docs publish: Confluence space DOCS, under "Engineering"   15 pages (12 features, 1 overview, glossary, troubleshooting)
created  12   updated  2   unchanged  1   diagrams as step lists (no Mermaid app)
overview https://<site>/wiki/spaces/DOCS/pages/123456
record   .lean-docs/publish.json (commit it)
```
