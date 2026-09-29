#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Wallet, computeAddress } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_QBFT_ALIENWARE_CANONICAL_ATTESTATION_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1,
  importVoidEconomicEpoch2QbftFourthIdentityV1,
} from "../tools/void-economic-epoch2-qbft-fourth-identity-import-v1.mjs";
import {
  prepareQbftProductionExtraDataInputV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));

function fixture() {
  const wallet = Wallet.createRandom();
  const publicKey = wallet.signingKey.publicKey.toLowerCase();
  const validatorAddress = computeAddress(publicKey).toLowerCase();

  return {
    marker: "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
    version: 1,
    status: "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND",
    source_commit: "b279b2270d1ef92bfd9ea98a724b0f740dc86c8d",
    machine_role: "alienware",
    hostname: "Alienware",
    void_node_id: crypto.randomBytes(16).toString("hex"),
    node_base: "http://127.0.0.1:4100",
    besu: {
      client: "Besu",
      client_version: "26.8.1",
      image:
        "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
      public_key: publicKey,
      validator_address: validatorAddress,
      address_derivation_method:
        "ethers.SigningKey.publicKey + ethers.computeAddress",
      public_key_address_derivation_verified: true,
    },
    local_private_attestation: {
      filename:
        "void_epoch2_qbft_identity_alienware_v1_20260929T120000Z.json",
      file_sha256: "cd".repeat(32),
      private_key_content_exported: false,
      private_key_content_recorded_in_repo: false,
    },
    authority: {
      besu_node_started: false,
      production_validator_set_bound: false,
      validator_mutation: false,
      authoritative_chain2050_write: false,
      funds_movement: false,
      migration_authorized: false,
      public_activation: false,
    },
  };
}

const current = prepareQbftProductionExtraDataInputV1(binding);
assert.equal(current.status, "HOLD");
assert.equal(current.reason, "insufficient_attested_live_nodes");
assert.equal(current.attested_live_node_count, 3);
assert.equal(current.required_live_node_count, 4);
assert.equal(current.attested_identity_slots_remaining, 1);

const attestation = fixture();
const rawAttestation = Buffer.from(
  JSON.stringify(attestation, null, 2) + "\n",
  "utf8",
);

const imported = importVoidEconomicEpoch2QbftFourthIdentityV1({
  binding,
  attestation,
  attestationBytes: rawAttestation,
});

assert.equal(
  imported.receipt.marker,
  VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1,
);
assert.equal(
  imported.receipt.status,
  "FOURTH_IDENTITY_IMPORTED_PREFLIGHT_READY",
);
assert.equal(imported.receipt.machine_role, "alienware");
assert.equal(
  imported.receipt.canonical_attestation_path,
  VOID_ECONOMIC_EPOCH2_QBFT_ALIENWARE_CANONICAL_ATTESTATION_V1,
);
assert.equal(imported.receipt.production_binding_entry_count, 4);
assert.equal(imported.receipt.attested_live_node_count, 4);
assert.equal(imported.receipt.required_live_node_count, 4);
assert.equal(imported.receipt.attested_identity_slots_remaining, 0);
assert.equal(
  imported.receipt.preflight_status,
  "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
assert.equal(imported.receipt.production_extra_data_built, false);
assert.equal(imported.receipt.production_validator_set_bound, false);
assert.equal(
  imported.receipt.all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(imported.receipt.authoritative_chain2050_write, false);
assert.equal(imported.receipt.migration_authorized, false);
assert.equal(imported.receipt.public_activation_authorized, false);
assert.equal(imported.receipt.funds_movement, false);

assert.deepEqual(
  imported.canonical_attestation_bytes,
  rawAttestation,
);
assert.equal(
  imported.updated_binding.qbft.production_binding_entries.length,
  4,
);
assert.equal(
  imported.updated_binding.qbft.attested_live_node_count,
  4,
);
assert.equal(
  imported.updated_binding.qbft.attested_identity_slots_remaining,
  0,
);
const fourth =
  imported.updated_binding.qbft.production_binding_entries[3];
assert.equal(fourth.machine_role, "alienware");
assert.equal(fourth.void_node_id, attestation.void_node_id);
assert.equal(
  fourth.besu_validator_address,
  attestation.besu.validator_address,
);
assert.equal(fourth.besu_public_key, attestation.besu.public_key);
assert.equal(fourth.public_key_address_derivation_verified, true);
assert.equal(
  fourth.address_derivation_method,
  "ethers.SigningKey.publicKey + ethers.computeAddress",
);
assert.equal(
  fourth.node_identity_attestation,
  "ops/mainnet0/economic-epoch2-qbft-node-identity-alienware-v1.json",
);
assert.equal(
  fourth.node_identity_attestation_sha256,
  attestation.local_private_attestation.file_sha256,
);

for (const field of [
  "qbft_live_identity_manifest_ready",
  "qbft_minimum_live_nodes_attested",
  "qbft_public_key_address_derivations_verified",
  "qbft_production_extra_data_built",
  "production_validator_set_bound",
  "offline_successor_equivalence_proven",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(imported.updated_binding.gates[field], false, field);
}
for (const field of [
  "service_action",
  "validator_mutation",
  "wallet_access",
  "private_key_access",
  "credential_content_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_submission",
  "transaction_broadcast",
  "authoritative_chain2050_write",
  "token_movement",
  "funds_movement",
  "migration_authorized",
  "public_activation_authorized",
]) {
  assert.equal(imported.updated_binding.authority[field], false, field);
}

const ready =
  prepareQbftProductionExtraDataInputV1(imported.updated_binding);
assert.equal(
  ready.status,
  "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
assert.equal(ready.validators.length, 4);
assert.equal(new Set(ready.validators).size, 4);
assert.equal(
  ready.validators[3],
  attestation.besu.validator_address,
);

{
  const bad = structuredClone(attestation);
  bad.private_key = "forbidden";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding,
        attestation: bad,
      }),
    /alienware_public_attestation_shape_invalid/,
  );
}
{
  const bad = structuredClone(attestation);
  bad.machine_role = "precision";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding,
        attestation: bad,
      }),
    /alienware_public_attestation_machine_role_invalid/,
  );
}
{
  const bad = structuredClone(attestation);
  bad.node_base = "http://127.0.0.1:9999";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding,
        attestation: bad,
      }),
    /alienware_public_attestation_node_base_invalid/,
  );
}
{
  const bad = structuredClone(attestation);
  const first = binding.qbft.production_binding_entries[0];
  bad.void_node_id = first.void_node_id;
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding,
        attestation: bad,
      }),
    /fourth_identity_duplicate:void_node_id/,
  );
}
{
  const bad = structuredClone(attestation);
  bad.besu.public_key =
    binding.qbft.production_binding_entries[0].besu_public_key;
  bad.besu.validator_address =
    binding.qbft.production_binding_entries[0].besu_validator_address;
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding,
        attestation: bad,
      }),
    /fourth_identity_duplicate:besu_validator_address|fourth_identity_duplicate:besu_public_key/,
  );
}
{
  const bad = structuredClone(attestation);
  bad.authority.validator_mutation = true;
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding,
        attestation: bad,
      }),
    /alienware_public_attestation_authority_must_remain_false:validator_mutation/,
  );
}
{
  const alreadyFour = structuredClone(imported.updated_binding);
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV1({
        binding: alreadyFour,
        attestation,
      }),
    /canonical_qbft_binding_not_ready_for_fourth_identity/,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-qbft-fourth-import-v1-"),
);
try {
  const sourceFile = path.join(temp, "alienware-public.json");
  const outDir = path.join(temp, "out");
  fs.writeFileSync(sourceFile, rawAttestation, { mode: 0o600 });

  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-qbft-fourth-identity-import-v1.mjs",
      "--attestation",
      sourceFile,
      "--binding",
      bindingPath,
      "--output-dir",
      outDir,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env },
    },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(
    run.stdout,
    /status=FOURTH_IDENTITY_IMPORTED_PREFLIGHT_READY/,
  );
  assert.match(
    run.stdout,
    /preflight_status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING/,
  );
  assert.match(run.stdout, /production_validator_set_bound=false/);
  assert.match(
    run.stdout,
    /all_production_validators_epoch_domain_enforced=false/,
  );

  const outAttestation = path.join(
    outDir,
    "economic-epoch2-qbft-node-identity-alienware-v1.json",
  );
  const outBinding = path.join(
    outDir,
    "economic-epoch2-qbft-validator-binding-candidate-v1.json",
  );
  const outReceipt = path.join(
    outDir,
    "void-economic-epoch2-qbft-fourth-identity-import-v1.json",
  );
  for (const file of [outAttestation, outBinding, outReceipt]) {
    assert.equal(fs.lstatSync(file).isFile(), true, file);
  }
  assert.deepEqual(fs.readFileSync(outAttestation), rawAttestation);
  const cliBinding = JSON.parse(fs.readFileSync(outBinding, "utf8"));
  assert.equal(cliBinding.qbft.production_binding_entries.length, 4);
  assert.equal(cliBinding.qbft.attested_live_node_count, 4);
  assert.equal(cliBinding.qbft.attested_identity_slots_remaining, 0);
  assert.equal(
    prepareQbftProductionExtraDataInputV1(cliBinding).status,
    "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
  );
  const cliReceipt = JSON.parse(fs.readFileSync(outReceipt, "utf8"));
  assert.equal(
    cliReceipt.status,
    "FOURTH_IDENTITY_IMPORTED_PREFLIGHT_READY",
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-qbft-fourth-identity-import-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "private_key:",
  "privateKey:",
  "readFileSync(key",
  "node_private_key_file_basename",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1_PROOF_GREEN",
);
console.log("canonical_current_identity_count=3");
console.log("synthetic_fourth_identity_role=alienware");
console.log("exact_public_attestation_shape_required=true");
console.log("extra_private_fields_rejected=true");
console.log("public_key_address_derivation_verified=true");
console.log("updated_binding_entry_count=4");
console.log(
  "preflight_status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING",
);
console.log("cli_bundle_output_verified=true");
console.log("production_extra_data_built=false");
console.log("production_validator_set_bound=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
