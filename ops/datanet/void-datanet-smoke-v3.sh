#!/usr/bin/env bash
set -euo pipefail
umask 022

BASE="${BASE:-http://127.0.0.1:${HTTP_PORT:-4100}}"
WHO="${WHO:-zoso}"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-datanet-smoke.v3.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1

echo "BASE=$BASE"
echo "WHO=$WHO"
echo

BIN="$(mktemp /tmp/void-datanet-smoke.bin.XXXXXX)"
dd if=/dev/urandom of="$BIN" bs=1024 count=1 status=none
chmod 0644 "$BIN" 2>/dev/null || true
SHA="$(sha256sum "$BIN" | awk '{print $1}')"
echo "BIN=$BIN bytes=$(wc -c <"$BIN") sha256=$SHA"
echo

REQ="$(mktemp /tmp/void-dn-publish.v3.req.XXXXXX.json)"
RESP="$(mktemp /tmp/void-dn-publish.v3.resp.XXXXXX.json)"
FRESP="$(mktemp /tmp/void-dn-fetch.v3.resp.XXXXXX.json)"

# Build plaintext_b64 safely
PLAIN_B64="$(base64 -w0 "$BIN")"
export PLAIN_B64 WHO

python3 - <<'PY' > "$REQ"
import json,os
req={
  "who": os.environ.get("WHO","zoso"),
  "name": "mvp.bin",
  "mime": "application/octet-stream",
  "plaintext_b64": os.environ["PLAIN_B64"],
}
print(json.dumps(req,separators=(',',':')))
PY

echo "=== [1] publish (JSON: who + plaintext_b64) ==="
: > "$RESP"
HTTP="$(curl -sS -o "$RESP" -w '%{http_code}' \
  -H 'content-type: application/json' \
  --data-binary @"$REQ" \
  "$BASE/datanet/v1/publish" || true)"
echo "HTTP=$HTTP url=$BASE/datanet/v1/publish resp=$RESP"
head -c 220 "$RESP" || true
echo
echo

if [ "$HTTP" != "200" ]; then
  echo "[FAIL] publish did not return 200"
  echo "req=$REQ"
  exit 2
fi

ID="$(python3 -c 'import json,sys; print((json.load(sys.stdin) or {}).get("id",""))' < "$RESP" || true)"
if [ -z "$ID" ]; then
  echo "[FAIL] missing id in publish response"
  cat "$RESP" || true
  exit 3
fi

echo "[ok] publish id=$ID"
echo

echo "=== [2] fetch ==="
: > "$FRESP"
HTTP2="$(curl -sS -o "$FRESP" -w '%{http_code}' "$BASE/datanet/v1/fetch/$ID" || true)"
echo "HTTP=$HTTP2 url=$BASE/datanet/v1/fetch/$ID resp=$FRESP"
head -c 240 "$FRESP" || true
echo
echo

if [ "$HTTP2" != "200" ]; then
  echo "[FAIL] fetch did not return 200"
  exit 4
fi

echo "=== [3] receipts.persist quick peek (optional) ==="
curl -fsS "$BASE/datanet/v1/metrics/receipts.persist.prom" | head -n 40 || true
echo
echo "[done] ok"
