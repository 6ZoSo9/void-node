#!/usr/bin/env bash
set -euo pipefail

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_RUNTIME_MOUNT_FIX_PROOF_BEGIN"

src="src/index.ts"

grep -F "VOID_MONEY_ENGINE_ALIGNMENT_V1" "$src" >/dev/null
grep -F "__voidMountMoneyEngineAlignmentV1" "$src" >/dev/null
grep -F "__voidTryMountMoneyEngineAlignmentV1" "$src" >/dev/null
grep -F "__void_http_app" "$src" >/dev/null
grep -F 'app.get("/public-node/money-engine-v1.json"' "$src" >/dev/null
grep -F 'app.get("/public-node/money-engine-v1"' "$src" >/dev/null
grep -F "[money-engine-alignment.v1] mounted public GET routes" "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path

s = Path("src/index.ts").read_text()
route = 'app.get("/public-node/money-engine-v1.json"'
mount = "function __voidMountMoneyEngineAlignmentV1"

route_i = s.find(route)
mount_i = s.find(mount)

if route_i == -1:
    raise SystemExit("missing money-engine json route")
if mount_i == -1:
    raise SystemExit("missing money-engine mount function")
if route_i < mount_i:
    raise SystemExit("money-engine app.get appears before mount function; likely top-level again")

# Confirm there is no raw top-level direct route before the mount wrapper.
pre_mount = s[:mount_i]
if route in pre_mount:
    raise SystemExit("top-level money-engine app.get remains before mount wrapper")
PY

if grep -E "app\\.(post|put|patch|delete)\\('/public-node/money-engine-v1" "$src" >/dev/null; then
  echo "STOP: money-engine route must remain GET-only."
  exit 1
fi

if grep -E "app\\.(post|put|patch|delete)\\('/public-node" "$src" >/dev/null; then
  echo "STOP: public-node mutation route detected."
  exit 1
fi

echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_RUNTIME_MOUNT_FIX_ASSERT_GREEN"
echo "VOID_MONEY_ENGINE_ALIGNMENT_V1_RUNTIME_MOUNT_FIX_GREEN"
