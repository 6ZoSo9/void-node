#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="datanet:field-replication:real-two-box-closeout-smoke"
SCRIPT_VALUE="bash tools/check_datanet_field_replication_real_two_box_bounded_public_summary_closeout_runtime_v1.sh"

python3 - <<'PY'
from pathlib import Path
import json

script_name = "datanet:field-replication:real-two-box-closeout-smoke"
script_value = "bash tools/check_datanet_field_replication_real_two_box_bounded_public_summary_closeout_runtime_v1.sh"

pkg = json.loads(Path("package.json").read_text())
actual = pkg.get("scripts", {}).get(script_name)
if actual != script_value:
    raise SystemExit(f"bad package alias: {script_name}={actual!r}")

tool = Path("tools/check_datanet_field_replication_real_two_box_bounded_public_summary_closeout_runtime_v1.sh")
if not tool.exists():
    raise SystemExit(f"missing runtime smoke tool: {tool}")

print("package alias ok")
PY

npm run datanet:field-replication:real-two-box-closeout-smoke

echo "VOID_DATANET_REAL_TWO_BOX_CLOSEOUT_RUNTIME_SMOKE_ALIAS_V1_GREEN"
