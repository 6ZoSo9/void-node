// Linux cooperative executed-byte custody. No pathname can replace this FD.
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

export function retainExecutedRuntimeV1(pid = process.pid, version = process.version) {
  assert.equal(process.platform, "linux");
  assert(Number.isSafeInteger(pid) && pid > 0 && /^v(?:22|24|26)\.[0-9]+\.[0-9]+$/.test(version));
  const self = fs.readFileSync("/proc/self/stat", "utf8");
  assert(self.length <= 4096 && self.startsWith(`${process.pid} `), "matching procfs namespace required");
  const proc = pid === process.pid ? "/proc/self" : `/proc/${pid}`;
  const processStart = () => {
    const raw = fs.readFileSync(`${proc}/stat`, "utf8");
    assert(raw.length <= 4096 && raw.startsWith(`${pid} `));
    const fields = raw.slice(raw.lastIndexOf(") ") + 2).trim().split(/\s+/);
    assert(!["Z", "X"].includes(fields[0])); return fields[19];
  };
  const start = processStart(), fd = fs.openSync(`${proc}/exe`, fs.constants.O_RDONLY);
  let closed = false;
  const close = () => { if (!closed) { closed = true; fs.closeSync(fd); } };
  try {
    const before = fs.fstatSync(fd, { bigint: true });
    assert(before.isFile() && before.size > 0n && before.size <= 256n * 1024n * 1024n);
    const check = () => {
      assert(!closed, "executed runtime capability closed"); assert.equal(processStart(), start, "runtime process replaced");
      const held = fs.fstatSync(fd, { bigint: true }), running = fs.statSync(`${proc}/exe`, { bigint: true });
      for (const key of ["dev", "ino", "size", "mtimeNs", "ctimeNs", "nlink"]) {
        assert.equal(held[key], before[key], "retained executed runtime changed");
        assert.equal(running[key], before[key], "executed runtime generation changed");
      }
    };
    const buffer = Buffer.alloc(65536), hash = crypto.createHash("sha256"); let used = 0;
    for (let count = 0; count <= 4096; count++) {
      const n = fs.readSync(fd, buffer, 0, buffer.length, used); if (!n) break;
      used += n; assert(used <= Number(before.size)); hash.update(buffer.subarray(0, n));
    }
    assert.equal(used, Number(before.size)); check();
    const identity = Object.freeze({ version, dev: Number(before.dev), ino: Number(before.ino), bytes: used, sha256: hash.digest("hex") });
    assert(Number.isSafeInteger(identity.dev) && Number.isSafeInteger(identity.ino));
    return Object.freeze({ identity, check, close });
  } catch (error) { close(); throw error; }
}
