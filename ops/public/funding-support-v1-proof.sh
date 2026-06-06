#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/funding-support-v1.md"
PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
URL="$PUBLIC_SEED_BASE/docs/public/funding-support-v1.md"

echo "=== VOID funding/support v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"
echo "url=$URL"

grep -Fq "VOID Network funding and support" "$DOC"
grep -Fq "$PUBLIC_SEED_BASE" "$DOC"
grep -Fq "Funding helps pay for" "$DOC"
grep -Fq "no investment return is promised" "$DOC"
grep -Fq "do not send funds expecting automatic token delivery" "$DOC"
grep -Fq "private JSON-RPC is not public" "$DOC"
grep -Fq "wallet files, keys, secrets, admin routes, and operator routes are blocked" "$DOC"

curl -fsS --max-time 10 "$URL" -o /tmp/void-funding-support-public.md
grep -Fq "VOID Network funding and support" /tmp/void-funding-support-public.md
grep -Fq "no investment return is promised" /tmp/void-funding-support-public.md
grep -Fq "do not send funds expecting automatic token delivery" /tmp/void-funding-support-public.md

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

echo "[ok] funding/support v1 proof green"
