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
} from "../tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const tool = path.resolve(here, "../tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs");
const source = readFileSync(tool, "utf8");
const fixture = VOID_BUY_ALLOCATION_CUSTODY_OCT7_OPERATOR_OBSERVATION_V1;
const decision = classifyBuyAllocationCustodyServiceBootstrapPlanV1(fixture);
assert.equal(decision.marker, VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1);
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
  "sha256:cccc37795507bb5ccf659f28374bafae27f93e56ef3ecbf2f72fd79b05e6185d",
);
assert.equal(
  decision.candidate.service_contract_sha256,
  "sha256:461c97c7f65cce4a96cab7977222fcf9edb4cdd2d89b231709d13a9d1b7f3477",
);
assert.deepEqual(decision.candidate.top_level_source_imports, [
  "../dist/economic/buy_void_allocation_reservation_ledger_v1.js",
  "../dist/economic/buy_void_allocation_reservation_high_water_v1.js",
]);

// Fail closed when a future security repair changes the checked-out service's
// compiled imports without rebinding the untrusted bootstrap candidate.
// This checks top-level specifiers only; it does NOT qualify transitive code.
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

function observedCompiledImports(sourceText) {
  // Dynamic loaders are outside the reviewed closure and HOLD outright.
  // This is deliberately lexical/fail-closed: even a commented future loader
  // must be removed or explicitly reviewed rather than silently ignored.
  assert.doesNotMatch(sourceText, /\bimport\s*\(/u);
  assert.doesNotMatch(sourceText, /\brequire\s*\(/u);

  // Use Node's parser rather than formatting-sensitive regexes so valid static
  // ESM forms such as semicolonless imports and export ... from declarations
  // are included in the dependency census without executing the service.
  const parser = String.raw`
import vm from "node:vm";
let source = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) source += chunk;
const module = new vm.SourceTextModule(source, { identifier: "custody-service.mjs" });
let requests;
// Node 22.23.x may expose moduleRequests without a phase field. Do not
// mistake that partial API for the modern complete metadata contract.
const major = Number(process.versions.node.split(".")[0]);
if (![22, 24, 26].includes(major)) {
  throw new Error("custody_bootstrap_plan_unsupported_node_major_hold");
}
if (major >= 24) {
  if (!Array.isArray(module.moduleRequests)) {
    throw new Error("custody_bootstrap_plan_modern_requests_unavailable_hold");
  }
  // Node 24/26 must expose the full host module-request descriptor.
  requests = module.moduleRequests.map((request) => {
    if (typeof request?.specifier !== "string" ||
        !request.attributes || typeof request.attributes !== "object" ||
        Reflect.ownKeys(request.attributes).length !== 0 ||
        request.phase !== "evaluation") {
      throw new Error("custody_bootstrap_plan_import_metadata_hold");
    }
    return request.specifier;
  });
} else {
  // Node 22 exposes only dependencySpecifiers. Its linker still receives
  // import attributes; link to inert synthetic modules without evaluation.
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
}
process.stdout.write(JSON.stringify(requests));
`;
  const parsed = spawnSync(
    process.execPath,
    ["--experimental-vm-modules", "--input-type=module", "-e", parser],
    {
      input: sourceText,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (parsed.status !== 0) {
    const explanation = String(parsed.stderr || "").trim().slice(0, 2000);
    throw new Error("custody_bootstrap_plan_service_module_request_hold: " + explanation);
  }
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

// Attributes on an ALREADY-ALLOWLISTED import leave its specifier unchanged.
// They must still HOLD. Node 22 uses inert linker metadata; newer Node
// exposes explicit request.attributes and request.phase.
const existingImport = 'import crypto from "node:crypto";';
assert.ok(serviceSource.includes(existingImport));
for (const [label, altered] of [
  ["existing import attributes",
    'import crypto from "node:crypto" with { type: "json" };'],
  ["comment-separated attributes",
    'import crypto from "node:crypto" with /* comment */ { type: "json" };'],
  ["source-phase import",
    'import source crypto from "node:crypto";'],
]) {
  const changed = serviceSource.replace(existingImport, altered);
  assert.notEqual(changed, serviceSource, label);
  assert.throws(
    () => observedCompiledImports(changed),
    /custody_bootstrap_plan_service_module_request_hold/u,
    label + " must HOLD even if the specifier is unchanged",
  );
  assert.notEqual(sourceSha256(changed), decision.candidate.service_source_sha256);
}
const attributedReexport = serviceSource +
  '\nexport { default as extra } from "node:crypto" with { type: "json" };\n';
assert.throws(
  () => observedCompiledImports(attributedReexport),
  /custody_bootstrap_plan_service_module_request_hold/u,
  "static re-export with attributes must HOLD",
);
assert.notEqual(
  sourceSha256(attributedReexport),
  decision.candidate.service_source_sha256,
);
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
assert.equal(classifyBuyAllocationCustodyServiceBootstrapPlanV1(reversedKeys).plan_sha256, decision.plan_sha256);

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
assert.deepEqual(JSON.parse(plan.stdout), decision);
const defaultPlan = run([]);
assert.equal(defaultPlan.status, 0, defaultPlan.stderr);
assert.deepEqual(JSON.parse(defaultPlan.stdout), decision);
const help = run(["--help"]);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /no --apply/u);
for (const args of [["--apply"], ["--plan", "--apply"], ["--install"], ["--plan", "extra"]]) {
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

console.log("VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1_SOURCE_GREEN");
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
console.log("import_attributes_and_non_evaluation_phases_hold_all_node_majors=true");
console.log("relative_package_builtin_and_data_imports_rejected=true");
console.log("module_parser_static_import_census=true");
console.log("semicolonless_and_export_from_dependencies_bound=true");
console.log("forged_all_green_observations_still_hold=true");
console.log("apply_or_install_modes_rejected=true");
console.log("service_or_funds_mutation=false");
console.log("production_gate_ready=false");
