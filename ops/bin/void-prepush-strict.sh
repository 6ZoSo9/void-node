#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin"

# Strict mode:
# - keeps existing gates (pillars/proposer/etc)
# - enforces addons composite too
#
# You can still skip specific gates:
#   VOID_SKIP_AGENT_RECEIPTS_SPLIT=1  (skip agent receipts split UP gate)
#   VOID_SKIP_PILLARS_ADDONS=1        (skip addons composite gate)
#
# Or disable strict addons enforcement:
#   VOID_ENFORCE_PILLARS_ADDONS=0

cd "${HOME}/dev/void-node"

: "${PROM:=http://127.0.0.1:9090}"
export PROM

export VOID_ENFORCE_PILLARS_ADDONS="${VOID_ENFORCE_PILLARS_ADDONS:-1}"

exec bash ops/bin/void-proposer-v3b-pillars-check.sh

echo "[ok] prepush-strict $(date -Is) rev=$(git rev-parse --short HEAD)"
