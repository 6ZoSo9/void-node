#!/usr/bin/env bash
set -euo pipefail
PATCH="$HOME/dev/void-node/patches/lock-saveblock.mjs"
export NODE_OPTIONS="${NODE_OPTIONS:-} --import file://$PATCH"
exec npx --yes tsx src/index.ts
