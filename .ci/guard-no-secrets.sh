#!/usr/bin/env bash
set -euo pipefail
bad=$(git diff --cached -U0 | grep -E 'BEGIN (EC|RSA|OPENSSH) PRIVATE KEY|grafana\.token|Authorization: Bearer|x-api-key|x-secret' -n || true)
if [[ -n "$bad" ]]; then
  echo "[FAIL] potential secret material staged:"
  echo "$bad"
  exit 1
fi
exit 0
