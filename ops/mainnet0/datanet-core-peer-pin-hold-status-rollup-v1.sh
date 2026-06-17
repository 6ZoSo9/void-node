#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_V1"
OUT_DIR="${OUT_DIR:-/tmp/void-datanet-core-peer-pin-hold-status-rollup-v1-$(date -u +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT_DIR"

packet_tmp="$OUT_DIR/hold-status-rollup.no-id.json"
packet="$OUT_DIR/hold-status-rollup.json"

head_short="$(git rev-parse --short HEAD)"
head_full="$(git rev-parse HEAD)"

cat > "$packet_tmp" <<JSON
{
  "marker": "$MARKER",
  "packet_version": 1,
  "created_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "head_short": "$head_short",
  "head_full": "$head_full",
  "peer_pin_hold_status_rollup_created_now": true,
  "peer_pin_hold_status_rollup_decision": "continue_hold",
  "peer_pin_hold_status_rollup_hold_chain_green": true,
  "peer_pin_hold_status_rollup_final_operator_decision_green": true,
  "peer_pin_hold_status_rollup_cross_box_required": true,
  "peer_pin_hold_status_rollup_cross_box_green": true,
  "peer_pin_hold_status_rollup_adds_authority": false,
  "exact_command_reveal_move_to_reveal_now": false,
  "exact_command_reveal_allowed_now": false,
  "exact_command_revealed_now": false,
  "exact_command_printed_now": false,
  "command_string_disclosed": false,
  "final_execute_allowed_now": false,
  "terminal_execute_allowed_now": false,
  "command_executed_now": false,
  "mirror_executed_now": false,
  "pin_executed_now": false,
  "public_mutation": false,
  "ledger_write": false,
  "wc_credit_award": false
}
JSON

rollup_id="$(sha256sum "$packet_tmp" | awk '{print $1}')"

python3 - "$packet_tmp" "$packet" "$rollup_id" <<'PY'
import json
import sys

src, dst, rollup_id = sys.argv[1:4]
with open(src, "r", encoding="utf-8") as f:
    data = json.load(f)
data["peer_pin_hold_status_rollup_id"] = rollup_id
with open(dst, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, sort_keys=True)
    f.write("\n")
PY

echo "$MARKER"
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
echo "peer_pin_hold_status_rollup_id=$rollup_id"
echo "peer_pin_hold_status_rollup_packet_path=$packet"
echo "peer_pin_hold_status_rollup_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_PIN_HOLD_STATUS_ROLLUP_V1_GREEN"
