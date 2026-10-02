#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  buildProductionEpoch2RpcSelectedDescriptorV1,
} from "./void-production-epoch2-rpc-target-promotion-compiler-v1.mjs";
import {
  loadProductionEpoch2RpcTargetV1,
} from "./void-production-epoch2-rpc-target-v1.mjs";

export const VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1";
export const VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1";

const VERIFIED_SOURCE_CAPABILITY = Symbol(
  "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_VERIFIED_SOURCE_V1",
);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const CANONICAL_REMOTE = "https://github.com/6ZoSo9/void-node.git";
const ORIGINS = new Set([
  "https://github.com/6ZoSo9/void-node",
  "https://github.com/6ZoSo9/void-node.git",
  "git@github.com:6ZoSo9/void-node.git",
  "ssh://git@github.com/6ZoSo9/void-node.git",
]);
const SHA40 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;

const AUTHORITY = Object.freeze({
  source_evidence_admission_only: true,
  canonical_target_write: false,
  repository_write: false,
  branch_create: false,
  git_push: false,
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
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (plain(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonical(value[key]),
    ).join(",") + "}";
  }
  fail("production_epoch2_rpc_apply_admission_canonical_value_invalid");
}
function requireSha(value, code) {
  const text = String(value || "");
  if (!SHA256.test(text)) fail(code);
  return text;
}
function parsePinnedBytes(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes)) fail(label + "_bytes_required");
  requireSha(expectedSha, label + "_sha256_invalid");
  if (sha256(bytes) !== expectedSha) fail(label + "_sha256_mismatch");
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail(label + "_json_invalid");
  }
  if (!plain(value)) fail(label + "_object_required");
  return value;
}
function exactPrettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}
function gitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_ATTR_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/bin/false",
  };
}
function gitText(args, code, { cwd = ROOT } = {}) {
  const result = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-c", "core.hooksPath=/dev/null",
      "-c", "core.attributesFile=/dev/null",
      "-c", "core.fsmonitor=false",
      "-c", "core.untrackedCache=false",
      "-c", "submodule.recurse=false",
      ...(cwd === ROOT ? ["-C", ROOT] : []),
      ...args,
    ],
    {
      cwd,
      env: gitEnv(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
      timeout: 30_000,
    },
  );
  if (result.error || result.status !== 0) fail(code);
  return String(result.stdout || "").trim();
}
function gitAncestor(ancestor, descendant) {
  if (!SHA40.test(String(ancestor || "")) || !SHA40.test(String(descendant || ""))) {
    return false;
  }
  const result = spawnSync(
    GIT,
    [
      "--no-replace-objects",
      "-c", "core.hooksPath=/dev/null",
      "-c", "core.attributesFile=/dev/null",
      "-c", "core.fsmonitor=false",
      "-c", "core.untrackedCache=false",
      "-c", "submodule.recurse=false",
      "-C", ROOT,
      "merge-base", "--is-ancestor", ancestor, descendant,
    ],
    {
      cwd: ROOT,
      env: gitEnv(),
      stdio: ["ignore", "ignore", "ignore"],
      timeout: 30_000,
    },
  );
  return !result.error && result.status === 0;
}
function verifiedRepoIdentity() {
  if (
    gitText(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "production_epoch2_rpc_apply_admission_repo_status_unavailable",
    ) !== ""
  ) {
    fail("production_epoch2_rpc_apply_admission_repo_dirty");
  }
  const branch = gitText(
    ["branch", "--show-current"],
    "production_epoch2_rpc_apply_admission_branch_unavailable",
  );
  if (branch !== "main") fail("production_epoch2_rpc_apply_admission_main_required");
  const head = gitText(
    ["rev-parse", "HEAD"],
    "production_epoch2_rpc_apply_admission_head_unavailable",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "production_epoch2_rpc_apply_admission_tree_unavailable",
  );
  const origin = gitText(
    ["config", "--local", "--no-includes", "--get", "remote.origin.url"],
    "production_epoch2_rpc_apply_admission_origin_unavailable",
  );
  if (!ORIGINS.has(origin)) {
    fail("production_epoch2_rpc_apply_admission_canonical_origin_required");
  }
  const remote = gitText(
    [
      "-c", "http.sslVerify=true",
      "ls-remote", "--heads", CANONICAL_REMOTE, "refs/heads/main",
    ],
    "production_epoch2_rpc_apply_admission_remote_main_unavailable",
    { cwd: "/" },
  );
  const match = remote.match(/^([0-9a-f]{40})\s+refs\/heads\/main$/u);
  if (!match || match[1] !== head) {
    fail("production_epoch2_rpc_apply_admission_remote_main_mismatch");
  }
  return Object.freeze({
    branch,
    head,
    tree,
    canonical_remote_url: CANONICAL_REMOTE,
    remote_main_sha: match[1],
    canonical_main_live_match: true,
  });
}
function collectLineageCommits(activationPlan, observation) {
  const commits = new Set();
  for (const value of [
    observation?.source_binding?.head,
    observation?.reviewed_semantic_execution?.activation_source_head_sha,
    activationPlan?.start_admission_observed_repo_head,
  ]) {
    if (SHA40.test(String(value || ""))) commits.add(String(value));
  }
  for (const row of activationPlan?.install_receipts || []) {
    const value =
      row?.install_receipt_observed_repo_head ??
      row?.installed_repo_head;
    if (!SHA40.test(String(value || ""))) {
      fail("production_epoch2_rpc_apply_admission_install_lineage_invalid");
    }
    commits.add(String(value));
  }
  if (commits.size < 3) {
    fail("production_epoch2_rpc_apply_admission_lineage_incomplete");
  }
  return [...commits].sort();
}
function validateLineageAncestors(commits, currentHead) {
  for (const commit of commits) {
    if (!gitAncestor(commit, currentHead)) {
      fail("production_epoch2_rpc_apply_admission_nonancestor:" + commit);
    }
  }
  return Object.freeze([...commits]);
}

function buildAdmissionCoreV1(input, capability = null) {
  if (!plain(input)) fail("production_epoch2_rpc_apply_admission_input_invalid");

  const candidateSha = requireSha(
    input.candidate_file_sha256,
    "production_epoch2_rpc_apply_admission_candidate_sha_invalid",
  );
  const candidate = parsePinnedBytes(
    input.candidate_bytes,
    candidateSha,
    "production_epoch2_rpc_apply_admission_candidate",
  );

  const compiled = buildProductionEpoch2RpcSelectedDescriptorV1({
    hold_target: input.hold_target,
    activation_plan_bytes: input.activation_plan_bytes,
    activation_plan_file_sha256: input.activation_plan_file_sha256,
    activation_receipt_bytes: input.activation_receipt_bytes,
    activation_receipt_file_sha256: input.activation_receipt_file_sha256,
    runtime_observation_bytes: input.runtime_observation_bytes,
    runtime_observation_file_sha256: input.runtime_observation_file_sha256,
  });

  const expectedCandidateBytes = exactPrettyBytes(compiled.candidate);
  if (
    sha256(expectedCandidateBytes) !== candidateSha ||
    canonical(candidate) !== canonical(compiled.candidate)
  ) {
    fail("production_epoch2_rpc_apply_admission_candidate_recompile_mismatch");
  }

  const activationPlan = parsePinnedBytes(
    input.activation_plan_bytes,
    input.activation_plan_file_sha256,
    "production_epoch2_rpc_apply_admission_activation_plan",
  );
  const observation = parsePinnedBytes(
    input.runtime_observation_bytes,
    input.runtime_observation_file_sha256,
    "production_epoch2_rpc_apply_admission_runtime_observation",
  );

  const sourceVerified = capability === VERIFIED_SOURCE_CAPABILITY;
  const source = input.current_source;
  if (
    !plain(source) ||
    !SHA40.test(String(source.head || "")) ||
    !SHA40.test(String(source.tree || "")) ||
    source.branch !== "main" ||
    source.remote_main_sha !== source.head ||
    source.canonical_remote_url !== CANONICAL_REMOTE ||
    source.canonical_main_live_match !== true
  ) {
    fail("production_epoch2_rpc_apply_admission_source_invalid");
  }

  const lineageCommits = Array.isArray(input.lineage_ancestor_commits)
    ? [...input.lineage_ancestor_commits]
    : [];
  if (
    !sourceVerified ||
    lineageCommits.length < 3 ||
    lineageCommits.some((value) => !SHA40.test(String(value || "")))
  ) {
    const previewMaterial = Object.freeze({
      marker:
        VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1,
      version: 1,
      status: "PROMOTION_APPLY_ADMISSION_PREVIEW_NOT_SOURCE_VERIFIED",
      candidate_sha256: candidateSha,
      current_source: Object.freeze({ ...source }),
      evidence: Object.freeze({ ...compiled.evidence }),
      source_lineage_ancestor_current_main: false,
      canonical_target_write: false,
      authority: AUTHORITY,
    });
    return Object.freeze({
      ...previewMaterial,
      preview_id:
        "voidpe2rpctapplypreview1_" +
        sha256(Buffer.from(canonical(previewMaterial), "utf8")),
    });
  }

  const material = Object.freeze({
    marker: VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1,
    version: 1,
    status: "PROMOTION_APPLY_ADMISSION_ACCEPTED",
    chain_id: 2050,
    execution_epoch: 2,
    selected_rpc_url: compiled.candidate.selection.rpc_url,
    candidate_sha256: candidateSha,
    current_source: Object.freeze({ ...source }),
    observation_source: Object.freeze({
      observed_main_head: observation.source_binding.head,
      observed_source_tree: observation.source_binding.tree,
      activation_source_head:
        observation.reviewed_semantic_execution.activation_source_head_sha,
    }),
    source_lineage_ancestor_commits: Object.freeze([...lineageCommits]),
    source_lineage_ancestor_current_main: true,
    evidence: Object.freeze({
      ...compiled.evidence,
      activation_plan_file_sha256: input.activation_plan_file_sha256,
      activation_receipt_file_sha256: input.activation_receipt_file_sha256,
      runtime_observation_file_sha256: input.runtime_observation_file_sha256,
    }),
    selection: Object.freeze({ ...compiled.candidate.selection }),
    canonical_target_write: false,
    authority: AUTHORITY,
    next_gate:
      "materialize_reviewable_source_promotion_packet_then_separately_merge_selected_target",
  });

  return Object.freeze({
    ...material,
    promotion_admission_id:
      "voidpe2rpctapply1_" +
      sha256(Buffer.from(canonical(material), "utf8")),
  });
}

export function buildProductionEpoch2RpcTargetPromotionApplyAdmissionPreviewV1(
  input,
) {
  return buildAdmissionCoreV1(input);
}

function buildVerifiedAdmissionV1(input) {
  return buildAdmissionCoreV1(input, VERIFIED_SOURCE_CAPABILITY);
}

function writePrivateOutsideRepository(output, value) {
  const absolute = path.resolve(output);
  const rootReal = fs.realpathSync(ROOT);
  const parent = path.dirname(absolute);
  const parentReal = fs.realpathSync(parent);
  if (
    parentReal === rootReal ||
    parentReal.startsWith(rootReal + path.sep)
  ) {
    fail("production_epoch2_rpc_apply_admission_output_inside_repo_forbidden");
  }
  const physical = path.join(parentReal, path.basename(absolute));
  const bytes = exactPrettyBytes(value);
  const fd = fs.openSync(
    physical,
    fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return Object.freeze({ path: physical, sha256: sha256(bytes) });
}

async function main() {
  const { values } = parseArgs({
    options: {
      candidate: { type: "string" },
      "candidate-sha256": { type: "string" },
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
    "candidate",
    "candidate-sha256",
    "activation-plan",
    "activation-plan-sha256",
    "activation-receipt",
    "activation-receipt-sha256",
    "runtime-observation",
    "runtime-observation-sha256",
    "output",
  ]) {
    if (!values[key]) fail("production_epoch2_rpc_apply_admission_argument_missing:" + key);
  }

  const currentSource = verifiedRepoIdentity();
  const candidateBytes = fs.readFileSync(path.resolve(values.candidate));
  const activationPlanBytes =
    fs.readFileSync(path.resolve(values["activation-plan"]));
  const activationReceiptBytes =
    fs.readFileSync(path.resolve(values["activation-receipt"]));
  const observationBytes =
    fs.readFileSync(path.resolve(values["runtime-observation"]));

  const activationPlan = parsePinnedBytes(
    activationPlanBytes,
    values["activation-plan-sha256"],
    "production_epoch2_rpc_apply_admission_activation_plan",
  );
  const observation = parsePinnedBytes(
    observationBytes,
    values["runtime-observation-sha256"],
    "production_epoch2_rpc_apply_admission_runtime_observation",
  );
  const lineage = validateLineageAncestors(
    collectLineageCommits(activationPlan, observation),
    currentSource.head,
  );

  const { value: holdTarget } = loadProductionEpoch2RpcTargetV1();
  const admission = buildVerifiedAdmissionV1({
    hold_target: holdTarget,
    candidate_bytes: candidateBytes,
    candidate_file_sha256: values["candidate-sha256"],
    activation_plan_bytes: activationPlanBytes,
    activation_plan_file_sha256: values["activation-plan-sha256"],
    activation_receipt_bytes: activationReceiptBytes,
    activation_receipt_file_sha256: values["activation-receipt-sha256"],
    runtime_observation_bytes: observationBytes,
    runtime_observation_file_sha256: values["runtime-observation-sha256"],
    current_source: currentSource,
    lineage_ancestor_commits: lineage,
  });

  if (
    admission.marker !==
      VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1 ||
    admission.status !== "PROMOTION_APPLY_ADMISSION_ACCEPTED" ||
    admission.source_lineage_ancestor_current_main !== true
  ) {
    fail("production_epoch2_rpc_apply_admission_verified_source_required");
  }

  const sourceAfterValidation = verifiedRepoIdentity();
  if (canonical(sourceAfterValidation) !== canonical(currentSource)) {
    fail("production_epoch2_rpc_apply_admission_source_generation_moved");
  }

  const written = writePrivateOutsideRepository(values.output, admission);
  let sourceAfterWrite;
  try {
    sourceAfterWrite = verifiedRepoIdentity();
  } catch (error) {
    fs.rmSync(written.path, { force: true });
    throw error;
  }
  if (canonical(sourceAfterWrite) !== canonical(currentSource)) {
    fs.rmSync(written.path, { force: true });
    fail("production_epoch2_rpc_apply_admission_source_generation_moved");
  }

  console.log(VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1);
  console.log("status=" + admission.status);
  console.log("promotion_admission_id=" + admission.promotion_admission_id);
  console.log("candidate_sha256=" + admission.candidate_sha256);
  console.log("current_main_head=" + admission.current_source.head);
  console.log("source_lineage_ancestor_current_main=true");
  console.log("canonical_target_write=false");
  console.log("repository_write=false");
  console.log("rpc_call=false");
  console.log("service_action=false");
  console.log("docker_mutation=false");
  console.log("transaction_broadcast=false");
  console.log("migration_authorized=false");
  console.log("funds_movement=false");
  console.log("output_sha256=" + written.sha256);
  console.log("output=" + written.path);
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(
      "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}
