#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { BUILD_OPTION, RECEIPT_PATH, RECIPE, canonical, sha256, inventory, sourceIdentity, runtimeIdentity,
  verifyBuildReceipt, followerSettings, protectFollowerSettings, admitBoundChild }
  from "./lib/void_nimo_build_admission_v1.mjs";

const ROOT = process.cwd(), baseEnvironment = () => ({ VOID_FOLLOWER_AUTOSTART_PEERS: "http://127.0.0.1:43210",
  VOID_FOLLOWER_AUTOSTART_PEER: "http://127.0.0.1:43210", VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1" });
if (process.argv[2] === "--environment-child") {
  assert.equal(process.execArgv.length, 0);
  const receipt = admitBoundChild(process, ROOT, path.join(ROOT, "dist/index.js"));
  for (const [key, value] of Object.entries(receipt.selected_follower_settings)) {
    assert.equal(process.env[key], value); process.env[key] = value;
    assert.throws(() => { process.env[key] = "changed"; }); assert.throws(() => { delete process.env[key]; });
    assert.throws(() => Object.defineProperty(process.env, key, { value: "changed" }));
  }
  assert.throws(() => { process.env = {}; });
  process.env.VOID_NIMO_UNRELATED_FIXTURE = "ok"; delete process.env.VOID_NIMO_UNRELATED_FIXTURE;
  console.log(canonical({ marker: "VOID_NIMO_PROTECTED_ENVIRONMENT_V1_GREEN", protected_keys: Object.keys(receipt.selected_follower_settings).length,
    build_inventory_matched_at_start: true, actual_void_node_started: false }));
} else {
  const cases = [], check = (name, fn) => { fn(); cases.push(name); };
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-nimo-build-proof-"));
  const git = (...argv) => {
    const r = spawnSync("/usr/bin/git", argv, { cwd: temp, env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" }, maxBuffer: 1024 * 1024, timeout: 10000 });
    assert.equal(r.status, 0); return r.stdout.toString().trim();
  };
  try {
    for (const d of ["src", "dist", "node_modules/fixture", ".runtime"]) fs.mkdirSync(path.join(temp, d), { recursive: true });
    fs.writeFileSync(path.join(temp, "src/index.ts"), "export const fixture = 1;\n");
    fs.writeFileSync(path.join(temp, "dist/index.js"), "export const fixture = 1;\n");
    fs.writeFileSync(path.join(temp, "node_modules/fixture/index.js"), "export default 1;\n");
    git("init", "-q"); git("add", "--", "src/index.ts");
    git("-c", "user.name=void-fixture", "-c", "user.email=void-fixture@example.invalid", "commit", "-qm", "fixture");
    const receipt = { schema: "void_nimo_build_admission_v1", generation: "synthetic-proof", source: sourceIdentity(temp), runtime: runtimeIdentity(),
      build_recipe: RECIPE, dependencies: inventory(temp, "node_modules"), dist: inventory(temp, "dist"), actual_void_node_started: false, public_onboarding_accepted: false };
    const bytes = Buffer.from(canonical(receipt) + "\n"), digest = sha256(bytes), target = path.join(temp, RECEIPT_PATH);
    fs.writeFileSync(target, bytes);
    const verify = () => verifyBuildReceipt(temp, RECEIPT_PATH, digest);
    check("matching-synthetic-inventory", verify);
    const mutateFile = (name, relative, change) => check(name, () => {
      const file = path.join(temp, relative), before = fs.readFileSync(file);
      try { change(file); assert.throws(verify); } finally { fs.rmSync(file, { force: true }); fs.writeFileSync(file, before); }
    });
    mutateFile("changed-entry", "dist/index.js", file => fs.appendFileSync(file, "// drift\n"));
    mutateFile("missing-entry", "dist/index.js", file => fs.unlinkSync(file));
    mutateFile("entry-symlink", "dist/index.js", file => { fs.unlinkSync(file); fs.symlinkSync("../src/index.ts", file); });
    mutateFile("changed-dependency", "node_modules/fixture/index.js", file => fs.appendFileSync(file, "// drift\n"));
    mutateFile("changed-source", "src/index.ts", file => fs.appendFileSync(file, "// drift\n"));
    mutateFile("receipt-symlink", RECEIPT_PATH, file => { fs.unlinkSync(file); fs.symlinkSync("../dist/index.js", file); });
    for (const [name, relative] of [["extra-output", "dist/extra.js"], ["untracked-compiler-input", "src/extra.ts"], ["extra-dependency", "node_modules/fixture/extra.js"]]) {
      check(name, () => { const file = path.join(temp, relative); fs.writeFileSync(file, "fixture"); try { assert.throws(verify); } finally { fs.unlinkSync(file); } });
    }
    check("escaping-dependency-link", () => { const file = path.join(temp, "node_modules/escape"); fs.symlinkSync("../src/index.ts", file); try { assert.throws(verify); } finally { fs.unlinkSync(file); } });
    check("hard-linked-output", () => { const link = path.join(temp, "link"); fs.linkSync(path.join(temp, "dist/index.js"), link); try { assert.throws(verify); } finally { fs.unlinkSync(link); } });
    check("wrong-expected-digest", () => assert.throws(() => verifyBuildReceipt(temp, RECEIPT_PATH, "0".repeat(64))));
    for (const [name, change] of [
      ["repinned-head", v => { v.source.head = "0".repeat(40); }], ["cross-runtime", v => { v.runtime.sha256 = "0".repeat(64); }],
      ["duplicate-output", v => { v.dist.members.push(v.dist.members[0]); }], ["missing-output-member", v => { v.dist.members.pop(); }],
      ["changed-recipe", v => { v.build_recipe = "build:loose"; }], ["unknown-field", v => { v.accepted = true; }],
      ["partial-receipt", v => { delete v.dependencies; }], ["onboarding-promotion", v => { v.public_onboarding_accepted = true; }],
    ]) check(name, () => {
      const value = JSON.parse(JSON.stringify(receipt)); change(value); const modified = Buffer.from(canonical(value) + "\n"); fs.writeFileSync(target, modified);
      try { assert.throws(() => verifyBuildReceipt(temp, RECEIPT_PATH, sha256(modified))); } finally { fs.writeFileSync(target, bytes); }
    });
    for (const [name, body] of [["noncanonical-bytes", JSON.stringify(receipt, null, 2)], ["truncated-json", "{"], ["invalid-utf8", Buffer.from([255])]]) {
      check(name, () => { fs.writeFileSync(target, body); try { assert.throws(() => verifyBuildReceipt(temp, RECEIPT_PATH, sha256(body))); } finally { fs.writeFileSync(target, bytes); } });
    }
    check("ambient-env-presence-no-read", () => {
      fs.mkdirSync(path.join(temp, ".env"));
      try { assert.throws(() => admitBoundChild({ execArgv: [], env: { ...baseEnvironment(), [BUILD_OPTION]: digest } }, temp, path.join(temp, "dist/index.js")), /ambient .env rejected/); }
      finally { fs.rmdirSync(path.join(temp, ".env")); }
    });
    check("noncanonical-entry", () => assert.throws(() => admitBoundChild({ execArgv: [], env: baseEnvironment() }, temp, path.join(temp, "other.js"))));
    for (const key of ["NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"])
      check(`loader-proxy-presence-${key}`, () => {
        const env = baseEnvironment(); Object.defineProperty(env, key, { get() { assert.fail("value read"); } });
        assert.throws(() => admitBoundChild({ execArgv: [], env }, temp, path.join(temp, "dist/index.js")), /loader or proxy/);
      });
    check("canonical-follower-defaults", () => { const s = followerSettings(baseEnvironment()); assert.equal(s.VOID_FOLLOWER_CATCHUP_PULL_LIMIT, "999"); assert.equal(s.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS, "1000"); });
    for (const value of ["", "0", "0499", "499", "60001", "1e3", "1000 ", "NaN"])
      check(`noncanonical-interval-${JSON.stringify(value)}`, () => assert.throws(() => followerSettings({ ...baseEnvironment(), VOID_FOLLOWER_AUTOSTART_INTERVAL_MS: value })));
    for (const [key, value] of [["HTTP_PORT", "4101"], ["VOID_HTTP_PORT", "4101"], ["PORT", "4101"], ["P2P_PORT", "4701"],
      ["VOID_FOLLOWER_AUTOSTART_PEERS", "http://localhost:43210"], ["VOID_FOLLOWER_AUTOSTART_PEER", "http://127.0.0.1:43211"], ["VOID_FOLLOWER_PULL_LIMIT", "1"]])
      check(`conflicting-setting-${key}`, () => assert.throws(() => followerSettings({ ...baseEnvironment(), [key]: value })));
    check("unrelated-values-not-read", () => { const env = baseEnvironment(); Object.defineProperty(env, "UNKNOWN_PRIVATE_FIXTURE", { get() { assert.fail("unrelated value read"); } }); followerSettings(env); });
    const settings = followerSettings(baseEnvironment()), protectedEnv = protectFollowerSettings(baseEnvironment(), settings);
    for (const [key, value] of Object.entries(settings)) check(`protected-${key}`, () => {
      protectedEnv[key] = value; assert.throws(() => { protectedEnv[key] = "different"; }); assert.throws(() => { delete protectedEnv[key]; });
      assert.throws(() => Object.defineProperty(protectedEnv, key, { get: () => "different" })); assert.equal(protectedEnv[key], value);
    });
    // Execute exact wrapper source with only process/import boundaries replaced.
    const wrapper = fs.readFileSync("scripts/run_void_public_bootstrap_child_v1.mjs", "utf8");
    for (const mode of ["off", "admitted", "rejected"]) {
      const events = [], p = new EventEmitter();
      Object.assign(p, { connected: true, execPath: process.execPath, argv: [process.execPath, "wrapper", path.join(ROOT, "dist/index.js")],
        env: mode === "off" ? {} : { [BUILD_OPTION]: "a".repeat(64) }, cwd: () => ROOT,
        send(value, callback) { events.push(value.type === "armed" ? "armed" : "admission"); callback?.(null); },
        exit(code) { throw new Error(`exit-${code}`); } });
      const once = p.once.bind(p); p.once = (...args) => { events.push("disconnect-handler"); return once(...args); };
      const context = vm.createContext({ Object, console: { error() {} } });
      const synthetic = async values => {
        const m = new vm.SyntheticModule(Object.keys(values), function() { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
        await m.link(() => assert.fail()); await m.evaluate(); return m;
      };
      const module = new vm.SourceTextModule(wrapper, { context, importModuleDynamically: async name => {
        if (name === "./lib/void_nimo_build_admission_v1.mjs") return synthetic({ admitBoundChild() { events.push("check"); if (mode === "rejected") throw new Error("fixture HOLD"); return {}; } });
        assert.equal(name, pathToFileURL(path.join(ROOT, "dist/index.js")).href); events.push("entry"); return synthetic({});
      } });
      await module.link(name => synthetic({ default: name === "node:process" ? p : name === "node:path" ? path : undefined,
        ...(name === "node:url" ? { pathToFileURL } : {}) }));
      if (mode === "rejected") await assert.rejects(module.evaluate(), /exit-1/); else await module.evaluate();
      assert.deepEqual(events, mode === "off" ? ["disconnect-handler", "armed", "entry"] : mode === "admitted" ? ["disconnect-handler", "armed", "check", "admission", "entry"] : ["disconnect-handler", "armed", "check"]);
      cases.push(`actual-wrapper-${mode}`);
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  if (process.argv[2]) {
    // Full-build mode adds actual receipt verification and actual compiled
    // follower execution, with only its node/timer/HTTP boundaries substituted.
    assert.equal(process.argv[2], "--built"); const expected = process.argv[3];
    verifyBuildReceipt(ROOT, RECEIPT_PATH, expected); cases.push("actual-full-build-inventory");
    const child = spawnSync(process.execPath, ["scripts/prove_void_nimo_build_admission_v1.mjs", "--environment-child"], {
      cwd: ROOT, timeout: 60000, maxBuffer: 8192, env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C", ...baseEnvironment(), [BUILD_OPTION]: expected } });
    assert.equal(child.status, 0, child.stderr.toString()); const childReport = JSON.parse(child.stdout.toString());
    assert.equal(childReport.marker, "VOID_NIMO_PROTECTED_ENVIRONMENT_V1_GREEN"); cases.push("actual-process-env-enforcement");
    for (const custom of [false, true]) {
      const env = baseEnvironment(); if (custom) Object.assign(env, { VOID_FOLLOWER_AUTOSTART_INTERVAL_MS: "2000", VOID_FOLLOWER_CATCHUP_INTERVAL_MS: "125", VOID_FOLLOWER_CATCHUP_PULL_LIMIT: "500" });
      const settings = followerSettings(env), timers = [], calls = [], logs = [], routes = [];
      const context = vm.createContext({ process: { env: protectFollowerSettings(env, settings) }, URL,
        setTimeout(fn, delay) { timers.push({ fn, delay }); return { unref() {} }; }, console: { log(...args) { logs.push(args); }, error() {} } });
      const module = new vm.SourceTextModule(fs.readFileSync("dist/http/follower_routes.js", "utf8"), { context });
      await module.link(() => assert.fail()); await module.evaluate();
      module.namespace.registerFollowerRoutes({ post(name) { routes.push(name); }, get(name) { routes.push(name); } },
        { async pullOnce(peer) { calls.push(peer); return { ok: true, myHead: 1, theirHead: 2 }; } });
      const active = logs.find(x => x[0] === "VOID_PUBLIC_BOOTSTRAP_AUTOSTART_ACTIVE")[1];
      assert.equal(active.steadyIntervalMs, Number(settings.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS));
      assert.equal(active.catchupIntervalMs, Number(settings.VOID_FOLLOWER_CATCHUP_INTERVAL_MS));
      assert.equal(active.catchupPullLimit, Number(settings.VOID_FOLLOWER_CATCHUP_PULL_LIMIT));
      assert.equal(timers[0].delay, 750); await timers.shift().fn(); await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(calls, [settings.VOID_FOLLOWER_AUTOSTART_PEERS]); assert.equal(timers[0].delay, active.catchupIntervalMs);
      cases.push(`compiled-follower-consumption-${custom ? "custom" : "default"}`);
    }
  }
  console.log(canonical({ marker: "VOID_NIMO_BUILD_ADMISSION_PROOF_V1_GREEN", node: process.version, case_count: cases.length, cases,
    actual_build_verified: process.argv[2] === "--built", synthetic_receipts_used: true, actual_void_node_started: false,
    runtime_session_bound: false, public_onboarding_accepted: false }));
}
