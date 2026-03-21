#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

# Must work even if HOME is unset.
ROOT="${ROOT:-/home/zoso/dev/void-node}"
if [ -n "${HOME:-}" ] && [ -d "${HOME}/dev/void-node" ]; then
  ROOT="${HOME}/dev/void-node"
fi

PROOF="$ROOT/ops/datanet-loop-proof-v1.sh"
ts="$(date +%s)"

set +e
OUT="$($PROOF 2>&1)"
rc=$?
set -e

datasetId="$(printf "%s\n" "$OUT" | sed -n "s/^datasetId=//p" | tail -n 1 || true)"

{
  echo "# HELP void_datanet_loopproof_ok 1 if last loop proof run succeeded"
  echo "# TYPE void_datanet_loopproof_ok gauge"
  if [ "$rc" -eq 0 ]; then
    echo "void_datanet_loopproof_ok 1"
  else
    echo "void_datanet_loopproof_ok 0"
  fi

  echo "# HELP void_datanet_loopproof_last_run_timestamp_seconds unix timestamp of last run"
  echo "# TYPE void_datanet_loopproof_last_run_timestamp_seconds gauge"
  echo "void_datanet_loopproof_last_run_timestamp_seconds $ts"

  echo "# HELP void_datanet_loopproof_last_dataset_id present=1 with datasetId label for last successful run"
  echo "# TYPE void_datanet_loopproof_last_dataset_id gauge"
  if [ "$rc" -eq 0 ] && [ -n "${datasetId:-}" ]; then
    echo "void_datanet_loopproof_last_dataset_id{datasetId=\"${datasetId}\"} 1"
  else
    echo "void_datanet_loopproof_last_dataset_id{datasetId=\"\"} 0"
  fi
}

exit "$rc"
