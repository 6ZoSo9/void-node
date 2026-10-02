#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  EXPECTED_VALIDATORS_V1,
} from "./void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1,
  VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1,
} from "./void-production-epoch2-rpc-host-observer-v1.mjs";
import {
  HOLD_STATUS,
  SELECTED_STATUS,
  productionEpoch2RpcUrlFingerprintV1,
  validateProductionEpoch2RpcTargetV1,
} from "./void-production-epoch2-rpc-target-v1.mjs";

export const VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_V1";

export const VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_promotion_artifact_only: true,
    canonical_target_read: true,
    activation_plan_read: true,
    activation_receipt_read: true,
    host_observation_read: true,
    git_repository_identity_read: true,
    git_ancestry_read: true,
    create_only_private_output: true,
    canonical_target_file_updated: false,
    external_network_request: false,
    rpc_call: false,
    service_action: false,
    daemon_reload: false,
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
    token_movement: false,
    inventory_funding: false,
    liquidity_movement: false,
    funds_movement: false,
  });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const TARGET_REL = "ops/mainnet0/production-epoch2-rpc-target-v1.json";
const TARGET_PATH = path.join(REPO_ROOT, TARGET_REL);
const TOOL_REL = "tools/void-production-epoch2-rpc-target-promotion-v1.mjs";
const MAX_JSON = 8 * 1024 * 1024;
const MAX_OBSERVATION_AGE_SECONDS = 3600n;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const PLAN_ID = /^voide2qactp1_[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voide2qactr1_[0-9a-f]{64}$/u;
const OBSERVATION_ID = /^voidpe2rpcobs1_[0-9a-f]{64}$/u;
const RPC_URL = "http://127.0.0.1:18553/";
const SERVICE = "void-economic-epoch2-qbft-validator-v1.service";

function fail(code) {
  throw new Error(code);
}
function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
function canonicalize(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!plain(value)) fail("promotion_canonical_value_invalid");
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}
function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}
function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}
function deepFreeze(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function isInsideRepo(file) {
  const relative = path.relative(REPO_ROOT, file);
  return (
    relative === "" ||
    (
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    )
  );
}
function gitRead(args, code) {
  const result = spawnSync(
    "git",
    [
      "--no-replace-objects",
      "-c", "core.hooksPath=/dev/null",
      "-c", "core.attributesFile=/dev/null",
      "-c", "core.fsmonitor=false",
      "-c", "core.untrackedCache=false",
      "-C", REPO_ROOT,
      ...args,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
        GIT_NO_REPLACE_OBJECTS: "1",
      },
    },
  );
  if (result.error || result.status !== 0) fail(code);
  return String(result.stdout || "").trim();
}
function gitCommitIsAncestor(commit, descendant) {
  if (!HEX40.test(String(commit || "")) || !HEX40.test(String(descendant || ""))) {
    return false;
  }
  const result = spawnSync(
    "git",
    [
      "--no-replace-objects",
      "-c", "core.hooksPath=/dev/null",
      "-C", REPO_ROOT,
      "merge-base", "--is-ancestor", commit, descendant,
    ],
    {
      stdio: ["ignore", "ignore", "ignore"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
        GIT_NO_REPLACE_OBJECTS: "1",
      },
    },
  );
  if (result.error) throw result.error;
  return result.status === 0;
}
function repositoryIdentity() {
  if (
    gitRead(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "promotion_repository_status_unavailable",
    ) !== ""
  ) fail("promotion_repository_must_be_clean");
  if (
    gitRead(
      ["branch", "--show-current"],
      "promotion_repository_branch_unavailable",
    ) !== "main"
  ) fail("promotion_repository_main_required");
  const head = gitRead(
    ["rev-parse", "HEAD"],
    "promotion_repository_head_unavailable",
  );
  const tree = gitRead(
    ["rev-parse", "HEAD^{tree}"],
    "promotion_repository_tree_unavailable",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("promotion_repository_identity_invalid");
  }
  return Object.freeze({
    repository_head_sha: head,
    repository_tree_sha: tree,
  });
}
function sameStamp(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}
function readStableJsonFile(
  file,
  {
    label,
    maxBytes = MAX_JSON,
    expectedSha256 = null,
    requirePrivate = false,
    requireOutsideRepo = false,
    requirePretty = true,
  } = {},
) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) fail(label + "_path_invalid");
  if (requireOutsideRepo && isInsideRepo(file)) {
    fail(label + "_must_be_outside_repository");
  }
  let real;
  try {
    real = fs.realpathSync.native(file);
  } catch {
    fail(label + "_path_unavailable");
  }
  if (real !== file) fail(label + "_path_alias_forbidden");
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    if (
      !before.isFile() ||
      before.nlink !== 1n ||
      before.size < 2n ||
      before.size > BigInt(maxBytes) ||
      before.size > BigInt(Number.MAX_SAFE_INTEGER)
    ) fail(label + "_file_invalid");
    if (
      requirePrivate &&
      (
        (Number(before.mode) & 0o077) !== 0 ||
        (
          typeof process.getuid === "function" &&
          before.uid !== BigInt(process.getuid())
        )
      )
    ) fail(label + "_private_identity_invalid");
    const size = Number(before.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) fail(label + "_short_read");
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const pathAfter = fs.lstatSync(file, { bigint: true });
    if (
      pathAfter.isSymbolicLink() ||
      !pathAfter.isFile() ||
      !sameStamp(before, after) ||
      !sameStamp(after, pathAfter) ||
      fs.realpathSync.native(file) !== file
    ) fail(label + "_changed_during_read");
    const digest = sha256(bytes);
    if (expectedSha256 !== null && digest !== expectedSha256) {
      fail(label + "_sha256_mismatch");
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail(label + "_utf8_invalid");
    }
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      fail(label + "_json_invalid");
    }
    if (!plain(value)) fail(label + "_object_required");
    if (requirePretty && text !== JSON.stringify(value, null, 2) + "\n") {
      fail(label + "_serialization_invalid");
    }
    return Object.freeze({ value, bytes, sha256: digest });
  } finally {
    fs.closeSync(fd);
  }
}
function writePrivateJson(file, value) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file ||
    isInsideRepo(file)
  ) fail("promotion_output_path_invalid");
  const parent = path.dirname(file);
  if (fs.realpathSync.native(parent) !== parent) {
    fail("promotion_output_parent_alias_forbidden");
  }
  const parentStat = fs.lstatSync(parent);
  if (
    parentStat.isSymbolicLink() ||
    !parentStat.isDirectory() ||
    (parentStat.mode & 0o022) !== 0 ||
    (
      typeof process.getuid === "function" &&
      parentStat.uid !== process.getuid()
    )
  ) fail("promotion_output_parent_unsafe");
  const bytes = prettyBytes(value);
  fs.writeFileSync(file, bytes, {
    flag: "wx",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
  return Object.freeze({
    sha256: sha256(bytes),
    bytes: bytes.length,
  });
}
function requirePrettySha(value, expected, label) {
  if (!HEX64.test(String(expected || ""))) {
    fail(label + "_sha256_invalid");
  }
  if (sha256(prettyBytes(value)) !== expected) {
    fail(label + "_pretty_sha256_mismatch");
  }
}
function requireId(value, regex, label) {
  const text = String(value || "");
  if (!regex.test(text)) fail(label + "_invalid");
  return text;
}
function recomputeContentId(value, key, prefix, regex, label) {
  const observed = requireId(value?.[key], regex, label + "_id");
  const material = structuredClone(value);
  delete material[key];
  const expected =
    prefix + sha256(Buffer.from(canonicalJson(material), "utf8"));
  if (observed !== expected) fail(label + "_id_mismatch");
  return observed;
}
function validateActivationPlan(plan, fileSha256) {
  requirePrettySha(plan, fileSha256, "promotion_activation_plan");
  const id = recomputeContentId(
    plan,
    "activation_plan_id",
    "voide2qactp1_",
    PLAN_ID,
    "promotion_activation_plan",
  );
  if (
    plan.marker !== "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1" ||
    plan.version !== 1 ||
    plan.status !== "THREE_HOST_PRESTART_ADMISSION_BOUND_VALIDATOR_START_HOLD" ||
    plan.chain?.chain_id !== 2050 ||
    plan.chain?.chain_id_hex !== "0x802" ||
    plan.chain?.execution_epoch !== 2 ||
    plan.chain?.consensus !== "QBFT" ||
    plan.chain?.validator_count !== 3 ||
    plan.chain?.required_quorum !== 2 ||
    plan.rpc?.role !== "precision" ||
    plan.rpc?.url !== RPC_URL ||
    plan.rpc?.transaction_methods_forbidden !== true ||
    !HEX40.test(String(plan.start_admission_observed_repo_head || ""))
  ) fail("promotion_activation_plan_semantics_invalid");
  return id;
}
function validateActivationReceipt(receipt, plan, fileSha256) {
  requirePrettySha(receipt, fileSha256, "promotion_activation_receipt");
  const id = recomputeContentId(
    receipt,
    "activation_receipt_id",
    "voide2qactr1_",
    RECEIPT_ID,
    "promotion_activation_receipt",
  );
  if (
    receipt.marker !== "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_RECEIPT_V1" ||
    receipt.version !== 1 ||
    receipt.status !== "PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD" ||
    receipt.activation_plan_id !== plan.activation_plan_id ||
    receipt.chain_id !== 2050 ||
    receipt.chain_id_hex !== "0x802" ||
    receipt.execution_epoch !== 2 ||
    receipt.consensus !== "QBFT" ||
    receipt.validator_count !== 3 ||
    receipt.required_quorum !== 2 ||
    receipt.observations?.two_of_three_quorum_proven !== true ||
    receipt.observations?.all_three_validator_services_active !== true ||
    receipt.authority?.authoritative_chain2050_write !== true ||
    receipt.authority?.transaction_construction !== false ||
    receipt.authority?.transaction_signing !== false ||
    receipt.authority?.transaction_submission !== false ||
    receipt.authority?.transaction_broadcast !== false ||
    receipt.authority?.token_movement !== false ||
    receipt.authority?.funds_movement !== false ||
    receipt.authority?.migration_authorized !== false ||
    receipt.authority?.public_activation_authorized !== false
  ) fail("promotion_activation_receipt_semantics_invalid");
  return id;
}
function validateObservation(
  observation,
  observationFileSha256,
  plan,
  receipt,
  sourceTarget,
  evaluationTimeUnix,
  {
    observationSourceAncestorCurrentMain,
    activationSourceAncestorCurrentMain,
  },
) {
  requirePrettySha(
    observation,
    observationFileSha256,
    "promotion_host_observation",
  );
  const id = recomputeContentId(
    observation,
    "observation_id",
    "voidpe2rpcobs1_",
    OBSERVATION_ID,
    "promotion_host_observation",
  );
  const expectedValidators =
    [...EXPECTED_VALIDATORS_V1].map((value) => value.toLowerCase()).sort();
  const observedValidators = Array.isArray(observation.rpc?.validators)
    ? observation.rpc.validators.map((value) => String(value).toLowerCase()).sort()
    : [];
  const identity = sourceTarget.reviewed_successor_identity;
  if (
    observation.marker !== VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1 ||
    observation.version !== 1 ||
    observation.status !== "PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_ACCEPTED" ||
    observation.hostname !== "zoso-Precision-Tower-7810" ||
    observation.chain_id !== 2050 ||
    observation.execution_epoch !== 2 ||
    observation.source_binding?.branch !== "main" ||
    !HEX40.test(String(observation.source_binding?.head || "")) ||
    observation.source_binding?.remote_main_sha !== observation.source_binding?.head ||
    observation.source_binding?.canonical_main_live_match !== true ||
    observation.target_descriptor?.status !== HOLD_STATUS ||
    observation.target_descriptor?.production_rpc_target_selected !== false ||
    observation.target_descriptor?.prospective_rpc_url !== RPC_URL ||
    observation.target_descriptor?.rpc_url_fingerprint_sha256 !==
      productionEpoch2RpcUrlFingerprintV1(RPC_URL) ||
    observation.target_descriptor?.prospective_service_unit !== SERVICE ||
    observation.target_descriptor?.production_validator_binding_evidence_path !==
      identity.production_validator_binding_evidence_path ||
    observation.target_descriptor?.production_validator_binding_evidence_sha256 !==
      identity.production_validator_binding_evidence_sha256 ||
    observation.target_descriptor?.production_validator_binding_evidence_id !==
      identity.production_validator_binding_evidence_id ||
    observation.reviewed_semantic_execution?.reviewed_execution_verified !== true ||
    observation.reviewed_semantic_execution?.private_reviewed_execution_tree !== true ||
    observation.reviewed_semantic_execution?.reviewed_execution_bytes_rebound_before_and_after !== true ||
    observation.reviewed_semantic_execution?.worktree_semantic_import !== false ||
    observation.reviewed_semantic_execution?.activation_source_head_sha !==
      plan.start_admission_observed_repo_head ||
    observation.reviewed_semantic_execution?.activation_source_ancestor_current_main !== true ||
    observation.activation_lineage?.activation_plan_id !== plan.activation_plan_id ||
    observation.activation_lineage?.activation_plan_file_sha256 !==
      sha256(prettyBytes(plan)) ||
    observation.activation_lineage?.activation_receipt_id !==
      receipt.activation_receipt_id ||
    observation.activation_lineage?.activation_receipt_file_sha256 !==
      sha256(prettyBytes(receipt)) ||
    observation.activation_lineage?.activation_plan_rederived_from_upstream !== true ||
    observation.activation_lineage?.activation_receipt_rederived !== true ||
    observation.activation_lineage?.source_lineage_ancestor_current_main !== true ||
    observation.activation_lineage?.activation_floor_block_number !==
      receipt.observations?.after_xiphos_block_number ||
    observation.service?.service_unit !== SERVICE ||
    observation.service?.runtime_active_verified !== true ||
    observation.service?.listener_address !== "127.0.0.1" ||
    observation.service?.listener_port !== 18553 ||
    observation.service?.listener_present !== true ||
    observation.service?.invocation_stable_during_observation !== true ||
    observation.service?.listener_stable_during_observation !== true ||
    observation.service?.container_stable_during_observation !== true ||
    observation.service?.service_container_contract_verified !== true ||
    observation.container?.running !== true ||
    observation.service_container_listener_binding_verified !== true ||
    observation.rpc?.url !== RPC_URL ||
    observation.rpc?.chain_id_hex !== "0x802" ||
    observation.rpc?.genesis_block_number !== "0" ||
    observation.rpc?.genesis_block_hash !== identity.genesis_block_hash ||
    observation.rpc?.genesis_state_root !== identity.genesis_state_root ||
    !/^(0|[1-9][0-9]*)$/u.test(String(observation.rpc?.head_block_number || "")) ||
    !Number.isSafeInteger(observation.rpc?.peer_count) ||
    observation.rpc.peer_count < 2 ||
    JSON.stringify(observedValidators) !== JSON.stringify(expectedValidators) ||
    observation.rpc?.exact_validator_set_verified !== true ||
    observation.rpc?.two_peer_minimum_verified !== true ||
    observation.rpc?.head_at_or_above_activation_floor !== true ||
    observation.write_capability_classification !== "write_capable_not_authorized" ||
    observation.exact_genesis_bound !== true ||
    observation.production_validator_set_bound !== true ||
    observation.independent_host_acceptance !== true ||
    observation.target_descriptor_promotion_authorized !== false ||
    observation.canonical_main_stable_during_observation !== true ||
    canonicalJson(observation.authority) !==
      canonicalJson(VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_AUTHORITY_V1) ||
    observationSourceAncestorCurrentMain !== true ||
    activationSourceAncestorCurrentMain !== true
  ) fail("promotion_host_observation_semantics_invalid");

  const observedMs = Date.parse(String(observation.observed_at_utc || ""));
  const activatedMs = Date.parse(String(receipt.activated_at_utc || ""));
  if (!Number.isFinite(observedMs) || !Number.isFinite(activatedMs)) {
    fail("promotion_observation_time_invalid");
  }
  if (observedMs < activatedMs) fail("promotion_observation_before_activation");
  const now = BigInt(String(evaluationTimeUnix));
  const observedSeconds = BigInt(Math.floor(observedMs / 1000));
  if (now < observedSeconds) fail("promotion_observation_from_future");
  if (now - observedSeconds > MAX_OBSERVATION_AGE_SECONDS) {
    fail("promotion_observation_stale");
  }
  return id;
}
function holdSelection() {
  return {
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
}
function assertOnlyPromotionDelta(sourceTarget, promotedTarget) {
  const reverted = structuredClone(promotedTarget);
  reverted.status = HOLD_STATUS;
  reverted.selection = holdSelection();
  reverted.next_gate =
    "observe_and_select_one_real_long_lived_production_epoch2_rpc_runtime";
  if (canonicalJson(reverted) !== canonicalJson(sourceTarget)) {
    fail("promotion_target_delta_not_exact");
  }
}
export function prepareVoidProductionEpoch2RpcTargetPromotionV1(input) {
  const sourceTarget = structuredClone(input?.source_target);
  const plan = structuredClone(input?.activation_plan);
  const receipt = structuredClone(input?.activation_receipt);
  const observation = structuredClone(input?.host_observation);
  const evaluationTimeUnix = String(input?.evaluation_time_unix || "");

  if (
    !plain(sourceTarget) ||
    !plain(plan) ||
    !plain(receipt) ||
    !plain(observation) ||
    !/^(0|[1-9][0-9]*)$/u.test(evaluationTimeUnix) ||
    !HEX40.test(String(input?.repository_head_sha || "")) ||
    !HEX40.test(String(input?.repository_tree_sha || "")) ||
    !HEX40.test(String(input?.source_target_git_blob_sha1 || "")) ||
    !HEX64.test(String(input?.source_target_file_sha256 || ""))
  ) fail("promotion_input_invalid");

  requirePrettySha(
    sourceTarget,
    input.source_target_file_sha256,
    "promotion_source_target",
  );
  const sourceBytes = prettyBytes(sourceTarget);
  if (gitBlobSha1(sourceBytes) !== input.source_target_git_blob_sha1) {
    fail("promotion_source_target_git_blob_mismatch");
  }
  const sourceEval = validateProductionEpoch2RpcTargetV1(sourceTarget);
  if (
    sourceEval.status !== HOLD_STATUS ||
    sourceEval.production_rpc_target_selected !== false
  ) fail("promotion_source_target_not_hold");

  const planId = validateActivationPlan(
    plan,
    input.activation_plan_file_sha256,
  );
  const receiptId = validateActivationReceipt(
    receipt,
    plan,
    input.activation_receipt_file_sha256,
  );
  const observationId = validateObservation(
    observation,
    input.host_observation_file_sha256,
    plan,
    receipt,
    sourceTarget,
    evaluationTimeUnix,
    {
      observationSourceAncestorCurrentMain:
        input.observation_source_ancestor_current_main === true,
      activationSourceAncestorCurrentMain:
        input.activation_source_ancestor_current_main === true,
    },
  );

  const promotedTarget = structuredClone(sourceTarget);
  promotedTarget.status = SELECTED_STATUS;
  promotedTarget.selection = {
    production_rpc_target_selected: true,
    rpc_url: RPC_URL,
    rpc_url_fingerprint_sha256:
      productionEpoch2RpcUrlFingerprintV1(RPC_URL),
    service_unit: SERVICE,
    activation_plan_id: planId,
    activation_receipt_id: receiptId,
    activation_receipt_sha256: input.activation_receipt_file_sha256,
    runtime_observation_id: observationId,
    runtime_observation_sha256: input.host_observation_file_sha256,
    runtime_active_verified: true,
    exact_genesis_bound: true,
    production_validator_set_bound: true,
    production_validator_binding_source_path:
      sourceTarget.reviewed_successor_identity
        .production_validator_binding_evidence_path,
    production_validator_binding_evidence_sha256:
      sourceTarget.reviewed_successor_identity
        .production_validator_binding_evidence_sha256,
    write_capability_classification: "write_capable_not_authorized",
    independent_host_acceptance: true,
  };
  promotedTarget.next_gate =
    "downstream_consumers_must_rebind_and_repeat_fresh_read_only_preflights";

  validateProductionEpoch2RpcTargetV1(promotedTarget);
  assertOnlyPromotionDelta(sourceTarget, promotedTarget);

  const frozenPromoted = deepFreeze(promotedTarget);
  const material = {
    marker: VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_V1,
    version: 1,
    status:
      "PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_PREPARED_CANONICAL_APPLICATION_REQUIRED",
    repository: {
      head_sha: input.repository_head_sha,
      tree_sha: input.repository_tree_sha,
    },
    source_target: {
      path: TARGET_REL,
      file_sha256: input.source_target_file_sha256,
      git_blob_sha1: input.source_target_git_blob_sha1,
      status: HOLD_STATUS,
    },
    activation: {
      activation_plan_id: planId,
      activation_plan_file_sha256: input.activation_plan_file_sha256,
      activation_receipt_id: receiptId,
      activation_receipt_file_sha256:
        input.activation_receipt_file_sha256,
    },
    runtime_observation: {
      observation_id: observationId,
      observation_file_sha256: input.host_observation_file_sha256,
      source_head_sha: observation.source_binding.head,
      activation_source_head_sha:
        observation.reviewed_semantic_execution.activation_source_head_sha,
      observed_at_utc: observation.observed_at_utc,
      head_block_number: observation.rpc.head_block_number,
      peer_count: observation.rpc.peer_count,
      independent_host_acceptance: true,
      write_capability_classification: "write_capable_not_authorized",
    },
    promoted_target: frozenPromoted,
    promoted_target_file_sha256: sha256(prettyBytes(frozenPromoted)),
    evaluation_time_unix: evaluationTimeUnix,
    canonical_target_file_updated: false,
    canonical_application_required: true,
    transaction_authorized: false,
    authoritative_chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
    authority: VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_AUTHORITY_V1,
    next_gate:
      "apply_exact_promoted_target_to_canonical_source_under_separate_review",
  };
  return deepFreeze({
    ...material,
    promotion_id:
      "voidpe2rpctp1_" +
      sha256(Buffer.from(canonicalJson(material), "utf8")),
  });
}

function readCanonicalTarget() {
  const repo = repositoryIdentity();
  const source = readStableJsonFile(TARGET_PATH, {
    label: "promotion_source_target",
    requirePretty: true,
  });
  const headBlob = gitRead(
    ["rev-parse", "HEAD:" + TARGET_REL],
    "promotion_target_blob_unavailable",
  );
  if (
    !HEX40.test(headBlob) ||
    gitBlobSha1(source.bytes) !== headBlob
  ) fail("promotion_target_worktree_git_mismatch");
  const toolBlob = gitRead(
    ["rev-parse", "HEAD:" + TOOL_REL],
    "promotion_tool_blob_unavailable",
  );
  if (!HEX40.test(toolBlob)) fail("promotion_tool_blob_invalid");
  return Object.freeze({
    ...repo,
    source,
    target_git_blob_sha1: headBlob,
    promotion_tool_git_blob_sha1: toolBlob,
  });
}

async function main() {
  const action = process.argv[2];
  if (action !== "prepare") fail("promotion_action_invalid");
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      "activation-plan": { type: "string" },
      "activation-plan-sha256": { type: "string" },
      "activation-receipt": { type: "string" },
      "activation-receipt-sha256": { type: "string" },
      "host-observation": { type: "string" },
      "host-observation-sha256": { type: "string" },
      "evaluation-time-unix": { type: "string" },
      output: { type: "string" },
    },
    allowPositionals: false,
    strict: true,
  });
  for (const key of [
    "activation-plan",
    "activation-plan-sha256",
    "activation-receipt",
    "activation-receipt-sha256",
    "host-observation",
    "host-observation-sha256",
    "output",
  ]) {
    if (!values[key]) fail("promotion_argument_missing:" + key);
  }
  for (const key of [
    "activation-plan-sha256",
    "activation-receipt-sha256",
    "host-observation-sha256",
  ]) {
    if (!HEX64.test(String(values[key]))) {
      fail("promotion_argument_sha_invalid:" + key);
    }
  }
  const canonical = readCanonicalTarget();
  const plan = readStableJsonFile(path.resolve(values["activation-plan"]), {
    label: "promotion_activation_plan",
    expectedSha256: values["activation-plan-sha256"],
    requirePrivate: true,
    requireOutsideRepo: true,
  });
  const receipt = readStableJsonFile(
    path.resolve(values["activation-receipt"]),
    {
      label: "promotion_activation_receipt",
      expectedSha256: values["activation-receipt-sha256"],
      requirePrivate: true,
      requireOutsideRepo: true,
    },
  );
  const observation = readStableJsonFile(
    path.resolve(values["host-observation"]),
    {
      label: "promotion_host_observation",
      expectedSha256: values["host-observation-sha256"],
      requirePrivate: true,
      requireOutsideRepo: true,
    },
  );

  const observationHead = String(observation.value.source_binding?.head || "");
  const activationHead = String(
    observation.value.reviewed_semantic_execution?.activation_source_head_sha ||
    "",
  );
  const observationAncestor =
    gitCommitIsAncestor(observationHead, canonical.repository_head_sha);
  const activationAncestor =
    gitCommitIsAncestor(activationHead, canonical.repository_head_sha);
  if (!observationAncestor || !activationAncestor) {
    fail("promotion_evidence_source_not_ancestor_current_main");
  }

  const evaluationTimeUnix =
    values["evaluation-time-unix"] ||
    String(Math.floor(Date.now() / 1000));

  const promotion = prepareVoidProductionEpoch2RpcTargetPromotionV1({
    source_target: canonical.source.value,
    source_target_file_sha256: canonical.source.sha256,
    source_target_git_blob_sha1: canonical.target_git_blob_sha1,
    repository_head_sha: canonical.repository_head_sha,
    repository_tree_sha: canonical.repository_tree_sha,
    activation_plan: plan.value,
    activation_plan_file_sha256: plan.sha256,
    activation_receipt: receipt.value,
    activation_receipt_file_sha256: receipt.sha256,
    host_observation: observation.value,
    host_observation_file_sha256: observation.sha256,
    evaluation_time_unix: evaluationTimeUnix,
    observation_source_ancestor_current_main: observationAncestor,
    activation_source_ancestor_current_main: activationAncestor,
  });

  const written = writePrivateJson(path.resolve(values.output), promotion);
  console.log(VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_V1);
  console.log("status=" + promotion.status);
  console.log("promotion_id=" + promotion.promotion_id);
  console.log("runtime_observation_id=" +
    promotion.runtime_observation.observation_id);
  console.log("promoted_target_status=" +
    promotion.promoted_target.status);
  console.log("production_rpc_target_selected=true");
  console.log("rpc_url=" +
    promotion.promoted_target.selection.rpc_url);
  console.log("write_capability_classification=write_capable_not_authorized");
  console.log("canonical_target_file_updated=false");
  console.log("canonical_application_required=true");
  console.log("transaction_authorized=false");
  console.log("market_activation=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("output=" + path.resolve(values.output));
  console.log("output_sha256=" + written.sha256);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(
    "file://" + path.resolve(process.argv[1]),
  ).href
) {
  main().catch((error) => {
    console.error("VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}
