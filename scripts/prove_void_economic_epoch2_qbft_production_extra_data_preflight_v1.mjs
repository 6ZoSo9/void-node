#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SigningKey, computeAddress } from "ethers";
import {
  FORBIDDEN_PLACEHOLDERS,
  MARKER,
  prepareQbftProductionExtraDataInputV1,
} from "../tools/void-economic-epoch2-qbft-production-extra-data-preflight-v1.mjs";

const bindingPath =
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json";
const binding = JSON.parse(fs.readFileSync(bindingPath, "utf8"));

const held = prepareQbftProductionExtraDataInputV1(binding);
assert.equal(held.marker, MARKER);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "insufficient_attested_live_nodes");
assert.equal(held.attested_live_node_count, 3);
assert.equal(held.required_live_node_count, 4);
assert.equal(held.attested_identity_slots_remaining, 1);
assert.equal(held.validators.length, 3);
assert.equal(held.production_extra_data_built, false);
assert.equal(held.production_validator_set_bound, false);
assert.equal(held.authoritative_chain2050_write, false);
assert.equal(held.migration_authorized, false);
assert.equal(held.public_activation_authorized, false);

const synthetic = structuredClone(binding);
const signingKey = new SigningKey(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const syntheticPublicKey = signingKey.publicKey.toLowerCase();
const syntheticAddress = computeAddress(syntheticPublicKey).toLowerCase();
assert.equal(FORBIDDEN_PLACEHOLDERS.includes(syntheticAddress), false);

synthetic.qbft.production_binding_entries.push({
  machine_role: "synthetic-proof-fourth",
  void_node_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  besu_validator_address: syntheticAddress,
  besu_public_key: syntheticPublicKey,
  public_key_address_derivation_verified: true,
  address_derivation_method: "ethers.SigningKey.publicKey + ethers.computeAddress",
  node_identity_attestation:
    "ops/mainnet0/economic-epoch2-qbft-node-identity-synthetic-proof-fourth-v1.json",
  node_identity_attestation_sha256:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
});
synthetic.qbft.attested_live_node_count = 4;
synthetic.qbft.attested_identity_slots_remaining = 0;

const ready = prepareQbftProductionExtraDataInputV1(synthetic);
assert.equal(ready.status, "READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING");
assert.equal(ready.attested_live_node_count, 4);
assert.equal(ready.attested_identity_slots_remaining, 0);
assert.equal(ready.validators.length, 4);
assert.equal(new Set(ready.validators).size, 4);
assert.equal(ready.validators[3], syntheticAddress);
assert.equal(
  ready.besu.image,
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
);
assert.deepEqual(ready.besu.rlp_command, [
  "rlp",
  "encode",
  "--from=/work/validators.json",
  "--type=QBFT_EXTRA_DATA",
]);
assert.equal(ready.production_extra_data_built, false);
assert.equal(ready.production_validator_set_bound, false);
assert.equal(ready.authoritative_chain2050_write, false);
assert.equal(ready.migration_authorized, false);
assert.equal(ready.public_activation_authorized, false);

{
  const bad = structuredClone(synthetic);
  bad.qbft.production_binding_entries[3].besu_validator_address =
    bad.qbft.production_binding_entries[0].besu_validator_address;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /public_key_address_mismatch|besu_validator_address_duplicate/,
  );
}
{
  const bad = structuredClone(synthetic);
  bad.qbft.production_binding_entries[3].besu_validator_address =
    "0x1000000000000000000000000000000000000001";
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /public_key_address_mismatch|placeholder_address_forbidden/,
  );
}
{
  const bad = structuredClone(synthetic);
  bad.authority.transaction_broadcast = true;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /authority_must_remain_false:transaction_broadcast/,
  );
}
{
  const bad = structuredClone(synthetic);
  bad.gates.production_validator_set_bound = true;
  assert.throws(
    () => prepareQbftProductionExtraDataInputV1(bad),
    /authority_must_remain_false:production_validator_set_bound/,
  );
}

const fixtureOutput = process.env.VOID_QBFT_EXTRA_DATA_PROOF_OUTPUT;
if (fixtureOutput) {
  const resolved = path.resolve(fixtureOutput);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(ready.validators) + "\n", "utf8");
}

console.log(
  "VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("canonical_binding_status=HOLD");
console.log("canonical_attested_live_node_count=3");
console.log("canonical_required_live_node_count=4");
console.log("canonical_attested_identity_slots_remaining=1");
console.log("synthetic_four_identity_control=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING");
console.log("unique_validator_addresses_required=true");
console.log("placeholder_validator_addresses_forbidden=true");
console.log("exact_public_key_address_derivation_required=true");
console.log("production_extra_data_built=false");
console.log("production_validator_set_bound=false");
console.log("authoritative_chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
