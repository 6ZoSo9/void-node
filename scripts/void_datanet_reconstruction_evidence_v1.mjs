#!/usr/bin/env node
// Portable CI evidence only. This runner never grants DataNet/runtime authority.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PLANNER = "scripts/prove_void_datanet_chain_peer_reconstruction_v1.mjs";
export const ACCOUNTING = "scripts/prove_void_datanet_chain_peer_reconstruction_replica_accounting_v1.mjs";
export const EVIDENCE_PROOF = "scripts/prove_void_datanet_reconstruction_evidence_v1.mjs";
export const RUNNER = "scripts/void_datanet_reconstruction_evidence_v1.mjs";
export const WORKFLOWS = Object.freeze({
  planner: ".github/workflows/void-datanet-chain-peer-reconstruction-v1.yml",
  accounting: ".github/workflows/void-datanet-chain-peer-reconstruction-replica-accounting-v1.yml",
});
// Immutable reusable-workflow reference accepted by the repository Actions
// guard. Its accounting workflow blob must equal the current source entry.
export const ACCOUNTING_DEFINITION_SHA = "e210cee3cfb52afa5038b0972b7b5419a0c37769";
export const SOURCE_PATHS = Object.freeze([
  ...Object.values(WORKFLOWS),
  "docs/architecture/datanet-chain-peer-reconstruction-v1.md",
  "docs/architecture/datanet-chain-peer-reconstruction-replica-accounting-v1.md",
  "scripts/lib/void_datanet_chain_peer_reconstruction_v1.mjs",
  PLANNER, ACCOUNTING, RUNNER, EVIDENCE_PROOF,
].sort());
export const MEMBERS = Object.freeze(["planner", "accounting"].flatMap(lane =>
  [22, 24, 26].map(major => Object.freeze({ lane, major }))));
export const AUTHORITY = Object.freeze({
  operational_status: "DATANET_RECONSTRUCTION_HOLD",
  verified_independent_replica_count: 0,
  chain_finality_verified: false, peer_authentication_verified: false,
  independent_custody_verified: false, replication_policy_verified: false,
  selected_bytes_custody_bound: false, publication_readmission_verified: false,
  reconstruction_authority: false, publication_authority: false,
  local_replica_admission_authority: false, retirement_authority: false,
  repair_authority: false, runtime_canary_green: false, source_green: false,
  independently_reviewed: false, deployed: false, funds_authority: false,
});
const MAX_RECEIPT_BYTES = 262144;
const MAX_BUNDLE_BYTES = 6 * MAX_RECEIPT_BYTES + 65536;
const SHA1 = /^[0-9a-f]{40}$/;
const POSITIVE = /^[1-9][0-9]{0,19}$/;
const VERSION = /^v(22|24|26)\.[0-9]{1,3}\.[0-9]{1,3}$/;

export function canonical(value, depth = 0) {
  assert.ok(depth <= 32, "evidence_depth_bound");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") { assert.ok(Number.isSafeInteger(value)); return String(value); }
  if (Array.isArray(value)) return `[${value.map(v => canonical(v, depth + 1)).join(",")}]`;
  assert.ok(value && Object.getPrototypeOf(value) === Object.prototype, "evidence_not_json");
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k], depth + 1)}`).join(",")}}`;
}
export const digest = value => crypto.createHash("sha256").update(value).digest("hex");
export const encode = value => canonical(value) + "\n";

export function decode(text, maximum = MAX_RECEIPT_BYTES) {
  assert.equal(typeof text, "string");
  assert.ok(Buffer.byteLength(text) <= maximum, "evidence_byte_bound");
  const value = JSON.parse(text);
  assert.equal(encode(value), text, "noncanonical_or_duplicate_json");
  return value;
}

export function commandSet(lane) {
  assert.ok(Object.hasOwn(WORKFLOWS, lane), "unknown_lane");
  const syntax = SOURCE_PATHS.filter(p => p.endsWith(".mjs")).map(p => ({ program: "node", args: ["--check", p] }));
  const proofs = [PLANNER, ...(lane === "accounting" ? [ACCOUNTING] : []), EVIDENCE_PROOF];
  return [...syntax, ...proofs.map(p => ({ program: "node", args: [p, "--case-manifest"] })),
    { program: "git", args: ["diff", "--check", "HEAD"] }];
}

export function caseManifest(output, suite) {
  const rows = output.split("\n").filter(s => s.startsWith("case_manifest_json="));
  assert.equal(rows.length, 1, "case_manifest_cardinality");
  const manifest = JSON.parse(rows[0].slice("case_manifest_json=".length));
  assert.deepEqual(Object.keys(manifest).sort(), ["case_names", "schema", "suite"]);
  assert.equal(manifest.schema, "VOID_DATANET_CASE_MANIFEST_V1");
  assert.equal(manifest.suite, suite);
  assert.ok(Array.isArray(manifest.case_names) && manifest.case_names.length > 0 && manifest.case_names.length <= 512);
  assert.ok(manifest.case_names.every(n => typeof n === "string" && n.length > 0 && n.length <= 240));
  assert.equal(new Set(manifest.case_names).size, manifest.case_names.length, "duplicate_case");
  assert.equal(output.split("\n").filter(s => s === `cases=${manifest.case_names.length}`).length, 1, "case_count_mismatch");
  return { ...manifest, count: manifest.case_names.length, sha256: digest(canonical(manifest)) };
}

export function commandRecord(command, stdout, stderr = "", status = 0) {
  assert.equal(status, 0, "command_failed");
  assert.equal(stderr, "", "unexpected_command_stderr");
  assert.ok(Buffer.byteLength(stdout) <= 65536, "command_output_bound");
  const suite = { [PLANNER]: "planner", [ACCOUNTING]: "accounting", [EVIDENCE_PROOF]: "evidence" }[command.args[0]];
  const manifest = suite ? caseManifest(stdout, suite) : null;
  if (!suite) assert.equal(stdout, "", "unexpected_check_output");
  return { ...command, exit_code: 0, stdout, stderr, output_sha256: digest(canonical({ stdout, stderr })), case_manifest: manifest };
}

function validSource(source) {
  assert.deepEqual(Object.keys(source).sort(), ["entries", "head", "tree"]);
  assert.match(source.head, SHA1); assert.match(source.tree, SHA1);
  assert.deepEqual(source.entries.map(e => e.path), SOURCE_PATHS);
  for (const entry of source.entries) {
    assert.deepEqual(Object.keys(entry).sort(), ["blob", "mode", "path"]);
    assert.match(entry.blob, SHA1);
    assert.equal(entry.mode, entry.path.startsWith("scripts/") && !entry.path.includes("/lib/") ? "100755" : "100644");
  }
}
function validRun(run) {
  assert.deepEqual(Object.keys(run).sort(), ["attempt", "event", "id", "repository", "workflow_sha"]);
  assert.equal(run.repository, "6ZoSo9/void-node");
  assert.match(run.id, POSITIVE); assert.match(run.attempt, POSITIVE);
  assert.match(run.workflow_sha, SHA1);
  assert.ok(["pull_request", "push"].includes(run.event), "unsupported_event");
}
function validRuntime(runtime) {
  assert.deepEqual(Object.keys(runtime).sort(), ["arch", "major", "platform", "version"]);
  assert.match(runtime.version, VERSION);
  assert.equal(runtime.major, Number(runtime.version.split(".")[0].slice(1)));
  assert.equal(runtime.platform, "linux"); assert.equal(runtime.arch, "x64");
}
export function makeReceipt(source, run, lane, runtime, commands) {
  validSource(source); validRun(run); validRuntime(runtime);
  assert.deepEqual(commands.map(({ program, args }) => ({ program, args })), commandSet(lane), "command_set_mismatch");
  for (const c of commands) assert.deepEqual(c, commandRecord({ program: c.program, args: c.args }, c.stdout, c.stderr, c.exit_code));
  const workflow = source.entries.find(e => e.path === WORKFLOWS[lane]);
  return {
    schema: "VOID_DATANET_JOB_RECEIPT_V1", source, run,
    job: { logical_id: lane, matrix_key: `${lane}-node-${runtime.major}`, workflow,
      workflow_definition_sha: lane === "accounting" ? ACCOUNTING_DEFINITION_SHA : run.workflow_sha },
    runtime, commands, terminal: "PASS_REFERENCE_PROOFS", authority: AUTHORITY,
  };
}

// expected is independently derived from the exact local checkout and trusted
// run coordinates, never from the receipts being checked.
export function validateReceipts(texts, expected) {
  assert.equal(texts.length, 6, "six_members_required");
  validSource(expected.source); validRun(expected.run);
  const byKey = new Map();
  for (const text of texts) {
    const receipt = decode(text);
    validRuntime(receipt.runtime);
    const lane = receipt.job?.logical_id;
    const key = `${lane}-node-${receipt.runtime.major}`;
    assert.ok(MEMBERS.some(m => m.lane === lane && m.major === receipt.runtime.major), "unexpected_member");
    assert.ok(!byKey.has(key), "duplicate_member");
    const wanted = makeReceipt(expected.source, expected.run, lane, receipt.runtime, expected.commands[lane]);
    assert.equal(encode(wanted), text, "receipt_substitution_or_generation_mismatch");
    byKey.set(key, receipt);
  }
  const receipts = MEMBERS.map(({ lane, major }) => {
    const value = byKey.get(`${lane}-node-${major}`);
    assert.ok(value, "missing_member"); return value;
  });
  for (const major of [22, 24, 26]) {
    assert.equal(byKey.get(`planner-node-${major}`).runtime.version,
      byKey.get(`accounting-node-${major}`).runtime.version, "runtime_patch_mismatch");
  }
  return receipts;
}

export function makeBundle(texts, expected, verifierRuntime) {
  validRuntime(verifierRuntime);
  const receipts = validateReceipts(texts, expected);
  return {
    schema: "VOID_DATANET_MATRIX_BUNDLE_V1", source: expected.source, run: expected.run,
    terminal: "COMPLETE_HOSTED_REFERENCE_PROOFS", authority: AUTHORITY,
    verifier_runtime: verifierRuntime,
    members: receipts.map(receipt => ({ sha256: digest(encode(receipt)), receipt })),
  };
}
export function verifyBundle(text, expected) {
  const bundle = decode(text, MAX_BUNDLE_BYTES);
  const rebuilt = makeBundle(bundle.members.map(m => encode(m.receipt)), expected, bundle.verifier_runtime);
  assert.equal(encode(rebuilt), text, "bundle_substitution");
  return rebuilt;
}

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", timeout: 10000, maxBuffer: 1048576, ...options }).trim();
}
function entriesAt(ref) {
  assert.match(ref, SHA1);
  return git(["ls-tree", "-r", ref, "--", ...SOURCE_PATHS]).split("\n").map(row => {
    const [meta, path] = row.split("\t"), [mode, type, blob] = meta.split(" ");
    assert.equal(type, "blob"); return { path, mode, blob };
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
export function sourceSnapshot(head, workflowSha) {
  assert.match(head, SHA1); assert.match(workflowSha, SHA1);
  assert.equal(git(["rev-parse", "HEAD"]), head, "checkout_head_mismatch");
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"]), "", "dirty_checkout");
  const source = { head, tree: git(["rev-parse", "HEAD^{tree}"]), entries: entriesAt(head) };
  validSource(source);
  assert.deepEqual(entriesAt(workflowSha), source.entries, "workflow_definition_source_mismatch");
  assert.equal(git(["rev-parse", `${ACCOUNTING_DEFINITION_SHA}:${WORKFLOWS.accounting}`]),
    source.entries.find(e => e.path === WORKFLOWS.accounting).blob, "pinned_accounting_workflow_mismatch");
  for (const e of source.entries) {
    const path = resolve(ROOT, e.path), stat = lstatSync(path);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), "source_not_regular");
    assert.equal(stat.mode & 0o111 ? "100755" : "100644", e.mode, "source_mode_mismatch");
    assert.equal(git(["hash-object", "--stdin"], { input: readFileSync(path) }), e.blob, "source_blob_mismatch");
  }
  return source;
}
function runtime() { return { version: process.version, major: Number(process.versions.node.split(".")[0]), platform: process.platform, arch: process.arch }; }
function hostedContext() {
  assert.equal(process.env.GITHUB_ACTIONS, "true", "hosted_context_required");
  const run = { repository: process.env.GITHUB_REPOSITORY, id: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT, event: process.env.GITHUB_EVENT_NAME,
    workflow_sha: process.env.WORKFLOW_DEFINITION_SHA };
  validRun(run);
  return { source: sourceSnapshot(process.env.EXPECTED_SOURCE_SHA, run.workflow_sha), run };
}
function executeCommands(lane) {
  return commandSet(lane).map(command => {
    const result = spawnSync(command.program === "node" ? process.execPath : "git", command.args,
      { cwd: ROOT, encoding: "utf8", timeout: 30000, maxBuffer: 65536, env: process.env });
    assert.equal(result.error, undefined, "command_error_or_timeout");
    assert.equal(result.signal, null, "command_signal");
    return commandRecord(command, result.stdout, result.stderr, result.status);
  });
}
export function artifactName(lane, major, expected) {
  return `datanet-member-${lane}-${major}-${expected.run.id}-${expected.run.attempt}-${expected.source.head}`;
}
function readRegular(path, maximum) {
  assert.ok(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), "artifact_not_regular");
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    assert.ok(stat.isFile() && stat.size > 0 && stat.size <= maximum, "artifact_file_bound");
    const buffer = Buffer.alloc(maximum + 1);
    let used = 0, count;
    while (used < buffer.length && (count = readSync(fd, buffer, used, buffer.length - used, null)) > 0) used += count;
    assert.ok(used <= maximum, "artifact_read_bound");
    return buffer.subarray(0, used).toString("utf8");
  } finally { closeSync(fd); }
}
export function readMembers(directory, expected) {
  assert.ok(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink());
  const names = MEMBERS.map(m => artifactName(m.lane, m.major, expected));
  assert.deepEqual(readdirSync(directory).sort(), [...names].sort(), "artifact_set_mismatch");
  return names.map((name, index) => {
    const folder = resolve(directory, name), stat = lstatSync(folder);
    assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), "artifact_directory_type");
    assert.deepEqual(readdirSync(folder), ["receipt.json"], "artifact_file_set");
    const text = readRegular(resolve(folder, "receipt.json"), MAX_RECEIPT_BYTES);
    const receipt = decode(text);
    assert.equal(receipt.job?.logical_id, MEMBERS[index].lane, "artifact_member_binding");
    assert.equal(receipt.runtime?.major, MEMBERS[index].major, "artifact_member_binding");
    return text;
  });
}
function writeNew(directory, file, value) {
  mkdirSync(directory, { recursive: false });
  writeFileSync(resolve(directory, file), encode(value), { flag: "wx", mode: 0o600 });
}
function main(args) {
  const [mode, ...rest] = args;
  if (mode === "emit") {
    assert.equal(rest.length, 2); const [lane, directory] = rest;
    const expected = hostedContext(), current = runtime();
    assert.equal(process.env.GITHUB_JOB, lane, "logical_job_mismatch");
    assert.equal(String(current.major), process.env.EXPECTED_NODE_MAJOR, "matrix_runtime_mismatch");
    const receipt = makeReceipt(expected.source, expected.run, lane, current, executeCommands(lane));
    assert.deepEqual(sourceSnapshot(expected.source.head, expected.run.workflow_sha), expected.source);
    writeNew(directory, "receipt.json", receipt);
    console.log(`VOID_DATANET_JOB_RECEIPT_V1_GREEN lane=${lane} node=${current.version} sha256=${digest(encode(receipt))}`);
  } else if (mode === "aggregate") {
    assert.equal(rest.length, 2); const [directory, output] = rest;
    assert.equal(process.env.PLANNER_RESULT, "success", "planner_dependency_failed");
    assert.equal(process.env.ACCOUNTING_RESULT, "success", "accounting_dependency_failed");
    const expected = hostedContext();
    expected.commands = { planner: executeCommands("planner"), accounting: executeCommands("accounting") };
    const bundle = makeBundle(readMembers(directory, expected), expected, runtime());
    assert.deepEqual(sourceSnapshot(expected.source.head, expected.run.workflow_sha), expected.source);
    writeNew(output, "bundle.json", bundle);
    console.log(`VOID_DATANET_MATRIX_BUNDLE_V1_GREEN members=6 sha256=${digest(encode(bundle))}`);
  } else if (mode === "verify") {
    assert.equal(rest.length, 6, "verify requires bundle, head, run, attempt, workflow SHA, event");
    const [file, head, id, attempt, workflow_sha, event] = rest;
    const expected = { source: sourceSnapshot(head, workflow_sha), run: { repository: "6ZoSo9/void-node", id, attempt, workflow_sha, event } };
    expected.commands = { planner: executeCommands("planner"), accounting: executeCommands("accounting") };
    const bundle = verifyBundle(readRegular(file, MAX_BUNDLE_BYTES), expected);
    assert.deepEqual(sourceSnapshot(head, workflow_sha), expected.source);
    console.log(`VOID_DATANET_MATRIX_BUNDLE_V1_VERIFIED members=6 sha256=${digest(encode(bundle))}`);
  } else throw new Error("expected emit, aggregate or verify");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(`VOID_DATANET_EVIDENCE_HOLD: ${error.message}`); process.exitCode = 1;
  }
}
