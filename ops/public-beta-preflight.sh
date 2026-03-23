#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE_MAIN="${BASE_MAIN:-http://127.0.0.1:4100}"
BASE_ISO="${BASE_ISO:-http://127.0.0.1:4110}"
WC_BASE_ISO="${WC_BASE_ISO:-http://127.0.0.1:4314/workcredits/devnet}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "FAIL: missing $1" >&2; exit 1; }; }
need curl
need python3
need make

echo "=== [0] main node health ==="
curl -fsS --max-time 5 "${BASE_MAIN}/health" | sed -n '1,120p' || {
  echo "FAIL: main node health failed at ${BASE_MAIN}" >&2
  exit 1
}
echo

echo "=== [1] isolated node health ==="
curl -fsS --max-time 5 "${BASE_ISO}/health" | sed -n '1,120p' || {
  echo "FAIL: isolated node health failed at ${BASE_ISO}" >&2
  exit 1
}
echo

echo "=== [2] isolated helper pool ==="
curl -fsS --max-time 5 "${WC_BASE_ISO}/pool.json" | sed -n '1,180p' || {
  echo "FAIL: isolated helper pool failed at ${WC_BASE_ISO}" >&2
  exit 1
}
echo

echo "=== [3] isolated per-wallet WC proof ==="
make wc-wallet-proof
echo

echo "=== [4] public-beta preflight summary ==="
python3 - <<'PY'
print("PASS")
print("- main node reachable")
print("- isolated node reachable")
print("- isolated helper reachable")
print("- wallet-specific WC proof green")
print("- baseline is good enough for continued public-beta hardening")
PY
