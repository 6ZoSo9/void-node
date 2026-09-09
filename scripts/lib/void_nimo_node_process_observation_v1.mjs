// Optional read-only diagnostic for the HTTPS supervisor's own direct child.
// Trusts this parent and the Linux kernel; never reads another process's environ.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { collectQualifiedTargetObservationsV1, validateBootstrapManifestNoTailnetV1 }
  from "../../tools/void-nimo-no-tailnet-acceptance-v1.mjs";

const OPTION = "VOID_NIMO_NODE_PROCESS_OBSERVATION_V1";
const ROUTES = ["/health", "/__void/ready.json", "/blocks/latest/number2.json", "/p2p/peers"];
const MAX_BODY = 2 * 1024 * 1024;
const SOURCE_PATHS = ["scripts/run_void_public_bootstrap_supervisor_v1.mjs",
  "scripts/run_void_public_bootstrap_child_v1.mjs",
  "scripts/lib/void_nimo_node_process_observation_v1.mjs", "tools/void-nimo-no-tailnet-acceptance-v1.mjs",
  "scripts/lib/void_public_seed_common_v1.mjs"];
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const equal = (a, b, message) => assert.equal(JSON.stringify(a), JSON.stringify(b), message);

function readBounded(file, ceiling) {
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(ceiling + 1); let used = 0;
    for (let reads = 0; reads < 64; reads++) {
      const n = fs.readSync(fd, buffer, used, buffer.length - used, null);
      if (!n) return buffer.subarray(0, used);
      used += n; assert(used <= ceiling, "observation input exceeds ceiling");
    }
    assert.fail("observation input exceeds read ceiling");
  } finally { fs.closeSync(fd); }
}

function fileIdentity(file, ceiling) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd);
    assert(before.isFile() && before.size > 0 && before.size <= ceiling, "bounded regular input required");
    const buffer = Buffer.alloc(65536), hash = crypto.createHash("sha256"); let used = 0;
    for (let reads = 0; reads <= ceiling / buffer.length + 1; reads++) {
      const n = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!n) break;
      used += n; assert(used <= ceiling); hash.update(buffer.subarray(0, n));
    }
    const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) assert.equal(before[key], after[key]);
    assert.equal(used, before.size);
    return { path: file, dev: before.dev, ino: before.ino, bytes: used, sha256: hash.digest("hex") };
  } finally { fs.closeSync(fd); }
}

function git(...args) {
  const result = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], {
    timeout: 10000, maxBuffer: 2 * 1024 * 1024,
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" },
  });
  assert.equal(result.status, 0, "observation source unavailable"); return result.stdout;
}

function launchConfiguration(environment, adapterBase) {
  // Select only public numeric settings. Do not enumerate or copy this environment.
  const result = { http_port: environment.HTTP_PORT ?? "4100", follower_origin: adapterBase,
    follower_singular_origin: adapterBase, adapter_active: "1" };
  assert.equal(result.http_port, "4100", "observation requires HTTP_PORT=4100");
  for (const key of ["VOID_FOLLOWER_AUTOSTART_INTERVAL_MS", "VOID_FOLLOWER_CATCHUP_INTERVAL_MS",
    "VOID_FOLLOWER_CATCHUP_PULL_LIMIT", "VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS"]) {
    const value = environment[key];
    assert(value === undefined || (typeof value === "string" && /^[0-9]{1,8}$/.test(value)), "noncanonical follower launch setting");
    result[key] = value ?? null;
  }
  for (const key of ["NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH"]) {
    assert(!Object.hasOwn(environment, key), "loader environment unsupported by node observation");
  }
  return result;
}

function processIdentity(child, entry, runtime) {
  assert(child.exitCode === null && child.signalCode === null, "node child terminated");
  const prefix = `/proc/${child.pid}`, text = readBounded(`${prefix}/stat`, 4096).toString();
  assert.equal(Number(text.slice(0, text.indexOf(" "))), child.pid);
  const fields = text.slice(text.lastIndexOf(") ") + 2).trim().split(/\s+/);
  assert(!["Z", "X"].includes(fields[0]) && Number(fields[1]) === process.pid, "node child lifetime changed");
  assert(/^[0-9]+$/.test(fields[19]));
  const argv = readBounded(`${prefix}/cmdline`, 16384).toString().split("\0").slice(0, -1);
  equal(argv, [runtime.path, ...entry.arguments], "node argv changed");
  const exe = fs.statSync(`${prefix}/exe`);
  assert.equal(fs.realpathSync(`${prefix}/exe`), runtime.path);
  assert.equal(exe.dev, runtime.dev); assert.equal(exe.ino, runtime.ino);
  assert.equal(fs.realpathSync(`${prefix}/cwd`), process.cwd());
  const namespace = fs.readlinkSync(`${prefix}/ns/net`);
  assert.equal(namespace, fs.readlinkSync("/proc/self/ns/net"), "node network namespace changed");
  return { pid: child.pid, parent_pid: process.pid, start_ticks: fields[19], argv, network_namespace: namespace };
}

function ownedSockets(pid) {
  const directory = fs.opendirSync(`/proc/${pid}/fd`), sockets = new Set();
  try {
    for (let count = 0; count <= 4096; count++) {
      const entry = directory.readSync(); if (!entry) return sockets;
      assert(count < 4096, "node descriptor ceiling exceeded");
      if (!/^[0-9]+$/.test(entry.name)) continue;
      try {
        // Stat descriptor metadata only; never readlink file paths or read files.
        const stat = fs.statSync(`/proc/${pid}/fd/${entry.name}`);
        if (stat.isSocket()) sockets.add(String(stat.ino));
      } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    assert.fail("node descriptor ceiling exceeded");
  } finally { directory.closeSync(); }
}

function ownedConnection(child, localPort) {
  const owned = ownedSockets(child.pid), connections = [], listeners = [];
  for (const family of ["tcp", "tcp6"]) {
    const lines = readBounded(`/proc/${child.pid}/net/${family}`, 256 * 1024).toString().split("\n");
    assert(lines.length <= 4096, "TCP table row ceiling exceeded");
    for (const line of lines.slice(1).filter(Boolean)) {
      const fields = line.trim().split(/\s+/);
      assert(fields.length >= 10, "invalid TCP table row");
      const [address, port] = fields[1].split(":"), [remote, remotePort] = fields[2].split(":");
      if (port !== "1004" || !owned.has(fields[9])) continue;
      const loopback = family === "tcp" ? "0100007F" : "0000000000000000FFFF00000100007F";
      const wildcard = family === "tcp" ? "00000000" : "00000000000000000000000000000000";
      if (fields[3] === "0A" && [loopback, wildcard].includes(address)) listeners.push(fields[9]);
      if (fields[3] === "01" && address === loopback && remote === loopback &&
          Number.parseInt(remotePort, 16) === localPort) connections.push(fields[9]);
    }
  }
  if (connections.length !== 1 || listeners.length !== 1) return null;
  return { connection_inode: connections[0], listener_inode: listeners[0], client_port: localPort };
}

export function prepareNimoNodeProcessObservationV1({ nodeEntry, nodeArgs = [nodeEntry], adapterBase, environment = process.env }) {
  if (environment[OPTION] === undefined || environment[OPTION] === "0") return null;
  assert.equal(environment[OPTION], "1", "invalid node observation option");
  assert.equal(process.platform, "linux");
  assert.equal(readBounded("/proc/self/stat", 4096).toString().split(" ")[0], String(process.pid), "matching procfs PID namespace required");
  assert.equal(process.execArgv.length, 0, "plain parent startup required");
  assert(/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(adapterBase));
  assert(Number(new URL(adapterBase).port) <= 65535);
  const configuration = launchConfiguration(environment, adapterBase);
  const runtime = { ...fileIdentity(fs.realpathSync(process.execPath), 256 * 1024 * 1024), version: process.version };
  const allowedArgs = [[nodeEntry], [path.resolve("scripts/run_void_public_bootstrap_child_v1.mjs"), nodeEntry]];
  assert(allowedArgs.some(args => JSON.stringify(args) === JSON.stringify(nodeArgs)), "node argv rejected");
  const entry = { ...fileIdentity(path.resolve(nodeEntry), 16 * 1024 * 1024), argument: nodeEntry, arguments: [...nodeArgs] };
  const head = git("rev-parse", "HEAD").toString().trim(), tree = git("rev-parse", "HEAD^{tree}").toString().trim();
  const sources = SOURCE_PATHS.map(file => {
    const binding = fileIdentity(file, 2 * 1024 * 1024);
    assert.equal(binding.sha256, sha(git("show", `HEAD:${file}`)), "uncommitted observation source");
    return binding;
  });
  const manifestBytes = readBounded("public/bootstrap/v1.json", 1024 * 1024);
  const manifest = validateBootstrapManifestNoTailnetV1(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes)));
  const manifestSha = sha(manifestBytes), observationId = crypto.randomBytes(16).toString("hex");
  const controller = new AbortController(); let used = false;
  return Object.freeze({
    invalidate() { controller.abort(); },
    async observe(child) {
      assert(!used, "observation cannot be reused"); used = true;
      const terminal = () => controller.abort();
      child.once("exit", terminal); child.once("error", terminal);
      const totalTimer = setTimeout(terminal, 180000);
      let identity, listener, completed = false;
      const transcript = [];
      const boundary = () => {
        assert(!controller.signal.aborted, "node observation invalidated");
        const current = processIdentity(child, entry, runtime);
        if (!identity) identity = current; else equal(current, identity, "node process generation changed");
        equal(launchConfiguration(environment, adapterBase), configuration, "selected launch configuration changed");
        equal(fileIdentity(entry.path, 16 * 1024 * 1024), { path: entry.path, dev: entry.dev, ino: entry.ino, bytes: entry.bytes, sha256: entry.sha256 }, "node entry changed");
        for (const source of sources) equal(fileIdentity(source.path, 2 * 1024 * 1024), source, "observation source changed");
        assert(Date.now() < manifest.expires_at_ms, "bootstrap target expired");
        assert.equal(sha(readBounded("public/bootstrap/v1.json", 1024 * 1024)), manifestSha, "bootstrap target changed");
      };
      const acquire = route => new Promise((resolve, reject) => {
        try { boundary(); assert(ROUTES.includes(route)); } catch (error) { reject(error); return; }
        let request, response, socket, lease, settled = false, received = 0, reads = 0;
        const buffer = Buffer.alloc(MAX_BODY);
        const finish = (error, value) => {
          if (settled) return; settled = true;
          clearTimeout(deadline); controller.signal.removeEventListener("abort", aborted);
          response?.destroy(); request?.destroy(); socket?.destroy();
          if (error) reject(error); else resolve(value);
        };
        const aborted = () => finish(new Error("node observation invalidated"));
        const deadline = setTimeout(() => finish(new Error("owned HTTP deadline exceeded")), 10000);
        controller.signal.addEventListener("abort", aborted, { once: true });
        request = http.request({ hostname: "127.0.0.1", port: 4100, path: route, method: "GET", agent: false,
          maxHeaderSize: 16384, headers: { Accept: "application/json", "Accept-Encoding": "identity", Connection: "keep-alive" } });
        request.once("error", error => finish(error));
        request.once("socket", connected => {
          socket = connected;
          socket.once("connect", async () => {
            try {
              // Connection establishment precedes the server's accept callback.
              // No HTTP bytes are released until its accepted FD is observed.
              for (let tick = 0; tick < 100 && !settled; tick++) {
                boundary(); lease = ownedConnection(child, socket.localPort);
                if (lease) break;
                await new Promise(resolveTick => setTimeout(resolveTick, 10));
              }
              assert(!settled && lease, "HTTP connection is not owned by node child");
              if (!listener) listener = lease.listener_inode;
              assert.equal(lease.listener_inode, listener, "node HTTP listener generation changed");
              request.end();
            } catch (error) { finish(error); }
          });
        });
        request.once("response", incoming => {
          response = incoming;
          try {
            assert.equal(response.statusCode, 200, "owned HTTP requires status 200");
            const headers = response.headers;
            assert(/^application\/json(?:;\s*charset=utf-8)?$/i.test(headers["content-type"] || ""));
            assert(headers["content-encoding"] === undefined || headers["content-encoding"] === "identity");
            // This deliberately narrow diagnostic requires a complete length-
            // framed response and a connection held through ownership checking.
            assert(headers["transfer-encoding"] === undefined);
            assert(/^[1-9][0-9]{0,6}$/.test(headers["content-length"] || ""));
            assert(Number(headers["content-length"]) <= MAX_BODY);
            assert.notEqual(headers.connection?.toLowerCase(), "close");
          } catch (error) { finish(error); return; }
          response.on("error", error => finish(error));
          response.on("data", chunk => {
            try {
              assert(++reads <= 1024 && chunk.length <= MAX_BODY - received, "owned HTTP body ceiling");
              chunk.copy(buffer, received); received += chunk.length;
            } catch (error) { finish(error); }
          });
          response.once("end", () => {
            try {
              assert.equal(received, Number(response.headers["content-length"]));
              boundary(); equal(ownedConnection(child, lease.client_port), lease, "HTTP ownership changed before body terminal");
              const bytes = buffer.subarray(0, received);
              const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
              assert(transcript.length < 132, "observation request ceiling");
              transcript.push({ route, ...lease, response_bytes: received, response_sha256: sha(bytes) });
              finish(null, value);
            } catch (error) { finish(error); }
          });
        });
      });
      try {
        // Called directly after spawn; wait for the actual exec completion.
        if (!child.pid) await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
        boundary();
        let ready = false;
        for (let attempt = 0; attempt < 120; attempt++) {
          try {
            const value = await acquire("/__void/ready.json");
            ready = value.ready === true && value.gap === 0 && value.txroot_live === 1 &&
              Number.isSafeInteger(value.head) && value.head >= manifest.target_head;
          } catch (error) { if (error.code !== "ECONNREFUSED") throw error; }
          if (ready) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        assert(ready, "qualified target not ready within observation window");
        const observations = await collectQualifiedTargetObservationsV1({ readJson: acquire, targetHead: manifest.target_head, boundary });
        boundary();
        equal({ ...fileIdentity(runtime.path, 256 * 1024 * 1024), version: process.version }, runtime, "Node executable changed");
        assert.equal(git("rev-parse", "HEAD").toString().trim(), head, "source generation changed");
        completed = true;
        return { marker: "VOID_NIMO_NODE_PROCESS_OBSERVATIONS_V1_GREEN", observation_id: observationId,
          source: { head, tree, sources }, runtime, node_entry: entry, node_process: identity,
          selected_launch_configuration: configuration, listener_inode: listener, bootstrap_manifest_sha256: manifestSha,
          bootstrap_manifest_id: manifest.manifest_id, qualified_target_head: manifest.target_head, observations, transcript,
          child_process_and_socket_bound: true, node_entry_bytes_bound: true, selected_launch_configuration_bound: true,
          compiled_source_derivation_bound: false, runtime_configuration_bound: false, runtime_session_bound: false,
          fresh_join_proven: false, public_onboarding_accepted: false };
      } finally {
        clearTimeout(totalTimer); controller.abort(); child.removeListener("exit", terminal); child.removeListener("error", terminal);
        // This diagnostic never kills, restarts or changes configuration of the node.
        if (!completed) identity = undefined;
      }
    },
  });
}
