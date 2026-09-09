// Independent controller/verifier utilities. No production validation imports.
import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
export const PREDECESSOR = "c24d0d8bbc4b50ced616b697fe2dbade8f0f0117";
export const SOURCE_PATHS = ["scripts/run_void_public_bootstrap_supervisor_v1.mjs", "scripts/run_void_public_bootstrap_child_v1.mjs",
  "scripts/lib/void_nimo_node_process_observation_v1.mjs", "scripts/prove_void_nimo_node_process_observation_v1.mjs",
  "scripts/prove_void_nimo_supervisor_loss_v1.mjs", "scripts/verify_void_nimo_supervisor_loss_v1.mjs",
  "scripts/lib/void_nimo_supervisor_loss_census_v1.mjs", "scripts/fixtures/nimo-supervisor-loss-v1/parent.mjs",
  "scripts/fixtures/nimo-supervisor-loss-v1/adapter.mjs", "scripts/fixtures/nimo-supervisor-loss-v1/node.mjs",
  ".github/workflows/void-nimo-no-tailnet-acceptance-v1.yml", "docs/operations/void-nimo-no-tailnet-onboarding-v1.md"];
export const PROFILE_PATHS = ["scripts/run_void_public_bootstrap_supervisor_v1.mjs", "scripts/lib/void_nimo_node_process_observation_v1.mjs",
  "tools/void-nimo-no-tailnet-acceptance-v1.mjs", "scripts/lib/void_public_seed_common_v1.mjs", "public/bootstrap/v1.json"];
export const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v);
export const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
export function boundedRead(file, maximum) {
  const fd = fs.openSync(file, "r");
  try {
    const bytes = Buffer.alloc(maximum + 1); let used = 0;
    for (let reads = 0; reads < 128; reads++) {
      const n = fs.readSync(fd, bytes, used, bytes.length - used, null);
      if (!n) return bytes.subarray(0, used);
      used += n; assert(used <= maximum, "census byte ceiling");
    }
    assert.fail("census read ceiling");
  } finally { fs.closeSync(fd); }
}
function statIdentity(pid, expectedStart) {
  let stat;
  try { stat = boundedRead(`/proc/${pid}/stat`, 4096).toString(); }
  catch (error) { if (error.code === "ENOENT") return { pid, alive: false, absent: true }; throw error; }
  const fields = stat.slice(stat.lastIndexOf(") ") + 2).trim().split(/\s+/);
  const base = { pid, parent_pid: Number(fields[1]), start_ticks: fields[19], state: fields[0] };
  if (expectedStart !== null && fields[19] !== expectedStart) return { ...base, alive: false, replaced: true };
  if (["Z", "X"].includes(fields[0])) return { ...base, alive: false, zombie: true };
  return { ...base, alive: true };
}
export function processCensus(pid, expectedStart = null) {
  assert(Number.isInteger(pid) && pid > 0);
  const base = statIdentity(pid, expectedStart); if (!base.alive) return base;
  try {
    const argv = boundedRead(`/proc/${pid}/cmdline`, 16384).toString().split("\0").slice(0, -1);
    const exe = fs.statSync(`/proc/${pid}/exe`), executable = { path: fs.realpathSync(`/proc/${pid}/exe`), dev: exe.dev, ino: exe.ino };
    const descriptors = [], directory = fs.opendirSync(`/proc/${pid}/fd`);
    try {
      for (let n = 0; n <= 4096; n++) {
        const entry = directory.readSync(); if (!entry) break;
        assert(n < 4096); if (!/^[0-9]+$/.test(entry.name)) continue;
        try {
          const item = fs.statSync(`/proc/${pid}/fd/${entry.name}`);
          const info = boundedRead(`/proc/${pid}/fdinfo/${entry.name}`, 4096).toString();
          const flags = /^flags:\s+([0-7]+)$/m.exec(info)?.[1]; assert(flags);
          descriptors.push({ fd: Number(entry.name), dev: item.dev, ino: item.ino, flags,
            kind: item.isSocket() ? "socket" : item.isDirectory() ? "directory" : item.isFile() ? "file" : "other" });
        } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
    } finally { directory.closeSync(); }
    const owned = new Set(descriptors.filter(d => d.kind === "socket").map(d => String(d.ino))), sockets = [];
    for (const family of ["tcp", "tcp6"]) {
      const lines = boundedRead(`/proc/${pid}/net/${family}`, 256 * 1024).toString().split("\n"); assert(lines.length <= 4096);
      for (const line of lines.slice(1).filter(Boolean)) {
        const row = line.trim().split(/\s+/); assert(row.length >= 10);
        if (owned.has(row[9])) sockets.push({ family, local: row[1], remote: row[2], state: row[3], inode: row[9] });
      }
    }
    const after = statIdentity(pid, base.start_ticks); if (!after.alive) return after;
    return { ...base, argv, executable, descriptors: descriptors.sort((a, b) => a.fd - b.fd), sockets };
  } catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error;
    const after = statIdentity(pid, base.start_ticks); assert(!after.alive, "unstable live census"); return after;
  }
}
export function artifactRead(file, limit = 256 * 1024) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const before = fs.fstatSync(fd); assert(before.isFile() && before.nlink === 1 && before.size > 0 && before.size <= limit);
    const bytes = Buffer.alloc(before.size); let used = 0;
    for (let n = 0; n < 128 && used < bytes.length; n++) used += fs.readSync(fd, bytes, used, bytes.length - used, null);
    assert.equal(used, bytes.length); const after = fs.fstatSync(fd);
    for (const key of ["dev", "ino", "size", "mtimeMs", "ctimeMs"]) assert.equal(before[key], after[key]);
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    assert(bytes.equals(Buffer.from(canonical(value) + "\n")));
    return { value, sha256: sha256(bytes), bytes: bytes.length };
  } finally { fs.closeSync(fd); }
}
