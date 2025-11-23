#!/usr/bin/env bash
set -euo pipefail

CFG="/etc/prometheus/prometheus.yml"

echo "=== [head - first 40 lines] ==="
sudo sed -n '1,40p' "${CFG}"

echo
echo "=== [scrape_configs block + following 80 lines] ==="
sudo awk '
  /scrape_configs:/ { start=NR }
  { if (NR>=start && NR<start+80) print }
' "${CFG}"

echo
echo "=== [rule_files lines with numbers] ==="
sudo nl -ba "${CFG}" | grep 'rule_files:' || echo "no rule_files key?"
