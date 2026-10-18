#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V2";
export const SCHEMA =
  "void_buy_void_presale_receipt_live_process_host_evidence_v2";
export const VERSION = 2;
export const PARENT_MARKER =
  "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1";
export const PARENT_SCHEMA =
  "void_buy_void_presale_receipt_live_process_host_evidence_v1";
export const PARENT_SOURCE_GIT_BLOB_SHA1 =
  "ba69d46ffa6f7d178de447b469b578fa8e87ea3b";
export const PARENT_PROOF_GIT_BLOB_SHA1 =
  "350354779caac35d7442b1315826b8b0c27463e2";
export const PARENT_PLAN_ID =
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PARENT_SOURCE = path.join(
  ROOT,
  "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.ts",
);
const PARENT_PROOF = path.join(
  ROOT,
  "scripts/prove_buy_void_presale_receipt_live_process_host_evidence_v1.ts",
);
const SYSTEMCTL = "/usr/bin/systemctl";
const SETPRIV = "/usr/bin/setpriv";
const SERVICE_UNIT = "void-node-live.service";
const MAX_PARENT_BYTES = 2 * 1024 * 1024;
const UINT = /^[1-9][0-9]*$/u;
const childProcess = createRequire(import.meta.url)(
  "node:child_process",
) as typeof import("node:child_process");

type PlainRecord = Record<string, unknown>;
type SpawnSyncFunction = typeof childProcess.spawnSync;
type ExecutableLease = Readonly<{
  canonicalPath: string;
  fd: number;
  opened: fs.BigIntStats;
}>;
type IdentityDropAudit = Readonly<{
  systemd_query_count: number;
  working_directory_custody_verified_count: number;
  working_directory_canonicalized_count: number;
}>;
type MutableIdentityDropAudit = {
  systemd_query_count: number;
  working_directory_custody_verified_count: number;
  working_directory_canonicalized_count: number;
};

type ParentModule = Readonly<{
  MARKER: typeof PARENT_MARKER;
  SCHEMA: typeof PARENT_SCHEMA;
  PARENT_PLAN_ID: string;
  collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1(input: {
    runtime_uid: number;
    runtime_gid: number;
  }): Promise<unknown>;
}>;

let patchActive = false;

function fail(code: string): never {
  throw new Error(code);
}

function positive(raw: unknown, code: string): number {
  const text = String(raw ?? "");
  if (!UINT.test(text)) fail(code);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value <= 0 || value > 0x7fff_ffff) {
    fail(code);
  }
  return value;
}

function plainRecord(raw: unknown, code: string): PlainRecord {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) fail(code);
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) fail(code);
  return raw as PlainRecord;
}

function gitBlob(raw: Buffer): string {
  return crypto
    .createHash("sha1")
    .update(Buffer.from(`blob ${raw.length}\0`, "utf8"))
    .update(raw)
    .digest("hex");
}

function sameStat(a: fs.BigIntStats, b: fs.BigIntStats): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function proveRootCustodyPath(absolute: string, wantDirectory: boolean): void {
  const resolved = path.resolve(absolute);
  if (!path.isAbsolute(absolute) || resolved !== absolute) {
    fail("lane1_v2_root_custody_path_not_canonical");
  }
  const leaf = fs.lstatSync(resolved, { bigint: true });
  if (
    leaf.isSymbolicLink() ||
    (wantDirectory ? !leaf.isDirectory() : !leaf.isFile()) ||
    leaf.uid !== 0n ||
    (leaf.mode & 0o022n) !== 0n
  ) {
    fail("lane1_v2_root_custody_leaf_invalid");
  }
  let cursor = wantDirectory ? resolved : path.dirname(resolved);
  for (;;) {
    const current = fs.lstatSync(cursor, { bigint: true });
    if (
      !current.isDirectory() ||
      current.isSymbolicLink() ||
      current.uid !== 0n ||
      (current.mode & 0o022n) !== 0n
    ) {
      fail("lane1_v2_root_custody_ancestor_invalid");
    }
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
}

function readExactReviewedSource(
  absolute: string,
  expectedBlob: string,
): Readonly<{ bytes: Buffer; opened: fs.BigIntStats }> {
  proveRootCustodyPath(absolute, false);
  const noFollow = Number(fs.constants.O_NOFOLLOW || 0);
  if (process.platform !== "linux" || noFollow <= 0) {
    fail("lane1_v2_nofollow_unavailable");
  }
  const before = fs.lstatSync(absolute, { bigint: true });
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1n ||
    before.size < 1n ||
    before.size > BigInt(MAX_PARENT_BYTES)
  ) {
    fail("lane1_v2_parent_source_metadata_invalid");
  }
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!sameStat(before, opened)) {
      fail("lane1_v2_parent_source_open_identity_mismatch");
    }
    const bytes = Buffer.alloc(Number(opened.size));
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(absolute, { bigint: true });
    if (
      offset !== bytes.length ||
      !sameStat(opened, after) ||
      !sameStat(after, visible) ||
      gitBlob(bytes) !== expectedBlob
    ) {
      fail("lane1_v2_parent_source_generation_invalid");
    }
    return Object.freeze({ bytes, opened });
  } finally {
    fs.closeSync(fd);
  }
}

function revalidateReviewedSource(
  absolute: string,
  expectedBlob: string,
  opened: fs.BigIntStats,
): void {
  const current = readExactReviewedSource(absolute, expectedBlob);
  if (!sameStat(opened, current.opened)) {
    fail("lane1_v2_parent_source_generation_changed");
  }
}

function executableTrusted(st: fs.BigIntStats): boolean {
  return (
    st.isFile() &&
    !st.isSymbolicLink() &&
    st.uid === 0n &&
    st.gid === 0n &&
    st.nlink >= 1n &&
    (st.mode & 0o022n) === 0n &&
    (st.mode & 0o111n) !== 0n &&
    st.size > 0n
  );
}

function openExecutableLease(absolute: string): ExecutableLease {
  const canonical = fs.realpathSync.native(absolute);
  if (canonical !== absolute) fail("lane1_v2_executable_symlink_forbidden");
  proveRootCustodyPath(canonical, false);
  const noFollow = Number(fs.constants.O_NOFOLLOW || 0);
  if (process.platform !== "linux" || noFollow <= 0) {
    fail("lane1_v2_executable_nofollow_unavailable");
  }
  const before = fs.lstatSync(canonical, { bigint: true });
  if (!executableTrusted(before)) fail("lane1_v2_executable_custody_invalid");
  const fd = fs.openSync(canonical, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!executableTrusted(opened) || !sameStat(before, opened)) {
      fail("lane1_v2_executable_open_identity_mismatch");
    }
    return Object.freeze({ canonicalPath: canonical, fd, opened });
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function revalidateExecutableLease(lease: ExecutableLease): void {
  const held = fs.fstatSync(lease.fd, { bigint: true });
  const visible = fs.lstatSync(lease.canonicalPath, { bigint: true });
  if (
    !executableTrusted(held) ||
    !executableTrusted(visible) ||
    !sameStat(lease.opened, held) ||
    !sameStat(held, visible)
  ) {
    fail("lane1_v2_executable_generation_changed");
  }
}

function closeExecutableLease(lease: ExecutableLease): void {
  fs.closeSync(lease.fd);
}

function proveRootOwnedAncestors(absoluteDirectory: string): void {
  let cursor = path.resolve(absoluteDirectory);
  if (!path.isAbsolute(absoluteDirectory) || cursor !== absoluteDirectory) {
    fail("lane1_v2_working_directory_parent_not_canonical");
  }
  for (;;) {
    const current = fs.lstatSync(cursor, { bigint: true });
    if (
      !current.isDirectory() ||
      current.isSymbolicLink() ||
      current.uid !== 0n ||
      (current.mode & 0o022n) !== 0n
    ) {
      fail("lane1_v2_working_directory_parent_custody_invalid");
    }
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
}

function canonicalizeWorkingDirectory(raw: string): Readonly<{
  canonical: string;
  changed: boolean;
}> {
  if (!path.isAbsolute(raw) || path.resolve(raw) !== raw || raw.includes("\0")) {
    fail("lane1_v2_working_directory_invalid");
  }
  proveRootOwnedAncestors(path.dirname(raw));
  const before = fs.lstatSync(raw, { bigint: true });
  if (
    before.uid !== 0n ||
    (!before.isDirectory() && !before.isSymbolicLink()) ||
    (before.isDirectory() && (before.mode & 0o022n) !== 0n)
  ) {
    fail("lane1_v2_working_directory_leaf_custody_invalid");
  }
  const canonical = fs.realpathSync.native(raw);
  proveRootCustodyPath(canonical, true);
  const after = fs.lstatSync(raw, { bigint: true });
  const canonicalAfter = fs.realpathSync.native(raw);
  if (!sameStat(before, after) || canonicalAfter !== canonical) {
    fail("lane1_v2_working_directory_generation_changed");
  }
  return Object.freeze({ canonical, changed: canonical !== raw });
}

function normalizeSystemctlResult(
  raw: unknown,
  audit: MutableIdentityDropAudit,
): unknown {
  audit.systemd_query_count += 1;
  const result = plainRecord(raw, "lane1_v2_systemctl_result_invalid");
  if (result.status !== 0) return raw;
  if (typeof result.stdout !== "string" || typeof result.stderr !== "string") {
    fail("lane1_v2_systemctl_result_encoding_invalid");
  }
  const lines = result.stdout.trim().split(/\r?\n/u);
  const fields = new Map<string, string>();
  for (const line of lines) {
    const at = line.indexOf("=");
    if (at <= 0) fail("lane1_v2_systemctl_output_invalid");
    const key = line.slice(0, at);
    if (fields.has(key)) fail("lane1_v2_systemctl_output_duplicate_field");
    fields.set(key, line.slice(at + 1));
  }
  const expectedKeys = [
    "ActiveState",
    "MainPID",
    "InvocationID",
    "WorkingDirectory",
    "NeedDaemonReload",
  ];
  if (
    fields.size !== expectedKeys.length ||
    expectedKeys.some((key) => !fields.has(key))
  ) {
    fail("lane1_v2_systemctl_output_field_set_invalid");
  }
  const working = canonicalizeWorkingDirectory(
    fields.get("WorkingDirectory") || "",
  );
  audit.working_directory_custody_verified_count += 1;
  if (working.changed) audit.working_directory_canonicalized_count += 1;
  fields.set("WorkingDirectory", working.canonical);
  const stdout =
    expectedKeys.map((key) => `${key}=${fields.get(key) || ""}`).join("\n") +
    "\n";
  return { ...result, stdout };
}

const EXPECTED_SYSTEMCTL_ARGS = Object.freeze([
  "--user",
  "show",
  SERVICE_UNIT,
  "--property=ActiveState",
  "--property=MainPID",
  "--property=InvocationID",
  "--property=WorkingDirectory",
  "--property=NeedDaemonReload",
  "--no-pager",
]);

function exactStringArray(raw: unknown, expected: readonly string[], code: string): string[] {
  if (
    !Array.isArray(raw) ||
    raw.length !== expected.length ||
    raw.some((value, index) => value !== expected[index])
  ) {
    fail(code);
  }
  return [...expected];
}

function exactSystemdEnvironment(raw: unknown, uid: number): NodeJS.ProcessEnv {
  const value = plainRecord(raw, "lane1_v2_systemd_environment_invalid");
  const expected: Record<string, string> = {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    XDG_RUNTIME_DIR: `/run/user/${uid}`,
    DBUS_SESSION_BUS_ADDRESS: `unix:path=/run/user/${uid}/bus`,
  };
  const got = Object.keys(value).sort();
  const want = Object.keys(expected).sort();
  if (
    got.length !== want.length ||
    got.some((key, index) => key !== want[index]) ||
    want.some((key) => value[key] !== expected[key])
  ) {
    fail("lane1_v2_systemd_environment_invalid");
  }
  return Object.freeze({ ...expected });
}

export function testOnlyBuildRuntimeUserSystemctlInvocationV2(input: {
  runtime_uid: number;
  runtime_gid: number;
  command: unknown;
  args: unknown;
  options: unknown;
}): Readonly<{
  setpriv_args: readonly string[];
  child_options: Readonly<Record<string, unknown>>;
}> {
  const uid = positive(input.runtime_uid, "lane1_v2_runtime_uid_invalid");
  const gid = positive(input.runtime_gid, "lane1_v2_runtime_gid_invalid");
  if (input.command !== SYSTEMCTL) fail("lane1_v2_systemctl_command_invalid");
  exactStringArray(
    input.args,
    EXPECTED_SYSTEMCTL_ARGS,
    "lane1_v2_systemctl_arguments_invalid",
  );
  const options = plainRecord(input.options, "lane1_v2_systemctl_options_invalid");
  const keys = Object.keys(options).sort();
  const expectedKeys = ["encoding", "env", "stdio", "timeout"].sort();
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index]) ||
    options.encoding !== "utf8" ||
    options.timeout !== 10_000
  ) {
    fail("lane1_v2_systemctl_options_invalid");
  }
  exactStringArray(
    options.stdio,
    ["ignore", "pipe", "pipe"],
    "lane1_v2_systemctl_stdio_invalid",
  );
  const env = exactSystemdEnvironment(options.env, uid);
  return Object.freeze({
    setpriv_args: Object.freeze([
      `--reuid=${uid}`,
      `--regid=${gid}`,
      "--clear-groups",
      "--no-new-privs",
      "--inh-caps=-all",
      "--ambient-caps=-all",
      "--bounding-set=-all",
      "/proc/self/fd/4",
      ...EXPECTED_SYSTEMCTL_ARGS,
    ]),
    child_options: Object.freeze({
      encoding: "utf8",
      stdio: Object.freeze(["ignore", "pipe", "pipe"]),
      timeout: 10_000,
      env,
    }),
  });
}

function executeRuntimeUserSystemctl(
  uid: number,
  gid: number,
  command: unknown,
  args: unknown,
  options: unknown,
  originalSpawnSync: SpawnSyncFunction,
  audit: MutableIdentityDropAudit,
): unknown {
  const built = testOnlyBuildRuntimeUserSystemctlInvocationV2({
    runtime_uid: uid,
    runtime_gid: gid,
    command,
    args,
    options,
  });
  const setpriv = openExecutableLease(SETPRIV);
  const systemctl = openExecutableLease(SYSTEMCTL);
  try {
    const childOptions = {
      ...built.child_options,
      cwd: "/",
      stdio: ["ignore", "pipe", "pipe", setpriv.fd, systemctl.fd],
    };
    const result = Reflect.apply(originalSpawnSync, childProcess, [
      "/proc/self/fd/3",
      built.setpriv_args,
      childOptions,
    ]);
    revalidateExecutableLease(setpriv);
    revalidateExecutableLease(systemctl);
    return normalizeSystemctlResult(result, audit);
  } finally {
    closeExecutableLease(systemctl);
    closeExecutableLease(setpriv);
  }
}

async function withRuntimeUserSystemctlIdentityDrop<T>(
  uid: number,
  gid: number,
  action: () => Promise<T>,
): Promise<Readonly<{ value: T; audit: IdentityDropAudit }>> {
  if (patchActive) fail("lane1_v2_child_process_patch_already_active");
  patchActive = true;
  const original = childProcess.spawnSync;
  const audit: MutableIdentityDropAudit = {
    systemd_query_count: 0,
    working_directory_custody_verified_count: 0,
    working_directory_canonicalized_count: 0,
  };
  const patched = ((...raw: unknown[]): unknown => {
    const [command, args, options] = raw;
    if (command !== SYSTEMCTL) {
      return Reflect.apply(original, childProcess, raw);
    }
    return executeRuntimeUserSystemctl(
      uid,
      gid,
      command,
      args,
      options,
      original,
      audit,
    );
  }) as unknown as SpawnSyncFunction;
  childProcess.spawnSync = patched;
  syncBuiltinESMExports();
  try {
    const value = await action();
    return Object.freeze({
      value,
      audit: Object.freeze({ ...audit }),
    });
  } finally {
    childProcess.spawnSync = original;
    syncBuiltinESMExports();
    patchActive = false;
  }
}

export async function testOnlyWithRuntimeUserSystemctlIdentityDropV2<T>(
  uid: number,
  gid: number,
  action: () => Promise<T>,
): Promise<Readonly<{ value: T; audit: IdentityDropAudit }>> {
  return withRuntimeUserSystemctlIdentityDrop(uid, gid, action);
}

function validateParentResult(raw: unknown, uid: number, gid: number): PlainRecord {
  const result = plainRecord(raw, "lane1_v2_parent_result_not_object");
  const requiredTrue = [
    "authenticated_receipt_verified",
    "deployment_receipt_semantically_revalidated",
    "deployment_receipt_descriptor_lease_spanned_terminal_selector",
    "deployment_receipt_post_selector_identity_revalidated",
    "source_custody_requalified",
    "selector_generation_verified",
    "same_live_process_binding_verified",
    "installed_live_process_receipt_exact_bytes_match",
    "receipt_ancestor_custody_revalidated",
    "pre_post_live_generation_stable",
    "final_post_validation_generation_revalidated",
    "systemd_metadata_query_performed",
    "launch_environment_fields_receipt_attested",
    "selector_process_execution_performed",
    "source_custody_process_execution_performed",
    "filesystem_read_performed",
  ];
  const requiredFalse = [
    "process_environment_read_performed",
    "filesystem_write_performed",
    "network_contact_performed",
    "receipt_publication_performed",
    "receipt_retirement_performed",
    "service_mutation_performed",
    "credential_access",
    "wallet_or_signer_access",
    "signing",
    "transaction_submission",
    "payment_acceptance",
    "public_presale_activation",
    "wc_void_market_activation",
    "treasury_or_liquidity_action",
    "funds_movement",
    "production_host_evidence_authority",
  ];
  if (
    result.marker !== PARENT_MARKER ||
    result.schema !== PARENT_SCHEMA ||
    result.version !== 1 ||
    result.runtime_uid !== uid ||
    result.runtime_gid !== gid ||
    result.parent_host_evidence_plan_id !== PARENT_PLAN_ID ||
    requiredTrue.some((key) => result[key] !== true) ||
    requiredFalse.some((key) => result[key] !== false)
  ) {
    fail("lane1_v2_parent_result_contract_invalid");
  }
  return result;
}

async function loadExactParent(
  sourceLease: Readonly<{ bytes: Buffer; opened: fs.BigIntStats }>,
): Promise<ParentModule> {
  if (gitBlob(sourceLease.bytes) !== PARENT_SOURCE_GIT_BLOB_SHA1) {
    fail("lane1_v2_parent_source_blob_mismatch");
  }
  const url = pathToFileURL(PARENT_SOURCE);
  const imported = plainRecord(
    await import(url.href),
    "lane1_v2_parent_module_invalid",
  ) as unknown as ParentModule;
  if (
    imported.MARKER !== PARENT_MARKER ||
    imported.SCHEMA !== PARENT_SCHEMA ||
    imported.PARENT_PLAN_ID !== PARENT_PLAN_ID ||
    typeof imported.collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1 !==
      "function"
  ) {
    fail("lane1_v2_parent_module_contract_invalid");
  }
  return imported;
}

export async function collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV2(input: {
  runtime_uid: number;
  runtime_gid: number;
}): Promise<Readonly<PlainRecord>> {
  if (process.platform !== "linux") fail("lane1_v2_linux_required");
  if (typeof process.geteuid !== "function" || process.geteuid() !== 0) {
    fail("lane1_v2_root_required");
  }
  const uid = positive(input.runtime_uid, "lane1_v2_runtime_uid_invalid");
  const gid = positive(input.runtime_gid, "lane1_v2_runtime_gid_invalid");
  const sourceLease = readExactReviewedSource(
    PARENT_SOURCE,
    PARENT_SOURCE_GIT_BLOB_SHA1,
  );
  const proofLease = readExactReviewedSource(
    PARENT_PROOF,
    PARENT_PROOF_GIT_BLOB_SHA1,
  );
  const adapted = await withRuntimeUserSystemctlIdentityDrop(
    uid,
    gid,
    async () => {
      const parent = await loadExactParent(sourceLease);
      return parent.collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1({
        runtime_uid: uid,
        runtime_gid: gid,
      });
    },
  );
  if (
    adapted.audit.systemd_query_count !== 3 ||
    adapted.audit.working_directory_custody_verified_count !== 3
  ) {
    fail("lane1_v2_systemd_query_audit_invalid");
  }
  revalidateReviewedSource(
    PARENT_SOURCE,
    PARENT_SOURCE_GIT_BLOB_SHA1,
    sourceLease.opened,
  );
  revalidateReviewedSource(
    PARENT_PROOF,
    PARENT_PROOF_GIT_BLOB_SHA1,
    proofLease.opened,
  );
  const result = validateParentResult(adapted.value, uid, gid);
  return Object.freeze({
    ...result,
    schema: SCHEMA,
    marker: MARKER,
    version: VERSION,
    status:
      "AUTHENTICATED_RECEIPT_AND_SAME_LIVE_PROCESS_EVIDENCE_V2_GREEN_PRODUCTION_AUTHORITY_STILL_HOLD",
    parent_v1_source_git_blob_sha1: PARENT_SOURCE_GIT_BLOB_SHA1,
    parent_v1_proof_git_blob_sha1: PARENT_PROOF_GIT_BLOB_SHA1,
    user_systemd_query_runtime_identity_drop_verified: true,
    user_systemd_query_numeric_uid_gid_bound: true,
    user_systemd_query_supplementary_groups_cleared: true,
    user_systemd_query_no_new_privileges: true,
    user_systemd_query_capability_sets_cleared: true,
    user_systemd_query_setpriv_descriptor_bound: true,
    user_systemd_query_systemctl_descriptor_bound: true,
    systemd_working_directory_root_custody_verified: true,
    systemd_working_directory_canonicalized:
      adapted.audit.working_directory_canonicalized_count > 0,
    systemd_query_count: adapted.audit.systemd_query_count,
  });
}

function selfTest(): void {
  assert.equal(PARENT_SOURCE_GIT_BLOB_SHA1.length, 40);
  assert.equal(PARENT_PROOF_GIT_BLOB_SHA1.length, 40);
  const built = testOnlyBuildRuntimeUserSystemctlInvocationV2({
    runtime_uid: 1000,
    runtime_gid: 1000,
    command: SYSTEMCTL,
    args: EXPECTED_SYSTEMCTL_ARGS,
    options: {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: "/nonexistent",
        LANG: "C",
        LC_ALL: "C",
        XDG_RUNTIME_DIR: "/run/user/1000",
        DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      },
    },
  });
  assert.deepEqual(built.setpriv_args.slice(0, 7), [
    "--reuid=1000",
    "--regid=1000",
    "--clear-groups",
    "--no-new-privs",
    "--inh-caps=-all",
    "--ambient-caps=-all",
    "--bounding-set=-all",
  ]);
  console.log(MARKER + "_SELF_TEST_GREEN");
  console.log("parent_v1_source_and_proof_bound=true");
  console.log("root_direct_user_bus_query_replaced=true");
  console.log("numeric_runtime_uid_gid_drop_required=true");
  console.log("supplementary_groups_cleared=true");
  console.log("no_new_privileges_required=true");
  console.log("all_capability_sets_cleared=true");
  console.log("setpriv_and_systemctl_descriptor_execution_required=true");
  console.log("systemd_working_directory_root_custody_required=true");
  console.log("systemd_working_directory_canonicalization_required=true");
  console.log("builtin_spawn_sync_patch_scoped_and_restored=true");
  console.log("non_systemctl_spawn_sync_passthrough_required=true");
  console.log("filesystem_write_performed=false");
  console.log("service_mutation_performed=false");
  console.log("credential_access=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--self-test") {
    selfTest();
    return;
  }
  if (
    args.length !== 5 ||
    args[0] !== "--run" ||
    args[1] !== "--runtime-uid" ||
    args[3] !== "--runtime-gid"
  ) {
    fail("lane1_v2_arguments_invalid");
  }
  const result = await collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV2({
    runtime_uid: positive(args[2], "lane1_v2_runtime_uid_invalid"),
    runtime_gid: positive(args[4], "lane1_v2_runtime_gid_invalid"),
  });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(MARKER + "_HOLD");
    console.error("reason=" + String((error as Error)?.message || "unknown"));
    console.error("process_environment_read_performed=false");
    console.error("filesystem_write_performed=false");
    console.error("network_contact_performed=false");
    console.error("receipt_publication_performed=false");
    console.error("receipt_retirement_performed=false");
    console.error("service_mutation_performed=false");
    console.error("credential_access=false");
    console.error("wallet_or_signer_access=false");
    console.error("signing=false");
    console.error("transaction_submission=false");
    console.error("payment_acceptance=false");
    console.error("public_presale_activation=false");
    console.error("wc_void_market_activation=false");
    console.error("treasury_or_liquidity_action=false");
    console.error("funds_movement=false");
    console.error("production_host_evidence_authority=false");
    process.exitCode = 2;
  });
}
