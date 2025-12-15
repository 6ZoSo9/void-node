#!/usr/bin/env bash
set -euo pipefail

#
# VOID devnet – Governance status hammer (AdminGate / UpdateGate)
#
# Best-effort, state-file based (no fragile ABI assumptions yet).
#

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="${STATE_FILE:-"$repo/docs/VOID-DEVNET-PROTOCOL-STATE.json"}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

echo "=== [devnet governance status] ==="
echo "[repo]      $repo"
echo "[state]     $STATE_FILE"
echo "[rpc_url]   $RPC_URL"
echo

if ! command -v jq >/dev/null 2>&1; then
  echo "[error] jq not found in PATH – install jq first (apt install jq, etc.)" >&2
  exit 1
fi

if [ ! -f "$STATE_FILE" ]; then
  echo "[error] state file not found: $STATE_FILE" >&2
  exit 1
fi

# chainId (tolerate a couple shapes)
chainId="$(jq -r '(.chainId // .ChainId // .network.chainId // empty)' "$STATE_FILE")"
[ -z "$chainId" ] && chainId="(unknown)"

# Core contract addresses (best-effort)
adminGate_addr="$(jq -r '.AdminGate.address // .AdminGate // empty' "$STATE_FILE")"
updateGate_addr="$(jq -r '.UpdateGate.address // .UpdateGate // empty' "$STATE_FILE")"
jobQueue_addr="$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end)) // .JobQueue // empty' "$STATE_FILE")"
receipts_addr="$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end)) // .ReceiptRegistry // empty' "$STATE_FILE")"
models_addr="$(jq -r '.ModelRegistry.address // .ModelRegistry // empty' "$STATE_FILE")"
datasets_addr="$(jq -r '.DatasetRegistry.address // .DatasetRegistry // empty' "$STATE_FILE")"
agents_addr="$(jq -r '.AgentRegistry.address // .AgentRegistry // empty' "$STATE_FILE")"

# Optional master-key / admin info if we ever record it in state
master_key="$(jq -r '.AdminGate.masterKey // .masterKey // empty' "$STATE_FILE")"
[ "$master_key" = "null" ] && master_key=""

echo "=== [chain] ==="
echo "chainId             : $chainId"
echo

echo "=== [core governance contracts] ==="
printf '%-22s %s\n' "AdminGate"        "${adminGate_addr:-"(not set)"}"
printf '%-22s %s\n' "UpdateGate"       "${updateGate_addr:-"(not set)"}"
printf '%-22s %s\n' "JobQueue"         "${jobQueue_addr:-"(not set)"}"
printf '%-22s %s\n' "ReceiptRegistry"  "${receipts_addr:-"(not set)"}"
printf '%-22s %s\n' "ModelRegistry"    "${models_addr:-"(not set)"}"
printf '%-22s %s\n' "DatasetRegistry"  "${datasets_addr:-"(not set)"}"
printf '%-22s %s\n' "AgentRegistry"    "${agents_addr:-"(not set)"}"
echo

echo "=== [master-key (best-effort)] ==="
if [ -n "$master_key" ] && [ "$master_key" != "0x0000000000000000000000000000000000000000" ]; then
  echo "masterKey           : $master_key"
else
  echo "masterKey           : (not recorded in state; check AdminGate on-chain)"
fi
echo

echo "=== [notes] ==="
echo "- This hammer is intentionally conservative: it only trusts the state file."
echo "- On-chain introspection of AdminGate/UpdateGate (signer sets, manifests, etc.)"
echo "  will be added once ABIs are fully frozen for mainnet-core."
echo "- Use this as a quick sanity check that your devnet is wired to the expected"
echo "  governance contracts before we tighten mainnet rules."
