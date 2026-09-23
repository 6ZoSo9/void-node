#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const ID = "VOID_PUBLIC_SAFE_BACKGROUND_LOOP_BACKPRESSURE_V1";
const source = fs.readFileSync("src/index.ts", "utf8");

function need(condition, message) {
  if (!condition) throw new Error(`${ID}_FAIL: ${message}`);
}

function segment(start, end, label) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  need(a >= 0 && b > a, `segment_missing:${label}`);
  return source.slice(a, b);
}

const autoCredit = segment(
  "  function scanOnce(){",
  "  function mount(){",
  "wc_auto_credit_scan",
);
need(
  autoCredit.includes("VOID_WC_AUTOCREDIT_MAX_SCAN_BYTES_PER_TICK"),
  "autocredit_byte_budget_env_missing",
);
need(
  autoCredit.includes("Math.min(") &&
    autoCredit.includes("maxScanBytesPerTick"),
  "autocredit_read_not_byte_bounded",
);

const autoCreditMount = segment(
  "  function mount(){",
  "// === wc-auto-credit-from-receipts-v1 END ===",
  "wc_auto_credit_mount",
);
need(
  autoCreditMount.includes("publicSafeAutoCreditRequiresOptIn") &&
    autoCreditMount.includes("PUBLIC_HTTP_BASE") &&
    autoCreditMount.includes("VOID_ENABLE_WC_AUTOCREDIT_INCREMENTAL_V1"),
  "public_safe_autocredit_opt_in_gate_missing",
);

const runnerSubmit = segment(
  "    async function wcRunnerSubmitOnce(account:string){",
  "    async function wcRunnerTick(){",
  "wc_runner_submit",
);
need(
  runnerSubmit.includes("VOID_WC_RUNNER_SELF_HTTP_TIMEOUT_MS") &&
    runnerSubmit.includes("AbortSignal.timeout(runnerSelfHttpTimeoutMs)"),
  "runner_self_http_timeout_missing",
);

const runnerTick = segment(
  "    async function wcRunnerTick(){",
  "    function ensureWcRunnerLoop(){",
  "wc_runner_tick",
);
need(
  runnerTick.includes("VOID_WC_RUNNER_MAX_ACCOUNTS_PER_TICK") &&
    runnerTick.includes("selectedAccounts") &&
    runnerTick.includes("account_cursor"),
  "runner_account_batch_not_bounded",
);

const runnerLoop = segment(
  "    function ensureWcRunnerLoop(){",
  "    function runnerStateFor(account:string){",
  "wc_runner_loop",
);
need(
  runnerLoop.includes("publicSafeRunnerRequiresOptIn") &&
    runnerLoop.includes("PUBLIC_HTTP_BASE") &&
    runnerLoop.includes("VOID_ENABLE_WC_RUNNER_LOOP"),
  "public_safe_runner_opt_in_gate_missing",
);

const workerLoop = segment(
  "  function startWorker(){",
  "  function mount(){",
  "jobs_datanet_worker_loop",
);
need(
  workerLoop.includes("publicSafeWorkerRequiresOptIn") &&
    workerLoop.includes("PUBLIC_HTTP_BASE") &&
    workerLoop.includes("VOID_ENABLE_JOBS_DATANET_WORKER_LOOP"),
  "public_safe_worker_opt_in_gate_missing",
);

console.log(
  ID + "_GREEN " +
    JSON.stringify({
      public_safe_wc_runner_requires_explicit_opt_in: true,
      public_safe_jobs_worker_requires_explicit_opt_in: true,
      public_safe_autocredit_requires_explicit_opt_in: true,
      runner_accounts_per_tick_default: 1,
      runner_accounts_per_tick_max: 8,
      runner_self_http_timeout_default_ms: 5000,
      autocredit_scan_bytes_per_tick_default: 1024 * 1024,
      autocredit_scan_bytes_per_tick_max: 4 * 1024 * 1024,
      runtime_state_mutation_performed: false,
    }),
);
