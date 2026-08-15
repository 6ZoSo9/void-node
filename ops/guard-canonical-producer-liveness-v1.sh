#!/usr/bin/env bash
set -euo pipefail

MARKER="VOID_CANONICAL_PRODUCER_LIVENESS_GUARD_V1"

if [ "${VOID_CANONICAL_PRODUCER_ROLE:-0}" != "1" ]; then
  echo "${MARKER}_SKIP role=noncanonical"
  exit 0
fi

fail=0

require_eq() {
  local name="$1"
  local expected="$2"
  local actual="${!name-}"
  if [ "$actual" != "$expected" ]; then
    echo "${MARKER}_HOLD ${name} expected=${expected} actual=${actual:-<unset>}" >&2
    fail=1
  fi
}

require_eq VOID_QUARANTINE_HOT_RUNTIME 0
require_eq VOID_DISABLE_FINALIZE_WAL_COMMIT 0
require_eq PROPOSER_AUTO 1
require_eq VOID_PROPOSER_AUTO 1
require_eq VOID_COMMIT_DIRECT_AUTOPROP 1
require_eq VOID_COMMIT_DIRECT_AUTOPROP_V1 1
require_eq VOID_AUTOPROP 1
require_eq VOID_COMMIT_DIRECT_V2FS_AUTORUN 1
require_eq VOID_DISABLE_COMMIT_DIRECT_AUTOPROP 0
require_eq VOID_DISABLE_PROPOSER_AUTOPROP 0
require_eq VOID_DISABLE_COMMIT_DIRECT_V2FS_AUTORUN 0

if [ "$fail" -ne 0 ]; then
  echo "${MARKER}_FAIL canonical producer liveness contract is not satisfied" >&2
  exit 1
fi

echo "${MARKER}_GREEN"
