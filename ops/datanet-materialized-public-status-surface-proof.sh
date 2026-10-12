#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

STATUS_MD="docs/public/datanet-materialized-current-status.md"
STATUS_JSON="docs/public/datanet-materialized-current-status.json"
BASELINE_DOC="docs/public/datanet-materialized-current-baseline.md"
EXPECTED_HEAD="8e6eb939"
EXPECTED_TAG="ckpt-datanet-materialized-current-baseline-v1-green-20260605-155821"

echo "=== DataNet materialized public status surface proof ==="
echo "mutation=false"

test -s "$STATUS_MD"
test -s "$STATUS_JSON"
test -s "$BASELINE_DOC"

grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' "$STATUS_MD"
grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' "$STATUS_JSON"
grep -q 'VOID_DATANET_MATERIALIZED_CURRENT_BASELINE_V1' "$BASELINE_DOC"

grep -q "$EXPECTED_HEAD" "$STATUS_MD"
grep -q "$EXPECTED_HEAD" "$STATUS_JSON"
grep -q "$EXPECTED_TAG" "$STATUS_MD"
grep -q "$EXPECTED_TAG" "$STATUS_JSON"

grep -q 'datanet-materialized-current-baseline.md' "$STATUS_MD"
grep -q 'datanet-materialized-current-baseline.md' "$STATUS_JSON"
grep -q 'datanet-materialized-current-baseline-proof' "$STATUS_MD"
grep -q 'datanet-materialized-current-baseline-proof' "$STATUS_JSON"

grep -q 'tailscale_preflight_guard' "$STATUS_JSON"
grep -q 'no_manual_peer_seed' "$STATUS_JSON"
grep -q 'materialized_local_persistence' "$STATUS_JSON"
grep -q 'materialized_restart_persistence' "$STATUS_JSON"
grep -q 'materialized_copy_integrity' "$STATUS_JSON"
grep -q 'materialized_provenance' "$STATUS_JSON"
grep -q 'materialized_provenance_status_view' "$STATUS_JSON"
grep -q 'mainnet0_crossbox_status_smoke' "$STATUS_JSON"

grep -q 'buy_void_fulfillment=false' "$STATUS_MD"
grep -q 'validator_mutation=false' "$STATUS_MD"
grep -q 'wallet_send=false' "$STATUS_MD"
grep -q 'wc_to_void_swap=false' "$STATUS_MD"

python3 - "$STATUS_JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j["schema"] == "void_datanet_materialized_public_status_v1", j
assert j["marker"] == "VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1", j
assert j["status"] == "green", j
assert j["current_baseline_head"] == "8e6eb939", j
assert j["current_baseline_checkpoint"] == "ckpt-datanet-materialized-current-baseline-v1-green-20260605-155821", j

rt=j["runtime"]
assert rt["ready"] is True, rt
assert int(rt["head"]) == 1856587, rt
assert int(rt["gap"]) == 0, rt
assert int(rt["txroot_live"]) == 1, rt

for k, v in j["green_lanes"].items():
    assert v is True, (k, v)

s=j["safety_invariants"]
assert s["buy_void_fulfillment"] is False, s
assert s["validator_mutation"] is False, s
assert s["wallet_send"] is False, s
assert s["wc_to_void_swap"] is False, s

print("[ok] public status json schema verified")
PY

FOUND_INDEX=0
for f in \
  docs/public/current-public-status.md \
  docs/public/current-status.md \
  docs/public/public-status.md \
  docs/public/mainnet0-current-public-status.md \
  docs/public/mainnet0-status.md \
  docs/public/status.md \
  docs/public/index.md \
  docs/public/download.md
do
  if [ -f "$f" ] && grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_BLOCK_V1_START' "$f"; then
    echo "[ok] public status block linked from $f"
    FOUND_INDEX=1
    break
  fi
done

if [ "$FOUND_INDEX" = "0" ]; then
  echo "[info] no existing public status index contained the block; standalone artifacts verified"
fi

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/datanet-materialized-public-status-ready.json

python3 - <<'PY'
import json
j=json.load(open("/tmp/datanet-materialized-public-status-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] runtime ready/gap/txroot verified")
PY

make datanet-materialized-current-baseline-proof
make mainnet0-status-smoke

echo
echo "[ok] DataNet materialized public status surface proof green"
