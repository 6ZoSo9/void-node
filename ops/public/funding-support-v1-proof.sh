#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/funding-support-v1.md"
PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
URL="$PUBLIC_SEED_BASE/docs/public/funding-support-v1.md"

echo "=== VOID funding/support v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"
echo "url=$URL"

grep -Fq "VOID Network funding" "$DOC"
grep -Fq "USDC -> VOID" "$DOC"
grep -Fq "guarded Buy VOID" "$DOC"
grep -Fq "fulfillment is manual/guarded, not automatic" "$DOC"
grep -Fq "no automatic token delivery is promised" "$DOC"
grep -Fq "no investment return is promised" "$DOC"
grep -Fq "do not send funds expecting automatic delivery" "$DOC"
grep -Fq "private JSON-RPC is not public" "$DOC"
grep -Fq "wallet files, keys, secrets, admin routes, and operator routes are blocked" "$DOC"

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

curl -fsS --max-time 10 "$URL" -o /tmp/void-funding-support-public.md
grep -Fq "VOID Network funding" /tmp/void-funding-support-public.md
grep -Fq "USDC -> VOID" /tmp/void-funding-support-public.md
grep -Fq "guarded Buy VOID" /tmp/void-funding-support-public.md
grep -Fq "no automatic token delivery is promised" /tmp/void-funding-support-public.md
grep -Fq "no investment return is promised" /tmp/void-funding-support-public.md

echo "[ok] funding/support v1 proof green"
