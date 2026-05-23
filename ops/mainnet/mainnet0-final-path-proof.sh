#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-final-path.current.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 final path proof ==="

test -f "$DOC"
test -f "$STATUS"

grep -q '^status: active$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q 'ckpt-final-path-wallet-cleanup-proof-green-20260521-112508' "$DOC"
grep -q 'commit: 4e05503c' "$DOC"
grep -q 'Validator runtime truth: epoch127' "$DOC"
grep -q 'Validator count: 126' "$DOC"
grep -q 'Next operator selector: vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
grep -q 'Public validator admission: still blocked' "$DOC"
grep -q 'Mainnet-0 public launch: still not approved' "$DOC"
grep -q 'Ready signals are not launch approval' "$DOC"
grep -q 'Participant public clarity rollup is cross-box green' "$DOC"
grep -q 'Public release sanitization is cross-box green' "$DOC"
grep -q 'gitleaks-clean with findings=0' "$DOC"
grep -q 'Public release export is gitleaks-clean at 72f536d0 / ckpt-public-release-export-gitleaks-clean-green-20260523-091412 with gitleaks_rc=0 and findings=0.' "$DOC"
grep -q 'UI/product polish baseline is green' "$DOC"
grep -q 'Final public release hygiene baseline is green' "$DOC"
grep -q 'Final path proof now includes wallet-ui-cleanup-proof' "$DOC"
grep -q 'Wallet setup/send-action cleanup is cross-box proven' "$DOC"
grep -q 'Wallet setup path and advanced send-action cleanup are proof-guarded' "$DOC"
grep -q 'Send Local WC and Send VOID remain behind advanced wallet-action sections' "$DOC"

echo
echo "=== [wallet-ui] Wallet UI cleanup proof ==="
bash ops/mainnet0/wallet-ui-cleanup-proof.sh

grep -q 'status: not_go_for_public_mainnet0' "$STATUS"
grep -q 'Operator/bootstrap validator runtime truth is green through epoch127' "$STATUS"

curl -fsS "$BASE/__void/ready.json" > /tmp/void-final-path-ready.json
python3 - /tmp/void-final-path-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

curl -fsS "$BASE/__void/runtime/validator-truth/epoch/127" > /tmp/void-final-path-epoch127.json
python3 - /tmp/void-final-path-epoch127.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
s=j.get("summary") or {}
assert s.get("epoch") == 127, j
assert s.get("validatorCount") == 126, j
assert str(s.get("totalPower")) == "126000000000000000000000", j
assert s.get("published") is True, j
assert s.get("publishedMatch") is True, j
print("[ok] epoch127 runtime truth")
PY

curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > /tmp/void-final-path-next.json
python3 - /tmp/void-final-path-next.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("selectedCandidateName") == "vault126", j
assert j.get("currentEpoch") == 127, j
assert j.get("targetEpoch") == 128, j
assert j.get("currentValidatorCount") == 126, j
assert j.get("expectedValidatorCount") == 127, j
print("[ok] next-onboard vault126/epoch128/count127")
PY

echo "[ok] Mainnet-0 final path proof passed"
