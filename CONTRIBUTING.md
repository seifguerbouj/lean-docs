# Contributing

lean-docs is a skill (`skills/lean-docs/`), a dependency-free CLI (`skills/lean-docs/scripts/lean-docs.mjs`), and a Claude Code plugin around them (`.claude-plugin/`, `commands/`, `hooks/`).

## Before you open a PR

```bash
npm test                                          # the CLI's unit tests, a few seconds
evals/run.sh evals/<fixture>                      # one end-to-end eval with a real agent
AGENT="claude -p --plugin-dir $PWD --allowedTools Read,Write,Edit,Glob,Grep,Skill,Bash(git:*),Bash(node:*)" evals/run.sh   # all, through the plugin
```

If you change the CLI, `npx lean-docs affected` will list the pages in `docs/features/` that describe it. Update them in the same PR, or add `lean-docs-ok: <page>` to a commit message if they're still right. CI fails otherwise.

## Found a bad page?

The best bug report is a fixture. Copy an `evals/` folder, put the code that fooled it in `base/` (and `change/` for a diff), the prompt in `prompt`, and what must or mustn't appear in `expect`. Add `questions` if a reader should be able to answer something from the page. A fixture that fails today and passes after your fix is the whole PR.

## Rules for the skill text

Every line in `SKILL.md` and `reference/` costs tokens in every session that uses it. A new rule should come from a failure you saw, ideally with a fixture that catches it.
