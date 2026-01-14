#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-smoke}"

TS="$(date +%Y%m%d-%H%M%S)"
DIR="/tmp/void-datanet-smoke-v3.$TS"
mkdir -p "$DIR"

REQ="$DIR/publish.req.json"
PUB="$DIR/publish.resp.json"
PUBH="$DIR/publish.hdr.txt"
FETCH="$DIR/fetch.resp.bin"
FETCHH="$DIR/fetch.hdr.txt"

cat > "$REQ" <<EOF
{"name":"smoke.txt","mime":"text/plain","plaintext_b64":"eA=="}
EOF

PUB_HTTP="$(curl -sS -D "$PUBH" -o "$PUB" \
  -H 'content-type: application/json' \
  -X POST "$BASE/datanet/v1/publish?who=$WHO" \
  --data-binary "@$REQ" \
  -w '%{http_code}' || echo 000)"

ID=""
if [ "$PUB_HTTP" = "200" ]; then
  ID="$(python3 - <<'PY' "$PUB" 2>/dev/null || true
import json,sys
try:
  o=json.load(open(sys.argv[1],'r'))
  print(o.get("id",""))
except Exception:
  print("")
PY
)"
fi

FETCH_HTTP="000"
if [ -n "$ID" ]; then
  FETCH_HTTP="$(curl -sS -D "$FETCHH" -o "$FETCH" \
    "$BASE/datanet/v1/fetch/$ID?who=$WHO" \
    -w '%{http_code}' || echo 000)"
fi

echo "dir=$DIR"
echo "publish_http=$PUB_HTTP id=${ID:-<none>}"
echo "fetch_http=$FETCH_HTTP"
