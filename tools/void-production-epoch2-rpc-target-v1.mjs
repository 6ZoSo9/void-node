#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1";
export const HOLD_STATUS =
  "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED";
export const SELECTED_STATUS =
  "PRODUCTION_EPOCH2_RPC_TARGET_SELECTED_OBSERVATION_ONLY";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const TARGET_REL =
  "ops/mainnet0/production-epoch2-rpc-target-v1.json";
const PUBLIC_READ_CONTRACT_REL =
  "ops/mainnet0/economic-epoch2-public-read-runtime-contract-v1.json";
const ACTIVATION_CONTRACT_REL =
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
const ACTIVATION_RUNNER_REL =
  "ops/precision/void-precision-epoch2-qbft-private-runtime-activate-v1.mjs";

const EXPECTED = Object.freeze({
  chain_id: 2050,
  execution_epoch: 2,
  hostname: "zoso-Precision-Tower-7810",
  client: "Besu",
  client_version: "26.8.1",
  besu_image:
    "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042",
  genesis_file_sha256:
    "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941",
  genesis_block_hash:
    "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d",
  genesis_state_root:
    "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2",
  state_manifest_rel:
    "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
  state_manifest_sha256:
    "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9",
  qbft_rel:
    "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
  qbft_file_sha256:
    "c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee",
  qbft_payload_sha256:
    "3449e754ec65555e90ea70cdf830f4a8a18946ee5b6221fcf5ad1a748a98c181",
  validator_count: 3,
  validator_evidence_rel:
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-evidence-v1.json",
  validator_evidence_sha256:
    "5006aa32a298c0fbcea6395e75201af66fedacde5b664ac953699dfb2f0c061b",
  validator_evidence_id:
    "voide2pse1_a10332cc6dcd89bc0988d865946185a22e9a448ce94bde7861512af2b1b8e973",
  validator_promotion_rel:
    "ops/mainnet0/economic-epoch2-production-successor-equivalence-promotion-v1.json",
  activation_contract_rel:
    "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs",
  activation_runner_rel:
    "ops/precision/void-precision-epoch2-qbft-private-runtime-activate-v1.mjs",
  prospective_rpc_url: "http://127.0.0.1:18553/",
  prospective_service_unit:
    "void-economic-epoch2-qbft-validator-v1.service",
});

const FORBIDDEN = Object.freeze({
  legacy_epoch1_archive_rpc: "http://127.0.0.1:8545/",
  isolated_successor_equivalence_rpc: "http://127.0.0.1:18550/",
  isolated_besu_free_gas_rpc: "http://127.0.0.1:18551/",
  isolated_besu_nonce_continuity_rpc: "http://127.0.0.1:18552/",
  rationale:
    "historical_or_isolated_proof_surfaces_do_not_acquire_production_authority",
});

const AUTHORITY = Object.freeze({
  source_only: true,
  rpc_call: false,
  service_action: false,
  credential_access: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_submission: false,
  transaction_broadcast: false,
  authoritative_chain2050_write: false,
  validator_mutation: false,
  migration_authorized: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const CONSUMERS = Object.freeze([
  "datanet_registry_deployer_resolution",
  "participant_postpurchase_production_runtime_finality",
  "wc_void_market_vault_live_deployment_observation",
  "future_buy_void_and_economic_submission",
]);

const TOP_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "production_host",
  "reviewed_successor_identity",
  "selection",
  "forbidden_as_production_targets",
  "downstream_consumers",
  "authority",
  "next_gate",
]);
const HOST_KEYS = Object.freeze(["machine_role", "hostname"]);
const IDENTITY_KEYS = Object.freeze([
  "client",
  "client_version",
  "besu_image",
  "genesis_file_sha256",
  "genesis_block_hash",
  "genesis_state_root",
  "client_neutral_state_manifest_path",
  "client_neutral_state_manifest_sha256",
  "qbft_extra_data_path",
  "qbft_extra_data_file_sha256",
  "qbft_extra_data_payload_sha256",
  "validator_count",
  "production_validator_binding_evidence_path",
  "production_validator_binding_evidence_sha256",
  "production_validator_binding_evidence_id",
  "production_validator_binding_promotion_path",
  "private_runtime_activation_contract_path",
  "private_runtime_activation_runner_path",
  "prospective_production_rpc_url",
  "prospective_production_service_unit",
]);
const SELECTION_KEYS = Object.freeze([
  "production_rpc_target_selected",
  "rpc_url",
  "rpc_url_fingerprint_sha256",
  "service_unit",
  "activation_plan_id",
  "activation_receipt_id",
  "activation_receipt_sha256",
  "runtime_observation_id",
  "runtime_observation_sha256",
  "runtime_active_verified",
  "exact_genesis_bound",
  "production_validator_set_bound",
  "production_validator_binding_source_path",
  "production_validator_binding_evidence_sha256",
  "write_capability_classification",
  "independent_host_acceptance",
]);

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_object_required");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(label + "_keys_invalid");
  }
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
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

function deepEqualJson(actual, expected, label) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail(label + "_mismatch");
  }
}

function fingerprint(url) {
  return sha256(Buffer.from(url, "utf8"));
}

function canonicalLoopbackRpcUrl(value) {
  if (typeof value !== "string") fail("production_epoch2_rpc_url_invalid");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("production_epoch2_rpc_url_invalid");
  }
  if (
    parsed.protocol !== "http:" ||
    (parsed.hostname !== "127.0.0.1" &&
      parsed.hostname !== "[::1]" &&
      parsed.hostname !== "::1") ||
    !parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    fail("production_epoch2_rpc_url_not_canonical_loopback");
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    fail("production_epoch2_rpc_port_invalid");
  }
  if (parsed.href !== value) {
    fail("production_epoch2_rpc_url_not_canonical_loopback");
  }
  return parsed.href;
}

function validateIdentity(identity) {
  exactKeys(identity, IDENTITY_KEYS, "reviewed_successor_identity");
  const required = {
    client: EXPECTED.client,
    client_version: EXPECTED.client_version,
    besu_image: EXPECTED.besu_image,
    genesis_file_sha256: EXPECTED.genesis_file_sha256,
    genesis_block_hash: EXPECTED.genesis_block_hash,
    genesis_state_root: EXPECTED.genesis_state_root,
    client_neutral_state_manifest_path: EXPECTED.state_manifest_rel,
    client_neutral_state_manifest_sha256: EXPECTED.state_manifest_sha256,
    qbft_extra_data_path: EXPECTED.qbft_rel,
    qbft_extra_data_file_sha256: EXPECTED.qbft_file_sha256,
    qbft_extra_data_payload_sha256: EXPECTED.qbft_payload_sha256,
    validator_count: EXPECTED.validator_count,
    production_validator_binding_evidence_path:
      EXPECTED.validator_evidence_rel,
    production_validator_binding_evidence_sha256:
      EXPECTED.validator_evidence_sha256,
    production_validator_binding_evidence_id:
      EXPECTED.validator_evidence_id,
    production_validator_binding_promotion_path:
      EXPECTED.validator_promotion_rel,
    private_runtime_activation_contract_path:
      EXPECTED.activation_contract_rel,
    private_runtime_activation_runner_path:
      EXPECTED.activation_runner_rel,
    prospective_production_rpc_url:
      EXPECTED.prospective_rpc_url,
    prospective_production_service_unit:
      EXPECTED.prospective_service_unit,
  };
  deepEqualJson(identity, required, "reviewed_successor_identity");
}

function verifyReviewedSourceFiles() {
  const stateBytes = fs.readFileSync(path.join(ROOT, EXPECTED.state_manifest_rel));
  if (sha256(stateBytes) !== EXPECTED.state_manifest_sha256) {
    fail("production_epoch2_state_manifest_file_sha256_mismatch");
  }

  const qbftBytes = fs.readFileSync(path.join(ROOT, EXPECTED.qbft_rel));
  if (sha256(qbftBytes) !== EXPECTED.qbft_file_sha256) {
    fail("production_epoch2_qbft_file_sha256_mismatch");
  }
  const qbft = JSON.parse(qbftBytes.toString("utf8"));
  if (
    qbft.extra_data_sha256 !== EXPECTED.qbft_payload_sha256 ||
    qbft.validator_count !== EXPECTED.validator_count
  ) {
    fail("production_epoch2_qbft_semantics_mismatch");
  }

  const validatorEvidenceBytes = fs.readFileSync(
    path.join(ROOT, EXPECTED.validator_evidence_rel),
  );
  if (sha256(validatorEvidenceBytes) !== EXPECTED.validator_evidence_sha256) {
    fail("production_epoch2_validator_evidence_sha256_mismatch");
  }
  const validatorEvidence = JSON.parse(
    validatorEvidenceBytes.toString("utf8"),
  );
  if (
    validatorEvidence.evidence_id !== EXPECTED.validator_evidence_id ||
    validatorEvidence.chain_id !== EXPECTED.chain_id ||
    validatorEvidence.execution_epoch !== EXPECTED.execution_epoch ||
    validatorEvidence.consensus?.production_validator_set_bound !== true
  ) {
    fail("production_epoch2_validator_evidence_semantics_mismatch");
  }

  const promotion = JSON.parse(
    fs.readFileSync(path.join(ROOT, EXPECTED.validator_promotion_rel), "utf8"),
  );
  if (
    promotion.evidence?.evidence_file !== EXPECTED.validator_evidence_rel ||
    promotion.evidence?.evidence_file_sha256 !== EXPECTED.validator_evidence_sha256 ||
    promotion.evidence?.evidence_id !== EXPECTED.validator_evidence_id ||
    promotion.verification?.production_validator_set_bound !== true ||
    promotion.gates?.production_validator_set_bound !== true ||
    promotion.gates?.offline_successor_equivalence_proven !== true ||
    promotion.gates?.all_production_validators_epoch_domain_enforced !== true ||
    promotion.gates?.cross_epoch_replay_protection_proven !== true ||
    promotion.gates?.authoritative_chain2050_write !== false ||
    promotion.gates?.migration_authorized !== false
  ) {
    fail("production_epoch2_validator_promotion_semantics_mismatch");
  }

  const activationContract = fs.readFileSync(
    path.join(ROOT, ACTIVATION_CONTRACT_REL),
    "utf8",
  );
  for (const exact of [
    'url:"http://127.0.0.1:18553/"',
    'marker:"VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_RECEIPT_V1"',
    'status:"PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD"',
    'authoritative_chain2050_write:true',
    'transaction_broadcast:false',
    'funds_movement:false',
  ]) {
    if (!activationContract.includes(exact)) {
      fail("production_epoch2_activation_contract_drift");
    }
  }

  const activationRunner = fs.readFileSync(
    path.join(ROOT, ACTIVATION_RUNNER_REL),
    "utf8",
  );
  for (const exact of [
    'const SERVICE="void-economic-epoch2-qbft-validator-v1.service";',
    '"http://127.0.0.1:18553/"',
    'first_possible_authoritative_block_production_step=2',
  ]) {
    if (!activationRunner.includes(exact)) {
      fail("production_epoch2_activation_runner_drift");
    }
  }

  const contract = JSON.parse(
    fs.readFileSync(path.join(ROOT, PUBLIC_READ_CONTRACT_REL), "utf8"),
  );
  if (
    contract.chain_id !== EXPECTED.chain_id ||
    contract.execution_epoch !== EXPECTED.execution_epoch ||
    contract.successor_read_replica?.genesis_file_sha256 !==
      EXPECTED.genesis_file_sha256 ||
    contract.successor_read_replica?.block_hash !==
      EXPECTED.genesis_block_hash ||
    contract.successor_read_replica?.state_root !==
      EXPECTED.genesis_state_root ||
    contract.successor_read_replica?.rpc_endpoint !== FORBIDDEN.isolated_besu_nonce_continuity_rpc ||
    contract.gates?.production_successor_rpc_endpoint_selected !== false
  ) {
    fail("production_epoch2_public_read_contract_mismatch");
  }
}

function validateHoldSelection(selection) {
  const expected = {
    production_rpc_target_selected: false,
    rpc_url: null,
    rpc_url_fingerprint_sha256: null,
    service_unit: null,
    activation_plan_id: null,
    activation_receipt_id: null,
    activation_receipt_sha256: null,
    runtime_observation_id: null,
    runtime_observation_sha256: null,
    runtime_active_verified: false,
    exact_genesis_bound: false,
    production_validator_set_bound: false,
    production_validator_binding_source_path: null,
    production_validator_binding_evidence_sha256: null,
    write_capability_classification: null,
    independent_host_acceptance: false,
  };
  deepEqualJson(selection, expected, "production_epoch2_hold_selection");
}

function validateSelectedSelection(selection, forbiddenValues) {
  if (selection.production_rpc_target_selected !== true) {
    fail("production_epoch2_rpc_target_selected_flag_required");
  }
  const url = canonicalLoopbackRpcUrl(selection.rpc_url);
  if (forbiddenValues.includes(url)) {
    fail("production_epoch2_rpc_target_forbidden");
  }
  if (
    url !== EXPECTED.prospective_rpc_url ||
    selection.rpc_url_fingerprint_sha256 !== fingerprint(url) ||
    selection.service_unit !== EXPECTED.prospective_service_unit ||
    typeof selection.activation_plan_id !== "string" ||
    !/^voide2qactp1_[0-9a-f]{64}$/u.test(selection.activation_plan_id) ||
    typeof selection.activation_receipt_id !== "string" ||
    !/^voide2qactr1_[0-9a-f]{64}$/u.test(selection.activation_receipt_id) ||
    typeof selection.activation_receipt_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(selection.activation_receipt_sha256) ||
    typeof selection.runtime_observation_id !== "string" ||
    !/^voidpe2rpcobs1_[0-9a-f]{64}$/u.test(selection.runtime_observation_id) ||
    typeof selection.runtime_observation_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(selection.runtime_observation_sha256) ||
    selection.runtime_active_verified !== true ||
    selection.exact_genesis_bound !== true ||
    selection.production_validator_set_bound !== true ||
    selection.production_validator_binding_source_path !==
      EXPECTED.validator_evidence_rel ||
    selection.production_validator_binding_evidence_sha256 !==
      EXPECTED.validator_evidence_sha256 ||
    selection.write_capability_classification !==
      "write_capable_not_authorized" ||
    selection.independent_host_acceptance !== true
  ) {
    fail("production_epoch2_selected_evidence_incomplete");
  }
}

export function validateProductionEpoch2RpcTargetV1(value) {
  exactKeys(value, TOP_KEYS, "production_epoch2_rpc_target");
  exactKeys(value.production_host, HOST_KEYS, "production_host");
  exactKeys(value.reviewed_successor_identity, IDENTITY_KEYS, "reviewed_successor_identity");
  exactKeys(value.selection, SELECTION_KEYS, "selection");

  if (
    value.marker !== VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1 ||
    value.version !== 1 ||
    value.chain_id !== EXPECTED.chain_id ||
    value.execution_epoch !== EXPECTED.execution_epoch ||
    value.production_host.machine_role !== "precision" ||
    value.production_host.hostname !== EXPECTED.hostname
  ) {
    fail("production_epoch2_rpc_target_identity_mismatch");
  }

  validateIdentity(value.reviewed_successor_identity);
  deepEqualJson(
    value.forbidden_as_production_targets,
    FORBIDDEN,
    "forbidden_as_production_targets",
  );
  deepEqualJson(value.authority, AUTHORITY, "authority");

  if (!Array.isArray(value.downstream_consumers)) {
    fail("production_epoch2_downstream_consumers_invalid");
  }
  deepEqualJson(
    value.downstream_consumers,
    CONSUMERS,
    "production_epoch2_downstream_consumers",
  );

  const forbiddenValues = Object.entries(FORBIDDEN)
    .filter(([key]) => key !== "rationale")
    .map(([, url]) => url);

  if (value.status === HOLD_STATUS) {
    validateHoldSelection(value.selection);
    if (
      value.next_gate !==
      "observe_and_select_one_real_long_lived_production_epoch2_rpc_runtime"
    ) {
      fail("production_epoch2_hold_next_gate_invalid");
    }
  } else if (value.status === SELECTED_STATUS) {
    validateSelectedSelection(value.selection, forbiddenValues);
    if (
      value.next_gate !==
      "downstream_consumers_must_rebind_and_repeat_fresh_read_only_preflights"
    ) {
      fail("production_epoch2_selected_next_gate_invalid");
    }
  } else {
    fail("production_epoch2_rpc_target_status_invalid");
  }

  return Object.freeze({
    marker: value.marker,
    status: value.status,
    production_rpc_target_selected:
      value.selection.production_rpc_target_selected,
    rpc_url: value.selection.rpc_url,
    rpc_url_fingerprint_sha256:
      value.selection.rpc_url_fingerprint_sha256,
    transaction_authorized: false,
    authoritative_chain2050_write: false,
    migration_authorized: false,
    funds_movement: false,
  });
}

export function loadProductionEpoch2RpcTargetV1() {
  verifyReviewedSourceFiles();
  const value = JSON.parse(
    fs.readFileSync(path.join(ROOT, TARGET_REL), "utf8"),
  );
  const evaluation = validateProductionEpoch2RpcTargetV1(value);
  if (evaluation.status !== HOLD_STATUS) {
    fail("production_epoch2_selected_target_requires_evidence_aware_promotion");
  }
  return Object.freeze({
    value,
    evaluation: Object.freeze({
      ...evaluation,
      evidence_aware_selection_verified: false,
    }),
  });
}

export function productionEpoch2RpcUrlFingerprintV1(url) {
  return fingerprint(canonicalLoopbackRpcUrl(url));
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  try {
    const { evaluation } = loadProductionEpoch2RpcTargetV1();
    console.log(VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1);
    console.log("status=" + evaluation.status);
    console.log(
      "production_rpc_target_selected=" +
        String(evaluation.production_rpc_target_selected),
    );
    console.log("rpc_url=" + String(evaluation.rpc_url));
    console.log("historical_epoch1_8545_forbidden=true");
    console.log("isolated_18550_18551_18552_forbidden=true");
    console.log("evidence_aware_selection_verified=false");
    console.log("rpc_call=false");
    console.log("transaction_authorized=false");
    console.log("authoritative_chain2050_write=false");
    console.log("funds_movement=false");
  } catch (error) {
    console.error("VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
