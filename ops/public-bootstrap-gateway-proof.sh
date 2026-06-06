#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

DOC="docs/public/public-bootstrap-gateway.md"

echo "=== VOID public bootstrap gateway proof ==="
echo "mutation=false"

test -s "$DOC"

grep -q 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1' "$DOC"
grep -q 'users should not need router configuration' "$DOC"
grep -q 'discovery infrastructure only' "$DOC"
grep -q 'Non-authority rule' "$DOC"

grep -q '/__void/ready.json' "$DOC"
grep -q '/participant' "$DOC"
grep -q '/datanet/materialized-status' "$DOC"
grep -q '/__void/datanet/materialized-status.json' "$DOC"
grep -q '/bootstrap/network.json' "$DOC"
grep -q '/bootstrap/peers.json' "$DOC"

grep -q 'public 8545' "$DOC"
grep -q 'admin routes' "$DOC"
grep -q 'treasury routes' "$DOC"
grep -q 'validator mutation routes' "$DOC"
grep -q 'Buy VOID fulfillment routes' "$DOC"
grep -q 'wallet send routes' "$DOC"
grep -q 'WC-to-VOID execution routes' "$DOC"

grep -q '"chain_id": 2050' "$DOC"
grep -q '"network": "void-mainnet0"' "$DOC"
grep -q '"status": "public_mainnet0_live"' "$DOC"
grep -q '"public_active_validator_admission": false' "$DOC"
grep -q '"public_validator_registration": "candidate_waiting_only"' "$DOC"

grep -q 'public 4100' "$DOC"
grep -q 'public 4700' "$DOC"
grep -q 'private/local-only 8545' "$DOC"
grep -q 'no private keys' "$DOC"
grep -q 'no validator mutation authority' "$DOC"
grep -q 'no treasury authority' "$DOC"

grep -q 'buy_void_fulfillment=false' "$DOC"
grep -q 'validator_mutation=false' "$DOC"
grep -q 'wallet_send=false' "$DOC"
grep -q 'wc_to_void_swap=false' "$DOC"
grep -q 'public_rpc_8545=false' "$DOC"
grep -q 'admin_authority=false' "$DOC"
grep -q 'treasury_authority=false' "$DOC"

echo
echo "=== current runtime still green ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/void-public-bootstrap-gateway-ready.json

python3 - <<'PY'
import json
j=json.load(open("/tmp/void-public-bootstrap-gateway-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("head")) == 1856587, j
assert int(j.get("gap")) == 0, j
assert int(j.get("txroot_live")) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== public surface still green ==="
make mainnet0-public-surface-proof
make public-run-node-support-proof
make mainnet0-status-smoke

echo
echo "[ok] VOID public bootstrap gateway proof green"
