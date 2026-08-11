#!/usr/bin/env bash
set -euo pipefail

cd "${VOID_REPO:-$HOME/dev/void-node}"

MARKER="VOID_MAINNET0_8545_SELECTED_DURABLE_START_V1"
TOOL="tools/void-private-chain2050-startup-integration-v1.mjs"
CONFIRMATION="startPrivateChain2050FromSelectedDurableState"

hold() {
  printf '%s_HOLD reason=%s\n' "$MARKER" "$1" >&2
  exit 2
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || hold "missing_env:${name}"
}

for name in \
  VOID_MAINNET0_8545_ANVIL_EXECUTABLE \
  VOID_MAINNET0_8545_ANVIL_EXECUTABLE_SHA256 \
  VOID_MAINNET0_8545_BASELINE_STATE \
  VOID_MAINNET0_8545_BASELINE_STATE_SHA256 \
  VOID_MAINNET0_8545_BASELINE_STATE_FORMAT \
  VOID_MAINNET0_8545_BASELINE_BLOCK_NUMBER \
  VOID_MAINNET0_8545_BASELINE_BLOCK_HASH \
  VOID_MAINNET0_8545_CHECKPOINT_ROOT \
  VOID_MAINNET0_8545_MINIMUM_BLOCK_NUMBER; do
  require_env "$name"
done

ANVIL_EXECUTABLE="$VOID_MAINNET0_8545_ANVIL_EXECUTABLE"
ANVIL_EXECUTABLE_SHA256="$VOID_MAINNET0_8545_ANVIL_EXECUTABLE_SHA256"
BASELINE_STATE="$VOID_MAINNET0_8545_BASELINE_STATE"
BASELINE_SHA256="$VOID_MAINNET0_8545_BASELINE_STATE_SHA256"
BASELINE_FORMAT="$VOID_MAINNET0_8545_BASELINE_STATE_FORMAT"
BASELINE_BLOCK_NUMBER="$VOID_MAINNET0_8545_BASELINE_BLOCK_NUMBER"
BASELINE_BLOCK_HASH="$VOID_MAINNET0_8545_BASELINE_BLOCK_HASH"
CHECKPOINT_ROOT="$VOID_MAINNET0_8545_CHECKPOINT_ROOT"
MINIMUM_BLOCK_NUMBER="$VOID_MAINNET0_8545_MINIMUM_BLOCK_NUMBER"
DERIVED_ROOT="${VOID_MAINNET0_8545_DERIVED_ROOT:-}"
RPC_URL="${VOID_MAINNET0_8545_RPC_URL:-http://127.0.0.1:8545/}"
MODE="${VOID_MAINNET0_8545_START_MODE:-plan}"
NODE_BIN="${VOID_NODE_BIN:-node}"

[[ "$ANVIL_EXECUTABLE" = /* ]] || hold "anvil_executable_not_absolute"
[[ "$ANVIL_EXECUTABLE_SHA256" =~ ^[0-9a-f]{64}$ ]] || \
  hold "anvil_executable_sha256_invalid"
[[ "$BASELINE_STATE" = /* ]] || hold "baseline_state_not_absolute"
[[ "$CHECKPOINT_ROOT" = /* ]] || hold "checkpoint_root_not_absolute"
if [[ -n "$DERIVED_ROOT" ]]; then
  [[ "$DERIVED_ROOT" = /* ]] || hold "derived_root_not_absolute"
fi
[[ "$BASELINE_SHA256" =~ ^[0-9a-f]{64}$ ]] || hold "baseline_state_sha256_invalid"
[[ "$BASELINE_BLOCK_HASH" =~ ^0x[0-9a-f]{64}$ ]] || hold "baseline_block_hash_invalid"
[[ "$BASELINE_BLOCK_NUMBER" =~ ^[0-9]+$ ]] || hold "baseline_block_number_invalid"
[[ "$MINIMUM_BLOCK_NUMBER" =~ ^[1-9][0-9]*$ ]] || hold "minimum_block_number_invalid"
case "$BASELINE_FORMAT" in
  anvil_cli_state_json|anvil_dump_state_hex) ;;
  *) hold "baseline_state_format_invalid" ;;
esac
case "$MODE" in
  plan|apply) ;;
  *) hold "start_mode_invalid" ;;
esac

[[ -f "$TOOL" ]] || hold "startup_selector_tool_missing"
command -v "$NODE_BIN" >/dev/null 2>&1 || hold "node_runtime_missing"

args=(
  "$TOOL"
  --anvil-executable "$ANVIL_EXECUTABLE"
  --anvil-executable-sha256 "$ANVIL_EXECUTABLE_SHA256"
  --baseline-state "$BASELINE_STATE"
  --baseline-state-sha256 "$BASELINE_SHA256"
  --baseline-state-format "$BASELINE_FORMAT"
  --baseline-block-number "$BASELINE_BLOCK_NUMBER"
  --baseline-block-hash "$BASELINE_BLOCK_HASH"
  --checkpoint-root "$CHECKPOINT_ROOT"
  --minimum-block-number "$MINIMUM_BLOCK_NUMBER"
  --rpc-url "$RPC_URL"
)

if [[ -n "$DERIVED_ROOT" ]]; then
  args+=(--derived-root "$DERIVED_ROOT")
fi

if [[ "$MODE" == "apply" ]]; then
  [[ "${VOID_MAINNET0_8545_CONFIRMATION:-}" == "$CONFIRMATION" ]] || \
    hold "selector_start_confirmation_required"
  args+=(--apply --confirmation "$CONFIRMATION")
fi

exec "$NODE_BIN" "${args[@]}"
