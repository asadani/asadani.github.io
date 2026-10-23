#!/usr/bin/env bash
# link-skills.sh <root> [--apply]: find Claude Code skills in cloned repos and link them into ~/.claude/skills.
# Without --apply it only lists what it would link. Skills under a repo's .claude/ are skipped
# (Claude already loads those when you work inside that repo).
ROOT="${1:-$HOME/Projects}"; APPLY="${2:-}"; DEST="$HOME/.claude/skills"
[ "$APPLY" = "--apply" ] && mkdir -p "$DEST"
find "$ROOT" -maxdepth 5 -name SKILL.md -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.claude/*' | sort | while IFS= read -r f; do
  d="$(dirname "$f")"
  n="$(sed -n 's/^name:[[:space:]]*//p' "$f" | head -1 | tr -d "\"' ")"; n="${n:-$(basename "$d")}"
  if   [ -e "$DEST/$n" ];        then echo "exists  $n"
  elif [ "$APPLY" = "--apply" ]; then ln -s "$d" "$DEST/$n" && echo "linked  $n  <-  ${d#$ROOT/}"
  else                                echo "would link  $n  <-  ${d#$ROOT/}"; fi
done
[ "$APPLY" = "--apply" ] || echo "(dry run: add --apply to create the links)"
