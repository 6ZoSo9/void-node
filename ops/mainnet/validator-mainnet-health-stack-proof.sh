#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"

echo "=== [1] prove validator operator summary route ==="
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-operator-summary-proof.sh"

echo
echo "=== [2] prove validator operator Prom lane ==="
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-operator-summary-prom-proof.sh"

echo
echo "=== [3] prove canonical validator/mainnet stack truth ==="
python3 - <<'PY' "$BASE" "$PROM_URL"
import json
import time
import urllib.parse
import urllib.request
import sys

base, prom = sys.argv[1:3]
base = base.rstrip("/")
prom = prom.rstrip("/")

def get_json(url: str):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read().decode("utf-8", "replace"))

def query(expr: str):
    url = prom + "/api/v1/query?" + urllib.parse.urlencode({"query": expr})
    obj = get_json(url)
    if obj.get("status") != "success":
        raise RuntimeError(obj)
    return obj.get("data", {}).get("result", [])

status = get_json(base + "/__void/runtime/validator-truth/status")
op = get_json(base + "/__void/runtime/validator-truth/operator-summary")
diag = get_json(base + "/__void/runtime/validator-truth/diag/all")

summary = op.get("summary") or {}
assert op.get("ok") is True, op
assert summary.get("overallGreen") is True, summary
assert status.get("mode") == "verified_epoch_manifests", status
assert status.get("latestEpoch") == 4, status
assert status.get("loadedEpochs") == [1, 2, 3, 4], status
assert summary.get("latestEpoch") == 4, summary
assert summary.get("validatorCount") == 4, summary
assert str(summary.get("totalPower")) == "4000000000000000000000", summary
assert summary.get("uniqueRewardCount") == 4, summary
assert summary.get("shadowMismatchCount") == 0, summary
assert summary.get("compareCoreMismatchCount") == 0, summary
assert summary.get("multivalidatorGateGreen") is True, summary
assert summary.get("runbookGateGreen") is True, summary

queries = {
    "void_validator_operator_overall_green": "1",
    "void_validator_operator_target_epoch": "4",
    "void_validator_operator_expected_validator_count": "4",
    "void_validator_operator_latest_epoch": "4",
    "void_validator_operator_validator_count": "4",
    "void_validator_operator_total_power": "4000000000000000000000",
    "void_validator_operator_unique_reward_count": "4",
    "void_validator_operator_shadow_mismatch_count": "0",
    "void_validator_operator_compare_core_mismatch_count": "0",
    "void_validator_operator_multivalidator_gate_green": "1",
    "void_validator_operator_runbook_gate_green": "1",
    "void_validator_operator:overall_green:last_5m": "1",
    "void_mainnet_keys_livejson_present": "1",
    "void_mainnet_keys_livejson_tracked": "1",
    "void_mainnet_keys_roles_ok": "1",
    "void_mainnet_keys_premine_schema_ok": "1",
    "void_mainnet_keys_health": "1",
    "void:mainnet_keys_roles_ok:gate:last_5m": "1",
    "void:mainnet_keys_health:gate:last_5m": "1",
    "void:mainnet_pillars:health_with_keys:last_5m": "1",
    "void:mainnet_pillars:health_with_validator_operator:last_5m": "1",
}

deadline = time.time() + 90
last = {}
while time.time() < deadline:
    ok = True
    for expr, expected in queries.items():
        res = query(expr)
        last[expr] = res
        if not res:
            ok = False
            continue
        value = str(res[0]["value"][1])
        if value != expected:
            ok = False
    if ok:
        break
    time.sleep(3)
else:
    raise SystemExit("[ERR] canonical validator/mainnet stack did not converge: " + json.dumps(last, indent=2))

report = {
    "ok": True,
    "validatorTruthStatus": {
        "mode": status.get("mode"),
        "loadedEpochs": status.get("loadedEpochs"),
        "latestEpoch": status.get("latestEpoch"),
        "sourceDir": status.get("sourceDir"),
    },
    "operatorSummary": summary,
    "diagAll": {
        "latestEpoch": diag.get("latestEpoch"),
        "shadowLatestSummary": diag.get("shadowLatestSummary"),
        "compareLatestSummary": diag.get("compareLatestSummary"),
    },
    "prometheus": last,
}
print(json.dumps(report, indent=2))
print("[ok] validator/mainnet health stack proof green")
PY
