#!/usr/bin/env bash
set -euo pipefail
grep -R --line-number --fixed-strings 'Environment=VOID_AGENT_TOKEN=${VOID_AGENT_TOKEN}' \
  ~/.config/systemd/user/void-node.service.d 2>/dev/null && {
  echo "[FAIL] Systemd drop-in uses a literal \${VOID_AGENT_TOKEN}; write the real value."; exit 1; }
exit 0
