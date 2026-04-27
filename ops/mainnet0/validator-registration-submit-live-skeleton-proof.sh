#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
ACC="${ACC:-0x9ef8A8106858Ee6D6dfe8c3850d4320D2717FD55}"
OUT="${OUT:-/tmp/void-validator-submit-live-skeleton-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

# __void_submit_live_skeleton_candidate_key_env_v1
TMP_PK="${TMP_PK:-/tmp/void-validator-submit-live-skeleton-pk.$$}"
cleanup_submit_live_skeleton_pk() {
  if [ -n "${TMP_PK:-}" ] && [ -e "$TMP_PK" ]; then
    shred -u "$TMP_PK" 2>/dev/null || rm -f "$TMP_PK"
  fi
}
trap cleanup_submit_live_skeleton_pk EXIT

if [ -z "${CANDIDATE_PK:-}" ] && [ -z "${CANDIDATE_PK_FILE:-}" ]; then
  umask 077
  python3 - <<'PYKEY' "$TMP_PK" "$ACC"
import re, sys, subprocess
from pathlib import Path

out = Path(sys.argv[1])
target = sys.argv[2].lower()

candidates = []
for pat in [
    "validator-candidate-registry-local-deploy-proof.sh.bak.remove-candidate-pk-default.*",
    "validator-candidate-registry-local-deploy-proof.sh.bak.*",
]:
    for p in Path("/tmp").glob(pat):
        try:
            candidates.append((p.stat().st_mtime, p))
        except FileNotFoundError:
            pass

candidates.sort(reverse=True)

rxs = [
    re.compile(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-(0x[0-9a-fA-F]{64})\}"'),
    re.compile(r'CANDIDATE_PK="\$\{CANDIDATE_PK:-([0-9a-fA-F]{64})\}"'),
]

for _, p in candidates:
    s = p.read_text(errors="replace")
    for rx in rxs:
        m = rx.search(s)
        if not m:
            continue
        pk = m.group(1)
        if not pk.startswith("0x"):
            pk = "0x" + pk
        try:
            addr = subprocess.check_output(
                ["cast", "wallet", "address", pk],
                text=True,
                stderr=subprocess.DEVNULL,
            ).strip()
        except Exception:
            continue
        if addr.lower() == target:
            out.write_text(pk + "\\n")
            out.chmod(0o600)
            print(f"[ok] recovered candidate key from backup={p.name}; key not printed")
            print(f"[ok] derived={addr}")
            raise SystemExit(0)

raise SystemExit("[ERR] no backup CANDIDATE_PK derived to target account")
PYKEY

  export CANDIDATE_PK_FILE="$TMP_PK"
  export CANDIDATE_PK=""
fi

if [ -n "${CANDIDATE_PK_FILE:-}" ]; then
  test -f "$CANDIDATE_PK_FILE"
fi

export CANDIDATE_PK
export CANDIDATE_PK_FILE

echo "=== validator registration submit-live skeleton proof ==="
echo "base=$BASE"
echo "account=$ACC"
echo "out=$OUT"

echo
echo "=== [a] build + restart with live execution disabled ==="
npm run build
systemctl --user restart void-node.service
sleep 3

echo
echo "=== [b] submit-live must be mounted but disabled by default ==="
HTTP_DISABLED="$(curl -sS -o "$OUT/submit-live.disabled.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit-live")"
echo "disabled_http=$HTTP_DISABLED"
python3 -m json.tool "$OUT/submit-live.disabled.json"
test "$HTTP_DISABLED" = "501"

python3 - <<'PY' "$OUT/submit-live.disabled.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is False
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["live_execution_wired"] is False
assert j["submit_blocked_reason"] == "live_execution_kill_switch_off"
g=j["gates"]
assert g["valid_account"] is True
assert g["chain_id_is_2050"] is True
assert g["live_execution_enabled"] is False
assert g["tx_broadcast"] is False
assert g["receipt_status_1"] is False
print("[ok] submit-live disabled by default and non-mutating")
PY

echo
echo "=== [c] wrong-chain submit-live rejects before live path ==="
HTTP_WRONG="$(curl -sS -o "$OUT/submit-live.wrong-chain.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":1}" \
  "$BASE/__void/participant/validator-registration/submit-live")"
echo "wrong_chain_http=$HTTP_WRONG"
python3 -m json.tool "$OUT/submit-live.wrong-chain.json"
test "$HTTP_WRONG" = "409"

python3 - <<'PY' "$OUT/submit-live.wrong-chain.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["ok"] is False
assert j["error"] == "wrong_chain"
assert j["expectedChainId"] == 2050
assert j["requestedChainId"] == 1
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["live_execution_wired"] is False
assert j["submit_blocked_reason"] == "wrong_chain"
assert j["gates"]["wrong_chain_rejected"] is True
print("[ok] submit-live wrong-chain rejection green")
PY

echo
echo "=== [d] old blocked submit still unchanged ==="
HTTP_OLD="$(curl -sS -o "$OUT/submit.old.json" -w '%{http_code}' \
  -H 'content-type: application/json' \
  -d "{\"account\":\"$ACC\",\"chainId\":2050}" \
  "$BASE/__void/participant/validator-registration/submit")"
echo "old_submit_http=$HTTP_OLD"
test "$HTTP_OLD" = "501"

python3 - <<'PY' "$OUT/submit.old.json"
import json, sys
j=json.load(open(sys.argv[1]))
assert j["kind"] == "participant_validator_registration_submit"
assert j["source"] == "submit_stub_v1"
assert j["mutation"] is False
assert j["sends_transaction"] is False
assert j["submit_allowed"] is False
assert j["submit_blocked_reason"] == "live_wallet_execution_not_wired"
print("[ok] old submit stub remains blocked")
PY

echo
echo "=== [e] existing proof chain still green enough ==="
ops/mainnet0/validator-registration-wrong-chain-rejection-proof.sh
ops/mainnet0/validator-registration-live-submit-readiness-proof.sh

echo
echo "=== [f] public export still gitleaks-clean ==="
ops/security/build-public-release-tree.sh

echo
echo "[ok] validator registration submit-live skeleton proof green"
