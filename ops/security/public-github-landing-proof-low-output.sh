#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "${VOID_REPO:-$HOME/dev/void-node}"

TS="$(date +%Y%m%d-%H%M%S)"
LOG="${PUBLIC_GITHUB_LANDING_PROOF_LOG:-/tmp/public-github-landing-proof-low-output-$TS.log}"

echo "=== public GitHub landing proof low-output wrapper ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo

set +e
make public-github-landing-proof > "$LOG" 2>&1
RC=$?
set -e

echo
echo "proof_rc=$RC"
echo "proof_log=$LOG"

if [ "$RC" = "0" ]; then
  echo
  echo "=== proof summaries ==="
  grep -E \
    "public_first60_user_journey|public_download_install_journey|public_support_route_triage|public_github_landing|sensitive_get_routes|mutation_lanes|\\[ok\\] public GitHub landing proof passed" \
    "$LOG" | tail -n 40 || true
else
  echo
  echo "=== failure tail ==="
  tail -n 180 "$LOG"
fi

echo
echo "=== runtime truth after proof ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo

exit "$RC"
