#!/usr/bin/env bash
set -euo pipefail

REPO="$HOME/dev/void-node"
cd "$REPO"

# VOID_NET = devnet | mainnet | whatever we add later
VOID_NET="${VOID_NET:-devnet}"

# Uppercase for file naming: devnet -> DEVNET, mainnet -> MAINNET
NET_UPPER=$(printf '%s\n' "$VOID_NET" | tr '[:lower:]' '[:upper:]')

STATE="docs/VOID-${NET_UPPER}-PROTOCOL-STATE.json"

if [ ! -f "$STATE" ]; then
  echo "[ERR] missing state file: $STATE"
  echo "      (for now we only have VOID-DEVNET-PROTOCOL-STATE.json)"
  exit 1
fi

echo "[net]    $VOID_NET"
echo "[state]  $STATE"
echo

jq '{
  chainId,
  deployer,
  AdminGate,
  ModelRegistry,
  JobQueue,
  AgentRegistry: (
    if has("AgentRegistry") then .AgentRegistry else "(not set)" end
  ),
  ReceiptRegistry: (
    if has("ReceiptRegistry") then .ReceiptRegistry else "(not set)" end
  ),
  DatasetRegistry: (
    if has("DatasetRegistry") then .DatasetRegistry else "(not set)" end
  ),
  ModelEvalRegistry: (
    if has("ModelEvalRegistry") then .ModelEvalRegistry else "(not set)" end
  ),
  VoidToken: (
    if has("VoidToken") then .VoidToken else "(not set)" end
  )
}' "$STATE"
