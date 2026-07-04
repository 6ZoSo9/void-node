#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_NODE_BASE:-${1:-http://127.0.0.1:4100}}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch() {
  local path="$1"
  local out="$2"
  curl -fsS "$BASE$path" -o "$TMP/$out"
  echo "ok $path"
}

expect_text() {
  local file="$1"
  local needle="$2"
  if ! grep -Fq "$needle" "$TMP/$file"; then
    echo "missing marker '$needle' in $file" >&2
    exit 1
  fi
}

fetch "/.well-known/void-public-node.json" "well-known.json"
expect_text "well-known.json" "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1"
expect_text "well-known.json" "VOID_WELL_KNOWN_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_LINK_V1"
expect_text "well-known.json" "/public-node/runtime"
expect_text "well-known.json" "/public-node/runtime/local-multibox-status-v1.json"

fetch "/public-node/index.json" "public-node-index.json"
expect_text "public-node-index.json" "VOID_LOCAL_MULTIBOX_RUNTIME_ROOT_INDEX_LINK_V1"
expect_text "public-node-index.json" "/public-node/runtime"

fetch "/public-node/runtime" "runtime.html"
expect_text "runtime.html" "VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1"

fetch "/public-node/runtime/index.json" "runtime-index.json"
expect_text "runtime-index.json" "VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_INDEX_V1"
expect_text "runtime-index.json" "/public-node/runtime/local-multibox-status-v1.json"

fetch "/public-node/runtime/local-multibox-status-v1.json" "runtime-status.json"
expect_text "runtime-status.json" "VOID_LOCAL_MULTIBOX_RUNTIME_STATUS_V1"
expect_text "runtime-status.json" "Precision"
expect_text "runtime-status.json" "Alienware"
expect_text "runtime-status.json" "Nimo/N153B"

fetch "/__void/diag/local-multibox-runtime-route-v1.json" "runtime-diag.json"
expect_text "runtime-diag.json" "VOID_LOCAL_MULTIBOX_RUNTIME_ROUTE_V1"
expect_text "runtime-diag.json" "/public-node/index.json"
expect_text "runtime-diag.json" "/public-node/runtime"

python3 - "$TMP/well-known.json" "$TMP/public-node-index.json" "$TMP/runtime-index.json" "$TMP/runtime-status.json" <<'PY'
import json
import sys

well_known, root_index, runtime_index, runtime_status = [json.load(open(p)) for p in sys.argv[1:]]

checks = [
    (well_known.get("policy", {}), [
        "mutation", "money_movement", "wallet_send", "wc_to_void_swap",
        "buy_void_fulfillment", "validator_mutation", "validator_admission",
        "public_wc_self_serve_earning", "public_internet_mesh_claim"
    ]),
    (root_index["local_multibox_runtime_discovery_index_link"]["boundary"], [
        "mutation_route_enabled", "wallet_send_enabled", "money_movement_enabled",
        "buy_void_fulfillment_enabled", "wc_to_void_swap_enabled", "validator_mutation_enabled",
        "validator_admission_enabled", "public_wc_self_serve_earning_enabled",
        "public_internet_mesh_claim"
    ]),
    (runtime_index["boundary"], [
        "mutation_route_enabled", "wallet_send_enabled", "money_movement_enabled",
        "buy_void_fulfillment_enabled", "wc_to_void_swap_enabled", "validator_mutation_enabled",
        "validator_admission_enabled", "public_wc_self_serve_earning_enabled",
        "public_internet_mesh_claim"
    ]),
    (runtime_status["boundary"], [
        "mutation_route_enabled", "wallet_send_enabled", "money_movement_enabled",
        "buy_void_fulfillment_enabled", "wc_to_void_swap_enabled", "validator_mutation_enabled",
        "validator_admission_enabled", "public_wc_self_serve_earning_enabled",
        "public_internet_mesh_claim"
    ])
]

for obj, keys in checks:
    for key in keys:
        if obj.get(key) is not False:
            raise SystemExit(f"boundary flag must be false: {key}")

print("VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN")
PY
