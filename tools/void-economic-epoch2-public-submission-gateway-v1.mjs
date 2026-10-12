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
const INTENT_KEYS = Object.freeze([
  "marker",
  "version",
  "execution_epoch",
  "gateway_id",
  "policy_generation",
  "signer",
  "nonce",
  "issued_at_unix",
  "expires_at_unix",
  "target",
  "value_wei",
  "gas_limit",
  "calldata_keccak256",
]);

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
  let length;
  try {
    if (
      !value ||
      typeof value !== "object" ||
      !Array.isArray(value)
    ) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Array.prototype) throw null;

    const lengthDescriptor =
      Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      lengthDescriptor.enumerable !== false ||
      lengthDescriptor.configurable !== false ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 1 ||
      lengthDescriptor.value > MAX_ALLOWED_TARGETS
    ) {
      throw null;
    }
    length = lengthDescriptor.value;
  } catch {
    hold(reason);
  }

  const out = [];
  for (let index = 0; index < length; index += 1) {
    let descriptor;
    try {
      descriptor =
        Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      hold(reason);
    }
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      hold(reason);
    }
    out.push(descriptor.value);
  }
  return Object.freeze(out);
}

function snapshotSignedIntent(value) {
  try {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;

    const snapshot = Object.create(null);
    for (const key of INTENT_KEYS) {
      const descriptor =
        Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    hold("signed_intent_snapshot_invalid");
  }
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

function synchronousTrustedRead(
  reader,
  readFailure,
  asyncFailure,
) {
  let observed;
  try {
    observed = reader();
  } catch {
    hold(readFailure);
  }

  if (
    observed !== null &&
    (typeof observed === "object" || typeof observed === "function")
  ) {
    let then;
    try {
      then = observed.then;
    } catch {
      hold(readFailure);
    }
    if (typeof then === "function") {
      try {
        void Promise.resolve(observed).catch(() => {});
      } catch {
        // Promise assimilation failure is still contained below.
      }
      hold(asyncFailure);
    }
  }

  return observed;
}

function canonicalMonotonicMs(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > Number.MAX_SAFE_INTEGER
  ) {
    hold("trusted_monotonic_clock_value_invalid");
  }
  return value;
}

function trustedClockAdapter(value) {
  let nowUnix;
  let monotonicNowMs;
  try {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const nowUnixDescriptor =
      Object.getOwnPropertyDescriptor(value, "nowUnix");
    const monotonicDescriptor =
      Object.getOwnPropertyDescriptor(value, "monotonicNowMs");
    if (
      !nowUnixDescriptor ||
      !Object.hasOwn(nowUnixDescriptor, "value") ||
      typeof nowUnixDescriptor.value !== "function" ||
      !monotonicDescriptor ||
      !Object.hasOwn(monotonicDescriptor, "value") ||
      typeof monotonicDescriptor.value !== "function"
    ) {
      throw null;
    }
    nowUnix = nowUnixDescriptor.value;
    monotonicNowMs = monotonicDescriptor.value;
  } catch {
    hold("trusted_clock_required");
  }

  return Object.freeze({
    nowUnix() {
      return canonicalUint64(
        synchronousTrustedRead(
          () => Reflect.apply(nowUnix, value, []),
          "trusted_clock_read_failed",
          "trusted_clock_async_provider_forbidden",
        ),
        "trusted_clock_value_invalid",
      );
    },
    monotonicNowMs() {
      return canonicalMonotonicMs(
        synchronousTrustedRead(
          () => Reflect.apply(monotonicNowMs, value, []),
          "trusted_monotonic_clock_read_failed",
          "trusted_monotonic_clock_async_provider_forbidden",
        ),
      );
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
  let consumeIfFresh;
  try {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const consume =
      Object.getOwnPropertyDescriptor(value, "consumeIfFresh");
    if (
      !consume ||
      !Object.hasOwn(consume, "value") ||
      typeof consume.value !== "function"
    ) {
      throw null;
    }
    consumeIfFresh = consume.value;
  } catch {
    hold("atomic_replay_store_required");
  }

  return Object.freeze({
    consumeIfFresh(...args) {
      return Reflect.apply(consumeIfFresh, value, args);
    },
  });
}

function exactConsumeResult(value) {
  const snapshot = Object.create(null);
  try {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw null;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    for (const key of ["consumed", "already_consumed", "atomic"]) {
      const descriptor =
        Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        typeof descriptor.value !== "boolean"
      ) {
        throw null;
      }
      snapshot[key] = descriptor.value;
    }
  } catch {
    hold("atomic_replay_consume_result_invalid");
  }

  return Object.freeze(snapshot);
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
  const canonicalIntent = snapshotSignedIntent(intent);
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
    intent: canonicalIntent,
    calldata: canonicalCalldata.value,
    signature,
    nowUnix: initialNow.toString(),
    allowedTargets: canonicalTargets,
    consumedDigests: Object.freeze({
      has() {
        // The verifier requires an observation surface, but the gateway does
        // not delegate replay authority to a non-atomic precheck. The exact
        // digest is decided only by consumeIfFresh below.
        return false;
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
    canonicalIntent.expires_at_unix,
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

  const consumeStartedAtMs = clock.monotonicNowMs();
  let timeoutHandle = null;
  let consumeTimedOut = false;
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      consumeTimedOut = true;
      reject(new Error("replay_consume_timeout"));
    }, consumeTimeoutMs);
  });

  let consumedRaw;
  let consumeFailed = false;
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
          expires_at_unix: canonicalIntent.expires_at_unix,
        }),
        Object.freeze({
          timeout_ms: consumeTimeoutMs,
        }),
      )
    );
    consumedRaw = await Promise.race([consume, timeout]);
  } catch {
    consumeFailed = true;
  } finally {
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
  }

  const consumeReturnedAtMs = clock.monotonicNowMs();
  if (consumeReturnedAtMs < consumeStartedAtMs) {
    hold("trusted_monotonic_clock_nonmonotonic");
  }
  if (
    consumeTimedOut ||
    consumeReturnedAtMs - consumeStartedAtMs >= consumeTimeoutMs
  ) {
    hold("atomic_replay_consume_timeout");
  }
  if (consumeFailed) {
    hold("atomic_replay_consume_failed");
  }

  let consumed = null;
  let consumeResultInvalid = false;
  try {
    consumed = exactConsumeResult(consumedRaw);
  } catch {
    consumeResultInvalid = true;
  }

  const consumeInspectedAtMs = clock.monotonicNowMs();
  if (consumeInspectedAtMs < consumeReturnedAtMs) {
    hold("trusted_monotonic_clock_nonmonotonic");
  }
  const consumeElapsedMs = consumeInspectedAtMs - consumeStartedAtMs;
  if (consumeElapsedMs >= consumeTimeoutMs) {
    hold("atomic_replay_consume_timeout");
  }
  if (consumeResultInvalid || consumed === null) {
    hold("atomic_replay_consume_result_invalid");
  }

  const freshConsume =
    consumed.atomic === true &&
    consumed.consumed === true &&
    consumed.already_consumed === false;
  const replayConsume =
    consumed.atomic === true &&
    consumed.consumed === false &&
    consumed.already_consumed === true;

  if (replayConsume) {
    hold("intent_replay_detected_at_atomic_consume");
  }
  if (!freshConsume) {
    hold("atomic_replay_consume_result_invalid");
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
    signed_intent_exact_data_snapshot_verified: true,
    execution_epoch_bound_in_public_gateway: true,
    atomic_replay_digest_consumed: true,
    external_replay_precheck_used: false,
    atomic_consume_is_sole_replay_authority: true,
    expiry_rechecked_after_replay_consume: true,
    requested_replay_consume_timeout_ms: requestedConsumeTimeoutMs,
    effective_replay_consume_timeout_ms: consumeTimeoutMs,
    replay_consume_timeout_bounded_by_intent_expiry: true,
    replay_consume_deadline_enforced: true,
    replay_consume_monotonic_elapsed_checked: true,
    replay_result_inspection_included_in_deadline: true,
    replay_consume_elapsed_ms: consumeElapsedMs,
    replay_consume_abort_signal_supplied: false,
    replay_adapter_cancellation_callback_exposed: false,
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
