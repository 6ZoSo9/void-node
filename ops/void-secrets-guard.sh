#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-staged}"   # staged | all
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

cd "$ROOT" || exit 1

echo "[secrets-guard] mode=$MODE repo=$ROOT"

# patterns (keep simple + dependency-free)
# note: avoid insanely broad patterns that false-positive on your codebase
PATTERNS=(
  'BEGIN (OPENSSH|RSA|EC|DSA) PRIVATE KEY'
  'BEGIN PRIVATE KEY'
  'ssh-ed25519 '
  'xprv'
  'mnemonic'
  'seed phrase'
  'api[_-]?key'
  'secret[_-]?key'
  'AWS[_-]?SECRET[_-]?ACCESS[_-]?KEY'
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN'
)

# file allowlist (paths that commonly contain test vectors / docs; adjust as needed)
ALLOW_RE='(^docs/|^ops/README\.md$|^README\.md$|\.lock$|\.png$|\.jpg$|\.gif$|\.svg$)'
# never scan the scanner / hooks (avoid self-matching)
SKIP_RE='^(ops/void-secrets-guard\.sh|\.githooks/)' 


list_files() {
  if [[ "$MODE" == "all" ]]; then
    git ls-files
  else
    git diff --cached --name-only --diff-filter=ACMR
  fi
}

BAD=0
while IFS= read -r f; do
  [[ -z "${f:-}" ]] && continue
  [[ "$f" =~ $ALLOW_RE ]] && continue
    [[ "$f" =~ $SKIP_RE ]] && continue
  [[ ! -f "$f" ]] && continue

  # skip very large tracked files to avoid slow hooks
  sz="$(wc -c <"$f" 2>/dev/null || echo 0)"
  if [[ "$sz" -gt 2000000 ]]; then
    echo "[secrets-guard] skip large file: $f ($sz bytes)"
    continue
  fi

  # scan content
  for p in "${PATTERNS[@]}"; do
    if rg -n --no-messages -S "$p" "$f" >/dev/null 2>&1; then
      echo
      echo "[secrets-guard] HIT pattern: $p"
      rg -n -S "$p" "$f" || true
      echo "[secrets-guard] file: $f"
      BAD=1
    fi
  done
done < <(list_files)

if [[ "$BAD" -ne 0 ]]; then
  echo
  echo "[secrets-guard] FAIL: possible secret material detected in files above."
  echo "[secrets-guard] If this is a false positive, tighten patterns or extend ALLOW_RE."
  exit 2
fi

echo "[secrets-guard] OK (no obvious secrets in scanned files)"
