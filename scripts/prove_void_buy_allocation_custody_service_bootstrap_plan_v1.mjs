#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1,
  VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_AUTHORITY_V1,
  VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1,
  classifyBuyAllocationCustodyServiceBootstrapPlanV1,
  classifyBuyAllocationCustodyServiceBootstrapPlanV2,
  VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V2,
  classifyBuyAllocationCustodyServiceBootstrapPlanV3,
  VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V3,
} from "../tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const tool = path.resolve(here, "../tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs");
const source = readFileSync(tool, "utf8");
const fixture = VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1;
const historicalV1 = classifyBuyAllocationCustodyServiceBootstrapPlanV1(fixture);
const historicalV2 = classifyBuyAllocationCustodyServiceBootstrapPlanV2(fixture);
const decision = classifyBuyAllocationCustodyServiceBootstrapPlanV3(fixture);
assert.equal(historicalV1.marker, VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1);
assert.equal(historicalV1.schema, "void.buy.allocation.custody.bootstrap.plan.v1");
assert.equal(historicalV1.version, 1);
assert.equal(historicalV1.plan_sha256,
  "sha256:b279da39b1856ded9c7b90289192bb5ab19ebf7aae157ddd1d644b1f34c7e348");
const historicalV1Wire = JSON.stringify(historicalV1, null, 2) + "\n";
assert.equal(Buffer.byteLength(historicalV1Wire, "utf8"), 5898,
  "historical V1 output length must remain unchanged");
assert.equal(createHash("sha256").update(historicalV1Wire).digest("hex"),
  "db4c0c0a00d0cf830f4d1a8e46cbe8b6a64b85af641f763f5024869a361d35cf",
  "historical V1 output must remain byte-identical");

assert.equal(historicalV2.marker, VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V2);
assert.equal(historicalV2.schema, "void.buy.allocation.custody.bootstrap.plan.v2");
assert.equal(historicalV2.version, 2);
assert.equal(historicalV2.historical_v1_plan_sha256, historicalV1.plan_sha256);
assert.deepEqual(historicalV2.candidate.predecessor_candidate, historicalV1.candidate);
assert.notEqual(historicalV2.plan_sha256, historicalV1.plan_sha256);

assert.equal(decision.marker, VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V3);
assert.equal(decision.schema, "void.buy.allocation.custody.bootstrap.plan.v3");
assert.equal(decision.version, 3);
assert.equal(decision.historical_v1_plan_sha256, historicalV1.plan_sha256);
assert.equal(decision.historical_v2_plan_sha256, historicalV2.plan_sha256);
assert.deepEqual(decision.candidate.predecessor_candidate, historicalV2.candidate);
assert.notEqual(decision.plan_sha256, historicalV2.plan_sha256);
assert.equal(decision.status, "HOLD_SOURCE_ONLY");
assert.equal(decision.observation_trusted_as_authority, false);
assert.equal(decision.source_head_verified_against_remote, false);
assert.equal(decision.plan_digest_scope, "canonical_plan_body_only");
assert.equal(decision.plan_digest_authenticated, false);
assert.equal(decision.plan_digest_signed, false);
assert.equal(decision.plan_digest_is_attestation, false);
assert.equal(decision.plan_digest_source_provenance_verified, false);
assert.equal(decision.plan_digest_designated_host_bound, false);
assert.equal(decision.plan_digest_operator_identity_bound, false);
assert.equal(decision.plan_digest_freshness_bound, false);
assert.equal(decision.executable_unit_emitted, false);
assert.equal(decision.production_gate_ready, false);
assert.equal(decision.independent_custody_proven, false);
assert.match(decision.plan_sha256, /^sha256:[0-9a-f]{64}$/u);

const expectedHolds = [
  "HOLD_PUBLIC_RUNTIME_NO_NEW_PRIVILEGES",
  "HOLD_PUBLIC_RUNTIME_CAPABILITY_BOUNDING_SET",
  "HOLD_ROOT_OWNED_EXECUTABLE_IMPORT_CLOSURE",
  "HOLD_CURRENT_REVIEWED_SOURCE_AND_CONTRACT",
  "HOLD_DEDICATED_SYSTEM_SERVICE_INSTALL",
  "HOLD_EXACT_EXEC_START",
  "HOLD_DEDICATED_SERVICE_HARDENING",
  "HOLD_PRIVATE_AF_UNIX_SOCKET",
  "HOLD_SOCKET_PARENT_WRITABLE_NAMESPACE_EXCEPTION",
  "HOLD_RUNTIME_SYSTEMD_POLKIT_CONTROL_DENIAL",
  "HOLD_INDEPENDENT_MONOTONIC_CUSTODY_ANCHOR",
  "HOLD_SAME_UID_JOINT_ROLLBACK",
];
assert.deepEqual(decision.reported_missing_requirements, expectedHolds);
assert.equal(decision.candidate.requested_exec_start, null);
assert.equal(decision.candidate.installable_unit_generated, false);
assert.equal(decision.candidate.socket_unit_needed, false);
assert.equal(decision.candidate.socket_activation_implemented, false);
assert.equal(decision.candidate.socket_transport, "AF_UNIX");
assert.equal(decision.candidate.socket_mode_target, "0660");
assert.equal(decision.candidate.socket_parent_mode_target, "0750");
assert.equal(decision.candidate.socket_parent_write_namespace_exception_required, true);
assert.equal(decision.candidate.socket_parent_writable_inside_service_namespace_proven, false);
assert.equal(decision.candidate.socket_parent_namespace_exception_mechanism_selected, false);
assert.equal(decision.candidate.socket_parent_namespace_exception_mechanism, null);
assert.equal(decision.candidate.systemd_manager, "system");
assert.equal(decision.candidate.public_node_systemd_manager, "user");
assert.equal(decision.candidate.service_policy_target.NoNewPrivileges, true);
assert.deepEqual(decision.candidate.service_policy_target.CapabilityBoundingSet, []);
assert.deepEqual(decision.candidate.service_policy_target.AmbientCapabilities, []);
assert.deepEqual(decision.candidate.service_policy_target.RestrictAddressFamilies, ["AF_UNIX"]);
assert.deepEqual(decision.candidate.service_policy_target.ReadWritePaths, [
  "/var/lib/void-allocation-custody-v1",
  "/var/lib/void-allocation-ledger-v1",
]);
assert.equal(
  decision.candidate.service_source_sha256,
  "sha256:4aca3df7af7d34759151cc902b26776a8198ecca245be8abca4eb638aeda9c18",
);
assert.equal(
  decision.candidate.service_contract_sha256,
  "sha256:664c98528a05200c110ed27d4940b36d169a70e5e1da331bbcba77d52056465f",
);
assert.deepEqual(decision.candidate.top_level_source_imports, [
  "../dist/economic/buy_void_allocation_reservation_ledger_v1.js",
  "../dist/economic/buy_void_allocation_reservation_high_water_v1.js",
  "../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs",
  "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js",
  "../src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs",
]);
assert.equal(decision.candidate.request_root_candidate, null);
assert.equal(decision.candidate.request_root_live_path_qualified, false);
assert.equal(decision.candidate.cross_uid_read_permissions_qualified, false);
assert.equal(decision.candidate.payment_capacity_lock_verified, false);
assert.equal(decision.candidate.reserve_method_enabled, false);

// Fail closed when a future security repair changes the checked-out service's
// imports without reviewing a distinct untrusted bootstrap candidate.
// The service and its source reader are checked; compiled transitives and
// installed executable protection remain unqualified.
const serviceSource = readFileSync(path.resolve(
  here, "../tools/void-buy-allocation-custody-service-v1.mjs",
), "utf8");
const serviceContractSource = readFileSync(path.resolve(
  here, "../docs/architecture/buy-void-allocation-custody-service-contract-v1.json",
), "utf8");
const sourceSha256 = (value) =>
  "sha256:" + createHash("sha256").update(value, "utf8").digest("hex");
assert.equal(
  sourceSha256(serviceSource),
  decision.candidate.service_source_sha256,
  "checked-out custody service bytes must match the frozen candidate SHA-256",
);
assert.equal(
  sourceSha256(serviceContractSource),
  decision.candidate.service_contract_sha256,
  "checked-out custody service contract bytes must match the frozen candidate SHA-256",
);
const parsedServiceContract = JSON.parse(serviceContractSource);
assert.equal(
  parsedServiceContract.service_source_sha256,
  decision.candidate.service_source_sha256,
  "machine contract must bind the exact same custody service source bytes",
);

function observedCompiledImports(
  sourceText,
  simulateLegacyNode24Requests = false,
  testOnlyBypassAttributeLexicalGuard = false,
) {
  assert.equal(typeof simulateLegacyNode24Requests, "boolean");
  assert.equal(typeof testOnlyBypassAttributeLexicalGuard, "boolean");
  // The lexical guard is production/default behavior. This test-only escape
  // exists solely to falsify the linker fallback on early Node 24, where
  // otherwise a regex could mask a broken import-attribute metadata callback.
  assert.equal(
    testOnlyBypassAttributeLexicalGuard && !simulateLegacyNode24Requests,
    false,
    "test_only_attribute_guard_bypass_requires_simulated_early_node24",
  );
  // Dynamic loaders are outside the reviewed closure and HOLD outright.
  // This is deliberately lexical/fail-closed: even a commented future loader
  // must be removed or explicitly reviewed rather than silently ignored.
  assert.doesNotMatch(sourceText, /\bimport\s*\(/u);
  assert.doesNotMatch(sourceText, /\brequire\s*\(/u);
  // Node 22 exposes only dependencySpecifiers and silently omits import
  // attributes. Reject their syntax (including interposed comments) before
  // trusting the legacy specifier-only fallback on any supported Node.
  if (!testOnlyBypassAttributeLexicalGuard) {
    assert.doesNotMatch(
      sourceText,
      /\bwith\b(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n\u2028\u2029]*(?:\r\n|[\r\n\u2028\u2029]|$))*\{/u,
      "import attributes are outside the reviewed custody service closure",
    );
  }
  // Node 22.x may expose moduleRequests without its newer phase metadata.
  // Reject alternate import phases lexically before using that reduced API.
  assert.doesNotMatch(
    sourceText,
    /\bimport\b(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n\u2028\u2029]*(?:\r\n|[\r\n\u2028\u2029]|$))*(?:source|defer)\b/u,
    "non-evaluation import phases are outside the reviewed closure",
  );

  // Use Node's parser rather than formatting-sensitive regexes so valid static
  // ESM forms such as semicolonless imports and export ... from declarations
  // are included in the dependency census without executing the service.
  const parser = String.raw`
import vm from "node:vm";
let source = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) source += chunk;
const module = new vm.SourceTextModule(source, { identifier: "custody-service.mjs" });
const major = Number(process.versions.node.split(".")[0]);
if (![22, 24, 26].includes(major)) {
  throw new Error("custody_bootstrap_plan_unsupported_node_major_hold");
}
// The test-only flag forces the pre-24.4 API absence on a newer Node 24
// runner. Real Node 22 always uses the linker, even with partial metadata.
const emulateEarly24 = process.argv[1] === "custody-bootstrap-test-early-node24";
if (emulateEarly24 && major !== 24) {
  throw new Error("custody_bootstrap_plan_test_major_invalid_hold");
}
const modernAvailable = Array.isArray(module.moduleRequests) && !emulateEarly24;
let requests;
if (major >= 24 && modernAvailable) {
  // Complete, available metadata on Node 24/26 must be ordinary and empty.
  requests = module.moduleRequests.map((request) => {
    if (typeof request?.specifier !== "string" ||
        !request.attributes || typeof request.attributes !== "object" ||
        Reflect.ownKeys(request.attributes).length !== 0 ||
        request.phase !== "evaluation") {
      throw new Error("custody_bootstrap_plan_import_metadata_hold");
    }
    return request.specifier;
  });
} else if (major === 22 || (major === 24 && !modernAvailable)) {
  // Node 22 with partial metadata and early Node 24 without moduleRequests
  // use the inert linker to enforce empty import attributes/ordinary phase.
  if (!Array.isArray(module.dependencySpecifiers)) {
    throw new Error("custody_bootstrap_plan_requests_unavailable_hold");
  }
  const names = [...new Set(["default",
    ...(source.match(/[A-Za-z_$][A-Za-z0-9_$]*/gu) || []),
  ])];
  const observed = [];
  await module.link((specifier, _ref, extra) => {
    if (typeof specifier !== "string" ||
        !extra?.attributes || typeof extra.attributes !== "object" ||
        Reflect.ownKeys(extra.attributes).length !== 0 ||
        (extra.phase !== undefined && extra.phase !== "evaluation")) {
      throw new Error("custody_bootstrap_plan_import_metadata_hold");
    }
    observed.push(specifier);
    return new vm.SyntheticModule(names, () => {
      throw new Error("custody_bootstrap_plan_synthetic_module_must_not_evaluate");
    });
  });
  if (JSON.stringify(observed.slice().sort()) !==
      JSON.stringify([...module.dependencySpecifiers].sort())) {
    throw new Error("custody_bootstrap_plan_legacy_request_list_hold");
  }
  requests = observed;
} else {
  // Node 26 cannot silently downgrade when the modern API disappears.
  throw new Error("custody_bootstrap_plan_modern_requests_unavailable_hold");
}
process.stdout.write(JSON.stringify(requests));
`;
  const parsed = spawnSync(
    process.execPath,
    [
      "--experimental-vm-modules", "--input-type=module", "-e", parser,
      ...(simulateLegacyNode24Requests ? ["--", "custody-bootstrap-test-early-node24"] : []),
    ],
    {
      input: sourceText,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  assert.equal(
    parsed.status,
    0,
    ["custody service module parse failed", parsed.stderr].join("\n"),
  );
  const specifiers = JSON.parse(parsed.stdout);
  assert.ok(Array.isArray(specifiers));
  assert.ok(specifiers.every((value) => typeof value === "string"));
  // Never discard unknown static imports. Even an unrelated package, local
  // helper, data URL or newly added built-in expands the execution closure.
  return specifiers.sort();
}
const reviewedBuiltinImports = Object.freeze([
  "node:crypto",
  "node:fs",
  "node:net",
  "node:path",
  "node:url",
]);
const expectedCompiledImports = [
  ...reviewedBuiltinImports,
  ...decision.candidate.top_level_source_imports,
].sort();
assert.deepEqual(observedCompiledImports(serviceSource), expectedCompiledImports);
// Inspect the new source dependency as text. Never evaluate either module.
// A service hash alone cannot bind a changed dependency at an unchanged path.
const readerPath = "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";
const readerSource = readFileSync(path.resolve(here, "..", readerPath), "utf8");
const expectedReader = Object.freeze({
  source: readerPath,
  source_git_blob: "1bf88a403b1012ac00edaf634c5ed237a898043c",
  source_sha256:
    "sha256:a2a550f766659235a3e21a6d16003b22f482872e73f31ae23f8dbaf01dbe3979",
  static_imports: ["node:crypto", "node:fs", "node:path", "node:util"],
});
assert.equal(historicalV2.candidate.source_review_generation, "descriptor-inspection-20261010");
assert.equal(historicalV2.candidate.source_review_ref, "c7e5993bb5fd4d8fb402762a56925a9ce9e25518");
assert.equal(decision.candidate.source_review_generation, "payment-provenance-bind-20261010");
assert.equal(decision.candidate.source_review_ref, "5ed7dae3b4f799cde7d106d59f99a88eda753065");
assert.deepEqual(decision.candidate.inspection_runtime_requirements, {
  platform: "linux", nonroot_uid: true, proc_self_fd: true,
  canonical_simple_component_paths: true, separate_nonnested_roots: true,
  root_permission_bits: "0700", file_permission_bits: "0600",
  files_single_link: true, read_window_only: true,
  host_qualified: false, cross_root_atomic_snapshot_proven: false,
});
function requireReaderIdentity(text, record) {
  assert.deepEqual(record, expectedReader, "exact inspection dependency record required");
  assert.equal(sourceSha256(text), record.source_sha256, "inspection dependency bytes drift");
  const bytes = Buffer.from(text, "utf8");
  assert.equal(createHash("sha1").update("blob " + bytes.length + "\0")
    .update(bytes).digest("hex"), record.source_git_blob, "inspection dependency Git blob drift");
  assert.deepEqual(observedCompiledImports(text), record.static_imports,
    "inspection dependency static imports drift");
}
requireReaderIdentity(readerSource, decision.candidate.inspection_dependency);
assert.equal(Object.isFrozen(decision.candidate.inspection_dependency), true);
assert.equal(Object.isFrozen(decision.candidate.inspection_dependency.static_imports), true);
assert.equal(Object.isFrozen(decision.candidate.inspection_runtime_requirements), true);

const paymentReaderPath =
  "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs";
const paymentReaderSource =
  readFileSync(path.resolve(here, "..", paymentReaderPath), "utf8");
const expectedPaymentReader = Object.freeze({
  source: paymentReaderPath,
  source_git_blob: "7c0a960b2dbf728b1daf0abbf5c44f55e2cd4325",
  source_sha256:
    "sha256:a4d5882e61e702b45f7a07b2e73bd9276979301649c7fe387a7c0c5f3198eb9c",
  static_imports: ["node:fs", "node:path", "node:util"],
});
function requirePaymentReaderIdentity(text, record) {
  assert.deepEqual(
    record,
    expectedPaymentReader,
    "exact payment inspection dependency record required",
  );
  assert.equal(
    sourceSha256(text),
    record.source_sha256,
    "payment inspection dependency bytes drift",
  );
  const bytes = Buffer.from(text, "utf8");
  assert.equal(
    createHash("sha1").update("blob " + bytes.length + "\0")
      .update(bytes).digest("hex"),
    record.source_git_blob,
    "payment inspection dependency Git blob drift",
  );
  assert.deepEqual(
    observedCompiledImports(text),
    record.static_imports,
    "payment inspection dependency static imports drift",
  );
}
requirePaymentReaderIdentity(
  paymentReaderSource,
  decision.candidate.payment_inspection_dependency,
);
assert.equal(Object.isFrozen(decision.candidate.payment_inspection_dependency), true);
assert.equal(
  Object.isFrozen(decision.candidate.payment_inspection_dependency.static_imports),
  true,
);
let paymentReaderCases = 1;
for (const changed of [
  paymentReaderSource.replace('import fs from "node:fs";', 'import fs from "node:tls";'),
  paymentReaderSource.replace('import fs from "node:fs";', ''),
  paymentReaderSource + '\nimport "./unreviewed-payment-reader.mjs"\n',
  paymentReaderSource + '\n// changed bytes\n',
]) {
  assert.notEqual(changed, paymentReaderSource);
  assert.throws(
    () => requirePaymentReaderIdentity(changed, expectedPaymentReader),
    /payment inspection dependency bytes drift/u,
  );
  paymentReaderCases++;
}
let readerCases = 1;
// Independent parser checks still detect dependency changes even without
// relying on the complete-file hash mismatch of these in-memory fixtures.
for (const changed of [
  readerSource.replace('import fs from "node:fs";', 'import fs from "node:tls";'),
  readerSource.replace('import fs from "node:fs";', ''),
  readerSource + '\nimport "./unreviewed-reader.mjs"\n',
  readerSource + '\nimport "unreviewed-reader-package"\n',
  readerSource + '\nexport { default as extra } from "./unreviewed-reader.mjs"\n',
]) {
  assert.notEqual(changed, readerSource);
  assert.throws(() => requireReaderIdentity(changed, expectedReader),
    /inspection dependency bytes drift/u);
  assert.notDeepEqual(observedCompiledImports(changed), expectedReader.static_imports);
  readerCases++;
}
// Same import graph does not make changed executable bytes equivalent.
assert.throws(() => requireReaderIdentity(readerSource + '\n// changed bytes\n', expectedReader),
  /inspection dependency bytes drift/u);
readerCases++;
for (const record of [
  { ...expectedReader, source: "src/economic/other-reader.mjs" },
  { ...expectedReader, source_sha256: "sha256:" + "0".repeat(64) },
  { ...expectedReader, source_git_blob: "0".repeat(40) },
  { ...expectedReader, static_imports: expectedReader.static_imports.slice(1) },
]) {
  assert.throws(() => requireReaderIdentity(readerSource, record),
    /exact inspection dependency record required/u);
  readerCases++;
}
const withoutReaderImport = serviceSource.replace(
  /^import\s*\{[^;]*\}\s*from\s*["']\.\.\/src\/economic\/buy_void_custody_allocation_roots_observed_read_v1\.mjs["'];/mu,
  "",
);
assert.notEqual(withoutReaderImport, serviceSource);
assert.notDeepEqual(observedCompiledImports(withoutReaderImport), expectedCompiledImports);
readerCases++;
for (const [text, expected] of [[readerSource, expectedReader.static_imports],
  [serviceSource, expectedCompiledImports]]) {
  assert.deepEqual(observedCompiledImports(text + '\nthrow new Error("must_not_evaluate");\n'), expected);
  readerCases++;
}
assert.equal(readerCases, 14);

const changedImport = serviceSource.replace(
  "../dist/economic/buy_void_allocation_reservation_high_water_v1.js",
  "../dist/economic/unreviewed_high_water_v1.js",
);
assert.notEqual(changedImport, serviceSource);
assert.notEqual(
  sourceSha256(changedImport),
  decision.candidate.service_source_sha256,
  "any service-source mutation must break the exact source pin",
);
assert.notDeepEqual(observedCompiledImports(changedImport), expectedCompiledImports);

const droppedImport = serviceSource.replace(
  /^import\s*\{[^;]*\}\s*from\s*["']\.\.\/dist\/economic\/buy_void_allocation_reservation_high_water_v1\.js["'];/mu,
  "",
);
assert.notEqual(droppedImport, serviceSource);
assert.notEqual(sourceSha256(droppedImport), decision.candidate.service_source_sha256);
assert.notDeepEqual(observedCompiledImports(droppedImport), expectedCompiledImports);

const semicolonlessImport =
  serviceSource + '\nimport "../dist/economic/unreviewed_semicolonless_v1.js"\n';
assert.notEqual(
  sourceSha256(semicolonlessImport),
  decision.candidate.service_source_sha256,
);
assert.notDeepEqual(
  observedCompiledImports(semicolonlessImport),
  expectedCompiledImports,
  "semicolonless static import must alter the compiled dependency census",
);

const exportFromDependency =
  serviceSource +
  '\nexport { default as unreviewed } from "../dist/economic/unreviewed_export_v1.js"\n';
assert.notEqual(
  sourceSha256(exportFromDependency),
  decision.candidate.service_source_sha256,
);
assert.notDeepEqual(
  observedCompiledImports(exportFromDependency),
  expectedCompiledImports,
  "export-from dependency must alter the compiled dependency census",
);

// An exact ../dist/ filter would silently omit these valid static ESM imports,
// allowing the dependency closure to expand while the census looked unchanged.
for (const [label, extraSpecifier] of [
  ["unreviewed relative helper", "./unreviewed-helper.mjs"],
  ["unreviewed package", "unreviewed-package"],
  ["unreviewed Node built-in", "node:tls"],
  ["unreviewed data URL", "data:text/javascript,export default null"],
]) {
  const injectedSource = serviceSource + '\nimport "' + extraSpecifier + '"\n';
  assert.notDeepEqual(
    observedCompiledImports(injectedSource),
    expectedCompiledImports,
    label + " must alter the complete static dependency census",
  );
  assert.notEqual(
    sourceSha256(injectedSource),
    decision.candidate.service_source_sha256,
    label + " must also break the independent exact service digest",
  );
}

// Attributes and non-evaluation phases must not silently preserve the old
// static-specifier census. Node 22 only exposes dependencySpecifiers, so these
// adversaries must also HOLD under its reduced metadata API.
for (const [label, injected] of [
  ["attributed allowed import",
    serviceSource.replace(
      'import crypto from "node:crypto";',
      'import crypto from "node:crypto" with { type: "json" };',
    )],
  ["comment-separated attribute",
    serviceSource.replace(
      'import crypto from "node:crypto";',
      'import crypto from "node:crypto" with/*review-evasion*/{ type: "json" };',
    )],
  ["line-comment-separated attribute",
    serviceSource.replace(
      'import crypto from "node:crypto";',
      'import crypto from "node:crypto" with // review-evasion\n { type: "json" };',
    )],
  ["attributed re-export",
    serviceSource + '\nexport * from "node:crypto" with { type: "json" };\n'],
  ["source phase import",
    serviceSource + '\nimport source externalModule from "node:crypto";\n'],
  ["deferred phase import",
    serviceSource + '\nimport defer * as externalModule from "node:crypto";\n'],
]) {
  assert.notEqual(injected, serviceSource, label + " fixture must change source");
  assert.notEqual(
    sourceSha256(injected),
    decision.candidate.service_source_sha256,
    label + " must break the independent full-byte source pin",
  );
  assert.throws(
    () => observedCompiledImports(injected),
    label + " must HOLD even if its specifier is otherwise allowlisted",
  );
}

// All ECMAScript line endings terminate // comments, not merely LF or CRLF.
// On old VM module APIs, no hidden 'with' attribute or 'import source' may
// preserve an already-allowlisted specifier unnoticed.
for (const [label, terminator] of [
  ["LF", "\n"], ["CR", "\r"], ["U+2028", "\u2028"],
  ["U+2029", "\u2029"], ["CRLF", "\r\n"],
]) {
  const attributed = serviceSource.replace(
    'import crypto from "node:crypto";',
    'import crypto from "node:crypto" with // comment' + terminator +
      '{ type: "json" };',
  );
  assert.notEqual(attributed, serviceSource, label + " test fixture changed");
  assert.throws(
    () => observedCompiledImports(attributed),
    label + " attributed import must HOLD across a comment line terminator",
  );
  const phased = serviceSource +
    '\nimport // comment' + terminator +
    'source lateCrypto from "node:crypto";\n';
  assert.throws(
    () => observedCompiledImports(phased),
    label + " source-phase import must HOLD after a comment",
  );
}
// Node 24.0-24.3 lack SourceTextModule.moduleRequests. A newer Node 24
// binary simulates that absent API here and still requires linker metadata.
// This does not claim that a genuine Node 24.0 binary was executed.
let earlyNode24LinkerTested = false;
if (Number(process.versions.node.split(".")[0]) === 24) {
  assert.deepEqual(
    observedCompiledImports(serviceSource, true),
    expectedCompiledImports,
    "simulated early Node24 must parse reviewed service without evaluating",
  );
  const attributed = serviceSource.replace(
    'import crypto from "node:crypto";',
    'import crypto from "node:crypto" with { type: "json" };',
  );
  assert.throws(
    () => observedCompiledImports(attributed, true, true),
    /custody_bootstrap_plan_import_metadata_hold/u,
    "simulated early Node24 must reject nonempty linker extra.attributes",
  );
  assert.deepEqual(observedCompiledImports(readerSource, true), expectedReader.static_imports);
  assert.deepEqual(
    observedCompiledImports(paymentReaderSource, true),
    expectedPaymentReader.static_imports,
  );
  earlyNode24LinkerTested = true;
}

const dynamicImport =
  serviceSource + '\nvoid import/*review-evasion*/("./dynamic.mjs");\n';
assert.notEqual(
  sourceSha256(dynamicImport),
  decision.candidate.service_source_sha256,
  "comment-separated dynamic import must break the primary exact-source pin",
);

const dynamicRequire =
  serviceSource + '\nvoid require/*review-evasion*/("./dynamic.cjs");\n';
assert.notEqual(
  sourceSha256(dynamicRequire),
  decision.candidate.service_source_sha256,
  "comment-separated require must break the primary exact-source pin",
);

assert.throws(
  () => observedCompiledImports(serviceSource + '\nvoid import("./dynamic.mjs");\n'),
  "ordinary dynamic import must also fail the secondary loader guard",
);
assert.equal(decision.candidate.reviewed_compiled_transitive_closure_proven, false);
assert.equal(decision.candidate.production_gate_ready, false);

for (const key of [
  "host_read_performed", "host_write_performed", "service_file_generated",
  "service_installed", "service_started", "polkit_rule_installed", "socket_created",
  "runtime_updated_or_restarted", "mount_or_permissions_mutated", "executable_closure_proven",
  "independent_custody_proven", "runtime_integration", "transaction_construction",
  "transaction_submission", "transaction_signing", "transaction_broadcast",
  "payment_acceptance", "market_or_presale_activation", "presale_activation",
  "wallet_or_signer_access", "private_key_access", "credential_access",
  "chain2050_write", "work_credit_write", "inventory_funding",
  "treasury_movement", "liquidity_movement", "systemd_daemon_reload",
  "systemd_enablement", "data_root_mutation", "funds_movement",
  "production_gate_ready",
]) {
  assert.equal(VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_AUTHORITY_V1[key], false, key);
}

const candidateAllTrue = { ...fixture };
for (const [key, value] of Object.entries(candidateAllTrue)) {
  if (typeof value === "boolean") candidateAllTrue[key] = true;
}
const forged = classifyBuyAllocationCustodyServiceBootstrapPlanV1(candidateAllTrue);
assert.deepEqual(forged.reported_missing_requirements, []);
assert.equal(forged.status, "HOLD_SOURCE_ONLY");
assert.equal(forged.observation_trusted_as_authority, false);
assert.equal(forged.plan_digest_authenticated, false);
assert.equal(forged.plan_digest_signed, false);
assert.equal(forged.plan_digest_is_attestation, false);
assert.equal(forged.plan_digest_source_provenance_verified, false);
assert.equal(forged.plan_digest_designated_host_bound, false);
assert.equal(forged.plan_digest_operator_identity_bound, false);
assert.equal(forged.plan_digest_freshness_bound, false);
assert.equal(forged.production_gate_ready, false);
assert.equal(forged.executable_unit_emitted, false);
assert.equal(forged.candidate.requested_exec_start, null);

const absentSocketWrite = {
  ...candidateAllTrue,
  socket_parent_namespace_write_exception_proven: false,
};
assert.deepEqual(
  classifyBuyAllocationCustodyServiceBootstrapPlanV1(absentSocketWrite)
    .reported_missing_requirements,
  ["HOLD_SOCKET_PARENT_WRITABLE_NAMESPACE_EXCEPTION"],
);

const absentSeparation = {
  ...candidateAllTrue,
  separate_mount_domains_observed: false,
  public_runtime_direct_storage_write_denied_observed: false,
};
assert.deepEqual(
  classifyBuyAllocationCustodyServiceBootstrapPlanV1(absentSeparation)
    .reported_missing_requirements,
  ["HOLD_SEPARATE_STORAGE_DOMAINS_NOT_OBSERVED", "HOLD_PUBLIC_RUNTIME_DIRECT_WRITE_NOT_DENIED"],
);

const reversedKeys = Object.fromEntries(Object.entries(fixture).reverse());
assert.equal(classifyBuyAllocationCustodyServiceBootstrapPlanV1(reversedKeys).plan_sha256,
  historicalV1.plan_sha256);
assert.equal(classifyBuyAllocationCustodyServiceBootstrapPlanV2(reversedKeys).plan_sha256,
  historicalV2.plan_sha256);
assert.equal(classifyBuyAllocationCustodyServiceBootstrapPlanV3(reversedKeys).plan_sha256,
  decision.plan_sha256);

for (const bad of [
  {},
  { ...fixture, production_gate_ready: true },
  { ...fixture, source_head_verified_against_remote: true },
  { ...fixture, public_runtime_no_new_privileges_proven: "true" },
  { ...fixture, remote_tracking_head: "not-a-commit" },
  Object.create({ ...fixture }),
  new Proxy({ ...fixture }, {}),
]) {
  assert.throws(() => classifyBuyAllocationCustodyServiceBootstrapPlanV1(bad));
}
const accessed = { ...fixture };
Object.defineProperty(accessed, "runtime_service_control_denial_proven", {
  get() { throw new Error("getter_executed"); }, enumerable: true,
});
assert.throws(() => classifyBuyAllocationCustodyServiceBootstrapPlanV1(accessed),
  /custody_bootstrap_plan_observation_accessor_rejected/u);

const run = (args) => spawnSync(process.execPath, [tool, ...args], {
  encoding: "utf8", timeout: 5000,
});
const plan = run(["--plan"]);
assert.equal(plan.status, 0, plan.stderr);
assert.equal(plan.stdout, historicalV1Wire);
assert.deepEqual(JSON.parse(plan.stdout), historicalV1);
const defaultPlan = run([]);
assert.equal(defaultPlan.status, 0, defaultPlan.stderr);
assert.equal(defaultPlan.stdout, historicalV1Wire);
assert.deepEqual(JSON.parse(defaultPlan.stdout), historicalV1);
const inspectedV2Cli = run(["--plan-v2"]);
assert.equal(inspectedV2Cli.status, 0, inspectedV2Cli.stderr);
assert.deepEqual(JSON.parse(inspectedV2Cli.stdout), historicalV2);
const provenanceV3Cli = run(["--plan-v3"]);
assert.equal(provenanceV3Cli.status, 0, provenanceV3Cli.stderr);
assert.deepEqual(JSON.parse(provenanceV3Cli.stdout), decision);
const help = run(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /no --apply/u);
for (const args of [["--apply"], ["--plan", "--apply"], ["--install"], ["--plan", "extra"], ["--plan-v2", "--apply"], ["--plan-v2", "extra"], ["--plan-v3", "--apply"], ["--plan-v3", "extra"]]) {
  const refused = run(args);
  assert.equal(refused.status, 2, JSON.stringify({args, stderr: refused.stderr}));
  assert.equal(refused.stdout, "");
  assert.match(refused.stderr, /HOLD/u);
}
const syntax = spawnSync(process.execPath, ["--check", tool], {encoding: "utf8", timeout: 5000});
assert.equal(syntax.status, 0, syntax.stderr);
for (const forbidden of [
  /from "node:(?:fs|child_process|net|http|https)"/u,
  /\b(?:writeFileSync|mkdirSync|chmodSync|chownSync|execFileSync|spawnSync|systemctl|sudo)\b/u,
  /--apply[\s\S]*service\.start\(/u,
]) {
  assert.doesNotMatch(source, forbidden);
}
const canonical = v => {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
};
const { plan_sha256, ...body } = decision;
const exactId = "sha256:" + createHash("sha256").update(canonical(body)).digest("hex");
assert.equal(plan_sha256, exactId);
const { plan_sha256: historicalId, ...historicalBody } = historicalV1;
assert.equal(
  "sha256:" + createHash("sha256").update(canonical(historicalBody)).digest("hex"),
  historicalId,
  "entire original pre-inspection candidate and Oct7 observation must remain historical",
);
assert.notEqual(plan_sha256, historicalId);
const v2AllTrue = classifyBuyAllocationCustodyServiceBootstrapPlanV2(candidateAllTrue);
assert.equal(v2AllTrue.production_gate_ready, false);
assert.equal(v2AllTrue.status, "HOLD_SOURCE_ONLY");
assert.equal(v2AllTrue.executable_unit_emitted, false);
assert.deepEqual(v2AllTrue.authority, historicalV1.authority);
const v3AllTrue = classifyBuyAllocationCustodyServiceBootstrapPlanV3(candidateAllTrue);
assert.equal(v3AllTrue.production_gate_ready, false);
assert.equal(v3AllTrue.status, "HOLD_SOURCE_ONLY");
assert.equal(v3AllTrue.executable_unit_emitted, false);
assert.deepEqual(v3AllTrue.authority, historicalV1.authority);
assert.equal(v3AllTrue.candidate.request_root_live_path_qualified, false);
assert.equal(v3AllTrue.candidate.cross_uid_read_permissions_qualified, false);
assert.equal(v3AllTrue.candidate.payment_capacity_lock_verified, false);
assert.equal(v3AllTrue.candidate.reserve_method_enabled, false);

console.log("VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1_SOURCE_GREEN");
console.log("VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V2_SOURCE_GREEN");
console.log("VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V3_SOURCE_GREEN");
console.log("historical_v1_cli_bytes_unchanged=true");
console.log("diagnostic_v2_schema_marker_version_distinct=true");
console.log("diagnostic_v3_schema_marker_version_distinct=true");
console.log("inspection_dependency_review_cases=" + readerCases);
console.log("payment_inspection_dependency_review_cases=" + paymentReaderCases);
console.log("payment_inspection_reader_source_and_imports_bound=true");
console.log("inspection_reader_source_and_imports_bound=true");
console.log("historical_bootstrap_candidate_preserved=true");
console.log("inspection_runtime_requirements_host_qualified=false");
console.log("source_only=true");
console.log("operator_snapshot_untrusted=true");
console.log("plan_digest_authenticated=false");
console.log("plan_digest_is_attestation=false");
console.log("explicit_denied_authorities_bound=true");
console.log("separate_host_service_needed=true");
console.log("mutable_repo_execstart_not_emitted=true");
console.log("systemd_socket_unit_not_claimed=true");
console.log("protected_executable_import_closure_required=true");
console.log("exact_service_source_sha256_bound=true");
console.log("exact_service_contract_sha256_bound=true");
console.log("contract_and_service_source_sha256_agree=true");
console.log("current_service_compiled_imports_match_candidate=true");
console.log("all_static_service_imports_exact_allowlist=true");
// Never claim the early-Node24 branch ran on a Node22 or Node26 job.
console.log("early_node24_inert_linker_abi_fallback_proven=" +
  earlyNode24LinkerTested);
console.log("ecmascript_line_terminators_attributes_and_phases_hold=true");
console.log("relative_package_builtin_and_data_imports_rejected=true");
console.log("module_parser_static_import_census=true");
console.log("semicolonless_and_export_from_dependencies_bound=true");
console.log("forged_all_green_observations_still_hold=true");
console.log("apply_or_install_modes_rejected=true");
console.log("service_or_funds_mutation=false");
console.log("production_gate_ready=false");
