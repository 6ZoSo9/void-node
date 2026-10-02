#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  promoteWcVoidBoundedCanarySemanticV1,
} from "../tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs";
import {
  promoteWcVoidBoundedCanaryCandidatesV1,
} from "../tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs";
import {
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1,
  prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1,
  verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1,
  verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1,
} from "../tools/void-wc-void-bounded-canary-canonical-application-v1.mjs";

const LAUNCH =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const PRODUCTION =
  "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED =
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR =
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";
const REVIEWED_BRIDGE =
  "tools/void-wc-void-bounded-canary-reviewed-execution-v1.mjs";
const HIDDEN_AUTHORITY_SOURCE =
  "tools/void-participant-postpurchase-finality-v1.mjs";
const REVIEWED_RUNTIME_PROFILE = JSON.parse(
  fs.readFileSync(
    "ops/security/reviewed-node-package-runtime-ethers-v1.json",
    "utf8",
  ),
);

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
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return "{" + Object.keys(value).sort().map(
      (key) => JSON.stringify(key) + ":" + canonicalJson(value[key]),
    ).join(",") + "}";
  }
  throw new Error("invalid canonical value");
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

function proofGitEnv() {
  return {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
}

function git(...args) {
  return execFileSync(
    "/usr/bin/git",
    ["-C", process.cwd(), ...args],
    {
      encoding: "utf8",
      env: proofGitEnv(),
    },
  ).trim();
}

const SEMANTIC_PROOF_PATH =
  "scripts/prove_void_wc_void_bounded_canary_semantic_promotion_v1.mjs";

function reviewedSemanticRequestFixture() {
  const reviewedProof = fs.readFileSync(SEMANTIC_PROOF_PATH, "utf8");
  const splitMarker = "const f=await fixture();";
  const splitAt = reviewedProof.indexOf(splitMarker);
  assert(splitAt > 0, "reviewed semantic proof fixture marker missing");

  const tempScript = path.join(
    "scripts",
    ".void-wc-semantic-origin-fixture-" + String(process.pid) + ".mjs",
  );
  const outputMarker = "VOID_SEMANTIC_FIXTURE_JSON_V1=";
  const extractor =
    reviewedProof.slice(0, splitAt) +
    "\nconst __fixture=await fixture();\n" +
    "try{\n" +
    "  const __encoded={};\n" +
    "  for(const [key,value] of Object.entries(__fixture.request)){\n" +
    "    __encoded[key]=Buffer.isBuffer(value)\n" +
    "      ? {kind:'bytes',base64:value.toString('base64')}\n" +
    "      : {kind:'value',value};\n" +
    "  }\n" +
    "  process.stdout.write('" + outputMarker + "'+JSON.stringify(__encoded)+'\\n');\n" +
    "}finally{__fixture.cleanup();}\n";

  fs.writeFileSync(tempScript, extractor, { mode: 0o600 });
  let raw;
  try {
    raw = execFileSync(
      process.execPath,
      [tempScript],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } finally {
    fs.rmSync(tempScript, { force: true });
  }
  const markerAt = raw.lastIndexOf(outputMarker);
  assert(markerAt >= 0, "reviewed semantic fixture output marker missing");
  const encoded = JSON.parse(
    raw.slice(markerAt + outputMarker.length).trim(),
  );
  const request = {};
  for (const [key, entry] of Object.entries(encoded)) {
    request[key] =
      entry.kind === "bytes"
        ? Buffer.from(entry.base64, "base64")
        : entry.value;
  }
  assert.equal(
    git("status", "--porcelain=v1", "--untracked-files=all"),
    "",
    "semantic fixture extraction must leave repository clean",
  );
  return request;
}

const semanticRequest = reviewedSemanticRequestFixture();
const semantic = promoteWcVoidBoundedCanarySemanticV1(semanticRequest);
const semanticBytes = prettyBytes(semantic);
const productionBytes = fs.readFileSync(PRODUCTION);
const coupledBytes = fs.readFileSync(COUPLED);
const successorBytes = fs.readFileSync(SUCCESSOR);
const successor = JSON.parse(successorBytes.toString("utf8"));
const head = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");

const promotion =
  promoteWcVoidBoundedCanaryCandidatesV1({
    repository_head_sha: head,
    repository_tree_sha: tree,
    semantic_promotion_bytes: semanticBytes,
    semantic_promotion_file_sha256: sha256(semanticBytes),
    production_candidate_bytes: productionBytes,
    production_candidate_file_sha256: sha256(productionBytes),
    coupled_candidate_bytes: coupledBytes,
    coupled_candidate_file_sha256: sha256(coupledBytes),
    successor_candidate_bytes: successorBytes,
    successor_candidate_file_sha256: sha256(successorBytes),
  });
const promotionBytes = prettyBytes(promotion);

const plan =
  prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
    semanticPromotionBytes: semanticBytes,
    semanticPromotionFileSha256: sha256(semanticBytes),
    semanticPromotionRequest: semanticRequest,
    candidatePromotionReceiptBytes: promotionBytes,
    candidatePromotionReceiptFileSha256: sha256(promotionBytes),
  });

assert.equal(
  plan.marker,
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_PLAN_V1,
);
assert.equal(plan.status, "CANONICAL_BOUNDED_CANARY_APPLICATION_PREPARED");
assert.match(plan.application_plan_id, /^voidwcbcap1_[0-9a-f]{64}$/u);
assert.equal(plan.candidate_promotion_id, promotion.promotion_id);
assert.equal(
  plan.semantic_promotion_file_sha256,
  sha256(semanticBytes),
);
assert.equal(plan.production_target_candidate.bounded_canary_green, true);
assert.equal(plan.production_target_candidate.coupled_activation_ready, false);
assert.equal(plan.production_target_candidate.status, "hold");
assert.equal(plan.coupled_target_candidate.gates.bounded_canary_green, true);
assert.equal(
  plan.coupled_target_candidate.gates.coupled_activation_ready,
  false,
);
assert.equal(plan.coupled_target_candidate.status, "HOLD");
assert.equal(plan.removed_production_missing_gate, "bounded_canary_required");
assert.equal(plan.removed_coupled_missing_gate, "bounded_canary_required");
assert.equal(plan.market_activation_authorized, false);
assert.equal(plan.public_presale_activation_authorized, false);
assert.equal(plan.funds_movement_authorized, false);

assert.equal(plan.reviewed_execution_permission_fenced, true);
assert.equal(
  plan.reviewed_execution_ancestor_package_resolution_allowed,
  false,
);
assert.equal(
  plan.reviewed_execution_network_isolation_provided,
  false,
);
assert.equal(
  plan.reviewed_execution_network_capable_modules.includes(
    "tools/void-participant-postpurchase-production-runtime-binding-v1.mjs",
  ),
  true,
);
assert.equal(
  plan.reviewed_runtime_profile_id,
  REVIEWED_RUNTIME_PROFILE.profile_id,
);
assert.equal(
  plan.reviewed_runtime_packages_aggregate_sha256,
  REVIEWED_RUNTIME_PROFILE.packages_aggregate_sha256,
);
assert.equal(
  plan.reviewed_execution_module_git_blobs[REVIEWED_BRIDGE],
  git("rev-parse", "HEAD:" + REVIEWED_BRIDGE),
);
assert.equal(
  plan.reviewed_execution_module_git_blobs[HIDDEN_AUTHORITY_SOURCE],
  git("rev-parse", "HEAD:" + HIDDEN_AUTHORITY_SOURCE),
);

const pure =
  verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
    plan,
    productionCandidate: plan.production_target_candidate,
    coupledCandidate: plan.coupled_target_candidate,
    successorCandidate: successor,
  });
assert.equal(pure.production.status, "HOLD");
assert.equal(pure.coupled.status, "HOLD");
assert.equal(
  pure.production.missing_gates.includes("bounded_canary_required"),
  false,
);
assert.equal(
  pure.coupled.missing_gates.includes("bounded_canary_required"),
  false,
);

{
  const packagePath = "node_modules/ethers/package.json";
  const original = fs.readFileSync(packagePath);
  try {
    const text = original.toString("utf8");
    fs.writeFileSync(
      packagePath,
      Buffer.from(
        text.endsWith("\n")
          ? text.slice(0, -1) + " \n"
          : text + " ",
        "utf8",
      ),
    );
    assert.throws(
      () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
        semanticPromotionBytes: semanticBytes,
        semanticPromotionFileSha256: sha256(semanticBytes),
        semanticPromotionRequest: semanticRequest,
        candidatePromotionReceiptBytes: promotionBytes,
        candidatePromotionReceiptFileSha256: sha256(promotionBytes),
      }),
      /CANONICAL_APPLICATION_REVIEWED_RUNTIME_/u,
    );
  } finally {
    fs.writeFileSync(packagePath, original);
  }
}

{
  const original = fs.readFileSync(HIDDEN_AUTHORITY_SOURCE);
  const sentinel = path.join(
    os.tmpdir(),
    "void-bounded-canary-hidden-authority-" + String(process.pid),
  );
  try {
    fs.rmSync(sentinel, { force: true });
    git("update-index", "--assume-unchanged", HIDDEN_AUTHORITY_SOURCE);
    const malicious = Buffer.concat([
      Buffer.from(
        'import { writeFileSync as __voidSentinelWrite } from "node:fs";\n' +
          "__voidSentinelWrite(" +
          JSON.stringify(sentinel) +
          ', "executed\\n");\n',
        "utf8",
      ),
      original,
    ]);
    fs.writeFileSync(HIDDEN_AUTHORITY_SOURCE, malicious);
    const hidden = prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      semanticPromotionBytes: semanticBytes,
      semanticPromotionFileSha256: sha256(semanticBytes),
      semanticPromotionRequest: semanticRequest,
      candidatePromotionReceiptBytes: promotionBytes,
      candidatePromotionReceiptFileSha256: sha256(promotionBytes),
    });
    assert.equal(hidden.application_plan_id, plan.application_plan_id);
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "hidden unreviewed authority module executed",
    );
  } finally {
    fs.writeFileSync(HIDDEN_AUTHORITY_SOURCE, original);
    git("update-index", "--no-assume-unchanged", HIDDEN_AUTHORITY_SOURCE);
    fs.rmSync(sentinel, { force: true });
  }
}

{
  const toolPath =
    "tools/void-wc-void-bounded-canary-canonical-application-v1.mjs";
  const original = fs.readFileSync(toolPath);
  try {
    git("update-index", "--assume-unchanged", toolPath);
    fs.appendFileSync(toolPath, "\n// hidden parent-tool mutation\n");
    assert.throws(
      () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
        semanticPromotionBytes: semanticBytes,
        semanticPromotionFileSha256: sha256(semanticBytes),
        semanticPromotionRequest: semanticRequest,
        candidatePromotionReceiptBytes: promotionBytes,
        candidatePromotionReceiptFileSha256: sha256(promotionBytes),
      }),
      /CANONICAL_APPLICATION_TOOL_WORKTREE_DRIFT/u,
    );
  } finally {
    fs.writeFileSync(toolPath, original);
    git("update-index", "--no-assume-unchanged", toolPath);
  }
}

const planBytes = prettyBytes(plan);
assert.throws(
  () => verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1({
    applicationPlanBytes: planBytes,
    applicationPlanFileSha256: sha256(planBytes),
  }),
  /CANONICAL_APPLICATION_APPLIED_BRANCH_NOT_MAIN/u,
);

{
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-bounded-canary-git-provenance-"),
  );
  const localSentinel = path.join(temp, "local-fsmonitor-executed");
  const globalSentinel = path.join(temp, "global-fsmonitor-executed");
  const localFsmonitor = path.join(temp, "local-fsmonitor.sh");
  const globalFsmonitor = path.join(temp, "global-fsmonitor.sh");
  const globalConfig = path.join(temp, "global.gitconfig");
  const loaderPrefix = path.join(temp, "ld-debug");

  fs.writeFileSync(
    localFsmonitor,
    "#!/bin/sh\nprintf 'executed\\n' >> " +
      JSON.stringify(localSentinel) +
      "\nexit 91\n",
    { mode: 0o700 },
  );
  fs.writeFileSync(
    globalFsmonitor,
    "#!/bin/sh\nprintf 'executed\\n' >> " +
      JSON.stringify(globalSentinel) +
      "\nexit 91\n",
    { mode: 0o700 },
  );
  fs.writeFileSync(
    globalConfig,
    "[core]\n  fsmonitor = " + globalFsmonitor + "\n",
    { mode: 0o600 },
  );

  const previous = spawnSync(
    "/usr/bin/git",
    ["-C", process.cwd(), "config", "--local", "--get", "core.fsmonitor"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: proofGitEnv(),
    },
  );
  assert.ok(previous.status === 0 || previous.status === 1);
  const previousValue =
    previous.status === 0 ? String(previous.stdout || "").trim() : null;

  const setLocal = spawnSync(
    "/usr/bin/git",
    ["-C", process.cwd(), "config", "--local", "core.fsmonitor", localFsmonitor],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: proofGitEnv(),
    },
  );
  assert.equal(setLocal.status, 0, String(setLocal.stderr || ""));

  const saved = Object.fromEntries(
    ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "LD_DEBUG", "LD_DEBUG_OUTPUT"]
      .map((key) => [key, process.env[key]]),
  );
  process.env.GIT_CONFIG_GLOBAL = globalConfig;
  process.env.GIT_CONFIG_SYSTEM = globalConfig;
  process.env.LD_DEBUG = "libs";
  process.env.LD_DEBUG_OUTPUT = loaderPrefix;

  try {
    assert.throws(
      () => verifyVoidWcVoidBoundedCanaryCanonicalApplicationV1({
        applicationPlanBytes: planBytes,
        applicationPlanFileSha256: sha256(planBytes),
      }),
      /CANONICAL_APPLICATION_APPLIED_BRANCH_NOT_MAIN/u,
    );
    assert.equal(
      fs.existsSync(localSentinel),
      false,
      "repository-local core.fsmonitor executed during authority Git read",
    );
    assert.equal(
      fs.existsSync(globalSentinel),
      false,
      "ambient global Git config executed during authority Git read",
    );
    assert.equal(
      fs.readdirSync(temp).some((name) => name.startsWith("ld-debug.")),
      false,
      "dynamic-loader environment crossed into authority Git subprocess",
    );
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    const restore =
      previousValue === null
        ? spawnSync(
            "/usr/bin/git",
            ["-C", process.cwd(), "config", "--local", "--unset-all", "core.fsmonitor"],
            {
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
              env: proofGitEnv(),
            },
          )
        : spawnSync(
            "/usr/bin/git",
            ["-C", process.cwd(), "config", "--local", "core.fsmonitor", previousValue],
            {
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
              env: proofGitEnv(),
            },
          );
    assert.equal(restore.status, 0, String(restore.stderr || ""));
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

assert.throws(
  () => verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
    plan,
    productionCandidate: JSON.parse(productionBytes.toString("utf8")),
    coupledCandidate: JSON.parse(coupledBytes.toString("utf8")),
    successorCandidate: successor,
  }),
  /CANONICAL_APPLICATION_PRODUCTION_TARGET_NOT_APPLIED/u,
);

{
  const forgedSemantic = structuredClone(semantic);
  forgedSemantic.canary_evidence_id =
    "voidwcbce1_" + "f".repeat(64);
  const {
    semantic_evidence_id: _semanticEvidenceId,
    promotion_id: _semanticPromotionId,
    ...forgedSemanticMaterial
  } = forgedSemantic;
  const forgedDigest = sha256(
    Buffer.from(canonicalJson(forgedSemanticMaterial), "utf8"),
  );
  forgedSemantic.semantic_evidence_id = "sha256:" + forgedDigest;
  forgedSemantic.promotion_id = "voidwcbcsp1_" + forgedDigest;
  const forgedSemanticBytes = prettyBytes(forgedSemantic);
  const forgedPromotion = promoteWcVoidBoundedCanaryCandidatesV1({
    repository_head_sha: head,
    repository_tree_sha: tree,
    semantic_promotion_bytes: forgedSemanticBytes,
    semantic_promotion_file_sha256: sha256(forgedSemanticBytes),
    production_candidate_bytes: productionBytes,
    production_candidate_file_sha256: sha256(productionBytes),
    coupled_candidate_bytes: coupledBytes,
    coupled_candidate_file_sha256: sha256(coupledBytes),
    successor_candidate_bytes: successorBytes,
    successor_candidate_file_sha256: sha256(successorBytes),
  });
  const forgedPromotionBytes = prettyBytes(forgedPromotion);
  assert.throws(
    () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      semanticPromotionBytes: forgedSemanticBytes,
      semanticPromotionFileSha256: sha256(forgedSemanticBytes),
      semanticPromotionRequest: semanticRequest,
      candidatePromotionReceiptBytes: forgedPromotionBytes,
      candidatePromotionReceiptFileSha256: sha256(forgedPromotionBytes),
    }),
    /CANONICAL_APPLICATION_SEMANTIC_ORIGIN_MISMATCH/u,
  );
}

{
  const forged = structuredClone(promotion);
  forged.promoted_production_candidate.inventory_funded = true;
  const bytes = prettyBytes(forged);
  assert.throws(
    () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      semanticPromotionBytes: semanticBytes,
      semanticPromotionFileSha256: sha256(semanticBytes),
      semanticPromotionRequest: semanticRequest,
      candidatePromotionReceiptBytes: bytes,
      candidatePromotionReceiptFileSha256: sha256(bytes),
    }),
    /CANONICAL_APPLICATION_REVIEWED_PROMOTION_RECEIPT_MISMATCH/u,
  );
}

{
  const forged = structuredClone(plan);
  forged.production_target_candidate.inventory_funded = true;
  const targetBytes = prettyBytes(forged.production_target_candidate);
  forged.production_target_file_sha256 = sha256(targetBytes);
  forged.production_target_git_blob_sha1 = gitBlobSha1(targetBytes);
  delete forged.application_plan_id;
  forged.application_plan_id =
    "voidwcbcap1_" +
    sha256(Buffer.from(canonicalJson(forged), "utf8"));
  assert.throws(
    () => verifyVoidWcVoidBoundedCanaryCanonicalApplicationStateV1({
      plan: forged,
      productionCandidate: forged.production_target_candidate,
      coupledCandidate: forged.coupled_target_candidate,
      successorCandidate: successor,
    }),
    /CANONICAL_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID/u,
  );
}

{
  const badRequest = {
    ...semanticRequest,
    participant_at_use_file_sha256: "0".repeat(64),
  };
  assert.throws(
    () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
      semanticPromotionBytes: semanticBytes,
      semanticPromotionFileSha256: sha256(semanticBytes),
      semanticPromotionRequest: badRequest,
      candidatePromotionReceiptBytes: promotionBytes,
      candidatePromotionReceiptFileSha256: sha256(promotionBytes),
    }),
    /BOUNDED_CANARY_PARTICIPANT_AT_USE_FILE_SHA256_MISMATCH/u,
  );
}

assert.throws(
  () => prepareVoidWcVoidBoundedCanaryCanonicalApplicationV1({
    semanticPromotionBytes: semanticBytes,
    semanticPromotionFileSha256: "0".repeat(64),
    semanticPromotionRequest: semanticRequest,
    candidatePromotionReceiptBytes: promotionBytes,
    candidatePromotionReceiptFileSha256: sha256(promotionBytes),
  }),
  /CANONICAL_APPLICATION_SEMANTIC_PROMOTION_FILE_SHA256_MISMATCH/u,
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_AUTHORITY_V1,
)) {
  const allowed = new Set([
    "source_only_application",
    "exact_semantic_promotion_bytes_required",
    "exact_semantic_origin_inputs_required",
    "semantic_promotion_reexecution_required",
    "semantic_promotion_equality_required",
    "exact_candidate_promotion_receipt_required",
    "candidate_promotion_reexecution_required",
    "canonical_head_candidate_bytes_required",
    "reviewed_repository_generation_required",
    "canonical_classifier_reexecution",
    "exact_two_gate_source_delta",
    "reviewed_git_commit_required",
    "canonical_main_application_required",
    "canonical_github_origin_required",
    "canonical_remote_main_read_required",
    "reviewed_git_executable_required",
    "ambient_git_overrides_ignored",
    "reviewed_git_object_execution_required",
    "reviewed_module_closure_required",
    "reviewed_package_runtime_required",
    "permission_fenced_execution_required",
    "ancestor_package_resolution_forbidden",
    "worktree_authority_execution_forbidden",
    "private_temporary_filesystem_write",
    "filesystem_read",
    "filesystem_write",
  ]);
  assert.equal(value, allowed.has(key), key);
}

const source = fs.readFileSync(
  "tools/void-wc-void-bounded-canary-canonical-application-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "systemctl",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
assert.equal(
  source.includes("const env = { ...process.env }"),
  false,
  "authority Git environment must not inherit process.env",
);
for (const mutableImport of [
  'from "./void-wc-void-bounded-canary-candidate-promotion-v1.mjs"',
  'from "./void-wc-void-bounded-canary-semantic-promotion-v1.mjs"',
  'from "./void-wc-void-production-readiness-v1.mjs"',
  'from "./void-coupled-economic-successor-gate-v1.mjs"',
]) {
  assert.equal(
    source.includes(mutableImport),
    false,
    "parent must not statically import authority module: " + mutableImport,
  );
}
for (const required of [
  "runReviewedAuthority",
  "reviewedModuleClosure",
  "materializeReviewedNodePackageRuntimeV1",
  "verifyMaterializedReviewedNodePackageRuntimeV1",
  "--permission",
  "--allow-child-process",
  "CANONICAL_APPLICATION_TOOL_WORKTREE_DRIFT",
  "CANONICAL_APPLICATION_REVIEWED_EXECUTION_LINEAGE_DRIFT",
  "assertPrivateExecutionStaticBinding",
  "CANONICAL_APPLICATION_REVIEWED_PARENT_IDENTITY_DRIFT",
  "CANONICAL_APPLICATION_REVIEWED_RUNNER",
  "CANONICAL_APPLICATION_SEMANTIC_ORIGIN_MISMATCH",
  "--no-replace-objects",
  "canonicalRemoteGitText",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_ATTR_NOSYSTEM",
  "core.fsmonitor=false",
  "core.hooksPath=/dev/null",
  "core.attributesFile=/dev/null",
  "core.untrackedCache=false",
  "core.preloadIndex=false",
  "submodule.recurse=false",
  "http.sslVerify=true",
  "ls-remote",
  "https://github.com/6ZoSo9/void-node.git",
  "CANONICAL_APPLICATION_REPOSITORY_CHANGED_DURING_READ",
  "production_target_git_blob_sha1",
  "coupled_target_git_blob_sha1",
  "CANONICAL_APPLICATION_PRODUCTION_CHANGE_SCOPE_INVALID",
  "CANONICAL_APPLICATION_COUPLED_CHANGE_SCOPE_INVALID",
  "final_coupled_activation_required",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_WC_VOID_BOUNDED_CANARY_CANONICAL_APPLICATION_V1_PROOF_GREEN",
);
console.log("semantic_promotion_reexecuted_from_exact_origin_inputs=true");
console.log("fabricated_semantic_origin_held=true");
console.log("candidate_promotion_reexecuted=true");
console.log("reviewed_git_object_execution_verified=true");
console.log("reviewed_ethers_runtime_verified=true");
console.log("permission_fenced_execution=true");
console.log("private_execution_bytes_reverified_before_spawn=true");
console.log("ancestor_package_resolution_allowed=false");
console.log("hidden_worktree_authority_execution=false");
console.log("parent_tool_worktree_binding_verified=true");
console.log("canonical_source_prestates_bound=true");
console.log("canonical_remote_config_isolated=true");
console.log("minimal_git_subprocess_environment=true");
console.log("repository_local_fsmonitor_ignored=true");
console.log("ambient_global_git_config_ignored=true");
console.log("dynamic_loader_git_injection_ignored=true");
console.log("exact_two_gate_delta_prepared=true");
console.log("forged_promotion_receipt_held=true");
console.log("forged_application_plan_held=true");
console.log("current_unapplied_source_held=true");
console.log("coupled_activation_ready=false");
console.log("repository_source_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
