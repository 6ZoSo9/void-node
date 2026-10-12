#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-mainnet0-validator-lifecycle-preflight-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"

echo "=== Mainnet-0 validator lifecycle preflight proof ==="
echo "out=$OUT"

echo
echo "=== [a] build ==="
npm run build

echo
echo "=== [b] baseline readiness ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.baseline.json"
cat "$OUT/ready.baseline.json"
echo
curl -fsS "$PROM/-/ready"
echo

echo
echo "=== [c] lifecycle preflight direct ==="
make mainnet0-validator-lifecycle-preflight | tee "$OUT/preflight.log"

grep -q '\[ok\] Mainnet-0 validator lifecycle preflight green' "$OUT/preflight.log"

echo
echo "=== [d] wrapper proof without rerunning broader go/no-go ==="
RUN_MAINNET0_EXISTING_GONO=0 make mainnet0-go-no-go-with-validator-lifecycle | tee "$OUT/wrapper.log"

grep -q '\[ok\] Mainnet-0 go/no-go validator lifecycle wrapper green' "$OUT/wrapper.log"

echo
echo "=== [e] artifact proof ==="
ART=".runtime/mainnet0/mainnet0-validator-lifecycle-preflight.local.current.json"
test -f "$ART"
cat "$ART"
echo
python3 - "$ART" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("kind") == "mainnet0_validator_lifecycle_preflight", j
assert int(j.get("metricValue")) == 1, j
assert int(j.get("lanesTotal")) == 7, j
assert j.get("validatorLifecycleGateRequiredForMainnet0") is True, j
print("[ok] preflight artifact green")
PY

echo
echo "=== [f] final guards/readiness ==="
/usr/local/bin/prom-job-dupes.sh
/usr/local/bin/prom-safe-reload.sh

curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.final.json"
cat "$OUT/ready.final.json"
echo
curl -fsS --get "$PROM/api/v1/query" --data-urlencode 'query=ready:last_30s' > "$OUT/prom.ready.last30s.json"
cat "$OUT/prom.ready.last30s.json"
echo
curl -fsS --get "$PROM/api/v1/query" --data-urlencode 'query=void_mainnet_validator_lifecycle_composite_ok' > "$OUT/prom.lifecycle.ok.json"
cat "$OUT/prom.lifecycle.ok.json"
echo

python3 - "$OUT/ready.final.json" "$OUT/prom.ready.last30s.json" "$OUT/prom.lifecycle.ok.json" <<'PY'
import json, sys
ready=json.load(open(sys.argv[1]))
assert ready.get("ready") is True, ready
assert int(ready.get("gap", -1)) == 0, ready
assert int(ready.get("txroot_live", 0)) == 1, ready

for path,name in [(sys.argv[2],"ready:last_30s"),(sys.argv[3],"lifecycle_ok")]:
    j=json.load(open(path))
    r=(j.get("data") or {}).get("result") or []
    assert r, (name,j)
    assert any(str((x.get("value") or ["",""])[1]) in ("1","1.0") for x in r), (name,j)

print("[ok] final readiness and lifecycle metric green")
PY

echo
echo "[ok] Mainnet-0 validator lifecycle preflight proof green"
