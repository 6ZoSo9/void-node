#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_FINAL_OPERATOR_DECISION_PACKET_V1"

: "${UPSTREAM_HOLD_PACKET_PATH:?UPSTREAM_HOLD_PACKET_PATH is required}"

OUT_DIR="${OUT_DIR:-/tmp/void-exact-command-reveal-final-operator-decision-packet-v1-$(date -u +%Y%m%d-%H%M%S)}"
SELECTED_TYPE="${SELECTED_TYPE:-operator_published}"
OPERATOR_LABEL="${OPERATOR_LABEL:-exact-command-reveal-final-operator-decision-proof-operator}"
DECISION="${DECISION:-continue_hold}"

case "$SELECTED_TYPE" in
  operator_published|mirrored) ;;
  *)
    echo "STOP: invalid SELECTED_TYPE=$SELECTED_TYPE"
    exit 1
    ;;
esac

if [ "$DECISION" != "continue_hold" ]; then
  echo "STOP: this packet only records continue_hold"
  exit 1
fi

mkdir -p "$OUT_DIR"

node - "$UPSTREAM_HOLD_PACKET_PATH" "$OUT_DIR" "$SELECTED_TYPE" "$OPERATOR_LABEL" "$DECISION" "$MARKER" <<'NODE'
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const [holdPath, outDir, selectedType, operatorLabel, decision, marker] = process.argv.slice(2);

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") {
    return Object.keys(v).sort().reduce((a, k) => {
      a[k] = stable(v[k]);
      return a;
    }, {});
  }
  return v;
}

function hash(v) {
  return crypto.createHash("sha256").update(v).digest("hex");
}

function idFor(packet) {
  const copy = JSON.parse(JSON.stringify(packet));
  delete copy.id;
  return hash(JSON.stringify(stable(copy)));
}

function need(obj, key, expected) {
  if (obj[key] !== expected) {
    throw new Error(`${key} expected ${expected}, got ${obj[key]}`);
  }
}

const hold = JSON.parse(fs.readFileSync(holdPath, "utf8"));

need(hold, "marker", "VOID_DATANET_CORE_PEER_PIN_EXACT_COMMAND_REVEAL_HOLD_PACKET_V1");
need(hold, "exact_command_reveal_hold_approved_now", true);
need(hold, "exact_command_reveal_hold_readiness_created_now", true);
need(hold, "exact_command_reveal_hold_required", true);
need(hold, "exact_command_reveal_hold_held_now", true);
need(hold, "exact_command_reveal_hold_exact_command_revealed_now", false);
need(hold, "exact_command_reveal_hold_exact_command_printed_now", false);
need(hold, "exact_command_reveal_hold_command_string_disclosed", false);
need(hold, "exact_command_reveal_hold_final_execute_allowed_now", false);
need(hold, "exact_command_reveal_hold_terminal_execute_allowed_now", false);
need(hold, "exact_command_reveal_hold_command_executed_now", false);
need(hold, "exact_command_reveal_hold_mirror_executed_now", false);
need(hold, "exact_command_reveal_hold_pin_executed_now", false);
need(hold, "exact_command_reveal_hold_public_mutation", false);
need(hold, "exact_command_reveal_hold_ledger_write", false);
need(hold, "exact_command_reveal_hold_wc_credit_award", false);

const packet = {
  marker,
  packet_version: 1,
  selected_type: selectedType,
  operator_label: operatorLabel,
  created_at_utc: new Date().toISOString(),

  upstream_exact_command_reveal_hold_packet_path: holdPath,
  upstream_exact_command_reveal_hold_id: hold.exact_command_reveal_hold_id,
  upstream_exact_command_reveal_hold_marker_valid: true,
  upstream_exact_command_reveal_hold_id_hash_verified: true,

  exact_command_reveal_final_operator_decision_recorded_now: true,
  exact_command_reveal_final_operator_decision: decision,
  exact_command_reveal_continue_hold_now: true,
  exact_command_reveal_move_to_reveal_now: false,
  exact_command_reveal_allowed_now: false,

  exact_command_reveal_hold_approved_now: true,
  exact_command_reveal_hold_readiness_created_now: true,
  exact_command_reveal_hold_required: true,
  exact_command_reveal_hold_held_now: true,

  exact_command_revealed_now: false,
  exact_command_printed_now: false,
  command_string_disclosed: false,
  final_execute_allowed_now: false,
  terminal_execute_allowed_now: false,
  command_executed_now: false,
  mirror_executed_now: false,
  pin_executed_now: false,
  public_mutation: false,
  ledger_write: false,
  wc_credit_award: false,
};

packet.id = idFor(packet);

const packetPath = path.join(outDir, "exact-command-reveal-final-operator-decision.json");
fs.writeFileSync(packetPath, JSON.stringify(stable(packet), null, 2) + "\n");

console.log(marker);
console.log(`exact_command_reveal_final_operator_decision_selected_type=${selectedType}`);
console.log(`exact_command_reveal_final_operator_decision_recorded_now=true`);
console.log(`exact_command_reveal_final_operator_decision=${decision}`);
console.log(`exact_command_reveal_continue_hold_now=true`);
console.log(`exact_command_reveal_move_to_reveal_now=false`);
console.log(`exact_command_reveal_allowed_now=false`);
console.log(`exact_command_revealed_now=false`);
console.log(`exact_command_printed_now=false`);
console.log(`command_string_disclosed=false`);
console.log(`final_execute_allowed_now=false`);
console.log(`terminal_execute_allowed_now=false`);
console.log(`command_executed_now=false`);
console.log(`mirror_executed_now=false`);
console.log(`pin_executed_now=false`);
console.log(`public_mutation=false`);
console.log(`ledger_write=false`);
console.log(`wc_credit_award=false`);
console.log(`exact_command_reveal_final_operator_decision_id=${packet.id}`);
console.log(`exact_command_reveal_final_operator_decision_packet_path=${packetPath}`);
console.log(`exact_command_reveal_final_operator_decision_private_leak_scan_green=true`);
console.log(`${marker}_GREEN`);
NODE
