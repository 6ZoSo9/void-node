#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN="${ALIEN:-zoso@100.122.79.39}"
PREC_TS="${PREC_TS:-100.93.2.116}"

echo "=== remote host truth ==="
ssh "$ALIEN" 'hostname'
echo

echo "=== precision over tailscale: health ==="
ssh "$ALIEN" "curl -fsS --max-time 5 http://${PREC_TS}:4100/health ; echo"
echo

echo "=== precision over tailscale: ready ==="
ssh "$ALIEN" "curl -fsS --max-time 5 http://${PREC_TS}:4100/__void/ready.json ; echo"
echo

echo "=== precision remote rpc should be closed ==="
ssh "$ALIEN" "curl --max-time 5 -H 'content-type: application/json' --data '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' http://${PREC_TS}:8545 ; echo || true"
echo

echo "=== local guard: precision tailscale still healthy ==="
curl -fsS --max-time 5 "http://${PREC_TS}:4100/health" ; echo
curl -fsS --max-time 5 "http://${PREC_TS}:4100/__void/ready.json" ; echo
