#!/usr/bin/env bash
set -euo pipefail

VALIDATOR_NAME="${VALIDATOR_NAME:-validator0}"
TEXTFILE_DIR="${TEXTFILE_DIR:-/var/lib/node_exporter/textfile_collector}"
OUTFILE="${OUTFILE:-$TEXTFILE_DIR/void_mainnet_validator_join_run.prom}"

RUN_SCRIPT="${RUN_SCRIPT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/void-mainnet-validator-join-run.sh}"

TMP="$(mktemp)"
OK=0

if "$RUN_SCRIPT"; then
  OK=1
else
  OK=0
fi

mkdir -p "$TEXTFILE_DIR"

{
  echo "# HELP void_mainnet_validator_join_run_ok Validator join run() dry-run health (0/1)."
  echo "# TYPE void_mainnet_validator_join_run_ok gauge"
  echo "void_mainnet_validator_join_run_ok{validator=\"$VALIDATOR_NAME\"} $OK"
} > "$TMP"

install -m 0644 "$TMP" "$OUTFILE"
rm -f "$TMP"
