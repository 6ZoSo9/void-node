#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";

import { proveBtcVoidBoundedStdinV1 } from "./lib/prove_void_btc_void_bounded_stdin_v1.mjs";
import {
  VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1,
  canonicalJson,
  currentBtcVoidMarketPolicyBindingV1,
  evaluateBtcVoidAtomicSettlementTraceV1,
} from "../tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs";
import {
  quoteBtcVoidV1,
} from "../tools/void-btc-void-quote-math-v1.mjs";
import {
  deriveBtcVoidBuybackLotV1,
} from "../tools/void-btc-void-market-maker-reserve-policy-v1.mjs";
import {
  evaluateBtcVoidBuybackLotJournalTransitionV1,
} from "../tools/void-btc-void-buyback-lot-journal-transition-v1.mjs";

const MARKER =
  "VOID_BTC_VOID_ATOMIC_SETTLEMENT_CURRENT_STACK_V1_PROOF_GREEN";
const COUPLED_CANDIDATE =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SHARED_V2_SOURCE =
  "tools/void-shared-market-post-discovery-state-v2.mjs";
const ATOMIC_TOOL =
  "tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs";
const QUOTE_SOURCE =
  "tools/void-btc-void-quote-math-v1.mjs";
const EXPECTED_EXECUTION_BLOBS = Object.freeze({
  "tools/void-btc-void-quote-math-v1.mjs":
    "02be3da1718209db1603094c9654c7dc9d697c51",
  "tools/void-btc-void-market-maker-reserve-policy-v1.mjs":
    "937e1b38cab34b36297f4320cc253a8e48f5a7e1",
  "tools/void-btc-void-buyback-lot-journal-transition-v1.mjs":
    "63d347948f3dd0bded2f2f79fadafec8f0cf7838",
  "tools/void-btc-void-bounded-stdin-v1.mjs":
    "2026b9be59216b0c52cf4d978b7fc91b7f7592e1",
});
const EXPECTED_COUPLED_BLOB =
  "d78bc88dd26c47921a54c081a79ceefc0d5abcee";
const EXPECTED_SHARED_V2_BLOB =
  "bcfff9c2981e713a7053ff51a39145eb06b7238b";
const EXPECTED_RECONCILIATION_ID =
  "sha256:522ff84c2fff69ef477085a253b666cb450a8dbd89d372633fdfe883e58851ba";

function contentId(value) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex")}`;
}

function quoteRequest(direction = "btc_to_void") {
  return {
    schema: "void.btc_void.indicative_quote_request.v1",
    direction,
    amount_in: "1000000",
    reserves: {
      btc_sats: "100000000",
      void_atomic: "50000000000",
    },
    policy: {
      fee_bps: 100,
      max_input_reserve_fraction_bps: 2500,
      minimum_btc_reserve_sats: "1000000",
      minimum_void_reserve_atomic: "1000000",
    },
  };
}

function makeContract(direction = "btc_to_void", overrides = {}) {
  const request = quoteRequest(direction);
  const quote = quoteBtcVoidV1(request);
  const marketPolicy = currentBtcVoidMarketPolicyBindingV1();
  const payload = {
    schema: "void.btc_void.atomic_settlement_contract.current_stack.v1",
    pair: "BTC_VOID",
    direction,
    market_policy_id: marketPolicy.market_policy_id,
    quote_request: request,
    indicative_quote_id: quote.indicative_quote_id,
    bitcoin_amount_satoshis:
      direction === "btc_to_void"
        ? quote.request.amount_in
        : quote.result.amount_out,
    void_amount_atomic:
      direction === "btc_to_void"
        ? quote.result.amount_out
        : quote.request.amount_in,
    hashlock_sha256: "33".repeat(32),
    bitcoin_refund_horizon_seconds:
      direction === "btc_to_void" ? "7200" : "3600",
    void_refund_horizon_seconds:
      direction === "btc_to_void" ? "3600" : "7200",
    minimum_refund_safety_margin_seconds: "1800",
    ...overrides,
  };
  return {
    ...payload,
    contract_id: contentId(payload),
  };
}

function makeEvent(
  contract,
  eventType,
  fromPhase,
  toPhase,
  evidenceId,
  override = {},
) {
  const sourceRefundRole =
    contract.direction === "btc_to_void"
      ? "SOURCE_NATIVE_BTC"
      : "SOURCE_NATIVE_VOID";
  const counterpartyRefundRole =
    contract.direction === "btc_to_void"
      ? "COUNTERPARTY_NATIVE_VOID"
      : "COUNTERPARTY_NATIVE_BTC";
  const payload = {
    schema: "void.btc_void.atomic_settlement_event.current_stack.v1",
    contract_id: contract.contract_id,
    event_type: eventType,
    from_phase: fromPhase,
    to_phase: toPhase,
    refund_asset_role:
      eventType === "OBSERVE_SOURCE_REFUND"
        ? sourceRefundRole
        : eventType === "OBSERVE_COUNTERPARTY_REFUND"
          ? counterpartyRefundRole
          : "NOT_A_REFUND",
    evidence_id: evidenceId,
    ...override,
  };
  return {
    ...payload,
    event_id: contentId(payload),
  };
}

function sourceSaleRequest(contract) {
  const settlementPayload = {
    schema: "void.btc_void.source_sale_receipt.v1",
    direction: "btc_to_void",
    bitcoin_network: "bitcoin_mainnet",
    bitcoin_funding_txid: "44".repeat(32),
    bitcoin_funding_vout: 0,
    void_chain_id: 2050,
    void_network_identity: "mainnet0",
    void_settlement_receipt_id: `sha256:${"5".repeat(64)}`,
    btc_received_sats: contract.bitcoin_amount_satoshis,
    void_sold_atomic: contract.void_amount_atomic,
  };
  const sourceSaleId = contentId(settlementPayload);
  return {
    schema: "void.btc_void.reserve_recycling_request.v1",
    settlement: {
      source_sale_id: sourceSaleId,
      direction: "btc_to_void",
      status: "settled",
      bitcoin_network: "bitcoin_mainnet",
      bitcoin_funding_txid: settlementPayload.bitcoin_funding_txid,
      bitcoin_funding_vout: settlementPayload.bitcoin_funding_vout,
      bitcoin_confirmed_block_hash: "66".repeat(32),
      bitcoin_confirmed_block_height: 100,
      bitcoin_observed_tip_hash: "77".repeat(32),
      bitcoin_observed_tip_height: 105,
      void_chain_id: 2050,
      void_network_identity: "mainnet0",
      void_settlement_receipt_id:
        settlementPayload.void_settlement_receipt_id,
      btc_received_sats: settlementPayload.btc_received_sats,
      void_sold_atomic: settlementPayload.void_sold_atomic,
      observed_bitcoin_confirmations: 6,
      required_bitcoin_confirmations: 3,
    },
    policy: {
      minimum_spread_bps: 100,
      bitcoin_network_fee_reserve_sats: "0",
    },
  };
}

function terminalBinding(contract, journalEntries = []) {
  const reserveRequest = sourceSaleRequest(contract);
  const plan = deriveBtcVoidBuybackLotV1(reserveRequest);
  const decision = evaluateBtcVoidBuybackLotJournalTransitionV1({
    schema: "void.btc_void.buyback_lot_journal_transition_request.v1",
    journal_entries: journalEntries,
    candidate_plan: plan,
  });
  const payload = {
    schema:
      "void.btc_void.atomic_settlement_terminal_binding.current_stack.v1",
    reserve_recycling_request: reserveRequest,
    journal_entries: journalEntries,
    expected_buyback_lot_plan_id: plan.buyback_lot_plan_id,
    expected_journal_decision_id: decision.decision_id,
  };
  return {
    ...payload,
    binding_id: contentId(payload),
  };
}

function settledTrace(direction = "btc_to_void") {
  const contract = makeContract(direction);
  const terminal =
    direction === "btc_to_void" ? terminalBinding(contract) : null;
  const finalEvidence =
    direction === "btc_to_void"
      ? terminal.reserve_recycling_request.settlement.source_sale_id
      : `sha256:${"8".repeat(64)}`;
  const events = [
    makeEvent(contract, "BIND_HASHLOCK", "RESERVED", "HASH_BOUND", `sha256:${"a".repeat(64)}`),
    makeEvent(contract, "OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", `sha256:${"b".repeat(64)}`),
    makeEvent(contract, "CONFIRM_SOURCE_FUNDING", "SOURCE_FUNDED", "SOURCE_CONFIRMED", `sha256:${"c".repeat(64)}`),
    makeEvent(contract, "OBSERVE_COUNTERPARTY_LOCK", "SOURCE_CONFIRMED", "COUNTERPARTY_LOCKED", `sha256:${"d".repeat(64)}`),
    makeEvent(contract, "OBSERVE_PREIMAGE_REVEAL", "COUNTERPARTY_LOCKED", "PREIMAGE_REVEALED", `sha256:${"e".repeat(64)}`),
    makeEvent(contract, "OBSERVE_BOTH_CLAIMS", "PREIMAGE_REVEALED", "BOTH_CLAIMS_OBSERVED", `sha256:${"f".repeat(64)}`),
    makeEvent(contract, "FINALIZE_SETTLEMENT", "BOTH_CLAIMS_OBSERVED", "SETTLED", finalEvidence),
  ];
  return {
    schema: "void.btc_void.atomic_settlement_trace.current_stack.v1",
    contract,
    initial_phase: "RESERVED",
    events,
    terminal_binding: terminal,
  };
}

const btcToVoid = settledTrace("btc_to_void");
const btcEvaluation = evaluateBtcVoidAtomicSettlementTraceV1(btcToVoid);
assert.equal(btcEvaluation.marker, VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1);
assert.equal(btcEvaluation.final_phase, "SETTLED");
assert.equal(btcEvaluation.terminal, true);
assert.equal(btcEvaluation.direction, "btc_to_void");
assert.match(
  btcEvaluation.execution_source_binding.source_head_sha,
  /^[0-9a-f]{40}$/u,
);
assert.match(
  btcEvaluation.execution_source_binding.source_tree_sha,
  /^[0-9a-f]{40}$/u,
);
assert.match(
  btcEvaluation.execution_source_binding.settlement_tool_git_blob_sha1,
  /^[0-9a-f]{40}$/u,
);
assert.match(
  btcEvaluation.execution_source_binding.git_executable_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.equal(
  btcEvaluation.execution_source_binding.exact_reviewed_git_object_execution,
  true,
);
assert.equal(
  btcEvaluation.execution_source_binding.private_readonly_execution_bundle,
  true,
);
assert.equal(
  btcEvaluation.execution_source_binding.git_replacement_objects_disabled,
  true,
);
for (const [relativePath, expectedBlob] of
  Object.entries(EXPECTED_EXECUTION_BLOBS)) {
  assert.equal(
    btcEvaluation.execution_source_binding.dependency_git_blobs[relativePath],
    expectedBlob,
    relativePath,
  );
}
assert.equal(
  btcEvaluation.invariants.exact_reviewed_execution_git_objects_bound,
  true,
);
assert.equal(
  btcEvaluation.invariants.reviewed_execution_loaded_before_authority_evaluation,
  true,
);
assert.equal(btcEvaluation.current_market_binding.pair, "BTC_VOID");
assert.equal(
  btcEvaluation.current_market_binding.settlement_source_domain,
  "bitcoin-mainnet",
);
assert.equal(btcEvaluation.current_market_binding.quote_unit, "satoshi");
assert.equal(
  btcEvaluation.current_market_binding.shared_market_marker,
  "VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2",
);
assert.equal(
  btcEvaluation.current_market_binding.shared_market_schema,
  "void.shared-market-post-discovery-state.v2",
);
assert.equal(
  btcEvaluation.current_market_binding.shared_market_source_git_blob_sha1,
  EXPECTED_COUPLED_BLOB,
);
assert.equal(
  btcEvaluation.current_market_binding.shared_market_v2_source_git_blob_sha1,
  EXPECTED_SHARED_V2_BLOB,
);
assert.equal(
  btcEvaluation.current_market_binding.shared_market_reconciliation_id,
  EXPECTED_RECONCILIATION_ID,
);
assert.equal(btcEvaluation.current_market_binding.chain_id, 2050);
assert.equal(btcEvaluation.current_market_binding.network_identity, "mainnet0");
assert.equal(btcEvaluation.current_market_binding.execution_epoch, 2);
assert.equal(
  btcEvaluation.current_market_binding.void_token,
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(btcEvaluation.current_market_binding.void_token_decimals, 18);
assert.equal(
  btcEvaluation.current_market_binding.btc_void_phase,
  "post_presale_unopened",
);
assert.equal(
  btcEvaluation.current_market_binding.btc_void_remains_post_presale,
  true,
);
assert.equal(btcEvaluation.current_market_binding.protocol_quote_seed_units, "0");
assert.equal(
  btcEvaluation.current_market_binding.planned_btc_void_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  btcEvaluation.current_market_binding.quote_reserve_custody_verified,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.void_reserve_custody_verified,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.inventory_funding_authority,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.market_activation_authority,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.public_presale_activation_authority,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.funds_movement_authority,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.legacy_v1_shared_market_production_authority,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.wc_void_fixed_redemption_claim_created,
  false,
);
assert.equal(
  btcEvaluation.current_market_binding.wc_void_pricing_remains_market_determined,
  true,
);
assert.equal(btcEvaluation.terminal_market_follow_on.journal_status, "CREATE");
assert.match(
  btcEvaluation.terminal_market_follow_on.buyback_lot_plan_id,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.equal(
  btcEvaluation.invariants.current_shared_market_v2_canonical_source_bound,
  true,
);
assert.equal(
  btcEvaluation.invariants.historical_v1_shared_market_authority_rejected,
  true,
);
assert.equal(
  btcEvaluation.invariants.btc_void_post_presale_unopened_required,
  true,
);
assert.equal(
  btcEvaluation.invariants
    .btc_void_inventory_funding_and_activation_authority_false,
  true,
);
assert.equal(btcEvaluation.authority.source_only_evaluation, true);
assert.equal(btcEvaluation.authority.bitcoin_regtest_executed, false);
assert.equal(btcEvaluation.authority.chain2050_execution_performed, false);
assert.equal(btcEvaluation.authority.wallet_or_signer_accessed, false);
assert.equal(btcEvaluation.authority.transaction_broadcast, false);
assert.equal(btcEvaluation.authority.market_activation_authorized, false);
assert.equal(btcEvaluation.authority.funds_moved, false);

const voidToBtc = settledTrace("void_to_btc");
const voidEvaluation = evaluateBtcVoidAtomicSettlementTraceV1(voidToBtc);
assert.equal(voidEvaluation.final_phase, "SETTLED");
assert.equal(voidEvaluation.direction, "void_to_btc");
assert.equal(voidEvaluation.terminal_market_follow_on, null);

const replay = structuredClone(btcToVoid);
replay.events.splice(1, 0, structuredClone(replay.events[0]));
const replayEvaluation = evaluateBtcVoidAtomicSettlementTraceV1(replay);
assert.deepEqual(
  replayEvaluation.applied_event_ids,
  btcEvaluation.applied_event_ids,
  "exact event replay must be idempotent",
);

const wrongPolicy = structuredClone(btcToVoid);
wrongPolicy.contract.market_policy_id = `sha256:${"0".repeat(64)}`;
{
  const { contract_id: ignored, ...payload } = wrongPolicy.contract;
  void ignored;
  wrongPolicy.contract.contract_id = contentId(payload);
  wrongPolicy.events = wrongPolicy.events.map((event) => {
    const { event_id: ignoredEvent, ...eventPayload } = event;
    void ignoredEvent;
    eventPayload.contract_id = wrongPolicy.contract.contract_id;
    return { ...eventPayload, event_id: contentId(eventPayload) };
  });
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(wrongPolicy),
  /market_policy_id/u,
);

const wrongQuote = structuredClone(btcToVoid);
wrongQuote.contract.indicative_quote_id = `sha256:${"1".repeat(64)}`;
{
  const { contract_id: ignored, ...payload } = wrongQuote.contract;
  void ignored;
  wrongQuote.contract.contract_id = contentId(payload);
  wrongQuote.events = wrongQuote.events.map((event) => {
    const { event_id: ignoredEvent, ...eventPayload } = event;
    void ignoredEvent;
    eventPayload.contract_id = wrongQuote.contract.contract_id;
    return { ...eventPayload, event_id: contentId(eventPayload) };
  });
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(wrongQuote),
  /indicative_quote_id/u,
);

const wrongAmount = structuredClone(btcToVoid);
wrongAmount.contract.bitcoin_amount_satoshis = "999999";
{
  const { contract_id: ignored, ...payload } = wrongAmount.contract;
  void ignored;
  wrongAmount.contract.contract_id = contentId(payload);
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(wrongAmount),
  /Bitcoin amount does not match current quote/u,
);

const missingTerminalBinding = structuredClone(btcToVoid);
missingTerminalBinding.terminal_binding = null;
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(missingTerminalBinding),
  /requires terminal_binding/u,
);

const wrongFinalEvidence = structuredClone(btcToVoid);
{
  const last = wrongFinalEvidence.events.at(-1);
  last.evidence_id = `sha256:${"9".repeat(64)}`;
  const { event_id: ignored, ...payload } = last;
  void ignored;
  last.event_id = contentId(payload);
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(wrongFinalEvidence),
  /FINALIZE_SETTLEMENT evidence/u,
);

const wrongJournalId = structuredClone(btcToVoid);
wrongJournalId.terminal_binding.expected_journal_decision_id =
  `sha256:${"2".repeat(64)}`;
{
  const { binding_id: ignored, ...payload } = wrongJournalId.terminal_binding;
  void ignored;
  wrongJournalId.terminal_binding.binding_id = contentId(payload);
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(wrongJournalId),
  /journal decision identity mismatch/u,
);

const refundContract = makeContract("btc_to_void");
const refundTrace = {
  schema: "void.btc_void.atomic_settlement_trace.current_stack.v1",
  contract: refundContract,
  initial_phase: "RESERVED",
  events: [
    makeEvent(refundContract, "BIND_HASHLOCK", "RESERVED", "HASH_BOUND", `sha256:${"a".repeat(64)}`),
    makeEvent(refundContract, "OBSERVE_SOURCE_FUNDING", "HASH_BOUND", "SOURCE_FUNDED", `sha256:${"b".repeat(64)}`),
    makeEvent(refundContract, "CONFIRM_SOURCE_FUNDING", "SOURCE_FUNDED", "SOURCE_CONFIRMED", `sha256:${"c".repeat(64)}`),
    makeEvent(refundContract, "OBSERVE_COUNTERPARTY_LOCK", "SOURCE_CONFIRMED", "COUNTERPARTY_LOCKED", `sha256:${"d".repeat(64)}`),
    makeEvent(refundContract, "OBSERVE_COUNTERPARTY_REFUND", "COUNTERPARTY_LOCKED", "REFUND_PENDING_SOURCE", `sha256:${"e".repeat(64)}`),
    makeEvent(refundContract, "OBSERVE_SOURCE_REFUND", "REFUND_PENDING_SOURCE", "REFUNDED", `sha256:${"f".repeat(64)}`),
  ],
  terminal_binding: null,
};
const refundEvaluation =
  evaluateBtcVoidAtomicSettlementTraceV1(refundTrace);
assert.equal(refundEvaluation.final_phase, "REFUNDED");

const badRefundRole = structuredClone(refundTrace);
{
  const last = badRefundRole.events.at(-1);
  last.refund_asset_role = "COUNTERPARTY_NATIVE_VOID";
  const { event_id: ignored, ...payload } = last;
  void ignored;
  last.event_id = contentId(payload);
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(badRefundRole),
  /refund_asset_role mismatch/u,
);

const reusedEvidence = structuredClone(refundTrace);
{
  reusedEvidence.events[1].evidence_id = reusedEvidence.events[0].evidence_id;
  const { event_id: ignored, ...payload } = reusedEvidence.events[1];
  void ignored;
  reusedEvidence.events[1].event_id = contentId(payload);
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(reusedEvidence),
  /reuses evidence_id/u,
);

const reopened = structuredClone(btcToVoid);
reopened.events.push(
  makeEvent(
    reopened.contract,
    "HOLD",
    "SETTLED",
    "HELD",
    `sha256:${"0".repeat(64)}`,
  ),
);
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(reopened),
  /attempts to reopen terminal phase SETTLED/u,
);

const staleDirection = structuredClone(btcToVoid);
staleDirection.contract.direction = "BTC_TO_VOID";
{
  const { contract_id: ignored, ...payload } = staleDirection.contract;
  void ignored;
  staleDirection.contract.contract_id = contentId(payload);
}
assert.throws(
  () => evaluateBtcVoidAtomicSettlementTraceV1(staleDirection),
  /contract direction mismatch/u,
);

const source = fs.readFileSync(
  "tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs",
  "utf8",
);
assert.equal(
  source.includes("void-shared-market-post-discovery-state-v1.mjs"),
  false,
);
assert.equal(
  source.includes("void-shared-market-post-discovery-state-v2.mjs"),
  true,
);
assert.equal(source.includes(EXPECTED_COUPLED_BLOB), true);
assert.equal(source.includes(EXPECTED_SHARED_V2_BLOB), true);
assert.equal(source.includes("post_presale_unopened"), true);
assert.equal(
  source.includes('from "./void-btc-void-quote-math-v1.mjs"'),
  false,
);
assert.equal(
  source.includes('from "./void-btc-void-market-maker-reserve-policy-v1.mjs"'),
  false,
);
assert.equal(
  source.includes('from "./void-btc-void-buyback-lot-journal-transition-v1.mjs"'),
  false,
);
assert.equal(
  source.includes('from "./void-btc-void-bounded-stdin-v1.mjs"'),
  false,
);
assert.equal(source.includes('"--no-replace-objects"'), true);
assert.equal(source.includes("materializeReviewedExecutionBundleV1"), true);
assert.equal(source.includes("private_readonly_execution_bundle"), true);

function assertFreshEvaluatorRejectsDirtySource(relativePath, label) {
  const original = fs.readFileSync(relativePath);
  try {
    fs.writeFileSync(
      relativePath,
      Buffer.concat([original, Buffer.from(" ", "utf8")]),
    );
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(new URL("../tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs", import.meta.url).href)}).then(()=>process.exit(0)).catch((error)=>{console.error(String(error?.message||error));process.exit(22);});`,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      },
    );
    assert.notEqual(child.status, 0, label);
    assert.match(
      String(child.stdout || "") + String(child.stderr || ""),
      /reviewed source repository must be clean|reviewed worktree source mismatch/u,
      label,
    );
  } finally {
    fs.writeFileSync(relativePath, original);
  }
}

assertFreshEvaluatorRejectsDirtySource(
  COUPLED_CANDIDATE,
  "dirty coupled candidate must fail before evaluator load",
);
assertFreshEvaluatorRejectsDirtySource(
  SHARED_V2_SOURCE,
  "dirty shared-market v2 source must fail before evaluator load",
);

{
  const original = fs.readFileSync(QUOTE_SOURCE);
  const sentinel = join(
    os.tmpdir(),
    `void-btc-void-unreviewed-quote-executed-${process.pid}`,
  );
  try {
    fs.rmSync(sentinel, { force: true });
    const malicious = Buffer.concat([
      Buffer.from(
        `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(sentinel)}, "executed\\n");\n`,
        "utf8",
      ),
      original,
    ]);
    fs.writeFileSync(QUOTE_SOURCE, malicious);
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(new URL("../tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs", import.meta.url).href)}).then(()=>process.exit(0)).catch((error)=>{console.error(String(error?.message||error));process.exit(23);});`,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      },
    );
    assert.notEqual(child.status, 0);
    assert.match(
      String(child.stdout || "") + String(child.stderr || ""),
      /reviewed source repository must be clean|reviewed worktree source mismatch/u,
    );
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "dirty quote module executed before provenance rejection",
    );
  } finally {
    fs.writeFileSync(QUOTE_SOURCE, original);
    fs.rmSync(sentinel, { force: true });
  }
}

{
  const temp = fs.mkdtempSync(
    join(os.tmpdir(), "void-btc-void-hostile-git-env-"),
  );
  const fakeBin = join(temp, "bin");
  const sentinel = join(temp, "fake-git-invoked");
  fs.mkdirSync(fakeBin);
  const fakeGit = join(fakeBin, "git");
  fs.writeFileSync(
    fakeGit,
    "#!/bin/sh\nprintf 'invoked\\n' >> " +
      JSON.stringify(sentinel) +
      "\nexit 91\n",
    { mode: 0o755 },
  );
  try {
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(new URL("../tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs", import.meta.url).href)}).then(()=>process.exit(0)).catch((error)=>{console.error(String(error?.message||error));process.exit(24);});`,
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PATH: fakeBin,
          GIT_DIR: join(temp, "fake.git"),
          GIT_OBJECT_DIRECTORY: join(temp, "objects"),
          GIT_ALTERNATE_OBJECT_DIRECTORIES: join(temp, "alternates"),
          GIT_CONFIG_COUNT: "1",
          GIT_CONFIG_KEY_0: "core.abbrev",
          GIT_CONFIG_VALUE_0: "1",
          GIT_EXEC_PATH: fakeBin,
        },
      },
    );
    assert.equal(
      child.status,
      0,
      String(child.stdout || "") + String(child.stderr || ""),
    );
    assert.equal(fs.existsSync(sentinel), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

await proveBtcVoidBoundedStdinV1({
  cliPath: resolve(
    "tools/void-btc-void-atomic-settlement-state-invariants-v1.mjs",
  ),
  validInput: JSON.stringify(btcToVoid),
  holdMarker: `${VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1}_HOLD`,
});

console.log(MARKER);
console.log("current_quote_identity_rederived=true");
console.log("exact_reviewed_execution_git_objects_bound=true");
console.log("private_readonly_execution_bundle=true");
console.log("dirty_execution_source_rejected_before_load=true");
console.log("hostile_git_environment_ignored=true");
console.log("current_shared_market_policy_bound=true");
console.log("current_shared_market_v2_canonical_source_bound=true");
console.log("shared_market_v2_source_drift_rejected=true");
console.log("canonical_coupled_candidate_drift_rejected=true");
console.log("historical_shared_market_v1_production_authority=false");
console.log("btc_void_phase=post_presale_unopened");
console.log("btc_void_inventory_funding_authority=false");
console.log("btc_void_market_activation_authority=false");
console.log("current_reserve_policy_rederived=true");
console.log("current_buyback_journal_decision_rederived=true");
console.log("exact_event_replay_idempotent=true");
console.log("terminal_reopen_rejected=true");
console.log("role_bound_refund_evidence=true");
console.log("bounded_stdin_idle_and_total_deadlines=true");
console.log("wc_void_fixed_redemption_introduced=false");
console.log("bitcoin_regtest_execution=false");
console.log("chain2050_execution=false");
console.log("inventory_mutation=false");
console.log("liquidity_action=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("treasury_action=false");
console.log("market_activation=false");
console.log("funds_movement=false");
