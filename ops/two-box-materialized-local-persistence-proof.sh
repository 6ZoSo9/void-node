#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-local-persistence-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== two-box materialized local persistence proof ==="
echo "mutation=false"

make participant-share-open-no-manual-peer-seed-proof > "$OUT/no-seed-proof.log" 2>&1
echo "[ok] no-manual-peer-seed proof passed"

LATEST="$(grep -o '/tmp/two-box-ui-share-open-both-ways-no-seed-proof-[0-9-]*' "$OUT/no-seed-proof.log" | tail -n 1)"
test -n "$LATEST"
echo "latest=$LATEST"

A2P_ACCOUNT="$(basename "$LATEST" | sed 's/two-box-ui-share-open-both-ways-no-seed-proof-/ui-share-a2p-/')"
P2A_ACCOUNT="$(basename "$LATEST" | sed 's/two-box-ui-share-open-both-ways-no-seed-proof-/ui-share-p2a-/')"

A2P_DATASET="$(grep -o 'a2p_dataset_id=ds_[A-Za-z0-9_-]*' "$OUT/no-seed-proof.log" | tail -n1 | cut -d= -f2)"
P2A_DATASET="$(grep -o 'p2a_dataset_id=ds_[A-Za-z0-9_-]*' "$OUT/no-seed-proof.log" | tail -n1 | cut -d= -f2)"

test -n "$A2P_DATASET"
test -n "$P2A_DATASET"

echo "a2p_account=$A2P_ACCOUNT"
echo "a2p_dataset=$A2P_DATASET"
echo "p2a_account=$P2A_ACCOUNT"
echo "p2a_dataset=$P2A_DATASET"

echo
echo "=== Precision local persisted copy after Alienware -> Precision ==="
test -s "data_a/datanet_v1/local_jobs/$A2P_DATASET.txt"
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-precision-local-job.json"

python3 - "$OUT/a2p-precision-local-job.json" "$A2P_DATASET" "$A2P_ACCOUNT" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("id") == sys.argv[2], j
assert j.get("who") == sys.argv[3], j
assert int(j.get("sizeBytes", 0)) > 0, j
assert str(j.get("plaintext") or ""), j
print("[ok] Precision local persisted copy verified")
PY

echo
echo "=== Alienware local persisted copy after Precision -> Alienware ==="
ssh "$ALIEN" "cd /home/zoso/dev/void-node && test -s 'data_a/datanet_v1/local_jobs/$P2A_DATASET.txt'"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-alien-local-job.json"

python3 - "$OUT/p2a-alien-local-job.json" "$P2A_DATASET" "$P2A_ACCOUNT" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("id") == sys.argv[2], j
assert j.get("who") == sys.argv[3], j
assert int(j.get("sizeBytes", 0)) > 0, j
assert str(j.get("plaintext") or ""), j
print("[ok] Alienware local persisted copy verified")
PY

echo
echo "=== status smoke ==="
make mainnet0-status-smoke

echo
echo "[ok] two-box materialized local persistence proof green"
echo "out=$OUT"
