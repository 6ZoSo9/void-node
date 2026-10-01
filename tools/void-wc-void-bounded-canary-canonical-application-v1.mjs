#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
  promoteWcVoidBoundedCanaryCandidatesV1,
} from "./void-wc-void-bounded-canary-candidate-promotion-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1";
export const VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1";

export const VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_application: true,
    exact_semantic_promotion_bytes_required: true,
    exact_candidate_promotion_receipt_required: true,
    candidate_promotion_reexecution_required: true,
    canonical_head_candidate_bytes_required: true,
    reviewed_repository_generation_required: true,
    canonical_classifier_reexecution: true,
    exact_two_gate_source_delta: true,
    reviewed_git_commit_required: true,
    repository_source_write: false,
    filesystem_read: true,
    filesystem_write: false,
    runtime_mutation: false,
    service_mutation: false,
    rpc_call: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    token_movement: false,
    inventory_funding: false,
    liquidity_movement: false,
    coupled_activation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const TOOL_REL =
  "tools/void-wc-void-bounded-canary-canonical-application-v1.mjs";
const PROMOTION_TOOL_REL =
  "tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs";
const PRODUCTION_REL =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED_REL =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR_REL =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const CURRENT_LAUNCH =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const PROMOTION_ID = /^voidwcbccp1_[0-9a-f]{64}$/u;
const PLAN_ID = /^voidwcbcap1_[0-9a-f]{64}$/u;
const MAX_BYTES = 64 * 1024 * 1024;

const PLAN_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "pair",
  "coupled_launch_id",
  "candidate_promotion_id",
  "candidate_promotion_receipt_file_sha256",
  "semantic_promotion_file_sha256",
  "reviewed_promotion_repository_head_sha",
  "reviewed_promotion_repository_tree_sha",
  "application_base_head_sha",
  "application_base_tree_sha",
  "candidate_promotion_tool_git_blob_sha1",
  "canonical_application_tool_git_blob_sha1",
  "production_candidate_path",
  "production_source_git_blob_sha1",
  "production_source_file_sha256",
  "production_target_git_blob_sha1",
  "production_target_file_sha256",
  "production_target_candidate",
  "coupled_candidate_path",
  "coupled_source_git_blob_sha1",
  "coupled_source_file_sha256",
  "coupled_target_git_blob_sha1",
  "coupled_target_file_sha256",
  "coupled_target_candidate",
  "successor_candidate_path",
  "successor_git_blob_sha1",
  "successor_file_sha256",
  "production_before",
  "production_after",
  "coupled_before",
  "coupled_after",
  "removed_production_missing_gate",
  "removed_coupled_missing_gate",
  "bounded_canary_green",
  "production_status_remains_hold",
  "coupled_status_remains_hold",
  "coupled_activation_ready",
  "reviewed_git_commit_required",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "application_plan_id",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
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
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  fail("CANONICAL_APPLICATION_CANONICAL_VALUE_INVALID");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sanitizedGitEnv() {
  const env = { ...process.env };
  for (const key of [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_NAMESPACE",
    "GIT_REPLACE_REF_BASE",
    "GIT_CONFIG_PARAMETERS",
    "GIT_CONFIG_COUNT",
    "GIT_EXEC_PATH",
    "GIT_SSH",
    "GIT_SSH_COMMAND",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
    "GIT_EXTERNAL_DIFF",
    "GIT_PAGER",
    "GIT_EDITOR",
    "GIT_SEQUENCE_EDITOR",
  ]) {
    delete env[key];
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_TERMINAL_PROMPT = "0";
  return env;
}

function gitText(args, code) {
  try {
    return execFileSync(
      GIT,
      ["-C", ROOT, ...args],
      {
        encoding: "utf8",
        env: sanitizedGitEnv(),
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: MAX_BYTES + 1024,
      },
    ).trim();
  } catch {
    fail(code);
  }
}

function gitBytes(args, code) {
  try {
    return Buffer.from(execFileSync(
      GIT,
      ["-C", ROOT, ...args],
      {
        encoding: null,
        env: sanitizedGitEnv(),
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: MAX_BYTES + 1024,
      },
    ));
  } catch {
    fail(code);
  }
}

function requireCleanRepository() {
  if (
    gitText(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "CANONICAL_APPLICATION_REPOSITORY_STATUS_UNAVAILABLE",
    ) !== ""
  ) {
    fail("CANONICAL_APPLICATION_REPOSITORY_MUST_BE_CLEAN");
  }
}

function headIdentity() {
  requireCleanRepository();
  const head = gitText(
    ["rev-parse", "HEAD"],
    "CANONICAL_APPLICATION_HEAD_UNAVAILABLE",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "CANONICAL_APPLICATION_TREE_UNAVAILABLE",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("CANONICAL_APPLICATION_REPOSITORY_IDENTITY_INVALID");
  }
  return Object.freeze({ head, tree });
}

function headBlob(pathname, code) {
  const value = gitText(
    ["rev-parse", "HEAD:" + pathname],
    code,
  );
  if (!HEX40.test(value)) fail(code);
  return value;
}

function commitBlob(commit, pathname, code) {
  const value = gitText(["rev-parse", commit + ":" + pathname], code);
  if (!HEX40.test(value)) fail(code);
  return value;
}

function commitFile(commit, pathname, label) {
  const bytes = gitBytes(
    ["show", commit + ":" + pathname],
    "CANONICAL_APPLICATION_" + label + "_BYTES_UNAVAILABLE",
  );
  if (bytes.length < 2 || bytes.length > MAX_BYTES) {
    fail("CANONICAL_APPLICATION_" + label + "_BYTES_INVALID");
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("CANONICAL_APPLICATION_" + label + "_JSON_INVALID");
  }
  if (!plain(value)) {
    fail("CANONICAL_APPLICATION_" + label + "_JSON_NOT_OBJECT");
  }
  return Object.freeze({
    bytes,
    value,
    sha256: sha256(bytes),
    blob_sha1: commitBlob(
      commit,
      pathname,
      "CANONICAL_APPLICATION_" + label + "_BLOB_UNAVAILABLE",
    ),
  });
}

function headFile(pathname, label) {
  return commitFile("HEAD", pathname, label);
}

function parseJsonBytes(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_BYTES) {
    fail(label + "_BYTES_INVALID");
  }
  if (typeof expectedSha !== "string" || !HEX64.test(expectedSha)) {
    fail(label + "_SHA256_INVALID");
  }
  if (sha256(bytes) !== expectedSha) fail(label + "_SHA256_MISMATCH");
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_JSON_NOT_OBJECT");
  return Object.freeze({ bytes: Buffer.from(bytes), sha256: expectedSha, value });
}

function summarize(decision) {
  return Object.freeze({
    ok: decision?.ok === true,
    status: typeof decision?.status === "string" ? decision.status : "UNKNOWN",
    reason: typeof decision?.reason === "string" ? decision.reason : null,
    missing_gates: Object.freeze(
      Array.isArray(decision?.missing_gates) ? [...decision.missing_gates] : [],
    ),
  });
}

function minusOne(values, removed) {
  return values.filter((value) => value !== removed);
}

function sameStrings(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function exactAuthority(value, expected, code) {
  exactObject(value, Object.keys(expected), code + "_SHAPE_INVALID");
  if (canonicalJson(value) !== canonicalJson(expected)) {
    fail(code + "_MISMATCH");
  }
}

function planWithoutId(plan) {
  const body = {};
  for (const key of PLAN_KEYS) {
    if (key !== "application_plan_id") body[key] = plan[key];
  }
  return body;
}

function validatePlan(plan) {
  exactObject(plan, PLAN_KEYS, "CANONICAL_APPLICATION_PLAN_SHAPE_INVALID");
  if (
    plan.marker !== VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1 ||
    plan.version !== 1 ||
    plan.status !== "CANONICAL_BOUNDED_CANARY_APPLICATION_PREPARED" ||
    plan.chain_id !== 2050 ||
    plan.execution_epoch !== 2 ||
    plan.pair !== "WC_VOID" ||
    plan.coupled_launch_id !== CURRENT_LAUNCH ||
    typeof plan.candidate_promotion_id !== "string" ||
    !PROMOTION_ID.test(plan.candidate_promotion_id) ||
    typeof plan.application_plan_id !== "string" ||
    !PLAN_ID.test(plan.application_plan_id) ||
    plan.production_candidate_path !== PRODUCTION_REL ||
    plan.coupled_candidate_path !== COUPLED_REL ||
    plan.successor_candidate_path !== SUCCESSOR_REL ||
    plan.removed_production_missing_gate !== "bounded_canary_required" ||
    plan.removed_coupled_missing_gate !== "bounded_canary_required" ||
    plan.bounded_canary_green !== true ||
    plan.production_status_remains_hold !== true ||
    plan.coupled_status_remains_hold !== true ||
    plan.coupled_activation_ready !== false ||
    plan.reviewed_git_commit_required !== true ||
    plan.market_activation_authorized !== false ||
    plan.public_presale_activation_authorized !== false ||
    plan.funds_movement_authorized !== false
  ) {
    fail("CANONICAL_APPLICATION_PLAN_INVALID");
  }
  for (const key of [
    "candidate_promotion_receipt_file_sha256",
    "semantic_promotion_file_sha256",
    "production_source_file_sha256",
    "production_target_file_sha256",
    "coupled_source_file_sha256",
    "coupled_target_file_sha256",
    "successor_file_sha256",
  ]) {
    if (typeof plan[key] !== "string" || !HEX64.test(plan[key])) {
      fail("CANONICAL_APPLICATION_PLAN_DIGEST_INVALID:" + key);
    }
  }
  for (const key of [
    "reviewed_promotion_repository_head_sha",
    "reviewed_promotion_repository_tree_sha",
    "application_base_head_sha",
    "application_base_tree_sha",
    "candidate_promotion_tool_git_blob_sha1",
    "canonical_application_tool_git_blob_sha1",
    "production_source_git_blob_sha1",
    "production_target_git_blob_sha1",
    "coupled_source_git_blob_sha1",
    "coupled_target_git_blob_sha1",
    "successor_git_blob_sha1",
  ]) {
    if (typeof plan[key] !== "string" || !HEX40.test(plan[key])) {
      fail("CANONICAL_APPLICATION_PLAN_GIT_ID_INVALID:" + key);
    }
  }
  exactAuthority(
    plan.authority,
    VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
    "CANONICAL_APPLICATION_PLAN_AUTHORITY",
  );

  if (
    plan.reviewed_promotion_repository_head_sha !==
      plan.application_base_head_sha ||
    plan.reviewed_promotion_repository_tree_sha !==
      plan.application_base_tree_sha
  ) {
    fail("CANONICAL_APPLICATION_PLAN_REVIEWED_BASE_MISMATCH");
  }
  const baseTree = gitText(
    ["rev-parse", plan.application_base_head_sha + "^{tree}"],
    "CANONICAL_APPLICATION_PLAN_BASE_TREE_UNAVAILABLE",
  );
  if (baseTree !== plan.application_base_tree_sha) {
    fail("CANONICAL_APPLICATION_PLAN_BASE_TREE_MISMATCH");
  }
  if (
    commitBlob(
      plan.application_base_head_sha,
      PROMOTION_TOOL_REL,
      "CANONICAL_APPLICATION_PLAN_PROMOTION_TOOL_BLOB_UNAVAILABLE",
    ) !== plan.candidate_promotion_tool_git_blob_sha1 ||
    commitBlob(
      plan.application_base_head_sha,
      TOOL_REL,
      "CANONICAL_APPLICATION_PLAN_TOOL_BLOB_UNAVAILABLE",
    ) !== plan.canonical_application_tool_git_blob_sha1
  ) {
    fail("CANONICAL_APPLICATION_PLAN_TOOL_LINEAGE_MISMATCH");
  }

  const baseProduction = commitFile(
    plan.application_base_head_sha,
    PRODUCTION_REL,
    "PLAN_BASE_PRODUCTION",
  );
  const baseCoupled = commitFile(
    plan.application_base_head_sha,
    COUPLED_REL,
    "PLAN_BASE_COUPLED",
  );
  const baseSuccessor = commitFile(
    plan.application_base_head_sha,
    SUCCESSOR_REL,
    "PLAN_BASE_SUCCESSOR",
  );
  if (
    baseProduction.blob_sha1 !== plan.production_source_git_blob_sha1 ||
    baseProduction.sha256 !== plan.production_source_file_sha256 ||
    baseCoupled.blob_sha1 !== plan.coupled_source_git_blob_sha1 ||
    baseCoupled.sha256 !== plan.coupled_source_file_sha256 ||
    baseSuccessor.blob_sha1 !== plan.successor_git_blob_sha1 ||
    baseSuccessor.sha256 !== plan.successor_file_sha256
  ) {
    fail("CANONICAL_APPLICATION_PLAN_BASE_SOURCE_MISMATCH");
  }

  const targetProductionBytes = prettyBytes(plan.production_target_candidate);
  const targetCoupledBytes = prettyBytes(plan.coupled_target_candidate);
  if (
    sha256(targetProductionBytes) !== plan.production_target_file_sha256 ||
    gitBlobSha1(targetProductionBytes) !== plan.production_target_git_blob_sha1 ||
    sha256(targetCoupledBytes) !== plan.coupled_target_file_sha256 ||
    gitBlobSha1(targetCoupledBytes) !== plan.coupled_target_git_blob_sha1
  ) {
    fail("CANONICAL_APPLICATION_PLAN_TARGET_IDENTITY_MISMATCH");
  }
  exactCandidateDelta(
    baseProduction.value,
    plan.production_target_candidate,
    "production",
  );
  exactCandidateDelta(
    baseCoupled.value,
    plan.coupled_target_candidate,
    "coupled",
  );

  const productionBefore =
    classifyVoidWcVoidProductionReadinessV1(baseProduction.value);
  const productionAfter =
    classifyVoidWcVoidProductionReadinessV1(plan.production_target_candidate);
  const coupledBefore =
    classifyVoidCoupledEconomicSuccessorGateV1(
      baseCoupled.value,
      baseSuccessor.value,
    );
  const coupledAfter =
    classifyVoidCoupledEconomicSuccessorGateV1(
      plan.coupled_target_candidate,
      baseSuccessor.value,
    );
  if (
    canonicalJson(summarize(productionBefore)) !==
      canonicalJson(plan.production_before) ||
    canonicalJson(summarize(productionAfter)) !==
      canonicalJson(plan.production_after) ||
    canonicalJson(summarize(coupledBefore)) !==
      canonicalJson(plan.coupled_before) ||
    canonicalJson(summarize(coupledAfter)) !==
      canonicalJson(plan.coupled_after) ||
    !productionBefore.missing_gates.includes("bounded_canary_required") ||
    !coupledBefore.missing_gates.includes("bounded_canary_required") ||
    !sameStrings(
      productionAfter.missing_gates,
      minusOne(productionBefore.missing_gates, "bounded_canary_required"),
    ) ||
    !sameStrings(
      coupledAfter.missing_gates,
      minusOne(coupledBefore.missing_gates, "bounded_canary_required"),
    )
  ) {
    fail("CANONICAL_APPLICATION_PLAN_CLASSIFIER_LINEAGE_MISMATCH");
  }

  const digest = sha256(Buffer.from(canonicalJson(planWithoutId(plan)), "utf8"));
  if (plan.application_plan_id !== "voidwcbcap1_" + digest) {
    fail("CANONICAL_APPLICATION_PLAN_ID_MISMATCH");
  }
  return plan;
}

function assertAncestor(ancestor, descendant, code) {
  try {
    execFileSync(
      GIT,
      ["-C", ROOT, "merge-base", "--is-ancestor", ancestor, descendant],
      {
        env: sanitizedGitEnv(),
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
  } catch {
    fail(code);
  }
}

function exactCandidateDelta(source, target, kind) {
  const reset = structuredClone(target);
  if (kind === "production") {
    if (
      source.bounded_canary_green !== false ||
      target.bounded_canary_green !== true ||
      source.coupled_activation_ready !== false ||
      target.coupled_activation_ready !== false ||
      source.status !== "hold" ||
      target.status !== "hold"
    ) {
      fail("CANONICAL_APPLICATION_PRODUCTION_DELTA_INVALID");
    }
    reset.bounded_canary_green = false;
  } else {
    if (
      source?.gates?.bounded_canary_green !== false ||
      target?.gates?.bounded_canary_green !== true ||
      source?.gates?.coupled_activation_ready !== false ||
      target?.gates?.coupled_activation_ready !== false ||
      source.status !== "HOLD" ||
      target.status !== "HOLD"
    ) {
      fail("CANONICAL_APPLICATION_COUPLED_DELTA_INVALID");
    }
    reset.gates.bounded_canary_green = false;
  }
  if (canonicalJson(reset) !== canonicalJson(source)) {
    fail("CANONICAL_APPLICATION_" + kind.toUpperCase() + "_CHANGE_SCOPE_INVALID");
  }
}

export function prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
  semanticPromotionBytes,
  semanticPromotionFileSha256,
  candidatePromotionReceiptBytes,
  candidatePromotionReceiptFileSha256,
} = {}) {
  const semantic = parseJsonBytes(
    semanticPromotionBytes,
    semanticPromotionFileSha256,
    "CANONICAL_APPLICATION_SEMANTIC_PROMOTION_FILE",
  );
  const reviewedReceipt = parseJsonBytes(
    candidatePromotionReceiptBytes,
    candidatePromotionReceiptFileSha256,
    "CANONICAL_APPLICATION_CANDIDATE_PROMOTION_RECEIPT_FILE",
  );

  const repository = headIdentity();
  const production = headFile(PRODUCTION_REL, "PRODUCTION_SOURCE");
  const coupled = headFile(COUPLED_REL, "COUPLED_SOURCE");
  const successor = headFile(SUCCESSOR_REL, "SUCCESSOR_SOURCE");

  const rederived = promoteWcVoidBoundedCanaryCandidatesV1({
    repository_head_sha: repository.head,
    repository_tree_sha: repository.tree,
    semantic_promotion_bytes: semantic.bytes,
    semantic_promotion_file_sha256: semantic.sha256,
    production_candidate_bytes: production.bytes,
    production_candidate_file_sha256: production.sha256,
    coupled_candidate_bytes: coupled.bytes,
    coupled_candidate_file_sha256: coupled.sha256,
    successor_candidate_bytes: successor.bytes,
    successor_candidate_file_sha256: successor.sha256,
  });

  if (canonicalJson(rederived) !== canonicalJson(reviewedReceipt.value)) {
    fail("CANONICAL_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH");
  }
  if (
    rederived.marker !== VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1 ||
    rederived.status !==
      "BOUNDED_CANARY_CANDIDATE_PROMOTION_READY_FINAL_ACTIVATION_HOLD" ||
    rederived.coupled_launch_id !== CURRENT_LAUNCH ||
    rederived.canonical_production_candidate_updated !== false ||
    rederived.canonical_coupled_candidate_updated !== false ||
    rederived.candidate_promotion_application_required !== true ||
    rederived.coupled_activation_ready !== false ||
    rederived.market_activation_authorized !== false ||
    rederived.public_presale_activation_authorized !== false ||
    rederived.funds_movement_authorized !== false
  ) {
    fail("CANONICAL_APPLICATION_REDERIVED_PROMOTION_INVALID");
  }
  exactAuthority(
    rederived.authority,
    VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
    "CANONICAL_APPLICATION_PROMOTION_AUTHORITY",
  );

  const targetProduction = rederived.promoted_production_candidate;
  const targetCoupled = rederived.promoted_coupled_candidate;
  exactCandidateDelta(production.value, targetProduction, "production");
  exactCandidateDelta(coupled.value, targetCoupled, "coupled");

  const productionBefore =
    classifyVoidWcVoidProductionReadinessV1(production.value);
  const productionAfter =
    classifyVoidWcVoidProductionReadinessV1(targetProduction);
  const coupledBefore =
    classifyVoidCoupledEconomicSuccessorGateV1(coupled.value, successor.value);
  const coupledAfter =
    classifyVoidCoupledEconomicSuccessorGateV1(targetCoupled, successor.value);

  const expectedProductionMissing = minusOne(
    productionBefore.missing_gates || [],
    "bounded_canary_required",
  );
  const expectedCoupledMissing = minusOne(
    coupledBefore.missing_gates || [],
    "bounded_canary_required",
  );
  if (
    productionBefore?.status !== "HOLD" ||
    productionAfter?.status !== "HOLD" ||
    coupledBefore?.status !== "HOLD" ||
    coupledAfter?.status !== "HOLD" ||
    !Array.isArray(productionBefore?.missing_gates) ||
    !Array.isArray(coupledBefore?.missing_gates) ||
    !productionBefore.missing_gates.includes("bounded_canary_required") ||
    !coupledBefore.missing_gates.includes("bounded_canary_required") ||
    !sameStrings(productionAfter.missing_gates, expectedProductionMissing) ||
    !sameStrings(coupledAfter.missing_gates, expectedCoupledMissing)
  ) {
    fail("CANONICAL_APPLICATION_CLASSIFIER_DELTA_INVALID");
  }

  const productionTargetBytes = prettyBytes(targetProduction);
  const coupledTargetBytes = prettyBytes(targetCoupled);
  const toolBlob = headBlob(
    TOOL_REL,
    "CANONICAL_APPLICATION_TOOL_BLOB_UNAVAILABLE",
  );
  const promotionToolBlob = headBlob(
    PROMOTION_TOOL_REL,
    "CANONICAL_APPLICATION_PROMOTION_TOOL_BLOB_UNAVAILABLE",
  );
  if (
    promotionToolBlob !== rederived.candidate_promotion_tool_git_blob_sha1
  ) {
    fail("CANONICAL_APPLICATION_PROMOTION_TOOL_BLOB_DRIFT");
  }

  const material = Object.freeze({
    marker: VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1,
    version: 1,
    status: "CANONICAL_BOUNDED_CANARY_APPLICATION_PREPARED",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: CURRENT_LAUNCH,
    candidate_promotion_id: rederived.promotion_id,
    candidate_promotion_receipt_file_sha256:
      reviewedReceipt.sha256,
    semantic_promotion_file_sha256: semantic.sha256,
    reviewed_promotion_repository_head_sha:
      rederived.repository_head_sha,
    reviewed_promotion_repository_tree_sha:
      rederived.repository_tree_sha,
    application_base_head_sha: repository.head,
    application_base_tree_sha: repository.tree,
    candidate_promotion_tool_git_blob_sha1: promotionToolBlob,
    canonical_application_tool_git_blob_sha1: toolBlob,
    production_candidate_path: PRODUCTION_REL,
    production_source_git_blob_sha1: production.blob_sha1,
    production_source_file_sha256: production.sha256,
    production_target_git_blob_sha1: gitBlobSha1(productionTargetBytes),
    production_target_file_sha256: sha256(productionTargetBytes),
    production_target_candidate: targetProduction,
    coupled_candidate_path: COUPLED_REL,
    coupled_source_git_blob_sha1: coupled.blob_sha1,
    coupled_source_file_sha256: coupled.sha256,
    coupled_target_git_blob_sha1: gitBlobSha1(coupledTargetBytes),
    coupled_target_file_sha256: sha256(coupledTargetBytes),
    coupled_target_candidate: targetCoupled,
    successor_candidate_path: SUCCESSOR_REL,
    successor_git_blob_sha1: successor.blob_sha1,
    successor_file_sha256: successor.sha256,
    production_before: summarize(productionBefore),
    production_after: summarize(productionAfter),
    coupled_before: summarize(coupledBefore),
    coupled_after: summarize(coupledAfter),
    removed_production_missing_gate: "bounded_canary_required",
    removed_coupled_missing_gate: "bounded_canary_required",
    bounded_canary_green: true,
    production_status_remains_hold: true,
    coupled_status_remains_hold: true,
    coupled_activation_ready: false,
    reviewed_git_commit_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const digest = sha256(Buffer.from(canonicalJson(material), "utf8"));
  return Object.freeze({
    ...material,
    application_plan_id: "voidwcbcap1_" + digest,
  });
}

export function verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
  plan,
  productionCandidate,
  coupledCandidate,
  successorCandidate,
} = {}) {
  const reviewed = validatePlan(plan);
  if (
    canonicalJson(productionCandidate) !==
      canonicalJson(reviewed.production_target_candidate)
  ) {
    fail("CANONICAL_APPLICATION_PRODUCTION_TARGET_NOT_APPLIED");
  }
  if (
    canonicalJson(coupledCandidate) !==
      canonicalJson(reviewed.coupled_target_candidate)
  ) {
    fail("CANONICAL_APPLICATION_COUPLED_TARGET_NOT_APPLIED");
  }

  const productionDecision =
    classifyVoidWcVoidProductionReadinessV1(productionCandidate);
  const coupledDecision =
    classifyVoidCoupledEconomicSuccessorGateV1(
      coupledCandidate,
      successorCandidate,
    );
  if (
    canonicalJson(summarize(productionDecision)) !==
      canonicalJson(reviewed.production_after) ||
    canonicalJson(summarize(coupledDecision)) !==
      canonicalJson(reviewed.coupled_after) ||
    productionCandidate.bounded_canary_green !== true ||
    productionCandidate.coupled_activation_ready !== false ||
    productionCandidate.status !== "hold" ||
    coupledCandidate?.gates?.bounded_canary_green !== true ||
    coupledCandidate?.gates?.coupled_activation_ready !== false ||
    coupledCandidate.status !== "HOLD"
  ) {
    fail("CANONICAL_APPLICATION_APPLIED_CLASSIFIER_STATE_INVALID");
  }
  return Object.freeze({
    production: summarize(productionDecision),
    coupled: summarize(coupledDecision),
  });
}

export function verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1({
  applicationPlanBytes,
  applicationPlanFileSha256,
} = {}) {
  const planSource = parseJsonBytes(
    applicationPlanBytes,
    applicationPlanFileSha256,
    "CANONICAL_APPLICATION_PLAN_FILE",
  );
  const plan = validatePlan(planSource.value);
  const repository = headIdentity();
  assertAncestor(
    plan.application_base_head_sha,
    repository.head,
    "CANONICAL_APPLICATION_BASE_NOT_ANCESTOR_OF_APPLIED_HEAD",
  );

  if (
    headBlob(
      TOOL_REL,
      "CANONICAL_APPLICATION_CURRENT_TOOL_BLOB_UNAVAILABLE",
    ) !== plan.canonical_application_tool_git_blob_sha1 ||
    headBlob(
      PROMOTION_TOOL_REL,
      "CANONICAL_APPLICATION_CURRENT_PROMOTION_TOOL_BLOB_UNAVAILABLE",
    ) !== plan.candidate_promotion_tool_git_blob_sha1
  ) {
    fail("CANONICAL_APPLICATION_SOURCE_TOOL_DRIFT");
  }

  const production = headFile(PRODUCTION_REL, "APPLIED_PRODUCTION");
  const coupled = headFile(COUPLED_REL, "APPLIED_COUPLED");
  const successor = headFile(SUCCESSOR_REL, "APPLIED_SUCCESSOR");

  if (
    production.blob_sha1 !== plan.production_target_git_blob_sha1 ||
    production.sha256 !== plan.production_target_file_sha256 ||
    coupled.blob_sha1 !== plan.coupled_target_git_blob_sha1 ||
    coupled.sha256 !== plan.coupled_target_file_sha256 ||
    successor.blob_sha1 !== plan.successor_git_blob_sha1 ||
    successor.sha256 !== plan.successor_file_sha256
  ) {
    fail("CANONICAL_APPLICATION_APPLIED_SOURCE_IDENTITY_MISMATCH");
  }

  const decisions =
    verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
      plan,
      productionCandidate: production.value,
      coupledCandidate: coupled.value,
      successorCandidate: successor.value,
    });

  const material = Object.freeze({
    marker: VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1,
    version: 1,
    status:
      "CANONICAL_BOUNDED_CANARY_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: CURRENT_LAUNCH,
    application_plan_id: plan.application_plan_id,
    application_plan_file_sha256: planSource.sha256,
    candidate_promotion_id: plan.candidate_promotion_id,
    candidate_promotion_receipt_file_sha256:
      plan.candidate_promotion_receipt_file_sha256,
    semantic_promotion_file_sha256:
      plan.semantic_promotion_file_sha256,
    application_base_head_sha: plan.application_base_head_sha,
    applied_repository_head_sha: repository.head,
    applied_repository_tree_sha: repository.tree,
    production_candidate_git_blob_sha1: production.blob_sha1,
    production_candidate_file_sha256: production.sha256,
    coupled_candidate_git_blob_sha1: coupled.blob_sha1,
    coupled_candidate_file_sha256: coupled.sha256,
    successor_candidate_git_blob_sha1: successor.blob_sha1,
    production_after: decisions.production,
    coupled_after: decisions.coupled,
    bounded_canary_green: true,
    coupled_activation_ready: false,
    production_status_remains_hold: true,
    coupled_status_remains_hold: true,
    exact_two_gate_source_application_verified: true,
    final_coupled_activation_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
  });
  const digest = sha256(Buffer.from(canonicalJson(material), "utf8"));
  return Object.freeze({
    ...material,
    application_id: "voidwbcaa1_" + digest,
  });
}

function readStableFile(file, expectedSha, label) {
  if (
    typeof file !== "string" ||
    !path.isAbsolute(file) ||
    path.resolve(file) !== file
  ) {
    fail(label + "_PATH_INVALID");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.size < 2 || before.size > MAX_BYTES) {
      fail(label + "_SIZE_INVALID");
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
      if (count <= 0) fail(label + "_SHORT_READ");
      offset += count;
    }
    const after = fs.fstatSync(fd);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      fail(label + "_CHANGED_DURING_READ");
    }
    if (typeof expectedSha !== "string" || !HEX64.test(expectedSha)) {
      fail(label + "_SHA256_INVALID");
    }
    if (sha256(bytes) !== expectedSha) fail(label + "_SHA256_MISMATCH");
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function usage() {
  console.log(
    "prepare --semantic /absolute/semantic.json --semantic-sha256 <64hex> " +
      "--promotion /absolute/promotion.json --promotion-sha256 <64hex>",
  );
  console.log(
    "verify-applied --plan /absolute/application-plan.json " +
      "--plan-sha256 <64hex>",
  );
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      semantic: { type: "string" },
      "semantic-sha256": { type: "string" },
      promotion: { type: "string" },
      "promotion-sha256": { type: "string" },
      plan: { type: "string" },
      "plan-sha256": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  const command = positionals[0] || "";
  if (values.help || command === "help") {
    usage();
    return;
  }
  if (command === "prepare") {
    if (
      !values.semantic ||
      !values["semantic-sha256"] ||
      !values.promotion ||
      !values["promotion-sha256"]
    ) {
      fail("CANONICAL_APPLICATION_PREPARE_ARGUMENTS_MISSING");
    }
    const semanticBytes = readStableFile(
      values.semantic,
      values["semantic-sha256"],
      "CANONICAL_APPLICATION_SEMANTIC_FILE",
    );
    const promotionBytes = readStableFile(
      values.promotion,
      values["promotion-sha256"],
      "CANONICAL_APPLICATION_PROMOTION_FILE",
    );
    const plan = prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      semanticPromotionBytes: semanticBytes,
      semanticPromotionFileSha256: values["semantic-sha256"],
      candidatePromotionReceiptBytes: promotionBytes,
      candidatePromotionReceiptFileSha256: values["promotion-sha256"],
    });
    process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
    return;
  }
  if (command === "verify-applied") {
    if (!values.plan || !values["plan-sha256"]) {
      fail("CANONICAL_APPLICATION_VERIFY_ARGUMENTS_MISSING");
    }
    const planBytes = readStableFile(
      values.plan,
      values["plan-sha256"],
      "CANONICAL_APPLICATION_PLAN",
    );
    const receipt = verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      applicationPlanBytes: planBytes,
      applicationPlanFileSha256: values["plan-sha256"],
    });
    process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
    return;
  }
  usage();
  fail("CANONICAL_APPLICATION_COMMAND_INVALID");
}

const direct =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error("VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1_HOLD");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
