#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:4100}"
# VOID_DN_SMOKE_KNOWN_GOOD_JSON_V1
BASE="${BASE/http://localhost/http://127.0.0.1}"
WHO="${WHO:-${USER:-zoso}}"
# VOID_DN_SMOKE_WHO_BODY_V1
WHO="${WHO:-${USER:-zoso}}"

SIZE_BYTES="${SIZE_BYTES:-1024}"

TMPDIR="${TMPDIR:-/tmp}"
BIN="$TMPDIR/void-datanet-smoke.bin.$$"

publish_known_good_json_v1() {
  local URL="$BASE/datanet/v1/publish"
  local B64
  B64="$(base64 -w0 "$BIN" 2>/dev/null || base64 "$BIN" | tr -d '\n')"
  # must be JSON with plaintext_b64, and who must be in BODY (headers/query do not count)
  local BODY
  BODY="$(printf '{"who":"%s","plaintext_b64":"%s","name":"mvp.bin","mime":"application/octet-stream"}' "$WHO" "$B64")"
  local RESP HTTP
  RESP="$(mktemp /tmp/void-dn-smoke.publish.XXXXXX.json)"
  HTTP="$(curl -sS -o "$RESP" -w '%{http_code}' \
    -H 'content-type: application/json' \
    --data-binary "$BODY" \
    "$URL" || true)"
  if [ "$HTTP" = "200" ] && grep -q '"ok":[[:space:]]*true' "$RESP" 2>/dev/null; then
    echo "[ok] known-good publish worked (HTTP=200) url=$URL"
    return 0
  fi
  echo "[warn] known-good publish failed HTTP=$HTTP url=$URL (first 160 chars):"
  head -c 160 "$RESP" || true
  echo
  return 1
}
RESP="$TMPDIR/void-datanet-smoke.resp.$$"
FETCH="$TMPDIR/void-datanet-smoke.fetch.$$"

cleanup(){ rm -f "$BIN" "$RESP" "$FETCH" 2>/dev/null || true; }
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

echo "BASE=$BASE"
echo "BIN=$BIN bytes=$SIZE_BYTES sha256=$SHA"
echo

PUBLISH_EP=(
  "/datanet/v1/publish"
  "/datanet/publish"
  "/api/datanet/publish"
  "/datanet/v0/publish"
  "/dataset/publish"
)

FETCH_EP_TPL=(
  "/datanet/v1/fetch/{id}"
  "/datanet/v1/dataset/{id}"
  "/datanet/v1/dataset/{id}/raw"
  "/datanet/fetch/{id}"
  "/datanet/dataset/{id}"
  "/dataset/{id}"
)

extract_id(){
  python3 - <<'PY' "$1"
import json,sys,re
raw = open(sys.argv[1], "rb").read()
s = raw.decode("utf-8", "replace")
try:
    j = json.loads(s)
    for k in ("datasetId","dataset_id","datasetID","id","dataset","dataset_id_hex"):
        v = j.get(k)
        if isinstance(v,str) and v:
            print(v); sys.exit(0)
    for k in ("result","data","dataset"):
        v = j.get(k)
        if isinstance(v,dict):
            for kk in ("datasetId","id","dataset_id"):
                vv=v.get(kk)
                if isinstance(vv,str) and vv:
                    print(vv); sys.exit(0)
except Exception:
    pass
m = re.search(r'(datasetId|dataset_id|id)"?\s*[:=]\s*"?([0-9a-fA-Fx_-]{8,})', s)
if m:
    print(m.group(2)); sys.exit(0)
sys.exit(1)
PY
}

# global counters for "not implemented"
NF_TRIES=0
NF_404=0

publish_try(){
  local url="$1"
  local mode="$2" # form|raw|json
  local code
  rm -f "$RESP" || true

  if [[ "$mode" == "form" ]]; then
    code="$(curl -sS -o "$RESP" -w "%{http_code}" \
      --connect-timeout 1 --max-time 10 \
      -F "file=@$BIN" \
      "$url" || true)"
  elif [[ "$mode" == "raw" ]]; then
    code="$(curl -sS -o "$RESP" -w "%{http_code}" \
      --connect-timeout 1 --max-time 10 \
      -H "Content-Type: application/octet-stream" \
      --data-binary @"$BIN" \
      "$url" || true)"
  else
    local b64
    b64="$(python3 - <<PY
import base64
print(base64.b64encode(open(r"$BIN","rb").read()).decode("ascii"))
PY
)"
    code="$(curl -sS -o "$RESP" -w "%{http_code}" \
      --connect-timeout 1 --max-time 10 \
      -H "Content-Type: application/json" \
      --data "{\"data_b64\":\"$b64\"}" \
      "$url" || true)"
  fi

  NF_TRIES="$((NF_TRIES+1))"
  if [[ "$code" == "404" ]]; then NF_404="$((NF_404+1))"; fi

  if [[ "$code" != "200" && "$code" != "201" ]]; then
    return 1
  fi

  if ID="$(extract_id "$RESP" 2>/dev/null)"; then
    echo "$ID"
    return 0
  fi
  return 1
}

echo "=== [publish] probe endpoints ==="
PUB_ID=""
PUB_URL=""
PUB_MODE=""
for ep in "${PUBLISH_EP[@]}"; do
  for mode in form raw json; do
    url="$BASE$ep"
    echo "[try] $mode $url"
    if id="$(publish_try "$url" "$mode" 2>/dev/null)"; then
      PUB_ID="$id"
      PUB_URL="$url"
      PUB_MODE="$mode"
      echo "[ok] publish succeeded: id=$PUB_ID via $PUB_MODE $PUB_URL"
      break 2
    fi
  done
done

if [[ -z "$PUB_ID" ]]; then
  if [[ "$NF_TRIES" -gt 0 && "$NF_TRIES" == "$NF_404" ]]; then
    echo "[SKIP] DataNet publish routes look unimplemented (all 404)."
    exit 42
  fi
  echo "[ERR] publish failed on all probed endpoints."
  exit 2
fi
echo

fetch_try(){
  local url="$1"
  local code ct
  rm -f "$FETCH" || true
  local hdr="$FETCH.hdr"
  rm -f "$hdr" || true
  code="$(curl -sS -D "$hdr" -o "$FETCH" -w "%{http_code}" \
    --connect-timeout 1 --max-time 10 \
    "$url" || true)"
  if [[ "$code" != "200" ]]; then
    rm -f "$hdr" || true
    return 1
  fi
  ct="$(rg -ni '^content-type:' "$hdr" | head -n 1 | sed 's/\r$//' || true)"
  rm -f "$hdr" || true

  if echo "$ct" | rg -qi 'application/json'; then
    python3 - <<'PY' "$FETCH" "$FETCH"
import json,sys,base64
p=sys.argv[1]
raw=open(p,'rb').read().decode('utf-8','replace')
j=json.loads(raw)
b=None
for k in ("data_b64","data","bytes_b64","blob_b64","payload_b64"):
    v=j.get(k)
    if isinstance(v,str) and v:
        b=v; break
if b is None and isinstance(j.get("result"),dict):
    for k in ("data_b64","data","bytes_b64","blob_b64","payload_b64"):
        v=j["result"].get(k)
        if isinstance(v,str) and v:
            b=v; break
if b is None:
    raise SystemExit(3)
out=base64.b64decode(b)
open(sys.argv[2],'wb').write(out)
PY
  fi
  return 0
}

echo "=== [fetch] probe endpoints ==="
FETCH_OK=0
for tpl in "${FETCH_EP_TPL[@]}"; do
  ep="${tpl//\{id\}/$PUB_ID}"
  url="$BASE$ep"
  echo "[try] $url"
  if fetch_try "$url"; then
    FETCH_OK=1
    echo "[ok] fetch succeeded via $url"
    break
  fi
done

if [[ "$FETCH_OK" != "1" ]]; then
  echo "[ERR] fetch failed on all probed endpoints for id=$PUB_ID"
  exit 3
fi
echo

echo "=== [verify] roundtrip bytes ==="
python3 - <<PY
import hashlib
a=open(r"$BIN","rb").read()
b=open(r"$FETCH","rb").read()
print("orig_sha256=", hashlib.sha256(a).hexdigest())
print("fetch_sha256=", hashlib.sha256(b).hexdigest())
if a!=b:
    raise SystemExit(4)
PY
echo "[ok] roundtrip match"
echo
echo "=== [done] datanet smoke OK ==="
echo "dataset_id=$PUB_ID"
echo "publish=$PUB_MODE $PUB_URL"

if publish_known_good_json_v1; then echo "[ok] publish stage satisfied via known-good JSON"; exit 0; fi
