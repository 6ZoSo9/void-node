#!/usr/bin/env bash
set -euo pipefail

RPC="${ANVIL_RPC:-http://127.0.0.1:8545}"
BCAST="broadcast/VoidMainnetBootstrapDevFromJsonDeploy.s.sol/2050/run-latest.json"

if [ ! -f "$BCAST" ]; then
  echo "[FATAL] broadcast file not found: $BCAST" >&2
  exit 1
fi

addr() {
  local name="$1"
  jq -r --arg name "$name" '
    [ .transactions[]
      | select(.contractName == $name)
      | .contractAddress
    ][0]
  ' "$BCAST"
}

TOKEN=$(addr "VoidToken")
OPS_TREASURY=$(addr "OpsTreasury")
VOID_TREASURY=$(addr "VoidTreasury")
ADMIN_GATE=$(addr "AdminGate")
CONFIG_GATE=$(addr "ConfigGate")
VALIDATOR_SET=$(addr "ValidatorSet")
EMISSIONS=$(addr "VoidEmissionsController")
REWARD=$(addr "RewardEngine")

echo "=== [addrs] from broadcast ==="
printf "  TOKEN           = %s\n" "$TOKEN"
printf "  OPS_TREASURY    = %s\n" "$OPS_TREASURY"
printf "  VOID_TREASURY   = %s\n" "$VOID_TREASURY"
printf "  ADMIN_GATE      = %s\n" "$ADMIN_GATE"
printf "  CONFIG_GATE     = %s\n" "$CONFIG_GATE"
printf "  VALIDATOR_SET   = %s\n" "$VALIDATOR_SET"
printf "  EMISSIONS       = %s\n" "$EMISSIONS"
printf "  REWARD          = %s\n" "$REWARD"
echo

echo "=== [tokenomics] premine + treasury ==="
PREMINE=$(cast call "$TOKEN" "PREMINE()(uint256)" --rpc-url "$RPC")
TOTAL_SUPPLY=$(cast call "$TOKEN" "totalSupply()(uint256)" --rpc-url "$RPC")
BAL_TREASURY=$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$VOID_TREASURY" --rpc-url "$RPC")
BAL_OWNER=$(cast call "$TOKEN" "balanceOf(address)(uint256)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url "$RPC")

printf "  PREMINE        = %s\n" "$PREMINE"
printf "  totalSupply    = %s\n" "$TOTAL_SUPPLY"
printf "  bal[treasury]  = %s\n" "$BAL_TREASURY"
printf "  bal[devOwner]  = %s\n" "$BAL_OWNER"

[ "$PREMINE" = "$TOTAL_SUPPLY" ] || { echo "[FAIL] PREMINE != totalSupply"; exit 1; }
[ "$BAL_TREASURY" = "$TOTAL_SUPPLY" ] || { echo "[FAIL] Treasury balance != totalSupply"; exit 1; }
[ "$BAL_OWNER" = "0" ] || { echo "[FAIL] devOwner still holds tokens"; exit 1; }
echo "[OK] premine locked in VoidTreasury and dev owner drained to 0"
echo

echo "=== [emissions budgets] ==="
EM_BUDGET=$(cast call "$EMISSIONS" "EMISSIONS_BUDGET()(uint256)" --rpc-url "$RPC")
RE_BUDGET=$(cast call "$REWARD" "EMISSIONS_BUDGET()(uint256)" --rpc-url "$RPC")

printf "  Emissions.EMISSIONS_BUDGET = %s\n" "$EM_BUDGET"
printf "  Reward.EMISSIONS_BUDGET    = %s\n" "$RE_BUDGET"

[ "$EM_BUDGET" = "$RE_BUDGET" ] || { echo "[FAIL] emissions budget mismatch between EmissionsController and RewardEngine"; exit 1; }
echo "[OK] emissions budgets match"
echo

echo "=== [gates + wiring] ==="
MASTER_KEY=$(cast call "$ADMIN_GATE" "masterKey()(address)" --rpc-url "$RPC")
CFG_ADMIN_GATE=$(cast call "$CONFIG_GATE" "adminGate()(address)" --rpc-url "$RPC")
VAL_ADMIN=$(cast call "$VALIDATOR_SET" "admin()(address)" --rpc-url "$RPC")
EM_ADMIN=$(cast call "$EMISSIONS" "admin()(address)" --rpc-url "$RPC")
RE_ADMIN=$(cast call "$REWARD" "admin()(address)" --rpc-url "$RPC")

printf "  AdminGate.masterKey       = %s\n" "$MASTER_KEY"
printf "  ConfigGate.adminGate      = %s\n" "$CFG_ADMIN_GATE"
printf "  ValidatorSet.admin        = %s\n" "$VAL_ADMIN"
printf "  EmissionsController.admin = %s\n" "$EM_ADMIN"
printf "  RewardEngine.admin        = %s\n" "$RE_ADMIN"

# normalize to lowercase for comparison
ADMIN_GATE_LC=$(echo "$ADMIN_GATE" | tr 'A-F' 'a-f')
CFG_ADMIN_GATE_LC=$(echo "$CFG_ADMIN_GATE" | tr 'A-F' 'a-f')

if [ "$CFG_ADMIN_GATE_LC" != "$ADMIN_GATE_LC" ]; then
  echo "[FAIL] ConfigGate.adminGate != AdminGate (after lowercasing)"
  exit 1
fi

echo "[OK] ConfigGate is wired to the correct AdminGate"
echo
echo "=== ALL CORE DEV BOOTSTRAP CHECKS PASSED ==="
