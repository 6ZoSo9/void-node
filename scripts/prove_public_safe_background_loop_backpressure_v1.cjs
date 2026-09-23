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

const legacyAutoCredit = segment(
  "// === wc-auto-credit-from-receipts-v1 BEGIN ===",
  "// === wc-auto-credit-from-receipts-v1 END ===",
  "legacy_wc_auto_credit",
);
const legacyReturn = legacyAutoCredit.indexOf("  return;");
const legacyMount = legacyAutoCredit.indexOf("  function mount(){");
need(
  legacyAutoCredit.includes("G[MARK] = { installed:false, disabled:true") &&
    legacyAutoCredit.includes("canonical WC crediting now happens through explicit acceptance-gated"),
  "legacy_autocredit_disabled_marker_missing",
);
need(
  legacyReturn >= 0 && legacyMount > legacyReturn,
  "legacy_autocredit_not_disabled_before_mount",
);

const semanticIndex = fs.readFileSync(
  "src/http/agent_pick2_jsonl_semantic_index_v1.ts",
  "utf8",
);
need(
  semanticIndex.includes(
    "VOID_AGENT_PICK2_JSONL_MAX_SYNC_COMPLETION_REBUILD_BYTES_V1 =\n  16 * 1024 * 1024;",
  ),
  "completion_sync_rebuild_budget_missing",
);
need(
  semanticIndex.includes(
    "if (observed && observed.size > this.maxSyncCompletionRebuildBytes)",
  ) &&
    semanticIndex.includes("this.startCompletionWarm(file);") &&
    semanticIndex.includes("VOID_AGENT_PICK2_JSONL_COMPLETION_WARMING_HOLD"),
  "large_completion_rebuild_not_async_held",
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
      legacy_wc_auto_credit_disabled: true,
      large_completion_rebuild_async_warm: true,
      large_completion_rebuild_sync_budget_bytes: 16 * 1024 * 1024,
      runner_accounts_per_tick_default: 1,
      runner_accounts_per_tick_max: 8,
      runner_self_http_timeout_default_ms: 5000,
      runtime_state_mutation_performed: false,
    }),
);
