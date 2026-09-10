#!/usr/bin/env node
// External controller: no node, adapter, observer or checker validation imports.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { boundedRead, canonical, processCensus, sha256, SOURCE_PATHS, PROFILE_PATHS, PREDECESSOR }
  from "./lib/void_nimo_supervisor_loss_census_v1.mjs";

const ROOT = process.cwd(), BASE = "scripts/fixtures/nimo-supervisor-loss-v1/";
const args = process.argv.slice(2); assert.equal(args.length, 8);
assert.deepEqual([args[0], args[2], args[4], args[6]], ["--profile", "--cut", "--generation", "--directory"]);
const profile = args[1], cut = Number(args[3]), generation = args[5], output = path.resolve(args[7]);
assert(["predecessor", "successor"].includes(profile)); assert(Number.isInteger(cut) && cut >= 1 && cut <= 6);
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation)); assert.equal(process.execArgv.length, 0);
assert.equal(boundedRead("/proc/self/stat", 4096).toString().split(" ")[0], String(process.pid), "matching procfs PID namespace required");
const major = Number(process.versions.node.split(".")[0]); assert([22, 24, 26].includes(major));
function git(...argv) {
  const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...argv], { cwd: ROOT, timeout: 20000, maxBuffer: 2 * 1024 * 1024,
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" } });
  assert.equal(r.status, 0, `controller Git operation failed: ${argv[0]}`); return r.stdout;
}
function runtimeIdentity() {
  const executable = fs.realpathSync(process.execPath), fd = fs.openSync(executable, "r");
  try {
    const stat = fs.fstatSync(fd); assert(stat.isFile() && stat.size <= 256 * 1024 * 1024);
    const buffer = Buffer.alloc(65536), hash = crypto.createHash("sha256"); let size = 0;
    for (let n = 0; n <= 4096; n++) { const count = fs.readSync(fd, buffer, 0, buffer.length, null); if (!count) break; size += count; hash.update(buffer.subarray(0, count)); }
    assert.equal(size, stat.size);
    return { executable, version: process.version, sha256: hash.digest("hex"), bytes: size, dev: stat.dev, ino: stat.ino };
  } finally { fs.closeSync(fd); }
}
const head = git("rev-parse", "HEAD").toString().trim(), tree = git("rev-parse", "HEAD^{tree}").toString().trim();
const sources = SOURCE_PATHS.map(file => {
  const bytes = boundedRead(file, 2 * 1024 * 1024); assert(bytes.equals(git("show", `HEAD:${file}`)));
  return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
});
const runtime = runtimeIdentity(), profileHead = profile === "predecessor" ? PREDECESSOR : head;
const copiedPaths = [...PROFILE_PATHS]; if (profile === "successor") copiedPaths.push("scripts/run_void_public_bootstrap_child_v1.mjs");
const profileSource = { head: profileHead, tree: git("rev-parse", `${profileHead}^{tree}`).toString().trim(), members: [] };
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "void-supervisor-loss-")), checkout = path.join(directory, "checkout"), custody = path.join(directory, "custody");
fs.mkdirSync(custody);
let worktree = false; const live = [];
const delay = () => new Promise(resolve => setTimeout(resolve, 100));
async function waitFor(test, label, allowTimeout = false) {
  for (let tick = 0; tick < 64; tick++) { if (test()) return tick; await delay(); }
  if (allowTimeout) return 64;
  assert.fail(`${label}: 64 controller ticks exceeded`);
}
const census = processCensus;
const listenerPorts = item => (item.sockets || []).filter(s => s.state === "0A").map(s => Number.parseInt(s.local.split(":")[1], 16)).sort((a, b) => a - b);
function dataIdentity() {
  return Object.fromEntries(["live", "live/journal"].map(name => { const s = fs.statSync(path.join(custody, name)); return [name, { dev: s.dev, ino: s.ino }]; }));
}
function ownsData(child, data) {
  return Object.entries(data).every(([name, item]) => child.descriptors.some(d => d.dev === item.dev && d.ino === item.ino &&
    (name === "live" ? d.kind === "directory" : d.kind === "file" && (Number.parseInt(d.flags, 8) & 3) !== 0)));
}
function startParent(label, selectedCut) {
  const nonce = `${label}-${crypto.randomBytes(16).toString("hex")}`;
  const parent = spawn(runtime.executable, [path.join(ROOT, BASE, "parent.mjs")], { cwd: checkout,
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C", TZ: "UTC", HTTP_PORT: "4100",
      VOID_PUBLIC_SEED_CLIENT_PEERS: "https://seed.example", VOID_PUBLIC_BOOTSTRAP_NODE_ENTRY: path.join(checkout, "fixture-node.mjs"),
      VOID_NIMO_NODE_PROCESS_OBSERVATION_V1: "1", VOID_LOSS_FIXTURE_CUT: String(selectedCut),
      VOID_LOSS_FIXTURE_GENERATION: nonce, VOID_LOSS_FIXTURE_DATA: custody }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  const state = { parent, nonce, childPid: null, childStart: null, phases: [], events: [], green: null, fault: null, exit: null,
    adapterPort: null, stdout: "", stderrBytes: 0, authority: null, secret: null, retired: false };
  live.push(state);
  parent.on("message", message => {
    try {
      assert(message && typeof message === "object" && state.events.length < 128);
      const type = message.fixture;
      assert(["child", "adapter", "authority-material", "phase", "armed", "entry-started", "acquired-data", "acquired-listeners"].includes(type));
      if (type === "authority-material") {
        assert(state.secret === null, "duplicate fixture authority"); assert(/^[0-9a-f]{64}$/.test(message.secret)); assert(/^[0-9a-f]{32}$/.test(message.authority));
        state.secret = message.secret; state.authority = message.authority;
      } else {
        state.events.push(type);
        if (type === "child") {
          assert.equal(state.childPid, null); state.childPid = message.pid;
          const child = census(message.pid); assert(child.alive && child.parent_pid === parent.pid); state.childStart = child.start_ticks;
        }
        if (type === "adapter") { assert.equal(state.adapterPort, null); state.adapterPort = message.port; }
        if (type === "phase") { assert.equal(message.phase, state.phases.length + 1); state.phases.push(message.phase); }
      }
    } catch (error) { state.fault = error.message; }
  });
  parent.stdout.on("data", bytes => {
    state.stdout += bytes.toString();
    if (Buffer.byteLength(state.stdout) > 128 * 1024) { state.fault = "parent stdout ceiling"; return; }
    for (const line of state.stdout.split("\n")) {
      if (!line.startsWith('{"marker":"VOID_NIMO_NODE_PROCESS_OBSERVATIONS_V1_GREEN"')) continue;
      try { state.green = JSON.parse(line); } catch { /* Retain partial line until the next bounded chunk. */ }
    }
  });
  parent.stderr.on("data", bytes => { state.stderrBytes += bytes.length; if (state.stderrBytes > 16384) state.fault = "parent stderr ceiling"; });
  parent.once("exit", (code, signal) => { state.exit = { code, signal }; });
  parent.once("error", error => { state.fault = error.message; });
  return state;
}
async function releaseEntry(state, existingData = null) {
  const ticks = await waitFor(() => { assert(!state.fault, state.fault); return state.events.includes("entry-started"); }, "entry barrier");
  const parent = census(state.parent.pid), child = census(state.childPid, state.childStart);
  assert(parent.alive && child.alive); assert.equal(parent.parent_pid, process.pid); assert.equal(child.parent_pid, parent.pid);
  assert.equal(parent.executable.path, runtime.executable); assert.equal(child.executable.path, runtime.executable);
  assert.deepEqual(parent.argv, [runtime.executable, path.join(ROOT, BASE, "parent.mjs")]);
  const nodeEntry = path.join(checkout, "fixture-node.mjs");
  assert.deepEqual(child.argv, profile === "successor" ? [runtime.executable, path.join(checkout, "scripts/run_void_public_bootstrap_child_v1.mjs"), nodeEntry] : [runtime.executable, nodeEntry]);
  assert.deepEqual(listenerPorts(child), []);
  if (existingData) assert(!ownsData(child, existingData));
  else assert(!fs.existsSync(path.join(custody, "live")), "data acquired before controller release");
  if (profile === "successor") assert(state.events.indexOf("armed") >= 0 && state.events.indexOf("armed") < state.events.indexOf("entry-started"));
  else assert(!state.events.includes("armed"));
  state.parent.send("release-child");
  return { ticks, parent, child, events: [...state.events] };
}
async function authorityProbe(state) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return new Promise(resolve => {
    let done = false;
    const finish = value => { if (!done) { done = true; clearTimeout(timer); request.destroy(); resolve(value); } };
    const request = http.get({ host: "127.0.0.1", port: 4100, path: `/fixture/challenge/${nonce}`, agent: false }, response => {
      let bytes = "";
      response.on("data", chunk => { bytes += chunk; if (bytes.length > 1024) finish("oversize"); });
      response.on("end", () => {
        try { const value = JSON.parse(bytes); finish(state.secret && value.generation === state.authority &&
          value.mac === crypto.createHmac("sha256", Buffer.from(state.secret, "hex")).update(nonce).digest("hex") ? "authenticated" : "no-authenticated-response"); }
        catch { finish("invalid-response"); }
      });
      response.on("error", () => finish("unreachable"));
    });
    request.on("error", () => finish("unreachable")); const timer = setTimeout(() => finish("unreachable"), 500);
  });
}
async function retire(state) {
  if (state.retired) return;
  if (!state.exit) state.parent.kill("SIGKILL");
  await waitFor(() => Boolean(state.exit), "parent cleanup");
  if (state.childPid && state.childStart) {
    const child = census(state.childPid, state.childStart);
    if (child.alive) {
      try { process.kill(state.childPid, "SIGKILL"); }
      catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    await waitFor(() => !census(state.childPid, state.childStart).alive, "owned child cleanup");
  }
  state.parent.stdout.destroy(); state.parent.stderr.destroy(); state.secret = null; state.retired = true;
}
try {
  git("worktree", "add", "--detach", "--no-checkout", checkout, profileHead); worktree = true;
  for (const file of copiedPaths) {
    const bytes = git("show", `${profileHead}:${file}`), target = path.join(checkout, file);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: "wx" });
    profileSource.members.push({ path: file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  fs.writeFileSync(path.join(checkout, "tools/void-public-seed-client-adapter-v1.mjs"), fs.readFileSync(`${BASE}adapter.mjs`), { flag: "wx" });
  fs.writeFileSync(path.join(checkout, "fixture-node.mjs"), fs.readFileSync(`${BASE}node.mjs`), { flag: "wx" });
  const g1 = startParent("g1", cut), entry1 = await releaseEntry(g1);
  const cutTicks = await waitFor(() => { assert(!g1.fault, g1.fault); return cut === 6 ? Boolean(g1.green) : g1.phases.includes(cut); }, "G1 recovery cut");
  const before = { parent: census(g1.parent.pid), child: census(g1.childPid, g1.childStart), data: dataIdentity() };
  assert.deepEqual(listenerPorts(before.child), [4100, 4700]); assert(ownsData(before.child, before.data));
  assert.deepEqual(listenerPorts(before.parent), [g1.adapterPort]);
  assert.equal(before.child.start_ticks, entry1.child.start_ticks);
  const authorityBefore = await authorityProbe(g1);
  assert.equal(authorityBefore, cut === 1 ? "no-authenticated-response" : "authenticated");
  g1.parent.kill("SIGKILL");
  let afterChild;
  const retirementTicks = await waitFor(() => { afterChild = census(g1.childPid, before.child.start_ticks); return Boolean(g1.exit) && !afterChild.alive; }, "G1 retirement", true);
  const after = { parent: census(g1.parent.pid, before.parent.start_ticks), child: afterChild, authority: await authorityProbe(g1) };
  assert.deepEqual(g1.exit, { code: null, signal: "SIGKILL" }); assert.equal(after.parent.alive, false);
  if (profile === "successor") {
    assert(retirementTicks < 64 && !after.child.alive); assert.equal(after.authority, "unreachable");
    // Retain disposable residue, and never adopt it. Archive only after census
    // proves its owner retired; fresh G2 must create different live inodes.
    fs.renameSync(path.join(custody, "live"), path.join(custody, "retired-g1"));
  } else {
    assert.equal(retirementTicks, 64); assert(after.child.alive); assert.deepEqual(listenerPorts(after.child), [4100, 4700]);
    assert(ownsData(after.child, before.data)); assert.equal(after.authority, "no-authenticated-response");
  }
  const g2 = startParent("g2", 0), entry2 = await releaseEntry(g2, profile === "predecessor" ? before.data : null);
  const terminalTicks = await waitFor(() => { assert(!g2.fault, g2.fault); return Boolean(g2.green || g2.exit); }, "G2 terminal");
  assert.notEqual(g2.nonce, g1.nonce); assert.notEqual(entry2.parent.pid, before.parent.pid); assert.notEqual(entry2.child.pid, before.child.pid);
  let terminal2;
  if (profile === "successor") {
    assert(g2.green && !g2.exit && terminalTicks + entry2.ticks < 64);
    terminal2 = { parent: census(g2.parent.pid), child: census(g2.childPid, g2.childStart), data: dataIdentity() };
    assert.deepEqual(listenerPorts(terminal2.child), [4100, 4700]); assert(ownsData(terminal2.child, terminal2.data));
    for (const name of ["live", "live/journal"]) assert.notDeepEqual(terminal2.data[name], before.data[name]);
    assert.notEqual(g2.authority, g1.authority);
    assert.equal(g2.green.node_process.pid, g2.childPid); assert.equal(g2.green.source.head, head);
    assert.equal(g2.green.transcript.length, 13); assert.equal(g2.green.public_onboarding_accepted, false);
  } else {
    assert(!g2.green && g2.exit); terminal2 = { exit: g2.exit, orphan: census(g1.childPid, before.child.start_ticks) }; assert(terminal2.orphan.alive);
  }
  const receipt = { schema: "void_nimo_supervisor_loss_schedule_v1", generation, major, profile, cut,
    source: { head, tree, members: sources }, profile_source: profileSource, runtime,
    controller: { pid: process.pid, census_owner: "external-controller", tick_ms: 100, tick_limit: 64 },
    g1: { generation: g1.nonce, authority_generation: g1.authority, entry: entry1, cut_ticks: cutTicks,
      cut_phases: [...g1.phases], authority_before: authorityBefore, before, parent_terminal: g1.exit,
      retirement_ticks: retirementTicks, after, historical_observation_sha256: g1.green ? sha256(canonical(g1.green)) : null, historical_receipt_admitted: false },
    g2: { generation: g2.nonce, authority_generation: g2.authority, entry: entry2, terminal_ticks: terminalTicks + entry2.ticks,
      terminal: terminal2, g1_after_fresh: census(g1.childPid, before.child.start_ticks), observation_sha256: g2.green ? sha256(canonical(g2.green)) : null,
      admitted: profile === "successor", mixed_membership: false },
    parent_generations: 2, child_generations: 2, orphan_reproduced: profile === "predecessor",
    actual_void_node_started: false, runtime_session_bound: false, public_onboarding_accepted: false,
    adapter_and_node_boundaries: "explicit-disposable-fixtures", cleanup_completed: false };
  await retire(g2); await retire(g1); receipt.cleanup_completed = true;
  assert.deepEqual(runtimeIdentity(), runtime);
  const bytes = Buffer.from(canonical(receipt) + "\n"); assert(bytes.length <= 256 * 1024);
  fs.mkdirSync(output, { recursive: true });
  const name = `node-${major}-${profile}-${cut}.json`, fd = fs.openSync(path.join(output, name), "wx", 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  console.log(canonical({ marker: "VOID_NIMO_SUPERVISOR_LOSS_SCHEDULE_V1_GREEN", generation, head, major, profile, cut,
    parent_generations: 2, child_generations: 2, orphan_reproduced: profile === "predecessor", retirement_ticks: retirementTicks,
    g2_terminal_ticks: receipt.g2.terminal_ticks, receipt: name, receipt_sha256: sha256(bytes), receipt_bytes: bytes.length,
    actual_void_node_started: false, public_onboarding_accepted: false }));
} finally {
  for (const state of live.reverse()) await retire(state);
  if (worktree) git("worktree", "remove", "--force", checkout);
  fs.rmSync(directory, { recursive: true, force: true });
}
