#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-provenance-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== two-box materialized provenance proof ==="
echo "mutation=false"

make participant-share-open-materialized-copy-integrity-proof > "$OUT/integrity.log" 2>&1
echo "[ok] materialized copy integrity backstop passed"

A2P_ACCOUNT="$(grep -o 'a2p_account=ui-share-a2p-[0-9-]*' "$OUT/integrity.log" | tail -n1 | cut -d= -f2)"
P2A_ACCOUNT="$(grep -o 'p2a_account=ui-share-p2a-[0-9-]*' "$OUT/integrity.log" | tail -n1 | cut -d= -f2)"
A2P_DATASET="$(grep -o 'a2p_dataset=ds_[A-Za-z0-9_-]*' "$OUT/integrity.log" | tail -n1 | cut -d= -f2)"
P2A_DATASET="$(grep -o 'p2a_dataset=ds_[A-Za-z0-9_-]*' "$OUT/integrity.log" | tail -n1 | cut -d= -f2)"

test -n "$A2P_ACCOUNT"
test -n "$P2A_ACCOUNT"
test -n "$A2P_DATASET"
test -n "$P2A_DATASET"

echo "a2p_account=$A2P_ACCOUNT"
echo "a2p_dataset=$A2P_DATASET"
echo "p2a_account=$P2A_ACCOUNT"
echo "p2a_dataset=$P2A_DATASET"

echo
echo "=== fetch receiver local-job JSON with provenance ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-receiver-precision.json"
ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-receiver-alien.json"

python3 - "$OUT/a2p-receiver-precision.json" "$OUT/p2a-receiver-alien.json" <<'PY'
import json, sys

for path in sys.argv[1:]:
    j = json.load(open(path))
    p = j.get("materialization_provenance_v1") or {}

    assert j.get("ok") is True, (path, j)
    assert p.get("ok") is True, (path, p)
    assert p.get("schema") == "void_datanet_materialized_provenance_v1", (path, p)
    assert p.get("source") == "peer_materialized", (path, p)
    assert p.get("dataset_id") == j.get("id"), (path, p, j.get("id"))
    assert p.get("who") == j.get("who"), (path, p, j.get("who"))
    assert str(p.get("peer_http") or "").startswith("http://"), (path, p)
    assert str(p.get("receiver_file") or "").endswith(str(j.get("id")) + ".txt"), (path, p)
    assert p.get("sha256") == j.get("sha256"), (path, p, j.get("sha256"))
    assert int(p.get("sizeBytes", 0)) == int(j.get("sizeBytes", 0)), (path, p, j.get("sizeBytes"))
    assert int(p.get("materialized_at_ms", 0)) > 0, (path, p)

print({
  "materialized_provenance": "green",
  "schema": "void_datanet_materialized_provenance_v1",
  "source": "peer_materialized",
  "peer_http_present": True,
  "receiver_file_present": True,
  "dataset_who_sha_size_match": True
})
PY

make mainnet0-status-smoke

echo
echo "[ok] two-box materialized provenance proof green"
echo "out=$OUT"
