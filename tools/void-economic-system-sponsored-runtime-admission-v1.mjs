import crypto from "node:crypto";
import path from "node:path";
import { types as utilTypes } from "node:util";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
} from "./void-wc-void-coupled-launch-policy-bundle-v1.mjs";
import {
  economicIntentReservationIdV1,
  economicIntentTtlCapsPolicyIdV1,
  verifyEconomicIntentTtlCapsStateV1,
} from "./void-economic-intent-ttl-caps-policy-v1.mjs";
import {
  classifyEconomicSystemSponsoredAdmissionV1,
  economicSystemSponsoredPolicyIdV1,
  economicSystemSponsorshipIdV1,
  verifyEconomicSystemSponsoredStateV1,
} from "./void-economic-system-sponsored-anti-grief-policy-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
  createVoidEconomicSystemSponsoredObservationTimeStoreV1,
} from "./void-economic-system-sponsored-observation-time-store-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
  inspectEconomicSystemSponsoredReservationStoreV1,
  listEconomicSystemSponsoredReservationsV1,
  persistEconomicSystemSponsoredReservationV1,
} from "./void-economic-system-sponsored-reservation-store-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  createVoidEconomicEpoch2DurableReplayStoreV1,
} from "./void-economic-epoch2-durable-replay-store-v1.mjs";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1 =
  Object.freeze({
    source_only_binding: true,
    policy_bundle_content_address_verified: true,
    policy_bundle_marker_schema_verified: true,
    exact_expected_bundle_id_required: true,
    reviewed_policy_compiler_proven: false,
    canonical_main_bundle_proven: false,
    full_policy_bundle_semantics_reexecuted: false,
    canonical_ttl_policy_semantics_reused: true,
    canonical_sponsored_policy_semantics_reused: true,
    candidate_preflight_before_time_mutation: true,
    candidate_preflight_before_reservation_history_scan: true,
    candidate_issued_after_bundle_commit_required: true,
    current_candidate_revalidation_after_time: true,
    expired_duplicate_execution_admission: false,
    durable_time_observation_before_reservation: true,
    durable_reservation_before_execution: true,
    caller_timestamp_input: false,
    caller_policy_override: false,
    caller_allowed_targets_override: false,
    caller_time_prior_input: false,
    allowed_targets_external_authority_proven: false,
    trusted_clock_dependency_injected: true,
    trusted_clock_source_proven: false,
    expected_policy_bundle_external_authority_proven: false,
    cross_process_restart_continuity_proven: false,
    cross_boot_restart_continuity_proven: false,
    time_store_rollback_resistance_proven: false,
    reservation_store_root_stability_proven: false,
    reservation_store_preflight_before_time_proven: true,
    non_mutating_time_preview_before_durable_time: true,
    read_only_budget_preflight_before_durable_time: true,
    preview_denial_does_not_advance_time: true,
    durable_observe_required_after_preview_allow: true,
    valid_denied_request_time_growth_bounded: true,
    execution_replay_store_bound: true,
    read_only_execution_replay_inspection: true,
    consumed_execution_replay_rejected_before_time: true,
    execution_replay_negative_freshness_authorized: false,
    execution_replay_atomic_consume_performed: false,
    execution_replay_execution_authorized: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    gas_sponsorship_performed: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    inventory_mutation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const CONSTRUCTOR_KEYS = Object.freeze([
  "policy_bundle",
  "expected_policy_bundle_id",
  "trustedClock",
  "time_root",
  "reservation_root",
  "replay_root",
  "allowed_targets",
]);
const REQUEST_KEYS = Object.freeze([
  "candidate_intent",
  "candidate_sponsorship",
  "signed_intent",
  "calldata",
  "signature",
]);
const BUNDLE_KEYS = Object.freeze([
  "marker",
  "schema",
  "version",
  "coupled_launch_id",
  "bundle_generation",
  "bundle_committed_at_ms",
  "opening_window",
  "concentration_policy",
  "minimum_depth_policy",
  "intent_ttl_caps_policy",
  "sponsored_execution_policy",
  "source_contract_ids",
  "exact_values_supplied_explicitly",
  "values_selected_by_source",
  "all_policy_commitments_precede_open",
  "hidden_minimum_trade_amount_applied",
  "runtime_enforcement_verified",
  "launch_authority",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "canonical_launch_source",
  "authority",
  "bundle_id",
]);
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const LOWER_ADDRESS = /^0x[0-9a-f]{40}$/u;
const MAX_CANONICAL_DEPTH = 40;
const MAX_CANONICAL_NODES = 50_000;
const MAX_ALLOWED_TARGETS = 32;

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
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail(code);
  }
  const actual = ownKeys.slice().sort();
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

function snapshotCanonical(value, state, depth = 0) {
  if (depth > MAX_CANONICAL_DEPTH) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_TOO_DEEP");
  }
  state.nodes += 1;
  if (state.nodes > MAX_CANONICAL_NODES) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_TOO_LARGE");
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
    }
    return value;
  }
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value)
  ) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
  }

  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      Reflect.ownKeys(descriptors).length !== length + 1
    ) {
      fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
    }
    const out = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
      }
      out.push(
        snapshotCanonical(descriptor.value, state, depth + 1),
      );
    }
    return Object.freeze(out);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
  }
  const out = Object.create(null);
  for (const key of keys.slice().sort()) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail("SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID");
    }
    out[key] = snapshotCanonical(
      descriptor.value,
      state,
      depth + 1,
    );
  }
  return Object.freeze(out);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("SPONSORED_RUNTIME_CANONICAL_VALUE_INVALID");
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function plainBodyWithoutBundleId(bundle) {
  const body = Object.create(null);
  for (const key of Object.keys(bundle).sort()) {
    if (key === "bundle_id") continue;
    body[key] = bundle[key];
  }
  return Object.freeze(body);
}

function verifyPolicyBundle(raw, expectedBundleId) {
  if (
    typeof expectedBundleId !== "string" ||
    !SHA256_ID.test(expectedBundleId)
  ) {
    fail("SPONSORED_RUNTIME_EXPECTED_BUNDLE_ID_INVALID");
  }
  const bundle = snapshotCanonical(raw, { nodes: 0 });
  if (
    !bundle ||
    typeof bundle !== "object" ||
    Array.isArray(bundle) ||
    Object.keys(bundle).length !== BUNDLE_KEYS.length ||
    BUNDLE_KEYS.some(
      (key) => !Object.hasOwn(bundle, key),
    ) ||
    bundle.marker !==
      VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1 ||
    bundle.schema !==
      VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1 ||
    bundle.version !== 1 ||
    bundle.coupled_launch_id !==
      VOID_WC_VOID_COUPLED_LAUNCH_ID_V1 ||
    typeof bundle.bundle_id !== "string" ||
    bundle.bundle_id !== expectedBundleId
  ) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_IDENTITY_INVALID");
  }
  const body = plainBodyWithoutBundleId(bundle);
  if (sha256Id(canonicalJson(body)) !== bundle.bundle_id) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_DIGEST_MISMATCH");
  }
  if (
    canonicalJson(bundle.authority) !==
      canonicalJson(
        VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
      ) ||
    bundle.exact_values_supplied_explicitly !== true ||
    bundle.values_selected_by_source !== false ||
    bundle.all_policy_commitments_precede_open !== true ||
    bundle.hidden_minimum_trade_amount_applied !== false ||
    bundle.runtime_enforcement_verified !== false ||
    bundle.launch_authority !== false ||
    bundle.market_activation_authorized !== false ||
    bundle.public_presale_activation_authorized !== false ||
    bundle.funds_movement_authorized !== false
  ) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_AUTHORITY_INVALID");
  }

  const ttl = bundle.intent_ttl_caps_policy;
  const sponsor = bundle.sponsored_execution_policy;
  if (!ttl || !sponsor) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_POLICIES_MISSING");
  }
  let ttlState;
  let sponsorState;
  try {
    if (
      economicIntentTtlCapsPolicyIdV1(ttl) !== ttl.policy_id ||
      economicSystemSponsoredPolicyIdV1(sponsor) !==
        sponsor.policy_id
    ) {
      fail("SPONSORED_RUNTIME_POLICY_BUNDLE_POLICY_ID_MISMATCH");
    }
    ttlState = verifyEconomicIntentTtlCapsStateV1({
      policy: ttl,
      outstanding_intents: [],
      observed_at_ms: sponsor.policy_committed_at_ms,
    });
    sponsorState = verifyEconomicSystemSponsoredStateV1({
      sponsorship_policy: sponsor,
      ttl_caps_policy: ttl,
      outstanding_intents: [],
      sponsorships: [],
      observed_at_ms: sponsor.policy_committed_at_ms,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("SPONSORED_RUNTIME_")
    ) {
      throw error;
    }
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_POLICY_INVALID");
  }
  if (
    ttlState.policy_id !== ttl.policy_id ||
    sponsorState.policy_id !== sponsor.policy_id ||
    sponsorState.intent_ttl_caps_policy_id !== ttl.policy_id ||
    ttl.coupled_launch_id !== bundle.coupled_launch_id ||
    sponsor.coupled_launch_id !== bundle.coupled_launch_id
  ) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_POLICY_BINDING_INVALID");
  }

  if (
    !Number.isSafeInteger(bundle.bundle_committed_at_ms) ||
    bundle.bundle_committed_at_ms <= 0 ||
    bundle.bundle_committed_at_ms <=
      sponsor.policy_committed_at_ms
  ) {
    fail("SPONSORED_RUNTIME_POLICY_BUNDLE_COMMIT_ORDER_INVALID");
  }

  return Object.freeze({
    bundle,
    bundle_id: bundle.bundle_id,
    bundle_committed_at_ms: bundle.bundle_committed_at_ms,
    ttl_policy: ttl,
    sponsored_policy: sponsor,
  });
}

function exactPath(value, code) {
  if (
    typeof value !== "string" ||
    !path.isAbsolute(value) ||
    value.includes("\0") ||
    path.resolve(value) !== value
  ) {
    fail(code);
  }
  return value;
}

function pathsOverlap(left, right) {
  const lr = path.relative(left, right);
  const rl = path.relative(right, left);
  return (
    lr === "" ||
    (
      lr !== ".." &&
      !lr.startsWith(".." + path.sep) &&
      !path.isAbsolute(lr)
    ) ||
    (
      rl !== ".." &&
      !rl.startsWith(".." + path.sep) &&
      !path.isAbsolute(rl)
    )
  );
}

function exactTargets(value) {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1 ||
    value.length > MAX_ALLOWED_TARGETS
  ) {
    fail("SPONSORED_RUNTIME_ALLOWED_TARGETS_INVALID");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) {
    fail("SPONSORED_RUNTIME_ALLOWED_TARGETS_INVALID");
  }
  const out = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    const target = descriptor?.value;
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      typeof target !== "string" ||
      !LOWER_ADDRESS.test(target)
    ) {
      fail("SPONSORED_RUNTIME_ALLOWED_TARGETS_INVALID");
    }
    out.push(target);
  }
  out.sort();
  if (new Set(out).size !== out.length) {
    fail("SPONSORED_RUNTIME_ALLOWED_TARGETS_INVALID");
  }
  return Object.freeze(out);
}

function normalizeRequest(input) {
  const raw = exactSnapshot(
    input,
    REQUEST_KEYS,
    "SPONSORED_RUNTIME_REQUEST_INVALID",
  );
  if (
    typeof raw.calldata !== "string" ||
    typeof raw.signature !== "string"
  ) {
    fail("SPONSORED_RUNTIME_REQUEST_INVALID");
  }
  return Object.freeze({
    candidate_intent:
      snapshotCanonical(raw.candidate_intent, { nodes: 0 }),
    candidate_sponsorship:
      snapshotCanonical(raw.candidate_sponsorship, { nodes: 0 }),
    signed_intent:
      snapshotCanonical(raw.signed_intent, { nodes: 0 }),
    calldata: raw.calldata,
    signature: raw.signature,
  });
}

function preflightCandidate(request, policies, allowedTargets) {
  if (
    !Number.isSafeInteger(
      request.candidate_intent?.issued_at_ms,
    ) ||
    request.candidate_intent.issued_at_ms <=
      policies.bundle_committed_at_ms
  ) {
    fail("SPONSORED_RUNTIME_CANDIDATE_PREDATES_BUNDLE");
  }

  let intentId;
  let sponsorshipId;
  try {
    intentId = economicIntentReservationIdV1(
      request.candidate_intent,
    );
    sponsorshipId = economicSystemSponsorshipIdV1(
      request.candidate_sponsorship,
    );
  } catch {
    fail("SPONSORED_RUNTIME_CANDIDATE_IDENTITY_INVALID");
  }
  if (
    request.candidate_intent?.intent_id !== intentId ||
    request.candidate_sponsorship?.sponsorship_id !==
      sponsorshipId ||
    request.candidate_intent?.policy_id !==
      policies.ttl_policy.policy_id ||
    request.candidate_intent?.coupled_launch_id !==
      policies.bundle.coupled_launch_id ||
    request.candidate_sponsorship?.policy_id !==
      policies.sponsored_policy.policy_id ||
    request.candidate_sponsorship?.intent_ttl_caps_policy_id !==
      policies.ttl_policy.policy_id ||
    request.candidate_sponsorship?.coupled_launch_id !==
      policies.bundle.coupled_launch_id ||
    request.candidate_sponsorship?.intent_id !== intentId ||
    request.candidate_sponsorship?.identity_id !==
      request.candidate_intent?.identity_id ||
    request.candidate_sponsorship?.reservation_id !==
      request.candidate_intent?.reservation_id
  ) {
    fail("SPONSORED_RUNTIME_CANDIDATE_BINDING_INVALID");
  }
  const signedSubmission = Object.freeze({
    intent: request.signed_intent,
    calldata: request.calldata,
    signature: request.signature,
    allowed_targets: allowedTargets,
    consumed_digests: new Set(),
  });
  let preflight;
  try {
    preflight = classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: policies.sponsored_policy,
      ttl_caps_policy: policies.ttl_policy,
      outstanding_intents: [],
      sponsorships: [],
      candidate_intent: request.candidate_intent,
      candidate_sponsorship: request.candidate_sponsorship,
      candidate_signed_submission: signedSubmission,
      observed_at_ms: request.candidate_intent.issued_at_ms,
    });
  } catch {
    fail("SPONSORED_RUNTIME_CANDIDATE_PREFLIGHT_INVALID");
  }
  if (
    preflight.signed_submission_signature_verified !== true ||
    preflight.candidate_intent_id !== intentId ||
    preflight.candidate_sponsorship_id !== sponsorshipId ||
    preflight.sponsorship_allowed !== true
  ) {
    fail("SPONSORED_RUNTIME_CANDIDATE_PREFLIGHT_INVALID");
  }
  return Object.freeze({
    intent_id: intentId,
    sponsorship_id: sponsorshipId,
    signed_submission_digest:
      preflight.candidate_signed_submission_digest,
    signed_submission: signedSubmission,
  });
}

function executionReplayMetadata(preflight) {
  const intent = preflight.signed_submission.intent;
  return Object.freeze({
    chain_id: 2050,
    execution_epoch: intent.execution_epoch,
    gateway_id: intent.gateway_id,
    signer: intent.signer,
    nonce: intent.nonce,
    target: intent.target,
    calldata_keccak256: intent.calldata_keccak256,
    expires_at_unix: intent.expires_at_unix,
  });
}

function held(
  reason,
  {
    reservationStorePreflightVerified = false,
    preflightVerified = false,
    replayInspectionVerified = false,
    replayKnownConsumed = null,
    currentCandidateVerified = false,
    previewVerified = false,
    previewBudgetVerified = false,
    previewObservedAtMs = null,
    timeMutation = false,
    timeObservation = false,
    timeReceiptSha = null,
    reservationMutation = false,
  } = {},
) {
  return Object.freeze({
    ok: false,
    status: "held",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1,
    version: 1,
    reason,
    reservation_store_preflight_verified:
      reservationStorePreflightVerified,
    preflight_verified: preflightVerified,
    replay_inspection_verified: replayInspectionVerified,
    replay_known_consumed: replayKnownConsumed,
    replay_mutation_performed: false,
    replay_atomic_consume_performed: false,
    replay_negative_freshness_authorized: false,
    replay_execution_authorized: false,
    current_candidate_verified: currentCandidateVerified,
    time_preview_verified: previewVerified,
    preview_budget_verified: previewBudgetVerified,
    preview_observed_at_ms: previewObservedAtMs,
    time_mutation_performed: timeMutation,
    time_observation_performed: timeObservation,
    time_receipt_sha256: timeReceiptSha,
    reservation_mutation_performed: reservationMutation,
    durable_time_before_reservation: true,
    durable_reservation_before_execution: true,
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
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1,
  });
}

function success(
  policyBundleId,
  preflight,
  timeResult,
  reservation,
) {
  return Object.freeze({
    ok: true,
    status:
      reservation.status === "duplicate"
        ? "source_duplicate_admitted"
        : "source_reserved_admitted",
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1,
    version: 1,
    policy_bundle_id: policyBundleId,
    intent_id: preflight.intent_id,
    sponsorship_id: preflight.sponsorship_id,
    signed_submission_digest: preflight.signed_submission_digest,
    replay_inspection_verified: true,
    replay_known_consumed: false,
    replay_mutation_performed: false,
    replay_atomic_consume_performed: false,
    replay_negative_freshness_authorized: false,
    replay_execution_authorized: false,
    reservation_store_preflight_verified: true,
    preflight_verified: true,
    current_candidate_verified: true,
    time_preview_verified: true,
    preview_budget_verified: true,
    preview_observed_at_ms:
      timeResult.preview_observed_at_ms,
    accepted_observed_at_ms:
      timeResult.accepted_observed_at_ms,
    time_generation: timeResult.generation,
    time_receipt_sha256: timeResult.head_receipt_sha256,
    time_mutation_performed:
      timeResult.mutation_performed === true,
    reservation_status: reservation.status,
    reservation_mutation_performed:
      reservation.mutation_performed === true,
    active_reserved_gas: reservation.active_reserved_gas,
    expired_reserved_gas_not_counted:
      reservation.expired_reserved_gas_not_counted,
    durable_time_before_reservation: true,
    durable_reservation_before_execution: true,
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
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1,
  });
}

export function createVoidEconomicSystemSponsoredRuntimeAdmissionV1(
  input,
) {
  const binding = exactSnapshot(
    input,
    CONSTRUCTOR_KEYS,
    "SPONSORED_RUNTIME_BINDING_INVALID",
  );
  if (typeof binding.trustedClock !== "function") {
    fail("SPONSORED_RUNTIME_TRUSTED_CLOCK_INVALID");
  }
  const trustedClock = binding.trustedClock;
  const timeRoot = exactPath(
    binding.time_root,
    "SPONSORED_RUNTIME_TIME_ROOT_INVALID",
  );
  const reservationRoot = exactPath(
    binding.reservation_root,
    "SPONSORED_RUNTIME_RESERVATION_ROOT_INVALID",
  );
  const replayRoot = exactPath(
    binding.replay_root,
    "SPONSORED_RUNTIME_REPLAY_ROOT_INVALID",
  );
  if (
    pathsOverlap(timeRoot, reservationRoot) ||
    pathsOverlap(timeRoot, replayRoot) ||
    pathsOverlap(reservationRoot, replayRoot)
  ) {
    fail("SPONSORED_RUNTIME_AUTHORITY_ROOTS_NOT_DISJOINT");
  }
  const allowedTargets = exactTargets(binding.allowed_targets);
  const policies = verifyPolicyBundle(
    binding.policy_bundle,
    binding.expected_policy_bundle_id,
  );
  const timeStore =
    createVoidEconomicSystemSponsoredObservationTimeStoreV1({
      root_dir: timeRoot,
      trustedClock,
    });
  const replayStore =
    createVoidEconomicEpoch2DurableReplayStoreV1({
      root: replayRoot,
    });

  return Object.freeze({
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1,
    version: 1,
    policy_bundle_id: policies.bundle_id,
    caller_timestamp_input: false,
    caller_policy_override: false,
    caller_allowed_targets_override: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,

    async admit(inputRequest) {
      let reservationStorePreflightVerified = false;
      let preflight = null;
      let replayInspectionVerified = false;
      let replayKnownConsumed = null;
      let currentCandidateVerified = false;
      let previewVerified = false;
      let previewBudgetVerified = false;
      let previewObservedAtMs = null;
      let timeResult = null;
      let reservation = null;
      try {
        const request = normalizeRequest(inputRequest);

        preflight = preflightCandidate(
          request,
          policies,
          allowedTargets,
        );

        let replayInspection;
        try {
          replayInspection = replayStore.inspectConsumed(
            preflight.signed_submission_digest,
            executionReplayMetadata(preflight),
          );
        } catch (error) {
          return held(
            error instanceof Error
              ? error.message
              : "SPONSORED_RUNTIME_REPLAY_INSPECTION_HELD",
            {
              preflightVerified: true,
              replayInspectionVerified: false,
            },
          );
        }
        if (
          !replayInspection ||
          typeof replayInspection !== "object" ||
          typeof replayInspection.known_consumed !== "boolean" ||
          typeof replayInspection.audit_receipt_present !== "boolean" ||
          replayInspection.mutation_performed !== false ||
          replayInspection.atomic_consume_performed !== false ||
          replayInspection.negative_freshness_authorized !== false ||
          replayInspection.execution_authorized !== false
        ) {
          return held(
            "SPONSORED_RUNTIME_REPLAY_INSPECTION_CONTRACT_INVALID",
            {
              preflightVerified: true,
              replayInspectionVerified: false,
            },
          );
        }
        replayInspectionVerified = true;
        replayKnownConsumed = replayInspection.known_consumed;
        if (replayKnownConsumed) {
          return held(
            "SPONSORED_RUNTIME_EXECUTION_REPLAY_ALREADY_CONSUMED",
            {
              preflightVerified: true,
              replayInspectionVerified: true,
              replayKnownConsumed: true,
            },
          );
        }

        const structural =
          inspectEconomicSystemSponsoredReservationStoreV1({
            root_dir: reservationRoot,
          });
        if (
          structural?.ok !== true ||
          structural?.status !== "inspected" ||
          structural?.marker !==
            VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1 ||
          structural?.mutation_performed !== false ||
          structural?.policy_state_evaluated !== false ||
          structural?.observation_time_evaluated !== false ||
          structural?.storage_bootstrap !== false ||
          structural?.preprovisioned_lock_queue_required !== true ||
          structural?.runtime_enforcement_verified !== false ||
          structural?.gas_sponsorship_performed !== false ||
          structural?.funds_movement !== false
        ) {
          return held(
            structural?.reason ||
              "SPONSORED_RUNTIME_RESERVATION_STORE_PREFLIGHT_HELD",
            {
              reservationStorePreflightVerified: false,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
            },
          );
        }
        reservationStorePreflightVerified = true;

        const preview = timeStore.preview();
        if (
          preview?.ok !== true ||
          preview?.status !== "source_previewed" ||
          preview?.mutation_performed !== false ||
          preview?.durable_time_authority_advanced !== false ||
          preview?.candidate_receipt_persisted !== false ||
          !Number.isSafeInteger(preview.accepted_observed_at_ms)
        ) {
          return held(
            preview?.reason ||
              "SPONSORED_RUNTIME_TIME_PREVIEW_HELD",
            {
              reservationStorePreflightVerified: true,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
              previewVerified: false,
              previewObservedAtMs:
                Number.isSafeInteger(preview?.accepted_observed_at_ms)
                  ? preview.accepted_observed_at_ms
                  : null,
            },
          );
        }
        previewVerified = true;
        previewObservedAtMs = preview.accepted_observed_at_ms;

        try {
          const currentPreview =
            classifyEconomicSystemSponsoredAdmissionV1({
              sponsorship_policy: policies.sponsored_policy,
              ttl_caps_policy: policies.ttl_policy,
              outstanding_intents: [],
              sponsorships: [],
              candidate_intent: request.candidate_intent,
              candidate_sponsorship:
                request.candidate_sponsorship,
              candidate_signed_submission:
                preflight.signed_submission,
              observed_at_ms: previewObservedAtMs,
            });
          if (
            currentPreview.signed_submission_signature_verified !== true ||
            currentPreview.candidate_intent_id !== preflight.intent_id ||
            currentPreview.candidate_sponsorship_id !==
              preflight.sponsorship_id ||
            currentPreview.sponsorship_allowed !== true
          ) {
            fail("SPONSORED_RUNTIME_CURRENT_CANDIDATE_INVALID");
          }
        } catch {
          return held(
            "SPONSORED_RUNTIME_CURRENT_CANDIDATE_INVALID",
            {
              reservationStorePreflightVerified: true,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
              previewVerified: true,
              previewObservedAtMs,
            },
          );
        }

        const listed =
          listEconomicSystemSponsoredReservationsV1({
            root_dir: reservationRoot,
            ttl_caps_policy: policies.ttl_policy,
            sponsorship_policy: policies.sponsored_policy,
            observed_at_ms: previewObservedAtMs,
          });
        if (
          listed?.ok !== true ||
          listed?.status !== "listed" ||
          listed?.mutation_performed !== false ||
          !Array.isArray(listed.records)
        ) {
          return held(
            listed?.reason ||
              "SPONSORED_RUNTIME_RESERVATION_HISTORY_PREFLIGHT_HELD",
            {
              reservationStorePreflightVerified: true,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
              previewVerified: true,
              previewObservedAtMs,
            },
          );
        }

        const exactDuplicate = listed.records.some(
          (record) =>
            record?.sponsorship?.sponsorship_id ===
              preflight.sponsorship_id &&
            record?.intent?.intent_id === preflight.intent_id,
        );

        if (!exactDuplicate) {
          try {
            const budgetPreview =
              classifyEconomicSystemSponsoredAdmissionV1({
                sponsorship_policy: policies.sponsored_policy,
                ttl_caps_policy: policies.ttl_policy,
                outstanding_intents: listed.records.map(
                  (record) => record.intent,
                ),
                sponsorships: listed.records.map(
                  (record) => record.sponsorship,
                ),
                candidate_intent: request.candidate_intent,
                candidate_sponsorship:
                  request.candidate_sponsorship,
                candidate_signed_submission:
                  preflight.signed_submission,
                observed_at_ms: previewObservedAtMs,
              });
            if (
              budgetPreview.signed_submission_signature_verified !== true ||
              budgetPreview.candidate_intent_id !== preflight.intent_id ||
              budgetPreview.candidate_sponsorship_id !==
                preflight.sponsorship_id ||
              budgetPreview.sponsorship_allowed !== true
            ) {
              return held(
                budgetPreview.denial_reason ||
                  "SPONSORED_RUNTIME_PREVIEW_BUDGET_HELD",
                {
                  reservationStorePreflightVerified: true,
                  preflightVerified: true,
                  previewVerified: true,
                  previewBudgetVerified: true,
                  previewObservedAtMs,
                },
              );
            }
          } catch (error) {
            return held(
              error instanceof Error
                ? error.message
                : "SPONSORED_RUNTIME_PREVIEW_BUDGET_HELD",
              {
                reservationStorePreflightVerified: true,
                preflightVerified: true,
                previewVerified: true,
                previewBudgetVerified: true,
                previewObservedAtMs,
              },
            );
          }
        }
        previewBudgetVerified = true;

        timeResult = await timeStore.observe();
        if (
          timeResult?.ok !== true ||
          timeResult?.status !== "source_accepted" ||
          !Number.isSafeInteger(
            timeResult.accepted_observed_at_ms,
          )
        ) {
          return held(
            timeResult?.reason ||
              "SPONSORED_RUNTIME_TIME_OBSERVATION_HELD",
            {
              reservationStorePreflightVerified: true,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
              previewVerified: true,
              previewBudgetVerified: true,
              previewObservedAtMs,
              timeMutation:
                timeResult?.mutation_performed === true,
              timeObservation:
                timeResult?.observation_performed === true,
              timeReceiptSha:
                timeResult?.head_receipt_sha256 || null,
            },
          );
        }
        timeResult = Object.freeze({
          ...timeResult,
          preview_observed_at_ms: previewObservedAtMs,
        });

        try {
          const current = classifyEconomicSystemSponsoredAdmissionV1({
            sponsorship_policy: policies.sponsored_policy,
            ttl_caps_policy: policies.ttl_policy,
            outstanding_intents: [],
            sponsorships: [],
            candidate_intent: request.candidate_intent,
            candidate_sponsorship:
              request.candidate_sponsorship,
            candidate_signed_submission:
              preflight.signed_submission,
            observed_at_ms:
              timeResult.accepted_observed_at_ms,
          });
          if (
            current.signed_submission_signature_verified !== true ||
            current.candidate_intent_id !== preflight.intent_id ||
            current.candidate_sponsorship_id !==
              preflight.sponsorship_id ||
            current.sponsorship_allowed !== true
          ) {
            fail("SPONSORED_RUNTIME_CURRENT_CANDIDATE_INVALID");
          }
          currentCandidateVerified = true;
        } catch {
          return held(
            "SPONSORED_RUNTIME_CURRENT_CANDIDATE_INVALID",
            {
              reservationStorePreflightVerified: true,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
              previewVerified: true,
              previewBudgetVerified: true,
              previewObservedAtMs,
              currentCandidateVerified: false,
              timeMutation:
                timeResult.mutation_performed === true,
              timeObservation: true,
              timeReceiptSha:
                timeResult.head_receipt_sha256,
            },
          );
        }

        reservation =
          await persistEconomicSystemSponsoredReservationV1({
            root_dir: reservationRoot,
            ttl_caps_policy: policies.ttl_policy,
            sponsorship_policy: policies.sponsored_policy,
            candidate_intent: request.candidate_intent,
            candidate_sponsorship:
              request.candidate_sponsorship,
            candidate_signed_submission:
              preflight.signed_submission,
            observed_at_ms:
              timeResult.accepted_observed_at_ms,
          });

        if (
          reservation?.ok !== true ||
          (
            reservation.status !== "reserved" &&
            reservation.status !== "duplicate"
          )
        ) {
          return held(
            reservation?.reason ||
              "SPONSORED_RUNTIME_RESERVATION_HELD",
            {
              reservationStorePreflightVerified: true,
              preflightVerified: true,
              replayInspectionVerified,
              replayKnownConsumed,
              currentCandidateVerified: true,
              previewVerified: true,
              previewBudgetVerified: true,
              previewObservedAtMs,
              timeMutation:
                timeResult.mutation_performed === true,
              timeObservation: true,
              timeReceiptSha:
                timeResult.head_receipt_sha256,
              reservationMutation:
                reservation?.mutation_performed === true,
            },
          );
        }

        return success(
          policies.bundle_id,
          preflight,
          timeResult,
          reservation,
        );
      } catch (error) {
        return held(
          error instanceof Error
            ? error.message
            : "SPONSORED_RUNTIME_ADMISSION_FAILED",
          {
            reservationStorePreflightVerified,
            preflightVerified: preflight !== null,
            replayInspectionVerified,
            replayKnownConsumed,
            currentCandidateVerified,
            previewVerified,
            previewBudgetVerified,
            previewObservedAtMs,
            timeMutation:
              timeResult?.mutation_performed === true,
            timeObservation:
              timeResult?.observation_performed === true,
            timeReceiptSha:
              timeResult?.head_receipt_sha256 || null,
            reservationMutation:
              reservation?.mutation_performed === true,
          },
        );
      }
    },
  });
}

export const VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_DEPENDENCIES_V1 =
  Object.freeze({
    policy_bundle_marker:
      VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
    time_store_marker:
      VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
    reservation_store_marker:
      VOID_ECONOMIC_SYSTEM_SPONSORED_RESERVATION_STORE_V1,
    replay_store_marker:
      VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
  });
