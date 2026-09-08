// @ts-nocheck
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  AgentPick2JsonlSemanticIndexV1,
  appendAgentPick2JsonlCanonicalV1,
} from "../src/http/agent_pick2_jsonl_semantic_index_v1.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-agent-v0-legacy-fullscan-v1-"));
const jobs = path.join(root, "jobs.jsonl");
const results = path.join(root, "results.jsonl");
const leases = path.join(root, "leases.jsonl");
const receipts = path.join(root, "receipts.jsonl");

function writeLine(file:string, value:any){
  fs.appendFileSync(file, JSON.stringify(value) + "\n");
}
function canonicalLine(file:string, value:any){
  const line = JSON.stringify(value) + "\n";
  appendAgentPick2JsonlCanonicalV1(file, line, { durable:true });
  return Buffer.byteLength(line);
}
function bytes(io:any){ return Number(io?.bytes_read_total || 0); }
function kindBytes(io:any, kind:string){ return Number(io?.by_kind?.[kind]?.bytes_read || 0); }

try {
  const pad = "x".repeat(960);
  const fd = fs.openSync(jobs, "w");
  try {
    for (let i=0; i<30000; i++) {
      const id = `job-${String(i).padStart(6,"0")}`;
      fs.writeSync(fd, JSON.stringify({id, input:{pad}, inputHash:`hash-${i}`, ts:i, status:"queued"}) + "\n");
    }
    fs.writeSync(fd, JSON.stringify({id:"job-000010", input:{pad:"latest"}, inputHash:"hash-latest", ts:40000, status:"queued"}) + "\n");
  } finally { fs.closeSync(fd); }
  writeLine(leases, {id:"job-000000", worker:"legacy", ts:1});
  writeLine(results, {id:"job-000001", output:{ok:true}, ts:2});
  writeLine(results, {id:"result-latest", output:{version:1}, ts:3});
  writeLine(results, {id:"result-latest", output:{version:2}, ts:4});
  writeLine(receipts, {id:"receipt-1", status:"completed", ts:5});

  const countNonEmpty = (file:string) =>
    fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length;
  const jobsSize = fs.statSync(jobs).size;
  assert.ok(jobsSize >= 28 * 1024 * 1024, `fixture too small: ${jobsSize}`);

  const index = new AgentPick2JsonlSemanticIndexV1({chunkBytes: 64 * 1024});
  const warm = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
  assert.equal(warm.queuedIds[0], "job-000002");
  assert.equal(warm.latestById.get("job-000010")?.inputHash, "hash-latest");
  assert.ok(kindBytes(warm.io, "legacy_agent_v0_jobs_rebuild") >= jobsSize);

  const warmResult = index.legacyAgentV0ResultSnapshotV1({resultsFile:results});
  assert.equal(warmResult.latestById.get("result-latest")?.output?.version, 2);
  assert.equal(warmResult.rowCount, countNonEmpty(results));

  const warmMetrics = index.legacyAgentV0MetricsSnapshotV1({
    jobsFile:jobs,
    resultsFile:results,
    receiptsFile:receipts,
  });
  assert.equal(warmMetrics.rowCounts.jobs, countNonEmpty(jobs));
  assert.equal(warmMetrics.rowCounts.results, countNonEmpty(results));
  assert.equal(warmMetrics.rowCounts.receipts, countNonEmpty(receipts));
  const warmBytes = bytes(warmMetrics.io);

  for (let i=0; i<25; i++) {
    const snap = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
    const resultSnap = index.legacyAgentV0ResultSnapshotV1({resultsFile:results});
    const metricsSnap = index.legacyAgentV0MetricsSnapshotV1({
      jobsFile:jobs,
      resultsFile:results,
      receiptsFile:receipts,
    });
    assert.equal(bytes(snap.io), warmBytes, "cache-only snapshots reread historical bytes");
    assert.equal(bytes(resultSnap.io), warmBytes, "result snapshot reread historical bytes");
    assert.equal(bytes(metricsSnap.io), warmBytes, "metrics snapshot reread historical bytes");
  }

  let expectedDelta = 0;
  expectedDelta += canonicalLine(jobs, {id:"job-new", input:{msg:"new"}, inputHash:"new-hash", ts:50000, status:"queued"});
  expectedDelta += canonicalLine(leases, {id:"job-000002", worker:"legacy", ts:50001});
  expectedDelta += canonicalLine(results, {id:"job-000003", output:{ok:true}, ts:50002});
  const afterAppend = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
  assert.equal(bytes(afterAppend.io) - warmBytes, expectedDelta, "witnessed append refresh read more than appended deltas");
  assert.equal(afterAppend.latestById.get("job-new")?.inputHash, "new-hash");
  const afterAppendResult = index.legacyAgentV0ResultSnapshotV1({resultsFile:results});
  assert.equal(afterAppendResult.latestById.get("job-000003")?.output?.ok, true);
  const afterAppendMetrics = index.legacyAgentV0MetricsSnapshotV1({
    jobsFile:jobs,
    resultsFile:results,
    receiptsFile:receipts,
  });
  assert.equal(afterAppendMetrics.rowCounts.jobs, countNonEmpty(jobs));
  assert.equal(afterAppendMetrics.rowCounts.results, countNonEmpty(results));
  assert.equal(afterAppendMetrics.rowCounts.receipts, countNonEmpty(receipts));
  assert.equal(bytes(afterAppendResult.io), bytes(afterAppend.io));
  assert.equal(bytes(afterAppendMetrics.io), bytes(afterAppend.io));
  assert.ok(!afterAppend.queuedIds.includes("job-000002"));
  assert.ok(!afterAppend.queuedIds.includes("job-000003"));
  assert.ok(afterAppend.queuedIds.includes("job-new"));

  let checkpointBytes = bytes(afterAppend.io);
  let appendedBytes = 0;
  for (let i=0; i<24; i++) {
    const id = `cycle-${String(i).padStart(3,"0")}`;
    appendedBytes += canonicalLine(jobs, {id, input:{msg:id}, inputHash:`ih-${i}`, ts:60000+i, status:"queued"});
    let snap = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
    assert.equal(snap.latestById.get(id)?.inputHash, `ih-${i}`);
    appendedBytes += canonicalLine(leases, {id, worker:"legacy", ts:70000+i});
    appendedBytes += canonicalLine(results, {id, output:{ok:true}, ts:80000+i});
    snap = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
    assert.ok(!snap.queuedIds.includes(id));
  }
  const afterCycles = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
  assert.equal(bytes(afterCycles.io) - checkpointBytes, appendedBytes, "repeated legacy cycles reread historical ledger bytes");
  const jobsAppendBytes = kindBytes(afterCycles.io, "legacy_agent_v0_jobs_append");
  assert.ok(jobsAppendBytes > 0 && jobsAppendBytes < 1024 * 1024, `unexpected jobs append bytes: ${jobsAppendBytes}`);

  const beforeUnwitnessed = bytes(afterCycles.io);
  fs.appendFileSync(jobs, JSON.stringify({id:"foreign", inputHash:"foreign", status:"queued"}) + "\n");
  const fallback = index.legacyAgentV0SnapshotV1({jobsFile:jobs, resultsFile:results, leasesFile:leases});
  const fallbackDelta = bytes(fallback.io) - beforeUnwitnessed;
  assert.ok(fallbackDelta >= fs.statSync(jobs).size, "unwitnessed growth did not fail closed to coherent rebuild");
  assert.equal(fallback.latestById.get("foreign")?.inputHash, "foreign");
  assert.ok(Number(fallback.io.append_witness_misses_total || 0) >= 1);

  console.log(`fixture_jobs_bytes=${jobsSize}`);
  console.log(`warm_bytes=${warmBytes}`);
  console.log(`witnessed_delta_bytes=${expectedDelta}`);
  console.log(`cycle_appended_bytes=${appendedBytes}`);
  console.log(`fallback_rebuild_bytes=${fallbackDelta}`);
  console.log("VOID_AGENT_V0_LEGACY_FULLSCAN_WEDGE_V1_PROOF_GREEN");
} finally {
  fs.rmSync(root, {recursive:true, force:true});
}
