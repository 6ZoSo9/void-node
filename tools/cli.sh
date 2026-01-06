#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:4100}"
cmd="${1:-health}"; shift || true
case "$cmd" in
  health) curl -sS "$BASE/api/health" | jq . ;;
  head) curl -sS "$BASE/api/head" | jq . ;;
  peers) curl -sS "$BASE/peers" | jq . ;;
  tx) curl -sS -XPOST "$BASE/tx" -H 'content-type: application/json' -d "${1:-"{"body":{"note":"hi"}}" }" | jq . ;;
  *) echo "unknown cmd"; exit 1 ;;
esac
