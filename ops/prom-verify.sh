#!/usr/bin/env bash
set -euo pipefail
promtool check config /etc/prometheus/prometheus.yml
find /etc/prometheus/alerts -type f -name '*.yml' -print0 | xargs -0 -r -n1 promtool check rules
find /etc/prometheus/rules.d -type f -name '*.yml' -print0 | xargs -0 -r -n1 promtool check rules
echo "OK"
