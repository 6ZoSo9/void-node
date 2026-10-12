#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildProductionEpoch2RpcSelectedDescriptorV1,
} from "./void-production-epoch2-rpc-target-promotion-compiler-v1.mjs";
import {
  VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1,
  buildProductionEpoch2RpcTargetPromotionApplyAdmissionPreviewV1,
} from "./void-production-epoch2-rpc-target-promotion-apply-admission-v1.mjs";

export const VOID_PRODUCTION_EPOCH2_RPC_SELECTION_EVIDENCE_VERIFIER_V1 =
  "VOID_PRODUCTION_EPOCH2_RPC_SELECTION_EVIDENCE_VERIFIER_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT = "/usr/bin/git";
const SHA40 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TARGET_REL = "ops/mainnet0/production-epoch2-rpc-target-v1.json";
const REVIEWED_ENTRY_REL =
  "tools/void-production-epoch2-rpc-selection-evidence-verifier-v1.mjs";
const REQUIRED_REVIEWED_MODULES = Object.freeze([
  REVIEWED_ENTRY_REL,
  "tools/void-production-epoch2-rpc-target-v1.mjs",
  "tools/void-production-epoch2-rpc-target-promotion-compiler-v1.mjs",
  "tools/void-production-epoch2-rpc-target-promotion-apply-admission-v1.mjs",
  "tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs",
]);
const EVIDENCE_DIR =
  "ops/mainnet0/evidence/production-epoch2-rpc-selection-v1";

export const SELECTION_EVIDENCE_PACKET_V1 = Object.freeze({
  activation_plan: Object.freeze({
    path: EVIDENCE_DIR + "/activation-plan.json",
    sha256:
      "86128119c45197b04dd127986349c42c971a4287739864f44a50c0e6dc386a7f",
  }),
  activation_receipt: Object.freeze({
    path: EVIDENCE_DIR + "/activation-receipt.json",
    sha256:
      "1a9837b42bf20439d939f54ca8bd9c3a81d91d7a8cf83ddd54f58929fc2f5e13",
  }),
  runtime_observation: Object.freeze({
    path: EVIDENCE_DIR + "/runtime-observation.json",
    sha256:
      "cd1630a9742b49f55e6bfed2b4c0344e4b7a994307f8945f1e5404d2eb681d32",
  }),
  selected_candidate: Object.freeze({
    path: EVIDENCE_DIR + "/selected-candidate.json",
    sha256:
      "305ed03eebe49b992db76c21ffd8930e9b6d07ed4a97984cf0e48f33a9df63dd",
  }),
  promotion_apply_admission: Object.freeze({
    path: EVIDENCE_DIR + "/promotion-apply-admission.json",
    sha256:
      "ad5aa3b0a99e967207ff63c3040d3b9786e3f1345769298c25a19eed20477ac5",
  }),
});

const EXPECTED_ADMISSION_AUTHORITY = Object.freeze({
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
  fail("production_epoch2_selection_evidence_canonical_value_invalid");
}
function exactKeys(value, keys, label) {
  if (!plain(value)) fail(label + "_object_required");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(label + "_keys_invalid");
  }
}
function parsePinned(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes)) fail(label + "_bytes_required");
  if (!SHA256.test(expectedSha)) fail(label + "_sha256_invalid");
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
function holdFromSelected(candidate) {
  const hold = structuredClone(candidate);
  hold.status = "HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED";
  hold.selection = {
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
  hold.next_gate =
    "observe_and_select_one_real_long_lived_production_epoch2_rpc_runtime";
  return hold;
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
function gitText(args, code) {
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
      ...args,
    ],
    {
      cwd: ROOT,
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
function gitBytes(args, code) {
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
      ...args,
    ],
    {
      cwd: ROOT,
      env: gitEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
      timeout: 30_000,
    },
  );
  if (result.error || result.status !== 0) fail(code);
  return Buffer.from(result.stdout || Buffer.alloc(0));
}
function worktreeRegularBytes(rel, code) {
  const absolute = path.resolve(ROOT, rel);
  if (!absolute.startsWith(ROOT + path.sep)) fail(code + "_outside_repo");
  let st;
  try {
    st = fs.lstatSync(absolute);
  } catch {
    fail(code + "_missing");
  }
  if (st.isSymbolicLink() || !st.isFile()) fail(code + "_not_regular");
  if (fs.realpathSync(absolute) !== absolute) fail(code + "_not_canonical");
  if (st.size < 1 || st.size > 4 * 1024 * 1024) fail(code + "_size_invalid");
  return fs.readFileSync(absolute);
}
function importSpecifiers(source) {
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
function resolveRelativeModule(fromRel, spec) {
  const rel = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromRel), spec),
  );
  if (
    rel.startsWith("../") ||
    rel.startsWith("/") ||
    rel.includes("\\0")
  ) {
    fail("production_epoch2_selection_reviewed_import_outside_repo");
  }
  return rel;
}
export function verifyReviewedSelectionEvidenceExecutionClosureV1() {
  const shallow = gitText(
    ["rev-parse", "--is-shallow-repository"],
    "production_epoch2_selection_reviewed_repo_shape_unavailable",
  );
  if (shallow !== "false") {
    fail("production_epoch2_selection_reviewed_repo_must_be_non_shallow");
  }
  const head = gitText(
    ["rev-parse", "HEAD"],
    "production_epoch2_selection_reviewed_head_unavailable",
  );
  if (!SHA40.test(head)) fail("production_epoch2_selection_reviewed_head_invalid");

  const queue = [REVIEWED_ENTRY_REL];
  const seen = new Set();
  while (queue.length > 0) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);

    const worktree = worktreeRegularBytes(
      rel,
      "production_epoch2_selection_reviewed_module",
    );
    const reviewed = gitBytes(
      ["show", "HEAD:" + rel],
      "production_epoch2_selection_reviewed_git_object_unavailable",
    );
    if (!worktree.equals(reviewed)) {
      fail("production_epoch2_selection_reviewed_module_bytes_mismatch:" + rel);
    }

    if (!/\.(?:mjs|js|cjs)$/u.test(rel)) continue;
    const source = worktree.toString("utf8");
    for (const spec of importSpecifiers(source)) {
      if (spec.startsWith(".")) {
        queue.push(resolveRelativeModule(rel, spec));
        continue;
      }
      if (!spec.startsWith("node:")) {
        fail(
          "production_epoch2_selection_reviewed_bare_package_runtime_forbidden:" +
          spec,
        );
      }
    }
  }

  for (const required of REQUIRED_REVIEWED_MODULES) {
    if (!seen.has(required)) {
      fail("production_epoch2_selection_reviewed_module_missing:" + required);
    }
  }

  return Object.freeze({
    head,
    module_paths: Object.freeze([...seen].sort()),
    module_count: seen.size,
    non_shallow_repository: true,
    exact_head_git_object_bytes: true,
    bare_package_runtime_absent: true,
  });
}

function gitAncestor(ancestor, descendant, code) {
  if (!SHA40.test(String(ancestor || "")) ||
      !SHA40.test(String(descendant || ""))) {
    fail(code + "_shape_invalid");
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
  if (result.error || result.status !== 0) fail(code);
}
function gitTree(commit, code) {
  return gitText(["rev-parse", commit + "^{tree}"], code);
}
function expectedLineage(plan, observation) {
  const commits = new Set([
    String(plan.start_admission_observed_repo_head || ""),
    String(observation.source_binding?.head || ""),
    String(
      observation.reviewed_semantic_execution?.activation_source_head_sha || "",
    ),
  ]);
  for (const row of plan.install_receipts || []) {
    commits.add(String(row?.installed_repo_head || ""));
  }
  const values = [...commits].sort();
  if (values.length < 3 || values.some((value) => !SHA40.test(value))) {
    fail("production_epoch2_selection_evidence_lineage_incomplete");
  }
  return values;
}

export function verifyProductionEpoch2RpcSelectionEvidencePacketV1(input) {
  if (!plain(input)) fail("production_epoch2_selection_evidence_input_invalid");
  const reviewedExecution =
    verifyReviewedSelectionEvidenceExecutionClosureV1();

  const targetBytes = input.target_bytes;
  const candidateBytes = input.selected_candidate_bytes;
  const planBytes = input.activation_plan_bytes;
  const receiptBytes = input.activation_receipt_bytes;
  const observationBytes = input.runtime_observation_bytes;
  const admissionBytes = input.promotion_apply_admission_bytes;

  const target = parsePinned(
    targetBytes,
    SELECTION_EVIDENCE_PACKET_V1.selected_candidate.sha256,
    "production_epoch2_selection_target",
  );
  const candidate = parsePinned(
    candidateBytes,
    SELECTION_EVIDENCE_PACKET_V1.selected_candidate.sha256,
    "production_epoch2_selection_selected_candidate",
  );
  const plan = parsePinned(
    planBytes,
    SELECTION_EVIDENCE_PACKET_V1.activation_plan.sha256,
    "production_epoch2_selection_activation_plan",
  );
  const receipt = parsePinned(
    receiptBytes,
    SELECTION_EVIDENCE_PACKET_V1.activation_receipt.sha256,
    "production_epoch2_selection_activation_receipt",
  );
  const observation = parsePinned(
    observationBytes,
    SELECTION_EVIDENCE_PACKET_V1.runtime_observation.sha256,
    "production_epoch2_selection_runtime_observation",
  );
  const admission = parsePinned(
    admissionBytes,
    SELECTION_EVIDENCE_PACKET_V1.promotion_apply_admission.sha256,
    "production_epoch2_selection_promotion_apply_admission",
  );

  if (!candidateBytes.equals(targetBytes) ||
      canonical(candidate) !== canonical(target)) {
    fail("production_epoch2_selection_candidate_target_mismatch");
  }

  const holdTarget = holdFromSelected(candidate);
  const compiled = buildProductionEpoch2RpcSelectedDescriptorV1({
    hold_target: holdTarget,
    activation_plan_bytes: planBytes,
    activation_plan_file_sha256:
      SELECTION_EVIDENCE_PACKET_V1.activation_plan.sha256,
    activation_receipt_bytes: receiptBytes,
    activation_receipt_file_sha256:
      SELECTION_EVIDENCE_PACKET_V1.activation_receipt.sha256,
    runtime_observation_bytes: observationBytes,
    runtime_observation_file_sha256:
      SELECTION_EVIDENCE_PACKET_V1.runtime_observation.sha256,
  });

  if (!exactPrettyBytes(compiled.candidate).equals(candidateBytes) ||
      canonical(compiled.candidate) !== canonical(candidate)) {
    fail("production_epoch2_selection_candidate_recompile_mismatch");
  }

  const admissionPreview =
    buildProductionEpoch2RpcTargetPromotionApplyAdmissionPreviewV1({
      hold_target: holdTarget,
      candidate_bytes: candidateBytes,
      candidate_file_sha256:
        SELECTION_EVIDENCE_PACKET_V1.selected_candidate.sha256,
      activation_plan_bytes: planBytes,
      activation_plan_file_sha256:
        SELECTION_EVIDENCE_PACKET_V1.activation_plan.sha256,
      activation_receipt_bytes: receiptBytes,
      activation_receipt_file_sha256:
        SELECTION_EVIDENCE_PACKET_V1.activation_receipt.sha256,
      runtime_observation_bytes: observationBytes,
      runtime_observation_file_sha256:
        SELECTION_EVIDENCE_PACKET_V1.runtime_observation.sha256,
      current_source: admission.current_source,
      lineage_ancestor_commits: admission.source_lineage_ancestor_commits,
    });
  if (
    admissionPreview.marker !==
      VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_PREVIEW_V1 ||
    admissionPreview.status !==
      "PROMOTION_APPLY_ADMISSION_PREVIEW_NOT_SOURCE_VERIFIED" ||
    admissionPreview.candidate_sha256 !==
      SELECTION_EVIDENCE_PACKET_V1.selected_candidate.sha256 ||
    canonical(admissionPreview.evidence) !== canonical(compiled.evidence)
  ) {
    fail("production_epoch2_selection_admission_input_revalidation_mismatch");
  }

  exactKeys(
    admission,
    [
      "marker", "version", "status", "chain_id", "execution_epoch",
      "selected_rpc_url", "candidate_sha256", "current_source",
      "observation_source", "source_lineage_ancestor_commits",
      "source_lineage_ancestor_current_main", "evidence", "selection",
      "canonical_target_write", "authority", "next_gate",
      "promotion_admission_id",
    ],
    "production_epoch2_selection_admission",
  );
  exactKeys(
    admission.current_source,
    [
      "branch", "head", "tree", "canonical_remote_url", "remote_main_sha",
      "canonical_main_live_match",
    ],
    "production_epoch2_selection_admission_current_source",
  );
  exactKeys(
    admission.observation_source,
    ["observed_main_head", "observed_source_tree", "activation_source_head"],
    "production_epoch2_selection_admission_observation_source",
  );
  exactKeys(
    admission.authority,
    Object.keys(EXPECTED_ADMISSION_AUTHORITY),
    "production_epoch2_selection_admission_authority",
  );

  const expectedObservationSource = {
    observed_main_head: observation.source_binding?.head,
    observed_source_tree: observation.source_binding?.tree,
    activation_source_head:
      observation.reviewed_semantic_execution?.activation_source_head_sha,
  };
  const lineage = expectedLineage(plan, observation);

  if (
    admission.marker !==
      "VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1" ||
    admission.version !== 1 ||
    admission.status !== "PROMOTION_APPLY_ADMISSION_ACCEPTED" ||
    admission.chain_id !== 2050 ||
    admission.execution_epoch !== 2 ||
    admission.selected_rpc_url !== compiled.candidate.selection.rpc_url ||
    admission.candidate_sha256 !==
      SELECTION_EVIDENCE_PACKET_V1.selected_candidate.sha256 ||
    canonical(admission.observation_source) !==
      canonical(expectedObservationSource) ||
    canonical(admission.source_lineage_ancestor_commits) !==
      canonical(lineage) ||
    admission.source_lineage_ancestor_current_main !== true ||
    canonical(admission.evidence) !== canonical(compiled.evidence) ||
    canonical(admission.selection) !==
      canonical(compiled.candidate.selection) ||
    admission.canonical_target_write !== false ||
    canonical(admission.authority) !==
      canonical(EXPECTED_ADMISSION_AUTHORITY) ||
    admission.next_gate !==
      "materialize_reviewable_source_promotion_packet_then_separately_merge_selected_target"
  ) {
    fail("production_epoch2_selection_admission_semantics_mismatch");
  }

  const source = admission.current_source;
  if (
    source.branch !== "main" ||
    !SHA40.test(String(source.head || "")) ||
    !SHA40.test(String(source.tree || "")) ||
    source.canonical_remote_url !== "https://github.com/6ZoSo9/void-node.git" ||
    source.remote_main_sha !== source.head ||
    source.canonical_main_live_match !== true ||
    gitTree(
      source.head,
      "production_epoch2_selection_admission_source_tree_unavailable",
    ) !== source.tree
  ) {
    fail("production_epoch2_selection_admission_source_binding_mismatch");
  }

  const currentHead = gitText(
    ["rev-parse", "HEAD"],
    "production_epoch2_selection_current_head_unavailable",
  );
  if (!SHA40.test(currentHead)) {
    fail("production_epoch2_selection_current_head_invalid");
  }
  gitAncestor(
    source.head,
    currentHead,
    "production_epoch2_selection_admission_source_not_ancestor_current_head",
  );

  if (
    gitTree(
      observation.source_binding.head,
      "production_epoch2_selection_observation_source_tree_unavailable",
    ) !== observation.source_binding.tree ||
    gitTree(
      observation.reviewed_semantic_execution.activation_source_head_sha,
      "production_epoch2_selection_activation_source_tree_unavailable",
    ) !== observation.reviewed_semantic_execution.activation_source_tree_sha
  ) {
    fail("production_epoch2_selection_historical_tree_mismatch");
  }
  for (const commit of lineage) {
    gitAncestor(
      commit,
      source.head,
      "production_epoch2_selection_lineage_not_ancestor_admission_main",
    );
  }

  const material = structuredClone(admission);
  const observedAdmissionId = String(material.promotion_admission_id || "");
  delete material.promotion_admission_id;
  const expectedAdmissionId =
    "voidpe2rpctapply1_" +
    sha256(Buffer.from(canonical(material), "utf8"));
  if (
    observedAdmissionId !== expectedAdmissionId ||
    observedAdmissionId !==
      "voidpe2rpctapply1_f76ce9f3d147a6097910947e3a8735664ff81bea07d1940ebdb663102589b040"
  ) {
    fail("production_epoch2_selection_admission_id_mismatch");
  }

  if (
    receipt.activation_plan_id !== plan.activation_plan_id ||
    receipt.activation_receipt_id !== candidate.selection.activation_receipt_id ||
    observation.observation_id !== candidate.selection.runtime_observation_id
  ) {
    fail("production_epoch2_selection_evidence_id_binding_mismatch");
  }

  return Object.freeze({
    marker: VOID_PRODUCTION_EPOCH2_RPC_SELECTION_EVIDENCE_VERIFIER_V1,
    version: 1,
    verified: true,
    current_head: currentHead,
    admission_source_head: source.head,
    activation_plan_id: plan.activation_plan_id,
    activation_plan_sha256:
      SELECTION_EVIDENCE_PACKET_V1.activation_plan.sha256,
    activation_receipt_id: receipt.activation_receipt_id,
    activation_receipt_sha256:
      SELECTION_EVIDENCE_PACKET_V1.activation_receipt.sha256,
    runtime_observation_id: observation.observation_id,
    runtime_observation_sha256:
      SELECTION_EVIDENCE_PACKET_V1.runtime_observation.sha256,
    selected_candidate_sha256:
      SELECTION_EVIDENCE_PACKET_V1.selected_candidate.sha256,
    promotion_admission_id: observedAdmissionId,
    promotion_apply_admission_sha256:
      SELECTION_EVIDENCE_PACKET_V1.promotion_apply_admission.sha256,
    selected_candidate_recompiled_from_exact_evidence: true,
    promotion_admission_content_address_reverified: true,
    historical_source_trees_reverified: true,
    source_lineage_ancestry_reverified: true,
    reviewed_execution_head: reviewedExecution.head,
    reviewed_execution_module_count: reviewedExecution.module_count,
    reviewed_execution_exact_head_git_object_bytes:
      reviewedExecution.exact_head_git_object_bytes,
    reviewed_execution_non_shallow_repository:
      reviewedExecution.non_shallow_repository,
    reviewed_execution_bare_package_runtime_absent:
      reviewedExecution.bare_package_runtime_absent,
  });
}

function defaultPacket() {
  return {
    target_bytes: fs.readFileSync(path.join(ROOT, TARGET_REL)),
    selected_candidate_bytes: fs.readFileSync(
      path.join(ROOT, SELECTION_EVIDENCE_PACKET_V1.selected_candidate.path),
    ),
    activation_plan_bytes: fs.readFileSync(
      path.join(ROOT, SELECTION_EVIDENCE_PACKET_V1.activation_plan.path),
    ),
    activation_receipt_bytes: fs.readFileSync(
      path.join(ROOT, SELECTION_EVIDENCE_PACKET_V1.activation_receipt.path),
    ),
    runtime_observation_bytes: fs.readFileSync(
      path.join(ROOT, SELECTION_EVIDENCE_PACKET_V1.runtime_observation.path),
    ),
    promotion_apply_admission_bytes: fs.readFileSync(
      path.join(ROOT, SELECTION_EVIDENCE_PACKET_V1.promotion_apply_admission.path),
    ),
  };
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + path.resolve(process.argv[1])).href
) {
  try {
    process.stdout.write(
      JSON.stringify(
        verifyProductionEpoch2RpcSelectionEvidencePacketV1(defaultPacket()),
      ) + "\n",
    );
  } catch (error) {
    console.error(
      "VOID_PRODUCTION_EPOCH2_RPC_SELECTION_EVIDENCE_VERIFIER_V1_HOLD",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
