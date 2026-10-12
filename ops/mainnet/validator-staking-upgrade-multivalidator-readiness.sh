#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
COMPARE_LATEST="${COMPARE_LATEST:-$HOME/dev/void-node/.runtime/validator_truth_compare/latest.json}"
SHADOW_LATEST="${SHADOW_LATEST:-$HOME/dev/void-node/.runtime/validator_runtime_truth_shadow/latest.json}"
BASELINE_EPOCH="${BASELINE_EPOCH:-1}"
TARGET_EPOCH="${TARGET_EPOCH:-2}"
EXPECTED_VALIDATOR_COUNT="${EXPECTED_VALIDATOR_COUNT:-2}"
STAKE_WEI="${STAKE_WEI:-1000000000000000000000}"
OUT_JSON="${OUT_JSON:-/tmp/validator-staking-upgrade-multivalidator-readiness.$(date +%Y%m%d-%H%M%S).json}"

python3 - <<'PY' "$BASE" "$COMPARE_LATEST" "$SHADOW_LATEST" "$BASELINE_EPOCH" "$TARGET_EPOCH" "$EXPECTED_VALIDATOR_COUNT" "$STAKE_WEI" "$OUT_JSON"
import json
import urllib.request
import sys
from pathlib import Path

base, compare_path_s, shadow_path_s, baseline_epoch_s, target_epoch_s, expected_validator_count_s, stake_wei_s, out_json_s = sys.argv[1:9]
compare_path = Path(compare_path_s)
shadow_path = Path(shadow_path_s)
baseline_epoch = int(baseline_epoch_s)
target_epoch = int(target_epoch_s)
expected_validator_count = int(expected_validator_count_s)
stake_wei = int(stake_wei_s)
expected_total_power = str(expected_validator_count * stake_wei)
out_json = Path(out_json_s)

def get_json(path: str):
    with urllib.request.urlopen(base.rstrip("/") + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

compare = json.loads(compare_path.read_text(encoding="utf-8"))
shadow = json.loads(shadow_path.read_text(encoding="utf-8"))

status = get_json("/__void/runtime/validator-truth/status")
epochN = get_json(f"/__void/runtime/validator-truth/epoch/{target_epoch}")
proposerN0 = get_json(f"/__void/runtime/validator-truth/proposer/{target_epoch}/0")
windowN = get_json(f"/__void/runtime/validator-truth/window/{target_epoch}/0/8")
diag_all = get_json("/__void/runtime/validator-truth/diag/all")

compare_summary = compare.get("coreSummary") or {}
shadow_loaded = shadow.get("loadedEpochsFromDisk") or []
window_rows = windowN.get("window") or []
unique_rewards = sorted({str(x.get("reward","")).lower() for x in window_rows if isinstance(x, dict) and x.get("reward")})
expected_loaded_epochs = list(range(1, target_epoch + 1))

report = {
    "ok": True,
    "policyVersion": 2,
    "baselineEpoch": baseline_epoch,
    "targetEpoch": target_epoch,
    "expectedValidatorCount": expected_validator_count,
    "stakeWei": str(stake_wei),
    "expectedTotalPower": expected_total_power,
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
        "epochSummary": epochN.get("summary"),
        "proposer0": proposerN0.get("proposer"),
        "uniqueRewardsInWindow": unique_rewards,
        "shadowLoadedEpochs": shadow_loaded,
        "shadowMismatchCount": len(shadow.get("mismatches") or []),
        "diagAllLatestEpoch": diag_all.get("latestEpoch"),
        "diagShadowLatestSummary": diag_all.get("shadowLatestSummary"),
        "diagCompareLatestSummary": diag_all.get("compareLatestSummary"),
        "multivalidatorGreen": False,
    },
}

# Direct verified-current runtime mode: compare file is advisory on follower nodes.
baseline_green = len(compare.get("coreMismatches") or []) == 0

epoch_summary = epochN.get("summary") or {}
prop0 = proposerN0.get("proposer") or {}

multivalidator_green = all([
    status.get("ok") is True,
    status.get("mode") == "verified_epoch_manifests",
    # loadedEpochs may include prior synced epochs; latest/target truth is the hard gate.
    status.get("latestEpoch") == target_epoch,
    epoch_summary.get("epoch") == target_epoch,
    epoch_summary.get("validatorCount") == expected_validator_count,
    str(epoch_summary.get("totalPower")) == expected_total_power,
    epoch_summary.get("published") is True,
    epoch_summary.get("publishedMatch") is True,
    prop0.get("epoch") == target_epoch,
    prop0.get("validatorCount") == expected_validator_count,
    str(prop0.get("totalPower")) == expected_total_power,
    prop0.get("published") is True,
    prop0.get("publishedMatch") is True,
    # 8-slot schedule window sanity only; do not require all validators in an 8-slot sample.
    len(unique_rewards) >= 1,
    # Shadow file may be direct/advisory on follower runtime; mismatch count remains the hard gate.
    shadow.get("ok") is True,
    len(shadow.get("mismatches") or []) == 0,
    diag_all.get("ok") is True,
    diag_all.get("latestEpoch") == target_epoch,
])

report["bridgeBaseline"]["baselineGreen"] = baseline_green
report["upgradeMultivalidator"]["multivalidatorGreen"] = multivalidator_green
report["readyForContinuedValidatorOnboarding"] = bool(baseline_green and multivalidator_green)
report["nextLane"] = (
    "next validator onboarding proof or validator activation policy work"
    if report["readyForContinuedValidatorOnboarding"]
    else
    "fix multivalidator readiness failures before more validator onboarding"
)

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [multivalidator readiness summary] ===")
print(f"out_json={out_json}")
print(f"baseline_epoch={baseline_epoch}")
print(f"target_epoch={target_epoch}")
print(f"expected_validator_count={expected_validator_count}")
print(f"baseline_green={baseline_green}")
print(f"multivalidator_green={multivalidator_green}")
print(f"ready_for_continued_validator_onboarding={report['readyForContinuedValidatorOnboarding']}")
print(f"loaded_epochs={status.get('loadedEpochs')}")
print(f"latest_epoch={status.get('latestEpoch')}")
print(f"epoch_validator_count={epoch_summary.get('validatorCount')}")
print(f"epoch_total_power={epoch_summary.get('totalPower')}")
print(f"unique_rewards={len(unique_rewards)}")
print(f"shadow_loaded_epochs={shadow_loaded}")
print(f"shadow_mismatch_count={len(shadow.get('mismatches') or [])}")

if not report["readyForContinuedValidatorOnboarding"]:
    raise SystemExit("[ERR] upgrade multivalidator readiness gate is not green")
PY
