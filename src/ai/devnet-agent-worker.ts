// VOID Network – devnet agent worker v1 (read-only job scanner)
//
// - Reads JobQueue / ReceiptRegistry addresses from docs/VOID-DEVNET-PROTOCOL-STATE.json
// - Reads jobIds from docs/VOID-DEVNET-JOB-SPOOL.txt
// - For each jobId, calls hasResult(bytes32)(bool) on JobQueue via `cast call`
// - Summarizes coverage and, if any pending job exists, dumps its getJob(...) tuple.
//
// This is deliberately read-only: it does NOT submit receipts yet.
// Next step will be wiring this into an actual AI worker + ReceiptRegistry writes.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

function log(msg: string) {
  console.log(`[agent-worker] ${msg}`);
}

function logJob(msg: string) {
  console.log(`[job] ${msg}`);
}

function castCall(rpcUrl: string, to: string, sig: string, ...args: string[]): string {
  const fullArgs = ["call", to, sig, ...args, "--rpc-url", rpcUrl];
  try {
    const out = execFileSync("cast", fullArgs, { encoding: "utf8" });
    return out.trim();
  } catch (err: any) {
    throw new Error(
      `cast call failed: cast ${fullArgs.join(" ")}\n${err?.stderr || err?.message || String(err)}`
    );
  }
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
  const pending: string[] = [];

  for (const jobId of jobIds) {
    const raw = castCall(
      rpcUrl,
      jobQueue,
      "hasResult(bytes32)(bool)",
      jobId
    );

    const normalized = raw.toLowerCase();
    const has =
      normalized === "true" ||
      normalized === "1" ||
      normalized === "0x1" ||
      normalized === "0x01";

    if (has) {
      withResult++;
      logJob(`jobId=${jobId} hasResult=true`);
    } else {
      pending.push(jobId);
      logJob(`jobId=${jobId} hasResult=false (PENDING)`);
    }
  }

  log(
    `summary: jobs_in_spool=${jobIds.length}, with_result=${withResult}, pending=${pending.length}`
  );

  if (pending.length === 0) {
    log("no pending jobs; coverage from JobQueue perspective is already full. nothing to do.");
    return;
  }

  const target = pending[0];
  log(`next_pending_job=${target}`);

  // Dump the raw Job struct so an off-chain agent can act on it.
  // ABI matches what we already use in shell scripts.
  const jobRaw = castCall(
    rpcUrl,
    jobQueue,
    "getJob(bytes32)((bytes32,uint256,string,address,string,bytes32,uint64,uint8,address,bytes32,uint64,uint32))",
    target
  );

  logJob(`getJob(${target}) => ${jobRaw}`);

  console.log("");
  console.log("=== NEXT STEPS (manual / future AI) ===");
  console.log("- Use the raw tuple above to inspect app/prompt/payload for the job.");
  console.log("- Run your agent off-chain to produce a result (URI + hash, etc.).");
  console.log("- Then submit a receipt on-chain via ReceiptRegistry using cast/forge.");
  console.log("  (ReceiptRegistry ABI is left flexible by design; this worker is read-only v1.)");
}

main().catch((err) => {
  console.error(`[agent-worker] ERROR: ${err?.message || String(err)}`);
  if (err?.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
