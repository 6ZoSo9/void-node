#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

# Thin wrapper that forwards to the v2 hammer.
exec ./ops/void-mainnet-bootstrap-plan-with-secrets-v2.sh "$@"
