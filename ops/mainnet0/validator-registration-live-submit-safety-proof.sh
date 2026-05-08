#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/void-validator-live-submit-safety-proof.$STAMP}"

mkdir -p "$OUT"

echo "=== validator registration live-submit safety proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] node ready ==="
READY_RC=1
for i in $(seq 1 45); do
  if curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.before.json.tmp" 2>/tmp/void-live-submit-ready-before.err; then
    mv "$OUT/ready.before.json.tmp" "$OUT/ready.before.json"
    READY_RC=0
    break
  fi
  sleep 1
done

if [ "$READY_RC" -ne 0 ]; then
  echo "[ERR] node did not become ready after restart"
  cat /tmp/void-live-submit-ready-before.err 2>/dev/null || true
  systemctl --user status void-node.service --no-pager -l | sed -n "1,100p" || true
  false
fi

cat "$OUT/ready.before.json"
echo
python3 - "$OUT/ready.before.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] node ready")
PY

echo
echo "=== [c] wallet authority is read-only and account-scoped ==="
curl -fsS "$BASE/__void/participant/validator-registration/wallet-authority?account=$ACC" > "$OUT/wallet-authority.json"
cat "$OUT/wallet-authority.json"
echo
python3 - "$OUT/wallet-authority.json" "$ACC" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
acc=sys.argv[2].lower()
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
wa=j.get("wallet_authority") or {}
assert wa.get("status_checked") is True, j
assert wa.get("has_wallet") is True, j
assert wa.get("account_match") is True, j
assert str(wa.get("wallet_address","")).lower() == acc, j
print("[ok] wallet authority is read-only and scoped to account")
PY

echo
echo "=== [d] live-submit status is read-only and kill-switched ==="
curl -fsS "$BASE/__void/participant/validator-registration/live-submit-status?account=$ACC" > "$OUT/live-submit-status.json"
cat "$OUT/live-submit-status.json"
echo
python3 - "$OUT/live-submit-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))

assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("ready_for_proof_submit") is False, j

blockers = j.get("blockers") or []
assert "live_execution_kill_switch_off" in blockers, j

status = j.get("status") or {}
assert status.get("live_execution_enabled") is False, j
assert status.get("payload_ready") is True, j
assert status.get("payload_http") == 501, j

# Do not allow accidental private-key material in the public status JSON.
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

print("[ok] live-submit status is read-only, kill-switched, and does not expose signer secrets")
PY

echo
echo "=== [e] double-submit guard starts non-executing ==="
curl -fsS "$BASE/__void/participant/validator-registration/double-submit-guard/status" > "$OUT/double-guard.before.json"
cat "$OUT/double-guard.before.json"
echo
python3 - "$OUT/double-guard.before.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("live_execution_wired") is False, j
print("[ok] double-submit guard status is non-executing")
PY

echo
echo "=== [f] correct-chain submit-live refuses mutation by default ==="
HTTP="$(curl -sS -o "$OUT/submit-live.default.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live" || true)"
echo "http=$HTTP"
cat "$OUT/submit-live.default.json"
echo
python3 - "$OUT/submit-live.default.json" "$HTTP" <<'PY'
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
assert g.get("valid_account") is True, j
assert g.get("chain_id_is_2050") is True, j
assert g.get("live_execution_enabled") is False, j
assert g.get("tx_broadcast") is False, j
assert g.get("receipt_status_1") is False, j
print("[ok] submit-live refuses mutation while kill switch is off")
PY

echo
echo "=== [g] wrong-chain submit-live rejects before mutation ==="
HTTP_BAD="$(curl -sS -o "$OUT/submit-live.wrong-chain.json" -w '%{http_code}' \
  --max-time 10 \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":1}" \
  "$BASE/__void/participant/validator-registration/submit-live" || true)"
echo "http=$HTTP_BAD"
cat "$OUT/submit-live.wrong-chain.json"
echo
python3 - "$OUT/submit-live.wrong-chain.json" "$HTTP_BAD" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
http=sys.argv[2]
assert http == "409", (http, j)
assert j.get("ok") is False, j
assert j.get("error") == "wrong_chain", j
assert j.get("expectedChainId") == 2050, j
assert j.get("requestedChainId") == 1, j
assert j.get("mutation") is False, j
assert j.get("sends_transaction") is False, j
assert j.get("submit_allowed") is False, j
assert j.get("submit_blocked_reason") == "wrong_chain", j
print("[ok] wrong-chain submit-live rejects non-mutating")
PY

echo
echo "=== [h] double-submit guard did not reserve during blocked submit-live attempts ==="
curl -fsS "$BASE/__void/participant/validator-registration/double-submit-guard/status" > "$OUT/double-guard.after.json"
cat "$OUT/double-guard.after.json"
echo
python3 - "$OUT/double-guard.before.json" "$OUT/double-guard.after.json" <<'PY'
import json, sys
before=json.load(open(sys.argv[1]))
after=json.load(open(sys.argv[2]))

assert after.get("ok") is True, after
assert after.get("mutation") is False, after
assert after.get("sends_transaction") is False, after
assert after.get("submit_allowed") is False, after
assert after.get("live_execution_wired") is False, after

assert int(after.get("reserves", -1)) == int(before.get("reserves", -2)), (before, after)
assert int(after.get("reservedCount", -1)) == int(before.get("reservedCount", -2)), (before, after)
assert int(after.get("duplicates", -1)) == int(before.get("duplicates", -2)), (before, after)

print("[ok] blocked submit-live attempts did not reserve double-submit intent")
PY

echo
echo "=== [i] participant UI remains guarded by default ==="
HTML="$OUT/participant.html"
curl -fsS "$BASE/participant?account=$ACC" > "$HTML"

for needle in \
  'id="validatorRegistrationSubmitLiveBtn" type="button" disabled' \
  'id="validatorRegistrationSubmitDisabledBtn" type="button" disabled' \
  'Submit Registration — Backend Gated' \
  'Submit Registration — Not Live' \
  '/__void/participant/validator-registration/live-submit-status' \
  '/__void/participant/validator-registration/submit-live' \
  'Submit validator registration now?' \
  'Backend-gated submit is blocked'
do
  grep -q "$needle" "$HTML"
  echo "[ok] html contains $needle"
done

echo
echo "=== [j] final ready ==="
curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.after.json"
cat "$OUT/ready.after.json"
echo
python3 - "$OUT/ready.after.json" <<'PY'
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
  "kind": "validator_registration_live_submit_safety_proof",
  "base": "$BASE",
  "account": "$ACC",
  "mutation": false,
  "sends_transaction": false,
  "submit_live_default_http": 501,
  "wrong_chain_http": 409,
  "kill_switch_required": true,
  "double_submit_guard_reserved_during_blocked_submit": false,
  "ui_buttons_disabled_by_default": true
}
JSON

echo
echo "=== [k] summary ==="
cat "$OUT/summary.json"

echo
echo "[ok] validator registration live-submit safety proof green"
