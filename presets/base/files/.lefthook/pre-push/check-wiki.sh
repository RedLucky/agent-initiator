#!/bin/sh
# Warns when code changes come without an update of the English wiki (docs/wiki/en/).
# It never blocks a push: the documentation rule asks for wiki updates, and this is a reminder, not a gate.
# Changes that truly need no wiki update add this line to a commit message:  Wiki: not needed (<reason>)
#
# Usage:
#   lefthook pre-push script: reads git's "<local ref> <local sha> <remote ref> <remote sha>" lines from stdin.
#   CI (pull/merge requests):  sh check-wiki.sh --range <base sha> <head sha>
#     exit 1 means "warning": the CI step is allowed to fail, so the merge is not blocked.

# Checks the commits selected by the git log arguments in "$@".
# Returns 1 (after printing a warning) when they change code but not docs/wiki/en/ and give no reason.
check() {
  files=$(git log --format= --name-only "$@" | sort -u)
  # Docs and Markdown files are not code; anything else is.
  code=$(printf '%s\n' "$files" | grep -v -e '^$' -e '^docs/' -e '\.md$')
  [ -z "$code" ] && return 0
  printf '%s\n' "$files" | grep -q '^docs/wiki/en/' && return 0
  git log --format=%B "$@" | grep -Eq '^Wiki: not needed \(.+\)$' && return 0

  message="Code changed without an update in docs/wiki/en/. Update the topic page (update-wiki skill), or add 'Wiki: not needed (<reason>)' to the commit message."
  if [ "$GITHUB_ACTIONS" = "true" ]; then
    echo "::warning::$message"
  else
    echo "warning: $message" >&2
  fi
  return 1
}

if [ "$1" = "--range" ]; then
  check "$2..$3"
  exit $?
fi

# git uses an all-zero sha for "no commit": a new remote branch, or a deleted local one.
is_zero() {
  case "$1" in
    *[!0]*) return 1 ;;
    *) return 0 ;;
  esac
}

while read -r local_ref local_sha remote_ref remote_sha; do
  is_zero "$local_sha" && continue
  if is_zero "$remote_sha"; then
    # New branch: only the commits that no remote branch has yet.
    check "$local_sha" --not --remotes
  else
    check "$remote_sha..$local_sha"
  fi
done
exit 0
