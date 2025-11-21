#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-local}"

if ! repo=$(git rev-parse --show-toplevel 2>/dev/null); then
  echo "[secrets-guard] not in a git repo; skipping"
  exit 0
fi
cd "$repo"

echo "[secrets-guard] mode=$MODE repo=$repo"

# Tighter patterns:
# - Real private key blocks
# - Common cloud/API keys
# - DEVNET_PRIVKEY hex (anvil key) – we *do* still treat as sensitive unless explicitly waived
# - Authorization: Bearer <long literal token> (won't match $TOKEN or $VOID_AGENT_TOKEN)
regex='(BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|BEGIN PGP PRIVATE KEY BLOCK|-----BEGIN [A-Z ]*PRIVATE KEY-----|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|GOOGLE_API_KEY|OPENAI_API_KEY|DEVNET_PRIVKEY=0x[0-9a-fA-F]{64}|DATABASE_URL=|SECRET_KEY=|Authorization:[[:space:]]*Bearer[[:space:]]+[A-Za-z0-9._-]{20,})' # void-ok-secret: pattern only, not a real secret

hits=""

# Walk all tracked files; skip dirs/symlinks and our own CI secret guards
while IFS= read -r -d '' f; do
  # Skip non-regular files (dirs, symlinks to dirs, etc.)
  if [[ ! -f "$f" ]]; then
    continue
  fi

  # Skip our own CI guards / workflows (they contain secret regex patterns by design)
  case "$f" in
    .ci/*|.github/workflows/*)
      continue
      ;;
  esac

  # Find suspicious lines, but ignore ones explicitly annotated as safe
  line_hits=$(
    grep -En --color=never -E "$regex" "$f" 2>/dev/null \
      | grep -v 'void-ok-secret' \
      || true
  )

  if [[ -n "$line_hits" ]]; then
    hits+="$line_hits"$'\n'
  fi
done < <(git ls-files -z)

if [[ -n "$hits" ]]; then
  echo "[secrets-guard] ERROR: potential secrets found in tracked files:"
  printf '%s\n' "$hits"
  cat <<'EOF'
[secrets-guard] Blocked push/commit due to likely secrets.
[secrets-guard] Fix by:
  - Removing the secret from the repo (move to env/secret storage), OR
  - If truly safe (e.g. sample/placeholder), add a trailing comment:
        # void-ok-secret: <reason>
    on that line to explicitly allow it.
EOF
  exit 1
fi

echo "[secrets-guard] OK (no obvious secrets in tracked files)"
