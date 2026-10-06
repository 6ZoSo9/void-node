#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
} from "./void-wc-void-bounded-canary-semantic-promotion-v1.mjs";
import {
  classifyVoidWcVoidProductionReadinessV1,
} from "./void-wc-void-production-readiness-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "./void-coupled-economic-successor-gate-v1.mjs";

export const VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1";

export const VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    source_only_promotion: true,
    exact_semantic_promotion_bytes_required: true,
    exact_candidate_bytes_required: true,
    semantic_canary_fresh_at_reviewed_evaluation_required: true,
    canonical_classifier_reexecution: true,
    exact_two_gate_candidate_delta: true,
    git_repository_identity_read: true,
    clean_worktree_required: true,
    reviewed_source_generation_required: true,
    canonical_head_candidate_bytes_required: true,
    semantic_source_contract_generation_required: true,
    reviewed_dependency_closure_required: true,
    package_lock_generation_required: true,
    reviewed_git_executable_required: true,
    ambient_git_overrides_ignored: true,
    canonical_candidate_file_update: false,
    filesystem_read: true,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
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

const CURRENT_LAUNCH =
  "sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEWED_SOURCE_COMMIT =
  "c3ff2ce141fa88a53eafe7a28c3f6614cadaaa71";
const PROMOTION_TOOL_REL =
  "tools/void-wc-void-bounded-canary-candidate-promotion-v1.mjs";
const GIT_EXECUTABLE = "/usr/bin/git";
const GIT_REPOSITORY_SELECTION_ENV = Object.freeze([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_COMMON_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_REPLACE_REF_BASE",
]);
const GIT_CONFIG_INJECTION_ENV = Object.freeze([
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_COUNT",
]);
const GIT_PROGRAM_OVERRIDE_ENV = Object.freeze([
  "GIT_EXEC_PATH",
  "GIT_SSH",
  "GIT_SSH_COMMAND",
  "GIT_ASKPASS",
  "SSH_ASKPASS",
  "GIT_EXTERNAL_DIFF",
  "GIT_PAGER",
  "GIT_EDITOR",
  "GIT_SEQUENCE_EDITOR",
]);
const REVIEWED_SOURCE_BINDINGS = Object.freeze({
  semantic_promotion_tool: Object.freeze({
    path: "tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs",
    blob_sha1: "38fc89f07b1e328504aff60dc2d357cb1072cdb3",
  }),
  semantic_promotion_proof: Object.freeze({
    path: "scripts/prove_void_wc_void_bounded_canary_semantic_promotion_v1.mjs",
    blob_sha1: "55cb03312c2242d57e5a3db4a1d36a12f513f588",
  }),
  production_candidate: Object.freeze({
    path: "ops/mainnet0/wc-void-production-candidate-v1.json",
    blob_sha1: "43467c6cf03723ab8eb8e688d7b24c10bd681bad",
  }),
  coupled_candidate: Object.freeze({
    path: "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    blob_sha1: "fbbc3174406f76077c8cb2fc11df9545938c0c8f",
  }),
  successor_candidate: Object.freeze({
    path: "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    blob_sha1: "1457b8a0b060c4c515bf2232320af19f4e70dd35",
  }),
  production_classifier: Object.freeze({
    path: "tools/void-wc-void-production-readiness-v1.mjs",
    blob_sha1: "34e84c1f16452361e0e8d2c867e3bd4d63047061",
  }),
  coupled_classifier: Object.freeze({
    path: "tools/void-coupled-economic-successor-gate-v1.mjs",
    blob_sha1: "b565f3d8174d20e5e15c18085b97bc776e645efa",
  }),
  successor_classifier: Object.freeze({
    path: "tools/void-economic-evm-successor-migration-v1.mjs",
    blob_sha1: "9f51b193da687669700c898ed587edf9040f6264",
  }),
  semantic_bounded_canary_evidence: Object.freeze({
    path: "tools/void-wc-void-bounded-canary-evidence-v1.mjs",
    blob_sha1: "209440e02102823053e27ccd49cece25ab07bba6",
  }),
  semantic_market_vault_at_use: Object.freeze({
    path: "tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs",
    blob_sha1: "273b2eb4a496be499ca7d2982fdfa24fbedcf9aa",
  }),
  semantic_ledger_persistence_import: Object.freeze({
    path: "tools/void-wc-void-ledger-persistence-import-v1.mjs",
    blob_sha1: "225d1228ad4ca6b554bddf5c06af1d2ba7a73041",
  }),
  semantic_opening_claim_binding: Object.freeze({
    path: "tools/void-wc-void-opening-claim-binding-v1.mjs",
    blob_sha1: "8789967dbd8d4151833f2f006510b00ccf8281cf",
  }),
  semantic_opening_claim_persistence: Object.freeze({
    path: "tools/void-wc-void-opening-claim-binding-persistence-v1.mjs",
    blob_sha1: "a9b471aa4598fa36341f369545a9b3490aee3934",
  }),
  semantic_opening_replay_protection: Object.freeze({
    path: "tools/void-wc-void-opening-replay-protection-v1.mjs",
    blob_sha1: "ee902e77f0ded31aea73cb231eb806e4121d1bc8",
  }),
  semantic_opening_replay_persistence: Object.freeze({
    path: "tools/void-wc-void-opening-replay-persistence-v1.mjs",
    blob_sha1: "82f052dd2454299293d8c1a36d841e87f1fbb215",
  }),
  semantic_coupled_opening: Object.freeze({
    path: "tools/void-wc-void-coupled-opening-v1.mjs",
    blob_sha1: "886feaef71a228b1e6f49f1106ae8ec2b34c404e",
  }),
  semantic_participant_at_use: Object.freeze({
    path: "tools/void-participant-postpurchase-at-use-revalidation-v1.mjs",
    blob_sha1: "3f36f6bc4e6bafdb2820a3389b484246bdfb9d13",
  }),
  production_market_vault_identity_acceptance: Object.freeze({
    path: "tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs",
    blob_sha1: "bcf7d4949b054599c643867b586b75a844f25cbc",
  }),
  production_settlement_adapter_review: Object.freeze({
    path: "tools/void-wc-void-opening-settlement-adapter-review-v1.mjs",
    blob_sha1: "c19a2e42e8d722eade864c7742af2dcaf3c7b11f",
  }),
  coupled_shared_market_post_discovery: Object.freeze({
    path: "tools/void-shared-market-post-discovery-state-v2.mjs",
    blob_sha1: "bcfff9c2981e713a7053ff51a39145eb06b7238b",
  }),
  coupled_nonproduction_exclusion: Object.freeze({
    path: "tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs",
    blob_sha1: "fcc915b20df0d281646a2ffda60667e1aa6859de",
  }),
  coupled_participant_provenance: Object.freeze({
    path: "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
    blob_sha1: "db034d197a8b932d0b9eb1d134a6a4a7a0fb6b86",
  }),
  coupled_concentration_sybil_policy: Object.freeze({
    path: "tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
    blob_sha1: "27c686c9bf95bbf9b56f09c692cb59ffba958d0d",
  }),
  coupled_minimum_real_wc_depth_policy: Object.freeze({
    path: "tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
    blob_sha1: "9b1e784c0d35e5129f89a93aeba509c4ab7ccaea",
  }),
  coupled_reverse_settlement: Object.freeze({
    path: "tools/void-wc-void-reverse-settlement-v1.mjs",
    blob_sha1: "e018dab911fba65547ddbb61e145018f04953b76",
  }),
  coupled_intent_ttl_caps_policy: Object.freeze({
    path: "tools/void-economic-intent-ttl-caps-policy-v1.mjs",
    blob_sha1: "139d79bb7177c866259747b1ca47ab40870f24b1",
  }),
  coupled_system_sponsored_anti_grief_policy: Object.freeze({
    path: "tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
    blob_sha1: "48b4ec260b0aef06ee7c9d9bc7bfcc179d9ee51c",
  }),
  semantic_market_vault_runtime_attestation: Object.freeze({
    path: "tools/void-wc-void-market-vault-runtime-attestation-v1.mjs",
    blob_sha1: "69c0bb105fabd3de8bd5f970d76ec861393ec4a3",
  }),
  semantic_market_vault_runtime_attestation_import: Object.freeze({
    path: "tools/void-wc-void-market-vault-runtime-attestation-import-v1.mjs",
    blob_sha1: "f4fff40f2dc4e1c558e2daa3fe32614db81436b1",
  }),
  semantic_ledger_persistence: Object.freeze({
    path: "tools/void-wc-void-ledger-persistence-v1.mjs",
    blob_sha1: "3cca8fe0d1f356800c1f85087298d1a4ead3a4e3",
  }),
  participant_finality_import: Object.freeze({
    path: "tools/void-participant-postpurchase-finality-import-v1.mjs",
    blob_sha1: "6bd0e4393fc556f56dca05ec5e08331d0900a402",
  }),
  participant_production_runtime_binding: Object.freeze({
    path: "tools/void-participant-postpurchase-production-runtime-binding-v1.mjs",
    blob_sha1: "5077b2020f9c00fbfb995dacab991cb351ca4e5e",
  }),
  market_vault_compiler_identity: Object.freeze({
    path: "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
    blob_sha1: "3ac765215d3d2c7881e893100e63e0306cf2593f",
  }),
  market_vault_contract_source: Object.freeze({
    path: "contracts/mainnet/WCVoidMarketVaultV2.sol",
    blob_sha1: "bd11190e2c22f58ac60918ecdf603f53427cadd0",
  }),
  public_quote_disclosure: Object.freeze({
    path: "tools/void-wc-void-public-quote-disclosure-v1.mjs",
    blob_sha1: "708a81bf9068b561110a80cb6204e6b09744e66c",
  }),
  participant_finality: Object.freeze({
    path: "tools/void-participant-postpurchase-finality-v1.mjs",
    blob_sha1: "4bbc6d47f556133e0c49e2353d88ebcd4e789e65",
  }),
  package_json: Object.freeze({
    path: "package.json",
    blob_sha1: "f28c3e9446c7623ef203da36a9642d046e5f34ee",
  }),
  package_lock: Object.freeze({
    path: "package-lock.json",
    blob_sha1: "b2671f0149f522b2489247016df0a5ec4bb72b8b",
  }),
});
const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SEMANTIC_PROMOTION_ID = /^voidwcbcsp1_[0-9a-f]{64}$/u;
const CANDIDATE_PROMOTION_ID = /^voidwcbccp1_[0-9a-f]{64}$/u;
const POLICY_ID = /^voidwcbcp1_[0-9a-f]{64}$/u;
const CANARY_EVIDENCE_ID = /^voidwcbce1_[0-9a-f]{64}$/u;
const REPLAY_ID = /^voidwcrp1_[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;

const INPUT_KEYS = Object.freeze([
  "repository_head_sha",
  "repository_tree_sha",
  "semantic_promotion_bytes",
  "semantic_promotion_file_sha256",
  "production_candidate_bytes",
  "production_candidate_file_sha256",
  "coupled_candidate_bytes",
  "coupled_candidate_file_sha256",
  "successor_candidate_bytes",
  "successor_candidate_file_sha256",
]);

const SEMANTIC_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "pair",
  "coupled_launch_id",
  "reviewed_policy_id",
  "canary_evidence_id",
  "evaluation_time_utc",
  "observed_at_utc",
  "valid_until_utc",
  "participant_count",
  "settled_wc_units",
  "delivered_void_atoms",
  "observed_finality_confirmations",
  "market_vault_address",
  "market_vault_runtime_code_sha256",
  "market_vault_runtime_verification_evidence_id",
  "inventory_lock_evidence_id",
  "wc_ledger_custody_evidence_id",
  "opening_claim_binding_id",
  "opening_claim_binding_persistence_evidence_id",
  "replay_capsule_id",
  "replay_terminal_capsule_sha256",
  "participant_control_evidence_id",
  "bounded_canary_input_file_sha256",
  "market_vault_at_use_file_sha256",
  "ledger_persistence_import_input_file_sha256",
  "opening_request_file_sha256",
  "opening_claim_binding_file_sha256",
  "opening_claim_persistence_receipt_file_sha256",
  "opening_replay_capsule_file_sha256",
  "opening_replay_inspection_receipt_file_sha256",
  "participant_at_use_file_sha256",
  "durable_claim_binding_verified",
  "durable_replay_terminal_verified",
  "upstream_evidence_semantically_verified",
  "live_canary_evidence_verified",
  "bounded_canary_green",
  "production_candidate_binding_allowed",
  "production_candidate_updated",
  "coupled_candidate_updated",
  "candidate_promotion_required",
  "coupled_activation_ready",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "semantic_evidence_id",
  "promotion_id",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = [...actual].sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
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
  fail("BOUNDED_CANARY_CANDIDATE_PROMOTION_CANONICAL_VALUE_INVALID");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function inspectGitExecutableV1() {
  let canonicalPath;
  let stat;
  let bytes;
  try {
    canonicalPath = fs.realpathSync(GIT_EXECUTABLE);
    stat = fs.statSync(canonicalPath);
    bytes = fs.readFileSync(canonicalPath);
  } catch {
    fail("BOUNDED_CANARY_GIT_EXECUTABLE_UNAVAILABLE");
  }
  if (
    !path.isAbsolute(canonicalPath)
    || !stat.isFile()
    || (stat.mode & 0o111) === 0
  ) {
    fail("BOUNDED_CANARY_GIT_EXECUTABLE_INVALID");
  }
  return Object.freeze({
    path: canonicalPath,
    sha256: sha256(bytes),
    filesystem_identity: [
      canonicalPath,
      String(stat.dev),
      String(stat.ino),
      String(stat.size),
      String(stat.mode & 0o7777),
    ].join("\0"),
  });
}

function sameGitExecutableIdentityV1(left, right) {
  return (
    left.path === right.path
    && left.sha256 === right.sha256
    && left.filesystem_identity === right.filesystem_identity
  );
}

function sanitizedGitEnvV1(baseEnv = process.env) {
  const env = { ...baseEnv };
  for (const key of GIT_REPOSITORY_SELECTION_ENV) delete env[key];
  for (const key of GIT_CONFIG_INJECTION_ENV) delete env[key];
  for (const key of GIT_PROGRAM_OVERRIDE_ENV) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/u.test(key)) delete env[key];
  }
  env.GIT_OPTIONAL_LOCKS = "0";
  env.LANG = "C";
  env.LC_ALL = "C";
  env.PATH = "/usr/bin:/bin";
  return env;
}

function gitRun(args, code, { encoding = "utf8", maxBuffer = 4 * 1024 * 1024 } = {}) {
  const before = inspectGitExecutableV1();
  const result = spawnSync(
    before.path,
    ["--no-replace-objects", "-C", REPO_ROOT, ...args],
    {
      encoding,
      maxBuffer,
      stdio: ["ignore", "pipe", "pipe"],
      env: sanitizedGitEnvV1(),
    },
  );
  if (result.error || result.status !== 0) fail(code);
  const after = inspectGitExecutableV1();
  if (!sameGitExecutableIdentityV1(before, after)) {
    fail("BOUNDED_CANARY_GIT_EXECUTABLE_CHANGED_DURING_READ");
  }
  return result.stdout;
}

function gitText(args, code) {
  return String(gitRun(args, code)).trim();
}

function headBlobSha1(relativePath, label) {
  const blob = gitText(
    ["rev-parse", `HEAD:${relativePath}`],
    "BOUNDED_CANARY_REPOSITORY_BLOB_UNAVAILABLE:" + label,
  );
  if (!HEX40.test(blob)) {
    fail("BOUNDED_CANARY_REPOSITORY_BLOB_INVALID:" + label);
  }
  return blob;
}

function exactHeadBytes(relativePath, label) {
  const value = gitRun(
    ["show", `HEAD:${relativePath}`],
    "BOUNDED_CANARY_REPOSITORY_BYTES_UNAVAILABLE:" + label,
    { encoding: null, maxBuffer: MAX_INPUT_BYTES + 1024 },
  );
  return Buffer.from(value);
}

function reviewedBindingManifestV1(blobs) {
  const entries = Object.entries(REVIEWED_SOURCE_BINDINGS)
    .map(([name, binding]) => Object.freeze({
      path: binding.path,
      blob_sha1: blobs[name],
    }))
    .sort((left, right) => (
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0
    ));
  return Object.freeze({
    count: entries.length,
    sha256: sha256(Buffer.from(canonicalJson(entries), "utf8")),
  });
}

function bindReviewedRepositorySourceV1(request, sources) {
  if (
    typeof request.repository_head_sha !== "string"
    || !HEX40.test(request.repository_head_sha)
    || typeof request.repository_tree_sha !== "string"
    || !HEX40.test(request.repository_tree_sha)
  ) {
    fail("BOUNDED_CANARY_REPOSITORY_IDENTITY_INPUT_INVALID");
  }

  if (
    gitText(
      ["status", "--porcelain=v1", "--untracked-files=all"],
      "BOUNDED_CANARY_REPOSITORY_STATUS_UNAVAILABLE",
    ) !== ""
  ) {
    fail("BOUNDED_CANARY_REPOSITORY_MUST_BE_CLEAN");
  }

  const head = gitText(
    ["rev-parse", "HEAD"],
    "BOUNDED_CANARY_REPOSITORY_HEAD_UNAVAILABLE",
  );
  const tree = gitText(
    ["rev-parse", "HEAD^{tree}"],
    "BOUNDED_CANARY_REPOSITORY_TREE_UNAVAILABLE",
  );
  if (!HEX40.test(head) || !HEX40.test(tree)) {
    fail("BOUNDED_CANARY_REPOSITORY_IDENTITY_INVALID");
  }
  if (request.repository_head_sha !== head) {
    fail("BOUNDED_CANARY_REPOSITORY_HEAD_MISMATCH");
  }
  if (request.repository_tree_sha !== tree) {
    fail("BOUNDED_CANARY_REPOSITORY_TREE_MISMATCH");
  }

  const blobs = Object.create(null);
  for (const [name, binding] of Object.entries(REVIEWED_SOURCE_BINDINGS)) {
    const actual = headBlobSha1(binding.path, name);
    if (actual !== binding.blob_sha1) {
      fail("BOUNDED_CANARY_REVIEWED_SOURCE_DRIFT:" + name);
    }
    blobs[name] = actual;
  }

  for (const [name, source] of [
    ["production_candidate", sources.production],
    ["coupled_candidate", sources.coupled],
    ["successor_candidate", sources.successor],
  ]) {
    const binding = REVIEWED_SOURCE_BINDINGS[name];
    const canonicalBytes = exactHeadBytes(binding.path, name);
    if (!source.bytes.equals(canonicalBytes)) {
      fail(
        "BOUNDED_CANARY_"
        + name.toUpperCase()
        + "_NOT_CANONICAL_REVIEWED_HEAD_BYTES",
      );
    }
  }

  const promotionToolBlob = headBlobSha1(
    PROMOTION_TOOL_REL,
    "candidate_promotion_tool",
  );
  const reviewedManifest = reviewedBindingManifestV1(blobs);

  return Object.freeze({
    repository_head_sha: head,
    repository_tree_sha: tree,
    reviewed_source_commit_sha: REVIEWED_SOURCE_COMMIT,
    semantic_promotion_tool_git_blob_sha1: blobs.semantic_promotion_tool,
    semantic_promotion_proof_git_blob_sha1: blobs.semantic_promotion_proof,
    production_candidate_git_blob_sha1: blobs.production_candidate,
    coupled_candidate_git_blob_sha1: blobs.coupled_candidate,
    successor_candidate_git_blob_sha1: blobs.successor_candidate,
    production_classifier_git_blob_sha1: blobs.production_classifier,
    coupled_classifier_git_blob_sha1: blobs.coupled_classifier,
    successor_classifier_git_blob_sha1: blobs.successor_classifier,
    package_json_git_blob_sha1: blobs.package_json,
    package_lock_git_blob_sha1: blobs.package_lock,
    reviewed_binding_count: reviewedManifest.count,
    reviewed_binding_manifest_sha256: reviewedManifest.sha256,
    candidate_promotion_tool_git_blob_sha1: promotionToolBlob,
  });
}

function parseJsonBytes(bytes, expectedSha, label) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_INPUT_BYTES) {
    fail(label + "_BYTES_INVALID");
  }
  if (typeof expectedSha !== "string" || !HEX64.test(expectedSha)) {
    fail(label + "_SHA256_INVALID");
  }
  if (sha256(bytes) !== expectedSha) fail(label + "_SHA256_MISMATCH");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(label + "_UTF8_INVALID");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail(label + "_JSON_INVALID");
  }
  if (!plain(value)) fail(label + "_JSON_NOT_OBJECT");
  return Object.freeze({
    bytes: Buffer.from(bytes),
    sha256: expectedSha,
    value,
  });
}

function canonicalUtc(value, code) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)
  ) {
    fail(code);
  }
  const ms = Date.parse(value);
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString() !== value.replace("Z", ".000Z")
  ) {
    fail(code);
  }
  return BigInt(ms);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function withoutSemanticIds(value) {
  const body = Object.create(null);
  for (const key of SEMANTIC_KEYS) {
    if (key === "semantic_evidence_id" || key === "promotion_id") continue;
    body[key] = value[key];
  }
  return body;
}

function validateSemanticPromotion(raw) {
  const value = exactObject(
    raw,
    SEMANTIC_KEYS,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_RECEIPT_SHAPE_INVALID",
  );
  if (
    value.marker !== VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1 ||
    value.version !== 1 ||
    value.status !== "BOUNDED_CANARY_SEMANTICALLY_VERIFIED_PROMOTION_READY" ||
    value.chain_id !== 2050 ||
    value.execution_epoch !== 2 ||
    value.pair !== "WC_VOID" ||
    value.coupled_launch_id !== CURRENT_LAUNCH ||
    value.participant_count !== "1" ||
    typeof value.reviewed_policy_id !== "string" ||
    !POLICY_ID.test(value.reviewed_policy_id) ||
    typeof value.canary_evidence_id !== "string" ||
    !CANARY_EVIDENCE_ID.test(value.canary_evidence_id) ||
    value.durable_claim_binding_verified !== true ||
    value.durable_replay_terminal_verified !== true ||
    value.upstream_evidence_semantically_verified !== true ||
    value.live_canary_evidence_verified !== true ||
    value.bounded_canary_green !== true ||
    value.production_candidate_binding_allowed !== true ||
    value.production_candidate_updated !== false ||
    value.coupled_candidate_updated !== false ||
    value.candidate_promotion_required !== true ||
    value.coupled_activation_ready !== false ||
    value.market_activation_authorized !== false ||
    value.public_presale_activation_authorized !== false ||
    value.funds_movement_authorized !== false
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_RECEIPT_INVALID");
  }

  for (const [name, amount] of [
    ["settled_wc_units", value.settled_wc_units],
    ["delivered_void_atoms", value.delivered_void_atoms],
    ["observed_finality_confirmations", value.observed_finality_confirmations],
  ]) {
    if (
      typeof amount !== "string" ||
      !UINT.test(amount) ||
      BigInt(amount) <= 0n
    ) {
      fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_AMOUNT_INVALID:" + name);
    }
  }
  if (
    typeof value.market_vault_address !== "string" ||
    !ADDRESS.test(value.market_vault_address) ||
    value.market_vault_address === "0x0000000000000000000000000000000000000000" ||
    typeof value.market_vault_runtime_code_sha256 !== "string" ||
    !HEX64.test(value.market_vault_runtime_code_sha256) ||
    typeof value.replay_capsule_id !== "string" ||
    !REPLAY_ID.test(value.replay_capsule_id) ||
    typeof value.replay_terminal_capsule_sha256 !== "string" ||
    !HEX64.test(value.replay_terminal_capsule_sha256)
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_EVIDENCE_IDENTITY_INVALID");
  }
  for (const [name, id] of [
    ["market_vault_runtime_verification_evidence_id", value.market_vault_runtime_verification_evidence_id],
    ["inventory_lock_evidence_id", value.inventory_lock_evidence_id],
    ["wc_ledger_custody_evidence_id", value.wc_ledger_custody_evidence_id],
    ["opening_claim_binding_id", value.opening_claim_binding_id],
    ["opening_claim_binding_persistence_evidence_id", value.opening_claim_binding_persistence_evidence_id],
    ["participant_control_evidence_id", value.participant_control_evidence_id],
  ]) {
    if (typeof id !== "string" || !SHA256_ID.test(id)) {
      fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_EVIDENCE_REFERENCE_INVALID:" + name);
    }
  }
  for (const [name, digest] of [
    ["bounded_canary_input_file_sha256", value.bounded_canary_input_file_sha256],
    ["market_vault_at_use_file_sha256", value.market_vault_at_use_file_sha256],
    ["ledger_persistence_import_input_file_sha256", value.ledger_persistence_import_input_file_sha256],
    ["opening_request_file_sha256", value.opening_request_file_sha256],
    ["opening_claim_binding_file_sha256", value.opening_claim_binding_file_sha256],
    ["opening_claim_persistence_receipt_file_sha256", value.opening_claim_persistence_receipt_file_sha256],
    ["opening_replay_capsule_file_sha256", value.opening_replay_capsule_file_sha256],
    ["opening_replay_inspection_receipt_file_sha256", value.opening_replay_inspection_receipt_file_sha256],
    ["participant_at_use_file_sha256", value.participant_at_use_file_sha256],
  ]) {
    if (typeof digest !== "string" || !HEX64.test(digest)) {
      fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_FILE_DIGEST_INVALID:" + name);
    }
  }

  const authority = exactObject(
    value.authority,
    Object.keys(VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1),
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_SHAPE_INVALID",
  );
  if (
    canonicalJson(authority) !==
      canonicalJson(VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1)
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_MISMATCH");
  }

  const digest = sha256(
    Buffer.from(canonicalJson(withoutSemanticIds(value)), "utf8"),
  );
  if (
    typeof value.semantic_evidence_id !== "string" ||
    !SHA256_ID.test(value.semantic_evidence_id) ||
    value.semantic_evidence_id !== "sha256:" + digest ||
    typeof value.promotion_id !== "string" ||
    !SEMANTIC_PROMOTION_ID.test(value.promotion_id) ||
    value.promotion_id !== "voidwcbcsp1_" + digest
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_CONTENT_ID_MISMATCH");
  }

  const observed = canonicalUtc(
    value.observed_at_utc,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_OBSERVED_TIME_INVALID",
  );
  const semanticEvaluation = canonicalUtc(
    value.evaluation_time_utc,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_EVALUATION_TIME_INVALID",
  );
  const validUntil = canonicalUtc(
    value.valid_until_utc,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_VALID_UNTIL_INVALID",
  );
  if (
    observed > semanticEvaluation ||
    semanticEvaluation > validUntil
  ) {
    fail("BOUNDED_CANARY_SEMANTIC_PROMOTION_TIME_WINDOW_INVALID");
  }

  return value;
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

export function promoteWcVoidBoundedCanaryCandidatesV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_INPUT_SHAPE",
  );
  const semanticSource = parseJsonBytes(
    request.semantic_promotion_bytes,
    request.semantic_promotion_file_sha256,
    "BOUNDED_CANARY_SEMANTIC_PROMOTION_FILE",
  );
  const productionSource = parseJsonBytes(
    request.production_candidate_bytes,
    request.production_candidate_file_sha256,
    "BOUNDED_CANARY_PRODUCTION_CANDIDATE_FILE",
  );
  const coupledSource = parseJsonBytes(
    request.coupled_candidate_bytes,
    request.coupled_candidate_file_sha256,
    "BOUNDED_CANARY_COUPLED_CANDIDATE_FILE",
  );
  const successorSource = parseJsonBytes(
    request.successor_candidate_bytes,
    request.successor_candidate_file_sha256,
    "BOUNDED_CANARY_SUCCESSOR_CANDIDATE_FILE",
  );

  const repository = bindReviewedRepositorySourceV1(request, {
    production: productionSource,
    coupled: coupledSource,
    successor: successorSource,
  });

  const semantic = validateSemanticPromotion(semanticSource.value);
  const production = productionSource.value;
  const coupled = coupledSource.value;
  const successor = successorSource.value;

  if (
    production?.status !== "hold" ||
    production?.chain_id !== 2050 ||
    production?.pair !== "WC_VOID" ||
    production?.bounded_canary_green !== false ||
    production?.coupled_activation_ready !== false
  ) {
    fail("BOUNDED_CANARY_PRODUCTION_CANDIDATE_PRESTATE_INVALID");
  }
  if (
    coupled?.status !== "HOLD" ||
    coupled?.chain_id !== 2050 ||
    coupled?.execution_epoch !== 2 ||
    coupled?.gates?.bounded_canary_green !== false ||
    coupled?.gates?.coupled_activation_ready !== false ||
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id !==
      semantic.coupled_launch_id
  ) {
    fail("BOUNDED_CANARY_COUPLED_CANDIDATE_PRESTATE_INVALID");
  }

  const productionBefore = classifyVoidWcVoidProductionReadinessV1(production);
  const coupledBefore = classifyVoidCoupledEconomicSuccessorGateV1(
    coupled,
    successor,
  );
  if (
    productionBefore?.ok !== false ||
    productionBefore.status !== "HOLD" ||
    productionBefore.reason !== "production_gates_incomplete" ||
    !Array.isArray(productionBefore.missing_gates) ||
    !productionBefore.missing_gates.includes("bounded_canary_required") ||
    !productionBefore.missing_gates.includes("coupled_activation_ready_required")
  ) {
    fail("BOUNDED_CANARY_PRODUCTION_CLASSIFIER_PRESTATE_INVALID");
  }
  if (
    coupledBefore?.ok !== false ||
    coupledBefore.status !== "HOLD" ||
    coupledBefore.reason !== "coupled_economic_gates_incomplete" ||
    !Array.isArray(coupledBefore.missing_gates) ||
    !coupledBefore.missing_gates.includes("bounded_canary_required") ||
    !coupledBefore.missing_gates.includes("coupled_activation_ready_required")
  ) {
    fail("BOUNDED_CANARY_COUPLED_CLASSIFIER_PRESTATE_INVALID");
  }

  const promotedProduction = structuredClone(production);
  promotedProduction.bounded_canary_green = true;
  const promotedCoupled = structuredClone(coupled);
  promotedCoupled.gates = structuredClone(coupled.gates);
  promotedCoupled.gates.bounded_canary_green = true;

  const resetProduction = structuredClone(promotedProduction);
  resetProduction.bounded_canary_green = false;
  const resetCoupled = structuredClone(promotedCoupled);
  resetCoupled.gates = structuredClone(promotedCoupled.gates);
  resetCoupled.gates.bounded_canary_green = false;
  if (canonicalJson(resetProduction) !== canonicalJson(production)) {
    fail("BOUNDED_CANARY_PRODUCTION_CANDIDATE_CHANGE_SCOPE_INVALID");
  }
  if (canonicalJson(resetCoupled) !== canonicalJson(coupled)) {
    fail("BOUNDED_CANARY_COUPLED_CANDIDATE_CHANGE_SCOPE_INVALID");
  }

  const productionAfter =
    classifyVoidWcVoidProductionReadinessV1(promotedProduction);
  const coupledAfter =
    classifyVoidCoupledEconomicSuccessorGateV1(promotedCoupled, successor);
  const expectedProductionMissing = minusOne(
    productionBefore.missing_gates,
    "bounded_canary_required",
  );
  const expectedCoupledMissing = minusOne(
    coupledBefore.missing_gates,
    "bounded_canary_required",
  );
  if (
    productionAfter?.ok !== false ||
    productionAfter.status !== "HOLD" ||
    productionAfter.reason !== "production_gates_incomplete" ||
    !sameStrings(productionAfter.missing_gates, expectedProductionMissing)
  ) {
    fail("BOUNDED_CANARY_PRODUCTION_CLASSIFIER_POSTSTATE_INVALID");
  }
  if (
    coupledAfter?.ok !== false ||
    coupledAfter.status !== "HOLD" ||
    coupledAfter.reason !== "coupled_economic_gates_incomplete" ||
    !sameStrings(coupledAfter.missing_gates, expectedCoupledMissing)
  ) {
    fail("BOUNDED_CANARY_COUPLED_CLASSIFIER_POSTSTATE_INVALID");
  }

  if (
    promotedProduction.status !== "hold" ||
    promotedProduction.coupled_activation_ready !== false ||
    promotedCoupled.status !== "HOLD" ||
    promotedCoupled.gates.coupled_activation_ready !== false ||
    Object.values(promotedProduction.authority || {}).some((value) => value !== false) ||
    Object.values(promotedCoupled.authority || {}).some((value) => value !== false)
  ) {
    fail("BOUNDED_CANARY_CANDIDATE_AUTHORITY_BOUNDARY_INVALID");
  }

  const frozenProduction = deepFreeze(promotedProduction);
  const frozenCoupled = deepFreeze(promotedCoupled);
  const material = Object.freeze({
    marker: VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1,
    version: 1,
    status: "BOUNDED_CANARY_CANDIDATE_PROMOTION_READY_FINAL_ACTIVATION_HOLD",
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: semantic.coupled_launch_id,
    repository_head_sha: repository.repository_head_sha,
    repository_tree_sha: repository.repository_tree_sha,
    reviewed_source_commit_sha: repository.reviewed_source_commit_sha,
    semantic_promotion_tool_git_blob_sha1:
      repository.semantic_promotion_tool_git_blob_sha1,
    semantic_promotion_proof_git_blob_sha1:
      repository.semantic_promotion_proof_git_blob_sha1,
    production_candidate_git_blob_sha1:
      repository.production_candidate_git_blob_sha1,
    coupled_candidate_git_blob_sha1:
      repository.coupled_candidate_git_blob_sha1,
    successor_candidate_git_blob_sha1:
      repository.successor_candidate_git_blob_sha1,
    production_classifier_git_blob_sha1:
      repository.production_classifier_git_blob_sha1,
    coupled_classifier_git_blob_sha1:
      repository.coupled_classifier_git_blob_sha1,
    successor_classifier_git_blob_sha1:
      repository.successor_classifier_git_blob_sha1,
    package_json_git_blob_sha1:
      repository.package_json_git_blob_sha1,
    package_lock_git_blob_sha1:
      repository.package_lock_git_blob_sha1,
    reviewed_binding_count: repository.reviewed_binding_count,
    reviewed_binding_manifest_sha256:
      repository.reviewed_binding_manifest_sha256,
    candidate_promotion_tool_git_blob_sha1:
      repository.candidate_promotion_tool_git_blob_sha1,
    canonical_candidate_bytes_bound_to_reviewed_head_blobs: true,
    semantic_source_contract_generation_bound: true,
    reviewed_dependency_closure_bound: true,
    package_dependency_state_bound: true,
    semantic_evaluation_time_utc: semantic.evaluation_time_utc,
    semantic_valid_until_utc: semantic.valid_until_utc,
    semantic_promotion_id: semantic.promotion_id,
    semantic_evidence_id: semantic.semantic_evidence_id,
    reviewed_policy_id: semantic.reviewed_policy_id,
    canary_evidence_id: semantic.canary_evidence_id,
    semantic_promotion_file_sha256: semanticSource.sha256,
    production_candidate_file_sha256: productionSource.sha256,
    coupled_candidate_file_sha256: coupledSource.sha256,
    successor_candidate_file_sha256: successorSource.sha256,
    promoted_production_fields: Object.freeze(["bounded_canary_green"]),
    promoted_coupled_gates: Object.freeze(["bounded_canary_green"]),
    promoted_production_candidate_sha256:
      sha256(Buffer.from(canonicalJson(frozenProduction), "utf8")),
    promoted_coupled_candidate_sha256:
      sha256(Buffer.from(canonicalJson(frozenCoupled), "utf8")),
    promoted_production_candidate: frozenProduction,
    promoted_coupled_candidate: frozenCoupled,
    production_before: summarize(productionBefore),
    production_after: summarize(productionAfter),
    coupled_before: summarize(coupledBefore),
    coupled_after: summarize(coupledAfter),
    semantic_canary_fresh_at_reviewed_evaluation: true,
    application_time_authority: false,
    bounded_canary_green: true,
    production_status_remains_hold: true,
    coupled_status_remains_hold: true,
    coupled_activation_ready: false,
    canonical_production_candidate_updated: false,
    canonical_coupled_candidate_updated: false,
    candidate_promotion_application_required: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_AUTHORITY_V1,
  });
  const digest = sha256(Buffer.from(canonicalJson(material), "utf8"));
  return Object.freeze({
    ...material,
    promotion_id: "voidwcbccp1_" + digest,
  });
}
