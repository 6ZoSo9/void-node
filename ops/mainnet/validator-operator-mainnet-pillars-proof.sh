#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

PROM_URL="${PROM_URL:-http://127.0.0.1:9090}"
STATE_JSON="${STATE_JSON:-$HOME/dev/void-node/.runtime/validator_operator_mainnet_pillars/latest.json}"

echo "=== [1] install state truth ==="
python3 - <<'PY' "$STATE_JSON"
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if not p.exists():
    raise SystemExit(f"[ERR] missing state json: {p}")
j = json.loads(p.read_text(encoding="utf-8"))
print(json.dumps(j, indent=2))
PY

BASE_METRIC="$(python3 - <<'PY' "$STATE_JSON"
import json, sys
print(json.loads(open(sys.argv[1], "r", encoding="utf-8").read())["baseMetric"])
PY
)"

echo
echo "=== [2] runtime rule group truth ==="
python3 - <<'PY' "$PROM_URL"
import json, urllib.request, sys

prom = sys.argv[1].rstrip("/")
u = prom + "/api/v1/rules"
with urllib.request.urlopen(u) as r:
    obj = json.loads(r.read().decode("utf-8", "replace"))

found = False
for group in obj["data"]["groups"]:
    if "void-mainnet-validator-operator-pillars" in str(group.get("name","")) or "void-mainnet-validator-operator-pillars" in str(group.get("file","")):
        found = True
        print(json.dumps({
            "name": group.get("name"),
            "file": group.get("file"),
            "interval": group.get("interval"),
            "lastEvaluation": group.get("lastEvaluation"),
            "rules": [
                {
                    "name": r.get("name"),
                    "query": r.get("query"),
                    "type": r.get("type"),
                    "health": r.get("health"),
                    "lastError": r.get("lastError"),
                }
                for r in group.get("rules", [])
            ],
        }, indent=2))
        break

if not found:
    raise SystemExit("[ERR] runtime rule group missing")
print("[ok] runtime rule group present")
PY

echo
echo "=== [3] Prometheus query proof ==="
python3 - <<'PY' "$PROM_URL" "$BASE_METRIC"
import json, time, urllib.parse, urllib.request, sys

prom = sys.argv[1].rstrip("/")
base_metric = sys.argv[2]

queries = {
    base_metric: None,
    "void_validator_operator_overall_green": "1",
    "void:validator_operator:overall_green:last_5m": "1",
    "void:mainnet_pillars:health_with_validator_operator:last_5m": None,
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
        if expected is not None:
            value = str(res[0]["value"][1])
            if value != expected:
                ok = False

    if ok:
        base_res = last[base_metric]
        op_res = last["void:validator_operator:overall_green:last_5m"]
        comp_res = last["void:mainnet_pillars:health_with_validator_operator:last_5m"]

        if not base_res or not op_res or not comp_res:
            ok = False
        else:
            base_v = float(base_res[0]["value"][1])
            op_v = float(op_res[0]["value"][1])
            comp_v = float(comp_res[0]["value"][1])
            expected_comp = base_v * op_v
            if comp_v != expected_comp:
                ok = False
            else:
                print(json.dumps({
                    "base_metric": base_metric,
                    "base_value": base_v,
                    "validator_operator_value": op_v,
                    "composite_value": comp_v,
                    "expected_composite_value": expected_comp,
                    "raw": last,
                }, indent=2))
                print("[ok] mainnet pillars composite matches base * validator_operator")
                raise SystemExit(0)
    time.sleep(3)

raise SystemExit("[ERR] composite rule did not match base * validator_operator: " + json.dumps(last, indent=2))
PY

echo
echo "[ok] validator-operator mainnet-pillars proof green"
