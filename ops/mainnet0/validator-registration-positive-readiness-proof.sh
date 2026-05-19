#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

export PATH="$HOME/.foundry/bin:$PATH"

BASE="${BASE:-http://127.0.0.1:4100}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-validator-positive-readiness-proof.$STAMP}"

wait_ready_stable() {
  local out="$1"
  local good=0

  for i in $(seq 1 120); do
    if curl -fsS "$BASE/__void/ready.json" > "$out" 2>"$out.err"; then
      if python3 -c 'import json,sys; j=json.load(open(sys.argv[1])); assert j.get("ready") is True, j; assert int(j.get("head") or 0) > 0, j; assert int(j.get("gap") or 0) == 0, j; assert int(j.get("txroot_live") or 0) == 1, j; print(j)' "$out"; then
        good=$((good+1))
      else
        good=0
      fi
    else
      good=0
    fi

    if [ "$good" -ge 3 ]; then
      echo "[ok] ready/gap/txroot stable"
      return 0
    fi

    sleep 1
  done

  echo "[ERR] node readiness did not stabilize"
  cat "$out" 2>/dev/null || true
  cat "$out.err" 2>/dev/null || true
  return 1
}
# POSITIVE_READINESS_WAIT_READY_V1

mkdir -p "$OUT"
chmod 700 "$OUT"
umask 077

SIGNER_FILE="$OUT/live-signer.pk"
PROOF_PK_FILE="$OUT/proof-wallet.pk"
PROOF_PASSPHRASE_FILE="$OUT/proof-wallet.passphrase"
IMPORT_PAYLOAD="$OUT/import.payload.json"
UNLOCK_PAYLOAD="$OUT/unlock.payload.json"

cleanup() {
  set +e
  systemctl --user unset-environment \
    VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE \
    VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE >/dev/null 2>&1 || true
  rm -f "$SIGNER_FILE" "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE" "$IMPORT_PAYLOAD" "$UNLOCK_PAYLOAD" >/dev/null 2>&1 || true
  systemctl --user restart void-node.service >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== validator registration positive-readiness proof ==="
echo "base=$BASE"
echo "out=$OUT"

echo
echo "=== [a] build + baseline restart ==="
npm run build
systemctl --user unset-environment \
  VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE \
  VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE \
  VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION >/dev/null 2>&1 || true
systemctl --user restart void-node.service
wait_ready_stable "$OUT/ready.baseline.json"

echo
echo "=== [b] baseline ready ==="
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
echo "=== [c] create temporary proof wallet private key without printing it ==="
python3 - "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE" <<'PY'
import secrets, sys
pk_path, pass_path = sys.argv[1], sys.argv[2]
pk = "0x" + secrets.token_hex(32)
pw = "void-positive-readiness-proof-" + secrets.token_hex(24)
open(pk_path, "w").write(pk)
open(pass_path, "w").write(pw)
PY
chmod 600 "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE"

ACC="$(cast wallet address "$(cat "$PROOF_PK_FILE")")"
printf '%s' "$ACC" > "$OUT/proof-account.txt"
echo "proof_account=$ACC"
echo "[ok] temporary proof account derived; private key not printed"

echo
echo "=== [d] baseline live-submit status for proof account is kill-switched ==="
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
blockers = j.get("blockers") or []
assert "live_execution_kill_switch_off" in blockers, j
st = j.get("status") or {}
assert st.get("live_execution_enabled") is False, j
assert st.get("proof_status_mode") in (False, None), j
print("[ok] baseline status remains kill-switched")
PY

echo
echo "=== [e] import temporary proof wallet into native wallet store ==="
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
addr = str(j.get("address") or j.get("wallet") or j.get("wallet_address") or "")
assert addr.lower() == acc, j
print("[ok] temporary proof wallet imported")
PY

echo
echo "=== [f] unlock temporary proof wallet ==="
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
addr = str(j.get("address") or j.get("wallet") or j.get("wallet_address") or "")
assert addr.lower() == acc, j
print("[ok] temporary proof wallet unlocked")
PY

echo
echo "=== [g] wallet authority becomes ready for proof account ==="
curl -fsS "$BASE/__void/participant/validator-registration/wallet-authority?account=$ACC" > "$OUT/wallet-authority.ready.json"
cat "$OUT/wallet-authority.ready.json"
echo
python3 - "$OUT/wallet-authority.ready.json" "$ACC" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
acc=sys.argv[2].lower()
wa=j.get("wallet_authority") or {}
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert wa.get("has_wallet") is True, j
assert wa.get("wallet_unlocked") is True, j
assert wa.get("account_match") is True, j
assert str(wa.get("wallet_address","")).lower() == acc, j
assert wa.get("ready_for_live_submit") is True, j
print("[ok] wallet authority ready")
PY

echo
echo "=== [h] prepare signer file from same temporary key, without printing it ==="
cp "$PROOF_PK_FILE" "$SIGNER_FILE"
chmod 600 "$SIGNER_FILE"
DERIVED="$(cast wallet address "$(cat "$SIGNER_FILE")")"
if [ "${DERIVED,,}" != "${ACC,,}" ]; then
  echo "[ERR] signer file does not match proof account"
  exit 1
fi
echo "[ok] signer file matches proof account; private key not printed"

echo
echo "=== [i] enable status-only proof mode; keep live execution disabled ==="
systemctl --user set-environment \
  VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE=1 \
  VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE="$SIGNER_FILE"
systemctl --user unset-environment VOID_VALIDATOR_REGISTRATION_LIVE_EXECUTION >/dev/null 2>&1 || true

systemctl --user restart void-node.service
sleep 3

echo
echo "=== [i2] unlock temporary proof wallet again after proof-mode restart ==="
python3 - "$ACC" "$PROOF_PASSPHRASE_FILE" "$UNLOCK_PAYLOAD" <<'PY2'
import json, sys
acc, pass_file, out = sys.argv[1:]
payload = {
  "account": acc,
  "passphrase": open(pass_file).read().strip()
}
open(out, "w").write(json.dumps(payload))
PY2
chmod 600 "$UNLOCK_PAYLOAD"

HTTP_UNLOCK_AFTER_RESTART="$(curl -sS -o "$OUT/wallet-unlock.after-proof-restart.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d @"$UNLOCK_PAYLOAD" \
  "$BASE/__void/participant/wallet/unlock" || true)"

rm -f "$UNLOCK_PAYLOAD"

echo "wallet_unlock_after_restart_http=$HTTP_UNLOCK_AFTER_RESTART"
cat "$OUT/wallet-unlock.after-proof-restart.json"
echo

python3 - "$OUT/wallet-unlock.after-proof-restart.json" "$HTTP_UNLOCK_AFTER_RESTART" "$ACC" <<'PY2'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
acc=sys.argv[3].lower()
assert http == "200", (http, j)
assert j.get("ok") is True, j
assert j.get("unlocked") is True, j
addr = str(j.get("address") or j.get("wallet") or j.get("wallet_address") or "")
assert addr.lower() == acc, j
print("[ok] temporary proof wallet unlocked after proof-mode restart")
PY2

echo
echo "=== [j] proof-mode status becomes ready_for_proof_submit ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC&proof_status_mode=1" > "$OUT/status.proof-mode.json"
cat "$OUT/status.proof-mode.json"
echo
python3 - "$OUT/status.proof-mode.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))

assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("ready_for_proof_submit") is True, j

blockers = j.get("blockers") or []
for bad in [
  "live_execution_kill_switch_off",
  "wallet_authority_not_ready",
  "missing_live_signer_pk_file",
  "live_signer_account_mismatch",
  "submit_payload_not_ready"
]:
    assert bad not in blockers, (bad, j)

st = j.get("status") or {}
assert st.get("live_execution_enabled") is False, j
assert st.get("proof_status_mode") is True, j
assert st.get("status_gate_enabled") is True, j
assert st.get("signer_file_configured") is True, j
assert st.get("signer_file_present") is True, j
assert st.get("signer_key_valid_format") is True, j
assert st.get("signer_matches_account") is True, j
assert st.get("wallet_authority_ready") is True, j
assert st.get("payload_ready") is True, j
assert st.get("payload_http") == 501, j

# status JSON must not expose private key material
bad_keys = {"pk", "private_key", "privatekey", "signer_pk", "signerprivatekey"}
def walk(x, path=""):
    if isinstance(x, dict):
        for k,v in x.items():
            lk=str(k).lower()
            assert lk not in bad_keys, (path, k, "sensitive-looking key present", j)
            walk(v, path + "." + str(k))
    elif isinstance(x, list):
        for i,v in enumerate(x):
            walk(v, path + f"[{i}]")
walk(j)

print("[ok] proof-mode status proves wallet + signer + payload readiness without live execution")
PY

echo
echo "=== [k] actual submit-live still refuses broadcast because kill switch remains off ==="
HTTP="$(curl -sS -o "$OUT/submit-live.still-killswitched.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live" || true)"
echo "http=$HTTP"
cat "$OUT/submit-live.still-killswitched.json"
echo
python3 - "$OUT/submit-live.still-killswitched.json" "$HTTP" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http == "501", (http, j)
assert j.get("ok") is False, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("live_execution_wired") is False, j
assert j.get("submit_blocked_reason") == "live_execution_kill_switch_off", j
g=j.get("gates") or {}
assert g.get("live_execution_enabled") is False, j
assert g.get("tx_broadcast") is False, j
assert g.get("receipt_status_1") is False, j
print("[ok] submit-live remains kill-switched even while proof-mode status is ready")
PY

echo
echo "=== [l] double-submit guard still did not reserve ==="
curl -fsS "$BASE/__void/participant/validator-registration/double-submit-guard/status" > "$OUT/double-guard.after-positive.json"
cat "$OUT/double-guard.after-positive.json"
echo
python3 - "$OUT/double-guard.after-positive.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert int(j.get("reserves", -1)) == 0, j
assert int(j.get("reservedCount", -1)) == 0, j
print("[ok] positive status proof did not reserve a submit intent")
PY

echo
echo "=== [m] cleanup proof env and prove default state restored ==="
systemctl --user unset-environment \
  VOID_VALIDATOR_REGISTRATION_STATUS_PROOF_MODE \
  VOID_VALIDATOR_REGISTRATION_LIVE_SIGNER_PK_FILE >/dev/null 2>&1 || true
rm -f "$SIGNER_FILE" "$PROOF_PK_FILE" "$PROOF_PASSPHRASE_FILE"
systemctl --user restart void-node.service
sleep 3

curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$OUT/status.restored.json"
cat "$OUT/status.restored.json"
echo
python3 - "$OUT/status.restored.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("ready_for_proof_submit") is False, j
blockers = j.get("blockers") or []
assert "live_execution_kill_switch_off" in blockers, j
st=j.get("status") or {}
assert st.get("live_execution_enabled") is False, j
assert st.get("proof_status_mode") in (False, None), j
print("[ok] default kill-switched state restored")
PY

echo
echo "=== [n] final ready ==="
wait_ready_stable "$OUT/ready.final.json"
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
  "kind": "validator_registration_positive_readiness_proof",
  "proof_account": "$ACC",
  "proof_status_mode_ready": true,
  "live_execution_enabled": false,
  "submit_live_still_killswitched": true,
  "mutation": false,
  "sends_transaction": false,
  "double_submit_reserved": false,
  "default_restored": true
}
JSON

echo
echo "=== [o] summary ==="
cat "$OUT/summary.json"

echo
echo "[ok] validator registration positive-readiness proof green"
