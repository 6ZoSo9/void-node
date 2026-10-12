#!/usr/bin/env bash
set -euo pipefail

PLAN_JSON="${1:-/root/void-mainnet-plan/plan.latest.json}"

echo "=== [stub-plan-preflight] input ==="
echo "PLAN_JSON=$PLAN_JSON"
[[ -f "$PLAN_JSON" ]] || { echo "[ERR] missing plan json: $PLAN_JSON"; exit 2; }

python3 - "$PLAN_JSON" <<'PY'
import json, sys

path = sys.argv[1]
with open(path, "r") as f:
    j = json.load(f)

errs = []

def need_eq(key, expected):
    actual = j.get(key)
    if actual != expected:
        errs.append(f"{key} expected {expected!r}, got {actual!r}")

need_eq("ok", 1)
need_eq("stub_only", 1)
need_eq("plan_facts_ok", 1)
need_eq("marker_detected", 1)
need_eq("chain_id", 2050)

allowed_mode_status = {
    ("mainnet_plan_stub", "stub_only_not_live"),
    ("plan_only", "plan_only_not_live"),
}
mode_status = (j.get("mode"), j.get("status"))
if mode_status not in allowed_mode_status:
    errs.append(f"mode/status expected one of {sorted(allowed_mode_status)!r}, got {mode_status!r}")

need_eq("plan_version", "void-mainnet-plan-stub-v2")

rc = j.get("rc")
if rc not in (0, 1):
    errs.append(f"rc expected 0 or 1 for stub lane, got {rc!r}")

script_path = str(j.get("script_path", ""))
if "VoidMainnetBootstrapMainnetStub.s.sol" not in script_path:
    errs.append(f"script_path does not point at maintained stub script: {script_path!r}")

if errs:
    print("[ERR] stub plan preflight failed:")
    for e in errs:
        print(" - " + e)
    raise SystemExit(9)

print("[ok] stub plan preflight passed")
print(f"[ok] plan_artifact_path={j.get('plan_artifact_path')}")
print(f"[ok] plan_artifact_hash={j.get('plan_artifact_hash')}")
print(f"[ok] live_json_hash={j.get('live_json_hash')}")
PY
