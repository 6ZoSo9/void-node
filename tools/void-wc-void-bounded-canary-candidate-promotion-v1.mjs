#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
} from "./void-wc-void-bounded-canary-semantic-promotion-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1";

export const VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_only_promotion: true,
    exact_semantic_promotion_bytes_required: true,
    exact_candidate_bytes_required: true,
    semantic_canary_fresh_at_reviewed_evaluation_required: true,
    canonical_classifier_reexecution: true,
    exact_two_gate_candidate_delta: true,
    canonical_candidate_file_update: false,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    token_movement: false,
    inventory_funding: false,
    liquidity_movement: false,
    coupled_activation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const CURRENT_LAUNCH =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SEMANTIC_PROMOTION_ID = /^voidwcbcsp1_[0-9a-f]{64}$/u;
const CANDIDATE_PROMOTION_ID = /^voidwcbccp1_[0-9a-f]{64}$/u;
const POLICY_ID = /^voidwcbcp1_[0-9a-f]{64}$/u;
const CANARY_EVIDENCE_ID = /^voidwcbce1_[0-9a-f]{64}$/u;
const REPLAY_ID = /^voidwcrp1_[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;

const INPUT_KEYS = Object.freeze([
  "semantic_promotion_bytes",
  "semantic_promotion_file_sha256",
  "production_candidate_bytes",
  "production_candidate_file_sha256",
  "coupled_candidate_bytes",
  "coupled_candidate_file_sha256",
  "successor_candidate_bytes",
  "successor_candidate_file_sha256",
]);

const SEMANTIC_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "pair",
  "coupled_launch_id",
  "reviewed_policy_id",
  "canary_evidence_id",
  "evaluation_time_utc",
  "observed_at_utc",
  "valid_until_utc",
  "participant_count",
  "settled_wc_units",
  "delivered_void_atoms",
  "observed_finality_confirmations",
  "market_vault_address",
  "market_vault_runtime_code_sha256",
  "market_vault_runtime_verification_evidence_id",
  "inventory_lock_evidence_id",
  "wc_ledger_custody_evidence_id",
  "opening_claim_binding_id",
  "opening_claim_binding_persistence_evidence_id",
  "replay_capsule_id",
  "replay_terminal_capsule_sha256",
  "participant_control_evidence_id",
  "bounded_canary_input_file_sha256",
  "market_vault_at_use_file_sha256",
  "ledger_persistence_import_input_file_sha256",
  "opening_request_file_sha256",
  "opening_claim_binding_file_sha256",
  "opening_claim_persistence_receipt_file_sha256",
  "opening_replay_capsule_file_sha256",
  "opening_replay_inspection_receipt_file_sha256",
  "participant_at_use_file_sha256",
  "durable_claim_binding_verified",
  "durable_replay_terminal_verified",
  "upstream_evidence_semantically_verified",
  "live_canary_evidence_verified",
  "bounded_canary_green",
  "production_candidate_binding_allowed",
  "production_candidate_updated",
  "coupled_candidate_updated",
  "candidate_promotion_required",
  "coupled_activation_ready",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "semantic_evidence_id",
  "promotion_id",
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
  const sorted = [...actual].sort();
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
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  fail("BOUNDED_CANARY_CANDIDATE_PROMOTION_CANONICAL_VALUE_INVALID");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseJsonBytes(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_INPUT_BYTES) {
    fail(label + "_BYTES_INVALID");
  }
  if (typeof expectedSha !== "string" || !HEX64.test(expectedSha)) {
    fail(label + "_SHA256_INVALID");
  }
  if (sha256(bytes) !== expectedSha) fail(label + "_SHA256_MISMATCH");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(label + "_UTF8_INVALID");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_JSON_NOT_OBJECT");
  return Object.freeze({
    bytes: Buffer.from(bytes),
    sha256: expectedSha,
    value,
  });
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

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function withoutSemanticIds(value) {
  const body = Object.create(null);
  for (const key of SEMANTIC_KEYS) {
    if (key === "semantic_evidence_id" || key === "promotion_id") continue;
    body[key] = value[key];
  }
  return body;
}

function validateSemanticPromotion(raw) {
  const value = exactObject(
    raw,
    SEMANTIC_KEYS,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_RECEIPT_SHAPE_INVALID",
  );
  if (
    value.marker !== VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1 ||
    value.version !== 1 ||
    value.status !== "BOUNDED_CANARY_SEMANTICALLY_VERIFIED_PROMOTION_READY" ||
    value.chain_id !== 2050 ||
    value.execution_epoch !== 2 ||
    value.pair !== "WC_VOID" ||
    value.coupled_launch_id !== CURRENT_LAUNCH ||
    value.participant_count !== "1" ||
    typeof value.reviewed_policy_id !== "string" ||
    !POLICY_ID.test(value.reviewed_policy_id) ||
    typeof value.canary_evidence_id !== "string" ||
    !CANARY_EVIDENCE_ID.test(value.canary_evidence_id) ||
    value.durable_claim_binding_verified !== true ||
    value.durable_replay_terminal_verified !== true ||
    value.upstream_evidence_semantically_verified !== true ||
    value.live_canary_evidence_verified !== true ||
    value.bounded_canary_green !== true ||
    value.production_candidate_binding_allowed !== true ||
    value.production_candidate_updated !== false ||
    value.coupled_candidate_updated !== false ||
    value.candidate_promotion_required !== true ||
    value.coupled_activation_ready !== false ||
    value.market_activation_authorized !== false ||
    value.public_presale_activation_authorized !== false ||
    value.funds_movement_authorized !== false
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_RECEIPT_INVALID");
  }

  for (const [name, amount] of [
    ["settled_wc_units", value.settled_wc_units],
    ["delivered_void_atoms", value.delivered_void_atoms],
    ["observed_finality_confirmations", value.observed_finality_confirmations],
  ]) {
    if (
      typeof amount !== "string" ||
      !UINT.test(amount) ||
      BigInt(amount) <= 0n
    ) {
      fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_AMOUNT_INVALID:" + name);
    }
  }
  if (
    typeof value.market_vault_address !== "string" ||
    !ADDRESS.test(value.market_vault_address) ||
    value.market_vault_address === "0x0000000000000000000000000000000000000000" ||
    typeof value.market_vault_runtime_code_sha256 !== "string" ||
    !HEX64.test(value.market_vault_runtime_code_sha256) ||
    typeof value.replay_capsule_id !== "string" ||
    !REPLAY_ID.test(value.replay_capsule_id) ||
    typeof value.replay_terminal_capsule_sha256 !== "string" ||
    !HEX64.test(value.replay_terminal_capsule_sha256)
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_EVIDENCE_IDENTITY_INVALID");
  }
  for (const [name, id] of [
    ["market_vault_runtime_verification_evidence_id", value.market_vault_runtime_verification_evidence_id],
    ["inventory_lock_evidence_id", value.inventory_lock_evidence_id],
    ["wc_ledger_custody_evidence_id", value.wc_ledger_custody_evidence_id],
    ["opening_claim_binding_id", value.opening_claim_binding_id],
    ["opening_claim_binding_persistence_evidence_id", value.opening_claim_binding_persistence_evidence_id],
    ["participant_control_evidence_id", value.participant_control_evidence_id],
  ]) {
    if (typeof id !== "string" || !SHA256_ID.test(id)) {
      fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_EVIDENCE_REFERENCE_INVALID:" + name);
    }
  }
  for (const [name, digest] of [
    ["bounded_canary_input_file_sha256", value.bounded_canary_input_file_sha256],
    ["market_vault_at_use_file_sha256", value.market_vault_at_use_file_sha256],
    ["ledger_persistence_import_input_file_sha256", value.ledger_persistence_import_input_file_sha256],
    ["opening_request_file_sha256", value.opening_request_file_sha256],
    ["opening_claim_binding_file_sha256", value.opening_claim_binding_file_sha256],
    ["opening_claim_persistence_receipt_file_sha256", value.opening_claim_persistence_receipt_file_sha256],
    ["opening_replay_capsule_file_sha256", value.opening_replay_capsule_file_sha256],
    ["opening_replay_inspection_receipt_file_sha256", value.opening_replay_inspection_receipt_file_sha256],
    ["participant_at_use_file_sha256", value.participant_at_use_file_sha256],
  ]) {
    if (typeof digest !== "string" || !HEX64.test(digest)) {
      fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_FILE_DIGEST_INVALID:" + name);
    }
  }

  const authority = exactObject(
    value.authority,
    Object.keys(VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1),
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_SHAPE_INVALID",
  );
  if (
    canonicalJson(authority) !==
      canonicalJson(VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1)
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_MISMATCH");
  }

  const digest = sha256(
    Buffer.from(canonicalJson(withoutSemanticIds(value)), "utf8"),
  );
  if (
    typeof value.semantic_evidence_id !== "string" ||
    !SHA256_ID.test(value.semantic_evidence_id) ||
    value.semantic_evidence_id !== "sha256:" + digest ||
    typeof value.promotion_id !== "string" ||
    !SEMANTIC_PROMOTION_ID.test(value.promotion_id) ||
    value.promotion_id !== "voidwcbcsp1_" + digest
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_CONTENT_ID_MISMATCH");
  }

  const observed = canonicalUtc(
    value.observed_at_utc,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_OBSERVED_TIME_INVALID",
  );
  const semanticEvaluation = canonicalUtc(
    value.evaluation_time_utc,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_EVALUATION_TIME_INVALID",
  );
  const validUntil = canonicalUtc(
    value.valid_until_utc,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_VALID_UNTIL_INVALID",
  );
  if (
    observed > semanticEvaluation ||
    semanticEvaluation > validUntil
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_TIME_WINDOW_INVALID");
  }

  return value;
}

function summarize(decision) {
  return Object.freeze({
    ok: decision?.ok === true,
    status: typeof decision?.status === "string" ? decision.status : "UNKNOWN",
    reason: typeof decision?.reason === "string" ? decision.reason : null,
    missing_gates: Object.freeze(
      Array.isArray(decision?.missing_gates) ? [...decision.missing_gates] : [],
    ),
  });
}

function minusOne(values, removed) {
  return values.filter((value) => value !== removed);
}

function sameStrings(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function promoteWcVoidBoundedCanaryCandidatesV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_INPUT_SHAPE",
  );
  const semanticSource = parseJsonBytes(
    request.semantic_promotion_bytes,
    request.semantic_promotion_file_sha256,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_FILE",
  );
  const productionSource = parseJsonBytes(
    request.production_candidate_bytes,
    request.production_candidate_file_sha256,
    "BOUNDED_CANARY_PRODUCTION_CANDIDATE_FILE",
  );
  const coupledSource = parseJsonBytes(
    request.coupled_candidate_bytes,
    request.coupled_candidate_file_sha256,
    "BOUNDED_CANARY_COUPLED_CANDIDATE_FILE",
  );
  const successorSource = parseJsonBytes(
    request.successor_candidate_bytes,
    request.successor_candidate_file_sha256,
    "BOUNDED_CANARY_SUCCESSOR_CANDIDATE_FILE",
  );

  const semantic = validateSemanticPromotion(semanticSource.value);
  const production = productionSource.value;
  const coupled = coupledSource.value;
  const successor = successorSource.value;

  if (
    production?.status !== "hold" ||
    production?.chain_id !== 2050 ||
    production?.pair !== "WC_VOID" ||
    production?.bounded_canary_green !== false ||
    production?.coupled_activation_ready !== false
  ) {
    fail("BOUNDED_CANARY_PRODUCTION_CANDIDATE_PRESTATE_INVALID");
  }
  if (
    coupled?.status !== "HOLD" ||
    coupled?.chain_id !== 2050 ||
    coupled?.execution_epoch !== 2 ||
    coupled?.gates?.bounded_canary_green !== false ||
    coupled?.gates?.coupled_activation_ready !== false ||
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id !==
      semantic.coupled_launch_id
  ) {
    fail("BOUNDED_CANARY_COUPLED_CANDIDATE_PRESTATE_INVALID");
  }

  const productionBefore = classifyVoidWcVoidProductionReadinessV1(production);
  const coupledBefore = classifyVoidCoupledEconomicSuccessorGateV1(
    coupled,
    successor,
  );
  if (
    productionBefore?.ok !== false ||
    productionBefore.status !== "HOLD" ||
    productionBefore.reason !== "production_gates_incomplete" ||
    !Array.isArray(productionBefore.missing_gates) ||
    !productionBefore.missing_gates.includes("bounded_canary_required") ||
    !productionBefore.missing_gates.includes("coupled_activation_ready_required")
  ) {
    fail("BOUNDED_CANARY_PRODUCTION_CLASSIFIER_PRESTATE_INVALID");
  }
  if (
    coupledBefore?.ok !== false ||
    coupledBefore.status !== "HOLD" ||
    coupledBefore.reason !== "coupled_economic_gates_incomplete" ||
    !Array.isArray(coupledBefore.missing_gates) ||
    !coupledBefore.missing_gates.includes("bounded_canary_required") ||
    !coupledBefore.missing_gates.includes("coupled_activation_ready_required")
  ) {
    fail("BOUNDED_CANARY_COUPLED_CLASSIFIER_PRESTATE_INVALID");
  }

  const promotedProduction = structuredClone(production);
  promotedProduction.bounded_canary_green = true;
  const promotedCoupled = structuredClone(coupled);
  promotedCoupled.gates = structuredClone(coupled.gates);
  promotedCoupled.gates.bounded_canary_green = true;

  const resetProduction = structuredClone(promotedProduction);
  resetProduction.bounded_canary_green = false;
  const resetCoupled = structuredClone(promotedCoupled);
  resetCoupled.gates = structuredClone(promotedCoupled.gates);
  resetCoupled.gates.bounded_canary_green = false;
  if (canonicalJson(resetProduction) !== canonicalJson(production)) {
    fail("BOUNDED_CANARY_PRODUCTION_CANDIDATE_CHANGE_SCOPE_INVALID");
  }
  if (canonicalJson(resetCoupled) !== canonicalJson(coupled)) {
    fail("BOUNDED_CANARY_COUPLED_CANDIDATE_CHANGE_SCOPE_INVALID");
  }

  const productionAfter =
    classifyVoidWcVoidProductionReadinessV1(promotedProduction);
  const coupledAfter =
    classifyVoidCoupledEconomicSuccessorGateV1(promotedCoupled, successor);
  const expectedProductionMissing = minusOne(
    productionBefore.missing_gates,
    "bounded_canary_required",
  );
  const expectedCoupledMissing = minusOne(
    coupledBefore.missing_gates,
    "bounded_canary_required",
  );
  if (
    productionAfter?.ok !== false ||
    productionAfter.status !== "HOLD" ||
    productionAfter.reason !== "production_gates_incomplete" ||
    !sameStrings(productionAfter.missing_gates, expectedProductionMissing)
  ) {
    fail("BOUNDED_CANARY_PRODUCTION_CLASSIFIER_POSTSTATE_INVALID");
  }
  if (
    coupledAfter?.ok !== false ||
    coupledAfter.status !== "HOLD" ||
    coupledAfter.reason !== "coupled_economic_gates_incomplete" ||
    !sameStrings(coupledAfter.missing_gates, expectedCoupledMissing)
  ) {
    fail("BOUNDED_CANARY_COUPLED_CLASSIFIER_POSTSTATE_INVALID");
  }

  if (
    promotedProduction.status !== "hold" ||
    promotedProduction.coupled_activation_ready !== false ||
    promotedCoupled.status !== "HOLD" ||
    promotedCoupled.gates.coupled_activation_ready !== false ||
    Object.values(promotedProduction.authority || {}).some((value) => value !== false) ||
    Object.values(promotedCoupled.authority || {}).some((value) => value !== false)
  ) {
    fail("BOUNDED_CANARY_CANDIDATE_AUTHORITY_BOUNDARY_INVALID");
  }

  const frozenProduction = deepFreeze(promotedProduction);
  const frozenCoupled = deepFreeze(promotedCoupled);
  const material = Object.freeze({
    marker: VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
    version: 1,
    status: "BOUNDED_CANARY_CANDIDATE_PROMOTION_READY_FINAL_ACTIVATION_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: semantic.coupled_launch_id,
    semantic_evaluation_time_utc: semantic.evaluation_time_utc,
    semantic_valid_until_utc: semantic.valid_until_utc,
    semantic_promotion_id: semantic.promotion_id,
    semantic_evidence_id: semantic.semantic_evidence_id,
    reviewed_policy_id: semantic.reviewed_policy_id,
    canary_evidence_id: semantic.canary_evidence_id,
    semantic_promotion_file_sha256: semanticSource.sha256,
    production_candidate_file_sha256: productionSource.sha256,
    coupled_candidate_file_sha256: coupledSource.sha256,
    successor_candidate_file_sha256: successorSource.sha256,
    promoted_production_fields: Object.freeze(["bounded_canary_green"]),
    promoted_coupled_gates: Object.freeze(["bounded_canary_green"]),
    promoted_production_candidate_sha256:
      sha256(Buffer.from(canonicalJson(frozenProduction), "utf8")),
    promoted_coupled_candidate_sha256:
      sha256(Buffer.from(canonicalJson(frozenCoupled), "utf8")),
    promoted_production_candidate: frozenProduction,
    promoted_coupled_candidate: frozenCoupled,
    production_before: summarize(productionBefore),
    production_after: summarize(productionAfter),
    coupled_before: summarize(coupledBefore),
    coupled_after: summarize(coupledAfter),
    semantic_canary_fresh_at_reviewed_evaluation: true,
    application_time_authority: false,
    bounded_canary_green: true,
    production_status_remains_hold: true,
    coupled_status_remains_hold: true,
    coupled_activation_ready: false,
    canonical_production_candidate_updated: false,
    canonical_coupled_candidate_updated: false,
    candidate_promotion_application_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
  });
  const digest = sha256(Buffer.from(canonicalJson(material), "utf8"));
  return Object.freeze({
    ...material,
    promotion_id: "voidwcbccp1_" + digest,
  });
}
