#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-http://127.0.0.1:4100}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo002-evidence-pack-$STAMP}"
PACK_DIR="$OUT/demo002-evidence-pack"

ROUNDTRIP="ops/mainnet0/public-node-local-data-drop-demo002-evidence-roundtrip.sh"
STATUS="ops/mainnet0/public-node-local-data-drop-demo002-receipt-intake-status.sh"

mkdir -p "$PACK_DIR/logs" "$PACK_DIR/runtime"

echo "=== VOID Public Node Demo 002 Evidence Pack v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_V1"
echo "base=$BASE"
echo "data_dir=$DATA_DIR"
echo "out=$OUT"
echo "pack_dir=$PACK_DIR"

test -x "$ROUNDTRIP"
test -x "$STATUS"

PUBLIC_NODE_BASE="$BASE" \
DATA_DIR="$DATA_DIR" \
OUT="$OUT/roundtrip" \
  "$ROUNDTRIP" | tee "$PACK_DIR/logs/roundtrip.log"

RECEIPT="$(grep '^receipt=' "$PACK_DIR/logs/roundtrip.log" | tail -n 1 | cut -d= -f2-)"
LATEST="$DATA_DIR/public-node/local-data-drop-demo002-tester-receipts/latest.json"
ARCHIVE_DIR="$DATA_DIR/public-node/local-data-drop-demo002-tester-receipts/archive"

test -f "$RECEIPT"
test -f "$LATEST"

DATA_DIR="$DATA_DIR" "$STATUS" | tee "$PACK_DIR/logs/status.log"

cp "$RECEIPT" "$PACK_DIR/demo002-tester-smoke-receipt.json"
cp "$LATEST" "$PACK_DIR/runtime/latest.json"

if [ -d "$ARCHIVE_DIR" ]; then
  mkdir -p "$PACK_DIR/runtime/archive"
  find "$ARCHIVE_DIR" -maxdepth 1 -type f -name 'demo002-tester-smoke-receipt-*.json' -print0 \
    | sort -z \
    | xargs -0 -r cp -t "$PACK_DIR/runtime/archive"
fi

for name in smoke verify import status; do
  src="$OUT/roundtrip/$name.log"
  if [ -f "$src" ]; then
    cp "$src" "$PACK_DIR/logs/$name.log"
  fi
done

node - "$PACK_DIR" "$BASE" "$DATA_DIR" <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const packDir = process.argv[2];
const base = process.argv[3];
const dataDir = process.argv[4];

function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

const receiptPath = path.join(packDir, "demo002-tester-smoke-receipt.json");
const latestPath = path.join(packDir, "runtime", "latest.json");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const latest = JSON.parse(fs.readFileSync(latestPath, "utf8"));

const manifest = {
  marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_MANIFEST_V1",
  created_at_utc: new Date().toISOString(),
  public_node_base: base,
  data_dir: dataDir,
  object_id: latest.object_id,
  sha256_expected: latest.sha256_expected,
  receipt_marker: receipt.marker,
  intake_marker: latest.marker,
  source_receipt_marker: latest.source_receipt_marker,
  source_smoke_marker: latest.source_smoke_marker,
  objects_match: latest.objects_match,
  proof_json_verified: latest.proof_json_verified,
  offline_verified: latest.offline_verified,
  network_fetch_during_import: latest.network_fetch_during_import,
  trusted_as_network_truth: latest.trusted_as_network_truth,
  source_receipt_sha256: latest.source_receipt_sha256,
  receipt_file_sha256: sha256File(receiptPath),
  latest_file_sha256: sha256File(latestPath),
  files: [
    "demo002-tester-smoke-receipt.json",
    "runtime/latest.json",
    "logs/roundtrip.log",
    "logs/status.log",
    "logs/smoke.log",
    "logs/verify.log",
    "logs/import.log"
  ].filter((rel) => fs.existsSync(path.join(packDir, rel)))
};

fs.writeFileSync(path.join(packDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
NODE

CHECKSUM_TMP="$OUT/sha256sums.txt.tmp"
(
  cd "$PACK_DIR"
  find . -type f ! -name 'sha256sums.txt' -print0 | sort -z | xargs -0 sha256sum > "$CHECKSUM_TMP"
)
mv "$CHECKSUM_TMP" "$PACK_DIR/sha256sums.txt"

TARBALL="$OUT/demo002-evidence-pack.tar.gz"
tar -C "$OUT" -czf "$TARBALL" demo002-evidence-pack
TARBALL_SHA256="$(sha256sum "$TARBALL" | awk '{print $1}')"

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_ROUNDTRIP_V1_GREEN" "$PACK_DIR/logs/roundtrip.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN=true" "$PACK_DIR/logs/status.log"
grep -q "offline_verified=true" "$PACK_DIR/logs/roundtrip.log"
grep -q "network_fetch_during_import=false" "$PACK_DIR/logs/roundtrip.log"
grep -q "trusted_as_network_truth=false" "$PACK_DIR/logs/roundtrip.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_MANIFEST_V1" "$PACK_DIR/manifest.json"

echo "pack_dir=$PACK_DIR"
echo "tarball=$TARBALL"
echo "tarball_sha256=$TARBALL_SHA256"
echo "manifest=$PACK_DIR/manifest.json"
echo "sha256sums=$PACK_DIR/sha256sums.txt"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_EVIDENCE_PACK_V1_GREEN"
