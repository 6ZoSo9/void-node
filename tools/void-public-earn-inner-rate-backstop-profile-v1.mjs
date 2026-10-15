#!/usr/bin/env node

import {
  VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
  VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1,
  VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
} from "./void-public-earn-proxy-v2-edge-contract-v1.mjs";

export const VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1 =
  "VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1";

export const VOID_PUBLIC_EARN_INNER_CLAIM_BACKSTOP_PER_MINUTE_V1 = 60;
export const VOID_PUBLIC_EARN_INNER_SUBMIT_BACKSTOP_PER_MINUTE_V1 = 300;

export const VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1 = Object.freeze({
  VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE: String(
    VOID_PUBLIC_EARN_INNER_CLAIM_BACKSTOP_PER_MINUTE_V1,
  ),
  VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE: String(
    VOID_PUBLIC_EARN_INNER_SUBMIT_BACKSTOP_PER_MINUTE_V1,
  ),
});

export const VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_AUTHORITY_V1 =
  Object.freeze({
    source_policy_only: true,
    dedicated_mutation_ingress_required: true,
    outer_proxy_v2_source_meter_required: true,
    outer_source_identity_forwarded_to_adapter: false,
    caller_forwarding_headers_trusted: false,
    inner_loopback_peer_used_as_participant_identity: false,
    inner_limiter_role: "aggregate_secondary_backstop",
    legacy_shared_mode_modified: false,
    service_installation: false,
    systemd_mutation: false,
    nftables_mutation: false,
    network_mutation: false,
    work_credit_write: false,
    credential_issuance: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    public_presale_activation: false,
    funds_movement: false,
  });

function hold(reason) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1,
    version: 1,
    reason,
    authority: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_AUTHORITY_V1,
  });
}

function exactPositiveInteger(raw, code) {
  const text = String(raw ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(text)) throw new Error(code);
  const value = Number(text);
  if (!Number.isSafeInteger(value)) throw new Error(code);
  return value;
}

export function classifyVoidPublicEarnInnerRateBackstopProfileV1(input = {}) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("inner_rate_profile_input_invalid");
    }
    if (input.mutation_ingress_mode !== "dedicated_loopback") {
      throw new Error("inner_rate_profile_dedicated_ingress_required");
    }
    if (input.outer_proxy_v2_source_meter !== true) {
      throw new Error("inner_rate_profile_outer_source_meter_required");
    }

    const env =
      input.environment &&
      typeof input.environment === "object" &&
      !Array.isArray(input.environment)
        ? input.environment
        : {};

    const claimBackstop = exactPositiveInteger(
      env.VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE,
      "inner_rate_profile_claim_limit_invalid",
    );
    const submitBackstop = exactPositiveInteger(
      env.VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE,
      "inner_rate_profile_submit_limit_invalid",
    );

    if (
      claimBackstop !==
      VOID_PUBLIC_EARN_INNER_CLAIM_BACKSTOP_PER_MINUTE_V1
    ) {
      throw new Error("inner_rate_profile_claim_limit_not_canonical");
    }
    if (
      submitBackstop !==
      VOID_PUBLIC_EARN_INNER_SUBMIT_BACKSTOP_PER_MINUTE_V1
    ) {
      throw new Error("inner_rate_profile_submit_limit_not_canonical");
    }
    if (claimBackstop <= VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1) {
      throw new Error(
        "inner_rate_profile_claim_backstop_not_above_outer_source_limit",
      );
    }
    if (submitBackstop <= VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1) {
      throw new Error(
        "inner_rate_profile_submit_backstop_not_above_outer_source_limit",
      );
    }

    const claimHeadroomAfterOneSource =
      claimBackstop - VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1;
    const submitHeadroomAfterOneSource =
      submitBackstop - VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1;

    if (claimHeadroomAfterOneSource < VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1) {
      throw new Error(
        "inner_rate_profile_claim_second_source_full_budget_not_preserved",
      );
    }
    if (submitHeadroomAfterOneSource < VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1) {
      throw new Error(
        "inner_rate_profile_submit_second_source_full_budget_not_preserved",
      );
    }

    return Object.freeze({
      ok: true,
      status: "SOURCE_POLICY_GREEN_NOT_INSTALLED",
      marker: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1,
      version: 1,
      rate_window_ms: VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1,
      outer_claim_requests_per_source_per_window:
        VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
      outer_submit_requests_per_source_per_window:
        VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
      inner_claim_aggregate_backstop_per_window: claimBackstop,
      inner_submit_aggregate_backstop_per_window: submitBackstop,
      claim_headroom_after_one_outer_source: claimHeadroomAfterOneSource,
      submit_headroom_after_one_outer_source: submitHeadroomAfterOneSource,
      minimum_full_claim_sources_before_inner_backstop:
        Math.floor(
          claimBackstop / VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
        ),
      minimum_full_submit_sources_before_inner_backstop:
        Math.floor(
          submitBackstop / VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
        ),
      one_outer_limited_source_can_exhaust_inner_claim_backstop: false,
      one_outer_limited_source_can_exhaust_inner_submit_backstop: false,
      caller_forwarding_headers_trusted: false,
      outer_source_identity_forwarded_to_adapter: false,
      legacy_shared_mode_modified: false,
      runtime_integration: false,
      live_host_acceptance_claimed: false,
      authority: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_AUTHORITY_V1,
    });
  } catch (error) {
    return hold(error instanceof Error ? error.message : String(error));
  }
}
