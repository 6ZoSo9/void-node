#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/datanet-materialized-public-status-served-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== DataNet materialized public status served proof ==="
echo "mutation=false"
echo "base=$BASE"
echo "out=$OUT"

curl -fsS --max-time 10 "$BASE/datanet/materialized-status" > "$OUT/status.html"
curl -fsS --max-time 10 "$BASE/__void/datanet/materialized-status.json" > "$OUT/status.json"
curl -fsS --max-time 10 "$BASE/__void/datanet/materialized-status.md" > "$OUT/status.md"

grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' "$OUT/status.html"
grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' "$OUT/status.json"
grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' "$OUT/status.md"

grep -q 'DataNet materialization green' "$OUT/status.html"
grep -q 'served_surface' "$OUT/status.json"
grep -q 'void_datanet_materialized_public_status_routes_v1' "$OUT/status.json"
grep -q 'ckpt-datanet-materialized-current-baseline-v1-green-20260605-155821' "$OUT/status.html"
grep -q 'ckpt-datanet-materialized-current-baseline-v1-green-20260605-155821' "$OUT/status.json"
grep -q 'ckpt-datanet-materialized-current-baseline-v1-green-20260605-155821' "$OUT/status.md"

python3 - "$OUT/status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("served_surface") == "void_datanet_materialized_public_status_routes_v1", j
assert j.get("schema") == "void_datanet_materialized_public_status_v1", j
assert j.get("marker") == "VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1", j
assert j.get("status") == "green", j
rt=j.get("runtime") or {}
assert rt.get("ready") is True, rt
assert int(rt.get("head")) == 1856587, rt
assert int(rt.get("gap")) == 0, rt
assert int(rt.get("txroot_live")) == 1, rt
for k, v in (j.get("green_lanes") or {}).items():
    assert v is True, (k, v)
s=j.get("safety_invariants") or {}
assert s.get("buy_void_fulfillment") is False, s
assert s.get("validator_mutation") is False, s
assert s.get("wallet_send") is False, s
assert s.get("wc_to_void_swap") is False, s
print("[ok] served status json verified")
PY

grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_BLOCK_V1_START' docs/public/mainnet0-current-public-status.md
grep -q 'docs/public/datanet-materialized-current-status.md' docs/public/mainnet0-current-public-status.md
grep -q 'docs/public/datanet-materialized-current-status.json' docs/public/mainnet0-current-public-status.md

curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"

python3 - "$OUT/ready.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] runtime ready/gap/txroot verified")
PY

make datanet-materialized-public-status-surface-proof
make mainnet0-status-smoke

echo
echo "[ok] DataNet materialized public status served proof green"
echo "out=$OUT"
