#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 public served surface proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] ready endpoint ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-public-surface-ready.json
echo
python3 - /tmp/void-public-surface-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
assert int(j.get("head", 0)) > 0, j
print("[ok] ready/head/gap/txroot")
PY

echo
echo "=== [3] participant page is served ==="
curl -fsS "$BASE/participant" > /tmp/void-public-surface-participant.html
test "$(wc -c </tmp/void-public-surface-participant.html | tr -d ' ')" -gt 100000
grep -q '<title>VOID Participant</title>' /tmp/void-public-surface-participant.html
grep -q 'VOID' /tmp/void-public-surface-participant.html
grep -q 'participant' /tmp/void-public-surface-participant.html
grep -q 'wallet' /tmp/void-public-surface-participant.html
grep -q 'DataNet' /tmp/void-public-surface-participant.html
grep -q 'Mainnet-0' /tmp/void-public-surface-participant.html
grep -q 'Start Here' /tmp/void-public-surface-participant.html
echo "[ok] participant page served with expected public markers"

echo
echo "=== [4] validator truth read surface is served / public-safe ==="
curl -fsS "$BASE/__void/runtime/validator-truth/status" > /tmp/void-public-surface-validator-truth.json
python3 - /tmp/void-public-surface-validator-truth.json <<'PY'
import json, pathlib, sys

j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j

configured = str(j.get("configuredMode") or "")
mode = str(j.get("mode") or "")
loaded = j.get("loadedEpochs")

docs = "\n".join(
    pathlib.Path(p).read_text(errors="ignore")
    for p in [
        "docs/public/mainnet0-current-public-status.md",
        "ops/mainnet/mainnet0-status.current.md",
        "ops/mainnet/mainnet0-final-gonogo-map.current.md",
        "ops/mainnet/mainnet0-current-baseline.current.md",
    ]
    if pathlib.Path(p).exists()
)

public_safe_candidate_only = all(x in docs for x in [
    "public_mainnet0_live",
    "Public active validator admission remains disabled",
    "Public validator registration",
])

if configured == "verified_epoch_manifests" and mode == "verified_epoch_manifests":
    assert isinstance(loaded, list) and len(loaded) > 0, j
    print("[ok] validator truth read surface verified_epoch_manifests")
elif configured == "legacy" and mode == "legacy":
    assert isinstance(loaded, list), j
    assert j.get("latestEpoch") in (None, "", 0), j
    assert j.get("lookupsAvailable") is False, j
    assert public_safe_candidate_only, "legacy validator read surface requires public-safe candidate-only docs posture"
    print("[ok] validator truth read surface legacy public-safe candidate-only")
else:
    raise AssertionError(j)
PY
echo
echo "=== [5] non-public/default routes stay non-public ==="
check_404() {
  local path="$1"
  local code
  code="$(curl -sS -o /tmp/void-public-surface-nonpublic-body.txt -w '%{http_code}' "$BASE$path")"
  if [ "$code" != "404" ]; then
    echo "[ERR] expected 404 for $path, got $code"
    head -c 300 /tmp/void-public-surface-nonpublic-body.txt || true
    echo
    exit 1
  fi
  echo "[ok] $path is not exposed as public GET surface"
}

code_root="$(curl -sS -o /tmp/void-public-surface-root-body.txt -w '%{http_code}' "$BASE/")"
if [ "$code_root" != "302" ]; then
  echo "[ERR] expected 302 for /, got $code_root"
  head -c 300 /tmp/void-public-surface-root-body.txt || true
  echo
  exit 1
fi
grep -q 'Found. Redirecting to /participant' /tmp/void-public-surface-root-body.txt
echo "[ok] / redirects to /participant"
check_404 "/__void/status"
check_404 "/__void/participant/stake/next-onboard"

echo
echo "=== [6] public docs stack still green ==="
make mainnet0-public-docs-stack-proof
make mainnet0-current-public-status-proof
make mainnet0-status-smoke

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "public_surface": "green",
  "participant": "served",
  "ready": "green",
  "validator_truth_read": "served_public_safe",
  "root_get": "redirects_to_participant",
  "legacy_status_get": "not_public_404",
  "next_onboard_get": "not_public_404",
  "mutation_lanes": "not_touched"
})
PY

echo "[ok] Mainnet-0 public served surface proof passed"
