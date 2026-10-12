#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

OPERATOR_SUMMARY_URL="${OPERATOR_SUMMARY_URL:-http://127.0.0.1:4100/__void/runtime/validator-truth/operator-summary}"
OUT_FILE="${OUT_FILE:-/tmp/validator-staking-upgrade-operator-summary.prom}"

python3 - <<'PY' "$OPERATOR_SUMMARY_URL" "$OUT_FILE"
import json
import urllib.request
import sys
from pathlib import Path

url, out_file = sys.argv[1:3]
with urllib.request.urlopen(url) as r:
    obj = json.loads(r.read().decode("utf-8", "replace"))

summary = obj.get("summary") or {}

def num(v):
    if v is None or v == "":
        return "0"
    return str(v)

lines = []
lines.append("# HELP void_validator_operator_summary_ok Whether the operator summary latest report was read successfully.")
lines.append("# TYPE void_validator_operator_summary_ok gauge")
lines.append(f"void_validator_operator_summary_ok {1 if obj.get('ok') else 0}")

lines.append("# HELP void_validator_operator_overall_green Whether the operator summary overall status is green.")
lines.append("# TYPE void_validator_operator_overall_green gauge")
lines.append(f"void_validator_operator_overall_green {1 if summary.get('overallGreen') else 0}")

lines.append("# HELP void_validator_operator_target_epoch Target epoch from operator summary.")
lines.append("# TYPE void_validator_operator_target_epoch gauge")
lines.append(f"void_validator_operator_target_epoch {num(summary.get('targetEpoch'))}")

lines.append("# HELP void_validator_operator_expected_validator_count Expected validator count from operator summary.")
lines.append("# TYPE void_validator_operator_expected_validator_count gauge")
lines.append(f"void_validator_operator_expected_validator_count {num(summary.get('expectedValidatorCount'))}")

lines.append("# HELP void_validator_operator_latest_epoch Latest epoch from operator summary.")
lines.append("# TYPE void_validator_operator_latest_epoch gauge")
lines.append(f"void_validator_operator_latest_epoch {num(summary.get('latestEpoch'))}")

lines.append("# HELP void_validator_operator_validator_count Current validator count from operator summary.")
lines.append("# TYPE void_validator_operator_validator_count gauge")
lines.append(f"void_validator_operator_validator_count {num(summary.get('validatorCount'))}")

lines.append("# HELP void_validator_operator_total_power Current total power from operator summary.")
lines.append("# TYPE void_validator_operator_total_power gauge")
lines.append(f"void_validator_operator_total_power {num(summary.get('totalPower'))}")

lines.append("# HELP void_validator_operator_unique_reward_count Unique rewards in current epoch window.")
lines.append("# TYPE void_validator_operator_unique_reward_count gauge")
lines.append(f"void_validator_operator_unique_reward_count {num(summary.get('uniqueRewardCount'))}")

lines.append("# HELP void_validator_operator_shadow_mismatch_count Current shadow mismatch count.")
lines.append("# TYPE void_validator_operator_shadow_mismatch_count gauge")
lines.append(f"void_validator_operator_shadow_mismatch_count {num(summary.get('shadowMismatchCount'))}")

lines.append("# HELP void_validator_operator_compare_core_mismatch_count Current compare core mismatch count.")
lines.append("# TYPE void_validator_operator_compare_core_mismatch_count gauge")
lines.append(f"void_validator_operator_compare_core_mismatch_count {num(summary.get('compareCoreMismatchCount'))}")

lines.append("# HELP void_validator_operator_multivalidator_gate_green Whether the multivalidator gate is green.")
lines.append("# TYPE void_validator_operator_multivalidator_gate_green gauge")
lines.append(f"void_validator_operator_multivalidator_gate_green {1 if summary.get('multivalidatorGateGreen') else 0}")

lines.append("# HELP void_validator_operator_runbook_gate_green Whether the onboarding runbook gate is green.")
lines.append("# TYPE void_validator_operator_runbook_gate_green gauge")
lines.append(f"void_validator_operator_runbook_gate_green {1 if summary.get('runbookGateGreen') else 0}")

Path(out_file).write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"[ok] wrote {out_file}")
print("\n".join(lines))
PY
