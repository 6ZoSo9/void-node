#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

cd "$HOME/dev/void-node" || exit 1

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-bootstrap-gateway-routes-proof-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

echo "=== VOID public bootstrap gateway routes proof ==="
echo "mutation=false"
echo "base=$BASE"
echo "out=$OUT"

curl -fsS --max-time 10 "$BASE/bootstrap" > "$OUT/bootstrap.html"
curl -fsS --max-time 10 "$BASE/bootstrap/network.json" > "$OUT/network.json"
curl -fsS --max-time 10 "$BASE/bootstrap/peers.json" > "$OUT/peers.json"
curl -fsS --max-time 10 "$BASE/__void/ready.json" > "$OUT/ready.json"
curl -fsS --max-time 10 "$BASE/participant?account=tester" > "$OUT/participant.html"
curl -fsS --max-time 10 "$BASE/datanet/materialized-status" > "$OUT/datanet-status.html"

grep -q 'VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1' "$OUT/bootstrap.html"
grep -q 'discovery-only' "$OUT/bootstrap.html"
grep -q 'Public RPC 8545:</strong> false' "$OUT/bootstrap.html"

grep -q 'VOID Participant' "$OUT/participant.html"
grep -q 'DataNet materialization green' "$OUT/datanet-status.html"

python3 - "$OUT/network.json" "$OUT/peers.json" "$OUT/ready.json" <<'PY'
import json, sys

network=json.load(open(sys.argv[1]))
peers=json.load(open(sys.argv[2]))
ready=json.load(open(sys.argv[3]))

assert network.get("ok") is True, network
assert network.get("marker") == "VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1", network
assert network.get("gateway_authority") == "discovery_only_non_authority", network
assert network.get("network") == "void-mainnet0", network
assert int(network.get("chain_id")) == 2050, network
assert network.get("status") == "public_mainnet0_live", network
assert network.get("public_active_validator_admission") is False, network
assert network.get("public_validator_registration") == "candidate_waiting_only", network
assert network.get("public_rpc_8545") is False, network
assert network.get("admin_authority") is False, network
assert network.get("treasury_authority") is False, network
assert network.get("buy_void_fulfillment") is False, network
assert network.get("validator_mutation") is False, network
assert network.get("wallet_send") is False, network
assert network.get("wc_to_void_swap") is False, network

for key in ["participant_url", "ready_url", "datanet_status_url", "datanet_status_json_url", "peers_url"]:
    assert str(network.get(key) or "").startswith("http"), (key, network)

assert peers.get("ok") is True, peers
assert peers.get("marker") == "VOID_PUBLIC_BOOTSTRAP_GATEWAY_V1", peers
assert peers.get("network") == "void-mainnet0", peers
assert isinstance(peers.get("peers"), list) and peers["peers"], peers
p=peers["peers"][0]
assert p.get("role") == "bootstrap_gateway", p
assert int(p.get("peer_port")) == 4700, p
assert p.get("public_rpc_8545") is False, p
assert p.get("authority") == "none", p

assert ready.get("ready") is True, ready
assert int(ready.get("head")) == 1856587, ready
assert int(ready.get("gap")) == 0, ready
assert int(ready.get("txroot_live")) == 1, ready

print("[ok] bootstrap gateway json/routes verified")
PY

echo
echo "=== sensitive route spot-check ==="
for route in \
  /__void/status \
  /__void/participant/stake/next-onboard \
  /__void/operator/buy-void/fulfill \
  /__void/treasury \
  /__void/admin
do
  code="$(curl -sS -o "$OUT/sensitive-${route//\//_}.txt" -w '%{http_code}' "$BASE$route")"
  test "$code" = "404"
  echo "[ok] $route -> 404"
done

make public-bootstrap-gateway-proof
make mainnet0-public-surface-proof
make mainnet0-status-smoke

echo
echo "[ok] VOID public bootstrap gateway routes proof green"
echo "out=$OUT"
