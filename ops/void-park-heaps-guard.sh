#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
PARK_REL="${PARK_REL:-src/.park}"
PARK="$ROOT/$PARK_REL"

MODE="${1:-run}"          # run | scan | archive | prune | purge
KEEP_ARCHIVES="${KEEP_ARCHIVES:-5}"   # keep newest N archives
ZSTD_LEVEL="${ZSTD_LEVEL:-19}"

log() { echo "[$(date +%H:%M:%S)] $*"; }

cd "$ROOT" || exit 1
if [[ ! -d "$PARK" ]]; then
  log "ok: missing $PARK (nothing to do)"
  exit 0
fi

scan_heaps_dirs() {
  find "$PARK" -maxdepth 1 -type d -name 'heaps-*' -print | sort || true
}

scan_archives() {
  ls -1t "$PARK"/heaps-*.tar.zst 2>/dev/null || true
}

archive_one_dir() {
  local d="$1"
  local base arch sha actual

  base="$(basename "$d")"
  arch="$PARK/${base}.tar.zst"
  sha="$arch.sha256"

  log "target dir=$d"
  du -sh "$d" 2>/dev/null || true

  if [[ -f "$arch" ]]; then
    log "skip: archive already exists: $arch"
    return 0
  fi

  command -v zstd >/dev/null 2>&1 || { log "ERR: zstd missing. Install: sudo apt install -y zstd"; return 2; }

  log "archive: tar | zstd -> $arch"
  tar -C "$PARK" -cf - "$base" | zstd -T0 "-$ZSTD_LEVEL" -o "$arch"

  log "hash: sha256sum -> $sha (basename-only)"
  actual="$(sha256sum "$arch" | awk '{print $1}')"
  printf "%s  %s\n" "$actual" "$(basename "$arch")" > "$sha"

  log "verify: sha256sum -c"
  ( cd "$PARK" && sha256sum -c "$(basename "$sha")" )

  log "ok: archived+verified: $arch"
}

purge_one_dir_if_verified_archive() {
  local d="$1"
  local base arch sha

  base="$(basename "$d")"
  arch="$PARK/${base}.tar.zst"
  sha="$arch.sha256"

  if [[ ! -f "$arch" || ! -f "$sha" ]]; then
    log "skip purge: missing archive or sha for $base"
    return 0
  fi

  log "verify before purge: $sha"
  if ( cd "$PARK" && sha256sum -c "$(basename "$sha")" ); then
    log "rm -rf $d"
    rm -rf "$d"
    log "ok: purged $d"
  else
    log "skip purge: sha verify FAILED for $base"
  fi
}

prune_archives() {
  local keep="$KEEP_ARCHIVES"
  mapfile -t A < <(scan_archives)
  local n="${#A[@]}"
  log "archives found=$n keep=$keep"
  if (( n <= keep )); then
    log "ok: nothing to prune"
    return 0
  fi

  for (( i=keep; i<n; i++ )); do
    local arch="${A[$i]}"
    local sha="$arch.sha256"
    log "prune: $arch"
    rm -f "$arch" || true
    rm -f "$sha"  || true
  done
  log "ok: pruned old archives"
}

scan() {
  log "park size:"
  du -sh "$PARK" || true
  log "heaps dirs:"
  scan_heaps_dirs | sed 's/^/[dir] /' || true
  log "archives:"
  scan_archives | sed 's/^/[arc] /' || true
}

run_all() {
  scan

  mapfile -t D < <(scan_heaps_dirs)
  if [[ "${#D[@]}" -gt 0 ]]; then
    log "archive phase..."
    for d in "${D[@]}"; do
      archive_one_dir "$d"
    done

    log "purge phase (only verified archives)..."
    for d in "${D[@]}"; do
      purge_one_dir_if_verified_archive "$d"
    done
  else
    log "ok: no heaps dirs to archive"
  fi

  log "prune phase..."
  prune_archives

  log "final scan..."
  scan
}

case "$MODE" in
  scan) scan ;;
  archive)
    mapfile -t D < <(scan_heaps_dirs)
    for d in "${D[@]}"; do archive_one_dir "$d"; done
    ;;
  purge)
    mapfile -t D < <(scan_heaps_dirs)
    for d in "${D[@]}"; do purge_one_dir_if_verified_archive "$d"; done
    ;;
  prune) prune_archives ;;
  run) run_all ;;
  *) log "ERR usage: $0 [run|scan|archive|purge|prune]"; exit 2 ;;
esac
