#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

export PATH="$HOME/.foundry/bin:$PATH"

RPC="${RPC:-http://127.0.0.1:8545}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
MIN_STAKE_WEI="${MIN_STAKE_WEI:-1000000000000000000000}"
MAX_ACTIVE_VALIDATORS="${MAX_ACTIVE_VALIDATORS:-256}"
ACTIVATION_CHURN_LIMIT="${ACTIVATION_CHURN_LIMIT:-4}"

STAMP="$(date +%Y%m%d-%H%M%S)"
PROOF_ROOT="${PROOF_ROOT:-/tmp/void-candidate-registry-deploy-proof.$STAMP}"
OUT_DIR="${OUT_DIR:-$PWD/.runtime/mainnet0}"
OUT_JSON="$OUT_DIR/validator-candidate-registry.local.$STAMP.json"
OUT_CURRENT="$OUT_DIR/validator-candidate-registry.local.current.json"

mkdir -p "$PROOF_ROOT/src" "$OUT_DIR"
cp contracts/mainnet0/VoidValidatorCandidateRegistry.sol "$PROOF_ROOT/src/VoidValidatorCandidateRegistry.sol"

cat > "$PROOF_ROOT/foundry.toml" <<'TOML'
[profile.default]
src = "src"
out = "out"
libs = []
solc_version = "0.8.20"
optimizer = true
optimizer_runs = 200
TOML

load_pk_from_secrets() {
  python3 - "$SECRETS" <<'PYKEY'
import json, re, sys

path = sys.argv[1]
j = json.load(open(path, "r", encoding="utf-8"))

rows = None
if isinstance(j, dict):
    for key in ("keys", "wallets", "accounts"):
        if isinstance(j.get(key), list):
            rows = j[key]
            break
    if rows is None and all(isinstance(v, dict) for v in j.values()):
        rows = list(j.values())
elif isinstance(j, list):
    rows = j

if not isinstance(rows, list):
    raise SystemExit("[ERR] unsupported wallet-secrets JSON shape")

preferred = [
    "hot_wallet",
    "admin",
    "validator_admin",
    "ops_admin",
    "treasury_admin",
    "update_admin",
    "deployer",
]

def row_name(r):
    return str(r.get("name") or r.get("label") or r.get("id") or "").strip()

def row_pk(r):
    for k in ("private_key", "privateKey", "pk", "key"):
        v = r.get(k)
        if isinstance(v, str):
            v = v.strip()
            if re.fullmatch(r"0x[0-9a-fA-F]{64}", v):
                return v
            if re.fullmatch(r"[0-9a-fA-F]{64}", v):
                return "0x" + v
    return ""

for wanted in preferred:
    for r in rows:
        if isinstance(r, dict) and row_name(r) == wanted:
            pk = row_pk(r)
            if pk:
                print(pk)
                raise SystemExit(0)

for r in rows:
    if isinstance(r, dict):
        pk = row_pk(r)
        if pk:
            print(pk)
            raise SystemExit(0)

raise SystemExit("[ERR] no usable private key found in wallet-secrets JSON")
PYKEY
}

if [ -z "${DEPLOYER_PK:-}" ]; then
  if [ ! -f "$SECRETS" ]; then
    echo "[ERR] DEPLOYER_PK not set and SECRETS not found: $SECRETS"
    exit 1
  fi
  DEPLOYER_PK="$(load_pk_from_secrets)"
fi

case "$DEPLOYER_PK" in
  0x????????????????????????????????????????????????????????????????) ;;
  *) echo "[ERR] DEPLOYER_PK is not a 32-byte hex key"; exit 1 ;;
esac

# Deterministic local-only candidate key. This is not a mainnet secret.
CANDIDATE_PK="${CANDIDATE_PK:-0x59c6995e998f97a5a004497e5da2d7a57d6d7f4df0e3c2b3a7b3c9e8b2b3b8f0}"

echo "=== [a0] key sanity, no private key printed ==="
DEPLOYER_ADDR="$(cast wallet address "$DEPLOYER_PK")"
CANDIDATE_ADDR="$(cast wallet address "$CANDIDATE_PK")"
echo "deployer=$DEPLOYER_ADDR"
echo "candidate=$CANDIDATE_ADDR"
echo "secrets=$SECRETS"

BAL_HEX="$(python3 - <<'PYBAL'
print(hex(10000 * 10**18))
PYBAL
)"
cast rpc --rpc-url "$RPC" anvil_setBalance "$DEPLOYER_ADDR" "$BAL_HEX" >/dev/null 2>&1 || true
cast rpc --rpc-url "$RPC" anvil_setBalance "$CANDIDATE_ADDR" "$BAL_HEX" >/dev/null 2>&1 || true

echo
echo "=== [a] rpc sanity ==="
cast chain-id --rpc-url "$RPC"

echo
echo "=== [b] deploy candidate registry from isolated proof root ==="
DEPLOY_LOG="$OUT_DIR/validator-candidate-registry.forge-create.$STAMP.log"

(
  cd "$PROOF_ROOT"
  forge create \
    --rpc-url "$RPC" \
    --private-key "$DEPLOYER_PK" \
    --broadcast \
    src/VoidValidatorCandidateRegistry.sol:VoidValidatorCandidateRegistry \
    --constructor-args "$MIN_STAKE_WEI" "$MAX_ACTIVE_VALIDATORS" "$ACTIVATION_CHURN_LIMIT" \
    --json
) 2>&1 | tee "$DEPLOY_LOG"

REGISTRY="$(python3 - "$DEPLOY_LOG" <<'PYPARSE'
import json, re, sys
from pathlib import Path

txt = Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")

# Try to decode any JSON object in the output.
for m in re.finditer(r"\{", txt):
    chunk = txt[m.start():].strip()
    try:
        j = json.loads(chunk)
    except Exception:
        continue
    for k in ("deployedTo", "contractAddress"):
        v = j.get(k)
        if isinstance(v, str) and re.fullmatch(r"0x[0-9a-fA-F]{40}", v):
            print(v)
            raise SystemExit(0)

# Fallback for human output.
for pat in (
    r'"deployedTo"\s*:\s*"(0x[0-9a-fA-F]{40})"',
    r'"contractAddress"\s*:\s*"(0x[0-9a-fA-F]{40})"',
    r"Deployed to:\s*(0x[0-9a-fA-F]{40})",
    r"Contract deployed to:\s*(0x[0-9a-fA-F]{40})",
):
    m = re.search(pat, txt)
    if m:
        print(m.group(1))
        raise SystemExit(0)

raise SystemExit("[ERR] could not parse deployed registry address from forge create output")
PYPARSE
)"

echo "registry=$REGISTRY"

echo
echo "=== [c] pre-registration counts ==="
CANDIDATE_COUNT_BEFORE="$(cast call --rpc-url "$RPC" "$REGISTRY" 'candidateCount()(uint256)')"
WAITING_COUNT_BEFORE="$(cast call --rpc-url "$RPC" "$REGISTRY" 'waitingCount()(uint256)')"
ACTIVE_COUNT_BEFORE="$(cast call --rpc-url "$RPC" "$REGISTRY" 'activeCount()(uint256)')"

echo "candidate_before=$CANDIDATE_COUNT_BEFORE"
echo "waiting_before=$WAITING_COUNT_BEFORE"
echo "active_before=$ACTIVE_COUNT_BEFORE"

echo
echo "=== [d] public candidate registration ==="
CONSENSUS_KEY_HASH="$(cast keccak "void-mainnet0-candidate-consensus-key-$STAMP")"
METADATA_HASH="$(cast keccak "void-mainnet0-candidate-metadata-$STAMP")"

cast send \
  --rpc-url "$RPC" \
  --private-key "$CANDIDATE_PK" \
  "$REGISTRY" \
  'registerCandidate(address,bytes32,bytes32)' \
  "$CANDIDATE_ADDR" \
  "$CONSENSUS_KEY_HASH" \
  "$METADATA_HASH" \
  --value "$MIN_STAKE_WEI"

echo
echo "=== [e] post-registration counts ==="
CANDIDATE_COUNT_AFTER="$(cast call --rpc-url "$RPC" "$REGISTRY" 'candidateCount()(uint256)')"
WAITING_COUNT_AFTER="$(cast call --rpc-url "$RPC" "$REGISTRY" 'waitingCount()(uint256)')"
ACTIVE_COUNT_AFTER="$(cast call --rpc-url "$RPC" "$REGISTRY" 'activeCount()(uint256)')"

echo "candidate_after=$CANDIDATE_COUNT_AFTER"
echo "waiting_after=$WAITING_COUNT_AFTER"
echo "active_after=$ACTIVE_COUNT_AFTER"

if [ "$ACTIVE_COUNT_AFTER" != "$ACTIVE_COUNT_BEFORE" ]; then
  echo "[ERR] active count changed during public registration"
  exit 1
fi

if [ "$CANDIDATE_COUNT_AFTER" = "$CANDIDATE_COUNT_BEFORE" ]; then
  echo "[ERR] candidate count did not increase"
  exit 1
fi

echo
echo "=== [f] owner moves candidate to waiting; active still must not change ==="
MOVE_TO_WAITING_GAS="${MOVE_TO_WAITING_GAS:-250000}"
MOVE_LOG="$OUT_DIR/validator-candidate-registry.move-to-waiting.$STAMP.log"

OWNER_ADDR="$(cast call --rpc-url "$RPC" "$REGISTRY" 'owner()(address)' | sed -E 's/^0x0{24}/0x/')"
echo "owner=$OWNER_ADDR"
if [ "$(printf '%s' "$OWNER_ADDR" | tr '[:upper:]' '[:lower:]')" != "$(printf '%s' "$DEPLOYER_ADDR" | tr '[:upper:]' '[:lower:]')" ]; then
  echo "[ERR] deployer is not registry owner"
  exit 1
fi

set +e
cast send \
  --rpc-url "$RPC" \
  --private-key "$DEPLOYER_PK" \
  --gas-limit "$MOVE_TO_WAITING_GAS" \
  "$REGISTRY" \
  'moveToWaiting(address)' \
  "$CANDIDATE_ADDR" 2>&1 | tee "$MOVE_LOG"
MOVE_RC="${PIPESTATUS[0]}"
set -e
echo "move_rc=$MOVE_RC"

MOVE_STATUS="$(python3 - "$MOVE_LOG" <<'PYSTATUS'
import re, sys
from pathlib import Path
txt = Path(sys.argv[1]).read_text(errors="replace")
m = re.search(r"(?m)^status\s+([01])\b", txt)
if not m:
    raise SystemExit("[ERR] could not parse moveToWaiting receipt status")
print(m.group(1))
PYSTATUS
)"
echo "move_status=$MOVE_STATUS"

MOVE_TX_HASH="$(python3 - "$MOVE_LOG" <<'PYTX'
import re, sys
from pathlib import Path
txt = Path(sys.argv[1]).read_text(errors="replace")
m = re.search(r"(?m)^transactionHash\s+(0x[0-9a-fA-F]{64})\b", txt)
if not m:
    raise SystemExit("[ERR] could not parse moveToWaiting transactionHash")
print(m.group(1))
PYTX
)"
echo "move_tx=$MOVE_TX_HASH"

if [ "$MOVE_RC" != "0" ]; then
  echo "[ERR] cast send moveToWaiting exited nonzero"
  exit 1
fi

if [ "$MOVE_STATUS" != "1" ]; then
  echo "[ERR] moveToWaiting transaction failed; refusing to write ok=true artifact"
  exit 1
fi

WAITING_COUNT_FINAL="$(cast call --rpc-url "$RPC" "$REGISTRY" 'waitingCount()(uint256)')"
ACTIVE_COUNT_FINAL="$(cast call --rpc-url "$RPC" "$REGISTRY" 'activeCount()(uint256)')"

echo "waiting_final=$WAITING_COUNT_FINAL"
echo "active_final=$ACTIVE_COUNT_FINAL"

python3 - <<'PYWAIT' "$WAITING_COUNT_AFTER" "$WAITING_COUNT_FINAL"
import sys
after = int(str(sys.argv[1]), 0)
final = int(str(sys.argv[2]), 0)
if final != after + 1:
    raise SystemExit(f"[ERR] waiting count did not increase by 1: after={after} final={final}")
print("[ok] waiting count increased by 1")
PYWAIT

if [ "$ACTIVE_COUNT_FINAL" != "$ACTIVE_COUNT_BEFORE" ]; then
  echo "[ERR] active count changed while moving to waiting"
  exit 1
fi

cat > "$OUT_JSON" <<JSON
{
  "ok": true,
  "kind": "validator_candidate_registry_local_deploy_proof",
  "stamp": "$STAMP",
  "rpc": "$RPC",
  "registry": "$REGISTRY",
  "deployer": "$DEPLOYER_ADDR",
  "candidate": "$CANDIDATE_ADDR",
  "minValidatorStakeWei": "$MIN_STAKE_WEI",
  "maxActiveValidators": "$MAX_ACTIVE_VALIDATORS",
  "activationChurnLimit": "$ACTIVATION_CHURN_LIMIT",
  "candidateCountBefore": "$CANDIDATE_COUNT_BEFORE",
  "candidateCountAfter": "$CANDIDATE_COUNT_AFTER",
  "waitingCountBefore": "$WAITING_COUNT_BEFORE",
  "waitingCountAfter": "$WAITING_COUNT_AFTER",
  "waitingCountFinal": "$WAITING_COUNT_FINAL",
  "activeCountBefore": "$ACTIVE_COUNT_BEFORE",
  "activeCountAfter": "$ACTIVE_COUNT_AFTER",
  "activeCountFinal": "$ACTIVE_COUNT_FINAL",
  "invariant": "public registration and waiting admission do not change activeCount"
}
JSON

cp "$OUT_JSON" "$OUT_CURRENT"

echo
echo "=== [g] proof artifact ==="
cat "$OUT_JSON" | python3 -m json.tool

echo
echo "[ok] local candidate registry deploy/register/waiting proof green"
