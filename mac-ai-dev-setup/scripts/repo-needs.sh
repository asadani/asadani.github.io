#!/usr/bin/env bash
# repo-needs.sh <root>: scan cloned repos and report which tools each one needs.
# Read-only: it looks at file names and a few manifest lines, installs nothing.
# Works with the bash 3.2 that ships with macOS.
ROOT="${1:-$HOME/Projects}"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

find "$ROOT" -maxdepth 3 -name .git -type d -prune 2>/dev/null | sort | while IFS= read -r g; do
  repo="$(dirname "$g")"; name="${repo#$ROOT/}"
  files="$(find "$repo" -maxdepth 3 \( -name node_modules -o -name .git -o -name .venv -o -name target -o -name .research \) -prune -o -type f -print 2>/dev/null)"
  has()  { printf '%s\n' "$files" | grep -Eq "(^|/)($1)\$"; }
  first() { printf '%s\n' "$files" | grep -E "(^|/)($1)\$" | head -1; }
  found=""; seen=" "
  add() {  # add <tool> [label shown in the per-repo line]
    case "$seen" in *" $1 "*) return;; esac
    seen="$seen$1 "; found="$found ${2:-$1}"; printf '%s\t%s\n' "$1" "$name" >> "$TMP"
  }

  if has 'package\.json'; then
    pj="$(first 'package\.json')"
    if   has 'pnpm-lock\.yaml'; then add pnpm
    elif has 'yarn\.lock';      then add yarn
    elif has 'bun\.lockb?';     then add bun
    else add node; fi
    grep -q 'mermaid-cli' "$pj" 2>/dev/null && add mermaid
    grep -Eq '"(puppeteer|playwright)' "$pj" 2>/dev/null && add browser
  fi
  if has 'pyproject\.toml|requirements[A-Za-z0-9._-]*\.txt|setup\.py|Pipfile'; then
    pyfiles="$(printf '%s\n' "$files" | grep -E '(^|/)(pyproject\.toml|requirements[A-Za-z0-9._-]*\.txt)$' | head -5)"
    # shellcheck disable=SC2086
    rp="$( [ -n "$pyfiles" ] && grep -hE '^requires-python' $pyfiles 2>/dev/null | head -1 | sed -E 's/.*"([^"]*)".*/\1/' )"
    add python "python${rp:+($rp)}"
    # shellcheck disable=SC2086
    if [ -n "$pyfiles" ] && grep -Eqi '^[[:space:]"]*(torch|tensorflow|transformers)[ =<>~"\[,]' $pyfiles 2>/dev/null; then add ml-heavy; fi
    # shellcheck disable=SC2086
    [ -n "$pyfiles" ] && grep -Eqi 'kokoro' $pyfiles 2>/dev/null && add kokoro
    # shellcheck disable=SC2086
    [ -n "$pyfiles" ] && grep -Eqi 'faster-whisper|openai-whisper' $pyfiles 2>/dev/null && add whisper
    # shellcheck disable=SC2086
    [ -n "$pyfiles" ] && grep -Eqi 'qwen-tts' $pyfiles 2>/dev/null && add qwen
    # shellcheck disable=SC2086
    [ -n "$pyfiles" ] && grep -Eqi '^[[:space:]"]*ollama' $pyfiles 2>/dev/null && add ollama
  fi
  has 'Cargo\.toml'                          && add rust
  has 'go\.mod'                              && add go
  has 'pom\.xml|build\.gradle(\.kts)?'       && add java
  has 'Gemfile'                              && add ruby
  has 'composer\.json'                       && add php
  has 'Dockerfile|docker-compose\.ya?ml|compose\.ya?ml' && add docker
  mk="$(first 'Makefile')"
  if [ -n "$mk" ]; then
    grep -Eqi 'pandoc' "$mk" && add pandoc
    grep -Eqi 'pdflatex|xelatex|lualatex' "$mk" && add latex
    grep -Eqi 'ffmpeg' "$mk" && add ffmpeg
  fi
  has '.*\.mmd'                               && add mermaid
  has '\.mcp\.json'                           && add mcp
  has 'SKILL\.md'                             && add claude-skill
  has '\.env\.(example|sample|template)'      && add env-file
  # tools the README or docs tell you to brew install
  printf '%s\n' "$files" | grep -Ei '(^|/)(README|CONTRIBUTING|SETUP|INSTALL)[^/]*\.md$' | head -3 | while IFS= read -r d; do
    grep -Eoh 'brew install( --cask)? [A-Za-z0-9@._ /-]+' "$d" 2>/dev/null
  done | sort -u | while IFS= read -r l; do printf 'brew-hint\t%s: %s\n' "$name" "$l" >> "$TMP"; done

  [ -n "$found" ] && printf '%-42s%s\n' "$name" "$found"
done

echo
echo "== Tools needed, by number of repos =="
grep -v '^brew-hint' "$TMP" | cut -f1 | sort | uniq -c | sort -rn | awk '{printf "  %-12s %s repo(s)\n", $2, $1}'
if grep -q '^brew-hint' "$TMP"; then
  echo; echo "== Repos that name brew packages in their docs =="
  grep '^brew-hint' "$TMP" | cut -f2 | sed 's/^/  /'
fi
echo
echo "== Suggested Homebrew line (review before running) =="
want() { grep -v '^brew-hint' "$TMP" | cut -f1 | grep -qx "$1"; }
pk=""; cask=""
want node    && pk="$pk node";   want pnpm && pk="$pk pnpm";  want yarn && pk="$pk yarn"
want bun     && pk="$pk oven-sh/bun/bun"
want rust    && pk="$pk rustup"; want go   && pk="$pk go"
want java    && pk="$pk openjdk@21 maven"
want ruby    && pk="$pk ruby";   want php  && pk="$pk php"
want python  && pk="$pk python@3.12"
want ffmpeg  && pk="$pk ffmpeg"; want pandoc && pk="$pk pandoc"
want mermaid && pk="$pk node"
want qwen    && pk="$pk sox"
want docker  && cask="$cask docker"
want latex   && cask="$cask basictex"
want browser && cask="$cask google-chrome"
[ -n "$pk" ]   && echo "  brew install $(echo $pk | tr ' ' '\n' | sort -u | tr '\n' ' ')"
[ -n "$cask" ] && echo "  brew install --cask $(echo $cask | tr ' ' '\n' | sort -u | tr '\n' ' ')   # may ask for your password"
want ml-heavy && echo "  note: ml-heavy repos pull multi-GB torch/transformers downloads; install those last"
if [ -z "$pk$cask" ]; then echo "  nothing beyond git"; fi
