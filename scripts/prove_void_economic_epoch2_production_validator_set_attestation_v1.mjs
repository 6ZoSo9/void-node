#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_AUTHORITY_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_EVIDENCE_V1,
  collectVoidEconomicEpoch2ProductionValidatorSetEvidenceV1,
  verifyVoidEconomicEpoch2ProductionValidatorSetAttestationV1,
  voidEconomicEpoch2ProductionValidatorSetEvidenceIdV1,
} from "../tools/void-economic-epoch2-production-validator-set-attestation-v1.mjs";

const binding = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    "utf8",
  ),
);

const roles = ["precision", "nimo", "xiphos"];
const canonicalValidators =
  binding.qbft.production_binding_entries
    .map((row) => row.besu_validator_address.toLowerCase())
    .sort();
const targetBlock = "0x64";
const targetHash = "0x" + "b".repeat(64);

function transportFor({
  chainId = "0x802",
  blockNumber = targetBlock,
  blockHash = targetHash,
  validators = [
    canonicalValidators[2],
    canonicalValidators[0],
    canonicalValidators[1],
  ],
} = {}) {
  const calls = [];
  const transport = async ({ method, params }) => {
    calls.push({ method, params });
    if (method === "eth_chainId") return chainId;
    if (method === "eth_getBlockByNumber") {
      assert.deepEqual(params, [targetBlock, false]);
      return {
        number: blockNumber,
        hash: blockHash,
        extra: "ignored",
      };
    }
    if (method === "qbft_getValidatorsByBlockNumber") {
      assert.deepEqual(params, [targetBlock]);
      return validators;
    }
    throw new Error("unexpected_method");
  };
  return { calls, transport };
}

const observed = [
  "2030-01-01T00:00:00Z",
  "2030-01-01T00:01:00Z",
  "2030-01-01T00:02:00Z",
];

const evidenceRows = [];
for (let index = 0; index < roles.length; index += 1) {
  const role = roles[index];
  const t = transportFor();
  const row =
    await collectVoidEconomicEpoch2ProductionValidatorSetEvidenceV1({
      binding_candidate: binding,
      machine_role: role,
      target_block_number: targetBlock,
      observed_at_utc: observed[index],
      valid_until_utc: "2030-01-01T00:10:00Z",
      transport: t.transport,
    });
  assert.equal(
    row.marker,
    VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_EVIDENCE_V1,
  );
  assert.equal(row.status, "RUNTIME_VALIDATOR_SET_EVIDENCE_CANDIDATE");
  assert.equal(row.chain_id, 2050);
  assert.equal(row.execution_epoch, 2);
  assert.equal(row.machine_role, role);
  assert.equal(row.target_block_number, targetBlock);
  assert.equal(row.target_block_hash, targetHash);
  assert.deepEqual(row.validator_addresses, canonicalValidators);
  assert.match(row.validator_set_sha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(row.rpc_methods_used, [
    "eth_chainId",
    "eth_getBlockByNumber",
    "qbft_getValidatorsByBlockNumber",
  ]);
  assert.equal(row.read_only_rpc_observation, true);
  assert.equal(row.validator_set_matches_canonical_binding, true);
  assert.equal(row.production_validator_set_bound, false);
  assert.equal(row.authoritative_chain2050_write, false);
  assert.equal(row.migration_authorized, false);
  assert.equal(row.public_activation_authorized, false);
  assert.equal(row.funds_movement_authorized, false);
  assert.match(row.evidence_id, /^voide2vs1_[0-9a-f]{64}$/u);
  assert.equal(
    row.evidence_id,
    voidEconomicEpoch2ProductionValidatorSetEvidenceIdV1(row),
  );
  assert.deepEqual(
    t.calls.map((call) => call.method),
    [
      "eth_chainId",
      "eth_getBlockByNumber",
      "qbft_getValidatorsByBlockNumber",
    ],
  );
  evidenceRows.push(row);
}

const expectedIds = evidenceRows.map((row) => row.evidence_id);
const verified =
  verifyVoidEconomicEpoch2ProductionValidatorSetAttestationV1({
    binding_candidate: binding,
    expected_evidence_ids: expectedIds,
    evaluation_time_utc: "2030-01-01T00:05:00Z",
    evidence_rows: evidenceRows,
  });

assert.equal(verified.ok, true);
assert.equal(
  verified.status,
  "PRODUCTION_VALIDATOR_SET_RUNTIME_EVIDENCE_VERIFIED_PROMOTION_HOLD",
);
assert.equal(
  verified.marker,
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1,
);
assert.match(verified.attestation_id, /^sha256:[0-9a-f]{64}$/u);
assert.equal(verified.chain_id, 2050);
assert.equal(verified.execution_epoch, 2);
assert.equal(verified.target_block_number, targetBlock);
assert.equal(verified.target_block_hash, targetHash);
assert.deepEqual(verified.validator_addresses, canonicalValidators);
assert.deepEqual(verified.machine_roles, roles);
assert.deepEqual(verified.evidence_ids, expectedIds);
assert.equal(
  verified.production_validator_set_runtime_evidence_semantically_verified,
  true,
);
assert.equal(verified.common_block_identity_verified, true);
assert.equal(verified.exact_canonical_validator_set_verified, true);
assert.equal(verified.all_three_hosts_agree, true);
assert.equal(verified.production_validator_set_bound, false);
assert.equal(verified.authoritative_chain2050_write, false);
assert.equal(verified.migration_authorized, false);
assert.equal(verified.public_activation_authorized, false);
assert.equal(verified.funds_movement_authorized, false);

{
  const t = transportFor({ chainId: "0x1" });
  await assert.rejects(
    () =>
      collectVoidEconomicEpoch2ProductionValidatorSetEvidenceV1({
        binding_candidate: binding,
        machine_role: "precision",
        target_block_number: targetBlock,
        observed_at_utc: observed[0],
        valid_until_utc: "2030-01-01T00:10:00Z",
        transport: t.transport,
      }),
    /production_validator_set_chain_id_mismatch/,
  );
}

{
  const t = transportFor({
    validators: [
      canonicalValidators[0],
      canonicalValidators[1],
      "0x9999999999999999999999999999999999999999",
    ],
  });
  await assert.rejects(
    () =>
      collectVoidEconomicEpoch2ProductionValidatorSetEvidenceV1({
        binding_candidate: binding,
        machine_role: "precision",
        target_block_number: targetBlock,
        observed_at_utc: observed[0],
        valid_until_utc: "2030-01-01T00:10:00Z",
        transport: t.transport,
      }),
    /production_validator_set_rpc_binding_mismatch/,
  );
}

{
  const t = transportFor({ blockNumber: "0x65" });
  await assert.rejects(
    () =>
      collectVoidEconomicEpoch2ProductionValidatorSetEvidenceV1({
        binding_candidate: binding,
        machine_role: "precision",
        target_block_number: targetBlock,
        observed_at_utc: observed[0],
        valid_until_utc: "2030-01-01T00:10:00Z",
        transport: t.transport,
      }),
    /production_validator_set_block_number_mismatch/,
  );
}

{
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorSetAttestationV1({
        binding_candidate: binding,
        expected_evidence_ids: expectedIds,
        evaluation_time_utc: "2030-01-01T01:00:00Z",
        evidence_rows: evidenceRows,
      }),
    /production_validator_set_evidence_not_current/,
  );
}

{
  const badRows = structuredClone(evidenceRows);
  badRows[1].target_block_hash = "0x" + "c".repeat(64);
  badRows[1].evidence_id =
    voidEconomicEpoch2ProductionValidatorSetEvidenceIdV1(badRows[1]);
  const badIds = [
    expectedIds[0],
    badRows[1].evidence_id,
    expectedIds[2],
  ];
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorSetAttestationV1({
        binding_candidate: binding,
        expected_evidence_ids: badIds,
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        evidence_rows: badRows,
      }),
    /production_validator_set_common_block_or_set_mismatch/,
  );
}

{
  const badRows = structuredClone(evidenceRows);
  badRows[2].validator_addresses = [
    canonicalValidators[0],
    canonicalValidators[1],
    "0x9999999999999999999999999999999999999999",
  ].sort();
  badRows[2].validator_set_sha256 = "d".repeat(64);
  badRows[2].evidence_id =
    voidEconomicEpoch2ProductionValidatorSetEvidenceIdV1(badRows[2]);
  const badIds = [
    expectedIds[0],
    expectedIds[1],
    badRows[2].evidence_id,
  ];
  assert.throws(
    () =>
      verifyVoidEconomicEpoch2ProductionValidatorSetAttestationV1({
        binding_candidate: binding,
        expected_evidence_ids: badIds,
        evaluation_time_utc: "2030-01-01T00:05:00Z",
        evidence_rows: badRows,
      }),
    /production_validator_set_evidence_set_hash_mismatch|production_validator_set_canonical_binding_mismatch/,
  );
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_AUTHORITY_V1,
)) {
  if (
    key === "source_verification_only" ||
    key === "injected_read_transport_required" ||
    key === "bounded_read_only_rpc_methods"
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-production-validator-set-attestation-v1.mjs",
  "utf8",
);
assert.match(source, /qbft_getValidatorsByBlockNumber/);
assert.match(source, /eth_getBlockByNumber/);
assert.match(source, /eth_chainId/);
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "qbft_proposeValidatorVote",
  "qbft_discardValidatorVote",
  "JsonRpcProvider(",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1_PROOF_GREEN",
);
console.log("canonical_roles=precision,nimo,xiphos");
console.log("read_only_rpc_methods=eth_chainId,eth_getBlockByNumber,qbft_getValidatorsByBlockNumber");
console.log("same_block_number_required=true");
console.log("same_block_hash_required=true");
console.log("exact_three_validator_set_required=true");
console.log("all_three_hosts_agree_required=true");
console.log("production_validator_set_runtime_evidence_semantically_verified=true");
console.log("production_validator_set_bound=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
