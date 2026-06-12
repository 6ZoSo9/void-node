#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
INTAKE_DIR="$DATA_DIR/public-node/local-data-drop-demo002-tester-receipts"
LATEST="$INTAKE_DIR/latest.json"
ARCHIVE_DIR="$INTAKE_DIR/archive"

echo "=== VOID Public Node Demo 002 Receipt Intake Status v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1"
echo "data_dir=$DATA_DIR"
echo "latest=$LATEST"
echo "archive_dir=$ARCHIVE_DIR"

if [ ! -f "$LATEST" ]; then
  echo "status=no_demo002_receipt_intake"
  echo "latest_present=false"
  echo "archive_count=0"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_EMPTY"
  exit 0
fi

ARCHIVE_COUNT="$(find "$ARCHIVE_DIR" -type f -name 'demo002-tester-smoke-receipt-*.json' 2>/dev/null | wc -l | tr -d ' ')"

node - "$LATEST" "$ARCHIVE_COUNT" <<'NODE'
const fs = require("fs");
const latest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const archiveCount = process.argv[3];

function line(k, v) {
  console.log(`${k}=${v}`);
}

line("status", "demo002_receipt_intake_present");
line("latest_present", "true");
line("archive_count", archiveCount);
line("intake_marker", latest.marker);
line("source_receipt_marker", latest.source_receipt_marker);
line("source_smoke_marker", latest.source_smoke_marker);
line("public_node_base", latest.public_node_base);
line("object_id", latest.object_id);
line("sha256_expected", latest.sha256_expected);
line("object_by_id_sha256", latest.object_by_id_sha256);
line("object_by_sha256_sha256", latest.object_by_sha256_sha256);
line("objects_match", latest.objects_match);
line("proof_json_verified", latest.proof_json_verified);
line("offline_verified", latest.offline_verified);
line("network_fetch_during_import", latest.network_fetch_during_import);
line("trusted_as_network_truth", latest.trusted_as_network_truth);
line("source_receipt_sha256", latest.source_receipt_sha256);
line("imported_at_utc", latest.imported_at_utc);
line("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_RECEIPT_INTAKE_STATUS_V1_GREEN", "true");
NODE
