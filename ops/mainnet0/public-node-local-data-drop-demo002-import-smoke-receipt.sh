#!/usr/bin/env bash
set -euo pipefail

RECEIPT_PATH="${1:-}"
DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh"
INTAKE_DIR="$DATA_DIR/public-node/local-data-drop-demo002-tester-receipts"
ARCHIVE_DIR="$INTAKE_DIR/archive"
LATEST_PATH="$INTAKE_DIR/latest.json"

if [ -z "$RECEIPT_PATH" ]; then
  echo "usage: DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-local-data-drop-demo002-import-smoke-receipt.sh /path/to/demo002-tester-smoke-receipt.json" >&2
  exit 2
fi

if [ ! -f "$RECEIPT_PATH" ]; then
  echo "[fail] receipt file not found: $RECEIPT_PATH" >&2
  exit 2
fi

test -x "$VERIFY"
"$VERIFY" "$RECEIPT_PATH" >/tmp/demo002-receipt-offline-verify.log

mkdir -p "$INTAKE_DIR" "$ARCHIVE_DIR"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
TMP="$INTAKE_DIR/.latest.$STAMP.tmp"
ARCHIVE_PATH="$ARCHIVE_DIR/demo002-tester-smoke-receipt-$STAMP.json"

node - "$RECEIPT_PATH" "$TMP" "$STAMP" <<'NODE'
const fs = require("fs");
const crypto = require("crypto");

const src = process.argv[2];
const dst = process.argv[3];
const stamp = process.argv[4];

function fail(msg) {
  console.error("[fail]", msg);
  process.exit(1);
}

let raw;
let receipt;
try {
  raw = fs.readFileSync(src, "utf8");
  receipt = JSON.parse(raw);
} catch {
  fail("receipt is not valid JSON");
}

const sourceSha256 = crypto.createHash("sha256").update(raw).digest("hex");

const normalized = {
  marker: "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1",
  source_receipt_marker: receipt.marker,
  source_smoke_marker: receipt.smoke_marker,
  imported_at_utc: stamp,
  imported_by_operator: true,
  trusted_as_network_truth: false,
  offline_verified: true,
  network_fetch_during_import: false,
  public_node_base: receipt.public_node_base,
  object_id: receipt.object_id,
  sha256_expected: receipt.sha256_expected,
  object_by_id_sha256: receipt.object_by_id_sha256,
  object_by_sha256_sha256: receipt.object_by_sha256_sha256,
  object_bytes: receipt.object_bytes,
  proof_json_bytes: receipt.proof_json_bytes,
  object_url: receipt.object_url,
  by_sha256_url: receipt.by_sha256_url,
  proof_url: receipt.proof_url,
  objects_match: receipt.objects_match,
  proof_json_verified: receipt.proof_json_verified,
  public_routes_only: receipt.public_routes_only,
  read_only: receipt.read_only,
  mutation: receipt.mutation,
  money_movement: receipt.money_movement,
  wallet_send: receipt.wallet_send,
  validator_mutation: receipt.validator_mutation,
  source_receipt_sha256: sourceSha256,
  original_receipt: receipt
};

fs.writeFileSync(dst, JSON.stringify(normalized, null, 2) + "\n");
NODE

cp "$TMP" "$ARCHIVE_PATH"
mv "$TMP" "$LATEST_PATH"

echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1"
echo "receipt=$RECEIPT_PATH"
echo "latest=$LATEST_PATH"
echo "archive=$ARCHIVE_PATH"
echo "offline_verified=true"
echo "network_fetch_during_import=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_SMOKE_RECEIPT_INTAKE_V1_IMPORTED"
