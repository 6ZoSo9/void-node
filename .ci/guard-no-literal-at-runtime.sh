#!/usr/bin/env bash
set -euo pipefail
PID=$(systemctl --user show -p MainPID --value void-node.service 2>/dev/null || echo)
[[ -z "$PID" ]] && exit 0
tr '\0' '\n' </proc/$PID/environ | grep -qx 'VOID_AGENT_TOKEN=${VOID_AGENT_TOKEN}' && {
  echo "[FAIL] Service running with literal placeholder for VOID_AGENT_TOKEN"; exit 1; }
exit 0
