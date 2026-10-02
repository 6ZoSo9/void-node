#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  HOLD_STATUS,
  SELECTED_STATUS,
  VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1,
  loadProductionEpoch2RpcTargetV1,
  productionEpoch2RpcUrlFingerprintV1,
  validateProductionEpoch2RpcTargetV1,
} from "./void-production-epoch2-rpc-target-v1.mjs";

export const VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_COMPILER_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_COMPILER_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RPC_URL = "http://127.0.0.1:18553/";
const SERVICE = "void-economic-epoch2-qbft-validator-v1.service";
const OBSERVER_MARKER = "VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1";
const OBSERVER_STATUS = "PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_ACCEPTED";
const SHA256 = /^[0-9a-f]{64}$/u;
const SHA40 = /^[0-9a-f]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const OBSERVATION_ID = /^voidpe2rpcobs1_[0-9a-f]{64}$/u;

const AUTHORITY = Object.freeze({
  source_candidate_only: true,
  canonical_target_write: false,
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
});

function fail(code) {
  throw new Error(code);
}
function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (plain(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") + "}";
  }
  fail("production_epoch2_rpc_promotion_canonical_value_invalid");
}
function requireSha(value, code) {
  if (!SHA256.test(String(value || ""))) fail(code);
  return String(value);
}
function parsePinnedBytes(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes)) fail(label + "_bytes_required");
  requireSha(expectedSha, label + "_sha256_invalid");
  if (sha256(bytes) !== expectedSha) fail(label + "_sha256_mismatch");
  let value;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
  } catch {
    fail(label + "_json_invalid");
  }
  if (!plain(value)) fail(label + "_object_required");
  return value;
}
function recomputeObservationId(observation) {
  if (!plain(observation)) {
    fail("production_epoch2_rpc_promotion_observation_invalid");
  }
  const material = structuredClone(observation);
  const observedId = String(material.observation_id || "");
  delete material.observation_id;
  if (!OBSERVATION_ID.test(observedId)) {
    fail("production_epoch2_rpc_promotion_observation_id_invalid");
  }
  const expected =
    "voidpe2rpcobs1_" + sha256(Buffer.from(canonical(material), "utf8"));
  if (observedId !== expected) {
    fail("production_epoch2_rpc_promotion_observation_id_mismatch");
  }
  return observedId;
}
function verifyObservationV1({
  observation,
  observation_file_sha256,
  activation_plan,
  activation_plan_file_sha256,
  activation_receipt,
  activation_receipt_file_sha256,
  hold_target,
}) {
  const observationId = recomputeObservationId(observation);
  const targetIdentity = hold_target.reviewed_successor_identity;
  const lineage = observation.activation_lineage;
  const service = observation.service;
  const rpc = observation.rpc;
  const source = observation.source_binding;
  const reviewed = observation.reviewed_semantic_execution;
  const targetDescriptor = observation.target_descriptor;
  const authority = observation.authority;

  if (
    observation.marker !== OBSERVER_MARKER ||
    observation.version !== 1 ||
    observation.status !== OBSERVER_STATUS ||
    observation.hostname !== "zoso-Precision-Tower-7810" ||
    observation.chain_id !== 2050 ||
    observation.execution_epoch !== 2 ||
    !plain(source) ||
    source.branch !== "main" ||
    !SHA40.test(String(source.head || "")) ||
    !SHA40.test(String(source.tree || "")) ||
    source.remote_main_sha !== source.head ||
    source.canonical_remote_url !== "https://github.com/6ZoSo9/void-node.git" ||
    source.canonical_main_live_match !== true ||
    !plain(reviewed) ||
    reviewed.reviewed_execution_verified !== true ||
    reviewed.private_reviewed_execution_tree !== true ||
    reviewed.reviewed_execution_bytes_rebound_before_and_after !== true ||
    reviewed.worktree_semantic_import !== false ||
    reviewed.activation_source_ancestor_current_main !== true ||
    !plain(targetDescriptor) ||
    targetDescriptor.status !== HOLD_STATUS ||
    targetDescriptor.production_rpc_target_selected !== false ||
    targetDescriptor.prospective_rpc_url !== RPC_URL ||
    targetDescriptor.rpc_url_fingerprint_sha256 !==
      productionEpoch2RpcUrlFingerprintV1(RPC_URL) ||
    targetDescriptor.prospective_service_unit !== SERVICE ||
    targetDescriptor.production_validator_binding_evidence_path !==
      targetIdentity.production_validator_binding_evidence_path ||
    targetDescriptor.production_validator_binding_evidence_sha256 !==
      targetIdentity.production_validator_binding_evidence_sha256 ||
    targetDescriptor.production_validator_binding_evidence_id !==
      targetIdentity.production_validator_binding_evidence_id ||
    !plain(lineage) ||
    lineage.activation_plan_id !== activation_plan.activation_plan_id ||
    lineage.activation_plan_file_sha256 !== activation_plan_file_sha256 ||
    lineage.activation_plan_rederived_from_upstream !== true ||
    lineage.activation_receipt_id !== activation_receipt.activation_receipt_id ||
    lineage.activation_receipt_file_sha256 !== activation_receipt_file_sha256 ||
    lineage.activation_receipt_rederived !== true ||
    lineage.activation_floor_block_number !==
      activation_receipt.observations?.after_xiphos_block_number ||
    lineage.source_lineage_ancestor_current_main !== true ||
    !plain(service) ||
    service.service_unit !== SERVICE ||
    service.active_state !== "active" ||
    service.sub_state !== "running" ||
    service.runtime_active_verified !== true ||
    service.listener_address !== "127.0.0.1" ||
    service.listener_port !== 18553 ||
    service.listener_present !== true ||
    service.invocation_stable_during_observation !== true ||
    service.listener_stable_during_observation !== true ||
    service.container_stable_during_observation !== true ||
    service.service_container_contract_verified !== true ||
    observation.service_container_listener_binding_verified !== true ||
    !plain(observation.container) ||
    observation.container.running !== true ||
    observation.container.container_name !== "void-e2-qbft-precision-v1" ||
    observation.container.image_reference !== targetIdentity.besu_image ||
    !/^sha256:[0-9a-f]{64}$/u.test(
      String(observation.container.image_id || ""),
    ) ||
    !plain(rpc) ||
    rpc.url !== RPC_URL ||
    rpc.chain_id_hex !== "0x802" ||
    rpc.genesis_block_number !== "0" ||
    !UINT.test(String(rpc.head_block_number || "")) ||
    !UINT.test(String(lineage.activation_floor_block_number || "")) ||
    BigInt(rpc.head_block_number) <
      BigInt(lineage.activation_floor_block_number) ||
    String(rpc.genesis_block_hash || "").toLowerCase() !==
      targetIdentity.genesis_block_hash ||
    String(rpc.genesis_state_root || "").toLowerCase() !==
      targetIdentity.genesis_state_root ||
    !Number.isSafeInteger(rpc.peer_count) ||
    rpc.peer_count < 2 ||
    !Array.isArray(rpc.validators) ||
    JSON.stringify(
      rpc.validators.map((value) => String(value).toLowerCase()).sort(),
    ) !== JSON.stringify(
      activation_plan.chain.expected_validators
        .map((value) => String(value).toLowerCase())
        .sort(),
    ) ||
    rpc.exact_validator_set_verified !== true ||
    rpc.two_peer_minimum_verified !== true ||
    rpc.head_at_or_above_activation_floor !== true ||
    observation.write_capability_classification !==
      "write_capable_not_authorized" ||
    observation.exact_genesis_bound !== true ||
    observation.production_validator_set_bound !== true ||
    observation.independent_host_acceptance !== true ||
    observation.target_descriptor_promotion_authorized !== false ||
    observation.canonical_main_stable_during_observation !== true ||
    !plain(authority) ||
    authority.target_descriptor_promotion !== false ||
    authority.authoritative_chain2050_write !== false ||
    authority.wallet_or_signer_access !== false ||
    authority.private_key_access !== false ||
    authority.transaction_construction !== false ||
    authority.transaction_signing !== false ||
    authority.transaction_submission !== false ||
    authority.transaction_broadcast !== false ||
    authority.migration_authorized !== false ||
    authority.public_presale_activation !== false ||
    authority.funds_movement !== false
  ) {
    fail("production_epoch2_rpc_promotion_observation_contract_mismatch");
  }

  requireSha(
    observation_file_sha256,
    "production_epoch2_rpc_promotion_observation_sha_invalid",
  );
  return Object.freeze({
    observation_id: observationId,
    observation_file_sha256,
  });
}

export function buildProductionEpoch2RpcSelectedDescriptorV1(input) {
  if (!plain(input)) fail("production_epoch2_rpc_promotion_input_invalid");

  const holdTarget = structuredClone(input.hold_target);
  const holdEvaluation = validateProductionEpoch2RpcTargetV1(holdTarget);
  if (
    holdEvaluation.marker !== VOID_PRODUCTION_EPOCH2_RPC_TARGET_V1 ||
    holdEvaluation.status !== HOLD_STATUS ||
    holdEvaluation.production_rpc_target_selected !== false
  ) {
    fail("production_epoch2_rpc_promotion_hold_target_required");
  }

  const activationPlanSha = requireSha(
    input.activation_plan_file_sha256,
    "production_epoch2_rpc_promotion_activation_plan_sha_invalid",
  );
  const activationReceiptSha = requireSha(
    input.activation_receipt_file_sha256,
    "production_epoch2_rpc_promotion_activation_receipt_sha_invalid",
  );
  const observationSha = requireSha(
    input.runtime_observation_file_sha256,
    "production_epoch2_rpc_promotion_observation_sha_invalid",
  );

  const activationPlan = parsePinnedBytes(
    input.activation_plan_bytes,
    activationPlanSha,
    "production_epoch2_rpc_promotion_activation_plan",
  );
  const activationReceipt = parsePinnedBytes(
    input.activation_receipt_bytes,
    activationReceiptSha,
    "production_epoch2_rpc_promotion_activation_receipt",
  );
  const runtimeObservation = parsePinnedBytes(
    input.runtime_observation_bytes,
    observationSha,
    "production_epoch2_rpc_promotion_runtime_observation",
  );

  const validatedActivation =
    validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(
      activationPlan,
      activationReceipt,
    );

  const verifiedObservation = verifyObservationV1({
    observation: runtimeObservation,
    observation_file_sha256: observationSha,
    activation_plan: validatedActivation.activation_plan,
    activation_plan_file_sha256: activationPlanSha,
    activation_receipt: validatedActivation.activation_receipt,
    activation_receipt_file_sha256: activationReceiptSha,
    hold_target: holdTarget,
  });

  const selected = structuredClone(holdTarget);
  selected.status = SELECTED_STATUS;
  selected.selection = {
    production_rpc_target_selected: true,
    rpc_url: RPC_URL,
    rpc_url_fingerprint_sha256:
      productionEpoch2RpcUrlFingerprintV1(RPC_URL),
    service_unit: SERVICE,
    activation_plan_id:
      validatedActivation.activation_plan.activation_plan_id,
    activation_receipt_id:
      validatedActivation.activation_receipt.activation_receipt_id,
    activation_receipt_sha256: activationReceiptSha,
    runtime_observation_id: verifiedObservation.observation_id,
    runtime_observation_sha256: observationSha,
    runtime_active_verified: true,
    exact_genesis_bound: true,
    production_validator_set_bound: true,
    production_validator_binding_source_path:
      holdTarget.reviewed_successor_identity
        .production_validator_binding_evidence_path,
    production_validator_binding_evidence_sha256:
      holdTarget.reviewed_successor_identity
        .production_validator_binding_evidence_sha256,
    write_capability_classification: "write_capable_not_authorized",
    independent_host_acceptance: true,
  };
  selected.next_gate =
    "downstream_consumers_must_rebind_and_repeat_fresh_read_only_preflights";

  const evaluation = validateProductionEpoch2RpcTargetV1(selected);
  if (
    evaluation.status !== SELECTED_STATUS ||
    evaluation.production_rpc_target_selected !== true ||
    evaluation.rpc_url !== RPC_URL ||
    evaluation.transaction_authorized !== false ||
    evaluation.authoritative_chain2050_write !== false ||
    evaluation.migration_authorized !== false ||
    evaluation.funds_movement !== false
  ) {
    fail("production_epoch2_rpc_promotion_selected_validation_failed");
  }

  return Object.freeze({
    candidate: Object.freeze(selected),
    evidence: Object.freeze({
      activation_plan_id:
        validatedActivation.activation_plan.activation_plan_id,
      activation_plan_file_sha256: activationPlanSha,
      activation_receipt_id:
        validatedActivation.activation_receipt.activation_receipt_id,
      activation_receipt_file_sha256: activationReceiptSha,
      runtime_observation_id: verifiedObservation.observation_id,
      runtime_observation_file_sha256: observationSha,
    }),
    authority: AUTHORITY,
  });
}

function writeCandidateOutsideRepository(output, candidate) {
  const absolute = path.resolve(output);
  if (absolute === ROOT || absolute.startsWith(ROOT + path.sep)) {
    fail("production_epoch2_rpc_promotion_output_inside_repository_forbidden");
  }
  const parent = path.dirname(absolute);
  if (!fs.statSync(parent).isDirectory()) {
    fail("production_epoch2_rpc_promotion_output_parent_not_directory");
  }
  const rootReal = fs.realpathSync(ROOT);
  const parentReal = fs.realpathSync(parent);
  if (
    parentReal === rootReal ||
    parentReal.startsWith(rootReal + path.sep)
  ) {
    fail("production_epoch2_rpc_promotion_output_inside_repository_forbidden");
  }
  const physicalOutput = path.join(parentReal, path.basename(absolute));
  const bytes = Buffer.from(JSON.stringify(candidate, null, 2) + "\n", "utf8");
  const fd = fs.openSync(
    physicalOutput,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return Object.freeze({ path: physicalOutput, sha256: sha256(bytes) });
}

async function main() {
  const { values } = parseArgs({
    options: {
      "activation-plan": { type: "string" },
      "activation-plan-sha256": { type: "string" },
      "activation-receipt": { type: "string" },
      "activation-receipt-sha256": { type: "string" },
      "runtime-observation": { type: "string" },
      "runtime-observation-sha256": { type: "string" },
      output: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });

  for (const key of [
    "activation-plan",
    "activation-plan-sha256",
    "activation-receipt",
    "activation-receipt-sha256",
    "runtime-observation",
    "runtime-observation-sha256",
    "output",
  ]) {
    if (!values[key]) {
      fail("production_epoch2_rpc_promotion_argument_missing:" + key);
    }
  }
  for (const key of [
    "activation-plan-sha256",
    "activation-receipt-sha256",
    "runtime-observation-sha256",
  ]) {
    requireSha(
      values[key],
      "production_epoch2_rpc_promotion_argument_sha_invalid:" + key,
    );
  }

  const activationPlanBytes = fs.readFileSync(
    path.resolve(values["activation-plan"]),
  );
  const activationReceiptBytes = fs.readFileSync(
    path.resolve(values["activation-receipt"]),
  );
  const runtimeObservationBytes = fs.readFileSync(
    path.resolve(values["runtime-observation"]),
  );

  const { value: holdTarget } = loadProductionEpoch2RpcTargetV1();
  const compiled = buildProductionEpoch2RpcSelectedDescriptorV1({
    hold_target: holdTarget,
    activation_plan_bytes: activationPlanBytes,
    activation_plan_file_sha256: values["activation-plan-sha256"],
    activation_receipt_bytes: activationReceiptBytes,
    activation_receipt_file_sha256:
      values["activation-receipt-sha256"],
    runtime_observation_bytes: runtimeObservationBytes,
    runtime_observation_file_sha256:
      values["runtime-observation-sha256"],
  });

  const written = writeCandidateOutsideRepository(
    values.output,
    compiled.candidate,
  );

  console.log(VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_COMPILER_V1);
  console.log("status=SELECTED_DESCRIPTOR_CANDIDATE_COMPILED");
  console.log("production_rpc_target_selected=true");
  console.log("rpc_url=" + compiled.candidate.selection.rpc_url);
  console.log("activation_plan_id=" + compiled.evidence.activation_plan_id);
  console.log(
    "activation_receipt_id=" + compiled.evidence.activation_receipt_id,
  );
  console.log(
    "runtime_observation_id=" + compiled.evidence.runtime_observation_id,
  );
  console.log("candidate_sha256=" + written.sha256);
  console.log("canonical_target_write=false");
  console.log("rpc_call=false");
  console.log("service_action=false");
  console.log("docker_mutation=false");
  console.log("transaction_broadcast=false");
  console.log("migration_authorized=false");
  console.log("funds_movement=false");
  console.log("output=" + written.path);
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error("VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_COMPILER_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}
