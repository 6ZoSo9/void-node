#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

MAIN="${MAIN:-http://127.0.0.1:4100}"
MAX="${MAX:-5}"
EMPTY="${EMPTY:-0}"

curl -fsS --max-time 10 -X POST "${MAIN}/__void/metrics/proposer.commit-direct.v2fs?max=${MAX}&empty=${EMPTY}"
echo
