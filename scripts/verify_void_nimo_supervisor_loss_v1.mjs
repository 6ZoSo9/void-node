#!/usr/bin/env node
// Byte-first structural verifier. Workflow/controller custody remains required;
// hashes and parsed JSON are not self-authenticating execution evidence.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { artifactRead, boundedRead, canonical, sha256, SOURCE_PATHS, PROFILE_PATHS, PREDECESSOR }
  from "./lib/void_nimo_supervisor_loss_census_v1.mjs";
const [directory, generation, majorText, output] = process.argv.slice(2);
assert.equal(process.argv.length, 6); assert.equal(process.execArgv.length, 0);
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation)); const major = Number(majorText); assert([22, 24, 26].includes(major));
assert.equal(Number(process.versions.node.split(".")[0]), major);
function git(...args) {
  const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { timeout: 20000, maxBuffer: 2 * 1024 * 1024,
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" } });
  assert.equal(r.status, 0); return r.stdout;
}
const head = git("rev-parse", "HEAD").toString().trim(), tree = git("rev-parse", "HEAD^{tree}").toString().trim();
const members = SOURCE_PATHS.map(file => {
  const bytes = boundedRead(file, 2 * 1024 * 1024); assert(bytes.equals(git("show", `HEAD:${file}`)));
  return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
});
const expectedSource = { head, tree, members };
const profileSources = Object.fromEntries(["predecessor", "successor"].map(profile => {
  const sha = profile === "predecessor" ? PREDECESSOR : head;
  const paths = [...PROFILE_PATHS]; if (profile === "successor") paths.push("scripts/run_void_public_bootstrap_child_v1.mjs");
  return [profile, { head: sha, tree: git("rev-parse", `${sha}^{tree}`).toString().trim(), members: paths.map(file => {
    const bytes = git("show", `${sha}:${file}`); return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
  }) }];
}));
const executable = fs.realpathSync(process.execPath), stat = fs.statSync(executable);
const runtime = { executable, version: process.version, sha256: sha256(boundedRead(executable, 256 * 1024 * 1024)), bytes: stat.size, dev: stat.dev, ino: stat.ino };
const names = ["predecessor", "successor"].flatMap(profile => Array.from({ length: 6 }, (_, i) => `node-${major}-${profile}-${i + 1}.json`));
assert.deepEqual(fs.readdirSync(directory).sort(), [...names].sort(), "exact twelve-file membership required");
assert(!path.resolve(output).startsWith(path.resolve(directory) + path.sep), "aggregate must be outside input directory");
const artifacts = names.map(name => ({ name, ...artifactRead(path.join(directory, name)) }));
const digest = value => assert(typeof value === "string" && /^[0-9a-f]{64}$/.test(value));
const tick = value => assert(Number.isInteger(value) && value >= 0 && value < 64);
const ports = item => item.sockets.filter(s => s.state === "0A").map(s => Number.parseInt(s.local.split(":")[1], 16)).sort((a, b) => a - b);
const identity = item => `${item.pid}:${item.start_ticks}`;
function alive(item, parentPid = null) {
  assert.equal(item.alive, true); assert(Number.isInteger(item.pid) && item.pid > 0); assert(/^[0-9]+$/.test(item.start_ticks));
  assert(!["Z", "X"].includes(item.state)); if (parentPid !== null) assert.equal(item.parent_pid, parentPid);
  assert.deepEqual(item.executable, { path: runtime.executable, dev: runtime.dev, ino: runtime.ino });
  assert(Array.isArray(item.descriptors) && item.descriptors.length <= 4096); assert(Array.isArray(item.sockets) && item.sockets.length <= 4096);
  assert.equal(new Set(item.descriptors.map(d => d.fd)).size, item.descriptors.length);
  for (const s of item.sockets) assert(item.descriptors.some(d => d.kind === "socket" && String(d.ino) === s.inode));
}
function dead(item, original) {
  assert.equal(item.pid, original.pid); assert.equal(item.alive, false);
  assert(item.absent === true || item.zombie === true || item.replaced === true);
  assert.equal(item.sockets, undefined); assert.equal(item.descriptors, undefined);
  if (item.zombie) assert.equal(item.start_ticks, original.start_ticks);
}
function dataHandles(child, data) {
  assert.deepEqual(Object.keys(data).sort(), ["live", "live/journal"]);
  for (const [name, id] of Object.entries(data)) {
    assert(Number.isSafeInteger(id.dev) && Number.isSafeInteger(id.ino));
    assert(child.descriptors.some(d => d.dev === id.dev && d.ino === id.ino &&
      (name === "live" ? d.kind === "directory" : d.kind === "file" && (Number.parseInt(d.flags, 8) & 3) !== 0)));
  }
}
function validate(values) {
  assert.equal(values.length, 12);
  const generations = new Set(), processes = new Set(), authorities = new Set();
  for (let i = 0; i < 12; i++) {
    const r = values[i], successor = i >= 6, profile = successor ? "successor" : "predecessor", cut = i % 6 + 1;
    assert.equal(r.schema, "void_nimo_supervisor_loss_schedule_v1"); assert.equal(r.generation, generation);
    assert.equal(r.major, major); assert.equal(r.profile, profile); assert.equal(r.cut, cut);
    assert.deepEqual(r.source, expectedSource); assert.deepEqual(r.profile_source, profileSources[profile]); assert.deepEqual(r.runtime, runtime);
    assert.equal(r.controller.census_owner, "external-controller"); assert.equal(r.controller.tick_limit, 64); assert.equal(r.controller.tick_ms, 100);
    assert.equal(r.parent_generations, 2); assert.equal(r.child_generations, 2); assert.equal(r.orphan_reproduced, !successor);
    assert.equal(r.adapter_and_node_boundaries, "explicit-disposable-fixtures"); assert.equal(r.cleanup_completed, true);
    for (const flag of ["actual_void_node_started", "runtime_session_bound", "public_onboarding_accepted"]) assert.equal(r[flag], false);
    for (const [label, g] of [["g1", r.g1], ["g2", r.g2]]) {
      assert(new RegExp(`^${label}-[0-9a-f]{32}$`).test(g.generation)); assert(!generations.has(g.generation)); generations.add(g.generation);
      const entry = g.entry; tick(entry.ticks); alive(entry.parent, r.controller.pid); alive(entry.child, entry.parent.pid);
      assert.deepEqual(ports(entry.child), []);
      assert(!entry.child.descriptors.some(d => Object.values(r.g1.before.data).some(id => id.dev === d.dev && id.ino === d.ino)));
      for (const p of [entry.parent, entry.child]) { assert(!processes.has(identity(p))); processes.add(identity(p)); }
      assert.equal(entry.parent.argv.length, 2); assert.equal(entry.parent.argv[0], runtime.executable);
      assert(entry.parent.argv[1].endsWith("/scripts/fixtures/nimo-supervisor-loss-v1/parent.mjs"));
      assert.equal(entry.child.argv.length, successor ? 3 : 2); assert.equal(entry.child.argv[0], runtime.executable);
      assert(entry.child.argv.at(-1).endsWith("/checkout/fixture-node.mjs"));
      if (successor) {
        assert.equal(entry.child.argv[1], path.join(path.dirname(entry.child.argv[2]), "scripts/run_void_public_bootstrap_child_v1.mjs"));
        assert(entry.events.indexOf("armed") >= 0 && entry.events.indexOf("armed") < entry.events.indexOf("entry-started"));
      } else assert(!entry.events.includes("armed"));
      assert(!entry.events.includes("acquired-data") && !entry.events.includes("acquired-listeners"));
      if (g.authority_generation !== null) {
        assert(/^[0-9a-f]{32}$/.test(g.authority_generation)); assert(!authorities.has(g.authority_generation)); authorities.add(g.authority_generation);
      } else assert(!successor && label === "g2");
    }
    const { g1, g2 } = r; tick(g1.cut_ticks); tick(g2.terminal_ticks);
    assert.deepEqual(g1.cut_phases, Array.from({ length: Math.min(cut, 5) }, (_, n) => n + 1));
    assert.equal(g1.authority_before, cut === 1 ? "no-authenticated-response" : "authenticated");
    alive(g1.before.parent, r.controller.pid); alive(g1.before.child, g1.before.parent.pid);
    assert.equal(identity(g1.before.parent), identity(g1.entry.parent)); assert.equal(identity(g1.before.child), identity(g1.entry.child));
    assert.deepEqual(ports(g1.before.child), [4100, 4700]); assert.equal(ports(g1.before.parent).length, 1); dataHandles(g1.before.child, g1.before.data);
    assert.deepEqual(g1.parent_terminal, { code: null, signal: "SIGKILL" }); dead(g1.after.parent, g1.before.parent);
    assert.equal(g1.historical_receipt_admitted, false); if (cut === 6) digest(g1.historical_observation_sha256); else assert.equal(g1.historical_observation_sha256, null);
    assert.equal(g2.mixed_membership, false); assert.equal(g2.admitted, successor);
    if (successor) {
      tick(g1.retirement_ticks); dead(g1.after.child, g1.before.child); dead(g2.g1_after_fresh, g1.before.child);
      assert.equal(g1.after.authority, "unreachable"); digest(g2.observation_sha256);
      assert.notEqual(g2.observation_sha256, g1.historical_observation_sha256);
      alive(g2.terminal.parent, r.controller.pid); alive(g2.terminal.child, g2.terminal.parent.pid);
      assert.equal(identity(g2.terminal.parent), identity(g2.entry.parent)); assert.equal(identity(g2.terminal.child), identity(g2.entry.child));
      assert.deepEqual(ports(g2.terminal.child), [4100, 4700]); dataHandles(g2.terminal.child, g2.terminal.data);
      for (const name of ["live", "live/journal"]) assert.notDeepEqual(g2.terminal.data[name], g1.before.data[name]);
      assert(!g2.terminal.child.sockets.some(s => g1.before.child.sockets.some(old => s.inode === old.inode)));
    } else {
      assert.equal(g1.retirement_ticks, 64); assert.equal(g1.after.authority, "no-authenticated-response");
      for (const orphan of [g1.after.child, g2.terminal.orphan, g2.g1_after_fresh]) {
        alive(orphan); assert.equal(identity(orphan), identity(g1.before.child)); assert.deepEqual(ports(orphan), [4100, 4700]); dataHandles(orphan, g1.before.data);
      }
      assert.deepEqual(g2.terminal.exit, { code: 73, signal: null }); assert.equal(g2.observation_sha256, null);
    }
  }
  assert.equal(generations.size, 24); assert.equal(processes.size, 48); assert.equal(authorities.size, 18);
}
const values = artifacts.map(a => a.value); validate(values);
const rejectionCases = [];
const reject = (name, mutate) => { const copy = JSON.parse(JSON.stringify(values)); mutate(copy); assert.throws(() => validate(copy), name); rejectionCases.push(name); };
reject("missing", x => x.pop()); reject("duplicate", x => { x[11] = x[10]; });
reject("reordered", x => { [x[6], x[7]] = [x[7], x[6]]; });
reject("stale-generation", x => { x[6].generation += "-old"; });
reject("repinned-predecessor", x => { x[0].profile_source.head = head; });
reject("source-byte-drift", x => { x[6].source.members[0].sha256 = "0".repeat(64); });
reject("cross-head", x => { x[6].source.head = PREDECESSOR; });
reject("cross-runtime", x => { x[6].major = major === 22 ? 24 : 22; });
reject("runtime-repin", x => { x[6].runtime.sha256 = "0".repeat(64); });
reject("partial", x => { delete x[6].g2.terminal; });
reject("orphan-survivor", x => { x[6].g1.after.child = x[6].g1.before.child; });
reject("orphan-after-fresh", x => { x[6].g2.g1_after_fresh = x[6].g1.before.child; });
reject("late-retirement", x => { x[6].g1.retirement_ticks = 64; });
reject("late-fresh", x => { x[6].g2.terminal_ticks = 64; });
reject("historical-receipt", x => { x[11].g1.historical_receipt_admitted = true; });
reject("receipt-adoption", x => { x[11].g2.observation_sha256 = x[11].g1.historical_observation_sha256; });
reject("authority-adoption", x => { x[6].g2.authority_generation = x[6].g1.authority_generation; });
reject("mixed-membership", x => { x[6].g2.mixed_membership = true; });
reject("data-adoption", x => { x[6].g2.terminal.data = x[6].g1.before.data; });
reject("missing-p2p", x => { x[6].g2.terminal.child.sockets = []; });
reject("unarmed-entry", x => { x[6].g1.entry.events = ["entry-started"]; });
reject("wrong-cut", x => { x[6].g1.cut_phases = [1, 2]; });
const result = { marker: "SUPERVISOR_LOSS_RECOVERY_GREEN", generation, head, tree, major, runtime,
  schedules: 12, predecessor_orphans: 6, successor_recoveries: 6, parent_generations: 24, child_generations: 24,
  top_level_harness_executions: 13, rejection_cases: rejectionCases,
  maximum_retirement_ticks: Math.max(...values.slice(6).map(v => v.g1.retirement_ticks)),
  maximum_fresh_ticks: Math.max(...values.slice(6).map(v => v.g2.terminal_ticks)),
  members: artifacts.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })),
  source: expectedSource, actual_void_node_started: false, runtime_session_bound: false, public_onboarding_accepted: false };
const bytes = Buffer.from(canonical(result) + "\n"), fd = fs.openSync(output, "wx", 0o600);
try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
console.log(canonical({ ...result, aggregate_sha256: sha256(bytes), aggregate_bytes: bytes.length }));
