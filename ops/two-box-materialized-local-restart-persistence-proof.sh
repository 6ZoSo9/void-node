#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-local-restart-persistence-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== two-box materialized local restart persistence proof ==="
echo "mutation=service_restart_only"

make participant-share-open-materialized-local-persistence-proof > "$OUT/materialized-proof.log" 2>&1
echo "[ok] materialized local persistence proof passed"

A2P_ACCOUNT="$(grep -o 'a2p_account=ui-share-a2p-[0-9-]*' "$OUT/materialized-proof.log" | tail -n1 | cut -d= -f2)"
P2A_ACCOUNT="$(grep -o 'p2a_account=ui-share-p2a-[0-9-]*' "$OUT/materialized-proof.log" | tail -n1 | cut -d= -f2)"
A2P_DATASET="$(grep -o 'a2p_dataset=ds_[A-Za-z0-9_-]*' "$OUT/materialized-proof.log" | tail -n1 | cut -d= -f2)"
P2A_DATASET="$(grep -o 'p2a_dataset=ds_[A-Za-z0-9_-]*' "$OUT/materialized-proof.log" | tail -n1 | cut -d= -f2)"

test -n "$A2P_ACCOUNT"
test -n "$P2A_ACCOUNT"
test -n "$A2P_DATASET"
test -n "$P2A_DATASET"

echo "a2p_account=$A2P_ACCOUNT"
echo "a2p_dataset=$A2P_DATASET"
echo "p2a_account=$P2A_ACCOUNT"
echo "p2a_dataset=$P2A_DATASET"

echo
echo "=== restart both nodes ==="
systemctl --user restart void-node.service
ssh "$ALIEN" "systemctl --user restart void-node.service"
sleep 4

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > "$OUT/precision-ready-after-restart.json"
ssh "$ALIEN" "curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json" > "$OUT/alien-ready-after-restart.json"

python3 - "$OUT/precision-ready-after-restart.json" "$OUT/alien-ready-after-restart.json" <<'PY'
import json, sys
for p in sys.argv[1:]:
    j=json.load(open(p))
    assert j.get("ready") is True, (p, j)
    assert int(j.get("gap", -1)) == 0, (p, j)
    assert int(j.get("txroot_live", 0)) == 1, (p, j)
print("[ok] both nodes ready after restart")
PY

echo
echo "=== verify Precision receiver copy survived restart ==="
test -s "data_a/datanet_v1/local_jobs/$A2P_DATASET.txt"
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-after-restart.json"

python3 - "$OUT/a2p-after-restart.json" "$A2P_DATASET" "$A2P_ACCOUNT" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("id") == sys.argv[2], j
assert j.get("who") == sys.argv[3], j
assert int(j.get("sizeBytes", 0)) > 0, j
assert str(j.get("plaintext") or ""), j
print("[ok] Precision post-restart local copy verified")
PY

echo
echo "=== verify Alienware receiver copy survived restart ==="
ssh "$ALIEN" "cd /home/zoso/dev/void-node && test -s 'data_a/datanet_v1/local_jobs/$P2A_DATASET.txt'"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-after-restart.json"

python3 - "$OUT/p2a-after-restart.json" "$P2A_DATASET" "$P2A_ACCOUNT" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("id") == sys.argv[2], j
assert j.get("who") == sys.argv[3], j
assert int(j.get("sizeBytes", 0)) > 0, j
assert str(j.get("plaintext") or ""), j
print("[ok] Alienware post-restart local copy verified")
PY

make mainnet0-status-smoke

echo
echo "[ok] two-box materialized local restart persistence proof green"
echo "out=$OUT"
