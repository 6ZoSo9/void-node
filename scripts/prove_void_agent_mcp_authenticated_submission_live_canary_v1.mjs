#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

import {
  COMPLETION_RECEIPT_MARKER,
  CONFIRMATION,
  INPUT_MARKER,
  MARKER,
  PREPARED_RECEIPT_MARKER,
  STATE_MARKER,
  canonicalJson,
  executeCanary,
  normalizeGatewayBaseUrl,
  prepareCanary,
  runCli,
  sha256,
  validateCanaryInput,
} from "../tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs";

const ROOT = process.cwd();
const TOOL = "tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs";
const PROOF = "scripts/prove_void_agent_mcp_authenticated_submission_live_canary_v1.mjs";
const DOC = "docs/public-agent/void-agent-mcp-authenticated-submission-live-canary-v1.md";
const EXAMPLE = "examples/void-agent-mcp-authenticated-submission-live-canary-v1.example.json";
const SCHEMA = "schemas/void-agent-mcp-authenticated-submission-live-canary-v1.schema.json";
const WORKFLOW = ".github/workflows/void-agent-mcp-authenticated-submission-live-canary-v1.yml";
const EXPECTED_PATHS = [WORKFLOW, DOC, EXAMPLE, SCHEMA, TOOL, PROOF].sort();
const TOKEN = "void-mcp-proof-token-never-print-7b835e4d";
const FIXED_NOW = Date.parse("2026-07-29T12:15:00Z");

function isRecord(value) {
  return Boolean(value !== null && typeof value === "object" && !Array.isArray(value));
}

function writePrivateJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function walkFiles(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(absolute));
    else if (entry.isFile()) output.push(absolute);
  }
  return output;
}

function scanForSecret(directory, values) {
  const files = walkFiles(directory);
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const value of values) {
      assert.equal(text.includes(value), false, `secret disclosure in ${file}`);
    }
  }
}

function canaryInput(suffix) {
  return {
    marker: INPUT_MARKER,
    version: 1,
    canary_id: `void-mcp-auth-canary-${suffix}`,
    service_id: "void.datanet.fetch-verify.v1",
    created_at_utc: "2026-07-29T12:15:00Z",
    expires_at_utc: "2026-07-29T12:45:00Z",
    requester_agent_id: `void-mcp-requester-${suffix}`,
    callback_uri: `https://callback.invalid/void-mcp/${suffix}`,
    objective: "Fetch and independently verify one bounded DataNet object without payment, execution, or Work Credit authority.",
    input_refs: [`void://datanet/proof/${suffix}`],
    expected_outputs: ["verified_result"],
    quote_asset: "WC",
    max_total: "3",
    max_runtime_seconds: 60,
    max_output_bytes: 65536,
    order_nonce: `order-${suffix}-0001`,
    submission_nonce: `submission-${suffix}-0001`,
    expect_new: true,
  };
}

function authorityDenied() {
  return {
    provider_selected: false,
    quote_created: false,
    payment_authorized: false,
    work_execution_authorized: false,
    work_dispatched: false,
    wc_award_authorized: false,
    wc_ledger_write_authorized: false,
    wallet_or_signer_access: false,
    signing_authority: false,
    transaction_broadcast_authority: false,
    buy_void_fulfillment_authority: false,
  };
}

async function startGateway(options = {}) {
  const metrics = {
    discovery_gets: 0,
    route_gets: 0,
    submission_posts: 0,
    authorization_exact: false,
    payload_hash_exact: false,
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/.well-known/void-agent-discovery.json") {
      metrics.discovery_gets += 1;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1", version: 1 }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/__void/agents/paid-work/submissions/v1") {
      metrics.route_gets += 1;
      response.writeHead(405, { allow: "POST", "content-length": "0" });
      response.end();
      return;
    }
    if (request.method === "POST" && url.pathname === "/__void/agents/paid-work/submissions/v1") {
      metrics.submission_posts += 1;
      const chunks = [];
      request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      request.on("end", () => {
        const bytes = Buffer.concat(chunks);
        const requestSha = crypto.createHash("sha256").update(bytes).digest("hex");
        metrics.authorization_exact = request.headers.authorization === `Bearer ${TOKEN}`;
        metrics.payload_hash_exact = request.headers["x-void-payload-sha256"] === requestSha;
        if (!metrics.authorization_exact) {
          response.writeHead(401, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }
        const body = JSON.parse(bytes.toString("utf8"));
        const receipt = {
          marker: "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
          version: 1,
          receipt_id: `voidawsi1_${sha256(`receipt:${requestSha}`)}`,
          submission_id: body.submission_id,
          work_order_id: body.work_order.work_order_id,
          request_sha256: requestSha,
          received_at_utc: "2026-07-29T12:15:01Z",
          authorization_verified: true,
          loopback_source: true,
          admission: { decision: "accepted_for_review" },
          authority: authorityDenied(),
        };
        if (typeof options.beforeSubmissionResponse === "function") {
          options.beforeSubmissionResponse();
        }
        response.writeHead(202, {
          "content-type": "application/json",
          "x-void-agent-paid-work-submission-route": "v1",
        });
        response.end(JSON.stringify({ ok: true, duplicate: false, receipt }));
      });
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    metrics,
    close: async () => await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

function exactTools(allowSubmit) {
  const names = [
    "void_bootstrap_network",
    "void_prepare_paid_work_submission",
    "void_probe_paid_work",
  ];
  if (allowSubmit) names.push("void_submit_paid_work");
  return { tools: names.map((name) => ({ name })) };
}

function acceptedSubmissionEnvelope(prepared, cleanupCompleted) {
  return {
    structuredContent: {
      marker: "VOID_AGENT_MCP_SUBMISSION_RESULT_V1",
      version: 1,
      prepared: {
        marker: "VOID_AGENT_MCP_PREPARED_SUBMISSION_V1",
        version: 1,
        work_order_id: prepared.work_order_id,
        submission_id: prepared.submission_id,
        request_sha256: prepared.request_sha256,
        network_submission_performed: false,
        accepted_for_review: false,
        authority: authorityDenied(),
      },
      client_result: {
        accepted_for_review: true,
        successful_authentication: true,
        request_sha256: prepared.request_sha256,
        receipt_id: `voidawsi1_${sha256(`cleanup:${prepared.request_sha256}`)}`,
        http_status: 202,
      },
      interpretation: {
        accepted_for_review: true,
        duplicate: false,
        conflicting_duplicate: false,
        private_temp_cleanup_completed: cleanupCompleted,
        payment_executed: false,
        paid_work_execution_started: false,
        work_dispatched: false,
        work_credit_awarded: false,
        work_credit_ledger_written: false,
        void_settled: false,
      },
      authority: authorityDenied(),
    },
  };
}

async function expectReject(callback, pattern) {
  let rejected = false;
  try {
    await callback();
  } catch (error) {
    rejected = true;
    assert.match(error instanceof Error ? error.message : String(error), pattern);
  }
  assert.equal(rejected, true, `expected rejection matching ${pattern}`);
}

function normalizedChangedPaths(baseRef) {
  const committed = execFileSync(
    "git",
    ["diff", "--name-only", `${baseRef}...HEAD`],
    { cwd: ROOT, encoding: "utf8" },
  ).split(/\r?\n/).filter(Boolean);
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd: ROOT, encoding: "utf8" },
  ).split(/\r?\n/).filter(Boolean).map((line) => {
    const raw = line.slice(3);
    const arrow = raw.indexOf(" -> ");
    return arrow >= 0 ? raw.slice(arrow + 4) : raw;
  });
  return [...new Set([...committed, ...status])].sort();
}

async function main() {
  for (const relative of EXPECTED_PATHS) {
    const metadata = fs.lstatSync(path.join(ROOT, relative));
    assert.equal(metadata.isFile(), true, `${relative} must be a file`);
    assert.equal(metadata.isSymbolicLink(), false, `${relative} must not be a symlink`);
  }
  const toolSource = fs.readFileSync(path.join(ROOT, TOOL), "utf8");
  for (const required of [
    CONFIRMATION,
    "--allow-live-submit",
    "port 4100 is the general VOID node origin",
    "attempt_count: 1",
    "automatic_retry: false",
    "VOID_AGENT_MCP_PAID_WORK_PROBE_RESULT_V1",
    "repository HEAD changed after preparation",
    "source_contract_sha256",
    "integrations/mcp/dist/src/stdio.js",
    "tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs",
    "accepted_for_review: true",
    "private_temp_cleanup_completed=${result.state.private_temp_cleanup_completed}",
    "completion_state_persisted=${result.state.completion_state_persisted}",
    "completion_receipt_published=${result.state.completion_receipt_published}",
    "payment_executed: false",
    "work_credit_ledger_written: false",
    "void_settled: false",
    "VOID_MCP_ALLOW_SUBMIT",
    "VOID_MCP_TOKEN_FILE",
    "2026-07-28",
  ]) assert.equal(toolSource.includes(required), true, `tool contract missing: ${required}`);
  for (const forbidden of [
    "automatic_retry: true",
    "payment_executed: true",
    "work_credit_ledger_written: true",
    "void_settled: true",
    "execSync(",
    "shell: true",
  ]) assert.equal(toolSource.includes(forbidden), false, `forbidden tool contract: ${forbidden}`);

  const schema = readJson(path.join(ROOT, SCHEMA));
  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.properties.marker.const, INPUT_MARKER);
  assert.equal(schema.additionalProperties, false);
  const example = readJson(path.join(ROOT, EXAMPLE));
  validateCanaryInput(example);
  assert.equal(example.expect_new, true);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-mcp-auth-canary-proof-"));
  fs.chmodSync(root, 0o700);
  const tokenPath = path.join(root, "submit.token");
  fs.writeFileSync(tokenPath, `${TOKEN}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  fs.chmodSync(tokenPath, 0o600);
  const insecureTokenPath = path.join(root, "insecure.token");
  fs.writeFileSync(insecureTokenPath, `${TOKEN}\n`, { encoding: "utf8", flag: "wx", mode: 0o644 });
  fs.chmodSync(insecureTokenPath, 0o644);
  const gateway = await startGateway();
  try {
    const inputPath = path.join(root, "input.json");
    writePrivateJson(inputPath, canaryInput("happy-v1"));
    const stateDirectory = path.join(root, "state-happy");
    const common = {
      repoRoot: ROOT,
      baseUrl: gateway.baseUrl,
      inputPath,
      stateDirectory,
      now: () => FIXED_NOW,
    };
    const prepared = await prepareCanary(common);
    assert.equal(prepared.receipt.marker, PREPARED_RECEIPT_MARKER);
    assert.equal(prepared.state.marker, STATE_MARKER);
    assert.equal(prepared.state.status, "prepared");
    assert.equal(prepared.state.attempt_count, 0);
    assert.match(prepared.state.repo_head, /^[0-9a-f]{40}$/);
    assert.match(prepared.state.source_contract_sha256, /^[0-9a-f]{64}$/);
    assert.equal(prepared.receipt.repo_head, prepared.state.repo_head);
    assert.equal(prepared.receipt.source_contract_sha256, prepared.state.source_contract_sha256);
    assert.equal(gateway.metrics.submission_posts, 0);
    assert.ok(gateway.metrics.discovery_gets >= 1);
    assert.ok(gateway.metrics.route_gets >= 1);

    const completed = await executeCanary({
      ...common,
      tokenFile: tokenPath,
      allowLiveSubmit: true,
      confirmation: CONFIRMATION,
    });
    assert.equal(completed.receipt.marker, COMPLETION_RECEIPT_MARKER);
    assert.equal(completed.state.status, "completed");
    assert.equal(completed.state.attempt_count, 1);
    assert.equal(completed.state.accepted_for_review, true);
    assert.equal(completed.state.duplicate, false);
    assert.equal(completed.state.conflicting_duplicate, false);
    assert.equal(completed.state.private_temp_cleanup_completed, true);
    assert.equal(completed.state.completion_state_persisted, true);
    assert.equal(completed.state.completion_receipt_published, true);
    assert.equal(completed.receipt.private_temp_cleanup_completed, true);
    assert.equal(completed.receipt.completion_receipt_published, true);
    assert.equal(gateway.metrics.submission_posts, 1);
    assert.equal(gateway.metrics.authorization_exact, true);
    assert.equal(gateway.metrics.payload_hash_exact, true);
    assert.equal(completed.receipt.repo_head, prepared.state.repo_head);
    assert.equal(completed.receipt.source_contract_sha256, prepared.state.source_contract_sha256);
    scanForSecret(stateDirectory, [TOKEN, tokenPath]);

    await expectReject(
      async () => await executeCanary({ ...common, tokenFile: tokenPath, allowLiveSubmit: true, confirmation: CONFIRMATION }),
      /fresh prepared state/,
    );
    assert.equal(gateway.metrics.submission_posts, 1);
    await expectReject(
      async () => await executeCanary({ ...common, tokenFile: tokenPath, allowLiveSubmit: false, confirmation: CONFIRMATION }),
      /allow-live-submit/,
    );
    await expectReject(
      async () => await executeCanary({ ...common, tokenFile: tokenPath, allowLiveSubmit: true, confirmation: "wrong" }),
      /confirmation must be exactly/,
    );
    await expectReject(
      async () => await executeCanary({ ...common, tokenFile: insecureTokenPath, allowLiveSubmit: true, confirmation: CONFIRMATION }),
      /must not grant group or other permissions/,
    );
    assert.throws(() => normalizeGatewayBaseUrl("http://127.0.0.1:4100"), /general VOID node origin/);

    const cleanupInputPath = path.join(root, "input-cleanup-false.json");
    writePrivateJson(cleanupInputPath, canaryInput("cleanup-false-v1"));
    const cleanupStateDirectory = path.join(root, "state-cleanup-false");
    const cleanupCommon = {
      repoRoot: ROOT,
      baseUrl: gateway.baseUrl,
      inputPath: cleanupInputPath,
      stateDirectory: cleanupStateDirectory,
      now: () => FIXED_NOW,
    };
    const cleanupPrepared = await prepareCanary(cleanupCommon);
    let cleanupFalseCalls = 0;
    const cleanupFalseSessionFactory = async ({ allowSubmit }) => ({
      protocolVersion: "2026-07-28",
      listTools: async () => exactTools(allowSubmit),
      callTool: async (request) => {
        assert.equal(request.name, "void_submit_paid_work");
        cleanupFalseCalls += 1;
        return acceptedSubmissionEnvelope(cleanupPrepared.state.prepared, false);
      },
      close: async () => {},
    });
    const cleanupFalse = await executeCanary({
      ...cleanupCommon,
      tokenFile: tokenPath,
      allowLiveSubmit: true,
      confirmation: CONFIRMATION,
      sessionFactory: cleanupFalseSessionFactory,
    });
    assert.equal(cleanupFalseCalls, 1);
    assert.equal(cleanupFalse.state.status, "completed");
    assert.equal(cleanupFalse.state.accepted_for_review, true);
    assert.equal(cleanupFalse.state.private_temp_cleanup_completed, false);
    assert.equal(cleanupFalse.state.completion_state_persisted, true);
    assert.equal(cleanupFalse.state.completion_receipt_published, true);
    assert.equal(cleanupFalse.receipt.private_temp_cleanup_completed, false);
    assert.equal(cleanupFalse.receipt.completion_receipt_published, true);
    assert.equal(cleanupFalse.result.interpretation.private_temp_cleanup_completed, false);
    await expectReject(
      async () => await executeCanary({
        ...cleanupCommon,
        tokenFile: tokenPath,
        allowLiveSubmit: true,
        confirmation: CONFIRMATION,
        sessionFactory: cleanupFalseSessionFactory,
      }),
      /fresh prepared state/,
    );
    assert.equal(cleanupFalseCalls, 1);
    scanForSecret(cleanupStateDirectory, [TOKEN, tokenPath]);

    const cliCleanupInputPath = path.join(root, "input-cli-cleanup-false.json");
    const cliCleanupInput = canaryInput("cli-cleanup-false-v1");
    const cliNow = Date.now();
    cliCleanupInput.created_at_utc = new Date(cliNow).toISOString().replace(/\.\d{3}Z$/, "Z");
    cliCleanupInput.expires_at_utc = new Date(cliNow + 15 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    writePrivateJson(cliCleanupInputPath, cliCleanupInput);
    const cliCleanupStateDirectory = path.join(root, "state-cli-cleanup-false");
    const cliTempRoot = path.join(root, "mcp-tmp-cli-cleanup-false");
    fs.mkdirSync(cliTempRoot, { mode: 0o700 });
    fs.chmodSync(cliTempRoot, 0o700);
    const priorTmpdir = process.env.TMPDIR;
    let cliGateway = null;
    let cliCleanupSubmissionPosts = 0;
    let cliCleanupOutputVerified = false;
    try {
      process.env.TMPDIR = cliTempRoot;
      cliGateway = await startGateway({
        beforeSubmissionResponse: () => {
          fs.chmodSync(cliTempRoot, 0o500);
        },
      });
      const prepareArgs = [
        "prepare",
        "--repo-root", ROOT,
        "--base-url", cliGateway.baseUrl,
        "--input", cliCleanupInputPath,
        "--state-dir", cliCleanupStateDirectory,
      ];
      const executeArgs = [
        "execute",
        "--repo-root", ROOT,
        "--base-url", cliGateway.baseUrl,
        "--input", cliCleanupInputPath,
        "--state-dir", cliCleanupStateDirectory,
        "--token-file", tokenPath,
        "--allow-live-submit",
        "--confirm", CONFIRMATION,
      ];
      const cliPrepared = await runCli(prepareArgs);
      assert.equal(cliPrepared.exitCode, 0);
      assert.match(cliPrepared.output, new RegExp(`${MARKER}=PREPARED`));
      const cliCompleted = await runCli(executeArgs);
      assert.equal(cliCompleted.exitCode, 0);
      assert.match(cliCompleted.output, /private_temp_cleanup_completed=false(?:\n|$)/);
      assert.match(cliCompleted.output, /completion_state_persisted=true(?:\n|$)/);
      assert.match(cliCompleted.output, /completion_receipt_published=true(?:\n|$)/);
      assert.equal(cliCompleted.output.includes(TOKEN), false);
      assert.equal(cliCompleted.output.includes(tokenPath), false);
      assert.equal(cliCompleted.output.includes(cliTempRoot), false);
      const cliState = readJson(path.join(cliCleanupStateDirectory, "state-v1.json"));
      const cliReceipt = readJson(path.join(cliCleanupStateDirectory, "completion-receipt-v1.json"));
      assert.equal(cliState.status, "completed");
      assert.equal(cliState.private_temp_cleanup_completed, false);
      assert.equal(cliState.completion_state_persisted, true);
      assert.equal(cliState.completion_receipt_published, true);
      assert.equal(cliReceipt.private_temp_cleanup_completed, false);
      assert.equal(cliReceipt.completion_receipt_published, true);
      cliCleanupSubmissionPosts = cliGateway.metrics.submission_posts;
      assert.equal(cliCleanupSubmissionPosts, 1);
      await expectReject(
        async () => await runCli(executeArgs),
        /fresh prepared state/,
      );
      assert.equal(cliGateway.metrics.submission_posts, 1);
      scanForSecret(cliCleanupStateDirectory, [TOKEN, tokenPath, cliTempRoot]);
      cliCleanupOutputVerified = true;
    } finally {
      if (priorTmpdir === undefined) delete process.env.TMPDIR;
      else process.env.TMPDIR = priorTmpdir;
      try {
        fs.chmodSync(cliTempRoot, 0o700);
      } catch {
        // Best-effort proof cleanup only; outer temp-root removal remains authoritative.
      }
      if (cliGateway) await cliGateway.close();
    }

    const receiptFailureInputPath = path.join(root, "input-receipt-publication-failure.json");
    const receiptFailureInput = canaryInput("receipt-publication-failure-v1");
    const receiptFailureNow = Date.now();
    receiptFailureInput.created_at_utc = new Date(receiptFailureNow).toISOString().replace(/\.\d{3}Z$/, "Z");
    receiptFailureInput.expires_at_utc = new Date(receiptFailureNow + 15 * 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
    writePrivateJson(receiptFailureInputPath, receiptFailureInput);
    const receiptFailureStateDirectory = path.join(root, "state-receipt-publication-failure");
    const receiptFailureGateway = await startGateway();
    let receiptFailureOutputVerified = false;
    let receiptFailureExistingReceiptPreserved = false;
    let receiptFailureSubmissionPosts = 0;
    try {
      const prepareArgs = [
        "prepare",
        "--repo-root", ROOT,
        "--base-url", receiptFailureGateway.baseUrl,
        "--input", receiptFailureInputPath,
        "--state-dir", receiptFailureStateDirectory,
      ];
      const executeArgs = [
        "execute",
        "--repo-root", ROOT,
        "--base-url", receiptFailureGateway.baseUrl,
        "--input", receiptFailureInputPath,
        "--state-dir", receiptFailureStateDirectory,
        "--token-file", tokenPath,
        "--allow-live-submit",
        "--confirm", CONFIRMATION,
      ];
      const receiptFailurePrepared = await runCli(prepareArgs);
      assert.equal(receiptFailurePrepared.exitCode, 0);
      assert.match(receiptFailurePrepared.output, new RegExp(`${MARKER}=PREPARED`));
      const preexistingReceiptPath = path.join(receiptFailureStateDirectory, "completion-receipt-v1.json");
      const preexistingReceipt = { marker: "VOID_PROOF_PREEXISTING_COMPLETION_RECEIPT", sentinel: "must-not-overwrite" };
      writePrivateJson(preexistingReceiptPath, preexistingReceipt);
      const receiptFailureCompleted = await runCli(executeArgs);
      assert.equal(receiptFailureCompleted.exitCode, 0);
      assert.match(receiptFailureCompleted.output, new RegExp(`${MARKER}=PASS`));
      assert.match(receiptFailureCompleted.output, /accepted_for_review=true(?:\n|$)/);
      assert.match(receiptFailureCompleted.output, /completion_state_persisted=true(?:\n|$)/);
      assert.match(receiptFailureCompleted.output, /completion_receipt_published=false(?:\n|$)/);
      assert.equal(receiptFailureCompleted.output.includes(TOKEN), false);
      assert.equal(receiptFailureCompleted.output.includes(tokenPath), false);
      const receiptFailureState = readJson(path.join(receiptFailureStateDirectory, "state-v1.json"));
      assert.equal(receiptFailureState.status, "completed");
      assert.equal(receiptFailureState.accepted_for_review, true);
      assert.equal(receiptFailureState.attempt_count, 1);
      assert.equal(receiptFailureState.completion_state_persisted, true);
      assert.equal(receiptFailureState.completion_receipt_published, false);
      assert.deepEqual(readJson(preexistingReceiptPath), preexistingReceipt);
      receiptFailureExistingReceiptPreserved = true;
      receiptFailureSubmissionPosts = receiptFailureGateway.metrics.submission_posts;
      assert.equal(receiptFailureSubmissionPosts, 1);
      await expectReject(
        async () => await runCli(executeArgs),
        /fresh prepared state/,
      );
      assert.equal(receiptFailureGateway.metrics.submission_posts, 1);
      scanForSecret(receiptFailureStateDirectory, [TOKEN, tokenPath]);
      receiptFailureOutputVerified = true;
    } finally {
      await receiptFailureGateway.close();
    }

    const stateFailureInputPath = path.join(root, "input-completed-state-failure.json");
    writePrivateJson(stateFailureInputPath, canaryInput("completed-state-failure-v1"));
    const stateFailureDirectory = path.join(root, "state-completed-state-failure");
    const stateFailureCommon = {
      repoRoot: ROOT,
      baseUrl: gateway.baseUrl,
      inputPath: stateFailureInputPath,
      stateDirectory: stateFailureDirectory,
      now: () => FIXED_NOW,
    };
    const stateFailurePrepared = await prepareCanary(stateFailureCommon);
    let stateFailureCalls = 0;
    const stateFailureSessionFactory = async ({ allowSubmit }) => ({
      protocolVersion: "2026-07-28",
      listTools: async () => exactTools(allowSubmit),
      callTool: async (request) => {
        assert.equal(request.name, "void_submit_paid_work");
        stateFailureCalls += 1;
        return acceptedSubmissionEnvelope(stateFailurePrepared.state.prepared, true);
      },
      close: async () => {},
    });
    const stateFailure = await executeCanary({
      ...stateFailureCommon,
      tokenFile: tokenPath,
      allowLiveSubmit: true,
      confirmation: CONFIRMATION,
      sessionFactory: stateFailureSessionFactory,
      localStateFault: (phase) => {
        if (phase === "completed:before") throw new Error("synthetic completed-state persistence failure");
      },
    });
    assert.equal(stateFailureCalls, 1);
    assert.equal(stateFailure.state.status, "completed");
    assert.equal(stateFailure.state.accepted_for_review, true);
    assert.equal(stateFailure.state.completion_state_persisted, false);
    assert.equal(stateFailure.state.completion_receipt_published, false);
    assert.equal(stateFailure.receipt, null);
    const stateFailureDurable = readJson(path.join(stateFailureDirectory, "state-v1.json"));
    assert.equal(stateFailureDurable.status, "attempting");
    assert.equal(stateFailureDurable.attempt_count, 1);
    assert.equal(fs.existsSync(path.join(stateFailureDirectory, "completion-receipt-v1.json")), false);
    await expectReject(
      async () => await executeCanary({
        ...stateFailureCommon,
        tokenFile: tokenPath,
        allowLiveSubmit: true,
        confirmation: CONFIRMATION,
        sessionFactory: stateFailureSessionFactory,
      }),
      /fresh prepared state/,
    );
    assert.equal(stateFailureCalls, 1);
    scanForSecret(stateFailureDirectory, [TOKEN, tokenPath]);

    const postRenameInputPath = path.join(root, "input-post-rename-state-failure.json");
    writePrivateJson(postRenameInputPath, canaryInput("post-rename-state-failure-v1"));
    const postRenameDirectory = path.join(root, "state-post-rename-state-failure");
    const postRenameCommon = {
      repoRoot: ROOT,
      baseUrl: gateway.baseUrl,
      inputPath: postRenameInputPath,
      stateDirectory: postRenameDirectory,
      now: () => FIXED_NOW,
    };
    const postRenamePrepared = await prepareCanary(postRenameCommon);
    let postRenameCalls = 0;
    const postRenameSessionFactory = async ({ allowSubmit }) => ({
      protocolVersion: "2026-07-28",
      listTools: async () => exactTools(allowSubmit),
      callTool: async (request) => {
        assert.equal(request.name, "void_submit_paid_work");
        postRenameCalls += 1;
        return acceptedSubmissionEnvelope(postRenamePrepared.state.prepared, true);
      },
      close: async () => {},
    });
    const postRename = await executeCanary({
      ...postRenameCommon,
      tokenFile: tokenPath,
      allowLiveSubmit: true,
      confirmation: CONFIRMATION,
      sessionFactory: postRenameSessionFactory,
      localStateFault: (phase) => {
        if (phase === "completed:after") throw new Error("synthetic throw after completed-state rename");
      },
    });
    assert.equal(postRenameCalls, 1);
    assert.equal(postRename.state.status, "completed");
    assert.equal(postRename.state.accepted_for_review, true);
    assert.equal(postRename.state.completion_state_persisted, true);
    assert.equal(postRename.state.completion_receipt_published, true);
    assert.equal(postRename.receipt.marker, COMPLETION_RECEIPT_MARKER);
    const postRenameDurable = readJson(path.join(postRenameDirectory, "state-v1.json"));
    assert.equal(postRenameDurable.completion_state_persisted, true);
    assert.equal(postRenameDurable.completion_receipt_published, true);
    await expectReject(
      async () => await executeCanary({
        ...postRenameCommon,
        tokenFile: tokenPath,
        allowLiveSubmit: true,
        confirmation: CONFIRMATION,
        sessionFactory: postRenameSessionFactory,
      }),
      /fresh prepared state/,
    );
    assert.equal(postRenameCalls, 1);
    scanForSecret(postRenameDirectory, [TOKEN, tokenPath]);

    const finalStateInputPath = path.join(root, "input-final-state-failure.json");
    writePrivateJson(finalStateInputPath, canaryInput("final-state-failure-v1"));
    const finalStateDirectory = path.join(root, "state-final-state-failure");
    const finalStateCommon = {
      repoRoot: ROOT,
      baseUrl: gateway.baseUrl,
      inputPath: finalStateInputPath,
      stateDirectory: finalStateDirectory,
      now: () => FIXED_NOW,
    };
    const finalStatePrepared = await prepareCanary(finalStateCommon);
    let finalStateCalls = 0;
    const finalStateSessionFactory = async ({ allowSubmit }) => ({
      protocolVersion: "2026-07-28",
      listTools: async () => exactTools(allowSubmit),
      callTool: async (request) => {
        assert.equal(request.name, "void_submit_paid_work");
        finalStateCalls += 1;
        return acceptedSubmissionEnvelope(finalStatePrepared.state.prepared, true);
      },
      close: async () => {},
    });
    const finalState = await executeCanary({
      ...finalStateCommon,
      tokenFile: tokenPath,
      allowLiveSubmit: true,
      confirmation: CONFIRMATION,
      sessionFactory: finalStateSessionFactory,
      localStateFault: (phase) => {
        if (phase === "published:before") throw new Error("synthetic final publication-state persistence failure");
      },
    });
    assert.equal(finalStateCalls, 1);
    assert.equal(finalState.state.status, "completed");
    assert.equal(finalState.state.accepted_for_review, true);
    assert.equal(finalState.state.completion_receipt_published, true);
    assert.equal(finalState.state.completion_state_persisted, false);
    assert.equal(finalState.receipt.marker, COMPLETION_RECEIPT_MARKER);
    assert.equal(finalState.receipt.completion_receipt_published, true);
    const finalStateDurable = readJson(path.join(finalStateDirectory, "state-v1.json"));
    assert.equal(finalStateDurable.status, "completed");
    assert.equal(finalStateDurable.completion_state_persisted, true);
    assert.equal(finalStateDurable.completion_receipt_published, false);
    const finalStateReceipt = readJson(path.join(finalStateDirectory, "completion-receipt-v1.json"));
    assert.equal(finalStateReceipt.completion_receipt_published, true);
    await expectReject(
      async () => await executeCanary({
        ...finalStateCommon,
        tokenFile: tokenPath,
        allowLiveSubmit: true,
        confirmation: CONFIRMATION,
        sessionFactory: finalStateSessionFactory,
      }),
      /fresh prepared state/,
    );
    assert.equal(finalStateCalls, 1);
    scanForSecret(finalStateDirectory, [TOKEN, tokenPath]);

    const ambiguousInputPath = path.join(root, "input-ambiguous.json");
    writePrivateJson(ambiguousInputPath, canaryInput("ambiguous-v1"));
    const ambiguousStateDirectory = path.join(root, "state-ambiguous");
    const ambiguousCommon = {
      repoRoot: ROOT,
      baseUrl: gateway.baseUrl,
      inputPath: ambiguousInputPath,
      stateDirectory: ambiguousStateDirectory,
      now: () => FIXED_NOW,
    };
    await prepareCanary(ambiguousCommon);
    let ambiguousCalls = 0;
    const ambiguousSessionFactory = async ({ allowSubmit }) => ({
      protocolVersion: "2026-07-28",
      listTools: async () => exactTools(allowSubmit),
      callTool: async (request) => {
        if (request.name === "void_submit_paid_work") {
          ambiguousCalls += 1;
          throw new Error("ambiguous transport result");
        }
        throw new Error(`unexpected fake MCP call: ${request.name}`);
      },
      close: async () => {},
    });
    await expectReject(
      async () => await executeCanary({
        ...ambiguousCommon,
        tokenFile: tokenPath,
        allowLiveSubmit: true,
        confirmation: CONFIRMATION,
        sessionFactory: ambiguousSessionFactory,
      }),
      /ambiguous transport result/,
    );
    assert.equal(ambiguousCalls, 1);
    const held = readJson(path.join(ambiguousStateDirectory, "state-v1.json"));
    assert.equal(held.status, "held");
    assert.equal(held.attempt_count, 1);
    await expectReject(
      async () => await executeCanary({
        ...ambiguousCommon,
        tokenFile: tokenPath,
        allowLiveSubmit: true,
        confirmation: CONFIRMATION,
        sessionFactory: ambiguousSessionFactory,
      }),
      /fresh prepared state/,
    );
    assert.equal(ambiguousCalls, 1);
    scanForSecret(ambiguousStateDirectory, [TOKEN, tokenPath]);

    const allStateText = walkFiles(root)
      .filter((file) => file.includes("state-"))
      .map((file) => fs.readFileSync(file, "utf8"))
      .join("\n");
    assert.equal(allStateText.includes(TOKEN), false);
    assert.equal(allStateText.includes(tokenPath), false);

    if (process.env.VOID_MCP_AUTH_CANARY_BASE_REF) {
      const paths = normalizedChangedPaths(process.env.VOID_MCP_AUTH_CANARY_BASE_REF);
      assert.deepEqual(paths, EXPECTED_PATHS, `changed path mismatch: ${paths.join(",")}`);
    }

    const result = {
      marker: "VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PROOF_V1",
      version: 1,
      exact_green: true,
      actual_mcp_stdio_path_exercised: true,
      protocol_version: "2026-07-28",
      gateway_probe_get_only: true,
      submit_tool_default_absent: true,
      submit_tool_live_gate_required: true,
      exact_confirmation_required: true,
      deterministic_preparation: true,
      exact_repo_head_bound: true,
      package_locks_bound: true,
      built_mcp_runtime_bound: true,
      canary_runner_source_bound: true,
      authenticated_submission_post_count: gateway.metrics.submission_posts,
      authenticated_submission_post_exactly_once: gateway.metrics.submission_posts === 1,
      authorization_header_verified_by_loopback_fixture: gateway.metrics.authorization_exact,
      payload_sha256_header_verified: gateway.metrics.payload_hash_exact,
      accepted_for_review: true,
      duplicate: false,
      conflicting_duplicate: false,
      private_temp_cleanup_completed_normal: completed.state.private_temp_cleanup_completed === true,
      completion_state_persisted_normal: completed.state.completion_state_persisted === true,
      completion_receipt_published_normal: completed.state.completion_receipt_published === true,
      private_temp_cleanup_failure_preserved: cleanupFalse.state.private_temp_cleanup_completed === false,
      cleanup_failure_submission_attempt_count: cleanupFalseCalls,
      cleanup_failure_no_retry: cleanupFalseCalls === 1,
      cleanup_failure_cli_output_verified: cliCleanupOutputVerified,
      cleanup_failure_cli_submission_attempt_count: cliCleanupSubmissionPosts,
      cleanup_failure_cli_no_retry: cliCleanupSubmissionPosts === 1,
      completion_receipt_publication_failure_preserved: receiptFailureOutputVerified,
      completion_receipt_publication_failure_existing_receipt_preserved: receiptFailureExistingReceiptPreserved,
      completion_receipt_publication_failure_submission_attempt_count: receiptFailureSubmissionPosts,
      completion_receipt_publication_failure_no_retry: receiptFailureSubmissionPosts === 1,
      completed_state_precommit_failure_preserves_acceptance: stateFailure.state.accepted_for_review === true && stateFailure.state.completion_state_persisted === false,
      completed_state_precommit_failure_submission_attempt_count: stateFailureCalls,
      completed_state_precommit_failure_no_retry: stateFailureCalls === 1,
      completed_state_postrename_readback_recognized: postRename.state.completion_state_persisted === true,
      completed_state_postrename_submission_attempt_count: postRenameCalls,
      final_state_failure_preserves_receipt_truth: finalState.state.completion_receipt_published === true && finalState.state.completion_state_persisted === false,
      final_state_failure_submission_attempt_count: finalStateCalls,
      final_state_failure_no_retry: finalStateCalls === 1,
      ambiguous_result_held: held.status === "held",
      automatic_retry: false,
      raw_token_printed: false,
      raw_token_in_receipts: false,
      token_file_path_in_receipts: false,
      credential_issue_or_activation: false,
      payment_execution: false,
      paid_work_execution: false,
      work_dispatch: false,
      wc_award: false,
      wc_ledger_write: false,
      void_settlement: false,
      wallet_or_signer_access: false,
      transaction_broadcast: false,
      runtime_mutation: false,
      deployment: false,
      build_and_ci_external_network_submission: false,
      build_and_ci_loopback_fixture_only: true,
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write("VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_LIVE_CANARY_PROOF=PASS\n");
  } finally {
    await gateway.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invoked === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
