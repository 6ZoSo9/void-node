import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Transaction, Wallet } from "ethers";

import {
  VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1,
  VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1,
  VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_EVIDENCE_V1,
  VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_INCIDENT_V1,
  VoidPrivateChain2050EconomicRecoveryHoldV1,
  buildEconomicRecoveryCandidatePlanForPolicyV1,
  buildVoidPrivateChain2050EconomicRecoveryCandidatePlanV1,
  reconstructSignedType2TransactionV1,
} from "../tools/void-private-chain2050-economic-recovery-contract-v1.mjs";

const PROOF = "VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1_PROOF_GREEN";
const stateSha = "a".repeat(64);
const candidateRoot = path.join(
  os.tmpdir(),
  "void-chain2050-economic-recovery-candidate-v1",
  "proof-only",
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectHold(fn, reason) {
  assert.throws(
    fn,
    (error) => error instanceof VoidPrivateChain2050EconomicRecoveryHoldV1 &&
      error.reason === reason,
  );
}

function transactionEvidence(raw, blockNumber) {
  const transaction = Transaction.from(raw);
  assert.ok(transaction.signature);
  return {
    block_number: blockNumber,
    expected_transaction_hash: String(transaction.hash).toLowerCase(),
    expected_from_address: String(transaction.from).toLowerCase(),
    type: 2,
    chain_id: String(transaction.chainId),
    nonce: String(transaction.nonce),
    max_priority_fee_per_gas: String(transaction.maxPriorityFeePerGas),
    max_fee_per_gas: String(transaction.maxFeePerGas),
    gas_limit: String(transaction.gasLimit),
    to: transaction.to.toLowerCase(),
    value: String(transaction.value),
    data: transaction.data,
    access_list: transaction.accessList.map((entry) => ({
      address: entry.address,
      storage_keys: [...entry.storageKeys],
    })),
    signature: {
      r: transaction.signature.r,
      s: transaction.signature.s,
      y_parity: transaction.signature.yParity,
    },
  };
}

function completeHeader(blockNumber) {
  return {
    block_number: blockNumber,
    status: "complete",
    block_hash: `0x${blockNumber.toString(16).padStart(64, "0")}`,
    parent_hash: `0x${(blockNumber - 1).toString(16).padStart(64, "0")}`,
    timestamp: String(1_800_000_000 + blockNumber),
    mix_hash: `0x${(blockNumber + 1).toString(16).padStart(64, "0")}`,
    parent_header_sha256: blockNumber.toString(16).padStart(64, "0"),
    guessed_values: false,
  };
}

const wallet = Wallet.createRandom();
const blocks = [37368, 37369, 37370, 37371];
const transactions = [];
for (let index = 0; index < blocks.length; index += 1) {
  const raw = await wallet.signTransaction({
    type: 2,
    chainId: 2050,
    nonce: index,
    to: `0x${String(index + 2).repeat(40)}`,
    value: BigInt(index + 1),
    gasLimit: 21_000n,
    maxFeePerGas: 100n,
    maxPriorityFeePerGas: 2n,
    data: "0x",
    accessList: [],
  });
  transactions.push(transactionEvidence(raw, blocks[index]));
}

const incident = {
  ...VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_INCIDENT_V1,
  transaction_hashes: transactions.map((transaction) =>
    transaction.expected_transaction_hash),
  confirmed_delivery_transaction_hash: transactions[2].expected_transaction_hash,
};
const evidence = {
  marker: VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_EVIDENCE_V1,
  version: 1,
  chain_id: "2050",
  durable_ancestor: {
    block_number: 37367,
    block_hash: VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_INCIDENT_V1
      .durable_ancestor_block_hash,
    state_materialization_sha256: stateSha,
  },
  transactions,
  headers: [
    completeHeader(37368),
    {
      block_number: 37369,
      status: "missing",
      known_block_hash: `0x${"b".repeat(64)}`,
      mix_hash: `0x${"c".repeat(64)}`,
      parent_header_sha256: "d".repeat(64),
      missing_fields: ["timestamp"],
      guessed_values: false,
    },
    completeHeader(37370),
    completeHeader(37371),
  ],
};
const request = {
  evidence,
  candidate: {
    candidate_root: candidateRoot,
    candidate_port: "18545",
    state_copy_sha256: stateSha,
  },
};

const plan = buildEconomicRecoveryCandidatePlanForPolicyV1(request, incident);
assert.equal(plan.marker, VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1);
assert.equal(plan.outcome, "ECONOMIC_STATE_CANDIDATE_PLAN_READY");
assert.equal(plan.historical_replay_inputs_complete, false);
assert.equal(plan.bit_identical_replay_verified, false);
assert.equal(plan.exact_historical_branch_reproduction, false);
assert.equal(plan.economically_equivalent_candidate_only, true);
assert.equal(plan.execution_authorized, false);
assert.equal(plan.execution_performed, false);
assert.equal(plan.confirmed_delivery.fulfillment_retry_forbidden, true);
assert.equal(plan.candidate.production_8545, false);
assert.equal(plan.transactions.length, 4);
assert.equal(plan.headers[1].mix_hash, evidence.headers[1].mix_hash);
assert.equal(
  plan.headers[1].parent_header_sha256,
  evidence.headers[1].parent_header_sha256,
);
assert.equal("raw_signed_transaction" in plan.transactions[0], false);
assert.match(plan.transactions[0].raw_signed_transaction_sha256, /^[0-9a-f]{64}$/);
assert.match(plan.recovery_plan_id_sha256, /^[0-9a-f]{64}$/);

const exactEvidence = clone(evidence);
exactEvidence.headers[1] = completeHeader(37369);
const exactPlan = buildEconomicRecoveryCandidatePlanForPolicyV1(
  { ...request, evidence: exactEvidence },
  incident,
);
assert.equal(exactPlan.outcome, "HISTORICAL_REPLAY_INPUTS_READY");
assert.equal(exactPlan.historical_replay_inputs_complete, true);
assert.equal(exactPlan.bit_identical_replay_verified, false);
assert.equal(exactPlan.exact_historical_branch_reproduction, false);
assert.equal(exactPlan.economically_equivalent_candidate_only, false);
assert.equal(exactPlan.execution_authorized, false);
assert.equal(exactPlan.headers[1].block_hash, exactEvidence.headers[1].block_hash);
assert.equal(exactPlan.headers[1].timestamp, exactEvidence.headers[1].timestamp);

const changedCompleteHeader = clone(exactEvidence);
changedCompleteHeader.headers[1].timestamp = String(
  Number(changedCompleteHeader.headers[1].timestamp) + 1,
);
const changedCompleteHeaderPlan = buildEconomicRecoveryCandidatePlanForPolicyV1(
  { ...request, evidence: changedCompleteHeader },
  incident,
);
assert.notEqual(
  changedCompleteHeaderPlan.recovery_plan_id_sha256,
  exactPlan.recovery_plan_id_sha256,
);

const changedKnownMissingHeaderContext = clone(evidence);
changedKnownMissingHeaderContext.headers[1].mix_hash = `0x${"e".repeat(64)}`;
const changedKnownMissingHeaderContextPlan = buildEconomicRecoveryCandidatePlanForPolicyV1(
  { ...request, evidence: changedKnownMissingHeaderContext },
  incident,
);
assert.notEqual(
  changedKnownMissingHeaderContextPlan.recovery_plan_id_sha256,
  plan.recovery_plan_id_sha256,
);

const reconstructed = reconstructSignedType2TransactionV1(transactions[0]);
assert.equal(reconstructed.transaction_hash, transactions[0].expected_transaction_hash);
assert.equal("raw_signed_transaction" in reconstructed, false);

const tamperedHash = clone(transactions[0]);
tamperedHash.expected_transaction_hash = `0x${"f".repeat(64)}`;
expectHold(
  () => reconstructSignedType2TransactionV1(tamperedHash),
  "signed_transaction_hash_mismatch",
);
const tamperedSender = clone(transactions[0]);
tamperedSender.expected_from_address = `0x${"f".repeat(40)}`;
expectHold(
  () => reconstructSignedType2TransactionV1(tamperedSender),
  "signed_transaction_sender_mismatch",
);
const unrelatedRaw = await wallet.signTransaction({
  type: 2,
  chainId: 2050,
  nonce: 99,
  to: `0x${"9".repeat(40)}`,
  value: 99n,
  gasLimit: 21_000n,
  maxFeePerGas: 100n,
  maxPriorityFeePerGas: 2n,
  data: "0x",
  accessList: [],
});
const wrongHistoricalTransaction = clone(evidence);
wrongHistoricalTransaction.transactions[0] = transactionEvidence(unrelatedRaw, 37368);
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1(
    { ...request, evidence: wrongHistoricalTransaction },
    incident,
  ),
  "transaction_historical_inclusion_binding_mismatch",
);
const outOfOrder = clone(evidence);
[outOfOrder.transactions[0], outOfOrder.transactions[1]] =
  [outOfOrder.transactions[1], outOfOrder.transactions[0]];
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1(
    { ...request, evidence: outOfOrder },
    incident,
  ),
  "transaction_block_sequence_invalid",
);
const guessed = clone(evidence);
guessed.headers[1].guessed_values = true;
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1(
    { ...request, evidence: guessed },
    incident,
  ),
  "header_guessed_values_forbidden",
);
const hiddenMissingField = clone(evidence);
hiddenMissingField.headers[1].missing_fields = ["timestamp", "mix_hash"];
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1(
    { ...request, evidence: hiddenMissingField },
    incident,
  ),
  "header_37369_missing_fields_must_be_explicit",
);
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1({
    ...request,
    candidate: { ...request.candidate, candidate_port: "8545" },
  }, incident),
  "candidate_port_not_isolated",
);
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1({
    ...request,
    candidate: { ...request.candidate, candidate_root: path.join(os.tmpdir(), "unsafe") },
  }, incident),
  "candidate_root_not_disposable_or_unique",
);
expectHold(
  () => buildEconomicRecoveryCandidatePlanForPolicyV1({
    ...request,
    candidate: { ...request.candidate, state_copy_sha256: "c".repeat(64) },
  }, incident),
  "candidate_state_copy_binding_mismatch",
);
expectHold(
  () => buildVoidPrivateChain2050EconomicRecoveryCandidatePlanV1(request),
  "transaction_historical_inclusion_binding_mismatch",
);

assert.equal(
  VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1
    .confirmed_delivery_must_never_be_fulfilled_again,
  true,
);
assert.equal(VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1.production_rpc_call, false);
assert.equal(VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1.process_execution, false);
assert.equal(VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1.signing, false);
assert.equal(VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1.broadcast, false);
assert.equal(VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1.automatic_retry, false);

const source = fs.readFileSync(
  new URL("../tools/void-private-chain2050-economic-recovery-contract-v1.mjs", import.meta.url),
  "utf8",
);
for (const forbidden of [
  "child_process",
  "execSync",
  "spawnSync",
  "eth_sendRawTransaction",
  "http.request",
  "https.request",
  "writeFileSync",
  "mkdirSync",
  "rmSync",
]) {
  assert.equal(source.includes(forbidden), false, `forbidden capability present: ${forbidden}`);
}

console.log(JSON.stringify({
  marker: PROOF,
  signed_transaction_hash_binding: true,
  historical_transaction_inclusion_pinned: true,
  complete_header_values_bound_to_plan: true,
  exact_reproduction_claim_requires_replay: true,
  missing_37369_known_context_bound: true,
  confirmed_delivery_retry_forbidden: true,
  production_8545_forbidden: true,
  disposable_candidate_root_required: true,
  raw_signed_transaction_disclosed: false,
  execution_authorized: false,
  execution_performed: false,
  production_rpc_calls: 0,
  wallet_or_credential_reads: 0,
  money_movement: false,
}));
