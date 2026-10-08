#!/usr/bin/env bash
# Runs action.yml's own script on local PR scenarios, with a stub gh that logs its calls (no network).
#   evals/action.sh          VERBOSE=1 evals/action.sh   also prints each report and gh call
set -u
ld=$(cd "$(dirname "$0")/.." && pwd); W=$(mktemp -d "${TMPDIR:-/tmp}/lean-docs-action.XXXX"); mkdir "$W/bin"
node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").split("\n"),i=l.findIndex(x=>/^\s*run: \|/.test(x)),n=l[i+1].search(/\S/),o=[];
for(const x of l.slice(i+1)){if(x.trim()&&x.search(/\S/)<n)break;o.push(x.slice(n))}console.log(o.join("\n"))' "$ld/action.yml" > "$W/run.sh"
cat > "$W/bin/gh" <<'EOF'
#!/bin/bash
echo "gh $*" | head -1 >> "$GH_LOG"
[ "$GH_MODE" = fail ] && exit 1
case "$*" in *--jq*) [ "$GH_MODE" = marker ] && echo 42 ;; esac; exit 0
EOF
chmod +x "$W/bin/gh"
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t
g() { git -c init.defaultBranch=main "$@" >/dev/null 2>&1 || echo "git $* failed" >&2; }
g init --bare "$W/origin.git"; g init "$W/seed"; cd "$W/seed"; mkdir -p src docs/features
printf 'export function send(x) {\n  return x;\n}\n' > src/send.js
printf '# Send\n\n`send` returns what it gets.\n\n## How it works\n\n```mermaid\nflowchart LR\n  A[input] --> B[send] --> C[output]\n```\n\n## Code\n| Where | What |\n|---|---|\n| `src/send.js` | the function |\n\n## Does not\n- Copy its input.\n\n## Breaks when\n- `x` is undefined.\n' > docs/features/x.md
g add .; g commit -m init; g remote add origin "$W/origin.git"; g push origin main
pr() { g clone "file://$W/origin.git" "$W/$1"; cd "$W/$1"; g checkout -b pr; }
code() { echo "export const $1 = 1;" >> src/send.js; g commit -am "change $1"; }
page() { echo 'More.' >> docs/features/x.md; g commit -am page; }
ok() { g commit --allow-empty -m ok -m 'lean-docs-ok: docs/features/x.md'; }
shallow() { # what actions/checkout with fetch-depth 1 checks out: GitHub's merge commit, at depth 1
  g checkout -b m origin/main; g merge --no-ff pr -m merge; g push origin +m:refs/pull/1/merge
  g init "$W/$1"; cd "$W/$1"; g remote add origin "file://$W/origin.git"
  g fetch --depth=1 origin +refs/pull/1/merge:refs/remotes/pull/1/merge; g checkout --detach pull/1/merge; }
failed=0
run() { # name exit report-regex gh-write-regex|none [env...]
  local n=$1; : > "$W/$n.gh"
  env PATH="$W/bin:$PATH" GH_LOG="$W/$n.gh" GITHUB_ACTION_PATH="$ld" BASE_REF=main PR=1 REPO=o/r GITHUB_STEP_SUMMARY="$W/$n.md" \
    PATHS='docs/features/*.md' ARGS= FAIL_ON_STALE=true MIN_COVERAGE=0 COMMENT=true GH_MODE=empty "${@:5}" bash "$W/run.sh" >> "$W/$n.md" 2>&1
  local rc=$? writes; writes=$(grep -v -- --jq "$W/$n.gh")
  if [ $rc = "$2" ] && grep -qE "$3" "$W/$n.md" && { [ "$4" = none ] && [ -z "$writes" ] || { [ "$4" != none ] && echo "$writes" | grep -qE "$4"; }; }
  then echo "PASS $n"; else echo "FAIL $n (exit $rc)"; failed=1; fi
  [ -n "${VERBOSE:-}" ] && { cat "$W/$n.md" "$W/$n.gh"; echo; }; }
pr stale; code a; run stale 1 ': code it covers changed \(src/send.js\)' 'issues/1/comments -f body'
pr trailer; code b; ok; run trailer 0 'No stale docs' none
pr updated; code c; page; run updated 0 'updated in this change:\*\* `docs/features/x.md`' none
pr shallow-stale; code d; shallow shallow-stale-ci; run shallow-stale 1 ': code it covers changed' 'comments -f body'
pr shallow-ok; code d; ok; shallow shallow-ok-ci; run shallow-ok 0 'No stale docs' none
pr no-origin; code d; shallow no-origin-ci; git remote set-url origin "$W/gone.git"; run no-origin 1 'fetch-depth: 0' 'comments -f body'
pr fixed; code e; page; run fixed 0 'No stale docs' 'PATCH repos/o/r/issues/comments/42' GH_MODE=marker
pr fork; code f; run fork 1 '::notice::lean-docs couldn.t comment' 'comments -f body' GH_MODE=fail
pr no-docs; g rm -r docs; g commit -m nodocs; run no-docs 0 'cover 0 of 1' none
pr low; echo 'export const v = 1;' > src/v.js; g add src; g commit -m v; run low 1 '\(50%\), below the 90% minimum' 'comments -f body' MIN_COVERAGE=90
exit $failed
