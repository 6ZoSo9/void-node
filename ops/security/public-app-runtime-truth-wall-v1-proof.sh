#!/usr/bin/env bash
set -Eeuo pipefail

node --check ops/public/void-public-app-composition-gateway-v1.mjs
node --check scripts/prove_public_app_runtime_truth_wall_v1.mjs

python3 - <<'PY'
from pathlib import Path
import re

paths = [
    Path("ops/public/void-public-app-composition-gateway-v1.mjs"),
    Path("scripts/prove_public_app_runtime_truth_wall_v1.mjs"),
]
pattern = re.compile(r"catch(?:\s*\([^)]*\))?\s*\{\s*\}", re.S)
bad = []
for path in paths:
    text = path.read_text(encoding="utf-8")
    for match in pattern.finditer(text):
        line = text.count("\n", 0, match.start()) + 1
        bad.append(f"{path}:{line}")
if bad:
    raise SystemExit("raw empty catches: " + ", ".join(bad))
print("public_runtime_truth_changed_file_empty_catches=0")
PY

node scripts/prove_public_app_runtime_truth_wall_v1.mjs
node scripts/prove_public_app_composition_gateway_v1.mjs

echo "strict_readiness_preserved=true"
echo "restricted_ready_not_full_ready=true"
echo "public_ui_quarantine_truth=explicit"
echo "browser_private_account_fetches=0"
echo "live_deployment=false"
echo "service_restart=false"
echo "funnel_cutover=false"
echo "node_restart=false"
echo "money_movement=false"
echo "VOID_PUBLIC_APP_RUNTIME_TRUTH_WALL_V1_PROOF_GREEN"
