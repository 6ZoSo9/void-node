#!/usr/bin/env bash
set -euo pipefail

# Simple, *real broadcast* deploy script for VOID devnet
# Requirements:
#   - RPC_URL (default: http://127.0.0.1:8545)
#   - DEVNET_PRIVKEY (your dev EOA key)
#   - DEVNET_BROADCAST=1 (we refuse to run without this)

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json"

DEVNET_PRIVKEY="${DEVNET_PRIVKEY:-}"
DEVNET_BROADCAST="${DEVNET_BROADCAST:-0}"

if [[ -z "$DEVNET_PRIVKEY" ]]; then
  echo "[system-deploy-v2] ERROR: DEVNET_PRIVKEY is not set" >&2
  exit 1
fi

if [[ "$DEVNET_BROADCAST" != "1" ]]; then
  echo "[system-deploy-v2] REFUSING to run without DEVNET_BROADCAST=1" >&2
  echo "[system-deploy-v2] If you want a dry run, call forge create manually." >&2
  exit 1
fi

if ! command -v forge >/dev/null 2>&1; then
  echo "[system-deploy-v2] ERROR: forge not found in PATH" >&2
  exit 1
fi

if ! command -v cast >/dev/null 2>&1; then
  echo "[system-deploy-v2] ERROR: cast not found in PATH" >&2
  exit 1
fi

if [[ ! -f "$STATE" ]]; then
  echo "[system-deploy-v2] ERROR: state file not found: $STATE" >&2
  exit 1
fi

CHAIN_ID="$(jq -r '.chainId' "$STATE" 2>/dev/null || echo "")"
if [[ "$CHAIN_ID" != "2050" ]]; then
  echo "[system-deploy-v2] ERROR: expected chainId 2050 in $STATE, got '$CHAIN_ID'" >&2
  exit 1
fi

ADMIN_GATE="$(jq -r '.AdminGate' "$STATE" 2>/dev/null || echo "")"
if [[ -z "$ADMIN_GATE" || "$ADMIN_GATE" == "null" ]]; then
  echo "[system-deploy-v2] WARN: AdminGate missing in state; using dev deployer as AdminGate" >&2
fi

DEPLOYER="$(cast wallet address "$DEVNET_PRIVKEY" 2>/dev/null || echo "")"
if [[ -z "$DEPLOYER" ]]; then
  echo "[system-deploy-v2] ERROR: could not derive deployer from DEVNET_PRIVKEY" >&2
  exit 1
fi

if [[ -z "$ADMIN_GATE" || "$ADMIN_GATE" == "null" ]]; then
  ADMIN_GATE="$DEPLOYER"
fi

echo "[system-deploy-v2] repo:     $REPO"
echo "[system-deploy-v2] RPC_URL:  $RPC_URL"
echo "[system-deploy-v2] STATE:    $STATE"
echo "[system-deploy-v2] chainId:  $CHAIN_ID"
echo "[system-deploy-v2] deployer: $DEPLOYER"
echo "[system-deploy-v2] AdminGate:$ADMIN_GATE"
echo "[system-deploy-v2] mode:     LIVE BROADCAST (no dry run)"
echo

deploy_one() {
  local label="$1"
  local fqcn="$2"
  local ctor_arg="${3:-}"

  echo "[system-deploy-v2] deploying $label ($fqcn) ..." >&2

  local out
  if [[ -n "$ctor_arg" ]]; then
    out="$(forge create "$fqcn" \
      --rpc-url "$RPC_URL" \
      --private-key "$DEVNET_PRIVKEY" \
      --constructor-args "$ctor_arg" \
      --broadcast 2>&1 | tee /dev/stderr)"
  else
    out="$(forge create "$fqcn" \
      --rpc-url "$RPC_URL" \
      --private-key "$DEVNET_PRIVKEY" \
      --broadcast 2>&1 | tee /dev/stderr)"
  fi

  local addr tx block_hex block_dec
  addr="$(grep -Eo 'Deployed to: (0x[0-9a-fA-F]{40})' <<<"$out" | awk '{print $3}' | tail -n1 || true)"
  tx="$(grep -Eo 'Transaction hash: (0x[0-9a-fA-F]{64})' <<<"$out" | awk '{print $3}' | tail -n1 || true)"

  if [[ -z "$addr" || -z "$tx" ]]; then
    echo "[system-deploy-v2] ERROR: failed to parse address/tx for $label" >&2
    exit 1
  fi

  block_hex="$(cast receipt "$tx" --rpc-url "$RPC_URL" | jq -r '.blockNumber' 2>/dev/null || echo "0x0")"
  if [[ "$block_hex" =~ ^0x ]]; then
    block_dec=$((block_hex))
  else
    block_dec="$block_hex"
  fi

  echo "[system-deploy-v2] $label deployed at $addr (block $block_dec, tx $tx)" >&2
  printf '%s|%s|%s\n' "$label" "$addr" "$block_dec"
}

mapfile -t lines < <(
  deploy_one "ModelRegistry"   "contracts/ModelRegistry.sol:ModelRegistry"         "$ADMIN_GATE"
  deploy_one "DatasetRegistry" "contracts/DatasetRegistry.sol:DatasetRegistry"     "$ADMIN_GATE"
  deploy_one "JobQueue"        "contracts/JobQueue.sol:JobQueue"                   "$ADMIN_GATE"
  deploy_one "AgentRegistry"   "contracts/AgentRegistry.sol:AgentRegistry"         "$ADMIN_GATE"
  deploy_one "ReceiptRegistry" "contracts/ReceiptRegistry.sol:ReceiptRegistry"     "$ADMIN_GATE"
)

ModelRegistry_ADDR="";   ModelRegistry_BLOCK=0
DatasetRegistry_ADDR=""; DatasetRegistry_BLOCK=0
JobQueue_ADDR="";        JobQueue_BLOCK=0
AgentRegistry_ADDR="";   AgentRegistry_BLOCK=0
ReceiptRegistry_ADDR=""; ReceiptRegistry_BLOCK=0

for line in "${lines[@]}"; do
  IFS='|' read -r label addr block <<<"$line"
  case "$label" in
    ModelRegistry)    ModelRegistry_ADDR="$addr";   ModelRegistry_BLOCK="$block" ;;
    DatasetRegistry)  DatasetRegistry_ADDR="$addr"; DatasetRegistry_BLOCK="$block" ;;
    JobQueue)         JobQueue_ADDR="$addr";        JobQueue_BLOCK="$block" ;;
    AgentRegistry)    AgentRegistry_ADDR="$addr";   AgentRegistry_BLOCK="$block" ;;
    ReceiptRegistry)  ReceiptRegistry_ADDR="$addr"; ReceiptRegistry_BLOCK="$block" ;;
  esac
done

tmp="$(mktemp)"
jq -n \
  --argjson chainId "$CHAIN_ID" \
  --arg AdminGate "$ADMIN_GATE" \
  --arg mr   "$ModelRegistry_ADDR"   --argjson mrBlock   "$ModelRegistry_BLOCK" \
  --arg dr   "$DatasetRegistry_ADDR" --argjson drBlock   "$DatasetRegistry_BLOCK" \
  --arg jqc  "$JobQueue_ADDR"        --argjson jqBlock   "$JobQueue_BLOCK" \
  --arg ar   "$AgentRegistry_ADDR"   --argjson arBlock   "$AgentRegistry_BLOCK" \
  --arg rr   "$ReceiptRegistry_ADDR" --argjson rrBlock   "$ReceiptRegistry_BLOCK" \
  '
  {
    chainId: $chainId,
    AdminGate: $AdminGate,
    ModelRegistry: {
      address: $mr,
      deployedBlock: $mrBlock,
      chainId: $chainId
    },
    DatasetRegistry: {
      address: $dr,
      deployedBlock: $drBlock,
      chainId: $chainId
    },
    JobQueue: {
      address: $jqc,
      deployedBlock: $jqBlock,
      chainId: $chainId
    },
    AgentRegistry: {
      address: $ar,
      deployedBlock: $arBlock,
      chainId: $chainId
    },
    ReceiptRegistry: {
      address: $rr,
      deployedBlock: $rrBlock,
      chainId: $chainId
    }
  }
  ' > "$tmp"

mv "$tmp" "$STATE"

echo
echo "[system-deploy-v2] wrote updated state to $STATE:"
sed -n '1,80p' "$STATE"
