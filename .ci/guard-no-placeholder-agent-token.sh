#!/usr/bin/env bash
set -euo pipefail
grep -R --line-number --fixed-strings 'VOID_AGENT_TOKEN=${VOID_AGENT_TOKEN}' \
  ~/.config/systemd/user/void-node.service.d 2>/dev/null && {
    echo "[FAIL] Placeholder VOID_AGENT_TOKEN detected in drop-ins"; exit 1; }
exit 0
