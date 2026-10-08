---
name: lean-docs
description: One-page feature docs with a diagram, checked against the code. Writes or updates docs for a change, documents a whole repo, finds docs a change made stale, audits whether docs are still true, trims bloated docs, publishes the docs to Confluence or Notion as a wiki for readers who don't open the code. Use for "doc this feature", "update the docs", "which docs does this change affect", "document this repo", "are these docs still right", "trim these docs", "docs coverage", "publish this to Confluence", "make a wiki version", "lean-docs".
---

# lean-docs

A feature doc is one page that a new teammate understands in two minutes. If it needs a second page, the feature is two features.

## Pick the mode, then read only its files

| The user says | Read |
|---|---|
| doc this feature, document this change, update the docs | `reference/write.md` + `reference/page.md` |
| document this repo, the next batch, generate the docs, we have no docs | `reference/bootstrap.md` + `reference/page.md` |
| trim / rewrite / clean up these docs | `reference/trim.md` + `reference/page.md` |
| are these docs still right? check the docs | `reference/audit.md` |
| publish the docs to Confluence / Notion, make a wiki version | `reference/publish.md` |
| which docs does this change affect? | nothing: run `affected` and report |
| how are our docs doing? docs coverage | nothing: run `lean-docs.mjs` with no arguments and report |

## Tools

`scripts/lean-docs.mjs` sits in this skill's folder. It needs Node 18+ and no AI or network. Run it; don't redo its work by hand.

```bash
node <skill>/scripts/lean-docs.mjs                       # status: pages, coverage, stale pages, lint, next gaps
node <skill>/scripts/lean-docs.mjs affected              # docs whose Code paths changed since the branch point but weren't updated
node <skill>/scripts/lean-docs.mjs check --root . <doc>  # shape, readability, bloat, portability, stale paths; exit 1 on problems
node <skill>/scripts/lean-docs.mjs check --keep-shape …  # for guides, runbooks and ADRs: no page-shape, portability or code-name rules
node <skill>/scripts/lean-docs.mjs coverage              # share of code files some doc covers, and the folders with none
node <skill>/scripts/lean-docs.mjs index docs/features   # a table of every feature doc, for a README in that folder
node <skill>/scripts/lean-docs.mjs wiki docs/features    # the reader view for Confluence, Notion or a wiki, in .lean-docs/wiki/
```

## Always

- **Spend tokens on the change, not the repo.** Read the diff, the files it touches, and the docs `affected` lists. Follow code outward only as far as you need to explain it.
- **Every claim comes from code you read.** Nothing invented.
- **Edit before you add.** When a doc already covers the code, update it in place.
- **Finish with the check passing and the report your mode asks for.**
