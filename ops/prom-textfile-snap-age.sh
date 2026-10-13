#!/usr/bin/env bash
set -euo pipefail

TARGET="/usr/local/bin/prom-textfile-snap-age.sh"
if [[ ! -x "$TARGET" ]]; then
  echo "error: Prometheus snapshot-age publisher is not installed: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
