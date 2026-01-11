#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"

# plaintext comes from argv1 (recommended) or a safe default
PLAINTEXT="${1:-hello datanet $(date +%Y%m%d-%H%M%S)}"

echo "=== [0] quick health (ultralow) ==="
curl -fsS --max-time 2 "$BASE/health" >/dev/null && echo "[ok] node /health"

echo
echo "=== [1] publish ==="
PJSON="$(jq -n \
  --arg s "$PLAINTEXT" \
  --arg name "mvp.txt" \
  --arg mime "text/plain" \
  '{plaintext_b64: ($s|@base64), name:$name, mime:$mime}')"

PUB="$(curl -fsS --max-time 5 \
  -H 'content-type: application/json' \
  --data-binary "$PJSON" \
  "$BASE/datanet/v1/publish")"

echo "$PUB" | jq -r '.ok, .id, .plain_sha256' >/dev/null

ID="$(echo "$PUB" | jq -r '.id')"
KEY="$(echo "$PUB" | jq -r '.key_b64')"
NONCE="$(echo "$PUB" | jq -r '.nonce_b64')"
PLAIN_SHA="$(echo "$PUB" | jq -r '.plain_sha256')"

echo "[ok] id=$ID"
echo "[ok] plain_sha256=$PLAIN_SHA"

echo
echo "=== [2] fetch ==="
F="$(curl -fsS --max-time 5 "$BASE/datanet/v1/fetch/$ID")"
echo "$F" | jq -r '.ok, .verify_ok, .cipher_sha256_server' >/dev/null

CIPHER="$(echo "$F" | jq -r '.cipher_b64')"
VERIFY_OK="$(echo "$F" | jq -r '.verify_ok')"
echo "[ok] server_verify_ok=$VERIFY_OK"

echo
echo "=== [3] decrypt client-side (node) + prove hash matches ==="
node - "$PLAINTEXT" "$KEY" "$NONCE" "$CIPHER" "$PLAIN_SHA" <<'NODE'
const crypto=require("crypto");

const [plain_in, key_b64, nonce_b64, cipher_b64, want] = process.argv.slice(2);
	const key=Buffer.from(key_b64,"base64");
	const nonce=Buffer.from(nonce_b64,"base64");
	const cipherAll=Buffer.from(cipher_b64,"base64");

if (key.length !== 32) { console.error("[FAIL] key length != 32"); process.exit(10); }
if (nonce.length < 8) { console.error("[FAIL] nonce too short"); process.exit(11); }
if (cipherAll.length < 17) { console.error("[FAIL] cipher too short"); process.exit(12); }

const tag=cipherAll.subarray(cipherAll.length-16);
const enc=cipherAll.subarray(0,cipherAll.length-16);

const dec=crypto.createDecipheriv("aes-256-gcm", key, nonce);
dec.setAuthTag(tag);

let out;
try {
  out=Buffer.concat([dec.update(enc), dec.final()]);
} catch (e) {
  console.error("[FAIL] decrypt threw:", (e && e.message) ? e.message : String(e));
  process.exit(13);
}

const got=crypto.createHash("sha256").update(out).digest("hex");
if (got !== want) {
  console.error("[FAIL] sha mismatch got=",got,"want=",want);
  process.exit(2);
}

const s=out.toString("utf8");
if (s !== plain_in) {
  console.error("[FAIL] plaintext mismatch");
  process.exit(3);
}

console.log("[ok] decrypt+verify OK");
NODE

echo
echo "# === [receipt] tell node we verified decrypt client-side ===
RJSON="1000 4 24 27 30 46 100 114 125 992 1000jq -n --arg id "" --arg plain "" --arg who "roundtrip-smoke" --arg mime "text/plain" --arg name "mvp.txt" --argjson ok 1 --argjson wc_award 1 '{ id:, plain_sha256:, who:, mime:, name:, ok:, wc_award: }')"
# best-effort (do not fail the smoke if receipt write fails)
set +e
curl -fsS --max-time 3 -H 'content-type: application/json' -d "" "/datanet/v1/receipt" >/dev/null 2>&1
set -e

[done] DataNet MVP v1 roundtrip succeeded"
