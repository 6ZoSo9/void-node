// Executes exact supervisor and native session/observer code. Only adapter,
// process launch scheduling and the terminal crash cut are fixture boundaries.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import http from "node:http";
import crypto from "node:crypto";
import childProcess from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const scenario = process.argv[2], report = x => process.send?.(x);
// VM requires a flag in the fixture host. The source sees the declared plain
// process boundary; the external census retains the actual fixture argv.
process.execArgv = [];
let nodeChild, heldReady;
const spawn = childProcess.spawn.bind(childProcess);
childProcess.spawn = (exe, args, options) => {
  if (!args[0]?.endsWith("run_void_public_bootstrap_child_v1.mjs")) return spawn(exe, args, options);
  if (scenario === "successor-3") options = { ...options, env: { ...options.env, VOID_MAIN_BASE: "https://manual.example" } };
  const child = nodeChild = spawn(exe, args, options), emit = child.emit.bind(child);
  child.emit = (name, ...values) => {
    if (name === "message" && values[0]?.schema === "void_nimo_fresh_sync_child_v1" && values[0].type === "ready") {
      heldReady = () => emit(name, ...values); report({ fixture: "preflight", pid: child.pid }); return true;
    }
    return emit(name, ...values);
  };
  child.on("message", message => { if (["entry", "serving"].includes(message?.fixture)) report({ fixture: message.fixture, pid: child.pid }); });
  report({ fixture: "child", pid: child.pid }); return child;
};
process.on("message", m => {
  if (m === "admit") { const release = heldReady; heldReady = null; release?.(); }
  if (m === "start") nodeChild?.send("fixture-start");
});
const open = fs.openSync.bind(fs);
fs.openSync = (name, ...args) => {
  if (scenario === "successor-9" && String(name).endsWith("/nimo-fresh-sync-session-v1/terminal.json")) {
    report({ fixture: "target-before-terminal" });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000);
    throw new Error("unreleased fixture terminal cut");
  }
  return open(name, ...args);
};
const adapter = { async createPublicSeedClientAdapterV1() {
  const server = http.createServer((_, response) => { response.writeHead(503); response.end(); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, peers: ["explicit-fixture"] };
} };
const file = path.resolve("scripts/run_void_public_bootstrap_supervisor_v1.mjs"), context = vm.createContext({ console, URL, Buffer, Object });
const module = new vm.SourceTextModule(fs.readFileSync(file, "utf8"), { context, identifier: pathToFileURL(file).href,
  initializeImportMeta(meta) { meta.url = pathToFileURL(file).href; },
  importModuleDynamically(name) { return import(new URL(name, pathToFileURL(file)).href); } });
await module.link(name => {
  let values;
  if (name === "node:child_process") values = { default: childProcess };
  else if (name === "node:crypto") values = { default: crypto };
  else if (name === "node:fs") values = { default: fs };
  else if (name === "node:path") values = { default: path };
  else if (name === "node:process") values = { default: process };
  else if (name === "node:url") values = { fileURLToPath };
  else if (name === "./lib/void_public_checkpoint_restore_supervisor_v1.mjs") values = {
    async runPublicCheckpointRestorePreNodeV1() {
      return Object.freeze({ outcome: "disabled" });
    },
    openCheckpointGenerationForRestoreResultV1() {
      return null;
    },
  };
  else if (name === "./lib/void_public_checkpoint_restore_activation_v1.mjs") values = {
    closeSelectedCheckpointGenerationV1() {
      throw new Error("fresh-session fixture unexpectedly selected a checkpoint generation");
    },
  };
  else if (name === "./lib/void_public_checkpoint_capability_timing_v1.mjs") values = {
    parseVoidPublicCheckpointCapabilityTimingConfigV1() {
      return null;
    },
    async observeVoidPublicCheckpointCapabilityTimingV1() {
      throw new Error("fresh-session fixture unexpectedly activated checkpoint timing");
    },
  };
  else if (name === "../tools/void-public-seed-client-adapter-v1.mjs") values = adapter;
  else throw new Error(`unexpected static supervisor import in fresh-session fixture: ${name}`);
  return new vm.SyntheticModule(Object.keys(values), function() {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context });
});
await module.evaluate();
