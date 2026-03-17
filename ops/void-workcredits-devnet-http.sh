#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
export ROOT

PORT="${WC_HTTP_PORT:-4311}"

echo "[workcredits-http] ROOT=$ROOT"
echo "[workcredits-http] PORT=$PORT"

exec node "$ROOT/ops/void-workcredits-devnet-http.cjs"
