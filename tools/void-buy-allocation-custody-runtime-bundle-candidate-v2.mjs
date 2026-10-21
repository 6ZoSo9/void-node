#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2 =
  "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SCHEMA_V2 =
  "void_buy_void_custody_runtime_bundle_candidate_v2";

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V2 =
  Object.freeze({
    source_candidate_only: true,
    runtime_entrypoint_bound: true,
    package_free_runtime_required: true,
    compiled_runtime_closure_bound: true,
    build_source_closure_bound: true,
    compiler_identity_bound: true,
    three_node_byte_equality_required: true,
    predecessor_v1_preserved: true,
    claim_reader_fifo_nonblocking_source_bound: true,
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

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V1 =
  Object.freeze({
    source_base_head: "7197eb96ff3ce2d3f630545a85c150b694d20b3b",
    source_base_tree: "ed7c516dc7d49895a2af576add999c3a5dde945b",
    predecessor_tool_git_blob_sha1: "de5e3066042d1b20d54acea4b464d591b2d88e1c",
    predecessor_proof_git_blob_sha1: "f26ccafea229a25c9774f18effa2fd0727561972",
    predecessor_doc_git_blob_sha1: "34cbfc741c53f9f0b150f1343a4b40aace736907",
    predecessor_workflow_git_blob_sha1: "961c48c227696b5d9f4000e89797e4fcebe101b6",
    claim_reader_predecessor_git_blob_sha1:
      "a7610b03d394254c760683f0d9061aa0865718db",
    claim_reader_successor_git_blob_sha1:
      "94f0a0dd8997e1e2c0fab54044f19d70d983d441",
    source_transition_count: 1,
  });

export const VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2 =
  Object.freeze({
    "tools/void-buy-allocation-custody-service-v2.mjs":
      "3afcc450b11f93209253a5cc10b300596942d07d",
    "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs":
      "1bf88a403b1012ac00edaf634c5ed237a898043c",
    "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs":
      "79eb8c39529583fffdb083173fb37b1f32075a14",
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

export const VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V2 =
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
  VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V2.filter((value) =>
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

export function canonicalJsonV2(value) {
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

function readRegular(root, relative, maximum = 32 * 1024 * 1024) {
  if (
    typeof relative !== "string" ||
    relative.length === 0 ||
    path.isAbsolute(relative) ||
    relative.split("/").includes("..")
  ) {
    fail("custody_bundle_relative_path_invalid");
  }
  const absolute = path.resolve(root, relative);
  if (safeRelative(root, absolute) !== relative.split(path.sep).join("/")) {
    fail("custody_bundle_relative_path_not_canonical");
  }
  const st = fs.lstatSync(absolute);
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1) {
    fail("custody_bundle_file_not_direct_regular:" + relative);
  }
  if (st.size < 1 || st.size > maximum) {
    fail("custody_bundle_file_size_invalid:" + relative);
  }
  return fs.readFileSync(absolute);
}

function readCandidateArtifact(candidatePath) {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    fail("custody_bundle_candidate_path_invalid");
  }
  const absolute = path.resolve(candidatePath);
  const st = fs.lstatSync(absolute);
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1) {
    fail("custody_bundle_candidate_file_not_direct_regular");
  }
  if (st.size < 1 || st.size > 4 * 1024 * 1024) {
    fail("custody_bundle_candidate_file_size_invalid");
  }
  return fs.readFileSync(absolute);
}

function verifyPinnedSources(root) {
  const records = [];
  for (const relative of Object.keys(
    VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2,
  ).sort()) {
    const bytes = readRegular(root, relative);
    const observed = gitBlobSha1(bytes);
    const expected =
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2[relative];
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

export function parseRuntimeImportsV2(sourceText) {
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
    const specifiers = parseRuntimeImportsV2(text);
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
      VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2[relative] || null;
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
  const expected = [...VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V2].sort();
  if (canonicalJsonV2(observed) !== canonicalJsonV2(expected)) {
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
    "voidbuycustodybundle2_" +
    sha256(Buffer.from(canonicalJsonV2(body) + "\n", "utf8"))
  );
}

export function buildVoidBuyVoidCustodyRuntimeBundleCandidateV2(
  root = ROOT,
) {
  const sourceInputs = verifyPinnedSources(root);
  const runtime = runtimeClosure(root);
  const compiler = compilerIdentity(root);

  const body = {
    schema: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SCHEMA_V2,
    marker: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2,
    version: 2,
    repository: "6ZoSo9/void-node",
    predecessor_v1: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V1,
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
    authority: VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V2,
  };

  return Object.freeze({
    ...body,
    candidate_id: candidateId(body),
  });
}

export function verifyVoidBuyVoidCustodyRuntimeBundleCandidateV2(candidate) {
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
    body.schema !== VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SCHEMA_V2 ||
    body.marker !== VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2 ||
    body.version !== 2 ||
    body.repository !== "6ZoSo9/void-node" ||
    body.entrypoint !== ENTRY ||
    body.candidate_accepted !== false ||
    body.runtime_integration !== false ||
    body.production_gate_ready !== false ||
    body.public_presale_activation !== false ||
    body.funds_movement !== false
  ) {
    fail("custody_bundle_candidate_identity_invalid");
  }
  if (
    canonicalJsonV2(body.predecessor_v1) !==
      canonicalJsonV2(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_PREDECESSOR_V1)
  ) {
    fail("custody_bundle_candidate_predecessor_invalid");
  }
  if (
    canonicalJsonV2(body.authority) !==
      canonicalJsonV2(VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_AUTHORITY_V2)
  ) {
    fail("custody_bundle_candidate_authority_invalid");
  }
  if (!Array.isArray(body.runtime_files)) {
    fail("custody_bundle_candidate_runtime_files_invalid");
  }
  const runtimePaths = body.runtime_files
    .map((record) => record?.path)
    .sort();
  const expectedRuntimePaths = [
    ...VOID_BUY_VOID_CUSTODY_RUNTIME_EXPECTED_FILES_V2,
  ].sort();
  if (
    canonicalJsonV2(runtimePaths) !==
    canonicalJsonV2(expectedRuntimePaths)
  ) {
    fail("custody_bundle_candidate_runtime_files_invalid");
  }

  if (!Array.isArray(body.source_inputs)) {
    fail("custody_bundle_candidate_source_inputs_invalid");
  }
  const expectedSourcePaths = Object.keys(
    VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2,
  ).sort();
  const observedSourcePaths = body.source_inputs
    .map((record) => record?.path)
    .sort();
  if (
    canonicalJsonV2(observedSourcePaths) !==
    canonicalJsonV2(expectedSourcePaths)
  ) {
    fail("custody_bundle_candidate_source_inputs_invalid");
  }
  for (const record of body.source_inputs) {
    if (
      !record ||
      record.git_blob_sha1 !==
        VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_SOURCE_BLOBS_V2[record.path]
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

  if (
    !Array.isArray(body.third_party_runtime_packages) ||
    body.third_party_runtime_packages.length !== 0 ||
    !Array.isArray(body.node_modules_runtime_files) ||
    body.node_modules_runtime_files.length !== 0
  ) {
    fail("custody_bundle_candidate_package_free_invalid");
  }
  return true;
}

function emitCandidate(output) {
  const candidate = buildVoidBuyVoidCustodyRuntimeBundleCandidateV2(ROOT);
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV2(candidate);
  const bytes = Buffer.from(canonicalJsonV2(candidate) + "\n", "utf8");
  fs.writeFileSync(output, bytes, { flag: "wx", mode: 0o600 });
  console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2_GREEN");
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
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV2(candidate);
  console.log(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2_THREE_NODE_GREEN",
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
        "usage: void-buy-allocation-custody-runtime-bundle-candidate-v2.mjs --emit <new.json> | --compare <node22.json> <node24.json> <node26.json>",
      );
    }
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2_HOLD",
    );
    console.error("reason=" + String(error?.message || error));
    process.exitCode = 2;
  }
}
