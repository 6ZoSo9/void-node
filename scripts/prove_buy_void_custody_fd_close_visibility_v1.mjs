#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITER = "src/economic/buy_void_custody_launch_high_water_writer_v1.mjs";
const EXPECTED_WRITER_GIT_BLOB = "8d44f6651b9210f7cb1a5ac3f895ce18d0890fb5";
const text = fs.readFileSync(path.join(ROOT, WRITER), "utf8");
const bytes = Buffer.from(text);
const blob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.length + "\0"))
  .update(bytes).digest("hex");
assert.equal(blob, EXPECTED_WRITER_GIT_BLOB, "source identity must be exact");

const emptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/gu;
assert.equal([...text.matchAll(emptyCatch)].length, 0, "no raw empty catches");
const stages = [
  "open_directory_cleanup",
  "close_pinned_directory",
  "temp_write_cleanup",
];
for (const stage of stages) {
  const occurrence = 'recordFdCloseFailureV1("' + stage + '")';
  assert.equal(text.split(occurrence).length - 1, 1,
    "exactly one visible close-failure stage: " + stage);
}
const begin = text.indexOf("function recordFdCloseFailureV1(");
const end = text.indexOf("\nfunction assertPinnedVisible(", begin);
assert.ok(begin > 0 && end > begin, "source-exact close helper and closePinned");
assert.equal(text.indexOf("function recordFdCloseFailureV1(", begin + 1), -1);
const exactProductionBody = text.slice(begin, end);
const reports = [];
let injectFailure = false;
let closed = [];
const context = {
  fs: {
    closeSync(fd) {
      closed.push(fd);
      if (injectFailure) throw Object.assign(new Error("synthetic close error"),
        { code: "EBADF" });
    },
  },
  process: {
    stderr: {
      write(value) { reports.push(String(value)); return true; },
    },
  },
};
const closePinned = vm.runInNewContext(
  exactProductionBody + "\nclosePinned", context, { timeout: 1000 });
assert.equal(typeof closePinned, "function");

assert.equal(closePinned({ fd: 47 }), undefined);
assert.deepEqual(closed, [47]);
assert.deepEqual(reports, []);

injectFailure = true;
assert.equal(closePinned({ fd: 48 }), undefined,
  "best-effort close cannot overwrite prior mutation truth");
assert.deepEqual(closed, [47, 48]);
assert.deepEqual(reports, [
  "VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_FD_CLOSE_FAILURE_V1 stage=close_pinned_directory\n",
]);
assert.ok(!reports[0].includes("synthetic close error"),
  "diagnostic must not leak error details or customer paths");
assert.ok(!reports[0].includes("EBADF"),
  "diagnostic has fixed path-free content only");

console.log("VOID_BUY_VOID_CUSTODY_FD_CLOSE_VISIBILITY_V1_GREEN");
console.log("source_git_blob_verified=true");
console.log("all_three_close_failure_stages_visible=true");
console.log("raw_empty_catch_count=0");
console.log("healthy_fd_close_emits_no_warning=true");
console.log("failed_fd_close_emits_fixed_diagnostic=true");
console.log("close_failure_does_not_override_prior_mutation_truth=true");
console.log("real_custody_files_accessed=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_movement=false");
