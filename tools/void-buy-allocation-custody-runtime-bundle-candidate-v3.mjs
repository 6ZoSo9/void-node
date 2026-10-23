#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3 =
  "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SCHEMA_V3 =
  "void_buy_void_custody_runtime_bundle_candidate_v3";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V3 =
  Object.freeze({
    source_candidate_only: true,
    runtime_entrypoint_bound: true,
    package_free_runtime_required: true,
    compiled_runtime_closure_bound: true,
    build_source_closure_bound: true,
    compiler_identity_bound: true,
    three_node_byte_equality_required: true,
    predecessor_v2_preserved: true,
    claim_reader_fifo_nonblocking_source_bound: true,
    allocation_reader_fifo_nonblocking_source_bound: true,
    payment_reader_fifo_nonblocking_source_bound: true,
    allocation_reader_independent_review_complete: false,
    payment_reader_independent_review_complete: false,
    claim_reader_independent_review_complete: false,
    candidate_accepted: false,
    immutable_root_install: false,
    node_binary_identity_verified: false,
    request_root_selected: false,
    shared_directory_selected: false,
    service_unit_installed: false,
    service_started: false,
    service_restarted: false,
    systemd_mutation: false,
    runtime_integration: false,
    reserve_method_enabled: false,
    recover_method_enabled: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "tools/void-buy-allocation-custody-service-v2.mjs";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
// Immutable hosted Node 22/24/26 equality receipt, run 39680421006.
// An arbitrary recomputed self-hash is NOT independently accepted evidence.
export const VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_ID =
  "UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_ID";
export const VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_SHA256 =
  "UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_SHA256";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2 =
  Object.freeze({
    source_base_head: "9b6ff6892805cf9d7269d146e308970523c6cffe",
    source_base_tree: "78926fd8db4f6dde314909f6608a9a404329c968",
    predecessor_tool_git_blob_sha1: "e89de29684b2e26bbfd05e2eed46a56d45c4de43",
    predecessor_proof_git_blob_sha1: "f72dfa6e4345197dcdc97927eaad54feea41f012",
    predecessor_doc_git_blob_sha1: "0d3aa035204d4cde3c69fb0dbfee79a17dfa142a",
    predecessor_workflow_git_blob_sha1: "275ed732f861930b896e551782ae4f60009db174",
    predecessor_v2_hosted_candidate_id:
      "voidbuycustodybundle2_85d68cef4b2ed3e682efb665c41d8d918bd00908bb5f3aa486dedc3f7e74d0a6",
    predecessor_v2_hosted_candidate_sha256:
      "5edc11a1960389a25c48534b8fff90397fd58a1ec61d174fba455de23987d4f9",
    allocation_reader_predecessor_git_blob_sha1:
      "1bf88a403b1012ac00edaf634c5ed237a898043c",
    allocation_reader_successor_git_blob_sha1:
      "0bfc2e09ee26cbaefb18d3be1a5a65a4afa9dbcb",
    payment_reader_predecessor_git_blob_sha1:
      "79eb8c39529583fffdb083173fb37b1f32075a14",
    payment_reader_successor_git_blob_sha1:
      "e6fbd5b54891ee25daaeb8ae4e6f26073ed71420",
    cross_uid_reader_retained_git_blob_sha1:
      "94f0a0dd8997e1e2c0fab54044f19d70d983d441",
    source_transition_count: 2,
  });

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3 =
  Object.freeze({
    "tools/void-buy-allocation-custody-service-v2.mjs":
      "3afcc450b11f93209253a5cc10b300596942d07d",
    "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs":
      "0bfc2e09ee26cbaefb18d3be1a5a65a4afa9dbcb",
    "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs":
      "e6fbd5b54891ee25daaeb8ae4e6f26073ed71420",
    "src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs":
      "94f0a0dd8997e1e2c0fab54044f19d70d983d441",
    "src/economic/buy_void_allocation_reservation_ledger_v1.ts":
      "8d84955e1e093a5c5af63241e62b8722fadd2f29",
    "src/economic/buy_void_allocation_reservation_high_water_v1.ts":
      "9383c94cf848efb9a0112f1b741df4e10f790ac6",
    "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
      "b451bcd895986dadaf6e53954671062068316ccf",
    "src/economic/buy_void_auto_fulfillment_v1.ts":
      "b7c963b1d55f000d82ad82289b31107b432503de",
    "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts":
      "e284a38a4b7f3d498b07e77c661d6eef3b742e7a",
    "src/economic/buy_void_preappend_plain_input_v1.ts":
      "945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f",
    "src/economic/buy_void_execution_attempt_journal_v1.ts":
      "536b6f6970c3aaf48b1ae0dec3a0356ad7c3a7fe",
    "src/economic/buy_void_inventory_reservation_journal_v1.ts":
      "dc15061a3c4f09ec31da678aa26a731708e70d6c",
    "src/economic/buy_void_verified_payment_v2.ts":
      "550ede02fc0b7d6874c324af58b5ef9c5591b311",
    "src/economic/buy_void_fulfillment_confirmation_v1.ts":
      "31c8ce9b88c86d32e187ed2ca7d0a23344fbd113",
    "src/economic/buy_void_fulfillment_journal_v1.ts":
      "7c4b099d835b84f50867e873fca763767c80c015",
    "src/economic/buy_void_broadcast_outcome_journal_v1.ts":
      "de8765d306c9ba1153ade10f0e5db92823ef3e39",
    "package.json": "14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
    "package-lock.json": "15b5c82ea36f13079a2f9e8863722f654eb3f201",
    "tsconfig.build.json": "d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
  });

export const VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V3 =
  Object.freeze([
    "dist/economic/buy_void_allocation_reservation_high_water_v1.js",
    "dist/economic/buy_void_allocation_reservation_ledger_v1.js",
    "dist/economic/buy_void_auto_fulfillment_v1.js",
    "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
    "dist/economic/buy_void_preappend_plain_input_v1.js",
    "dist/economic/buy_void_verified_allocation_replay_binding_v1.js",
    "src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs",
    "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs",
    "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs",
    "tools/void-buy-allocation-custody-service-v2.mjs",
  ]);

const EXPECTED_COMPILED_RUNTIME_FILES = new Set(
  VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V3.filter((value) =>
    value.startsWith("dist/"),
  ),
);

function fail(code) {
  throw new Error(code);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  const prefix = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return crypto.createHash("sha1").update(prefix).update(bytes).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJsonV3(value) {
  return JSON.stringify(canonicalize(value));
}

function safeRelative(root, absolute) {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (
    !relative ||
    relative === "." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  ) {
    fail("custody_bundle_path_outside_repository");
  }
  return relative;
}

// Read only exact regular files through retained no-follow, nonblocking
// descriptors. Every ancestor is opened as a directory via /proc/self/fd.
function sameOpenedGeneration(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function descriptorBoundRegularReadV3(absolute, maximum, code) {
  const { O_RDONLY, O_DIRECTORY, O_NOFOLLOW, O_NONBLOCK } = fs.constants;
  if ([O_RDONLY, O_DIRECTORY, O_NOFOLLOW, O_NONBLOCK].some(
    value => typeof value !== "number") ||
    !fs.existsSync("/proc/self/fd") ||
    !path.isAbsolute(absolute) || path.resolve(absolute) !== absolute ||
    !Number.isSafeInteger(maximum) || maximum < 1 ||
    maximum > 32 * 1024 * 1024) {
    fail("custody_bundle_descriptor_read_capability_invalid");
  }
  const components = absolute.split("/").filter(Boolean);
  if (components.length === 0 || components.some(
    name => name === "." || name === ".." || name.includes("\0"))) {
    fail(code + "_path_invalid");
  }
  let parentFd = -1;
  let fileFd = -1;
  const directoryFlags = O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_NONBLOCK;
  try {
    parentFd = fs.openSync("/", directoryFlags);
    for (const name of components.slice(0, -1)) {
      const child = "/proc/self/fd/" + String(parentFd) + "/" + name;
      const beforeDir = fs.lstatSync(child, { bigint: true });
      if (!beforeDir.isDirectory() || beforeDir.isSymbolicLink()) {
        fail(code + "_ancestor_not_direct_directory");
      }
      let nextFd = -1;
      try {
        nextFd = fs.openSync(child, directoryFlags);
        const openedDir = fs.fstatSync(nextFd, { bigint: true });
        if (!openedDir.isDirectory() ||
            !sameOpenedGeneration(beforeDir, openedDir)) {
          fail(code + "_ancestor_rebound");
        }
        fs.closeSync(parentFd);
        parentFd = nextFd;
        nextFd = -1;
      } finally {
        if (nextFd >= 0) fs.closeSync(nextFd);
      }
    }

    const leaf = "/proc/self/fd/" + String(parentFd) + "/" +
      components.at(-1);
    const visibleBefore = fs.lstatSync(leaf, { bigint: true });
    const withinLimit = st => st.isFile() && !st.isSymbolicLink() &&
      st.nlink === 1n && st.size > 0n && st.size <= BigInt(maximum);
    if (!withinLimit(visibleBefore)) {
      fail(code + "_file_not_direct_regular_or_size_invalid");
    }
    fileFd = fs.openSync(leaf, O_RDONLY | O_NOFOLLOW | O_NONBLOCK);
    const before = fs.fstatSync(fileFd, { bigint: true });
    if (!withinLimit(before) ||
        !sameOpenedGeneration(visibleBefore, before)) {
      fail(code + "_open_generation_invalid");
    }
    const size = Number(before.size);
    const out = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fileFd, out, offset,
        Math.min(65536, size - offset), offset);
      if (count <= 0) fail(code + "_short_read");
      offset += count;
    }
    const extra = Buffer.alloc(1);
    if (fs.readSync(fileFd, extra, 0, 1, size) !== 0) {
      fail(code + "_growth_after_bounded_read");
    }
    const after = fs.fstatSync(fileFd, { bigint: true });
    const stillPinned = fs.lstatSync(leaf, { bigint: true });
    const stillVisible = fs.lstatSync(absolute, { bigint: true });
    if (![after, stillPinned, stillVisible].every(st =>
      withinLimit(st) && sameOpenedGeneration(before, st))) {
      fail(code + "_changed_during_read");
    }
    return out;
  } finally {
    if (fileFd >= 0) fs.closeSync(fileFd);
    if (parentFd >= 0) fs.closeSync(parentFd);
  }
}

function readRegular(root, relative, maximum = 32 * 1024 * 1024) {
  if (typeof relative !== "string" || relative.length === 0 ||
      path.isAbsolute(relative) || relative.split("/").includes("..")) {
    fail("custody_bundle_relative_path_invalid");
  }
  const absolute = path.resolve(root, relative);
  if (safeRelative(root, absolute) !== relative.split(path.sep).join("/")) {
    fail("custody_bundle_relative_path_not_canonical");
  }
  return descriptorBoundRegularReadV3(
    absolute, maximum, "custody_bundle_source");
}

function readCandidateArtifact(candidatePath) {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    fail("custody_bundle_candidate_path_invalid");
  }
  return descriptorBoundRegularReadV3(
    path.resolve(candidatePath), 4 * 1024 * 1024, "custody_bundle_candidate");
}

// These exports only exercise the source-only reader in disposable proofs.
// They never install the runtime, execute custody code or admit a payment.
export function testOnlyReadCustodyBundleSourceV3(root, relative, maximum) {
  return readRegular(root, relative, maximum);
}
export function testOnlyReadCustodyBundleArtifactV3(candidatePath) {
  return readCandidateArtifact(candidatePath);
}

function verifyPredecessorV2SourceGeneration(root) {
  // Exact reviewed predecessor V2 source/tool/proof identity, never execute
  // imported code from mutable predecessor paths.
  const pinned = Object.freeze({
    "tools/void-buy-allocation-custody-runtime-bundle-candidate-v2.mjs":
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2.predecessor_tool_git_blob_sha1,
    "scripts/prove_void_buy_allocation_custody_runtime_bundle_candidate_v2.mjs":
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2.predecessor_proof_git_blob_sha1,
    "docs/architecture/buy-void-allocation-custody-runtime-bundle-candidate-v2.md":
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2.predecessor_doc_git_blob_sha1,
    ".github/workflows/buy-void-allocation-custody-runtime-bundle-candidate-v2.yml":
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2.predecessor_workflow_git_blob_sha1,
  });
  const records = [];
  for (const [relative, expected] of Object.entries(pinned).sort()) {
    const bytes = readRegular(root, relative, 4 * 1024 * 1024);
    if (gitBlobSha1(bytes) !== expected)
      fail("custody_bundle_predecessor_v2_blob_mismatch:" + relative);
    records.push(Object.freeze({path: relative, git_blob_sha1: expected,
      bytes: bytes.length, sha256: sha256(bytes)}));
  }
  return Object.freeze(records);
}

function verifyPinnedSources(root) {
  const records = [];
  for (const relative of Object.keys(
    VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3,
  ).sort()) {
    const bytes = readRegular(root, relative);
    const observed = gitBlobSha1(bytes);
    const expected =
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3[relative];
    if (observed !== expected) {
      fail("custody_bundle_source_blob_mismatch:" + relative);
    }
    records.push(
      Object.freeze({
        path: relative,
        git_blob_sha1: observed,
        bytes: bytes.length,
        sha256: sha256(bytes),
      }),
    );
  }
  return Object.freeze(records);
}

export function parseRuntimeImportsV3(sourceText) {
  if (typeof sourceText !== "string") {
    fail("custody_bundle_runtime_source_not_text");
  }
  if (/\bimport\s*\(/u.test(sourceText) || /\brequire\s*\(/u.test(sourceText)) {
    fail("custody_bundle_dynamic_loader_forbidden");
  }
  const values = [];
  const patterns = [
    /(?:^|\n)\s*import\s*["']([^"']+)["']\s*;?/gu,
    /(?:^|\n)\s*import\s+[^;]*?\s+from\s*["']([^"']+)["']\s*;?/gu,
    /(?:^|\n)\s*export\s+[^;]*?\s+from\s*["']([^"']+)["']\s*;?/gu,
  ];
  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern)) {
      values.push(match[1]);
    }
  }
  return [...new Set(values)].sort();
}

function runtimeClosure(root) {
  const queue = [ENTRY];
  const seen = new Set();
  const external = new Set();
  const records = [];

  while (queue.length > 0) {
    const relative = queue.shift();
    if (seen.has(relative)) continue;
    seen.add(relative);

    if (
      !relative.startsWith("tools/") &&
      !relative.startsWith("src/economic/") &&
      !relative.startsWith("dist/economic/")
    ) {
      fail("custody_bundle_runtime_path_outside_allowed_roots:" + relative);
    }
    if (relative.includes("node_modules")) {
      fail("custody_bundle_node_modules_runtime_forbidden");
    }

    const bytes = readRegular(root, relative, 8 * 1024 * 1024);
    const text = bytes.toString("utf8");
    const specifiers = parseRuntimeImportsV3(text);
    const resolvedImports = [];

    for (const specifier of specifiers) {
      if (specifier.startsWith("node:")) {
        external.add(specifier);
        resolvedImports.push(specifier);
        continue;
      }
      if (!specifier.startsWith(".")) {
        fail("custody_bundle_third_party_runtime_import:" + specifier);
      }
      const target = path.resolve(root, path.dirname(relative), specifier);
      const targetRelative = safeRelative(root, target);
      if (!fs.existsSync(target)) {
        fail("custody_bundle_relative_runtime_import_missing:" + targetRelative);
      }
      resolvedImports.push(targetRelative);
      queue.push(targetRelative);
    }

    const pinned =
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3[relative] || null;
    if (pinned && gitBlobSha1(bytes) !== pinned) {
      fail("custody_bundle_runtime_source_pin_mismatch:" + relative);
    }

    records.push({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes),
      tracked_source_git_blob_sha1: pinned,
      imports: resolvedImports.sort(),
      runtime_kind: relative.startsWith("dist/")
        ? "compiled_typescript"
        : "tracked_source",
    });
  }

  records.sort((left, right) => left.path.localeCompare(right.path));
  const observed = records.map((record) => record.path);
  const expected = [...VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V3].sort();
  if (canonicalJsonV3(observed) !== canonicalJsonV3(expected)) {
    fail(
      "custody_bundle_runtime_closure_mismatch:" +
        observed.join(","),
    );
  }

  const compiled = records
    .filter((record) => record.runtime_kind === "compiled_typescript")
    .map((record) => record.path);
  if (
    compiled.length !== EXPECTED_COMPILED_RUNTIME_FILES.size ||
    compiled.some((value) => !EXPECTED_COMPILED_RUNTIME_FILES.has(value))
  ) {
    fail("custody_bundle_compiled_runtime_closure_mismatch");
  }

  return Object.freeze({
    files: Object.freeze(records.map((record) => Object.freeze(record))),
    external_node_builtins: Object.freeze([...external].sort()),
  });
}

function compilerIdentity(root) {
  const lock = JSON.parse(readRegular(root, "package-lock.json").toString("utf8"));
  const lockedVersion =
    lock?.packages?.["node_modules/typescript"]?.version;
  if (lockedVersion !== EXPECTED_TYPESCRIPT_VERSION) {
    fail("custody_bundle_typescript_lock_version_mismatch");
  }

  const compilerPackage = JSON.parse(
    readRegular(root, "node_modules/typescript/package.json").toString("utf8"),
  );
  if (compilerPackage.version !== EXPECTED_TYPESCRIPT_VERSION) {
    fail("custody_bundle_installed_typescript_version_mismatch");
  }

  const files = [
    "node_modules/typescript/lib/typescript.js",
    "node_modules/typescript/lib/_tsc.js",
  ].map((relative) => {
    const bytes = readRegular(root, relative, 16 * 1024 * 1024);
    return Object.freeze({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  });

  return Object.freeze({
    typescript_version: EXPECTED_TYPESCRIPT_VERSION,
    compiler_files: Object.freeze(files),
  });
}

function candidateId(body) {
  return (
    "voidbuycustodybundle3_" +
    sha256(Buffer.from(canonicalJsonV3(body) + "\n", "utf8"))
  );
}

export function buildVoidBuyVoidCustodyRuntimeBundleCandidateV3(
  root = ROOT,
) {
  const predecessorSources = verifyPredecessorV2SourceGeneration(root);
  const sourceInputs = verifyPinnedSources(root);
  const runtime = runtimeClosure(root);
  const compiler = compilerIdentity(root);

  const body = {
    schema: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SCHEMA_V3,
    marker: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3,
    version: 2,
    repository: "6ZoSo9/void-node",
    predecessor_v2: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2,
    predecessor_v2_sources: predecessorSources,
    entrypoint: ENTRY,
    runtime_layout: "repository_relative_package_free_v1",
    runtime_files: runtime.files,
    external_node_builtins: runtime.external_node_builtins,
    third_party_runtime_packages: [],
    node_modules_runtime_files: [],
    source_inputs: sourceInputs,
    compiler,
    build_recipe: {
      dependency_install: "npm ci --ignore-scripts --no-audit --no-fund",
      compile: "node node_modules/typescript/bin/tsc -p tsconfig.build.json",
      supported_node_majors: [22, 24, 26],
      three_node_byte_equality_required: true,
    },
    install_target_selected: false,
    request_root_selected: false,
    shared_directory_selected: false,
    node_binary_identity_verified: false,
    candidate_accepted: false,
    runtime_integration: false,
    production_gate_ready: false,
    public_presale_activation: false,
    funds_movement: false,
    authority: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V3,
  };

  return Object.freeze({
    ...body,
    candidate_id: candidateId(body),
  });
}

export function verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    fail("custody_bundle_candidate_shape_invalid");
  }
  const { candidate_id: observedId, ...body } = candidate;
  if (
    typeof observedId !== "string" ||
    observedId !== candidateId(body)
  ) {
    fail("custody_bundle_candidate_id_invalid");
  }
  if (
    body.schema !== VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SCHEMA_V3 ||
    body.marker !== VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3 ||
    body.version !== 2 ||
    body.repository !== "6ZoSo9/void-node" ||
    body.entrypoint !== ENTRY ||
    body.runtime_layout !== "repository_relative_package_free_v1" ||
    body.install_target_selected !== false ||
    body.request_root_selected !== false ||
    body.shared_directory_selected !== false ||
    body.node_binary_identity_verified !== false ||
    body.candidate_accepted !== false ||
    body.runtime_integration !== false ||
    body.production_gate_ready !== false ||
    body.public_presale_activation !== false ||
    body.funds_movement !== false
  ) {
    fail("custody_bundle_candidate_identity_invalid");
  }
  if (
    canonicalJsonV3(body.predecessor_v2) !==
      canonicalJsonV3(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V2)
  ) {
    fail("custody_bundle_candidate_predecessor_invalid");
  }
  if (
    canonicalJsonV3(body.authority) !==
      canonicalJsonV3(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V3)
  ) {
    fail("custody_bundle_candidate_authority_invalid");
  }
  const exactPredecessorSourcePaths = [
    ".github/workflows/buy-void-allocation-custody-runtime-bundle-candidate-v2.yml",
    "docs/architecture/buy-void-allocation-custody-runtime-bundle-candidate-v2.md",
    "scripts/prove_void_buy_allocation_custody_runtime_bundle_candidate_v2.mjs",
    "tools/void-buy-allocation-custody-runtime-bundle-candidate-v2.mjs",
  ];
  const predecessorGitBlobs = [
    body.predecessor_v2.predecessor_workflow_git_blob_sha1,
    body.predecessor_v2.predecessor_doc_git_blob_sha1,
    body.predecessor_v2.predecessor_proof_git_blob_sha1,
    body.predecessor_v2.predecessor_tool_git_blob_sha1,
  ];
  if (!Array.isArray(body.predecessor_v2_sources) ||
      body.predecessor_v2_sources.length !== 4 ||
      body.predecessor_v2_sources.some((rec, i) =>
        !rec || rec.path !== exactPredecessorSourcePaths[i] ||
        rec.git_blob_sha1 !== predecessorGitBlobs[i] ||
        !Number.isSafeInteger(rec.bytes) || rec.bytes < 1 ||
        typeof rec.sha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(rec.sha256))) {
    fail("custody_bundle_predecessor_v2_sources_invalid");
  }
  if (!Array.isArray(body.runtime_files)) {
    fail("custody_bundle_candidate_runtime_files_invalid");
  }
  const runtimePaths = body.runtime_files
    .map((record) => record?.path)
    .sort();
  const expectedRuntimePaths = [
    ...VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V3,
  ].sort();
  if (
    canonicalJsonV3(runtimePaths) !==
    canonicalJsonV3(expectedRuntimePaths)
  ) {
    fail("custody_bundle_candidate_runtime_files_invalid");
  }

  if (!Array.isArray(body.source_inputs)) {
    fail("custody_bundle_candidate_source_inputs_invalid");
  }
  const expectedSourcePaths = Object.keys(
    VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3,
  ).sort();
  const observedSourcePaths = body.source_inputs
    .map((record) => record?.path)
    .sort();
  if (
    canonicalJsonV3(observedSourcePaths) !==
    canonicalJsonV3(expectedSourcePaths)
  ) {
    fail("custody_bundle_candidate_source_inputs_invalid");
  }
  for (const record of body.source_inputs) {
    if (
      !record ||
      record.git_blob_sha1 !==
        VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V3[record.path]
    ) {
      fail("custody_bundle_candidate_source_pin_invalid");
    }
  }
  if (
    body.compiler?.typescript_version !== EXPECTED_TYPESCRIPT_VERSION ||
    !Array.isArray(body.compiler?.compiler_files) ||
    body.compiler.compiler_files.length !== 2
  ) {
    fail("custody_bundle_candidate_compiler_identity_invalid");
  }

  const expectedRecipe = Object.freeze({
    dependency_install: "npm ci --ignore-scripts --no-audit --no-fund",
    compile: "node node_modules/typescript/bin/tsc -p tsconfig.build.json",
    supported_node_majors: [22, 24, 26],
    three_node_byte_equality_required: true,
  });
  if (canonicalJsonV3(body.build_recipe) !==
      canonicalJsonV3(expectedRecipe) ||
      !Array.isArray(body.external_node_builtins) ||
      body.external_node_builtins.length === 0 ||
      body.external_node_builtins.some(name =>
        typeof name !== "string" || !name.startsWith("node:"))) {
    fail("custody_bundle_candidate_build_or_import_contract_invalid");
  }
  if (
    !Array.isArray(body.third_party_runtime_packages) ||
    body.third_party_runtime_packages.length !== 0 ||
    !Array.isArray(body.node_modules_runtime_files) ||
    body.node_modules_runtime_files.length !== 0
  ) {
    fail("custody_bundle_candidate_package_free_invalid");
  }
  // No V3 independent hosted generation has yet been accepted. This
  // structural verifier cannot confer deployment or release authority.
  if (VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_ID !==
        "UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_ID" ||
      VOID_BUY_VOID_CUSTODY_RUNTIME_V3_HOSTED_SHA256 !==
        "UNACCEPTED_PENDING_HOSTED_V3_BUNDLE_SHA256") {
    fail("custody_bundle_v3_hosted_authority_unexpected");
  }
  return true;
}

function emitCandidate(output) {
  const candidate = buildVoidBuyVoidCustodyRuntimeBundleCandidateV3(ROOT);
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3(candidate);
  const bytes = Buffer.from(canonicalJsonV3(candidate) + "\n", "utf8");
  fs.writeFileSync(output, bytes, { flag: "wx", mode: 0o600 });
  console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3_GREEN");
  console.log("runtime_file_count=" + candidate.runtime_files.length);
  console.log(
    "compiled_runtime_file_count=" +
      candidate.runtime_files.filter(
        (record) => record.runtime_kind === "compiled_typescript",
      ).length,
  );
  console.log("third_party_runtime_packages=0");
  console.log("node_modules_runtime_files=0");
  console.log("candidate_accepted=false");
  console.log("v3_hosted_identity_authenticated=false");
  console.log("service_install=false");
  console.log("runtime_integration=false");
  console.log("production_gate_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("candidate_id=" + candidate.candidate_id);
  console.log("candidate_sha256=" + sha256(bytes));
}

function compareCandidates(paths) {
  if (paths.length !== 3) {
    fail("custody_bundle_compare_requires_three_candidates");
  }
  const bytes = paths.map((candidatePath) =>
    readCandidateArtifact(candidatePath),
  );
  if (!bytes[0].equals(bytes[1]) || !bytes[0].equals(bytes[2])) {
    fail("custody_bundle_three_node_candidate_mismatch");
  }
  const candidate = JSON.parse(bytes[0].toString("utf8"));
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3(candidate);
  console.log(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3_THREE_NODE_GREEN",
  );
  console.log("candidate_id=" + candidate.candidate_id);
  console.log("candidate_sha256=" + sha256(bytes[0]));
  console.log("candidate_accepted=false");
  console.log("runtime_integration=false");
  console.log("funds_movement=false");
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (direct) {
  try {
    if (process.argv[2] === "--emit" && process.argv.length === 4) {
      emitCandidate(process.argv[3]);
    } else if (process.argv[2] === "--compare" && process.argv.length === 6) {
      compareCandidates(process.argv.slice(3));
    } else {
      fail(
        "usage: void-buy-allocation-custody-runtime-bundle-candidate-v3.mjs --emit <new.json> | --compare <node22.json> <node24.json> <node26.json>",
      );
    }
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V3_HOLD",
    );
    console.error("reason=" + String(error?.message || error));
    process.exitCode = 2;
  }
}
