#!/usr/bin/env node
// External fixture controller; no production validation imports.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
const ROOT = process.cwd(), [scenario, output, generation] = process.argv.slice(2);
assert.equal(process.argv.length, 5); assert(/^(predecessor|mutation-[1-4]|recovery-[1-4])$/.test(scenario));
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation));
const major = Number(process.versions.node.split(".")[0]); assert([22, 24, 26].includes(major));
const canonical = v => JSON.stringify(v, (_, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const env = { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C", TZ: "UTC" };
const git = (...args) => { const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd: ROOT, env, timeout: 60000, maxBuffer: 32 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr?.toString().slice(-2000)); return r.stdout; };
const head = git("rev-parse", "HEAD").toString().trim(), tree = git("rev-parse", "HEAD^{tree}").toString().trim();
const predecessor = "f6d1e41d5e85715a01ed805a0bcb1e75f25a2fa1";
const names = ["scripts/lib/void_nimo_executed_runtime_v1.mjs", "scripts/lib/void_nimo_build_admission_v1.mjs",
  "scripts/lib/void_nimo_fresh_sync_session_v1.mjs", "scripts/run_void_public_bootstrap_supervisor_v1.mjs",
  "scripts/run_void_public_bootstrap_child_v1.mjs", "scripts/lib/void_nimo_node_process_observation_v1.mjs",
  "tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs",
  "scripts/prove_void_nimo_executed_runtime_v1.mjs", "scripts/verify_void_nimo_executed_runtime_v1.mjs",
  "scripts/fixtures/nimo-executed-runtime-v1/parent.mjs", "scripts/fixtures/nimo-fresh-sync-v1/node.mjs",
  ".github/workflows/void-nimo-executed-runtime-v1.yml"];
const source = { head, tree, members: names.map(name => { const b = fs.readFileSync(name); assert(b.equals(git("show", `${head}:${name}`))); return { path: name, bytes: b.length, sha256: sha(b) }; }) };
function executable(file) {
  const fd = fs.openSync(file, "r"), s = fs.fstatSync(fd), buffer = Buffer.alloc(65536), h = crypto.createHash("sha256"); let used = 0;
  assert(s.isFile() && s.size > 0 && s.size <= 256 * 1024 * 1024);
  try { for (let i = 0; i <= 4096; i++) { const n = fs.readSync(fd, buffer, 0, buffer.length, null); if (!n) break; used += n; h.update(buffer.subarray(0, n)); } }
  finally { fs.closeSync(fd); }
  assert.equal(used, s.size); return { dev: s.dev, ino: s.ino, bytes: used, sha256: h.digest("hex"), version: process.version };
}
assert(fs.readFileSync("/proc/self/stat", "utf8").startsWith(`${process.pid} `), "matching procfs namespace required");
const controllerRuntime = executable("/proc/self/exe");
function census(pid, detail = true) {
  let raw; try { raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8"); } catch (e) { if (e.code === "ENOENT" || e.code === "ESRCH") return { pid, alive: false }; throw e; }
  assert(raw.length <= 4096); const f = raw.slice(raw.lastIndexOf(") ") + 2).split(/\s+/);
  if (["Z", "X"].includes(f[0])) return { pid, alive: false };
  const r = { pid, alive: true, parent_pid: Number(f[1]), start_ticks: f[19] };
  if (!detail) return r;
  try {
    r.runtime = executable(`/proc/${pid}/exe`); r.argv = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").filter(Boolean);
    r.retained_executables = [];
    for (const name of fs.readdirSync(`/proc/${pid}/fd`).slice(0, 256)) {
      try { const s = fs.statSync(`/proc/${pid}/fd/${name}`); if (s.isFile() && s.dev === r.runtime.dev && s.ino === r.runtime.ino) r.retained_executables.push(Number(name)); }
      catch (e) { if (e.code !== "ENOENT") throw e; }
    }
  } catch (e) { if (!["EACCES", "ENOENT", "ESRCH"].includes(e.code)) throw e; r.incomplete = true; }
  return r;
}
async function wait(test, limit = 1200) { for (let tick = 0; tick < limit; tick++) { const value = test(); if (value) return { value, tick }; await new Promise(resolve => setTimeout(resolve, 100)); } assert.fail("fixed runtime experiment deadline"); }
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "nimo-executed-runtime-")), worktrees = [], processes = [];
const json = file => { try { const b = fs.readFileSync(file); return b.length ? JSON.parse(b) : null; } catch (e) { if (e.code === "ENOENT") return null; throw e; } };
async function retire(p) {
  if (!p.exit) p.child.kill("SIGKILL"); await wait(() => p.exit, 64);
  const children = p.messages.filter(m => m.fixture === "child").map(m => m.pid);
  const result = await wait(() => children.every(pid => !census(pid, false).alive), 64);
  return { parent: census(p.child.pid, false), children: children.map(pid => census(pid, false)), retirement_ticks: result.tick };
}
function launch(profile, mode, cut) {
  const child = spawn(profile.exe, ["--no-warnings", "--experimental-vm-modules", "scripts/fixtures/nimo-executed-runtime-v1/parent.mjs", mode, String(cut)],
    { cwd: profile.checkout, env: profile.environment, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  const p = { child, messages: [], stdout: "", stderr: "", exit: null, entry: null };
  child.on("message", value => { p.messages.push(value); if (value.fixture === "entry") p.entry = { parent: census(child.pid), child: census(value.pid) }; });
  for (const name of ["stdout", "stderr"]) child[name].on("data", b => { p[name] += b; assert(p[name].length <= 1024 * 1024); });
  child.on("exit", (code, signal) => { p.exit = { code, signal }; }); processes.push(p); return p;
}
function profile(label, old = false, planB = false) {
  const base = path.join(temp, label); fs.mkdirSync(base); const checkout = path.join(base, "checkout");
  const h = old ? predecessor : head, t = git("rev-parse", `${h}^{tree}`).toString().trim();
  const rows = git("ls-tree", "-rz", "--full-tree", h).toString().split("\0").filter(Boolean);
  const sourceNames = rows.map(r => r.slice(r.indexOf("\t") + 1)).filter(n => n.startsWith("src/") || /\.(mjs|cjs|js)$/.test(n) ||
    ["package.json", "package-lock.json", "tsconfig.build.json", ".github/workflows/void-nimo-build-admission-v1.yml"].includes(n));
  git("worktree", "add", "--detach", "--no-checkout", checkout, h); worktrees.push(checkout);
  git("-C", checkout, "restore", "--source", h, "--staged", "--worktree", "--", ...sourceNames, "public/bootstrap/v1.json");
  const fixture = "scripts/fixtures/nimo-executed-runtime-v1/parent.mjs";
  if (old) { fs.mkdirSync(path.dirname(path.join(checkout, fixture)), { recursive: true }); fs.copyFileSync(path.join(ROOT, fixture), path.join(checkout, fixture)); }
  const exe = path.join(base, "node"), replacement = path.join(base, "node-b"), data = path.join(base, "data");
  fs.copyFileSync("/proc/self/exe", exe); fs.chmodSync(exe, 0o700);
  const a = executable(exe); assert.equal(a.sha256, controllerRuntime.sha256); let b = null;
  if (label === "affected") {
    fs.copyFileSync(exe, replacement); fs.appendFileSync(replacement, "\nVOID_EXECUTABLE_GENERATION_B_FIXTURE\n"); fs.chmodSync(replacement, 0o700);
    b = executable(replacement); assert.notEqual(a.sha256, b.sha256);
    const check = spawnSync(replacement, ["--version"], { env, timeout: 10000, maxBuffer: 1024 }); assert.equal(check.status, 0); assert.equal(check.stdout.toString().trim(), process.version);
  }
  fs.mkdirSync(data, { mode: 0o700 }); for (const d of [".runtime", "dist", "node_modules/fixture"]) fs.mkdirSync(path.join(checkout, d), { recursive: true });
  fs.copyFileSync(path.join(checkout, "scripts/fixtures/nimo-fresh-sync-v1/node.mjs"), path.join(checkout, "dist/index.js"));
  fs.writeFileSync(path.join(checkout, "node_modules/fixture/index.js"), "export const fixture = true;\n");
  const manifestBytes = fs.readFileSync(path.join(checkout, "public/bootstrap/v1.json")), manifest = JSON.parse(manifestBytes), target = Math.max(...manifest.sync_endpoints.map(x => x.qualified_head));
  fs.writeFileSync(path.join(checkout, ".runtime/fresh-fixture.json"), canonical({ generation, target }));
  const sourceMembers = sourceNames.map(n => { const bytes = fs.readFileSync(path.join(checkout, n)); return { path: n, bytes: bytes.length, sha256: sha(bytes) }; });
  const inventory = file => { const bytes = fs.readFileSync(path.join(checkout, file)), members = [{ path: file, type: "file", bytes: bytes.length, sha256: sha(bytes) }]; return { members, bytes: bytes.length, aggregate_sha256: sha(canonical(members)) }; };
  const runtime = planB ? b : a;
  const build = { schema: "void_nimo_build_admission_v1", generation, source: { head: h, tree: t, members: sourceMembers, aggregate_sha256: sha(canonical(sourceMembers)) }, runtime,
    build_recipe: "tsc -p tsconfig.build.json && node scripts/copy_void_runtime_js_v1.mjs && node scripts/retire_saveblock_periodic_rewriters_v1.mjs",
    dependencies: inventory("node_modules/fixture/index.js"), dist: inventory("dist/index.js"), actual_void_node_started: false, public_onboarding_accepted: false };
  const buildBytes = canonical(build) + "\n"; fs.writeFileSync(path.join(checkout, ".runtime/nimo-build-admission-v1.json"), buildBytes);
  const plan = { schema: "void_nimo_fresh_sync_plan_v1", head: h, tree: t, runtime, runtime_sha256: runtime.sha256,
    build_receipt_sha256: sha(buildBytes), manifest_sha256: sha(manifestBytes), data_root: data, environment: { ...env, VOID_READY_REQUIRE_TXROOT_LIVE: "1" } };
  const planBytes = canonical(plan) + "\n"; fs.writeFileSync(path.join(checkout, ".runtime/nimo-fresh-sync-plan-v1.json"), planBytes);
  const environment = { ...env, VOID_PUBLIC_SEED_CLIENT_PEERS: manifest.sync_endpoints.map(x => x.base).join(","), VOID_NIMO_NODE_PROCESS_OBSERVATION_V1: "1", VOID_NIMO_FRESH_SYNC_PLAN_SHA256_V1: sha(planBytes) };
  return { checkout, exe, replacement, a, b, plan, plan_sha256: sha(planBytes), build, environment, replacement_version_verified: b !== null };
}
function snapshot(p) {
  const child = p.messages.find(x => x.fixture === "child");
  return { parent: census(p.child.pid), child: child ? census(child.pid) : null };
}
function capture(profile, p) {
  const session = path.join(profile.checkout, ".runtime/nimo-fresh-sync-session-v1"), terminal = json(path.join(session, "terminal.json"));
  const report = p.stdout.split("\n").flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }).find(x => x.marker === "VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN") || null;
  if (terminal) assert.deepEqual(terminal, report);
  return { plan: profile.plan, plan_sha256: profile.plan_sha256, build_receipt: profile.build, entry: p.entry,
    record: json(path.join(session, "record.json")), terminal: report, exit: p.exit,
    stdout_sha256: sha(p.stdout), terminal_file_exists: fs.existsSync(path.join(session, "terminal.json")) };
}
try {
  const old = scenario === "predecessor", cut = old ? 1 : Number(scenario.split("-")[1]), recovering = scenario.startsWith("recovery");
  const first = profile("affected", old, !old && cut === 1), p = launch(first, old ? "predecessor" : "affected", cut);
  await wait(() => p.messages.some(x => x.fixture === "cut") || p.exit); assert(!p.exit, p.stderr);
  const before = snapshot(p);
  if (cut === 2) fs.unlinkSync(first.exe); else fs.renameSync(first.exe, first.exe + "-a-retained");
  fs.renameSync(first.replacement, first.exe);
  const atB = { ...snapshot(p), pathname: executable(first.exe) };
  if (cut === 4) { fs.renameSync(first.exe, first.replacement); fs.renameSync(first.exe + "-a-retained", first.exe); }
  const after = { ...snapshot(p), pathname: executable(first.exe) };
  let predecessorResult = null, fresh = null, reconstruction = null, retired;
  if (recovering) {
    retired = await retire(p);
    const started = performance.now(), next = profile("reconstructed"), prepared = performance.now();
    const second = launch(next, "fresh", 0);
    const terminal = await wait(() => second.stdout.includes('"marker":"VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN"') || second.exit, 64);
    assert(!second.exit, second.stderr); const completed = performance.now();
    const timing = { preparation_ms: prepared - started, startup_ms: completed - prepared, total_ms: completed - started };
    const ticks = Math.ceil(timing.total_ms / 100); assert(ticks < 64, "fresh reconstruction bound: " + canonical(timing));
    fresh = capture(next, second); assert(fresh.terminal); assert.notEqual(fresh.plan.data_root, first.plan.data_root);
    reconstruction = { ticks, timing, polling_ticks: terminal.tick, retirement: await retire(second), fresh_inputs_reacquired: true, old_session_adopted: false };
  } else {
    fs.writeFileSync(path.join(first.checkout, ".runtime/exe-cut-release"), "release", { flag: "wx" });
    await wait(() => p.exit, 64);
    if (old) { predecessorResult = p.messages.find(x => x.fixture === "predecessor-result").runtime; assert.equal(predecessorResult.sha256, first.b.sha256); assert.equal(before.parent.runtime.sha256, first.a.sha256); }
    else assert(!p.stdout.includes('"marker":"VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN"'), p.stderr);
    retired = await retire(p);
  }
  const affected = capture(first, p);
  assert.equal(affected.terminal, null);
  if (!old && cut <= 3) assert.equal(affected.entry, null);
  if (!old && cut <= 2) assert.equal(affected.record, null);
  const result = { schema: "void_nimo_executed_runtime_schedule_v1", head, tree, source, generation, major, scenario, cut, controller_runtime: controllerRuntime,
    binaries: { a: first.a, b: first.b, replacement_version_verified: first.replacement_version_verified }, before, at_b: atB, after,
    affected, predecessor_result: predecessorResult, retirement: retired, fresh, reconstruction,
    oracle: { interval_ms: 100, recovery_limit_ticks: 64 }, cleanup_completed: true,
    synthetic_node_and_build_inventory: true, actual_void_node_started: false, public_onboarding_accepted: false };
  fs.mkdirSync(output, { recursive: true }); const bytes = canonical(result) + "\n", name = `node-${major}-${scenario}.json`;
  assert(Buffer.byteLength(bytes) <= 4 * 1024 * 1024); fs.writeFileSync(path.join(output, name), bytes, { flag: "wx", mode: 0o600 });
  console.log(canonical({ marker: "VOID_NIMO_EXECUTED_RUNTIME_SCHEDULE_V1_GREEN", head, generation, major, scenario, receipt: name, receipt_sha256: sha(bytes), receipt_bytes: Buffer.byteLength(bytes) }));
} finally {
  for (const p of processes) await retire(p);
  for (const checkout of worktrees.reverse()) git("worktree", "remove", "--force", checkout);
  fs.rmSync(temp, { recursive: true, force: true });
}
