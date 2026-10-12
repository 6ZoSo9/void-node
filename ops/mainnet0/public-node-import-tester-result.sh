#!/usr/bin/env bash
set -euo pipefail

RECEIPT_PATH="${1:-}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
INTAKE_DIR="$DATA_DIR/public-node/tester-result-intake"
ARCHIVE_DIR="$INTAKE_DIR/archive"
LATEST_PATH="$INTAKE_DIR/latest.json"

if [ -z "$RECEIPT_PATH" ]; then
  echo "usage: DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-import-tester-result.sh /path/to/tester-receipt.json" >&2
  exit 2
fi

if [ ! -f "$RECEIPT_PATH" ]; then
  echo "[fail] receipt file not found: $RECEIPT_PATH" >&2
  exit 2
fi

mkdir -p "$INTAKE_DIR" "$ARCHIVE_DIR"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
TMP="$INTAKE_DIR/.latest.$STAMP.tmp"
ARCHIVE_PATH="$ARCHIVE_DIR/tester-result-$STAMP.json"

node - "$RECEIPT_PATH" "$TMP" "$STAMP" <<'NODE'
const fs = require("fs");

const src = process.argv[2];
const dst = process.argv[3];
const stamp = process.argv[4];

function fail(msg) {
  console.error("[fail]", msg);
  process.exit(1);
}

let receipt;
try {
  receipt = JSON.parse(fs.readFileSync(src, "utf8"));
} catch (err) {
  fail("receipt is not valid JSON");
}

if (receipt.marker !== "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1") {
  fail("missing receipt marker VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1");
}

const observed = String(receipt.observed_green_marker || receipt.expected_green_marker || "").trim();
if (observed !== "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN") {
  fail("missing observed green marker VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN");
}

const result = String(receipt.result || "").trim().toLowerCase();
if (result && result !== "green") {
  fail("receipt result must be green when present");
}

const normalized = {
  marker: "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1",
  intake_marker: "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1",
  tester_label: String(receipt.tester_label || "external-tester").slice(0, 120),
  tested_base_url: String(receipt.tested_base_url || receipt.public_node_base || "").slice(0, 500),
  observed_green_marker: observed,
  result: "green",
  imported_by_operator: true,
  trusted_as_network_truth: false,
  imported_at_utc: stamp,
  source_receipt_sha256_pending: false,
  original_receipt: receipt
};

fs.writeFileSync(dst, JSON.stringify(normalized, null, 2) + "\n");
NODE

cp "$TMP" "$ARCHIVE_PATH"
mv "$TMP" "$LATEST_PATH"

echo "marker=VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1"
echo "receipt=$RECEIPT_PATH"
echo "latest=$LATEST_PATH"
echo "archive=$ARCHIVE_PATH"
echo "expected_green_marker=VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_TESTER_RESULT_IMPORT_HELPER_V1_IMPORTED"
