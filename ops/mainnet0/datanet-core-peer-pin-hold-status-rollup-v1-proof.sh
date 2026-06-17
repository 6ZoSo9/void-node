#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_PROOF_V1"
OUT="/tmp/void-datanet-core-peer-pin-hold-status-rollup-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Hold Status Rollup v1 Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"
echo "out=$OUT"

echo
echo "=== build ==="
npm run build

echo
echo "=== run hold status rollup tool ==="
rollup_log="$OUT/hold-status-rollup.log"
OUT_DIR="$OUT/rollup" \
bash ops/mainnet0/datanet-core-peer-pin-hold-status-rollup-v1.sh > "$rollup_log" 2>&1

packet_path="$(awk -F= '/peer_pin_hold_status_rollup_packet_path=/ {print $2; exit}' "$rollup_log")"
test -n "$packet_path"
test -f "$packet_path"

echo
echo "=== assertions ==="
grep -q 'VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_V1_GREEN' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_created_now=true' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_decision=continue_hold' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_hold_chain_green=true' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_final_operator_decision_green=true' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_cross_box_required=true' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_cross_box_green=true' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_adds_authority=false' "$rollup_log"
grep -q 'exact_command_reveal_move_to_reveal_now=false' "$rollup_log"
grep -q 'exact_command_reveal_allowed_now=false' "$rollup_log"
grep -q 'exact_command_revealed_now=false' "$rollup_log"
grep -q 'exact_command_printed_now=false' "$rollup_log"
grep -q 'command_string_disclosed=false' "$rollup_log"
grep -q 'final_execute_allowed_now=false' "$rollup_log"
grep -q 'terminal_execute_allowed_now=false' "$rollup_log"
grep -q 'command_executed_now=false' "$rollup_log"
grep -q 'mirror_executed_now=false' "$rollup_log"
grep -q 'pin_executed_now=false' "$rollup_log"
grep -q 'public_mutation=false' "$rollup_log"
grep -q 'ledger_write=false' "$rollup_log"
grep -q 'wc_credit_award=false' "$rollup_log"
grep -q 'peer_pin_hold_status_rollup_private_leak_scan_green=true' "$rollup_log"

node - "$packet_path" <<'NODE'
const fs = require("fs");
const packetPath = process.argv[2];
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));

function need(key, expected) {
  if (packet[key] !== expected) {
    throw new Error(`${key} expected ${expected}, got ${packet[key]}`);
  }
}

need("marker", "VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_V1");
need("peer_pin_hold_status_rollup_created_now", true);
need("peer_pin_hold_status_rollup_decision", "continue_hold");
need("peer_pin_hold_status_rollup_hold_chain_green", true);
need("peer_pin_hold_status_rollup_final_operator_decision_green", true);
need("peer_pin_hold_status_rollup_cross_box_required", true);
need("peer_pin_hold_status_rollup_cross_box_green", true);
need("peer_pin_hold_status_rollup_adds_authority", false);
need("exact_command_reveal_move_to_reveal_now", false);
need("exact_command_reveal_allowed_now", false);
need("exact_command_revealed_now", false);
need("exact_command_printed_now", false);
need("command_string_disclosed", false);
need("final_execute_allowed_now", false);
need("terminal_execute_allowed_now", false);
need("command_executed_now", false);
need("mirror_executed_now", false);
need("pin_executed_now", false);
need("public_mutation", false);
need("ledger_write", false);
need("wc_credit_award", false);

if (!packet.peer_pin_hold_status_rollup_id || typeof packet.peer_pin_hold_status_rollup_id !== "string") {
  throw new Error("missing rollup id");
}

console.log("peer_pin_hold_status_rollup_packet_json_valid=true");
console.log("peer_pin_hold_status_rollup_packet_id_present=true");
NODE

echo
echo "peer_pin_hold_status_rollup_proof_created_now=true"
echo "peer_pin_hold_status_rollup_created_now=true"
echo "peer_pin_hold_status_rollup_decision=continue_hold"
echo "peer_pin_hold_status_rollup_hold_chain_green=true"
echo "peer_pin_hold_status_rollup_final_operator_decision_green=true"
echo "peer_pin_hold_status_rollup_cross_box_required=true"
echo "peer_pin_hold_status_rollup_cross_box_green=true"
echo "peer_pin_hold_status_rollup_adds_authority=false"
echo "exact_command_reveal_move_to_reveal_now=false"
echo "exact_command_reveal_allowed_now=false"
echo "exact_command_revealed_now=false"
echo "exact_command_printed_now=false"
echo "command_string_disclosed=false"
echo "final_execute_allowed_now=false"
echo "terminal_execute_allowed_now=false"
echo "command_executed_now=false"
echo "mirror_executed_now=false"
echo "pin_executed_now=false"
echo "public_mutation=false"
echo "ledger_write=false"
echo "wc_credit_award=false"
echo "peer_pin_hold_status_rollup_packet_path=$packet_path"
echo "VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_PROOF_V1_GREEN"
