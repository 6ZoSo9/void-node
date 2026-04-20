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
with urllib.request.urlopen(base + "/__void/runtime/validator-truth/operator-summary") as r:
    obj = json.loads(r.read().decode("utf-8", "replace"))

summary = obj.get("summary") or {}
print(json.dumps(obj, indent=2))

assert obj["ok"] is True, obj
assert summary["overallGreen"] is True, summary
assert summary["latestEpoch"] == 4, summary
assert summary["validatorCount"] == 4, summary
assert str(summary["totalPower"]) == "4000000000000000000000", summary
assert summary["uniqueRewardCount"] == 4, summary
assert summary["shadowMismatchCount"] == 0, summary
assert summary["compareCoreMismatchCount"] == 0, summary
assert summary["multivalidatorGateGreen"] is True, summary
assert summary["runbookGateGreen"] is True, summary
print("[ok] operator summary route green")
PY

echo
echo "=== [3] prove exporter ==="
OUT_FILE="$PROM_OUT" "$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-operator-summary-exporter.sh"

python3 - <<'PY' "$PROM_OUT"
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8")
required = {
    "void_validator_operator_summary_ok 1",
    "void_validator_operator_overall_green 1",
    "void_validator_operator_latest_epoch 4",
    "void_validator_operator_validator_count 4",
    "void_validator_operator_total_power 4000000000000000000000",
    "void_validator_operator_unique_reward_count 4",
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
