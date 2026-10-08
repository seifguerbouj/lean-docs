#!/usr/bin/env bash
# Runs each fixture through a real agent with the skill installed, then grades the doc it wrote.
#   evals/run.sh                       all fixtures, Claude Code
#   evals/run.sh evals/write-rate-limit
#   AGENT='npx -y @openai/codex exec -s workspace-write -' evals/run.sh   any CLI that reads the prompt on stdin
#   AGENT="claude -p --plugin-dir $PWD --allowedTools ..." evals/run.sh     through the Claude Code plugin, commands included
#
# A fixture is: base/ (committed), change/ (optional, left uncommitted = the change to doc), remove (optional),
# plugin-only (optional marker: runs only through the Claude Code plugin, e.g. hook tests),
# prompt (what the user types), expect (+regex must appear, -regex must not, = path the doc must be,
# % N minimum docs coverage, ! read-only run: no file may change, ~ regex the agent's reply must contain,
# ^ path a file whose lines the agent must not change or remove (it may add a pointer), ? the doc may stay unchanged if the reply covers the ~ lines),
# questions (optional: question<TAB>answer-regex). A second agent that sees ONLY the doc
# must answer them: the doc has to be understandable, not just short.
set -u
here=$(cd "$(dirname "$0")" && pwd)
skill="$here/../skills/lean-docs"
AGENT=${AGENT:-claude -p --allowedTools Read,Write,Edit,Glob,Grep,Task,Agent,Bash(git:*),Bash(node:*),Bash(ls:*),Bash(wc:*),Bash(sort:*),Bash(uniq:*),Bash(head:*)}
READER=${READER:-claude -p}
fixtures=("$@")
[ ${#fixtures[@]} -eq 0 ] && fixtures=("$here"/*/)
failed=0

for dir in "${fixtures[@]}"; do
  dir=${dir%/}
  name=$(basename "$dir")
  case "$AGENT" in *--plugin-dir*) ;; *) [ -f "$dir/plugin-only" ] && { echo "== $name (skipped: needs --plugin-dir in AGENT)"; continue; } ;; esac
  work=$(mktemp -d "${TMPDIR:-/tmp}/lean-docs-eval.$name.XXXX")
  cp -R "$dir/base/." "$work"
  git -C "$work" init -q -b main
  git -C "$work" add -A
  git -C "$work" -c user.name=eval -c user.email=eval@example.invalid commit -qm base
  [ -d "$dir/change" ] && cp -R "$dir/change/." "$work"
  # remove (optional): paths deleted as part of the change, e.g. the old name of a moved file
  [ -f "$dir/remove" ] && while read -r f; do [ -n "$f" ] && git -C "$work" rm -q "$f"; done < "$dir/remove"
  # Claude Code reads .claude/skills, Codex and others read .agents/skills. With --plugin-dir the plugin brings it.
  case "$AGENT" in *--plugin-dir*) ;; *)
    for d in .claude .agents; do mkdir -p "$work/$d/skills" && cp -R "$skill" "$work/$d/skills/" && echo "$d/" >> "$work/.git/info/exclude"; done ;;
  esac

  # ^ paths: keep a copy as the change left them. The agent may add lines (a pointer) but not change or remove any.
  grep '^\^' "$dir/expect" | while read -r _ f; do mkdir -p "$(dirname "$work.keep/$f")" && cp "$work/$f" "$work.keep/$f"; done
  echo "== $name (agent running...)"
  set -f # the allowedTools patterns contain *
  (cd "$work" && $AGENT) < "$dir/prompt" > "$work.log" 2>&1
  set +f

  # The doc is the new page. Only when nothing is new (trim mode) is it the edited file.
  # A pointer line added to an existing index doc is not the doc.
  changes=$(git -C "$work" status --porcelain --untracked-files=all)
  docs=$(echo "$changes" | awk '$1 == "??" {print $2}' | grep '\.md$')
  [ -z "$docs" ] && docs=$(echo "$changes" | awk '$1 == "M" {print $2}' | grep '\.md$')
  ok=1
  if grep -q '^!' "$dir/expect"; then
    # Read-only mode (audit): grade the reply, and require an untouched tree.
    [ -z "$changes" ] && echo "  pass read-only, no files changed" || { echo "  FAIL changed files:"; echo "$changes" | sed 's/^/    /'; ok=0; }
    while read -r sign re; do
      [ "$sign" = "~" ] || continue
      grep -Eiq -- "$re" "$work.log" && echo "  pass reply   $re" || { echo "  FAIL reply lacks $re"; ok=0; }
    done < "$dir/expect"
  elif [ -z "$docs" ] && grep -q '^?' "$dir/expect"; then
    # ? : leaving the doc alone is allowed, but then the reply must say what's stale (~ lines).
    echo "  doc left unchanged (allowed by ?)"
    while read -r sign re; do
      [ "$sign" = "~" ] || continue
      grep -Eiq -- "$re" "$work.log" && echo "  pass reply   $re" || { echo "  FAIL reply lacks $re"; ok=0; }
    done < "$dir/expect"
  elif [ -z "$docs" ]; then
    echo "  FAIL no doc written"; ok=0
  else
    echo "  doc: $docs"
    if out=$(cd "$work" && node "$skill/scripts/lean-docs.mjs" --root . $docs); then echo "  pass checker"
    else echo "  FAIL checker"; echo "$out" | sed 's/^/    /'; ok=0; fi
    if node "$here/diagrams.mjs" --find-chrome > /dev/null; then
      if out=$(cd "$work" && node "$here/diagrams.mjs" $docs); then echo "  pass $(echo "$out" | tail -1)"
      else echo "  FAIL diagrams"; echo "$out" | sed 's/^/    /'; ok=0; fi
    fi
    text=$(cd "$work" && cat $docs)
    while read -r sign re; do
      case "$sign" in
        +) echo "$text" | grep -Eiq -- "$re" && echo "  pass has     $re" || { echo "  FAIL missing $re"; ok=0; } ;;
        -) echo "$text" | grep -Eiq -- "$re" && { echo "  FAIL has     $re"; ok=0; } || echo "  pass avoids  $re" ;;
        %) pct=$(cd "$work" && node "$skill/scripts/lean-docs.mjs" coverage | head -1 | grep -oE '[0-9]+%' | tr -d %)
           [ "${pct:-0}" -ge "$re" ] && echo "  pass coverage ${pct}% (min $re%)" || { echo "  FAIL coverage ${pct:-0}%, min $re%"; ok=0; } ;;
        \~) grep -Eiq -- "$re" "$work.log" && echo "  pass reply   $re" || { echo "  FAIL reply lacks $re"; ok=0; } ;;
        ^) [ -f "$work/$re" ] && ! diff "$work.keep/$re" "$work/$re" | grep -q '^<' && echo "  pass kept    $re (lines only added)" || { echo "  FAIL changed or removed lines in $re"; ok=0; } ;;
        =) [ "$docs" = "$re" ] && echo "  pass edited  $re in place" || { echo "  FAIL wrote $docs, expected an edit to $re"; ok=0; } ;;
      esac
    done < "$dir/expect"

    if [ -f "$dir/questions" ]; then
      # The reader runs in an empty folder: the doc in the prompt is all it knows.
      empty=$(mktemp -d)
      answers=$( { echo "Here is a feature doc. Using ONLY this doc, answer each question on its own line as 'N: answer'. If the doc does not say, answer 'N: unknown'."
                   echo; echo "$text"; echo; cut -f1 "$dir/questions" | nl -w1 -s': '; } | (cd "$empty" && $READER) 2>&1)
      i=0; right=0
      while IFS=$'\t' read -r q re; do
        i=$((i + 1))
        a=$(echo "$answers" | grep -E "^\**$i\**[:.)]" | head -1)
        # An answer that starts with "unknown" is never right, even if it contains the expected word.
        if ! echo "$a" | grep -Eiq '^[^:]*:[[:space:]*_`]*unknown' && echo "$a" | grep -Eiq -- "$re"; then right=$((right + 1)); else echo "  FAIL reader  $q -> ${a:-no answer}"; fi
      done < "$dir/questions"
      echo "  reader answered $right/$i from the doc alone"
      [ "$right" -lt "$i" ] && ok=0
    fi
  fi
  [ $ok = 1 ] && echo "  PASS" || { echo "  inspect: $work  (agent log: $work.log)"; failed=1; }
done
exit $failed
