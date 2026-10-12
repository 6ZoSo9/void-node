#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

ALIEN="${ALIEN:-zoso@100.122.79.39}"
OUT="${OUT:-/tmp/two-box-materialized-provenance-mismatch-guard-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== two-box materialized provenance mismatch guard proof ==="
echo "mutation=temporary_sidecar_corruption_restored"

make participant-share-open-materialized-provenance-proof > "$OUT/provenance-proof.log" 2>&1
echo "[ok] fresh valid provenance records created"

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

check_valid() {
  local json_path="$1"
  python3 - "$json_path" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
s=j.get("materialization_provenance_status_v1") or {}
p=j.get("materialization_provenance_v1") or {}
assert j.get("ok") is True, j
assert s.get("ok") is True, s
assert s.get("present") is True, s
assert p.get("schema") == "void_datanet_materialized_provenance_v1", p
assert p.get("sha256") == j.get("sha256"), (p, j.get("sha256"))
assert int(p.get("sizeBytes", 0)) == int(j.get("sizeBytes", 0)), (p, j.get("sizeBytes"))
print("[ok] valid provenance accepted")
PY
}

check_mismatch() {
  local json_path="$1"
  local failed_check="$2"
  python3 - "$json_path" "$failed_check" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
failed=sys.argv[2]
s=j.get("materialization_provenance_status_v1") or {}
checks=s.get("checks") or {}
assert j.get("ok") is True, j
assert j.get("materialization_provenance_v1") in (None, {}), j.get("materialization_provenance_v1")
assert s.get("ok") is False, s
assert s.get("present") is True, s
assert s.get("error") == "materialization_provenance_mismatch", s
assert checks.get(failed) is False, checks
print("[ok] mismatch detected and provenance withheld:", failed)
PY
}

echo
echo "=== Precision mismatch guard: bad sha256 ==="
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-valid-before.json"
check_valid "$OUT/a2p-valid-before.json"

PREC_PROV="data_a/datanet_v1/local_jobs/$A2P_DATASET.provenance.json"
cp -a "$PREC_PROV" "$OUT/a2p.provenance.backup.json"

python3 - "$PREC_PROV" <<'PY'
import json, sys
p=sys.argv[1]
j=json.load(open(p))
j["sha256"]="bad_sha256_for_guard_test"
open(p,"w").write(json.dumps(j, indent=2) + "\n")
print("[ok] wrote bad sha256 into Precision provenance sidecar")
PY

curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-mismatch.json"
check_mismatch "$OUT/a2p-mismatch.json" "sha256_match"

cp -a "$OUT/a2p.provenance.backup.json" "$PREC_PROV"
curl -fsS --max-time 8 "http://127.0.0.1:4100/datanet/v1/local-job/$A2P_DATASET?who=$A2P_ACCOUNT" > "$OUT/a2p-valid-after.json"
check_valid "$OUT/a2p-valid-after.json"

echo
echo "=== Alienware mismatch guard: bad sizeBytes ==="
ssh "$ALIEN" "cd /home/zoso/dev/void-node && PROV='data_a/datanet_v1/local_jobs/$P2A_DATASET.provenance.json' && cp -a \"\$PROV\" '/tmp/p2a-provenance-backup-$P2A_DATASET.json' && python3 -c 'import json,sys; p=sys.argv[1]; j=json.load(open(p)); j[\"sizeBytes\"]=-123; open(p,\"w\").write(json.dumps(j,indent=2)+\"\\n\")' \"\$PROV\""

ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-mismatch.json"
check_mismatch "$OUT/p2a-mismatch.json" "sizeBytes_match"

ssh "$ALIEN" "cd /home/zoso/dev/void-node && PROV='data_a/datanet_v1/local_jobs/$P2A_DATASET.provenance.json' && cp -a '/tmp/p2a-provenance-backup-$P2A_DATASET.json' \"\$PROV\""

ssh "$ALIEN" "curl -fsS --max-time 8 'http://127.0.0.1:4100/datanet/v1/local-job/$P2A_DATASET?who=$P2A_ACCOUNT'" > "$OUT/p2a-valid-after.json"
check_valid "$OUT/p2a-valid-after.json"

echo
echo "=== final valid backstops ==="
make participant-share-open-materialized-provenance-proof
make mainnet0-status-smoke

echo
echo "[ok] two-box materialized provenance mismatch guard proof green"
echo "out=$OUT"
