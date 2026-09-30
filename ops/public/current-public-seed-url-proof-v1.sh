#!/usr/bin/env bash
set -euo pipefail

PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://seed.nullfeed.org}"
DOC="docs/public/current-public-seed-url.md"

echo "=== VOID current public seed URL proof v1 ==="
echo "base=$PUBLIC_SEED_BASE"

python3 - "$PUBLIC_SEED_BASE" <<'PY'
import json, sys
from datetime import datetime, timezone

base=sys.argv[1]
manifest=json.load(open("public/bootstrap/v1.json"))
enabled=[x for x in manifest.get("sync_endpoints", []) if x.get("enabled") is True]
assert any(x.get("base") == base for x in enabled), (base, enabled)

expires_raw=manifest.get("expires_at")
assert isinstance(expires_raw, str) and expires_raw, manifest
expires_at=datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
assert expires_at.tzinfo is not None, expires_raw
now=datetime.now(timezone.utc)
assert expires_at > now, f"bootstrap manifest expired at {expires_at.isoformat()} now={now.isoformat()}"
print(f"[ok] default origin matches committed bootstrap endpoint; expires_at={expires_at.isoformat()}")
PY

grep -Fq "$PUBLIC_SEED_BASE" "$DOC"
grep -Fq "no Google Cloud hosting" "$DOC"
grep -Fq "no paid VPS required" "$DOC"
grep -Fq "Fresh qualification and an unexpired bootstrap manifest are required" "$DOC"
grep -Fq "Alienware Funnel coordinate is historical verification evidence only" "$DOC"
grep -Fq "/rpc is blocked" "$DOC"
grep -Fq "8545 remains private" "$DOC"

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

echo "[ok] current public seed URL proof v1 green"
