#!/usr/bin/env bash
set -euo pipefail
cd "${VOID_REPO:-$HOME/dev/void-node}"


# __void_candidate_key_env_guard_v1
CANDIDATE_PK="${CANDIDATE_PK:-}"
CANDIDATE_PK_FILE="${CANDIDATE_PK_FILE:-}"

if [ -z "$CANDIDATE_PK" ] && [ -z "$CANDIDATE_PK_FILE" ]; then
  echo "[ERR] CANDIDATE_PK or CANDIDATE_PK_FILE must be provided for nested local deploy proof"
  exit 1
fi

if [ -n "$CANDIDATE_PK_FILE" ]; then
  test -f "$CANDIDATE_PK_FILE"
fi

export CANDIDATE_PK
export CANDIDATE_PK_FILE


echo "=== submit gates proof ==="
echo "[gate] submit path must remain disabled until real wallet execution proof exists"
echo "[gate] public registration must not mutate active validator set"
echo "[gate] draft API must remain non-mutating"
echo "[gate] participant UI must keep guarded shell"
echo

ops/mainnet0/validator-registration-lane-proof.sh

echo
echo "[ok] submit gates are still enforced by current lane proof"
