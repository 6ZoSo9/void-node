#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  PARENT_MARKER,
  PARENT_PLAN_ID,
  PARENT_PROOF_GIT_BLOB_SHA1,
  PARENT_SCHEMA,
  PARENT_SOURCE_GIT_BLOB_SHA1,
  PARENT_MODULE_GRAPH_PINS,
  RUNTIME_EXECUTABLE_ACL_AUDIT_MARKER,
  SCHEMA,
  VERSION,
  testOnlyAuthenticatedModuleGraphV2,
  testOnlyExecuteAuthenticatedTypeScriptGraphV2,
  testOnlyBuildRuntimeExecutableAclAuditV2,
  testOnlyBuildRuntimeUserSystemctlInvocationV2,
  testOnlyOpenExecutableLeaseV2,
  testOnlyReadExactReviewedSourceV2,
  testOnlyRequireRuntimeExecutableAclAuditV2,
  testOnlyWithRuntimeUserSystemctlIdentityDropV2,
} from "../ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v2.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET_REL =
  "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v2.ts";
const TARGET_BLOB = "b151f83cdfa452755a2d750243d92384bb41956c";
const PARENT_SOURCE_REL =
  "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.ts";
const PARENT_PROOF_REL =
  "scripts/prove_buy_void_presale_receipt_live_process_host_evidence_v1.ts";
const SYSTEMCTL = "/usr/bin/systemctl";
const EXPECTED_ARGS = Object.freeze([
  "--user",
  "show",
  "void-node-live.service",
  "--property=ActiveState",
  "--property=MainPID",
  "--property=InvocationID",
  "--property=WorkingDirectory",
  "--property=NeedDaemonReload",
  "--no-pager",
]);
const EXPECTED_ENV = Object.freeze({
  PATH: "/usr/bin:/bin",
  HOME: "/nonexistent",
  LANG: "C",
  LC_ALL: "C",
  XDG_RUNTIME_DIR: "/run/user/1000",
  DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
});
const EXPECTED_OPTIONS = Object.freeze({
  encoding: "utf8",
  stdio: Object.freeze(["ignore", "pipe", "pipe"]),
  timeout: 10_000,
  env: EXPECTED_ENV,
});
const childProcess = createRequire(import.meta.url)(
  "node:child_process",
) as typeof import("node:child_process");

type SpawnCall = Readonly<{
  command: unknown;
  args: unknown;
  options: unknown;
}>;

function gitBlob(raw: Buffer): string {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${raw.length}\0`, "utf8"))
    .update(raw)
    .digest("hex");
}

function pin(relative: string, expected: string): Buffer {
  const file = path.join(ROOT, ...relative.split("/"));
  const before = fs.lstatSync(file, { bigint: true });
  assert.equal(before.isFile(), true, relative + ":regular");
  assert.equal(before.isSymbolicLink(), false, relative + ":symlink");
  assert.equal(before.nlink, 1n, relative + ":nlink");
  const raw = fs.readFileSync(file);
  const after = fs.lstatSync(file, { bigint: true });
  for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs"] as const) {
    assert.equal(after[key], before[key], relative + ":" + key);
  }
  assert.equal(BigInt(raw.length), before.size, relative + ":size");
  assert.equal(gitBlob(raw), expected, relative + ":blob");
  return raw;
}

const sourceBytes = pin(TARGET_REL, TARGET_BLOB);
const source = sourceBytes.toString("utf8");
const parentSource = pin(
  PARENT_SOURCE_REL,
  PARENT_SOURCE_GIT_BLOB_SHA1,
).toString("utf8");
const parentProof = pin(
  PARENT_PROOF_REL,
  PARENT_PROOF_GIT_BLOB_SHA1,
).toString("utf8");

assert.equal(Object.keys(PARENT_MODULE_GRAPH_PINS).length, 13);
const productionGraphSources = new Map<string, Buffer>();
for (const [relative, expected] of Object.entries(PARENT_MODULE_GRAPH_PINS)) {
  productionGraphSources.set(relative, pin(relative, expected));
}

assert.equal(MARKER, "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V2");
assert.equal(SCHEMA, "void_buy_void_presale_receipt_live_process_host_evidence_v2");
assert.equal(VERSION, 2);
assert.equal(source.includes('mode: "strip"'), true, "portable_strip_mode_missing");
assert.equal(source.includes('mode: "transform"'), false, "removed_transform_mode_reintroduced");
assert.equal(PARENT_MARKER, "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1");
assert.equal(PARENT_SCHEMA, "void_buy_void_presale_receipt_live_process_host_evidence_v1");
assert.equal(
  PARENT_PLAN_ID,
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab",
);

for (const required of [
  "createRequire",
  "syncBuiltinESMExports",
  'const SYSTEMCTL = "/usr/bin/systemctl"',
  'const SETPRIV = "/usr/bin/setpriv"',
  "function openExecutableLease(",
  "function revalidateExecutableLease(",
  "testOnlyBuildRuntimeExecutableAclAuditV2",
  "testOnlyRequireRuntimeExecutableAclAuditV2",
  'command: "/proc/self/exe"',
  "process.setgroups([])",
  "fs.accessSync(candidate,fs.constants.W_OK)",
  "O_NONBLOCK",
  "testOnlyReadExactReviewedSourceV2",
  "testOnlyOpenExecutableLeaseV2",
  "`--reuid=${uid}`",
  "`--regid=${gid}`",
  '"--clear-groups"',
  '"--no-new-privs"',
  '"--inh-caps=-all"',
  '"--ambient-caps=-all"',
  '"--bounding-set=-all"',
  '"/proc/self/fd/4"',
  '"/proc/self/fd/3"',
  'stdio: ["ignore", "pipe", "pipe", setpriv.fd, systemctl.fd]',
  "childProcess.spawnSync = patched",
  "childProcess.spawnSync = original",
  "const value = await action()",
  "PARENT_SOURCE_GIT_BLOB_SHA1",
  "PARENT_PROOF_GIT_BLOB_SHA1",
  "PARENT_MODULE_GRAPH_PINS",
  "stripTypeScriptTypes",
  "authenticatedTypeScriptDataUrl(",
  "executeAuthenticatedTypeScriptGraph(",
  "revalidateParentModuleGraph(",
  "parent_v1_execution_from_authenticated_data_url: true",
  "parent_v1_path_import_performed: false",
  "readExactReviewedSource(",
  "revalidateReviewedSource(",
  "parentGraph.module.collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1",
  "user_systemd_query_runtime_identity_drop_verified: true",
  "user_systemd_query_numeric_uid_gid_bound: true",
  "user_systemd_query_supplementary_groups_cleared: true",
  "user_systemd_query_no_new_privileges: true",
  "user_systemd_query_capability_sets_cleared: true",
  "user_systemd_query_setpriv_descriptor_bound: true",
  "user_systemd_query_systemctl_descriptor_bound: true",
  "user_systemd_query_executable_acl_runtime_nonwritability_verified: true",
  "systemd_working_directory_root_custody_verified: true",
  "systemd_working_directory_canonicalized:",
  "function canonicalizeWorkingDirectory(",
  "function normalizeSystemctlResult(",
  "process_environment_read_performed",
  "production_host_evidence_authority",
]) {
  assert.equal(source.includes(required), true, required);
}

for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "unlinkSync",
  "renameSync",
  "replaceSync",
  "mkdirSync",
  "chmodSync",
  "chownSync",
  "O_WRONLY",
  "O_RDWR",
  "O_CREAT",
  "O_EXCL",
  'from "node:http"',
  'from "node:https"',
  'from "node:net"',
  'from "node:dgram"',
  "fetch(",
  "/environ",
  '"environ"',
  "NODE_PRIVKEY_PATH",
  "await import(url.href)",
  "pathToFileURL(PARENT_SOURCE)",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

for (const required of [
  "function serviceSnapshot(uid: number): ServiceSnapshot",
  'spawnSync("/usr/bin/systemctl"',
  "const systemdBefore=serviceSnapshot(uid)",
  "const systemdDuring=serviceSnapshot(uid)",
  "const systemdAfter=serviceSnapshot(uid)",
  "process_environment_read_performed:false",
  "credential_access:false",
  "service_mutation_performed:false",
  "funds_movement:false",
]) {
  assert.equal(parentSource.includes(required), true, required);
}
for (const required of [
  '"serviceSnapshot(uid)"',
  '"systemd_metadata_query_performed:true"',
  '"process_environment_read_performed:false"',
  '"credential_access:false"',
]) {
  assert.equal(parentProof.includes(required), true, required);
}

function buildValid() {
  return testOnlyBuildRuntimeUserSystemctlInvocationV2({
    runtime_uid: 1000,
    runtime_gid: 1000,
    command: SYSTEMCTL,
    args: EXPECTED_ARGS,
    options: EXPECTED_OPTIONS,
  });
}

await testOnlyAuthenticatedModuleGraphV2();
const productionParent = (await testOnlyExecuteAuthenticatedTypeScriptGraphV2(
  ROOT,
  PARENT_SOURCE_REL,
  PARENT_MODULE_GRAPH_PINS,
  productionGraphSources,
)) as Readonly<Record<string, unknown>>;
assert.equal(
  productionParent.MARKER,
  "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1",
);
assert.equal(
  typeof productionParent.collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1,
  "function",
);
const built = buildValid();
assert.deepEqual(built.setpriv_args, [
  "--reuid=1000",
  "--regid=1000",
  "--clear-groups",
  "--no-new-privs",
  "--inh-caps=-all",
  "--ambient-caps=-all",
  "--bounding-set=-all",
  "/proc/self/fd/4",
  ...EXPECTED_ARGS,
]);
assert.deepEqual(built.child_options, EXPECTED_OPTIONS);

const aclBuilt = testOnlyBuildRuntimeExecutableAclAuditV2({
  runtime_uid: 1000,
  runtime_gid: 1000,
  executables: ["/usr/bin/setpriv", "/usr/bin/systemctl"],
});
assert.equal(aclBuilt.command, "/proc/self/exe");
assert.equal(aclBuilt.audit_paths.includes("/usr/bin/setpriv"), true);
assert.equal(aclBuilt.audit_paths.includes("/usr/bin/systemctl"), true);
assert.equal(aclBuilt.audit_paths.includes("/usr/bin"), true);
assert.equal(aclBuilt.audit_paths.includes("/usr"), true);
assert.equal(aclBuilt.audit_paths.includes("/"), true);
assert.equal(aclBuilt.args[0], "--input-type=module");
assert.equal(aclBuilt.args[1], "-e");
assert.equal(String(aclBuilt.args[2]).includes("process.setgroups([])"), true);
assert.equal(
  String(aclBuilt.args[2]).includes("fs.accessSync(candidate,fs.constants.W_OK)"),
  true,
);
assert.equal(aclBuilt.args.includes("1000"), true);

const runtimeWritableSpawn = ((..._raw: unknown[]) => ({
  pid: 4200,
  output: [null, "", ""],
  stdout: "",
  stderr: "runtime_writable",
  status: 94,
  signal: null,
  error: undefined,
})) as unknown as typeof childProcess.spawnSync;
expectReject(
  () => testOnlyRequireRuntimeExecutableAclAuditV2(
    {
      runtime_uid: 1000,
      runtime_gid: 1000,
      executables: ["/usr/bin/setpriv", "/usr/bin/systemctl"],
    },
    runtimeWritableSpawn,
  ),
  "lane1_v2_executable_runtime_acl_audit_failed",
);

function expectReject(action: () => unknown, prefix: string): void {
  assert.throws(action, (error: unknown) => {
    return error instanceof Error && error.message.startsWith(prefix);
  });
}

expectReject(
  () =>
    testOnlyBuildRuntimeUserSystemctlInvocationV2({
      runtime_uid: 0,
      runtime_gid: 1000,
      command: SYSTEMCTL,
      args: EXPECTED_ARGS,
      options: EXPECTED_OPTIONS,
    }),
  "lane1_v2_runtime_uid_invalid",
);
expectReject(
  () =>
    testOnlyBuildRuntimeUserSystemctlInvocationV2({
      runtime_uid: 1000,
      runtime_gid: 1000,
      command: "/tmp/systemctl",
      args: EXPECTED_ARGS,
      options: EXPECTED_OPTIONS,
    }),
  "lane1_v2_systemctl_command_invalid",
);
for (const args of [
  [...EXPECTED_ARGS.slice(0, 2), "other.service", ...EXPECTED_ARGS.slice(3)],
  [...EXPECTED_ARGS, "--property=Environment"],
  EXPECTED_ARGS.slice(0, -1),
]) {
  expectReject(
    () =>
      testOnlyBuildRuntimeUserSystemctlInvocationV2({
        runtime_uid: 1000,
        runtime_gid: 1000,
        command: SYSTEMCTL,
        args,
        options: EXPECTED_OPTIONS,
      }),
    "lane1_v2_systemctl_arguments_invalid",
  );
}
for (const options of [
  { ...EXPECTED_OPTIONS, timeout: 0 },
  { ...EXPECTED_OPTIONS, stdio: ["inherit", "pipe", "pipe"] },
  { ...EXPECTED_OPTIONS, env: { ...EXPECTED_ENV, HOME: "/home/zoso" } },
  { ...EXPECTED_OPTIONS, env: { ...EXPECTED_ENV, EXTRA: "1" } },
  { ...EXPECTED_OPTIONS, shell: true },
]) {
  expectReject(
    () =>
      testOnlyBuildRuntimeUserSystemctlInvocationV2({
        runtime_uid: 1000,
        runtime_gid: 1000,
        command: SYSTEMCTL,
        args: EXPECTED_ARGS,
        options,
      }),
    "lane1_v2_",
  );
}

const fifoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-lane1-v2-fifo-"));
try {
  const fifo = path.join(fifoRoot, "swap.fifo");
  const made = childProcess.spawnSync("/usr/bin/mkfifo", ["--", fifo], {
    cwd: "/",
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 5_000,
  });
  assert.equal(made.error, undefined);
  assert.equal(made.signal, null);
  assert.equal(made.status, 0, String(made.stderr || ""));

  const target = "/usr/bin/setpriv";
  const expectedTargetBlob = gitBlob(fs.readFileSync(target));
  const realOpenSync = fs.openSync;

  let sourceFlags = 0;
  fs.openSync = ((file: unknown, flags: unknown, mode?: unknown): number => {
    if (file === target) {
      sourceFlags = Number(flags);
      assert.notEqual(sourceFlags & Number(fs.constants.O_NONBLOCK || 0), 0);
      return Reflect.apply(realOpenSync, fs, [fifo, flags, mode]) as number;
    }
    return Reflect.apply(realOpenSync, fs, [file, flags, mode]) as number;
  }) as typeof fs.openSync;
  try {
    expectReject(
      () => testOnlyReadExactReviewedSourceV2(target, expectedTargetBlob),
      "lane1_v2_parent_source_open_identity_mismatch",
    );
  } finally {
    fs.openSync = realOpenSync;
  }
  assert.notEqual(sourceFlags & Number(fs.constants.O_NONBLOCK || 0), 0);

  let executableFlags = 0;
  fs.openSync = ((file: unknown, flags: unknown, mode?: unknown): number => {
    if (file === target) {
      executableFlags = Number(flags);
      assert.notEqual(executableFlags & Number(fs.constants.O_NONBLOCK || 0), 0);
      return Reflect.apply(realOpenSync, fs, [fifo, flags, mode]) as number;
    }
    return Reflect.apply(realOpenSync, fs, [file, flags, mode]) as number;
  }) as typeof fs.openSync;
  try {
    expectReject(
      () => testOnlyOpenExecutableLeaseV2(target),
      "lane1_v2_executable_open_identity_mismatch",
    );
  } finally {
    fs.openSync = realOpenSync;
  }
  assert.notEqual(executableFlags & Number(fs.constants.O_NONBLOCK || 0), 0);
} finally {
  fs.rmSync(fifoRoot, { recursive: true, force: true });
}

const realSpawnSync = childProcess.spawnSync;
const calls: SpawnCall[] = [];
const fakeSpawnSync = ((...raw: unknown[]) => {
  calls.push(Object.freeze({ command: raw[0], args: raw[1], options: raw[2] }));
  if (raw[0] === "/proc/self/exe") {
    return {
      pid: 4241,
      output: [null, RUNTIME_EXECUTABLE_ACL_AUDIT_MARKER + "\n", ""],
      stdout: RUNTIME_EXECUTABLE_ACL_AUDIT_MARKER + "\n",
      stderr: "",
      status: 0,
      signal: null,
      error: undefined,
    };
  }
  return {
    pid: 4242,
    output: [null, "", ""],
    stdout:
      "ActiveState=active\n" +
      "MainPID=1234\n" +
      "InvocationID=" + "a".repeat(32) + "\n" +
      "WorkingDirectory=/bin\n" +
      "NeedDaemonReload=no\n",
    stderr: "",
    status: 0,
    signal: null,
    error: undefined,
  };
}) as unknown as typeof childProcess.spawnSync;

try {
  childProcess.spawnSync = fakeSpawnSync;
  syncBuiltinESMExports();
  const encoded = encodeURIComponent(`
    import { spawnSync } from "node:child_process";
    export function run(args, options) {
      const user = spawnSync("/usr/bin/systemctl", args, options);
      const other = spawnSync("/bin/echo", ["ok"], { encoding: "utf8" });
      return { user, other };
    }
  `);
  const probe = (await import(`data:text/javascript,${encoded}`)) as Readonly<{
    run(args: readonly string[], options: unknown): unknown;
  }>;
  const adapted = await testOnlyWithRuntimeUserSystemctlIdentityDropV2(
    1000,
    1000,
    async () => probe.run(EXPECTED_ARGS, EXPECTED_OPTIONS),
  );
  assert.equal(adapted.audit.systemd_query_count, 1);
  assert.equal(adapted.audit.working_directory_custody_verified_count, 1);
  assert.equal(
    adapted.audit.executable_acl_runtime_nonwritability_verified_count >= 5,
    true,
  );
  assert.equal(adapted.audit.working_directory_canonicalized_count, 1);
  const adaptedValue = adapted.value as Readonly<{
    user: Readonly<{ stdout: string }>;
  }>;
  assert.equal(
    adaptedValue.user.stdout.includes("WorkingDirectory=/usr/bin\n"),
    true,
  );
  assert.equal(calls.length, 3);
  assert.equal(calls[0]!.command, "/proc/self/exe");
  const aclArgs = calls[0]!.args as string[];
  assert.equal(aclArgs[0], "--input-type=module");
  assert.equal(aclArgs[1], "-e");
  assert.equal(aclArgs.includes("/usr/bin/setpriv"), true);
  assert.equal(aclArgs.includes("/usr/bin/systemctl"), true);
  assert.equal(calls[1]!.command, "/proc/self/fd/3");
  const droppedArgs = calls[1]!.args as string[];
  assert.deepEqual(droppedArgs.slice(0, 8), [
    "--reuid=1000",
    "--regid=1000",
    "--clear-groups",
    "--no-new-privs",
    "--inh-caps=-all",
    "--ambient-caps=-all",
    "--bounding-set=-all",
    "/proc/self/fd/4",
  ]);
  assert.deepEqual(droppedArgs.slice(8), EXPECTED_ARGS);
  const droppedOptions = calls[1]!.options as Readonly<{
    cwd: string;
    stdio: readonly unknown[];
    env: NodeJS.ProcessEnv;
  }>;
  assert.equal(droppedOptions.cwd, "/");
  assert.equal(droppedOptions.stdio.length, 5);
  assert.deepEqual(droppedOptions.stdio.slice(0, 3), ["ignore", "pipe", "pipe"]);
  assert.equal(typeof droppedOptions.stdio[3], "number");
  assert.equal(typeof droppedOptions.stdio[4], "number");
  assert.deepEqual(droppedOptions.env, EXPECTED_ENV);
  assert.equal(calls[2]!.command, "/bin/echo");
  assert.deepEqual(calls[2]!.args, ["ok"]);
  assert.equal(childProcess.spawnSync, fakeSpawnSync);

  let throwObserved = false;
  try {
    await testOnlyWithRuntimeUserSystemctlIdentityDropV2(1000, 1000, async () => {
      throw new Error("proof_action_failure");
    });
  } catch (error) {
    throwObserved = error instanceof Error && error.message === "proof_action_failure";
  }
  assert.equal(throwObserved, true);
  assert.equal(childProcess.spawnSync, fakeSpawnSync);

  let nestedRejected = false;
  await testOnlyWithRuntimeUserSystemctlIdentityDropV2(1000, 1000, async () => {
    try {
      await testOnlyWithRuntimeUserSystemctlIdentityDropV2(1000, 1000, async () => {});
    } catch (error) {
      nestedRejected =
        error instanceof Error &&
        error.message === "lane1_v2_child_process_patch_already_active";
    }
  });
  assert.equal(nestedRejected, true);
  assert.equal(childProcess.spawnSync, fakeSpawnSync);
} finally {
  childProcess.spawnSync = realSpawnSync;
  syncBuiltinESMExports();
}

console.log(MARKER + "_PROOF_GREEN");
console.log("exact_parent_v1_source_blob_bound=true");
console.log("exact_parent_v1_proof_blob_bound=true");
console.log("parent_v1_authenticated_module_graph_bound=true");
console.log("parent_v1_module_graph_path_count=13");
console.log("parent_v1_execution_from_authenticated_data_url=true");
console.log("production_v1_module_graph_executed_in_ci=true");
console.log("portable_erasable_typescript_strip_mode=true");
console.log("parent_v1_path_import_performed=false");
console.log("reviewed_source_open_nonblocking=true");
console.log("executable_lease_open_nonblocking=true");
console.log("regular_to_fifo_preopen_race_holds=true");
console.log("diagnosed_root_peer_credential_failure_repaired=true");
console.log("systemctl_query_exact_shape_required=true");
console.log("systemctl_environment_exact_shape_required=true");
console.log("systemd_working_directory_root_custody_required=true");
console.log("systemd_working_directory_symlink_canonicalized=true");
console.log("numeric_runtime_uid_gid_drop_required=true");
console.log("supplementary_groups_cleared=true");
console.log("no_new_privileges_required=true");
console.log("inheritable_permitted_effective_bounding_ambient_caps_cleared=true");
console.log("setpriv_descriptor_execution_required=true");
console.log("systemctl_descriptor_execution_required=true");
console.log("runtime_executable_acl_nonwritability_required=true");
console.log("runtime_executable_acl_audit_uses_current_node_exe=true");
console.log("runtime_writable_executable_rejected=true");
console.log("builtin_spawn_sync_patch_reaches_named_import=true");
console.log("builtin_spawn_sync_patch_restored_after_success=true");
console.log("builtin_spawn_sync_patch_restored_after_failure=true");
console.log("nested_patch_rejected=true");
console.log("non_systemctl_spawn_sync_passthrough=true");
console.log("parent_v1_positive_evidence_contract_inherited=true");
console.log("parent_v1_negative_authority_contract_inherited=true");
console.log("process_environment_read_performed=false");
console.log("filesystem_write_performed=false");
console.log("service_mutation_performed=false");
console.log("credential_access=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
console.log("production_host_evidence_authority=false");
