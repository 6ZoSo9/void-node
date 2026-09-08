#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1";
const DISCOVERY_MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1";
const GATEWAY_MARKER = "VOID_PUBLIC_EARN_GATEWAY_V1";
const CLAIM_MARKER = "VOID_WC_PUBLIC_TICKET_CLAIM_V1";
const CLAIM_ROUTE = "/wc/public-earning-pilot-v1/claim-ticket";
const CANONICAL_FIXED_AWARD_WC = 3;
const CHILD_STDOUT_MAX_BYTES = 256 * 1024;
const CHILD_STDERR_MAX_BYTES = 64 * 1024;
const CHILD_REQUEST_WINDOW_COUNT = 10;
const CHILD_WALL_CLOCK_GRACE_MS = 1000;
const CHILD_WALL_CLOCK_MAX_MS = 120000;
const CHILD_TERMINATION_GRACE_MS = 250;
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DISCOVERY_TOOL = resolve(HERE, "wc-public-opportunity-discovery-v1.mjs");

function fail(message) {
  process.stdout.write(JSON.stringify({
    marker: MARKER,
    status: "hold",
    directory_state: "unavailable",
    reason: message,
    summary: { total: 0, available: 0, hold: 0, unavailable: 0, invalid_result: 0 },
    safety: {
      read_only: true,
      composed_discovery_marker: DISCOVERY_MARKER,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  }, null, 2) + "\n");
  process.exitCode = 2;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function strictEvidenceNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeBase(raw) {
  let value;
  try { value = new URL(raw); } catch { throw new Error(`invalid base URL: ${raw}`); }
  if (!["http:", "https:"].includes(value.protocol)) throw new Error(`base must use HTTP or HTTPS: ${raw}`);
  if (value.username || value.password) throw new Error(`base must not contain credentials: ${raw}`);
  if (value.pathname !== "/" || value.search || value.hash) throw new Error(`base must be an origin without path, query, or fragment: ${raw}`);
  return value.origin;
}

function readInput(path) {
  const absolute = resolve(path);
  if (!existsSync(absolute)) throw new Error(`input file does not exist: ${path}`);
  const text = readFileSync(absolute, "utf8").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    const value = JSON.parse(text);
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) throw new Error("JSON input must be an array of URL strings");
    return value;
  }
  return text.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function childWallClockMs(timeoutMs) {
  return Math.min(
    (timeoutMs * CHILD_REQUEST_WINDOW_COUNT) + CHILD_WALL_CLOCK_GRACE_MS,
    CHILD_WALL_CLOCK_MAX_MS,
  );
}

function runDiscovery(discoveryTool, base, timeoutMs, expectedAwardWc) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [discoveryTool, "--base", base, "--timeout-ms", String(timeoutMs), "--expected-award-wc", String(expectedAwardWc)], { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let terminalReason = null;
    let terminationTimer = null;

    const wallTimer = setTimeout(() => beginTermination("child_timeout"), childWallClockMs(timeoutMs));
    wallTimer.unref?.();

    function boundedChunk(chunk) {
      return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }

    function cleanupListeners() {
      clearTimeout(wallTimer);
      if (terminationTimer) clearTimeout(terminationTimer);
      child.stdout?.off("data", onStdout);
      child.stderr?.off("data", onStderr);
      child.off("error", onError);
      child.off("close", onClose);
    }

    function settle(code, reason = null) {
      if (settled) return;
      settled = true;
      cleanupListeners();
      const stdout = stdoutChunks.length > 0 ? Buffer.concat(stdoutChunks, stdoutBytes).toString("utf8") : "";
      let body = null;
      let parseError = reason;
      if (parseError === null) {
        try { body = JSON.parse(stdout); } catch { parseError = "invalid_json"; }
      }
      resolveRun({
        base,
        exit_code: code,
        body,
        parse_error: parseError,
        stderr_present: stderrBytes > 0 || reason === "child_stderr_oversize",
      });
    }

    function finishTermination() {
      if (settled) return;
      try { child.kill("SIGKILL"); } catch { /* bounded best-effort child teardown */ }
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.unref();
      settle(null, terminalReason ?? "child_termination_failed");
    }

    function beginTermination(reason) {
      if (settled || terminalReason !== null) return;
      terminalReason = reason;
      child.stdout?.pause();
      child.stderr?.pause();
      try { child.kill("SIGTERM"); } catch { /* bounded best-effort child teardown */ }
      terminationTimer = setTimeout(finishTermination, CHILD_TERMINATION_GRACE_MS);
      terminationTimer.unref?.();
    }

    function onStdout(chunk) {
      if (settled || terminalReason !== null) return;
      const bytes = boundedChunk(chunk);
      if (stdoutBytes + bytes.length > CHILD_STDOUT_MAX_BYTES) {
        beginTermination("child_stdout_oversize");
        return;
      }
      stdoutChunks.push(bytes);
      stdoutBytes += bytes.length;
    }

    function onStderr(chunk) {
      if (settled || terminalReason !== null) return;
      const bytes = boundedChunk(chunk);
      if (stderrBytes + bytes.length > CHILD_STDERR_MAX_BYTES) {
        beginTermination("child_stderr_oversize");
        return;
      }
      stderrBytes += bytes.length;
    }

    function onError(error) {
      settle(null, terminalReason ?? (error instanceof Error ? error.name : "spawn_error"));
    }

    function onClose(code) {
      settle(code, terminalReason);
    }

    child.stdout?.on("data", onStdout);
    child.stderr?.on("data", onStderr);
    child.once("error", onError);
    child.once("close", onClose);
  });
}

function validateResult(raw, expectedAwardWc) {
  const body = raw.body;
  const state = body?.opportunity_state;
  const invalid = (reason) => ({
    base: raw.base,
    state: "unavailable",
    reason,
    trusted: false,
    child_exit_code: raw.exit_code,
    source_path: null,
    gateway: {
      marker: typeof body?.gateway?.marker === "string" ? body.gateway.marker : null,
      exact_identity: body?.gateway?.exact_identity === true,
    },
    pilot: {
      coordinator_enabled: body?.pilot?.coordinator_enabled ?? null,
      executor_enabled: body?.pilot?.executor_enabled ?? null,
      fixed_award_wc: strictEvidenceNumber(body?.pilot?.fixed_award_wc),
      fixed_award_matches: false,
    },
    public_claim: {
      marker: typeof body?.public_claim?.marker === "string" ? body.public_claim.marker : null,
      configured: body?.public_claim?.configured === true,
      enabled: body?.public_claim?.enabled ?? null,
      available: body?.public_claim?.available ?? null,
      method: typeof body?.public_claim?.method === "string" ? body.public_claim.method : null,
      path: typeof body?.public_claim?.path === "string" ? body.public_claim.path : null,
      proof_of_executor_key_possession_required: body?.public_claim?.proof_of_executor_key_possession_required === true,
      signed_claim_timestamp_required: body?.public_claim?.signed_claim_timestamp_required === true,
      claim_nonce_replay_protection: body?.public_claim?.claim_nonce_replay_protection === true,
    },
    safety: {
      read_only: body?.safety?.read_only === true,
      get_only: false,
      public_award_boundary_confirmed: body?.safety?.public_award_boundary_confirmed === true,
      public_claim_authentication_replay_confirmed: body?.safety?.public_claim_authentication_replay_confirmed === true,
      mutation_attempted: typeof body?.safety?.mutation_attempted === "boolean" ? body.safety.mutation_attempted : null,
    },
  });
  if (raw.parse_error || !body || body.marker !== DISCOVERY_MARKER || !["available", "hold", "unavailable"].includes(state)) return invalid(raw.parse_error ?? "unexpected_marker_or_state");
  const methods = Array.isArray(body?.safety?.http_methods_used) ? body.safety.http_methods_used : [];
  const getOnly = methods.length > 0 && methods.every((method) => method === "GET");
  const safe = body?.safety?.read_only === true && getOnly && body?.safety?.mutation_attempted === false && body?.safety?.ticket_issuance_attempted === false && body?.safety?.receipt_submission_attempted === false && body?.safety?.wc_award_attempted === false && body?.safety?.wallet_access_attempted !== true && body?.safety?.settlement_attempted !== true;
  const observedAward = strictEvidenceNumber(body?.pilot?.fixed_award_wc);
  const awardMatches = observedAward !== null && observedAward === expectedAwardWc && body?.pilot?.fixed_award_matches === true;
  const gatewayIdentity =
    body?.gateway?.marker === GATEWAY_MARKER &&
    body?.gateway?.exact_identity === true;
  const executorRole = body?.pilot?.executor_enabled === false;
  const claimIdentity =
    body?.public_claim?.marker === CLAIM_MARKER &&
    body?.public_claim?.method === "POST" &&
    body?.public_claim?.path === CLAIM_ROUTE;
  const claimAuthenticationReplay =
    body?.safety?.claim_executor_key_possession_required === true &&
    body?.public_claim?.proof_of_executor_key_possession_required === true &&
    body?.public_claim?.signed_claim_timestamp_required === true &&
    body?.public_claim?.claim_nonce_replay_protection === true &&
    body?.safety?.public_claim_authentication_replay_confirmed === true;
  const availableContract = state !== "available" || (
    safe &&
    awardMatches &&
    gatewayIdentity &&
    body?.pilot?.coordinator_enabled === true &&
    executorRole &&
    body?.public_claim?.configured === true &&
    body?.public_claim?.enabled === true &&
    body?.public_claim?.available === true &&
    claimIdentity &&
    claimAuthenticationReplay &&
    body?.safety?.public_award_boundary_confirmed === true &&
    body?.safety?.public_award_boundary_safe === true
  );
  if (!safe) return invalid("discovery_safety_contract_failed");
  if (!availableContract) return invalid("available_result_contract_failed");
  return {
    base: raw.base,
    state,
    reason: typeof body.reason === "string" ? body.reason : null,
    trusted: true,
    child_exit_code: raw.exit_code,
    source_path: typeof body.source_path === "string" ? body.source_path : null,
    gateway: { marker: body?.gateway?.marker ?? null, exact_identity: body?.gateway?.exact_identity === true },
    pilot: { coordinator_enabled: body?.pilot?.coordinator_enabled ?? null, executor_enabled: body?.pilot?.executor_enabled ?? null, fixed_award_wc: observedAward, fixed_award_matches: awardMatches },
    public_claim: {
      marker: body?.public_claim?.marker ?? null,
      configured: body?.public_claim?.configured === true,
      enabled: body?.public_claim?.enabled ?? null,
      available: body?.public_claim?.available ?? null,
      method: body?.public_claim?.method ?? null,
      path: typeof body?.public_claim?.path === "string" ? body.public_claim.path : null,
      proof_of_executor_key_possession_required: body?.public_claim?.proof_of_executor_key_possession_required === true,
      signed_claim_timestamp_required: body?.public_claim?.signed_claim_timestamp_required === true,
      claim_nonce_replay_protection: body?.public_claim?.claim_nonce_replay_protection === true,
    },
    safety: {
      read_only: true,
      get_only: true,
      public_award_boundary_confirmed: body?.safety?.public_award_boundary_confirmed === true,
      public_claim_authentication_replay_confirmed: body?.safety?.public_claim_authentication_replay_confirmed === true,
      mutation_attempted: false,
    },
  };
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function consume() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
  return results;
}

async function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string", multiple: true, default: [] },
      input: { type: "string" },
      concurrency: { type: "string", default: "4" },
      "timeout-ms": { type: "string", default: "5000" },
      "expected-award-wc": { type: "string", default: String(CANONICAL_FIXED_AWARD_WC) },
      "discovery-tool": { type: "string", default: DEFAULT_DISCOVERY_TOOL },
      "require-available": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    }, allowPositionals: false, strict: true,
  });
  if (values.help) {
    process.stdout.write("Usage: node tools/wc-public-opportunity-directory-v1.mjs --base https://node-one.example --base https://node-two.example [--input nodes.txt] [--require-available]\n");
    return;
  }
  const concurrency = numberValue(values.concurrency);
  const timeoutMs = numberValue(values["timeout-ms"]);
  const expectedAwardWc = numberValue(values["expected-award-wc"]);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) throw new Error("--concurrency must be an integer between 1 and 16");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 30000) throw new Error("--timeout-ms must be an integer between 250 and 30000");
  if (expectedAwardWc !== CANONICAL_FIXED_AWARD_WC) throw new Error("--expected-award-wc must equal canonical fixed award 3");
  const discoveryTool = resolve(values["discovery-tool"]);
  if (!existsSync(discoveryTool)) throw new Error(`discovery tool not found: ${values["discovery-tool"]}`);
  const rawBases = [...values.base];
  if (values.input) rawBases.push(...readInput(values.input));
  if (rawBases.length === 0) throw new Error("at least one --base or --input entry is required");
  const bases = [];
  const seen = new Set();
  for (const raw of rawBases) {
    const base = normalizeBase(raw);
    if (!seen.has(base)) { seen.add(base); bases.push(base); }
  }
  const rawResults = await mapConcurrent(bases, concurrency, (base) => runDiscovery(discoveryTool, base, timeoutMs, expectedAwardWc));
  const results = rawResults.map((entry) => validateResult(entry, expectedAwardWc));
  const available = results.filter((entry) => entry.state === "available");
  const hold = results.filter((entry) => entry.state === "hold");
  const unavailable = results.filter((entry) => entry.state === "unavailable");
  const invalid = results.filter((entry) => !entry.trusted);
  const observedAwards = [...new Set(results.filter((entry) => entry.trusted).map((entry) => entry.pilot.fixed_award_wc).filter((entry) => entry !== null))].sort((a, b) => a - b);
  const awardPolicyConsistent = observedAwards.length <= 1 && observedAwards.every((value) => value === expectedAwardWc);
  const directoryState = available.length > 0 ? "available" : hold.length > 0 ? "hold" : "unavailable";
  const output = {
    marker: MARKER,
    status: "green",
    directory_state: directoryState,
    reason: directoryState === "available" ? "one_or_more_public_wc_opportunities_available" : directoryState === "hold" ? "compatible_nodes_found_but_no_available_opportunity" : "no_compatible_public_wc_opportunity_found",
    query: { requested_entries: rawBases.length, unique_origins: bases.length, concurrency, timeout_ms: timeoutMs, expected_award_wc: expectedAwardWc },
    summary: { total: results.length, available: available.length, hold: hold.length, unavailable: unavailable.length, invalid_result: invalid.length, observed_fixed_awards_wc: observedAwards, award_policy_consistent: awardPolicyConsistent },
    participant: { node_required: false, next_tool: "ops/mainnet0/wc-public-ticket-claim-v1.sh", next_document: "docs/public/wc-public-ticket-claim-v1.md" },
    results,
    safety: { read_only: true, composed_discovery_marker: DISCOVERY_MARKER, child_results_safety_validated: true, mutation_attempted: false, ticket_issuance_attempted: false, receipt_submission_attempted: false, wc_award_attempted: false, wallet_access_attempted: false, settlement_attempted: false },
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  if (values["require-available"] && directoryState !== "available") process.exitCode = 2;
}

main().catch((error) => { fail(error instanceof Error ? error.message : "unexpected error"); });
