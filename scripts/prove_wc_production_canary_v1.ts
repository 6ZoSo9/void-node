import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "src", "index.ts"), "utf8");

const fail = (message: string): never => {
  throw new Error(`VOID_WC_PRODUCTION_CANARY_V1_FAIL: ${message}`);
};

const required = [
  "VOID_WC_PRODUCTION_CANARY_V1",
  "VOID_WC_PRODUCTION_CANARY_ENABLED",
  "VOID_WC_PRODUCTION_CANARY_ACCOUNT",
  "VOID_WC_PRODUCTION_CANARY_DATASET_ID",
  "VOID_WC_PRODUCTION_CANARY_INPUT_SHA256",
  "production-canary-ledger-v1.jsonl",
  "WC_PRODUCTION_CANARY_MANUAL_ONLY = true",
  'WC_PRODUCTION_CANARY_TASK_CLASS = "datanet_fetch_verify"',
  "WC_PRODUCTION_CANARY_FIXED_AWARD_WC = 1",
  "WC_PRODUCTION_CANARY_PER_ACCOUNT_AWARD_CAP = 1",
  "WC_PRODUCTION_CANARY_GLOBAL_AWARD_CAP = 1",
  'reason: "wc_production_canary_v1"',
  'source: "wc_production_canary_v1"',
  "receipt?.output?.verified !== true",
  "fetchedInputHash !== inputHash",
  "hasCompletedTruth(jobId)",
  'app.get("/__void/diag/wc-production-canary-v1.json"',
  "automatic_runner_activation:false",
  "generic_credit_route:false",
  "wc_to_void:false",
  "money_movement:false",
  '"/jobs/submit": "jobsSubmit"',
  '"/__void/jobs-and-datanet-worker/run-once": "jobsWorkerRunOnce"',
];

for (const marker of required) {
  if (!source.includes(marker)) fail(`missing required marker: ${marker}`);
}

if (source.includes('app.post("/wc/credit"') || source.includes("app.post('/wc/credit'")) {
  fail("generic WC credit route was restored");
}

const start = source.indexOf("  function creditWorkerReceiptOnce(receipt:any){");
const end = source.indexOf("\n\n  function completedTruthCache(){", start);
if (start < 0 || end < 0 || end <= start) fail("could not isolate canary credit function");

const creditBlock = source.slice(start, end);
if (creditBlock.includes("receipt?.wc_award")) fail("receipt-provided wc_award is trusted");
if (creditBlock.includes("receipt?.delta")) fail("receipt-provided delta is trusted");
if (!creditBlock.includes("delta: WC_PRODUCTION_CANARY_FIXED_AWARD_WC")) {
  fail("award is not hard-coded");
}
if (creditBlock.includes('"ledger.jsonl"')) fail("legacy WC ledger is referenced by canary credit");

const runnerSubmitAnchor = 'const r = await fetch(`${runnerSubmitBase}/jobs/submit?dry=0&confirm=jobsSubmit`, {';
const runnerWorkerAnchor = 'const wr = await fetch(`${runnerSubmitBase}/__void/jobs-and-datanet-worker/run-once?account=';
if (!source.includes(runnerSubmitAnchor) || !source.includes(runnerWorkerAnchor) || !source.includes('&dry=0&confirm=jobsWorkerRunOnce')) {
  fail("automatic runner dry-by-default anchors changed unexpectedly");
}

console.log("VOID_WC_PRODUCTION_CANARY_V1_GREEN");
