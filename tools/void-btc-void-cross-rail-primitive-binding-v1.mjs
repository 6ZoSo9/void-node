#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BTC_VOID_BITCOIN_HTLC_V1,
  buildVoidBtcVoidBitcoinHtlcV1,
  parseVoidBtcVoidBitcoinHtlcV1,
} from "./void-btc-void-bitcoin-htlc-v1.mjs";

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
  validateVoidBtcVoidChain2050CompilerEnvironmentV1,
} from "./void-btc-void-chain2050-hashlock-v1.mjs";

export const VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1 =
  "VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1";

export const REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1 = Object.freeze({
  bitcoin_htlc_tool_git_blob_sha1:
    "c0179654221b9fee789dbfe9933c8d3bd6ba0de4",
  chain2050_contract_git_blob_sha1:
    "0824583b0519048290e84be8e79e4877756adcfa",
  canonical_void_token_git_blob_sha1:
    "7c4297aadbc17b6214b4dde1f1766523cb499923",
  chain2050_compiler_tool_git_blob_sha1:
    "1175b71e4e7c37788db9ab909eaa4e5a6039fe3c",
});

export const VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_binding: true,
    reviewed_primitive_source_blobs_required: true,
    bitcoin_htlc_rederived: true,
    chain2050_compiler_identity_content_addressed: true,
    same_sha256_hashlock_required: true,
    exact_32_byte_preimage_domain_required: true,
    explicit_party_role_mapping_required: true,
    timeout_values_bound: true,
    timeout_safety_observed: false,
    asymmetric_cross_chain_timeout_margin_verified: false,
    bitcoin_execution_performed: false,
    chain2050_execution_performed: false,
    bitcoin_rpc_call: false,
    chain2050_rpc_call: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    contract_deployment: false,
    production_inventory_reservation: false,
    production_inventory_funding: false,
    treasury_action: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const INPUT_SCHEMA =
  "void.btc_void.cross_rail_primitive_binding_request.v1";
const OUTPUT_SCHEMA =
  "void.btc_void.cross_rail_primitive_binding.v1";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const H160 = /^[0-9a-f]{40}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const IDENTITY_ID = /^voidbtvc2050h1_[0-9a-f]{64}$/u;
const BINDING_ID = /^voidbtcxrb1_[0-9a-f]{64}$/u;
const MAX_STDIN_BYTES = 8 * 1024 * 1024;
const PARTIES = new Set(["initiator", "counterparty"]);
const DIRECTIONS = new Set(["btc_to_void", "void_to_btc"]);

const EXPECTED_METHOD_SIGNATURES = Object.freeze([
  "claim(bytes32,bytes)",
  "getSwap(bytes32)",
  "lock(bytes32,bytes32,address,uint256,uint256)",
  "refund(bytes32)",
  "stateOf(bytes32)",
  "voidToken()",
]);

const EXPECTED_DESIGN = Object.freeze({
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
});

function fail(code) {
  throw new Error(code);
}

function plain(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  return value;
}

function exact(value, keys, code) {
  plain(value, code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("cross_rail_canonical_integer_required");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  fail("cross_rail_canonical_value_unsupported");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contentId(prefix, value) {
  return prefix + sha256Hex(Buffer.from(canonicalJson(value), "utf8"));
}

function requireHex(value, pattern, code) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code);
  return value;
}

function requireParty(value, code) {
  if (!PARTIES.has(value)) fail(code);
  return value;
}

function requirePositiveSafeInteger(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function sameCanonical(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function validateCompilerIdentity(raw) {
  const value = exact(
    raw,
    [
      "marker",
      "version",
      "status",
      "chain_id",
      "execution_epoch",
      "contract",
      "compiler",
      "artifacts",
      "source",
      "design",
      "authority",
      "identity_id",
    ],
    "cross_rail_chain_identity_shape_invalid",
  );

  if (
    value.marker !==
      VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1 ||
    value.version !== 1 ||
    value.status !==
      "CHAIN2050_HASHLOCK_SOURCE_COMPILER_IDENTITY_GREEN_NOT_DEPLOYED" ||
    value.chain_id !== 2050 ||
    value.execution_epoch !== 2 ||
    !IDENTITY_ID.test(String(value.identity_id || ""))
  ) {
    fail("cross_rail_chain_identity_header_invalid");
  }

  const contract = exact(
    value.contract,
    [
      "path",
      "name",
      "canonical_void_token",
      "source_sha256",
      "source_git_blob_sha1",
      "source_bytes",
      "canonical_void_token_source",
    ],
    "cross_rail_chain_contract_identity_shape_invalid",
  );
  if (
    contract.path !== CONTRACT_PATH ||
    contract.name !== CONTRACT_NAME ||
    contract.canonical_void_token !== CANONICAL_VOID_TOKEN ||
    requireHex(
      contract.source_sha256,
      HEX64,
      "cross_rail_chain_contract_source_sha256_invalid",
    ) !== contract.source_sha256 ||
    contract.source_git_blob_sha1 !==
      REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.chain2050_contract_git_blob_sha1 ||
    !Number.isSafeInteger(contract.source_bytes) ||
    contract.source_bytes < 1
  ) {
    fail("cross_rail_chain_contract_identity_invalid");
  }

  const tokenSource = exact(
    contract.canonical_void_token_source,
    [
      "path",
      "source_sha256",
      "source_git_blob_sha1",
      "source_bytes",
      "transfer_semantics_verified_source_only",
      "runtime_code_verified",
    ],
    "cross_rail_token_source_shape_invalid",
  );
  if (
    tokenSource.path !== CANONICAL_VOID_TOKEN_SOURCE_PATH ||
    !HEX64.test(String(tokenSource.source_sha256 || "")) ||
    tokenSource.source_git_blob_sha1 !==
      REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.canonical_void_token_git_blob_sha1 ||
    !Number.isSafeInteger(tokenSource.source_bytes) ||
    tokenSource.source_bytes < 1 ||
    tokenSource.transfer_semantics_verified_source_only !== true ||
    tokenSource.runtime_code_verified !== false
  ) {
    fail("cross_rail_token_source_identity_invalid");
  }

  const compiler = exact(
    value.compiler,
    [
      "version",
      "release",
      "evm_version",
      "optimizer_enabled",
      "optimizer_runs",
      "via_ir",
      "environment_a",
      "environment_b",
      "exact_standard_json_input_sha256",
      "output_a_sha256",
      "output_b_sha256",
      "compiler_outputs_cross_checked",
      "compiler_execution_rederived",
      "caller_supplied_compiler_artifacts_accepted",
    ],
    "cross_rail_compiler_identity_shape_invalid",
  );
  if (
    compiler.version !== SOLC_VERSION ||
    compiler.release !== SOLC_RELEASE ||
    compiler.evm_version !== EVM_VERSION ||
    compiler.optimizer_enabled !== false ||
    compiler.optimizer_runs !== 200 ||
    compiler.via_ir !== false ||
    !HEX64.test(String(compiler.exact_standard_json_input_sha256 || "")) ||
    !HEX64.test(String(compiler.output_a_sha256 || "")) ||
    !HEX64.test(String(compiler.output_b_sha256 || "")) ||
    compiler.compiler_outputs_cross_checked !== true ||
    compiler.compiler_execution_rederived !== true ||
    compiler.caller_supplied_compiler_artifacts_accepted !== false
  ) {
    fail("cross_rail_compiler_identity_invalid");
  }
  validateVoidBtcVoidChain2050CompilerEnvironmentV1(
    compiler.environment_a,
    "native-container",
  );
  validateVoidBtcVoidChain2050CompilerEnvironmentV1(
    compiler.environment_b,
    "solcjs",
  );
  if (
    compiler.environment_a.artifact_identity !==
      REVIEWED_NATIVE_SOLC_IMAGE_ID ||
    compiler.environment_b.artifact_identity !==
      "npm-integrity:" + REVIEWED_SOLCJS_PACKAGE_SRI
  ) {
    fail("cross_rail_compiler_artifact_identity_invalid");
  }

  const artifacts = exact(
    value.artifacts,
    [
      "creation_bytecode_bytes",
      "creation_bytecode_sha256",
      "runtime_bytecode_bytes",
      "runtime_bytecode_sha256",
      "abi_sha256",
      "method_identifiers",
      "method_identifiers_sha256",
      "storage_layout_sha256",
      "metadata_sha256",
      "storage_slot_zero_label",
      "link_references_absent",
      "immutable_references_absent",
    ],
    "cross_rail_chain_artifacts_shape_invalid",
  );
  for (const key of [
    "creation_bytecode_sha256",
    "runtime_bytecode_sha256",
    "abi_sha256",
    "method_identifiers_sha256",
    "storage_layout_sha256",
    "metadata_sha256",
  ]) {
    if (!HEX64.test(String(artifacts[key] || ""))) {
      fail("cross_rail_chain_artifact_digest_invalid:" + key);
    }
  }
  if (
    !Number.isSafeInteger(artifacts.creation_bytecode_bytes) ||
    artifacts.creation_bytecode_bytes < 1 ||
    !Number.isSafeInteger(artifacts.runtime_bytecode_bytes) ||
    artifacts.runtime_bytecode_bytes < 1 ||
    artifacts.storage_slot_zero_label !== "_swaps" ||
    artifacts.link_references_absent !== true ||
    artifacts.immutable_references_absent !== true
  ) {
    fail("cross_rail_chain_artifacts_invalid");
  }
  const methods = exact(
    artifacts.method_identifiers,
    EXPECTED_METHOD_SIGNATURES,
    "cross_rail_chain_method_identifiers_shape_invalid",
  );
  for (const signature of EXPECTED_METHOD_SIGNATURES) {
    if (!/^[0-9a-f]{8}$/u.test(String(methods[signature] || ""))) {
      fail("cross_rail_chain_method_identifier_invalid:" + signature);
    }
  }

  const source = exact(
    value.source,
    [
      "repository",
      "repository_head_sha",
      "repository_tree_sha",
      "canonical_remote_url",
    ],
    "cross_rail_chain_source_shape_invalid",
  );
  if (
    source.repository !== "6ZoSo9/void-node" ||
    !HEX40.test(String(source.repository_head_sha || "")) ||
    !HEX40.test(String(source.repository_tree_sha || "")) ||
    source.canonical_remote_url !== "https://github.com/6ZoSo9/void-node.git"
  ) {
    fail("cross_rail_chain_source_identity_invalid");
  }

  const design = exact(
    value.design,
    Object.keys(EXPECTED_DESIGN),
    "cross_rail_chain_design_shape_invalid",
  );
  if (!sameCanonical(design, EXPECTED_DESIGN)) {
    fail("cross_rail_chain_design_identity_invalid");
  }
  if (!sameCanonical(value.authority, CHAIN2050_AUTHORITY_V1)) {
    fail("cross_rail_chain_authority_invalid");
  }

  const material = structuredClone(value);
  delete material.identity_id;
  if (
    value.identity_id !==
      "voidbtvc2050h1_" +
        sha256Hex(Buffer.from(canonicalJson(material), "utf8"))
  ) {
    fail("cross_rail_chain_identity_id_mismatch");
  }

  return value;
}

function validateInput(raw) {
  const value = exact(
    raw,
    [
      "schema",
      "version",
      "direction",
      "preimage_hash_function",
      "required_preimage_bytes",
      "bitcoin",
      "chain2050",
      "chain2050_compiler_identity",
    ],
    "cross_rail_binding_input_shape_invalid",
  );
  if (
    value.schema !== INPUT_SCHEMA ||
    value.version !== 1 ||
    !DIRECTIONS.has(value.direction) ||
    value.preimage_hash_function !== "SHA256" ||
    value.required_preimage_bytes !== 32
  ) {
    fail("cross_rail_binding_input_header_invalid");
  }

  const bitcoin = exact(
    value.bitcoin,
    [
      "hashlock_hex",
      "redeem_pubkey_hash160",
      "refund_pubkey_hash160",
      "refund_locktime",
      "redeem_party",
      "refund_party",
    ],
    "cross_rail_bitcoin_input_shape_invalid",
  );
  requireHex(bitcoin.hashlock_hex, HEX64, "cross_rail_bitcoin_hashlock_invalid");
  requireHex(
    bitcoin.redeem_pubkey_hash160,
    H160,
    "cross_rail_bitcoin_redeem_hash160_invalid",
  );
  requireHex(
    bitcoin.refund_pubkey_hash160,
    H160,
    "cross_rail_bitcoin_refund_hash160_invalid",
  );
  requirePositiveSafeInteger(
    bitcoin.refund_locktime,
    "cross_rail_bitcoin_refund_locktime_invalid",
  );
  requireParty(bitcoin.redeem_party, "cross_rail_bitcoin_redeem_party_invalid");
  requireParty(bitcoin.refund_party, "cross_rail_bitcoin_refund_party_invalid");
  if (bitcoin.redeem_party === bitcoin.refund_party) {
    fail("cross_rail_bitcoin_parties_must_differ");
  }

  const chain2050 = exact(
    value.chain2050,
    [
      "hashlock_hex",
      "beneficiary_address",
      "refund_authority_address",
      "refund_deadline_unix",
      "beneficiary_party",
      "refund_party",
    ],
    "cross_rail_chain_input_shape_invalid",
  );
  requireHex(chain2050.hashlock_hex, HEX64, "cross_rail_chain_hashlock_invalid");
  requireHex(
    chain2050.beneficiary_address,
    ADDRESS,
    "cross_rail_chain_beneficiary_invalid",
  );
  requireHex(
    chain2050.refund_authority_address,
    ADDRESS,
    "cross_rail_chain_refund_authority_invalid",
  );
  requirePositiveSafeInteger(
    chain2050.refund_deadline_unix,
    "cross_rail_chain_refund_deadline_invalid",
  );
  requireParty(
    chain2050.beneficiary_party,
    "cross_rail_chain_beneficiary_party_invalid",
  );
  requireParty(chain2050.refund_party, "cross_rail_chain_refund_party_invalid");
  if (
    chain2050.beneficiary_address === chain2050.refund_authority_address ||
    chain2050.beneficiary_party === chain2050.refund_party
  ) {
    fail("cross_rail_chain_roles_must_differ");
  }

  if (bitcoin.hashlock_hex !== chain2050.hashlock_hex) {
    fail("cross_rail_hashlock_mismatch");
  }
  if (
    bitcoin.redeem_party !== chain2050.refund_party ||
    bitcoin.refund_party !== chain2050.beneficiary_party
  ) {
    fail("cross_rail_party_mapping_invalid");
  }

  return {
    value,
    bitcoin,
    chain2050,
    chainIdentity: validateCompilerIdentity(value.chain2050_compiler_identity),
  };
}

export function bindVoidBtcVoidCrossRailPrimitivesV1(raw) {
  const { value, bitcoin, chain2050, chainIdentity } = validateInput(raw);

  const htlc = buildVoidBtcVoidBitcoinHtlcV1({
    hashlock_hex: bitcoin.hashlock_hex,
    redeem_pubkey_hash160: bitcoin.redeem_pubkey_hash160,
    refund_pubkey_hash160: bitcoin.refund_pubkey_hash160,
    refund_locktime: bitcoin.refund_locktime,
  });
  const parsed = parseVoidBtcVoidBitcoinHtlcV1({
    witness_script_hex: htlc.witness_script_hex,
  });
  if (
    htlc.marker !== VOID_BTC_VOID_BITCOIN_HTLC_V1 ||
    htlc.hash_function !== "SHA256" ||
    htlc.required_preimage_bytes !== 32 ||
    parsed.htlc_id !== htlc.htlc_id ||
    parsed.witness_script_hex !== htlc.witness_script_hex ||
    parsed.p2wsh_script_pubkey_hex !== htlc.p2wsh_script_pubkey_hex
  ) {
    fail("cross_rail_bitcoin_htlc_rederivation_invalid");
  }

  const material = Object.freeze({
    schema: OUTPUT_SCHEMA,
    marker: VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1,
    version: 1,
    status: "SOURCE_PRIMITIVES_BOUND_TIMEOUT_EXECUTION_HOLD",
    direction: value.direction,
    reviewed_primitive_source_blobs:
      REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1,
    preimage_domain: Object.freeze({
      hash_function: "SHA256",
      required_preimage_bytes: 32,
      hashlock_hex: bitcoin.hashlock_hex,
      same_hashlock_bound_to_both_rails: true,
      bitcoin_preimage_contract_rederived: true,
      chain2050_preimage_contract_compiler_bound: true,
    }),
    party_mapping: Object.freeze({
      bitcoin_redeem_party: bitcoin.redeem_party,
      bitcoin_refund_party: bitcoin.refund_party,
      chain2050_beneficiary_party: chain2050.beneficiary_party,
      chain2050_refund_party: chain2050.refund_party,
      bitcoin_redeem_maps_to_chain2050_refund: true,
      bitcoin_refund_maps_to_chain2050_beneficiary: true,
    }),
    bitcoin: Object.freeze({
      htlc_id: htlc.htlc_id,
      tool_git_blob_sha1:
        REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1.bitcoin_htlc_tool_git_blob_sha1,
      hashlock_hex: htlc.hashlock_hex,
      redeem_pubkey_hash160: htlc.redeem_pubkey_hash160,
      refund_pubkey_hash160: htlc.refund_pubkey_hash160,
      refund_locktime: htlc.refund_locktime,
      refund_locktime_type: htlc.refund_locktime_type,
      refund_locktime_finality_clock: htlc.refund_locktime_finality_clock,
      witness_script_sha256: htlc.witness_script_sha256,
      p2wsh_witness_program_hex: htlc.p2wsh_witness_program_hex,
      p2wsh_script_pubkey_hex: htlc.p2wsh_script_pubkey_hex,
    }),
    chain2050: Object.freeze({
      compiler_identity_id: chainIdentity.identity_id,
      compiler_tool_git_blob_sha1:
        REVIEWED_PRIMITIVE_SOURCE_BLOBS_V1
          .chain2050_compiler_tool_git_blob_sha1,
      contract_source_git_blob_sha1:
        chainIdentity.contract.source_git_blob_sha1,
      contract_source_sha256: chainIdentity.contract.source_sha256,
      canonical_void_token: chainIdentity.contract.canonical_void_token,
      canonical_void_token_source_git_blob_sha1:
        chainIdentity.contract.canonical_void_token_source.source_git_blob_sha1,
      repository_head_sha: chainIdentity.source.repository_head_sha,
      repository_tree_sha: chainIdentity.source.repository_tree_sha,
      creation_bytecode_sha256:
        chainIdentity.artifacts.creation_bytecode_sha256,
      runtime_bytecode_sha256:
        chainIdentity.artifacts.runtime_bytecode_sha256,
      abi_sha256: chainIdentity.artifacts.abi_sha256,
      method_identifiers_sha256:
        chainIdentity.artifacts.method_identifiers_sha256,
      hashlock_hex: chain2050.hashlock_hex,
      beneficiary_address: chain2050.beneficiary_address,
      refund_authority_address: chain2050.refund_authority_address,
      refund_deadline_unix: chain2050.refund_deadline_unix,
      fixed_single_contract_runtime: true,
      per_swap_deployment_required: false,
      claim_strictly_before_refund_deadline: true,
      refund_at_or_after_deadline: true,
    }),
    timeout_binding: Object.freeze({
      bitcoin_refund_locktime: htlc.refund_locktime,
      bitcoin_refund_locktime_type: htlc.refund_locktime_type,
      bitcoin_refund_locktime_finality_clock:
        htlc.refund_locktime_finality_clock,
      chain2050_refund_deadline_unix: chain2050.refund_deadline_unix,
      timeout_safety_observed: false,
      asymmetric_cross_chain_timeout_margin_verified: false,
    }),
    authority: VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_AUTHORITY_V1,
  });

  return Object.freeze({
    ...material,
    binding_id: contentId("voidbtcxrb1_", material),
  });
}

async function readStdin() {
  const chunks = [];
  let total = 0;
  for await (const chunk of process.stdin) {
    total += chunk.length;
    if (total > MAX_STDIN_BYTES) fail("cross_rail_stdin_too_large");
    chunks.push(chunk);
  }
  if (total < 1) fail("cross_rail_stdin_empty");
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  if (process.argv[2] !== "bind" || process.argv.length !== 3) {
    fail("usage: void-btc-void-cross-rail-primitive-binding-v1.mjs bind < input.json");
  }
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch (error) {
    if (String(error?.message || "") === "cross_rail_stdin_too_large") throw error;
    fail("cross_rail_stdin_json_invalid");
  }
  process.stdout.write(
    JSON.stringify(bindVoidBtcVoidCrossRailPrimitivesV1(input), null, 2) + "\n",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    process.stderr.write(String(error?.message || error) + "\n");
    process.exitCode = 1;
  });
}
