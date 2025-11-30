#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

SKELETON="config/void-mainnet-bootstrap-mainnet.live.skeleton.json"
TARGET="config/void-mainnet-bootstrap-mainnet.live.json"
BACKUP_DIR="config/.backups"
mkdir -p "$BACKUP_DIR"

echo "=== [live-from-env] skeleton -> live ==="
echo "  SKELETON = $SKELETON"
echo "  TARGET   = $TARGET"

if [ ! -f "$SKELETON" ]; then
  echo "[live-from-env] FATAL: skeleton not found: $SKELETON" >&2
  exit 1
fi

# Required env vars (addresses + consensus key)
REQUIRED_VARS=(
  VOID_MAINNET_ADDR_HARDWARE_OPS_1
  VOID_MAINNET_ADDR_HARDWARE_CORE_1
  VOID_MAINNET_ADDR_HARDWARE_VALIDATOR_1

  VOID_MAINNET_ADDR_UPDATEGATE
  VOID_MAINNET_ADDR_ADMINGATE
  VOID_MAINNET_ADDR_CONFIGGATE
  VOID_MAINNET_ADDR_VALIDATORSET

  VOID_MAINNET_ADDR_VOIDTOKEN
  VOID_MAINNET_ADDR_PREMINEVAULT
  VOID_MAINNET_ADDR_TREASURY
  VOID_MAINNET_ADDR_VOIDTREASURY
  VOID_MAINNET_ADDR_OPSTREASURY
  VOID_MAINNET_ADDR_REWARDENGINE

  VOID_MAINNET_VALIDATOR0_CONSENSUS_KEY
)

echo "=== [live-from-env] checking required env vars ==="
MISSING=0
for v in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "  [MISS] $v is unset"
    MISSING=1
  else
    echo "  [OK]   $v=${!v}"
  fi
done

if [ "$MISSING" -ne 0 ]; then
  echo "[live-from-env] FATAL: one or more required env vars are missing" >&2
  exit 1
fi

# Basic sanity: addresses should start with 0x
check_hex_addr() {
  local name="$1"
  local val="$2"
  if ! [[ "$val" =~ ^0x[0-9a-fA-F]+$ ]]; then
    echo "[live-from-env] WARNING: $name does not look like 0x... hex: $val" >&2
  fi
}

check_hex_addr "VOID_MAINNET_ADDR_HARDWARE_OPS_1"        "$VOID_MAINNET_ADDR_HARDWARE_OPS_1"
check_hex_addr "VOID_MAINNET_ADDR_HARDWARE_CORE_1"       "$VOID_MAINNET_ADDR_HARDWARE_CORE_1"
check_hex_addr "VOID_MAINNET_ADDR_HARDWARE_VALIDATOR_1"  "$VOID_MAINNET_ADDR_HARDWARE_VALIDATOR_1"

check_hex_addr "VOID_MAINNET_ADDR_UPDATEGATE"            "$VOID_MAINNET_ADDR_UPDATEGATE"
check_hex_addr "VOID_MAINNET_ADDR_ADMINGATE"             "$VOID_MAINNET_ADDR_ADMINGATE"
check_hex_addr "VOID_MAINNET_ADDR_CONFIGGATE"            "$VOID_MAINNET_ADDR_CONFIGGATE"
check_hex_addr "VOID_MAINNET_ADDR_VALIDATORSET"          "$VOID_MAINNET_ADDR_VALIDATORSET"

check_hex_addr "VOID_MAINNET_ADDR_VOIDTOKEN"             "$VOID_MAINNET_ADDR_VOIDTOKEN"
check_hex_addr "VOID_MAINNET_ADDR_PREMINEVAULT"          "$VOID_MAINNET_ADDR_PREMINEVAULT"
check_hex_addr "VOID_MAINNET_ADDR_TREASURY"              "$VOID_MAINNET_ADDR_TREASURY"
check_hex_addr "VOID_MAINNET_ADDR_VOIDTREASURY"          "$VOID_MAINNET_ADDR_VOIDTREASURY"
check_hex_addr "VOID_MAINNET_ADDR_OPSTREASURY"           "$VOID_MAINNET_ADDR_OPSTREASURY"
check_hex_addr "VOID_MAINNET_ADDR_REWARDENGINE"          "$VOID_MAINNET_ADDR_REWARDENGINE"

check_hex_addr "VOID_MAINNET_VALIDATOR0_CONSENSUS_KEY"   "$VOID_MAINNET_VALIDATOR0_CONSENSUS_KEY"

# Backup existing live.json if present
if [ -f "$TARGET" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  BAK="$BACKUP_DIR/void-mainnet-bootstrap-mainnet.live.json.$TS.bak"
  cp -f "$TARGET" "$BAK"
  echo "=== [live-from-env] backed up existing TARGET to $BAK ==="
fi

TMP_OUT="$(mktemp)"
cp "$SKELETON" "$TMP_OUT"

echo "=== [live-from-env] applying substitutions ==="

perl -pi -e 's/ADDRESS_HARDWARE_OPS_1/'"$VOID_MAINNET_ADDR_HARDWARE_OPS_1"'/g' "$TMP_OUT"
perl -pi -e 's/ADDRESS_HARDWARE_CORE_1/'"$VOID_MAINNET_ADDR_HARDWARE_CORE_1"'/g' "$TMP_OUT"
perl -pi -e 's/ADDRESS_HARDWARE_VALIDATOR_1/'"$VOID_MAINNET_ADDR_HARDWARE_VALIDATOR_1"'/g' "$TMP_OUT"

perl -pi -e 's/TODO_SET_UPDATEGATE_ADDRESS/'"$VOID_MAINNET_ADDR_UPDATEGATE"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_ADMINGATE_ADDRESS/'"$VOID_MAINNET_ADDR_ADMINGATE"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_CONFIGGATE_ADDRESS/'"$VOID_MAINNET_ADDR_CONFIGGATE"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_VALIDATORSET_ADDRESS/'"$VOID_MAINNET_ADDR_VALIDATORSET"'/g' "$TMP_OUT"

perl -pi -e 's/TODO_SET_VOIDTOKEN_ADDRESS/'"$VOID_MAINNET_ADDR_VOIDTOKEN"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_PREMINEVAULT_ADDRESS/'"$VOID_MAINNET_ADDR_PREMINEVAULT"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_TREASURY_ADDRESS/'"$VOID_MAINNET_ADDR_TREASURY"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_VOIDTREASURY_ADDRESS/'"$VOID_MAINNET_ADDR_VOIDTREASURY"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_OPSTREASURY_ADDRESS/'"$VOID_MAINNET_ADDR_OPSTREASURY"'/g' "$TMP_OUT"
perl -pi -e 's/TODO_SET_REWARDENGINE_ADDRESS/'"$VOID_MAINNET_ADDR_REWARDENGINE"'/g' "$TMP_OUT"

perl -pi -e 's/VALIDATOR0_CONSENSUS_KEY/'"$VOID_MAINNET_VALIDATOR0_CONSENSUS_KEY"'/g' "$TMP_OUT"

mv "$TMP_OUT" "$TARGET"

echo "=== [live-from-env] wrote $TARGET ==="
jq '.' "$TARGET" >/dev/null 2>&1 && echo "[live-from-env] JSON validated OK" || echo "[live-from-env] WARNING: jq validation failed"

echo "=== [live-from-env] done ==="
