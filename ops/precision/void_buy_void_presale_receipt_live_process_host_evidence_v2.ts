#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire, stripTypeScriptTypes, syncBuiltinESMExports } from "node:module";
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

export const PARENT_MODULE_GRAPH_PINS = Object.freeze({
  "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.ts": "ba69d46ffa6f7d178de447b469b578fa8e87ea3b",
  "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts": "d47a6f99870f385c1bc938adbef74535b78eba1f",
  "ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts": "a334ab29477dec3e36862a512191b9701debb73e",
  "src/economic/buy_void_source_finality_generation_provenance_v7.ts": "390ff1a2ff0437cd8c8693e7807c12275df42573",
  "src/economic/buy_void_source_finality_live_process_binding_v2.ts": "987c97568a4d1b9814218603df48a65dbfeed18f",
  "src/economic/buy_void_source_finality_live_process_binding_v1.ts": "73f088779f015a554f16e9eecf8a9fd9de0e1594",
  "src/economic/buy_void_auto_fulfillment_v1.ts": "b7c963b1d55f000d82ad82289b31107b432503de",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts": "a3dbe4d0fed3034d3ca2c0b3704a758d7c776090",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts": "419054e00f4d96015cd066be81e8719ee71ac00c",
  "src/economic/buy_void_verified_payment_v2.ts": "550ede02fc0b7d6874c324af58b5ef9c5591b311",
  "src/economic/buy_void_payment_rpc_observer_v1.ts": "0073818ad6f6418e895bf794024c9d678b3bef86",
  "src/economic/buy_void_source_finality_authority_v2.ts": "64953050d74bc0bc6d1e6948ae992d6143edca99",
  "src/economic/buy_void_source_finality_provider_pair_binding_v1.ts": "5d47cd29929f778b07a59647a80c4384b1497a08",
} as const);
const PARENT_ENTRY_REL = "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.ts";
const PARENT_MODULE_GRAPH_PATH_COUNT = 13;
const PARENT_MODULE_GRAPH_BUILTINS = Object.freeze(new Set([
  "node:assert/strict", "node:crypto", "node:child_process", "node:fs",
  "node:http", "node:https", "node:path", "node:perf_hooks", "node:readline",
  "node:url", "node:util",
]));
const MAX_PARENT_DATA_URL_BYTES = 16 * 1024 * 1024;

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

type ReviewedSourceGeneration = Readonly<{ bytes: Buffer; opened: fs.BigIntStats }>;
type ParentModuleGraph = Readonly<{
  module: ParentModule;
  generations: ReadonlyMap<string, fs.BigIntStats>;
}>;

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
  const nonblock = Number(fs.constants.O_NONBLOCK || 0);
  if (process.platform !== "linux" || noFollow <= 0 || nonblock <= 0) {
    fail("lane1_v2_nofollow_nonblock_unavailable");
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
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow | nonblock);
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

function resolveReviewedGraphImport(importerRelative: string, specifier: string): string {
  if (!specifier.startsWith(".")) fail("lane1_v2_parent_graph_nonlocal_import_forbidden");
  let resolved = path.posix.normalize(path.posix.join(path.posix.dirname(importerRelative), specifier));
  if (resolved.endsWith(".js")) resolved = resolved.slice(0, -3) + ".ts";
  if (path.posix.isAbsolute(resolved) || resolved === ".." || resolved.startsWith("../") || !Object.hasOwn(PARENT_MODULE_GRAPH_PINS, resolved)) {
    fail("lane1_v2_parent_graph_import_outside_reviewed_closure");
  }
  return resolved;
}

function staticModuleSpecifiers(source: string): string[] {
  if (/\bimport\s*\(/u.test(source) || /\brequire\s*\(/u.test(source)) fail("lane1_v2_parent_graph_dynamic_loader_forbidden");
  const out: string[] = [];
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/gu)) out.push(match[1]!);
  for (const match of source.matchAll(/\bimport\s+["']([^"']+)["']/gu)) out.push(match[1]!);
  return out;
}

function replaceReviewedImport(source: string, specifier: string, dataUrl: string): string {
  const escaped = specifier.replace(/[.*+?^$()|[\]\\{}]/gu, "\\$&");
  let count = 0;
  const fromPattern = new RegExp("(\\bfrom\\s+)([\\\"\'])" + escaped + "\\2", "gu");
  source = source.replace(fromPattern, (_whole, prefix: string) => { count += 1; return prefix + JSON.stringify(dataUrl); });
  const importPattern = new RegExp("(\\bimport\\s+)([\\\"\'])" + escaped + "\\2", "gu");
  source = source.replace(importPattern, (_whole, prefix: string) => { count += 1; return prefix + JSON.stringify(dataUrl); });
  if (count < 1) fail("lane1_v2_parent_graph_import_rewrite_missing");
  return source;
}

function authenticatedTypeScriptDataUrl(
  graphRoot: string, relative: string, pins: Readonly<Record<string, string>>,
  sources: ReadonlyMap<string, Buffer>, cache: Map<string, string>, building: Set<string>,
): string {
  const cached = cache.get(relative);
  if (cached) return cached;
  if (building.has(relative)) fail("lane1_v2_parent_graph_cycle_forbidden");
  const expected = pins[relative];
  const bytes = sources.get(relative);
  if (!expected || !bytes || gitBlob(bytes) !== expected) fail("lane1_v2_parent_graph_source_blob_mismatch");
  building.add(relative);
  let source = bytes.toString("utf8");
  const absolute = path.join(graphRoot, ...relative.split("/"));
  source = source.replaceAll("import.meta.url", JSON.stringify(pathToFileURL(absolute).href));
  for (const specifier of staticModuleSpecifiers(source)) {
    if (specifier.startsWith("node:")) {
      if (!PARENT_MODULE_GRAPH_BUILTINS.has(specifier)) fail("lane1_v2_parent_graph_builtin_not_reviewed");
      continue;
    }
    const childRelative = resolveReviewedGraphImport(relative, specifier);
    const childUrl = authenticatedTypeScriptDataUrl(graphRoot, childRelative, pins, sources, cache, building);
    source = replaceReviewedImport(source, specifier, childUrl);
  }
  let javascript: string;
  try { javascript = stripTypeScriptTypes(source, { mode: "transform", sourceMap: false }); }
  catch { fail("lane1_v2_parent_graph_typescript_strip_failed"); }
  const dataUrl = "data:text/javascript;base64," + Buffer.from(javascript, "utf8").toString("base64");
  if (Buffer.byteLength(dataUrl, "utf8") > MAX_PARENT_DATA_URL_BYTES) fail("lane1_v2_parent_graph_data_url_too_large");
  building.delete(relative);
  cache.set(relative, dataUrl);
  return dataUrl;
}

async function executeAuthenticatedTypeScriptGraph(
  graphRoot: string, entryRelative: string, pins: Readonly<Record<string, string>>,
  sources: ReadonlyMap<string, Buffer>,
): Promise<unknown> {
  if (typeof stripTypeScriptTypes !== "function") fail("lane1_v2_typescript_strip_unavailable");
  if (sources.size !== Object.keys(pins).length) fail("lane1_v2_parent_graph_source_count_invalid");
  const url = authenticatedTypeScriptDataUrl(graphRoot, entryRelative, pins, sources, new Map(), new Set());
  return import(url);
}

export async function testOnlyAuthenticatedModuleGraphV2(): Promise<void> {
  const entry = "fixture/entry.ts";
  const dependency = "fixture/dep.ts";
  const entryBytes = Buffer.from('import { value } from "./dep.js"; export const answer=value+1; export const sourceUrl=import.meta.url;', "utf8");
  const depBytes = Buffer.from("export const value:number=41;", "utf8");
  const pins = Object.freeze({ [entry]: gitBlob(entryBytes), [dependency]: gitBlob(depBytes) });
  const sources = new Map<string, Buffer>([[entry, entryBytes], [dependency, depBytes]]);
  const result = plainRecord(await executeAuthenticatedTypeScriptGraph("/void-reviewed-graph", entry, pins, sources), "lane1_v2_test_graph_result_invalid");
  assert.equal(result.answer, 42);
  assert.equal(result.sourceUrl, pathToFileURL("/void-reviewed-graph/fixture/entry.ts").href);
  const badSources = new Map(sources);
  badSources.set(dependency, Buffer.from("export const value=99;", "utf8"));
  let rejected = false;
  try { await executeAuthenticatedTypeScriptGraph("/void-reviewed-graph", entry, pins, badSources); }
  catch (error) { rejected = error instanceof Error && error.message === "lane1_v2_parent_graph_source_blob_mismatch"; }
  assert.equal(rejected, true);
}

export async function testOnlyExecuteAuthenticatedTypeScriptGraphV2(
  graphRoot: string,
  entryRelative: string,
  pins: Readonly<Record<string, string>>,
  sources: ReadonlyMap<string, Buffer>,
): Promise<unknown> {
  return executeAuthenticatedTypeScriptGraph(
    graphRoot,
    entryRelative,
    pins,
    sources,
  );
}


async function loadExactParent(sourceLease: ReviewedSourceGeneration): Promise<ParentModuleGraph> {
  if (PARENT_MODULE_GRAPH_PINS[PARENT_ENTRY_REL] !== PARENT_SOURCE_GIT_BLOB_SHA1) fail("lane1_v2_parent_graph_entry_pin_mismatch");
  const sources = new Map<string, Buffer>();
  const generations = new Map<string, fs.BigIntStats>();
  for (const [relative, expectedBlob] of Object.entries(PARENT_MODULE_GRAPH_PINS)) {
    if (relative === PARENT_ENTRY_REL) {
      if (gitBlob(sourceLease.bytes) !== expectedBlob) fail("lane1_v2_parent_source_blob_mismatch");
      sources.set(relative, sourceLease.bytes);
      generations.set(relative, sourceLease.opened);
      continue;
    }
    const lease = readExactReviewedSource(path.join(ROOT, ...relative.split("/")), expectedBlob);
    sources.set(relative, lease.bytes);
    generations.set(relative, lease.opened);
  }
  if (sources.size !== PARENT_MODULE_GRAPH_PATH_COUNT || generations.size !== PARENT_MODULE_GRAPH_PATH_COUNT) fail("lane1_v2_parent_graph_path_count_invalid");
  const imported = plainRecord(
    await executeAuthenticatedTypeScriptGraph(ROOT, PARENT_ENTRY_REL, PARENT_MODULE_GRAPH_PINS, sources),
    "lane1_v2_parent_module_invalid",
  ) as unknown as ParentModule;
  if (imported.MARKER !== PARENT_MARKER || imported.SCHEMA !== PARENT_SCHEMA || imported.PARENT_PLAN_ID !== PARENT_PLAN_ID || typeof imported.collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1 !== "function") {
    fail("lane1_v2_parent_module_contract_invalid");
  }
  return Object.freeze({ module: imported, generations });
}

function revalidateParentModuleGraph(graph: ParentModuleGraph): void {
  if (graph.generations.size !== PARENT_MODULE_GRAPH_PATH_COUNT) fail("lane1_v2_parent_graph_path_count_invalid");
  for (const [relative, opened] of graph.generations) {
    const expectedBlob = PARENT_MODULE_GRAPH_PINS[relative as keyof typeof PARENT_MODULE_GRAPH_PINS];
    if (!expectedBlob) fail("lane1_v2_parent_graph_unpinned_path");
    revalidateReviewedSource(path.join(ROOT, ...relative.split("/")), expectedBlob, opened);
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
  const nonblock = Number(fs.constants.O_NONBLOCK || 0);
  if (process.platform !== "linux" || noFollow <= 0 || nonblock <= 0) {
    fail("lane1_v2_executable_nofollow_nonblock_unavailable");
  }
  const before = fs.lstatSync(canonical, { bigint: true });
  if (!executableTrusted(before)) fail("lane1_v2_executable_custody_invalid");
  const fd = fs.openSync(canonical, fs.constants.O_RDONLY | noFollow | nonblock);
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

export function testOnlyReadExactReviewedSourceV2(
  absolute: string,
  expectedBlob: string,
): number {
  return readExactReviewedSource(absolute, expectedBlob).bytes.length;
}

export function testOnlyOpenExecutableLeaseV2(absolute: string): void {
  const lease = openExecutableLease(absolute);
  try {
    revalidateExecutableLease(lease);
  } finally {
    closeExecutableLease(lease);
  }
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
  let parentGraph: ParentModuleGraph | undefined;
  const adapted = await withRuntimeUserSystemctlIdentityDrop(
    uid,
    gid,
    async () => {
      parentGraph = await loadExactParent(sourceLease);
      return parentGraph.module.collectBuyVoidPresaleReceiptLiveProcessHostEvidenceV1({
        runtime_uid: uid,
        runtime_gid: gid,
      });
    },
  );
  if (!parentGraph) fail("lane1_v2_parent_graph_not_loaded");
  if (
    adapted.audit.systemd_query_count !== 3 ||
    adapted.audit.working_directory_custody_verified_count !== 3
  ) {
    fail("lane1_v2_systemd_query_audit_invalid");
  }
  revalidateParentModuleGraph(parentGraph);
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
    parent_v1_authenticated_module_graph_bound: true,
    parent_v1_module_graph_path_count: PARENT_MODULE_GRAPH_PATH_COUNT,
    parent_v1_execution_from_authenticated_data_url: true,
    parent_v1_path_import_performed: false,
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

async function selfTest(): Promise<void> {
  assert.equal(PARENT_SOURCE_GIT_BLOB_SHA1.length, 40);
  assert.equal(PARENT_PROOF_GIT_BLOB_SHA1.length, 40);
  assert.equal(Object.keys(PARENT_MODULE_GRAPH_PINS).length, PARENT_MODULE_GRAPH_PATH_COUNT);
  assert.equal(PARENT_MODULE_GRAPH_PINS[PARENT_ENTRY_REL], PARENT_SOURCE_GIT_BLOB_SHA1);
  await testOnlyAuthenticatedModuleGraphV2();
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
  console.log("parent_v1_authenticated_module_graph_bound=true");
  console.log("parent_v1_module_graph_path_count=13");
  console.log("parent_v1_execution_from_authenticated_data_url=true");
  console.log("parent_v1_path_import_performed=false");
  console.log("reviewed_source_open_nonblocking=true");
  console.log("executable_lease_open_nonblocking=true");
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
    await selfTest();
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
