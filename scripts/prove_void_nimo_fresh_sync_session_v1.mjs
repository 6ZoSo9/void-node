#!/usr/bin/env node
// Independent external oracle: no production validator/controller imports.
// All node/adapter/CLI machine boundaries are explicit disposable fixtures.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd(), [scenario, output, generation] = process.argv.slice(2);
assert.equal(process.argv.length, 5); assert(/^(predecessor-[123]|successor-[0-9])$/.test(scenario));
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation)); const major = Number(process.versions.node.split(".")[0]); assert([22, 24, 26].includes(major));
const canonical = v => JSON.stringify(v, (_, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const env = { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C", TZ: "UTC" };
const run = (cwd, cmd, args, maxBuffer = 16 * 1024 * 1024) => {
  const r = spawnSync(cmd, args, { cwd, env, timeout: 60000, maxBuffer }); assert.equal(r.status, 0, r.stderr?.toString().slice(-2000)); return r.stdout;
};
const git = (...args) => run(ROOT, "/usr/bin/git", ["--no-replace-objects", ...args]);
const head = git("rev-parse", "HEAD").toString().trim(), tree = git("rev-parse", "HEAD^{tree}").toString().trim();
const names = ["scripts/lib/void_nimo_fresh_sync_session_v1.mjs", "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
  "scripts/run_void_public_bootstrap_child_v1.mjs", "scripts/lib/void_nimo_build_admission_v1.mjs", "scripts/lib/void_nimo_node_process_observation_v1.mjs",
  "tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs", "scripts/prove_void_nimo_fresh_sync_session_v1.mjs",
  "scripts/verify_void_nimo_fresh_sync_session_v1.mjs", "scripts/fixtures/nimo-fresh-sync-v1/parent.mjs", "scripts/fixtures/nimo-fresh-sync-v1/node.mjs",
  "scripts/fixtures/nimo-fresh-sync-v1/checker.mjs", ".github/workflows/void-nimo-fresh-sync-session-v1.yml", "scripts/lib/void_nimo_executed_runtime_v1.mjs"];
const source = { head, tree, members: names.map(name => {
  const bytes = fs.readFileSync(name); assert(bytes.equals(git("show", `${head}:${name}`))); return { path: name, bytes: bytes.length, sha256: sha(bytes) };
}) };
function runtime() {
  const fd = fs.openSync("/proc/self/exe", "r"), s = fs.fstatSync(fd), buffer = Buffer.alloc(65536), h = crypto.createHash("sha256");
  assert(s.size <= 256 * 1024 * 1024); let used = 0;
  try { for (let i = 0; i <= 4096; i++) { const n = fs.readSync(fd, buffer, 0, buffer.length, null); if (!n) break; used += n; h.update(buffer.subarray(0, n)); } } finally { fs.closeSync(fd); }
  assert.equal(used, s.size); return { version: process.version, sha256: h.digest("hex"), bytes: used, dev: s.dev, ino: s.ino };
}
const runtimeBinding = runtime();
function read(file, limit = 1024 * 1024) { const b = fs.readFileSync(file); assert(b.length <= limit); return b; }
assert.equal(read("/proc/self/stat", 4096).toString().split(" ")[0], String(process.pid), "matching procfs namespace required");
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
async function wait(test, limit = 1200) { for (let tick = 0; tick < limit; tick++) { const result = test(); if (result) return { result, tick }; await pause(); } assert.fail("fixed fixture deadline"); }
function census(pid) {
  let text; try { text = read(`/proc/${pid}/stat`, 4096).toString(); } catch (e) { if (e.code === "ENOENT") return { pid, alive: false }; throw e; }
  const f = text.slice(text.lastIndexOf(") ") + 2).split(/\s+/);
  if (["Z", "X"].includes(f[0])) return { pid, alive: false };
  const r = { pid, alive: true, parent_pid: Number(f[1]), start_ticks: f[19] };
  try {
    r.argv = read(`/proc/${pid}/cmdline`, 16384).toString().split("\0").filter(Boolean);
    const exe = fs.statSync(`/proc/${pid}/exe`); r.executable = { dev: exe.dev, ino: exe.ino, path: fs.realpathSync(`/proc/${pid}/exe`) };
    r.directories = [];
    for (const name of fs.readdirSync(`/proc/${pid}/fd`).slice(0, 256)) {
      try { const s = fs.statSync(`/proc/${pid}/fd/${name}`); if (s.isDirectory()) r.directories.push({ dev: s.dev, ino: s.ino }); } catch (e) { if (e.code !== "ENOENT") throw e; }
    }
  } catch (e) { if (!["ENOENT", "ESRCH", "EACCES"].includes(e.code)) throw e; r.incomplete = true; }
  return r;
}
const processes = [];
async function cleanup() {
  const children = processes.flatMap(p => p.messages.filter(m => m.fixture === "child").map(m => census(m.pid))).filter(x => x.alive);
  for (const p of [...processes].reverse()) { if (!p.exit) p.child.kill("SIGKILL"); await wait(() => p.exit, 64); }
  for (const child of children) await wait(() => { const c = census(child.pid); return !c.alive || c.start_ticks !== child.start_ticks; }, 64);
}
function launch(cwd, file, args, environment, flags = []) {
  const child = spawn(process.execPath, [...flags, file, ...args], { cwd, env: environment, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  const state = { child, messages: [], stdout: "", stderr: "", exit: null };
  for (const stream of ["stdout", "stderr"]) child[stream].on("data", b => { state[stream] += b; assert(state[stream].length <= 1024 * 1024); });
  child.on("message", m => state.messages.push(m)); child.on("exit", (code, signal) => { state.exit = { code, signal }; });
  processes.push(state); return state;
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nimo-fresh-sync-")), checkout = path.join(dir, "checkout"), data = path.join(dir, "data");
let worktree = false;
try {
  const predecessor = scenario.startsWith("predecessor"), index = Number(scenario.split("-")[1]);
  const profileHead = predecessor ? "df042bc596168ea886639fc4a28c10c8fbc1fe5d" : head;
  const profileTree = git("rev-parse", `${profileHead}^{tree}`).toString().trim();
  git("worktree", "add", "--detach", checkout, profileHead); worktree = true; fs.mkdirSync(data, { mode: 0o700 });
  for (const name of ["parent", "node", "checker"]) {
    const relative = `scripts/fixtures/nimo-fresh-sync-v1/${name}.mjs`;
    fs.mkdirSync(path.dirname(path.join(checkout, relative)), { recursive: true });
    fs.writeFileSync(path.join(checkout, relative), read(path.join(ROOT, relative)));
  }
  const profileSource = { head: profileHead, tree: profileTree, members: names.slice(1, 7).map(name => {
    const b = read(path.join(checkout, name)); assert(b.equals(git("show", `${profileHead}:${name}`))); return { path: name, bytes: b.length, sha256: sha(b) };
  }) };
  const rawManifest = read(path.join(checkout, "public/bootstrap/v1.json")), manifest = JSON.parse(rawManifest), target = Math.max(...manifest.sync_endpoints.map(x => x.qualified_head));
  const peers = manifest.sync_endpoints.map(x => x.base).join(",");
  const dataIdentity = () => { const s = fs.statSync(data); return { dev: s.dev, ino: s.ino }; };
  const packet = { type: "release", head: profileHead, manifest: rawManifest.toString(), bodies: {} };
  async function checker(mode) {
    const p = launch(checkout, "scripts/fixtures/nimo-fresh-sync-v1/checker.mjs", [], env, ["--no-warnings", "--experimental-vm-modules"]);
    await wait(() => p.messages.some(x => x.type === "ready")); p.child.send({ ...packet, mode }); await wait(() => p.exit);
    assert.equal(p.exit.code, 0, p.stderr); assert(p.stdout.includes(mode === "--preflight" ? "VOID_NIMO_NO_TAILNET_PREFLIGHT_V1_GREEN" : "VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN"));
    return { mode, output_sha256: sha(p.stdout), clean_checker_environment: true };
  }
  let preflight = null;
  if (predecessor && index === 3) preflight = { checker: await checker("--preflight"), data: dataIdentity(), entries: fs.readdirSync(data).length };
  if ((predecessor && index === 1) || (!predecessor && index === 1)) fs.writeFileSync(path.join(data, "canonical-block.fixture"), JSON.stringify({ head: target }));
  if (!predecessor && index === 2) { fs.mkdirSync(path.join(data, ".retained-chain")); fs.writeFileSync(path.join(data, ".retained-chain/block.fixture"), String(target)); fs.writeFileSync(path.join(data, "index.json"), "{}"); }
  if (predecessor && index === 3) { fs.renameSync(data, data + "-generation-a"); fs.mkdirSync(data); fs.writeFileSync(path.join(data, "canonical-block.fixture"), JSON.stringify({ head: target })); }
  const initial = { data: dataIdentity(), entries: fs.readdirSync(data).sort(), hidden_residue: !predecessor && index === 2 };
  fs.mkdirSync(path.join(checkout, ".runtime"), { recursive: true }); fs.mkdirSync(path.join(checkout, "dist")); fs.mkdirSync(path.join(checkout, "node_modules/fixture"), { recursive: true });
  fs.writeFileSync(path.join(checkout, "dist/index.js"), read(path.join(checkout, "scripts/fixtures/nimo-fresh-sync-v1/node.mjs")));
  fs.writeFileSync(path.join(checkout, "node_modules/fixture/index.js"), "export const fixture = true;\n");
  fs.writeFileSync(path.join(checkout, ".runtime/fresh-fixture.json"), canonical({ target, generation }));
  // Synthetic inventory explicitly binds the stand-in entry. It is never
  // represented as a compiler-produced receipt; the separate build matrix owns
  // actual compiled derivation. The real admission implementation verifies it.
  const rows = git("ls-tree", "-rz", "--full-tree", profileHead).toString().split("\0").filter(Boolean);
  const sourceMembers = rows.map(r => r.slice(r.indexOf("\t") + 1)).filter(n => n.startsWith("src/") || /\.(mjs|cjs|js)$/.test(n) ||
    ["package.json", "package-lock.json", "tsconfig.build.json", ".github/workflows/void-nimo-build-admission-v1.yml"].includes(n)).map(n => {
      const b = read(path.join(checkout, n), 32 * 1024 * 1024); return { path: n, bytes: b.length, sha256: sha(b) };
    });
  const inventory = directory => {
    const members = [];
    const walk = relative => { for (const item of fs.readdirSync(path.join(checkout, relative), { withFileTypes: true })) {
      const name = `${relative}/${item.name}`; if (item.isDirectory()) walk(name); else { assert(item.isFile()); const b = read(path.join(checkout, name)); members.push({ path: name, type: "file", bytes: b.length, sha256: sha(b) }); }
    } }; walk(directory); members.sort((a, b) => a.path < b.path ? -1 : 1);
    return { members, bytes: members.reduce((n, x) => n + x.bytes, 0), aggregate_sha256: sha(canonical(members)) };
  };
  const buildReceipt = { schema: "void_nimo_build_admission_v1", generation, source: { head: profileHead, tree: profileTree, members: sourceMembers, aggregate_sha256: sha(canonical(sourceMembers)) },
    runtime: runtimeBinding, build_recipe: "tsc -p tsconfig.build.json && node scripts/copy_void_runtime_js_v1.mjs && node scripts/retire_saveblock_periodic_rewriters_v1.mjs",
    dependencies: inventory("node_modules"), dist: inventory("dist"), actual_void_node_started: false, public_onboarding_accepted: false };
  const buildBytes = canonical(buildReceipt) + "\n"; fs.writeFileSync(path.join(checkout, ".runtime/nimo-build-admission-v1.json"), buildBytes);
  const plan = { schema: "void_nimo_fresh_sync_plan_v1", head: profileHead, tree: profileTree, runtime_sha256: runtimeBinding.sha256,
    runtime: runtimeBinding,
    build_receipt_sha256: sha(buildBytes), manifest_sha256: sha(rawManifest), data_root: data,
    environment: { ...env, VOID_READY_REQUIRE_TXROOT_LIVE: "1" } };
  const planBytes = canonical(plan) + "\n"; fs.writeFileSync(path.join(checkout, ".runtime/nimo-fresh-sync-plan-v1.json"), planBytes);
  const sessionDir = path.join(checkout, ".runtime/nimo-fresh-sync-session-v1");
  if (!predecessor && index === 6) { fs.mkdirSync(sessionDir); fs.writeFileSync(path.join(sessionDir, "record.json"), canonical({ stale: true }) + "\n"); }
  const parentEnv = { ...env, VOID_PUBLIC_SEED_CLIENT_PEERS: peers, VOID_NIMO_NODE_PROCESS_OBSERVATION_V1: "1", DATA_DIR: data, VOID_DATA_DIR: data };
  if (!predecessor) parentEnv.VOID_NIMO_FRESH_SYNC_PLAN_SHA256_V1 = sha(planBytes);
  if (predecessor && index === 2) parentEnv.VOID_MAIN_BASE = "https://manual.example";
  const launchParent = () => launch(checkout, "scripts/fixtures/nimo-fresh-sync-v1/parent.mjs", [scenario], parentEnv, ["--no-warnings", "--experimental-vm-modules"]);
  const parent = launchParent(); let child, atPreflight = null, atEntry = null, record = null, terminal = null, recovery = null;
  const checkpoint = await wait(() => parent.messages.find(x => x.fixture === (predecessor ? "entry" : "preflight")) || parent.exit);
  if (!parent.exit) {
    child = parent.messages.find(x => x.fixture === "child").pid;
    atPreflight = { parent: census(parent.child.pid), child: census(child), data: dataIdentity() };
    // This child receives only the fixture's explicitly constructed environment.
    // No operator or unrelated process environment is accessed.
    const raw = read(`/proc/${child}/environ`, 32768).toString().split("\0").filter(Boolean);
    const transportKeys = ["NODE_CHANNEL_FD", "NODE_CHANNEL_SERIALIZATION_MODE"];
    const configuration = raw.filter(x => !transportKeys.includes(x.slice(0, x.indexOf("=")))).map(x => { const n = x.indexOf("="); return { key: x.slice(0, n), sha256: sha(`void-nimo-effective-env-v1\0${x.slice(0, n)}\0${x.slice(n + 1)}`) }; }).sort((a,b) => a.key < b.key ? -1 : 1);
    atPreflight.configuration = { schema: "closed_environment_v1", absent_keys: "all-unlisted", members: configuration, sha256: sha(canonical(configuration)) };
    if (!predecessor && index === 4) fs.appendFileSync(path.join(checkout, "dist/index.js"), "// changed after preflight\n");
    if (!predecessor && index === 5) fs.appendFileSync(path.join(checkout, "public/bootstrap/v1.json"), "\n");
    if (!predecessor && index === 8) { fs.renameSync(data, data + "-retained"); fs.mkdirSync(data); }
    if (!predecessor && index === 7) { process.kill(child, "SIGKILL"); await wait(() => !census(child).alive, 64);
      const replacement = launch(checkout, "dist/index.js", [], { ...env, DATA_DIR: data });
      await wait(() => replacement.messages.some(x => x.fixture === "entry")); replacement.child.send("fixture-start");
      await wait(() => replacement.messages.some(x => x.fixture === "serving")); recovery = { replacement: census(replacement.child.pid), old_child: census(child) };
    } else if (!predecessor) parent.child.send("admit");
    await wait(() => parent.messages.some(x => x.fixture === "entry") || parent.exit);
    if (!parent.exit) {
      atEntry = { child: census(child), data: dataIdentity() };
      if (fs.existsSync(path.join(sessionDir, "record.json"))) record = JSON.parse(read(path.join(sessionDir, "record.json")));
      parent.child.send("start");
      await wait(() => parent.stdout.includes(predecessor ? "VOID_NIMO_NODE_PROCESS_OBSERVATIONS_V1_GREEN" : "VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN") || parent.messages.some(x => x.fixture === "target-before-terminal") || parent.exit);
      if (!predecessor && index === 9) {
        assert(parent.messages.some(x => x.fixture === "target-before-terminal")); parent.child.kill("SIGKILL");
        const retired = await wait(() => !census(child).alive, 64); const second = launchParent();
        const held = await wait(() => second.exit, 64); assert(!second.stdout.includes("VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN"));
        recovery = { parent_exit: (await wait(() => parent.exit)).result, child_after: census(child), retirement_ticks: retired.tick,
          restart_ticks: held.tick, restart_exit: second.exit, reused_record: true, terminal_replayed: false };
      }
    }
  }
  const reports = parent.stdout.split("\n").flatMap(s => { try { return [JSON.parse(s)]; } catch { return []; } });
  terminal = reports.find(r => r.marker === "VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN") || null;
  const observation = reports.find(r => r.marker === "VOID_NIMO_NODE_PROCESS_OBSERVATIONS_V1_GREEN") || terminal?.observation || null;
  let postSync = null;
  if (predecessor) { assert(observation); postSync = await checker("--post-sync"); }
  else if (index === 0) {
    assert(terminal && record); assert.deepEqual(record.configuration, atPreflight.configuration);
    assert.deepEqual(record.data, initial.data); assert.equal(record.starting_entries, 0); assert.equal(initial.entries.length, 0);
    assert(terminal.observed_heads.every(x => x === target)); assert.equal(record.child.pid, child);
    assert(atPreflight.parent.directories.some(x => x.dev === initial.data.dev && x.ino === initial.data.ino));
  } else { assert.equal(terminal, null); assert(parent.exit || index === 9, parent.stderr); }
  await cleanup();
  const result = { schema: "void_nimo_fresh_sync_schedule_v1", scenario, major, generation, source, profile_source: profileSource, runtime: runtimeBinding,
    initial, preflight, at_preflight: atPreflight, at_entry: atEntry, record, terminal, observation, post_sync: postSync, recovery,
    fixture_build_receipt_sha256: sha(buildBytes), plan_sha256: sha(planBytes), manifest_sha256: sha(rawManifest), target,
    final_inputs: { data: dataIdentity(), entry_sha256: sha(read(path.join(checkout, "dist/index.js"))),
      original_entry_sha256: buildReceipt.dist.members[0].sha256, manifest_sha256: sha(read(path.join(checkout, "public/bootstrap/v1.json"))),
      terminal_file_exists: fs.existsSync(path.join(sessionDir, "terminal.json")) },
    oracle: { pid: process.pid, interval_ms: 100, recovery_limit_ticks: 64 },
    result: predecessor ? "PREDECESSOR_UNBOUND_GREEN_REPRODUCED" : index === 0 ? "FRESH_SESSION_BOUND" : "HOLD",
    synthetic_node_and_build_inventory: true, cleanup_completed: true, actual_void_node_started: false, public_onboarding_accepted: false };
  fs.mkdirSync(output, { recursive: true }); const bytes = canonical(result) + "\n", name = `node-${major}-${scenario}.json`;
  fs.writeFileSync(path.join(output, name), bytes, { flag: "wx", mode: 0o600 });
  console.log(canonical({ marker: "VOID_NIMO_FRESH_SYNC_SCHEDULE_V1_GREEN", scenario, major, generation, head,
    receipt: name, receipt_sha256: sha(bytes), receipt_bytes: Buffer.byteLength(bytes), result: result.result, actual_void_node_started: false }));
} finally {
  await cleanup();
  if (worktree) git("worktree", "remove", "--force", checkout);
  fs.rmSync(dir, { recursive: true, force: true });
}
