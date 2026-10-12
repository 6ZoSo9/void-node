#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
PROM_OUT="${PROM_OUT:-/tmp/validator-staking-upgrade-operator-summary.prom}"

echo "=== [1] refresh operator summary latest ==="
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-operator-summary.sh"

echo
echo "=== [2] prove live route ==="
python3 - <<'PY' "$BASE"
import json
import urllib.request
import sys

base = sys.argv[1].rstrip("/")

def get_json(path: str):
    with urllib.request.urlopen(base + path) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

obj = get_json("/__void/runtime/validator-truth/operator-summary")
status = get_json("/__void/runtime/validator-truth/status")
summary = obj.get("summary") or {}

print(json.dumps(obj, indent=2))

assert obj.get("ok") is True, obj
assert summary.get("overallGreen") is True, summary

loaded_epochs = status.get("loadedEpochs") or []
latest_epoch = int(status.get("latestEpoch"))
validator_count = int(summary.get("validatorCount"))
unique_reward_count = int(summary.get("uniqueRewardCount"))
total_power = int(str(summary.get("totalPower")))

assert loaded_epochs == list(range(1, latest_epoch + 1)), status
assert summary.get("latestEpoch") == latest_epoch, (summary, status)
assert validator_count == len(loaded_epochs), (summary, status)
assert unique_reward_count == validator_count, summary
assert total_power == validator_count * 10**21, summary
assert summary.get("shadowMismatchCount") == 0, summary
assert summary.get("compareCoreMismatchCount") == 0, summary
assert summary.get("multivalidatorGateGreen") is True, summary
assert summary.get("runbookGateGreen") is True, summary

print("[ok] operator summary route green")
PY

echo
echo "=== [3] prove exporter ==="
OUT_FILE="$PROM_OUT" "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-operator-summary-exporter.sh"

python3 - <<'PY' "$PROM_OUT" "$BASE"
import json
import sys
import urllib.request
from pathlib import Path

prom_file, base = sys.argv[1:3]
text = Path(prom_file).read_text(encoding="utf-8")

with urllib.request.urlopen(base.rstrip("/") + "/__void/runtime/validator-truth/operator-summary") as r:
    obj = json.loads(r.read().decode("utf-8", "replace"))

summary = obj.get("summary") or {}
required = {
    "void_validator_operator_summary_ok 1",
    "void_validator_operator_overall_green 1",
    f"void_validator_operator_target_epoch {summary['targetEpoch']}",
    f"void_validator_operator_expected_validator_count {summary['expectedValidatorCount']}",
    f"void_validator_operator_latest_epoch {summary['latestEpoch']}",
    f"void_validator_operator_validator_count {summary['validatorCount']}",
    f"void_validator_operator_total_power {summary['totalPower']}",
    f"void_validator_operator_unique_reward_count {summary['uniqueRewardCount']}",
    "void_validator_operator_shadow_mismatch_count 0",
    "void_validator_operator_compare_core_mismatch_count 0",
    "void_validator_operator_multivalidator_gate_green 1",
    "void_validator_operator_runbook_gate_green 1",
}
missing = sorted(x for x in required if x not in text)
if missing:
    raise SystemExit("[ERR] missing metrics: " + ", ".join(missing))

print("[ok] operator summary exporter green")
PY

echo
echo "[ok] validator operator summary proof green"
