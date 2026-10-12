#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

echo "=== public trust-boundary stack proof ==="
echo "mutation=false"
echo

echo "=== [1] git/runtime truth ==="
git status --short
git branch --show-current
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json | tee /tmp/public-trust-boundary-stack-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/public-trust-boundary-stack-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY
echo

echo "=== [2] current public status pointer proof ==="
make mainnet0-current-public-status-proof
echo

echo "=== [3] public first-60 journey proof requires trust boundary ==="
grep -q 'VOID_HOME_FIRST_USER_TRUST_BOUNDARY_V1' ops/security/public-first60-user-journey-proof.sh
grep -q 'Safe now:' ops/security/public-first60-user-journey-proof.sh
grep -q 'Guarded:' ops/security/public-first60-user-journey-proof.sh
grep -q 'No blind deposits' ops/security/public-first60-user-journey-proof.sh
make public-first60-user-journey-proof
echo "[ok] public first-60 proof requires trust boundary"
echo

echo "=== [4] participant UI/docs trust boundary proofs ==="
make participant-first-user-clarity-proof
make participant-first-user-trust-audit
echo

echo "=== [5] public onboarding docs preserve trust boundary ==="
make mainnet0-public-onboarding-pack-proof
grep -Rqs '## First-user trust boundary' README.md docs/public/start-here.md docs/public/participant-onboarding.md
grep -Rqs 'Safe now:' README.md docs/public/start-here.md docs/public/participant-onboarding.md
grep -Rqs 'Guarded:' README.md docs/public/start-here.md docs/public/participant-onboarding.md
grep -Rqs 'Blind deposits, exchange sends, and custodial sends are not supported' README.md docs/public/start-here.md docs/public/participant-onboarding.md
echo "[ok] public onboarding docs preserve trust boundary"
echo

echo "=== [6] status smoke and safety summary ==="
make mainnet0-status-smoke

echo
echo "=== [7] summary ==="
python3 - <<'PY'
summary = {
  "public_trust_boundary_stack": "green",
  "current_public_status_pointer": "green",
  "public_first60_requires_trust_boundary": True,
  "participant_ui_trust_boundary": True,
  "docs_trust_boundary": True,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] public trust-boundary stack proof passed"
