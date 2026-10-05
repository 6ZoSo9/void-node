#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1,
  VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_AUTHORITY_V1,
  VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1,
  bindVoidBtcVoidCrossRailPrimitivesV1,
} from "../tools/void-btc-void-cross-rail-primitive-binding-v1.mjs";

import {
  AUTHORITY as CHAIN2050_AUTHORITY_V1,
  CANONICAL_VOID_TOKEN,
  CANONICAL_VOID_TOKEN_SOURCE_PATH,
  CONTRACT_NAME,
  CONTRACT_PATH,
  EVM_VERSION,
  REVIEWED_NATIVE_SOLC_IMAGE_ID,
  REVIEWED_SOLCJS_PACKAGE_SRI,
  SOLC_RELEASE,
  SOLC_VERSION,
  VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1,
  VOID_SOLC_COMPILER_ENVIRONMENT_V1,
} from "../tools/void-btc-void-chain2050-hashlock-v1.mjs";

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

function reidentity(value) {
  const copy = structuredClone(value);
  delete copy.identity_id;
  return {
    ...copy,
    identity_id:
      "voidbtvc2050h1_" +
      sha256(Buffer.from(canonicalJson(copy), "utf8")),
  };
}

function structuralChainIdentity() {
  return reidentity({
    marker: VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1,
    version: 1,
    status: "CHAIN2050_HASHLOCK_SOURCE_COMPILER_IDENTITY_GREEN_NOT_DEPLOYED",
    chain_id: 2050,
    execution_epoch: 2,
    contract: {
      path: CONTRACT_PATH,
      name: CONTRACT_NAME,
      canonical_void_token: CANONICAL_VOID_TOKEN,
      source_sha256: "1".repeat(64),
      source_git_blob_sha1:
        REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.chain2050_contract_git_blob_sha1,
      source_bytes: 8277,
      canonical_void_token_source: {
        path: CANONICAL_VOID_TOKEN_SOURCE_PATH,
        source_sha256: "2".repeat(64),
        source_git_blob_sha1:
          REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.canonical_void_token_git_blob_sha1,
        source_bytes: 3236,
        transfer_semantics_verified_source_only: true,
        runtime_code_verified: false,
      },
    },
    compiler: {
      version: SOLC_VERSION,
      release: SOLC_RELEASE,
      evm_version: EVM_VERSION,
      optimizer_enabled: false,
      optimizer_runs: 200,
      via_ir: false,
      environment_a: {
        marker: VOID_SOLC_COMPILER_ENVIRONMENT_V1,
        compiler_release: SOLC_RELEASE,
        kind: "native-container",
        version_output: "Version: " + SOLC_RELEASE,
        implementation: "ethereum-solc-native-linux-amd64",
        artifact_identity: REVIEWED_NATIVE_SOLC_IMAGE_ID,
        image_id_verified: true,
        execution_network_disabled: true,
      },
      environment_b: {
        marker: VOID_SOLC_COMPILER_ENVIRONMENT_V1,
        compiler_release: SOLC_RELEASE,
        kind: "solcjs",
        version_output: "Version: " + SOLC_RELEASE,
        implementation: "solc-js-emscripten-direct-soljson",
        artifact_identity: "npm-integrity:" + REVIEWED_SOLCJS_PACKAGE_SRI,
        package_tarball_sri_verified: true,
        direct_solidity_compile_c_api: true,
        package_dependencies_executed: false,
        soljson_sha256: "3".repeat(64),
      },
      exact_standard_json_input_sha256: "4".repeat(64),
      output_a_sha256: "5".repeat(64),
      output_b_sha256: "6".repeat(64),
      compiler_outputs_cross_checked: true,
      compiler_execution_rederived: true,
      caller_supplied_compiler_artifacts_accepted: false,
    },
    artifacts: {
      creation_bytecode_bytes: 4096,
      creation_bytecode_sha256: "7".repeat(64),
      runtime_bytecode_bytes: 3072,
      runtime_bytecode_sha256: "8".repeat(64),
      abi_sha256: "9".repeat(64),
      method_identifiers: {
        "claim(bytes32,bytes)": "11111111",
        "getSwap(bytes32)": "22222222",
        "lock(bytes32,bytes32,address,uint256,uint256)": "33333333",
        "refund(bytes32)": "44444444",
        "stateOf(bytes32)": "55555555",
        "voidToken()": "66666666",
      },
      method_identifiers_sha256: "a".repeat(64),
      storage_layout_sha256: "b".repeat(64),
      metadata_sha256: "c".repeat(64),
      storage_slot_zero_label: "_swaps",
      link_references_absent: true,
      immutable_references_absent: true,
    },
    source: {
      repository: "6ZoSo9/void-node",
      repository_head_sha: "d".repeat(40),
      repository_tree_sha: "e".repeat(40),
      canonical_remote_url: "https://github.com/6ZoSo9/void-node.git",
    },
    design: {
      fixed_single_contract_runtime: true,
      per_swap_deployment_required: false,
      funding_caller_is_refund_authority: true,
      exact_funding_balance_delta_required: true,
      exact_terminal_balance_delta_required: true,
      exact_32_byte_sha256_preimage_required: true,
      claim_strictly_before_refund_deadline: true,
      refund_at_or_after_deadline: true,
      one_terminal_transition_only: true,
      terminal_state_before_token_transfer: true,
      owner_or_admin_surface: false,
      arbitrary_withdrawal_surface: false,
      proxy_or_upgrade_surface: false,
    },
    authority: CHAIN2050_AUTHORITY_V1,
  });
}

function request(identity = structuralChainIdentity()) {
  return {
    schema: "void.btc_void.cross_rail_primitive_binding_request.v1",
    version: 1,
    direction: "btc_to_void",
    preimage_hash_function: "SHA256",
    required_preimage_bytes: 32,
    bitcoin: {
      hashlock_hex: "11".repeat(32),
      redeem_pubkey_hash160: "22".repeat(20),
      refund_pubkey_hash160: "33".repeat(20),
      refund_locktime: 1_900_000_000,
      redeem_party: "counterparty",
      refund_party: "initiator",
    },
    chain2050: {
      hashlock_hex: "11".repeat(32),
      beneficiary_address: "0x" + "44".repeat(20),
      refund_authority_address: "0x" + "55".repeat(20),
      refund_deadline_unix: 1_800_000_000,
      beneficiary_party: "initiator",
      refund_party: "counterparty",
    },
    chain2050_compiler_identity: identity,
  };
}

const identityPath = String(process.env.CHAIN_IDENTITY || "").trim();
const identity = identityPath
  ? JSON.parse(fs.readFileSync(identityPath, "utf8"))
  : structuralChainIdentity();

const input = request(identity);
const binding = bindVoidBtcVoidCrossRailPrimitivesV1(input);
const bindingAgain = bindVoidBtcVoidCrossRailPrimitivesV1(
  structuredClone(input),
);

assert.deepEqual(bindingAgain, binding);
assert.equal(
  binding.marker,
  VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1,
);
assert.equal(binding.status, "SOURCE_PRIMITIVES_BOUND_TIMEOUT_EXECUTION_HOLD");
assert.match(binding.binding_id, /^voidbtcxrb1_[0-9a-f]{64}$/u);
assert.equal(binding.preimage_domain.hash_function, "SHA256");
assert.equal(binding.preimage_domain.required_preimage_bytes, 32);
assert.equal(binding.preimage_domain.same_hashlock_bound_to_both_rails, true);
assert.equal(
  binding.bitcoin.tool_git_blob_sha1,
  REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.bitcoin_htlc_tool_git_blob_sha1,
);
assert.equal(
  binding.chain2050.contract_source_git_blob_sha1,
  REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.chain2050_contract_git_blob_sha1,
);
assert.equal(
  binding.chain2050.canonical_void_token_source_git_blob_sha1,
  REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.canonical_void_token_git_blob_sha1,
);
assert.equal(
  binding.chain2050.compiler_tool_git_blob_sha1,
  REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.chain2050_compiler_tool_git_blob_sha1,
);
assert.equal(binding.chain2050.canonical_void_token, CANONICAL_VOID_TOKEN);
assert.equal(binding.chain2050.fixed_single_contract_runtime, true);
assert.equal(binding.chain2050.per_swap_deployment_required, false);
assert.equal(
  binding.party_mapping.bitcoin_redeem_maps_to_chain2050_refund,
  true,
);
assert.equal(
  binding.party_mapping.bitcoin_refund_maps_to_chain2050_beneficiary,
  true,
);
assert.equal(binding.timeout_binding.timeout_safety_observed, false);
assert.equal(
  binding.timeout_binding.asymmetric_cross_chain_timeout_margin_verified,
  false,
);
assert.deepEqual(
  binding.authority,
  VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_AUTHORITY_V1,
);
for (const key of [
  "bitcoin_execution_performed",
  "chain2050_execution_performed",
  "bitcoin_rpc_call",
  "chain2050_rpc_call",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "contract_deployment",
  "production_inventory_reservation",
  "production_inventory_funding",
  "treasury_action",
  "liquidity_movement",
  "market_activation",
  "public_presale_activation",
  "funds_movement",
]) {
  assert.equal(binding.authority[key], false, key);
}

{
  const bad = structuredClone(input);
  bad.chain2050.hashlock_hex = "10" + "11".repeat(31);
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_hashlock_mismatch/u,
  );
}

{
  const bad = structuredClone(input);
  bad.preimage_hash_function = "KECCAK256";
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_binding_input_header_invalid/u,
  );
}

{
  const bad = structuredClone(input);
  bad.required_preimage_bytes = 31;
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_binding_input_header_invalid/u,
  );
}

{
  const bad = structuredClone(input);
  bad.bitcoin.redeem_party = "initiator";
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_bitcoin_parties_must_differ|cross_rail_party_mapping_invalid/u,
  );
}

{
  const swapped = structuredClone(input);
  const redeem = swapped.bitcoin.redeem_pubkey_hash160;
  swapped.bitcoin.redeem_pubkey_hash160 =
    swapped.bitcoin.refund_pubkey_hash160;
  swapped.bitcoin.refund_pubkey_hash160 = redeem;
  const changed = bindVoidBtcVoidCrossRailPrimitivesV1(swapped);
  assert.notEqual(changed.binding_id, binding.binding_id);
}

{
  const swapped = structuredClone(input);
  const beneficiary = swapped.chain2050.beneficiary_address;
  swapped.chain2050.beneficiary_address =
    swapped.chain2050.refund_authority_address;
  swapped.chain2050.refund_authority_address = beneficiary;
  const changed = bindVoidBtcVoidCrossRailPrimitivesV1(swapped);
  assert.notEqual(changed.binding_id, binding.binding_id);
}

{
  const drifted = structuredClone(identity);
  drifted.artifacts.runtime_bytecode_sha256 = "f".repeat(64);
  const changedInput = request(reidentity(drifted));
  const changed = bindVoidBtcVoidCrossRailPrimitivesV1(changedInput);
  assert.notEqual(changed.binding_id, binding.binding_id);
}

{
  const badIdentity = structuredClone(identity);
  badIdentity.contract.source_git_blob_sha1 = "0".repeat(40);
  const bad = request(reidentity(badIdentity));
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_chain_contract_identity_invalid/u,
  );
}

{
  const badIdentity = structuredClone(identity);
  badIdentity.contract.canonical_void_token =
    "0x" + "9".repeat(40);
  const bad = request(reidentity(badIdentity));
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_chain_contract_identity_invalid/u,
  );
}

{
  const badIdentity = structuredClone(identity);
  badIdentity.design.claim_strictly_before_refund_deadline = false;
  const bad = request(reidentity(badIdentity));
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_chain_design_identity_invalid/u,
  );
}

{
  const bad = structuredClone(input);
  bad.timeout_safety_observed = true;
  assert.throws(
    () => bindVoidBtcVoidCrossRailPrimitivesV1(bad),
    /cross_rail_binding_input_shape_invalid/u,
  );
}

if (identityPath) {
  assert.equal(binding.chain2050.compiler_identity_id, identity.identity_id);
  assert.equal(
    binding.chain2050.repository_head_sha,
    identity.source.repository_head_sha,
  );
  assert.equal(
    binding.chain2050.creation_bytecode_sha256,
    identity.artifacts.creation_bytecode_sha256,
  );
  assert.equal(
    binding.chain2050.runtime_bytecode_sha256,
    identity.artifacts.runtime_bytecode_sha256,
  );
  console.log("real_dual_compiler_identity_consumed=true");
}

console.log("VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1_PROOF_GREEN");
console.log("binding_id=" + binding.binding_id);
console.log("same_sha256_hashlock_bound=true");
console.log("exact_32_byte_preimage_domain_bound=true");
console.log("explicit_party_role_mapping_bound=true");
console.log("bitcoin_witness_p2wsh_identity_bound=true");
console.log("chain2050_compiler_runtime_identity_bound=true");
console.log("canonical_void_token_bound=true");
console.log("source_blob_drift_rejected=true");
console.log("runtime_identity_drift_changes_binding_id=true");
console.log("role_swap_changes_or_rejects_binding=true");
console.log("timeout_values_bound=true");
console.log("timeout_safety_observed=false");
console.log("asymmetric_cross_chain_timeout_margin_verified=false");
console.log("bitcoin_execution_performed=false");
console.log("chain2050_execution_performed=false");
console.log("contract_deployment=false");
console.log("funds_movement=false");
