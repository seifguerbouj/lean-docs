# Feature index

`lean-docs index` prints one markdown table of every feature page in a folder, with each page's title and first sentence. You redirect it into the folder's README.

## How it works

1. It reads every markdown file under the folder, tracked or untracked, that has paths in a Code table.
2. It keeps those with a `## Breaks when` section, and drops any earlier index.
3. It prints a marker line, a `# Feature docs` title, and one row per page, sorted, linking the file by name.

The marker line on top is how the other commands recognise the index. The linter skips it, and write mode regenerates it when a folder already has one.

Pass the folder as the only argument. It defaults to `docs`, and pages in its subfolders are included.

## Use it

```bash
npx lean-docs index docs/features > docs/features/README.md
```

## Does not
- Write the file. Run `lean-docs index docs/features > docs/features/README.md`.
- List pages without a Code table or without `## Breaks when`, such as guides and runbooks.
- Keep hand edits. The next run replaces the whole file.
- List pages in example, eval, fixture or test folders. Indexing one of those folders prints an empty table.

## Breaks when
| Symptom | Likely cause | Check |
|---|---|---|
| The table has no rows | the default folder is `docs`, the pages are elsewhere, or none has a Code table | pass the folder |
| `lean-docs: no such folder: <dir>` and exit 2 | the folder you passed doesn't exist | the path |
| A page is missing | no `## Breaks when` heading, or no backticked path under `## Code` | the page's headings |
| A link 404s on GitHub | the page sits in a subfolder of the indexed folder | index each folder on its own |
| `lean-docs check` passes the README with no output | files starting with the marker are skipped on purpose | expected |

## Code

- `skills/lean-docs/scripts/lean-docs.mjs` `index`, `INDEX_MARK`: `index()`, `INDEX_MARK`, and the `index` command
