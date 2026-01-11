#!/usr/bin/env bash
set -euo pipefail

# ultra-safe for "my terminal wedged" situations
stty sane 2>/dev/null || true
reset -w 2>/dev/null || true

BASE="${BASE:-http://127.0.0.1:4100}"
PLAINTEXT="${1:-hello datanet $(date +%Y%m%d-%H%M%S)}"

die() { echo "[FAIL] $*" >&2; exit 1; }

# curl helper: NEVER hide error bodies; keep output tiny
# usage: http_json METHOD URL BODY_JSON(optional)
http_json() {
  local method="$1"; shift
  local url="$1"; shift
  local body="${1:-}"
  local hdr="/tmp/dn_hdr.$$.$RANDOM.txt"
  local out="/tmp/dn_body.$$.$RANDOM.txt"

  if [[ "$method" == "GET" ]]; then
    curl -sS --max-time 8 -D "$hdr" -o "$out" "$url" || true
  else
    curl -sS --max-time 8 -D "$hdr" -o "$out" \
      -H 'content-type: application/json' \
      -X "$method" --data-binary "$body" \
      "$url" || true
  fi

  local code
  code="$(awk 'NR==1{print $2}' "$hdr" 2>/dev/null || true)"
  echo "$code"
  echo "$out"
  echo "$hdr"
}

echo "=== [0] quick health (ultralow) ==="
curl -fsS --max-time 2 "$BASE/health" >/dev/null && echo "[ok] node /health" || die "node /health failed"
echo

echo "=== [1] publish ==="
PJSON="$(jq -n \
  --arg b64 "$(printf "%s" "$PLAINTEXT" | base64 -w0)" \
  --arg name "mvp.txt" \
  --arg mime "text/plain" \
  '{plaintext_b64:$b64,name:$name,mime:$mime}'
)"

read -r CODE OUT HDR < <( (http_json POST "$BASE/datanet/v1/publish" "$PJSON") | paste -sd' ' - )
# ^ paste trick keeps it 1 line; we’ll re-split below
CODE="$(echo "$CODE" | awk '{print $1}')"
OUT="$(echo "$OUT"  | awk '{print $2}')"
HDR="$(echo "$HDR"  | awk '{print $3}')"

if [[ "$CODE" != "200" ]]; then
  echo "[bad] HTTP=$CODE"
  echo "--- response headers (first 40 lines) ---"
  sed -n '1,40p' "$HDR" || true
  echo "--- response body (first 120 lines) ---"
  sed -n '1,120p' "$OUT" || true
  die "publish failed"
fi

PUB="$(cat "$OUT")"
echo "$PUB" | jq -r '.ok, .id, .plain_sha256' >/dev/null || { echo "$PUB" | head -c 8000; die "publish JSON missing fields"; }

ID="$(echo "$PUB" | jq -r '.id')"
KEY="$(echo "$PUB" | jq -r '.key_b64')"
NONCE="$(echo "$PUB" | jq -r '.nonce_b64')"
PLAIN_SHA="$(echo "$PUB" | jq -r '.plain_sha256')"

echo "[ok] id=$ID"
echo "[ok] plain_sha256=$PLAIN_SHA"
echo

echo "=== [2] fetch ==="
read -r CODE OUT HDR < <( (http_json GET "$BASE/datanet/v1/fetch/$ID") | paste -sd' ' - )
CODE="$(echo "$CODE" | awk '{print $1}')"
OUT="$(echo "$OUT"  | awk '{print $2}')"
HDR="$(echo "$HDR"  | awk '{print $3}')"

if [[ "$CODE" != "200" ]]; then
  echo "[bad] HTTP=$CODE"
  echo "--- response headers (first 40 lines) ---"
  sed -n '1,40p' "$HDR" || true
  echo "--- response body (first 120 lines) ---"
  sed -n '1,120p' "$OUT" || true
  die "fetch failed"
fi

F="$(cat "$OUT")"
echo "$F" | jq -r '.ok, .verify_ok, .cipher_sha256_server' >/dev/null || { echo "$F" | head -c 8000; die "fetch JSON missing fields"; }

VERIFY_OK="$(echo "$F" | jq -r '.verify_ok')"
CIPHER="$(echo "$F" | jq -r '.cipher_b64')"
echo "[ok] server_verify_ok=$VERIFY_OK"
echo

echo "=== [3] decrypt client-side (node) + prove sha + plaintext ==="
node - <<'NODE' "$PLAINTEXT" "$KEY" "$NONCE" "$CIPHER" "$PLAIN_SHA"
const crypto=require("crypto");
const plain_in=process.argv[1];
const key=Buffer.from(process.argv[2],"base64");
const nonce=Buffer.from(process.argv[3],"base64");
const cipherAll=Buffer.from(process.argv[4],"base64");
const want=process.argv[5];

if (key.length !== 32) { console.error("[FAIL] key len", key.length); process.exit(2); }
if (nonce.length < 8 || nonce.length > 16) { console.error("[FAIL] nonce len", nonce.length); process.exit(2); }
if (cipherAll.length < 17) { console.error("[FAIL] cipher too short", cipherAll.length); process.exit(2); }

const tag=cipherAll.subarray(cipherAll.length-16);
const enc=cipherAll.subarray(0,cipherAll.length-16);

const dec=crypto.createDecipheriv("aes-256-gcm", key, nonce);
dec.setAuthTag(tag);
let out;
try {
  out=Buffer.concat([dec.update(enc), dec.final()]);
} catch (e) {
  console.error("[FAIL] decrypt error:", (e && e.message) ? e.message : e);
  process.exit(3);
}

const got=crypto.createHash("sha256").update(out).digest("hex");
if (got !== want) {
  console.error("[FAIL] sha mismatch got=",got,"want=",want);
  process.exit(4);
}
const s=out.toString("utf8");
if (s !== plain_in) {
  console.error("[FAIL] plaintext mismatch");
  process.exit(5);
}
console.log("[ok] decrypt+verify OK");
NODE

echo
echo "[done] DataNet MVP v1 roundtrip succeeded"
