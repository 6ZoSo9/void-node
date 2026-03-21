#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-zoso}"

# Prefer /tmp, but fall back if /tmp is busted/full.
TMPDIR="${TMPDIR:-/tmp}"
if ! ( mkdir -p "$TMPDIR" 2>/dev/null && touch "$TMPDIR/.void_tmp_test.$$" 2>/dev/null ); then
  TMPDIR="/home/zoso/dev/void-node/.tmp"
  mkdir -p "$TMPDIR"
fi
rm -f "$TMPDIR/.void_tmp_test.$$" 2>/dev/null || true

TMP_PUB="$(mktemp "$TMPDIR/datanet.publish.XXXXXX.json")"
TMP_FETCH="$(mktemp "$TMPDIR/datanet.fetch.XXXXXX.json")"
cleanup(){ rm -f "$TMP_PUB" "$TMP_FETCH"; }
trap cleanup EXIT

PLAINTEXT="void-datanet-loop-proof-$(date +%s)"
B64="$(printf %s "$PLAINTEXT" | base64 -w0)"

echo "=== [0] health ==="
curl -fsS --max-time 1.0 "$BASE/health" >/dev/null
echo "[ok] health"
echo

echo "=== [1] publish ==="
# Write body to TMP_PUB, and capture HTTP code separately WITHOUT the 200000 bug.
HTTP_CODE="$(curl -sS --max-time 8 -o "$TMP_PUB" -w "%{http_code}" \
  -H "content-type: application/json" \
  -d "{\"name\":\"loopproof.txt\",\"mime\":\"text/plain\",\"plaintext_b64\":\"$B64\"}" \
  "$BASE/datanet/v1/publish?who=$WHO" || true)"

echo "[ok] publish_http=$HTTP_CODE"
echo "publish_body:"
sed -n "1,3p" "$TMP_PUB" || true

if [ "$HTTP_CODE" != "200" ]; then
  echo "[FAIL] publish failed"
  exit 1
fi

# datasetId extraction: accept either datasetId=... line OR JSON {id:"..."}
datasetId="$(sed -n "s/^datasetId=//p" "$TMP_PUB" | tail -n 1 || true)"
if [ -z "${datasetId:-}" ]; then
  datasetId="$(python3 - "$TMP_PUB" <<'PY' 2>/dev/null || true
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,"r",encoding="utf-8"))
  print(j.get("id",""))
except Exception:
  pass
PY
)"
fi
datasetId="${datasetId:-}"
if [ -z "$datasetId" ]; then
  echo "[FAIL] could not parse dataset id"
  exit 1
fi
echo "datasetId=$datasetId"
echo


# __loopproof_receipt_v1

post_receipt() {
  local root="$1"
  local leaf="$2"
  local idx="$3"
  local bytes="$4"
  local plain_sha="$5"
  local name="$6"
  local mime="$7"
  local who="$8"

  curl -fsS --max-time 2 \
    -H "content-type: application/json" \
    -d "{\"root\":\"${root}\",\"leaf\":\"${leaf}\",\"index\":${idx},\"bytes\":${bytes},\"plain_sha256\":\"${plain_sha}\",\"name\":\"${name}\",\"mime\":\"${mime}\",\"who\":\"${who}\",\"ok\":true}" \
    "$BASE/datanet/v1/receipt" >/dev/null
}

echo "=== [2] fetch ==="
HTTP_CODE2="$(curl -sS --max-time 8 -o "$TMP_FETCH" -w "%{http_code}" \
  "$BASE/datanet/v1/fetch/$datasetId?who=$WHO" || true)"
echo "[ok] fetch_http=$HTTP_CODE2"
echo "fetch_body:"
sed -n "1,3p" "$TMP_FETCH" || true

if [ "$HTTP_CODE2" != "200" ]; then
  echo "[FAIL] fetch failed"
  exit 1
fi

# Lightweight success condition: fetched body contains our plaintext base64 OR plaintext marker.
if rg -n --no-heading -S "$PLAINTEXT" "$TMP_FETCH" >/dev/null 2>&1; then
  echo "[ok] loopproof match (plaintext)"
# __loopproof_receipt_post_v1

  # --- receipt: record success into datanet receipts.jsonl ---
  root="$(python3 - "$TMP_PUB" <<PY 2>/dev/null || true
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,"r",encoding="utf-8"))
  v=str(j.get("merkleRootHex","") or "").lower().replace("0x","")
  print(v)
except Exception:
  pass
PY
)"
  bytes="$(python3 - "$TMP_PUB" <<PY 2>/dev/null || true
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,"r",encoding="utf-8"))
  print(int(j.get("sizeBytes",0) or 0))
except Exception:
  print(0)
PY
)"
  if [ -n "${root:-}" ]; then
    proof_json="$(curl -fsS --max-time 2 "$BASE/datanet/v1/proof/$root/0" || true)"
    leaf="$(python3 -c 'import json,sys; j=json.loads(sys.argv[1] or "{}"); print(str(j.get("leaf","") or "").lower().replace("0x",""))' "$proof_json" 2>/dev/null || true)"
    plain_sha="$(printf %s "$PLAINTEXT" | sha256sum | awk "{print \$1}")"
    if [ -n "${leaf:-}" ]; then
      post_receipt "$root" "$leaf" 0 "$bytes" "$plain_sha" "loopproof.txt" "text/plain" "$WHO" || true
    fi
  fi


  exit 0
fi
if rg -n --no-heading -S "$B64" "$TMP_FETCH" >/dev/null 2>&1; then
  echo "[ok] loopproof match (b64)"
  root="$(python3 - "$TMP_PUB" <<PY2 2>/dev/null || true
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,"r",encoding="utf-8"))
  print(str(j.get("merkleRootHex","") or "").lower().replace("0x",""))
except Exception:
  pass
PY2
)"
  leaf="$(python3 - "$TMP_FETCH" <<PY2 2>/dev/null || true
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,"r",encoding="utf-8"))
  man = j.get("manifest") or {}
  chunks = man.get("chunks") or []
  first = chunks[0] if chunks else {}
  print(str(first.get("leafHashHex","") or "").lower().replace("0x",""))
except Exception:
  pass
PY2
)"
  bytes="$(python3 - "$TMP_PUB" <<PY2 2>/dev/null || true
import json,sys
p=sys.argv[1]
try:
  j=json.load(open(p,"r",encoding="utf-8"))
  print(int(j.get("sizeBytes",0) or 0))
except Exception:
  print(0)
PY2
)"
  plain_sha="$(printf %s "$PLAINTEXT" | sha256sum | awk "{print \$1}")"
  if [ -n "${root:-}" ] && [ -n "${leaf:-}" ]; then
    post_receipt "$root" "$leaf" 0 "$bytes" "$plain_sha" "loopproof.txt" "text/plain" "$WHO" || true
  fi
  exit 0
fi

echo "[FAIL] fetched payload did not contain expected content"
exit 1
