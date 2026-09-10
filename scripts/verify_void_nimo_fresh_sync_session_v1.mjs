#!/usr/bin/env node
// Independent byte-first verifier. Does not import production admission code.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const [directory, output, generation, majorText, mode] = process.argv.slice(2), major = Number(majorText);
assert.equal(process.argv.length, 7); assert([22, 24, 26].includes(major)); assert(["single", "matrix"].includes(mode));
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation));
const canonical = v => JSON.stringify(v, (_, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const eq = (a, b) => assert.equal(canonical(a), canonical(b));
const git = (...args) => { const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { timeout: 20000, maxBuffer: 16 * 1024 * 1024, env: { PATH: "/usr/bin:/bin", LANG: "C" } }); assert.equal(r.status, 0); return r.stdout; };
const head = git("rev-parse", "HEAD").toString().trim(), tree = git("rev-parse", "HEAD^{tree}").toString().trim();
const scenarios = [1, 2, 3].map(n => `predecessor-${n}`).concat(Array.from({ length: 10 }, (_, n) => `successor-${n}`));
const paths = ["scripts/lib/void_nimo_fresh_sync_session_v1.mjs", "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
  "scripts/run_void_public_bootstrap_child_v1.mjs", "scripts/lib/void_nimo_build_admission_v1.mjs", "scripts/lib/void_nimo_node_process_observation_v1.mjs",
  "tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs", "scripts/prove_void_nimo_fresh_sync_session_v1.mjs",
  "scripts/verify_void_nimo_fresh_sync_session_v1.mjs", "scripts/fixtures/nimo-fresh-sync-v1/parent.mjs", "scripts/fixtures/nimo-fresh-sync-v1/node.mjs",
  "scripts/fixtures/nimo-fresh-sync-v1/checker.mjs", ".github/workflows/void-nimo-fresh-sync-session-v1.yml", "scripts/lib/void_nimo_executed_runtime_v1.mjs"];
const source = { head, tree, members: paths.map(name => { const bytes = git("show", `${head}:${name}`); return { path: name, bytes: bytes.length, sha256: sha(bytes) }; }) };
function read(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const s = fs.fstatSync(fd); assert(s.isFile() && s.nlink === 1 && s.size > 0 && s.size <= 1024 * 1024);
    const bytes = Buffer.alloc(s.size); let used = 0;
    for (let n = 0; n < 64 && used < bytes.length; n++) { const count = fs.readSync(fd, bytes, used, Math.min(65536, bytes.length - used), null); assert(count > 0); used += count; }
    assert.equal(used, bytes.length); const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) assert.equal(s[key], after[key]);
    const digest = sha(bytes), value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    assert.equal(bytes.toString(), canonical(value) + "\n"); return { value, sha256: digest, bytes: bytes.length };
  } finally { fs.closeSync(fd); }
}
const hex = v => assert(typeof v === "string" && /^[0-9a-f]{64}$/.test(v));
function verify(r, scenario, m, runtime) {
  eq(Object.keys(r).sort(), ["schema", "scenario", "major", "generation", "source", "profile_source", "runtime", "initial", "preflight", "at_preflight", "at_entry", "record", "terminal", "observation", "post_sync", "recovery", "fixture_build_receipt_sha256", "plan_sha256", "manifest_sha256", "target", "final_inputs", "oracle", "result", "synthetic_node_and_build_inventory", "cleanup_completed", "actual_void_node_started", "public_onboarding_accepted"].sort());
  assert.equal(r.schema, "void_nimo_fresh_sync_schedule_v1"); assert.equal(r.scenario, scenario); assert.equal(r.major, m);
  assert.equal(r.generation, generation); eq(r.source, source); eq(r.runtime, runtime); assert.equal(Number(runtime.version.slice(1).split(".")[0]), m); hex(runtime.sha256);
  assert.equal(r.actual_void_node_started, false); assert.equal(r.public_onboarding_accepted, false); assert.equal(r.synthetic_node_and_build_inventory, true); assert.equal(r.cleanup_completed, true);
  assert.equal(r.oracle.interval_ms, 100); assert.equal(r.oracle.recovery_limit_ticks, 64);
  const predecessor = scenario.startsWith("predecessor"), index = Number(scenario.split("-")[1]);
  const profileHead = predecessor ? "df042bc596168ea886639fc4a28c10c8fbc1fe5d" : head;
  assert.equal(r.profile_source.head, profileHead); assert.equal(r.profile_source.tree, git("rev-parse", `${profileHead}^{tree}`).toString().trim());
  eq(r.profile_source.members.map(x => x.path), paths.slice(1, 7));
  for (const p of r.profile_source.members) { const b = git("show", `${profileHead}:${p.path}`); assert.equal(sha(b), p.sha256); assert.equal(b.length, p.bytes); }
  assert(Number.isSafeInteger(r.target) && r.target > 0); hex(r.fixture_build_receipt_sha256); hex(r.plan_sha256); hex(r.manifest_sha256);
  if (predecessor) {
    assert.equal(r.result, "PREDECESSOR_UNBOUND_GREEN_REPRODUCED"); assert(r.observation && r.post_sync?.clean_checker_environment); assert.equal(r.terminal, null);
    assert.equal(r.observation.runtime_session_bound, false); assert.equal(r.observation.source.head, profileHead);
    if (index === 1) assert(r.initial.entries.includes("canonical-block.fixture"));
    if (index === 2) assert(r.at_preflight.configuration.members.some(x => x.key === "VOID_MAIN_BASE"));
    if (index === 3) { assert.equal(r.preflight.entries, 0); assert.notEqual(r.preflight.data.ino, r.initial.data.ino); assert.equal(r.preflight.checker.mode, "--preflight"); }
  } else if (index === 0) {
    assert.equal(r.result, "FRESH_SESSION_BOUND"); assert.equal(r.initial.entries.length, 0);
    const record = r.record, terminal = r.terminal; assert(record && terminal);
    assert.equal(record.schema, "void_nimo_fresh_sync_record_v1"); assert.equal(record.starting_entries, 0);
    eq(record.source, { head, tree }); eq(record.data, r.initial.data); eq(record.configuration, r.at_preflight.configuration);
    eq(record.child, { pid: r.at_preflight.child.pid, parent_pid: r.at_preflight.parent.pid, start_ticks: r.at_preflight.child.start_ticks });
    eq(record.parent, { pid: r.at_preflight.parent.pid, parent_pid: r.oracle.pid, start_ticks: r.at_preflight.parent.start_ticks });
    assert(r.at_preflight.parent.directories.some(d => d.dev === record.data.dev && d.ino === record.data.ino));
    assert.equal(record.plan_sha256, r.plan_sha256); assert.equal(record.build.receipt_sha256, r.fixture_build_receipt_sha256);
    assert.equal(record.runtime_sha256, runtime.sha256); assert.equal(record.manifest.sha256, r.manifest_sha256); assert.equal(record.manifest.target_head, r.target);
    eq(record.executed_runtime, { parent: runtime, child: runtime }); eq(terminal.executed_runtime, record.executed_runtime);
    eq(record.build.runtime, runtime); eq(r.observation.executed_runtime, record.executed_runtime);
    assert.equal(record.configuration.absent_keys, "all-unlisted"); assert.equal(record.configuration.sha256, sha(canonical(record.configuration.members)));
    assert.equal(terminal.record_sha256, sha(canonical(record) + "\n")); assert.equal(terminal.nonce, record.nonce);
    eq(terminal.child, record.child); eq(terminal.data, record.data); eq(terminal.source, record.source); eq(terminal.manifest, record.manifest);
    assert.equal(terminal.configuration_sha256, record.configuration.sha256); assert.equal(terminal.cooperative_session_bound, true);
    assert.equal(terminal.closed_initial_environment, true); assert.equal(terminal.fresh_data_root_at_start, true); assert.equal(terminal.public_onboarding_accepted, false); assert.equal(terminal.actual_external_join_proven, false);
    assert.equal(terminal.observation_sha256, sha(canonical(r.observation))); eq(terminal.observation, r.observation);
    eq(terminal.observed_heads, [r.target, r.target, r.target]); assert.equal(r.observation.child_process_and_socket_bound, true);
    assert(r.observation.observations.every(o => o.head === r.target && o.verified_connected_count > 0));
    assert.equal(r.final_inputs.terminal_file_exists, true); eq(r.final_inputs.data, r.initial.data);
  } else {
    assert.equal(r.result, "HOLD"); assert.equal(r.terminal, null); assert.equal(r.final_inputs.terminal_file_exists, false);
    if ([1, 2].includes(index)) { assert(r.initial.entries.length > 0); assert.equal(r.at_entry, null); }
    if (index === 2) assert(r.initial.hidden_residue && r.initial.entries.includes("index.json") && r.initial.entries.includes(".retained-chain"));
    if (index === 3) { assert(r.at_preflight.configuration.members.some(x => x.key === "VOID_MAIN_BASE")); assert.equal(r.at_entry, null); }
    if (index === 4) assert.notEqual(r.final_inputs.entry_sha256, r.final_inputs.original_entry_sha256);
    if (index === 5) assert.notEqual(r.final_inputs.manifest_sha256, r.manifest_sha256);
    if (index === 6) assert.equal(r.at_preflight, null);
    if (index === 7) { assert.equal(r.recovery.old_child.alive, false); assert(r.recovery.replacement.alive); assert.notEqual(r.recovery.replacement.pid, r.at_preflight.child.pid); }
    if (index === 8) assert.notEqual(r.final_inputs.data.ino, r.initial.data.ino);
    if (index === 9) { assert(r.record); assert.equal(r.recovery.parent_exit.signal, "SIGKILL"); assert.equal(r.recovery.child_after.alive, false);
      assert(r.recovery.retirement_ticks < 64 && r.recovery.restart_ticks < 64); assert.notEqual(r.recovery.restart_exit.code, 0); assert.equal(r.recovery.terminal_replayed, false); }
  }
}
function runtimeSet(m) {
  const folder = path.join(directory, `fresh-raw-${m}`), expected = scenarios.map(s => `node-${m}-${s}.json`);
  eq(fs.readdirSync(folder).sort(), [...expected].sort());
  const members = expected.map(name => ({ name, ...read(path.join(folder, name)) })), runtime = members[0].value.runtime;
  for (let i = 0; i < members.length; i++) verify(members[i].value, scenarios[i], m, runtime);
  return { members, runtime };
}
const { members, runtime } = runtimeSet(major), nominal = members[3].value;
assert.equal(Number(process.versions.node.split(".")[0]), major);
const runtimeFd = fs.openSync("/proc/self/exe", "r"), runtimeStat = fs.fstatSync(runtimeFd), runtimeHash = crypto.createHash("sha256"), runtimeBuffer = Buffer.alloc(65536);
assert(runtimeStat.size <= 256 * 1024 * 1024); let runtimeBytes = 0;
try { for (let n = 0; n <= 4096; n++) { const count = fs.readSync(runtimeFd, runtimeBuffer, 0, runtimeBuffer.length, null); if (!count) break; runtimeBytes += count; runtimeHash.update(runtimeBuffer.subarray(0, count)); } }
finally { fs.closeSync(runtimeFd); }
// CI verifier runs on another host: match executed bytes/version, preserving
// the schedule host's separately checked dev/ino in its receipts.
eq({ version: runtime.version, bytes: runtime.bytes, sha256: runtime.sha256 }, { version: process.version, bytes: runtimeBytes, sha256: runtimeHash.digest("hex") }); assert.equal(runtimeBytes, runtimeStat.size);
const mutations = [
  ["cross-head", r => { r.source.head = "0".repeat(40); }], ["cross-runtime", r => { r.runtime.sha256 = "0".repeat(64); }],
  ["cross-session", r => { r.terminal.nonce = "old"; }], ["cross-manifest", r => { r.record.manifest.sha256 = "0".repeat(64); }],
  ["copied-data", r => { r.initial.entries.push("canonical-block.fixture"); }], ["hidden-residue", r => { r.record.starting_entries = 1; }],
  ["node-only-steering", r => { r.at_preflight.configuration.members.push({ key: "VOID_MAIN_BASE", sha256: "0".repeat(64) }); }],
  ["restarted-child", r => { r.terminal.child.pid++; }], ["data-root-swap", r => { r.terminal.data.ino++; }],
  ["stale-generation", r => { r.generation += "old"; }], ["crash-replay", r => { r.terminal.record_sha256 = "0".repeat(64); }],
  ["partial", r => { delete r.record; }], ["historical", r => { r.profile_source.head = "df042bc596168ea886639fc4a28c10c8fbc1fe5d"; }],
  ["acceptance-promotion", r => { r.public_onboarding_accepted = true; }], ["unverified-peer", r => { r.observation.observations[0].verified_connected_count = 0; }],
];
for (const [id, change] of mutations) { const r = structuredClone(nominal); change(r); assert.throws(() => verify(r, "successor-0", major, runtime), undefined, id); }
for (const [id, mutate] of [["missing", a => a.pop()], ["duplicate", a => { a[1] = a[0]; }], ["reordered", a => a.reverse()]]) {
  const a = members.map(x => x.name); mutate(a); assert.throws(() => eq(a, scenarios.map(s => `node-${major}-${s}.json`)), undefined, id);
}
fs.mkdirSync(output, { recursive: true });
const aggregate = { marker: "EFFECTIVE_CONFIG_FRESH_SYNC_RECOVERY_GREEN", generation, head, tree, major, source, runtime,
  members: members.map(({ name, sha256, bytes }) => ({ name, sha256, bytes })), predecessor_controls: 3, successor_schedules: 10, nominal_terminals: 1, adversary_terminals: 0,
  schedule_and_verifier_executions: 14, rejection_cases: ["missing", "duplicate", "reordered", ...mutations.map(([id]) => id)],
  synthetic_node_and_build_inventory: true, actual_void_node_started: false, public_onboarding_accepted: false };
const publish = (file, value) => { const bytes = canonical(value) + "\n"; fs.writeFileSync(file, bytes, { flag: "wx", mode: 0o600 }); return { sha256: sha(bytes), bytes: Buffer.byteLength(bytes) }; };
const captured = publish(path.join(output, `node-${major}-aggregate.json`), aggregate);
console.log(canonical({ ...aggregate, aggregate_sha256: captured.sha256, aggregate_bytes: captured.bytes }));
if (mode === "matrix") {
  assert.equal(major, 26); const all = [];
  for (const m of [22, 24]) {
    const member = read(path.join(directory, `fresh-verified-${m}`, `node-${m}-aggregate.json`)), checked = runtimeSet(m);
    const expected = { ...aggregate, major: m, runtime: checked.runtime,
      members: checked.members.map(({ name, sha256, bytes }) => ({ name, sha256, bytes })) };
    eq(member.value, expected); all.push({ major: m, sha256: member.sha256, bytes: member.bytes });
  }
  all.push({ major, ...captured });
  const result = { marker: "VOID_NIMO_FRESH_SYNC_MATRIX_V1_GREEN", generation, head, tree, members: all,
    schedule_and_verifier_executions: 42, predecessor_controls: 9, successor_schedules: 30, nominal_terminals: 3, adversary_terminals: 0,
    actual_void_node_started: false, public_onboarding_accepted: false };
  const capturedMatrix = publish(path.join(output, "matrix.json"), result);
  console.log(canonical({ ...result, aggregate_sha256: capturedMatrix.sha256, aggregate_bytes: capturedMatrix.bytes }));
}
