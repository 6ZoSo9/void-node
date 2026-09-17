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
    const values = name === "node:child_process" ? { default: childProcess } : name === "node:crypto" ? { default: crypto } :
      name === "node:process" ? { default: process } : name === "node:url" ? { fileURLToPath } : adapter;
    return new vm.SyntheticModule(Object.keys(values), function() { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
  });
  barrier(1); await module.evaluate();
}
