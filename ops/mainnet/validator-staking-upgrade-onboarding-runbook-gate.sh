#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
SECRETS="${SECRETS:-/mnt/key2/mainnet-keygen/20260418-023715/private/wallet-secrets.json}"
MULTI_GATE="${MULTI_GATE:-$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh}"
MULTI_JSON="${MULTI_JSON:-/tmp/validator-staking-upgrade-multivalidator-readiness.runbook.$(date +%Y%m%d-%H%M%S).json}"
OUT_JSON="${OUT_JSON:-/tmp/validator-staking-upgrade-onboarding-runbook-gate.$(date +%Y%m%d-%H%M%S).json}"

echo "=== [1] run multivalidator readiness gate ==="
OUT_JSON="$MULTI_JSON" "$MULTI_GATE"

echo
echo "=== [2] inspect operator wallet inventory + live status ==="
python3 - <<'PY' "$BASE" "$SECRETS" "$MULTI_JSON" "$OUT_JSON"
import json
import sys
import urllib.request
from pathlib import Path

base, secrets_path_s, multi_json_s, out_json_s = sys.argv[1:5]
secrets = json.loads(Path(secrets_path_s).read_text(encoding="utf-8"))
multi = json.loads(Path(multi_json_s).read_text(encoding="utf-8"))

def get_json(path: str):
    with urllib.request.urlopen(base.rstrip("/") + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

status = get_json("/__void/runtime/validator-truth/status")
epoch2 = get_json("/__void/runtime/validator-truth/epoch/2")
window2 = get_json("/__void/runtime/validator-truth/window/2/0/8")
diag_all = get_json("/__void/runtime/validator-truth/diag/all")

rows = secrets.get("keys") if isinstance(secrets, dict) else secrets
if not isinstance(rows, list):
    raise SystemExit("[ERR] wallet-secrets shape not recognized")

wallet_names = []
for row in rows:
    if isinstance(row, dict):
        name = str(row.get("name") or row.get("id") or row.get("label") or "").strip()
        if name:
            wallet_names.append(name)

required_wallet_names = [
    "hot_wallet",
    "treasury_admin",
    "ops_admin",
    "validator_admin",
]
present_required_wallet_names = [x for x in required_wallet_names if x in wallet_names]
missing_required_wallet_names = [x for x in required_wallet_names if x not in wallet_names]

epoch2_summary = epoch2.get("summary") or {}
window_rows = window2.get("window") or []
unique_rewards = sorted({str(x.get("reward","")).lower() for x in window_rows if isinstance(x, dict) and x.get("reward")})

report = {
    "ok": True,
    "policyVersion": 1,
    "multivalidatorReadiness": {
        "bridgeBaselineGreen": (multi.get("bridgeBaseline") or {}).get("baselineGreen"),
        "multivalidatorGreen": (multi.get("upgradeMultivalidator") or {}).get("multivalidatorGreen"),
        "readyForContinuedValidatorOnboarding": multi.get("readyForContinuedValidatorOnboarding"),
    },
    "walletInventory": {
        "requiredWalletNames": required_wallet_names,
        "presentRequiredWalletNames": present_required_wallet_names,
        "missingRequiredWalletNames": missing_required_wallet_names,
        "walletCount": len(wallet_names),
    },
    "liveRuntime": {
        "loadedEpochs": status.get("loadedEpochs"),
        "latestEpoch": status.get("latestEpoch"),
        "epoch2ValidatorCount": epoch2_summary.get("validatorCount"),
        "epoch2TotalPower": epoch2_summary.get("totalPower"),
        "epoch2Published": epoch2_summary.get("published"),
        "epoch2PublishedMatch": epoch2_summary.get("publishedMatch"),
        "epoch2UniqueRewardCount": len(unique_rewards),
        "shadowMismatchCount": ((diag_all.get("shadowLatestSummary") or {}).get("mismatchCount")),
        "compareCoreMismatchCount": ((diag_all.get("compareLatestSummary") or {}).get("coreMismatchCount")),
    },
}

green = all([
    report["multivalidatorReadiness"]["readyForContinuedValidatorOnboarding"] is True,
    not missing_required_wallet_names,
    status.get("loadedEpochs") == [1, 2],
    status.get("latestEpoch") == 2,
    epoch2_summary.get("validatorCount") == 2,
    str(epoch2_summary.get("totalPower")) == "2000000000000000000000",
    epoch2_summary.get("published") is True,
    epoch2_summary.get("publishedMatch") is True,
    len(unique_rewards) >= 2,
    ((diag_all.get("shadowLatestSummary") or {}).get("mismatchCount") == 0),
    ((diag_all.get("compareLatestSummary") or {}).get("coreMismatchCount") == 0),
])

report["green"] = green
report["nextLane"] = (
    "validator3 onboarding proof is allowed by policy gate"
    if green else
    "do not onboard another validator until runbook gate is green"
)

Path(out_json_s).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

print("=== [runbook gate summary] ===")
print(f"out_json={out_json_s}")
print(f"green={report['green']}")
print(f"wallet_count={report['walletInventory']['walletCount']}")
print(f"missing_required_wallet_names={report['walletInventory']['missingRequiredWalletNames']}")
print(f"loaded_epochs={report['liveRuntime']['loadedEpochs']}")
print(f"latest_epoch={report['liveRuntime']['latestEpoch']}")
print(f"epoch2_validator_count={report['liveRuntime']['epoch2ValidatorCount']}")
print(f"epoch2_total_power={report['liveRuntime']['epoch2TotalPower']}")
print(f"epoch2_unique_reward_count={report['liveRuntime']['epoch2UniqueRewardCount']}")
print(f"shadow_mismatch_count={report['liveRuntime']['shadowMismatchCount']}")
print(f"compare_core_mismatch_count={report['liveRuntime']['compareCoreMismatchCount']}")

if not green:
    raise SystemExit("[ERR] onboarding runbook gate is not green")
PY
