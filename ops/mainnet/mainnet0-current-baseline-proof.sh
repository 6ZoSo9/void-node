#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/mainnet/mainnet0-current-baseline.current.md"
BASE="${BASE:-http://127.0.0.1:4100}"

echo "=== Mainnet-0 current baseline pointer proof ==="

echo
echo "=== [1] current baseline doc ==="
test -f "$DOC"

grep -q '^status: current_baseline_cross_box_proven$' "$DOC"
grep -q '^launch_state: not_go_for_public_mainnet0$' "$DOC"
grep -q '^mutation_allowed: false$' "$DOC"
grep -q '^launch_approval: false$' "$DOC"
grep -q '^money_step: last$' "$DOC"
grep -q '^commit: 152cf74c$' "$DOC"
grep -q '^tag: ckpt-final-checklist-validator-candidate-posture-green-20260523-020915$' "$DOC"
grep -q 'Final path Wallet doc refresh is cross-box proven.' "$DOC"
grep -q 'Final path includes wallet-ui-cleanup-proof.' "$DOC"
grep -q 'Final checklist sections closeout doc is cross-box proven.' "$DOC"
grep -q 'Final public launch checklist records restored proof sections and supersedes the weakened fdfa1af5 checkpoint.' "$DOC"
grep -q 'Final checklist preserves update-safety Prometheus-or-fallback, launch approval plan proof, and fail-closed go/no-go Prometheus-or-fallback sections.' "$DOC"
grep -q 'Product surface proof is cross-box proven.' "$DOC"
grep -q 'Settings drawer/top Settings/Escape-close UI checkpoint is cross-box proven.' "$DOC"
grep -q 'Public validator candidate-only posture is cross-box proven.' "$DOC"
grep -q 'Final public launch checklist validator candidate posture is cross-box proven.' "$DOC"
grep -q 'DataNet tab proof is green.' "$DOC"
grep -q 'Participant DataNet E2E proof is green.' "$DOC"
grep -q 'Participant golden path proof is green.' "$DOC"
grep -q 'Remote product/network regression proof is green.' "$DOC"
grep -q 'WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.' "$DOC"
grep -q 'Wallet setup path and advanced send-action cleanup are proof-guarded.' "$DOC"
grep -q 'Wallet setup, Send Local WC, and Send VOID cleanup remain proof-guarded.' "$DOC"
grep -q '^cross_box_proven: true$' "$DOC"
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$DOC"
grep -q 'Public active validator admission remains disabled' "$DOC"
grep -q 'Public registration remains candidate_or_waiting_only' "$DOC"
grep -q 'Public registration does not mutate the active validator set' "$DOC"
grep -q 'Next operator candidate remains vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
grep -q 'This file is the canonical rolling pointer' "$DOC"
echo "[ok] canonical baseline pointer is explicit and non-mutating"

echo
echo "=== [2] git checkpoint contains baseline pointer ==="
HEAD="$(git rev-parse --short HEAD)"
DESC="$(git describe --tags --always --dirty)"
POINTER_COMMIT="152cf74c"
POINTER_TAG="ckpt-final-checklist-validator-candidate-posture-green-20260523-020915"
echo "head=$HEAD"
echo "describe=$DESC"
echo "pointer_commit=$POINTER_COMMIT"
echo "pointer_tag=$POINTER_TAG"

git cat-file -e "$POINTER_COMMIT^{commit}"
git merge-base --is-ancestor "$POINTER_COMMIT" HEAD
git rev-parse -q --verify "refs/tags/$POINTER_TAG" >/dev/null
echo "[ok] current HEAD contains canonical baseline pointer lineage"

echo
echo "=== [3] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-current-baseline-ready.json
echo
python3 - /tmp/void-current-baseline-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [4] runtime truth selector remains dry-run only ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > /tmp/void-current-baseline-next-onboard.json
python3 - /tmp/void-current-baseline-next-onboard.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("selectedCandidateName") == "vault126", j
assert int(j.get("currentEpoch")) == 127, j
assert int(j.get("targetEpoch")) == 128, j
assert int(j.get("currentValidatorCount")) == 126, j
assert int(j.get("expectedValidatorCount")) == 127, j
print("[ok] next-onboard remains vault126 / epoch128 / count127")
PY

echo
echo "=== [5] existing launch docs still block approval ==="
grep -q 'status: not_go_for_public_mainnet0' ops/mainnet/mainnet0-status.current.md
grep -q 'launch_state: not_go_for_public_mainnet0' ops/mainnet/mainnet0-blockers.current.md
grep -q 'launch_state: not_go_for_public_mainnet0' ops/mainnet/mainnet0-final-path.current.md
grep -q 'It is not launch approval.' ops/mainnet/mainnet0-launch-approval-plan.current.md
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$DOC"
echo "[ok] launch docs still fail closed"

echo
echo "=== [6] summary ==="
python3 - <<'PY'
print({
  "current_baseline": "152cf74c",
  "tag": "ckpt-final-checklist-validator-candidate-posture-green-20260523-020915",
  "cross_box_proven": True,
  "launch_state": "not_go_for_public_mainnet0",
  "launch_approval": False,
  "mutation_allowed": False,
  "public_validator_admission": "candidate_only_for_mainnet0",
  "money_step": "last",
})
PY

echo
echo "[ok] Mainnet-0 current baseline pointer proof passed"
