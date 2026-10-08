# Audit mode: "are these docs still right?"

Read-only. Change nothing.

## Output: start your reply with this block

```
lean-docs audit: docs/   41 claims checked, 3 wrong, 1 code?, 1 unverifiable

wrong  docs/deploy.md:52    "the budget check blocks the plan"  a Terraform check block only warns (infra/db.tf)
wrong  docs/billing.md:9    "retries with jittered backoff"     client/retry.ts has fixed delays, no jitter
code?  docs/api.md:120      "headers.setTraceId()"              in the docs and types, missing at runtime (headers.ts)
unver  docs/payments.md:37  "fraud screening is on"             no config for it in the repo
```

One line per finding, most severe first: a doc that promises safety the code doesn't give, or an example that crashes, comes before a typo in a default. After the block, add at most a few lines on the worst findings, then offer to fix the `wrong` lines with trim mode.

- `wrong`: the doc is wrong. Fix the doc.
- `code?`: the doc agrees with the types or tests, but the runtime doesn't. That may be a code bug, so a maintainer decides.
- `unver`: can't be checked from the repo.

## How

1. **Scope it.** Use the docs the user names. If they named none, use the docs `lean-docs affected` lists, then ask before going wider. On a large repo, audit one folder at a time.
2. **Pull out every checkable claim:** numbers, defaults, limits, "X is on/off", "Y blocks Z", error text, file paths, version pins and flows. **Code examples are claims too.** Every name they use must exist with that signature, and the snippet must parse.
3. **Check each claim against the code and config**, and record where you looked. Use grep to find the code; don't read whole directories.
   - **Dependency claims:** check the installed source (`node_modules/`, the virtualenv's `site-packages/`, `vendor/`) at the version the project pins. If it isn't installed and you can browse, read that version's source online and cite the URL with the version in it. Otherwise the claim is `unver`; name the package. Don't install packages unless the user allowed it.
   - **Historical docs describe the past.** Changelogs, migration guides, release notes and ADRs are true for the version they name. Don't mark them `wrong` because the code moved on. Flag them only if they claim to describe the current version.
   - **Tests aren't docs.** A test that contradicts code is a code question. Report it only after you've run or traced it, as `code?`.
   - **Never judge from memory.** "As I recall" is not a check. Point at the line you read or the command you ran, or mark it `unver`.
4. **More than about 3 pages:** if you can run subagents, give each one a page or two, on a smaller model when you can pick one (in Claude Code, `model: "sonnet"`). They return candidate findings with the location they checked.
5. **Verify before you report.** Re-check every `wrong` and `code?` candidate yourself and drop any you can't confirm. A false "your docs are wrong" costs more trust than a missed one.
