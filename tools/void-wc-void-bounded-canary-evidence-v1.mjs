#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  EXPECTED as MARKET_VAULT_COMPILED_IDENTITY_EXPECTED,
} from "./void-wc-void-market-vault-compiled-identity-current-v2.mjs";
import {
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1";
export const VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1";

export const VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_verification_only: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const POLICY_ID = /^voidwcbcp1_[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^voidwcbce1_[0-9a-f]{64}$/u;
const REPLAY_CAPSULE_ID = /^voidwcrp1_[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_UINT_DIGITS = 78;
const MAX_EVIDENCE_AGE_SECONDS = 86_400n;
const OPENING_SALE_TRANCHE_VOID_ATOMS =
  5_000_000n * 10n ** 18n;

const INPUT_KEYS = Object.freeze([
  "expected_policy_id",
  "evaluation_time_utc",
  "policy",
  "evidence",
]);

const POLICY_KEYS = Object.freeze([
  "marker",
  "version",
  "chain_id",
  "execution_epoch",
  "pair",
  "coupled_launch_id",
  "market_vault_address",
  "market_vault_runtime_code_sha256",
  "market_vault_compiled_identity_id",
  "wc_settlement_adapter_id",
  "max_participants",
  "max_settled_wc_units",
  "max_delivered_void_atoms",
  "min_finality_confirmations",
  "max_evidence_age_seconds",
  "requires_live_runtime_evidence",
  "requires_inventory_lock",
  "requires_wc_ledger_persistence",
  "requires_quote_reserve_custody",
  "requires_claim_binding_persistence",
  "requires_durable_replay_persistence",
  "requires_participant_control_finality",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "policy_id",
]);

const EVIDENCE_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "policy_id",
  "coupled_launch_id",
  "chain_id",
  "execution_epoch",
  "pair",
  "market_vault_address",
  "market_vault_runtime_code_sha256",
  "market_vault_compiled_identity_id",
  "market_vault_runtime_verification_evidence_id",
  "inventory_lock_evidence_id",
  "wc_settlement_adapter_id",
  "wc_ledger_custody_evidence_id",
  "participant_count",
  "settled_wc_units",
  "delivered_void_atoms",
  "inventory_lock_verified",
  "wc_ledger_persistence_verified",
  "quote_reserve_custody_verified",
  "opening_claim_binding_id",
  "opening_claim_binding_persistence_evidence_id",
  "opening_claim_binding_persisted",
  "replay_capsule_id",
  "replay_terminal_capsule_sha256",
  "durable_replay_state_persistence_verified",
  "participant_control_evidence_id",
  "participant_postpurchase_voidtoken_control_verified",
  "observed_finality_confirmations",
  "runtime_or_launch_evidence",
  "observed_at_utc",
  "valid_until_utc",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "evidence_id",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
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
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function uint(value, code, { positive = false } = {}) {
  if (
    typeof value !== "string" ||
    value.length > MAX_UINT_DIGITS ||
    !UINT.test(value)
  ) {
    fail(code);
  }
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function canonicalUtc(value, code) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)
  ) {
    fail(code);
  }
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(code);
  }
  return BigInt(ms);
}

function canonicalAddress(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (
    !ADDRESS.test(lower) ||
    lower === "0x0000000000000000000000000000000000000000"
  ) {
    fail(code);
  }
  return lower;
}

function bodyWithoutId(value, idKey) {
  const body = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (key !== idKey) body[key] = item;
  }
  return body;
}

export function wcVoidBoundedCanaryPolicyIdV1(policy) {
  return "voidwcbcp1_" +
    sha256Text(canonicalJson(bodyWithoutId(policy, "policy_id")));
}

export function wcVoidBoundedCanaryEvidenceIdV1(evidence) {
  return "voidwcbce1_" +
    sha256Text(canonicalJson(bodyWithoutId(evidence, "evidence_id")));
}

function validatePolicy(raw) {
  const policy = exactObject(
    raw,
    POLICY_KEYS,
    "INVALID_WC_VOID_BOUNDED_CANARY_POLICY_SHAPE",
  );
  if (
    policy.marker !== VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1 ||
    policy.version !== 1 ||
    policy.chain_id !== 2050 ||
    policy.execution_epoch !== 2 ||
    policy.pair !== "WC_VOID"
  ) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_IDENTITY_MISMATCH");
  }
  if (
    typeof policy.coupled_launch_id !== "string" ||
    !SHA256.test(policy.coupled_launch_id)
  ) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_LAUNCH_ID_INVALID");
  }
  const marketVault = canonicalAddress(
    policy.market_vault_address,
    "WC_VOID_BOUNDED_CANARY_POLICY_VAULT_INVALID",
  );
  if (
    typeof policy.market_vault_runtime_code_sha256 !== "string" ||
    !SHA256_HEX.test(policy.market_vault_runtime_code_sha256)
  ) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_RUNTIME_HASH_INVALID");
  }
  if (
    policy.market_vault_compiled_identity_id !==
      MARKET_VAULT_COMPILED_IDENTITY_EXPECTED.identity_id ||
    policy.wc_settlement_adapter_id !==
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1
  ) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_SOURCE_IDENTITY_MISMATCH");
  }

  const maxParticipants = uint(
    policy.max_participants,
    "WC_VOID_BOUNDED_CANARY_POLICY_MAX_PARTICIPANTS_INVALID",
    { positive: true },
  );
  const maxWc = uint(
    policy.max_settled_wc_units,
    "WC_VOID_BOUNDED_CANARY_POLICY_MAX_WC_INVALID",
    { positive: true },
  );
  const maxVoid = uint(
    policy.max_delivered_void_atoms,
    "WC_VOID_BOUNDED_CANARY_POLICY_MAX_VOID_INVALID",
    { positive: true },
  );
  const minFinality = uint(
    policy.min_finality_confirmations,
    "WC_VOID_BOUNDED_CANARY_POLICY_FINALITY_INVALID",
    { positive: true },
  );
  const maxAge = uint(
    policy.max_evidence_age_seconds,
    "WC_VOID_BOUNDED_CANARY_POLICY_MAX_AGE_INVALID",
    { positive: true },
  );
  if (maxAge > MAX_EVIDENCE_AGE_SECONDS) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_MAX_AGE_TOO_LARGE");
  }
  if (maxVoid >= OPENING_SALE_TRANCHE_VOID_ATOMS) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_VOID_BOUND_NOT_CANARY");
  }
  if (maxParticipants > 1_000_000n) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_PARTICIPANT_BOUND_TOO_LARGE");
  }

  for (const key of [
    "requires_live_runtime_evidence",
    "requires_inventory_lock",
    "requires_wc_ledger_persistence",
    "requires_quote_reserve_custody",
    "requires_claim_binding_persistence",
    "requires_durable_replay_persistence",
    "requires_participant_control_finality",
  ]) {
    if (policy[key] !== true) {
      fail("WC_VOID_BOUNDED_CANARY_POLICY_REQUIRED_EVIDENCE_DISABLED");
    }
  }
  for (const key of [
    "market_activation_authorized",
    "public_presale_activation_authorized",
    "funds_movement_authorized",
  ]) {
    if (policy[key] !== false) {
      fail("WC_VOID_BOUNDED_CANARY_POLICY_AUTHORITY_MUST_REMAIN_FALSE");
    }
  }

  if (
    typeof policy.policy_id !== "string" ||
    !POLICY_ID.test(policy.policy_id) ||
    policy.policy_id !== wcVoidBoundedCanaryPolicyIdV1(policy)
  ) {
    fail("WC_VOID_BOUNDED_CANARY_POLICY_ID_MISMATCH");
  }

  return Object.freeze({
    ...policy,
    market_vault_address: marketVault,
    max_participants_value: maxParticipants,
    max_settled_wc_units_value: maxWc,
    max_delivered_void_atoms_value: maxVoid,
    min_finality_confirmations_value: minFinality,
    max_evidence_age_seconds_value: maxAge,
  });
}

export function verifyWcVoidBoundedCanaryEvidenceV1(raw) {
  const input = exactObject(
    raw,
    INPUT_KEYS,
    "INVALID_WC_VOID_BOUNDED_CANARY_INPUT_SHAPE",
  );
  const policy = validatePolicy(input.policy);
  if (
    typeof input.expected_policy_id !== "string" ||
    !POLICY_ID.test(input.expected_policy_id) ||
    input.expected_policy_id !== policy.policy_id
  ) {
    fail("WC_VOID_BOUNDED_CANARY_EXPECTED_POLICY_ID_MISMATCH");
  }
  const evaluationMs = canonicalUtc(
    input.evaluation_time_utc,
    "WC_VOID_BOUNDED_CANARY_EVALUATION_TIME_INVALID",
  );

  const evidence = exactObject(
    input.evidence,
    EVIDENCE_KEYS,
    "INVALID_WC_VOID_BOUNDED_CANARY_EVIDENCE_SHAPE",
  );
  if (
    evidence.marker !== VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1 ||
    evidence.version !== 1 ||
    evidence.status !== "BOUNDED_CANARY_EVIDENCE_CANDIDATE" ||
    evidence.policy_id !== policy.policy_id ||
    evidence.chain_id !== 2050 ||
    evidence.execution_epoch !== 2 ||
    evidence.pair !== "WC_VOID" ||
    evidence.coupled_launch_id !== policy.coupled_launch_id
  ) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_IDENTITY_MISMATCH");
  }

  const vault = canonicalAddress(
    evidence.market_vault_address,
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_VAULT_INVALID",
  );
  if (
    vault !== policy.market_vault_address ||
    evidence.market_vault_runtime_code_sha256 !==
      policy.market_vault_runtime_code_sha256 ||
    evidence.market_vault_compiled_identity_id !==
      policy.market_vault_compiled_identity_id ||
    evidence.wc_settlement_adapter_id !==
      policy.wc_settlement_adapter_id
  ) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_DEPLOYMENT_BINDING_MISMATCH");
  }

  const participants = uint(
    evidence.participant_count,
    "WC_VOID_BOUNDED_CANARY_PARTICIPANT_COUNT_INVALID",
    { positive: true },
  );
  const settledWc = uint(
    evidence.settled_wc_units,
    "WC_VOID_BOUNDED_CANARY_SETTLED_WC_INVALID",
    { positive: true },
  );
  const deliveredVoid = uint(
    evidence.delivered_void_atoms,
    "WC_VOID_BOUNDED_CANARY_DELIVERED_VOID_INVALID",
    { positive: true },
  );
  const observedFinality = uint(
    evidence.observed_finality_confirmations,
    "WC_VOID_BOUNDED_CANARY_FINALITY_INVALID",
    { positive: true },
  );

  if (participants > policy.max_participants_value) {
    fail("WC_VOID_BOUNDED_CANARY_PARTICIPANT_BOUND_EXCEEDED");
  }
  if (settledWc > policy.max_settled_wc_units_value) {
    fail("WC_VOID_BOUNDED_CANARY_WC_BOUND_EXCEEDED");
  }
  if (deliveredVoid > policy.max_delivered_void_atoms_value) {
    fail("WC_VOID_BOUNDED_CANARY_VOID_BOUND_EXCEEDED");
  }
  if (observedFinality < policy.min_finality_confirmations_value) {
    fail("WC_VOID_BOUNDED_CANARY_FINALITY_INSUFFICIENT");
  }

  if (
    evidence.inventory_lock_verified !== true ||
    evidence.wc_ledger_persistence_verified !== true ||
    evidence.quote_reserve_custody_verified !== true ||
    evidence.opening_claim_binding_persisted !== true ||
    evidence.durable_replay_state_persistence_verified !== true ||
    evidence.participant_postpurchase_voidtoken_control_verified !== true ||
    evidence.runtime_or_launch_evidence !== true
  ) {
    fail("WC_VOID_BOUNDED_CANARY_REQUIRED_EVIDENCE_DECLARATION_MISSING");
  }

  if (
    typeof evidence.market_vault_runtime_verification_evidence_id !== "string" ||
    !SHA256.test(evidence.market_vault_runtime_verification_evidence_id) ||
    typeof evidence.inventory_lock_evidence_id !== "string" ||
    !SHA256.test(evidence.inventory_lock_evidence_id) ||
    typeof evidence.wc_ledger_custody_evidence_id !== "string" ||
    !SHA256.test(evidence.wc_ledger_custody_evidence_id) ||
    typeof evidence.opening_claim_binding_id !== "string" ||
    !SHA256.test(evidence.opening_claim_binding_id) ||
    typeof evidence.opening_claim_binding_persistence_evidence_id !== "string" ||
    !SHA256.test(evidence.opening_claim_binding_persistence_evidence_id) ||
    typeof evidence.replay_capsule_id !== "string" ||
    !REPLAY_CAPSULE_ID.test(evidence.replay_capsule_id) ||
    typeof evidence.replay_terminal_capsule_sha256 !== "string" ||
    !SHA256_HEX.test(evidence.replay_terminal_capsule_sha256) ||
    typeof evidence.participant_control_evidence_id !== "string" ||
    !SHA256.test(evidence.participant_control_evidence_id)
  ) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_REFERENCE_INVALID");
  }

  for (const key of [
    "market_activation_authorized",
    "public_presale_activation_authorized",
    "funds_movement_authorized",
  ]) {
    if (evidence[key] !== false) {
      fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_AUTHORITY_MUST_REMAIN_FALSE");
    }
  }

  const observedMs = canonicalUtc(
    evidence.observed_at_utc,
    "WC_VOID_BOUNDED_CANARY_OBSERVED_TIME_INVALID",
  );
  const validUntilMs = canonicalUtc(
    evidence.valid_until_utc,
    "WC_VOID_BOUNDED_CANARY_VALID_UNTIL_INVALID",
  );
  if (validUntilMs <= observedMs) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_WINDOW_INVALID");
  }
  const maxAgeMs = policy.max_evidence_age_seconds_value * 1000n;
  if (validUntilMs - observedMs > maxAgeMs) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_WINDOW_TOO_LARGE");
  }
  if (evaluationMs < observedMs || evaluationMs > validUntilMs) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_NOT_CURRENT");
  }

  if (
    typeof evidence.evidence_id !== "string" ||
    !EVIDENCE_ID.test(evidence.evidence_id) ||
    evidence.evidence_id !== wcVoidBoundedCanaryEvidenceIdV1(evidence)
  ) {
    fail("WC_VOID_BOUNDED_CANARY_EVIDENCE_ID_MISMATCH");
  }

  return Object.freeze({
    ok: true,
    status: "EVIDENCE_CANDIDATE_VALID_UPSTREAM_PROOFS_UNVERIFIED",
    marker: VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1,
    evidence_id: evidence.evidence_id,
    policy_id: policy.policy_id,
    coupled_launch_id: evidence.coupled_launch_id,
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    market_vault_address: vault,
    market_vault_runtime_code_sha256:
      evidence.market_vault_runtime_code_sha256,
    market_vault_compiled_identity_id:
      evidence.market_vault_compiled_identity_id,
    wc_settlement_adapter_id:
      evidence.wc_settlement_adapter_id,
    market_vault_runtime_verification_evidence_id:
      evidence.market_vault_runtime_verification_evidence_id,
    inventory_lock_evidence_id:
      evidence.inventory_lock_evidence_id,
    wc_ledger_custody_evidence_id:
      evidence.wc_ledger_custody_evidence_id,
    opening_claim_binding_persistence_evidence_id:
      evidence.opening_claim_binding_persistence_evidence_id,
    participant_count: participants.toString(),
    settled_wc_units: settledWc.toString(),
    delivered_void_atoms: deliveredVoid.toString(),
    observed_finality_confirmations: observedFinality.toString(),
    declared_inventory_lock_verified: true,
    declared_wc_ledger_persistence_verified: true,
    declared_quote_reserve_custody_verified: true,
    declared_opening_claim_binding_persisted: true,
    declared_durable_replay_state_persistence_verified: true,
    declared_participant_postpurchase_voidtoken_control_verified: true,
    declared_runtime_or_launch_evidence: true,
    upstream_evidence_references_present: true,
    upstream_evidence_semantically_verified: false,
    live_canary_evidence_verified: false,
    bounded_canary_evidence_candidate_valid: true,
    bounded_canary_green: false,
    production_candidate_binding_allowed: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_AUTHORITY_V1,
  });
}
