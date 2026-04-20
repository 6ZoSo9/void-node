#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"
SHADOW_LATEST="${SHADOW_LATEST:-$HOME/dev/void-node/.runtime/validator_runtime_truth_shadow/latest.json}"
OUT_JSON="${OUT_JSON:-/tmp/validator-staking-upgrade-multivalidator-readiness.$(date +%Y%m%d-%H%M%S).json}"

python3 - <<'PY' "$BASE" "$COMPARE_LATEST" "$SHADOW_LATEST" "$OUT_JSON"
import json
import urllib.request
import sys
from pathlib import Path

base, compare_path_s, shadow_path_s, out_json_s = sys.argv[1:5]
compare_path = Path(compare_path_s)
shadow_path = Path(shadow_path_s)
out_json = Path(out_json_s)

def get_json(path: str):
    with urllib.request.urlopen(base.rstrip("/") + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

compare = json.loads(compare_path.read_text(encoding="utf-8"))
shadow = json.loads(shadow_path.read_text(encoding="utf-8"))

status = get_json("/__void/runtime/validator-truth/status")
epoch2 = get_json("/__void/runtime/validator-truth/epoch/2")
proposer20 = get_json("/__void/runtime/validator-truth/proposer/2/0")
window2 = get_json("/__void/runtime/validator-truth/window/2/0/8")
diag_all = get_json("/__void/runtime/validator-truth/diag/all")

compare_summary = compare.get("coreSummary") or {}
shadow_summary = shadow if isinstance(shadow, dict) else {}
shadow_loaded = shadow_summary.get("loadedEpochsFromDisk") or []
window_rows = window2.get("window") or []
unique_rewards = sorted({str(x.get("reward","")).lower() for x in window_rows if isinstance(x, dict) and x.get("reward")})

report = {
    "ok": True,
    "policyVersion": 1,
    "bridgeBaseline": {
        "compareLatestPath": str(compare_path),
        "epoch": compare_summary.get("epoch"),
        "coreMismatchCount": len(compare.get("coreMismatches") or []),
        "expectedDifferenceCount": len(compare.get("expectedDifferences") or []),
        "coreSummary": compare_summary,
        "baselineGreen": False,
    },
    "upgradeMultivalidator": {
        "shadowLatestPath": str(shadow_path),
        "loadedEpochs": status.get("loadedEpochs"),
        "latestEpoch": status.get("latestEpoch"),
        "epoch2Summary": epoch2.get("summary"),
        "proposer20": proposer20.get("proposer"),
        "uniqueRewardsInWindow": unique_rewards,
        "shadowLoadedEpochs": shadow_loaded,
        "shadowMismatchCount": len(shadow.get("mismatches") or []),
        "diagAllLatestEpoch": diag_all.get("latestEpoch"),
        "diagShadowLatestSummary": diag_all.get("shadowLatestSummary"),
        "diagCompareLatestSummary": diag_all.get("compareLatestSummary"),
        "multivalidatorGreen": False,
    },
}

baseline_green = all([
    compare_summary.get("epoch") == 1,
    len(compare.get("coreMismatches") or []) == 0,
])

epoch2_summary = epoch2.get("summary") or {}
prop20 = proposer20.get("proposer") or {}

multivalidator_green = all([
    status.get("ok") is True,
    status.get("mode") == "verified_epoch_manifests",
    status.get("loadedEpochs") == [1, 2],
    status.get("latestEpoch") == 2,
    epoch2_summary.get("epoch") == 2,
    epoch2_summary.get("validatorCount") == 2,
    str(epoch2_summary.get("totalPower")) == "2000000000000000000000",
    epoch2_summary.get("published") is True,
    epoch2_summary.get("publishedMatch") is True,
    prop20.get("epoch") == 2,
    prop20.get("validatorCount") == 2,
    str(prop20.get("totalPower")) == "2000000000000000000000",
    prop20.get("published") is True,
    prop20.get("publishedMatch") is True,
    len(unique_rewards) >= 2,
    shadow.get("ok") is True,
    shadow_loaded == [1, 2],
    len(shadow.get("mismatches") or []) == 0,
    diag_all.get("ok") is True,
    diag_all.get("latestEpoch") == 2,
])

report["bridgeBaseline"]["baselineGreen"] = baseline_green
report["upgradeMultivalidator"]["multivalidatorGreen"] = multivalidator_green
report["readyForContinuedValidatorOnboarding"] = bool(baseline_green and multivalidator_green)
report["nextLane"] = (
    "validator3 onboarding proof or real validator activation policy work"
    if report["readyForContinuedValidatorOnboarding"]
    else
    "fix upgrade multivalidator readiness failures before more validator onboarding"
)

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [multivalidator readiness summary] ===")
print(f"out_json={out_json}")
print(f"baseline_green={baseline_green}")
print(f"multivalidator_green={multivalidator_green}")
print(f"ready_for_continued_validator_onboarding={report['readyForContinuedValidatorOnboarding']}")
print(f"loaded_epochs={status.get('loadedEpochs')}")
print(f"latest_epoch={status.get('latestEpoch')}")
print(f"epoch2_validator_count={epoch2_summary.get('validatorCount')}")
print(f"epoch2_total_power={epoch2_summary.get('totalPower')}")
print(f"epoch2_unique_rewards={len(unique_rewards)}")
print(f"shadow_loaded_epochs={shadow_loaded}")
print(f"shadow_mismatch_count={len(shadow.get('mismatches') or [])}")

if not report["readyForContinuedValidatorOnboarding"]:
    raise SystemExit("[ERR] upgrade multivalidator readiness gate is not green")
PY
