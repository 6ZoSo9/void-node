#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
} from "../tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs";
import {
  VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
  economicIntentReservationIdV1,
  economicIntentTtlCapsPolicyIdV1,
} from "../tools/void-economic-intent-ttl-caps-policy-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
  economicSystemSponsoredPolicyIdV1,
  economicSystemSponsorshipIdV1,
} from "../tools/void-economic-system-sponsored-anti-grief-policy-v1.mjs";
import {
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionDigestV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_DEPENDENCIES_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1,
  createVoidEconomicSystemSponsoredRuntimeAdmissionV1,
} from "../tools/void-economic-system-sponsored-runtime-admission-v1.mjs";

const BASE_UNIX = 1_800_000_000;
const BASE_MS = BASE_UNIX * 1000;
const TARGET =
  "0x4444444444444444444444444444444444444444";
const BOOT =
  "11111111-1111-1111-1111-111111111111";
const START_TICKS = "123456";
const BASE_MONO = 9_000_000_000_000n;

function sha(digit) {
  return "sha256:" + String(digit).repeat(64);
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
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("proof_noncanonical_value");
}

function digest(value) {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(value))
      .digest("hex")
  );
}

function ttlPolicy() {
  const value = {
    schema: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
    policy_id: sha("0"),
    coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
    policy_generation: "1",
    policy_committed_at_ms: BASE_MS - 20_000,
    intent_ttl_seconds: 120,
    per_identity_max_outstanding: 4,
    global_max_outstanding: 8,
    late_payment_action:
      "reconcile_without_automatic_execution",
  };
  value.policy_id = economicIntentTtlCapsPolicyIdV1(value);
  return value;
}

function sponsorPolicy(ttl) {
  const value = {
    schema: VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
    policy_id: sha("0"),
    coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
    intent_ttl_caps_policy_id: ttl.policy_id,
    policy_generation: "1",
    policy_committed_at_ms: BASE_MS - 10_000,
    per_intent_sponsored_gas_limit: "50000",
    per_identity_sponsored_gas_budget: "60000",
    global_sponsored_gas_budget: "60000",
    budget_exhaustion_action:
      "deny_sponsorship_without_hidden_trade_minimum",
  };
  value.policy_id = economicSystemSponsoredPolicyIdV1(value);
  return value;
}

function policyBundle(ttl, sponsor) {
  const body = {
    marker: VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
    schema: VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_SCHEMA_V1,
    version: 1,
    coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
    bundle_generation: "1",
    bundle_committed_at_ms: BASE_MS - 5_000,
    opening_window: {
      schema: "proof.opening-window.v1",
      window_id: sha("a"),
      coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
      policy_committed_at_ms: BASE_MS - 30_000,
      opens_at_ms: BASE_MS + 60_000,
      closes_at_ms: BASE_MS + 3_600_000,
    },
    concentration_policy: {
      schema: "proof.concentration.v1",
      policy_id: sha("b"),
      coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
      opening_window_id: sha("a"),
      policy_generation: "1",
      policy_committed_at_ms: BASE_MS - 25_000,
      max_participant_share_bps: 1000,
      max_related_identity_share_bps: 1500,
      failure_action: "hold",
    },
    minimum_depth_policy: {
      schema: "proof.depth.v1",
      policy_id: sha("c"),
      coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
      opening_window_id: sha("a"),
      policy_generation: "1",
      policy_committed_at_ms: BASE_MS - 24_000,
      minimum_real_wc_units: "1",
      minimum_depth_failure_action: "hold",
    },
    intent_ttl_caps_policy: ttl,
    sponsored_execution_policy: sponsor,
    source_contract_ids: {
      concentration_sybil: "proof-concentration-v1",
      minimum_real_wc_depth: "proof-depth-v1",
      intent_ttl_caps: "proof-ttl-v1",
      system_sponsored_anti_grief: "proof-sponsored-v1",
    },
    exact_values_supplied_explicitly: true,
    values_selected_by_source: false,
    all_policy_commitments_precede_open: true,
    hidden_minimum_trade_amount_applied: false,
    runtime_enforcement_verified: false,
    launch_authority: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    canonical_launch_source: {
      path:
        "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
      repository_head_sha: "a".repeat(40),
      repository_tree_sha: "b".repeat(40),
      repository_branch: "main",
      canonical_remote_url:
        "https://github.com/6ZoSo9/void-node.git",
      remote_main_sha: "a".repeat(40),
      canonical_main_verified: true,
      git_blob_sha1: "c".repeat(40),
      file_sha256: "d".repeat(64),
      coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
      reviewed_policy_module_git_blobs: {
        core: "e".repeat(40),
      },
      permission_fenced_execution: true,
    },
    authority:
      VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_AUTHORITY_V1,
  };
  return Object.freeze({
    ...body,
    bundle_id: digest(body),
  });
}

function economicIntent(ttl, identityDigit, reservationDigit, issuedMs) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
    intent_id: sha("0"),
    policy_id: ttl.policy_id,
    coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
    identity_id: sha(identityDigit),
    reservation_id: sha(reservationDigit),
    issued_at_ms: issuedMs,
    expires_at_ms:
      issuedMs + ttl.intent_ttl_seconds * 1000,
    state: "pending_unpaid",
  };
  value.intent_id = economicIntentReservationIdV1(value);
  return value;
}

function sponsorship(
  sponsor,
  intent,
  signedDigest,
  gasLimit,
) {
  const value = {
    schema: VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
    sponsorship_id: sha("0"),
    policy_id: sponsor.policy_id,
    coupled_launch_id: VOID_WC_VOID_COUPLED_LAUNCH_ID_V1,
    intent_ttl_caps_policy_id:
      sponsor.intent_ttl_caps_policy_id,
    intent_id: intent.intent_id,
    identity_id: intent.identity_id,
    reservation_id: intent.reservation_id,
    signed_submission_digest: signedDigest,
    gas_limit: String(gasLimit),
  };
  value.sponsorship_id =
    economicSystemSponsorshipIdV1(value);
  return value;
}

async function makeRequest({
  ttl,
  sponsor,
  walletDigit,
  identityDigit,
  reservationDigit,
  issuedUnix,
  gasLimit,
}) {
  const wallet = new Wallet(
    "0x" + String(walletDigit).repeat(64),
  );
  const signedIntent =
    buildVoidEconomicEpoch2SignedSubmissionIntentV1({
      signer: wallet.address.toLowerCase(),
      nonce: "1",
      issuedAtUnix: String(issuedUnix),
      expiresAtUnix:
        String(issuedUnix + ttl.intent_ttl_seconds),
      target: TARGET,
      gasLimit: String(gasLimit),
      calldata: "0x1234",
    });
  const typed =
    voidEconomicEpoch2SignedSubmissionTypedDataV1(
      signedIntent,
    );
  const signature = await wallet.signTypedData(
    typed.domain,
    typed.types,
    typed.value,
  );
  const signedDigest =
    voidEconomicEpoch2SignedSubmissionDigestV1(
      signedIntent,
    );
  const intent = economicIntent(
    ttl,
    identityDigit,
    reservationDigit,
    issuedUnix * 1000,
  );
  return Object.freeze({
    candidate_intent: intent,
    candidate_sponsorship: sponsorship(
      sponsor,
      intent,
      signedDigest,
      gasLimit,
    ),
    signed_intent: signedIntent,
    calldata: "0x1234",
    signature,
  });
}

function clockQueue(values) {
  const queue = [...values];
  let calls = 0;
  return {
    clock() {
      calls += 1;
      if (queue.length < 1) {
        throw new Error("proof_clock_exhausted");
      }
      return queue.shift();
    },
    calls() {
      return calls;
    },
  };
}

function sample(
  wallOffsetMs,
  monoOffsetNs,
  startTicks = START_TICKS,
) {
  return {
    boot_id: BOOT,
    process_start_ticks: startTicks,
    wall_time_ms: BASE_MS + wallOffsetMs,
    monotonic_ns:
      (BASE_MONO + BigInt(monoOffsetNs)).toString(),
  };
}

function fixture() {
  const root = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-sponsored-runtime-admission-v1-",
    ),
  );
  fs.chmodSync(root, 0o700);
  const timeRoot = path.join(root, "time");
  const reservationRoot = path.join(root, "reservation");
  for (const directory of [
    timeRoot,
    reservationRoot,
    path.join(timeRoot, "records"),
    path.join(timeRoot, "observation-time-v1.queue"),
    path.join(reservationRoot, "records"),
    path.join(
      reservationRoot,
      "sponsorship-admission-v1.queue",
    ),
  ]) {
    fs.mkdirSync(directory, { mode: 0o700 });
  }
  return { root, timeRoot, reservationRoot };
}

function countRecords(root) {
  return fs
    .readdirSync(path.join(root, "records"))
    .filter((name) => name.endsWith(".json"))
    .length;
}

function createBinding({
  bundle,
  clock,
  timeRoot,
  reservationRoot,
}) {
  return createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
    policy_bundle: bundle,
    expected_policy_bundle_id: bundle.bundle_id,
    trustedClock: clock,
    time_root: timeRoot,
    reservation_root: reservationRoot,
    allowed_targets: [TARGET],
  });
}

function requireOk(value) {
  assert.equal(value.ok, true, JSON.stringify(value));
  assert.equal(value.reservation_store_preflight_verified, true);
  assert.equal(value.preflight_verified, true);
  assert.equal(value.current_candidate_verified, true);
  assert.equal(value.durable_time_before_reservation, true);
  assert.equal(value.durable_reservation_before_execution, true);
  assert.equal(value.runtime_route_active, false);
  assert.equal(value.runtime_enforcement_verified, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_construction, false);
  assert.equal(value.transaction_signing, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.transaction_broadcast, false);
  assert.equal(value.authoritative_chain2050_write, false);
  assert.equal(value.funds_movement, false);
  return value;
}

function requireHeld(value, reason) {
  assert.equal(value.ok, false, JSON.stringify(value));
  assert.equal(value.status, "held");
  assert.equal(value.reason, reason);
  assert.equal(
    typeof value.reservation_store_preflight_verified,
    "boolean",
  );
  assert.equal(value.runtime_route_active, false);
  assert.equal(value.runtime_enforcement_verified, false);
  assert.equal(value.gas_sponsorship_performed, false);
  assert.equal(value.transaction_submission, false);
  assert.equal(value.transaction_broadcast, false);
  assert.equal(value.authoritative_chain2050_write, false);
  assert.equal(value.funds_movement, false);
  return value;
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_binding",
    "policy_bundle_content_address_verified",
    "policy_bundle_marker_schema_verified",
    "exact_expected_bundle_id_required",
    "canonical_ttl_policy_semantics_reused",
    "canonical_sponsored_policy_semantics_reused",
    "candidate_preflight_before_time_mutation",
    "reservation_store_preflight_before_time_proven",
    "candidate_issued_after_bundle_commit_required",
    "current_candidate_revalidation_after_time",
    "durable_time_observation_before_reservation",
    "durable_reservation_before_execution",
    "trusted_clock_dependency_injected",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

const ttl = ttlPolicy();
const sponsor = sponsorPolicy(ttl);
const bundle = policyBundle(ttl, sponsor);

{
  const f = fixture();
  try {
    assert.throws(
      () =>
        createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
          policy_bundle: bundle,
          expected_policy_bundle_id: sha("f"),
          trustedClock: () => sample(1000, 1_000_000_000n),
          time_root: f.timeRoot,
          reservation_root: f.reservationRoot,
          allowed_targets: [TARGET],
        }),
      /SPONSORED_RUNTIME_POLICY_BUNDLE_IDENTITY_INVALID/u,
    );

    const tampered = structuredClone(bundle);
    tampered.opening_window.opens_at_ms += 1;
    assert.throws(
      () =>
        createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
          policy_bundle: tampered,
          expected_policy_bundle_id: bundle.bundle_id,
          trustedClock: () => sample(1000, 1_000_000_000n),
          time_root: f.timeRoot,
          reservation_root: f.reservationRoot,
          allowed_targets: [TARGET],
        }),
      /SPONSORED_RUNTIME_POLICY_BUNDLE_DIGEST_MISMATCH/u,
    );

    assert.throws(
      () =>
        createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
          policy_bundle: bundle,
          expected_policy_bundle_id: bundle.bundle_id,
          trustedClock: () => sample(1000, 1_000_000_000n),
          time_root: f.timeRoot,
          reservation_root: f.timeRoot,
          allowed_targets: [TARGET],
        }),
      /SPONSORED_RUNTIME_AUTHORITY_ROOTS_NOT_DISJOINT/u,
    );

    let bindingGetterReads = 0;
    const accessorBinding = {
      expected_policy_bundle_id: bundle.bundle_id,
      trustedClock: () => sample(1000, 1_000_000_000n),
      time_root: f.timeRoot,
      reservation_root: f.reservationRoot,
      allowed_targets: [TARGET],
    };
    Object.defineProperty(accessorBinding, "policy_bundle", {
      enumerable: true,
      get() {
        bindingGetterReads += 1;
        return bundle;
      },
    });
    assert.throws(
      () =>
        createVoidEconomicSystemSponsoredRuntimeAdmissionV1(
          accessorBinding,
        ),
      /SPONSORED_RUNTIME_BINDING_INVALID/u,
    );
    assert.equal(bindingGetterReads, 0);

    const nestedAccessorBundle = structuredClone(bundle);
    let nestedGetterReads = 0;
    Object.defineProperty(
      nestedAccessorBundle.opening_window,
      "opens_at_ms",
      {
        enumerable: true,
        get() {
          nestedGetterReads += 1;
          return BASE_MS + 60_000;
        },
      },
    );
    assert.throws(
      () =>
        createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
          policy_bundle: nestedAccessorBundle,
          expected_policy_bundle_id: bundle.bundle_id,
          trustedClock: () => sample(1000, 1_000_000_000n),
          time_root: f.timeRoot,
          reservation_root: f.reservationRoot,
          allowed_targets: [TARGET],
        }),
      /SPONSORED_RUNTIME_POLICY_BUNDLE_VALUE_INVALID/u,
    );
    assert.equal(nestedGetterReads, 0);

    const revokedTargets = Proxy.revocable([TARGET], {});
    revokedTargets.revoke();
    assert.throws(
      () =>
        createVoidEconomicSystemSponsoredRuntimeAdmissionV1({
          policy_bundle: bundle,
          expected_policy_bundle_id: bundle.bundle_id,
          trustedClock: () => sample(1000, 1_000_000_000n),
          time_root: f.timeRoot,
          reservation_root: f.reservationRoot,
          allowed_targets: revokedTargets.proxy,
        }),
      /SPONSORED_RUNTIME_ALLOWED_TARGETS_INVALID/u,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const request = await makeRequest({
      ttl,
      sponsor,
      walletDigit: "9",
      identityDigit: "9",
      reservationDigit: "9",
      issuedUnix: BASE_UNIX,
      gasLimit: 30000,
    });
    const queuePath = path.join(
      f.reservationRoot,
      "sponsorship-admission-v1.queue",
    );
    fs.rmSync(queuePath, { recursive: true, force: true });
    const clock = clockQueue([
      sample(1_000, 1_000_000_000n),
    ]);
    const binding = createBinding({
      bundle,
      clock: clock.clock,
      timeRoot: f.timeRoot,
      reservationRoot: f.reservationRoot,
    });

    const held = requireHeld(
      await binding.admit(request),
      "SPONSORED_RESERVATION_STORE_LOCK_QUEUE_DIRECTORY_MISSING",
    );
    assert.equal(
      held.reservation_store_preflight_verified,
      false,
    );
    assert.equal(held.preflight_verified, false);
    assert.equal(held.current_candidate_verified, false);
    assert.equal(held.time_observation_performed, false);
    assert.equal(held.time_mutation_performed, false);
    assert.equal(held.reservation_mutation_performed, false);
    assert.equal(clock.calls(), 0);
    assert.equal(countRecords(f.timeRoot), 0);
    assert.equal(countRecords(f.reservationRoot), 0);
    assert.equal(fs.existsSync(queuePath), false);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const first = await makeRequest({
      ttl,
      sponsor,
      walletDigit: "1",
      identityDigit: "1",
      reservationDigit: "a",
      issuedUnix: BASE_UNIX,
      gasLimit: 40000,
    });
    const clock = clockQueue([
      sample(1_000, 1_000_000_000n),
      sample(2_000, 2_000_000_000n),
      sample(3_000, 3_000_000_000n),
      sample(130_000, 130_000_000_000n),
    ]);
    const binding = createBinding({
      bundle,
      clock: clock.clock,
      timeRoot: f.timeRoot,
      reservationRoot: f.reservationRoot,
    });

    const preBundleRequest = await makeRequest({
      ttl,
      sponsor,
      walletDigit: "5",
      identityDigit: "5",
      reservationDigit: "e",
      issuedUnix: BASE_UNIX - 6,
      gasLimit: 30000,
    });
    const preBundle = requireHeld(
      await binding.admit(preBundleRequest),
      "SPONSORED_RUNTIME_CANDIDATE_PREDATES_BUNDLE",
    );
    assert.equal(
      preBundle.reservation_store_preflight_verified,
      true,
    );
    assert.equal(preBundle.preflight_verified, false);
    assert.equal(preBundle.time_observation_performed, false);
    assert.equal(clock.calls(), 0);
    assert.equal(countRecords(f.timeRoot), 0);

    const badSignature = {
      ...first,
      signature: "0x" + "00".repeat(65),
    };
    const invalid = requireHeld(
      await binding.admit(badSignature),
      "SPONSORED_RUNTIME_CANDIDATE_PREFLIGHT_INVALID",
    );
    assert.equal(
      invalid.reservation_store_preflight_verified,
      true,
    );
    assert.equal(invalid.preflight_verified, false);
    assert.equal(invalid.current_candidate_verified, false);
    assert.equal(invalid.time_observation_performed, false);
    assert.equal(clock.calls(), 0);
    assert.equal(countRecords(f.timeRoot), 0);
    assert.equal(countRecords(f.reservationRoot), 0);

    const injectedTimestamp = {
      ...first,
      observed_at_ms: BASE_MS + 1000,
    };
    const injected = requireHeld(
      await binding.admit(injectedTimestamp),
      "SPONSORED_RUNTIME_REQUEST_INVALID",
    );
    assert.equal(injected.time_observation_performed, false);
    assert.equal(clock.calls(), 0);
    assert.equal(countRecords(f.timeRoot), 0);

    const accepted = requireOk(
      await binding.admit(first),
    );
    assert.equal(
      accepted.status,
      "source_reserved_admitted",
    );
    assert.equal(accepted.policy_bundle_id, bundle.bundle_id);
    assert.equal(accepted.reservation_status, "reserved");
    assert.equal(accepted.active_reserved_gas, "40000");
    assert.equal(clock.calls(), 1);
    assert.equal(countRecords(f.timeRoot), 1);
    assert.equal(countRecords(f.reservationRoot), 1);

    const duplicate = requireOk(
      await binding.admit(first),
    );
    assert.equal(
      duplicate.status,
      "source_duplicate_admitted",
    );
    assert.equal(duplicate.reservation_status, "duplicate");
    assert.equal(clock.calls(), 2);
    assert.equal(countRecords(f.timeRoot), 2);
    assert.equal(countRecords(f.reservationRoot), 1);

    const overBudget = await makeRequest({
      ttl,
      sponsor,
      walletDigit: "2",
      identityDigit: "2",
      reservationDigit: "b",
      issuedUnix: BASE_UNIX,
      gasLimit: 21000,
    });
    const denied = requireHeld(
      await binding.admit(overBudget),
      "sponsored_gas_budget_exhausted",
    );
    assert.equal(denied.preflight_verified, true);
    assert.equal(denied.current_candidate_verified, true);
    assert.equal(denied.time_observation_performed, true);
    assert.equal(denied.time_mutation_performed, true);
    assert.equal(denied.reservation_mutation_performed, false);
    assert.equal(clock.calls(), 3);
    assert.equal(countRecords(f.timeRoot), 3);
    assert.equal(countRecords(f.reservationRoot), 1);
    assert.equal(
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1
        .valid_denied_request_time_growth_bounded,
      false,
    );

    const expiredDuplicate = requireHeld(
      await binding.admit(first),
      "SPONSORED_RUNTIME_CURRENT_CANDIDATE_INVALID",
    );
    assert.equal(expiredDuplicate.preflight_verified, true);
    assert.equal(
      expiredDuplicate.current_candidate_verified,
      false,
    );
    assert.equal(
      expiredDuplicate.time_observation_performed,
      true,
    );
    assert.equal(
      expiredDuplicate.time_mutation_performed,
      true,
    );
    assert.equal(
      expiredDuplicate.reservation_mutation_performed,
      false,
    );
    assert.equal(clock.calls(), 4);
    assert.equal(countRecords(f.timeRoot), 4);
    assert.equal(countRecords(f.reservationRoot), 1);
    assert.equal(
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1
        .expired_duplicate_execution_admission,
      false,
    );

    const noPolicyOverride = {
      ...overBudget,
      sponsorship_policy: sponsor,
    };
    const override = requireHeld(
      await binding.admit(noPolicyOverride),
      "SPONSORED_RUNTIME_REQUEST_INVALID",
    );
    assert.equal(override.time_observation_performed, false);
    assert.equal(override.current_candidate_verified, false);
    assert.equal(clock.calls(), 4);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const request = await makeRequest({
      ttl,
      sponsor,
      walletDigit: "4",
      identityDigit: "4",
      reservationDigit: "d",
      issuedUnix: BASE_UNIX,
      gasLimit: 30000,
    });
    const clock = clockQueue([
      sample(1_000, 1_000_000_000n),
    ]);
    const binding = createBinding({
      bundle,
      clock: clock.clock,
      timeRoot: f.timeRoot,
      reservationRoot: f.reservationRoot,
    });
    fs.rmSync(f.reservationRoot, {
      recursive: true,
      force: true,
    });

    const held = await binding.admit(request);
    assert.equal(held.ok, false, JSON.stringify(held));
    assert.equal(
      held.reservation_store_preflight_verified,
      false,
    );
    assert.equal(held.preflight_verified, false);
    assert.equal(held.current_candidate_verified, false);
    assert.equal(held.time_observation_performed, false);
    assert.equal(held.time_mutation_performed, false);
    assert.equal(held.reservation_mutation_performed, false);
    assert.equal(clock.calls(), 0);
    assert.equal(countRecords(f.timeRoot), 0);
    assert.equal(
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1
        .reservation_store_preflight_before_time_proven,
      true,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    const request = await makeRequest({
      ttl,
      sponsor,
      walletDigit: "3",
      identityDigit: "3",
      reservationDigit: "c",
      issuedUnix: BASE_UNIX,
      gasLimit: 30000,
    });

    const firstClock = clockQueue([
      sample(1_000, 1_000_000_000n),
    ]);
    const firstBinding = createBinding({
      bundle,
      clock: firstClock.clock,
      timeRoot: f.timeRoot,
      reservationRoot: f.reservationRoot,
    });
    requireOk(await firstBinding.admit(request));
    assert.equal(countRecords(f.timeRoot), 1);
    assert.equal(countRecords(f.reservationRoot), 1);

    const restartClock = clockQueue([
      sample(
        2_000,
        2_000_000_000n,
        "123457",
      ),
    ]);
    const restarted = createBinding({
      bundle,
      clock: restartClock.clock,
      timeRoot: f.timeRoot,
      reservationRoot: f.reservationRoot,
    });
    const held = requireHeld(
      await restarted.admit(request),
      "sponsored_observation_time_process_instance_changed",
    );
    assert.equal(held.preflight_verified, true);
    assert.equal(held.current_candidate_verified, false);
    assert.equal(held.time_observation_performed, true);
    assert.equal(held.time_mutation_performed, false);
    assert.equal(restartClock.calls(), 1);
    assert.equal(countRecords(f.timeRoot), 1);
    assert.equal(countRecords(f.reservationRoot), 1);
    assert.equal(
      VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_AUTHORITY_V1
        .cross_process_restart_continuity_proven,
      false,
    );
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

{
  const f = fixture();
  try {
    let getterReads = 0;
    const request = {
      candidate_sponsorship: {},
      signed_intent: {},
      calldata: "0x",
      signature: "0x",
    };
    Object.defineProperty(request, "candidate_intent", {
      enumerable: true,
      get() {
        getterReads += 1;
        return {};
      },
    });
    const clock = clockQueue([
      sample(1_000, 1_000_000_000n),
    ]);
    const binding = createBinding({
      bundle,
      clock: clock.clock,
      timeRoot: f.timeRoot,
      reservationRoot: f.reservationRoot,
    });
    requireHeld(
      await binding.admit(request),
      "SPONSORED_RUNTIME_REQUEST_INVALID",
    );
    assert.equal(getterReads, 0);
    assert.equal(clock.calls(), 0);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
}

assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_DEPENDENCIES_V1
    .policy_bundle_marker,
  VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1,
);

const source = fs.readFileSync(
  "tools/void-economic-system-sponsored-runtime-admission-v1.mjs",
  "utf8",
);
assert.match(
  source,
  /classifyEconomicSystemSponsoredAdmissionV1/u,
);
assert.match(
  source,
  /createVoidEconomicSystemSponsoredObservationTimeStoreV1/u,
);
assert.match(
  source,
  /persistEconomicSystemSponsoredReservationV1/u,
);
assert.doesNotMatch(source, /Date\.now\s*\(/u);
assert.doesNotMatch(source, /process\.hrtime/u);
assert.doesNotMatch(
  source,
  /eth_sendRawTransaction|eth_sendTransaction|transaction\.send|systemctl/u,
);

console.log(
  "VOID_ECONOMIC_SYSTEM_SPONSORED_RUNTIME_ADMISSION_V1_PROOF_GREEN",
);
console.log("policy_bundle_content_address_verified=true");
console.log("policy_bundle_marker_schema_verified=true");
console.log("reviewed_policy_compiler_proven=false");
console.log("canonical_main_bundle_proven=false");
console.log("candidate_preflight_before_time_mutation=true");
console.log("reservation_store_preflight_before_time_proven=true");
console.log("missing_reservation_queue_blocks_before_time=true");
console.log("candidate_issued_after_bundle_commit_required=true");
console.log("retroactive_sponsorship_before_bundle_commit=false");
console.log("current_candidate_revalidation_after_time=true");
console.log("expired_duplicate_execution_admission=false");
console.log("invalid_signature_clock_calls=0");
console.log("caller_timestamp_input=false");
console.log("caller_policy_override=false");
console.log("constructor_accessor_rejected_without_getter_read=true");
console.log("nested_bundle_accessor_rejected_without_getter_read=true");
console.log("revoked_allowed_targets_proxy_rejected=true");
console.log("missing_reservation_store_can_advance_time=false");
console.log("durable_time_observation_before_reservation=true");
console.log("durable_reservation_before_execution=true");
console.log("duplicate_reservation_idempotent=true");
console.log("valid_denied_request_can_advance_time=true");
console.log("valid_denied_request_time_growth_bounded=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("runtime_route_active=false");
console.log("runtime_enforcement_verified=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("funds_movement=false");
