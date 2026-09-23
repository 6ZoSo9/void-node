#!/usr/bin/env bash
# Shared retirement wall for the historical fixed-rate WC->VOID v1 lane.
#
# The v1 chain is retained only so exact historical evidence remains replayable.
# It is not current WC/VOID market-price authority.
#
# shellcheck shell=bash

VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY_CONFIRMATION="YES_REPLAY_RETIRED_FIXED_RATE_V1"

void_wc_to_void_fixed_rate_v1_require_historical_replay() {
  if [ "${VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY:-}" !=        "$VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY_CONFIRMATION" ]; then
    printf '%s\n'       'VOID_WC_TO_VOID_FIXED_RATE_V1_RETIRED_HOLD'       'reason=market_priced_wc_void_requires_actual_market_quote_state'       'historical_replay_only=true'       'fixed_rate_current_authority=false' >&2
    return 3
  fi

  return 0
}
