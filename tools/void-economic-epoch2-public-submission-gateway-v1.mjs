#!/usr/bin/env node

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
  verifyVoidEconomicEpoch2SignedSubmissionIntentV1,
} from "./void-economic-epoch2-signed-submission-intent-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1 =
  "VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1";

export const VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    signed_intent_verification: true,
    atomic_replay_consume_required: true,
    runtime_route_active: false,
    public_submission_open: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation: false,
  });

const MAX_ALLOWED_TARGETS = 256;
const MAX_CALLDATA_BYTES = 744_750;

export class VoidEconomicEpoch2PublicSubmissionGatewayHoldV1 extends Error {
  constructor(reason, detail = null) {
    super(reason);
    this.name = "VoidEconomicEpoch2PublicSubmissionGatewayHoldV1";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = null) {
  throw new VoidEconomicEpoch2PublicSubmissionGatewayHoldV1(reason, detail);
}

function exactArray(value, reason) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    hold(reason);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = descriptors.length?.value;
  if (
    !Number.isSafeInteger(length) ||
    length < 1 ||
    length > MAX_ALLOWED_TARGETS ||
    Reflect.ownKeys(descriptors).length !== length + 1
  ) {
    hold(reason);
  }
  const out = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      hold(reason);
    }
    out.push(descriptor.value);
  }
  return out;
}

function boundedCalldata(value) {
  if (
    typeof value !== "string" ||
    !/^0x(?:[0-9a-f]{2})*$/.test(value)
  ) {
    hold("calldata_not_canonical_lower_hex");
  }
  const bytes = (value.length - 2) / 2;
  if (bytes > MAX_CALLDATA_BYTES) {
    hold("calldata_above_gateway_bound", {
      observed_bytes: bytes,
      maximum_bytes: MAX_CALLDATA_BYTES,
    });
  }
  return value;
}

function replayStoreAdapter(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    hold("atomic_replay_store_required");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const has = descriptors.has;
  const consume = descriptors.consumeIfFresh;
  if (
    !has ||
    !Object.hasOwn(has, "value") ||
    typeof has.value !== "function" ||
    !consume ||
    !Object.hasOwn(consume, "value") ||
    typeof consume.value !== "function"
  ) {
    hold("atomic_replay_store_required");
  }
  return Object.freeze({
    has: has.value,
    consumeIfFresh: consume.value,
  });
}

function exactConsumeResult(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    hold("atomic_replay_consume_result_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== "string") ||
    keys.length !== 3 ||
    !keys.includes("consumed") ||
    !keys.includes("already_consumed") ||
    !keys.includes("atomic")
  ) {
    hold("atomic_replay_consume_result_invalid");
  }
  for (const key of ["consumed", "already_consumed", "atomic"]) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      typeof descriptor.value !== "boolean"
    ) {
      hold("atomic_replay_consume_result_invalid");
    }
  }
  return Object.freeze({
    consumed: descriptors.consumed.value,
    already_consumed: descriptors.already_consumed.value,
    atomic: descriptors.atomic.value,
  });
}

export async function admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
  intent,
  calldata,
  signature,
  nowUnix,
  allowedTargets,
  replayStore,
}) {
  const canonicalCalldata = boundedCalldata(calldata);
  const canonicalTargets = exactArray(
    allowedTargets,
    "target_allowlist_invalid",
  );
  const store = replayStoreAdapter(replayStore);

  const verified = verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
    intent,
    calldata: canonicalCalldata,
    signature,
    nowUnix,
    allowedTargets: canonicalTargets,
    consumedDigests: Object.freeze({
      has(digest) {
        return store.has(digest) === true;
      },
    }),
  });

  if (
    verified.ok !== true ||
    verified.status !== "VERIFIED_REPLAY_CONSUMPTION_REQUIRED" ||
    verified.chain_id !== 2050 ||
    verified.execution_epoch !== 2 ||
    verified.gateway_id !==
      VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1 ||
    verified.atomic_replay_digest_consume_required !== true ||
    verified.runtime_route_active !== false ||
    verified.transaction_submission !== false ||
    verified.transaction_broadcast !== false ||
    verified.authoritative_chain2050_write !== false
  ) {
    hold("signed_intent_verification_contract_mismatch");
  }

  let consumedRaw;
  try {
    consumedRaw = await store.consumeIfFresh(
      verified.typed_data_digest,
      Object.freeze({
        chain_id: 2050,
        execution_epoch: 2,
        gateway_id: verified.gateway_id,
        signer: verified.signer,
        nonce: verified.nonce,
        target: verified.target,
        calldata_keccak256: verified.calldata_keccak256,
      }),
    );
  } catch {
    hold("atomic_replay_consume_failed");
  }

  const consumed = exactConsumeResult(consumedRaw);
  if (
    consumed.atomic !== true ||
    consumed.consumed !== true ||
    consumed.already_consumed !== false
  ) {
    hold(
      consumed.already_consumed === true
        ? "intent_replay_detected_at_atomic_consume"
        : "atomic_replay_consume_failed",
    );
  }

  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
    ok: true,
    status: "SOURCE_GATEWAY_ADMISSION_REPLAY_CONSUMED",
    chain_id: 2050,
    execution_epoch: 2,
    gateway_id: verified.gateway_id,
    signer: verified.signer,
    nonce: verified.nonce,
    target: verified.target,
    gas_limit: verified.gas_limit,
    calldata_keccak256: verified.calldata_keccak256,
    typed_data_digest: verified.typed_data_digest,
    signed_submission_source_primitive_proven: true,
    execution_epoch_bound_in_public_gateway: true,
    atomic_replay_digest_consumed: true,
    durable_replay_store_verified: false,
    privileged_signer_nonce_or_key_replay_fence_proven: false,
    pending_legacy_signed_transaction_census_complete: false,
    cross_epoch_replay_protection_proven: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    public_activation: false,
    funds_movement: false,
    authority: VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_AUTHORITY_V1,
    upstream_authority:
      VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_AUTHORITY_V1,
  });
}
