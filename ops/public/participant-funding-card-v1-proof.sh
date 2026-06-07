#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"

echo "=== VOID participant funding card v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"

grep -Fq "VOID_PARTICIPANT_PUBLIC_FUNDING_CARD_V1" src/index.ts
grep -Fq "Buy VOID / Fund Development" src/index.ts
grep -Fq "/funding" src/index.ts
grep -Fq "/__void/funding/status.json" src/index.ts
grep -Fq "No automatic delivery" src/index.ts
grep -Fq "No investment return promised" src/index.ts

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/funding-support-v1-proof.sh

curl -fsS --max-time 10 "$PUBLIC_SEED_BASE/participant?account=tester" -o /tmp/void-participant-funding-card-public.html
grep -Fq "VOID_PARTICIPANT_PUBLIC_FUNDING_CARD_V1" /tmp/void-participant-funding-card-public.html
grep -Fq "Buy VOID / Fund Development" /tmp/void-participant-funding-card-public.html
grep -Fq "/funding" /tmp/void-participant-funding-card-public.html
grep -Fq "/__void/funding/status.json" /tmp/void-participant-funding-card-public.html
grep -Fq "No automatic delivery" /tmp/void-participant-funding-card-public.html
grep -Fq "No investment return promised" /tmp/void-participant-funding-card-public.html

echo "[ok] participant funding card v1 proof green"
