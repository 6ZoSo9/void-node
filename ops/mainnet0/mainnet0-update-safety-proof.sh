#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-mainnet0-update-safety-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== mainnet0 update safety proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [0] git/runtime truth ==="
git branch --show-current | tee "$OUT/git.branch.txt"
git rev-parse --short HEAD | tee "$OUT/git.head.txt"
git describe --tags --always --dirty | tee "$OUT/git.describe.txt"
git status --short | tee "$OUT/git.status.before.txt"

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] ready ==="
curl -fsS "$BASE/__void/ready.json" | tee "$OUT/ready.before.json"
echo

echo
echo "=== [3] baseline runtime marker clean ==="
make update-runtime-marker-clean-proof

echo
echo "=== [4] notification API proof ==="
make update-notification-api-proof

echo
echo "=== [5] critical/security notification UI proof ==="
make update-notification-critical-ui-proof

echo
echo "=== [6] signed artifact metadata mutation proof ==="
make update-signed-artifact-mutation-proof

echo
echo "=== [7] valid signed artifact marker-only proof ==="
make update-valid-artifact-marker-only-proof

echo
echo "=== [8] update-now preflight-only proof ==="
make update-now-preflight-only-proof

echo
echo "=== [9] final runtime marker clean ==="
make update-runtime-marker-clean-proof

echo
echo "=== [10] final update status ==="
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/update-status.final.json"
echo

python3 - "$OUT/update-status.final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is True, j
assert j.get("update_available") is False, j
assert j.get("installs_update") is False, j
print("[ok] final update status safe")
PY

echo
echo "=== [11] no active staged/pending/rollback markers ==="
for f in runtime/upgrade-staged.v1.json runtime/upgrade-apply-pending.v1.json runtime/upgrade-rollback-marker.v1.json; do
  if [ -f "$f" ]; then
    echo "[ERR] active update marker remains: $f"
    exit 1
  fi
done
echo "[ok] no active staged/pending/rollback markers"

echo
echo "=== [12] git status ==="
git status --short | tee "$OUT/git.status.after.txt"

echo
echo "=== mainnet0 update safety proof green ==="
echo "out=$OUT"
