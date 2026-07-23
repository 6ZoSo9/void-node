#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

node --check ops/public/void-public-app-composition-gateway-v1.mjs
node --check scripts/prove_public_app_composition_gateway_v1.mjs
node scripts/prove_public_app_composition_gateway_v1.mjs

echo "live_deployment=false"
echo "service_restart=false"
echo "funnel_cutover=false"
echo "node_restart=false"
echo "money_movement=false"
echo "guarded_lanes_activated=false"
echo "VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_PROOF_GREEN"
