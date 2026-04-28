#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
RPC="${RPC:-http://127.0.0.1:8545}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-validator-lifecycle-composite-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"

echo "=== validator lifecycle composite proof ==="
echo "base=$BASE"
echo "prom=$PROM"
echo "rpc=$RPC"
echo "out=$OUT"

wait_void_ready() {
  local label="${1:-void-ready}"
  local tmp="$OUT/wait-${label}.ready.json"

  echo
  echo "=== [wait] $label ==="

  local ok=0
  for i in $(seq 1 90); do
    if curl -fsS --max-time 3 "$BASE/__void/ready.json" > "$tmp" 2>"$tmp.err"; then
      if python3 - "$tmp" <<'PY2' >/dev/null 2>&1
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True
assert int(j.get("gap", -1)) == 0
assert int(j.get("txroot_live", 0)) == 1
PY2
      then
        ok=1
        break
      fi
    fi
    sleep 1
  done

  if [ "$ok" != "1" ]; then
    echo "[ERR] VOID did not become ready for $label"
    cat "$tmp" 2>/dev/null || true
    cat "$tmp.err" 2>/dev/null || true
    systemctl --user status void-node.service --no-pager -l || true
    journalctl --user -u void-node.service -n 160 --no-pager || true
    exit 1
  fi

  cat "$tmp"
  echo
  echo "[ok] VOID ready for $label"
}

run_step() {
  local name="$1"
  shift
  local log="$OUT/$name.log"

  wait_void_ready "before-$name"

  echo
  echo "=== [step] $name ==="
  echo "cmd=$*"
  echo "log=$log"

  set +e
  "$@" > "$log" 2>&1
  local rc=$?
  set -e

  tail -120 "$log" || true

  if [ "$rc" != "0" ]; then
    echo "[ERR] step failed: $name rc=$rc"
    echo "--- full log path ---"
    echo "$log"
    exit "$rc"
  fi

  echo "[ok] $name"

  wait_void_ready "after-$name"
}

echo
echo "=== [a] baseline build/readiness/monitoring ==="
npm run build

curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.baseline.json"
cat "$OUT/ready.baseline.json"
echo
python3 - "$OUT/ready.baseline.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] VOID baseline ready")
PY

curl -fsS "$PROM/-/ready" > "$OUT/prom.ready.txt"
cat "$OUT/prom.ready.txt"
echo

curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=ready:last_30s' > "$OUT/prom.ready.last30s.baseline.json"
cat "$OUT/prom.ready.last30s.baseline.json"
echo
python3 - "$OUT/prom.ready.last30s.baseline.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
r=(j.get("data") or {}).get("result") or []
assert r, j
assert any(str((x.get("value") or ["",""])[1]) in ("1","1.0") for x in r), j
print("[ok] Prom ready:last_30s baseline green")
PY

echo
echo "=== [b] RPC localhost/chain sanity ==="
if ! cast chain-id --rpc-url "$RPC" > "$OUT/rpc.chainid.txt" 2> "$OUT/rpc.chainid.err"; then
  echo "[ERR] local RPC is not responding"
  cat "$OUT/rpc.chainid.err" || true
  exit 1
fi

CHAIN_ID="$(cat "$OUT/rpc.chainid.txt")"
echo "chainId=$CHAIN_ID"
test "$CHAIN_ID" = "2050"

SS8545="$(ss -H -ltnp | grep -E ':8545\b' || true)"
printf '%s\n' "$SS8545" > "$OUT/rpc.listen.txt"
cat "$OUT/rpc.listen.txt"
if printf '%s\n' "$SS8545" | grep -Eq '0\.0\.0\.0:8545|\[::\]:8545|:::8545'; then
  echo "[ERR] RPC appears exposed beyond localhost"
  exit 1
fi
echo "[ok] RPC chain/bind safe"

echo
echo "=== [c] run lifecycle proof lanes ==="
run_step "01-live-submit-default-safety" make validator-registration-live-submit-safety-proof
run_step "02-positive-readiness-no-broadcast" make validator-registration-positive-readiness-proof
run_step "03-controlled-live-execution" make validator-registration-controlled-live-execution-proof
run_step "04-candidate-active-admission" make validator-candidate-activation-proof
run_step "05-candidate-demotion-accounting" make validator-candidate-demotion-proof
run_step "06-offline-demotion-policy" make validator-offline-demotion-policy-proof
run_step "07-offline-demotion-refill-policy" make validator-offline-demotion-refill-policy-proof

echo
echo "=== [d] final build + monitoring guards ==="
npm run build

if [ -x /usr/local/bin/prom-job-dupes.sh ]; then
  /usr/local/bin/prom-job-dupes.sh | tee "$OUT/prom-job-dupes.txt"
else
  echo "[ERR] /usr/local/bin/prom-job-dupes.sh missing"
  exit 1
fi

if [ -x /usr/local/bin/prom-safe-reload.sh ]; then
  /usr/local/bin/prom-safe-reload.sh | tee "$OUT/prom-safe-reload.txt"
else
  echo "[ERR] /usr/local/bin/prom-safe-reload.sh missing"
  exit 1
fi

echo
echo "=== [e] final readiness/monitoring queries ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.final.json"
cat "$OUT/ready.final.json"
echo

python3 - "$OUT/ready.final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] VOID final ready")
PY

for q in \
  'ready:last_30s' \
  'void:readybridge:healthy:last_30s' \
  'up{job="void-readybridge"}' \
  'void_ready' \
  'void_txroot_live'
do
  echo
  echo "--- prom query: $q ---"
  safe="$(printf '%s' "$q" | tr -c 'A-Za-z0-9_' '_')"
  curl -fsS --get "$PROM/api/v1/query" --data-urlencode "query=$q" > "$OUT/prom-query-$safe.json"
  cat "$OUT/prom-query-$safe.json"
  echo
  python3 - "$OUT/prom-query-$safe.json" "$q" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
q=sys.argv[2]
r=(j.get("data") or {}).get("result") or []
assert j.get("status") == "success", (q, j)
assert r, (q, j)
print(f"[ok] query populated: {q}")
PY
done

echo
echo "=== [f] collect latest runtime artifacts ==="
mkdir -p "$OUT/runtime-artifacts"
for f in \
  .runtime/mainnet0/validator-candidate-registry.local.current.json \
  .runtime/mainnet0/validator-candidate-activation.local.current.json \
  .runtime/mainnet0/validator-candidate-demotion.local.current.json \
  .runtime/mainnet0/validator-offline-demotion-policy.local.current.json \
  .runtime/mainnet0/validator-offline-demotion-refill-policy.local.current.json
do
  if [ -f "$f" ]; then
    cp -a "$f" "$OUT/runtime-artifacts/$(basename "$f")"
    echo "[ok] copied $f"
  else
    echo "[warn] missing optional artifact $f"
  fi
done

echo
echo "=== [g] write composite summary artifact ==="
HEAD_SHORT="$(git rev-parse --short HEAD)"
DESC="$(git describe --tags --always --dirty)"
READY_HEAD="$(python3 - "$OUT/ready.final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print(j.get("head"))
PY
)"

cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_lifecycle_composite_proof",
  "gitHead": "$HEAD_SHORT",
  "gitDescribe": "$DESC",
  "base": "$BASE",
  "prom": "$PROM",
  "rpc": "$RPC",
  "chainId": "$CHAIN_ID",
  "readyHead": "$READY_HEAD",
  "lanes": [
    "live_submit_default_safety",
    "positive_readiness_no_broadcast",
    "controlled_live_execution",
    "candidate_active_admission",
    "candidate_demotion_accounting",
    "offline_demotion_policy_48h",
    "offline_demotion_refill_policy"
  ],
  "proves": {
    "defaultSubmitKillSwitch": true,
    "wrongChainRejected": true,
    "positiveReadinessWithoutBroadcast": true,
    "controlledLiveRegisterCandidateBroadcast": true,
    "candidateToWaitingToActiveAdmission": true,
    "churnAndActiveCapEnforced": true,
    "ownerOnlyActivationDemotionAndRefill": true,
    "demotionAccounting": true,
    "offline48hActiveOnlyPolicy": true,
    "offlineDemotionDoesNotAutoPromote": true,
    "healthyWaitingReplacementRefillsVacantSlot": true,
    "monitoringReadybridgeGreen": true
  },
  "automaticContractDemotion": false,
  "automaticReplacementPromotion": false
}
JSON

mkdir -p .runtime/mainnet0
cp "$OUT/summary.json" .runtime/mainnet0/validator-lifecycle-composite.local.current.json
cat "$OUT/summary.json"

echo
echo "=== [h] final git/runtime truth ==="
git status --short
echo
echo "[ok] validator lifecycle composite proof green"
echo "out=$OUT"
