#!/usr/bin/env node

import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
  admitVoidEconomicEpoch2PublicSubmissionGatewayV1,
} from "./void-economic-epoch2-public-submission-gateway-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  createVoidEconomicEpoch2DurableReplayStoreV1,
} from "./void-economic-epoch2-durable-replay-store-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1 =
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1";

export const VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    durable_replay_store_bound: true,
    production_gateway_replay_store_binding_source_verified: true,
    production_gateway_replay_store_binding_verified: false,
    runtime_route_active: false,
    public_submission_open: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

function fail(reason) {
  throw new Error(reason);
}

export function createVoidEconomicEpoch2ProductionGatewayReplayBindingV1({
  replayRoot,
}) {
  if (
    typeof replayRoot !== "string" ||
    replayRoot.length === 0 ||
    replayRoot.includes("\0")
  ) {
    fail("production_gateway_replay_root_invalid");
  }

  const replayStore = createVoidEconomicEpoch2DurableReplayStoreV1({
    root: replayRoot,
  });

  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
    replay_store_marker: VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
    gateway_marker: VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
    production_gateway_replay_store_binding_source_verified: true,
    production_gateway_replay_store_binding_verified: false,
    runtime_route_active: false,
    public_submission_open: false,

    async admit({
      intent,
      calldata,
      signature,
      trustedClock,
      replayConsumeTimeoutMs,
      allowedTargets,
    }) {
      const admitted =
        await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
          intent,
          calldata,
          signature,
          trustedClock,
          replayConsumeTimeoutMs,
          allowedTargets,
          replayStore,
        });

      if (
        admitted?.ok !== true ||
        admitted?.atomic_replay_digest_consumed !== true ||
        admitted?.runtime_route_active !== false ||
        admitted?.transaction_submission !== false ||
        admitted?.transaction_broadcast !== false ||
        admitted?.authoritative_chain2050_write !== false
      ) {
        fail("production_gateway_replay_binding_upstream_contract_mismatch");
      }

      return Object.freeze({
        ...admitted,
        marker: VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_V1,
        upstream_gateway_marker:
          VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
        durable_replay_store_marker:
          VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
        durable_replay_store_verified: true,
        production_gateway_replay_store_binding_source_verified: true,
        production_gateway_replay_store_binding_verified: false,
        runtime_route_active: false,
        public_submission_open: false,
        transaction_submission: false,
        transaction_broadcast: false,
        authoritative_chain2050_write: false,
        migration_authorized: false,
        public_activation: false,
        funds_movement: false,
        authority:
          VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_REPLAY_BINDING_AUTHORITY_V1,
        upstream_gateway_authority:
          VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
        upstream_replay_store_authority:
          VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_AUTHORITY_V1,
      });
    },
  });
}
