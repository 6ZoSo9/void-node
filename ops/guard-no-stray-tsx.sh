#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Allowlist legit TSX that *is* part of the node repo.
# Everything else under src/**.tsx is considered stray UI and should be parked.
ALLOWLIST_REGEX='^src/ui/MainDashboard\.tsx$'

# Find TSX under src/, excluding src/.park/
mapfile -t TSX < <(find src -type f -name '*.tsx' ! -path 'src/.park/*' -print | sed 's|^\./||')

# Filter out allowlisted files
BAD=()
for f in "${TSX[@]:-}"; do
  if ! echo "$f" | grep -Eq "${ALLOWLIST_REGEX}"; then
    BAD+=("$f")
  fi
done

if [ "${#BAD[@]}" -gt 0 ]; then
  echo "[FAIL] stray TSX found under src/ (excluding src/.park/), not in allowlist:"
  printf '  %s\n' "${BAD[@]}"
  exit 1
fi

echo "OK: no stray TSX under src/ (excluding src/.park/). Allowlisted: src/ui/MainDashboard.tsx"
