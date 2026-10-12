#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_BEGIN"
echo "host=$(hostname)"
echo "branch=$(git branch --show-current)"
echo "head=$(git rev-parse --short HEAD)"

echo "status_begin"
git status --short
echo "status_end"

echo "recent_funding_closeout_tags_begin"
git tag --list 'ckpt-funding-lane-final-closeout-seal-v1-*' | sort
echo "recent_funding_closeout_tags_end"

echo "src_route_sanity_begin"
if grep -F 'APP.get("/public-node/funding-proof-pack-v1.json"' src/index.ts >/dev/null; then
  echo "aborted funding proof pack route present: unsafe" >&2
  exit 11
fi

if grep -F 'APP.get("/public-node/funding-safe-public-packet-v1.json"' src/index.ts >/dev/null; then
  echo "safe public packet runtime route present: unsafe; expected docs/proof-only" >&2
  exit 12
fi

grep -F "VOID_FUNDING_GATEWAY_CARD_UI_V1" src/index.ts >/dev/null
grep -F "VOID_FUNDING_PATH_TIGHTEN_V1" src/index.ts >/dev/null
grep -F "VOID_PUBLIC_GATEWAY_TRIAD_SEAL_V1" src/index.ts >/dev/null
echo "src_route_sanity_green=true"
echo "src_route_sanity_end"

echo "VOID_RUNTIME_ROUTE_PATCH_SAFETY_PREFLIGHT_V1_GREEN"
