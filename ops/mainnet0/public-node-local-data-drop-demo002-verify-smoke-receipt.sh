#!/usr/bin/env bash
set -euo pipefail

RECEIPT_PATH="${1:-}"

if [ -z "$RECEIPT_PATH" ]; then
  echo "usage: ops/mainnet0/public-node-local-data-drop-demo002-verify-smoke-receipt.sh /path/to/demo002-tester-smoke-receipt.json" >&2
  exit 2
fi

if [ ! -f "$RECEIPT_PATH" ]; then
  echo "[fail] receipt file not found: $RECEIPT_PATH" >&2
  exit 2
fi

node - "$RECEIPT_PATH" <<'NODE'
const fs = require("fs");
const path = process.argv[2];

const EXPECTED_SHA = "264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871";
const EXPECTED_OBJECT_ID = "live-import-demo-002.txt";

function fail(msg) {
  console.error("[fail]", msg);
  process.exit(1);
}

function ok(x, msg) {
  if (!x) fail(msg);
}

let r;
try {
  r = JSON.parse(fs.readFileSync(path, "utf8"));
} catch {
  fail("receipt is not valid JSON");
}

ok(r.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_RECEIPT_V1", "bad receipt marker");
ok(r.smoke_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1", "bad smoke marker");
ok(r.object_id === EXPECTED_OBJECT_ID, "bad object id");
ok(r.sha256_expected === EXPECTED_SHA, "bad expected sha");
ok(r.object_by_id_sha256 === EXPECTED_SHA, "bad object-by-id sha");
ok(r.object_by_sha256_sha256 === EXPECTED_SHA, "bad object-by-sha sha");
ok(r.objects_match === true, "objects_match must be true");
ok(r.proof_json_verified === true, "proof_json_verified must be true");
ok(r.public_routes_only === true, "public_routes_only must be true");
ok(r.read_only === true, "read_only must be true");
ok(r.mutation === false, "mutation must be false");
ok(r.money_movement === false, "money_movement must be false");
ok(r.wallet_send === false, "wallet_send must be false");
ok(r.validator_mutation === false, "validator_mutation must be false");
ok(Number.isFinite(Number(r.object_bytes)) && Number(r.object_bytes) > 0, "object_bytes must be positive");
ok(Number.isFinite(Number(r.proof_json_bytes)) && Number(r.proof_json_bytes) > 0, "proof_json_bytes must be positive");
ok(typeof r.public_node_base === "string" && r.public_node_base.length > 0, "missing public_node_base");
ok(typeof r.object_url === "string" && r.object_url.includes(EXPECTED_OBJECT_ID), "bad object_url");
ok(typeof r.by_sha256_url === "string" && r.by_sha256_url.includes(EXPECTED_SHA), "bad by_sha256_url");
ok(typeof r.proof_url === "string" && r.proof_url.includes(EXPECTED_SHA), "bad proof_url");

console.log("marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1");
console.log(`receipt=${path}`);
console.log(`public_node_base=${r.public_node_base}`);
console.log(`object_id=${r.object_id}`);
console.log(`sha256=${r.sha256_expected}`);
console.log("offline_verify=true");
console.log("network_fetch=false");
console.log("public_routes_only=true");
console.log("read_only=true");
console.log("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_VERIFY_SMOKE_RECEIPT_V1_GREEN");
NODE
