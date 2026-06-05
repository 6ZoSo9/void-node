#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-provenance-restart-persistence-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== two-box materialized provenance restart persistence proof ==="
echo "mutation=service_restart_only"

make participant-share-open-materialized-provenance-proof > "$OUT/provenance-proof.log" 2>&1
echo "[ok] materialized provenance proof passed"

A2P_ACCOUNT="$(grep -o 'a2p_account=ui-share-a2p-[0-9-]*' "$OUT/provenance-proof.log" | tail -n1 | cut -d= -f2)"
P2A_ACCOUNT="$(grep -o 'p2a_account=ui-share-p2a-[0-9-]*' "$OUT/provenance-proof.log" | tail -n1 | cut -d= -f2)"
A2P_DATASET="$(grep -o 'a2p_dataset=ds_[A-Za-z0-9_-]*' "$OUT/provenance-proof.log" | tail -n1 | cut -d= -f2)"
P2A_DATASET="$(grep -o 'p2a_dataset=ds_[A-Za-z0-9_-]*' "$OUT/provenance-proof.log" | tail -n1 | cut -d= -f2)"

test -n "$A2P_ACCOUNT"
test -n "$P2A_ACCOUNT"
test -n "$A2P_DATASET"
test -n "$P2A_DATASET"

echo "a2p_account=$A2P_ACCOUNT"
echo "a2p_dataset=$A2P_DATASET"
echo "p2a_account=$P2A_ACCOUNT"
echo "p2a_dataset=$P2A_DATASET"

echo
echo "=== capture receiver provenance before restart ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-before.json"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-before.json"

echo
echo "=== restart both nodes ==="
systemctl --user restart void-node.service
ssh "$ALIEN" "systemctl --user restart void-node.service"
sleep 4

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > "$OUT/precision-ready-after.json"
ssh "$ALIEN" "curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json" > "$OUT/alien-ready-after.json"

python3 - "$OUT/precision-ready-after.json" "$OUT/alien-ready-after.json" <<'PY'
import json, sys
for p in sys.argv[1:]:
    j=json.load(open(p))
    assert j.get("ready") is True, (p, j)
    assert int(j.get("gap", -1)) == 0, (p, j)
    assert int(j.get("txroot_live", 0)) == 1, (p, j)
print("[ok] both nodes ready after restart")
PY

echo
echo "=== capture receiver provenance after restart ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-after.json"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-after.json"

python3 - "$OUT/a2p-before.json" "$OUT/a2p-after.json" "$OUT/p2a-before.json" "$OUT/p2a-after.json" <<'PY'
import json, sys

def check_pair(before_path, after_path):
    b=json.load(open(before_path))
    a=json.load(open(after_path))

    assert b.get("ok") is True, (before_path, b)
    assert a.get("ok") is True, (after_path, a)

    bp=b.get("materialization_provenance_v1") or {}
    ap=a.get("materialization_provenance_v1") or {}

    for pth, j, p in [(before_path,b,bp),(after_path,a,ap)]:
        assert p.get("ok") is True, (pth, p)
        assert p.get("schema") == "void_datanet_materialized_provenance_v1", (pth, p)
        assert p.get("source") == "peer_materialized", (pth, p)
        assert p.get("dataset_id") == j.get("id"), (pth, p, j.get("id"))
        assert p.get("who") == j.get("who"), (pth, p, j.get("who"))
        assert str(p.get("peer_http") or "").startswith("http://"), (pth, p)
        assert str(p.get("receiver_file") or "").endswith(str(j.get("id")) + ".txt"), (pth, p)
        assert p.get("sha256") == j.get("sha256"), (pth, p, j.get("sha256"))
        assert int(p.get("sizeBytes", 0)) == int(j.get("sizeBytes", 0)), (pth, p, j.get("sizeBytes"))
        assert int(p.get("materialized_at_ms", 0)) > 0, (pth, p)

    stable_keys = ["schema","source","dataset_id","who","peer_http","receiver_file","sha256","sizeBytes","materialized_at_ms"]
    for k in stable_keys:
        assert bp.get(k) == ap.get(k), (k, bp.get(k), ap.get(k))

check_pair(sys.argv[1], sys.argv[2])
check_pair(sys.argv[3], sys.argv[4])

print({
  "materialized_provenance_restart_persistence": "green",
  "a2p_provenance_survived_restart": True,
  "p2a_provenance_survived_restart": True,
  "provenance_fields_stable_after_restart": True
})
PY

make mainnet0-status-smoke

echo
echo "[ok] two-box materialized provenance restart persistence proof green"
echo "out=$OUT"
