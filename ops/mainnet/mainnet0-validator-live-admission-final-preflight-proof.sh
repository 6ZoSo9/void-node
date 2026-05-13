#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/void-validator-live-admission-final-preflight-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== Mainnet-0 validator live-admission final preflight proof ==="
echo "out=$OUT"

echo
echo "=== [1] repo cleanliness / checkpoint ==="
git status --short | tee "$OUT/git.status.txt"

if [ -s "$OUT/git.status.txt" ]; then
  if [ "${ALLOW_BOOTSTRAP_DIRTY:-0}" = "1" ]; then
    python3 -c 'import sys
from pathlib import Path
allowed = {
    " M Makefile",
    "?? ops/mainnet/mainnet0-validator-live-admission-final-preflight-proof.sh",
}
lines = [line.rstrip("\n") for line in Path(sys.argv[1]).read_text().splitlines() if line.strip()]
bad = [line for line in lines if line not in allowed]
assert not bad, bad
print("[ok] bootstrap dirty state contains only expected proof/Makefile changes")' "$OUT/git.status.txt"
  else
    echo "[ERR] repo is dirty; rerun after committing or set ALLOW_BOOTSTRAP_DIRTY=1 only before initial commit"
    false
  fi
else
  echo "[ok] repo clean"
fi

git rev-parse --short HEAD | tee "$OUT/git.head.txt"
git describe --tags --always --dirty | tee "$OUT/git.describe.txt"
grep -Eq "ckpt-validator-live-admission|ckpt-validator-next-onboard-ready-wait|ckpt-validator-final-preflight|ckpt-prelaunch-safety-noncoordinator-fallback|ckpt-prelaunch-safety-gonogo-fallback" "$OUT/git.describe.txt"
echo "[ok] checkpoint lineage matches validator live-admission lane"

echo
echo "=== [2] node ready ==="
READY_RC=1
for i in $(seq 1 60); do
  if curl -fsS "$BASE/__void/ready.json" > "$OUT/ready.json" 2>"$OUT/void-final-preflight-ready.err"; then
    READY_RC=0
    break
  fi
  sleep 1
done

if [ "$READY_RC" -ne 0 ]; then
  echo "[ERR] node did not become ready for final preflight"
  cat "$OUT/void-final-preflight-ready.err" 2>/dev/null || true
  systemctl --user status void-node.service --no-pager -l | sed -n "1,120p" || true
  false
fi
cat "$OUT/ready.json"
echo
python3 -c 'import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")' "$OUT/ready.json"

echo
echo "=== [3] live execution env switch must be unset/off ==="
ENV_VAL="$(systemctl --user show-environment 2>/dev/null | grep '^VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=' || true)"
PROC_VAL="${VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION:-}"
echo "systemd_env=${ENV_VAL:-unset}" | tee "$OUT/live-env.txt"
echo "shell_env=${PROC_VAL:-unset}" | tee -a "$OUT/live-env.txt"

if [ -n "$ENV_VAL" ] || [ "$PROC_VAL" = "1" ]; then
  echo "[ERR] live execution env switch is set"
  false
fi
echo "[ok] live execution env switch is unset/off"

echo
echo "=== [4] selector must match exact planned admission ==="
curl -fsS "$BASE/__void/runtime/validator-truth/next-onboard" > "$OUT/next-onboard.json"
python3 -c 'import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("selectedCandidateName") == "vault125", j
assert int(j.get("targetEpoch")) == 126, j
assert int(j.get("expectedValidatorCount")) == 125, j
assert int(j.get("currentEpoch")) == 125, j
assert int(j.get("currentValidatorCount")) == 124, j
print("[ok] selector matches vault125 / epoch127 / count126")
print({
  "selectedCandidateName": j.get("selectedCandidateName"),
  "selectedCandidateAddr": j.get("selectedCandidateAddr"),
  "currentEpoch": j.get("currentEpoch"),
  "targetEpoch": j.get("targetEpoch"),
  "currentValidatorCount": j.get("currentValidatorCount"),
  "expectedValidatorCount": j.get("expectedValidatorCount"),
})' "$OUT/next-onboard.json"

echo
echo "=== [5] runbook must remain plan-only ==="
DOC="ops/mainnet/mainnet0-validator-live-admission-execution-runbook.md"
grep -q "status: plan_only" "$DOC"
grep -q "mutation_allowed_by_this_doc: false" "$DOC"
grep -q "Do not execute live admission yet" "$DOC"
grep -q "operator_intent: ADMIT_vault125_EPOCH_127_COUNT_126" "$DOC"
echo "[ok] runbook remains plan-only"

echo
echo "=== [6] required proof stack ==="
make mainnet0-validator-next-onboard-live-gate-proof
make mainnet0-validator-live-admission-readiness-proof
echo
echo "=== [6c] status proof or non-Prometheus smoke ==="
if curl -fsS "http://127.0.0.1:9090/-/ready" >/dev/null 2>&1; then
  echo "[ok] Prometheus reachable; running full mainnet0-status-proof"
  make mainnet0-status-proof
else
  echo "[warn] Prometheus not reachable at http://127.0.0.1:9090; running mainnet0-status-smoke"
  make mainnet0-status-smoke
fi
echo
echo "=== [6d] cross-box smoke or local fallback ==="
ALIEN="${ALIEN:-zoso@100.122.79.39}"
if ssh -o BatchMode=yes -o ConnectTimeout=6 "$ALIEN" "true" >/dev/null 2>&1; then
  echo "[ok] SSH to Alienware available; running cross-box status smoke"
  make mainnet0-crossbox-status-smoke
else
  echo "[warn] SSH to Alienware not available from this node; running local status smoke fallback"
  echo "[warn] Full cross-box smoke must still be run from Precision/coordinator before any live mutation"
  make mainnet0-status-smoke
fi
make mainnet0-prelaunch-safety-proof

echo
echo "=== [7] write summary ==="
python3 -c 'import json, sys, pathlib
out = pathlib.Path(sys.argv[1])
ready = json.loads((out / "ready.json").read_text())
selector = json.loads((out / "next-onboard.json").read_text())
summary = {
  "ok": True,
  "kind": "validator_live_admission_final_preflight_proof",
  "mutation": False,
  "live_admission_executed": False,
  "launch_state": "not_go_for_public_mainnet0",
  "money_step": "last",
  "git_head": (out / "git.head.txt").read_text().strip(),
  "git_describe": (out / "git.describe.txt").read_text().strip(),
  "ready": {
    "ready": ready.get("ready"),
    "head": ready.get("head"),
    "gap": ready.get("gap"),
    "txroot_live": ready.get("txroot_live")
  },
  "selector": {
    "selected_candidate": selector.get("selectedCandidateName"),
    "selected_candidate_addr": selector.get("selectedCandidateAddr"),
    "current_epoch": selector.get("currentEpoch"),
    "target_epoch": selector.get("targetEpoch"),
    "current_validator_count": selector.get("currentValidatorCount"),
    "expected_validator_count": selector.get("expectedValidatorCount")
  },
  "required_operator_intent": {
    "confirm": True,
    "expected_candidate": "vault125",
    "expected_target_epoch": 127,
    "expected_validator_count": 126,
    "operator_intent": "ADMIT_vault125_EPOCH_127_COUNT_126",
    "required_env_switch": "VOID_VALIDATOR_NEXT_ONBOARD_LIVE_EXECUTION=1"
  }
}
(out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))' "$OUT"

echo
echo "[ok] Mainnet-0 validator live-admission final preflight proof passed"
echo "summary=$OUT/summary.json"
