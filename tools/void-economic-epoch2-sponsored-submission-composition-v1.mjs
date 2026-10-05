#!/usr/bin/env node

import { types as utilTypes } from "node:util";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1,
  createVoidEconomicSystemSponsoredRuntimeAdmissionV1,
} from "./void-economic-system-sponsored-runtime-admission-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1,
  VoidEconomicEpoch2PublicSubmissionGatewayHoldV1,
  admitVoidEconomicEpoch2PublicSubmissionGatewayV1,
} from "./void-economic-epoch2-public-submission-gateway-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_V1 =
  "VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_V1";

export const
  VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_AUTHORITY_V1 =
    Object.freeze({
      source_only_composition: true,
      intrinsic_gas_preflight_before_sponsored_reservation: true,
      sponsored_budget_admission_before_atomic_replay_consume: true,
      exact_shared_allowed_targets: true,
      exact_policy_bundle_id_required: true,
      durable_sponsorship_reservation_required: true,
      atomic_replay_consume_required: true,
      hidden_minimum_trade_amount_applied: false,
      expected_policy_bundle_external_authority_proven: false,
      allowed_targets_external_authority_proven: false,
      trusted_clock_source_proven: false,
      durable_replay_store_production_binding_proven: false,
      execution_replay_store_bound_to_sponsorship: false,
      runtime_route_active: false,
      runtime_enforcement_verified: false,
      gas_sponsorship_performed: false,
      transaction_construction: false,
      transaction_signing: false,
      transaction_submission: false,
      transaction_broadcast: false,
      authoritative_chain2050_write: false,
      market_activation: false,
      public_presale_activation: false,
      funds_movement: false,
    });

const MAX_ALLOWED_TARGETS = 32;
const MAX_CALLDATA_BYTES = 744_750;
const MAX_CALLDATA_TEXT_LENGTH = 2 + MAX_CALLDATA_BYTES * 2;
const UINT64 = /^(?:0|[1-9][0-9]*)$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;

const BINDING_KEYS = Object.freeze([
  "policy_bundle",
  "expected_policy_bundle_id",
  "sponsored_trusted_clock",
  "sponsored_time_root",
  "sponsored_reservation_root",
  "allowed_targets",
  "gateway_trusted_clock",
  "replay_consume_timeout_ms",
  "replay_store",
]);

const REQUEST_KEYS = Object.freeze([
  "candidate_intent",
  "candidate_sponsorship",
  "signed_intent",
  "calldata",
  "signature",
]);

function fail(code) {
  throw new Error(code);
}

function exactSnapshot(value, keys, code) {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    Array.isArray(value)
  ) {
    fail(code);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  actual.sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function exactTargets(raw) {
  if (
    !Array.isArray(raw) ||
    utilTypes.isProxy(raw) ||
    Object.getPrototypeOf(raw) !== Array.prototype
  ) {
    fail("SPONSORED_SUBMISSION_ALLOWED_TARGETS_INVALID");
  }
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const length = descriptors.length?.value;
  if (
    !Number.isSafeInteger(length) ||
    length < 1 ||
    length > MAX_ALLOWED_TARGETS ||
    Reflect.ownKeys(descriptors).length !== length + 1
  ) {
    fail("SPONSORED_SUBMISSION_ALLOWED_TARGETS_INVALID");
  }
  const seen = new Set();
  const out = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      typeof descriptor.value !== "string" ||
      !ADDRESS.test(descriptor.value) ||
      seen.has(descriptor.value)
    ) {
      fail("SPONSORED_SUBMISSION_ALLOWED_TARGETS_INVALID");
    }
    seen.add(descriptor.value);
    out.push(descriptor.value);
  }
  return Object.freeze(out);
}

function canonicalGasLimit(raw) {
  if (
    typeof raw !== "string" ||
    raw.length > 20 ||
    !UINT64.test(raw)
  ) {
    fail("SPONSORED_SUBMISSION_SIGNED_GAS_LIMIT_INVALID");
  }
  const value = BigInt(raw);
  if (value < 21_000n || value > ((1n << 64n) - 1n)) {
    fail("SPONSORED_SUBMISSION_SIGNED_GAS_LIMIT_INVALID");
  }
  return value;
}

function intrinsicGasPreflight(request) {
  const calldata = request.calldata;
  if (typeof calldata !== "string") {
    fail("SPONSORED_SUBMISSION_CALLDATA_NOT_CANONICAL_LOWER_HEX");
  }
  if (calldata.length > MAX_CALLDATA_TEXT_LENGTH) {
    fail("SPONSORED_SUBMISSION_CALLDATA_ABOVE_GATEWAY_BOUND");
  }
  if (!/^0x(?:[0-9a-f]{2})*$/u.test(calldata)) {
    fail("SPONSORED_SUBMISSION_CALLDATA_NOT_CANONICAL_LOWER_HEX");
  }

  const intent = request.signed_intent;
  if (
    !intent ||
    typeof intent !== "object" ||
    utilTypes.isProxy(intent) ||
    Array.isArray(intent)
  ) {
    fail("SPONSORED_SUBMISSION_SIGNED_INTENT_INVALID");
  }
  const gas = Object.getOwnPropertyDescriptor(intent, "gas_limit");
  if (
    !gas ||
    gas.enumerable !== true ||
    !Object.hasOwn(gas, "value")
  ) {
    fail("SPONSORED_SUBMISSION_SIGNED_INTENT_INVALID");
  }
  const gasLimit = canonicalGasLimit(gas.value);

  let zeroBytes = 0;
  const bytes = (calldata.length - 2) / 2;
  for (let offset = 2; offset < calldata.length; offset += 2) {
    if (calldata.slice(offset, offset + 2) === "00") zeroBytes += 1;
  }
  const nonzeroBytes = bytes - zeroBytes;
  const intrinsic =
    21_000n + BigInt(zeroBytes) * 4n + BigInt(nonzeroBytes) * 16n;
  if (intrinsic > gasLimit) {
    fail("SPONSORED_SUBMISSION_INTRINSIC_GAS_ABOVE_SIGNED_LIMIT");
  }
  return Object.freeze({
    calldata_bytes: bytes,
    zero_bytes: zeroBytes,
    nonzero_bytes: nonzeroBytes,
    intrinsic_gas: intrinsic.toString(),
    signed_gas_limit: gasLimit.toString(),
  });
}

function held(reason, stage, extra = {}) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_V1,
    reason,
    stage,
    ...extra,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_AUTHORITY_V1,
  });
}

export function createVoidEconomicEpoch2SponsoredSubmissionCompositionV1(
  rawBinding,
) {
  const binding = exactSnapshot(
    rawBinding,
    BINDING_KEYS,
    "SPONSORED_SUBMISSION_BINDING_INVALID",
  );
  if (
    typeof binding.expected_policy_bundle_id !== "string" ||
    !SHA256_ID.test(binding.expected_policy_bundle_id)
  ) {
    fail("SPONSORED_SUBMISSION_POLICY_BUNDLE_ID_INVALID");
  }
  if (
    !Number.isSafeInteger(binding.replay_consume_timeout_ms) ||
    binding.replay_consume_timeout_ms < 1 ||
    binding.replay_consume_timeout_ms > 5_000
  ) {
    fail("SPONSORED_SUBMISSION_REPLAY_TIMEOUT_INVALID");
  }

  const allowedTargets = exactTargets(binding.allowed_targets);
  const sponsoredAdmission =
    createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
      policy_bundle: binding.policy_bundle,
      expected_policy_bundle_id: binding.expected_policy_bundle_id,
      trustedClock: binding.sponsored_trusted_clock,
      time_root: binding.sponsored_time_root,
      reservation_root: binding.sponsored_reservation_root,
      allowed_targets: allowedTargets,
    });

  if (
    sponsoredAdmission?.marker !==
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1 ||
    sponsoredAdmission?.policy_bundle_id !==
      binding.expected_policy_bundle_id ||
    sponsoredAdmission?.runtime_route_active !== false ||
    sponsoredAdmission?.runtime_enforcement_verified !== false
  ) {
    fail("SPONSORED_SUBMISSION_RUNTIME_ADMISSION_CONTRACT_MISMATCH");
  }

  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_V1,
    version: 1,
    policy_bundle_id: binding.expected_policy_bundle_id,
    allowed_targets: allowedTargets,
    runtime_route_active: false,
    runtime_enforcement_verified: false,

    async admit(rawRequest) {
      let request;
      let intrinsic;
      try {
        request = exactSnapshot(
          rawRequest,
          REQUEST_KEYS,
          "SPONSORED_SUBMISSION_REQUEST_INVALID",
        );
        intrinsic = intrinsicGasPreflight(request);
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "SPONSORED_SUBMISSION_PREFLIGHT_INVALID",
          "intrinsic_preflight",
          {
            sponsored_admission_performed: false,
            sponsorship_reservation_mutation_performed: false,
            atomic_replay_consume_attempted: false,
            atomic_replay_consume_outcome_known: true,
            atomic_replay_consumed: false,
          },
        );
      }

      const sponsored = await sponsoredAdmission.admit(request);
      if (
        sponsored?.ok !== true ||
        ![
          "source_reserved_admitted",
          "source_duplicate_admitted",
        ].includes(sponsored.status) ||
        sponsored.marker !==
          VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1 ||
        sponsored.policy_bundle_id !==
          binding.expected_policy_bundle_id ||
        sponsored.runtime_route_active !== false ||
        sponsored.runtime_enforcement_verified !== false ||
        sponsored.gas_sponsorship_performed !== false ||
        sponsored.transaction_submission !== false ||
        sponsored.transaction_broadcast !== false ||
        sponsored.authoritative_chain2050_write !== false
      ) {
        return held(
          typeof sponsored?.reason === "string"
            ? sponsored.reason
            : "SPONSORED_SUBMISSION_SPONSORED_ADMISSION_HELD",
          "sponsored_admission",
          {
            sponsored_admission_performed: true,
            sponsorship_reservation_mutation_performed:
              sponsored?.reservation_mutation_performed === true,
            atomic_replay_consume_attempted: false,
            atomic_replay_consume_outcome_known: true,
            atomic_replay_consumed: false,
          },
        );
      }

      let gateway;
      try {
        gateway = await admitVoidEconomicEpoch2PublicSubmissionGatewayV1({
          intent: request.signed_intent,
          calldata: request.calldata,
          signature: request.signature,
          trustedClock: binding.gateway_trusted_clock,
          replayConsumeTimeoutMs:
            binding.replay_consume_timeout_ms,
          allowedTargets,
          replayStore: binding.replay_store,
        });
      } catch (error) {
        const reason =
          error instanceof VoidEconomicEpoch2PublicSubmissionGatewayHoldV1
            ? error.reason
            : "SPONSORED_SUBMISSION_GATEWAY_FAILED";
        return held(reason, "gateway_admission", {
          sponsored_admission_performed: true,
          sponsorship_reservation_mutation_performed:
            sponsored.reservation_mutation_performed === true,
          sponsorship_reservation_status:
            sponsored.reservation_status,
          atomic_replay_consume_attempted: true,
          atomic_replay_consume_outcome_known: false,
          atomic_replay_consumed: null,
        });
      }

      if (
        gateway?.ok !== true ||
        gateway.status !== "SOURCE_GATEWAY_ADMISSION_REPLAY_CONSUMED" ||
        gateway.marker !==
          VOID_ECONOMIC_EPOCH2_PUBLIC_SUBMISSION_GATEWAY_CORE_V1 ||
        gateway.typed_data_digest !==
          sponsored.signed_submission_digest ||
        gateway.atomic_replay_digest_consumed !== true ||
        gateway.runtime_route_active !== false ||
        gateway.public_submission_open !== false ||
        gateway.transaction_submission !== false ||
        gateway.transaction_broadcast !== false ||
        gateway.authoritative_chain2050_write !== false
      ) {
        return held(
          "SPONSORED_SUBMISSION_GATEWAY_CONTRACT_MISMATCH",
          "gateway_admission",
          {
            sponsored_admission_performed: true,
            sponsorship_reservation_mutation_performed:
              sponsored.reservation_mutation_performed === true,
            sponsorship_reservation_status:
              sponsored.reservation_status,
            atomic_replay_consume_attempted: true,
            atomic_replay_consume_outcome_known: false,
            atomic_replay_consumed: null,
          },
        );
      }

      return Object.freeze({
        ok: true,
        status: "SOURCE_SPONSORED_GATEWAY_ADMITTED",
        marker:
          VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_V1,
        version: 1,
        policy_bundle_id: sponsored.policy_bundle_id,
        intent_id: sponsored.intent_id,
        sponsorship_id: sponsored.sponsorship_id,
        signed_submission_digest:
          sponsored.signed_submission_digest,
        signer: gateway.signer,
        target: gateway.target,
        gas_limit: gateway.gas_limit,
        calldata_intrinsic_gas: intrinsic.intrinsic_gas,
        sponsorship_reservation_status:
          sponsored.reservation_status,
        sponsorship_reservation_mutation_performed:
          sponsored.reservation_mutation_performed === true,
        durable_sponsorship_reservation_before_replay_consume: true,
        atomic_replay_digest_consumed: true,
        hidden_minimum_trade_amount_applied: false,
        micro_trade_amount_not_used_for_admission: true,
        runtime_route_active: false,
        runtime_enforcement_verified: false,
        gas_sponsorship_performed: false,
        transaction_construction: false,
        transaction_signing: false,
        transaction_submission: false,
        transaction_broadcast: false,
        authoritative_chain2050_write: false,
        funds_movement: false,
        authority:
          VOID_ECONOMIC_EPOCH2_SPONSORED_SUBMISSION_COMPOSITION_AUTHORITY_V1,
      });
    },
  });
}
