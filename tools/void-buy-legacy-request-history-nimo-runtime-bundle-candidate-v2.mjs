#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1,
  planVoidBuyVoidLegacyHistoryNimoInstallV1,
} from "./void-buy-legacy-request-history-nimo-install-plan-v1.mjs";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2 =
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_SCHEMA_V2 =
  "void_buy_void_legacy_history_nimo_runtime_bundle_candidate_v2";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V2 =
  Object.freeze({
    source_candidate_only: true,
    exact_parent_plan_bound: true,
    parent_reviewed_source_generation_bound: true,
    runtime_entrypoint_bound: true,
    package_free_runtime_required: true,
    complete_transitive_runtime_closure_bound: true,
    compiled_runtime_closure_bound: true,
    compiler_identity_bound: true,
    compiler_cli_entry_chain_bound: true,
    compiler_cli_loader_edges_bound: true,
    compiler_exact_file_identity_allowlist_bound: true,
    compiler_execution_generation_bound: true,
    compiler_private_snapshot_required: true,
    compiler_snapshot_content_addressed: true,
    compiler_package_snapshot_bound: true,
    compiler_snapshot_nonwritable_during_build: true,
    compiler_snapshot_root_custody_required: true,
    compiler_snapshot_builder_uid_direct_mutation_denied: true,
    compiler_source_post_revalidation_required: true,
    compiler_snapshot_post_revalidation_required: true,
    build_input_private_snapshot_required: true,
    build_input_snapshot_content_addressed: true,
    build_input_snapshot_root_custody_required: true,
    build_input_snapshot_builder_uid_direct_mutation_denied: true,
    build_input_snapshot_post_revalidation_required: true,
    build_input_source_generation_bound: true,
    build_input_tsconfig_generation_bound: true,
    build_input_type_packages_bound: true,
    candidate_owned_rebuild_required: true,
    three_node_byte_equality_required: true,
    candidate_report_filesystem_write: true,
    candidate_build_artifact_filesystem_write: true,
    runtime_bundle_candidate_accepted: false,
    runtime_bundle_lock_created: false,
    protected_runtime_install_authorized: false,
    live_nimo_installed: false,
    authorized_keys_mutation_authorized: false,
    public_key_selected: false,
    private_key_access: false,
    witness_read_performed: false,
    witness_append_performed: false,
    sovereign_signing: false,
    payment_acceptance: false,
    transaction: false,
    public_presale_activation: false,
    wc_void_market_activation: false,
    funds_movement: false,
  });

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_PLAN_REL =
  "tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs";
const EXPECTED_PARENT_HEAD =
  "a89523ac7f6e6d013a86054e998fcb51f051ec51";
const EXPECTED_PARENT_PLAN_BLOB =
  "3d41834140eaaca46fb9f5a771278bed49384c65";
const EXPECTED_TYPESCRIPT_VERSION = "5.9.3";
const ENTRY =
  "tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2 =
  Object.freeze([
    "dist/economic/buy_void_allocation_custody_external_witness_v1.js",
    "dist/economic/buy_void_allocation_custody_witness_transport_v1.js",
    "dist/economic/buy_void_allocation_reservation_high_water_v1.js",
    "dist/economic/buy_void_allocation_reservation_ledger_v1.js",
    "dist/economic/buy_void_auto_fulfillment_v1.js",
    "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
    "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
    "dist/security/void_alignment_layer_v1.js",
    "dist/security/void_sovereign_emergency_control_v1.js",
    "tools/void-buy-legacy-request-history-disposition-v1.mjs",
    "tools/void-buy-legacy-request-history-external-witness-v1.mjs",
    "tools/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
    "tools/void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs",
    "tools/void-buy-legacy-request-history-sovereign-authorization-v1.mjs",
  ]);

const EXPECTED_COMPILED_RUNTIME_FILES = new Set(
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2.filter(
    (value) => value.startsWith("dist/"),
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

export function canonicalLegacyHistoryNimoRuntimeBundleJsonV1(value) {
  return JSON.stringify(canonicalize(value));
}

function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(code);
  }
}

function safeRelative(root, absolute) {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (
    !relative ||
    relative === "." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  ) {
    fail("legacy_history_nimo_bundle_path_outside_repository");
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
    fail("legacy_history_nimo_bundle_relative_path_invalid");
  }
  const absolute = path.resolve(root, relative);
  if (safeRelative(root, absolute) !== relative.split(path.sep).join("/")) {
    fail("legacy_history_nimo_bundle_relative_path_not_canonical");
  }
  const st = fs.lstatSync(absolute);
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1) {
    fail("legacy_history_nimo_bundle_file_not_direct_regular:" + relative);
  }
  if (st.size < 1 || st.size > maximum) {
    fail("legacy_history_nimo_bundle_file_size_invalid:" + relative);
  }
  const bytes = fs.readFileSync(absolute);
  if (bytes.length !== st.size) {
    fail("legacy_history_nimo_bundle_file_read_drift:" + relative);
  }
  return bytes;
}

function readCandidateArtifact(candidatePath) {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    fail("legacy_history_nimo_bundle_candidate_path_invalid");
  }
  const absolute = path.resolve(candidatePath);
  const st = fs.lstatSync(absolute);
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1) {
    fail("legacy_history_nimo_bundle_candidate_file_not_direct_regular");
  }
  if (st.size < 1 || st.size > 4 * 1024 * 1024) {
    fail("legacy_history_nimo_bundle_candidate_file_size_invalid");
  }
  return fs.readFileSync(absolute);
}

function parentPlanRecord(root) {
  const bytes = readRegular(root, PARENT_PLAN_REL, 4 * 1024 * 1024);
  if (gitBlobSha1(bytes) !== EXPECTED_PARENT_PLAN_BLOB) {
    fail("legacy_history_nimo_bundle_parent_plan_blob_mismatch");
  }
  const plan = planVoidBuyVoidLegacyHistoryNimoInstallV1();
  if (
    plan.marker !== VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1 ||
    plan.status !== "HOLD_SOURCE_ONLY_INSTALLATION_PLAN" ||
    plan.runtime_bundle?.runtime_bundle_candidate_accepted !== false ||
    plan.runtime_bundle?.complete_transitive_runtime_closure_bound !== false ||
    plan.authorized_key?.options_exact_order_required !== true ||
    plan.authorized_key?.additional_options_forbidden !== true ||
    plan.authorized_key?.exact_line_materialized !== false ||
    plan.authority?.live_nimo_installed !== false ||
    plan.authority?.authorized_keys_mutation_authorized !== false ||
    plan.authority?.public_presale_activation !== false ||
    plan.authority?.funds_movement !== false
  ) {
    fail("legacy_history_nimo_bundle_parent_plan_contract_invalid");
  }
  return Object.freeze({
    exact_parent_head: EXPECTED_PARENT_HEAD,
    path: PARENT_PLAN_REL,
    git_blob_sha1: EXPECTED_PARENT_PLAN_BLOB,
    sha256: sha256(bytes),
    bytes: bytes.length,
    plan_id: plan.plan_id,
  });
}

function parentSourceRootMap() {
  const map = new Map();
  for (const record of VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1) {
    if (
      !record ||
      typeof record.path !== "string" ||
      !/^[0-9a-f]{40}$/u.test(record.git_blob_sha1) ||
      map.has(record.path)
    ) {
      fail("legacy_history_nimo_bundle_parent_source_roots_invalid");
    }
    map.set(record.path, record.git_blob_sha1);
  }
  if (map.size !== 19) {
    fail("legacy_history_nimo_bundle_parent_source_root_count_invalid");
  }
  return map;
}

function verifyParentSourceRoots(root) {
  const map = parentSourceRootMap();
  const records = [];
  for (const relative of [...map.keys()].sort()) {
    const bytes = readRegular(root, relative);
    const observed = gitBlobSha1(bytes);
    const expected = map.get(relative);
    if (observed !== expected) {
      fail("legacy_history_nimo_bundle_source_blob_mismatch:" + relative);
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

export function parseLegacyHistoryNimoRuntimeImportsV1(sourceText) {
  if (typeof sourceText !== "string") {
    fail("legacy_history_nimo_bundle_runtime_source_not_text");
  }
  if (/\bimport\s*\(/u.test(sourceText) || /\brequire\s*\(/u.test(sourceText)) {
    fail("legacy_history_nimo_bundle_dynamic_loader_forbidden");
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
  const parentRoots = parentSourceRootMap();

  while (queue.length > 0) {
    const relative = queue.shift();
    if (seen.has(relative)) continue;
    seen.add(relative);

    const allowed =
      relative.startsWith("tools/") ||
      relative.startsWith("dist/economic/") ||
      relative.startsWith("dist/security/");
    if (!allowed) {
      fail("legacy_history_nimo_bundle_runtime_path_outside_allowed_roots:" + relative);
    }
    if (relative.includes("node_modules")) {
      fail("legacy_history_nimo_bundle_node_modules_runtime_forbidden");
    }

    const bytes = readRegular(root, relative, 8 * 1024 * 1024);
    const text = bytes.toString("utf8");
    const specifiers = parseLegacyHistoryNimoRuntimeImportsV1(text);
    const resolvedImports = [];

    for (const specifier of specifiers) {
      if (specifier.startsWith("node:")) {
        external.add(specifier);
        resolvedImports.push(specifier);
        continue;
      }
      if (!specifier.startsWith(".")) {
        fail("legacy_history_nimo_bundle_third_party_runtime_import:" + specifier);
      }
      const target = path.resolve(root, path.dirname(relative), specifier);
      const targetRelative = safeRelative(root, target);
      if (!fs.existsSync(target)) {
        fail(
          "legacy_history_nimo_bundle_relative_runtime_import_missing:" +
            targetRelative,
        );
      }
      resolvedImports.push(targetRelative);
      queue.push(targetRelative);
    }

    const pinned = parentRoots.get(relative) || null;
    if (pinned && gitBlobSha1(bytes) !== pinned) {
      fail("legacy_history_nimo_bundle_runtime_source_pin_mismatch:" + relative);
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
  const expected = [
    ...VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2,
  ].sort();
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observed) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(expected)
  ) {
    fail("legacy_history_nimo_bundle_runtime_closure_mismatch:" + observed.join(","));
  }

  const compiled = records
    .filter((record) => record.runtime_kind === "compiled_typescript")
    .map((record) => record.path);
  if (
    compiled.length !== EXPECTED_COMPILED_RUNTIME_FILES.size ||
    compiled.some((value) => !EXPECTED_COMPILED_RUNTIME_FILES.has(value))
  ) {
    fail("legacy_history_nimo_bundle_compiled_runtime_closure_mismatch");
  }

  return Object.freeze({
    files: Object.freeze(records.map((record) => Object.freeze(record))),
    external_node_builtins: Object.freeze([...external].sort()),
  });
}

const TYPESCRIPT_COMPILER_FILES_V2 = Object.freeze([
  "node_modules/typescript/bin/tsc",
  "node_modules/typescript/lib/tsc.js",
  "node_modules/typescript/lib/_tsc.js",
  "node_modules/typescript/lib/typescript.js",
]);

const EXPECTED_TYPESCRIPT_COMPILER_FILES_V2 = Object.freeze([
  Object.freeze({
    path: "node_modules/typescript/bin/tsc",
    bytes: 45,
    sha256: "8d5fa5bd883fec0979fc2004f1fe1d99aef40570155d550eadc0b03b55513bf0",
  }),
  Object.freeze({
    path: "node_modules/typescript/lib/tsc.js",
    bytes: 267,
    sha256: "2cffde0b8c6760dfb0b5b0382bbb7e00ba6a8b2d981b9205b256a700a481d983",
  }),
  Object.freeze({
    path: "node_modules/typescript/lib/_tsc.js",
    bytes: 6213092,
    sha256: "e8f349eabd48486bdb2bf9dc1a00c89d58297270c54b745838879e2859194419",
  }),
  Object.freeze({
    path: "node_modules/typescript/lib/typescript.js",
    bytes: 9112572,
    sha256: "3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675",
  }),
]);

const TYPESCRIPT_CLI_EDGES_V2 = Object.freeze([
  Object.freeze({
    kind: "file",
    from: "node_modules/typescript/bin/tsc",
    specifier: "../lib/tsc.js",
    to: "node_modules/typescript/lib/tsc.js",
  }),
  Object.freeze({
    kind: "node_builtin",
    from: "node_modules/typescript/lib/tsc.js",
    specifier: "node:module",
    to: "node:module",
  }),
  Object.freeze({
    kind: "file",
    from: "node_modules/typescript/lib/tsc.js",
    specifier: "./_tsc.js",
    to: "node_modules/typescript/lib/_tsc.js",
  }),
]);

function compilerIdentity(root) {
  const lock = JSON.parse(readRegular(root, "package-lock.json").toString("utf8"));
  const lockedVersion = lock?.packages?.["node_modules/typescript"]?.version;
  if (lockedVersion !== EXPECTED_TYPESCRIPT_VERSION) {
    fail("legacy_history_nimo_bundle_typescript_lock_version_mismatch");
  }
  const compilerPackage = JSON.parse(
    readRegular(root, "node_modules/typescript/package.json").toString("utf8"),
  );
  if (compilerPackage.version !== EXPECTED_TYPESCRIPT_VERSION) {
    fail("legacy_history_nimo_bundle_installed_typescript_version_mismatch");
  }

  const files = TYPESCRIPT_COMPILER_FILES_V2.map((relative) => {
    const bytes = readRegular(root, relative, 16 * 1024 * 1024);
    return Object.freeze({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  });
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(files) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      EXPECTED_TYPESCRIPT_COMPILER_FILES_V2,
    )
  ) {
    fail("legacy_history_nimo_bundle_typescript_compiler_file_identity_mismatch");
  }

  return Object.freeze({
    typescript_version: EXPECTED_TYPESCRIPT_VERSION,
    compiler_files: Object.freeze(files),
    cli_edges: TYPESCRIPT_CLI_EDGES_V2,
  });
}

export function testOnlyLegacyHistoryNimoCompilerIdentityV2(root = ROOT) {
  return compilerIdentity(root);
}

const CANDIDATE_COMPILE_ENV_V2 = Object.freeze({
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  TZ: "UTC",
  NODE_DISABLE_COMPILE_CACHE: "1",
});

const COMPILER_SNAPSHOT_SCHEMA_V2 =
  "void_buy_void_legacy_history_nimo_compiler_snapshot_v2";
const COMPILER_SNAPSHOT_ID_PREFIX_V2 = "voidblrhntscsnap2_";
const COMPILER_SNAPSHOT_PARENT_V2 = "/tmp";
const SUDO_V2 = "/usr/bin/sudo";
const CHOWN_V2 = "/usr/bin/chown";
const RM_V2 = "/usr/bin/rm";

const BUILD_INPUT_SNAPSHOT_SCHEMA_V2 =
  "void_buy_void_legacy_history_nimo_build_input_snapshot_v2";
const BUILD_INPUT_SNAPSHOT_ID_PREFIX_V2 = "voidblrhnbsnap2_";
const BUILD_INPUT_DERIVED_TSCONFIG_V2 =
  "tsconfig.nimo-runtime-bundle-snapshot-v2.json";

const BUILD_INPUT_PROJECT_FILES_V2 = Object.freeze([
  Object.freeze({path:"src/economic/buy_void_allocation_custody_external_witness_v1.ts",git_blob_sha1:"5d24f3fb3e94611c653a0e3e1319afa7d0f4db72"}),
  Object.freeze({path:"src/economic/buy_void_allocation_custody_witness_transport_v1.ts",git_blob_sha1:"a5163272f08d6d96a9c2387fa6db344018e09694"}),
  Object.freeze({path:"src/economic/buy_void_allocation_reservation_high_water_v1.ts",git_blob_sha1:"9383c94cf848efb9a0112f1b741df4e10f790ac6"}),
  Object.freeze({path:"src/economic/buy_void_allocation_reservation_ledger_v1.ts",git_blob_sha1:"8d84955e1e093a5c5af63241e62b8722fadd2f29"}),
  Object.freeze({path:"src/economic/buy_void_auto_fulfillment_v1.ts",git_blob_sha1:"b7c963b1d55f000d82ad82289b31107b432503de"}),
  Object.freeze({path:"src/economic/buy_void_broadcast_outcome_journal_v1.ts",git_blob_sha1:"de8765d306c9ba1153ade10f0e5db92823ef3e39"}),
  Object.freeze({path:"src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",git_blob_sha1:"e284a38a4b7f3d498b07e77c661d6eef3b742e7a"}),
  Object.freeze({path:"src/economic/buy_void_execution_attempt_journal_v1.ts",git_blob_sha1:"536b6f6970c3aaf48b1ae0dec3a0356ad7c3a7fe"}),
  Object.freeze({path:"src/economic/buy_void_filesystem_bakery_lock_v1.ts",git_blob_sha1:"9bd47abb857368d928c0ca289766cdf3571629ba"}),
  Object.freeze({path:"src/economic/buy_void_fulfillment_confirmation_v1.ts",git_blob_sha1:"31c8ce9b88c86d32e187ed2ca7d0a23344fbd113"}),
  Object.freeze({path:"src/economic/buy_void_fulfillment_journal_v1.ts",git_blob_sha1:"7c4b099d835b84f50867e873fca763767c80c015"}),
  Object.freeze({path:"src/economic/buy_void_inventory_reservation_journal_v1.ts",git_blob_sha1:"dc15061a3c4f09ec31da678aa26a731708e70d6c"}),
  Object.freeze({path:"src/economic/buy_void_verified_payment_v2.ts",git_blob_sha1:"550ede02fc0b7d6874c324af58b5ef9c5591b311"}),
  Object.freeze({path:"src/security/void_alignment_layer_v1.ts",git_blob_sha1:"002172c5edfa7d34687eb2aba018795aeb53f9d0"}),
  Object.freeze({path:"src/security/void_sovereign_emergency_control_v1.ts",git_blob_sha1:"1756c395bfb3e3c97aaf98546ae0ec2b59b1bea9"}),
  Object.freeze({path:"package.json",git_blob_sha1:"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f"}),
  Object.freeze({path:"package-lock.json",git_blob_sha1:"15b5c82ea36f13079a2f9e8863722f654eb3f201"}),
  Object.freeze({path:"tsconfig.build.json",git_blob_sha1:"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb"}),
]);
const BUILD_INPUT_COMPILE_FILES_V2 = Object.freeze(
  BUILD_INPUT_PROJECT_FILES_V2.map((record)=>record.path)
    .filter((value)=>value.startsWith("src/")),
);
const BUILD_INPUT_PACKAGE_ROOTS_V2 = Object.freeze([
  Object.freeze({
    path:"node_modules/@types/node",
    version:"22.18.12",
    integrity:"sha512-BICHQ67iqxQGFSzfCFTT7MRQ5XcBjG5aeKh5Ok38UBbPe5fxTyE+aHFxwVrGyr8GNlqFMLKD1D3P2K/1ks8tog==",
  }),
  Object.freeze({
    path:"node_modules/undici-types",
    version:"6.21.0",
    integrity:"sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ==",
  }),
]);
const PRODUCTION_BUILD_INPUT_PROFILE_V2 = Object.freeze({
  project_files: BUILD_INPUT_PROJECT_FILES_V2,
  compile_files: BUILD_INPUT_COMPILE_FILES_V2,
  package_roots: BUILD_INPUT_PACKAGE_ROOTS_V2,
  types: Object.freeze(["node"]),
});

function packageTreeFileRecordsV2(root, relativeRoot, maximumFiles=4096, maximumBytes=128*1024*1024){
  const queue=[relativeRoot], records=[];
  let totalBytes=0;
  while(queue.length){
    const directory=queue.shift();
    const entries=fs.readdirSync(path.resolve(root,directory),{withFileTypes:true})
      .sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      const relative=path.join(directory,entry.name).split(path.sep).join("/");
      const absolute=path.resolve(root,relative);
      const st=fs.lstatSync(absolute);
      if(st.isSymbolicLink()) fail("legacy_history_nimo_bundle_build_input_package_symlink_forbidden:"+relative);
      if(st.isDirectory()){ queue.push(relative); continue; }
      if(!st.isFile()) fail("legacy_history_nimo_bundle_build_input_package_entry_invalid:"+relative);
      const bytes=readRegular(root,relative,32*1024*1024);
      totalBytes+=bytes.length;
      if(records.length>=maximumFiles||totalBytes>maximumBytes){
        fail("legacy_history_nimo_bundle_build_input_package_inventory_too_large");
      }
      records.push(Object.freeze({path:relative,bytes:bytes.length,sha256:sha256(bytes)}));
    }
  }
  records.sort((a,b)=>a.path.localeCompare(b.path));
  return Object.freeze(records);
}

function buildInputPackageSummaryV2(root,spec){
  const lock=JSON.parse(readRegular(root,"package-lock.json").toString("utf8"));
  const locked=lock?.packages?.[spec.path];
  if(locked?.version!==spec.version||locked?.integrity!==spec.integrity){
    fail("legacy_history_nimo_bundle_build_input_package_lock_mismatch:"+spec.path);
  }
  const packageJson=JSON.parse(readRegular(root,spec.path+"/package.json",1024*1024).toString("utf8"));
  if(packageJson.version!==spec.version){
    fail("legacy_history_nimo_bundle_build_input_package_version_mismatch:"+spec.path);
  }
  const files=packageTreeFileRecordsV2(root,spec.path);
  const canonical=canonicalLegacyHistoryNimoRuntimeBundleJsonV1(files)+"\n";
  return Object.freeze({
    path:spec.path,version:spec.version,integrity:spec.integrity,
    file_count:files.length,total_bytes:files.reduce((sum,r)=>sum+r.bytes,0),
    tree_sha256:sha256(Buffer.from(canonical,"utf8")),files,
  });
}

function buildInputProjectFileRecordsV2(root,profile){
  return Object.freeze(profile.project_files.map((record)=>{
    const bytes=readRegular(root,record.path,32*1024*1024);
    const observed=gitBlobSha1(bytes);
    if(observed!==record.git_blob_sha1){
      fail("legacy_history_nimo_bundle_build_input_source_blob_mismatch:"+record.path);
    }
    return Object.freeze({
      path:record.path,git_blob_sha1:observed,bytes:bytes.length,sha256:sha256(bytes),
    });
  }));
}

function buildInputStateV2(root,profile){
  return Object.freeze({
    project_files:buildInputProjectFileRecordsV2(root,profile),
    package_roots:Object.freeze(profile.package_roots.map((spec)=>buildInputPackageSummaryV2(root,spec))),
  });
}

function derivedBuildInputTsconfigBytesV2(profile){
  return Buffer.from(JSON.stringify({
    extends:"./tsconfig.build.json",
    compilerOptions:{types:[...profile.types]},
    files:[...profile.compile_files],
    include:[],
    exclude:[],
  },null,2)+"\n","utf8");
}

function buildInputSnapshotRecordV2(state,profile){
  const derived=derivedBuildInputTsconfigBytesV2(profile);
  const body={
    schema:BUILD_INPUT_SNAPSHOT_SCHEMA_V2,version:2,
    project_files:state.project_files,
    package_roots:state.package_roots.map((record)=>({
      path:record.path,version:record.version,integrity:record.integrity,
      file_count:record.file_count,total_bytes:record.total_bytes,tree_sha256:record.tree_sha256,
    })),
    compile_files:[...profile.compile_files],
    compiler_types:[...profile.types],
    derived_tsconfig_path:BUILD_INPUT_DERIVED_TSCONFIG_V2,
    derived_tsconfig_bytes:derived.length,
    derived_tsconfig_sha256:sha256(derived),
    fixed_parent:COMPILER_SNAPSHOT_PARENT_V2,
    fixed_parent_root_owned_sticky_required:true,
    root_owned_snapshot_required:true,
    directory_mode:"0555",file_mode:"0444",
    builder_uid_direct_mutation_denied:true,
  };
  return Object.freeze({...body,snapshot_id:BUILD_INPUT_SNAPSHOT_ID_PREFIX_V2+
    sha256(Buffer.from(canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body)+"\n","utf8"))});
}

function snapshotAllFileRecordsV2(snapshotRoot){
  const queue=[snapshotRoot],files=[],directories=[];
  while(queue.length){
    const directory=queue.shift();
    directories.push(directory);
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const absolute=path.join(directory,entry.name);
      const st=fs.lstatSync(absolute);
      if(st.isSymbolicLink()) fail("legacy_history_nimo_bundle_build_input_snapshot_symlink_forbidden");
      if(st.isDirectory()) queue.push(absolute);
      else if(st.isFile()) files.push(absolute);
      else fail("legacy_history_nimo_bundle_build_input_snapshot_entry_invalid");
    }
  }
  return {directories,files};
}

function assertBuildInputSnapshotNonwritableV2(snapshotRoot){
  assertFixedSnapshotParentV2();
  const inventory=snapshotAllFileRecordsV2(snapshotRoot);
  for(const directory of inventory.directories){
    const st=fs.lstatSync(directory);
    if(st.uid!==0||st.gid!==0||(st.mode&0o7777)!==0o555){
      fail("legacy_history_nimo_bundle_build_input_snapshot_directory_custody_invalid");
    }
  }
  for(const file of inventory.files){
    const st=fs.lstatSync(file);
    if(!st.isFile()||st.isSymbolicLink()||st.uid!==0||st.gid!==0||st.nlink!==1||(st.mode&0o7777)!==0o444){
      fail("legacy_history_nimo_bundle_build_input_snapshot_file_custody_invalid");
    }
  }
}

function cleanupBuildInputSnapshotV2(snapshotRoot){ cleanupCompilerSnapshotV2(snapshotRoot); }

function createPrivateBuildInputSnapshotV2(sourceRoot,profile){
  assertFixedSnapshotParentV2();
  const before=buildInputStateV2(sourceRoot,profile);
  const snapshotRoot=fs.mkdtempSync(path.join(COMPILER_SNAPSHOT_PARENT_V2,"void-nimo-build-input-snapshot-v2-"));
  try{
    fs.chmodSync(snapshotRoot,0o755);
    const copied=new Set();
    for(const record of before.project_files){
      const bytes=readRegular(sourceRoot,record.path,32*1024*1024);
      const target=path.join(snapshotRoot,record.path);
      fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o755});
      fs.writeFileSync(target,bytes,{flag:"wx",mode:0o444});
      fs.chmodSync(target,0o444);
      copied.add(record.path);
    }
    for(const packageRoot of before.package_roots){
      for(const record of packageRoot.files){
        if(copied.has(record.path)) fail("legacy_history_nimo_bundle_build_input_snapshot_duplicate_path");
        const bytes=readRegular(sourceRoot,record.path,32*1024*1024);
        if(bytes.length!==record.bytes||sha256(bytes)!==record.sha256){
          fail("legacy_history_nimo_bundle_build_input_package_source_drift");
        }
        const target=path.join(snapshotRoot,record.path);
        fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o755});
        fs.writeFileSync(target,bytes,{flag:"wx",mode:0o444});
        fs.chmodSync(target,0o444);
        copied.add(record.path);
      }
    }
    const derived=derivedBuildInputTsconfigBytesV2(profile);
    const derivedTarget=path.join(snapshotRoot,BUILD_INPUT_DERIVED_TSCONFIG_V2);
    fs.writeFileSync(derivedTarget,derived,{flag:"wx",mode:0o444});
    fs.chmodSync(derivedTarget,0o444);
    for(const directory of snapshotAllFileRecordsV2(snapshotRoot).directories.reverse()){
      fs.chmodSync(directory,0o555);
    }
    runPrivilegedSnapshotToolV2(CHOWN_V2,["-R","root:root","--",snapshotRoot],"build_input_chown");
    assertBuildInputSnapshotNonwritableV2(snapshotRoot);
    const snapshotState=buildInputStateV2(snapshotRoot,profile);
    const after=buildInputStateV2(sourceRoot,profile);
    if(canonicalLegacyHistoryNimoRuntimeBundleJsonV1(before)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(snapshotState)||
       canonicalLegacyHistoryNimoRuntimeBundleJsonV1(before)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(after)){
      fail("legacy_history_nimo_bundle_build_input_snapshot_source_mismatch");
    }
    const observedDerived=readRegular(snapshotRoot,BUILD_INPUT_DERIVED_TSCONFIG_V2,1024*1024);
    if(!observedDerived.equals(derived)){
      fail("legacy_history_nimo_bundle_build_input_derived_tsconfig_mismatch");
    }
    return Object.freeze({root:snapshotRoot,state:before,record:buildInputSnapshotRecordV2(before,profile)});
  }catch(error){
    cleanupBuildInputSnapshotV2(snapshotRoot);
    throw error;
  }
}

function typescriptPackageLockIntegrityV2(root) {
  const lock = JSON.parse(readRegular(root, "package-lock.json").toString("utf8"));
  const record = lock?.packages?.["node_modules/typescript"];
  if (
    record?.version !== EXPECTED_TYPESCRIPT_VERSION ||
    typeof record?.integrity !== "string" ||
    !/^sha512-[A-Za-z0-9+/=]+$/u.test(record.integrity)
  ) {
    fail("legacy_history_nimo_bundle_typescript_lock_integrity_invalid");
  }
  return record.integrity;
}

function typescriptPackageFileRecordsV2(root) {
  const start = "node_modules/typescript";
  const queue = [start];
  const records = [];
  let totalBytes = 0;
  while (queue.length > 0) {
    const relativeDirectory = queue.shift();
    const absoluteDirectory = path.resolve(root, relativeDirectory);
    const entries = fs
      .readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relative = path
        .join(relativeDirectory, entry.name)
        .split(path.sep)
        .join("/");
      const absolute = path.resolve(root, relative);
      const st = fs.lstatSync(absolute);
      if (st.isSymbolicLink()) {
        fail("legacy_history_nimo_bundle_typescript_package_symlink_forbidden:" + relative);
      }
      if (st.isDirectory()) {
        queue.push(relative);
        continue;
      }
      if (!st.isFile()) {
        fail("legacy_history_nimo_bundle_typescript_package_entry_invalid:" + relative);
      }
      const bytes = readRegular(root, relative, 32 * 1024 * 1024);
      totalBytes += bytes.length;
      if (records.length >= 2048 || totalBytes > 96 * 1024 * 1024) {
        fail("legacy_history_nimo_bundle_typescript_package_inventory_too_large");
      }
      records.push(
        Object.freeze({
          path: relative,
          bytes: bytes.length,
          sha256: sha256(bytes),
        }),
      );
    }
  }
  records.sort((left, right) => left.path.localeCompare(right.path));
  if (records.length < TYPESCRIPT_COMPILER_FILES_V2.length) {
    fail("legacy_history_nimo_bundle_typescript_package_inventory_incomplete");
  }
  return Object.freeze(records);
}

function typescriptPackageSummaryV2(root) {
  const files = typescriptPackageFileRecordsV2(root);
  const canonical = canonicalLegacyHistoryNimoRuntimeBundleJsonV1(files) + "\n";
  return Object.freeze({
    package_lock_integrity: typescriptPackageLockIntegrityV2(root),
    package_file_count: files.length,
    package_total_bytes: files.reduce((sum, record) => sum + record.bytes, 0),
    package_tree_sha256: sha256(Buffer.from(canonical, "utf8")),
    files,
  });
}

function snapshotPackageSummaryV2(snapshotRoot, packageLockIntegrity) {
  const files = typescriptPackageFileRecordsV2(snapshotRoot);
  const canonical = canonicalLegacyHistoryNimoRuntimeBundleJsonV1(files) + "\n";
  return Object.freeze({
    package_lock_integrity: packageLockIntegrity,
    package_file_count: files.length,
    package_total_bytes: files.reduce((sum, record) => sum + record.bytes, 0),
    package_tree_sha256: sha256(Buffer.from(canonical, "utf8")),
    files,
  });
}

function compilerSnapshotRecordV2(compiler, packageSummary) {
  const body = {
    schema: COMPILER_SNAPSHOT_SCHEMA_V2,
    version: 2,
    layout: "typescript_cli_four_file_relative_v1",
    compiler,
    package_lock_integrity: packageSummary.package_lock_integrity,
    package_file_count: packageSummary.package_file_count,
    package_total_bytes: packageSummary.package_total_bytes,
    package_tree_sha256: packageSummary.package_tree_sha256,
    fixed_parent: COMPILER_SNAPSHOT_PARENT_V2,
    fixed_parent_root_owned_sticky_required: true,
    private_parent_mode: "0555",
    directory_mode: "0555",
    file_mode: "0444",
    custody_uid: 0,
    custody_gid: 0,
    nonwritable_during_build: true,
    builder_uid_direct_mutation_denied: true,
    source_compiler_identity_revalidated_after_build: true,
    snapshot_identity_revalidated_after_build: true,
  };
  return Object.freeze({
    ...body,
    snapshot_id:
      COMPILER_SNAPSHOT_ID_PREFIX_V2 +
      sha256(
        Buffer.from(
          canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body) + "\n",
          "utf8",
        ),
      ),
  });
}

function snapshotCompilerIdentityV2(snapshotRoot) {
  const files = TYPESCRIPT_COMPILER_FILES_V2.map((relative) => {
    const bytes = readRegular(snapshotRoot, relative, 16 * 1024 * 1024);
    return Object.freeze({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  });
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(files) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      EXPECTED_TYPESCRIPT_COMPILER_FILES_V2,
    )
  ) {
    fail("legacy_history_nimo_bundle_compiler_snapshot_identity_mismatch");
  }
  return Object.freeze({
    typescript_version: EXPECTED_TYPESCRIPT_VERSION,
    compiler_files: Object.freeze(files),
    cli_edges: TYPESCRIPT_CLI_EDGES_V2,
  });
}

function compilerSnapshotDirectoriesV2(snapshotRoot) {
  if (!fs.existsSync(snapshotRoot)) return [];
  const directories = [];
  const queue = [snapshotRoot];
  while (queue.length > 0) {
    const directory = queue.shift();
    const st = fs.lstatSync(directory);
    if (!st.isDirectory() || st.isSymbolicLink()) {
      fail("legacy_history_nimo_bundle_compiler_snapshot_directory_invalid");
    }
    directories.push(directory);
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isDirectory()) {
        queue.push(path.join(directory, entry.name));
      }
    }
  }
  return directories;
}

function assertFixedSnapshotParentV2() {
  const st = fs.lstatSync(COMPILER_SNAPSHOT_PARENT_V2);
  if (
    !st.isDirectory() ||
    st.isSymbolicLink() ||
    st.uid !== 0 ||
    (st.mode & 0o1000) === 0 ||
    (st.mode & 0o002) === 0
  ) {
    fail("legacy_history_nimo_bundle_compiler_snapshot_parent_invalid");
  }
}

function assertPrivilegedSnapshotToolV2(tool, label) {
  const st = fs.lstatSync(tool);
  if (
    !st.isFile() ||
    st.isSymbolicLink() ||
    st.uid !== 0 ||
    (st.mode & 0o022) !== 0 ||
    (st.mode & 0o111) === 0
  ) {
    fail("legacy_history_nimo_bundle_snapshot_privileged_tool_invalid:" + label);
  }
}

function runPrivilegedSnapshotToolV2(tool, args, label) {
  assertPrivilegedSnapshotToolV2(SUDO_V2, "sudo");
  assertPrivilegedSnapshotToolV2(tool, label);
  const result = spawnSync(
    SUDO_V2,
    ["-n", tool, ...args],
    {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      encoding: "utf8",
      timeout: 30_000,
      env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
    },
  );
  if (
    result.error ||
    result.status !== 0 ||
    result.signal !== null ||
    result.stdout !== "" ||
    result.stderr !== ""
  ) {
    fail("legacy_history_nimo_bundle_snapshot_privileged_command_failed:" + label);
  }
}

function assertCompilerSnapshotNonwritableV2(snapshotRoot, packageSummary) {
  assertFixedSnapshotParentV2();
  for (const directory of compilerSnapshotDirectoriesV2(snapshotRoot)) {
    const st = fs.lstatSync(directory);
    if (
      !st.isDirectory() ||
      st.isSymbolicLink() ||
      st.uid !== 0 ||
      st.gid !== 0 ||
      (st.mode & 0o7777) !== 0o555
    ) {
      fail("legacy_history_nimo_bundle_compiler_snapshot_directory_custody_invalid");
    }
  }
  for (const record of packageSummary.files) {
    const st = fs.lstatSync(path.join(snapshotRoot, record.path));
    if (
      !st.isFile() ||
      st.isSymbolicLink() ||
      st.nlink !== 1 ||
      st.uid !== 0 ||
      st.gid !== 0 ||
      (st.mode & 0o7777) !== 0o444
    ) {
      fail("legacy_history_nimo_bundle_compiler_snapshot_file_custody_invalid");
    }
  }
}

function cleanupCompilerSnapshotV2(snapshotRoot) {
  if (!fs.existsSync(snapshotRoot)) return;
  runPrivilegedSnapshotToolV2(
    RM_V2,
    ["-rf", "--", snapshotRoot],
    "rm",
  );
  if (fs.existsSync(snapshotRoot)) {
    fail("legacy_history_nimo_bundle_compiler_snapshot_cleanup_failed");
  }
}

function createPrivateCompilerSnapshotV2(
  sourceRoot,
  compiler,
  packageSummary,
) {
  assertFixedSnapshotParentV2();
  const snapshotRoot = fs.mkdtempSync(
    path.join(COMPILER_SNAPSHOT_PARENT_V2, "void-nimo-tsc-snapshot-v2-"),
  );
  try {
    fs.chmodSync(snapshotRoot, 0o755);
    for (const record of packageSummary.files) {
      const bytes = readRegular(sourceRoot, record.path, 32 * 1024 * 1024);
      if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
        fail("legacy_history_nimo_bundle_compiler_snapshot_source_drift");
      }
      const target = path.join(snapshotRoot, record.path);
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      fs.writeFileSync(target, bytes, { flag: "wx", mode: 0o444 });
      fs.chmodSync(target, 0o444);
    }
    for (const directory of compilerSnapshotDirectoriesV2(snapshotRoot).reverse()) {
      fs.chmodSync(directory, 0o555);
    }
    runPrivilegedSnapshotToolV2(
      CHOWN_V2,
      ["-R", "root:root", "--", snapshotRoot],
      "chown",
    );
    assertCompilerSnapshotNonwritableV2(snapshotRoot, packageSummary);
    const observedCompiler = snapshotCompilerIdentityV2(snapshotRoot);
    const observedPackage = snapshotPackageSummaryV2(
      snapshotRoot,
      packageSummary.package_lock_integrity,
    );
    if (
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observedCompiler) !==
        canonicalLegacyHistoryNimoRuntimeBundleJsonV1(compiler) ||
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observedPackage.files) !==
        canonicalLegacyHistoryNimoRuntimeBundleJsonV1(packageSummary.files)
    ) {
      fail("legacy_history_nimo_bundle_compiler_snapshot_source_mismatch");
    }
    return Object.freeze({
      root: snapshotRoot,
      record: compilerSnapshotRecordV2(compiler, packageSummary),
    });
  } catch (error) {
    cleanupCompilerSnapshotV2(snapshotRoot);
    throw error;
  }
}

function compileReviewedRuntimeWithBoundCompilerV2(
  root,
  testHooks = null,
  buildInputProfile = PRODUCTION_BUILD_INPUT_PROFILE_V2,
) {
  const absoluteRoot=path.resolve(root);
  const compilerBefore=compilerIdentity(absoluteRoot);
  const packageBefore=typescriptPackageSummaryV2(absoluteRoot);
  const buildInputSnapshot=createPrivateBuildInputSnapshotV2(absoluteRoot,buildInputProfile);
  const snapshot=createPrivateCompilerSnapshotV2(absoluteRoot,compilerBefore,packageBefore);
  try{
    fs.rmSync(path.join(absoluteRoot,"dist"),{recursive:true,force:true});
    if(typeof testHooks?.after_snapshot_before_build==="function"){
      testHooks.after_snapshot_before_build({
        snapshot_root:snapshot.root,
        compiler_snapshot:snapshot.record,
        build_input_snapshot_root:buildInputSnapshot.root,
        build_input_snapshot:buildInputSnapshot.record,
      });
    }
    const tscEntry=path.join(snapshot.root,"node_modules/typescript/bin/tsc");
    const tsconfig=path.join(buildInputSnapshot.root,BUILD_INPUT_DERIVED_TSCONFIG_V2);
    const result=spawnSync(process.execPath,[
      tscEntry,"-p",tsconfig,"--outDir",path.join(absoluteRoot,"dist"),
    ],{
      cwd:buildInputSnapshot.root,
      env:{...CANDIDATE_COMPILE_ENV_V2},
      encoding:"utf8",timeout:120_000,maxBuffer:2*1024*1024,
    });
    if(result.error) fail("legacy_history_nimo_bundle_candidate_compile_spawn_failed");
    if(result.status!==0||result.signal!==null||result.stdout!==""||result.stderr!==""){
      fail("legacy_history_nimo_bundle_candidate_compile_failed_or_output");
    }
    if(typeof testHooks?.after_build_before_revalidation==="function"){
      testHooks.after_build_before_revalidation({
        snapshot_root:snapshot.root,
        compiler_snapshot:snapshot.record,
        build_input_snapshot_root:buildInputSnapshot.root,
        build_input_snapshot:buildInputSnapshot.record,
      });
    }

    assertCompilerSnapshotNonwritableV2(snapshot.root,packageBefore);
    assertBuildInputSnapshotNonwritableV2(buildInputSnapshot.root);
    const snapshotAfter=snapshotCompilerIdentityV2(snapshot.root);
    const snapshotPackageAfter=snapshotPackageSummaryV2(snapshot.root,packageBefore.package_lock_integrity);
    if(canonicalLegacyHistoryNimoRuntimeBundleJsonV1(snapshotAfter)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(compilerBefore)||
       canonicalLegacyHistoryNimoRuntimeBundleJsonV1(snapshotPackageAfter.files)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(packageBefore.files)){
      fail("legacy_history_nimo_bundle_compiler_snapshot_changed_during_build");
    }

    const buildInputSnapshotAfter=buildInputStateV2(buildInputSnapshot.root,buildInputProfile);
    const buildInputSourceAfter=buildInputStateV2(absoluteRoot,buildInputProfile);
    if(canonicalLegacyHistoryNimoRuntimeBundleJsonV1(buildInputSnapshotAfter)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(buildInputSnapshot.state)||
       canonicalLegacyHistoryNimoRuntimeBundleJsonV1(buildInputSourceAfter)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(buildInputSnapshot.state)){
      fail("legacy_history_nimo_bundle_build_input_generation_changed_during_build");
    }

    const compilerAfter=compilerIdentity(absoluteRoot);
    const packageAfter=typescriptPackageSummaryV2(absoluteRoot);
    if(canonicalLegacyHistoryNimoRuntimeBundleJsonV1(compilerAfter)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(compilerBefore)||
       canonicalLegacyHistoryNimoRuntimeBundleJsonV1(packageAfter.files)!==canonicalLegacyHistoryNimoRuntimeBundleJsonV1(packageBefore.files)||
       packageAfter.package_lock_integrity!==packageBefore.package_lock_integrity){
      fail("legacy_history_nimo_bundle_compiler_generation_changed_during_build");
    }
    return Object.freeze({
      compiler:compilerAfter,
      compiler_snapshot:snapshot.record,
      build_input_snapshot:buildInputSnapshot.record,
    });
  }finally{
    cleanupCompilerSnapshotV2(snapshot.root);
    cleanupBuildInputSnapshotV2(buildInputSnapshot.root);
  }
}

export function testOnlyCompileReviewedRuntimeWithBoundCompilerV2(
  root,
  hooks = null,
  buildInputProfile = PRODUCTION_BUILD_INPUT_PROFILE_V2,
) {
  return compileReviewedRuntimeWithBoundCompilerV2(root, hooks, buildInputProfile);
}

function candidateId(body) {
  return (
    "voidblrhnrb2_" +
    sha256(
      Buffer.from(
        canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body) + "\n",
        "utf8",
      ),
    )
  );
}

export function buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
  root = ROOT,
) {
  const parentPlan = parentPlanRecord(root);
  const sourceInputs = verifyParentSourceRoots(root);
  const compiled = compileReviewedRuntimeWithBoundCompilerV2(root);
  const compiler = compiled.compiler;
  const compilerSnapshot = compiled.compiler_snapshot;
  const buildInputSnapshot = compiled.build_input_snapshot;
  const runtime = runtimeClosure(root);
  const plan = planVoidBuyVoidLegacyHistoryNimoInstallV1();

  const body = {
    schema: VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_SCHEMA_V2,
    marker: VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2,
    version: 2,
    repository: "6ZoSo9/void-node",
    parent_plan: parentPlan,
    entrypoint: ENTRY,
    planned_handler_root: plan.fixed_layout.handler_root,
    planned_handler_path: plan.fixed_layout.handler_path,
    runtime_layout: "repository_relative_package_free_v1",
    runtime_files: runtime.files,
    external_node_builtins: runtime.external_node_builtins,
    third_party_runtime_packages: [],
    node_modules_runtime_files: [],
    parent_source_inputs: sourceInputs,
    compiler,
    compiler_snapshot: compilerSnapshot,
    build_input_snapshot: buildInputSnapshot,
    build_recipe: {
      dependency_install: "npm ci --ignore-scripts --no-audit --no-fund",
      compile: "node <private-compiler-snapshot>/node_modules/typescript/bin/tsc -p <root-custodied-build-input-snapshot>/tsconfig.nimo-runtime-bundle-snapshot-v2.json --outDir <candidate-dist>",
      compile_node_executable_source: "process.execPath",
      compile_environment: CANDIDATE_COMPILE_ENV_V2,
      candidate_owned_rebuild_required: true,
      compiler_pre_post_identity_required: true,
      compiler_snapshot_required: true,
      compiler_snapshot_nonwritable_required: true,
      compiler_snapshot_root_custody_required: true,
      compiler_snapshot_builder_uid_direct_mutation_denied_required: true,
      compiler_source_post_revalidation_required: true,
      compiler_snapshot_post_revalidation_required: true,
      build_input_snapshot_required: true,
      build_input_snapshot_root_custody_required: true,
      build_input_snapshot_builder_uid_direct_mutation_denied_required: true,
      build_input_snapshot_post_revalidation_required: true,
      source_maps_expected: false,
      supported_node_majors: [22, 24, 26],
      three_node_byte_equality_required: true,
    },
    runtime_bundle_candidate_accepted: false,
    runtime_bundle_lock_created: false,
    protected_runtime_install_authorized: false,
    live_nimo_installed: false,
    authorized_keys_mutation_authorized: false,
    public_key_selected: false,
    external_transport_authenticated: false,
    witness_read_performed: false,
    witness_append_performed: false,
    sovereign_signing: false,
    payment_acceptance: false,
    public_presale_activation: false,
    wc_void_market_activation: false,
    funds_movement: false,
    next_gate:
      "void_buy_void_legacy_history_nimo_runtime_bundle_lock_v2",
    authority:
      VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V2,
  };

  return Object.freeze({
    ...body,
    candidate_id: candidateId(body),
  });
}

export function verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(
  candidate,
  root = ROOT,
) {
  exactKeys(
    candidate,
    [
      "authority","authorized_keys_mutation_authorized","build_input_snapshot","build_recipe",
      "candidate_id","compiler","compiler_snapshot","entrypoint","external_node_builtins",
      "external_transport_authenticated","funds_movement","live_nimo_installed",
      "marker","next_gate","node_modules_runtime_files","parent_plan",
      "parent_source_inputs","payment_acceptance","planned_handler_path",
      "planned_handler_root","protected_runtime_install_authorized",
      "public_key_selected","public_presale_activation","repository",
      "runtime_bundle_candidate_accepted","runtime_bundle_lock_created",
      "runtime_files","runtime_layout","schema","sovereign_signing",
      "third_party_runtime_packages","version","wc_void_market_activation",
      "witness_append_performed","witness_read_performed",
    ],
    "legacy_history_nimo_bundle_candidate_shape_invalid",
  );
  const { candidate_id: observedId, ...body } = candidate;
  if (
    typeof observedId !== "string" ||
    observedId !== candidateId(body)
  ) {
    fail("legacy_history_nimo_bundle_candidate_id_invalid");
  }
  if (
    body.schema !== VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_SCHEMA_V2 ||
    body.marker !== VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2 ||
    body.version !== 2 ||
    body.repository !== "6ZoSo9/void-node" ||
    body.entrypoint !== ENTRY ||
    body.runtime_bundle_candidate_accepted !== false ||
    body.runtime_bundle_lock_created !== false ||
    body.protected_runtime_install_authorized !== false ||
    body.live_nimo_installed !== false ||
    body.authorized_keys_mutation_authorized !== false ||
    body.public_key_selected !== false ||
    body.external_transport_authenticated !== false ||
    body.runtime_layout !== "repository_relative_package_free_v1" ||
    body.next_gate !==
      "void_buy_void_legacy_history_nimo_runtime_bundle_lock_v2" ||
    body.witness_read_performed !== false ||
    body.witness_append_performed !== false ||
    body.sovereign_signing !== false ||
    body.payment_acceptance !== false ||
    body.public_presale_activation !== false ||
    body.wc_void_market_activation !== false ||
    body.funds_movement !== false
  ) {
    fail("legacy_history_nimo_bundle_candidate_identity_invalid");
  }

  const expectedParent = parentPlanRecord(root);
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.parent_plan) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(expectedParent)
  ) {
    fail("legacy_history_nimo_bundle_parent_plan_identity_invalid");
  }
  const parentPlan = planVoidBuyVoidLegacyHistoryNimoInstallV1();
  if (
    body.planned_handler_root !== parentPlan.fixed_layout.handler_root ||
    body.planned_handler_path !== parentPlan.fixed_layout.handler_path
  ) {
    fail("legacy_history_nimo_bundle_planned_layout_invalid");
  }

  const expectedSourceInputs = verifyParentSourceRoots(root);
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.parent_source_inputs) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(expectedSourceInputs)
  ) {
    fail("legacy_history_nimo_bundle_parent_source_inputs_invalid");
  }

  if (!Array.isArray(body.runtime_files)) {
    fail("legacy_history_nimo_bundle_runtime_files_invalid");
  }
  const runtimePaths = body.runtime_files.map((record) => record?.path).sort();
  const expectedRuntimePaths = [
    ...VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2,
  ].sort();
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(runtimePaths) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(expectedRuntimePaths)
  ) {
    fail("legacy_history_nimo_bundle_runtime_files_invalid");
  }
  for (const record of body.runtime_files) {
    if (
      !record ||
      typeof record.path !== "string" ||
      !Number.isSafeInteger(record.bytes) ||
      record.bytes < 1 ||
      !/^[0-9a-f]{64}$/u.test(record.sha256) ||
      !Array.isArray(record.imports) ||
      !["compiled_typescript","tracked_source"].includes(record.runtime_kind)
    ) {
      fail("legacy_history_nimo_bundle_runtime_record_invalid");
    }
    const shouldBeCompiled = EXPECTED_COMPILED_RUNTIME_FILES.has(record.path);
    if (
      shouldBeCompiled !== (record.runtime_kind === "compiled_typescript")
    ) {
      fail("legacy_history_nimo_bundle_runtime_kind_invalid:" + record.path);
    }
    const expectedTracked = parentSourceRootMap().get(record.path) || null;
    if (record.runtime_kind === "tracked_source") {
      if (
        !expectedTracked ||
        record.tracked_source_git_blob_sha1 !== expectedTracked
      ) {
        fail("legacy_history_nimo_bundle_runtime_source_pin_invalid");
      }
    } else if (record.tracked_source_git_blob_sha1 !== null) {
      fail("legacy_history_nimo_bundle_compiled_source_pin_invalid");
    }
    const imports = record.imports;
    const sortedImports = [...imports].sort();
    if (
      new Set(imports).size !== imports.length ||
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(imports) !==
        canonicalLegacyHistoryNimoRuntimeBundleJsonV1(sortedImports) ||
      imports.some(
        (value) =>
          typeof value !== "string" ||
          (!value.startsWith("node:") &&
            !VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_EXPECTED_FILES_V2.includes(
              value,
            )),
      )
    ) {
      fail("legacy_history_nimo_bundle_runtime_import_record_invalid:" + record.path);
    }
  }

  if (
    !Array.isArray(body.third_party_runtime_packages) ||
    body.third_party_runtime_packages.length !== 0 ||
    !Array.isArray(body.node_modules_runtime_files) ||
    body.node_modules_runtime_files.length !== 0
  ) {
    fail("legacy_history_nimo_bundle_package_free_invalid");
  }
  if (
    !Array.isArray(body.external_node_builtins) ||
    body.external_node_builtins.length < 1 ||
    new Set(body.external_node_builtins).size !==
      body.external_node_builtins.length ||
    body.external_node_builtins.some(
      (value) => typeof value !== "string" || !value.startsWith("node:"),
    ) ||
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      body.external_node_builtins,
    ) !==
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
        [...body.external_node_builtins].sort(),
      )
  ) {
    fail("legacy_history_nimo_bundle_node_builtin_set_invalid");
  }
  if (
    body.compiler?.typescript_version !== EXPECTED_TYPESCRIPT_VERSION ||
    !Array.isArray(body.compiler?.compiler_files) ||
    body.compiler.compiler_files.length !== TYPESCRIPT_COMPILER_FILES_V2.length ||
    !Array.isArray(body.compiler?.cli_edges)
  ) {
    fail("legacy_history_nimo_bundle_compiler_identity_invalid");
  }
  const observedCompilerPaths = body.compiler.compiler_files
    .map((record) => record?.path);
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observedCompilerPaths) !==
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(TYPESCRIPT_COMPILER_FILES_V2) ||
    body.compiler.compiler_files.some(
      (record) =>
        !record ||
        !Number.isSafeInteger(record.bytes) ||
        record.bytes < 1 ||
        !/^[0-9a-f]{64}$/u.test(record.sha256),
    ) ||
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.compiler.cli_edges) !==
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(TYPESCRIPT_CLI_EDGES_V2)
  ) {
    fail("legacy_history_nimo_bundle_compiler_file_identity_invalid");
  }
  const expectedCompilerSnapshot = compilerSnapshotRecordV2(
    body.compiler,
    typescriptPackageSummaryV2(root),
  );
  const expectedBuildInputSnapshot = buildInputSnapshotRecordV2(
    buildInputStateV2(root, PRODUCTION_BUILD_INPUT_PROFILE_V2),
    PRODUCTION_BUILD_INPUT_PROFILE_V2,
  );
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.build_input_snapshot) !==
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(expectedBuildInputSnapshot)
  ) {
    fail("legacy_history_nimo_bundle_build_input_snapshot_identity_invalid");
  }
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.compiler_snapshot) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(expectedCompilerSnapshot)
  ) {
    fail("legacy_history_nimo_bundle_compiler_snapshot_identity_invalid");
  }

  exactKeys(
    body.build_recipe,
    [
      "build_input_snapshot_builder_uid_direct_mutation_denied_required",
      "build_input_snapshot_post_revalidation_required",
      "build_input_snapshot_required",
      "build_input_snapshot_root_custody_required",
      "candidate_owned_rebuild_required","compile",
      "compile_environment","compile_node_executable_source",
      "compiler_pre_post_identity_required","compiler_snapshot_required",
      "compiler_snapshot_nonwritable_required",
      "compiler_snapshot_root_custody_required",
      "compiler_snapshot_builder_uid_direct_mutation_denied_required",
      "compiler_source_post_revalidation_required",
      "compiler_snapshot_post_revalidation_required","dependency_install",
      "source_maps_expected","supported_node_majors",
      "three_node_byte_equality_required",
    ],
    "legacy_history_nimo_bundle_build_recipe_shape_invalid",
  );
  if (
    body.build_recipe.dependency_install !==
      "npm ci --ignore-scripts --no-audit --no-fund" ||
    body.build_recipe.compile !==
      "node <private-compiler-snapshot>/node_modules/typescript/bin/tsc -p <root-custodied-build-input-snapshot>/tsconfig.nimo-runtime-bundle-snapshot-v2.json --outDir <candidate-dist>" ||
    body.build_recipe.compile_node_executable_source !== "process.execPath" ||
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      body.build_recipe.compile_environment,
    ) !== canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      CANDIDATE_COMPILE_ENV_V2,
    ) ||
    body.build_recipe.candidate_owned_rebuild_required !== true ||
    body.build_recipe.compiler_pre_post_identity_required !== true ||
    body.build_recipe.compiler_snapshot_required !== true ||
    body.build_recipe.compiler_snapshot_nonwritable_required !== true ||
    body.build_recipe.compiler_snapshot_root_custody_required !== true ||
    body.build_recipe.compiler_snapshot_builder_uid_direct_mutation_denied_required !== true ||
    body.build_recipe.compiler_source_post_revalidation_required !== true ||
    body.build_recipe.compiler_snapshot_post_revalidation_required !== true ||
    body.build_recipe.build_input_snapshot_required !== true ||
    body.build_recipe.build_input_snapshot_root_custody_required !== true ||
    body.build_recipe.build_input_snapshot_builder_uid_direct_mutation_denied_required !== true ||
    body.build_recipe.build_input_snapshot_post_revalidation_required !== true ||
    body.build_recipe.source_maps_expected !== false ||
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      body.build_recipe.supported_node_majors,
    ) !== "[22,24,26]" ||
    body.build_recipe.three_node_byte_equality_required !== true
  ) {
    fail("legacy_history_nimo_bundle_build_recipe_invalid");
  }

  // Candidate self-consistency is not sufficient authority. Recompute the
  // actual package-free runtime graph and compiler identity from this checkout
  // and require the candidate to match those observed bytes exactly.
  const observedRuntime = runtimeClosure(root);
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.runtime_files) !==
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observedRuntime.files) ||
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.external_node_builtins) !==
      canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
        observedRuntime.external_node_builtins,
      )
  ) {
    fail("legacy_history_nimo_bundle_runtime_bytes_identity_invalid");
  }

  const observedCompiler = compilerIdentity(root);
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.compiler) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observedCompiler)
  ) {
    fail("legacy_history_nimo_bundle_compiler_bytes_identity_invalid");
  }
  const observedSnapshotRecord = compilerSnapshotRecordV2(
    observedCompiler,
    typescriptPackageSummaryV2(root),
  );
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.compiler_snapshot) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(observedSnapshotRecord)
  ) {
    fail("legacy_history_nimo_bundle_compiler_snapshot_bytes_identity_invalid");
  }
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(body.authority) !==
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_AUTHORITY_V2,
    )
  ) {
    fail("legacy_history_nimo_bundle_authority_invalid");
  }
  return true;
}

function emitCandidate(output) {
  const candidate =
    buildVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(ROOT);
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(candidate, ROOT);
  const bytes = Buffer.from(
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(candidate) + "\n",
    "utf8",
  );
  fs.writeFileSync(output, bytes, { flag: "wx", mode: 0o600 });
  console.log(
    "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2_GREEN",
  );
  console.log("runtime_file_count=" + candidate.runtime_files.length);
  console.log(
    "compiled_runtime_file_count=" +
      candidate.runtime_files.filter(
        (record) => record.runtime_kind === "compiled_typescript",
      ).length,
  );
  console.log(
    "tracked_runtime_source_file_count=" +
      candidate.runtime_files.filter(
        (record) => record.runtime_kind === "tracked_source",
      ).length,
  );
  console.log("parent_source_input_count=" + candidate.parent_source_inputs.length);
  console.log("third_party_runtime_packages=0");
  console.log("node_modules_runtime_files=0");
  console.log("runtime_bundle_candidate_accepted=false");
  console.log("protected_runtime_install_authorized=false");
  console.log("live_nimo_installed=false");
  console.log("authorized_keys_mutation_authorized=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("candidate_id=" + candidate.candidate_id);
  console.log("candidate_sha256=" + sha256(bytes));
}

function compareCandidates(paths) {
  if (paths.length !== 3) {
    fail("legacy_history_nimo_bundle_compare_requires_three_candidates");
  }
  const bytes = paths.map((candidatePath) =>
    readCandidateArtifact(candidatePath),
  );
  if (!bytes[0].equals(bytes[1]) || !bytes[0].equals(bytes[2])) {
    fail("legacy_history_nimo_bundle_three_node_candidate_mismatch");
  }
  const candidate = JSON.parse(bytes[0].toString("utf8"));
  verifyVoidBuyVoidLegacyHistoryNimoRuntimeBundleCandidateV2(candidate, ROOT);
  console.log(
    "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2_THREE_NODE_GREEN",
  );
  console.log("candidate_id=" + candidate.candidate_id);
  console.log("candidate_sha256=" + sha256(bytes[0]));
  console.log("runtime_bundle_candidate_accepted=false");
  console.log("protected_runtime_install_authorized=false");
  console.log("live_nimo_installed=false");
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
        "usage: void-buy-legacy-request-history-nimo-runtime-bundle-candidate-v2.mjs --emit <new.json> | --compare <node22.json> <node24.json> <node26.json>",
      );
    }
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2_HOLD",
    );
    console.error("reason=" + String(error?.message || error));
    process.exitCode = 2;
  }
}
