#!/usr/bin/env bash
set -euo pipefail

promtool check config /etc/prometheus/prometheus.yml

for dir in /etc/prometheus/alerts /etc/prometheus/rules.d /etc/prometheus/void-rules; do
  if [ -d "$dir" ]; then
    find "$dir" -type f -name '*.yml' -print0 | xargs -0 -r -n1 promtool check rules
  else
    echo "$dir missing; skipping rule scan"
  fi
done
