#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/public-entrypoints-v1.md"
PUBLIC_SEED_BASE="${PUBLIC_SEED_BASE:-https://seed.nullfeed.org}"

echo "=== VOID public entrypoints v1 proof ==="
echo "base=$PUBLIC_SEED_BASE"

python3 - "$PUBLIC_SEED_BASE" <<'PY'
import json, sys
base=sys.argv[1]
manifest=json.load(open("public/bootstrap/v1.json"))
enabled=[x for x in manifest.get("sync_endpoints", []) if x.get("enabled") is True]
assert any(x.get("base") == base for x in enabled), (base, enabled)
print("[ok] entrypoint default matches committed bootstrap endpoint")
PY

grep -Fq "VOID public access is domain-optional" "$DOC"
grep -Fq "$PUBLIC_SEED_BASE" "$DOC"
grep -Fq "Fresh qualification and an unexpired bootstrap manifest are required" "$DOC"
grep -Fq "retired Alienware Funnel URL is historical verification evidence only" "$DOC"
grep -Fq "void://mainnet0/public-seed" "$DOC"
grep -Fq "custom DNS aliases are optional wrappers only" "$DOC"
grep -Fq "no paid custom domain required" "$DOC"
grep -Fq "/rpc is blocked" "$DOC"
grep -Fq "8545 remains private" "$DOC"

PUBLIC_SEED_BASE="$PUBLIC_SEED_BASE" bash ops/public/vps-public-seed-internet-proof-v2.sh

echo "[ok] public entrypoints v1 proof green"
