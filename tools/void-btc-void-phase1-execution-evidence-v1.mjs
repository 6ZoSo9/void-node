#!/usr/bin/env node

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1 =
  "VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1";

export const VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_PREVIEW_V1 =
  "VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_PREVIEW_V1";

export const VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    structural_preview_only: true,
    source_evidence_structural_validation_only: true,
    execution_evidence_verified: false,
    authoritative_execution_admission: false,
    bitcoin_regtest_execution_performed: false,
    chain2050_isolated_execution_performed: false,
    bitcoin_mainnet_contact: false,
    production_chain2050_contact: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    production_inventory_reservation: false,
    production_liquidity_movement: false,
    treasury_action: false,
    market_activation: false,
    public_presale_activation: false,
    production_funds_movement: false,
  });

const INPUT_SCHEMA =
  "void.btc_void.phase1_execution_evidence_suite_request.v1";
const OUTPUT_SCHEMA =
  "void.btc_void.phase1_execution_evidence_preview.v1";
const ATOMIC_MARKER =
  "VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1";
const FEE_MARKER = "VOID_BTC_VOID_TRADE_FUNDED_FEES_V1";
const BITCOIN_OBSERVATION_MARKER =
  "VOID_BITCOIN_REGTEST_EXECUTION_OBSERVATION_V1";
const CHAIN2050_OBSERVATION_MARKER =
  "VOID_CHAIN2050_ISOLATED_EXECUTION_OBSERVATION_V1";

const BITCOIN_REGTEST_GENESIS =
  "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206";
const CHAIN2050_EPOCH2_GENESIS_BLOCK_HASH =
  "8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const CHAIN2050_EPOCH2_GENESIS_STATE_ROOT =
  "7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";

const REVIEWED_SOURCE = Object.freeze({
  atomic_settlement_tool_git_blob_sha1:
    "4fdc9c632b73a50dded72fd5493286667ca197c0",
  trade_funded_fees_tool_git_blob_sha1:
    "5aff99a441d4a0ffd441b6dd508aaa7988e4eb16",
  quote_math_tool_git_blob_sha1:
    "02be3da1718209db1603094c9654c7dc9d697c51",
  epoch2_successor_evidence_git_blob_sha1:
    "458528c7d1c3fe1db27643ee406e493606443c2f",
  client_neutral_state_manifest_git_blob_sha1:
    "fabe44a43ff188902779b36e6a84de9ba110de87",
});

const REVIEWED_ATOMIC_DEPENDENCIES = Object.freeze({
  "tools/void-btc-void-quote-math-v1.mjs":
    "02be3da1718209db1603094c9654c7dc9d697c51",
  "tools/void-btc-void-market-maker-reserve-policy-v1.mjs":
    "937e1b38cab34b36297f4320cc253a8e48f5a7e1",
  "tools/void-btc-void-buyback-lot-journal-transition-v1.mjs":
    "63d347948f3dd0bded2f2f79fadafec8f0cf7838",
  "tools/void-btc-void-bounded-stdin-v1.mjs":
    "2026b9be59216b0c52cf4d978b7fc91b7f7592e1",
  "tools/void-shared-market-post-discovery-state-v2.mjs":
    "bcfff9c2981e713a7053ff51a39145eb06b7238b",
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json":
    "d78bc88dd26c47921a54c081a79ceefc0d5abcee",
});

const REQUIRED_CASES = Object.freeze([
  "btc_to_void_success",
  "void_to_btc_success",
  "btc_refund",
  "chain2050_refund",
  "wrong_preimage_rejected",
  "wrong_amount_rejected",
  "wrong_script_rejected",
  "premature_claim_rejected",
  "timeout_refund",
  "replay_rejected",
  "restart_recovery",
  "reorg_reconciliation",
]);

const REJECTED_CASES = new Set([
  "wrong_preimage_rejected",
  "wrong_amount_rejected",
  "wrong_script_rejected",
  "premature_claim_rejected",
  "replay_rejected",
]);

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const HASH32 = /^0x[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const MAX_STDIN_BYTES = 8 * 1024 * 1024;

function fail(code) {
  throw new Error(code);
}

function plain(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  return value;
}

function exact(value, keys, code) {
  plain(value, code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key]);
  }
  return Object.freeze(value);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("phase1_canonical_integer_required");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("phase1_canonical_value_unsupported");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contentId(prefix, value) {
  return prefix + sha256Hex(Buffer.from(canonicalJson(value), "utf8"));
}

function evaluationId(value) {
  const copy = structuredClone(value);
  delete copy.evaluation_id;
  return "sha256:" + sha256Hex(Buffer.from(canonicalJson(copy), "utf8"));
}

function feeQuoteId(value) {
  const copy = structuredClone(value);
  delete copy.trade_funded_fee_quote_id;
  return "voidbtcvfq1_" + sha256Hex(Buffer.from(canonicalJson(copy), "utf8"));
}

function requireHex64(value, code) {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code);
  return value;
}

function requireHash32(value, code) {
  if (typeof value !== "string" || !HASH32.test(value)) fail(code);
  return value;
}

function requireSha256Id(value, code) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(code);
  return value;
}

function requireTxArray(value, code) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) fail(code);
  const out = value.map((entry) => requireHex64(entry, code));
  if (new Set(out).size !== out.length) fail(code);
  return Object.freeze(out);
}

function requireBlockArray(value, code) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) fail(code);
  const out = value.map((entry) => requireHex64(entry, code));
  if (new Set(out).size !== out.length) fail(code);
  return Object.freeze(out);
}

function validateSourceContracts(value) {
  exact(
    value,
    Object.keys(REVIEWED_SOURCE),
    "phase1_source_contracts_shape_invalid",
  );
  for (const [key, expected] of Object.entries(REVIEWED_SOURCE)) {
    if (value[key] !== expected) fail("phase1_source_contract_mismatch:" + key);
  }
  return REVIEWED_SOURCE;
}

function validateAtomicEvaluation(value, direction) {
  plain(value, "phase1_atomic_evaluation_invalid");
  if (
    value.marker !== ATOMIC_MARKER ||
    value.direction !== direction ||
    typeof value.terminal !== "boolean" ||
    typeof value.final_phase !== "string"
  ) {
    fail("phase1_atomic_evaluation_identity_mismatch");
  }
  requireSha256Id(value.contract_id, "phase1_atomic_contract_id_invalid");
  if (value.evaluation_id !== evaluationId(value)) {
    fail("phase1_atomic_evaluation_id_mismatch");
  }
  const binding = plain(
    value.execution_source_binding,
    "phase1_atomic_source_binding_invalid",
  );
  if (
    typeof binding.source_head_sha !== "string" ||
    !HEX40.test(binding.source_head_sha) ||
    typeof binding.source_tree_sha !== "string" ||
    !HEX40.test(binding.source_tree_sha) ||
    binding.settlement_tool_git_blob_sha1 !==
      REVIEWED_SOURCE.atomic_settlement_tool_git_blob_sha1 ||
    binding.exact_reviewed_git_object_execution !== true ||
    binding.private_readonly_execution_bundle !== true ||
    binding.git_replacement_objects_disabled !== true
  ) {
    fail("phase1_atomic_source_binding_mismatch");
  }
  const dependencyBlobs = plain(
    binding.dependency_git_blobs,
    "phase1_atomic_dependency_blobs_invalid",
  );
  for (const [dependency, expectedBlob] of
    Object.entries(REVIEWED_ATOMIC_DEPENDENCIES)) {
    if (dependencyBlobs[dependency] !== expectedBlob) {
      fail("phase1_atomic_dependency_blob_mismatch:" + dependency);
    }
  }
  const invariants = plain(
    value.invariants,
    "phase1_atomic_invariants_invalid",
  );
  for (const key of [
    "current_quote_rederived_and_bound",
    "exact_reviewed_execution_git_objects_bound",
    "native_integer_amounts_bound",
    "current_shared_market_v2_canonical_source_bound",
    "transitions_fail_closed",
    "exact_event_replay_idempotent",
    "terminal_states_cannot_reopen",
    "every_transition_evidence_backed",
    "distinct_transitions_require_distinct_evidence",
    "no_automatic_retry",
  ]) {
    if (invariants[key] !== true) {
      fail("phase1_atomic_invariant_required:" + key);
    }
  }
  const authority = plain(
    value.authority,
    "phase1_atomic_authority_invalid",
  );
  if (
    authority.source_only_evaluation !== true ||
    authority.bitcoin_regtest_executed !== false ||
    authority.chain2050_execution_performed !== false ||
    authority.live_market_observed !== false ||
    authority.wallet_or_signer_accessed !== false ||
    authority.transaction_constructed !== false ||
    authority.transaction_broadcast !== false ||
    authority.market_activation_authorized !== false ||
    authority.funds_moved !== false
  ) {
    fail("phase1_atomic_source_only_boundary_mismatch");
  }
  return value;
}

function validateFeeQuote(value, direction) {
  plain(value, "phase1_fee_quote_invalid");
  if (
    value.marker !== FEE_MARKER ||
    value.request?.direction !== direction ||
    typeof value.trade_funded_fee_quote_id !== "string" ||
    value.trade_funded_fee_quote_id !== feeQuoteId(value)
  ) {
    fail("phase1_fee_quote_identity_mismatch");
  }
  if (
    value.protocol_fee?.bps !== 50 ||
    value.fee_envelope?.bitcoin?.standing_market_fee_reserve_required !== false ||
    value.authority?.source_only_policy !== true ||
    value.authority?.bitcoin_rpc_call !== false ||
    value.authority?.chain2050_rpc_call !== false ||
    value.authority?.transaction_construction !== false ||
    value.authority?.transaction_signing !== false ||
    value.authority?.transaction_broadcast !== false ||
    value.authority?.inventory_reservation !== false ||
    value.authority?.funds_movement !== false ||
    value.authority?.market_activation !== false
  ) {
    fail("phase1_fee_quote_policy_boundary_mismatch");
  }
  return value;
}

function validateBitcoinObservation(value) {
  exact(
    value,
    [
      "marker",
      "version",
      "network",
      "genesis_block_hash",
      "observer",
      "observed_height",
      "observed_tip_hash",
      "transaction_ids",
      "block_hashes",
      "raw_rpc_transcript_sha256",
      "rpc_readback",
      "production_bitcoin_contact",
      "mainnet_transaction",
      "observation_id",
    ],
    "phase1_bitcoin_observation_shape_invalid",
  );
  if (
    value.marker !== BITCOIN_OBSERVATION_MARKER ||
    value.version !== 1 ||
    value.network !== "regtest" ||
    value.genesis_block_hash !== BITCOIN_REGTEST_GENESIS ||
    value.observer !== "bitcoin_core_jsonrpc_readback_v1" ||
    !Number.isSafeInteger(value.observed_height) ||
    value.observed_height < 0 ||
    value.rpc_readback !== true ||
    value.production_bitcoin_contact !== false ||
    value.mainnet_transaction !== false
  ) {
    fail("phase1_bitcoin_observation_identity_mismatch");
  }
  requireHex64(value.observed_tip_hash, "phase1_bitcoin_tip_hash_invalid");
  requireTxArray(value.transaction_ids, "phase1_bitcoin_txids_invalid");
  requireBlockArray(value.block_hashes, "phase1_bitcoin_block_hashes_invalid");
  requireHex64(
    value.raw_rpc_transcript_sha256,
    "phase1_bitcoin_rpc_transcript_sha_invalid",
  );
  const material = structuredClone(value);
  delete material.observation_id;
  if (
    value.observation_id !==
    contentId("voidbtcp1btc1_", material)
  ) {
    fail("phase1_bitcoin_observation_id_mismatch");
  }
  return value;
}

function validateChain2050Observation(value) {
  exact(
    value,
    [
      "marker",
      "version",
      "chain_id",
      "execution_epoch",
      "environment",
      "client_class",
      "genesis_block_hash",
      "genesis_state_root",
      "observed_block_number",
      "observed_block_hash",
      "transaction_hashes",
      "receipt_set_sha256",
      "rpc_readback",
      "isolated_state_write_observed",
      "production_rpc_contact",
      "authoritative_production_write",
      "observation_id",
    ],
    "phase1_chain2050_observation_shape_invalid",
  );
  if (
    value.marker !== CHAIN2050_OBSERVATION_MARKER ||
    value.version !== 1 ||
    value.chain_id !== 2050 ||
    value.execution_epoch !== 2 ||
    value.environment !== "isolated_nonproduction_phase1" ||
    value.client_class !== "production_non_dev_evm_client" ||
    value.genesis_block_hash !== CHAIN2050_EPOCH2_GENESIS_BLOCK_HASH ||
    value.genesis_state_root !== CHAIN2050_EPOCH2_GENESIS_STATE_ROOT ||
    typeof value.observed_block_number !== "string" ||
    !/^(0|[1-9][0-9]*)$/u.test(value.observed_block_number) ||
    value.rpc_readback !== true ||
    typeof value.isolated_state_write_observed !== "boolean" ||
    value.production_rpc_contact !== false ||
    value.authoritative_production_write !== false
  ) {
    fail("phase1_chain2050_observation_identity_mismatch");
  }
  requireHash32(
    "0x" + value.genesis_block_hash,
    "phase1_chain2050_genesis_hash_invalid",
  );
  requireHash32(
    "0x" + value.genesis_state_root,
    "phase1_chain2050_genesis_state_root_invalid",
  );
  requireHash32(
    value.observed_block_hash,
    "phase1_chain2050_block_hash_invalid",
  );
  if (
    !Array.isArray(value.transaction_hashes) ||
    value.transaction_hashes.length < 1 ||
    value.transaction_hashes.length > 64
  ) {
    fail("phase1_chain2050_transaction_hashes_invalid");
  }
  const txs = value.transaction_hashes.map((entry) =>
    requireHash32(entry, "phase1_chain2050_transaction_hash_invalid"),
  );
  if (new Set(txs).size !== txs.length) {
    fail("phase1_chain2050_transaction_hashes_invalid");
  }
  requireHex64(
    value.receipt_set_sha256,
    "phase1_chain2050_receipt_set_sha_invalid",
  );
  const material = structuredClone(value);
  delete material.observation_id;
  if (
    value.observation_id !==
    contentId("voidbtcp1c2050_", material)
  ) {
    fail("phase1_chain2050_observation_id_mismatch");
  }
  return value;
}

function validateCrossRailBinding(value, atomic, fee, bitcoin, chain2050) {
  exact(
    value,
    [
      "atomic_contract_id",
      "hashlock_sha256",
      "bitcoin_observation_id",
      "chain2050_observation_id",
      "trade_funded_fee_quote_id",
      "same_preimage_domain",
      "source_only_atomic_evaluation_not_execution_evidence",
      "binding_id",
    ],
    "phase1_cross_rail_binding_shape_invalid",
  );
  if (
    value.atomic_contract_id !== atomic.contract_id ||
    value.bitcoin_observation_id !== bitcoin.observation_id ||
    value.chain2050_observation_id !== chain2050.observation_id ||
    value.trade_funded_fee_quote_id !== fee.trade_funded_fee_quote_id ||
    value.same_preimage_domain !== true ||
    value.source_only_atomic_evaluation_not_execution_evidence !== true
  ) {
    fail("phase1_cross_rail_binding_mismatch");
  }
  requireSha256Id(value.hashlock_sha256, "phase1_hashlock_invalid");
  const material = structuredClone(value);
  delete material.binding_id;
  if (
    value.binding_id !==
    contentId("voidbtcp1bind1_", material)
  ) {
    fail("phase1_cross_rail_binding_id_mismatch");
  }
  return value;
}

function validateRejection(value, required) {
  if (!required) {
    if (value !== null) fail("phase1_unexpected_rejection_evidence");
    return null;
  }
  exact(
    value,
    [
      "rejected",
      "rejection_code",
      "observed_on_rail",
      "no_terminal_value_effect",
      "evidence_sha256",
    ],
    "phase1_rejection_shape_invalid",
  );
  if (
    value.rejected !== true ||
    typeof value.rejection_code !== "string" ||
    value.rejection_code.length < 1 ||
    value.rejection_code.length > 128 ||
    !["bitcoin", "chain2050", "cross_rail"].includes(value.observed_on_rail) ||
    value.no_terminal_value_effect !== true
  ) {
    fail("phase1_rejection_evidence_invalid");
  }
  requireHex64(value.evidence_sha256, "phase1_rejection_sha_invalid");
  return value;
}

function validateRestart(value, required) {
  if (!required) {
    if (value !== null) fail("phase1_unexpected_restart_evidence");
    return null;
  }
  exact(
    value,
    [
      "process_restart_observed",
      "durable_state_reloaded",
      "same_contract_id_after_restart",
      "duplicate_terminal_effect_count",
      "evidence_sha256",
    ],
    "phase1_restart_shape_invalid",
  );
  if (
    value.process_restart_observed !== true ||
    value.durable_state_reloaded !== true ||
    value.same_contract_id_after_restart !== true ||
    value.duplicate_terminal_effect_count !== 0
  ) {
    fail("phase1_restart_evidence_invalid");
  }
  requireHex64(value.evidence_sha256, "phase1_restart_sha_invalid");
  return value;
}

function validateReorg(value, required) {
  if (!required) {
    if (value !== null) fail("phase1_unexpected_reorg_evidence");
    return null;
  }
  exact(
    value,
    [
      "bitcoin_reorg_depth",
      "orphaned_observation_invalidated",
      "canonical_reconfirmation_observed",
      "double_settlement_observed",
      "evidence_sha256",
    ],
    "phase1_reorg_shape_invalid",
  );
  if (
    !Number.isSafeInteger(value.bitcoin_reorg_depth) ||
    value.bitcoin_reorg_depth < 1 ||
    value.bitcoin_reorg_depth > 6 ||
    value.orphaned_observation_invalidated !== true ||
    value.canonical_reconfirmation_observed !== true ||
    value.double_settlement_observed !== false
  ) {
    fail("phase1_reorg_evidence_invalid");
  }
  requireHex64(value.evidence_sha256, "phase1_reorg_sha_invalid");
  return value;
}

function validateCase(raw) {
  const value = exact(
    structuredClone(raw),
    [
      "kind",
      "direction",
      "outcome",
      "refund_rail",
      "atomic_evaluation",
      "trade_funded_fee_quote",
      "bitcoin_observation",
      "chain2050_observation",
      "cross_rail_binding",
      "rejection",
      "restart_recovery",
      "reorg_reconciliation",
      "case_id",
    ],
    "phase1_case_shape_invalid",
  );
  if (!REQUIRED_CASES.includes(value.kind)) fail("phase1_case_kind_invalid");
  if (!["btc_to_void", "void_to_btc"].includes(value.direction)) {
    fail("phase1_case_direction_invalid");
  }

  const rejected = REJECTED_CASES.has(value.kind);
  const expectedOutcome =
    value.kind.endsWith("_success") ||
    value.kind === "restart_recovery" ||
    value.kind === "reorg_reconciliation"
      ? "SETTLED"
      : value.kind === "btc_refund" ||
          value.kind === "chain2050_refund" ||
          value.kind === "timeout_refund"
        ? "REFUNDED"
        : "REJECTED";
  if (value.outcome !== expectedOutcome) fail("phase1_case_outcome_invalid");

  if (value.kind === "btc_to_void_success" && value.direction !== "btc_to_void") {
    fail("phase1_btc_to_void_success_direction_invalid");
  }
  if (value.kind === "void_to_btc_success" && value.direction !== "void_to_btc") {
    fail("phase1_void_to_btc_success_direction_invalid");
  }
  if (value.kind === "btc_refund" && value.refund_rail !== "bitcoin") {
    fail("phase1_btc_refund_rail_invalid");
  }
  if (value.kind === "chain2050_refund" && value.refund_rail !== "chain2050") {
    fail("phase1_chain2050_refund_rail_invalid");
  }
  if (
    !["btc_refund", "chain2050_refund", "timeout_refund"].includes(value.kind) &&
    value.refund_rail !== null
  ) {
    fail("phase1_unexpected_refund_rail");
  }
  if (
    value.kind === "timeout_refund" &&
    !["bitcoin", "chain2050"].includes(value.refund_rail)
  ) {
    fail("phase1_timeout_refund_rail_invalid");
  }

  const atomic = validateAtomicEvaluation(value.atomic_evaluation, value.direction);
  const fee = validateFeeQuote(value.trade_funded_fee_quote, value.direction);
  const bitcoin = validateBitcoinObservation(value.bitcoin_observation);
  const chain2050 = validateChain2050Observation(value.chain2050_observation);
  validateCrossRailBinding(
    value.cross_rail_binding,
    atomic,
    fee,
    bitcoin,
    chain2050,
  );
  validateRejection(value.rejection, rejected);
  validateRestart(value.restart_recovery, value.kind === "restart_recovery");
  validateReorg(value.reorg_reconciliation, value.kind === "reorg_reconciliation");

  if (expectedOutcome === "SETTLED") {
    if (atomic.final_phase !== "SETTLED" || atomic.terminal !== true) {
      fail("phase1_settled_case_atomic_phase_mismatch");
    }
    if (chain2050.isolated_state_write_observed !== true) {
      fail("phase1_settled_case_requires_isolated_chain_write");
    }
  } else if (expectedOutcome === "REFUNDED") {
    if (atomic.final_phase !== "REFUNDED" || atomic.terminal !== true) {
      fail("phase1_refund_case_atomic_phase_mismatch");
    }
  } else if (atomic.final_phase === "SETTLED") {
    fail("phase1_rejected_case_cannot_be_settled");
  }

  const material = structuredClone(value);
  delete material.case_id;
  if (value.case_id !== contentId("voidbtcp1case1_", material)) {
    fail("phase1_case_id_mismatch");
  }
  return deepFreeze(value);
}

export function previewBtcVoidPhase1ExecutionEvidenceV1(input) {
  const request = exact(
    structuredClone(input),
    ["schema", "version", "source_contracts", "cases"],
    "phase1_suite_shape_invalid",
  );
  if (request.schema !== INPUT_SCHEMA || request.version !== 1) {
    fail("phase1_suite_identity_invalid");
  }
  validateSourceContracts(request.source_contracts);
  if (
    !Array.isArray(request.cases) ||
    request.cases.length !== REQUIRED_CASES.length
  ) {
    fail("phase1_suite_case_count_invalid");
  }

  const cases = request.cases.map(validateCase);
  const kinds = cases.map((entry) => entry.kind);
  if (
    new Set(kinds).size !== REQUIRED_CASES.length ||
    [...REQUIRED_CASES].some((kind) => !kinds.includes(kind))
  ) {
    fail("phase1_suite_required_case_coverage_invalid");
  }
  const caseIds = cases.map((entry) => entry.case_id);
  if (new Set(caseIds).size !== caseIds.length) {
    fail("phase1_suite_duplicate_case_id");
  }

  const atomicSourceHeads = [
    ...new Set(
      cases.map(
        (entry) =>
          entry.atomic_evaluation.execution_source_binding.source_head_sha,
      ),
    ),
  ].sort();
  if (atomicSourceHeads.length !== 1) {
    fail("phase1_suite_mixed_atomic_source_generations");
  }
  const atomicSourceTrees = [
    ...new Set(
      cases.map(
        (entry) =>
          entry.atomic_evaluation.execution_source_binding.source_tree_sha,
      ),
    ),
  ].sort();
  if (atomicSourceTrees.length !== 1) {
    fail("phase1_suite_mixed_atomic_source_trees");
  }

  const material = deepFreeze({
    schema: OUTPUT_SCHEMA,
    marker: VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_PREVIEW_V1,
    version: 1,
    status:
      "PHASE1_EXECUTION_EVIDENCE_STRUCTURAL_PREVIEW_NOT_EXECUTION_VERIFIED",
    source_contracts: REVIEWED_SOURCE,
    bitcoin_regtest_genesis_hash: BITCOIN_REGTEST_GENESIS,
    chain2050_epoch2_genesis_block_hash:
      CHAIN2050_EPOCH2_GENESIS_BLOCK_HASH,
    chain2050_epoch2_genesis_state_root:
      CHAIN2050_EPOCH2_GENESIS_STATE_ROOT,
    atomic_source_head_shas: Object.freeze(atomicSourceHeads),
    atomic_source_tree_shas: Object.freeze(atomicSourceTrees),
    cases: Object.freeze(cases),
    coverage: Object.freeze({
      btc_to_void_success_case_structurally_present: true,
      void_to_btc_success_case_structurally_present: true,
      btc_refund_case_structurally_present: true,
      chain2050_refund_case_structurally_present: true,
      wrong_preimage_rejected_case_structurally_present: true,
      wrong_amount_rejected_case_structurally_present: true,
      wrong_script_rejected_case_structurally_present: true,
      premature_claim_rejected_case_structurally_present: true,
      timeout_refund_case_structurally_present: true,
      replay_rejected_case_structurally_present: true,
      restart_recovery_case_structurally_present: true,
      reorg_reconciliation_case_structurally_present: true,
      bitcoin_regtest_observation_claims_structurally_validated: true,
      isolated_chain2050_observation_claims_structurally_validated: true,
      bitcoin_regtest_execution_evidence_admitted: false,
      isolated_chain2050_execution_evidence_admitted: false,
      raw_rpc_transcripts_replayed: false,
      chain2050_receipts_replayed: false,
      restart_reorg_evidence_bytes_verified: false,
      cross_rail_preimage_execution_rederived: false,
      fee_envelope_execution_accounting_verified: false,
      native_unit_execution_conservation_verified: false,
      atomic_source_model_not_treated_as_execution_evidence: true,
      production_authority_granted: false,
    }),
    authority: VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_AUTHORITY_V1,
  });

  return deepFreeze({
    ...material,
    preview_id: contentId("voidbtcp1preview1_", material),
  });
}

export function admitBtcVoidPhase1ExecutionEvidenceV1(input) {
  return previewBtcVoidPhase1ExecutionEvidenceV1(input);
}

async function readBoundedStdin() {
  process.stdin.setEncoding("utf8");
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk;
    if (Buffer.byteLength(text, "utf8") > MAX_STDIN_BYTES) {
      fail("phase1_stdin_too_large");
    }
  }
  if (!text.trim()) fail("phase1_stdin_empty");
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--pretty") || args.length > 1) {
    fail(
      "usage: void-btc-void-phase1-execution-evidence-v1.mjs [--pretty] < suite.json",
    );
  }
  const text = await readBoundedStdin();
  let input;
  try {
    input = JSON.parse(text);
  } catch {
    fail("phase1_stdin_json_invalid");
  }
  const result = admitBtcVoidPhase1ExecutionEvidenceV1(input);
  process.stdout.write(
    JSON.stringify(result, null, args.includes("--pretty") ? 2 : 0) + "\n",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(String(error?.message || error) + "\n");
    process.exitCode = 1;
  });
}
