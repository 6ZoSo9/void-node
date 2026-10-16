#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
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
    three_node_byte_equality_required: true,
    candidate_report_filesystem_write: true,
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

function staticRequireSpecifiers(sourceText, label) {
  if (typeof sourceText !== "string") {
    fail("legacy_history_nimo_bundle_compiler_loader_not_text:" + label);
  }
  const callPattern = /\brequire\s*\(/gu;
  const calls = [...sourceText.matchAll(callPattern)].length;
  const literalPattern = /\brequire\s*\(\s*(["'])([^"'\r\n]+)\1\s*\)/gu;
  const specifiers = [...sourceText.matchAll(literalPattern)].map(
    (match) => match[2],
  );
  if (calls !== specifiers.length) {
    fail("legacy_history_nimo_bundle_compiler_dynamic_loader_forbidden:" + label);
  }
  return specifiers;
}

const TYPESCRIPT_COMPILER_FILES_V2 = Object.freeze([
  "node_modules/typescript/bin/tsc",
  "node_modules/typescript/lib/tsc.js",
  "node_modules/typescript/lib/_tsc.js",
  "node_modules/typescript/lib/typescript.js",
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

  const compilerBytes = new Map();
  const files = TYPESCRIPT_COMPILER_FILES_V2.map((relative) => {
    const bytes = readRegular(root, relative, 16 * 1024 * 1024);
    compilerBytes.set(relative, bytes);
    return Object.freeze({
      path: relative,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  });

  const binSpecs = staticRequireSpecifiers(
    compilerBytes.get("node_modules/typescript/bin/tsc").toString("utf8"),
    "bin_tsc",
  );
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(binSpecs) !==
    '["../lib/tsc.js"]'
  ) {
    fail("legacy_history_nimo_bundle_typescript_bin_loader_edge_invalid");
  }

  const loaderSpecs = staticRequireSpecifiers(
    compilerBytes.get("node_modules/typescript/lib/tsc.js").toString("utf8"),
    "lib_tsc",
  );
  if (
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(loaderSpecs) !==
    '["node:module","./_tsc.js"]'
  ) {
    fail("legacy_history_nimo_bundle_typescript_cli_loader_edge_invalid");
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
  const runtime = runtimeClosure(root);
  const compiler = compilerIdentity(root);
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
    build_recipe: {
      dependency_install: "npm ci --ignore-scripts --no-audit --no-fund",
      compile: "node node_modules/typescript/bin/tsc -p tsconfig.build.json",
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
      "authority","authorized_keys_mutation_authorized","build_recipe",
      "candidate_id","compiler","entrypoint","external_node_builtins",
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
  if (
    body.build_recipe?.dependency_install !==
      "npm ci --ignore-scripts --no-audit --no-fund" ||
    body.build_recipe?.compile !==
      "node node_modules/typescript/bin/tsc -p tsconfig.build.json" ||
    body.build_recipe?.source_maps_expected !== false ||
    canonicalLegacyHistoryNimoRuntimeBundleJsonV1(
      body.build_recipe?.supported_node_majors,
    ) !== "[22,24,26]" ||
    body.build_recipe?.three_node_byte_equality_required !== true
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
