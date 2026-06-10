#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/public-node-readme-pointer-v1-proof-$STAMP"
mkdir -p "$OUT"

echo "=== Public Node README Pointer v1 proof ==="
echo "out=$OUT"

grep -Fq "VOID_PUBLIC_NODE_README_POINTER_V1" README.md
grep -Fq "/public-node" README.md
grep -Fq "PUBLIC_NODE_EXTERNAL_BASE_URL=https://your-domain.example npm start" README.md
grep -Fq "/public-node/public-exposure-smoke-pack.json" README.md
grep -Fq "PUBLIC_NODE_BASE=https://your-domain.example" README.md
grep -Fq "public routes only" README.md
grep -Fq "does not touch private APIs" README.md

grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_ROUTE_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_UI_V1" src/index.ts
grep -Fq "VOID_PUBLIC_NODE_PUBLIC_EXPOSURE_SMOKE_PACK_V1_GREEN" ops/mainnet0/public-node-public-exposure-smoke-pack-proof.sh
echo "[ok] README/source markers"

npm run build
echo "[ok] build"

echo "marker=VOID_PUBLIC_NODE_README_POINTER_V1"
echo "readme_pointer=true"
echo "entry=/public-node"
echo "smoke_pack=/public-node/public-exposure-smoke-pack.json"
echo "operator_env=PUBLIC_NODE_EXTERNAL_BASE_URL"
echo "public_routes_only=true"
echo "read_only=true"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
echo "out=$OUT"
echo "VOID_PUBLIC_NODE_README_POINTER_V1_GREEN"
