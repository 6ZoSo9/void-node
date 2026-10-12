#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
VOID_MAINNET0_8545_EPOCH125_RESTORE_RETIRED_V1_HOLD
reason=fixed_epoch125_restore_retired
replacement=ops/mainnet0/mainnet0-start-8545-selected-durable-state.sh
default_mode=plan
apply_confirmation=startPrivateChain2050FromSelectedDurableState
EOF

exit 2
