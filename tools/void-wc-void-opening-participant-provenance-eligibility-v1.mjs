import { createHash } from "node:crypto";

import {
  verifyWcVoidOpeningNonproductionExclusionV1,
} from "./void-wc-void-opening-nonproduction-exclusion-v1.mjs";

export const VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1 =
  "VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1";

export const VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1 =
  "void.wc-void-opening-participant-provenance-eligibility.v1";

export const VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_SCHEMA_V1 =
  "void.wc-void-opening-participant-provenance-eligibility-policy.v1";

export const VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    runtime_or_launch_evidence: false,
    sybil_policy_decided: false,
    concentration_policy_decided: false,
    minimum_depth_policy_decided: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const POLICY_PAYLOAD = Object.freeze({
  schema:
    VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_SCHEMA_V1,
  version: 1,
  identity_source: "active_paid_work_credential_wc_account_binding_v1",
  earning_source: "agent_paid_work_wc_earning_adapter_receipt_v1",
  participant_id_derivation: "sha256_canonical_identity_binding_v1",
  active_binding_required: true,
  binding_unexpired_at_admission_required: true,
  production_earning_receipt_required: true,
  earning_receipt_identity_match_required: true,
  price_forming_source_class: "production_earned_wc",
  eligibility_scope: "wc_void_opening_price_formation",
  sybil_policy_decided: false,
  concentration_policy_decided: false,
  minimum_depth_policy_decided: false,
  source_only: true,
  runtime_or_launch_evidence: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const CREDENTIAL_ID = /^voidapwc1_[0-9a-f]{64}$/u;
const BINDING_ID = /^voidapwcb1_[0-9a-f]{64}$/u;
const BINDING_REGISTRY_ID = /^voidapwcbr1_[0-9a-f]{64}$/u;
const EARNING_RECEIPT_ID = /^voidapwear1_[0-9a-f]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,191}$/u;
const MAX_SET_SIZE = 1_000_000;

const RECORD_KEYS = Object.freeze([
  "schema",
  "coupled_launch_id",
  "commitment_id",
  "participant_id",
  "account",
  "wc_units",
  "agent_id",
  "credential_id",
  "binding_id",
  "binding_registry_id",
  "binding_registry_sha256",
  "binding_status",
  "binding_valid_from",
  "binding_valid_until",
  "binding_revoked_at",
  "admission_at",
  "earning_adapter_receipt_id",
  "earning_adapter_receipt_sha256",
  "earning_receipt_agent_id",
  "earning_receipt_credential_id",
  "earning_receipt_binding_id",
  "earning_receipt_account",
  "earning_receipt_canonical_redeemable",
  "eligible",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export const VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1 =
  Object.freeze({
    ...POLICY_PAYLOAD,
    policy_id: digest(POLICY_PAYLOAD),
  });

function snapshotExpectedFields(value, keys, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const snapshot = Object.create(null);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
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
    fail(code);
  }
}

function snapshotArray(value, code) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw null;
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 1 ||
      lengthDescriptor.value > MAX_SET_SIZE
    ) {
      throw null;
    }
    const out = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out.push(descriptor.value);
    }
    return out;
  } catch {
    fail(code);
  }
}

function requireText(value, pattern, code) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code);
  return value;
}

function canonicalUtc(value, code) {
  if (typeof value !== "string") fail(code);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    fail(code);
  }
  return parsed.getTime();
}

export function wcVoidOpeningParticipantIdV1({
  agent_id,
  credential_id,
  binding_id,
  destination_wc_account,
}) {
  requireText(agent_id, IDENTIFIER, "INVALID_OPENING_AGENT_ID");
  requireText(credential_id, CREDENTIAL_ID, "INVALID_OPENING_CREDENTIAL_ID");
  requireText(binding_id, BINDING_ID, "INVALID_OPENING_BINDING_ID");
  requireText(
    destination_wc_account,
    IDENTIFIER,
    "INVALID_OPENING_DESTINATION_WC_ACCOUNT",
  );
  return digest({
    schema: "void.wc-void-opening-participant-identity.v1",
    agent_id,
    credential_id,
    binding_id,
    destination_wc_account,
  });
}

export function verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
  coupledLaunchId,
  commitments,
  productionWcProvenanceRecords,
  eligibilityRecords,
) {
  const production = verifyWcVoidOpeningNonproductionExclusionV1(
    coupledLaunchId,
    commitments,
    productionWcProvenanceRecords,
  );

  const records = snapshotArray(
    eligibilityRecords,
    "INVALID_WC_VOID_OPENING_ELIGIBILITY_SET",
  );
  if (records.length !== production.commitment_count) {
    fail("WC_VOID_OPENING_ELIGIBILITY_COUNT_MISMATCH");
  }

  const productionByCommitment = new Map(
    production.records.map((value) => [value.commitment_id, value]),
  );
  const seen = new Set();

  const canonical = records.map((raw) => {
    const value = snapshotExpectedFields(
      raw,
      RECORD_KEYS,
      "INVALID_WC_VOID_OPENING_ELIGIBILITY_RECORD",
    );
    if (
      value.schema !==
      VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1
    ) {
      fail("INVALID_WC_VOID_OPENING_ELIGIBILITY_SCHEMA");
    }
    if (value.coupled_launch_id !== coupledLaunchId) {
      fail("WC_VOID_OPENING_ELIGIBILITY_LAUNCH_MISMATCH");
    }
    requireText(value.commitment_id, SHA256, "INVALID_OPENING_COMMITMENT_ID");
    requireText(value.participant_id, SHA256, "INVALID_OPENING_PARTICIPANT_ID");
    requireText(value.account, IDENTIFIER, "INVALID_OPENING_WC_ACCOUNT");
    requireText(value.agent_id, IDENTIFIER, "INVALID_OPENING_AGENT_ID");
    requireText(value.credential_id, CREDENTIAL_ID, "INVALID_OPENING_CREDENTIAL_ID");
    requireText(value.binding_id, BINDING_ID, "INVALID_OPENING_BINDING_ID");
    requireText(
      value.binding_registry_id,
      BINDING_REGISTRY_ID,
      "INVALID_OPENING_BINDING_REGISTRY_ID",
    );
    requireText(
      value.binding_registry_sha256,
      HEX64,
      "INVALID_OPENING_BINDING_REGISTRY_SHA256",
    );
    requireText(
      value.earning_adapter_receipt_id,
      EARNING_RECEIPT_ID,
      "INVALID_OPENING_EARNING_RECEIPT_ID",
    );
    requireText(
      value.earning_adapter_receipt_sha256,
      HEX64,
      "INVALID_OPENING_EARNING_RECEIPT_SHA256",
    );

    const source = productionByCommitment.get(value.commitment_id);
    if (!source) fail("UNKNOWN_WC_VOID_OPENING_ELIGIBILITY_COMMITMENT");
    if (
      source.participant_id !== value.participant_id ||
      source.account !== value.account ||
      source.wc_units !== value.wc_units
    ) {
      fail("WC_VOID_OPENING_ELIGIBILITY_COMMITMENT_MISMATCH");
    }
    if (source.earning_receipt_id !== value.earning_adapter_receipt_id) {
      fail("WC_VOID_OPENING_ELIGIBILITY_EARNING_RECEIPT_MISMATCH");
    }
    if (source.source_class !== "production_earned_wc") {
      fail("WC_VOID_OPENING_ELIGIBILITY_NONPRODUCTION_SOURCE");
    }

    const derivedParticipantId = wcVoidOpeningParticipantIdV1({
      agent_id: value.agent_id,
      credential_id: value.credential_id,
      binding_id: value.binding_id,
      destination_wc_account: value.account,
    });
    if (value.participant_id !== derivedParticipantId) {
      fail("WC_VOID_OPENING_PARTICIPANT_IDENTITY_MISMATCH");
    }

    if (value.binding_status !== "active" || value.binding_revoked_at !== null) {
      fail("WC_VOID_OPENING_BINDING_NOT_ACTIVE");
    }
    const validFrom = canonicalUtc(
      value.binding_valid_from,
      "INVALID_OPENING_BINDING_VALID_FROM",
    );
    const validUntil = canonicalUtc(
      value.binding_valid_until,
      "INVALID_OPENING_BINDING_VALID_UNTIL",
    );
    const admittedAt = canonicalUtc(
      value.admission_at,
      "INVALID_OPENING_ADMISSION_AT",
    );
    if (!(validFrom <= admittedAt && admittedAt < validUntil)) {
      fail("WC_VOID_OPENING_BINDING_OUTSIDE_VALIDITY");
    }

    if (
      value.earning_receipt_agent_id !== value.agent_id ||
      value.earning_receipt_credential_id !== value.credential_id ||
      value.earning_receipt_binding_id !== value.binding_id ||
      value.earning_receipt_account !== value.account ||
      value.earning_receipt_canonical_redeemable !== true
    ) {
      fail("WC_VOID_OPENING_EARNING_RECEIPT_IDENTITY_MISMATCH");
    }
    if (value.eligible !== true) {
      fail("WC_VOID_OPENING_PARTICIPANT_NOT_ELIGIBLE");
    }
    if (seen.has(value.commitment_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_ELIGIBILITY_COMMITMENT");
    }
    seen.add(value.commitment_id);

    return Object.freeze({
      commitment_id: value.commitment_id,
      participant_id: value.participant_id,
      account: value.account,
      wc_units: value.wc_units,
      agent_id: value.agent_id,
      credential_id: value.credential_id,
      binding_id: value.binding_id,
      binding_registry_id: value.binding_registry_id,
      binding_registry_sha256: value.binding_registry_sha256,
      admission_at: value.admission_at,
      earning_adapter_receipt_id: value.earning_adapter_receipt_id,
      earning_adapter_receipt_sha256: value.earning_adapter_receipt_sha256,
      eligible: true,
    });
  });

  if (seen.size !== production.commitment_count) {
    fail("MISSING_WC_VOID_OPENING_ELIGIBILITY_RECORD");
  }

  canonical.sort((left, right) =>
    compareText(left.commitment_id, right.commitment_id)
  );

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1,
    policy_id:
      VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
        .policy_id,
    coupled_launch_id: coupledLaunchId,
    commitment_count: production.commitment_count,
    eligible_participant_count: canonical.length,
    production_wc_exclusion_verified: true,
    active_credential_wc_account_binding_required: true,
    production_earning_receipt_required: true,
    earning_receipt_identity_match_verified: true,
    exact_commitment_eligibility_bijection: true,
    participant_provenance_and_eligibility_verified: true,
    sybil_policy_ready: false,
    concentration_policy_ready: false,
    minimum_depth_policy_ready: false,
    runtime_or_launch_evidence: false,
    wc_ledger_write_performed: false,
    records: Object.freeze(canonical),
    authority:
      VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_AUTHORITY_V1,
  });
}
