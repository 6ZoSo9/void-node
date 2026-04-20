#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
READINESS_SCRIPT="${READINESS_SCRIPT:-$HOME/dev/void-node/ops/mainnet/validator-truth-default-read-cutover-readiness.sh}"
UPGRADE_ARTIFACT="${UPGRADE_ARTIFACT:-$HOME/dev/void-node/ops/mainnet/validator-truth-upgrade-track.deployed.json}"
STAKING_ABI="${STAKING_ABI:-$HOME/dev/void-node/out/ValidatorStakingV2.sol/ValidatorStakingV2.json}"
READINESS_JSON="${READINESS_JSON:-/tmp/validator-truth-default-read-cutover-readiness.activation.$(date +%Y%m%d-%H%M%S).json}"
OUT_JSON="${OUT_JSON:-/tmp/validator-staking-upgrade-activation-preflight.$(date +%Y%m%d-%H%M%S).json}"

echo "=== [1] run current default-read readiness gate ==="
OUT_JSON="$READINESS_JSON" "$READINESS_SCRIPT"

echo
echo "=== [2] inspect upgrade-track deployment + staking abi ==="
python3 - <<'PY' "$BASE" "$READINESS_JSON" "$UPGRADE_ARTIFACT" "$STAKING_ABI" "$OUT_JSON"
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

base, readiness_json_s, upgrade_artifact_s, staking_abi_s, out_json_s = sys.argv[1:6]
readiness = json.loads(Path(readiness_json_s).read_text(encoding="utf-8"))
upgrade = json.loads(Path(upgrade_artifact_s).read_text(encoding="utf-8"))
staking_abi = json.loads(Path(staking_abi_s).read_text(encoding="utf-8"))
out_json = Path(out_json_s)

def get_json(url: str):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

diag_all = get_json(base.rstrip("/") + "/__void/runtime/validator-truth/diag/all")
compare_latest = diag_all.get("compareLatestSummary") or {}
shadow_latest = diag_all.get("shadowLatestSummary") or {}

abi = staking_abi.get("abi") or []
fn_names = sorted({
    item.get("name")
    for item in abi
    if isinstance(item, dict) and item.get("type") == "function" and item.get("name")
})

required_read = [
    "getActiveValidators",
    "getValidatorTruth",
    "effectivePowerOf",
]
required_write = [
    "registerAndStake",
]

interesting_optional = [
    "activate",
    "stake",
    "increaseStake",
    "beginExit",
    "finalizeExit",
]

missing_required_read = [x for x in required_read if x not in fn_names]
missing_required_write = [x for x in required_write if x not in fn_names]
optional_present = [x for x in interesting_optional if x in fn_names]

contracts = upgrade.get("contracts") or {}
code_presence = {}
for name, addr in contracts.items():
    try:
        code = subprocess.check_output(
            ["cast", "code", "--rpc-url", upgrade["rpcUrl"], addr],
            text=True
        ).strip()
        code_presence[name] = bool(code and code != "0x")
    except Exception:
        code_presence[name] = False

all_code_present = all(code_presence.values()) if code_presence else False

ready = all([
    readiness.get("eligibleForUpgradeDefault") is True,
    readiness.get("currentSource") == "upgrade",
    int(compare_latest.get("coreMismatchCount") or 0) == 0,
    int(shadow_latest.get("mismatchCount") or 0) == 0,
    all_code_present,
    not missing_required_read,
    not missing_required_write,
])

report = {
    "ok": True,
    "policyVersion": 1,
    "base": base,
    "currentSource": readiness.get("currentSource"),
    "eligibleForUpgradeDefault": readiness.get("eligibleForUpgradeDefault"),
    "upgradeDefaultLive": readiness.get("upgradeDefaultLive"),
    "latestEpoch": readiness.get("latestEpoch"),
    "compareCoreMismatchCount": compare_latest.get("coreMismatchCount"),
    "shadowMismatchCount": shadow_latest.get("mismatchCount"),
    "upgradeArtifact": str(Path(upgrade_artifact_s)),
    "upgradeRpcUrl": upgrade.get("rpcUrl"),
    "upgradeContracts": contracts,
    "upgradeContractsCodePresent": code_presence,
    "allUpgradeContractsCodePresent": all_code_present,
    "stakingAbi": str(Path(staking_abi_s)),
    "requiredReadMethods": required_read,
    "requiredWriteMethods": required_write,
    "missingRequiredReadMethods": missing_required_read,
    "missingRequiredWriteMethods": missing_required_write,
    "optionalActivationMethodsPresent": optional_present,
    "readyForValidator2OnboardingProof": ready,
    "nextLane": (
        "build second-validator onboarding proof on upgrade-track"
        if ready else
        "fix missing readiness items before validator2 onboarding proof"
    ),
}

out_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [activation preflight summary] ===")
print(f"out_json={out_json}")
print(f"current_source={report['currentSource']}")
print(f"eligible_for_upgrade_default={report['eligibleForUpgradeDefault']}")
print(f"upgrade_default_live={report['upgradeDefaultLive']}")
print(f"latest_epoch={report['latestEpoch']}")
print(f"compare_core_mismatch_count={report['compareCoreMismatchCount']}")
print(f"shadow_mismatch_count={report['shadowMismatchCount']}")
print(f"all_upgrade_contracts_code_present={report['allUpgradeContractsCodePresent']}")
print(f"missing_required_read_methods={report['missingRequiredReadMethods']}")
print(f"missing_required_write_methods={report['missingRequiredWriteMethods']}")
print(f"optional_activation_methods_present={report['optionalActivationMethodsPresent']}")
print(f"ready_for_validator2_onboarding_proof={report['readyForValidator2OnboardingProof']}")

if not ready:
    raise SystemExit("[ERR] validator staking upgrade activation preflight is not ready")
PY
