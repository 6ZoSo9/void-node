#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

BASE="${BASE:-http://127.0.0.1:4100}"
SIZE_BYTES="${SIZE_BYTES:-1024}"
FILE="src/http/datanet_routes.ts"

[[ -f "$FILE" ]] || { echo "[ERR] missing $FILE"; exit 2; }

TMPDIR="${TMPDIR:-/tmp}"
BIN="$TMPDIR/void-datanet-smoke.bin.$$"
RESP="$TMPDIR/void-datanet-smoke.resp.$$"
FETCH="$TMPDIR/void-datanet-smoke.fetch.$$"
HDR="$TMPDIR/void-datanet-smoke.hdr.$$"
cleanup(){ rm -f "$BIN" "$RESP" "$FETCH" "$HDR" 2>/dev/null || true; }
trap cleanup EXIT

python3 - <<PY
import os
p = r"$BIN"
n = int(r"$SIZE_BYTES")
with open(p,"wb") as f:
    f.write(os.urandom(n))
print(p)
PY

SHA="$(python3 - <<PY
import hashlib
p=r"$BIN"
print(hashlib.sha256(open(p,'rb').read()).hexdigest())
PY
)"

PREFIX="$(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
m=re.search(r'app\.use\(\s*["\']([^"\']+)["\']\s*,\s*router\s*\)', s)
print(m.group(1) if m else "/datanet/v1")
PY
)"

mapfile -t POSTS < <(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
for p in re.findall(r'router\.post\(\s*["\']([^"\']+)["\']', s):
    print(p)
PY
)

mapfile -t GETS < <(python3 - <<'PY' "$FILE"
import re,sys
s=open(sys.argv[1],"r",errors="replace").read()
for p in re.findall(r'router\.get\(\s*["\']([^"\']+)["\']', s):
    print(p)
PY
)

echo "BASE=$BASE"
echo "PREFIX=$PREFIX"
echo "BIN=$BIN bytes=$SIZE_BYTES sha256=$SHA"
echo

extract_id(){
  python3 - <<'PY' "$1"
import json,sys,re
raw=open(sys.argv[1],"rb").read()
s=raw.decode("utf-8","replace")
try:
    j=json.loads(s)
    # common ids
    for k in ("datasetId","dataset_id","id","datasetID","datasetIdHex","dataset"):
        v=j.get(k)
        if isinstance(v,str) and v:
            print(v); sys.exit(0)
    # nested
    for k in ("result","data"):
        v=j.get(k)
        if isinstance(v,dict):
            for kk in ("datasetId","dataset_id","id"):
                vv=v.get(kk)
                if isinstance(vv,str) and vv:
                    print(vv); sys.exit(0)
except Exception:
    pass
m=re.search(r'(datasetId|dataset_id|id)"?\s*[:=]\s*"?([0-9a-fA-Fx_-]{8,})', s)
if m:
    print(m.group(2)); sys.exit(0)
sys.exit(1)
PY
}

publish_attempt(){
  local url="$1"
  local mode="$2" # raw|form|json
  rm -f "$RESP" "$HDR" || true

  local code
  if [[ "$mode" == "raw" ]]; then
    code="$(curl -sS -D "$HDR" -o "$RESP" -w "%{http_code}" \
      --connect-timeout 1 --max-time 15 \
      -X POST \
      -H "Content-Type: application/octet-stream" \
      -H "x-void-filename: smoke.bin" \
      -H "x-void-sha256: $SHA" \
      --data-binary @"$BIN" \
      "$url" || true)"
  elif [[ "$mode" == "form" ]]; then
    code="$(curl -sS -D "$HDR" -o "$RESP" -w "%{http_code}" \
      --connect-timeout 1 --max-time 15 \
      -X POST \
      -F "file=@$BIN;filename=smoke.bin" \
      -F "sha256=$SHA" \
      "$url" || true)"
  else
    local b64
    b64="$(python3 - <<PY
import base64
print(base64.b64encode(open(r"$BIN","rb").read()).decode("ascii"))
PY
)"
    code="$(curl -sS -D "$HDR" -o "$RESP" -w "%{http_code}" \
      --connect-timeout 1 --max-time 15 \
      -X POST \
      -H "Content-Type: application/json" \
      --data "{\"data_b64\":\"$b64\",\"sha256\":\"$SHA\",\"filename\":\"smoke.bin\",\"mime\":\"application/octet-stream\"}" \
      "$url" || true)"
  fi

  echo "$code"
}

echo "=== [publish] try discovered POST routes (raw->json->form) ==="
PUB_ID=""
PUB_URL=""
PUB_MODE=""
PUB_CODE=""
if [[ "${#POSTS[@]}" -eq 0 ]]; then
  echo "[ERR] no POST routes found in $FILE"
  exit 2
fi

for p in "${POSTS[@]}"; do
  url="$BASE$PREFIX$p"
  for mode in raw json form; do
    echo "[try] $mode $p"
    code="$(publish_attempt "$url" "$mode")"
    PUB_CODE="$code"
    if [[ "$code" == "200" || "$code" == "201" ]]; then
      if id="$(extract_id "$RESP" 2>/dev/null)"; then
        PUB_ID="$id"; PUB_URL="$url"; PUB_MODE="$mode"
        echo "[ok] publish succeeded: id=$PUB_ID via $PUB_MODE $p"
        break 2
      fi
    fi
  done
done

if [[ -z "$PUB_ID" ]]; then
  echo
  echo "[ERR] publish failed on all POST routes."
  echo "last_http_code=$PUB_CODE"
  echo "--- last response head (first 40 lines) ---"
  sed -n '1,40p' "$HDR" 2>/dev/null || true
  echo "--- last response body (first 120 bytes) ---"
  head -c 120 "$RESP" 2>/dev/null | tr '\n' ' '; echo
  exit 3
fi
echo

echo "=== [fetch] try discovered GET routes with id substitution ==="
if [[ "${#GETS[@]}" -eq 0 ]]; then
  echo "[ERR] no GET routes found in $FILE"
  exit 4
fi

sub_path(){
  # replace :id / :datasetId / {id} patterns
  python3 - <<'PY' "$1" "$2"
import sys,re
p=sys.argv[1]; id=sys.argv[2]
p=p.replace("{id}", id).replace("{datasetId}", id)
p=re.sub(r':(id|datasetId|dataset_id)\b', id, p)
print(p)
PY
}

fetch_attempt(){
  local url="$1"
  rm -f "$FETCH" "$HDR" || true
  local code
  code="$(curl -sS -D "$HDR" -o "$FETCH" -w "%{http_code}" \
    --connect-timeout 1 --max-time 15 \
    "$url" || true)"
  echo "$code"
}

FETCH_URL=""
for gp in "${GETS[@]}"; do
  sp="$(sub_path "$gp" "$PUB_ID")"
  url="$BASE$PREFIX$sp"
  echo "[try] $sp"
  code="$(fetch_attempt "$url")"
  if [[ "$code" == "200" ]]; then
    FETCH_URL="$url"
    echo "[ok] fetch 200 via $sp"
    break
  fi
done

if [[ -z "$FETCH_URL" ]]; then
  echo
  echo "[ERR] fetch failed on all GET routes."
  echo "--- last response head (first 40 lines) ---"
  sed -n '1,40p' "$HDR" 2>/dev/null || true
  echo "--- last response body (first 120 bytes) ---"
  head -c 120 "$FETCH" 2>/dev/null | tr '\n' ' '; echo
  exit 5
fi
echo

echo "=== [verify] roundtrip bytes (best-effort) ==="
# If fetch returned JSON with data_b64, decode; else treat as raw.
CT="$(rg -ni '^content-type:' "$HDR" | head -n 1 | sed 's/\r$//' || true)"
if echo "$CT" | rg -qi 'application/json'; then
  python3 - <<'PY' "$FETCH" "$FETCH.bin"
import json,sys,base64
raw=open(sys.argv[1],"rb").read().decode("utf-8","replace")
j=json.loads(raw)
b=None
for k in ("data_b64","bytes_b64","blob_b64","payload_b64"):
    v=j.get(k)
    if isinstance(v,str) and v: b=v; break
if b is None and isinstance(j.get("result"),dict):
    for k in ("data_b64","bytes_b64","blob_b64","payload_b64"):
        v=j["result"].get(k)
        if isinstance(v,str) and v: b=v; break
if b is None:
    raise SystemExit(3)
open(sys.argv[2],"wb").write(base64.b64decode(b))
PY
  MV="$FETCH.bin"
else
  MV="$FETCH"
fi

python3 - <<PY
import hashlib
a=open(r"$BIN","rb").read()
b=open(r"$MV","rb").read()
ha=hashlib.sha256(a).hexdigest()
hb=hashlib.sha256(b).hexdigest()
print("orig_sha256=", ha)
print("fetch_sha256=", hb)
if a!=b:
    raise SystemExit(6)
PY

echo
echo "=== [done] datanet smoke OK ==="
echo "dataset_id=$PUB_ID"
echo "publish=$PUB_MODE $PUB_URL"
echo "fetch=$FETCH_URL"
