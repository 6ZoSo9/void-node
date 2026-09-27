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
const MAX_CALLDATA_TEXT_LENGTH = 2 + MAX_CALLDATA_BYTES * 2;
const MAX_REPLAY_CONSUME_TIMEOUT_MS = 5_000;
const UINT64_MAX = (1n << 64n) - 1n;

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
  if (typeof value !== "string") {
    hold("calldata_not_canonical_lower_hex");
  }
  if (value.length > MAX_CALLDATA_TEXT_LENGTH) {
    hold("calldata_above_gateway_bound", {
      observed_text_length: value.length,
      maximum_text_length: MAX_CALLDATA_TEXT_LENGTH,
      maximum_bytes: MAX_CALLDATA_BYTES,
    });
  }
  if (!/^0x(?:[0-9a-f]{2})*$/.test(value)) {
    hold("calldata_not_canonical_lower_hex");
  }
  const bytes = (value.length - 2) / 2;

  let zeroBytes = 0;
  for (let offset = 2; offset < value.length; offset += 2) {
    if (value.slice(offset, offset + 2) === "00") zeroBytes += 1;
  }
  const nonzeroBytes = bytes - zeroBytes;
  const intrinsicGas =
    21_000n + BigInt(zeroBytes) * 4n + BigInt(nonzeroBytes) * 16n;

  return Object.freeze({
    value,
    bytes,
    zero_bytes: zeroBytes,
    nonzero_bytes: nonzeroBytes,
    intrinsic_gas: intrinsicGas,
  });
}

function canonicalUint64(value, reason) {
  if (
    typeof value !== "string" ||
    value.length > UINT64_MAX.toString().length ||
    !/^(?:0|[1-9][0-9]*)$/.test(value)
  ) {
    hold(reason);
  }
  const parsed = BigInt(value);
  if (parsed > UINT64_MAX) hold(reason);
  return parsed;
}

function trustedClockAdapter(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold("trusted_clock_required");
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    hold("trusted_clock_required");
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, "nowUnix");
  if (
    !descriptor ||
    !Object.hasOwn(descriptor, "value") ||
    typeof descriptor.value !== "function"
  ) {
    hold("trusted_clock_required");
  }
  const nowUnix = descriptor.value.bind(value);
  return Object.freeze({
    nowUnix() {
      let observed;
      try {
        observed = nowUnix();
      } catch {
        hold("trusted_clock_read_failed");
      }
      return canonicalUint64(observed, "trusted_clock_value_invalid");
    },
  });
}

function canonicalReplayConsumeTimeoutMs(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_REPLAY_CONSUME_TIMEOUT_MS
  ) {
    hold("replay_consume_timeout_ms_invalid");
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
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
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
    has: has.value.bind(value),
    consumeIfFresh: consume.value.bind(value),
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
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
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
  trustedClock,
  replayConsumeTimeoutMs,
  allowedTargets,
  replayStore,
}) {
  const canonicalCalldata = boundedCalldata(calldata);
  const clock = trustedClockAdapter(trustedClock);
  const requestedConsumeTimeoutMs =
    canonicalReplayConsumeTimeoutMs(replayConsumeTimeoutMs);
  const initialNow = clock.nowUnix();
  const canonicalTargets = exactArray(
    allowedTargets,
    "target_allowlist_invalid",
  );
  const store = replayStoreAdapter(replayStore);

  const verified = verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
    intent,
    calldata: canonicalCalldata.value,
    signature,
    nowUnix: initialNow.toString(),
    allowedTargets: canonicalTargets,
    consumedDigests: Object.freeze({
      has(digest) {
        let observed;
        try {
          observed = store.has(digest);
        } catch {
          hold("replay_precheck_failed");
        }
        if (typeof observed !== "boolean") {
          hold("replay_precheck_result_invalid");
        }
        return observed;
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

  const expiresAt = canonicalUint64(
    intent.expires_at_unix,
    "intent_expiry_invalid_before_consume",
  );
  const remainingMs = Number((expiresAt - initialNow) * 1000n);
  const consumeTimeoutMs = Math.min(
    requestedConsumeTimeoutMs,
    Math.max(1, remainingMs),
  );

  if (canonicalCalldata.intrinsic_gas > BigInt(verified.gas_limit)) {
    hold("calldata_intrinsic_gas_above_signed_gas_limit", {
      intrinsic_gas: canonicalCalldata.intrinsic_gas.toString(),
      signed_gas_limit: verified.gas_limit,
      calldata_bytes: canonicalCalldata.bytes,
      zero_bytes: canonicalCalldata.zero_bytes,
      nonzero_bytes: canonicalCalldata.nonzero_bytes,
    });
  }

  const controller = new AbortController();
  let timeoutHandle = null;
  let consumeTimedOut = false;
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      consumeTimedOut = true;
      controller.abort();
      reject(new Error("replay_consume_timeout"));
    }, consumeTimeoutMs);
  });

  let consumedRaw;
  try {
    const consume = Promise.resolve().then(() =>
      store.consumeIfFresh(
        verified.typed_data_digest,
        Object.freeze({
          chain_id: 2050,
          execution_epoch: 2,
          gateway_id: verified.gateway_id,
          signer: verified.signer,
          nonce: verified.nonce,
          target: verified.target,
          calldata_keccak256: verified.calldata_keccak256,
          expires_at_unix: intent.expires_at_unix,
        }),
        Object.freeze({
          signal: controller.signal,
          timeout_ms: consumeTimeoutMs,
        }),
      )
    );
    consumedRaw = await Promise.race([consume, timeout]);
  } catch {
    if (consumeTimedOut) {
      hold("atomic_replay_consume_timeout");
    }
    hold("atomic_replay_consume_failed");
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
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

  const afterConsumeNow = clock.nowUnix();
  if (afterConsumeNow < initialNow) {
    hold("trusted_clock_nonmonotonic");
  }
  if (afterConsumeNow >= expiresAt) {
    hold("intent_expired_after_replay_consume");
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
    calldata_intrinsic_gas: canonicalCalldata.intrinsic_gas.toString(),
    calldata_bytes: canonicalCalldata.bytes,
    calldata_keccak256: verified.calldata_keccak256,
    typed_data_digest: verified.typed_data_digest,
    signed_submission_source_primitive_proven: true,
    execution_epoch_bound_in_public_gateway: true,
    atomic_replay_digest_consumed: true,
    expiry_rechecked_after_replay_consume: true,
    requested_replay_consume_timeout_ms: requestedConsumeTimeoutMs,
    effective_replay_consume_timeout_ms: consumeTimeoutMs,
    replay_consume_timeout_bounded_by_intent_expiry: true,
    replay_consume_deadline_enforced: true,
    replay_consume_abort_signal_supplied: true,
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
