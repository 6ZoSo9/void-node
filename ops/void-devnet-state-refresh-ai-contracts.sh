#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
RPC="${RPC:-http://127.0.0.1:8545}"
CHAINID="${CHAINID:-2050}"
FORCE="${FORCE:-0}"  # set FORCE=1 to overwrite even if current looks valid

need() { command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing dep: $1" >&2; exit 2; }; }
need jq
need find
need sort
need head
need mktemp

is_addr() { [[ "${1:-}" =~ ^0x[0-9a-fA-F]{40}$ ]]; }

get_state_addr() {
  local key="$1"
  jq -r --arg k "$key" '
    def addr:
      if type=="object" then (.address // .addr // empty)
      elif type=="string" then .
      else empty end;
    (.[ $k ] // .contracts[ $k ] // empty | addr) // empty
  ' "$STATE"
}

src_for() {
  case "$1" in
    JobQueue)        echo "contracts/JobQueue.sol" ;;
    ReceiptRegistry) echo "contracts/ReceiptRegistry.sol" ;;
    AgentRegistry)   echo "contracts/AgentRegistry.sol" ;;
    ModelRegistry)   echo "contracts/ModelRegistry.sol" ;;
    DatasetRegistry) echo "contracts/DatasetRegistry.sol" ;;
    *)               echo "" ;;
  esac
}

# Find broadcast run-latest.json files, newest first.
mapfile -t RUNS < <(
  find "$REPO/broadcast" -type f -name 'run-latest.json' -print 2>/dev/null \
    | xargs -r ls -t 2>/dev/null || true
)

if [[ "${#RUNS[@]}" -eq 0 ]]; then
  echo "[ERR] no Foundry broadcast artifacts found under $REPO/broadcast" >&2
  echo "      Run your forge script with --broadcast (or point to the right repo) then re-run." >&2
  exit 3
fi

find_addr_in_runs() {
  local cname="$1"
  local f a
  for f in "${RUNS[@]}"; do
    a="$(jq -r --arg name "$cname" '
      .transactions[]? | select(.contractName==$name) | (.contractAddress // empty)
    ' "$f" 2>/dev/null | head -n 1 || true)"
    if is_addr "$a"; then
      echo "$a"
      return 0
    fi
  done
  return 1
}

verify_code() {
  local a="$1"
  if command -v cast >/dev/null 2>&1; then
    local code
    code="$(cast code --rpc-url "$RPC" "$a" 2>/dev/null || true)"
    [[ "$code" != "0x" && -n "$code" ]]
  else
    # cast not available; skip verification
    return 0
  fi
}

backup_state() {
  local ts
  ts="$(date +%Y%m%d-%H%M%S)"
  cp -a "$STATE" "$STATE.bak.$ts"
  echo "[backup] $STATE.bak.$ts"
}

set_state_addr() {
  local key="$1" addr="$2" src="$3"
  local tmp
  tmp="$(mktemp)"
  jq --arg k "$key" \
     --arg a "$addr" \
     --arg src "$src" \
     --arg c "$key" \
     --argjson chainId "$CHAINID" \
     '
      .[ $k ] = {
        address: $a,
        chainId: $chainId,
        contract: $c,
        source: $src
      }
     ' "$STATE" > "$tmp"
  mv -f "$tmp" "$STATE"
}

echo "=== [refresh ai registry addresses] ==="
echo "REPO=$REPO"
echo "STATE=$STATE"
echo "RPC=$RPC"
echo "CHAINID=$CHAINID"
echo "RUNS=${#RUNS[@]} (newest first)"
echo

if [[ ! -f "$STATE" ]]; then
  echo "[ERR] missing state file: $STATE" >&2
  exit 4
fi

KEYS=(JobQueue ReceiptRegistry AgentRegistry ModelRegistry DatasetRegistry)

echo "=== [before] ==="
for k in "${KEYS[@]}"; do
  cur="$(get_state_addr "$k" || true)"
  if is_addr "$cur"; then
    echo "$k  OK  $cur"
  else
    echo "$k  BAD $(printf '%q' "${cur:-}")"
  fi
done
echo

changed=0
did_backup=0

for k in "${KEYS[@]}"; do
  cur="$(get_state_addr "$k" || true)"
  if is_addr "$cur" && [[ "$FORCE" != "1" ]]; then
    continue
  fi

  addr="$(find_addr_in_runs "$k" || true)"
  if ! is_addr "$addr"; then
    echo "[WARN] $k: not found in broadcast artifacts"
    continue
  fi

  if ! verify_code "$addr"; then
    echo "[WARN] $k: found $addr but no code at that address (RPC=$RPC). skipping."
    continue
  fi

  if [[ "$did_backup" -eq 0 ]]; then
    backup_state
    did_backup=1
  fi

  src="$(src_for "$k")"
  echo "[write] $k = $addr (src=$src)"
  set_state_addr "$k" "$addr" "$src"
  changed=1
done

echo
echo "=== [after] ==="
for k in "${KEYS[@]}"; do
  cur="$(get_state_addr "$k" || true)"
  if is_addr "$cur"; then
    echo "$k  OK  $cur"
  else
    echo "$k  BAD $(printf '%q' "${cur:-}")"
  fi
done

echo
if [[ "$changed" -eq 1 ]]; then
  echo "[done] updated $STATE"
else
  echo "[done] no changes (either already OK or nothing found in broadcast artifacts)"
fi
