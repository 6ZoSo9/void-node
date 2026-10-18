#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import {
  parseBuyVoidV2SelectorLineV1,
  VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1,
  VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1,
} from "./void_buy_void_source_finality_live_process_v2_collection_plan_v1.js";
import {
  VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
} from "./void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.js";
import {
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";
import {
  buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
  type BuyVoidSourceFinalityLiveProcessBindingMaterialV2,
  type BuyVoidSourceFinalityLiveProcessBindingReceiptV2,
} from "../../src/economic/buy_void_source_finality_live_process_binding_v2.js";

export const MARKER =
  "VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1";
export const SCHEMA =
  "void_buy_void_presale_receipt_live_process_host_evidence_v1";
export const PARENT_PLAN_ID =
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab";

const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_PROC_BYTES = 1024 * 1024;
const UINT = /^[1-9][0-9]*$/u;
const INVOCATION_ID = /^[0-9a-f]{32}$/u;
const SERVICE_UNIT = "void-node-live.service";
const MANAGER_EXE = "/usr/lib/systemd/systemd";
const NODE_EXE = "/usr/bin/node";
const SELECTOR_READY = "VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_READY";
const SELECTOR_GREEN = "VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_GREEN";
const SELECTOR_LOCK_REL =
  "ops/security/buy-void-v7-live-process-v2-selector-elf-lock-v1.json";
const SELECTOR_SHA =
  "048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232";
const SELECTOR_BYTES = 26680;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVIEWED_SELF_HTTP_GUARD_BY_INDEX_BLOB = Object.freeze({
  "1fde828c97175560f98ab070af33eefc595f8002":
    "runtime/canonical-producer-self-http-guard-v1.cjs",
  "8198912a70c8db0c81dad5d341cb4a779906c851":
    "runtime/canonical-producer-self-http-guard-v2.cjs",
  "40239e0f76aa1edce43523d18c1b57691e41e8cf":
    "runtime/canonical-producer-self-http-guard-v3.cjs",
  "123ec1792a027f93d4c9030749a0e7e136a75a44":
    "runtime/canonical-producer-self-http-guard-v4.cjs",
} as const);

type EvidenceReport = Readonly<{
  schema: typeof SCHEMA;
  marker: typeof MARKER;
  version: 1;
  parent_host_evidence_plan_id: typeof PARENT_PLAN_ID;
  status:
    "AUTHENTICATED_RECEIPT_AND_SAME_LIVE_PROCESS_EVIDENCE_GREEN_PRODUCTION_AUTHORITY_STILL_HOLD";
  runtime_uid: number;
  runtime_gid: number;
  deployment_receipt_id: string;
  live_process_selector_contract_id:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2;
  live_process_binding_receipt_id: string;
  process_source_commit: string;
  process_source_tree: string;
  systemd_invocation_id: string;
  service_pid: number;
  service_start_time_ticks: string;
  manager_pid: number;
  manager_start_time_ticks: string;
  authenticated_receipt_verified: true;
  source_custody_requalified: true;
  selector_generation_verified: true;
  same_live_process_binding_verified: true;
  installed_live_process_receipt_exact_bytes_match: true;
  receipt_ancestor_custody_revalidated: true;
  pre_post_live_generation_stable: true;
  final_post_validation_generation_revalidated: true;
  process_environment_read_performed: false;
  systemd_metadata_query_performed: true;
  launch_environment_fields_receipt_attested: true;
  selector_process_execution_performed: true;
  source_custody_process_execution_performed: true;
  filesystem_read_performed: true;
  filesystem_write_performed: false;
  network_contact_performed: false;
  receipt_publication_performed: false;
  receipt_retirement_performed: false;
  service_mutation_performed: false;
  credential_access: false;
  wallet_or_signer_access: false;
  signing: false;
  transaction_submission: false;
  payment_acceptance: false;
  public_presale_activation: false;
  wc_void_market_activation: false;
  treasury_or_liquidity_action: false;
  funds_movement: false;
  production_host_evidence_authority: false;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function positive(raw: unknown, code: string): number {
  const text = String(raw ?? "");
  if (!UINT.test(text)) fail(code);
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalReceiptBytes(
  receipt: BuyVoidSourceFinalityLiveProcessBindingReceiptV2,
): Buffer {
  const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
  if (bytes.length < 2 || bytes.length > MAX_RECEIPT_BYTES) {
    fail("host_evidence_derived_receipt_size_invalid");
  }
  return bytes;
}

type StableStatIdentity = Readonly<{
  dev: bigint;
  ino: bigint;
  uid: bigint;
  gid: bigint;
  mode: bigint;
  nlink: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}>;

function sameStat(a: StableStatIdentity, b: StableStatIdentity): boolean {
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

type ReceiptLeafStat = Readonly<{
  uid: bigint;
  gid: bigint;
  nlink: bigint;
  mode: bigint;
  size: bigint;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}>;

type ReceiptLeafGenerationStat = StableStatIdentity & ReceiptLeafStat;

function receiptLeafCustodyTrusted(
  current: ReceiptLeafStat,
  expectedLength: number,
): boolean {
  return (
    current.isFile() &&
    !current.isSymbolicLink() &&
    current.uid === 0n &&
    current.gid === 0n &&
    current.nlink === 1n &&
    (current.mode & 0o7777n) === 0o444n &&
    current.size >= 2n &&
    current.size <= BigInt(MAX_RECEIPT_BYTES) &&
    current.size === BigInt(expectedLength)
  );
}

function receiptLeafGenerationStillTrusted(
  retained: StableStatIdentity,
  current: ReceiptLeafGenerationStat,
  expectedLength: number,
): boolean {
  return (
    receiptLeafCustodyTrusted(current, expectedLength) &&
    sameStat(retained, current)
  );
}

type HeldReceiptAncestor = Readonly<{
  path: string;
  fd: number;
  dev: bigint;
  ino: bigint;
  uid: bigint;
  mode: bigint;
}>;

type ReceiptAncestorStat = Readonly<{
  dev: bigint;
  ino: bigint;
  uid: bigint;
  mode: bigint;
  isDirectory(): boolean;
}>;

function receiptAncestorStillTrusted(
  held: Pick<HeldReceiptAncestor, "dev" | "ino" | "uid" | "mode">,
  current: ReceiptAncestorStat,
): boolean {
  return (
    current.isDirectory() &&
    current.dev === held.dev &&
    current.ino === held.ino &&
    current.uid === held.uid &&
    (current.mode & 0o7777n) === held.mode &&
    (current.mode & 0o022n) === 0n
  );
}

function openRootOwnedReceiptAncestors(file: string): HeldReceiptAncestor[] {
  const noFollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  if (
    process.platform !== "linux" ||
    typeof noFollow !== "number" ||
    noFollow <= 0 ||
    typeof directory !== "number" ||
    directory <= 0
  ) {
    fail("host_evidence_receipt_custody_platform_unavailable");
  }

  const heldDirectories: HeldReceiptAncestor[] = [];
  try {
    let cursor = path.dirname(file);
    for (;;) {
      const visible = fs.lstatSync(cursor, { bigint: true });
      if (
        !visible.isDirectory() ||
        visible.isSymbolicLink() ||
        visible.uid !== 0n ||
        (visible.mode & 0o022n) !== 0n
      ) {
        fail("host_evidence_receipt_ancestor_untrusted");
      }
      const fd = fs.openSync(
        cursor,
        fs.constants.O_RDONLY | directory | noFollow,
      );
      const held = fs.fstatSync(fd, { bigint: true });
      if (
        !receiptAncestorStillTrusted(
          {
            dev: visible.dev,
            ino: visible.ino,
            uid: visible.uid,
            mode: visible.mode & 0o7777n,
          },
          held,
        ) ||
        held.uid !== 0n
      ) {
        fs.closeSync(fd);
        fail("host_evidence_receipt_ancestor_identity_mismatch");
      }
      heldDirectories.push(
        Object.freeze({
          path: cursor,
          fd,
          dev: held.dev,
          ino: held.ino,
          uid: held.uid,
          mode: held.mode & 0o7777n,
        }),
      );
      const next = path.dirname(cursor);
      if (next === cursor) break;
      cursor = next;
    }
    return heldDirectories;
  } catch (error) {
    for (let index = heldDirectories.length - 1; index >= 0; index -= 1) {
      fs.closeSync(heldDirectories[index]!.fd);
    }
    throw error;
  }
}

function assertCanonicalReceiptAncestorObservations(
  held: Pick<HeldReceiptAncestor, "dev" | "ino" | "uid" | "mode">,
  before: ReceiptAncestorStat,
  reopened: ReceiptAncestorStat,
  after: ReceiptAncestorStat,
): void {
  for (const current of [before, reopened, after]) {
    if (!receiptAncestorStillTrusted(held, current)) {
      fail("host_evidence_receipt_ancestor_namespace_changed");
    }
  }
}

function receiptAncestorRevalidationOrder<T>(
  heldDirectories: readonly T[],
): readonly T[] {
  return [...heldDirectories].reverse();
}

function revalidateReceiptAncestors(
  heldDirectories: readonly HeldReceiptAncestor[],
): void {
  const noFollow = fs.constants.O_NOFOLLOW;
  const directory = fs.constants.O_DIRECTORY;
  for (const held of receiptAncestorRevalidationOrder(heldDirectories)) {
    const current = fs.fstatSync(held.fd, { bigint: true });
    if (!receiptAncestorStillTrusted(held, current)) {
      fail("host_evidence_receipt_ancestor_changed_during_read");
    }

    let reopenedFd = -1;
    let visibleBefore: fs.BigIntStats;
    let reopened: fs.BigIntStats;
    let visibleAfter: fs.BigIntStats;
    try {
      visibleBefore = fs.lstatSync(held.path, { bigint: true });
      reopenedFd = fs.openSync(
        held.path,
        fs.constants.O_RDONLY | directory | noFollow,
      );
      reopened = fs.fstatSync(reopenedFd, { bigint: true });
      visibleAfter = fs.lstatSync(held.path, { bigint: true });
    } catch {
      fail("host_evidence_receipt_ancestor_namespace_unavailable");
    } finally {
      if (reopenedFd >= 0) fs.closeSync(reopenedFd);
    }
    assertCanonicalReceiptAncestorObservations(
      held,
      visibleBefore!,
      reopened!,
      visibleAfter!,
    );
  }
}

export function testOnlyReceiptLeafCustodyTrustedV1(
  current: Readonly<{
    uid: bigint;
    gid: bigint;
    nlink: bigint;
    mode: bigint;
    size: bigint;
    regular: boolean;
    symlink: boolean;
  }>,
  expectedLength: number,
): boolean {
  return receiptLeafCustodyTrusted(
    {
      uid: current.uid,
      gid: current.gid,
      nlink: current.nlink,
      mode: current.mode,
      size: current.size,
      isFile: () => current.regular,
      isSymbolicLink: () => current.symlink,
    },
    expectedLength,
  );
}

export function testOnlyAssertReceiptCanonicalLeafStableV1(
  retained: StableStatIdentity,
  current: Readonly<StableStatIdentity & {
    regular: boolean;
    symlink: boolean;
  }>,
  expectedLength: number,
): void {
  const wrapped: ReceiptLeafGenerationStat = {
    ...current,
    isFile: () => current.regular,
    isSymbolicLink: () => current.symlink,
  };
  if (!receiptLeafGenerationStillTrusted(retained, wrapped, expectedLength)) {
    fail("host_evidence_receipt_leaf_namespace_changed");
  }
}

export function testOnlyReceiptAncestorRevalidationOrderV1(
  paths: readonly string[],
): readonly string[] {
  return receiptAncestorRevalidationOrder(paths);
}

export function testOnlyAssertReceiptAncestorStableV1(
  held: Readonly<{ dev: bigint; ino: bigint; uid: bigint; mode: bigint }>,
  current: Readonly<{
    dev: bigint;
    ino: bigint;
    uid: bigint;
    mode: bigint;
    directory: boolean;
  }>,
): void {
  if (
    !receiptAncestorStillTrusted(held, {
      dev: current.dev,
      ino: current.ino,
      uid: current.uid,
      mode: current.mode,
      isDirectory: () => current.directory,
    })
  ) {
    fail("host_evidence_receipt_ancestor_changed_during_read");
  }
}

export function testOnlyAssertReceiptCanonicalAncestorStableV1(
  held: Readonly<{ dev: bigint; ino: bigint; uid: bigint; mode: bigint }>,
  before: Readonly<{
    dev: bigint;
    ino: bigint;
    uid: bigint;
    mode: bigint;
    directory: boolean;
  }>,
  reopened: Readonly<{
    dev: bigint;
    ino: bigint;
    uid: bigint;
    mode: bigint;
    directory: boolean;
  }>,
  after: Readonly<{
    dev: bigint;
    ino: bigint;
    uid: bigint;
    mode: bigint;
    directory: boolean;
  }>,
): void {
  const wrap = (value: typeof before): ReceiptAncestorStat => ({
    dev: value.dev,
    ino: value.ino,
    uid: value.uid,
    mode: value.mode,
    isDirectory: () => value.directory,
  });
  assertCanonicalReceiptAncestorObservations(
    held,
    wrap(before),
    wrap(reopened),
    wrap(after),
  );
}

function readInstalledLiveReceiptCandidate(): Buffer {
  const target = VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2;
  if (!path.isAbsolute(target) || path.resolve(target) !== target) {
    fail("host_evidence_live_receipt_path_invalid");
  }
  const heldDirectories = openRootOwnedReceiptAncestors(target);
  let fd = -1;
  try {
    const parent = heldDirectories[0];
    if (!parent) fail("host_evidence_receipt_parent_missing");
    const leafViaParent =
      `/proc/self/fd/${parent.fd}/${path.basename(target)}`;
    const before = fs.lstatSync(leafViaParent, { bigint: true });
    if (
      before.size < 2n ||
      before.size > BigInt(MAX_RECEIPT_BYTES) ||
      !receiptLeafCustodyTrusted(before, Number(before.size))
    ) {
      fail("host_evidence_live_receipt_custody_invalid");
    }
    const expectedLength = Number(before.size);
    fd = fs.openSync(
      leafViaParent,
      fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
    );
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!sameStat(before, opened)) {
      fail("host_evidence_live_receipt_open_identity_mismatch");
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(8192);
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > MAX_RECEIPT_BYTES || total > expectedLength) {
        fail("host_evidence_live_receipt_read_too_large");
      }
      chunks.push(chunk.subarray(0, count));
    }
    const observed = Buffer.concat(chunks, total);
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(leafViaParent, { bigint: true });
    if (
      !sameStat(opened, after) ||
      !sameStat(after, visible) ||
      BigInt(observed.length) !== after.size
    ) {
      fail("host_evidence_live_receipt_changed_during_read");
    }
    revalidateReceiptAncestors(heldDirectories);
    let canonicalFd = -1;
    try {
      const canonicalBefore = fs.lstatSync(target, { bigint: true });
      if (!receiptLeafGenerationStillTrusted(opened, canonicalBefore, expectedLength)) {
        fail("host_evidence_receipt_leaf_namespace_changed");
      }
      canonicalFd = fs.openSync(
        target,
        fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
      );
      const canonicalOpened = fs.fstatSync(canonicalFd, { bigint: true });
      if (!receiptLeafGenerationStillTrusted(opened, canonicalOpened, expectedLength)) {
        fail("host_evidence_receipt_leaf_namespace_changed");
      }
      const canonicalChunks: Buffer[] = [];
      let canonicalTotal = 0;
      for (;;) {
        const chunk = Buffer.alloc(8192);
        const count = fs.readSync(canonicalFd, chunk, 0, chunk.length, null);
        if (count === 0) break;
        canonicalTotal += count;
        if (canonicalTotal > MAX_RECEIPT_BYTES || canonicalTotal > expectedLength) {
          fail("host_evidence_canonical_receipt_read_too_large");
        }
        canonicalChunks.push(chunk.subarray(0, count));
      }
      const canonicalObserved = Buffer.concat(canonicalChunks, canonicalTotal);
      const canonicalAfter = fs.fstatSync(canonicalFd, { bigint: true });
      const canonicalVisibleAfter = fs.lstatSync(target, { bigint: true });
      for (const current of [canonicalAfter, canonicalVisibleAfter]) {
        if (!receiptLeafGenerationStillTrusted(opened, current, expectedLength)) {
          fail("host_evidence_receipt_leaf_namespace_changed");
        }
      }
      if (!canonicalObserved.equals(observed)) {
        fail("host_evidence_canonical_receipt_bytes_changed");
      }
    } finally {
      if (canonicalFd >= 0) fs.closeSync(canonicalFd);
    }
    return observed;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
    for (let index = heldDirectories.length - 1; index >= 0; index -= 1) {
      fs.closeSync(heldDirectories[index]!.fd);
    }
  }
}

function readInstalledLiveReceiptExact(expected: Buffer): void {
  if (!readInstalledLiveReceiptCandidate().equals(expected)) {
    fail("host_evidence_live_receipt_not_current_process_generation");
  }
}


type SelectorLine = ReturnType<typeof parseBuyVoidV2SelectorLineV1>;
type ServiceSnapshot = Readonly<{
  main_pid: number;
  invocation_id: string;
  working_directory: string;
}>;
type SourceObservation = Readonly<{
  process_source_commit: string;
  process_source_tree: string;
  cwd_realpath: string;
  node_options_sha256: string;
  source_custody_proven: true;
  reviewed_launcher_contract_proven: true;
}>;
type LiveObservation = Readonly<{
  selector: SelectorLine;
  manager_cgroup_v2_path: string;
  manager_executable_realpath: string;
  service_cgroup_v2_path: string;
  service_executable_realpath: string;
  service_cmdline_sha256: string;
  source: SourceObservation;
}>;

function rootSafeStat(absolute: string, wantDirectory: boolean): fs.Stats {
  const st = fs.lstatSync(absolute);
  if (st.isSymbolicLink()) fail("host_evidence_root_custody_symlink");
  if (wantDirectory ? !st.isDirectory() : !st.isFile()) {
    fail("host_evidence_root_custody_type");
  }
  if (st.uid !== 0 || (st.mode & 0o022) !== 0) {
    fail("host_evidence_root_custody_owner_or_mode");
  }
  return st;
}
function proveRootCustodyPath(absolute: string, wantDirectory: boolean): void {
  const resolved = path.resolve(absolute);
  if (!path.isAbsolute(absolute) || resolved !== absolute) {
    fail("host_evidence_root_custody_path_not_canonical");
  }
  rootSafeStat(resolved, wantDirectory);
  let cursor = wantDirectory ? resolved : path.dirname(resolved);
  for (;;) {
    rootSafeStat(cursor, true);
    if (cursor === "/") break;
    cursor = path.dirname(cursor);
  }
}
function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("/usr/bin/git", [
    "-c", "safe.directory=" + cwd,
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.fsmonitor=false",
    "-c", "core.untrackedCache=false",
    "--no-replace-objects", "-C", cwd, ...args,
  ], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    timeout: 15_000, maxBuffer: 4 * 1024 * 1024,
    env: {
      PATH: "/usr/bin:/bin", HOME: "/nonexistent", LANG: "C", LC_ALL: "C", TZ: "UTC",
      GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null", GIT_NO_REPLACE_OBJECTS: "1",
      GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0",
    },
  });
  if (result.status !== 0) fail("host_evidence_reviewed_git_failed:" + args[0]);
  return String(result.stdout || "").trim();
}
function exactTrackedBlob(cwd: string, commit: string, relative: string): string {
  const absolute = path.join(cwd, ...relative.split("/"));
  if (!path.resolve(absolute).startsWith(cwd + path.sep)) {
    fail("host_evidence_tracked_path_escape");
  }
  proveRootCustodyPath(absolute, false);
  const worktree = runGit(cwd, ["hash-object", "--", relative]);
  const committed = runGit(cwd, ["rev-parse", "--verify", commit + ":" + relative]);
  if (worktree !== committed) fail("host_evidence_tracked_file_blob_drift:" + relative);
  return committed;
}
function systemdEnvironment(uid: number): NodeJS.ProcessEnv {
  const runtime = "/run/user/" + String(uid);
  const bus = runtime + "/bus";
  const dir = fs.lstatSync(runtime);
  const sock = fs.lstatSync(bus);
  if (
    !dir.isDirectory() || dir.isSymbolicLink() || dir.uid !== uid ||
    (dir.mode & 0o077) !== 0 || !sock.isSocket() || sock.isSymbolicLink() ||
    sock.uid !== uid
  ) fail("host_evidence_user_systemd_bus_custody_invalid");
  return {
    PATH: "/usr/bin:/bin", HOME: "/nonexistent", LANG: "C", LC_ALL: "C",
    XDG_RUNTIME_DIR: runtime, DBUS_SESSION_BUS_ADDRESS: "unix:path=" + bus,
  };
}
function serviceSnapshot(uid: number): ServiceSnapshot {
  const result = spawnSync("/usr/bin/systemctl", [
    "--user", "show", SERVICE_UNIT,
    "--property=ActiveState", "--property=MainPID", "--property=InvocationID",
    "--property=WorkingDirectory", "--property=NeedDaemonReload", "--no-pager",
  ], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10_000,
    env: systemdEnvironment(uid),
  });
  if (result.status !== 0) fail("host_evidence_user_systemd_show_failed");
  const map = new Map<string,string>();
  for (const line of String(result.stdout || "").trim().split(/\r?\n/u)) {
    const i = line.indexOf("=");
    if (i > 0) map.set(line.slice(0, i), line.slice(i + 1));
  }
  const mainPid = positive(map.get("MainPID"), "host_evidence_service_main_pid_invalid");
  const invocation = String(map.get("InvocationID") || "").toLowerCase();
  const cwd = String(map.get("WorkingDirectory") || "");
  if (
    map.get("ActiveState") !== "active" || !INVOCATION_ID.test(invocation) ||
    !path.isAbsolute(cwd) || map.get("NeedDaemonReload") !== "no"
  ) fail("host_evidence_service_identity_invalid");
  return Object.freeze({ main_pid: mainPid, invocation_id: invocation, working_directory: cwd });
}
function assertServiceSnapshotStable(first: ServiceSnapshot, second: ServiceSnapshot): void {
  for (const key of ["main_pid","invocation_id","working_directory"] as const) {
    if (first[key] !== second[key]) fail("host_evidence_systemd_generation_changed:" + key);
  }
}
function readProc(pid: number, leaf: string, maxBytes = MAX_PROC_BYTES): Buffer {
  if (!/^[a-z]+$/u.test(leaf)) fail("host_evidence_proc_leaf_invalid");
  const fd = fs.openSync(
    `/proc/${pid}/${leaf}`,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(8192);
      const count = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (count === 0) break;
      total += count;
      if (total > maxBytes) fail("host_evidence_proc_file_too_large:" + leaf);
      chunks.push(chunk.subarray(0, count));
    }
    const after = fs.fstatSync(fd, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino) {
      fail("host_evidence_proc_file_identity_changed:" + leaf);
    }
    return Buffer.concat(chunks, total);
  } finally { fs.closeSync(fd); }
}
function procStat(pid: number): Readonly<{ppid:number;start_time_ticks:string}> {
  const text = readProc(pid, "stat", 128 * 1024).toString("utf8").trim();
  const close = text.lastIndexOf(")");
  if (close < 2) fail("host_evidence_proc_stat_invalid");
  const fields = text.slice(close + 1).trim().split(/\s+/u);
  const ppid = positive(fields[1], "host_evidence_proc_ppid_invalid");
  const start = String(fields[19] || "");
  if (!UINT.test(start)) fail("host_evidence_proc_start_ticks_invalid");
  return Object.freeze({ppid,start_time_ticks:start});
}
function procIdentity(pid:number,uid:number,gid:number,security:boolean): void {
  const text=readProc(pid,"status",128*1024).toString("utf8");
  const field=(name:string)=>{
    const m=new RegExp("^"+name+":\\s*(.+)$","mu").exec(text);
    if(!m)fail("host_evidence_proc_status_missing:"+name);
    return m[1]!.trim();
  };
  const ids=(name:string)=>{
    const values=field(name).split(/\s+/u).map(Number);
    if(values.length!==4||values.some(v=>!Number.isSafeInteger(v)||v<=0)||!values.every(v=>v===values[0])){
      fail("host_evidence_proc_status_identity_invalid:"+name);
    }
    return values[0]!;
  };
  if(ids("Uid")!==uid||ids("Gid")!==gid)fail("host_evidence_proc_runtime_identity_mismatch");
  if(security){
    for(const cap of ["CapInh","CapPrm","CapEff","CapAmb"]){
      if(!/^0+$/u.test(field(cap)))fail("host_evidence_service_capability_nonzero:"+cap);
    }
    if(field("NoNewPrivs")!=="1")fail("host_evidence_service_no_new_privileges_required");
  }
}
function procCgroup(pid:number,expected:string): string {
  const rows=readProc(pid,"cgroup",128*1024).toString("utf8").trim()
    .split(/\r?\n/u).filter(row=>row.startsWith("0::"));
  if(rows.length!==1||rows[0]!.slice(3)!==expected)fail("host_evidence_proc_cgroup_invalid");
  return expected;
}
function procCmdline(pid:number): Readonly<{args:string[];sha256:string}> {
  const raw=readProc(pid,"cmdline");
  const args=raw.toString("utf8").split("\0");
  if(args.at(-1)==="")args.pop();
  if(args.length<1||args.some(value=>value.length===0))fail("host_evidence_proc_cmdline_invalid");
  return Object.freeze({args,sha256:sha256(raw)});
}
function procLink(pid:number,leaf:"exe"|"cwd"): string {
  const value=fs.realpathSync.native(`/proc/${pid}/${leaf}`);
  if(!path.isAbsolute(value))fail("host_evidence_proc_link_invalid:"+leaf);
  return value;
}
function assertSelectorBinary(): void {
  const lockPath=path.join(ROOT,SELECTOR_LOCK_REL);
  const st=fs.lstatSync(lockPath,{bigint:true});
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||(st.mode&0o022n)!==0n){
    fail("host_evidence_selector_lock_custody_invalid");
  }
  const lock=JSON.parse(fs.readFileSync(lockPath,"utf8"));
  if(
    lock.marker!=="VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_V1" ||
    lock.lock_id!==VOID_BUY_VOID_V2_SELECTOR_ELF_LOCK_ID_V1 ||
    lock.accepted_binary_sha256!==SELECTOR_SHA ||
    lock.accepted_binary_bytes!==SELECTOR_BYTES ||
    lock.selector_elf_identity_accepted!==true || lock.install_authorized!==false
  ) fail("host_evidence_selector_lock_invalid");
  proveRootCustodyPath(VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1,false);
  const binary=fs.lstatSync(VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1,{bigint:true});
  if(
    binary.uid!==0n||binary.gid!==0n||binary.nlink!==1n||
    (binary.mode&0o022n)!==0n||(binary.mode&0o111n)===0n||
    binary.size!==BigInt(SELECTOR_BYTES)
  ) fail("host_evidence_selector_binary_custody_invalid");
  if(sha256(fs.readFileSync(VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1))!==SELECTOR_SHA){
    fail("host_evidence_selector_binary_sha256_mismatch");
  }
}
async function nextSelectorLine(iterator: AsyncIterator<string>,label:string): Promise<string> {
  let timer:NodeJS.Timeout|undefined;
  try{
    const result=await Promise.race([
      iterator.next(),
      new Promise<never>((_,reject)=>{
        timer=setTimeout(()=>reject(new Error("host_evidence_selector_timeout:"+label)),15_000);
      }),
    ]);
    if(result.done)fail("host_evidence_selector_eof:"+label);
    return result.value;
  }finally{if(timer)clearTimeout(timer);}
}
type SelectorSession=Readonly<{
  child:ChildProcessWithoutNullStreams;
  iterator:AsyncIterator<string>;
  ready:SelectorLine;
  stderr:string[];
}>;
async function startSelectorSession(uid:number,gid:number): Promise<SelectorSession> {
  assertSelectorBinary();
  const child=spawn(VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1,[
    "--select","--runtime-uid",String(uid),"--runtime-gid",String(gid),
  ],{
    stdio:["pipe","pipe","pipe"],
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
  });
  const stderr:string[]=[];
  child.stderr.setEncoding("utf8");
  child.stderr.on("data",chunk=>stderr.push(String(chunk)));
  const rl=createInterface({input:child.stdout,crlfDelay:Infinity});
  const iterator=rl[Symbol.asyncIterator]();
  const ready=parseBuyVoidV2SelectorLineV1(await nextSelectorLine(iterator,"ready"),SELECTOR_READY);
  return Object.freeze({child,iterator,ready,stderr});
}
function selectorLineEqual(a:SelectorLine,b:SelectorLine): boolean {
  return a.manager_pid===b.manager_pid &&
    a.manager_start_ticks===b.manager_start_ticks &&
    a.manager_cmdline_sha256===b.manager_cmdline_sha256 &&
    a.service_pid===b.service_pid &&
    a.service_start_ticks===b.service_start_ticks &&
    a.service_cmdline_sha256===b.service_cmdline_sha256;
}
async function finishSelectorSession(session:SelectorSession): Promise<SelectorLine> {
  session.child.stdin.end("VERIFY\n");
  const green=parseBuyVoidV2SelectorLineV1(await nextSelectorLine(session.iterator,"green"),SELECTOR_GREEN);
  if(!selectorLineEqual(session.ready,green))fail("host_evidence_selector_generation_changed");
  const tail:string[]=[];
  for(;;){
    const item=await session.iterator.next();
    if(item.done)break;
    tail.push(item.value);
  }
  const exitCode=session.child.exitCode ?? await new Promise<number|null>((resolve,reject)=>{
    session.child.once("error",reject);
    session.child.once("close",resolve);
  });
  if(
    exitCode!==0||session.stderr.join("").trim()!==""||
    !tail.includes("pidfds_retained_during_collection=true")||
    !tail.includes("credential_access=false")||
    !tail.includes("service_mutation=false")||
    !tail.includes("funds_movement=false")
  )fail("host_evidence_selector_terminal_contract_invalid");
  return green;
}
function abortSelectorSession(session:SelectorSession|null): void {
  if(session&&session.child.exitCode===null)session.child.kill("SIGKILL");
}
function guardRelativePath(indexBlob:string): string {
  const guard=REVIEWED_SELF_HTTP_GUARD_BY_INDEX_BLOB[
    indexBlob as keyof typeof REVIEWED_SELF_HTTP_GUARD_BY_INDEX_BLOB
  ];
  if(!guard)fail("host_evidence_index_generation_not_reviewed");
  return guard;
}
export function testOnlyExpectedNodeOptionsShaV1(cwd:string,indexBlob:string): string {
  return sha256("--require "+path.join(cwd,guardRelativePath(indexBlob)));
}
export function testOnlyAssertSelectorGenerationStableV1(a:SelectorLine,b:SelectorLine): void {
  if(!selectorLineEqual(a,b))fail("host_evidence_selector_generation_changed");
}
export function testOnlyAssertServiceSnapshotStableV1(a:ServiceSnapshot,b:ServiceSnapshot): void {
  assertServiceSnapshotStable(a,b);
}
function parseReviewedSourceFromCmdline(
  cwd:string,cmdline:readonly string[],uid:number,gid:number,
): SourceObservation {
  if(cmdline.length!==10||cmdline[0]!==NODE_EXE)fail("host_evidence_service_cmdline_shape_invalid");
  const commit=/^--conditions=void-process-source-commit-([0-9a-f]{40})$/u.exec(cmdline[2]||"")?.[1];
  const tree=/^--conditions=void-process-source-tree-([0-9a-f]{40})$/u.exec(cmdline[3]||"")?.[1];
  if(
    cmdline[1]!=="--conditions=void-process-source-identity-v1"||!commit||!tree||
    cmdline[4]!=="--conditions=void-process-source-branch-main"||
    cmdline[5]!=="--require"||
    cmdline[6]!==path.join(cwd,"node_modules/tsx/dist/preflight.cjs")||
    cmdline[7]!=="--import"||
    cmdline[8]!=="file://"+path.join(cwd,"node_modules/tsx/dist/loader.mjs")||
    cmdline[9]!==path.join(cwd,"src/index.ts")
  )fail("host_evidence_service_cmdline_not_reviewed_launcher_shape");
  proveRootCustodyPath(cwd,true);
  proveRootCustodyPath(NODE_EXE,false);
  if(
    runGit(cwd,["rev-parse","--verify","HEAD^{commit}"])!==commit||
    runGit(cwd,["rev-parse","--verify","HEAD^{tree}"])!==tree||
    runGit(cwd,["symbolic-ref","--short","-q","HEAD"])!=="main"||
    runGit(cwd,["status","--porcelain=v1","--untracked-files=all"])!==""
  )fail("host_evidence_process_source_worktree_not_exact");
  const indexBlob=exactTrackedBlob(cwd,commit,"src/index.ts");
  exactTrackedBlob(cwd,commit,"ops/run-void-node-live-v1.sh");
  exactTrackedBlob(cwd,commit,"runtime/canonical-producer-source-custody-v1.cjs");
  proveRootCustodyPath(path.join(cwd,"node_modules/tsx/dist/preflight.cjs"),false);
  proveRootCustodyPath(path.join(cwd,"node_modules/tsx/dist/loader.mjs"),false);
  proveRootCustodyPath("/usr/bin/setpriv",false);
  exactTrackedBlob(cwd,commit,guardRelativePath(indexBlob));
  const custodyScript=path.join(cwd,"runtime/canonical-producer-source-custody-v1.cjs");
  const custody=spawnSync("/usr/bin/setpriv",[
    "--reuid="+String(uid),
    "--regid="+String(gid),
    "--clear-groups",
    "--no-new-privs",
    NODE_EXE,
    custodyScript,
    cwd,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30_000,
    maxBuffer:4*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
  });
  if(custody.status!==0||!String(custody.stdout||"").includes("VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1_GREEN")){
    fail("host_evidence_source_custody_requalification_failed");
  }
  return Object.freeze({
    process_source_commit:commit,process_source_tree:tree,cwd_realpath:cwd,
    node_options_sha256:testOnlyExpectedNodeOptionsShaV1(cwd,indexBlob),
    source_custody_proven:true,reviewed_launcher_contract_proven:true,
  });
}
function observeLiveGeneration(selector:SelectorLine,uid:number,gid:number): LiveObservation {
  const managerStat=procStat(selector.manager_pid);
  if(managerStat.ppid!==1||managerStat.start_time_ticks!==selector.manager_start_ticks){
    fail("host_evidence_manager_generation_invalid");
  }
  procIdentity(selector.manager_pid,uid,gid,false);
  const managerCgroup=procCgroup(
    selector.manager_pid,`/user.slice/user-${uid}.slice/user@${uid}.service/init.scope`,
  );
  const managerCmdline=procCmdline(selector.manager_pid);
  if(
    managerCmdline.sha256!==selector.manager_cmdline_sha256||
    managerCmdline.args.length!==2||managerCmdline.args[0]!==MANAGER_EXE||
    managerCmdline.args[1]!=="--user"||procLink(selector.manager_pid,"exe")!==MANAGER_EXE
  )fail("host_evidence_manager_identity_invalid");
  const serviceStat=procStat(selector.service_pid);
  if(serviceStat.ppid!==selector.manager_pid||serviceStat.start_time_ticks!==selector.service_start_ticks){
    fail("host_evidence_service_generation_invalid");
  }
  procIdentity(selector.service_pid,uid,gid,true);
  const serviceCgroup=procCgroup(
    selector.service_pid,
    `/user.slice/user-${uid}.slice/user@${uid}.service/app.slice/${SERVICE_UNIT}`,
  );
  const serviceCmdline=procCmdline(selector.service_pid);
  if(
    serviceCmdline.sha256!==selector.service_cmdline_sha256||
    procLink(selector.service_pid,"exe")!==NODE_EXE
  )fail("host_evidence_service_identity_invalid");
  const cwd=procLink(selector.service_pid,"cwd");
  return Object.freeze({
    selector,manager_cgroup_v2_path:managerCgroup,manager_executable_realpath:MANAGER_EXE,
    service_cgroup_v2_path:serviceCgroup,service_executable_realpath:NODE_EXE,
    service_cmdline_sha256:serviceCmdline.sha256,
    source:parseReviewedSourceFromCmdline(cwd,serviceCmdline.args,uid,gid),
  });
}
function parseInstalledReceipt(bytes:Buffer): BuyVoidSourceFinalityLiveProcessBindingReceiptV2 {
  let parsed:unknown;
  try{parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
  catch{fail("host_evidence_live_receipt_json_invalid");}
  if(parsed===null||typeof parsed!=="object"||Array.isArray(parsed)){
    fail("host_evidence_live_receipt_shape_invalid");
  }
  const raw=parsed as Record<string,unknown>;
  const receiptId=raw.receipt_id;
  const material=Object.fromEntries(
    Object.entries(raw).filter(([key])=>key!=="receipt_id"),
  ) as unknown as BuyVoidSourceFinalityLiveProcessBindingMaterialV2;
  let rebuilt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2;
  try{rebuilt=buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2(material);}
  catch{fail("host_evidence_live_receipt_contract_invalid");}
  if(receiptId!==rebuilt.receipt_id||!canonicalReceiptBytes(rebuilt).equals(bytes)){
    fail("host_evidence_live_receipt_wire_or_id_invalid");
  }
  return rebuilt;
}
function assertReceiptMatchesLive(
  receipt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2,
  live:LiveObservation,systemd:ServiceSnapshot,uid:number,gid:number,
): void {
  if(
    receipt.marker!==VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2||
    receipt.service_process_selection_mode!==VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2||
    receipt.service_process_selector_contract_id!==VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2||
    receipt.runtime_uid!==uid||receipt.runtime_gid!==gid||
    receipt.manager_pid!==live.selector.manager_pid||receipt.manager_ppid!==1||
    receipt.manager_start_time_ticks!==live.selector.manager_start_ticks||
    receipt.manager_cgroup_v2_path!==live.manager_cgroup_v2_path||
    receipt.manager_executable_realpath!==live.manager_executable_realpath||
    receipt.manager_cmdline_sha256!==live.selector.manager_cmdline_sha256||
    receipt.manager_pidfd_retained_during_collection!==true||
    receipt.service_pidfd_retained_during_collection!==true||
    receipt.process_source_identity_marker!=="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1"||
    receipt.process_source_commit!==live.source.process_source_commit||
    receipt.process_source_tree!==live.source.process_source_tree||
    receipt.process_source_branch!=="main"||receipt.service_unit!==SERVICE_UNIT||
    receipt.main_pid!==live.selector.service_pid||
    receipt.process_start_time_ticks!==live.selector.service_start_ticks||
    receipt.systemd_invocation_id!==systemd.invocation_id||
    receipt.cgroup_v2_path!==live.service_cgroup_v2_path||
    receipt.executable_realpath!==live.service_executable_realpath||
    receipt.cwd_realpath!==live.source.cwd_realpath||
    receipt.cmdline_sha256!==live.service_cmdline_sha256||
    receipt.node_options_sha256!==live.source.node_options_sha256||
    receipt.canonical_producer_role!==true||
    receipt.node_path_absent!==true||
    receipt.ld_preload_absent!==true||
    receipt.ld_library_path_absent!==true||
    receipt.capabilities_zero!==true||
    receipt.no_new_privileges!==true||receipt.source_custody_proven!==true||
    receipt.reviewed_service_contract_proven!==true||
    receipt.reviewed_launcher_contract_proven!==true||
    systemd.main_pid!==live.selector.service_pid||
    systemd.working_directory!==live.source.cwd_realpath
  )fail("host_evidence_installed_receipt_not_live_generation");
}
function deploymentDecision(live:LiveObservation) {
  return verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path:VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
    process_source_identity:{
      marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
      commit:live.source.process_source_commit,tree:live.source.process_source_tree,branch:"main",
    },
  });
}
export async function collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1(input:{
  runtime_uid:number;runtime_gid:number;
}): Promise<EvidenceReport> {
  if(process.platform!=="linux")fail("host_evidence_linux_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==0)fail("host_evidence_root_required");
  const uid=positive(input.runtime_uid,"host_evidence_runtime_uid_invalid");
  const gid=positive(input.runtime_gid,"host_evidence_runtime_gid_invalid");
  const systemdBefore=serviceSnapshot(uid);
  let session:SelectorSession|null=null;
  let finished=false;
  try{
    session=await startSelectorSession(uid,gid);
    if(session.ready.service_pid!==systemdBefore.main_pid)fail("host_evidence_selector_systemd_pid_mismatch");
    const live=observeLiveGeneration(session.ready,uid,gid);
    const receipt=parseInstalledReceipt(readInstalledLiveReceiptCandidate());
    assertReceiptMatchesLive(receipt,live,systemdBefore,uid,gid);
    const deployment=deploymentDecision(live);
    if(deployment.ok!==true)fail("host_evidence_deployment_receipt_not_verified:"+deployment.reason);
    if(deployment.deployment_receipt_id!==receipt.deployment_receipt_id){
      fail("host_evidence_deployment_receipt_identity_mismatch");
    }
    const systemdDuring=serviceSnapshot(uid);
    assertServiceSnapshotStable(systemdBefore,systemdDuring);
    assertReceiptMatchesLive(receipt,live,systemdDuring,uid,gid);
    const canonicalBytes=canonicalReceiptBytes(receipt);
    readInstalledLiveReceiptExact(canonicalBytes);
    const green=await finishSelectorSession(session);
    finished=true;
    testOnlyAssertSelectorGenerationStableV1(session.ready,green);
    const systemdAfter=serviceSnapshot(uid);
    assertServiceSnapshotStable(systemdBefore,systemdAfter);
    const finalLive=observeLiveGeneration(green,uid,gid);
    assertReceiptMatchesLive(receipt,finalLive,systemdAfter,uid,gid);
    readInstalledLiveReceiptExact(canonicalBytes);
    return Object.freeze({
      schema:SCHEMA,marker:MARKER,version:1,parent_host_evidence_plan_id:PARENT_PLAN_ID,
      status:"AUTHENTICATED_RECEIPT_AND_SAME_LIVE_PROCESS_EVIDENCE_GREEN_PRODUCTION_AUTHORITY_STILL_HOLD",
      runtime_uid:uid,runtime_gid:gid,deployment_receipt_id:receipt.deployment_receipt_id,
      live_process_selector_contract_id:VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
      live_process_binding_receipt_id:receipt.receipt_id,
      process_source_commit:live.source.process_source_commit,
      process_source_tree:live.source.process_source_tree,
      systemd_invocation_id:systemdBefore.invocation_id,
      service_pid:live.selector.service_pid,
      service_start_time_ticks:live.selector.service_start_ticks,
      manager_pid:live.selector.manager_pid,
      manager_start_time_ticks:live.selector.manager_start_ticks,
      authenticated_receipt_verified:true,source_custody_requalified:true,
      selector_generation_verified:true,same_live_process_binding_verified:true,
      installed_live_process_receipt_exact_bytes_match:true,
      receipt_ancestor_custody_revalidated:true,pre_post_live_generation_stable:true,
      final_post_validation_generation_revalidated:true,
      process_environment_read_performed:false,systemd_metadata_query_performed:true,
      launch_environment_fields_receipt_attested:true,
      selector_process_execution_performed:true,source_custody_process_execution_performed:true,
      filesystem_read_performed:true,filesystem_write_performed:false,
      network_contact_performed:false,receipt_publication_performed:false,
      receipt_retirement_performed:false,service_mutation_performed:false,
      credential_access:false,wallet_or_signer_access:false,signing:false,
      transaction_submission:false,payment_acceptance:false,public_presale_activation:false,
      wc_void_market_activation:false,treasury_or_liquidity_action:false,
      funds_movement:false,production_host_evidence_authority:false,
    });
  }finally{
    if(!finished)abortSelectorSession(session);
  }
}

function selfTest(): void {
  assert.equal(PARENT_PLAN_ID.length, "voidbuyhostevplan1_".length + 64);
  assert.equal(
    VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
    "/var/lib/void-source-finality-v7/deployment-receipt.json",
  );
  assert.equal(
    VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
    "/var/lib/void-source-finality-v7/live-process-binding-v2.json",
  );
  console.log(MARKER + "_SELF_TEST_GREEN");
  console.log("parent_host_evidence_plan_bound=true");
  console.log("deployment_receipt_verifier_required=true");
  console.log("credential_free_native_selector_session_required=true");
  console.log("source_custody_requalification_required=true");
  console.log("process_environment_read_performed=false");
  console.log("credential_access=false");
  console.log("systemd_metadata_query_read_only=true");
  console.log("launch_environment_fields_receipt_attested=true");
  console.log("installed_live_receipt_exact_byte_match_required=true");
  console.log("receipt_ancestor_descriptor_custody_required=true");
  console.log("receipt_ancestor_post_read_revalidation_required=true");
  console.log("pre_post_live_generation_stability_required=true");
  console.log("final_post_validation_generation_revalidation_required=true");
  console.log("selector_pidfd_session_spans_validation=true");
  console.log("selector_process_execution_performed_by_future_host_run=true");
  console.log("source_custody_process_execution_performed_by_future_host_run=true");
  console.log("filesystem_write_performed=false");
  console.log("network_contact_performed=false");
  console.log("receipt_publication_performed=false");
  console.log("service_mutation_performed=false");
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
    fail("host_evidence_arguments_invalid");
  }
  const result = await collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1({
    runtime_uid: positive(args[2], "host_evidence_runtime_uid_invalid"),
    runtime_gid: positive(args[4], "host_evidence_runtime_gid_invalid"),
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
    console.error("filesystem_write_performed=false");
    console.error("network_contact_performed=false");
    console.error("receipt_publication_performed=false");
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
