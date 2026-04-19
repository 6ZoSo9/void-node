#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

CONF="${1:-ops/mainnet/void-mainnet.deployed.json}"
RPC="${RPC:-http://127.0.0.1:8545}"

echo "=== deployed artifact ==="
sed -n '1,240p' "$CONF"

echo
echo "=== chain truth ==="
cast chain-id --rpc-url "$RPC"

echo
echo "=== code presence on frozen contracts ==="
python3 - <<'PY' "$CONF" > /tmp/void_mainnet_deployed_contracts.$$
import json, sys
j = json.load(open(sys.argv[1], 'r', encoding='utf-8'))
for k, v in j["contracts"].items():
    print(f"{k} {v}")
PY

while read -r name addr; do
  [ -n "${name:-}" ] || continue
  code="$(cast code --rpc-url "$RPC" "$addr" 2>/dev/null || true)"
  if [ -z "$code" ] || [ "$code" = "0x" ]; then
    echo "[ERR] $name $addr code missing"
    exit 1
  fi
  echo "[ok] $name $addr code present"
done < /tmp/void_mainnet_deployed_contracts.$$

echo
echo "=== admin gate master key truth ==="
EXPECT_MASTER="$(python3 - <<'PY' "$CONF"
import json, sys
j = json.load(open(sys.argv[1], 'r', encoding='utf-8'))
print(j["handoff"]["final"]["adminGateMasterKey"])
PY
)"
ACTUAL_MASTER="$(cast call --rpc-url "$RPC" 0xDAdb70747fb39E79c867811f5A5592C1611bCb52 'masterKey()(address)')"
echo "expected=$EXPECT_MASTER"
echo "actual=$ACTUAL_MASTER"
test "$EXPECT_MASTER" = "$ACTUAL_MASTER"

echo
echo "=== node health truth ==="
curl -fsS --max-time 5 http://127.0.0.1:4100/health ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo
