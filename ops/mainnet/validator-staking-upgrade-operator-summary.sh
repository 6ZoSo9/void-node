#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
LATEST_DIR="${LATEST_DIR:-$HOME/dev/void-node/.runtime/validator_runtime_truth_operator}"
STAMP="$(date +%Y%m%d-%H%M%S)"
HISTORY_DIR="$LATEST_DIR/history"
OUT_JSON="${OUT_JSON:-$HISTORY_DIR/validator-runtime-operator-summary.$STAMP.json}"
LATEST_JSON="$LATEST_DIR/latest.json"

mkdir -p "$HISTORY_DIR"

echo "=== [1] read live runtime ==="
readarray -t INFO < <(
python3 - <<'PY' "$BASE"
import json, sys, urllib.request

base = sys.argv[1].rstrip("/")

def get_json(path: str):
    with urllib.request.urlopen(base + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

status = get_json("/__void/runtime/validator-truth/status")
target_epoch = int(status["latestEpoch"])
epochN = get_json(f"/__void/runtime/validator-truth/epoch/{target_epoch}")
summary = epochN.get("summary") or {}
expected_count = int(summary["validatorCount"])
print(target_epoch)
print(expected_count)
PY
)

TARGET_EPOCH="${INFO[0]}"
EXPECTED_VALIDATOR_COUNT="${INFO[1]}"

echo "target_epoch=$TARGET_EPOCH"
echo "expected_validator_count=$EXPECTED_VALIDATOR_COUNT"

MULTI_JSON="/tmp/validator-staking-upgrade-multivalidator-readiness.operator.${STAMP}.json"
RUNBOOK_JSON="/tmp/validator-staking-upgrade-onboarding-runbook-gate.operator.${STAMP}.json"

echo
echo "=== [2] run parameterized gates for current live epoch/count ==="
OUT_JSON="$MULTI_JSON" \
TARGET_EPOCH="$TARGET_EPOCH" \
EXPECTED_VALIDATOR_COUNT="$EXPECTED_VALIDATOR_COUNT" \
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh"

OUT_JSON="$RUNBOOK_JSON" \
TARGET_EPOCH="$TARGET_EPOCH" \
EXPECTED_VALIDATOR_COUNT="$EXPECTED_VALIDATOR_COUNT" \
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-onboarding-runbook-gate.sh"

echo
echo "=== [3] build operator summary artifact ==="
python3 - <<'PY' "$BASE" "$TARGET_EPOCH" "$EXPECTED_VALIDATOR_COUNT" "$MULTI_JSON" "$RUNBOOK_JSON" "$OUT_JSON"
import json
import urllib.request
import sys
from pathlib import Path

base, target_epoch_s, expected_count_s, multi_json_s, runbook_json_s, out_json_s = sys.argv[1:7]
target_epoch = int(target_epoch_s)
expected_count = int(expected_count_s)
multi = json.loads(Path(multi_json_s).read_text(encoding="utf-8"))
runbook = json.loads(Path(runbook_json_s).read_text(encoding="utf-8"))

def get_json(path: str):
    with urllib.request.urlopen(base.rstrip("/") + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

status = get_json("/__void/runtime/validator-truth/status")
epochN = get_json(f"/__void/runtime/validator-truth/epoch/{target_epoch}")
windowN = get_json(f"/__void/runtime/validator-truth/window/{target_epoch}/0/8")
diag_all = get_json("/__void/runtime/validator-truth/diag/all")

rows = windowN.get("window") or []
unique_rewards = sorted({str(x.get("reward","")).lower() for x in rows if isinstance(x, dict) and x.get("reward")})
epoch_summary = epochN.get("summary") or {}
shadow_summary = diag_all.get("shadowLatestSummary") or {}
compare_summary = diag_all.get("compareLatestSummary") or {}

summary = {
    "ok": True,
    "targetEpoch": target_epoch,
    "expectedValidatorCount": expected_count,
    "latestEpoch": status.get("latestEpoch"),
    "validatorCount": epoch_summary.get("validatorCount"),
    "totalPower": str(epoch_summary.get("totalPower")),
    "uniqueRewardCount": len(unique_rewards),
    "shadowMismatchCount": shadow_summary.get("mismatchCount"),
    "compareCoreMismatchCount": compare_summary.get("coreMismatchCount"),
    "multivalidatorGateGreen": bool(multi.get("readyForContinuedValidatorOnboarding")),
    "runbookGateGreen": bool(runbook.get("green")),
    "overallGreen": all([
        multi.get("readyForContinuedValidatorOnboarding") is True,
        runbook.get("green") is True,
        status.get("loadedEpochs") == list(range(1, target_epoch + 1)),
        status.get("latestEpoch") == target_epoch,
        epoch_summary.get("validatorCount") == expected_count,
        epoch_summary.get("published") is True,
        epoch_summary.get("publishedMatch") is True,
        len(unique_rewards) >= 2,
        shadow_summary.get("mismatchCount") == 0,
        compare_summary.get("coreMismatchCount") == 0,
    ]),
}

report = {
    "ok": True,
    "summary": summary,
    "status": status,
    "epochSummary": epoch_summary,
    "uniqueRewardsInWindow": unique_rewards,
    "diagAll": {
        "latestEpoch": diag_all.get("latestEpoch"),
        "shadowLatestSummary": shadow_summary,
        "compareLatestSummary": compare_summary,
    },
    "multivalidatorGate": multi,
    "runbookGate": runbook,
}

out_path = Path(out_json_s)
out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
print(f"[ok] wrote {out_path}")

if not summary["overallGreen"]:
    raise SystemExit("[ERR] operator summary overallGreen is false")
PY

cp -f "$OUT_JSON" "$LATEST_JSON"

echo
echo "=== [4] latest summary ==="
python3 - <<'PY' "$LATEST_JSON"
import json, sys
j = json.load(open(sys.argv[1], "r", encoding="utf-8"))
print(json.dumps(j.get("summary"), indent=2))
PY

echo
echo "[ok] validator runtime operator summary latest published"
