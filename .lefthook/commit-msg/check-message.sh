#!/bin/sh
# Checks a commit message before git accepts it (run by lefthook's commit-msg hook).
# Rules (see .agents/rules/git-workflow.md):
#   - header: type(#123): subject  or  type(TASK-123): subject, subject at most 72 characters
#   - no attribution trailers such as "Co-Authored-By:"
# Merge and revert messages created by git itself are allowed as they are.

msg_file="$1"
header=$(head -n 1 "$msg_file")

case "$header" in
  Merge\ *|Revert\ *) exit 0 ;;
esac

types='feat|fix|refactor|perf|test|docs|build|ci|chore|style|revert'
if ! printf '%s\n' "$header" | grep -Eq "^($types)\((#[0-9]+|TASK-[0-9]+)\)!?: [^ ].{0,71}$"; then
  echo "Commit message header is not valid: $header" >&2
  echo "Use: type(#123): subject  or  type(TASK-123): subject  (types: $types; subject at most 72 characters)" >&2
  exit 1
fi

if grep -qi '^co-authored-by:' "$msg_file"; then
  echo "Remove attribution trailers such as Co-Authored-By from the commit message." >&2
  exit 1
fi
