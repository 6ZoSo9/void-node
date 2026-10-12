#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 /path/to/demo002-evidence-pack.tar.gz" >&2
  exit 2
fi

TARBALL="$1"
SHA_EXPECTED="264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo002-verify-evidence-pack-$STAMP}"
EXTRACT="$OUT/extract"
PACK_DIR="$EXTRACT/demo002-evidence-pack"

echo "=== VOID Public Node Demo 002 Verify Evidence Pack v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_V1"
echo "tarball=$TARBALL"
echo "out=$OUT"
echo "network_fetch=false"
echo "offline_verify=true"

test -f "$TARBALL"
mkdir -p "$EXTRACT"

tar -tzf "$TARBALL" >/dev/null
tar -xzf "$TARBALL" -C "$EXTRACT"

test -d "$PACK_DIR"
test -f "$PACK_DIR/manifest.json"
test -f "$PACK_DIR/sha256sums.txt"
test -f "$PACK_DIR/demo002-tester-smoke-receipt.json"
test -f "$PACK_DIR/runtime/latest.json"
test -f "$PACK_DIR/logs/roundtrip.log"
test -f "$PACK_DIR/logs/status.log"

(
  cd "$PACK_DIR"
  sha256sum -c sha256sums.txt
) | tee "$OUT/sha256-check.log"

node - "$PACK_DIR" "$SHA_EXPECTED" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const packDir = process.argv[2];
const shaExpected = process.argv[3];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(packDir, rel), "utf8"));
}

function sha256File(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(packDir, rel))).digest("hex");
}

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

const manifest = readJson("manifest.json");
const receipt = readJson("demo002-tester-smoke-receipt.json");
const latest = readJson("runtime/latest.json");

ok(manifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_MANIFEST_V1", "manifest marker");
ok(manifest.object_id === "live-import-demo-002.txt", "manifest object id");
ok(manifest.sha256_expected === shaExpected, "manifest sha expected");
ok(manifest.receipt_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1", "manifest receipt marker");
ok(manifest.intake_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1", "manifest intake marker");
ok(manifest.offline_verified === true, "manifest offline verified");
ok(manifest.network_fetch_during_import === false, "manifest no import fetch");
ok(manifest.trusted_as_network_truth === false, "manifest not network truth");

ok(receipt.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1", "receipt marker");
ok(receipt.object_id === "live-import-demo-002.txt", "receipt object id");
ok(receipt.sha256_expected === shaExpected, "receipt sha expected");
ok(receipt.objects_match === true, "receipt objects match");
ok(receipt.proof_json_verified === true, "receipt proof json verified");
ok(receipt.public_routes_only === true, "receipt public routes only");
ok(receipt.read_only === true, "receipt read only");
ok(receipt.mutation === false, "receipt no mutation");
ok(receipt.money_movement === false, "receipt no money movement");
ok(receipt.wallet_send === false, "receipt no wallet send");
ok(receipt.validator_mutation === false, "receipt no validator mutation");

ok(latest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1", "latest intake marker");
ok(latest.object_id === "live-import-demo-002.txt", "latest object id");
ok(latest.sha256_expected === shaExpected, "latest sha expected");
ok(latest.object_by_id_sha256 === shaExpected, "latest by-id sha");
ok(latest.object_by_sha256_sha256 === shaExpected, "latest by-sha sha");
ok(latest.objects_match === true, "latest objects match");
ok(latest.proof_json_verified === true, "latest proof json verified");
ok(latest.offline_verified === true, "latest offline verified");
ok(latest.network_fetch_during_import === false, "latest no import fetch");
ok(latest.trusted_as_network_truth === false, "latest not network truth");

ok(manifest.receipt_file_sha256 === sha256File("demo002-tester-smoke-receipt.json"), "receipt file hash matches manifest");
ok(manifest.latest_file_sha256 === sha256File("runtime/latest.json"), "latest file hash matches manifest");

console.log("[ok] evidence pack offline verified");
NODE

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN" "$PACK_DIR/logs/roundtrip.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$PACK_DIR/logs/status.log"
grep -q "offline_verified=true" "$PACK_DIR/logs/roundtrip.log"
grep -q "network_fetch_during_import=false" "$PACK_DIR/logs/roundtrip.log"
grep -q "trusted_as_network_truth=false" "$PACK_DIR/logs/roundtrip.log"

echo "pack_dir=$PACK_DIR"
echo "manifest_verified=true"
echo "checksums_verified=true"
echo "receipt_verified=true"
echo "latest_verified=true"
echo "logs_verified=true"
echo "offline_verified=true"
echo "network_fetch=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_EVIDENCE_PACK_V1_GREEN"
