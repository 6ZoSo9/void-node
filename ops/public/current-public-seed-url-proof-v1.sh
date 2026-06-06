#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
DOC="docs/public/current-public-seed-url.md"

echo "=== VOID current public seed URL proof v1 ==="
echo "base=$PUBLIC_SEED_BASE"

grep -Fq "$PUBLIC_SEED_BASE" "$DOC"
grep -Fq "no Google Cloud hosting" "$DOC"
grep -Fq "no paid VPS required" "$DOC"
grep -Fq "/rpc is blocked" "$DOC"
grep -Fq "8545 remains private" "$DOC"

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

echo "[ok] current public seed URL proof v1 green"
