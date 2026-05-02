#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"
export PATH="$HOME/.foundry/bin:$PATH"

BASE="${BASE:-http://127.0.0.1:4100}"
RPC="${RPC:-http://127.0.0.1:8545}"
EXPECTED_CHAIN_ID="${EXPECTED_CHAIN_ID:-2050}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-validator-controlled-live-execution-proof.$STAMP}"

mkdir -p "$OUT"
chmod 700 "$OUT"
umask 077

SIGNER_FILE="$OUT/live-signer.pk"
PROOF_PK_FILE="$OUT/proof-wallet.pk"
PROOF_PASSPHRASE_FILE="$OUT/proof-wallet.passphrase"
IMPORT_PAYLOAD="$OUT/import.payload.json"
UNLOCK_PAYLOAD="$OUT/unlock.payload.json"
SUBMIT_PAYLOAD="$OUT/submit-live.payload.json"

ANVIL_PID_FILE="$OUT/anvil.pid"
ANVIL_LOG="$OUT/anvil.log"

cleanup() {
  set +e
  systemctl --user unset-environment \
    VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION \
    VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE \
    VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE \
    VOID_VALIDATOR_REGISTRATION_RPC_URL \
    VOID_RPC_URL \
    RPC_URL >/dev/null 2>&1 || true

  if [ -s "${PROOF_ACCOUNT_FILE:-}" ]; then
    ACC_CLEAN="$(cat "$PROOF_ACCOUNT_FILE" 2>/dev/null || true)"
    if [ -n "$ACC_CLEAN" ]; then
      curl -sS -o /dev/null \
        -H 'content-type: application/json' \
        -d "{\"account\":\"$ACC_CLEAN\"}" \
        "$BASE/__void/participant/wallet/lock" >/dev/null 2>&1 || true
    fi
  fi

  rm -f "$SIGNER_FILE" "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE" "$IMPORT_PAYLOAD" "$UNLOCK_PAYLOAD" "$SUBMIT_PAYLOAD" >/dev/null 2>&1 || true
  systemctl --user restart void-node.service >/dev/null 2>&1 || true
  for i in $(seq 1 45); do
    curl -fsS "$BASE/__void/ready.json" >/dev/null 2>&1 && break
    sleep 1
  done
}
trap cleanup EXIT

wait_node_ready_after_restart() {
  local label="${1:-restart}"
  local tmp="$OUT/ready-after-${label}.json"

  echo "[wait] node ready after $label"
  for i in $(seq 1 45); do
    if curl -fsS "$BASE/__void/ready.json" > "$tmp" 2>/dev/null; then
      if python3 - "$tmp" <<'PY2' >/dev/null 2>&1
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
PY2
      then
        cat "$tmp"
        echo
        echo "[ok] node ready after $label"
        return 0
      fi
    fi
    sleep 1
  done

  echo "[ERR] node did not become ready after $label"
  cat "$tmp" 2>/dev/null || true
  return 1
}


PROOF_ACCOUNT_FILE="$OUT/proof-account.txt"

echo "=== validator registration controlled live execution proof ==="
echo "base=$BASE"
echo "rpc=$RPC"
echo "out=$OUT"

echo
echo "=== [a] build + baseline cleanup/restart ==="
npm run build
systemctl --user unset-environment \
  VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION \
  VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE \
  VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE \
  VOID_VALIDATOR_REGISTRATION_RPC_URL \
  VOID_RPC_URL \
  RPC_URL >/dev/null 2>&1 || true
systemctl --user restart void-node.service
wait_node_ready_after_restart "restart"

echo
echo "=== [b] baseline node ready ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.baseline.json"
cat "$OUT/ready.baseline.json"
echo
python3 - "$OUT/ready.baseline.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] baseline node ready")
PY

echo
echo "=== [c] ensure localhost-only disposable RPC ==="
if cast chain-id --rpc-url "$RPC" >/tmp/void-controlled-rpc-chainid.txt 2>/tmp/void-controlled-rpc.err; then
  echo "[ok] RPC already responds: chainId=$(cat /tmp/void-controlled-rpc-chainid.txt)"
else
  echo "[warn] RPC not responding; starting localhost-only Anvil"
  nohup anvil \
    --host 127.0.0.1 \
    --port 8545 \
    --chain-id "$EXPECTED_CHAIN_ID" \
    --block-time 2 \
    --gas-limit 200000000 \
    > "$ANVIL_LOG" 2>&1 &
  echo "$!" > "$ANVIL_PID_FILE"

  ok=0
  for _ in $(seq 1 30); do
    if cast chain-id --rpc-url "$RPC" >/tmp/void-controlled-rpc-chainid.txt 2>/tmp/void-controlled-rpc.err; then
      ok=1
      break
    fi
    sleep 1
  done

  if [ "$ok" != "1" ]; then
    echo "[ERR] disposable RPC did not become ready"
    cat "$ANVIL_LOG" || true
    cat /tmp/void-controlled-rpc.err || true
    exit 1
  fi
fi

SS8545="$(ss -H -ltnp | grep -E ':8545\b' || true)"
printf '%s\n' "$SS8545"
if printf '%s\n' "$SS8545" | grep -Eq '0\.0\.0\.0:8545|\[::\]:8545|:::8545'; then
  echo "[ERR] RPC appears exposed beyond localhost"
  exit 1
fi

CHAIN_ID="$(cast chain-id --rpc-url "$RPC")"
echo "chainId=$CHAIN_ID"
test "$CHAIN_ID" = "$EXPECTED_CHAIN_ID"
echo "[ok] disposable RPC chain/bind safe"

echo
echo "=== [d] fund known local deploy proof wallets ==="
DEPLOYER="0x0d66fCDf95d38f7Db6B4206BF183f34cD816C2AA"
LEGACY_CANDIDATE="0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55"
BAL_HEX="$(python3 - <<'PY'
print(hex(10000 * 10**18))
PY
)"
cast rpc --rpc-url "$RPC" anvil_setBalance "$DEPLOYER" "$BAL_HEX" >/dev/null
cast rpc --rpc-url "$RPC" anvil_setBalance "$LEGACY_CANDIDATE" "$BAL_HEX" >/dev/null
echo "[ok] deployer and legacy candidate funded on disposable RPC"

echo
echo "=== [e] deploy fresh local candidate registry artifact ==="
RPC="$RPC" bash ops/mainnet0/validator-candidate-registry-local-deploy-proof.sh > "$OUT/local-deploy-proof.log" 2>&1 || {
  echo "[ERR] local deploy proof failed"
  tail -200 "$OUT/local-deploy-proof.log" || true
  exit 1
}
tail -120 "$OUT/local-deploy-proof.log"

echo
echo "=== [f] restart node to load fresh artifact ==="
systemctl --user restart void-node.service
wait_node_ready_after_restart "restart"

curl -fsS "$BASE/__void/mainnet0/validator-candidate-registry/status" > "$OUT/registry-status.json"
cat "$OUT/registry-status.json"
echo

python3 - "$OUT/registry-status.json" > "$OUT/registry.env" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("invariant_ok") is True, j
assert j.get("public_registration_mutates_active_set") is False, j
reg=j.get("registry")
assert isinstance(reg, str) and reg.startswith("0x") and len(reg)==42, j
print(f"REGISTRY={reg}")
PY

. "$OUT/registry.env"
echo "registry=$REGISTRY"

echo
echo "=== [g] create temporary proof wallet/private key without printing it ==="
python3 - "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE" <<'PY'
import secrets, sys
pk_path, pass_path = sys.argv[1], sys.argv[2]
pk = "0x" + secrets.token_hex(32)
pw = "void-controlled-live-execution-proof-" + secrets.token_hex(24)
open(pk_path, "w").write(pk)
open(pass_path, "w").write(pw)
PY
chmod 600 "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE"

ACC="$(cast wallet address "$(cat "$PROOF_PK_FILE")")"
printf '%s' "$ACC" > "$PROOF_ACCOUNT_FILE"
echo "proof_account=$ACC"
echo "[ok] temp proof account derived; private key not printed"

echo
echo "=== [h] fund temporary proof account for 1000 VOID stake + gas ==="
cast rpc --rpc-url "$RPC" anvil_setBalance "$ACC" "$BAL_HEX" >/dev/null
echo "proof_account_balance=$(cast balance --rpc-url "$RPC" "$ACC")"

echo
echo "=== [i] baseline status for proof account is blocked ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$OUT/status.baseline.json"
cat "$OUT/status.baseline.json"
echo
python3 - "$OUT/status.baseline.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("ready_for_proof_submit") is False, j
assert "live_execution_kill_switch_off" in (j.get("blockers") or []), j
print("[ok] baseline status blocked")
PY

echo
echo "=== [j] import + unlock temporary proof wallet ==="
python3 - "$ACC" "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE" "$IMPORT_PAYLOAD" <<'PY'
import json, sys
acc, pk_file, pass_file, out = sys.argv[1:]
payload = {
  "account": acc,
  "private_key": open(pk_file).read().strip(),
  "passphrase": open(pass_file).read().strip()
}
open(out, "w").write(json.dumps(payload))
PY
chmod 600 "$IMPORT_PAYLOAD"

HTTP_IMPORT="$(curl -sS -o "$OUT/wallet-import.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d @"$IMPORT_PAYLOAD" \
  "$BASE/__void/participant/wallet/import" || true)"
rm -f "$IMPORT_PAYLOAD"

echo "wallet_import_http=$HTTP_IMPORT"
cat "$OUT/wallet-import.json"
echo
python3 - "$OUT/wallet-import.json" "$HTTP_IMPORT" "$ACC" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
acc=sys.argv[3].lower()
assert http == "200", (http, j)
assert j.get("ok") is True, j
addr=str(j.get("address") or "")
assert addr.lower() == acc, j
print("[ok] temporary proof wallet imported")
PY

python3 - "$ACC" "$PROOF_PASSPHRASE_FILE" "$UNLOCK_PAYLOAD" <<'PY'
import json, sys
acc, pass_file, out = sys.argv[1:]
payload = {
  "account": acc,
  "passphrase": open(pass_file).read().strip()
}
open(out, "w").write(json.dumps(payload))
PY
chmod 600 "$UNLOCK_PAYLOAD"

HTTP_UNLOCK="$(curl -sS -o "$OUT/wallet-unlock.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d @"$UNLOCK_PAYLOAD" \
  "$BASE/__void/participant/wallet/unlock" || true)"
rm -f "$UNLOCK_PAYLOAD"

echo "wallet_unlock_http=$HTTP_UNLOCK"
cat "$OUT/wallet-unlock.json"
echo
python3 - "$OUT/wallet-unlock.json" "$HTTP_UNLOCK" "$ACC" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
acc=sys.argv[3].lower()
assert http == "200", (http, j)
assert j.get("ok") is True, j
assert j.get("unlocked") is True, j
addr=str(j.get("address") or "")
assert addr.lower() == acc, j
print("[ok] temporary proof wallet unlocked")
PY

echo
echo "=== [k] prepare signer file from same temp key ==="
cp "$PROOF_PK_FILE" "$SIGNER_FILE"
chmod 600 "$SIGNER_FILE"

DERIVED="$(cast wallet address "$(cat "$SIGNER_FILE")")"
if [ "${DERIVED,,}" != "${ACC,,}" ]; then
  echo "[ERR] signer file does not match proof account"
  exit 1
fi
echo "[ok] signer file matches proof account; private key not printed"

echo
echo "=== [l] read contract counts before live submit ==="
candidate_before="$(cast call --rpc-url "$RPC" "$REGISTRY" "candidateCount()(uint256)")"
waiting_before="$(cast call --rpc-url "$RPC" "$REGISTRY" "waitingCount()(uint256)")"
active_before="$(cast call --rpc-url "$RPC" "$REGISTRY" "activeCount()(uint256)")"

echo "candidate_before=$candidate_before"
echo "waiting_before=$waiting_before"
echo "active_before=$active_before"

echo
echo "=== [m] enable controlled live execution env ==="
systemctl --user set-environment \
  VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION=1 \
  VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE="$SIGNER_FILE" \
  VOID_VALIDATOR_REGISTRATION_RPC_URL="$RPC" \
  VOID_RPC_URL="$RPC" \
  RPC_URL="$RPC"
systemctl --user unset-environment VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE >/dev/null 2>&1 || true

systemctl --user restart void-node.service
wait_node_ready_after_restart "restart"

echo
echo "=== [n] unlock temp wallet again after live-execution restart ==="
python3 - "$ACC" "$PROOF_PASSPHRASE_FILE" "$UNLOCK_PAYLOAD" <<'PY'
import json, sys
acc, pass_file, out = sys.argv[1:]
payload = {
  "account": acc,
  "passphrase": open(pass_file).read().strip()
}
open(out, "w").write(json.dumps(payload))
PY
chmod 600 "$UNLOCK_PAYLOAD"

HTTP_UNLOCK2="$(curl -sS -o "$OUT/wallet-unlock.after-live-restart.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d @"$UNLOCK_PAYLOAD" \
  "$BASE/__void/participant/wallet/unlock" || true)"
rm -f "$UNLOCK_PAYLOAD"

echo "wallet_unlock_after_live_restart_http=$HTTP_UNLOCK2"
cat "$OUT/wallet-unlock.after-live-restart.json"
echo
python3 - "$OUT/wallet-unlock.after-live-restart.json" "$HTTP_UNLOCK2" "$ACC" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
acc=sys.argv[3].lower()
assert http == "200", (http, j)
assert j.get("ok") is True, j
assert j.get("unlocked") is True, j
addr=str(j.get("address") or "")
assert addr.lower() == acc, j
print("[ok] wallet unlocked after live-execution restart")
PY

echo
echo "=== [o] live-submit-status must be ready under real live execution ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$OUT/status.live-ready.json"
cat "$OUT/status.live-ready.json"
echo
python3 - "$OUT/status.live-ready.json" "$ACC" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
acc=sys.argv[2].lower()
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("ready_for_proof_submit") is True, j
assert (j.get("blockers") or []) == [], j
st=j.get("status") or {}
assert st.get("live_execution_enabled") is True, j
assert st.get("proof_status_mode") is False, j
assert st.get("status_gate_enabled") is True, j
assert st.get("signer_matches_account") is True, j
assert str(st.get("signer_address","")).lower() == acc, j
assert st.get("wallet_authority_ready") is True, j
assert st.get("payload_ready") is True, j
assert st.get("payload_http") == 501, j
print("[ok] real live-execution status is ready")
PY

echo
echo "=== [p] execute submit-live once ==="
python3 - "$ACC" "$SUBMIT_PAYLOAD" <<'PY'
import json, sys
acc, out = sys.argv[1:]
open(out, "w").write(json.dumps({"account": acc, "chainId": 2050}))
PY
chmod 600 "$SUBMIT_PAYLOAD"

HTTP_SUBMIT="$(curl -sS -o "$OUT/submit-live.success.json" -w '%{http_code}' \
  --max-time 180 \
  -H 'content-type: application/json' \
  -d @"$SUBMIT_PAYLOAD" \
  "$BASE/__void/participant/validator-registration/submit-live" || true)"
rm -f "$SUBMIT_PAYLOAD"

echo "submit_live_http=$HTTP_SUBMIT"
cat "$OUT/submit-live.success.json"
echo

python3 - "$OUT/submit-live.success.json" "$HTTP_SUBMIT" <<'PY'
import json, sys, re
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http in ("200", "201"), (http, j)
assert j.get("ok") is True, j
assert j.get("mutation") is True, j
assert j.get("sends_transaction") is True, j
assert j.get("submit_allowed") is True, j
tx = str(j.get("transactionHash") or j.get("txHash") or j.get("tx_hash") or "")
assert re.fullmatch(r"0x[0-9a-fA-F]{64}", tx), j
receipt = j.get("receipt") or {}
status = str(j.get("receiptStatus") or j.get("receipt_status") or receipt.get("status") or "")
assert status in ("1", "0x1", "success", "true", "True"), j
print("[ok] submit-live broadcast succeeded with receipt status=1")
PY

echo
echo "=== [q] contract counts after live submit ==="
candidate_after="$(cast call --rpc-url "$RPC" "$REGISTRY" "candidateCount()(uint256)")"
waiting_after="$(cast call --rpc-url "$RPC" "$REGISTRY" "waitingCount()(uint256)")"
active_after="$(cast call --rpc-url "$RPC" "$REGISTRY" "activeCount()(uint256)")"

echo "candidate_after=$candidate_after"
echo "waiting_after=$waiting_after"
echo "active_after=$active_after"

python3 - "$candidate_before" "$candidate_after" "$waiting_before" "$waiting_after" "$active_before" "$active_after" <<'PY'
import sys
cb, ca, wb, wa, ab, aa = [int(x) for x in sys.argv[1:]]
assert ca == cb + 1, (cb, ca)
assert wa == wb, (wb, wa)
assert aa == ab, (ab, aa)
print("[ok] candidateCount increased by 1; waitingCount unchanged; activeCount unchanged")
PY

echo
echo "=== [r] double-submit guard reserved exactly one live intent ==="
curl -fsS "$BASE/__void/participant/validator-registration/double-submit-guard/status" > "$OUT/double-guard.after-success.json"
cat "$OUT/double-guard.after-success.json"
echo
python3 - "$OUT/double-guard.after-success.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
# The guard status route is itself read-only/non-executing, so live_execution_wired may remain false here.
# The successful submit-live response already proves live execution was wired for the transaction path.
assert int(j.get("reserves", -1)) == 1, j
assert int(j.get("reservedCount", -1)) == 1, j
assert int(j.get("calls", -1)) >= 1, j
print("[ok] double-submit guard reserved one intent")
PY

echo
echo "=== [s] duplicate submit should not broadcast ==="
python3 - "$ACC" "$SUBMIT_PAYLOAD" <<'PY'
import json, sys
acc, out = sys.argv[1:]
open(out, "w").write(json.dumps({"account": acc, "chainId": 2050}))
PY
chmod 600 "$SUBMIT_PAYLOAD"

HTTP_DUP="$(curl -sS -o "$OUT/submit-live.duplicate.json" -w '%{http_code}' \
  --max-time 60 \
  -H 'content-type: application/json' \
  -d @"$SUBMIT_PAYLOAD" \
  "$BASE/__void/participant/validator-registration/submit-live" || true)"
rm -f "$SUBMIT_PAYLOAD"

echo "duplicate_submit_http=$HTTP_DUP"
cat "$OUT/submit-live.duplicate.json"
echo

python3 - "$OUT/submit-live.duplicate.json" "$HTTP_DUP" "$candidate_after" "$waiting_after" "$active_after" "$REGISTRY" "$RPC" <<'PY'
import json, sys, subprocess
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
candidate_after=int(sys.argv[3])
waiting_after=int(sys.argv[4])
active_after=int(sys.argv[5])
reg=sys.argv[6]
rpc=sys.argv[7]

assert http in ("409", "423", "500"), (http, j)
assert j.get("ok") is False, j
assert j.get("sends_transaction") is not True, j
assert j.get("submit_allowed") is not True, j

def call(sig):
    return int(subprocess.check_output(["cast", "call", "--rpc-url", rpc, reg, sig], text=True).strip())

assert call("candidateCount()(uint256)") == candidate_after, j
assert call("waitingCount()(uint256)") == waiting_after, j
assert call("activeCount()(uint256)") == active_after, j
print("[ok] duplicate submit did not change candidate/waiting/active counts")
PY

echo
echo "=== [t] disable live execution and restore default kill-switched state ==="
systemctl --user unset-environment \
  VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION \
  VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE \
  VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE \
  VOID_VALIDATOR_REGISTRATION_RPC_URL \
  VOID_RPC_URL \
  RPC_URL >/dev/null 2>&1 || true
rm -f "$SIGNER_FILE" "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE"
systemctl --user restart void-node.service
wait_node_ready_after_restart "restart"

curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$OUT/status.restored.json"
cat "$OUT/status.restored.json"
echo
python3 - "$OUT/status.restored.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("ready_for_proof_submit") is False, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert "live_execution_kill_switch_off" in (j.get("blockers") or []), j
st=j.get("status") or {}
assert st.get("live_execution_enabled") is False, j
assert st.get("proof_status_mode") in (False, None), j
print("[ok] default kill-switched state restored")
PY

echo
echo "=== [u] final ready ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.final.json"
cat "$OUT/ready.final.json"
echo
python3 - "$OUT/ready.final.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] final node ready")
PY

cat > "$OUT/summary.json" <<JSON
{
  "ok": true,
  "kind": "validator_registration_controlled_live_execution_proof",
  "rpc": "$RPC",
  "chainId": "$EXPECTED_CHAIN_ID",
  "registry": "$REGISTRY",
  "proof_account": "$ACC",
  "live_execution_enabled_only_inside_proof": true,
  "receipt_status_1": true,
  "candidate_count_before": "$candidate_before",
  "candidate_count_after": "$candidate_after",
  "waiting_count_before": "$waiting_before",
  "waiting_count_after": "$waiting_after",
  "active_count_before": "$active_before",
  "active_count_after": "$active_after",
  "active_count_unchanged": true,
  "duplicate_submit_non_mutating": true,
  "default_restored": true
}
JSON

echo
echo "=== [v] summary ==="
cat "$OUT/summary.json"

echo
echo "[ok] validator registration controlled live execution proof green"
