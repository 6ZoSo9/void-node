#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
MAX_AGE_SECONDS="${MAX_AGE_SECONDS:-86400}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-mainnet0-validator-lifecycle-preflight.$STAMP}"

COMPOSITE_ART="${COMPOSITE_ART:-.runtime/mainnet0/validator-lifecycle-composite.local.current.json}"
PROM_ART="${PROM_ART:-.runtime/mainnet0/validator-lifecycle-composite-prom.local.current.json}"

mkdir -p "$OUT"
chmod 700 "$OUT"

echo "=== Mainnet-0 validator lifecycle preflight ==="
echo "base=$BASE"
echo "prom=$PROM"
echo "max_age_seconds=$MAX_AGE_SECONDS"
echo "out=$OUT"

echo
echo "=== [a] VOID readiness ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/void-ready.json"
cat "$OUT/void-ready.json"
echo
python3 - "$OUT/void-ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] VOID ready")
PY

echo
echo "=== [b] Prometheus readiness ==="
curl -fsS "$PROM/-/ready"
echo

query_prom() {
  local q="$1"
  local out="$2"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$q" > "$out"
  cat "$out"
  echo
}

assert_prom_scalar() {
  local file="$1"
  local label="$2"
  local expected="$3"
  python3 - "$file" "$label" "$expected" <<'PY'
import json, sys, math
path,label,expected = sys.argv[1], sys.argv[2], float(sys.argv[3])
j=json.load(open(path))
r=(j.get("data") or {}).get("result") or []
assert j.get("status") == "success", (label, j)
assert r, (label, j)
vals=[]
for item in r:
    vals.append(float((item.get("value") or ["", "nan"])[1]))
assert any(math.isclose(v, expected, rel_tol=0, abs_tol=1e-9) for v in vals), (label, vals, j)
print(f"[ok] {label}={expected:g}")
PY
}

echo
echo "=== [c] Prometheus lifecycle metric checks ==="
query_prom 'ready:last_30s' "$OUT/prom-ready-last30s.json"
assert_prom_scalar "$OUT/prom-ready-last30s.json" "ready:last_30s" 1

query_prom 'void_mainnet_validator_lifecycle_composite_ok' "$OUT/prom-lifecycle-ok.json"
assert_prom_scalar "$OUT/prom-lifecycle-ok.json" "void_mainnet_validator_lifecycle_composite_ok" 1

query_prom 'void_mainnet_validator_lifecycle_composite_lanes_total' "$OUT/prom-lifecycle-lanes.json"
assert_prom_scalar "$OUT/prom-lifecycle-lanes.json" "void_mainnet_validator_lifecycle_composite_lanes_total" 7

query_prom 'void_mainnet_validator_lifecycle_composite_ready_head' "$OUT/prom-lifecycle-ready-head.json"
python3 - "$OUT/prom-lifecycle-ready-head.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
assert r, j
heads=[int(float((x.get("value") or ["", "0"])[1])) for x in r]
assert max(heads) > 0, (heads, j)
print("[ok] lifecycle ready head present:", max(heads))
PY

query_prom 'void_mainnet_validator_lifecycle_composite_timestamp_seconds' "$OUT/prom-lifecycle-ts.json"
python3 - "$OUT/prom-lifecycle-ts.json" "$MAX_AGE_SECONDS" <<'PY'
import json, sys, time
j=json.load(open(sys.argv[1]))
max_age=int(sys.argv[2])
r=(j.get("data") or {}).get("result") or []
assert r, j
ts=max(int(float((x.get("value") or ["", "0"])[1])) for x in r)
age=int(time.time())-ts
assert age >= 0, {"timestamp":ts,"age":age}
assert age <= max_age, {"timestamp":ts,"age":age,"max_age":max_age}
print(f"[ok] lifecycle metric fresh age_seconds={age}")
PY

query_prom 'void_mainnet_validator_lifecycle_composite_info' "$OUT/prom-lifecycle-info.json"
python3 - "$OUT/prom-lifecycle-info.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
assert r, j
print("[ok] lifecycle info labels present")
for item in r[:3]:
    print(item.get("metric") or {})
PY

echo
echo "=== [d] runtime artifact checks ==="
for f in "$COMPOSITE_ART" "$PROM_ART"; do
  echo "--- $f ---"
  test -f "$f"
  cat "$f"
  echo
done

python3 - "$COMPOSITE_ART" "$PROM_ART" <<'PY'
import json, sys

comp=json.load(open(sys.argv[1]))
prom=json.load(open(sys.argv[2]))

assert comp.get("ok") is True, comp
assert comp.get("kind") == "validator_lifecycle_composite_proof", comp
lanes=comp.get("lanes") or []
assert len(lanes) == 7, lanes

proves=comp.get("proves") or {}
required=[
    "defaultSubmitKillSwitch",
    "wrongChainRejected",
    "positiveReadinessWithoutBroadcast",
    "controlledLiveRegisterCandidateBroadcast",
    "candidateToWaitingToActiveAdmission",
    "churnAndActiveCapEnforced",
    "ownerOnlyActivationDemotionAndRefill",
    "demotionAccounting",
    "offline48hActiveOnlyPolicy",
    "offlineDemotionDoesNotAutoPromote",
    "healthyWaitingReplacementRefillsVacantSlot",
    "monitoringReadybridgeGreen",
]
missing=[k for k in required if proves.get(k) is not True]
assert not missing, {"missing":missing,"proves":proves}
assert comp.get("automaticContractDemotion") is False, comp
assert comp.get("automaticReplacementPromotion") is False, comp

assert prom.get("ok") is True, prom
assert prom.get("metric") == "void_mainnet_validator_lifecycle_composite_ok", prom
assert int(prom.get("metricValue")) == 1, prom
assert int(prom.get("lanesTotal")) == 7, prom
assert prom.get("prometheusScraped") is True, prom
assert prom.get("guardsPassed") is True, prom

print("[ok] runtime lifecycle artifacts prove Mainnet-0 validator lifecycle gate")
PY

echo
echo "=== [e] write preflight summary artifact ==="
HEAD_SHORT="$(git rev-parse --short HEAD)"
DESC="$(git describe --tags --always --dirty)"
READY_HEAD="$(python3 - "$OUT/void-ready.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1])).get("head"))
PY
)"
LIFECYCLE_READY_HEAD="$(python3 - "$OUT/prom-lifecycle-ready-head.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
print(max(int(float((x.get("value") or ["", "0"])[1])) for x in r))
PY
)"

mkdir -p .runtime/mainnet0
cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "mainnet0_validator_lifecycle_preflight",
  "gitHead": "$HEAD_SHORT",
  "gitDescribe": "$DESC",
  "readyHead": "$READY_HEAD",
  "lifecycleReadyHead": "$LIFECYCLE_READY_HEAD",
  "metric": "void_mainnet_validator_lifecycle_composite_ok",
  "metricValue": 1,
  "lanesTotal": 7,
  "maxAgeSeconds": "$MAX_AGE_SECONDS",
  "validatorLifecycleGateRequiredForMainnet0": true,
  "automaticContractDemotion": false,
  "automaticReplacementPromotion": false
}
JSON

cp "$OUT/summary.json" .runtime/mainnet0/mainnet0-validator-lifecycle-preflight.local.current.json
cat "$OUT/summary.json"

echo
echo "[ok] Mainnet-0 validator lifecycle preflight green"
