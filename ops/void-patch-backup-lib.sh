#!/usr/bin/env bash
set -euo pipefail

# usage:
#   void_backup_file "/abs/or/rel/path" "$REPOROOT"
#   void_backup_glob "globpattern" "$REPOROOT"
#
# backups go to:
#   root -> /root/void-patch-quarantine/<ts>/
#   user -> $HOME/.cache/void-patch-quarantine/<ts>/

void__ts() { date +%Y%m%d-%H%M%S; }

void__qroot() {
  local ts="${1:-$(void__ts)}"
  if [[ "$(id -u)" == "0" ]]; then
    echo "/root/void-patch-quarantine/$ts"
  else
    echo "${HOME}/.cache/void-patch-quarantine/$ts"
  fi
}

void_backup_file() {
  local file="$1"
  local reporoot="$2"
  [[ -n "$file" && -n "$reporoot" ]] || { echo "[ERR] void_backup_file <file> <reporoot>"; return 2; }

  local abs
  abs="$(cd "$reporoot" && realpath -m "$file")"
  [[ -f "$abs" ]] || { echo "[WARN] not a file: $abs"; return 0; }

  local ts="${VOID_PATCH_TS:-$(void__ts)}"
  local qroot; qroot="$(void__qroot "$ts")"
  mkdir -p "$qroot"

  local rel
  rel="$(realpath --relative-to="$reporoot" "$abs" 2>/dev/null || echo "$file")"

  local dst="$qroot/$rel"
  mkdir -p "$(dirname "$dst")"
  cp -a "$abs" "$dst"
  echo "[bak] $rel -> $qroot"
}

void_backup_glob() {
  local pattern="$1"
  local reporoot="$2"
  [[ -n "$pattern" && -n "$reporoot" ]] || { echo "[ERR] void_backup_glob <pattern> <reporoot>"; return 2; }

  ( cd "$reporoot" && shopt -s nullglob && for f in $pattern; do
      [[ -f "$f" ]] || continue
      void_backup_file "$f" "$reporoot"
    done )
}
