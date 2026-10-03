#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
const PROMOTION_REL =
  "ops/mainnet0/production-epoch2-rpc-target-promotion-v1.json";
const SELECTION_EVIDENCE_DIR =
  "ops/mainnet0/evidence/production-epoch2-rpc-selection-v1";
const SELECTION_EVIDENCE = Object.freeze({
  activation_plan: Object.freeze({
    path: SELECTION_EVIDENCE_DIR + "/activation-plan.json",
    sha256:
      "86128119c45197b04dd127986349c42c971a4287739864f44a50c0e6dc386a7f",
  }),
  activation_receipt: Object.freeze({
    path: SELECTION_EVIDENCE_DIR + "/activation-receipt.json",
    sha256:
      "1a9837b42bf20439d939f54ca8bd9c3a81d91d7a8cf83ddd54f58929fc2f5e13",
  }),
  runtime_observation: Object.freeze({
    path: SELECTION_EVIDENCE_DIR + "/runtime-observation.json",
    sha256:
      "cd1630a9742b49f55e6bfed2b4c0344e4b7a994307f8945f1e5404d2eb681d32",
  }),
  selected_candidate: Object.freeze({
    path: SELECTION_EVIDENCE_DIR + "/selected-candidate.json",
    sha256:
      "305ed03eebe49b992db76c21ffd8930e9b6d07ed4a97984cf0e48f33a9df63dd",
  }),
  promotion_apply_admission: Object.freeze({
    path: SELECTION_EVIDENCE_DIR + "/promotion-apply-admission.json",
    sha256:
      "ad5aa3b0a99e967207ff63c3040d3b9786e3f1345769298c25a19eed20477ac5",
  }),
});
const SELECTION_EVIDENCE_VERIFIER_REL =
  "tools/void-production-epoch2-rpc-selection-evidence-verifier-v1.mjs";
const GIT_EXECUTABLE = "/usr/bin/git";
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

const PROMOTION_MARKER =
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_V1";
const PROMOTION_STATUS =
  "PRODUCTION_EPOCH2_RPC_TARGET_SOURCE_PROMOTION_ACCEPTED";
const EXPECTED_SELECTED_TARGET_SHA256 =
  "305ed03eebe49b992db76c21ffd8930e9b6d07ed4a97984cf0e48f33a9df63dd";
const EXPECTED_PROMOTION_ADMISSION_ID =
  "voidpe2rpctapply1_f76ce9f3d147a6097910947e3a8735664ff81bea07d1940ebdb663102589b040";
const EXPECTED_PROMOTION_ADMISSION_SHA256 =
  "ad5aa3b0a99e967207ff63c3040d3b9786e3f1345769298c25a19eed20477ac5";
const EXPECTED_PROMOTION_ADMITTED_MAIN_HEAD =
  "ac352fe966c8737a8e143475d28f85f80c0a096f";
const PROMOTION_ID = /^voidpe2rpctprom1_[0-9a-f]{64}$/u;
const SHA40 = /^[0-9a-f]{40}$/u;

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

const REVIEWED_GIT_CONFIG_ARGS_V1 = Object.freeze([
  "-c", "core.hooksPath=/dev/null",
  "-c", "core.attributesFile=/dev/null",
  "-c", "core.fsmonitor=false",
  "-c", "core.untrackedCache=false",
  "-c", "core.preloadIndex=false",
  "-c", "submodule.recurse=false",
]);
const REVIEWED_SELECTION_REQUIRED_MODULES_V1 = Object.freeze([
  SELECTION_EVIDENCE_VERIFIER_REL,
  "tools/void-production-epoch2-rpc-target-v1.mjs",
  "tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs",
  "tools/void-production-epoch2-rpc-target-promotion-apply-admission-v1.mjs",
  "tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs",
]);

function reviewedGitEnvV1(home = "/nonexistent") {
  return {
    PATH: "/usr/bin:/bin",
    HOME: home,
    XDG_CONFIG_HOME: home,
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
    NODE_OPTIONS: "",
    NODE_PATH: "",
  };
}
function reviewedGitRunV1(
  cwd,
  args,
  code,
  { encoding = "utf8", prefix = [], allowFail = false, home = "/nonexistent" } = {},
) {
  const result = spawnSync(
    GIT_EXECUTABLE,
    [
      "--no-replace-objects",
      ...REVIEWED_GIT_CONFIG_ARGS_V1,
      ...prefix,
      "-C", cwd,
      ...args,
    ],
    {
      cwd: "/",
      env: reviewedGitEnvV1(home),
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
      timeout: 120_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFail) fail(code);
  return result;
}
function reviewedGitTextV1(cwd, args, code, options = {}) {
  return String(
    reviewedGitRunV1(cwd, args, code, options).stdout || "",
  ).trim();
}
function reviewedGitBytesV1(cwd, args, code, options = {}) {
  return Buffer.from(
    reviewedGitRunV1(
      cwd,
      args,
      code,
      { ...options, encoding: null },
    ).stdout || Buffer.alloc(0),
  );
}
function reviewedGitBlobSha1V1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}
function reviewedImportSpecifiersV1(source) {
  const specs = new Set();
  for (const pattern of [
    /\bfrom\s+["']([^"']+)["']/gu,
    /\bimport\s+["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ]) {
    for (const match of source.matchAll(pattern)) specs.add(match[1]);
  }
  return [...specs];
}
function reviewedResolveRelativeModuleV1(fromRel, spec) {
  let rel = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromRel), spec),
  );
  if (!rel.endsWith(".mjs") && !rel.endsWith(".js") && !rel.endsWith(".cjs")) {
    rel += ".mjs";
  }
  if (
    rel.startsWith("../") ||
    rel.startsWith("/") ||
    rel.includes("\\0")
  ) {
    fail("production_epoch2_selection_private_import_outside_repo");
  }
  return rel;
}
function reviewedSelectionClosureAtHeadV1(head) {
  const queue = [SELECTION_EVIDENCE_VERIFIER_REL];
  const seen = new Set();
  const moduleBlobs = Object.create(null);
  while (queue.length > 0) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);

    const bytes = reviewedGitBytesV1(
      ROOT,
      ["show", head + ":" + rel],
      "production_epoch2_selection_private_git_object_unavailable:" + rel,
    );
    if (bytes.length < 1 || bytes.length > 4 * 1024 * 1024) {
      fail("production_epoch2_selection_private_module_size_invalid:" + rel);
    }
    const blob = reviewedGitTextV1(
      ROOT,
      ["rev-parse", head + ":" + rel],
      "production_epoch2_selection_private_blob_unavailable:" + rel,
    );
    if (
      !SHA40.test(blob) ||
      reviewedGitBlobSha1V1(bytes) !== blob
    ) {
      fail("production_epoch2_selection_private_git_object_mismatch:" + rel);
    }
    moduleBlobs[rel] = blob;

    if (!/\.(?:mjs|js|cjs)$/u.test(rel)) continue;
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    for (const spec of reviewedImportSpecifiersV1(source)) {
      if (spec.startsWith("node:")) continue;
      if (!spec.startsWith(".")) {
        fail(
          "production_epoch2_selection_private_bare_package_forbidden:" + spec,
        );
      }
      queue.push(reviewedResolveRelativeModuleV1(rel, spec));
    }
  }

  for (const required of REVIEWED_SELECTION_REQUIRED_MODULES_V1) {
    if (!seen.has(required)) {
      fail("production_epoch2_selection_private_module_missing:" + required);
    }
  }
  return Object.freeze({
    module_paths: Object.freeze([...seen].sort()),
    module_git_blobs: Object.freeze({ ...moduleBlobs }),
  });
}
function captureReviewedSelectionGenerationV1() {
  const status = reviewedGitTextV1(
    ROOT,
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "production_epoch2_selection_private_status_unavailable",
  );
  if (status !== "") {
    fail("production_epoch2_selection_private_worktree_must_be_clean");
  }
  const shallow = reviewedGitTextV1(
    ROOT,
    ["rev-parse", "--is-shallow-repository"],
    "production_epoch2_selection_private_repo_shape_unavailable",
  );
  if (shallow !== "false") {
    fail("production_epoch2_selection_private_repo_must_be_non_shallow");
  }
  const head = reviewedGitTextV1(
    ROOT,
    ["rev-parse", "HEAD"],
    "production_epoch2_selection_private_head_unavailable",
  );
  const tree = reviewedGitTextV1(
    ROOT,
    ["rev-parse", "HEAD^{tree}"],
    "production_epoch2_selection_private_tree_unavailable",
  );
  if (!SHA40.test(head) || !SHA40.test(tree)) {
    fail("production_epoch2_selection_private_repo_identity_invalid");
  }
  const closure = reviewedSelectionClosureAtHeadV1(head);
  if (
    reviewedGitTextV1(
      ROOT,
      ["rev-parse", "HEAD"],
      "production_epoch2_selection_private_final_head_unavailable",
    ) !== head ||
    reviewedGitTextV1(
      ROOT,
      ["rev-parse", "HEAD^{tree}"],
      "production_epoch2_selection_private_final_tree_unavailable",
    ) !== tree ||
    reviewedGitTextV1(
      ROOT,
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "production_epoch2_selection_private_final_status_unavailable",
    ) !== ""
  ) {
    fail("production_epoch2_selection_private_repository_changed_during_bind");
  }
  return Object.freeze({ head, tree, closure });
}
function readStablePrivateModuleV1(file, expectedBlob, code) {
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.nlink !== 1 || before.size < 1) {
      fail(code + "_file_invalid");
    }
    const bytes = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) {
      if (before[key] !== after[key]) fail(code + "_changed_during_read");
    }
    if (reviewedGitBlobSha1V1(bytes) !== expectedBlob) {
      fail(code + "_git_blob_mismatch");
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}
function assertPrivateSelectionTreeV1(bundle) {
  const parent = fs.lstatSync(bundle.parent);
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    parent.dev !== bundle.parent_identity.dev ||
    parent.ino !== bundle.parent_identity.ino
  ) {
    fail("production_epoch2_selection_private_parent_identity_drift");
  }
  for (const [rel, blob] of Object.entries(bundle.module_git_blobs)) {
    readStablePrivateModuleV1(
      path.join(bundle.repo_root, rel),
      blob,
      "production_epoch2_selection_private_module_" +
        rel.replace(/[^A-Za-z0-9]+/gu, "_"),
    );
  }
  const privateHead = reviewedGitTextV1(
    bundle.repo_root,
    ["rev-parse", "HEAD"],
    "production_epoch2_selection_private_checkout_head_unavailable",
    { home: bundle.parent },
  );
  const privateTree = reviewedGitTextV1(
    bundle.repo_root,
    ["rev-parse", "HEAD^{tree}"],
    "production_epoch2_selection_private_checkout_tree_unavailable",
    { home: bundle.parent },
  );
  const privateStatus = reviewedGitTextV1(
    bundle.repo_root,
    ["status", "--porcelain=v1", "--untracked-files=all"],
    "production_epoch2_selection_private_checkout_status_unavailable",
    { home: bundle.parent },
  );
  if (
    privateHead !== bundle.head ||
    privateTree !== bundle.tree ||
    privateStatus !== ""
  ) {
    fail("production_epoch2_selection_private_checkout_identity_drift");
  }
}
function materializePrivateSelectionTreeV1(generation) {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-production-epoch2-selection-reviewed-"),
  );
  fs.chmodSync(parent, 0o700);
  const parentStat = fs.lstatSync(parent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
    fail("production_epoch2_selection_private_parent_invalid");
  }
  const repoRoot = path.join(parent, "repo");
  fs.mkdirSync(repoRoot, { mode: 0o700 });
  try {
    reviewedGitRunV1(
      repoRoot,
      ["init", "--quiet"],
      "production_epoch2_selection_private_git_init_failed",
      { home: parent },
    );
    reviewedGitRunV1(
      repoRoot,
      ["fetch", "--quiet", "--no-tags", ROOT, generation.head],
      "production_epoch2_selection_private_git_fetch_failed",
      {
        home: parent,
        prefix: ["-c", "protocol.file.allow=always"],
      },
    );
    reviewedGitRunV1(
      repoRoot,
      ["checkout", "--quiet", "--detach", "FETCH_HEAD"],
      "production_epoch2_selection_private_git_checkout_failed",
      { home: parent },
    );
    if (
      reviewedGitTextV1(
        repoRoot,
        ["rev-parse", "--is-shallow-repository"],
        "production_epoch2_selection_private_checkout_shape_unavailable",
        { home: parent },
      ) !== "false"
    ) {
      fail("production_epoch2_selection_private_checkout_must_be_non_shallow");
    }
    const bundle = Object.freeze({
      parent,
      parent_identity: Object.freeze({
        dev: parentStat.dev,
        ino: parentStat.ino,
      }),
      repo_root: repoRoot,
      head: generation.head,
      tree: generation.tree,
      module_git_blobs: generation.closure.module_git_blobs,
      module_paths: generation.closure.module_paths,
    });
    assertPrivateSelectionTreeV1(bundle);
    return bundle;
  } catch (error) {
    fs.rmSync(parent, { recursive: true, force: true });
    throw error;
  }
}
export function nodePermissionFlagV1(
  nodeVersion = process.versions.node,
) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-|$)/u.exec(nodeVersion);
  if (!match) {
    fail("production_epoch2_selection_node_version_invalid");
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major !== 22 && major !== 24 && major !== 26) {
    fail("production_epoch2_selection_node_version_unsupported");
  }
  return major === 22 && minor < 13
    ? "--experimental-permission"
    : "--permission";
}
function runSelectionEvidenceSemanticVerifierV1() {
  const generation = captureReviewedSelectionGenerationV1();
  const bundle = materializePrivateSelectionTreeV1(generation);
  try {
    assertPrivateSelectionTreeV1(bundle);
    const verifierFile = path.join(
      bundle.repo_root,
      SELECTION_EVIDENCE_VERIFIER_REL,
    );
    const result = spawnSync(
      fs.realpathSync.native(process.execPath),
      [
        nodePermissionFlagV1(),
        "--allow-fs-read=" + bundle.repo_root,
        "--allow-child-process",
        verifierFile,
      ],
      {
        cwd: bundle.repo_root,
        env: reviewedGitEnvV1(bundle.parent),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
        timeout: 120_000,
      },
    );
    assertPrivateSelectionTreeV1(bundle);
    const finalGeneration = captureReviewedSelectionGenerationV1();
    if (
      finalGeneration.head !== generation.head ||
      finalGeneration.tree !== generation.tree ||
      canonicalJson(finalGeneration.closure.module_git_blobs) !==
        canonicalJson(generation.closure.module_git_blobs)
    ) {
      fail("production_epoch2_selection_private_source_generation_drift");
    }
    if (result.error || result.status !== 0) {
      fail("production_epoch2_selection_evidence_semantic_reverification_failed");
    }
    let verified;
    try {
      verified = JSON.parse(String(result.stdout || "").trim());
    } catch {
      fail("production_epoch2_selection_evidence_semantic_verifier_output_invalid");
    }
    if (
      verified?.marker !==
        "VOID_PRODUCTION_EPOCH2_RPC_SELECTION_EVIDENCE_VERIFIER_V1" ||
      verified?.version !== 1 ||
      verified?.verified !== true ||
      verified?.activation_plan_sha256 !==
        SELECTION_EVIDENCE.activation_plan.sha256 ||
      verified?.activation_receipt_sha256 !==
        SELECTION_EVIDENCE.activation_receipt.sha256 ||
      verified?.runtime_observation_sha256 !==
        SELECTION_EVIDENCE.runtime_observation.sha256 ||
      verified?.selected_candidate_sha256 !==
        SELECTION_EVIDENCE.selected_candidate.sha256 ||
      verified?.promotion_apply_admission_sha256 !==
        SELECTION_EVIDENCE.promotion_apply_admission.sha256 ||
      verified?.promotion_admission_id !== EXPECTED_PROMOTION_ADMISSION_ID ||
      verified?.admission_source_head !== EXPECTED_PROMOTION_ADMITTED_MAIN_HEAD ||
      verified?.selected_candidate_recompiled_from_exact_evidence !== true ||
      verified?.promotion_admission_content_address_reverified !== true ||
      verified?.historical_source_trees_reverified !== true ||
      verified?.source_lineage_ancestry_reverified !== true ||
      verified?.reviewed_execution_head !== generation.head ||
      verified?.reviewed_execution_module_count !==
        generation.closure.module_paths.length ||
      verified?.reviewed_execution_exact_head_git_object_bytes !== true ||
      verified?.reviewed_execution_non_shallow_repository !== true ||
      verified?.reviewed_execution_bare_package_runtime_absent !== true
    ) {
      fail("production_epoch2_selection_evidence_semantic_verifier_mismatch");
    }
    return Object.freeze(verified);
  } finally {
    fs.rmSync(bundle.parent, { recursive: true, force: true });
  }
}

function verifySelectedEvidencePacketV1(value, targetBytes) {
  const loaded = {};
  for (const [name, spec] of Object.entries(SELECTION_EVIDENCE)) {
    const bytes = fs.readFileSync(path.join(ROOT, spec.path));
    if (sha256(bytes) !== spec.sha256) {
      fail("production_epoch2_selection_evidence_sha256_mismatch:" + name);
    }
    loaded[name] = Object.freeze({
      bytes,
      value: JSON.parse(bytes.toString("utf8")),
    });
  }

  if (!loaded.selected_candidate.bytes.equals(targetBytes)) {
    fail("production_epoch2_selection_candidate_target_bytes_mismatch");
  }

  const plan = loaded.activation_plan.value;
  const receipt = loaded.activation_receipt.value;
  const observation = loaded.runtime_observation.value;
  const admission = loaded.promotion_apply_admission.value;

  if (
    plan.activation_plan_id !== value.selection.activation_plan_id ||
    receipt.activation_plan_id !== value.selection.activation_plan_id ||
    receipt.activation_receipt_id !== value.selection.activation_receipt_id ||
    observation.observation_id !== value.selection.runtime_observation_id ||
    observation.activation_lineage?.activation_plan_id !==
      value.selection.activation_plan_id ||
    observation.activation_lineage?.activation_plan_file_sha256 !==
      SELECTION_EVIDENCE.activation_plan.sha256 ||
    observation.activation_lineage?.activation_receipt_id !==
      value.selection.activation_receipt_id ||
    observation.activation_lineage?.activation_receipt_file_sha256 !==
      SELECTION_EVIDENCE.activation_receipt.sha256 ||
    admission.marker !==
      "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1" ||
    admission.promotion_admission_id !== EXPECTED_PROMOTION_ADMISSION_ID ||
    admission.candidate_sha256 !== EXPECTED_SELECTED_TARGET_SHA256 ||
    admission.current_source?.head !== EXPECTED_PROMOTION_ADMITTED_MAIN_HEAD ||
    admission.current_source?.remote_main_sha !==
      EXPECTED_PROMOTION_ADMITTED_MAIN_HEAD ||
    admission.current_source?.canonical_main_live_match !== true ||
    admission.source_lineage_ancestor_current_main !== true ||
    admission.evidence?.activation_plan_id !==
      value.selection.activation_plan_id ||
    admission.evidence?.activation_plan_file_sha256 !==
      SELECTION_EVIDENCE.activation_plan.sha256 ||
    admission.evidence?.activation_receipt_id !==
      value.selection.activation_receipt_id ||
    admission.evidence?.activation_receipt_file_sha256 !==
      SELECTION_EVIDENCE.activation_receipt.sha256 ||
    admission.evidence?.runtime_observation_id !==
      value.selection.runtime_observation_id ||
    admission.evidence?.runtime_observation_file_sha256 !==
      SELECTION_EVIDENCE.runtime_observation.sha256 ||
    admission.canonical_target_write !== false ||
    admission.authority?.repository_write !== false ||
    admission.authority?.transaction_broadcast !== false ||
    admission.authority?.migration_authorized !== false ||
    admission.authority?.funds_movement !== false
  ) {
    fail("production_epoch2_selection_evidence_semantics_mismatch");
  }

  const semantic = runSelectionEvidenceSemanticVerifierV1();

  return Object.freeze({
    activation_plan_sha256: SELECTION_EVIDENCE.activation_plan.sha256,
    activation_receipt_sha256: SELECTION_EVIDENCE.activation_receipt.sha256,
    runtime_observation_sha256: SELECTION_EVIDENCE.runtime_observation.sha256,
    selected_candidate_sha256: SELECTION_EVIDENCE.selected_candidate.sha256,
    promotion_apply_admission_sha256:
      SELECTION_EVIDENCE.promotion_apply_admission.sha256,
    checked_in_evidence_verified: true,
    exact_evidence_semantics_reexecuted: true,
    selected_candidate_recompiled_from_exact_evidence:
      semantic.selected_candidate_recompiled_from_exact_evidence,
    promotion_admission_content_address_reverified:
      semantic.promotion_admission_content_address_reverified,
    historical_source_trees_reverified:
      semantic.historical_source_trees_reverified,
    source_lineage_ancestry_reverified:
      semantic.source_lineage_ancestry_reverified,
    verifier_entry_git_object_bound: true,
    reviewed_execution_exact_head_git_object_bytes:
      semantic.reviewed_execution_exact_head_git_object_bytes,
    reviewed_execution_non_shallow_repository:
      semantic.reviewed_execution_non_shallow_repository,
    reviewed_execution_bare_package_runtime_absent:
      semantic.reviewed_execution_bare_package_runtime_absent,
  });
}

function verifySelectedPromotionV1(value, targetBytes) {
  const evidencePacket = verifySelectedEvidencePacketV1(value, targetBytes);
  const promotionBytes = fs.readFileSync(path.join(ROOT, PROMOTION_REL));
  const promotion = JSON.parse(promotionBytes.toString("utf8"));
  exactKeys(
    promotion,
    [
      "marker",
      "version",
      "status",
      "chain_id",
      "execution_epoch",
      "selected_rpc_url",
      "selected_service_unit",
      "candidate",
      "admission",
      "downstream_rebind_required",
      "authority",
      "next_gate",
      "promotion_id",
    ],
    "production_epoch2_rpc_promotion",
  );
  exactKeys(
    promotion.candidate,
    [
      "path",
      "file_sha256",
      "status",
      "activation_plan_id",
      "activation_receipt_id",
      "activation_receipt_sha256",
      "runtime_observation_id",
      "runtime_observation_sha256",
    ],
    "production_epoch2_rpc_promotion_candidate",
  );
  exactKeys(
    promotion.admission,
    [
      "marker",
      "promotion_admission_id",
      "receipt_sha256",
      "admitted_main_head",
      "source_lineage_ancestor_current_main",
      "canonical_target_write",
      "repository_write",
      "transaction_broadcast",
      "migration_authorized",
      "funds_movement",
    ],
    "production_epoch2_rpc_promotion_admission",
  );
  const expectedAuthority = {
    source_only: true,
    rpc_call: false,
    service_action: false,
    docker_mutation: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
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
  };
  exactKeys(
    promotion.authority,
    Object.keys(expectedAuthority),
    "production_epoch2_rpc_promotion_authority",
  );
  const material = structuredClone(promotion);
  const promotionId = String(material.promotion_id || "");
  delete material.promotion_id;

  if (
    promotion.marker !== PROMOTION_MARKER ||
    promotion.version !== 1 ||
    promotion.status !== PROMOTION_STATUS ||
    promotion.chain_id !== EXPECTED.chain_id ||
    promotion.execution_epoch !== EXPECTED.execution_epoch ||
    promotion.selected_rpc_url !== EXPECTED.prospective_rpc_url ||
    promotion.selected_service_unit !== EXPECTED.prospective_service_unit ||
    promotion.candidate?.path !== TARGET_REL ||
    promotion.candidate?.file_sha256 !== EXPECTED_SELECTED_TARGET_SHA256 ||
    promotion.candidate?.file_sha256 !== sha256(targetBytes) ||
    promotion.candidate?.status !== SELECTED_STATUS ||
    promotion.candidate?.activation_plan_id !==
      value.selection.activation_plan_id ||
    promotion.candidate?.activation_receipt_id !==
      value.selection.activation_receipt_id ||
    promotion.candidate?.activation_receipt_sha256 !==
      value.selection.activation_receipt_sha256 ||
    promotion.candidate?.runtime_observation_id !==
      value.selection.runtime_observation_id ||
    promotion.candidate?.runtime_observation_sha256 !==
      value.selection.runtime_observation_sha256 ||
    promotion.admission?.marker !==
      "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1" ||
    promotion.admission?.promotion_admission_id !==
      EXPECTED_PROMOTION_ADMISSION_ID ||
    promotion.admission?.receipt_sha256 !==
      EXPECTED_PROMOTION_ADMISSION_SHA256 ||
    promotion.admission?.admitted_main_head !==
      EXPECTED_PROMOTION_ADMITTED_MAIN_HEAD ||
    !SHA40.test(String(promotion.admission?.admitted_main_head || "")) ||
    promotion.admission?.source_lineage_ancestor_current_main !== true ||
    promotion.admission?.canonical_target_write !== false ||
    promotion.admission?.repository_write !== false ||
    promotion.admission?.transaction_broadcast !== false ||
    promotion.admission?.migration_authorized !== false ||
    promotion.admission?.funds_movement !== false ||
    promotion.downstream_rebind_required !== true ||
    canonicalJson(promotion.authority) !== canonicalJson(expectedAuthority) ||
    promotion.next_gate !==
      "downstream_consumers_must_rebind_and_repeat_fresh_read_only_preflights" ||
    !PROMOTION_ID.test(promotionId) ||
    promotionId !==
      "voidpe2rpctprom1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8"))
  ) {
    fail("production_epoch2_selected_promotion_evidence_mismatch");
  }

  return Object.freeze({
    promotion_id: promotionId,
    promotion_file_sha256: sha256(promotionBytes),
    promotion_admission_id: promotion.admission.promotion_admission_id,
    promotion_admission_sha256: promotion.admission.receipt_sha256,
    admitted_main_head: promotion.admission.admitted_main_head,
    evidence_packet: evidencePacket,
  });
}

export function loadProductionEpoch2RpcTargetV1() {
  verifyReviewedSourceFiles();
  const targetBytes = fs.readFileSync(path.join(ROOT, TARGET_REL));
  const value = JSON.parse(targetBytes.toString("utf8"));
  const evaluation = validateProductionEpoch2RpcTargetV1(value);
  if (evaluation.status === HOLD_STATUS) {
    return Object.freeze({
      value,
      evaluation: Object.freeze({
        ...evaluation,
        evidence_aware_selection_verified: false,
      }),
      promotion: null,
    });
  }
  if (evaluation.status !== SELECTED_STATUS) {
    fail("production_epoch2_rpc_target_status_invalid");
  }
  const promotion = verifySelectedPromotionV1(value, targetBytes);
  return Object.freeze({
    value,
    evaluation: Object.freeze({
      ...evaluation,
      evidence_aware_selection_verified: true,
    }),
    promotion,
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
    console.log(
      "evidence_aware_selection_verified=" +
        String(evaluation.evidence_aware_selection_verified),
    );
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
