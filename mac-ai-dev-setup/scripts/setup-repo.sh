#!/usr/bin/env bash
# setup-repo.sh <repo-dir> [python-bin]: install one repo's dependencies from its own lockfile.
set -euo pipefail
repo="${1:?usage: setup-repo.sh <repo-dir> [python-bin]}"; cd "$repo"
name="$(basename "$PWD")"; PY="${2:-python3.12}"; VENV="$HOME/.venvs/$name"

if [ -f package.json ]; then
  if   [ -f pnpm-lock.yaml ];    then pnpm install --frozen-lockfile
  elif [ -f yarn.lock ];         then yarn install --frozen-lockfile
  elif [ -f package-lock.json ]; then npm ci --no-audit --no-fund
  else npm install --no-audit --no-fund; fi
  # npm 11 skips dependency install scripts; show which ones were skipped
  [ -f package-lock.json ] && { npm install-scripts ls 2>/dev/null | head -8 || true; }
fi

if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
  command -v "$PY" >/dev/null || { echo "missing $PY: brew install python@${PY#python}"; exit 1; }
  [ -d "$VENV" ] || "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install -q --upgrade pip || echo "(pip self-upgrade skipped)"
  if [ -f requirements.txt ]; then "$VENV/bin/python" -m pip install -r requirements.txt
  else "$VENV/bin/python" -m pip install -e .; fi
  rm -rf ./*.egg-info   # editable installs leave an untracked egg-info behind
  echo "python ready: $VENV/bin/python"
fi
