#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

node scripts/prove_segmented_jsonl_ci_topology_v1.mjs

BASELINE_FILE="${VOID_TSC_NOEMIT_BASELINE_FILE:-fixtures/ops/ci-baselines/tsc-noemit-v1.json}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

set +e
npx tsc --noEmit --pretty false >"$TMP" 2>&1
TSC_RC="$?"
set -e

COUNT="$(grep -c 'error TS' "$TMP" || true)"

BASELINE="${VOID_TSC_NOEMIT_BASELINE_COUNT:-}"
if [ -z "$BASELINE" ]; then
  if [ -f "$BASELINE_FILE" ] && command -v jq >/dev/null 2>&1; then
    BASELINE="$(jq -r '.baseline_error_count // empty' "$BASELINE_FILE")"
  elif [ -f "$BASELINE_FILE" ] && command -v python3 >/dev/null 2>&1; then
    BASELINE="$(python3 - "$BASELINE_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f).get("baseline_error_count", ""))
PY
)"
  fi
fi

if [ -z "$BASELINE" ]; then
  echo "FAIL: missing TypeScript baseline count" >&2
  cat "$TMP"
  exit 1
fi

case "$COUNT:$BASELINE" in
  *[!0-9:]*|"":*)
    echo "FAIL: non-numeric TypeScript baseline values count=$COUNT baseline=$BASELINE" >&2
    exit 1
    ;;
esac

if [ "$COUNT" -gt "$BASELINE" ]; then
  echo "FAIL: TypeScript noEmit errors grew: count=$COUNT baseline=$BASELINE"
  cat "$TMP"
  exit 1
fi

echo "OK: TypeScript noEmit error count=$COUNT <= baseline=$BASELINE"
if [ "$TSC_RC" != "0" ]; then
  echo "baseline TypeScript debt remains accepted by fixture"
fi
