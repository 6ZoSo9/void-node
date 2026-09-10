// Cooperative startup admission. No node code, environment file or key is read.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { retainExecutedRuntimeV1, checkedSelfRuntimeV1 } from "./void_nimo_executed_runtime_v1.mjs";

export const BUILD_OPTION = "VOID_NIMO_BUILD_RECEIPT_SHA256_V1";
export const RECEIPT_PATH = ".runtime/nimo-build-admission-v1.json";
export const RECIPE = "tsc -p tsconfig.build.json && node scripts/copy_void_runtime_js_v1.mjs && node scripts/retire_saveblock_periodic_rewriters_v1.mjs";
export const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const MAX_FILE = 32 * 1024 * 1024, MAX_TOTAL = 512 * 1024 * 1024, MAX_FILES = 32768;
const equal = (a, b, label) => assert.equal(canonical(a), canonical(b), label);
const inside = (root, file) => file.startsWith(root + path.sep);
function realChain(root, relative) {
  assert(typeof relative === "string" && relative.length <= 512 && !relative.includes("\\") && !relative.includes("\0"));
  const parts = relative.split("/"); assert(parts.every(p => p && p !== "." && p !== ".."));
  let current = root;
  for (const part of parts) { current = path.join(current, part); assert(!fs.lstatSync(current).isSymbolicLink(), "symlink path rejected"); }
  return current;
}
export function readRegular(root, relative, maximum = MAX_FILE) {
  const file = realChain(root, relative), fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd); assert(before.isFile() && before.nlink === 1 && before.size <= maximum, "regular bounded file required");
    const bytes = Buffer.alloc(before.size); let used = 0;
    for (let reads = 0; reads < 4096 && used < bytes.length; reads++) {
      const n = fs.readSync(fd, bytes, used, Math.min(65536, bytes.length - used), null); assert(n > 0); used += n;
    }
    assert.equal(used, before.size); const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) assert.equal(before[key], after[key], "file changed during read");
    return bytes;
  } finally { fs.closeSync(fd); }
}
export function git(root, ...args) {
  const r = spawnSync("/usr/bin/git", ["--no-replace-objects", ...args], { cwd: root, timeout: 20000, maxBuffer: 16 * 1024 * 1024,
    env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" } });
  assert.equal(r.status, 0, "source inspection failed"); return r.stdout;
}
export function sourceIdentity(root) {
  const head = git(root, "rev-parse", "HEAD").toString().trim(), tree = git(root, "rev-parse", "HEAD^{tree}").toString().trim();
  assert(/^[0-9a-f]{40}$/.test(head) && /^[0-9a-f]{40}$/.test(tree));
  const entries = git(root, "ls-tree", "-rz", "--full-tree", "HEAD").toString().split("\0").filter(Boolean);
  assert(entries.length <= 65536); let total = 0;
  const members = [];
  for (const row of entries) {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/.exec(row);
    const name = row.slice(row.indexOf("\t") + 1);
    // Entire compiler input tree, recipe/config/lock and repository JS/MJS/CJS
    // helpers; data/config files read later at runtime are a separate boundary.
    if (!(name.startsWith("src/") || /\.(?:mjs|cjs|js)$/.test(name) ||
      ["package.json", "package-lock.json", "tsconfig.build.json", ".github/workflows/void-nimo-build-admission-v1.yml"].includes(name))) continue;
    assert(match, "source mode rejected"); const bytes = readRegular(root, name); total += bytes.length; assert(total <= MAX_TOTAL);
    const blob = crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"); assert.equal(blob, match[2], "uncommitted build source");
    members.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) }); assert(members.length <= MAX_FILES);
  }
  assert(members.some(m => m.path === "src/index.ts"));
  equal(inventory(root, "src").members.map(m => m.path), members.filter(m => m.path.startsWith("src/")).map(m => m.path).sort(), "untracked compiler input");
  return { head, tree, members, aggregate_sha256: sha256(canonical(members)) };
}
export function inventory(root, directory) {
  const base = realChain(root, directory); assert(fs.statSync(base).isDirectory());
  const records = []; let total = 0, entries = 0;
  const walk = (relative, depth) => {
    assert(depth <= 32); const dir = fs.opendirSync(path.join(root, relative));
    try {
      for (let item; (item = dir.readSync()) !== null;) {
        assert(++entries <= MAX_FILES); const name = `${relative}/${item.name}`; assert(name.length <= 512);
        const file = path.join(root, name), stat = fs.lstatSync(file);
        if (stat.isSymbolicLink()) {
          assert(directory === "node_modules", "output symlink rejected"); const target = fs.readlinkSync(file);
          assert(!path.isAbsolute(target) && target.length <= 512 && inside(base, path.resolve(path.dirname(file), target)) && inside(base, fs.realpathSync(file)), "dependency link escapes inventory");
          records.push({ path: name, type: "link", target });
        } else if (stat.isDirectory()) walk(name, depth + 1);
        else {
          assert(stat.isFile() && stat.nlink === 1 && stat.size <= MAX_FILE); total += stat.size; assert(total <= MAX_TOTAL);
          const bytes = readRegular(root, name); records.push({ path: name, type: "file", bytes: bytes.length, sha256: sha256(bytes) });
        }
      }
    } finally { dir.closeSync(); }
  };
  walk(directory, 0); records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  assert(records.length > 0 && records.length <= MAX_FILES);
  return { members: records, bytes: total, aggregate_sha256: sha256(canonical(records)) };
}
export function runtimeIdentity() {
  const held = retainExecutedRuntimeV1();
  try { held.check(); return held.identity; } finally { held.close(); }
}
export function readBuildReceipt(root, file, expected) {
  assert(typeof expected === "string" && /^[0-9a-f]{64}$/.test(expected), "expected receipt digest required");
  assert.equal(root, fs.realpathSync(root));
  const raw = readRegular(root, file, 16 * 1024 * 1024); assert.equal(sha256(raw), expected, "receipt digest mismatch");
  const receipt = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  assert.equal(raw.toString(), canonical(receipt) + "\n", "noncanonical receipt");
  equal(Object.keys(receipt).sort(), ["actual_void_node_started", "build_recipe", "dependencies", "dist", "generation", "public_onboarding_accepted", "runtime", "schema", "source"].sort(), "receipt schema");
  assert.equal(receipt.schema, "void_nimo_build_admission_v1"); assert.equal(receipt.build_recipe, RECIPE);
  equal(Object.keys(receipt.runtime).sort(), ["bytes", "dev", "ino", "sha256", "version"], "executed runtime schema");
  for (const k of ["bytes", "dev", "ino"]) assert(Number.isSafeInteger(receipt.runtime[k]) && receipt.runtime[k] > 0);
  assert(receipt.runtime.bytes <= 256 * 1024 * 1024 && /^v(?:22|24|26)\.[0-9]+\.[0-9]+$/.test(receipt.runtime.version));
  assert(/^[0-9a-f]{64}$/.test(receipt.runtime.sha256));
  assert(/^[A-Za-z0-9-]{1,80}$/.test(receipt.generation)); assert.equal(receipt.actual_void_node_started, false); assert.equal(receipt.public_onboarding_accepted, false);
  for (const [directory, tree] of [["dist", receipt.dist], ["node_modules", receipt.dependencies]]) {
    equal(Object.keys(tree).sort(), ["aggregate_sha256", "bytes", "members"], "inventory schema");
    assert(Array.isArray(tree.members) && tree.members.length > 0 && tree.members.length <= MAX_FILES); let previous = "", total = 0;
    for (const member of tree.members) {
      assert(typeof member.path === "string" && member.path.startsWith(directory + "/") && member.path.length <= 512 && member.path > previous);
      assert(member.path.split("/").every(p => p && p !== "." && p !== "..")); previous = member.path;
      if (member.type === "file") {
        equal(Object.keys(member).sort(), ["bytes", "path", "sha256", "type"], "file schema");
        assert(Number.isSafeInteger(member.bytes) && member.bytes >= 0 && member.bytes <= MAX_FILE); total += member.bytes;
        assert(/^[0-9a-f]{64}$/.test(member.sha256));
      } else {
        equal(Object.keys(member).sort(), ["path", "target", "type"], "link schema");
        assert(directory === "node_modules" && member.type === "link" && typeof member.target === "string" && member.target.length <= 512 && !path.isAbsolute(member.target));
      }
    }
    assert(total <= MAX_TOTAL && total === tree.bytes); assert.equal(tree.aggregate_sha256, sha256(canonical(tree.members)));
  }
  return receipt;
}
export function verifyBuildReceipt(root, file, expected, retainedRuntime = null) {
  const receipt = readBuildReceipt(root, file, expected);
  equal(receipt.source, sourceIdentity(root), "source generation changed");
  equal(receipt.runtime, retainedRuntime === null ? runtimeIdentity() : checkedSelfRuntimeV1(retainedRuntime), "runtime changed");
  equal(receipt.dist, inventory(root, "dist"), "compiled output changed"); equal(receipt.dependencies, inventory(root, "node_modules"), "dependencies changed");
  assert(receipt.dist.members.some(x => x.path === "dist/index.js" && x.type === "file"));
  if (retainedRuntime !== null) checkedSelfRuntimeV1(retainedRuntime);
  return { receipt_sha256: expected, head: receipt.source.head, dist_sha256: receipt.dist.aggregate_sha256,
    dependencies_sha256: receipt.dependencies.aggregate_sha256, source_sha256: receipt.source.aggregate_sha256, runtime: receipt.runtime };
}
const NUMERIC = Object.freeze({
  VOID_FOLLOWER_AUTOSTART_INTERVAL_MS: [1000, 500, 60000], VOID_FOLLOWER_CATCHUP_INTERVAL_MS: [250, 50, 10000],
  VOID_FOLLOWER_CATCHUP_PULL_LIMIT: [999, 1, 999], VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS: [30000, 1000, 120000],
});
export function followerSettings(environment) {
  const result = { HTTP_PORT: "4100", VOID_HTTP_PORT: "4100", PORT: "4100", P2P_PORT: "4700", VOID_P2P_PORT: "4700" };
  for (const [key, expected] of Object.entries(result)) assert(!Object.hasOwn(environment, key) || environment[key] === expected, "port setting rejected");
  for (const [key, [fallback, min, max]] of Object.entries(NUMERIC)) {
    const value = Object.hasOwn(environment, key) ? environment[key] : String(fallback);
    assert(typeof value === "string" && /^[1-9][0-9]{0,5}$/.test(value) && Number(value) >= min && Number(value) <= max, "noncanonical follower setting"); result[key] = value;
  }
  const origin = environment.VOID_FOLLOWER_AUTOSTART_PEERS;
  assert(typeof origin === "string" && /^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(origin) && Number(new URL(origin).port) <= 65535, "derived adapter origin required");
  assert(environment.VOID_FOLLOWER_AUTOSTART_PEER === origin, "adapter origin mismatch");
  assert(environment.VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE === "1", "adapter activation required");
  Object.assign(result, { VOID_FOLLOWER_AUTOSTART_PEERS: origin, VOID_FOLLOWER_AUTOSTART_PEER: origin,
    VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE: "1", VOID_FOLLOWER_PULL_LIMIT: result.VOID_FOLLOWER_CATCHUP_PULL_LIMIT });
  assert(!Object.hasOwn(environment, "VOID_FOLLOWER_PULL_LIMIT") || environment.VOID_FOLLOWER_PULL_LIMIT === result.VOID_FOLLOWER_PULL_LIMIT, "pull limit mismatch");
  return Object.freeze(result);
}
export function protectFollowerSettings(environment, settings) {
  // Only this public subset is inspected. Unknown keys/values are never copied
  // into receipts. This is cooperative enforcement, not a hostile-JS sandbox.
  for (const [key, value] of Object.entries(settings)) environment[key] = value;
  return new Proxy(environment, {
    set(target, key, value) { assert(!Object.hasOwn(settings, key) || value === settings[key], "protected follower setting changed"); return Reflect.set(target, key, value); },
    deleteProperty(target, key) { assert(!Object.hasOwn(settings, key), "protected follower setting deleted"); return Reflect.deleteProperty(target, key); },
    defineProperty(target, key, descriptor) { assert(!Object.hasOwn(settings, key), "protected follower descriptor changed"); return Reflect.defineProperty(target, key, descriptor); },
  });
}
export function admitBoundChild(processObject, root, entry) {
  assert.equal(processObject.execArgv.length, 0, "plain child startup required");
  assert.equal(path.resolve(entry), path.join(root, "dist/index.js"), "canonical built entry required");
  for (const key of ["NODE_OPTIONS", "LD_PRELOAD", "LD_LIBRARY_PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"])
    assert(!Object.hasOwn(processObject.env, key), "loader or proxy input rejected");
  // Presence only: do not read a potentially credential-bearing environment file.
  try { fs.lstatSync(path.join(root, ".env")); assert.fail("ambient .env rejected"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const settings = followerSettings(processObject.env);
  const binding = verifyBuildReceipt(root, RECEIPT_PATH, processObject.env[BUILD_OPTION]);
  const protectedEnvironment = protectFollowerSettings(processObject.env, settings);
  Object.defineProperty(processObject, "env", { value: protectedEnvironment, writable: false, configurable: false });
  return { schema: "void_nimo_build_startup_admission_v1", ...binding, selected_follower_settings: settings,
    build_inventory_matched_at_start: true, selected_follower_settings_enforced: true,
    full_runtime_configuration_bound: false, continuous_code_custody_bound: false, runtime_session_bound: false, public_onboarding_accepted: false };
}
