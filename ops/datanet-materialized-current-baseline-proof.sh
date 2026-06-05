#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

DOC="docs/public/datanet-materialized-current-baseline.md"
EXPECTED_HEAD="7bb86976"
EXPECTED_TAG="ckpt-no-manual-peer-seed-tailscale-preflight-guard-v1-green-20260605-154722"

echo "=== DataNet materialized current baseline proof ==="
echo "mutation=false"

test -s "$DOC"

grep -q 'VOID_DATANET_MATERIALIZED_CURRENT_BASELINE_V1' "$DOC"
grep -q "$EXPECTED_HEAD" "$DOC"
grep -q "$EXPECTED_TAG" "$DOC"
grep -q '/tmp/materialized-stack-after-tailscale-preflight-guard-sweep-closeout-20260605-155537.log' "$DOC"

grep -q 'build_rc=0' "$DOC"
grep -q 'tailscale_preflight_rc=0' "$DOC"
grep -q 'no_manual_peer_seed_rc=0' "$DOC"
grep -q 'materialized_local_persistence_rc=0' "$DOC"
grep -q 'materialized_restart_persistence_rc=0' "$DOC"
grep -q 'materialized_copy_integrity_rc=0' "$DOC"
grep -q 'materialized_provenance_rc=0' "$DOC"
grep -q 'materialized_provenance_status_view_rc=0' "$DOC"
grep -q 'status_smoke_rc=0' "$DOC"
grep -q 'crossbox_status_smoke_rc=0' "$DOC"

grep -q 'tailscale_preflight_guard_exercised=true' "$DOC"
grep -q 'hidden_tailscale_auth_hang_prevented=true' "$DOC"
grep -q 'viewer_provenance_status_proof_still_green=true' "$DOC"
grep -q 'materialized_copy_integrity_still_green=true' "$DOC"
grep -q 'restart_persistence_still_green=true' "$DOC"

grep -q 'buy_void_fulfillment=false' "$DOC"
grep -q 'validator_mutation=false' "$DOC"
grep -q 'wallet_send=false' "$DOC"
grep -q 'wc_to_void_swap=false' "$DOC"

CURRENT_HEAD="$(git rev-parse --short HEAD)"
CURRENT_DESCRIBE="$(git describe --tags --always --dirty)"

echo "current_head=$CURRENT_HEAD"
echo "current_describe=$CURRENT_DESCRIBE"

case "$CURRENT_HEAD" in
  "$EXPECTED_HEAD") echo "[ok] current head matches baseline source head" ;;
  *) echo "[info] current head differs because this proof may include the baseline doc commit" ;;
esac

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/datanet-materialized-current-baseline-ready.json

python3 - <<'PY'
import json
p="/tmp/datanet-materialized-current-baseline-ready.json"
j=json.load(open(p))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] runtime ready/gap/txroot verified")
PY

make tailscale-ssh-auth-preflight-proof
make mainnet0-status-smoke

echo
echo "[ok] DataNet materialized current baseline proof green"
