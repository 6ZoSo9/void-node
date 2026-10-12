#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1,
  testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1,
  testOnlyClassifyBuyVoidAllocationCustodyPolkitStatusV1,
  testOnlyReadBuyVoidAllocationCustodyHostEvidenceFileV1,
  testOnlyValidateBuyVoidAllocationCustodyExecStartV1,
} from "../tools/void-buy-allocation-custody-host-evidence-v1.mjs";

const SOURCE_PATH =
  "tools/void-buy-allocation-custody-host-evidence-v1.mjs";
const SERVICE_PATH =
  "tools/void-buy-allocation-custody-service-v1.mjs";
const CONTRACT_PATH =
  "docs/architecture/buy-void-allocation-custody-service-contract-v1.json";

const sha256Id = (bytes) =>
  "sha256:" +
  crypto.createHash("sha256").update(bytes).digest("hex");

const source = fs.readFileSync(SOURCE_PATH, "utf8");
const service = fs.readFileSync(SERVICE_PATH);
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1",
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1
    .runtime_service_control_denial_proven,
  true,
);
for (const key of [
  "descriptor_bound_file_reads",
  "exact_head_object_binding",
  "exact_service_exec_binding",
  "git_optional_locks_disabled",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1[key],
    true,
    key,
  );
}
for (const key of [
  "service_install",
  "service_start",
  "service_restart",
  "daemon_reload",
  "mount_mutation",
  "permission_mutation",
  "runtime_integration",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "inventory_mutation",
  "market_activation",
  "public_presale_activation",
  "treasury_or_liquidity_movement",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1[key],
    false,
    key,
  );
}

assert.equal(
  contract.service_source_sha256,
  sha256Id(service),
  "collector must consume the exact reviewed custody-service source",
);

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-custody-host-evidence-ancestor-"),
  );
  try {
    const realParent = path.join(root, "real");
    const linkedParent = path.join(root, "linked");
    const file = path.join(realParent, "evidence.txt");
    fs.mkdirSync(realParent, { mode: 0o700 });
    fs.writeFileSync(file, "descriptor-bound\n", { mode: 0o600 });
    fs.symlinkSync(realParent, linkedParent);

    assert.equal(
      testOnlyReadBuyVoidAllocationCustodyHostEvidenceFileV1(
        file,
        4096,
      ).toString("utf8"),
      "descriptor-bound\n",
      "direct ancestor chain must remain readable",
    );
    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationCustodyHostEvidenceFileV1(
          path.join(linkedParent, "evidence.txt"),
          4096,
        ),
      /custody_host_evidence_test_read_failed/u,
      "symlinked ancestor must fail closed",
    );
    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationCustodyHostEvidenceFileV1(
          "relative-evidence.txt",
          4096,
        ),
      /custody_host_evidence_test_read_failed/u,
      "relative evidence paths must fail closed",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const reviewedExecSource =
  "/repo/tools/void-buy-allocation-custody-service-v1.mjs";
assert.equal(
  testOnlyValidateBuyVoidAllocationCustodyExecStartV1(
    "{ path=/usr/bin/node ; argv[]=/usr/bin/node /repo/tools/void-buy-allocation-custody-service-v1.mjs ; ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a] ; pid=0 ; code=(null) ; status=0/0 }",
    "/usr/bin/node",
    reviewedExecSource,
  ),
  true,
);
for (const candidate of [
  "{ path=/usr/bin/printf ; argv[]=/usr/bin/printf " +
    reviewedExecSource + " ; ignore_errors=no }",
  "{ path=/usr/bin/node ; argv[]=/bin/sh " +
    reviewedExecSource + " ; ignore_errors=no }",
  "{ path=/usr/bin/node ; argv[]=/usr/bin/node " +
    reviewedExecSource + " --extra ; ignore_errors=no }",
  "{ path=/usr/bin/node ; argv[]=/usr/bin/node " +
    reviewedExecSource + " ; ignore_errors=no } " +
    "{ path=/usr/bin/true ; argv[]=/usr/bin/true ; ignore_errors=no }",
]) {
  assert.equal(
    testOnlyValidateBuyVoidAllocationCustodyExecStartV1(
      candidate,
      "/usr/bin/node",
      reviewedExecSource,
    ),
    false,
    candidate,
  );
}

assert.deepEqual(
  [
    [0, "authorized"],
    [1, "denied"],
    [2, "challenge"],
    [3, "dismissed"],
    [126, "error"],
    [127, "error"],
    [-1, "error"],
    ["x", "error"],
  ].map(([status, expected]) => [
    status,
    testOnlyClassifyBuyVoidAllocationCustodyPolkitStatusV1(status),
    expected,
  ]),
  [
    [0, "authorized", "authorized"],
    [1, "denied", "denied"],
    [2, "challenge", "challenge"],
    [3, "dismissed", "dismissed"],
    [126, "error", "error"],
    [127, "error", "error"],
    [-1, "error", "error"],
    ["x", "error", "error"],
  ],
);

const denyRule =
  testOnlyBuildBuyVoidAllocationCustodyPolkitDenyRuleV1(
    "void-buy-runtime",
  );
assert.equal(
  denyRule,
  [
    "polkit.addRule(function(action, subject) {",
    "  if (",
    '    subject.user === "void-buy-runtime" &&',
    "    (",
    '      action.id === "org.freedesktop.systemd1.manage-units" ||',
    '      action.id === "org.freedesktop.systemd1.manage-unit-files" ||',
    '      action.id === "org.freedesktop.systemd1.reload-daemon" ||',
    '      action.id === "org.freedesktop.systemd1.set-environment"',
    "    )",
    "  ) {",
    "    return polkit.Result.NO;",
    "  }",
    "  return polkit.Result.NOT_HANDLED;",
    "});",
    "",
  ].join("\n"),
);
assert.doesNotMatch(
  denyRule,
  /YES|AUTH_|KEEP/u,
  "deny rule must not contain an authorization path",
);
assert.match(
  source,
  /00-void-buy-allocation-custody-runtime-deny-v1\.rules/u,
);
assert.match(
  source,
  /custody_host_evidence_polkit_deny_rule_not_first/u,
  "deny rule must be lexically first across /etc and /usr rule sets",
);
assert.doesNotMatch(
  source,
  /localeCompare/u,
  "rule ordering must not depend on host locale",
);
assert.match(
  source,
  /left\.name < right\.name/u,
  "ASCII rule names must use deterministic raw lexical order",
);
assert.match(
  source,
  /custody_host_evidence_polkit_deny_rule_bytes_mismatch/u,
  "installed deny rule must match exact reviewed bytes",
);
assert.match(
  source,
  /Number\(stat\.uid\) !== 0/u,
  "deny rule must be root-owned",
);
assert.match(
  source,
  /\(Number\(stat\.mode\) & 0o022\) !== 0/u,
  "deny rule must not be group/world writable",
);

assert.match(
  source,
  /String\(pid\) \+ "," \+ startTimeTicks \+ "," \+ String\(runtime\.uid\)/u,
  "pkcheck subject must bind PID,start-time,UID",
);
assert.match(source, /"\/proc\/" \+ String\(pid\) \+ "\/stat"/u);
assert.match(source, /"ps",\s*\["-o", "uid=,gid=", "-p", String\(pid\)\]/u);
assert.doesNotMatch(
  source,
  /--allow-user-interaction|--enable-internal-agent/u,
  "authorization evidence must be non-interactive",
);

for (const action of [
  "org.freedesktop.systemd1.manage-units",
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
  "org.freedesktop.systemd1.set-environment",
]) {
  assert.ok(source.includes(JSON.stringify(action)), action);
}
for (const verb of [
  "start",
  "verify-active",
  "stop",
  "reload",
  "reload-or-start",
  "restart",
  "try-restart",
  "try-reload",
  "nop",
  "reload-or-restart",
  "reload-or-try-restart",
  "kill",
  "clean",
  "set-property",
  "reset-failed",
  "ref",
  "bind-mount",
  "mount-image",
]) {
  assert.ok(
    source.includes(JSON.stringify(verb)),
    "missing manage-units verb " + verb,
  );
}

assert.match(
  source,
  /classification !== "denied"/u,
  "anything other than explicit denial must fail closed",
);
assert.match(
  source,
  /custody_host_evidence_runtime_service_control_authorized/u,
);
assert.match(
  source,
  /custody_host_evidence_runtime_service_control_not_explicitly_denied/u,
);
assert.match(
  source,
  /runtime_can_control_service:\s*false/u,
  "successful control evidence must derive false",
);
assert.doesNotMatch(
  source,
  /runtime_can_control_service:\s*true/u,
  "collector must not hardcode the old incompatible value",
);
assert.match(
  source,
  /runtime_service_unit/u,
  "runtime service identity must be explicit collector configuration",
);
assert.match(
  source,
  /MainPID/u,
  "collector must bind the running runtime process",
);
assert.match(
  source,
  /ControlGroup/u,
  "collector must bind the runtime service cgroup",
);
assert.match(
  source,
  /NoNewPrivileges/u,
  "collector must require runtime no-new-privileges",
);

assert.match(
  source,
  /REVIEWED_SYSTEMD_MAJOR = 255/u,
  "collector authorization model must bind reviewed systemd v255",
);
assert.match(
  source,
  /custody_host_evidence_systemd_major_not_reviewed/u,
  "unreviewed systemd major must HOLD",
);
assert.match(
  source,
  /CapabilityBoundingSet/u,
  "collector must bind configured runtime capability bounding set",
);
assert.match(
  source,
  /AmbientCapabilities/u,
  "collector must bind configured runtime ambient capabilities",
);
for (const capabilityField of ["CapInh", "CapPrm", "CapEff", "CapAmb"]) {
  assert.ok(
    source.includes(JSON.stringify(capabilityField)),
    "collector must bind live process capability field " + capabilityField,
  );
}
assert.match(
  source,
  /NoNewPrivs/u,
  "collector must bind live kernel no-new-privileges state",
);
assert.match(
  source,
  /custody_host_evidence_runtime_process_no_new_privileges_not_enforced/u,
  "configured NoNewPrivileges is insufficient without live process enforcement",
);
assert.match(
  source,
  /custody_host_evidence_runtime_process_capabilities_nonzero/u,
  "any live runtime capability must HOLD",
);
assert.match(
  source,
  /custody_host_evidence_runtime_service_capabilities_not_empty/u,
  "configured runtime service capabilities must be empty",
);
assert.match(
  source,
  /runtime_service_control_evidence/u,
  "control-denial evidence must be included in the content-addressed packet",
);
assert.match(
  source,
  /canonicalJson\(body\)/u,
  "collector receipt must remain content-addressed",
);

for (const mutation of [
  /fs\.writeFileSync/u,
  /fs\.mkdirSync/u,
  /fs\.chmodSync/u,
  /fs\.chownSync/u,
  /fs\.renameSync/u,
  /fs\.unlinkSync/u,
]) {
  assert.doesNotMatch(
    source,
    mutation,
    "collector must remain read-only",
  );
}

assert.match(source, /openReadNoFollow\(file\)/u);
assert.match(source, /fs\.constants\.O_DIRECTORY/u);
assert.match(source, /"\/proc\/self\/fd"/u);
assert.match(
  source,
  /parts\.slice\(0, -1\)/u,
  "every ancestor component must be opened descriptor-relative",
);
assert.match(
  source,
  /fs\.constants\.O_DIRECTORY[\s\S]{0,160}fs\.constants\.O_NOFOLLOW/u,
  "ancestor opens must reject symlink components",
);
assert.match(source, /io\.fstat\(fd\)/u);
assert.match(source, /io\.readFd\(fd, maximum\)/u);
assert.match(source, /--no-optional-locks/u);
assert.match(source, /head \+ ":" \+ relativePath/u);
assert.match(source, /custody_host_evidence_writer_source_head_mismatch/u);
assert.match(source, /custody_host_evidence_service_source_head_mismatch/u);
assert.match(source, /validateServiceExecStart\(/u);
assert.doesNotMatch(
  source,
  /execStart\.includes\(serviceContract\.source_path\)/u,
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V1_PROOF_GREEN",
);
console.log("descriptor_relative_ancestor_walk=true");
console.log("symlink_ancestor_read_rejected=true");
console.log("relative_evidence_path_rejected=true");
console.log("runtime_process_pid_starttime_uid_bound=true");
console.log("runtime_process_uid_gid_revalidated=true");
console.log("runtime_service_cgroup_bound=true");
console.log("reviewed_systemd_major=255");
console.log("runtime_service_capability_sets_empty=true");
console.log("runtime_process_capabilities_zero=true");
console.log("runtime_process_no_new_privileges_enforced=true");
console.log("global_polkit_runtime_deny_rule_bound=true");
console.log("global_polkit_deny_rule_lexically_first=true");
console.log("global_polkit_deny_rule_root_owned=true");
console.log("pkcheck_noninteractive=true");
console.log("pkcheck_explicit_denial_only=true");
console.log("pkcheck_authorized_holds=true");
console.log("pkcheck_challenge_holds=true");
console.log("pkcheck_dismissed_holds=true");
console.log("pkcheck_error_holds=true");
console.log("systemd_manage_units_denial_required=true");
console.log("systemd_manage_unit_files_denial_required=true");
console.log("systemd_reload_daemon_denial_required=true");
console.log("systemd_set_environment_denial_required=true");
console.log("reviewed_custody_service_contract_bound=true");
console.log("runtime_can_control_service=false");
console.log("filesystem_write=false");
console.log("service_mutation=false");
console.log("mount_mutation=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
