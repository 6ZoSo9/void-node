#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
WHO="${WHO:-smoke}"
NAME="${1:-export-$(date +%Y%m%d-%H%M%S)}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[FAIL] missing cmd: $1" >&2; exit 2; }; }
need curl
need jq
need sha256sum
need base64

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR" >/dev/null 2>&1 || true' EXIT

echo "=== [0] quick health (ultralow) ==="
curl -fsS --max-time 2 "$BASE/health" >/dev/null
echo "[ok] node /health"
echo

echo "=== [A] build plaintext payload ==="
PAY="$TMP_DIR/payload.bin"
# deterministic-ish payload (8192 bytes)
head -c 8192 </dev/zero | tr '\0' 'a' >"$PAY"
PAY_BYTES="$(wc -c <"$PAY" | tr -d ' ')"
PAY_SHA="$(sha256sum "$PAY" | awk '{print $1}')"
PAY_B64="$(base64 -w0 <"$PAY")"
echo "[ok] payload_bytes=$PAY_BYTES plain_sha256=$PAY_SHA"
echo

echo "=== [1] publish (who in QUERY, raw) ==="
PUB_JSON="$TMP_DIR/publish.json"
REQ="$TMP_DIR/publish.req.json"
cat >"$REQ" <<EOF
{"ok":true,"who":"$WHO","name":"$NAME","mime":"application/octet-stream","plaintext_b64":"$PAY_B64","bytes_claim":$PAY_BYTES}
EOF

# publish (keep output in file; print small)
curl -fsS -X POST "$BASE/datanet/v1/publish?who=$WHO" \
  -H 'Content-Type: application/json' \
  --data-binary @"$REQ" >"$PUB_JSON"

ID="$(jq -r '.id // empty' "$PUB_JSON")"
ROOT="$(jq -r '.merkleRootHex // empty' "$PUB_JSON")"
SZ="$(jq -r '.sizeBytes // empty' "$PUB_JSON")"

if [ -z "$ID" ] || [ -z "$ROOT" ]; then
  echo "[FAIL] publish returned no id/root" >&2
  jq -c '{ok,id,error,who,name,sizeBytes,merkleRootHex}' "$PUB_JSON" 2>/dev/null || true
  exit 10
fi

echo "[ok] id=$ID merkleRootHex=$ROOT sizeBytes=$SZ"
if [ "$ROOT" != "$PAY_SHA" ]; then
  echo "[FAIL] publish root mismatch vs local sha" >&2
  echo "[dbg] local_sha=$PAY_SHA" >&2
  exit 11
fi
echo "[ok] publish root matches local sha"
echo

echo "=== [2] fetch (publish_shim_v1 shape) ==="
FETCH_JSON="$TMP_DIR/fetch.json"
FETCH_URL=""

try_fetch() {
  local url="$1"
  if curl -fsS --max-time 6 "$url" >"$FETCH_JSON"; then
    FETCH_URL="$url"
    return 0
  fi
  return 1
}

# likely endpoints (your log showed this works)
try_fetch "$BASE/datanet/v1/fetch/$ID?who=$WHO" \
  || try_fetch "$BASE/datanet/v1/fetch2/$ID?who=$WHO" \
  || try_fetch "$BASE/datanet/v1/fetch/$ID" \
  || { echo "[FAIL] fetch failed (no endpoint worked)" >&2; exit 12; }

echo "[ok] fetched via: $FETCH_URL"

OK="$(jq -r '.ok // empty' "$FETCH_JSON")"
if [ "$OK" != "true" ]; then
  echo "[FAIL] fetch ok!=true" >&2
  jq -c '{ok,error,who,id}' "$FETCH_JSON" 2>/dev/null || true
  exit 13
fi

# IMPORTANT: do NOT print the full JSON (cipher_b64 can be huge).
# Print only a small summary:
jq -c '{ok,who,id,sizeBytes,rootTxt, outDir, has_plaintext_b64:(.plaintext_b64!=null), has_manifest:(.manifest!=null), has_cipher_b64:(.cipher_b64!=null)}' "$FETCH_JSON" || true
echo

# Path A: plaintext_b64 exists (old shape)
PT_B64="$(jq -r '.plaintext_b64 // empty' "$FETCH_JSON")"
if [ -n "$PT_B64" ] && [ "$PT_B64" != "null" ]; then
  echo "=== [3A] verify via plaintext_b64 ==="
  echo "$PT_B64" | base64 -d >"$TMP_DIR/plain.out.bin" 2>/dev/null || { echo "[FAIL] base64 decode plaintext_b64" >&2; exit 14; }
  GOT="$(sha256sum "$TMP_DIR/plain.out.bin" | awk '{print $1}')"
  if [ "$GOT" != "$PAY_SHA" ]; then
    echo "[FAIL] plaintext_b64 sha mismatch" >&2
    echo "[dbg] got=$GOT want=$PAY_SHA" >&2
    exit 15
  fi
  echo "[ok] plaintext_b64 sha matches"
  echo "[done] DataNet MVP v1 roundtrip succeeded"
  exit 0
fi

# Path B: publish_shim_v1 shape: verify via disk sourcePath
echo "=== [3B] verify via manifest.sourcePath on disk (local node) ==="
SRC="$(jq -r '.manifest.sourcePath // empty' "$FETCH_JSON")"
ROOT_TXT="$(jq -r '.rootTxt // .manifest.merkleRootHex // empty' "$FETCH_JSON")"
if [ -z "$SRC" ] || [ "$SRC" = "null" ]; then
  echo "[FAIL] no plaintext_b64 and no manifest.sourcePath" >&2
  exit 16
fi
if [ ! -f "$SRC" ]; then
  echo "[FAIL] sourcePath not found on disk: $SRC" >&2
  exit 17
fi

GOT2="$(sha256sum "$SRC" | awk '{print $1}')"
WANT="${ROOT_TXT:-$PAY_SHA}"

echo "[dbg] sourcePath=$SRC"
echo "[dbg] sha_disk=$GOT2"
echo "[dbg] want=$WANT"

if [ "$GOT2" != "$WANT" ]; then
  echo "[FAIL] disk sha mismatch" >&2
  exit 18
fi

echo "[ok] disk sha matches"
echo "[done] DataNet MVP v1 roundtrip succeeded"
exit 0
