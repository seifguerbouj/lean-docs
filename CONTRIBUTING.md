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

## Releasing

The version lives in four places: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and `VERSION` in `lean-docs.mjs`. A test fails if they differ, so bump all four by hand rather than with `npm version`. Then:

```bash
npm test
git commit -am "lean-docs X.Y.Z" && git tag vX.Y.Z
git push origin main vX.Y.Z
git tag -f v0 && git push --force-with-lease origin v0   # the Action's moving 0.x tag
npm publish --auth-type=web
```
