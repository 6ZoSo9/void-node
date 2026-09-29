#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Wallet, computeAddress } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V2,
  importVoidEconomicEpoch2QbftFourthIdentityV2,
} from "../tools/void-economic-epoch2-qbft-fourth-identity-import-v2.mjs";
import {
  prepareQbftProductionExtraDataInputV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));

function fixture({
  role = "replacement-fourth",
  nodeBase = "http://127.0.0.1:4100",
} = {}) {
  const wallet = Wallet.createRandom();
  const publicKey = wallet.signingKey.publicKey.toLowerCase();
  const validatorAddress = computeAddress(publicKey).toLowerCase();

  return {
    marker: "VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1",
    version: 1,
    status: "PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND",
    source_commit: "b279b2270d1ef92bfd9ea98a724b0f740dc86c8d",
    machine_role: role,
    hostname: "Replacement-Fourth",
    void_node_id: crypto.randomBytes(16).toString("hex"),
    node_base: nodeBase,
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
        "void_epoch2_qbft_identity_" +
        role +
        "_v1_20260929T120000Z.json",
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

const imported = importVoidEconomicEpoch2QbftFourthIdentityV2({
  binding,
  attestation,
  attestationBytes: rawAttestation,
});

assert.equal(
  imported.receipt.marker,
  VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V2,
);
assert.equal(imported.receipt.version, 2);
assert.equal(
  imported.receipt.status,
  "FOURTH_IDENTITY_IMPORTED_PREFLIGHT_READY",
);
assert.equal(imported.receipt.machine_role, "replacement-fourth");
assert.equal(imported.receipt.node_base, "http://127.0.0.1:4100");
assert.equal(
  imported.receipt.canonical_attestation_path,
  "ops/mainnet0/economic-epoch2-qbft-node-identity-replacement-fourth-v1.json",
);
assert.equal(
  imported.canonical_attestation_filename,
  "economic-epoch2-qbft-node-identity-replacement-fourth-v1.json",
);
assert.deepEqual(
  imported.canonical_attestation_bytes,
  rawAttestation,
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

const fourth =
  imported.updated_binding.qbft.production_binding_entries[3];
assert.equal(fourth.machine_role, "replacement-fourth");
assert.equal(fourth.void_node_id, attestation.void_node_id);
assert.equal(
  fourth.besu_validator_address,
  attestation.besu.validator_address,
);
assert.equal(fourth.besu_public_key, attestation.besu.public_key);
assert.equal(
  fourth.node_identity_attestation,
  "ops/mainnet0/economic-epoch2-qbft-node-identity-replacement-fourth-v1.json",
);
assert.equal(
  fourth.node_identity_attestation_sha256,
  attestation.local_private_attestation.file_sha256,
);

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
  const ipv6 = fixture({
    role: "replacement-ipv6",
    nodeBase: "http://[::1]:4100",
  });
  const result = importVoidEconomicEpoch2QbftFourthIdentityV2({
    binding,
    attestation: ipv6,
  });
  assert.equal(result.receipt.node_base, "http://[::1]:4100");
}

{
  const bad = structuredClone(attestation);
  bad.private_key = "forbidden";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_public_attestation_shape_invalid/,
  );
}

{
  const bad = structuredClone(attestation);
  bad.machine_role = "Replacement-Fourth";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_public_attestation_machine_role_not_canonical/,
  );
}

{
  const bad = structuredClone(attestation);
  bad.machine_role = "bad_role";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_public_attestation_machine_role_invalid/,
  );
}

{
  const bad = structuredClone(attestation);
  bad.node_base = "http://192.0.2.1:4100";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_public_attestation_node_base_invalid/,
  );
}

{
  const bad = structuredClone(attestation);
  bad.local_private_attestation.filename =
    "void_epoch2_qbft_identity_alienware_v1_20260929T120000Z.json";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_public_attestation_local_receipt_filename_invalid/,
  );
}

{
  const first = binding.qbft.production_binding_entries[0];
  const bad = structuredClone(attestation);
  bad.machine_role = first.machine_role;
  bad.local_private_attestation.filename =
    "void_epoch2_qbft_identity_" +
    first.machine_role +
    "_v1_20260929T120000Z.json";
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_identity_duplicate:machine_role/,
  );
}

{
  const first = binding.qbft.production_binding_entries[0];
  const bad = structuredClone(attestation);
  bad.void_node_id = first.void_node_id;
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation: bad,
      }),
    /fourth_identity_duplicate:void_node_id/,
  );
}

{
  const badBytes = Buffer.from(
    JSON.stringify(
      {
        ...attestation,
        hostname: "different-hostname",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding,
        attestation,
        attestationBytes: badBytes,
      }),
    /fourth_public_attestation_bytes_object_mismatch/,
  );
}

{
  const alreadyFour = structuredClone(imported.updated_binding);
  assert.throws(
    () =>
      importVoidEconomicEpoch2QbftFourthIdentityV2({
        binding: alreadyFour,
        attestation,
      }),
    /canonical_qbft_binding_not_ready_for_fourth_identity/,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-epoch2-qbft-fourth-import-v2-"),
);
try {
  const sourceFile = path.join(temp, "replacement-public.json");
  const outDir = path.join(temp, "out");
  fs.writeFileSync(sourceFile, rawAttestation, { mode: 0o600 });

  const run = spawnSync(
    process.execPath,
    [
      "tools/void-economic-epoch2-qbft-fourth-identity-import-v2.mjs",
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
  assert.match(run.stdout, /machine_role=replacement-fourth/);
  assert.match(
    run.stdout,
    /preflight_status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING/,
  );
  assert.match(run.stdout, /production_validator_set_bound=false/);

  const outAttestation = path.join(
    outDir,
    "economic-epoch2-qbft-node-identity-replacement-fourth-v1.json",
  );
  const outBinding = path.join(
    outDir,
    "economic-epoch2-qbft-validator-binding-candidate-v1.json",
  );
  const outReceipt = path.join(
    outDir,
    "void-economic-epoch2-qbft-fourth-identity-import-v2.json",
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
  assert.equal(cliReceipt.machine_role, "replacement-fourth");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-economic-epoch2-qbft-fourth-identity-import-v2.mjs",
  "utf8",
);
for (const forbidden of [
  "node_private_key_file_basename",
  "readFileSync(key",
  "new Wallet(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.doesNotMatch(
  source,
  /machine_role\s*!==\s*["']alienware["']/,
);
assert.match(source, /const ROLE = \/\^\[a-z0-9\]/);

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V2_PROOF_GREEN",
);
console.log("canonical_current_identity_count=3");
console.log("fourth_machine_role_hardcoded=false");
console.log("role_derived_attestation_path=true");
console.log("role_derived_private_receipt_filename_required=true");
console.log("loopback_http_required=true");
console.log("ipv4_loopback_supported=true");
console.log("ipv6_loopback_supported=true");
console.log("attestation_bytes_object_binding_verified=true");
console.log("extra_private_fields_rejected=true");
console.log("updated_binding_entry_count=4");
console.log("preflight_status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING");
console.log("production_extra_data_built=false");
console.log("production_validator_set_bound=false");
console.log("all_production_validators_epoch_domain_enforced=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_movement=false");
