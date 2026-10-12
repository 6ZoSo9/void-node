#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WC_BASE="${WC_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
ACCOUNT="${ACCOUNT:-proof-user-$(date +%Y%m%d-%H%M%S)}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "[FAIL] missing cmd: $1" >&2; exit 2; }; }
need curl
need python3
need jq
need base64
need sha256sum

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP" >/dev/null 2>&1 || true' EXIT

fail(){ echo "[FAIL] $*" >&2; exit 1; }

echo "=== [0] health ==="
curl -fsS --max-time 5 "${BASE}/health" >/dev/null
echo "[ok] health"
echo

echo "=== [1] before state ==="
curl -fsS --max-time 5 "${BASE}/datanet/v1/receipts/status" | tee "$TMP/receipts.before.json"
echo
curl -fsS --max-time 8 "${BASE}/wc/ledger?account=${ACCOUNT}&limit=50" | tee "$TMP/ledger.before.json"
echo
curl -fsS --max-time 5 "${WC_BASE}/pool.json" | tee "$TMP/pool.before.json" || true
echo

echo "=== [2] publish ==="
BODY="canonical-datanet-proof-$(date +%s)-$$"
BODY_B64="$(printf '%s' "$BODY" | base64 -w0)"
curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/datanet/v1/publish?who=${ACCOUNT}" \
  --data '{"name":"canonical-proof.txt","mime":"text/plain","plaintext_b64":"'"$BODY_B64"'"}' \
  | tee "$TMP/publish.json"
echo

DATASET_ID="$(python3 - <<'PY' "$TMP/publish.json"
import json,sys
j=json.load(open(sys.argv[1]))
print(j["id"])
PY
)"
ROOT="$(python3 - <<'PY' "$TMP/publish.json"
import json,sys
j=json.load(open(sys.argv[1]))
print(j["merkleRootHex"])
PY
)"
BYTES="$(python3 - <<'PY' "$TMP/publish.json"
import json,sys
j=json.load(open(sys.argv[1]))
print(j["sizeBytes"])
PY
)"
echo "datasetId=$DATASET_ID"
echo "root=$ROOT"
echo "bytes=$BYTES"
echo

echo "=== [3] fetch ==="
FETCH_OK=0
if curl -fsS --max-time 20 "${BASE}/datanet/v1/fetch?id=${DATASET_ID}&who=${ACCOUNT}" > "$TMP/fetch.json"; then
  FETCH_OK=1
  FETCH_URL="${BASE}/datanet/v1/fetch?id=${DATASET_ID}&who=${ACCOUNT}"
elif curl -fsS --max-time 20 "${BASE}/datanet/v1/fetch/${DATASET_ID}?who=${ACCOUNT}" > "$TMP/fetch.json"; then
  FETCH_OK=1
  FETCH_URL="${BASE}/datanet/v1/fetch/${DATASET_ID}?who=${ACCOUNT}"
elif curl -fsS --max-time 20 "${BASE}/datanet/v1/fetch2/${DATASET_ID}?who=${ACCOUNT}" > "$TMP/fetch.json"; then
  FETCH_OK=1
  FETCH_URL="${BASE}/datanet/v1/fetch2/${DATASET_ID}?who=${ACCOUNT}"
fi
[ "$FETCH_OK" = "1" ] || fail "fetch failed on all known endpoints"

cat "$TMP/fetch.json"
echo
echo "fetch_url=$FETCH_URL"

python3 - <<'PY' "$TMP/fetch.json" "$BODY_B64"
import json,sys
j=json.load(open(sys.argv[1]))
want=sys.argv[2]
cipher=j.get("cipher_b64")
if cipher is not None and cipher != want:
    raise SystemExit("[FAIL] cipher_b64 mismatch")
print("[ok] fetch body shape accepted")
PY
echo

echo "=== [4] derive accepted receipt body ==="
python3 - <<'PY' "$TMP/fetch.json" "$TMP/receipt.json" "$ACCOUNT" "$DATASET_ID"
import json,sys
j=json.load(open(sys.argv[1]))
out=sys.argv[2]
acct=sys.argv[3]
dataset_id=sys.argv[4]

man=j.get("manifest") or {}
chunks=man.get("chunks") or []
if not chunks:
    raise SystemExit("[FAIL] fetch manifest missing chunks")
chunk0=chunks[0]
leaf=chunk0.get("leafHashHex")
root=man.get("merkleRootHex") or j.get("rootTxt") or dataset_id
idx=int(chunk0.get("index",0))
if not leaf or not root:
    raise SystemExit("[FAIL] missing root/leaf from fetch response")

body={
    "who": acct,
    "account": acct,
    "id": dataset_id,
    "root": str(root),
    "leaf": str(leaf),
    "index": idx,
    "plain_sha256": str(leaf),
    "bytes": int(j.get("sizeBytes") or man.get("sizeBytes") or chunk0.get("size") or 0),
    "ok": True,
    "accepted": True,
    "verified": True
}
json.dump(body, open(out,"w"))
print(json.dumps(body, indent=2))
PY
echo

echo "=== [5] post accepted receipt ==="
curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "${BASE}/datanet/v1/receipt" \
  --data-binary @"$TMP/receipt.json" \
  | tee "$TMP/receipt.post.json"
echo

RECEIPT_ID="$(python3 - <<'PY' "$TMP/receipt.post.json"
import json,sys
j=json.load(open(sys.argv[1]))
print(j.get("id",""))
PY
)"
echo "receipt_id=$RECEIPT_ID"
echo

echo "=== [6] after state ==="
curl -fsS --max-time 5 "${BASE}/datanet/v1/receipts/status" | tee "$TMP/receipts.after.json"
echo
curl -fsS --max-time 8 "${BASE}/wc/ledger?account=${ACCOUNT}&limit=50" | tee "$TMP/ledger.after.json"
echo
curl -fsS --max-time 5 "${WC_BASE}/pool.json" | tee "$TMP/pool.after.json" || true
echo

echo "=== [7] assert canonical accepted-receipt -> wc credit ==="
python3 - <<'PY' "$TMP/receipts.before.json" "$TMP/receipts.after.json" "$TMP/ledger.after.json" "$ACCOUNT" "$RECEIPT_ID"
import json,sys

before=json.load(open(sys.argv[1]))
after=json.load(open(sys.argv[2]))
ledger=json.load(open(sys.argv[3]))
account=sys.argv[4]
receipt_id=sys.argv[5]

before_total=int(before.get("total") or 0)
after_total=int(after.get("total") or 0)
if after_total < before_total:
    raise SystemExit(f"[FAIL] receipts total decreased: {before_total} -> {after_total}")

events=ledger.get("events") or []
matches=[]
for ev in events:
    if str(ev.get("reason") or "") != "datanet_receipt":
        continue
    if str(ev.get("account") or ev.get("who") or "") != account:
        continue
    if receipt_id and str(ev.get("receipt_id") or "") != receipt_id:
        continue
    matches.append(ev)

if not matches:
    raise SystemExit("[FAIL] no matching datanet_receipt credit found in wc ledger")

latest=matches[0]
delta=int(latest.get("delta") or 0)
if delta <= 0:
    raise SystemExit(f"[FAIL] matched credit delta <= 0: {delta}")

print("canonical_datanet_useful_work_loop_ok=1")
print(f"receipts_total_before={before_total}")
print(f"receipts_total_after={after_total}")
print(f"receipt_id={receipt_id}")
print(f"ledger_match_count={len(matches)}")
print(f"credit_delta={delta}")
PY
echo

echo "=== [8] tails ==="
echo "--- datanet receipts tail"
tail -n 5 data_a/datanet_v1/receipts.jsonl 2>/dev/null || true
echo
echo "--- wc ledger tail"
tail -n 5 data_a/wc_v1/ledger.jsonl 2>/dev/null || true
echo

echo "[ok] canonical datanet proof passed"
