#!/usr/bin/env bash
set -euo pipefail

KEY_ROOT="/mnt/voidkey"
MAPPING="$KEY_ROOT/meta/mainnet-roles-mapping.txt"
LIVE_CFG="config/void-mainnet-bootstrap-mainnet.live.json"

echo "=== [roles-verify] KEY_ROOT=${KEY_ROOT} ==="
echo "[roles-verify] mapping=${MAPPING}"
echo "[roles-verify] live_cfg=${LIVE_CFG}"
echo

# 0) Basic checks: mount + files
if ! findmnt -rn "$KEY_ROOT" >/dev/null 2>&1; then
  echo "[FATAL] $KEY_ROOT is not mounted."
  echo "        Mount your LUKS voidkey at $KEY_ROOT and retry."
  exit 1
fi

if [ ! -f "$MAPPING" ]; then
  echo "[FATAL] mapping file not found: $MAPPING"
  echo "        Run the roles-mapping-init helper first."
  exit 1
fi

if [ ! -f "$LIVE_CFG" ]; then
  echo "[FATAL] live bootstrap config not found: $LIVE_CFG"
  exit 1
fi

echo "[ok] prerequisites present (voidkey mounted, mapping + live cfg exist)"
echo

# 1) Helper: lowercase an address (no validation here)
lower_addr() {
  tr 'A-F' 'a-f'
}

MISMATCHES=0
MISSING_ROLES=0
TOTAL=0

echo "=== [roles-verify] comparing mapping vs live JSON ==="
echo

# 2) Walk mapping file line-by-line
# Format: role_id<TAB>address<TAB>comment
while IFS= read -r line; do
  # Skip blank lines and comments
  if [ -z "$line" ]; then
    continue
  fi
  case "$line" in
    \#*) continue ;;
  esac

  # Extract role and address safely
  ROLE_ID=$(printf '%s\n' "$line" | awk '{print $1}')
  ADDR_RAW=$(printf '%s\n' "$line" | awk '{print $2}')

  if [ -z "${ROLE_ID:-}" ]; then
    echo "[warn] skipping malformed line (no role_id): $line"
    continue
  fi

  if [ -z "${ADDR_RAW:-}" ]; then
    echo "[warn] role_id=${ROLE_ID}: mapping line has no address; skipping"
    continue
  fi

  TOTAL=$((TOTAL + 1))

  # Normalize mapping address (lowercase)
  MAP_ADDR=$(printf '%s\n' "$ADDR_RAW" | lower_addr)

  # Pull address from live JSON
  CFG_ADDR_RAW=$(jq -r --arg role "$ROLE_ID" '.roles[$role] // ""' "$LIVE_CFG")
  if [ -z "${CFG_ADDR_RAW:-}" ] || [ "$CFG_ADDR_RAW" = "null" ]; then
    echo "[MISS] role_id=${ROLE_ID}: no matching .roles[\"${ROLE_ID}\"] in live JSON"
    MISSING_ROLES=$((MISSING_ROLES + 1))
    continue
  fi

  CFG_ADDR=$(printf '%s\n' "$CFG_ADDR_RAW" | lower_addr)

  # Compare
  if [ "$MAP_ADDR" != "$CFG_ADDR" ]; then
    echo "[MISMATCH] role_id=${ROLE_ID}"
    echo "  mapping: ${ADDR_RAW}"
    echo "  config : ${CFG_ADDR_RAW}"
    echo
    MISMATCHES=$((MISMATCHES + 1))
  else
    echo "[ok] role_id=${ROLE_ID} matches"
    echo "  address: ${ADDR_RAW}"
    echo
  fi

done < "$MAPPING"

echo "=== [roles-verify] summary ==="
echo "  total roles checked : ${TOTAL}"
echo "  missing roles       : ${MISSING_ROLES}"
echo "  address mismatches  : ${MISMATCHES}"
echo

if [ "$MISSING_ROLES" -ne 0 ] || [ "$MISMATCHES" -ne 0 ]; then
  echo "[RESULT] BAD: roles mapping does NOT fully match live config."
  exit 1
fi

echo "[RESULT] OK: roles mapping matches live config."
