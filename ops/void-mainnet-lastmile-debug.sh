#!/usr/bin/env bash
set -euo pipefail

TEXTDIR="/var/lib/node_exporter/textfile_collector"
FILE="${TEXTDIR}/void_mainnet_lastmile.prom"

echo "=== [ls textfile dir] ==="
ls -l "${TEXTDIR}" || echo "ls failed"

echo
echo "=== [cat lastmile file] ==="
sed -n '1,80p' "${FILE}" || echo "no file?"

echo
echo "=== [node_exporter metrics snippet for lastmile] ==="
if curl -fsS 'http://127.0.0.1:9100/metrics' | grep -n 'void_mainnet_lastmile' | sed -n '1,40p'; then
  echo "[ok] found in node_exporter /metrics"
else
  echo "[warn] NOT found in node_exporter /metrics"
fi

echo
echo "=== [node_exporter process flags] ==="
ps aux | grep node_exporter | grep -v grep || echo "no node_exporter process?"

echo
echo "=== [prometheus raw series check] ==="
curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_mainnet_lastmile_nonempty_ratio' \
  | jq '.data.result'
