#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

BASE="${BASE:-http://127.0.0.1:4100}"
SIZE_BYTES="${SIZE_BYTES:-1024}"
CHUNK_BYTES="${CHUNK_BYTES:-1048576}" # force single chunk for smoke
FILE="src/http/datanet_routes.ts"
CTL="src/voidctl/index.ts"

[[ -f "$FILE" ]] || { echo "[ERR] missing $FILE"; exit 2; }
[[ -f "$CTL"  ]] || { echo "[ERR] missing $CTL"; exit 3; }

TMPDIR="${TMPDIR:-/tmp}"
BIN="$TMPDIR/void-datanet-smoke.bin.$$"
PACKDIR="$TMPDIR/void-datanet-pack.$$"
MANI="$TMPDIR/void-datanet-manifest.$$\.json"
CHUNK="$TMPDIR/void-datanet-chunk.$$\.bin"
FETCH_CH="$TMPDIR/void-datanet-fetch.chunk.$$"
HDR="$TMPDIR/void-datanet-smoke.hdr.$$"
cleanup(){ rm -rf "$BIN" "$PACKDIR" "$MANI" "$CHUNK" "$FETCH_CH" "$HDR" 2>/dev/null || true; }
trap cleanup EXIT

python3 - <<PY
import os
p=r"$BIN"; n=int(r"$SIZE_BYTES")
with open(p,"wb") as f: f.write(os.urandom(n))
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

echo "BASE=$BASE"
echo "PREFIX=$PREFIX"
echo "BIN=$BIN bytes=$SIZE_BYTES sha256=$SHA"
echo "CHUNK_BYTES=$CHUNK_BYTES"
echo

TSX_REQ="$(node -e 'process.stdout.write(require.resolve("tsx/dist/preflight.cjs"))')"
TSX_LOADER="$(node -e 'process.stdout.write("file://"+require.resolve("tsx/dist/loader.mjs"))')"

echo "=== [pack] via voidctl under tsx loader ==="
rm -rf "$PACKDIR"; mkdir -p "$PACKDIR"
node --require "$TSX_REQ" --import "$TSX_LOADER" "$CTL" datanet pack --in "$BIN" --out "$PACKDIR" --chunk-bytes "$CHUNK_BYTES"

# locate manifest json + chunk file
MJSON="$(ls -1 "$PACKDIR"/*.json 2>/dev/null | head -n 1 || true)"
[[ -n "$MJSON" ]] || { echo "[ERR] no manifest json found in $PACKDIR"; ls -la "$PACKDIR" || true; exit 10; }
cp -a "$MJSON" "$MANI"

CF="$(ls -1 "$PACKDIR"/* 2>/dev/null | rg -v '\.json$' | head -n 1 || true)"
[[ -n "$CF" ]] || { echo "[ERR] no chunk file found in $PACKDIR"; ls -la "$PACKDIR" || true; exit 11; }
cp -a "$CF" "$CHUNK"

ROOT="$(python3 - <<PY
import json
j=json.load(open(r"$MANI","r"))
for k in ("root","merkleRoot","manifestRoot","datasetRoot"):
  v=j.get(k)
  if isinstance(v,str) and v:
    print(v); break
PY
)"
LEAF="$(python3 - <<PY
import json,re,os
j=json.load(open(r"$MANI","r"))
leaves=j.get("leaves") or j.get("chunks") or j.get("chunkLeaves")
leaf=None
if isinstance(leaves,list) and len(leaves)==1:
  e=leaves[0]
  if isinstance(e,str): leaf=e
  elif isinstance(e,dict):
    for k in ("leaf","hash","id","key"):
      if isinstance(e.get(k),str) and e.get(k):
        leaf=e[k]; break
elif isinstance(leaves,dict) and len(leaves)==1:
  leaf=list(leaves.keys())[0]
if not leaf:
  # fallback: try to grab a 64-hex from chunk filename
  bn=os.path.basename(r"$CF")
  m=re.search(r'([0-9a-f]{64})', bn)
  if m: leaf=m.group(1)
print(leaf or "")
PY
)"

[[ -n "$ROOT" && -n "$LEAF" ]] || { echo "[ERR] could not extract ROOT/LEAF"; echo "ROOT=$ROOT LEAF=$LEAF"; exit 12; }

echo "[ok] ROOT=$ROOT"
echo "[ok] LEAF=$LEAF"
echo

put(){
  local url="$1"; shift
  local ctype="$1"; shift
  local data="$1"; shift
  rm -f "$HDR" || true
  curl -sS -D "$HDR" -o /tmp/void-dn.body.$$ -w "%{http_code}" \
    --connect-timeout 1 --max-time 20 \
    -X PUT \
    -H "Content-Type: $ctype" \
    --data-binary @"$data" \
    "$url" || true
}

get(){
  local url="$1"; shift
  local out="$1"; shift
  rm -f "$HDR" || true
  curl -sS -D "$HDR" -o "$out" -w "%{http_code}" \
    --connect-timeout 1 --max-time 20 \
    "$url" || true
}

CHUNK_URL="$BASE$PREFIX/chunks/$LEAF"
MAN_URL="$BASE$PREFIX/manifests/$ROOT"

echo "=== [publish] PUT chunk ==="
CODE_CHUNK="$(put "$CHUNK_URL" "application/octet-stream" "$CHUNK")"
echo "chunk_put_code=$CODE_CHUNK url=$CHUNK_URL"
echo

echo "=== [publish] PUT manifest ==="
CODE_MAN="$(put "$MAN_URL" "application/json" "$MANI")"
echo "manifest_put_code=$CODE_MAN url=$MAN_URL"
echo

if [[ "$CODE_CHUNK" == "404" || "$CODE_MAN" == "404" ]]; then
  echo "[ERR] got 404 on PUT. DataNet routes are not mounted (or safe-filtered to 404)."
  exit 20
fi

# accept 200/201/204 as "ok"
ok_put(){ [[ "$1" == "200" || "$1" == "201" || "$1" == "204" ]]; }
ok_get(){ [[ "$1" == "200" ]]; }

ok_put "$CODE_CHUNK" || { echo "[ERR] chunk PUT failed ($CODE_CHUNK)"; sed -n '1,40p' "$HDR" || true; exit 21; }
ok_put "$CODE_MAN"   || { echo "[ERR] manifest PUT failed ($CODE_MAN)"; sed -n '1,40p' "$HDR" || true; exit 22; }

echo "=== [fetch] GET chunk ==="
CODE_GCH="$(get "$CHUNK_URL" "$FETCH_CH")"
echo "fetch_chunk_code=$CODE_GCH url=$CHUNK_URL"
echo
ok_get "$CODE_GCH" || { echo "[ERR] chunk GET failed ($CODE_GCH)"; sed -n '1,40p' "$HDR" || true; exit 23; }

echo "=== [verify] roundtrip ==="
python3 - <<PY
import hashlib
orig=open(r"$BIN","rb").read()
got=open(r"$FETCH_CH","rb").read()
ho=hashlib.sha256(orig).hexdigest()
hg=hashlib.sha256(got).hexdigest()
print("orig_sha256=",ho)
print("got_sha256 =",hg)
if orig!=got: raise SystemExit(9)
PY

echo
echo "dataset_root=$ROOT"
echo "leaf=$LEAF"
echo "publish_chunk=PUT $CHUNK_URL ($CODE_CHUNK)"
echo "publish_manifest=PUT $MAN_URL ($CODE_MAN)"
echo "fetch_chunk=GET $CHUNK_URL ($CODE_GCH)"
echo "=== [done] datanet smoke OK ==="
