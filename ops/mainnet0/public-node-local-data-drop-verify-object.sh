#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-}"
SHA256="${2:-}"
OUT_DIR="${3:-}"

if [ -z "$BASE" ] || [ -z "$SHA256" ]; then
  echo "usage: ops/mainnet0/public-node-local-data-drop-verify-object.sh <base-url> <sha256> [out-dir]" >&2
  exit 2
fi

BASE="${BASE%/}"

if ! printf '%s' "$SHA256" | grep -Eq '^[a-f0-9]{64}$'; then
  echo "[fail] invalid sha256: $SHA256" >&2
  exit 2
fi

if [ -z "$OUT_DIR" ]; then
  OUT_DIR="/tmp/void-local-data-drop-verify-$SHA256-$(date -u +%Y%m%d-%H%M%S)"
fi

mkdir -p "$OUT_DIR"

PROOF_URL="$BASE/public-node/local-data-drop/proof/$SHA256.json"
OBJECT_URL="$BASE/public-node/local-data-drop/by-sha256/$SHA256"

curl --max-time 20 -fsS "$PROOF_URL" > "$OUT_DIR/object-proof.json"
curl --max-time 20 -fsS "$OBJECT_URL" > "$OUT_DIR/object.bin"

FETCHED_SHA256="$(sha256sum "$OUT_DIR/object.bin" | awk '{print $1}')"

node - "$OUT_DIR/object-proof.json" "$SHA256" "$FETCHED_SHA256" "$OBJECT_URL" "$PROOF_URL" <<'NODE'
const fs = require("fs");
const proof = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expectedSha = process.argv[3];
const fetchedSha = process.argv[4];
const objectUrl = process.argv[5];
const proofUrl = process.argv[6];

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(proof.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1", "proof marker");
ok(proof.sha256 === expectedSha, "proof sha matches requested sha");
ok(fetchedSha === expectedSha, "fetched bytes match requested sha");
ok(proof.receipt_sha256 === expectedSha, "receipt sha matches requested sha");
ok(proof.receipt_valid_for_current_object === true, "receipt valid for current object");
ok(proof.content_address_href === objectUrl, "content address href matches");
ok(proof.proof_href === proofUrl, "proof href matches");
ok(proof.public_upload === false, "no public upload");
ok(proof.operator_local_import_only === true, "operator local only");
ok(proof.public_read_only === true, "public read only");
ok(proof.trusted_as_network_truth === false, "not network truth");

console.log("[ok] object proof verified");
NODE

BYTES="$(wc -c < "$OUT_DIR/object.bin" | tr -d ' ')"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_V1"
echo "base=$BASE"
echo "sha256=$SHA256"
echo "fetched_sha256=$FETCHED_SHA256"
echo "bytes=$BYTES"
echo "proof_url=$PROOF_URL"
echo "object_url=$OBJECT_URL"
echo "out=$OUT_DIR"
echo "receipt_valid_for_current_object=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_V1_GREEN"
