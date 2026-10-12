#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
SERVICE_NAME="void-validator-operator-summary-export.service"
TIMER_NAME="void-validator-operator-summary-export.timer"

detect_textfile_dir() {
  local x=""
  x="$(systemctl cat node_exporter.service 2>/dev/null | tr ' ' '\n' | sed -n 's/^--collector\.textfile\.directory=\(.*\)$/\1/p' | tail -n 1 || true)"
  if [ -n "$x" ]; then
    printf '%s\n' "$x"
    return
  fi
  x="$(ps -eo args 2>/dev/null | grep '[n]ode_exporter' | tr ' ' '\n' | sed -n 's/^--collector\.textfile\.directory=\(.*\)$/\1/p' | tail -n 1 || true)"
  if [ -n "$x" ]; then
    printf '%s\n' "$x"
    return
  fi
  printf '%s\n' "/var/lib/node_exporter/textfile_collector"
}

TEXTFILE_DIR="${TEXTFILE_DIR:-$(detect_textfile_dir)}"
OUT_FILE="$TEXTFILE_DIR/void_validator_operator_summary.prom"

echo "=== [1] repo-side operator summary proof ==="
"$HOME/dev/void-node/ops/mainnet/validator-staking-upgrade-operator-summary-proof.sh"

echo
echo "=== [2] timer/service truth ==="
sudo systemctl --no-pager --full status "$SERVICE_NAME" | sed -n '1,80p'
echo
sudo systemctl --no-pager --full status "$TIMER_NAME" | sed -n '1,80p'

echo
echo "=== [3] collector file truth ==="
sudo ls -l "$OUT_FILE"
sudo sed -n '1,160p' "$OUT_FILE"

python3 - <<'PY' "$OUT_FILE" "$BASE"
import json
import sys
import urllib.request
from pathlib import Path

out_file, base = sys.argv[1:3]
text = Path(out_file).read_text(encoding="utf-8")

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
    raise SystemExit("[ERR] missing collector metrics: " + ", ".join(missing))
print("[ok] collector metrics file looks good")
PY

echo
echo "=== [4] Prometheus query proof ==="
python3 - <<'PY' "$PROM_URL" "$BASE"
import json
import time
import urllib.parse
import urllib.request
import sys

prom, base = sys.argv[1:3]
prom = prom.rstrip("/")
base = base.rstrip("/")

with urllib.request.urlopen(base + "/__void/runtime/validator-truth/operator-summary") as r:
    obj = json.loads(r.read().decode("utf-8", "replace"))

summary = obj.get("summary") or {}
queries = {
    "void_validator_operator_overall_green": "1",
    "void_validator_operator_target_epoch": str(summary["targetEpoch"]),
    "void_validator_operator_expected_validator_count": str(summary["expectedValidatorCount"]),
    "void_validator_operator_latest_epoch": str(summary["latestEpoch"]),
    "void_validator_operator_validator_count": str(summary["validatorCount"]),
    "void_validator_operator_total_power": str(summary["totalPower"]),
    "void_validator_operator_unique_reward_count": str(summary["uniqueRewardCount"]),
    "void_validator_operator_shadow_mismatch_count": "0",
    "void_validator_operator_compare_core_mismatch_count": "0",
    "void_validator_operator_multivalidator_gate_green": "1",
    "void_validator_operator_runbook_gate_green": "1",
    "void_validator_operator:overall_green:last_5m": "1",
}

def query(expr: str):
    url = prom + "/api/v1/query?" + urllib.parse.urlencode({"query": expr})
    with urllib.request.urlopen(url) as r:
        obj = json.loads(r.read().decode("utf-8", "replace"))
    if obj.get("status") != "success":
        raise RuntimeError(obj)
    return obj.get("data", {}).get("result", [])

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
        if str(res[0]["value"][1]) != expected:
            ok = False
    if ok:
        break
    time.sleep(3)
else:
    raise SystemExit("[ERR] Prometheus queries did not converge: " + json.dumps(last, indent=2))

print(json.dumps(last, indent=2))
print("[ok] Prometheus queries green")
PY

echo
echo "[ok] validator operator summary Prom proof green"
