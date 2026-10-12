#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
RULE_FILE="${RULE_FILE:-/etc/prometheus/rules.d/void-mainnet-validator-operator-pillars-rules.yml}"
STATE_DIR="${STATE_DIR:-$HOME/dev/void-node/.runtime/validator_operator_mainnet_pillars}"
STATE_JSON="$STATE_DIR/latest.json"

mkdir -p "$STATE_DIR"

echo "=== [1] detect existing mainnet pillars base metric ==="
readarray -t INFO < <(
python3 - <<'PY' "$PROM_URL"
import json, urllib.parse, urllib.request, sys

prom = sys.argv[1].rstrip("/")
candidates = [
    "void:mainnet_pillars:health_with_keys:last_5m",
    "void:mainnet_pillars:health:last_5m",
]

def query(expr: str):
    url = prom + "/api/v1/query?" + urllib.parse.urlencode({"query": expr})
    with urllib.request.urlopen(url) as r:
        obj = json.loads(r.read().decode("utf-8", "replace"))
    if obj.get("status") != "success":
        raise RuntimeError(obj)
    return obj.get("data", {}).get("result", [])

for expr in candidates:
    res = query(expr)
    if res:
        print(expr)
        print(res[0]["value"][1])
        raise SystemExit(0)

raise SystemExit("[ERR] no existing mainnet pillars base metric found")
PY
)

BASE_METRIC="${INFO[0]}"
BASE_VALUE="${INFO[1]}"

echo "base_metric=$BASE_METRIC"
echo "base_value=$BASE_VALUE"

echo
echo "=== [2] write additive Prometheus rule file ==="
TMP_RULE="$(mktemp)"
cat > "$TMP_RULE" <<EOF2
groups:
  - name: void-mainnet-validator-operator-pillars
    rules:
      - record: void:validator_operator:overall_green:last_5m
        expr: max without(instance,job) (max_over_time(void_validator_operator_overall_green[5m]))

      - record: void:mainnet_pillars:health_with_validator_operator:last_5m
        expr: vector(scalar(max(${BASE_METRIC})) * scalar(void:validator_operator:overall_green:last_5m))

      - alert: VoidMainnetPillarsWithValidatorOperatorUnhealthy
        expr: void:mainnet_pillars:health_with_validator_operator:last_5m < 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: VOID mainnet pillars with validator operator health are unhealthy
          description: Composite mainnet pillars health including validator operator has been below 1 for 5 minutes.
EOF2

sudo install -o root -g root -m 0644 "$TMP_RULE" "$RULE_FILE"
rm -f "$TMP_RULE"

echo "rule_file=$RULE_FILE"
echo
sudo sed -n '1,220p' "$RULE_FILE"

echo
echo "=== [3] promtool check rules ==="
sudo promtool check rules "$RULE_FILE"

echo
echo "=== [4] reload Prometheus ==="
if [ -x /usr/local/bin/prom-safe-reload.sh ]; then
  sudo /usr/local/bin/prom-safe-reload.sh
else
  sudo systemctl reload prometheus
fi

echo
echo "=== [5] write install state ==="
python3 - <<'PY' "$STATE_JSON" "$PROM_URL" "$RULE_FILE" "$BASE_METRIC" "$BASE_VALUE"
import json, sys
from pathlib import Path

state_json, prom_url, rule_file, base_metric, base_value = sys.argv[1:6]
obj = {
    "ok": True,
    "promUrl": prom_url,
    "ruleFile": rule_file,
    "baseMetric": base_metric,
    "baseMetricValueAtInstall": base_value,
}
Path(state_json).write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")
print(json.dumps(obj, indent=2))
print(f"[ok] wrote {state_json}")
PY

echo
echo "[ok] validator-operator mainnet-pillars install complete"
