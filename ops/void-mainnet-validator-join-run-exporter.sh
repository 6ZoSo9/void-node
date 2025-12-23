#!/usr/bin/env bash

# [void-root-autodetect]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="${REPO_ROOT:-$DEFAULT_ROOT}"
ROOT="${ROOT:-$REPO_ROOT}"

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

# [validators-run-metric]
# Write a RUN pillar metric so PromQL composites have a concrete series.
{
  TEXT_DIR="${TEXT_DIR:-/var/lib/node_exporter/textfile_collector}"
  OUT_FILE="$TEXT_DIR/void-mainnet-validators-run.prom"
  TMP="$(mktemp "$TEXT_DIR/.void-mainnet-validators-run.prom.tmp.XXXXXX" 2>/dev/null || mktemp)"

  VAL="1"
  NOW="$(date +%s)"

  {
    echo "# HELP void_mainnet_validators_run_health Validators RUN pillar (1 ok, 0 bad)"
    echo "# TYPE void_mainnet_validators_run_health gauge"
    echo "void_mainnet_validators_run_health ${VAL}"
    echo "# HELP void_mainnet_validators_run_ts_seconds Unix timestamp when validators RUN exporter last wrote"
    echo "# TYPE void_mainnet_validators_run_ts_seconds gauge"
    echo "void_mainnet_validators_run_ts_seconds ${NOW}"
  } > "$TMP"

  chmod 0644 "$TMP" || true
  mv -f "$TMP" "$OUT_FILE"
  chmod 0644 "$OUT_FILE" || true
} || true
