#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKERS = Object.freeze({
  manifest: "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_CONTROLLED_END_TO_END_LIVE_CANARY_MANIFEST_V1",
  state: "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_CONTROLLED_END_TO_END_LIVE_CANARY_STATE_V1",
  phaseReceipt: "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_CONTROLLED_END_TO_END_LIVE_CANARY_PHASE_RECEIPT_V1",
  seal: "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_CONTROLLED_END_TO_END_LIVE_CANARY_SEAL_V1",
  inspect: "VOID_EXTERNAL_AGENT_PAID_WORK_FULFILLMENT_CONTROLLED_END_TO_END_LIVE_CANARY_INSPECTION_V1",
});

export const PHASES = Object.freeze([
  "issue_ticket",
  "transfer_package",
  "execute_on_nimo",
  "accept_and_finalize",
  "duplicate_probe_and_seal",
]);

export const CONFIRMATIONS = Object.freeze({
  issue_ticket: "confirmControlledLiveCanaryIssueTicket",
  transfer_package: "confirmControlledLiveCanaryTransferPackage",
  execute_on_nimo: "confirmControlledLiveCanaryExecuteOnNimo",
  accept_and_finalize: "confirmControlledLiveCanaryAcceptAndFinalize",
  duplicate_probe_and_seal: "confirmControlledLiveCanaryDuplicateProbe",
});

const STATE_AFTER_PHASE = Object.freeze({
  issue_ticket: "ticket_issued",
  transfer_package: "package_transferred",
  execute_on_nimo: "participant_receipt_returned",
  accept_and_finalize: "finalized",
  duplicate_probe_and_seal: "completed",
});

const TOKEN_RE = /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/g;
const HEX64_RE = /^[0-9a-f]{64}$/;
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,180}$/;
const TEMPLATE_RE = /\{\{([A-Za-z0-9_.-]+)\}\}/g;

function fail(message) {
  throw new Error(message);
}

function ensure(condition, message) {
  if (!condition) fail(message);
}

function now() {
  return new Date().toISOString();
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sha256File(file) {
  return sha256Bytes(fs.readFileSync(file));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(stable(value));
}

function readJson(file) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  ensure(value && typeof value === "object" && !Array.isArray(value), `${file} root must be an object`);
  return value;
}

function mkdirPrivate(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
}

function writePrivateJson(file, value, exclusive = false) {
  mkdirPrivate(path.dirname(file));
  const flags = exclusive ? "wx" : "w";
  const fd = fs.openSync(file, flags, 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(file, 0o600);
}

function assertPrivatePath(file, label) {
  const st = fs.lstatSync(file);
  ensure(st.isFile() && !st.isSymbolicLink(), `${label} must be a regular file`);
  ensure((st.mode & 0o777) === 0o600, `${label} must be mode 0600`);
  const dir = fs.lstatSync(path.dirname(file));
  ensure(dir.isDirectory() && !dir.isSymbolicLink(), `${label} parent must be a directory`);
  ensure((dir.mode & 0o777) === 0o700, `${label} parent must be mode 0700`);
}

function fileMode(file) {
  return (fs.lstatSync(file).mode & 0o777).toString(8).padStart(4, "0");
}

function getPointer(root, pointer) {
  ensure(typeof pointer === "string" && pointer.startsWith("/"), `invalid JSON pointer: ${pointer}`);
  let current = root;
  for (const raw of pointer.slice(1).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    ensure(current !== null && typeof current === "object" && key in current, `JSON pointer missing: ${pointer}`);
    current = current[key];
  }
  return current;
}

function resolvePathExpression(context, expression) {
  const parts = expression.split(".");
  let current = context;
  for (const part of parts) {
    ensure(current !== null && typeof current === "object" && part in current, `template value missing: ${expression}`);
    current = current[part];
  }
  return current;
}

function resolveTemplate(value, context) {
  if (typeof value !== "string") return value;
  const full = value.match(/^\{\{([A-Za-z0-9_.-]+)\}\}$/);
  if (full) return resolvePathExpression(context, full[1]);
  return value.replace(TEMPLATE_RE, (_, expression) => String(resolvePathExpression(context, expression)));
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:token|capability_token|raw_token)$/i.test(key)) {
        const raw = String(child);
        out[`${key}_sha256`] = sha256Bytes(raw);
      } else if (/^(?:private_path|operation_dir|raw_result_path)$/i.test(key)) {
        out[`${key}_redacted`] = true;
      } else {
        out[key] = sanitize(child);
      }
    }
    return out;
  }
  if (typeof value === "string") {
    return value.replace(TOKEN_RE, (token) => `[capability-token-sha256:${sha256Bytes(token)}]`);
  }
  return value;
}

function containsRawToken(value) {
  TOKEN_RE.lastIndex = 0;
  return TOKEN_RE.test(typeof value === "string" ? value : JSON.stringify(value));
}

function validateAssertions(result, assertions) {
  ensure(Array.isArray(assertions) && assertions.length > 0, "phase expected.assertions must be non-empty");
  for (const assertion of assertions) {
    ensure(assertion && typeof assertion === "object", "assertion must be an object");
    const actual = getPointer(result, assertion.pointer);
    if ("equals" in assertion) {
      ensure(canonicalJson(actual) === canonicalJson(assertion.equals), `assertion failed at ${assertion.pointer}`);
    }
    if ("type" in assertion) {
      const expectedType = assertion.type;
      const actualType = Array.isArray(actual) ? "array" : actual === null ? "null" : typeof actual;
      ensure(actualType === expectedType, `type assertion failed at ${assertion.pointer}`);
    }
    if (assertion.hex64 === true) {
      ensure(typeof actual === "string" && HEX64_RE.test(actual), `hex64 assertion failed at ${assertion.pointer}`);
    }
    if (assertion.nonempty === true) {
      ensure((typeof actual === "string" || Array.isArray(actual)) && actual.length > 0, `nonempty assertion failed at ${assertion.pointer}`);
    }
  }
}

function validatePhaseResult(phase, result, manifest) {
  const profile = manifest.phase_profiles[phase];
  ensure(result && typeof result === "object" && !Array.isArray(result), `${phase} result must be an object`);
  ensure(result.marker === profile.expected.marker, `${phase} result marker mismatch`);
  validateAssertions(result, profile.expected.assertions);

  if (phase === "issue_ticket") {
    ensure(result.account === manifest.account, "issue result account mismatch");
    ensure(result.ticket_issued === true, "issue result did not issue a ticket");
    ensure(result.ticket_count === 1, "issue result ticket count must be one");
    ensure(typeof result.ticket_id === "string" && SAFE_ID_RE.test(result.ticket_id), "issue result ticket_id invalid");
    ensure(typeof result.capability_token === "string" && containsRawToken(result.capability_token), "issue result capability token invalid");
  }
  if (phase === "transfer_package") {
    ensure(result.ticket_package_transferred === true, "transfer result missing transferred=true");
    ensure(result.destination_node_id === manifest.executor.node_id, "transfer destination node mismatch");
    ensure(result.destination_tailscale_ip === manifest.executor.tailscale_ip, "transfer destination IP mismatch");
  }
  if (phase === "execute_on_nimo") {
    ensure(result.participant_cli_executed === true, "execute result missing executed=true");
    ensure(result.ticket_consumed === true, "execute result missing ticket_consumed=true");
    ensure(result.token_artifacts_deleted === true, "execute result token artifacts not deleted");
    ensure(result.wc_delta === manifest.expected_award_wc, "execute result WC delta mismatch");
    ensure(result.return_package_contains_raw_token === false, "return package contains raw token");
  }
  if (phase === "accept_and_finalize") {
    ensure(result.participant_receipt_accepted === true, "finalizer result missing receipt acceptance");
    ensure(result.canonical_adapter_executed === true, "finalizer result missing adapter execution");
    ensure(result.wc_credited === manifest.expected_award_wc, "finalizer result WC credit mismatch");
    ensure(result.fulfillment_plan_state === "completed", "finalizer result plan is not completed");
    ensure(result.duplicate_second_wc_credit === false, "finalizer result indicates duplicate WC credit");
  }
  if (phase === "duplicate_probe_and_seal") {
    ensure(result.duplicate_probe_completed === true, "duplicate probe incomplete");
    ensure(result.second_acceptance === false, "duplicate probe observed second acceptance");
    ensure(result.second_adapter_execution === false, "duplicate probe observed second adapter execution");
    ensure(result.second_wc_credit === false, "duplicate probe observed second WC credit");
    ensure(result.account_redeemable === manifest.expected_award_wc, "final redeemable WC mismatch");
    ensure(result.global_active_tickets === 0, "final active ticket count mismatch");
    ensure(result.global_consumed_tickets === manifest.expected_post_state.global_consumed_tickets, "final consumed ticket count mismatch");
  }
}

function validateManifest(manifest) {
  ensure(manifest.marker === MARKERS.manifest, "manifest marker mismatch");
  ensure(manifest.version === 1, "manifest version mismatch");
  ensure(["mock", "live"].includes(manifest.mode), "manifest mode must be mock or live");
  ensure(typeof manifest.canary_id === "string" && SAFE_ID_RE.test(manifest.canary_id), "canary_id invalid");
  ensure(typeof manifest.account === "string" && SAFE_ID_RE.test(manifest.account), "account invalid");
  ensure(manifest.expected_award_wc === 3, "expected_award_wc must equal 3");
  ensure(manifest.coordinator?.tailscale_ip === "100.122.245.125", "coordinator IP mismatch");
  ensure(manifest.coordinator?.node_id === "9d89483769e469e0473b489dc50dba96", "coordinator node ID mismatch");
  ensure(manifest.executor?.tailscale_ip === "100.122.198.38", "executor IP mismatch");
  ensure(manifest.executor?.node_id === "befd84d4fe47341af81b1a8aef8bcb97", "executor node ID mismatch");
  ensure(manifest.pre_state?.global_active_tickets === 0, "pre-state active tickets must be zero");
  ensure(manifest.pre_state?.fresh_account_ticket_total === 0, "fresh account ticket total must be zero");
  ensure(manifest.pre_state?.fresh_account_redeemable === 0, "fresh account redeemable must be zero");
  ensure(manifest.pre_state?.remaining_global_ticket_capacity >= 1, "no remaining ticket capacity");
  ensure(manifest.expected_post_state?.global_consumed_tickets === manifest.pre_state.global_consumed_tickets + 1, "post consumed ticket count must increment exactly once");
  ensure(manifest.expected_post_state?.fresh_account_ticket_total === 1, "post account ticket total must equal one");
  ensure(manifest.expected_post_state?.fresh_account_redeemable === 3, "post redeemable must equal three");
  ensure(manifest.phase_profiles && typeof manifest.phase_profiles === "object", "phase_profiles missing");
  ensure(manifest.stack_hashes && typeof manifest.stack_hashes === "object", "stack_hashes missing");
  ensure(!containsRawToken(manifest), "manifest must not contain a raw capability token");

  for (const phase of PHASES) {
    const profile = manifest.phase_profiles[phase];
    ensure(profile && typeof profile === "object", `phase profile missing: ${phase}`);
    ensure(profile.confirmation === CONFIRMATIONS[phase], `phase confirmation mismatch: ${phase}`);
    ensure(Array.isArray(profile.command) && profile.command.length > 0, `phase command missing: ${phase}`);
    ensure(profile.command.every((value) => typeof value === "string"), `phase command must be strings: ${phase}`);
    ensure(profile.expected && typeof profile.expected.marker === "string", `phase expected marker missing: ${phase}`);
    ensure(Array.isArray(profile.expected.assertions), `phase assertions missing: ${phase}`);
    ensure(profile.transport_mode === manifest.mode, `phase transport mode mismatch: ${phase}`);
  }
  return manifest;
}

function operationPaths(operationDir) {
  return {
    dir: operationDir,
    manifest: path.join(operationDir, "manifest-v1.json"),
    state: path.join(operationDir, "state-v1.json"),
    phaseDir: path.join(operationDir, "phases"),
    seal: path.join(operationDir, "seal-v1.json"),
  };
}

function loadOperation(operationDir) {
  const paths = operationPaths(operationDir);
  assertPrivatePath(paths.manifest, "operation manifest");
  assertPrivatePath(paths.state, "operation state");
  const manifest = validateManifest(readJson(paths.manifest));
  const state = readJson(paths.state);
  ensure(state.marker === MARKERS.state && state.version === 1, "state identity mismatch");
  ensure(state.manifest_sha256 === sha256File(paths.manifest), "state manifest hash mismatch");
  return { paths, manifest, state };
}

function contextFor(operationDir, manifest, state) {
  const phases = {};
  for (const phase of PHASES) {
    const rawFile = path.join(operationDir, "phases", `${phase}-raw-result-v1.json`);
    const receiptFile = path.join(operationDir, "phases", `${phase}-receipt-v1.json`);
    if (fs.existsSync(rawFile)) phases[phase] = { ...(phases[phase] || {}), raw: readJson(rawFile) };
    if (fs.existsSync(receiptFile)) phases[phase] = { ...(phases[phase] || {}), receipt: readJson(receiptFile) };
  }
  return { manifest, state, phases, operation_dir: operationDir };
}

function runTransport(profile, context) {
  const argv = profile.command.map((value) => String(resolveTemplate(value, context)));
  ensure(argv.length > 0, "resolved command is empty");
  const env = { ...process.env };
  for (const [key, value] of Object.entries(profile.env || {})) {
    env[key] = String(resolveTemplate(value, context));
  }
  const cwd = profile.cwd ? String(resolveTemplate(profile.cwd, context)) : process.cwd();
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd,
    env,
    encoding: "utf8",
    timeout: profile.timeout_ms || 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    argv_redacted: argv.map((value) => sanitize(value)),
    cwd_redacted: path.basename(cwd),
    exit_code: result.status,
    signal: result.signal,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function parseTransportResult(transport) {
  ensure(transport.exit_code === 0, `transport exited ${transport.exit_code}: ${transport.stderr.slice(0, 500)}`);
  const value = JSON.parse(transport.stdout.trim());
  ensure(value && typeof value === "object" && !Array.isArray(value), "transport JSON root must be object");
  return value;
}

function phaseFiles(paths, phase) {
  return {
    attempt: path.join(paths.phaseDir, `${phase}-attempt-v1.json`),
    rawTransport: path.join(paths.phaseDir, `${phase}-raw-transport-v1.json`),
    rawResult: path.join(paths.phaseDir, `${phase}-raw-result-v1.json`),
    receipt: path.join(paths.phaseDir, `${phase}-receipt-v1.json`),
  };
}

function advanceSuccessfulPhase(paths, manifest, state, phase, result, recovered) {
  validatePhaseResult(phase, result, manifest);
  const files = phaseFiles(paths, phase);
  writePrivateJson(files.rawResult, result);
  const sanitized = sanitize(result);
  ensure(!containsRawToken(sanitized), `${phase} sanitized result contains raw token`);
  const receipt = {
    marker: MARKERS.phaseReceipt,
    version: 1,
    canary_id: manifest.canary_id,
    account: manifest.account,
    phase,
    confirmation: CONFIRMATIONS[phase],
    recovered: Boolean(recovered),
    result_sha256: sha256File(files.rawResult),
    sanitized_result: sanitized,
    completed_at: now(),
  };
  writePrivateJson(files.receipt, receipt);
  state.completed_phases = [...state.completed_phases, phase];
  state.current_state = STATE_AFTER_PHASE[phase];
  state.next_phase = PHASES[state.completed_phases.length] || null;
  state.active_phase = null;
  state.held = null;
  state.revision += 1;
  state.updated_at = now();
  state.phase_receipts[phase] = {
    path: path.basename(files.receipt),
    sha256: sha256File(files.receipt),
  };
  writePrivateJson(paths.state, state);

  if (phase === "duplicate_probe_and_seal") {
    const seal = {
      marker: MARKERS.seal,
      version: 1,
      canary_id: manifest.canary_id,
      account: manifest.account,
      expected_award_wc: manifest.expected_award_wc,
      completed_phases: [...state.completed_phases],
      final_state: state.current_state,
      state_sha256: sha256File(paths.state),
      manifest_sha256: sha256File(paths.manifest),
      token_free: true,
      payment_transfer: false,
      wc_to_void_settlement: false,
      service_restart: false,
      deployment: false,
      completed_at: now(),
    };
    writePrivateJson(paths.seal, seal);
  }
  return receipt;
}

export function prepareOperation(manifestPath, operationDir) {
  const manifest = validateManifest(readJson(manifestPath));
  const paths = operationPaths(operationDir);
  mkdirPrivate(paths.dir);
  mkdirPrivate(paths.phaseDir);

  const expectedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
  if (fs.existsSync(paths.manifest)) {
    assertPrivatePath(paths.manifest, "existing manifest");
    ensure(fs.readFileSync(paths.manifest, "utf8") === expectedManifest, "existing operation manifest differs");
    assertPrivatePath(paths.state, "existing state");
    return readJson(paths.state);
  }

  writePrivateJson(paths.manifest, manifest, true);
  const state = {
    marker: MARKERS.state,
    version: 1,
    canary_id: manifest.canary_id,
    account: manifest.account,
    mode: manifest.mode,
    manifest_sha256: sha256File(paths.manifest),
    current_state: "prepared",
    next_phase: PHASES[0],
    active_phase: null,
    held: null,
    completed_phases: [],
    phase_receipts: {},
    revision: 0,
    created_at: now(),
    updated_at: now(),
  };
  writePrivateJson(paths.state, state, true);
  return state;
}

export function runPhase(operationDir, phase, confirmation, allowLive = false) {
  ensure(PHASES.includes(phase), `unknown phase: ${phase}`);
  const { paths, manifest, state } = loadOperation(operationDir);
  ensure(confirmation === CONFIRMATIONS[phase], `explicit confirmation mismatch for ${phase}`);
  if (manifest.mode === "live") ensure(allowLive === true, "live manifest requires --allow-live");

  if (state.completed_phases.includes(phase)) {
    const receiptFile = phaseFiles(paths, phase).receipt;
    assertPrivatePath(receiptFile, `${phase} receipt`);
    return { idempotent: true, receipt: readJson(receiptFile) };
  }
  ensure(state.held === null, `operation is held in phase ${state.held?.phase || "unknown"}`);
  ensure(state.next_phase === phase, `expected next phase ${state.next_phase}, got ${phase}`);

  const files = phaseFiles(paths, phase);
  const attempt = {
    marker: `${MARKERS.state}_PHASE_ATTEMPT`,
    version: 1,
    canary_id: manifest.canary_id,
    phase,
    confirmation,
    mode: manifest.mode,
    attempt_started_at: now(),
  };
  writePrivateJson(files.attempt, attempt, true);
  state.active_phase = phase;
  state.revision += 1;
  state.updated_at = now();
  writePrivateJson(paths.state, state);

  let transport;
  try {
    transport = runTransport(manifest.phase_profiles[phase], contextFor(operationDir, manifest, state));
    writePrivateJson(files.rawTransport, transport);
    const result = parseTransportResult(transport);
    return { idempotent: false, receipt: advanceSuccessfulPhase(paths, manifest, state, phase, result, false) };
  } catch (error) {
    state.active_phase = null;
    state.held = {
      phase,
      reason: String(error.message || error),
      attempt_path: path.basename(files.attempt),
      raw_transport_path: fs.existsSync(files.rawTransport) ? path.basename(files.rawTransport) : null,
      held_at: now(),
      automatic_retry_allowed: false,
    };
    state.revision += 1;
    state.updated_at = now();
    writePrivateJson(paths.state, state);
    throw error;
  }
}

export function recoverPhase(operationDir, phase, confirmation, rawResultPath) {
  ensure(PHASES.includes(phase), `unknown phase: ${phase}`);
  const { paths, manifest, state } = loadOperation(operationDir);
  ensure(confirmation === CONFIRMATIONS[phase], `explicit confirmation mismatch for ${phase}`);
  ensure(state.held && state.held.phase === phase, `operation is not held in ${phase}`);
  assertPrivatePath(rawResultPath, "recovery raw result");
  const result = readJson(rawResultPath);
  return advanceSuccessfulPhase(paths, manifest, state, phase, result, true);
}

export function inspectOperation(operationDir) {
  const { paths, manifest, state } = loadOperation(operationDir);
  const phaseReceipts = {};
  for (const phase of state.completed_phases) {
    const receiptFile = phaseFiles(paths, phase).receipt;
    phaseReceipts[phase] = {
      sha256: sha256File(receiptFile),
      receipt: sanitize(readJson(receiptFile)),
    };
  }
  const inspection = {
    marker: MARKERS.inspect,
    version: 1,
    canary_id: manifest.canary_id,
    account: manifest.account,
    mode: manifest.mode,
    current_state: state.current_state,
    next_phase: state.next_phase,
    held: sanitize(state.held),
    completed_phases: [...state.completed_phases],
    phase_receipts: phaseReceipts,
    manifest_sha256: sha256File(paths.manifest),
    state_sha256: sha256File(paths.state),
    seal_sha256: fs.existsSync(paths.seal) ? sha256File(paths.seal) : null,
    private_dir_mode: fileMode(paths.dir),
    raw_capability_token_printed: false,
  };
  ensure(!containsRawToken(inspection), "inspection contains raw token");
  return inspection;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }
    const key = value.slice(2);
    if (key === "allow-live") {
      args[key] = true;
      continue;
    }
    ensure(index + 1 < argv.length, `missing value for --${key}`);
    args[key] = argv[++index];
  }
  return args;
}

function cli() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (command === "prepare") {
    ensure(args.manifest && args["operation-dir"], "prepare requires --manifest and --operation-dir");
    console.log(JSON.stringify(prepareOperation(args.manifest, args["operation-dir"]), null, 2));
    return;
  }
  if (command === "run-phase") {
    ensure(args["operation-dir"] && args.phase && args.confirm, "run-phase requires --operation-dir --phase --confirm");
    console.log(JSON.stringify(runPhase(args["operation-dir"], args.phase, args.confirm, args["allow-live"] === true), null, 2));
    return;
  }
  if (command === "recover-phase") {
    ensure(args["operation-dir"] && args.phase && args.confirm && args["raw-result"], "recover-phase requires --operation-dir --phase --confirm --raw-result");
    console.log(JSON.stringify(recoverPhase(args["operation-dir"], args.phase, args.confirm, args["raw-result"]), null, 2));
    return;
  }
  if (command === "inspect") {
    ensure(args["operation-dir"], "inspect requires --operation-dir");
    console.log(JSON.stringify(inspectOperation(args["operation-dir"]), null, 2));
    return;
  }
  fail("usage: prepare | run-phase | recover-phase | inspect");
}

const current = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(current)) {
  try {
    cli();
  } catch (error) {
    console.error(`HOLD: ${error.message || error}`);
    process.exitCode = 2;
  }
}
