// VOID Network – devnet agent worker v1.1 (read-only job scanner, stale-safe)
//
// - Reads JobQueue / ReceiptRegistry addresses from docs/VOID-DEVNET-PROTOCOL-STATE.json
// - Reads jobIds from docs/VOID-DEVNET-JOB-SPOOL.txt
// - For each jobId, calls hasResult(bytes32)(bool) on JobQueue via `cast call`
// - Summarizes coverage and, if any *known* pending job exists, dumps its getJob(...) tuple.
//
// Hardened behaviour:
// - If hasResult/getJob revert with "JobQueue: unknown job", treat that jobId as STALE and skip.
// - If all pending jobs are stale/unknown, exit 0 with a clear message.
//
// This is still read-only: no receipts are written on-chain yet.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

function log(msg: string) {
  console.log(`[agent-worker] ${msg}`);
}

function logJob(msg: string) {
  console.log(`[job] ${msg}`);
}

function castCallRaw(args: string[]): string {
  try {
    const out = execFileSync("cast", args, { encoding: "utf8" });
    return out.trim();
  } catch (err: any) {
    const stderr = err?.stderr ? String(err.stderr) : "";
    const msg = err?.message ? String(err.message) : "";
    const combined = `${msg}\n${stderr}`.trim();
    const error = new Error(
      `cast ${args.join(" ")}\n${combined || "<no stderr>"}`
    );
    (error as any).__raw = err;
    throw error;
  }
}

function castCall(rpcUrl: string, to: string, sig: string, ...args: string[]): string {
  const fullArgs = ["call", to, sig, ...args, "--rpc-url", rpcUrl];
  return castCallRaw(fullArgs);
}

function isUnknownJobError(e: unknown): boolean {
  const s = String((e as any)?.message || e || "");
  return (
    s.includes("JobQueue: unknown job") ||
    s.toLowerCase().includes("unknown job")
  );
}

function loadJson<T = any>(file: string): T {
  if (!existsSync(file)) {
    throw new Error(`required JSON file not found: ${file}`);
  }
  const raw = readFileSync(file, "utf8");
  return JSON.parse(raw) as T;
}

function loadJobIds(spoolFile: string): string[] {
  if (!existsSync(spoolFile)) {
    throw new Error(`job spool file not found: ${spoolFile}`);
  }
  const raw = readFileSync(spoolFile, "utf8");
  const lines = raw.split(/\r?\n/);

  const out: string[] = [];
  const re = /(0x[0-9a-fA-F]{64})/;

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    const m = re.exec(line);
    if (m) out.push(m[1]);
  }

  return out;
}

async function main() {
  const repo = process.env.VOID_REPO || process.cwd();
  const rpcUrl =
    process.env.RPC_URL ||
    process.env.DEVNET_RPC_URL ||
    "http://127.0.0.1:8545";

  const stateFile =
    process.env.STATE_FILE ||
    path.join(repo, "docs", "VOID-DEVNET-PROTOCOL-STATE.json");

  const spoolFile =
    process.env.JOB_SPOOL_FILE ||
    path.join(repo, "docs", "VOID-DEVNET-JOB-SPOOL.txt");

  log(`repo=${repo}`);
  log(`rpcUrl=${rpcUrl}`);
  log(`stateFile=${stateFile}`);
  log(`spoolFile=${spoolFile}`);

  type DevnetState = {
    JobQueue?: { address?: string };
    ReceiptRegistry?: { address?: string };
  };

  const state = loadJson<DevnetState>(stateFile);
  const jobQueue = state.JobQueue?.address;
  const receipts = state.ReceiptRegistry?.address;

  if (!jobQueue) {
    throw new Error("JobQueue.address missing in devnet state JSON");
  }
  if (!receipts) {
    log("WARNING: ReceiptRegistry.address missing in state JSON (proceeding read-only)");
  }

  log(`JobQueue=${jobQueue}`);
  if (receipts) log(`ReceiptRegistry=${receipts}`);

  const jobIds = loadJobIds(spoolFile);
  log(`jobs_in_spool=${jobIds.length}`);

  if (jobIds.length === 0) {
    log("no jobs in spool; nothing to do.");
    return;
  }

  let withResult = 0;
  let pendingCount = 0;
  let staleUnknown = 0;
  const pending: string[] = [];

  // First pass: classify via hasResult, but be tolerant of unknown jobs
  for (const jobId of jobIds) {
    let has: boolean | null = null;

    try {
      const raw = castCall(
        rpcUrl,
        jobQueue,
        "hasResult(bytes32)(bool)",
        jobId
      );

      const normalized = raw.toLowerCase();
      has =
        normalized === "true" ||
        normalized === "1" ||
        normalized === "0x1" ||
        normalized === "0x01";
    } catch (e) {
      if (isUnknownJobError(e)) {
        staleUnknown++;
        logJob(`jobId=${jobId} UNKNOWN in hasResult() – marking STALE and skipping`);
        continue;
      }
      throw e;
    }

    if (has) {
      withResult++;
      logJob(`jobId=${jobId} hasResult=true`);
    } else {
      pendingCount++;
      pending.push(jobId);
      logJob(`jobId=${jobId} hasResult=false (PENDING)`);
    }
  }

  log(
    `summary: jobs_in_spool=${jobIds.length}, with_result=${withResult}, pending=${pendingCount}, stale_unknown=${staleUnknown}`
  );

  if (pending.length === 0) {
    log("no pending jobs; coverage from JobQueue perspective is already full. nothing to do.");
    return;
  }

  // Second pass: find the first PENDING job that is actually known on-chain
  let chosenJobId: string | null = null;
  let chosenJobRaw: string | null = null;

  for (const jobId of pending) {
    try {
      const jobRaw = castCall(
        rpcUrl,
        jobQueue,
        "getJob(bytes32)((bytes32,uint256,string,address,string,bytes32,uint64,uint8,address,bytes32,uint64,uint32))",
        jobId
      );

      chosenJobId = jobId;
      chosenJobRaw = jobRaw;
      break;
    } catch (e) {
      if (isUnknownJobError(e)) {
        staleUnknown++;
        logJob(`jobId=${jobId} UNKNOWN in getJob() – treating as STALE and skipping`);
        continue;
      }
      // Unexpected revert: bubble up
      throw e;
    }
  }

  if (!chosenJobId || !chosenJobRaw) {
    log(
      `no actionable pending jobs: pending=${pending.length}, but all appear STALE / unknown on-chain`
    );
    return;
  }

  log(`next_pending_job=${chosenJobId}`);
  logJob(`getJob(${chosenJobId}) => ${chosenJobRaw}`);

  console.log("");
  console.log("=== NEXT STEPS (manual / future AI) ===");
  console.log("- Use the raw tuple above to inspect app/prompt/payload for the job.");
  console.log("- Run your agent off-chain to produce a result (URI + hash, etc.).");
  console.log("- Then submit a receipt on-chain via ReceiptRegistry using cast/forge.");
  console.log("  (ReceiptRegistry ABI is left flexible by design; this worker is read-only v1.1.)");
}

main().catch((err) => {
  console.error(`[agent-worker] ERROR: ${err?.message || String(err)}`);
  if ((err as any)?.stack) {
    console.error((err as any).stack);
  }
  process.exit(1);
});
