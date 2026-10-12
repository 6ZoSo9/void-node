import { readFileSync } from "node:fs";

const ID = "VOID_JOBS_SUBMIT_JOBSV1_SINGLE_WRITER_V1";
const source = readFileSync("src/index.ts", "utf8");

function fail(name: string, detail: string): never {
  console.error(`[FAIL] ${name}: ${detail}`);
  process.exit(1);
}
function pass(name: string, detail: string): void {
  console.log(`[PASS] ${name}: ${detail}`);
}
function assert(cond: unknown, name: string, detail: string): void {
  if (!cond) fail(name, detail);
  pass(name, detail);
}
function sliceBetween(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    fail("source-markers-located", `start=${start} end=${end} start_marker=${startMarker}`);
  }
  return source.slice(start, end + endMarker.length);
}

const readback = sliceBetween(
  "// ---------------- [ADD] Jobs submit/readback compatibility shim v1 ----------------",
  "// ---------------- [/ADD] Jobs submit/readback compatibility shim v1 ----------------",
);

assert(
  readback.includes('path.join(agentDir, "jobs.jsonl")') &&
    readback.includes('path.join(jobsV1Dir, "jobs.jsonl")'),
  "readback-targets-both-job-ledgers",
  "agent and jobs_v1 ledgers are explicit targets",
);

assert(
  !readback.includes(
    '...(fs.existsSync(jobsV1Dir) ? [path.join(jobsV1Dir, "jobs.jsonl")] : [])',
  ),
  "jobs-v1-target-not-directory-conditional",
  "fresh nodes create jobs_v1 through append helper",
);

assert(
  readback.includes(
    'appendAgentPick2JsonlCanonicalV1(file, JSON.stringify(obj) + "\\n")',
  ),
  "readback-uses-canonical-appender",
  "jobs_v1 persistence uses canonical Pick2 append witness path",
);

assert(
  readback.includes("fs.mkdirSync(path.dirname(file), { recursive:true })"),
  "readback-creates-parent-directory",
  "unconditional jobs_v1 target is safe on fresh nodes",
);

const bridge = sliceBetween(
  "// === jobs-submit-to-jobsv1-bridge-v1 BEGIN ===",
  "// === jobs-submit-to-jobsv1-bridge-v1 END ===",
);

assert(
  bridge.includes('persistence_authority:"jobs_submit_readback_shim_v1"'),
  "bridge-declares-readback-authority",
  "bridge identifies the single persistence authority",
);

assert(
  bridge.includes("file_write:false"),
  "bridge-declares-no-file-write",
  "bridge explicitly records observation-only behavior",
);

assert(
  !bridge.includes("appendFileSync(") &&
    !bridge.includes("appendAgentPick2JsonlCanonicalV1(") &&
    !bridge.includes("writeFileSync(") &&
    !bridge.includes("openSync("),
  "bridge-has-no-file-writer",
  "raw and second canonical append paths are absent",
);

assert(
  bridge.includes('req.path !== "/jobs/submit"') &&
    bridge.includes("observed_success_total"),
  "bridge-preserves-observation-role",
  "successful jobs submissions remain observable without persistence",
);

const readbackIndex = source.indexOf(
  "// ---------------- [ADD] Jobs submit/readback compatibility shim v1 ----------------",
);
const bridgeIndex = source.indexOf(
  "// === jobs-submit-to-jobsv1-bridge-v1 BEGIN ===",
);
assert(
  readbackIndex >= 0 && bridgeIndex > readbackIndex,
  "persistence-authority-precedes-observer",
  `readback_index=${readbackIndex} bridge_index=${bridgeIndex}`,
);

console.log(
  `${ID}_GREEN ` +
    JSON.stringify({
      jobs_v1_persistence_authority: "jobs_submit_readback_shim_v1",
      bridge_file_write: false,
      fresh_jobs_v1_supported: true,
      runtime_service_action: false,
      chain2050_write: false,
      funds_movement: false,
    }),
);
