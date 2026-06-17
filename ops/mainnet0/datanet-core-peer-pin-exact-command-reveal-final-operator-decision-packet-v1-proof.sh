#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_FINAL_OPERATOR_DECISION_PACKET_PROOF_V1"
OUT="/tmp/void-exact-command-reveal-final-operator-decision-light-proof-$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== VOID DataNet Core Peer Pin Exact Command Reveal Final Operator Decision Packet v1 Lightweight Proof ==="
echo "marker=$MARKER"
echo "head=$(git rev-parse --short HEAD)"
echo "out=$OUT"

echo
echo "=== create public-safe upstream hold fixture ==="

cat > "$OUT/published-hold.json" <<'JSON'
{
  "marker": "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_HOLD_PACKET_V1",
  "exact_command_reveal_hold_id": "fixture-published-hold-id",
  "exact_command_reveal_hold_approved_now": true,
  "exact_command_reveal_hold_readiness_created_now": true,
  "exact_command_reveal_hold_required": true,
  "exact_command_reveal_hold_held_now": true,
  "exact_command_reveal_hold_exact_command_revealed_now": false,
  "exact_command_reveal_hold_exact_command_printed_now": false,
  "exact_command_reveal_hold_command_string_disclosed": false,
  "exact_command_reveal_hold_final_execute_allowed_now": false,
  "exact_command_reveal_hold_terminal_execute_allowed_now": false,
  "exact_command_reveal_hold_command_executed_now": false,
  "exact_command_reveal_hold_mirror_executed_now": false,
  "exact_command_reveal_hold_pin_executed_now": false,
  "exact_command_reveal_hold_public_mutation": false,
  "exact_command_reveal_hold_ledger_write": false,
  "exact_command_reveal_hold_wc_credit_award": false
}
JSON

cat > "$OUT/mirrored-hold.json" <<'JSON'
{
  "marker": "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_HOLD_PACKET_V1",
  "exact_command_reveal_hold_id": "fixture-mirrored-hold-id",
  "exact_command_reveal_hold_approved_now": true,
  "exact_command_reveal_hold_readiness_created_now": true,
  "exact_command_reveal_hold_required": true,
  "exact_command_reveal_hold_held_now": true,
  "exact_command_reveal_hold_exact_command_revealed_now": false,
  "exact_command_reveal_hold_exact_command_printed_now": false,
  "exact_command_reveal_hold_command_string_disclosed": false,
  "exact_command_reveal_hold_final_execute_allowed_now": false,
  "exact_command_reveal_hold_terminal_execute_allowed_now": false,
  "exact_command_reveal_hold_command_executed_now": false,
  "exact_command_reveal_hold_mirror_executed_now": false,
  "exact_command_reveal_hold_pin_executed_now": false,
  "exact_command_reveal_hold_public_mutation": false,
  "exact_command_reveal_hold_ledger_write": false,
  "exact_command_reveal_hold_wc_credit_award": false
}
JSON

echo "upstream_hold_fixture_public_safe=true"
echo "upstream_hold_fixture_no_command_string=true"

echo
echo "=== create published final operator decision packet ==="
published_log="$OUT/published-final-decision.log"
UPSTREAM_HOLD_PACKET_PATH="$OUT/published-hold.json" \
OUT_DIR="$OUT/published-final-decision" \
SELECTED_TYPE="operator_published" \
DECISION="continue_hold" \
bash ops/mainnet0/datanet-core-peer-pin-exact-command-reveal-final-operator-decision-packet-v1.sh > "$published_log" 2>&1

echo
echo "=== create mirrored final operator decision packet ==="
mirrored_log="$OUT/mirrored-final-decision.log"
UPSTREAM_HOLD_PACKET_PATH="$OUT/mirrored-hold.json" \
OUT_DIR="$OUT/mirrored-final-decision" \
SELECTED_TYPE="mirrored" \
DECISION="continue_hold" \
bash ops/mainnet0/datanet-core-peer-pin-exact-command-reveal-final-operator-decision-packet-v1.sh > "$mirrored_log" 2>&1

echo
echo "=== assertions ==="
for log in "$published_log" "$mirrored_log"; do
  grep -q 'VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_FINAL_OPERATOR_DECISION_PACKET_V1_GREEN' "$log"
  grep -q 'exact_command_reveal_final_operator_decision_recorded_now=true' "$log"
  grep -q 'exact_command_reveal_final_operator_decision=continue_hold' "$log"
  grep -q 'exact_command_reveal_continue_hold_now=true' "$log"
  grep -q 'exact_command_reveal_move_to_reveal_now=false' "$log"
  grep -q 'exact_command_reveal_allowed_now=false' "$log"
  grep -q 'exact_command_revealed_now=false' "$log"
  grep -q 'exact_command_printed_now=false' "$log"
  grep -q 'command_string_disclosed=false' "$log"
  grep -q 'final_execute_allowed_now=false' "$log"
  grep -q 'terminal_execute_allowed_now=false' "$log"
  grep -q 'command_executed_now=false' "$log"
  grep -q 'mirror_executed_now=false' "$log"
  grep -q 'pin_executed_now=false' "$log"
  grep -q 'public_mutation=false' "$log"
  grep -q 'ledger_write=false' "$log"
  grep -q 'wc_credit_award=false' "$log"
done

grep -q 'exact_command_reveal_final_operator_decision_selected_type=operator_published' "$published_log"
grep -q 'exact_command_reveal_final_operator_decision_selected_type=mirrored' "$mirrored_log"

echo "peer_pin_exact_command_reveal_final_operator_decision_published_packet_green=true"
echo "peer_pin_exact_command_reveal_final_operator_decision_mirrored_packet_green=true"
echo "exact_command_reveal_final_operator_decision_recorded_now=true"
echo "exact_command_reveal_final_operator_decision=continue_hold"
echo "exact_command_reveal_continue_hold_now=true"
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
echo "proof_scope=lightweight_non_recursive_fixture_after_cross_box_hold_green"
echo "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_FINAL_OPERATOR_DECISION_PACKET_PROOF_V1_GREEN"
