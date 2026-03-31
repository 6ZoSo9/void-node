#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-0xdf994e1b8c1ac9078c66892b589c8aa76c3be592}"
ROOT="${ROOT:-}"

if [ -z "$ROOT" ]; then
  ROOT="$(python3 - <<'PY2'
import os, glob
base = os.path.join(os.path.expanduser("~"), "dev", "void-node", "data_a", "datanet", "manifests")
rows = sorted(glob.glob(os.path.join(base, "*.json")))
if not rows:
    raise SystemExit(1)
print(os.path.basename(rows[0]).replace(".json",""))
PY2
)" || {
    echo "[fail] ROOT not provided and no live manifest roots found" >&2
    exit 1
  }
  echo "[ok] auto-picked ROOT=$ROOT"
fi

OUT="/tmp/void-datanet-mvp-proof.$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

jget() {
  curl -fsS --max-time 15 "$1"
}

echo "=== [1] datanet status ==="
jget "$BASE/datanet/v1/status" | tee "$OUT/status.json"
echo

echo "=== [2] receipts status before ==="
jget "$BASE/datanet/v1/receipts/status" | tee "$OUT/receipts.before.json"
echo

echo "=== [3] manifest ==="
jget "$BASE/datanet/v1/manifests/$ROOT" | tee "$OUT/manifest.json"
echo

echo "=== [4] proof(index=0) ==="
jget "$BASE/datanet/v1/proof/$ROOT/0" | tee "$OUT/proof.json"
echo

echo "=== [5] resolve first leaf + chunk bytes ==="
python3 - "$OUT/manifest.json" "$OUT/proof.json" "$OUT/chunk.bin" "$OUT/receipt.body.json" "$WHO" <<'PY'
import json, sys, urllib.request, hashlib

manifest = json.load(open(sys.argv[1]))
proof = json.load(open(sys.argv[2]))
chunk_path = sys.argv[3]
receipt_body_path = sys.argv[4]
who = sys.argv[5]

man = manifest.get("manifest") or {}
root = (proof.get("root") or "").lower()
idx = int(proof.get("index") or 0)
leaf = (proof.get("leaf") or "").lower()

if not root or not leaf:
    raise SystemExit("[fail] proof missing root/leaf")
if not proof.get("ok"):
    raise SystemExit("[fail] proof ok != true")

chunk_url = f"http://127.0.0.1:4100/datanet/v1/chunks/{leaf}"
buf = urllib.request.urlopen(chunk_url, timeout=15).read()
open(chunk_path, "wb").write(buf)

got_leaf = hashlib.sha256(buf).hexdigest()
if got_leaf != leaf:
    raise SystemExit(f"[fail] chunk sha mismatch: want={leaf} got={got_leaf}")

plain_sha = hashlib.sha256(buf).hexdigest()

body = {
    "id": root,
    "root": root,
    "leaf": leaf,
    "index": idx,
    "bytes": len(buf),
    "plain_sha256": plain_sha,
    "who": who,
    "account": who,
    "ok": True
}
open(receipt_body_path, "w").write(json.dumps(body, indent=2))

print(json.dumps({
    "root": root,
    "leaf": leaf,
    "index": idx,
    "bytes": len(buf),
    "plain_sha256": plain_sha
}, indent=2))
PY

echo
echo "=== [6] post receipt ==="
curl -fsS --max-time 20 \
  -H 'content-type: application/json' \
  -X POST "$BASE/datanet/v1/receipt" \
  --data-binary @"$OUT/receipt.body.json" | tee "$OUT/receipt.post.json"
echo

echo "=== [7] receipts status after ==="
jget "$BASE/datanet/v1/receipts/status" | tee "$OUT/receipts.after.json"
echo

echo "=== [8] wc ledger for account ==="
jget "$BASE/wc/ledger?account=$WHO&limit=50" | tee "$OUT/wc.ledger.json"
echo

echo "=== [9] assert live manifest/chunk proof ==="
python3 - "$OUT/status.json" "$OUT/proof.json" "$OUT/receipt.post.json" "$OUT/receipts.before.json" "$OUT/receipts.after.json" "$OUT/wc.ledger.json" "$WHO" <<'PY'
import json, sys

status = json.load(open(sys.argv[1]))
proof = json.load(open(sys.argv[2]))
post = json.load(open(sys.argv[3]))
before = json.load(open(sys.argv[4]))
after = json.load(open(sys.argv[5]))
ledger = json.load(open(sys.argv[6]))
who = sys.argv[7]

if not status.get("ok"):
    raise SystemExit("[fail] datanet status ok != true")
if int(status.get("chunks") or 0) < 1:
    raise SystemExit("[fail] datanet status shows no chunks")
if int(status.get("manifests") or 0) < 1:
    raise SystemExit("[fail] datanet status shows no manifests")

if not proof.get("ok"):
    raise SystemExit("[fail] proof ok != true")
if not post.get("ok"):
    raise SystemExit("[fail] receipt post ok != true")
if not post.get("wrote"):
    raise SystemExit("[fail] receipt post wrote != true")

before_total = int(before.get("total") or 0)
after_total = int(after.get("total") or 0)
if after_total < before_total:
    raise SystemExit(f"[fail] receipts total decreased: {before_total} -> {after_total}")

post_receipt_id = str(post.get("id") or "")
events = ledger.get("events") or []
matches = []
for ev in events:
    if str(ev.get("reason") or "") != "datanet_receipt":
        continue
    if str(ev.get("account") or ev.get("who") or "") != who:
        continue
    if post_receipt_id and str(ev.get("receipt_id") or "") == post_receipt_id:
        matches.append(ev)

if not matches:
    raise SystemExit("[fail] no matching datanet_receipt credit found in wc ledger")

print("datanet_mvp_proof_ok=1")
print(f"root={proof.get('root')}")
print(f"leaf={proof.get('leaf')}")
print(f"receipt_id={post_receipt_id}")
print(f"receipts_total_before={before_total}")
print(f"receipts_total_after={after_total}")
print(f"ledger_match_count={len(matches)}")
print(f"latest_credit_delta={matches[0].get('delta')}")
PY

echo
echo "[ok] bundle: $OUT"
