#!/usr/bin/env bash
set -euo pipefail

echo "=== [mainnet-config-surface] VOID mainnet config + surface + obelisk health ==="

REPO_ROOT="${REPO_ROOT:-$HOME/dev/void-node}"
cd "$REPO_ROOT"

CONFIG_CONTRACT="${CONFIG_CONTRACT:-config/void-mainnet-contract-surface.dev.json}"
CONFIG_NETWORK="${CONFIG_NETWORK:-config/void-mainnet-network.dev.json}"
CONFIG_OBELISK="${CONFIG_OBELISK:-config/obelisk-mainnet-profile.dev.json}"

EXPECTED_CHAINID="${EXPECTED_CHAINID:-2050}"
RPC_DEFAULT="http://127.0.0.1:8545"

echo
echo "[info] REPO_ROOT        = $REPO_ROOT"
echo "[info] CONFIG_CONTRACT  = $CONFIG_CONTRACT"
echo "[info] CONFIG_NETWORK   = $CONFIG_NETWORK"
echo "[info] CONFIG_OBELISK   = $CONFIG_OBELISK"
echo "[info] EXPECTED_CHAINID = $EXPECTED_CHAINID"

# --- 0) Basic file existence checks ---

for f in "$CONFIG_CONTRACT" "$CONFIG_NETWORK" "$CONFIG_OBELISK"; do
  if [[ ! -f "$f" ]]; then
    echo "[FATAL] missing required config file: $f"
    exit 1
  fi
done

command -v jq >/dev/null 2>&1 || {
  echo "[FATAL] jq is required for this script"
  exit 1
}

command -v curl >/dev/null 2>&1 || {
  echo "[FATAL] curl is required for this script"
  exit 1
}

# --- 1) Read chainIds from configs ---

echo
echo "=== [step 1] chainId sanity from configs ==="

NET_CHAINID="$(jq -r '.chainId' "$CONFIG_NETWORK")"
CONTRACT_CHAINID="$(jq -r '.chainId' "$CONFIG_CONTRACT")"
OBELISK_CHAINID="$(jq -r '.chainId' "$CONFIG_OBELISK")"

echo "  network.chainId   = $NET_CHAINID"
echo "  contract.chainId  = $CONTRACT_CHAINID"
echo "  obelisk.chainId   = $OBELISK_CHAINID"

BAD=0

if [[ -z "$NET_CHAINID" || "$NET_CHAINID" == "null" ]]; then
  echo "  [ERR] network.dev json missing .chainId"
  BAD=1
fi
if [[ -z "$CONTRACT_CHAINID" || "$CONTRACT_CHAINID" == "null" ]]; then
  echo "  [ERR] contract-surface.dev json missing .chainId"
  BAD=1
fi
if [[ -z "$OBELISK_CHAINID" || "$OBELISK_CHAINID" == "null" ]]; then
  echo "  [ERR] obelisk-mainnet-profile.dev json missing .chainId"
  BAD=1
fi

if [[ "$NET_CHAINID" != "$CONTRACT_CHAINID" || "$NET_CHAINID" != "$OBELISK_CHAINID" ]]; then
  echo "  [ERR] chainId mismatch between configs:"
  echo "       network  = $NET_CHAINID"
  echo "       contract = $CONTRACT_CHAINID"
  echo "       obelisk  = $OBELISK_CHAINID"
  BAD=1
fi

if [[ "$NET_CHAINID" != "$EXPECTED_CHAINID" ]]; then
  echo "  [ERR] network.chainId ($NET_CHAINID) != EXPECTED_CHAINID ($EXPECTED_CHAINID)"
  BAD=1
fi

if [[ "$BAD" -ne 0 ]]; then
  echo "[FATAL] chainId sanity failed; see errors above."
  exit 1
fi

echo "  [OK] all config chainIds match and equal EXPECTED_CHAINID=$EXPECTED_CHAINID"

# --- 2) Decide RPC URL (network config can override default) ---

NET_RPC="$(jq -r '.rpcUrl // .rpc_url // empty' "$CONFIG_NETWORK")"
RPC="${RPC_URL:-${NET_RPC:-$RPC_DEFAULT}}"

echo
echo "=== [step 2] RPC chainId sanity ==="
echo "  chosen RPC = $RPC"

CHAINID_JSON="$(curl -fsS -X POST "$RPC" \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}')" || {
  echo "[FATAL] failed to query eth_chainId from $RPC"
  exit 1
}

RPC_CHAIN_HEX="$(printf '%s\n' "$CHAINID_JSON" | jq -r '.result')"

if [[ -z "$RPC_CHAIN_HEX" || "$RPC_CHAIN_HEX" == "null" ]]; then
  echo "[FATAL] eth_chainId returned empty/null result from $RPC"
  echo "        raw response: $CHAINID_JSON"
  exit 1
fi

HEX_STRIPPED="${RPC_CHAIN_HEX#0x}"
RPC_CHAIN_DEC=$((16#$HEX_STRIPPED))

echo "  rpc eth_chainId (hex) = $RPC_CHAIN_HEX"
echo "  rpc eth_chainId (dec) = $RPC_CHAIN_DEC"

if [[ "$RPC_CHAIN_DEC" -ne "$EXPECTED_CHAINID" ]]; then
  echo "[FATAL] RPC chainId ($RPC_CHAIN_DEC) != EXPECTED_CHAINID ($EXPECTED_CHAINID)"
  exit 1
fi

echo "  [OK] RPC chainId matches EXPECTED_CHAINID=$EXPECTED_CHAINID"

# --- 3) Contract surface: structure + code checks ---

echo
echo "=== [step 3] contract surface structure ==="

# We support both:
#   "contracts": { "Name": "0x...", "Other": { "address": "0x..." }, ... }
# Build a flat list of "Name Address".
readarray -t CONTRACT_LINES < <(
  jq -r '
    .contracts
    | to_entries[]
    | "\(.key) \(
        .value
        | if type == "string" then .
          elif type == "object" and has("address") then .address
          else ""
          end
      )"
  ' "$CONFIG_CONTRACT"
)

if [[ "${#CONTRACT_LINES[@]}" -eq 0 ]]; then
  echo "[FATAL] no contracts found under .contracts in $CONFIG_CONTRACT"
  exit 1
fi

echo "  found ${#CONTRACT_LINES[@]} contracts in surface manifest"

BAD_STRUCT=0

for line in "${CONTRACT_LINES[@]}"; do
  NAME="${line%% *}"
  ADDR="${line#* }"

  if [[ -z "$NAME" || -z "$ADDR" || "$ADDR" == "null" ]]; then
    echo "  [ERR] contract entry has empty name or address: '$line'"
    BAD_STRUCT=1
    continue
  fi

  if ! [[ "$ADDR" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "  [ERR] contract $NAME has invalid address format: $ADDR"
    BAD_STRUCT=1
    continue
  fi

  echo "  [OK] $NAME address format looks valid: $ADDR"
done

if [[ "$BAD_STRUCT" -ne 0 ]]; then
  echo "[FATAL] contract surface structure problems; see errors above."
  exit 1
fi

echo "  [OK] contract surface structure looks sane"

# --- 4) Contract code presence via eth_getCode ---

echo
echo "=== [step 4] contract code presence on RPC ==="

TOTAL=0
OK_CODE=0
EMPTY_CODE=0
RPC_FAIL=0

for line in "${CONTRACT_LINES[@]}"; do
  NAME="${line%% *}"
  ADDR="${line#* }"
  ((TOTAL++))

  echo "  - checking $NAME at $ADDR"

  REQ="$(printf '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["%s","latest"]}' "$ADDR")"

  RESP="$(curl -fsS -X POST "$RPC" \
    -H 'Content-Type: application/json' \
    --data "$REQ" 2>/dev/null || true)"

  if [[ -z "$RESP" ]]; then
    echo "    [ERR] RPC response empty for $NAME"
    ((RPC_FAIL++))
    continue
  fi

  CODE_HEX="$(printf '%s\n' "$RESP" | jq -r '.result // empty')"

  if [[ -z "$CODE_HEX" ]]; then
    echo "    [ERR] no .result field in eth_getCode response for $NAME"
    ((RPC_FAIL++))
    continue
  fi

  if [[ "$CODE_HEX" == "0x" ]]; then
    echo "    [ERR] eth_getCode returned 0x (no code) for $NAME"
    ((EMPTY_CODE++))
    continue
  fi

  echo "    [OK] code present for $NAME (len=${#CODE_HEX})"
  ((OK_CODE++))
done

echo
echo "=== [summary] contract code checks ==="
echo "  total      = $TOTAL"
echo "  ok_code    = $OK_CODE"
echo "  empty_code = $EMPTY_CODE"
echo "  rpc_fail   = $RPC_FAIL"

if [[ "$EMPTY_CODE" -ne 0 || "$RPC_FAIL" -ne 0 ]]; then
  echo
  echo "[FATAL] one or more contracts missing code or RPC errors occurred."
  exit 1
fi

if [[ "$TOTAL" -eq 0 ]]; then
  echo
  echo "[FATAL] no contracts were checked (TOTAL==0)."
  exit 1
fi

echo
echo "[RESULT] OK (chainIds match, RPC chainId OK, contract surface sane, all contracts have code)"
