#!/usr/bin/env bash
set -euo pipefail

OUT_MAP="${1:-ops/mainnet/void-mainnet-roles-mapping.rehearsal.txt}"
OUT_JSON="${2:-config/void-mainnet-bootstrap-mainnet.rehearsal.json}"

rand_addr() {
  python3 - <<'PY'
import secrets
print("0x" + secrets.token_hex(20))
PY
}

rand_key32() {
  python3 - <<'PY'
import secrets
print("0x" + secrets.token_hex(32))
PY
}

DEPLOYER="$(rand_addr)"
TREASURY_ADMIN="$(rand_addr)"
OPS_TREASURY_ADMIN="$(rand_addr)"
VALIDATOR_ADMIN="$(rand_addr)"
ADMIN_GATE_OWNER="$(rand_addr)"
UPDATE_GATE_OWNER="$(rand_addr)"
CONFIG_GATE_OWNER="$(rand_addr)"
TREASURY_OWNER="$(rand_addr)"
OPS_TREASURY_OWNER="$(rand_addr)"
REWARD_ENGINE_OWNER="$(rand_addr)"
VALIDATOR_SET_OWNER="$(rand_addr)"
VALIDATOR0_REWARD="$(rand_addr)"
VALIDATOR0_CONSENSUS_KEY="$(rand_key32)"
VALIDATOR0_STAKE="1000000000000000000"

cat > "$OUT_MAP" <<EOF
# AUTO-GENERATED REHEARSAL VALUES
# DO NOT USE FOR REAL MAINNET
deployer=$DEPLOYER
treasuryAdmin=$TREASURY_ADMIN
opsTreasuryAdmin=$OPS_TREASURY_ADMIN
validatorAdmin=$VALIDATOR_ADMIN
adminGateOwner=$ADMIN_GATE_OWNER
updateGateOwner=$UPDATE_GATE_OWNER
configGateOwner=$CONFIG_GATE_OWNER
treasuryOwner=$TREASURY_OWNER
opsTreasuryOwner=$OPS_TREASURY_OWNER
rewardEngineOwner=$REWARD_ENGINE_OWNER
validatorSetOwner=$VALIDATOR_SET_OWNER

validator0.reward=$VALIDATOR0_REWARD
validator0.consensusKey=$VALIDATOR0_CONSENSUS_KEY
validator0.stakeVOID=$VALIDATOR0_STAKE
EOF

echo "[ok] wrote rehearsal mapping: $OUT_MAP"

ops/mainnet/void-mainnet-live-from-roles.sh "$OUT_MAP" "$OUT_JSON"

python3 - "$OUT_JSON" <<'PY'
import json, sys
p=sys.argv[1]
j=json.load(open(p))
zero="0x0000000000000000000000000000000000000000"
# give contracts fake non-zero rehearsal addresses so placeholder lint can pass
j["contracts"] = {
  "updateGate": "0x1000000000000000000000000000000000000001",
  "adminGate": "0x1000000000000000000000000000000000000002",
  "configGate": "0x1000000000000000000000000000000000000003",
  "validatorSet": "0x1000000000000000000000000000000000000004",
  "voidToken": "0x1000000000000000000000000000000000000005",
  "premineVault": "0x1000000000000000000000000000000000000006",
  "treasury": "0x1000000000000000000000000000000000000007",
  "voidTreasury": "0x1000000000000000000000000000000000000008",
  "opsTreasury": "0x1000000000000000000000000000000000000009",
  "rewardEngine": "0x1000000000000000000000000000000000000010"
}
j["note"] = "AUTO-GENERATED REHEARSAL CONFIG ONLY. DO NOT USE FOR REAL MAINNET."
open(p, "w").write(json.dumps(j, indent=2) + "\n")
print("[ok] patched rehearsal json with fake non-zero contract addresses")
PY

jq . "$OUT_JSON" >/dev/null
echo "[ok] jq valid: $OUT_JSON"

echo
echo "=== rehearsal map ==="
sed -n "1,220p" "$OUT_MAP"

echo
echo "=== rehearsal json summary ==="
python3 - "$OUT_JSON" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
print("chainId =", j["chainId"])
print("roles =", len(j["roles"]))
print("contracts =", len(j["contracts"]))
print("validator0.reward =", j["validator0"]["reward"])
print("validator0.consensusKey =", j["validator0"]["consensusKey"])
print("validator0.stakeVOID =", j["validator0"]["stakeVOID"])
PY
