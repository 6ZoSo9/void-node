#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
} from "../tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1,
} from "../tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";
import {
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_AUTHORITY_V1,
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1,
  importWcVoidMarketVaultRuntimeAttestationV1,
} from "../tools/void-wc-void-market-vault-runtime-attestation-import-v1.mjs";

const vault =
  "0x1111111111111111111111111111111111111111";
const deployer =
  "0x2222222222222222222222222222222222222222";
const launchController =
  "0x3333333333333333333333333333333333333333";
const settlementExecutor =
  "0x4444444444444444444444444444444444444444";
const closeoutController =
  "0x5555555555555555555555555555555555555555";
const coupledLaunchId =
  "0x" + "6".repeat(64);
const deploymentTx =
  "0x" + "7".repeat(64);
const deploymentBlockHash =
  "0x" + "8".repeat(64);
const headBlockHash =
  "0x" + "9".repeat(64);
const runtimeSha =
  "a".repeat(64);
const runtimeKeccak =
  "0x" + "b".repeat(64);
const canonicalVoidToken =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const canonicalVoidTokenRuntimeSha =
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const openingInventory =
  "10000000000000000000000000";
const zeroAddress =
  "0x0000000000000000000000000000000000000000";
const zeroBytes32 =
  "0x" + "00".repeat(32);

const payloadKeys = [
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "compiled_identity_packet_id",
  "compiled_identity_id",
  "deployment_transaction_hash",
  "deployment_deployer",
  "deployment_block_number",
  "deployment_block_hash",
  "deployment_receipt_revalidated",
  "observed_head_block_number",
  "observed_head_block_hash",
  "observed_confirmation_count",
  "market_vault_address",
  "runtime_code_bytes",
  "runtime_code_sha256",
  "runtime_code_keccak256",
  "void_token",
  "void_token_runtime_code_sha256",
  "canonical_void_token_verified",
  "canonical_void_token_runtime_verified",
  "launch_controller",
  "settlement_executor",
  "closeout_controller",
  "coupled_launch_id",
  "opening_inventory_atoms",
  "current_void_reserve_atoms",
  "token_balance_atoms",
  "activated",
  "closing",
  "closed",
  "closeout_approved",
  "activated_at_block",
  "settlement_count",
  "lifetime_void_out_atoms",
  "pending_closeout_id",
  "pending_successor_vault",
];

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  throw new Error("invalid_canonical_value");
}

function evidenceId(value) {
  const payload = {};
  for (const key of payloadKeys) payload[key] = value[key];
  return "voidwcmvre1_" +
    createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function authority() {
  return {
    read_only_rpc_verification: true,
    injected_transport_required: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  };
}

function evidenceFixture() {
  const value = {
    ok: true,
    marker: VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_V1,
    version: 1,
    status: "RUNTIME_ATTESTED_PREACTIVATION_INVENTORY_LOCKED",
    chain_id: 2050,
    execution_epoch: 2,
    compiled_identity_packet_id:
      COMPILED_IDENTITY_EXPECTED.packet_id,
    compiled_identity_id:
      COMPILED_IDENTITY_EXPECTED.identity_id,
    deployment_transaction_hash: deploymentTx,
    deployment_deployer: deployer,
    deployment_block_number: "100",
    deployment_block_hash: deploymentBlockHash,
    deployment_receipt_revalidated: true,
    observed_head_block_number: "120",
    observed_head_block_hash: headBlockHash,
    observed_confirmation_count: "21",
    market_vault_address: vault,
    runtime_code_bytes:
      COMPILED_IDENTITY_EXPECTED.runtime_template_bytes,
    runtime_code_sha256: runtimeSha,
    runtime_code_keccak256: runtimeKeccak,
    void_token: canonicalVoidToken,
    void_token_runtime_code_sha256:
      canonicalVoidTokenRuntimeSha,
    canonical_void_token_verified: true,
    canonical_void_token_runtime_verified: true,
    launch_controller: launchController,
    settlement_executor: settlementExecutor,
    closeout_controller: closeoutController,
    coupled_launch_id: coupledLaunchId,
    opening_inventory_atoms: openingInventory,
    current_void_reserve_atoms: openingInventory,
    token_balance_atoms: openingInventory,
    activated: false,
    closing: false,
    closed: false,
    closeout_approved: false,
    activated_at_block: "0",
    settlement_count: "0",
    lifetime_void_out_atoms: "0",
    pending_closeout_id: zeroBytes32,
    pending_successor_vault: zeroAddress,
    evidence_id: "voidwcmvre1_" + "0".repeat(64),
    rpc_methods_used: [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
      "eth_getBlockByNumber",
      "eth_getCode",
      "eth_call",
      "eth_getCode",
      "eth_call",
      "eth_getBlockByNumber",
      "eth_getTransactionReceipt",
    ],
    deployment_attested: true,
    final_role_bindings_attested: true,
    deployed_runtime_code_observed: true,
    market_vault_independently_verified: true,
    inventory_funded: true,
    inventory_lock_proven: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: authority(),
  };
  value.evidence_id = evidenceId(value);
  return value;
}

function expectedFixture(overrides = {}) {
  return {
    market_vault_address: vault,
    deployment_transaction_hash: deploymentTx,
    deployment_deployer: deployer,
    launch_controller: launchController,
    settlement_executor: settlementExecutor,
    closeout_controller: closeoutController,
    coupled_launch_id: coupledLaunchId,
    minimum_observed_head_block_number: "118",
    minimum_confirmation_count: "12",
    ...overrides,
  };
}

function verify(evidence = evidenceFixture(), expected = expectedFixture()) {
  return importWcVoidMarketVaultRuntimeAttestationV1({
    expected,
    evidence,
  });
}

function rejects(mutator, code, expectedMutator = null) {
  const evidence = evidenceFixture();
  const expected = expectedFixture();
  if (mutator) {
    mutator(evidence);
    if (code !== "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EVIDENCE_ID_MISMATCH") {
      evidence.evidence_id = evidenceId(evidence);
    }
  }
  if (expectedMutator) expectedMutator(expected);
  assert.throws(
    () => verify(evidence, expected),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const result = verify();
assert.equal(result.ok, true);
assert.equal(result.status, "VERIFIED_RUNTIME_ATTESTATION_IMPORT");
assert.equal(
  result.marker,
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1,
);
assert.match(result.import_id, /^voidwcmvri1_[0-9a-f]{64}$/);
assert.match(result.binding_id, /^voidwcmvrb1_[0-9a-f]{64}$/);
assert.equal(result.source_evidence_id, evidenceFixture().evidence_id);
assert.equal(result.chain_id, 2050);
assert.equal(result.execution_epoch, 2);
assert.equal(result.market_vault_address, vault);
assert.equal(result.market_vault_runtime_code_sha256, runtimeSha);
assert.equal(
  result.market_vault_compiled_identity_id,
  COMPILED_IDENTITY_EXPECTED.identity_id,
);
assert.equal(result.deployment_transaction_hash, deploymentTx);
assert.equal(result.deployment_block_number, "100");
assert.equal(result.observed_head_block_number, "120");
assert.equal(result.observed_confirmation_count, "21");
assert.equal(result.minimum_observed_head_block_number, "118");
assert.equal(result.minimum_confirmation_count, "12");
assert.deepEqual(result.candidate_fields, {
  market_vault_address: vault,
  market_vault_runtime_code_sha256: runtimeSha,
  market_vault_independently_verified: true,
  inventory_funded: true,
  inventory_lock_proven: true,
});
assert.equal(result.production_candidate_binding_ready, true);
assert.equal(result.production_candidate_updated, false);
assert.equal(result.market_activation_authorized, false);
assert.equal(result.public_presale_activation_authorized, false);
assert.equal(result.funds_movement_authorized, false);

const repeated = verify();
assert.equal(repeated.import_id, result.import_id);
assert.equal(repeated.binding_id, result.binding_id);

rejects(
  null,
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EXPECTED_BINDING_MISMATCH",
  (expected) => {
    expected.market_vault_address =
      "0x9999999999999999999999999999999999999999";
  },
);
rejects(
  null,
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_FRESHNESS_OR_FINALITY_HOLD",
  (expected) => {
    expected.minimum_observed_head_block_number = "121";
  },
);
rejects(
  null,
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_FRESHNESS_OR_FINALITY_HOLD",
  (expected) => {
    expected.minimum_confirmation_count = "22";
  },
);
rejects(
  (evidence) => {
    evidence.observed_confirmation_count = "20";
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_CONFIRMATION_COUNT_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.void_token_runtime_code_sha256 = "c".repeat(64);
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_CANONICAL_TOKEN_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.token_balance_atoms =
      (BigInt(openingInventory) - 1n).toString();
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_INVENTORY_LOCK_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.activated = true;
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_PREACTIVATION_STATE_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.market_vault_independently_verified = false;
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_REQUIRED_PROOF_MISSING",
);
rejects(
  (evidence) => {
    evidence.authority.private_key_access = true;
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_AUTHORITY_MISMATCH",
);
rejects(
  (evidence) => {
    evidence.rpc_methods_used.push("eth_sendRawTransaction");
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_RPC_METHOD_FORBIDDEN",
);
rejects(
  (evidence) => {
    evidence.compiled_identity_id =
      "voidwcvci1_" + "f".repeat(64);
  },
  "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_COMPILED_IDENTITY_MISMATCH",
);
{
  const evidence = evidenceFixture();
  evidence.evidence_id =
    "voidwcmvre1_" + "e".repeat(64);
  assert.throws(
    () => verify(evidence),
    (error) =>
      error instanceof Error &&
      error.message ===
        "WC_VOID_MARKET_VAULT_RUNTIME_IMPORT_EVIDENCE_ID_MISMATCH",
  );
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_AUTHORITY_V1,
)) {
  if (
    key === "source_evidence_validation_only" ||
    key === "production_candidate_binding_derivation"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-market-vault-runtime-attestation-import-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_MARKET_VAULT_RUNTIME_ATTESTATION_IMPORT_V1_PROOF_GREEN");
console.log("reviewed_expected_deployment_binding_required=true");
console.log("attestation_evidence_id_recomputed=true");
console.log("minimum_head_bound=true");
console.log("minimum_finality_bound=true");
console.log("confirmation_arithmetic_verified=true");
console.log("canonical_voidtoken_runtime_required=true");
console.log("exact_10m_inventory_lock_required=true");
console.log("preactivation_state_required=true");
console.log("candidate_fields_derived=true");
console.log("production_candidate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
