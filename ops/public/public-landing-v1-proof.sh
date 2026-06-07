#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"

echo "=== VOID public landing v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"

grep -Fq "VOID_PUBLIC_LANDING_ROOT_V1" src/index.ts
grep -Fq "VOID Network is live" src/index.ts
grep -Fq "/participant" src/index.ts
grep -Fq "/funding" src/index.ts
grep -Fq "/__void/adapter.json" src/index.ts
grep -Fq "/__void/ready.json" src/index.ts
grep -Fq "/__void/public-bootstrap.json" src/index.ts
grep -Fq "/__void/funding/status.json" src/index.ts
grep -Fq "No automatic token delivery" src/index.ts
grep -Fq "No investment return promised" src/index.ts
grep -Fq "/rpc" src/index.ts

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/participant-funding-card-v1-proof.sh

curl -fsS --max-time 30 "$PUBLIC_SEED_BASE/" -o /tmp/void-public-landing.html
grep -Fq "VOID_PUBLIC_LANDING_ROOT_V1" /tmp/void-public-landing.html
grep -Fq "VOID Network is live" /tmp/void-public-landing.html
grep -Fq "Open Participant Page" /tmp/void-public-landing.html
grep -Fq "Buy VOID / Fund Development" /tmp/void-public-landing.html
grep -Fq "/__void/public-seed-adapter/status.json" /tmp/void-public-landing.html
grep -Fq "No automatic token delivery" /tmp/void-public-landing.html
grep -Fq "No investment return promised" /tmp/void-public-landing.html
grep -Fq "/rpc" /tmp/void-public-landing.html

echo "[ok] public landing v1 proof green"
