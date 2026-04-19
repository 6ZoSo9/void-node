#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

PREC_TS="${PREC_TS:-100.93.2.116}"

echo "=== local node truth ==="
systemctl --user is-active void-node.service
curl -fsS --max-time 5 http://127.0.0.1:4100/health ; echo
curl -fsS --max-time 5 http://127.0.0.1:4100/__void/ready.json ; echo

echo
echo "=== tailscale endpoint truth ==="
curl -fsS --max-time 5 "http://${PREC_TS}:4100/health" ; echo
curl -fsS --max-time 5 "http://${PREC_TS}:4100/__void/ready.json" ; echo

echo
echo "=== remote rpc should be closed ==="
if curl --max-time 5 \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  "http://${PREC_TS}:8545"
then
  echo
  echo "[ERR] remote 8545 answered but should be closed"
  exit 1
else
  echo
  echo "[ok] remote 8545 closed"
fi

echo
echo "=== firewall truth ==="
sudo systemctl is-enabled void-node-lan-block.service
sudo systemctl status void-node-lan-block.service --no-pager -l | tail -n 12
sudo iptables -L INPUT -n -v --line-numbers | sed -n '1,12p'
