#!/usr/bin/env node
// Independent parent: imports no checker validators or fixture implementation.
// This is a disposable execution experiment, not a VOID node launcher.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CHILD = "scripts/fixtures/nimo-execution-session-v1/child.mjs";
const BASE = "http://127.0.0.1:4100";
const ROUTES = ["/health", "/__void/ready.json", "/blocks/latest/number2.json", "/p2p/peers"];
const SOURCES = ["tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs",
  "scripts/prove_void_nimo_no_tailnet_acceptance_v1.mjs", ".github/workflows/void-nimo-no-tailnet-acceptance-v1.yml",
  "docs/operations/void-nimo-no-tailnet-onboarding-v1.md", "scripts/prove_void_nimo_execution_session_v1.mjs",
  "scripts/verify_void_nimo_execution_session_v1.mjs", CHILD,
  "scripts/fixtures/nimo-execution-session-v1/forge.cjs", "scripts/fixtures/nimo-execution-session-v1/forge.mjs"];
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
function git(...args) {
  const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { timeout: 10_000, maxBuffer: 1024 * 1024 });
  assert.equal(r.status, 0, "source binding Git operation failed"); return r.stdout;
}
function binding() {
  const head = git("rev-parse", "HEAD").toString().trim();
  const tree = git("rev-parse", "HEAD^{tree}").toString().trim();
  const sources = SOURCES.map(name => {
    const bytes = fs.readFileSync(name); assert(bytes.length <= 1024 * 1024);
    assert(bytes.equals(git("show", `HEAD:${name}`)), `uncommitted source: ${name}`);
    return { path: name, sha256: sha(bytes), bytes: bytes.length };
  });
  return { head, tree, sources };
}
function boundedRead(name, limit) {
  const fd = fs.openSync(name, "r");
  try {
    const out = Buffer.alloc(limit + 1); let size = 0;
    for (let reads = 0; reads < 64; reads++) {
      const n = fs.readSync(fd, out, size, out.length - size, null);
      if (!n) return out.subarray(0, size);
      size += n; assert(size <= limit, "procfs input exceeded limit");
    }
    assert.fail("procfs read limit");
  } finally { fs.closeSync(fd); }
}
function executableIdentity() {
  const executable = fs.realpathSync(process.execPath), fd = fs.openSync(executable, "r");
  try {
    const stat = fs.fstatSync(fd); assert(stat.isFile() && stat.size > 0 && stat.size <= 256 * 1024 * 1024);
    const buffer = Buffer.alloc(64 * 1024), hash = crypto.createHash("sha256"); let size = 0;
    for (let reads = 0; reads <= 4096; reads++) {
      const n = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!n) break; size += n; hash.update(buffer.subarray(0, n));
    }
    const after = fs.fstatSync(fd);
    assert.equal(size, stat.size); assert.equal(after.size, stat.size); assert.equal(after.mtimeMs, stat.mtimeMs);
    return { executable, version: process.version, sha256: hash.digest("hex"), bytes: size, dev: stat.dev, ino: stat.ino };
  } finally { fs.closeSync(fd); }
}
function inspect(child) {
  const prefix = `/proc/${child.pid}`;
  const stat = boundedRead(`${prefix}/stat`, 4096).toString();
  const fields = stat.slice(stat.lastIndexOf(") ") + 2).trim().split(/\s+/);
  assert.equal(Number(fields[1]), process.pid, "child parent changed");
  const argv = boundedRead(`${prefix}/cmdline`, 16384).toString().split("\0").slice(0, -1);
  // This child received only the closed fixture environment below. No unrelated
  // process or inherited operator/credential environment is read.
  const environment = boundedRead(`${prefix}/environ`, 16384).toString().split("\0").filter(Boolean).sort();
  const executable = fs.realpathSync(`${prefix}/exe`), exeStat = fs.statSync(`${prefix}/exe`);
  return { pid: child.pid, parent_pid: process.pid, start_ticks: fields[19], argv, environment,
    cwd: fs.realpathSync(`${prefix}/cwd`), executable, executable_dev: exeStat.dev, executable_ino: exeStat.ino };
}
function fixture(head) {
  const target = 1951058 + crypto.randomInt(1000), now = Date.now(), peer = crypto.randomBytes(16).toString("hex");
  const manifest = { schema: "void_public_bootstrap_v1", network: "VOID Network", chain_id: 2050,
    status: "stable_https_seed", private_tailnet_endpoints_published: false, authority: { money_movement_authority: false },
    generated_at: new Date(now).toISOString(), expires_at: new Date(now + 60_000).toISOString(),
    sync_endpoints: [{ enabled: true, temporary: false, base: "https://seed.example", qualified_head: target }] };
  manifest.manifest_id = `voidpbm1_${sha(canonical(manifest))}`;
  const bodies = Object.fromEntries(ROUTES.map((route, i) => [route, canonical([
    { ok: true }, { ready: true, gap: 0, txroot_live: 1, reasons: [], head: target }, { number: target },
    { ok: true, connected: [{ id: peer, addr: "peer.example:4700", listens: [], outbound: true }],
      verifiedPeers: [{ node_id: peer, addresses: ["peer.example:4700"], last_authenticated_at_ms: now }] },
  ][i])]));
  return { type: "release", head, manifest: canonical(manifest), bodies };
}
function expectedOutput(packet) {
  const m = JSON.parse(packet.manifest), target = m.sync_endpoints[0].qualified_head;
  return ["=== VOID NIMO NO-TAILNET POST-SYNC V1 ===", `local_http_base=${BASE}`, "local_http_process_bound=false",
    `source_head=${packet.head}`, "tailscale_binary_present=false", "tailnet_address_present=false", "public_sync_endpoint_count=1",
    `bootstrap_manifest_id=${m.manifest_id}`, `bootstrap_manifest_sha256=${sha(packet.manifest)}`, `qualified_target_head=${target}`,
    "target_observation_count=3", "target_observation_interval_ms=1000", `observed_heads=[${target},${target},${target}]`,
    `head=${target}`, "gap=0", "txroot_live=1", "connected_peer_count=1", "verified_peer_count=1", "verified_connected_peer_count=1",
    "tailnet_required=false", "private_configuration_required=false", "runtime_session_bound=false", "fresh_join_proven=false",
    "public_onboarding_accepted=false", "VOID_NIMO_NO_TAILNET_TARGET_OBSERVATIONS_V1_GREEN", ""].join("\n");
}
async function execute(kind, attack, cut, source, runtime) {
  const canonicalArgs = ["--no-warnings", "--experimental-vm-modules", path.join(ROOT, CHILD)];
  const canonicalEnv = { LANG: "C", LC_ALL: "C", TZ: "UTC" };
  const args = [...canonicalArgs], env = { ...canonicalEnv };
  if (attack !== "none") {
    const flag = attack.endsWith("require") ? "--require" : "--import";
    const preload = path.join(ROOT, `scripts/fixtures/nimo-execution-session-v1/forge.${flag === "--require" ? "cjs" : "mjs"}`);
    if (attack.startsWith("env-")) env.NODE_OPTIONS = `${flag}=${preload}`;
    else args.unshift(flag, preload);
  }
  const packet = fixture(source.head), transcript = [], sockets = new Set();
  let child, identity, allowed = false, ready = false, connections = 0, ticks = 0, fault;
  let stdout = "", stderr = "";
  const fail = error => { fault ||= String(error?.message || error); child?.kill("SIGKILL"); for (const s of sockets) s.destroy(); };
  const server = net.createServer(socket => {
    sockets.add(socket); socket.once("close", () => sockets.delete(socket));
    connections += 1; let data = Buffer.alloc(0), reads = 0, finished = false;
    if (!allowed || connections > 12) { fail("unadmitted or excess connection"); socket.destroy(); return; }
    socket.on("error", error => { if (!cut && !fault) fail(error); });
    socket.on("data", chunk => {
      try {
        assert(!finished && ++reads <= 16 && data.length + chunk.length <= 8192, "request framing bound");
        data = Buffer.concat([data, chunk]); const end = data.indexOf("\r\n\r\n"); if (end < 0) return;
        assert.equal(end + 4, data.length, "request body/pipelining forbidden"); finished = true;
        const raw = data.toString("utf8"), lines = raw.split("\r\n"), index = transcript.length;
        assert(index < 12); const route = ROUTES[index % 4];
        assert.equal(lines[0], `GET ${route} HTTP/1.1`);
        assert(lines.some(s => s.toLowerCase() === "host: 127.0.0.1:4100"));
        assert(!lines.some(s => /^(content-length|transfer-encoding):/i.test(s)), "GET framing forbidden");
        assert.deepEqual(inspect(child), identity, "child execution identity changed");
        const body = packet.bodies[route];
        const wire = `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`;
        transcript.push({ request: raw, response: cut === index + 1 ? null : wire });
        if (cut === index + 1) { child.kill("SIGKILL"); socket.destroy(); }
        else socket.end(wire);
      } catch (error) { fail(error); }
    });
  });
  server.on("error", fail);
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen({ host: "127.0.0.1", port: 4100, exclusive: true }, resolve); });
  let timer;
  try {
    child = spawn(runtime.executable, args, { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    const closed = new Promise((resolve, reject) => {
      child.once("error", reject); child.once("close", (code, signal) => resolve({ code, signal }));
    });
    for (const [stream, field] of [[child.stdout, "stdout"], [child.stderr, "stderr"]]) stream.on("data", chunk => {
      if (Buffer.byteLength(field === "stdout" ? stdout : stderr) + chunk.length > 8192) { fail("child output ceiling"); return; }
      if (field === "stdout") stdout += chunk.toString(); else stderr += chunk.toString();
    });
    child.on("message", message => {
      try {
        assert(!ready && canonical(message) === '{"type":"ready"}', "unexpected child message"); ready = true;
        identity = inspect(child);
        assert.equal(identity.cwd, ROOT);
        assert.equal(identity.executable, runtime.executable); assert.equal(identity.executable_dev, runtime.dev); assert.equal(identity.executable_ino, runtime.ino);
        const expectedEnv = [...Object.entries(canonicalEnv).map(([k, v]) => `${k}=${v}`), "NODE_CHANNEL_FD=3", "NODE_CHANNEL_SERIALIZATION_MODE=json"].sort();
        const envelopeMatches = canonical(identity.argv) === canonical([runtime.executable, ...canonicalArgs]) &&
          canonical(identity.environment) === canonical(expectedEnv);
        if (kind === "red") { assert(!envelopeMatches); allowed = true; }
        else allowed = envelopeMatches;
        child.send(allowed ? packet : { type: "refuse" }, error => { if (error) fail(error); });
      } catch (error) { fail(error); }
    });
    timer = setInterval(() => { if (++ticks >= 64) fail("64 supervisor ticks exceeded"); }, 100);
    const terminal = await closed;
    assert(!fault, fault); assert(ready && ticks < 64); assert.equal(stderr, "", "unexpected child stderr");
    const forged = attack !== "none" ? `VOID_NIMO_FORGED_RESULTS=${kind === "red" ? 12 : 0}\n` : "";
    if (kind === "red") {
      assert.equal(stdout, expectedOutput(packet) + forged); assert.equal(terminal.code, 0); assert.equal(connections, 0); assert.equal(transcript.length, 0);
    } else if (attack !== "none") {
      assert.equal(stdout, "VOID_NIMO_EXECUTION_ENVELOPE_HOLD\n" + forged); assert.equal(terminal.code, 2); assert.equal(connections, 0); assert.equal(transcript.length, 0);
    } else if (cut) {
      assert.equal(stdout, ""); assert.equal(terminal.signal, "SIGKILL"); assert.equal(transcript.length, cut); assert.equal(connections, cut);
    } else {
      assert.equal(stdout, expectedOutput(packet)); assert.equal(terminal.code, 0); assert.equal(transcript.length, 12); assert.equal(connections, 12);
    }
    return { kind, attack, cut, identity, ticks, terminal, stdout, packet, transcript, connections,
      admitted: kind !== "red" && attack === "none" && !cut };
  } finally {
    clearInterval(timer); if (child?.exitCode === null && child?.signalCode === null) child.kill("SIGKILL");
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  }
}

assert.equal(process.platform, "linux", "Linux procfs is required");
assert.equal(boundedRead("/proc/self/stat", 4096).toString().split(" ")[0], String(process.pid),
  "procfs must expose the same PID namespace as the supervisor");
assert.equal(process.argv.length, 4, "usage: node proof.mjs RECEIPT_DIRECTORY GENERATION");
const output = path.resolve(process.argv[2]), generation = process.argv[3];
assert(/^[A-Za-z0-9-]{1,80}$/.test(generation));
assert(!process.execArgv.length, "parent requires plain Node startup");
for (const key of ["NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH"]) assert(!Object.hasOwn(process.env, key), `parent ${key} unsupported`);
const source = binding(), runtime = executableIdentity(), major = Number(process.versions.node.split(".")[0]);
assert([22, 24, 26].includes(major));
const attacks = ["env-require", "env-import", "argv-require", "argv-import"], cases = [];
for (const attack of attacks) cases.push(await execute("red", attack, 0, source, runtime));
cases.push(await execute("nominal", "none", 0, source, runtime));
for (const attack of attacks) cases.push(await execute("admission", attack, 0, source, runtime));
for (const cut of [1, 4, 8, 11]) {
  cases.push(await execute("killed", "none", cut, source, runtime));
  cases.push(await execute("fresh", "none", 0, source, runtime));
}
assert.deepEqual(binding(), source, "source changed during experiment");
assert.deepEqual(executableIdentity(), runtime, "runtime changed during experiment");
assert.equal(cases.length, 17); assert.equal(cases.reduce((n, c) => n + c.transcript.length, 0), 84);
const receipt = { schema: "void_nimo_execution_session_v1", generation, major, source, runtime, execution_root: ROOT, cases,
  checker_children: 17, loopback_requests: 84, forged_results: 48, void_node_started: false,
  runtime_configuration_bound: false, public_onboarding_accepted: false };
const bytes = Buffer.from(canonical(receipt) + "\n"); assert(bytes.length <= 256 * 1024);
fs.mkdirSync(output, { recursive: true });
const filename = path.join(output, `node-${major}.json`), fd = fs.openSync(filename, "wx", 0o600);
try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
console.log(canonical({ marker: "VOID_NIMO_EXECUTION_SESSION_V1_GREEN", head: source.head, tree: source.tree,
  generation, major, node: runtime.version, runtime_sha256: runtime.sha256, checker_children: 17,
  loopback_requests: 84, forged_results: 48, killed_children: 4, fresh_reconstructions: 4,
  receipt: path.basename(filename), receipt_sha256: sha(bytes), receipt_bytes: bytes.length,
  void_node_started: false, runtime_configuration_bound: false, public_onboarding_accepted: false }));
