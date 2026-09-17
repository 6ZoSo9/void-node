// Explicit VM/adapter/scheduling fixture around the exact supervisor source.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import http from "node:http";
import crypto from "node:crypto";
import childProcess from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const mode = process.argv[2], cut = Number(process.argv[3]), report = x => process.send?.(x);
process.execArgv = []; // Declared VM plain-process boundary; census retains argv.
const release = path.resolve(".runtime/exe-cut-release");
let used = false;
function barrier(index) {
  if (used || index !== cut || mode === "fresh") return;
  used = true; report({ fixture: "cut", cut: index });
  const limit = Date.now() + 60000;
  while (!fs.existsSync(release) && Date.now() < limit) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
  if (!fs.existsSync(release)) throw new Error("unreleased runtime cut");
}
if (mode === "predecessor") {
  barrier(1);
  const { runtimeIdentity } = await import("../../lib/void_nimo_build_admission_v1.mjs");
  report({ fixture: "predecessor-result", runtime: runtimeIdentity() });
  process.disconnect();
} else {
  const spawn = childProcess.spawn.bind(childProcess);
  childProcess.spawn = (exe, args, options) => {
    if (!args[0]?.endsWith("run_void_public_bootstrap_child_v1.mjs")) return spawn(exe, args, options);
    barrier(2);
    const child = spawn(exe, args, options), send = child.send.bind(child);
    child.send = (value, ...rest) => { if (value?.schema === "void_nimo_fresh_sync_grant_v1") barrier(3); return send(value, ...rest); };
    child.on("message", value => {
      if (["entry", "serving"].includes(value?.fixture)) {
        report({ fixture: value.fixture, pid: child.pid });
        if (value.fixture === "entry") child.send("fixture-start");
      }
    });
    report({ fixture: "child", pid: child.pid }); return child;
  };
  const open = fs.openSync.bind(fs);
  fs.openSync = (name, ...args) => {
    if (String(name).endsWith("/nimo-fresh-sync-session-v1/terminal.json")) barrier(4);
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
        throw new Error("executed-runtime fixture unexpectedly selected a checkpoint generation");
      },
    };
    else if (name === "./lib/void_public_checkpoint_capability_timing_v1.mjs") values = {
      parseVoidPublicCheckpointCapabilityTimingConfigV1() {
        return null;
      },
      async observeVoidPublicCheckpointCapabilityTimingV1() {
        throw new Error("executed-runtime fixture unexpectedly activated checkpoint timing");
      },
    };
    else if (name === "../tools/void-public-seed-client-adapter-v1.mjs") values = adapter;
    else throw new Error(`unexpected static supervisor import in executed-runtime fixture: ${name}`);
    return new vm.SyntheticModule(Object.keys(values), function() {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  barrier(1); await module.evaluate();
}
