#!/usr/bin/env bash
set -euo pipefail

HOST="${VOID_P2P_LIVE_ACTIVATION_LEASE_STATUS_HOST:-127.0.0.1}"
PORT="${VOID_P2P_LIVE_ACTIVATION_LEASE_STATUS_PORT:-4192}"
case "$HOST" in
  127.*) URL="http://${HOST}:${PORT}/__void/p2p-live-activation-lease-wall-v1/status" ;;
  ::1) URL="http://[::1]:${PORT}/__void/p2p-live-activation-lease-wall-v1/status" ;;
  *) echo "HOLD: live activation lease status host is not loopback: $HOST" >&2; exit 1 ;;
esac

BODY="$(curl --fail --silent --show-error --max-time 3 "$URL")"
printf '%s' "$BODY" | node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const status = JSON.parse(raw);
  if (status.marker !== "VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_V1") throw new Error("marker mismatch");
  if (status.state !== "running") throw new Error(`state is not running: ${status.state}`);
  if (status.one_shot_permit_consumed !== true) throw new Error("permit was not consumed");
  if (typeof status.active_generation !== "string" || status.active_generation.length < 1) throw new Error("generation missing");
  if (typeof status.child_id !== "string" || status.child_id.length < 1) throw new Error("child missing");
  if (status.automatic_child_restart !== false) throw new Error("automatic restart boundary lost");
  if (status.policy_rotation_under_existing_permit !== false) throw new Error("rotation boundary lost");
  if (status.permissionless_admission_forced_off !== true) throw new Error("permissionless boundary lost");
  if (status.runtime_private_policy_or_activation_key_required !== false) throw new Error("private authority-key boundary lost");
  if (status.ledger_authority !== false || status.validator_authority !== false) throw new Error("state authority boundary lost");
  if (status.wallet_or_transaction_signer_authority !== false || status.money_movement_authority !== false) throw new Error("money authority boundary lost");
  console.log("VOID_P2P_LIVE_ACTIVATION_LEASE_WALL_HEALTH_V1_GREEN");
});
'
