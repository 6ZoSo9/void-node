#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-copy-integrity-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== two-box materialized copy integrity proof ==="
echo "mutation=false"

make participant-share-open-materialized-local-restart-persistence-proof > "$OUT/restart-persistence.log" 2>&1
echo "[ok] restart-persistent materialized copies created"

A2P_ACCOUNT="$(grep -o 'a2p_account=ui-share-a2p-[0-9-]*' "$OUT/restart-persistence.log" | tail -n1 | cut -d= -f2)"
P2A_ACCOUNT="$(grep -o 'p2a_account=ui-share-p2a-[0-9-]*' "$OUT/restart-persistence.log" | tail -n1 | cut -d= -f2)"
A2P_DATASET="$(grep -o 'a2p_dataset=ds_[A-Za-z0-9_-]*' "$OUT/restart-persistence.log" | tail -n1 | cut -d= -f2)"
P2A_DATASET="$(grep -o 'p2a_dataset=ds_[A-Za-z0-9_-]*' "$OUT/restart-persistence.log" | tail -n1 | cut -d= -f2)"

test -n "$A2P_ACCOUNT"
test -n "$P2A_ACCOUNT"
test -n "$A2P_DATASET"
test -n "$P2A_DATASET"

echo "a2p_account=$A2P_ACCOUNT"
echo "a2p_dataset=$A2P_DATASET"
echo "p2a_account=$P2A_ACCOUNT"
echo "p2a_dataset=$P2A_DATASET"

ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT'" > "$OUT/a2p-origin-alien.json"
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-receiver-precision.json"

curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT" > "$OUT/p2a-origin-precision.json"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-receiver-alien.json"

python3 - "$OUT/a2p-origin-alien.json" "$OUT/a2p-receiver-precision.json" "$OUT/p2a-origin-precision.json" "$OUT/p2a-receiver-alien.json" <<'PY'
import json, sys, hashlib

def load(path):
    j = json.load(open(path))
    assert j.get("ok") is True, (path, j)
    assert str(j.get("plaintext") or ""), (path, j)
    text = str(j["plaintext"])
    computed = hashlib.sha256(text.encode("utf-8")).hexdigest()
    assert str(j.get("sha256") or "") == computed, (path, j.get("sha256"), computed)
    return j, computed

a2p_o, a2p_oh = load(sys.argv[1])
a2p_r, a2p_rh = load(sys.argv[2])
p2a_o, p2a_oh = load(sys.argv[3])
p2a_r, p2a_rh = load(sys.argv[4])

assert a2p_o["id"] == a2p_r["id"]
assert a2p_o["who"] == a2p_r["who"]
assert a2p_o["plaintext"] == a2p_r["plaintext"]
assert a2p_oh == a2p_rh

assert p2a_o["id"] == p2a_r["id"]
assert p2a_o["who"] == p2a_r["who"]
assert p2a_o["plaintext"] == p2a_r["plaintext"]
assert p2a_oh == p2a_rh

print({
  "materialized_copy_integrity": "green",
  "a2p_dataset": a2p_o["id"],
  "a2p_sha256": a2p_oh,
  "p2a_dataset": p2a_o["id"],
  "p2a_sha256": p2a_oh,
  "origin_receiver_plaintext_match": True,
  "origin_receiver_sha256_match": True
})
PY

make mainnet0-status-smoke

echo
echo "[ok] two-box materialized copy integrity proof green"
echo "out=$OUT"
