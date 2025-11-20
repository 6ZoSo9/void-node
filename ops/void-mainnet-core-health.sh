#!/usr/bin/env bash
set -euo pipefail

echo '=== [A] service + env] ==='
systemctl --user status void-node.service --no-pager --lines=15 || true
echo
systemctl --user show void-node.service -p Environment \
  | sed 's/; /\n/g' \
  | egrep 'HTTP_PORT=|P2P_PORT=|VOID_P2P_PORT=|DATA_DIR=|NODE_PRIVKEY_PATH=|VOID_PROTOCOL_VERSION=|VOID_UPDATE_POLICY=' || true

echo
echo '=== [B] ports 4100/4700 bound] ==='
ss -ltpn | awk 'NR==1 || $4 ~ /:(4100|4700)$/'

echo
echo '=== [C] HTTP core health] ==='
curl -fsS 127.0.0.1:4100/head.txt | tr -d '\r'; echo
curl -fsS 127.0.0.1:4100/__void/ready.json | jq .

echo
echo '=== [D] txroot/header3/seals/proposer exporters] ==='
curl -fsS '127.0.0.1:4100/health/txroot3?format=prom'          | sed -n '1,6p' || echo '[txroot3 FAILED]'
curl -fsS  127.0.0.1:4100/__void/metrics/header3.prom          | egrep 'last_number|last_mismatch' || echo '[header3 FAILED]'
curl -fsS  127.0.0.1:4100/metrics/void/head                    | sed -n '1,6p' || echo '[head exporter FAILED]'
curl -fsS  127.0.0.1:4100/metrics/void/seals                   | sed -n '1,10p' || echo '[seals exporter FAILED]'
curl -fsS  127.0.0.1:4100/metrics/void/proposer.v3b.prom       | sed -n '1,10p' || echo '[proposer exporter FAILED]'

echo
echo '=== [E] quick OK summary] ==='
echo '[expect] ready=true, gap=0, txroot_health=1, header3_last_mismatch=-1, head/seal numbers equal, proposer_auto_enabled=1'
