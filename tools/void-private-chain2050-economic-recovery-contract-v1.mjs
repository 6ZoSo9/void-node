import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Transaction, getAddress, keccak256 } from "ethers";

export const VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1 =
  "VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1";
export const VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_EVIDENCE_V1 =
  "VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_EVIDENCE_V1";

export const VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_INCIDENT_V1 = Object.freeze({
  chain_id: 2050,
  durable_ancestor_block_number: 37367,
  durable_ancestor_block_hash:
    "0x97b6cc60e4f909d2ecfbe62c506cb8e921368a35abcac987be97ad067fed48f3",
  transaction_block_numbers: Object.freeze([37368, 37369, 37370, 37371]),
  confirmed_delivery_block_number: 37370,
  confirmed_delivery_transaction_hash:
    "0x4557801a27c6c47e032d0a4b599c2d01a76b407638fd87e6f129f8aef13f6ac6",
});

export const VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1 = Object.freeze({
  source_only_contract: true,
  offline_evidence_only: true,
  signed_transaction_reconstruction_only: true,
  raw_signed_transaction_output: false,
  raw_signed_transaction_persistence: false,
  candidate_root_must_be_disposable_os_temp: true,
  candidate_port_must_not_be_8545: true,
  complete_headers_only_prepare_historical_replay_inputs: true,
  exact_historical_branch_claim_requires_bit_identical_replay: true,
  confirmed_delivery_must_never_be_fulfilled_again: true,
  production_rpc_call: false,
  production_state_mutation: false,
  process_execution: false,
  service_mutation: false,
  selector_mutation: false,
  checkpoint_publication: false,
  wallet_access: false,
  credential_access: false,
  signing: false,
  broadcast: false,
  automatic_retry: false,
  money_movement: false,
  execution_requires_separate_zoso_authorization: true,
});

const HASH = /^0x[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const DATA = /^0x(?:[0-9a-f]{2})*$/;
const UINT256_MAX = (1n << 256n) - 1n;
const REQUIRED_37369_MISSING_FIELDS = Object.freeze([
  "timestamp",
]);

export class VoidPrivateChain2050EconomicRecoveryHoldV1 extends Error {
  constructor(reason) {
    super(reason);
    this.name = "VoidPrivateChain2050EconomicRecoveryHoldV1";
    this.reason = reason;
  }
}

function hold(reason) {
  throw new VoidPrivateChain2050EconomicRecoveryHoldV1(reason);
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label}_object_required`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    hold(`${label}_prototype_invalid`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const observed = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    hold(`${label}_keys_invalid`);
  }
}

function hash(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!HASH.test(normalized)) hold(`${label}_invalid`);
  return normalized;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256HexBytes(value) {
  return crypto.createHash("sha256").update(Buffer.from(value.slice(2), "hex")).digest("hex");
}

function sha256Value(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!SHA256.test(normalized)) hold(`${label}_invalid`);
  return normalized;
}

function decimal(value, label, { allowZero = true, maximum = UINT256_MAX } = {}) {
  const raw = String(value ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) hold(`${label}_invalid`);
  const parsed = BigInt(raw);
  if ((!allowZero && parsed === 0n) || parsed > maximum) hold(`${label}_invalid`);
  return parsed;
}

function safeNumber(value, label) {
  const parsed = decimal(value, label, { maximum: BigInt(Number.MAX_SAFE_INTEGER) });
  return Number(parsed);
}

function address(value, label) {
  try {
    return getAddress(String(value ?? "")).toLowerCase();
  } catch {
    hold(`${label}_invalid`);
  }
}

function data(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!DATA.test(normalized)) hold(`${label}_invalid`);
  return normalized;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function normalizeAccessList(value, label) {
  if (!Array.isArray(value)) hold(`${label}_array_required`);
  return value.map((entry, index) => {
    const object = plainObject(entry, `${label}_${index}`);
    exactKeys(object, ["address", "storage_keys"], `${label}_${index}`);
    if (!Array.isArray(object.storage_keys)) hold(`${label}_${index}_storage_keys_invalid`);
    return {
      address: address(object.address, `${label}_${index}_address`),
      storageKeys: object.storage_keys.map((key, keyIndex) =>
        hash(key, `${label}_${index}_storage_key_${keyIndex}`)),
    };
  });
}

export function reconstructSignedType2TransactionV1(input) {
  const tx = plainObject(input, "transaction");
  exactKeys(tx, [
    "access_list",
    "block_number",
    "chain_id",
    "data",
    "expected_from_address",
    "expected_transaction_hash",
    "gas_limit",
    "max_fee_per_gas",
    "max_priority_fee_per_gas",
    "nonce",
    "signature",
    "to",
    "type",
    "value",
  ], "transaction");
  if (tx.type !== 2) hold("transaction_type_must_be_2");
  const chainId = safeNumber(tx.chain_id, "transaction_chain_id");
  const blockNumber = safeNumber(tx.block_number, "transaction_block_number");
  const expectedHash = hash(tx.expected_transaction_hash, "expected_transaction_hash");
  const expectedFrom = address(tx.expected_from_address, "expected_from_address");
  const signature = plainObject(tx.signature, "transaction_signature");
  exactKeys(signature, ["r", "s", "y_parity"], "transaction_signature");
  const yParity = safeNumber(signature.y_parity, "transaction_signature_y_parity");
  if (yParity !== 0 && yParity !== 1) hold("transaction_signature_y_parity_invalid");
  const to = tx.to === null ? null : address(tx.to, "transaction_to");
  let transaction;
  try {
    transaction = Transaction.from({
      type: 2,
      chainId,
      nonce: safeNumber(tx.nonce, "transaction_nonce"),
      maxPriorityFeePerGas: decimal(
        tx.max_priority_fee_per_gas,
        "transaction_max_priority_fee_per_gas",
      ),
      maxFeePerGas: decimal(tx.max_fee_per_gas, "transaction_max_fee_per_gas"),
      gasLimit: decimal(tx.gas_limit, "transaction_gas_limit", { allowZero: false }),
      to,
      value: decimal(tx.value, "transaction_value"),
      data: data(tx.data, "transaction_data"),
      accessList: normalizeAccessList(tx.access_list, "transaction_access_list"),
      signature: {
        r: hash(signature.r, "transaction_signature_r"),
        s: hash(signature.s, "transaction_signature_s"),
        yParity,
      },
    });
  } catch {
    hold("signed_transaction_reconstruction_invalid");
  }
  const raw = transaction.serialized.toLowerCase();
  const reconstructedHash = keccak256(raw).toLowerCase();
  const parsed = Transaction.from(raw);
  if (reconstructedHash !== expectedHash || String(parsed.hash).toLowerCase() !== expectedHash) {
    hold("signed_transaction_hash_mismatch");
  }
  if (Number(parsed.chainId) !== chainId || parsed.type !== 2) {
    hold("signed_transaction_chain_or_type_mismatch");
  }
  if (String(parsed.from ?? "").toLowerCase() !== expectedFrom) {
    hold("signed_transaction_sender_mismatch");
  }
  return Object.freeze({
    block_number: blockNumber,
    transaction_hash: reconstructedHash,
    raw_signed_transaction_sha256: sha256HexBytes(raw),
    raw_signed_transaction_bytes: (raw.length - 2) / 2,
  });
}

function validateHeaderContext(input, expectedBlockNumber) {
  const header = plainObject(input, `header_${expectedBlockNumber}`);
  if (header.status === "complete") {
    exactKeys(header, [
      "block_hash",
      "block_number",
      "guessed_values",
      "mix_hash",
      "parent_hash",
      "parent_header_sha256",
      "status",
      "timestamp",
    ], `header_${expectedBlockNumber}`);
    if (header.guessed_values !== false) hold("header_guessed_values_forbidden");
    if (safeNumber(header.block_number, "header_block_number") !== expectedBlockNumber) {
      hold("header_block_number_mismatch");
    }
    return Object.freeze({
      block_number: expectedBlockNumber,
      status: "complete",
      block_hash: hash(header.block_hash, "header_block_hash"),
      parent_hash: hash(header.parent_hash, "header_parent_hash"),
      timestamp: decimal(header.timestamp, "header_timestamp", { allowZero: false }).toString(),
      mix_hash: hash(header.mix_hash, "header_mix_hash"),
      parent_header_sha256: sha256Value(
        header.parent_header_sha256,
        "header_parent_header_sha256",
      ),
      guessed_values: false,
    });
  }
  if (header.status === "missing") {
    exactKeys(header, [
      "block_number",
      "guessed_values",
      "known_block_hash",
      "missing_fields",
      "status",
    ], `header_${expectedBlockNumber}`);
    if (header.guessed_values !== false) hold("header_guessed_values_forbidden");
    if (safeNumber(header.block_number, "header_block_number") !== expectedBlockNumber) {
      hold("header_block_number_mismatch");
    }
    hash(header.known_block_hash, "header_known_block_hash");
    if (!Array.isArray(header.missing_fields) || header.missing_fields.length === 0) {
      hold("header_missing_fields_invalid");
    }
    const missingFields = [...new Set(header.missing_fields.map(String))].sort();
    if (expectedBlockNumber === 37369 &&
        JSON.stringify(missingFields) !== JSON.stringify(REQUIRED_37369_MISSING_FIELDS)) {
      hold("header_37369_missing_fields_must_be_explicit");
    }
    return Object.freeze({
      block_number: expectedBlockNumber,
      status: "missing",
      known_block_hash: hash(header.known_block_hash, "header_known_block_hash"),
      missing_fields: Object.freeze(missingFields),
      guessed_values: false,
    });
  }
  hold("header_status_invalid");
}

function normalizeIncidentPolicy(input) {
  const incident = plainObject(input, "incident_policy");
  const blocks = incident.transaction_block_numbers;
  if (!Array.isArray(blocks) || blocks.length !== 4 ||
      blocks.some((block, index) => !Number.isSafeInteger(block) || (index && block !== blocks[index - 1] + 1))) {
    hold("incident_transaction_block_sequence_invalid");
  }
  const confirmedBlock = Number(incident.confirmed_delivery_block_number);
  if (!blocks.includes(confirmedBlock)) hold("incident_confirmed_delivery_block_invalid");
  return {
    chain_id: Number(incident.chain_id),
    durable_ancestor_block_number: Number(incident.durable_ancestor_block_number),
    durable_ancestor_block_hash: hash(
      incident.durable_ancestor_block_hash,
      "incident_durable_ancestor_block_hash",
    ),
    transaction_block_numbers: [...blocks],
    confirmed_delivery_block_number: confirmedBlock,
    confirmed_delivery_transaction_hash: hash(
      incident.confirmed_delivery_transaction_hash,
      "incident_confirmed_delivery_transaction_hash",
    ),
  };
}

export function buildEconomicRecoveryCandidatePlanForPolicyV1(input, incidentInput) {
  const request = plainObject(input, "recovery_request");
  exactKeys(request, ["candidate", "evidence"], "recovery_request");
  const incident = normalizeIncidentPolicy(incidentInput);
  const evidence = plainObject(request.evidence, "evidence");
  exactKeys(evidence, [
    "chain_id",
    "durable_ancestor",
    "headers",
    "marker",
    "transactions",
    "version",
  ], "evidence");
  if (evidence.marker !== VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_EVIDENCE_V1 ||
      evidence.version !== 1) hold("evidence_marker_or_version_invalid");
  if (safeNumber(evidence.chain_id, "evidence_chain_id") !== incident.chain_id) {
    hold("evidence_chain_id_mismatch");
  }
  const ancestor = plainObject(evidence.durable_ancestor, "durable_ancestor");
  exactKeys(ancestor, ["block_hash", "block_number", "state_materialization_sha256"], "durable_ancestor");
  if (safeNumber(ancestor.block_number, "durable_ancestor_block_number") !==
      incident.durable_ancestor_block_number) hold("durable_ancestor_block_number_mismatch");
  if (hash(ancestor.block_hash, "durable_ancestor_block_hash") !==
      incident.durable_ancestor_block_hash) hold("durable_ancestor_block_hash_mismatch");
  const stateMaterializationSha256 = sha256Value(
    ancestor.state_materialization_sha256,
    "durable_ancestor_state_materialization_sha256",
  );
  if (!Array.isArray(evidence.transactions) ||
      evidence.transactions.length !== incident.transaction_block_numbers.length) {
    hold("transaction_sequence_length_invalid");
  }
  const reconstructed = evidence.transactions.map((transaction, index) => {
    const result = reconstructSignedType2TransactionV1(transaction);
    if (result.block_number !== incident.transaction_block_numbers[index]) {
      hold("transaction_block_sequence_invalid");
    }
    if (safeNumber(transaction.chain_id, "transaction_chain_id") !== incident.chain_id) {
      hold("transaction_chain_id_mismatch");
    }
    return result;
  });
  const confirmedIndex = incident.transaction_block_numbers.indexOf(
    incident.confirmed_delivery_block_number,
  );
  if (reconstructed[confirmedIndex].transaction_hash !==
      incident.confirmed_delivery_transaction_hash) {
    hold("confirmed_delivery_transaction_binding_mismatch");
  }
  if (!Array.isArray(evidence.headers) ||
      evidence.headers.length !== incident.transaction_block_numbers.length) {
    hold("header_sequence_length_invalid");
  }
  const headers = evidence.headers.map((header, index) =>
    validateHeaderContext(header, incident.transaction_block_numbers[index]));
  const historicalReplayInputsComplete = headers.every((header) => header.status === "complete");

  const candidate = plainObject(request.candidate, "candidate");
  exactKeys(candidate, ["candidate_port", "candidate_root", "state_copy_sha256"], "candidate");
  const candidatePort = safeNumber(candidate.candidate_port, "candidate_port");
  if (candidatePort < 1024 || candidatePort > 65535 || candidatePort === 8545) {
    hold("candidate_port_not_isolated");
  }
  if (!path.isAbsolute(candidate.candidate_root)) hold("candidate_root_must_be_absolute");
  const candidateRoot = path.resolve(candidate.candidate_root);
  const requiredRoot = path.resolve(
    os.tmpdir(),
    "void-chain2050-economic-recovery-candidate-v1",
  );
  const relative = path.relative(requiredRoot, candidateRoot);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    hold("candidate_root_not_disposable_or_unique");
  }
  if (sha256Value(candidate.state_copy_sha256, "candidate_state_copy_sha256") !==
      stateMaterializationSha256) hold("candidate_state_copy_binding_mismatch");

  const planCore = {
    marker: VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1,
    version: 1,
    outcome: historicalReplayInputsComplete
      ? "HISTORICAL_REPLAY_INPUTS_READY"
      : "ECONOMIC_STATE_CANDIDATE_PLAN_READY",
    chain_id: String(incident.chain_id),
    durable_ancestor: {
      block_number: incident.durable_ancestor_block_number,
      block_hash: incident.durable_ancestor_block_hash,
      state_materialization_sha256: stateMaterializationSha256,
    },
    transactions: reconstructed,
    headers,
    confirmed_delivery: {
      block_number: incident.confirmed_delivery_block_number,
      transaction_hash: incident.confirmed_delivery_transaction_hash,
      fulfillment_already_confirmed: true,
      fulfillment_retry_forbidden: true,
    },
    candidate: {
      root_sha256: sha256Text(candidateRoot),
      port: candidatePort,
      disposable: true,
      production_8545: false,
    },
    historical_replay_inputs_complete: historicalReplayInputsComplete,
    bit_identical_replay_verified: false,
    exact_historical_branch_reproduction: false,
    economically_equivalent_candidate_only: !historicalReplayInputsComplete,
    execution_authorized: false,
    execution_performed: false,
    authority: VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_AUTHORITY_V1,
  };
  return Object.freeze({
    ...planCore,
    recovery_plan_id_sha256: sha256Text(stableJson(planCore)),
  });
}

export function buildVoidPrivateChain2050EconomicRecoveryCandidatePlanV1(input) {
  return buildEconomicRecoveryCandidatePlanForPolicyV1(
    input,
    VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_INCIDENT_V1,
  );
}

function parseArgs(argv) {
  const out = { evidence: "", candidateRoot: "", candidatePort: "", stateCopySha256: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--help") return { help: true };
    if (!value || value.startsWith("--")) hold(`argument_value_missing_${key}`);
    if (key === "--evidence") out.evidence = value;
    else if (key === "--candidate-root") out.candidateRoot = value;
    else if (key === "--candidate-port") out.candidatePort = value;
    else if (key === "--state-copy-sha256") out.stateCopySha256 = value;
    else hold(`argument_unknown_${key}`);
    index += 1;
  }
  if (!out.evidence || !out.candidateRoot || !out.candidatePort || !out.stateCopySha256) {
    hold("required_arguments_missing");
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage: node tools/void-private-chain2050-economic-recovery-contract-v1.mjs --evidence PATH --candidate-root /tmp/void-chain2050-economic-recovery-candidate-v1/UNIQUE --candidate-port PORT --state-copy-sha256 SHA256\n",
    );
    return;
  }
  const evidencePath = path.resolve(args.evidence);
  const stat = fs.lstatSync(evidencePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > 1_048_576) {
    hold("evidence_file_invalid");
  }
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const result = buildVoidPrivateChain2050EconomicRecoveryCandidatePlanV1({
    evidence,
    candidate: {
      candidate_root: args.candidateRoot,
      candidate_port: args.candidatePort,
      state_copy_sha256: args.stateCopySha256,
    },
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    const reason = error instanceof VoidPrivateChain2050EconomicRecoveryHoldV1
      ? error.reason
      : "economic_recovery_contract_unexpected_error";
    process.stderr.write(`${JSON.stringify({
      marker: VOID_PRIVATE_CHAIN2050_ECONOMIC_RECOVERY_CONTRACT_V1,
      outcome: "HOLD",
      reason,
      execution_authorized: false,
      execution_performed: false,
      automatic_retry: false,
    })}\n`);
    process.exitCode = 1;
  }
}
