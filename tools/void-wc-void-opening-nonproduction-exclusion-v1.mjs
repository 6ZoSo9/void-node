import { createHash } from "node:crypto";

import {
  verifyWcVoidOpeningCommitmentsV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

export const VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1 =
  "VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1";

export const VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_SCHEMA_V1 =
  "void.wc-void-opening-nonproduction-exclusion-policy.v1";

export const VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1 =
  "void.wc-void-opening-wc-provenance.v1";

export const VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    runtime_or_launch_evidence: false,
    participant_eligibility_decided: false,
    concentration_policy_decided: false,
    minimum_depth_policy_decided: false,
    ledger_write: false,
    wc_issuance: false,
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
  schema: VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_SCHEMA_V1,
  version: 1,
  allowed_price_forming_source_class: "production_earned_wc",
  excluded_source_classes: Object.freeze([
    "canary_wc",
    "development_wc",
    "operator_generated_wc",
    "synthetic_fixture_wc",
    "test_wc",
    "unknown_wc",
  ]),
  production_earning_receipt_id_required: true,
  exact_commitment_provenance_bijection_required: true,
  participant_eligibility_decided: false,
  concentration_policy_decided: false,
  minimum_depth_policy_decided: false,
  source_only: true,
  runtime_or_launch_evidence: false,
});

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const MAX_SET_SIZE = 1_000_000;
const PROVENANCE_KEYS = Object.freeze([
  "schema",
  "coupled_launch_id",
  "commitment_id",
  "participant_id",
  "account",
  "wc_units",
  "source_class",
  "earning_receipt_id",
  "price_formation_included",
]);

const SOURCE_CLASSES = new Set([
  POLICY_PAYLOAD.allowed_price_forming_source_class,
  ...POLICY_PAYLOAD.excluded_source_classes,
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
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
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

export const VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1 =
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
    const lengthDescriptor =
      Object.getOwnPropertyDescriptor(value, "length");
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
      const descriptor =
        Object.getOwnPropertyDescriptor(value, String(index));
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

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

export function verifyWcVoidOpeningNonproductionExclusionV1(
  coupledLaunchId,
  commitments,
  provenanceRecords,
) {
  canonicalSha(coupledLaunchId, "INVALID_COUPLED_LAUNCH_ID");
  const commitmentSet =
    verifyWcVoidOpeningCommitmentsV1(coupledLaunchId, commitments);
  const records = snapshotArray(
    provenanceRecords,
    "INVALID_WC_VOID_OPENING_PROVENANCE_SET",
  );
  if (records.length !== commitmentSet.commitment_count) {
    fail("WC_VOID_OPENING_PROVENANCE_COUNT_MISMATCH");
  }

  const commitmentsById = new Map(
    commitmentSet.commitments.map((value) => [value.commitment_id, value]),
  );
  const seenCommitments = new Set();
  const canonical = records.map((raw) => {
    const value = snapshotExpectedFields(
      raw,
      PROVENANCE_KEYS,
      "INVALID_WC_VOID_OPENING_PROVENANCE_RECORD",
    );
    if (value.schema !== VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1) {
      fail("INVALID_WC_VOID_OPENING_PROVENANCE_SCHEMA");
    }
    if (value.coupled_launch_id !== coupledLaunchId) {
      fail("WC_VOID_OPENING_PROVENANCE_LAUNCH_MISMATCH");
    }
    canonicalSha(
      value.commitment_id,
      "INVALID_WC_VOID_OPENING_PROVENANCE_COMMITMENT_ID",
    );
    canonicalSha(
      value.participant_id,
      "INVALID_WC_VOID_OPENING_PROVENANCE_PARTICIPANT_ID",
    );
    if (!SOURCE_CLASSES.has(value.source_class)) {
      fail("INVALID_WC_VOID_OPENING_WC_SOURCE_CLASS");
    }

    const commitment = commitmentsById.get(value.commitment_id);
    if (!commitment) fail("UNKNOWN_WC_VOID_OPENING_PROVENANCE_COMMITMENT");
    if (
      value.participant_id !== commitment.participant_id ||
      value.account !== commitment.account ||
      value.wc_units !== commitment.wc_units
    ) {
      fail("WC_VOID_OPENING_PROVENANCE_COMMITMENT_MISMATCH");
    }
    if (seenCommitments.has(value.commitment_id)) {
      fail("DUPLICATE_WC_VOID_OPENING_PROVENANCE_COMMITMENT");
    }
    seenCommitments.add(value.commitment_id);

    if (
      value.source_class ===
      VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
        .allowed_price_forming_source_class
    ) {
      canonicalSha(
        value.earning_receipt_id,
        "INVALID_WC_VOID_OPENING_PRODUCTION_EARNING_RECEIPT_ID",
      );
      if (value.price_formation_included !== true) {
        fail("PRODUCTION_WC_PRICE_FORMATION_EXCLUSION_MISMATCH");
      }
    } else {
      if (
        value.earning_receipt_id !== null ||
        value.price_formation_included !== false
      ) {
        fail("NONPRODUCTION_WC_PROVENANCE_CLASSIFICATION_MISMATCH");
      }
      fail("NONPRODUCTION_WC_IN_PRICE_FORMING_COHORT");
    }

    return Object.freeze({
      commitment_id: commitment.commitment_id,
      participant_id: commitment.participant_id,
      account: commitment.account,
      wc_units: commitment.wc_units,
      source_class: value.source_class,
      earning_receipt_id: value.earning_receipt_id,
      price_formation_included: true,
    });
  });

  if (seenCommitments.size !== commitmentsById.size) {
    fail("MISSING_WC_VOID_OPENING_PROVENANCE");
  }

  canonical.sort((left, right) =>
    compareText(left.commitment_id, right.commitment_id)
  );

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1,
    policy_id:
      VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1.policy_id,
    coupled_launch_id: coupledLaunchId,
    commitment_count: commitmentSet.commitment_count,
    provenance_count: canonical.length,
    production_price_forming_commitment_count: canonical.length,
    excluded_commitment_count: 0,
    exact_commitment_provenance_bijection: true,
    production_earning_receipt_ids_required: true,
    nonproduction_wc_exclusion_verified: true,
    participant_source_provenance_bound: true,
    participant_provenance_and_eligibility_verified: false,
    concentration_policy_ready: false,
    minimum_depth_policy_ready: false,
    runtime_or_launch_evidence: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    records: Object.freeze(canonical),
    authority:
      VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_AUTHORITY_V1,
  });
}
