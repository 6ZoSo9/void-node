#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"

MARKER="VOID_PUBLIC_CLONE_SAVEBLOCK_STABILITY_PROOF_V1_GREEN"
ENV_FILE=".env.example"
QUARANTINE_INSTALLER="ops/mainnet0/public-node-live-runtime-quarantine-install.sh"
QUARANTINE_PROOF="ops/mainnet0/public-node-live-runtime-quarantine-proof.sh"
LAUNCHER="run-void-node.sh"

flags=(
  VOID_QUARANTINE_HOT_RUNTIME
  VOID_DISABLE_WRAPPER_STORM
  VOID_DISABLE_TERMINAL_SAVEBLOCK
  VOID_DISABLE_TERMINAL_SAVEBLOCK_V2
  VOID_DISABLE_TXROOT_CORE_BUCKET
  VOID_DISABLE_TXROOT_HEADER_NOOP
  VOID_DISABLE_EARLY_WRAPPER_FAMILY
  VOID_DISABLE_DEDUPE_TRUTHFIX_FORENSICS
  VOID_DISABLE_SAVEBLOCK_TAIL
  VOID_DISABLE_FINALIZE_WAL_COMMIT
  VOID_TXROOT_OBSERVER_DISABLE
  VOID_TXROOT_FORENSICS_STICKY_DISABLE
  VOID_DISABLE_DRIFT
  VOID_DRIFT_DISABLE
)

for required in "$ENV_FILE" "$QUARANTINE_INSTALLER" "$QUARANTINE_PROOF" "$LAUNCHER"; do
  test -f "$required" || { echo "missing required file: $required" >&2; exit 1; }
done

for flag in "${flags[@]}"; do
  count="$(grep -Fxc "${flag}=1" "$ENV_FILE" || true)"
  test "$count" = 1 || {
    echo "expected exactly one ${flag}=1 in $ENV_FILE; found $count" >&2
    exit 1
  }

  grep -Fq "Environment=${flag}=1" "$QUARANTINE_INSTALLER" || {
    echo "safe default drift: $flag is not present in the proven quarantine installer" >&2
    exit 1
  }
done

grep -Fq 'cp -- "$ROOT/.env.example" "$ENV_FILE"' "$LAUNCHER" || {
  echo "clone-and-run no longer seeds .env from .env.example" >&2
  exit 1
}

grep -Fq 'VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN' "$QUARANTINE_PROOF" || {
  echo "live quarantine proof marker is missing" >&2
  exit 1
}

echo "safe_default_flag_count=${#flags[@]}"
echo "$MARKER"
