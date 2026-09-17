// Controlled CLI fixture entry. Only manifest, Git, machine and resolver I/O are
// simulated; fetch and timers are the child's actual runtime implementations.
import fs from "node:fs";
import net from "node:net";
import vm from "node:vm";
import process from "node:process";
import crypto from "node:crypto";
import assert from "node:assert/strict";

assert.equal(typeof process.send, "function");
process.send({ type: "ready" });
const packet = await new Promise(resolve => process.once("message", resolve));
if (packet?.type !== "release") {
  console.log("VOID_NIMO_EXECUTION_ENVELOPE_HOLD");
  process.disconnect();
  process.exit(2);
}
globalThis.__nimoFixtureBodies = packet.bodies;
const manifestBytes = Buffer.from(packet.manifest);
const manifest = JSON.parse(packet.manifest);
const file = `${process.cwd()}/tools/void-nimo-no-tailnet-acceptance-v1.mjs`;
const stopped = new Error("fixture CLI exit");
let exitCode = 0;
const fixtureFs = {
  constants: fs.constants,
  openSync(name, flags) {
    assert.equal(name, "public/bootstrap/v1.json");
    assert.equal(flags, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    return 123;
  },
  fstatSync(fd) {
    assert.equal(fd, 123);
    return { isFile: () => true, nlink: 1, size: manifestBytes.length, dev: 1, ino: 2,
      mode: 0o100644, mtimeMs: 1, ctimeMs: 1 };
  },
  readSync(fd, bytes, offset, length, position) {
    assert.equal(fd, 123); return manifestBytes.copy(bytes, offset, position, position + length);
  },
  closeSync(fd) { assert.equal(fd, 123); },
};
const fixtureProcess = {
  argv: [process.execPath, file, "--post-sync"], execPath: process.execPath,
  env: {}, cwd: () => process.cwd(), exit(code) { exitCode = code; throw stopped; },
};
const result = stdout => ({ status: 0, stdout, stderr: "" });
const childProcess = { spawnSync(command, args) {
  if (command === "git") {
    const key = args.join(" ");
    if (key === "rev-parse --show-toplevel") return result(process.cwd());
    if (key === "branch --show-current") return result("main");
    if (["rev-parse HEAD", "rev-parse origin/main"].includes(key)) return result(packet.head);
    if (key === "status --porcelain=v1 --untracked-files=all") return result("");
    assert.fail("unmodeled Git operation");
  }
  if (command === "ip") return result("[]");
  if (command === "ps") return result("node controlled-cli-fixture");
  if (command === "/bin/sh") return result("");
  assert.equal(command, process.execPath);
  assert.deepEqual(Array.from(args), ["scripts/resolve_void_public_bootstrap_v1.mjs", "--verify-only"]);
  return result([`manifest_id=${manifest.manifest_id}`, "VOID_PUBLIC_BOOTSTRAP_RESOLVER_V1_VERIFY_GREEN",
    "manifest_source=remote_https", "status=stable_https_seed", "trust_material_verified=true",
    "live_seed_probe_performed=false"].join("\n"));
} };
const context = vm.createContext({ Buffer, Uint8Array, TextDecoder, URL, Date, performance,
  structuredClone, AbortController, fetch: globalThis.fetch, setTimeout, clearTimeout, console });
const builtins = { "node:fs": fixtureFs, "node:net": { isIP: net.isIP, BlockList: net.BlockList },
  "node:dns": { promises: { lookup() { throw new Error("external DNS forbidden in fixture"); } } },
  "node:process": fixtureProcess, "node:child_process": childProcess };
const modules = new Map();
const entry = new vm.SourceTextModule(fs.readFileSync(file, "utf8"), { context,
  identifier: `file://${file}`, initializeImportMeta: meta => { meta.url = `file://${file}`; } });
await entry.link((specifier, parent) => {
  const key = specifier.startsWith("node:") ? specifier : new URL(specifier, parent.identifier).href;
  if (modules.has(key)) return modules.get(key);
  let module;
  if (specifier.startsWith("node:")) {
    const value = specifier === "node:crypto" ? { createHash: crypto.createHash } : builtins[specifier];
    assert(value, "unmodeled builtin");
    module = new vm.SyntheticModule(["default", ...Object.keys(value)], function() {
      this.setExport("default", value);
      for (const [name, item] of Object.entries(value)) this.setExport(name, item);
    }, { context });
  } else {
    assert(key.endsWith("/scripts/lib/void_public_seed_common_v1.mjs"));
    module = new vm.SourceTextModule(fs.readFileSync(new URL(key), "utf8"), { context, identifier: key });
  }
  modules.set(key, module); return module;
});
try { await entry.evaluate(); } catch (error) { if (error !== stopped) throw error; }
process.disconnect();
process.exitCode = exitCode;
