#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-}"
OUT_DIR="${2:-}"

if [ -z "$BASE" ]; then
  echo "usage: ops/mainnet0/public-node-local-data-drop-verify-manifest.sh <base-url> [out-dir]" >&2
  exit 2
fi

BASE="${BASE%/}"

if [ -z "$OUT_DIR" ]; then
  OUT_DIR="/tmp/void-local-data-drop-manifest-verify-$(date -u +%Y%m%d-%H%M%S)"
fi

mkdir -p "$OUT_DIR/objects" "$OUT_DIR/proofs"

MANIFEST_URL="$BASE/public-node/local-data-drop/manifest.json"
curl --max-time 20 -fsS "$MANIFEST_URL" > "$OUT_DIR/manifest.json"

node - "$OUT_DIR/manifest.json" "$MANIFEST_URL" <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const manifestUrl = process.argv[3];

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

ok(manifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_V1", "manifest marker");
ok(manifest.manifest_root_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1", "manifest root marker");
ok(/^[a-f0-9]{64}$/.test(manifest.manifest_root_sha256), "manifest root sha shape");

const recomputed = crypto.createHash("sha256").update(JSON.stringify(manifest.root_payload)).digest("hex");
ok(recomputed === manifest.manifest_root_sha256, "manifest root recomputes");
ok(Array.isArray(manifest.objects), "manifest objects array");
ok(manifest.object_count === manifest.objects.length, "object count matches");
ok(manifest.policy.public_upload === false, "no public upload");
ok(manifest.policy.operator_local_import_only === true, "operator local only");
ok(manifest.policy.public_read_only === true, "public read only");
ok(manifest.policy.trusted_as_network_truth === false, "not network truth");

for (const o of manifest.objects) {
  ok(/^[a-f0-9]{64}$/.test(o.sha256), "object sha shape");
  ok(o.receipt_valid_for_current_object === true, "object receipt valid");
  ok(o.content_address_href.endsWith("/public-node/local-data-drop/by-sha256/" + o.sha256), "object content href");
  ok(o.proof_href.endsWith("/public-node/local-data-drop/proof/" + o.sha256 + ".json"), "object proof href");
}

console.log("[ok] manifest root verified");
NODE

OBJECT_COUNT="$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(m.objects.length)' "$OUT_DIR/manifest.json")"

node - "$OUT_DIR/manifest.json" > "$OUT_DIR/object-shas.txt" <<'NODE'
const fs = require("fs");
const m = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const o of m.objects) console.log(o.sha256);
NODE

while IFS= read -r SHA256; do
  [ -n "$SHA256" ] || continue

  ops/mainnet0/public-node-local-data-drop-verify-object.sh "$BASE" "$SHA256" "$OUT_DIR/objects/$SHA256" > "$OUT_DIR/objects/$SHA256.verify.log"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_V1_GREEN" "$OUT_DIR/objects/$SHA256.verify.log"

  curl --max-time 20 -fsS "$BASE/public-node/local-data-drop/proof/$SHA256.json" > "$OUT_DIR/proofs/$SHA256.json"
  grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_V1" "$OUT_DIR/proofs/$SHA256.json"
done < "$OUT_DIR/object-shas.txt"

ROOT_SHA="$(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(m.manifest_root_sha256)' "$OUT_DIR/manifest.json")"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_V1"
echo "base=$BASE"
echo "manifest_url=$MANIFEST_URL"
echo "manifest_root_sha256=$ROOT_SHA"
echo "object_count=$OBJECT_COUNT"
echo "out=$OUT_DIR"
echo "manifest_root_verified=true"
echo "object_verifier_chain_green=true"
echo "public_read_only=true"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_V1_GREEN"
