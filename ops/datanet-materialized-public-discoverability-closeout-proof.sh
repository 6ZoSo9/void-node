#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

DOC="docs/public/datanet-materialized-public-discoverability-closeout.md"
EXPECTED_HEAD="118b1713"
EXPECTED_TAG="ckpt-datanet-materialized-participant-status-card-v1-green-20260605-162416"

echo "=== DataNet materialized public discoverability closeout proof ==="
echo "mutation=false"

test -s "$DOC"

grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_DISCOVERABILITY_CLOSEOUT_V1' "$DOC"
grep -q "$EXPECTED_HEAD" "$DOC"
grep -q "$EXPECTED_TAG" "$DOC"
grep -q '/tmp/datanet-materialized-public-discoverability-sweep-closeout-20260605-162849.log' "$DOC"
grep -q '/tmp/datanet-materialized-public-discoverability-sweep-20260605-162818' "$DOC"

grep -q '/participant' "$DOC"
grep -q 'VOID_DATANET_MATERIALIZED_PARTICIPANT_STATUS_CARD_V1' "$DOC"
grep -q '/datanet/materialized-status' "$DOC"
grep -q '/__void/datanet/materialized-status.json' "$DOC"
grep -q '/__void/datanet/materialized-status.md' "$DOC"

grep -q 'participant_card_present=true' "$DOC"
grep -q 'participant_card_marker_present=true' "$DOC"
grep -q 'participant_card_links_status_route=true' "$DOC"
grep -q 'participant_card_links_json_route=true' "$DOC"
grep -q 'served_status_html_reachable=true' "$DOC"
grep -q 'served_status_json_reachable=true' "$DOC"
grep -q 'served_status_markdown_reachable=true' "$DOC"
grep -q 'local_card_proof_rc=0' "$DOC"
grep -q 'local_served_proof_rc=0' "$DOC"
grep -q 'alienware_discovery_rc=0' "$DOC"
grep -q 'crossbox_status_smoke_rc=0' "$DOC"

grep -q 'participant_to_datanet_status_path_green=true' "$DOC"
grep -q 'public_status_surface_green=true' "$DOC"
grep -q 'runtime_ready_verified=true' "$DOC"

grep -q 'ready=true' "$DOC"
grep -q 'head=1856587' "$DOC"
grep -q 'gap=0' "$DOC"
grep -q 'txroot_live=1' "$DOC"

grep -q 'buy_void_fulfillment=false' "$DOC"
grep -q 'validator_mutation=false' "$DOC"
grep -q 'wallet_send=false' "$DOC"
grep -q 'wc_to_void_swap=false' "$DOC"

CURRENT_HEAD="$(git rev-parse --short HEAD)"
CURRENT_DESCRIBE="$(git describe --tags --always --dirty)"

echo "current_head=$CURRENT_HEAD"
echo "current_describe=$CURRENT_DESCRIBE"

case "$CURRENT_HEAD" in
  "$EXPECTED_HEAD") echo "[ok] current head matches source closeout head" ;;
  *) echo "[info] current head differs because this proof may include the closeout doc commit" ;;
esac

echo
echo "=== served discoverability checks ==="
curl -fsS --max-time 10 'http://127.0.0.1:4100/participant?account=zoso' > /tmp/datanet-public-discoverability-closeout-participant.html
curl -fsS --max-time 10 'http://127.0.0.1:4100/datanet/materialized-status' > /tmp/datanet-public-discoverability-closeout-status.html
curl -fsS --max-time 10 'http://127.0.0.1:4100/__void/datanet/materialized-status.json' > /tmp/datanet-public-discoverability-closeout-status.json
curl -fsS --max-time 10 'http://127.0.0.1:4100/__void/datanet/materialized-status.md' > /tmp/datanet-public-discoverability-closeout-status.md

grep -q 'VOID_DATANET_MATERIALIZED_PARTICIPANT_STATUS_CARD_V1' /tmp/datanet-public-discoverability-closeout-participant.html
grep -q '/datanet/materialized-status' /tmp/datanet-public-discoverability-closeout-participant.html
grep -q '/__void/datanet/materialized-status.json' /tmp/datanet-public-discoverability-closeout-participant.html
grep -q 'DataNet materialization green' /tmp/datanet-public-discoverability-closeout-status.html
grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' /tmp/datanet-public-discoverability-closeout-status.json
grep -q 'VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1' /tmp/datanet-public-discoverability-closeout-status.md

python3 - <<'PY'
import json
j=json.load(open("/tmp/datanet-public-discoverability-closeout-status.json"))
assert j.get("ok") is True, j
assert j.get("marker") == "VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1", j
assert j.get("status") == "green", j
rt=j.get("runtime") or {}
assert rt.get("ready") is True, rt
assert int(rt.get("head")) == 1856587, rt
assert int(rt.get("gap")) == 0, rt
assert int(rt.get("txroot_live")) == 1, rt
s=j.get("safety_invariants") or {}
assert s.get("buy_void_fulfillment") is False, s
assert s.get("validator_mutation") is False, s
assert s.get("wallet_send") is False, s
assert s.get("wc_to_void_swap") is False, s
print("[ok] served status json verified")
PY

curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/datanet-public-discoverability-closeout-ready.json

python3 - <<'PY'
import json
j=json.load(open("/tmp/datanet-public-discoverability-closeout-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] runtime ready/gap/txroot verified")
PY

make datanet-materialized-participant-status-card-proof
make datanet-materialized-public-status-served-proof
make mainnet0-status-smoke

echo
echo "[ok] DataNet materialized public discoverability closeout proof green"
