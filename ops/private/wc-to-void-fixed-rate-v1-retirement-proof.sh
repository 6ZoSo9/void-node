#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

fail() {
  printf 'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIREMENT_PROOF_FAIL stage=%s\n' "$1" >&2
  exit 1
}

guard="ops/private/wc-to-void-fixed-rate-v1-historical-replay-guard.sh"

test -r "$guard" || fail guard_missing
bash -n "$guard" || fail guard_syntax

probe='source ops/private/wc-to-void-fixed-rate-v1-historical-replay-guard.sh; void_wc_to_void_fixed_rate_v1_require_historical_replay'

set +e
env -u VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY \
  bash -c "$probe" \
  >/tmp/void-wc-fixed-rate-v1-retirement-unset.out \
  2>/tmp/void-wc-fixed-rate-v1-retirement-unset.err
rc_unset=$?

VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY="WRONG" \
  bash -c "$probe" \
  >/tmp/void-wc-fixed-rate-v1-retirement-wrong.out \
  2>/tmp/void-wc-fixed-rate-v1-retirement-wrong.err
rc_wrong=$?
set -e

test "$rc_unset" = "3" || fail "guard_unset_rc_$rc_unset"
test "$rc_wrong" = "3" || fail "guard_wrong_rc_$rc_wrong"

grep -Fx 'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIRED_HOLD' \
  /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null || fail guard_marker
grep -Fx 'reason=market_priced_wc_void_requires_actual_market_quote_state' \
  /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null || fail guard_reason
grep -Fx 'historical_replay_only=true' \
  /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null || fail guard_replay_flag
grep -Fx 'fixed_rate_current_authority=false' \
  /tmp/void-wc-fixed-rate-v1-retirement-unset.err >/dev/null || fail guard_authority_flag

VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY="YES_REPLAY_RETIRED_FIXED_RATE_V1" \
  bash -c "$probe" || fail guard_exact_replay

scripts=(
  ops/private/wc-to-void-settlement-preview-v1.sh
  ops/private/wc-to-void-operator-approval-record-v1.sh
  ops/private/wc-to-void-operator-approval-apply-v1.sh
  ops/private/wc-to-void-duplicate-settlement-guard-v1.sh
  ops/private/wc-to-void-private-execute-command-hold-v1.sh
  ops/private/wc-to-void-recipient-resolution-v1.sh
  ops/private/wc-to-void-recipient-resolution-apply-v1.sh
  ops/private/wc-to-void-private-execute-command-release-v1.sh
  ops/private/wc-to-void-operator-terminal-execute-request-v1.sh
  ops/private/wc-to-void-post-execution-settlement-record-v1.sh
  ops/mainnet0/wc-devnet-bootstrap-proof.sh
  ops/wc-smoke.sh
)

for script in "${scripts[@]}"; do
  bash -n "$script" || fail "syntax:$script"
  grep -F 'wc-to-void-fixed-rate-v1-historical-replay-guard.sh' \
    "$script" >/dev/null || fail "guard_source:$script"
  grep -F 'void_wc_to_void_fixed_rate_v1_require_historical_replay' \
    "$script" >/dev/null || fail "guard_call:$script"

  set +e
  env -u VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY \
    bash "$script" \
    >/tmp/void-wc-fixed-rate-v1-retirement-script.out \
    2>/tmp/void-wc-fixed-rate-v1-retirement-script.err
  rc=$?
  set -e

  test "$rc" = "3" || {
    cat /tmp/void-wc-fixed-rate-v1-retirement-script.err >&2 || true
    fail "ordinary_rc:$script:$rc"
  }
  grep -Fx 'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIRED_HOLD' \
    /tmp/void-wc-fixed-rate-v1-retirement-script.err >/dev/null || \
    fail "ordinary_marker:$script"
done

proof_scripts=(
  ops/private/wc-to-void-settlement-preview-v1-proof.sh
  ops/private/wc-to-void-operator-approval-record-v1-proof.sh
  ops/private/wc-to-void-operator-approval-apply-v1-proof.sh
  ops/private/wc-to-void-duplicate-settlement-guard-v1-proof.sh
  ops/private/wc-to-void-private-execute-command-hold-v1-proof.sh
  ops/private/wc-to-void-recipient-resolution-v1-proof.sh
  ops/private/wc-to-void-recipient-resolution-apply-v1-proof.sh
  ops/private/wc-to-void-private-execute-command-release-v1-proof.sh
  ops/private/wc-to-void-operator-terminal-execute-request-v1-proof.sh
  ops/private/wc-to-void-post-execution-settlement-record-v1-proof.sh
)

for proof_script in "${proof_scripts[@]}"; do
  bash -n "$proof_script" || fail "proof_syntax:$proof_script"
  grep -F 'export VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY="YES_REPLAY_RETIRED_FIXED_RATE_V1"' \
    "$proof_script" >/dev/null || fail "proof_replay_opt_in:$proof_script"
done

grep -F '.PHONY: wc-devnet-bootstrap-proof wc-devnet-bootstrap-historical-replay' \
  Makefile >/dev/null || fail make_bootstrap_phony
grep -F 'wc-devnet-bootstrap-historical-replay:' \
  Makefile >/dev/null || fail make_bootstrap_replay_target
grep -F 'wc-smoke-historical-replay:' \
  Makefile >/dev/null || fail make_smoke_replay_target

make_replay_count="$(grep -F 'VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY="YES_REPLAY_RETIRED_FIXED_RATE_V1"' Makefile | wc -l)"
test "$make_replay_count" -ge 2 || fail "make_replay_count:$make_replay_count"

grep -F 'STATE_JSON="$$(pwd)/.runtime/mainnet0/wc-devnet-local/current/docs/VOID-DEVNET-PROTOCOL-STATE.json"' \
  Makefile >/dev/null || fail make_pwd_escape

printf '%s\n' \
  'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIREMENT_PROOF_GREEN' \
  'ordinary_execution=false' \
  'historical_replay=true' \
  'market_activation=false' \
  'funds_action=false'
