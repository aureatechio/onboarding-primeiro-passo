#!/usr/bin/env bash
# Mirror any change under .claude/skills/ to .agents/skills/ and vice-versa.
# Invoked as a Claude Code PostToolUse hook on Write|Edit|MultiEdit.
# Reads tool input JSON on stdin and rsyncs the source tree to the mirror.
# Does not propagate deletions (no --delete).

set -eu

f=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "${f:-}" ] && exit 0

case "$f" in
  */.claude/skills/*)
    root="${f%%/.claude/skills/*}"
    src="$root/.claude/skills/"
    dst="$root/.agents/skills/"
    ;;
  */.agents/skills/*)
    root="${f%%/.agents/skills/*}"
    src="$root/.agents/skills/"
    dst="$root/.claude/skills/"
    ;;
  *)
    exit 0
    ;;
esac

[ -d "$src" ] || exit 0
mkdir -p "$dst"
rsync -a "$src" "$dst" 2>/dev/null || true
