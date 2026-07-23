#!/usr/bin/env bash
set -Eeuo pipefail

node --check ops/public/public-seed-adapter-v1.mjs
node --check ops/public/void-public-app-composition-gateway-v1.mjs
node --check tools/void_public_earn_no_node_client_v1.mjs
node --check scripts/prove_public_participant_no_node_handoff_wall_v1.mjs
node --check scripts/prove_public_app_composition_gateway_v1.mjs

python3 - <<'PY'
from pathlib import Path
import re

paths = [
    Path("ops/public/public-seed-adapter-v1.mjs"),
    Path("ops/public/void-public-app-composition-gateway-v1.mjs"),
    Path("tools/void_public_earn_no_node_client_v1.mjs"),
    Path("scripts/prove_public_participant_no_node_handoff_wall_v1.mjs"),
    Path("scripts/prove_public_app_composition_gateway_v1.mjs"),
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
print("public_participant_handoff_changed_file_empty_catches=0")
PY

node scripts/prove_public_participant_no_node_handoff_wall_v1.mjs
npx tsx scripts/prove_void_public_earn_no_node_client_v1.ts
node scripts/prove_public_app_composition_gateway_v1.mjs
node scripts/prove_public_app_runtime_truth_wall_v1.mjs

echo "live_deployment=false"
echo "service_restart=false"
echo "funnel_cutover=false"
echo "node_restart=false"
echo "money_movement=false"
echo "VOID_PUBLIC_PARTICIPANT_NO_NODE_HANDOFF_WALL_V1_FULL_GREEN"
