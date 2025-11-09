#!/usr/bin/env bash
set -euo pipefail
hits=$(grep -RInE '(^|[^0-9])4102([^0-9]|$)|BACKEND_HTTP_PORT' ops/systemd-user || true)
if [[ -n "$hits" ]]; then
  echo "[FAIL] Found forbidden 4102/BACKEND refs in ops/systemd-user:"
  echo "$hits"
  exit 1
fi
