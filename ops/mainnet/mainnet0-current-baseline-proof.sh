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
grep -q '^launch_state: public_mainnet0_live$' "$DOC"
grep -q '^mutation_allowed: true$' "$DOC"
grep -q '^launch_approval: true$' "$DOC"
grep -q '^money_step: ops_seed_complete_future_spend_guarded$' "$DOC"
grep -q '^commit: 4c3aa800$' "$DOC"
grep -q '^tag: ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500$' "$DOC"
grep -q 'Final path Wallet doc refresh is cross-box proven.' "$DOC"
grep -q 'Final path includes wallet-ui-cleanup-proof.' "$DOC"
grep -q 'Final checklist sections closeout doc is cross-box proven.' "$DOC"
grep -q 'Final public launch checklist records restored proof sections and supersedes the weakened fdfa1af5 checkpoint.' "$DOC"
grep -q 'Final checklist preserves update-safety Prometheus-or-fallback, launch approval plan proof, and fail-closed go/no-go Prometheus-or-fallback sections.' "$DOC"
grep -q 'Product surface proof is cross-box proven.' "$DOC"
grep -q 'Settings drawer/top Settings/Escape-close UI checkpoint is cross-box proven.' "$DOC"
grep -q 'Public validator candidate-only posture is cross-box proven.' "$DOC"
grep -q 'Candidate-only validator posture clarity checkpoint is current at 1cd3e15a / ckpt-candidate-only-validator-posture-clarity-green-20260523-083458.' "$DOC"
grep -q 'Final public launch checklist validator candidate posture is cross-box proven.' "$DOC"
grep -q 'Launch approval artifact prep is cross-box proven and plan-only/not-approved.' "$DOC"
grep -q 'DataNet tab proof is green.' "$DOC"
grep -q 'Participant DataNet E2E proof is green.' "$DOC"
grep -q 'Participant golden path proof is green.' "$DOC"
grep -q 'Remote product/network regression proof is green.' "$DOC"
grep -q 'WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.' "$DOC"
grep -q 'WC devnet local-state runtime is cross-box proven at e0637a17 / ckpt-wc-devnet-local-state-runtime-green-20260523-081804; per-machine WC deploy addresses live under .runtime/mainnet0/wc-devnet-local/current and tracked WC state files stay clean.' "$DOC"
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
POINTER_COMMIT="4c3aa800"
POINTER_TAG="ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500"
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

echo "=== [4] runtime truth selector is public-safe / non-executing ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > /tmp/void-current-baseline-next-onboard.json
python3 - /tmp/void-current-baseline-next-onboard.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j

mode = j.get("mode", "")
disabled = j.get("disabled")

if disabled is True or mode == "public_safe_status_only":
    assert disabled is True, j
    assert mode == "public_safe_status_only", j
    assert j.get("blocker") == "validator_next_onboard_status_runbook_disabled", j
    assert j.get("liveExecutionEnabled") is False, j
    assert j.get("selectedCandidateName") == "", j
    assert j.get("selectedCandidateAddr") == "", j
    assert int(j.get("currentEpoch", -1)) == 0, j
    assert int(j.get("targetEpoch", -1)) == 0, j
    assert int(j.get("currentValidatorCount", -1)) == 0, j
    assert int(j.get("expectedValidatorCount", -1)) == 0, j
    assert int(j.get("windowLength", -1)) == 0, j
    assert j.get("usedRewards") == [], j
    assert j.get("command") == "", j
    assert j.get("raw") == "", j
    assert "does not spawn validator next-onboard runbooks" in j.get("note", ""), j
    print("[ok] next-onboard status route is public-safe disabled / non-executing")
else:
    assert j.get("selectedCandidateName") == "vault126", j
    assert int(j.get("currentEpoch")) == 127, j
    assert int(j.get("targetEpoch")) == 128, j
    assert int(j.get("currentValidatorCount")) == 126, j
    assert int(j.get("expectedValidatorCount")) == 127, j
    assert not j.get("command"), j
    assert not j.get("raw"), j
    print("[ok] next-onboard remains vault126 / epoch128 / count127 without execution payload")
PY

echo
echo "=== [5] launch docs encode promoted public launch with guardrails ==="
grep -q 'status: public_mainnet0_live' ops/mainnet/mainnet0-status.current.md
grep -q 'launch_state: public_mainnet0_live' ops/mainnet/mainnet0-blockers.current.md
grep -q 'launch_state: public_mainnet0_live' ops/mainnet/mainnet0-final-path.current.md
grep -q 'It is not launch approval.' ops/mainnet/mainnet0-launch-approval-plan.current.md
grep -q 'Public validator admission remains candidate_only_for_mainnet0' "$DOC"
echo "[ok] launch docs still fail closed"

echo
echo "=== [6] summary ==="
python3 - <<'PY'
print({
  "current_baseline": "4c3aa800",
  "tag": "ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500",
  "cross_box_proven": True,
  "launch_state": "public_mainnet0_live",
  "launch_approval": True,
  "mutation_allowed": True,
  "public_validator_admission": "candidate_only_for_mainnet0",
  "money_step": "ops_seed_complete_future_spend_guarded",
})
PY

echo
echo "[ok] Mainnet-0 current baseline pointer proof passed"
