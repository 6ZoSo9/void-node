#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Transaction, Wallet } from "ethers";

import {
  VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1,
  classifyVoidEconomicEpoch2RawTransactionDomainV1,
  verifyVoidEconomicEpoch2RawTransactionDomainPolicyV1,
} from "../tools/void-economic-epoch2-raw-transaction-domain-v1.mjs";

const policy = JSON.parse(
  fs.readFileSync("ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json", "utf8"),
);

const policyResult = verifyVoidEconomicEpoch2RawTransactionDomainPolicyV1(policy);
assert.equal(policyResult.ok, true);
assert.equal(policyResult.raw_transaction_epoch_domain_defined, true);
assert.equal(policyResult.raw_transaction_epoch_domain_source_proven, true);
assert.equal(policyResult.besu_transaction_validation_rule_implemented, true);
assert.equal(policyResult.besu_transaction_validation_rule_source_tested, true);
assert.equal(policyResult.plugin_artifact_content_addressed, true);
assert.equal(policyResult.plugin_artifact_runtime_identity_verified, true);
assert.equal(policyResult.besu_transaction_validation_rule_runtime_proven, true);
assert.equal(policyResult.cross_epoch_replay_protection_proven, false);

const marker = {
  address: VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_address,
  storageKeys: [
    VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1.marker_storage_key,
  ],
};

const extra = {
  address: "0x0000000000000000000000000000000000000001",
  storageKeys: [],
};

const base = {
  type: 2,
  chainId: 2050,
  nonce: 0,
  maxPriorityFeePerGas: 0,
  maxFeePerGas: 0,
  gasLimit: 100000,
  to: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  value: 0,
  data: "0x",
};

const wallet = Wallet.createRandom();

const validRaw = await wallet.signTransaction({
  ...base,
  accessList: [marker, extra],
});
const validTx = Transaction.from(validRaw);
const valid = classifyVoidEconomicEpoch2RawTransactionDomainV1(validTx);
assert.equal(valid.ok, true);
assert.equal(valid.status, "SOURCE_RAW_TRANSACTION_EPOCH_DOMAIN_VALID");
assert.equal(valid.chain_id, 2050);
assert.equal(valid.execution_epoch, 2);
assert.equal(valid.transaction_type, 2);
assert.equal(valid.besu_transaction_validation_rule_implemented, true);
assert.equal(valid.besu_transaction_validation_rule_source_tested, true);
assert.equal(valid.plugin_artifact_content_addressed, true);
assert.equal(valid.plugin_artifact_runtime_identity_verified, true);
assert.equal(valid.besu_transaction_validation_rule_runtime_proven, true);
assert.equal(valid.cross_epoch_replay_protection_proven, false);

const legacyRaw = await wallet.signTransaction({
  type: 0,
  chainId: 2050,
  nonce: 0,
  gasPrice: 0,
  gasLimit: 100000,
  to: base.to,
  value: 0,
  data: "0x",
});
const legacy = classifyVoidEconomicEpoch2RawTransactionDomainV1(
  Transaction.from(legacyRaw),
);
assert.equal(legacy.ok, false);
assert.equal(legacy.reason, "epoch2_type2_transaction_required");

const noMarkerRaw = await wallet.signTransaction({
  ...base,
  accessList: [extra],
});
const noMarker = classifyVoidEconomicEpoch2RawTransactionDomainV1(
  Transaction.from(noMarkerRaw),
);
assert.equal(noMarker.ok, false);
assert.equal(noMarker.reason, "epoch2_marker_entry_count_invalid");

const wrongMarkerRaw = await wallet.signTransaction({
  ...base,
  accessList: [{
    address: marker.address,
    storageKeys: ["0x" + "11".repeat(32)],
  }],
});
const wrongMarker = classifyVoidEconomicEpoch2RawTransactionDomainV1(
  Transaction.from(wrongMarkerRaw),
);
assert.equal(wrongMarker.ok, false);
assert.equal(wrongMarker.reason, "epoch2_marker_storage_key_invalid");

const duplicateMarkerRaw = await wallet.signTransaction({
  ...base,
  accessList: [marker, marker],
});
const duplicateMarker = classifyVoidEconomicEpoch2RawTransactionDomainV1(
  Transaction.from(duplicateMarkerRaw),
);
assert.equal(duplicateMarker.ok, false);
assert.equal(duplicateMarker.reason, "epoch2_marker_entry_count_invalid");

const validUnsigned = Transaction.from({
  ...base,
  accessList: [marker],
}).unsignedHash;
const wrongUnsigned = Transaction.from({
  ...base,
  accessList: [{
    address: marker.address,
    storageKeys: ["0x" + "22".repeat(32)],
  }],
}).unsignedHash;
assert.notEqual(validUnsigned, wrongUnsigned);

const wrongChainRaw = await wallet.signTransaction({
  ...base,
  chainId: 1,
  accessList: [marker],
});
const wrongChain = classifyVoidEconomicEpoch2RawTransactionDomainV1(
  Transaction.from(wrongChainRaw),
);
assert.equal(wrongChain.ok, false);
assert.equal(wrongChain.reason, "chain_id_mismatch");

assert.equal(policy.gates.besu_transaction_validation_rule_implemented, true);
assert.equal(policy.gates.besu_transaction_validation_rule_source_tested, true);
assert.equal(policy.gates.plugin_artifact_content_addressed, true);
assert.equal(policy.gates.plugin_artifact_runtime_identity_verified, true);
assert.equal(policy.gates.besu_transaction_validation_rule_runtime_proven, true);
assert.equal(policy.gates.all_production_validators_epoch_domain_enforced, false);
assert.equal(policy.gates.cross_epoch_replay_protection_proven, false);
assert.equal(policy.gates.migration_authorized, false);
assert.equal(policy.gates.public_activation_authorized, false);

console.log("VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_V1_PROOF_GREEN");
console.log("chain_id=2050");
console.log("execution_epoch=2");
console.log("transaction_type=2");
console.log("signed_access_list_epoch_marker_required=true");
console.log("legacy_type0_rejected=true");
console.log("missing_marker_rejected=true");
console.log("wrong_marker_rejected=true");
console.log("marker_changes_signing_digest=true");
console.log("besu_transaction_validation_rule_implemented=true");
console.log("besu_transaction_validation_rule_source_tested=true");
console.log("plugin_artifact_content_addressed=true");
console.log("plugin_artifact_runtime_identity_verified=true");
console.log("besu_transaction_validation_rule_runtime_proven=true");
console.log("cross_epoch_replay_protection_proven=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
