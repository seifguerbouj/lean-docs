# The page

One page a new teammate understands in two minutes. They know the stack, not this feature, and ask: what does it do, how does it work, what will surprise me, where do I look when it breaks.

````markdown
# <Feature name, in words a user would say>

<One or two plain sentences: what it does, for whom, what makes it different. At most one code name.>

## How it works

```mermaid
<a flowchart for steps and decisions, or a sequenceDiagram when parties talk back and forth>
```

<One to three sentences on what the diagram doesn't make obvious: the design choice, the trap.>

## Use it

```<lang>
<The call, command or setting a reader types for the common case, 15 lines at most.>
```

## Terms
| Term | Meaning |
<Only for domain words a new teammate wouldn't know.>

## Config
| Setting | Default | What it changes |
<Only if there are settings. Units on every default.>

## Does not
- <Limits, and things a reader would reasonably assume it does.>

## Breaks when
| Symptom | Likely cause | Check |
<What the user or on-call sees, quoted exactly; the cause; where to look.>

## Code
| Where | What |
<One row per file or folder (not both a folder and a file in it), path in backticks. "What" says what you'd change there ("CSV columns and escaping"). `affected` reads this table, so list every file the page describes, but not tests. If several pages share a big file, name this page's functions after the path: `` `src/client.py` `send`, `retry` `` (qualified names like `Client.send` or `Worker::search` work too). Name the functions that hold this feature's logic, not one that only calls it.>
````

Required: the opening, `How it works`, `Does not`, `Breaks when`, `Code`. Others only with content. Write `Use it` whenever someone types something to use the feature; skip it for internals nobody calls. No other sections, no `###`.

## Diagrams

The diagram carries the explanation; draw one for almost every feature (a numbered list if it's under three steps).
- Plain-word labels ("count matching invoices"), not function names. About 12 boxes at most; skip internal helpers.
- Draw the unhappy path: `alt` in sequence diagrams, a decision diamond in flowcharts. The error branch is usually what the reader came for.
- One flowchart and one sequence diagram at most.
- GitHub breaks on `(` `)` in a bare box label or quotes inside an edge label. Write `A["call send(x)"]` and `-->|"no token"|`.

## Writing

- **Words first, names second.** "The API counts the matching invoices", not "`exportInvoices` calls `db.invoices.count`". Names go in `Code`; at most three per sentence.
- **Short sentences** (30 words at most), present tense, active voice. Jargon goes in `Terms`.
- **Exact strings** for errors, log lines, headers, env vars, endpoints, copied from the source character for character (`text/plain; charset=UTF-8`, not `text/plain`). Name the exception class the code raises. **Units** on numbers (`10,000 rows`, `30 s`).
- **Every claim comes from code you read.**
- **Show how it's used**: the `Use it` example, plus one line per other level in `Config` (per call, per client, global). Every name in the example must exist; it's a claim like any other. Copy it from a test or example when one exists. If you wrote it yourself, run it if you can; otherwise trace each call through the code to the result you claim.
  The example is complete: it declares every class and variable it uses, or one comment names what the reader supplies. No `{ ... }` bodies. It runs as one file in the language's usual form (C#: statements before type declarations).
- **Write down the traps**: what a limit really measures (each chunk or the whole request?), defaults that turn something off, combinations that raise, what replaces vs merges. They go in `Does not` or `Breaks when`.
- **One thing per page.** A title that needs "and" or a list is several pages.
- **Check the risky sentences before you finish.** Most wrong claims generalize one branch (an if, a version check, single vs many) or shorten a list. Re-read the code behind every *only*, *never*, *always*, *every*, *by default*, *before version X*, and every list of allowed values. Then state the condition ("only for dynamic routes"), copy the list exactly, or say "for example".
- **No line numbers** (they drift): name the file and function.
- **Portable markdown**: CommonMark, GFM tables, fenced `mermaid`. No raw HTML, admonitions or footnotes. Link another page only in the same folder (`[Retries](retries.md)`); other paths go in backticks.

## Banned

Introductions ("This document…", Overview, Table of Contents), restating code line by line, one-row tables, two-box diagrams, future work, summaries, filler (robust, seamless, powerful, comprehensive, leverage, simply, easily), "Note that".

## The cut list

After a trim, a bootstrap or a new page, end with this in a code block (line counts are non-blank lines). After a small everyday edit, one line per page instead: `docs/features/rate-limit.md: default 60 → 100 in the opening, diagram and Config. check ok.`

```
lean-docs: docs/features/invoice-export.md   59 → 25 lines

cut    Table of Contents                 11  one page needs no map
cut    Backend walkthrough                3  restated export.ts line by line
wrong  "exports are emailed"              1  no email code in src/
added  How it works diagram                  count-before-fetch and the 413 branch
kept   EXPORT_MAX_ROWS=10000, 413 + error text, dates in UTC
```
