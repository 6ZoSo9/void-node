#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

guard="ops/private/wc-to-void-fixed-rate-v1-historical-replay-guard.sh"

test -r "$guard"
bash -n "$guard"

probe='source ops/private/wc-to-void-fixed-rate-v1-historical-replay-guard.sh; void_wc_to_void_fixed_rate_v1_require_historical_replay'

set +e
env -u VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY   bash -c "$probe"   >/tmp/void-wc-fixed-rate-v1-retirement-unset.out   2>/tmp/void-wc-fixed-rate-v1-retirement-unset.err
rc_unset=$?

VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY="WRONG"   bash -c "$probe"   >/tmp/void-wc-fixed-rate-v1-retirement-wrong.out   2>/tmp/void-wc-fixed-rate-v1-retirement-wrong.err
rc_wrong=$?
set -e

test "$rc_unset" = "3"
test "$rc_wrong" = "3"

grep -Fx 'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIRED_HOLD'   /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null
grep -Fx 'reason=market_priced_wc_void_requires_actual_market_quote_state'   /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null
grep -Fx 'historical_replay_only=true'   /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null
grep -Fx 'fixed_rate_current_authority=false'   /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null

VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY="YES_REPLAY_RETIRED_FIXED_RATE_V1"   bash -c "$probe"

for script in   ops/private/wc-to-void-settlement-preview-v1.sh   ops/private/wc-to-void-operator-approval-record-v1.sh   ops/private/wc-to-void-operator-approval-apply-v1.sh   ops/private/wc-to-void-duplicate-settlement-guard-v1.sh   ops/private/wc-to-void-private-execute-command-hold-v1.sh   ops/private/wc-to-void-recipient-resolution-v1.sh   ops/private/wc-to-void-recipient-resolution-apply-v1.sh   ops/private/wc-to-void-private-execute-command-release-v1.sh   ops/private/wc-to-void-operator-terminal-execute-request-v1.sh   ops/private/wc-to-void-post-execution-settlement-record-v1.sh
do
  grep -F 'source ops/private/wc-to-void-fixed-rate-v1-historical-replay-guard.sh' "$script" >/dev/null
  grep -F 'void_wc_to_void_fixed_rate_v1_require_historical_replay' "$script" >/dev/null
done

printf '%s\n'   'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIREMENT_PROOF_GREEN'   'ordinary_execution=false'   'historical_replay=true'   'market_activation=false'   'funds_action=false'
