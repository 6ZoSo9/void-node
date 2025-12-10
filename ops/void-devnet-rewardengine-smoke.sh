#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$HOME/dev/void-node}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-$ROOT/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

echo "=== [VOID devnet — RewardEngine smoke] ==="
echo "[cfg] ROOT     = $ROOT"
echo "[cfg] RPC_URL  = $RPC_URL"
echo "[cfg] STATE    = $STATE"
echo

if [[ ! -f "$STATE" ]]; then
  echo "[FATAL] state file not found: $STATE"
  exit 1
fi

echo "=== [0] peek state keys (top-level) ==="
jq 'keys' "$STATE" || { echo "[FATAL] jq failed on state file"; exit 1; }
echo

echo "=== [1] extract RewardEngine address (best-effort) ==="
REWARD_ENGINE="$(jq -r '.RewardEngine.address // .RewardEngine // .contracts.RewardEngine.address // empty' "$STATE")"

if [[ -z "$REWARD_ENGINE" || "$REWARD_ENGINE" == "null" ]]; then
  echo "[INFO] RewardEngine NOT present in devnet state."
  echo "       This is expected right now: VOID devnet currently tracks:"
  echo "         - AdminGate, AgentRegistry, DatasetRegistry, JobQueue,"
  echo "           ModelRegistry, ReceiptRegistry, workCredits*, chainId"
  echo "         - but NO RewardEngine contract yet."
  echo
  cat <<EOF
[RESULT] SKIP: RewardEngine is not wired on devnet.
  - state file : $STATE
  - next steps : 
      * Once RewardEngine is added to devnet bootstrap,
        update this script to:
          - read .RewardEngine.address (or contracts.RewardEngine.address)
          - run 'cast code' to ensure non-empty bytecode
          - optionally add basic read-only sanity checks.
EOF
  echo
  echo "[rewardengine-smoke] DONE (stub, no RewardEngine on devnet)."
  exit 0
fi

echo "RewardEngine.address = $REWARD_ENGINE"
echo

echo "=== [2] check that RewardEngine has code on devnet ==="
CODE_HEX="$(cast code "$REWARD_ENGINE" --rpc-url "$RPC_URL" 2>/dev/null || echo "ERR")"

if [[ "$CODE_HEX" == "ERR" ]]; then
  echo "[FATAL] cast code failed (check RPC_URL / anvil state)"
  exit 1
fi

if [[ "$CODE_HEX" == "0x" || "$CODE_HEX" == "0x0" ]]; then
  echo "[FATAL] RewardEngine has no code at $REWARD_ENGINE on $RPC_URL"
  exit 1
fi

LEN_CHARS="${#CODE_HEX}"
echo "RewardEngine code length (hex chars): $LEN_CHARS"
echo "[OK] non-empty code blob detected for RewardEngine."
echo

echo "=== [3] summary ==="
cat <<EOF
[RESULT] OK: RewardEngine is configured in $STATE and has non-empty code on devnet.
  - address : $REWARD_ENGINE
  - rpc_url : $RPC_URL
  - codeLen : $LEN_CHARS chars (hex)

Later we can extend this to:
  - run a tiny read-only call (e.g. epoch/params),
  - eventually hook into a devnet rewards rehearsal (stake -> accrue -> claim).
EOF

echo
echo "[rewardengine-smoke] DONE."
