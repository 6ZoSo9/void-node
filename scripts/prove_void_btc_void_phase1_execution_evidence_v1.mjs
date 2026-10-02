#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_AUTHORITY_V1,
  VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1,
  admitBtcVoidPhase1ExecutionEvidenceV1,
} from "../tools/void-btc-void-phase1-execution-evidence-v1.mjs";

const SOURCE_CONTRACTS = Object.freeze({
  atomic_settlement_tool_git_blob_sha1:
    "4fdc9c632b73a50dded72fd5493286667ca197c0",
  trade_funded_fees_tool_git_blob_sha1:
    "5aff99a441d4a0ffd441b6dd508aaa7988e4eb16",
  epoch2_successor_evidence_git_blob_sha1:
    "458528c7d1c3fe1db27643ee406e493606443c2f",
  client_neutral_state_manifest_git_blob_sha1:
    "fabe44a43ff188902779b36e6a84de9ba110de87",
});

const BITCOIN_REGTEST_GENESIS =
  "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206";
const CHAIN2050_GENESIS =
  "8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const CHAIN2050_STATE_ROOT =
  "7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";

const CASES = Object.freeze([
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

const REJECTED = new Set([
  "wrong_preimage_rejected",
  "wrong_amount_rejected",
  "wrong_script_rejected",
  "premature_claim_rejected",
  "replay_rejected",
]);

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert(Number.isSafeInteger(value));
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contentId(prefix, value) {
  return prefix + sha256(Buffer.from(canonicalJson(value), "utf8"));
}

function withEvaluationId(value) {
  const out = structuredClone(value);
  out.evaluation_id =
    "sha256:" + sha256(Buffer.from(canonicalJson(value), "utf8"));
  return out;
}

function withFeeQuoteId(value) {
  const out = structuredClone(value);
  out.trade_funded_fee_quote_id =
    "voidbtcvfq1_" + sha256(Buffer.from(canonicalJson(value), "utf8"));
  return out;
}

function bitcoinObservation(seed) {
  const material = {
    marker: "VOID_BITCOIN_REGTEST_EXECUTION_OBSERVATION_V1",
    version: 1,
    network: "regtest",
    genesis_block_hash: BITCOIN_REGTEST_GENESIS,
    observer: "bitcoin_core_jsonrpc_readback_v1",
    observed_height: 101 + seed,
    observed_tip_hash: String(seed + 1).padStart(64, "0"),
    transaction_ids: [String(100 + seed).padStart(64, "0")],
    block_hashes: [String(200 + seed).padStart(64, "0")],
    raw_rpc_transcript_sha256: String(300 + seed).padStart(64, "0"),
    rpc_readback: true,
    production_bitcoin_contact: false,
    mainnet_transaction: false,
  };
  return {
    ...material,
    observation_id: contentId("voidbtcp1btc1_", material),
  };
}

function chainObservation(seed, writeObserved = true) {
  const material = {
    marker: "VOID_CHAIN2050_ISOLATED_EXECUTION_OBSERVATION_V1",
    version: 1,
    chain_id: 2050,
    execution_epoch: 2,
    environment: "isolated_nonproduction_phase1",
    client_class: "production_non_dev_evm_client",
    genesis_block_hash: CHAIN2050_GENESIS,
    genesis_state_root: CHAIN2050_STATE_ROOT,
    observed_block_number: String(50 + seed),
    observed_block_hash: "0x" + String(400 + seed).padStart(64, "0"),
    transaction_hashes: ["0x" + String(500 + seed).padStart(64, "0")],
    receipt_set_sha256: String(600 + seed).padStart(64, "0"),
    rpc_readback: true,
    isolated_state_write_observed: writeObserved,
    production_rpc_contact: false,
    authoritative_production_write: false,
  };
  return {
    ...material,
    observation_id: contentId("voidbtcp1c2050_", material),
  };
}

function atomicEvaluation(direction, finalPhase, terminal, seed) {
  const material = {
    schema: "void.btc_void.atomic_settlement_evaluation.current_stack.v1",
    marker: "VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1",
    contract_id: "sha256:" + String(700 + seed).padStart(64, "0"),
    direction,
    indicative_quote_id: "sha256:" + String(800 + seed).padStart(64, "0"),
    market_policy_id: "sha256:" + String(900 + seed).padStart(64, "0"),
    final_phase: finalPhase,
    terminal,
    applied_event_ids: [],
    execution_source_binding: {
      source_head_sha: "a".repeat(40),
      source_tree_sha: "b".repeat(40),
      settlement_tool_git_blob_sha1:
        SOURCE_CONTRACTS.atomic_settlement_tool_git_blob_sha1,
      git_executable_sha256: "1".repeat(64),
      dependency_git_blobs: {},
      exact_reviewed_git_object_execution: true,
      private_readonly_execution_bundle: true,
      git_replacement_objects_disabled: true,
    },
    current_market_binding: {},
    terminal_market_follow_on: null,
    invariants: {
      current_quote_rederived_and_bound: true,
      exact_reviewed_execution_git_objects_bound: true,
      native_integer_amounts_bound: true,
      current_shared_market_v2_canonical_source_bound: true,
      transitions_fail_closed: true,
      exact_event_replay_idempotent: true,
      terminal_states_cannot_reopen: true,
      every_transition_evidence_backed: true,
      distinct_transitions_require_distinct_evidence: true,
      no_automatic_retry: true,
    },
    authority: {
      source_only_evaluation: true,
      bitcoin_regtest_executed: false,
      chain2050_execution_performed: false,
      live_market_observed: false,
      executable_inventory_reserved: false,
      liquidity_seeded: false,
      wallet_or_signer_accessed: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      treasury_action_authorized: false,
      market_activation_authorized: false,
      funds_moved: false,
    },
  };
  return withEvaluationId(material);
}

function feeQuote(direction, seed) {
  const material = {
    schema: "void.btc_void.trade_funded_fee_quote.v1",
    marker: "VOID_BTC_VOID_TRADE_FUNDED_FEES_V1",
    request: { direction },
    pricing: {
      gross_input_amount: String(100000 + seed),
      curve_priced_input_amount: String(90000 + seed),
      curve_gross_output_amount: String(80000 + seed),
      net_user_output_amount: String(70000 + seed),
      curve_indicative_quote_id: "voidq_" + seed,
      curve_input_asset: direction === "btc_to_void" ? "BTC" : "VOID",
      curve_output_asset: direction === "btc_to_void" ? "VOID" : "BTC",
    },
    protocol_fee: { bps: 50 },
    fee_envelope: {
      bitcoin: { standing_market_fee_reserve_required: false },
      chain2050: {},
    },
    launch_fee_topology_gate: { market_activation_ready: false },
    executable_invariants: {},
    authority: {
      source_only_policy: true,
      bitcoin_rpc_call: false,
      chain2050_rpc_call: false,
      transaction_construction: false,
      transaction_signing: false,
      transaction_broadcast: false,
      inventory_reservation: false,
      funds_movement: false,
      market_activation: false,
    },
  };
  return withFeeQuoteId(material);
}

function crossBinding(atomic, fee, bitcoin, chain2050, seed) {
  const material = {
    atomic_contract_id: atomic.contract_id,
    hashlock_sha256: "sha256:" + String(1000 + seed).padStart(64, "0"),
    bitcoin_observation_id: bitcoin.observation_id,
    chain2050_observation_id: chain2050.observation_id,
    trade_funded_fee_quote_id: fee.trade_funded_fee_quote_id,
    same_preimage_domain: true,
    source_only_atomic_evaluation_not_execution_evidence: true,
  };
  return {
    ...material,
    binding_id: contentId("voidbtcp1bind1_", material),
  };
}

function makeCase(kind, index) {
  let direction = index % 2 === 0 ? "btc_to_void" : "void_to_btc";
  if (kind === "btc_to_void_success") direction = "btc_to_void";
  if (kind === "void_to_btc_success") direction = "void_to_btc";

  const rejected = REJECTED.has(kind);
  const refunded =
    kind === "btc_refund" ||
    kind === "chain2050_refund" ||
    kind === "timeout_refund";
  const outcome = rejected ? "REJECTED" : refunded ? "REFUNDED" : "SETTLED";
  const finalPhase = rejected ? "HELD" : outcome;
  const atomic = atomicEvaluation(direction, finalPhase, true, index);
  const fee = feeQuote(direction, index);
  const btc = bitcoinObservation(index);
  const chain = chainObservation(index, !rejected);

  const material = {
    kind,
    direction,
    outcome,
    refund_rail:
      kind === "btc_refund"
        ? "bitcoin"
        : kind === "chain2050_refund"
          ? "chain2050"
          : kind === "timeout_refund"
            ? "bitcoin"
            : null,
    atomic_evaluation: atomic,
    trade_funded_fee_quote: fee,
    bitcoin_observation: btc,
    chain2050_observation: chain,
    cross_rail_binding: crossBinding(atomic, fee, btc, chain, index),
    rejection: rejected
      ? {
          rejected: true,
          rejection_code: "phase1_" + kind,
          observed_on_rail: "cross_rail",
          no_terminal_value_effect: true,
          evidence_sha256: String(1100 + index).padStart(64, "0"),
        }
      : null,
    restart_recovery:
      kind === "restart_recovery"
        ? {
            process_restart_observed: true,
            durable_state_reloaded: true,
            same_contract_id_after_restart: true,
            duplicate_terminal_effect_count: 0,
            evidence_sha256: String(1200 + index).padStart(64, "0"),
          }
        : null,
    reorg_reconciliation:
      kind === "reorg_reconciliation"
        ? {
            bitcoin_reorg_depth: 1,
            orphaned_observation_invalidated: true,
            canonical_reconfirmation_observed: true,
            double_settlement_observed: false,
            evidence_sha256: String(1300 + index).padStart(64, "0"),
          }
        : null,
  };
  return {
    ...material,
    case_id: contentId("voidbtcp1case1_", material),
  };
}

function suite() {
  return {
    schema: "void.btc_void.phase1_execution_evidence_suite_request.v1",
    version: 1,
    source_contracts: structuredClone(SOURCE_CONTRACTS),
    cases: CASES.map(makeCase),
  };
}

function expectReject(mutator, pattern) {
  const input = suite();
  mutator(input);
  assert.throws(() => admitBtcVoidPhase1ExecutionEvidenceV1(input), pattern);
}

const admitted = admitBtcVoidPhase1ExecutionEvidenceV1(suite());

assert.equal(
  admitted.marker,
  VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1,
);
assert.equal(
  admitted.status,
  "PHASE1_EXECUTION_EVIDENCE_ADMITTED_NONPRODUCTION",
);
assert.match(admitted.evidence_suite_id, /^voidbtcp1ev1_[0-9a-f]{64}$/u);
assert.equal(admitted.cases.length, 12);
assert.deepEqual(
  admitted.cases.map((entry) => entry.kind).sort(),
  [...CASES].sort(),
);
assert.equal(
  admitted.coverage.bitcoin_regtest_execution_evidence_admitted,
  true,
);
assert.equal(
  admitted.coverage.isolated_chain2050_execution_evidence_admitted,
  true,
);
assert.equal(
  admitted.coverage.atomic_source_model_not_treated_as_execution_evidence,
  true,
);
assert.equal(admitted.coverage.production_authority_granted, false);
assert.deepEqual(
  admitted.authority,
  VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_AUTHORITY_V1,
);

expectReject(
  (input) => {
    input.cases[0].bitcoin_observation.network = "main";
  },
  /phase1_bitcoin_observation_identity_mismatch/u,
);

expectReject(
  (input) => {
    input.cases[0].bitcoin_observation.genesis_block_hash = "0".repeat(64);
  },
  /phase1_bitcoin_observation_identity_mismatch/u,
);

expectReject(
  (input) => {
    input.cases[0].bitcoin_observation.mainnet_transaction = true;
  },
  /phase1_bitcoin_observation_identity_mismatch/u,
);

expectReject(
  (input) => {
    input.cases[0].chain2050_observation.production_rpc_contact = true;
  },
  /phase1_chain2050_observation_identity_mismatch/u,
);

expectReject(
  (input) => {
    input.cases[0].chain2050_observation.genesis_state_root = "0".repeat(64);
  },
  /phase1_chain2050_observation_identity_mismatch/u,
);

expectReject(
  (input) => {
    input.cases[0].atomic_evaluation.authority.bitcoin_regtest_executed = true;
  },
  /phase1_atomic_evaluation_id_mismatch|phase1_atomic_source_only_boundary_mismatch/u,
);

expectReject(
  (input) => {
    input.source_contracts.atomic_settlement_tool_git_blob_sha1 = "0".repeat(40);
  },
  /phase1_source_contract_mismatch/u,
);

expectReject(
  (input) => {
    input.cases.pop();
  },
  /phase1_suite_case_count_invalid/u,
);

expectReject(
  (input) => {
    input.cases[1] = structuredClone(input.cases[0]);
  },
  /phase1_suite_required_case_coverage_invalid|phase1_suite_duplicate_case_id/u,
);

expectReject(
  (input) => {
    input.cases[0].case_id = "voidbtcp1case1_" + "0".repeat(64);
  },
  /phase1_case_id_mismatch/u,
);

expectReject(
  (input) => {
    input.cases[0].trade_funded_fee_quote.trade_funded_fee_quote_id =
      "voidbtcvfq1_" + "0".repeat(64);
  },
  /phase1_fee_quote_identity_mismatch/u,
);

expectReject(
  (input) => {
    const restart = input.cases.find(
      (entry) => entry.kind === "restart_recovery",
    );
    restart.restart_recovery.duplicate_terminal_effect_count = 1;
  },
  /phase1_restart_evidence_invalid/u,
);

expectReject(
  (input) => {
    const reorg = input.cases.find(
      (entry) => entry.kind === "reorg_reconciliation",
    );
    reorg.reorg_reconciliation.double_settlement_observed = true;
  },
  /phase1_reorg_evidence_invalid/u,
);

const source = fs.readFileSync(
  "tools/void-btc-void-phase1-execution-evidence-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "bitcoin-cli",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "signTransaction(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  BITCOIN_REGTEST_GENESIS,
  CHAIN2050_GENESIS,
  CHAIN2050_STATE_ROOT,
  "atomic_source_model_not_treated_as_execution_evidence",
  "bitcoin_mainnet_contact: false",
  "production_chain2050_contact: false",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log("VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1_PROOF_GREEN");
console.log("required_case_count=12");
console.log("bitcoin_regtest_identity_bound=true");
console.log("isolated_chain2050_epoch2_identity_bound=true");
console.log("source_only_atomic_trace_not_execution_evidence=true");
console.log("trade_funded_fee_quote_bound=true");
console.log("success_refund_rejection_restart_reorg_coverage=true");
console.log("bitcoin_mainnet_contact=false");
console.log("production_chain2050_contact=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("market_activation=false");
console.log("production_funds_movement=false");
