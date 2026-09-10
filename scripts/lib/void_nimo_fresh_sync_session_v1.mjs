// Cooperative, command-local fresh-sync admission. Never reads keys or .env.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { canonical, sha256, readRegular, runtimeIdentity, verifyBuildReceipt, followerSettings, BUILD_OPTION, RECEIPT_PATH }
  from "./void_nimo_build_admission_v1.mjs";
import { validateBootstrapManifestNoTailnetV1 } from "../../tools/void-nimo-no-tailnet-acceptance-v1.mjs";
import { retainExecutedRuntimeV1 } from "./void_nimo_executed_runtime_v1.mjs";

export const FRESH_OPTION = "VOID_NIMO_FRESH_SYNC_PLAN_SHA256_V1";
export const PLAN_PATH = ".runtime/nimo-fresh-sync-plan-v1.json";
export const SESSION_DIR = ".runtime/nimo-fresh-sync-session-v1";
const RECORD = `${SESSION_DIR}/record.json`, MANIFEST = "public/bootstrap/v1.json";
const NONCE = "VOID_NIMO_FRESH_SYNC_NONCE_V1";
const MANUAL = ["BOOTSTRAP_ADDRS", "BOOTSTRAP", "VOID_FOLLOWER_LEGACY_V2FS_ORIGINS", "VOID_MAIN_BASE", "VOID_DRIFT_PEER",
  "VOID_TOR_PUBLIC_SEED_CLIENT_PEERS", "VOID_SITE_BUNDLE_PEERS", "VOID_DATANET_SITE_BUNDLE_PEERS", "VOID_DATANET_PEERS"];
const LOADERS = ["NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"];
const equal = (a, b, why) => assert.equal(canonical(a), canonical(b), why);
const keys = (value, names) => equal(Object.keys(value).sort(), [...names].sort(), "closed schema required");
const hash = x => assert(typeof x === "string" && /^[0-9a-f]{64}$/.test(x));
function object(bytes) {
  const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  assert.equal(bytes.toString(), canonical(value) + "\n"); return value;
}
function absentEnvFile(root) {
  try { fs.lstatSync(path.join(root, ".env")); assert.fail("ambient .env rejected"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
export function configurationDigest(env) {
  const names = Object.keys(env).sort(); assert(names.length <= 128);
  const members = names.map(key => {
    assert(/^[A-Z][A-Z0-9_]{0,100}$/.test(key) && typeof env[key] === "string" && env[key].length <= 4096 && !env[key].includes("\0"));
    return { key, sha256: sha256(`void-nimo-effective-env-v1\0${key}\0${env[key]}`) };
  });
  return { schema: "closed_environment_v1", absent_keys: "all-unlisted", members, sha256: sha256(canonical(members)) };
}
function identity(pid) {
  assert(Number.isInteger(pid) && pid > 0);
  const raw = fs.readFileSync(`/proc/${pid}/stat`, "utf8"); assert(raw.length <= 4096 && raw.startsWith(`${pid} `));
  const fields = raw.slice(raw.lastIndexOf(") ") + 2).split(/\s+/); assert(!["Z", "X"].includes(fields[0]));
  return { pid, parent_pid: Number(fields[1]), start_ticks: fields[19] };
}
function rootIdentity(root) {
  assert(typeof root === "string" && path.isAbsolute(root) && root.length < 512 && fs.realpathSync(root) === root);
  const s = fs.lstatSync(root); assert(s.isDirectory() && !s.isSymbolicLink()); return { dev: s.dev, ino: s.ino };
}
function empty(fd) {
  // Reject every entry, including hidden residue and empty/rebuilt indices.
  const directory = fs.opendirSync(`/proc/self/fd/${fd}`);
  try { assert.equal(directory.readSync(), null, "fresh data root must be empty"); } finally { directory.closeSync(); }
}
function publish(root, name, value, boundary = () => {}) {
  const bytes = Buffer.from(canonical(value) + "\n"); assert(bytes.length <= 1024 * 1024);
  const target = path.join(root, name), fd = fs.openSync(target, "wx", 0o600);
  try { boundary(); fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const parent = fs.openSync(path.dirname(target), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
  return sha256(bytes);
}
function readPlan(root, expected) {
  hash(expected); const bytes = readRegular(root, PLAN_PATH, 65536); assert.equal(sha256(bytes), expected);
  const plan = object(bytes);
  keys(plan, ["schema", "head", "tree", "runtime", "runtime_sha256", "build_receipt_sha256", "manifest_sha256", "data_root", "environment"]);
  keys(plan.runtime, ["version", "dev", "ino", "bytes", "sha256"]);
  assert.equal(plan.runtime.sha256, plan.runtime_sha256);
  assert.equal(plan.schema, "void_nimo_fresh_sync_plan_v1");
  for (const k of ["runtime_sha256", "build_receipt_sha256", "manifest_sha256"]) hash(plan[k]);
  assert(/^[0-9a-f]{40}$/.test(plan.head) && /^[0-9a-f]{40}$/.test(plan.tree));
  assert(plan.environment && !Array.isArray(plan.environment)); configurationDigest(plan.environment);
  // No ambient environment passthrough. Additional reviewed defaults require
  // an explicit contract revision; a new steering variable is never inherited.
  const allowed = ["PATH", "LANG", "LC_ALL", "TZ", "NODE_PRIVKEY_PATH", "VOID_READY_REQUIRE_TXROOT_LIVE"];
  assert(Object.keys(plan.environment).every(k => allowed.includes(k)), "unreviewed environment key");
  for (const k of ["LANG", "LC_ALL"]) assert.equal(plan.environment[k], "C");
  assert.equal(plan.environment.TZ, "UTC"); assert.equal(plan.environment.PATH, "/usr/bin:/bin");
  assert.equal(plan.environment.VOID_READY_REQUIRE_TXROOT_LIVE, "1");
  if (Object.hasOwn(plan.environment, "NODE_PRIVKEY_PATH")) assert(path.isAbsolute(plan.environment.NODE_PRIVKEY_PATH));
  return plan;
}
function manifest(root, expected) {
  const bytes = readRegular(root, MANIFEST, 1024 * 1024); assert.equal(sha256(bytes), expected, "manifest generation changed");
  const raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  return { ...validateBootstrapManifestNoTailnetV1(raw), sha256: expected,
    peers: raw.sync_endpoints.filter(x => x.enabled).map(x => x.base).join(",") };
}
function build(root, plan) {
  const binding = verifyBuildReceipt(root, RECEIPT_PATH, plan.build_receipt_sha256);
  assert.equal(binding.head, plan.head); equal(runtimeIdentity(), plan.runtime, "executed runtime differs from plan");
  const receipt = object(readRegular(root, RECEIPT_PATH, 16 * 1024 * 1024)); assert.equal(receipt.source.tree, plan.tree);
  return binding;
}
export function prepareNimoFreshSyncV1({ adapterBase, nodeEntry, nodeArgs }) {
  const root = fs.realpathSync(process.cwd()), expected = process.env[FRESH_OPTION];
  assert.equal(process.execArgv.length, 0, "plain supervisor required");
  assert.equal(identity(process.pid).pid, process.pid); absentEnvFile(root);
  for (const k of [...MANUAL, ...LOADERS, "VOID_FOLLOWER_AUTOSTART_PEERS", "VOID_FOLLOWER_AUTOSTART_PEER"]) assert(!Object.hasOwn(process.env, k), "inherited steering rejected");
  const plan = readPlan(root, expected), binding = build(root, plan), target = manifest(root, plan.manifest_sha256);
  assert.equal(process.env.VOID_PUBLIC_SEED_CLIENT_PEERS, target.peers);
  assert.equal(process.env.VOID_NIMO_NODE_PROCESS_OBSERVATION_V1, "1", "owned observation required");
  assert.equal(path.resolve(nodeEntry), path.join(root, "dist/index.js"));
  equal(nodeArgs, [path.join(root, "scripts/run_void_public_bootstrap_child_v1.mjs"), nodeEntry]);
  const data = rootIdentity(plan.data_root), fd = fs.openSync(plan.data_root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  let used = false, invalid = false, childIdentity, recordHash, admitted = false, childRuntime, selfRuntime, activeChild;
  try { selfRuntime = retainExecutedRuntimeV1(); equal(selfRuntime.identity, plan.runtime); empty(fd); fs.mkdirSync(path.join(root, SESSION_DIR), { mode: 0o700 }); }
  catch (error) { selfRuntime?.close(); fs.closeSync(fd); throw error; }
  const nonce = crypto.randomBytes(16).toString("hex"), parent = identity(process.pid);
  const environment = { ...plan.environment, ...followerSettings({ VOID_FOLLOWER_AUTOSTART_PEERS: adapterBase,
    VOID_FOLLOWER_AUTOSTART_PEER: adapterBase, VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1" }),
    DATA_DIR: plan.data_root, VOID_DATA_DIR: plan.data_root, VOID_DISABLE_WRAPPER_STORM: "1", [BUILD_OPTION]: plan.build_receipt_sha256,
    [FRESH_OPTION]: expected, [NONCE]: nonce };
  const configuration = configurationDigest(environment);
  const invalidate = () => { if (!invalid) {
    invalid = true; fs.closeSync(fd); selfRuntime.close(); childRuntime?.close();
    if (activeChild?.connected) activeChild.send({ schema: "void_nimo_fresh_sync_end_v1", nonce }, () => {});
  } };
  const boundary = () => {
    assert(!invalid); selfRuntime.check(); childRuntime?.check(); equal(identity(process.pid), parent); equal(rootIdentity(plan.data_root), data, "data root replaced");
    const held = fs.fstatSync(fd); equal({ dev: held.dev, ino: held.ino }, data);
    assert.equal(sha256(readRegular(root, PLAN_PATH, 65536)), expected);
    equal(manifest(root, plan.manifest_sha256), target); absentEnvFile(root);
    if (childIdentity) equal(identity(childIdentity.pid), childIdentity, "child generation changed");
    if (recordHash) assert.equal(sha256(readRegular(root, RECORD, 1024 * 1024)), recordHash, "session record changed");
  };
  return Object.freeze({ environment, boundary, invalidate,
    async observe(child, observer) {
      assert(!used && observer); used = true; activeChild = child;
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => finish(new Error("child admission deadline")), 30000);
          const failed = () => finish(new Error("child terminated before admission"));
          const finish = error => { clearTimeout(timeout); child.removeListener("message", message); child.removeListener("exit", failed); child.removeListener("error", failed); error ? reject(error) : resolve(); };
          const message = value => {
            if (value?.schema !== "void_nimo_fresh_sync_child_v1") return;
            try {
              if (value.type === "ready") {
                assert(!recordHash); boundary(); empty(fd); equal(build(root, plan), binding);
                childIdentity = identity(child.pid); assert.equal(childIdentity.parent_pid, parent.pid);
                childRuntime = retainExecutedRuntimeV1(child.pid, value.runtime.version);
                equal(childRuntime.identity, plan.runtime, "child executed runtime differs from plan");
                equal(value.runtime, childRuntime.identity); equal(value.parent_runtime, selfRuntime.identity); boundary();
                equal(value.configuration, configuration, "child effective environment differs");
                const record = { schema: "void_nimo_fresh_sync_record_v1", nonce, plan_sha256: expected,
                  source: { head: plan.head, tree: plan.tree }, build: binding, runtime_sha256: plan.runtime_sha256,
                  parent, child: childIdentity, data, starting_entries: 0, configuration, manifest: target,
                  executed_runtime: { parent: selfRuntime.identity, child: childRuntime.identity } };
                recordHash = publish(root, RECORD, record, boundary);
                child.send({ schema: "void_nimo_fresh_sync_grant_v1", nonce, record_sha256: recordHash }, error => { if (error) finish(error); });
              } else if (value.type === "admitted") {
                assert(recordHash && value.nonce === nonce && value.record_sha256 === recordHash && !admitted);
                boundary(); admitted = true; finish();
              } else assert.fail("invalid session message");
            } catch (error) { finish(error); }
          };
          child.on("message", message); child.once("exit", failed); child.once("error", failed);
        });
        const observation = { ...await observer.observe(child), executed_runtime: { parent: selfRuntime.identity, child: childRuntime.identity } };
        boundary(); equal(build(root, plan), binding);
        equal(observation.node_process.pid, childIdentity.pid); equal(observation.node_process.start_ticks, childIdentity.start_ticks);
        assert.equal(observation.bootstrap_manifest_sha256, target.sha256);
        assert.equal(observation.bootstrap_manifest_id, target.manifest_id);
        assert.equal(observation.observations.length, 3);
        const heads = observation.observations.map(x => x.head); assert(heads.every(h => h === heads[0] && h >= target.target_head));
        const terminal = { marker: "VOID_NIMO_FRESH_SYNC_SESSION_V1_GREEN", nonce, record_sha256: recordHash,
          source: { head: plan.head, tree: plan.tree }, configuration_sha256: configuration.sha256,
          child: childIdentity, data, manifest: target, observed_heads: heads, executed_runtime: observation.executed_runtime,
          observation_sha256: sha256(canonical(observation)), observation,
          closed_initial_environment: true, fresh_data_root_at_start: true, cooperative_session_bound: true,
          actual_external_join_proven: false, public_onboarding_accepted: false };
        boundary(); publish(root, `${SESSION_DIR}/terminal.json`, terminal, boundary); return terminal;
      } finally { invalidate(); }
    },
  });
}
export async function admitNimoFreshSyncChildV1(processObject, root, entry) {
  assert.equal(processObject.execArgv.length, 0); assert(processObject.connected);
  assert.equal(path.resolve(entry), path.join(root, "dist/index.js")); absentEnvFile(root);
  const selfRuntime = retainExecutedRuntimeV1(processObject.pid, processObject.version); let parentRuntime;
  const releaseRuntime = () => { selfRuntime.close(); parentRuntime?.close(); };
  try {
  const plan = readPlan(root, processObject.env[FRESH_OPTION]); build(root, plan);
  equal(selfRuntime.identity, plan.runtime, "child executed runtime differs from plan");
  parentRuntime = retainExecutedRuntimeV1(processObject.ppid, plan.runtime.version); equal(parentRuntime.identity, plan.runtime);
  const configuration = configurationDigest(processObject.env), nonce = processObject.env[NONCE];
  assert(/^[0-9a-f]{32}$/.test(nonce || ""));
  const grant = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("session grant deadline")), 30000);
    const finish = (error, value) => { clearTimeout(timer); processObject.removeListener("message", onMessage); error ? reject(error) : resolve(value); };
    const onMessage = value => { if (value?.schema === "void_nimo_fresh_sync_grant_v1") finish(null, value); };
    processObject.on("message", onMessage);
    processObject.send({ schema: "void_nimo_fresh_sync_child_v1", type: "ready", configuration,
      runtime: selfRuntime.identity, parent_runtime: parentRuntime.identity }, error => { if (error) finish(error); });
  });
  keys(grant, ["schema", "nonce", "record_sha256"]); assert.equal(grant.nonce, nonce); hash(grant.record_sha256);
  const bytes = readRegular(root, RECORD, 1024 * 1024); assert.equal(sha256(bytes), grant.record_sha256); const record = object(bytes);
  assert.equal(record.schema, "void_nimo_fresh_sync_record_v1"); assert.equal(record.nonce, nonce);
  selfRuntime.check(); parentRuntime.check();
  equal(record.executed_runtime, { parent: parentRuntime.identity, child: selfRuntime.identity });
  equal(record.configuration, configuration); equal(record.child, identity(processObject.pid)); equal(record.parent, identity(processObject.ppid));
  equal(record.data, rootIdentity(plan.data_root)); equal(record.manifest, manifest(root, plan.manifest_sha256));
  const fd = fs.openSync(plan.data_root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try { empty(fd); } finally { fs.closeSync(fd); }
  equal(record.build, build(root, plan)); assert.equal(record.plan_sha256, processObject.env[FRESH_OPTION]);
  // Complete initial environment and its absent-key complement stay closed.
  const values = Object.freeze({ ...processObject.env });
  const protectedEnv = new Proxy(processObject.env, {
    set(target, key, value) { assert(Object.hasOwn(values, key) && value === values[key], "effective configuration changed"); return Reflect.set(target, key, value); },
    deleteProperty() { assert.fail("effective configuration deleted"); },
    defineProperty() { assert.fail("effective configuration redefined"); },
  });
  Object.defineProperty(processObject, "env", { value: protectedEnv, configurable: false, writable: false });
  const end = value => { if (value?.schema === "void_nimo_fresh_sync_end_v1" && value.nonce === nonce) {
    releaseRuntime(); processObject.removeListener("message", end);
  } };
  processObject.on("message", end); processObject.once("exit", releaseRuntime);
  selfRuntime.check(); parentRuntime.check();
  await new Promise((resolve, reject) => processObject.send({ schema: "void_nimo_fresh_sync_child_v1", type: "admitted", nonce,
    record_sha256: grant.record_sha256 }, error => error ? reject(error) : resolve()));
  } catch (error) { releaseRuntime(); throw error; }
}
