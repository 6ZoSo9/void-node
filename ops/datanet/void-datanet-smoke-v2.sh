#!/usr/bin/env bash
set -euo pipefail
# __VOID_SMOKEV2_WRAPPED_TO_V3_V1__
# Purpose: smoke-v2 historically performed BOTH fetch forms (query + path), creating duplicate receipts.
# Fix: delegate to smoke-v3 (single canonical fetch behavior).
exec bash "/home/zoso/dev/void-node/ops/datanet/void-datanet-smoke-v3.sh" "$@"
