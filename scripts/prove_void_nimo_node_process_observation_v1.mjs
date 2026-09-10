#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { EventEmitter } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareNimoNodeProcessObservationV1 } from "./lib/void_nimo_node_process_observation_v1.mjs";

const ROOT = process.cwd(), OPTION = "VOID_NIMO_NODE_PROCESS_OBSERVATION_V1";
const supervisorPath = "scripts/run_void_public_bootstrap_supervisor_v1.mjs";
const fixturePath = "scripts/fixtures/nimo-execution-session-v1/node-http.mjs";
const fixture = fs.readFileSync(fixturePath, "utf8");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

// Execute the actual supervisor source with only the process/adapter boundaries
// replaced. Default-off startup, opt-in ordering and invalidation are checked.
async function supervisorHooks() {
  const source = fs.readFileSync(process.argv[3] || supervisorPath, "utf8"), outcomes = [];
  for (const mode of ["off", "on", "prepare-failure", "diagnostic-failure"]) {
    const events = [], child = new EventEmitter(), parent = new EventEmitter();
    const server = new EventEmitter(); server.close = () => { events.push("adapter-close"); server.emit("close"); };
    Object.assign(child, { connected: true, exitCode: null, signalCode: null,
      send() {}, kill() { events.push("node-kill"); } });
    Object.assign(parent, { env: { VOID_PUBLIC_SEED_CLIENT_PEERS: "https://seed.example" }, execPath: process.execPath,
      exit() { events.push("parent-exit"); } });
    if (mode !== "off") parent.env[OPTION] = "1";
    let invalidate = 0, factory = 0;
    const context = vm.createContext({ URL, console: { log() {}, error() {} } });
    const synthetic = (values) => new vm.SyntheticModule(Object.keys(values), function() {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
    const observer = synthetic({ prepareNimoNodeProcessObservationV1(args) {
      factory++; events.push("prepare"); assert.equal(args.nodeEntry, "dist/index.js"); assert.equal(args.adapterBase, "http://127.0.0.1:43210");
      if (mode === "prepare-failure") throw new Error("preparation rejected");
      return { invalidate() { invalidate++; }, observe(value) {
        assert.equal(value, child); events.push("observe");
        return mode === "diagnostic-failure" ? Promise.reject(new Error("diagnostic rejected")) : Promise.resolve({ ok: true });
      } };
    } });
    await observer.link(() => assert.fail()); await observer.evaluate();
    const entry = new vm.SourceTextModule(source, { context, identifier: `file://${ROOT}/${supervisorPath}`,
      initializeImportMeta: meta => { meta.url = `file://${ROOT}/${supervisorPath}`; },
      importModuleDynamically: async specifier => { assert.equal(specifier, "./lib/void_nimo_node_process_observation_v1.mjs"); return observer; } });
    await entry.link(specifier => {
      if (specifier === "node:child_process") return synthetic({ default: { spawn(executable, args, options) {
        events.push("spawn"); assert.equal(executable, process.execPath);
        assert.deepEqual(Array.from(args), source.includes("run_void_public_bootstrap_child_v1.mjs") ?
          [path.join(ROOT, "scripts/run_void_public_bootstrap_child_v1.mjs"), "dist/index.js"] : ["dist/index.js"]);
        assert.equal(options.env.VOID_FOLLOWER_AUTOSTART_PEERS, "http://127.0.0.1:43210");
        assert.deepEqual(Array.from(options.stdio), ["inherit", "inherit", "inherit", "ipc"]); return child;
      } } });
      if (specifier === "node:crypto") return synthetic({ default: { randomBytes: crypto.randomBytes } });
      if (specifier === "node:process") return synthetic({ default: parent });
      if (specifier === "node:url") return synthetic({ fileURLToPath });
      // Reconciliation-only inputs for #1458's unchanged default-off restore.
      if (specifier === "node:path") return synthetic({ default: path });
      if (specifier === "./lib/void_public_checkpoint_restore_supervisor_v1.mjs") return synthetic({
        runPublicCheckpointRestorePreNodeV1: async () => ({ selection: null }),
        openCheckpointGenerationForRestoreResultV1: () => null,
      });
      if (specifier === "./lib/void_public_checkpoint_restore_activation_v1.mjs") return synthetic({ closeSelectedCheckpointGenerationV1() { assert.fail(); } });
      assert.equal(specifier, "../tools/void-public-seed-client-adapter-v1.mjs");
      return synthetic({ createPublicSeedClientAdapterV1: async () => ({ base: "http://127.0.0.1:43210", peers: ["https://seed.example"], server }) });
    });
    await entry.evaluate(); await new Promise(resolve => setImmediate(resolve));
    if (mode === "off") { assert.equal(factory, 0); assert.deepEqual(events, ["spawn"]); }
    else if (mode === "prepare-failure") assert.deepEqual(events, ["prepare", "parent-exit"]);
    else {
      assert.deepEqual(events, ["prepare", "spawn", "observe"]);
      server.emit("close"); assert.equal(invalidate, 1);
      assert(!events.includes("node-kill"), "diagnostic failure must not kill node");
    }
    outcomes.push(mode);
  }
  console.log(JSON.stringify({ marker: "VOID_NIMO_SUPERVISOR_OBSERVATION_HOOKS_V1_GREEN", cases: outcomes }));
}

if (process.argv[2] === "--supervisor-hooks") {
  await supervisorHooks();
} else {
  assert.equal(process.execArgv.length, 0);
  const head = spawnSync("/usr/bin/git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  const paths = [supervisorPath, "scripts/lib/void_nimo_node_process_observation_v1.mjs", fixturePath,
    "scripts/run_void_public_bootstrap_child_v1.mjs",
    "scripts/prove_void_nimo_node_process_observation_v1.mjs", "tools/void-nimo-no-tailnet-acceptance-v1.mjs",
    ".github/workflows/void-nimo-no-tailnet-acceptance-v1.yml", "docs/operations/void-nimo-no-tailnet-onboarding-v1.md"];
  const sources = paths.map(file => {
    const bytes = fs.readFileSync(file), committed = spawnSync("/usr/bin/git", ["show", `HEAD:${file}`], { maxBuffer: 2 * 1024 * 1024 });
    assert.equal(committed.status, 0); assert(bytes.equals(committed.stdout));
    return { path: file, bytes: bytes.length, sha256: sha(bytes) };
  });
  const hook = spawnSync(process.execPath, ["--no-warnings", "--experimental-vm-modules", "scripts/prove_void_nimo_node_process_observation_v1.mjs", "--supervisor-hooks"],
    { encoding: "utf8", timeout: 10000, maxBuffer: 8192 });
  assert.equal(hook.status, 0, hook.stderr); console.log(hook.stdout.trim());
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "void-nimo-node-observation-"));
  const cases = [], receipts = [];
  const environment = () => ({ [OPTION]: "1", HTTP_PORT: "4100" });
  const makeEntry = (name, fault = "none", anchor = false) => {
    const file = path.join(directory, `${name}.mjs`);
    fs.writeFileSync(file, anchor ? "setInterval(() => {}, 1000);\n" : fixture.replace('const fault = process.argv[2] || "none";', `const fault = ${JSON.stringify(fault)};`), { flag: "wx" });
    return file;
  };
  const launch = entry => spawn(process.execPath, [entry], { cwd: ROOT,
    env: { LANG: "C", LC_ALL: "C", TZ: "UTC" }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  async function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const closed = new Promise(resolve => child.once("close", resolve)); child.kill("SIGKILL"); await closed;
  }
  async function scenario(name, { fault = "none", change, expected, foreign = false } = {}) {
    const entry = makeEntry(name, fault, foreign), env = environment();
    const observation = prepareNimoNodeProcessObservationV1({ nodeEntry: entry, adapterBase: "http://127.0.0.1:43210", environment: env });
    let outsider, outsiderRequests = 0;
    if (foreign) {
      outsider = launch(makeEntry(`${name}-outsider`));
      outsider.on("message", message => { if (message.type === "request") outsiderRequests++; });
      await new Promise((resolve, reject) => { outsider.on("message", m => { if (m.type === "listening") resolve(); }); outsider.once("error", reject); });
    }
    const child = launch(entry); let requests = 0, stderr = "";
    child.stderr.on("data", bytes => { stderr += bytes; assert(stderr.length < 8192); });
    child.on("message", message => {
      if (message.type === "request") {
        requests++; if (requests === 5) change?.({ entry, env, observation, child });
      }
    });
    try {
      const promise = observation.observe(child);
      if (expected) {
        await assert.rejects(promise, expected);
        if (!["exit"].includes(fault)) assert.equal(child.exitCode, null, "diagnostic stopped the node");
      } else {
        const receipt = await promise;
        assert.equal(receipt.node_process.pid, child.pid);
        assert.equal(receipt.transcript.length, 13);
        assert.deepEqual(receipt.transcript.slice(1).map(row => row.route), Array.from({ length: 3 }, () =>
          ["/health", "/__void/ready.json", "/blocks/latest/number2.json", "/p2p/peers"]).flat());
        assert(receipt.transcript.every(row => row.listener_inode === receipt.listener_inode));
        for (const key of ["runtime_configuration_bound", "runtime_session_bound", "public_onboarding_accepted", "compiled_source_derivation_bound"]) assert.equal(receipt[key], false);
        receipts.push(receipt);
        await assert.rejects(observation.observe(child), /cannot be reused/);
      }
      if (foreign) assert.equal(outsiderRequests, 0, "request sent to foreign process before ownership rejection");
      assert.equal(stderr, ""); cases.push({ id: name, result: expected ? "HOLD" : "PROCESS_OBSERVATIONS_ONLY", requests });
    } finally { await stop(child); if (outsider) await stop(outsider); }
  }
  try {
    // Guarded mode can be disabled without reading any other supplied property.
    const disabled = new Proxy({}, { get(_, key) { assert.equal(key, OPTION); return undefined; } });
    assert.equal(prepareNimoNodeProcessObservationV1({ environment: disabled }), null);
    cases.push({ id: "disabled-no-io", result: "OFF", requests: 0 });
    const entry = makeEntry("configuration");
    for (const [id, env] of [["invalid-option", { [OPTION]: "yes" }], ["wrong-port", { ...environment(), HTTP_PORT: "4101" }],
      ...["NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH"].map(key => [key, { ...environment(), [key]: "" }])]) {
      assert.throws(() => prepareNimoNodeProcessObservationV1({ nodeEntry: entry, adapterBase: "http://127.0.0.1:43210", environment: env }));
      cases.push({ id, result: "HOLD_BEFORE_CHILD", requests: 0 });
    }
    const oldFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("mutable fetch must not acquire owned HTTP"); };
    try { await scenario("nominal-native-owned-http"); } finally { globalThis.fetch = oldFetch; }
    await scenario("child-exit", { fault: "exit", expected: /invalidated|terminated|socket hang up|ECONNRESET/ });
    await scenario("listener-rebind", { fault: "rebind", expected: /listener generation changed/ });
    await scenario("entry-change", { change: ({ entry }) => fs.appendFileSync(entry, "\n// changed\n"), expected: /node entry changed/ });
    await scenario("launch-setting-change", { change: ({ env }) => { env.HTTP_PORT = "4101"; }, expected: /HTTP_PORT|launch configuration/ });
    await scenario("adapter-invalidation", { change: ({ observation }) => observation.invalidate(), expected: /invalidated/ });
    await scenario("foreign-listener", { foreign: true, expected: /not owned by node child/ });
    for (const fault of ["bad-json", "oversize", "redirect", "peer-mismatch"]) await scenario(fault, { fault, expected: /./ });
    await scenario("fresh-after-failures");
    assert.equal(cases.length, 18);
    const report = { marker: "VOID_NIMO_NODE_PROCESS_OBSERVATION_PROOF_V1_GREEN", head, node: process.version, sources,
      case_count: cases.length, cases, real_node_children: 0, fixture_children: 13, supervisor_hook_cases: 4,
      actual_void_node_started: false, runtime_configuration_bound: false, runtime_session_bound: false, public_onboarding_accepted: false };
    if (process.argv[2]) {
      const bytes = Buffer.from(JSON.stringify({ report, receipts }) + "\n"); assert(bytes.length <= 128 * 1024);
      const fd = fs.openSync(process.argv[2], "wx", 0o600);
      try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      report.evidence_sha256 = sha(bytes); report.evidence_bytes = bytes.length;
    }
    console.log(JSON.stringify(report));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
