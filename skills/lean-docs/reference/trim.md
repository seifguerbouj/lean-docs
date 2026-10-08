# Trim mode: "trim these docs"

Read `page.md` first for the shape and rules.

1. Read the doc. If it isn't tracked by git, ask before editing, because git is the undo.
2. **Check every claim against the code.** That includes code examples: every name must exist with that signature, and the snippet must parse. Mark wrong claims for the cut list. **For a long doc (over about 150 lines), run audit mode on it first,** with subagents per section, and work from its findings. One pass over a long guide misses claims.
3. **Decide what the doc is.**
   - A **feature doc** (one feature, internal) gets the page shape. If it covers several features, split it into one page each.
   - **Anything else** (a public user guide, a runbook, a failure catalogue, an ADR, a reference table) keeps its own headings, because other pages link to their anchors. It also keeps the IDs other docs cite (`F12`, `ADR-7`). Check it with `--keep-shape`. Give it one line naming the files it describes, so `affected` tracks it: `[//]: # (lean-docs-code: src/client.py Client.send, src/config/)`.
4. **Add the traps** (see "Write down the traps" in `page.md`), whatever the shape. On a page that keeps its shape, use a short list under the closest heading. A page that's shorter but no clearer isn't done.
5. Rewrite in place, then run `lean-docs check --root . [--keep-shape] <doc>` until it passes.
6. Show the cut list, including the `wrong` lines and the `added` traps.
