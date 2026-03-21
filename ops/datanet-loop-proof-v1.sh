#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-zoso}"

TMPDIR="${TMPDIR:-/tmp}"
if ! ( mkdir -p "$TMPDIR" 2>/dev/null && touch "$TMPDIR/.void_tmp_test.$$" 2>/dev/null ); then
  TMPDIR="$HOME/dev/void-node/.tmp"
  mkdir -p "$TMPDIR"
fi
rm -f "$TMPDIR/.void_tmp_test.$$" 2>/dev/null || true

TMP_PUB="$(mktemp "$TMPDIR/datanet.publish.XXXXXX.json")"
TMP_FETCH="$(mktemp "$TMPDIR/datanet.fetch.XXXXXX.json")"
cleanup(){ rm -f "$TMP_PUB" "$TMP_FETCH"; }
trap cleanup EXIT

PLAINTEXT="void-datanet-loop-proof-$(date +%s)-$$-$(od -An -N4 -tx1 /dev/urandom | tr -d ' \\n')"
B64="$(printf %s "$PLAINTEXT" | base64 -w0)"

echo "=== [0] health ==="
curl -fsS --max-time 2 "$BASE/health" >/dev/null
echo "[ok] health"
echo

echo "=== [1] publish ==="
HTTP_CODE="$(curl -sS --max-time 10 -o "$TMP_PUB" -w "%{http_code}" \
  -H "content-type: application/json" \
  -X POST "$BASE/datanet/v1/publish?who=$WHO" \
  --data "{\"name\":\"loopproof.txt\",\"mime\":\"text/plain\",\"plaintext_b64\":\"$B64\"}" || true)"

echo "[ok] publish_http=$HTTP_CODE"
echo "publish_body:"
sed -n '1,5p' "$TMP_PUB" || true

if [ "$HTTP_CODE" != "200" ]; then
  echo "[FAIL] publish failed"
  exit 1
fi

datasetId="$(python3 - "$TMP_PUB" <<'PY'
import json,sys
p=sys.argv[1]
try:
    j=json.load(open(p,"r",encoding="utf-8"))
    print(str(j.get("id","") or ""))
except Exception:
    print("")
PY
)"
if [ -z "${datasetId:-}" ]; then
  echo "[FAIL] could not parse dataset id"
  exit 1
fi

root="$(python3 - "$TMP_PUB" <<'PY'
import json,sys
p=sys.argv[1]
try:
    j=json.load(open(p,"r",encoding="utf-8"))
    print(str(j.get("merkleRootHex","") or "").lower().replace("0x",""))
except Exception:
    print("")
PY
)"

bytes="$(python3 - "$TMP_PUB" <<'PY'
import json,sys
p=sys.argv[1]
try:
    j=json.load(open(p,"r",encoding="utf-8"))
    print(int(j.get("sizeBytes",0) or 0))
except Exception:
    print(0)
PY
)"

echo "datasetId=$datasetId"
echo "root=$root"
echo "bytes=$bytes"
echo

echo "=== [2] fetch ==="
HTTP_CODE2="$(curl -sS --max-time 10 -o "$TMP_FETCH" -w "%{http_code}" \
  "$BASE/datanet/v1/fetch/$datasetId?who=$WHO" || true)"

echo "[ok] fetch_http=$HTTP_CODE2"
echo "fetch_body:"
sed -n '1,5p' "$TMP_FETCH" || true

if [ "$HTTP_CODE2" != "200" ]; then
  echo "[FAIL] fetch failed"
  exit 1
fi

leaf="$(python3 - "$TMP_FETCH" <<'PY'
import json,sys
p=sys.argv[1]
try:
    j=json.load(open(p,"r",encoding="utf-8"))
    man=j.get("manifest") or {}
    chunks=man.get("chunks") or []
    first=chunks[0] if chunks else {}
    print(str(first.get("leafHashHex","") or "").lower().replace("0x",""))
except Exception:
    print("")
PY
)"

plain_sha="$(printf %s "$PLAINTEXT" | sha256sum | awk '{print $1}')"

MATCHED=0
if rg -n --no-heading -F "$PLAINTEXT" "$TMP_FETCH" >/dev/null 2>&1; then
  echo "[ok] loopproof match (plaintext)"
  MATCHED=1
elif rg -n --no-heading -F "$B64" "$TMP_FETCH" >/dev/null 2>&1; then
  echo "[ok] loopproof match (b64)"
  MATCHED=1
fi

if [ "$MATCHED" != "1" ]; then
  echo "[FAIL] fetched payload did not contain expected content"
  exit 1
fi

echo
echo "=== [3] receipt ==="
if [ -z "${root:-}" ] || [ -z "${leaf:-}" ]; then
  echo "[FAIL] missing root or leaf for receipt"
  exit 1
fi

RCPT_CODE="$(curl -sS --max-time 10 -o /dev/null -w "%{http_code}" \
  -H "content-type: application/json" \
  -X POST "$BASE/datanet/v1/receipt" \
  --data "{\"root\":\"$root\",\"leaf\":\"$leaf\",\"index\":0,\"bytes\":$bytes,\"plain_sha256\":\"$plain_sha\",\"name\":\"loopproof.txt\",\"mime\":\"text/plain\",\"who\":\"$WHO\",\"ok\":true}" || true)"

echo "[ok] receipt_http=$RCPT_CODE"
if [ "$RCPT_CODE" != "200" ]; then
  echo "[FAIL] receipt failed"
  exit 1
fi

echo
echo "=== [4] wc ==="
curl -fsS "$BASE/wc/balance?account=$WHO" ; echo
curl -fsS "$BASE/wc/ledger?account=$WHO&limit=5" ; echo
