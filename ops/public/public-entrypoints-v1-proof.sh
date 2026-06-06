#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-entrypoints-v1.md"
PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"

echo "=== VOID public entrypoints v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"

grep -Fq "VOID public access is domain-optional" "$DOC"
grep -Fq "$PUBLIC_SEED_BASE" "$DOC"
grep -Fq "void://mainnet0/public-seed" "$DOC"
grep -Fq "custom DNS aliases are optional wrappers only" "$DOC"
grep -Fq "no paid custom domain required" "$DOC"
grep -Fq "/rpc is blocked" "$DOC"
grep -Fq "8545 remains private" "$DOC"

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

echo "[ok] public entrypoints v1 proof green"
