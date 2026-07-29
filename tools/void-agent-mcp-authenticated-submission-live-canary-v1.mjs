#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

export const MARKER = "VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_LIVE_CANARY_V1";
export const INPUT_MARKER = "VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_LIVE_CANARY_INPUT_V1";
export const STATE_MARKER = "VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_LIVE_CANARY_STATE_V1";
export const PREPARED_RECEIPT_MARKER = "VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_PREPARED_RECEIPT_V1";
export const COMPLETION_RECEIPT_MARKER = "VOID_AGENT_MCP_AUTHENTICATED_SUBMISSION_COMPLETION_RECEIPT_V1";
export const CONFIRMATION = "confirmVoidAgentMcpAuthenticatedSubmissionLiveCanaryV1";
export const SERVICE_ID = "void.datanet.fetch-verify.v1";
const SUBMIT_TOOL = "void_submit_paid_work";
const DEFAULT_TOOLS = [
  "void_bootstrap_network",
  "void_prepare_paid_work_submission",
  "void_probe_paid_work",
];
const SOURCE_CONTRACT_FILES = [
  "tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs",
  "package.json",
  "package-lock.json",
  "integrations/mcp/package.json",
  "integrations/mcp/package-lock.json",
  "integrations/mcp/src/bridge.ts",
  "integrations/mcp/src/config.ts",
  "integrations/mcp/src/json.ts",
  "integrations/mcp/src/process.ts",
  "integrations/mcp/src/server.ts",
  "integrations/mcp/src/stdio.ts",
  "integrations/mcp/dist/src/bridge.js",
  "integrations/mcp/dist/src/config.js",
  "integrations/mcp/dist/src/json.js",
  "integrations/mcp/dist/src/process.js",
  "integrations/mcp/dist/src/server.js",
  "integrations/mcp/dist/src/stdio.js",
  "tools/void-ai-agent-paid-work-client-v1.mjs",
  "scripts/public_agent_service_order_submission_v1.ts",
  "ops/public/agent-services-v1/catalog.json",
];
const STATE_FILE = "state-v1.json";
const PREPARED_RECEIPT_FILE = "prepared-receipt-v1.json";
const COMPLETION_RECEIPT_FILE = "completion-receipt-v1.json";
const MAX_INPUT_BYTES = 65_536;
const MAX_STATE_BYTES = 1_048_576;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const CANARY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,179}$/;
const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const NONCE = /^[A-Za-z0-9._:-]{8,128}$/;
const ASSET = /^[A-Z][A-Z0-9._:-]{0,31}$/;
const AMOUNT = /^(?:0|[1-9]\d{0,31})(?:\.\d{1,18})?$/;

function fail(message) {
  throw new Error(message);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function isRecord(value) {
  return Boolean(value !== null && typeof value === "object" && !Array.isArray(value));
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortJson(value[key])]),
    );
  }
  assertCondition(
    value === null || ["string", "number", "boolean"].includes(typeof value),
    "non-JSON value",
  );
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(sortJson(value));
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedPath(value) {
  return value.replaceAll(path.sep, "/");
}

function requireString(value, label, minimum = 1, maximum = 4096) {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must be trimmed`);
  assertCondition(value.length >= minimum && value.length <= maximum, `${label} length is invalid`);
  return value;
}

function requireStringArray(value, label, maximumItems, maximumLength) {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(value.length >= 1 && value.length <= maximumItems, `${label} item count is invalid`);
  const output = value.map((entry, index) => requireString(entry, `${label}[${index}]`, 1, maximumLength));
  assertCondition(new Set(output).size === output.length, `${label} must contain unique values`);
  return output;
}

function requirePrivateRegularFile(rawPath, label, maximumBytes) {
  const resolved = path.resolve(rawPath);
  const metadata = fs.lstatSync(resolved);
  assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  assertCondition(metadata.size >= 1 && metadata.size <= maximumBytes, `${label} size is invalid`);
  if (process.platform !== "win32") {
    assertCondition((metadata.mode & 0o077) === 0, `${label} must not grant group or other permissions`);
  }
  return resolved;
}

function requirePrivateDirectory(rawPath, create) {
  const resolved = path.resolve(rawPath);
  if (create) fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const metadata = fs.lstatSync(resolved);
  assertCondition(metadata.isDirectory() && !metadata.isSymbolicLink(), "state directory must be a non-symlink directory");
  if (process.platform !== "win32") {
    assertCondition((metadata.mode & 0o077) === 0, "state directory must not grant group or other permissions");
  }
  fs.chmodSync(resolved, 0o700);
  return resolved;
}

function readPrivateJson(rawPath, label, maximumBytes) {
  const resolved = requirePrivateRegularFile(rawPath, label, maximumBytes);
  let value;
  try {
    value = JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch {
    fail(`${label} must contain valid JSON`);
  }
  assertCondition(isRecord(value), `${label} must contain an object`);
  return { path: resolved, value };
}

function writeExclusiveJson(rawPath, value) {
  const resolved = path.resolve(rawPath);
  const descriptor = fs.openSync(resolved, "wx", 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8" });
  } finally {
    fs.closeSync(descriptor);
  }
  fs.chmodSync(resolved, 0o600);
  return resolved;
}

function writeAtomicJson(rawPath, value) {
  const resolved = path.resolve(rawPath);
  const temporary = `${resolved}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  writeExclusiveJson(temporary, value);
  fs.renameSync(temporary, resolved);
  fs.chmodSync(resolved, 0o600);
  return resolved;
}

function readState(stateDirectory) {
  return readPrivateJson(path.join(stateDirectory, STATE_FILE), "canary state", MAX_STATE_BYTES).value;
}

function writeInitialState(stateDirectory, value) {
  return writeExclusiveJson(path.join(stateDirectory, STATE_FILE), value);
}

function updateState(stateDirectory, value) {
  return writeAtomicJson(path.join(stateDirectory, STATE_FILE), value);
}

function inheritedEnvironment() {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry) => typeof entry[1] === "string"),
  );
}

export function normalizeGatewayBaseUrl(raw) {
  const value = new URL(requireString(raw, "base URL", 8, 2048));
  assertCondition(!value.username && !value.password, "base URL credentials are forbidden");
  const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(value.hostname.toLowerCase());
  assertCondition(value.protocol === "https:" || (value.protocol === "http:" && loopback), "base URL must use HTTPS or loopback HTTP");
  assertCondition(!value.search && !value.hash, "base URL query and fragment are forbidden");
  assertCondition(value.port !== "4100", "port 4100 is the general VOID node origin, not the isolated AI-agent gateway");
  return new URL("/", value).href;
}

export function validateCanaryInput(raw) {
  assertCondition(isRecord(raw), "input must be an object");
  assertCondition(raw.marker === INPUT_MARKER, "input marker mismatch");
  assertCondition(raw.version === 1, "input version must be 1");
  const canaryId = requireString(raw.canary_id, "canary_id", 8, 180);
  assertCondition(CANARY_ID.test(canaryId), "canary_id contains unsupported characters");
  assertCondition(raw.service_id === SERVICE_ID, `service_id must be ${SERVICE_ID}`);
  const createdAt = requireString(raw.created_at_utc, "created_at_utc", 20, 20);
  const expiresAt = requireString(raw.expires_at_utc, "expires_at_utc", 20, 20);
  assertCondition(ISO_UTC.test(createdAt) && Number.isFinite(Date.parse(createdAt)), "created_at_utc is invalid");
  assertCondition(ISO_UTC.test(expiresAt) && Number.isFinite(Date.parse(expiresAt)), "expires_at_utc is invalid");
  assertCondition(Date.parse(expiresAt) > Date.parse(createdAt), "expires_at_utc must be later than created_at_utc");
  const requesterAgentId = requireString(raw.requester_agent_id, "requester_agent_id", 3, 128);
  assertCondition(AGENT_ID.test(requesterAgentId), "requester_agent_id contains unsupported characters");
  const callbackUri = requireString(raw.callback_uri, "callback_uri", 12, 2048);
  const callback = new URL(callbackUri);
  assertCondition(callbackUri.startsWith("https://") && callback.protocol === "https:" && !callback.username && !callback.password && !callback.hash, "callback_uri must use lowercase HTTPS with no credentials or fragment");
  const objective = requireString(raw.objective, "objective", 1, 4000);
  const inputRefs = requireStringArray(raw.input_refs, "input_refs", 64, 2048);
  const expectedOutputs = requireStringArray(raw.expected_outputs, "expected_outputs", 64, 256);
  assertCondition(expectedOutputs.every((value) => /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value)), "expected_outputs contains unsupported characters");
  const quoteAsset = requireString(raw.quote_asset, "quote_asset", 1, 32);
  assertCondition(ASSET.test(quoteAsset), "quote_asset is invalid");
  const maxTotal = requireString(raw.max_total, "max_total", 1, 51);
  assertCondition(AMOUNT.test(maxTotal), "max_total must be a canonical decimal amount");
  assertCondition(Number.isInteger(raw.max_runtime_seconds) && raw.max_runtime_seconds >= 1 && raw.max_runtime_seconds <= 86_400, "max_runtime_seconds is invalid");
  assertCondition(Number.isInteger(raw.max_output_bytes) && raw.max_output_bytes >= 1 && raw.max_output_bytes <= 100_000_000, "max_output_bytes is invalid");
  const orderNonce = requireString(raw.order_nonce, "order_nonce", 8, 128);
  const submissionNonce = requireString(raw.submission_nonce, "submission_nonce", 8, 128);
  assertCondition(NONCE.test(orderNonce) && NONCE.test(submissionNonce), "nonce contains unsupported characters");
  assertCondition(raw.expect_new === true, "live canary requires expect_new=true");
  const allowed = new Set([
    "marker", "version", "canary_id", "service_id", "created_at_utc", "expires_at_utc",
    "requester_agent_id", "callback_uri", "objective", "input_refs", "expected_outputs",
    "quote_asset", "max_total", "max_runtime_seconds", "max_output_bytes", "order_nonce",
    "submission_nonce", "expect_new",
  ]);
  for (const key of Object.keys(raw)) assertCondition(allowed.has(key), `unknown input key: ${key}`);
  return Object.freeze({
    marker: INPUT_MARKER,
    version: 1,
    canary_id: canaryId,
    service_id: SERVICE_ID,
    created_at_utc: createdAt,
    expires_at_utc: expiresAt,
    requester_agent_id: requesterAgentId,
    callback_uri: callbackUri,
    objective,
    input_refs: inputRefs,
    expected_outputs: expectedOutputs,
    quote_asset: quoteAsset,
    max_total: maxTotal,
    max_runtime_seconds: raw.max_runtime_seconds,
    max_output_bytes: raw.max_output_bytes,
    order_nonce: orderNonce,
    submission_nonce: submissionNonce,
    expect_new: true,
  });
}

function assertFreshForPreparation(input, now = Date.now()) {
  const created = Date.parse(input.created_at_utc);
  const expires = Date.parse(input.expires_at_utc);
  assertCondition(created <= now + 5 * 60_000, "created_at_utc is too far in the future");
  assertCondition(expires >= now + 60_000, "expires_at_utc must remain valid for at least 60 seconds");
  assertCondition(expires <= now + 24 * 60 * 60_000, "expires_at_utc exceeds the 24-hour canary window");
}

function toPrepareArguments(input) {
  return {
    service_id: input.service_id,
    created_at_utc: input.created_at_utc,
    expires_at_utc: input.expires_at_utc,
    requester_agent_id: input.requester_agent_id,
    callback_uri: input.callback_uri,
    objective: input.objective,
    input_refs: [...input.input_refs],
    expected_outputs: [...input.expected_outputs],
    quote_asset: input.quote_asset,
    max_total: input.max_total,
    max_runtime_seconds: input.max_runtime_seconds,
    max_output_bytes: input.max_output_bytes,
    order_nonce: input.order_nonce,
    submission_nonce: input.submission_nonce,
  };
}

function requireRepoRoot(rawPath) {
  const root = fs.realpathSync(path.resolve(rawPath));
  const required = [
    "integrations/mcp/dist/src/stdio.js",
    "integrations/mcp/package.json",
    ...SOURCE_CONTRACT_FILES,
  ];
  for (const relative of required) {
    const metadata = fs.lstatSync(path.join(root, relative));
    assertCondition(metadata.isFile() && !metadata.isSymbolicLink(), `required repository file is unavailable: ${relative}`);
  }
  return root;
}

function sourceContract(repoRoot) {
  const files = Object.fromEntries(
    SOURCE_CONTRACT_FILES.map((relative) => [
      normalizedPath(relative),
      sha256(fs.readFileSync(path.join(repoRoot, relative))),
    ]),
  );
  return {
    files,
    aggregate_sha256: sha256(canonicalJson(files)),
  };
}

function gitHead(repoRoot) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function requireCleanTrackedWorktree(repoRoot) {
  const status = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=no"],
    { cwd: repoRoot, encoding: "utf8" },
  ).trim();
  assertCondition(status === "", "repository tracked files must be clean for an MCP canary run");
}

function authorityAllFalse(value) {
  return isRecord(value) && Object.keys(value).length > 0 && Object.values(value).every((entry) => entry === false);
}

function structured(result, label) {
  assertCondition(isRecord(result), `${label} result must be an object`);
  assertCondition(result.isError !== true, `${label} failed: ${extractToolText(result)}`);
  assertCondition(isRecord(result.structuredContent), `${label} structuredContent is missing`);
  return result.structuredContent;
}

function extractToolText(result) {
  if (!isRecord(result) || !Array.isArray(result.content)) return "unknown MCP tool error";
  return result.content
    .filter((entry) => isRecord(entry) && entry.type === "text" && typeof entry.text === "string")
    .map((entry) => entry.text)
    .join("\n") || "unknown MCP tool error";
}

function preparedIdentity(value) {
  assertCondition(value.marker === "VOID_AGENT_MCP_PREPARED_SUBMISSION_V1", "prepared marker mismatch");
  assertCondition(value.network_submission_performed === false, "preparation performed a network submission");
  assertCondition(value.accepted_for_review === false, "preparation claimed acceptance");
  assertCondition(authorityAllFalse(value.authority), "preparation granted authority");
  const workOrderId = requireString(value.work_order_id, "work_order_id", 73, 73);
  const submissionId = requireString(value.submission_id, "submission_id", 74, 74);
  const requestSha256 = requireString(value.request_sha256, "request_sha256", 64, 64);
  assertCondition(/^voidawo1_[0-9a-f]{64}$/.test(workOrderId), "work_order_id format mismatch");
  assertCondition(/^voidawsr1_[0-9a-f]{64}$/.test(submissionId), "submission_id format mismatch");
  assertCondition(/^[0-9a-f]{64}$/.test(requestSha256), "request_sha256 format mismatch");
  return { work_order_id: workOrderId, submission_id: submissionId, request_sha256: requestSha256 };
}

function samePrepared(first, second) {
  return canonicalJson(preparedIdentity(first)) === canonicalJson(preparedIdentity(second))
    && canonicalJson(first.request) === canonicalJson(second.request);
}

function cleanChildEnvironment(repoRoot, baseUrl, allowSubmit, tokenFile) {
  const env = inheritedEnvironment();
  delete env.VOID_MCP_ALLOW_SUBMIT;
  delete env.VOID_MCP_TOKEN_FILE;
  env.VOID_MCP_REPO_ROOT = repoRoot;
  env.VOID_MCP_BASE_URL = baseUrl;
  env.VOID_MCP_ALLOW_SUBMIT = allowSubmit ? "1" : "0";
  if (allowSubmit) env.VOID_MCP_TOKEN_FILE = tokenFile;
  return env;
}

export async function createOfficialMcpSession({ repoRoot, baseUrl, allowSubmit, tokenFile }) {
  const scopedRequire = createRequire(path.join(repoRoot, "integrations/mcp/package.json"));
  const clientEntry = scopedRequire.resolve("@modelcontextprotocol/client");
  const stdioEntry = scopedRequire.resolve("@modelcontextprotocol/client/stdio");
  const [{ Client }, { StdioClientTransport }] = await Promise.all([
    import(pathToFileURL(clientEntry).href),
    import(pathToFileURL(stdioEntry).href),
  ]);
  const client = new Client(
    { name: "void-agent-mcp-authenticated-submission-live-canary-v1", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(repoRoot, "integrations/mcp/dist/src/stdio.js")],
    env: cleanChildEnvironment(repoRoot, baseUrl, allowSubmit, tokenFile),
    stderr: "pipe",
  });
  await client.connect(transport);
  return {
    protocolVersion: client.getNegotiatedProtocolVersion(),
    listTools: async () => await client.listTools(),
    callTool: async (request) => await client.callTool(request),
    close: async () => await client.close(),
  };
}

function validateToolSet(listed, allowSubmit) {
  assertCondition(isRecord(listed) && Array.isArray(listed.tools), "MCP tool list is invalid");
  const names = listed.tools.map((tool) => isRecord(tool) ? tool.name : null).filter((value) => typeof value === "string").sort();
  const expected = allowSubmit ? [...DEFAULT_TOOLS, SUBMIT_TOOL].sort() : [...DEFAULT_TOOLS].sort();
  assertCondition(canonicalJson(names) === canonicalJson(expected), `MCP tool set mismatch: ${names.join(",")}`);
}

function operationId(baseUrl, inputSha256, sourceContractSha256, repoHead) {
  return `voidmcpac1_${sha256(canonicalJson({ base_url: baseUrl, input_sha256: inputSha256, source_contract_sha256: sourceContractSha256, repo_head: repoHead }))}`;
}

function safeError(error, secrets = []) {
  let text = error instanceof Error ? error.message : String(error);
  for (const secret of secrets.filter(Boolean)) text = text.split(secret).join("[REDACTED]");
  return text.slice(0, 4096);
}

function loadExecutionContext(options, freshness) {
  const repoRoot = requireRepoRoot(options.repoRoot);
  requireCleanTrackedWorktree(repoRoot);
  const baseUrl = normalizeGatewayBaseUrl(options.baseUrl);
  const inputRecord = readPrivateJson(options.inputPath, "canary input", MAX_INPUT_BYTES);
  const input = validateCanaryInput(inputRecord.value);
  if (freshness) assertFreshForPreparation(input, options.now?.() ?? Date.now());
  const inputSha256 = sha256(canonicalJson(input));
  const contract = sourceContract(repoRoot);
  const stateDirectory = requirePrivateDirectory(options.stateDirectory, true);
  const repoHead = gitHead(repoRoot);
  return {
    repoRoot,
    baseUrl,
    input,
    inputSha256,
    sourceContract: contract,
    stateDirectory,
    repoHead,
    operationId: operationId(baseUrl, inputSha256, contract.aggregate_sha256, repoHead),
  };
}

async function closeSessionBestEffort(session) {
  if (!session) return;
  try {
    await session.close();
  } catch (error) {
    void error;
  }
}

export async function prepareCanary(options) {
  const context = loadExecutionContext(options, true);
  const statePath = path.join(context.stateDirectory, STATE_FILE);
  assertCondition(!fs.existsSync(statePath), "canary state already exists; use a fresh state directory");
  const sessionFactory = options.sessionFactory ?? createOfficialMcpSession;
  const session = await sessionFactory({
    repoRoot: context.repoRoot,
    baseUrl: context.baseUrl,
    allowSubmit: false,
    tokenFile: null,
  });
  let probeEnvelope;
  let first;
  let second;
  try {
    assertCondition(session.protocolVersion === "2026-07-28", "MCP protocol version mismatch");
    validateToolSet(await session.listTools(), false);
    probeEnvelope = structured(await session.callTool({ name: "void_probe_paid_work", arguments: {} }), "paid-work probe");
    assertCondition(probeEnvelope.marker === "VOID_AGENT_MCP_PAID_WORK_PROBE_RESULT_V1", "MCP paid-work probe envelope marker mismatch");
    assertCondition(authorityAllFalse(probeEnvelope.authority), "MCP paid-work probe envelope granted authority");
    assertCondition(isRecord(probeEnvelope.result), "MCP paid-work probe client result is missing");
    const probe = probeEnvelope.result;
    assertCondition(probe.marker === "VOID_AI_AGENT_PAID_WORK_CLIENT_V1", "paid-work probe marker mismatch");
    assertCondition(probe.discovery?.marker === "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1", "agent gateway discovery marker mismatch");
    assertCondition(probe.submission_route?.http_status === 405, "paid-work route probe did not return 405");
    assertCondition(probe.submission_route?.request_body_sent === false, "paid-work probe sent a request body");
    assertCondition(probe.submission_route?.authorization_header_sent === false, "paid-work probe sent credentials");
    assertCondition(authorityAllFalse(probe.authority), "paid-work probe client granted authority");
    const argumentsValue = toPrepareArguments(context.input);
    first = structured(await session.callTool({ name: "void_prepare_paid_work_submission", arguments: argumentsValue }), "first deterministic preparation");
    second = structured(await session.callTool({ name: "void_prepare_paid_work_submission", arguments: argumentsValue }), "second deterministic preparation");
    assertCondition(samePrepared(first, second), "repeated preparation was not deterministic");
  } finally {
    await closeSessionBestEffort(session);
  }
  const identity = preparedIdentity(first);
  const nowUtc = new Date(options.now?.() ?? Date.now()).toISOString();
  const state = {
    marker: STATE_MARKER,
    version: 1,
    operation_id: context.operationId,
    canary_id: context.input.canary_id,
    status: "prepared",
    attempt_count: 0,
    repo_head: context.repoHead,
    created_at_utc: nowUtc,
    updated_at_utc: nowUtc,
    base_origin: new URL(context.baseUrl).origin,
    input_sha256: context.inputSha256,
    source_contract_sha256: context.sourceContract.aggregate_sha256,
    source_contract_files: context.sourceContract.files,
    prepared: identity,
    accepted_for_review: false,
    duplicate: false,
    conflicting_duplicate: false,
    hold_reason: null,
    authority: {
      network_submission: false,
      credential_issue_or_activation: false,
      payment_execution: false,
      paid_work_execution: false,
      work_credit_award: false,
      work_credit_ledger_write: false,
      void_settlement: false,
      wallet_or_signer_access: false,
      transaction_broadcast: false,
      runtime_mutation: false,
      deployment: false,
    },
  };
  writeInitialState(context.stateDirectory, state);
  const receipt = {
    marker: PREPARED_RECEIPT_MARKER,
    version: 1,
    operation_id: context.operationId,
    canary_id: context.input.canary_id,
    prepared: identity,
    protocol_version: "2026-07-28",
    repo_head: context.repoHead,
    source_contract_sha256: context.sourceContract.aggregate_sha256,
    gateway_probe_status: 405,
    submit_tool_registered: false,
    deterministic_preparation: true,
    network_submission_performed: false,
    authority_all_false: true,
  };
  writeExclusiveJson(path.join(context.stateDirectory, PREPARED_RECEIPT_FILE), receipt);
  return { context, state, receipt };
}

function validatePreparedState(context, state) {
  assertCondition(state.marker === STATE_MARKER && state.version === 1, "state identity mismatch");
  assertCondition(state.operation_id === context.operationId, "state operation binding mismatch");
  assertCondition(state.canary_id === context.input.canary_id, "state canary binding mismatch");
  assertCondition(state.base_origin === new URL(context.baseUrl).origin, "state gateway binding mismatch");
  assertCondition(state.input_sha256 === context.inputSha256, "state input binding mismatch");
  assertCondition(state.repo_head === context.repoHead, "repository HEAD changed after preparation");
  assertCondition(state.source_contract_sha256 === context.sourceContract.aggregate_sha256, "MCP source contract changed after preparation");
  assertCondition(state.status === "prepared" && state.attempt_count === 0, "canary is not in a fresh prepared state");
  assertCondition(isRecord(state.prepared), "prepared identity is missing from state");
  return preparedIdentity({ marker: "VOID_AGENT_MCP_PREPARED_SUBMISSION_V1", network_submission_performed: false, accepted_for_review: false, authority: { denied: false }, ...state.prepared });
}

function validateSubmissionResult(value, prepared, expectNew) {
  assertCondition(value.marker === "VOID_AGENT_MCP_SUBMISSION_RESULT_V1", "submission result marker mismatch");
  assertCondition(isRecord(value.prepared), "submission result prepared payload is missing");
  const returnedPrepared = preparedIdentity(value.prepared);
  assertCondition(canonicalJson(returnedPrepared) === canonicalJson(prepared), "submission result prepared identity mismatch");
  assertCondition(isRecord(value.interpretation), "submission interpretation is missing");
  const interpretation = value.interpretation;
  assertCondition(interpretation.accepted_for_review === true, "submission was not accepted for review");
  assertCondition(interpretation.conflicting_duplicate === false, "submission returned a conflicting duplicate");
  if (expectNew) assertCondition(interpretation.duplicate === false, "live canary expected a new submission but received a duplicate");
  for (const key of [
    "payment_executed", "paid_work_execution_started", "work_dispatched", "work_credit_awarded",
    "work_credit_ledger_written", "void_settled",
  ]) assertCondition(interpretation[key] === false, `submission interpretation granted forbidden effect: ${key}`);
  assertCondition(authorityAllFalse(value.authority), "submission result granted authority");
  assertCondition(isRecord(value.client_result), "submission client result is missing");
  assertCondition(value.client_result.accepted_for_review === true, "client result did not confirm accepted_for_review");
  assertCondition(value.client_result.successful_authentication === true, "client result did not confirm authentication");
  assertCondition(value.client_result.request_sha256 === prepared.request_sha256, "client request hash mismatch");
  return {
    accepted_for_review: true,
    duplicate: interpretation.duplicate === true,
    conflicting_duplicate: false,
    receipt_id: typeof value.client_result.receipt_id === "string" ? value.client_result.receipt_id : null,
    client_http_status: value.client_result.http_status,
  };
}

export async function executeCanary(options) {
  assertCondition(options.allowLiveSubmit === true, "live submission requires --allow-live-submit");
  assertCondition(options.confirmation === CONFIRMATION, `confirmation must be exactly ${CONFIRMATION}`);
  const tokenFile = requirePrivateRegularFile(options.tokenFile, "MCP token file", 8193);
  const context = loadExecutionContext(options, true);
  const state = readState(context.stateDirectory);
  const prepared = validatePreparedState(context, state);
  const attempting = {
    ...state,
    status: "attempting",
    attempt_count: 1,
    updated_at_utc: new Date(options.now?.() ?? Date.now()).toISOString(),
    attempted_at_utc: new Date(options.now?.() ?? Date.now()).toISOString(),
  };
  updateState(context.stateDirectory, attempting);
  const sessionFactory = options.sessionFactory ?? createOfficialMcpSession;
  let session;
  try {
    session = await sessionFactory({
      repoRoot: context.repoRoot,
      baseUrl: context.baseUrl,
      allowSubmit: true,
      tokenFile,
    });
    assertCondition(session.protocolVersion === "2026-07-28", "MCP protocol version mismatch");
    validateToolSet(await session.listTools(), true);
    const result = structured(
      await session.callTool({
        name: SUBMIT_TOOL,
        arguments: {
          ...toPrepareArguments(context.input),
          confirm: "submit-paid-work",
          expect_new: context.input.expect_new,
        },
      }),
      "authenticated MCP submission",
    );
    const interpretation = validateSubmissionResult(result, prepared, context.input.expect_new);
    const serialized = canonicalJson(result);
    assertCondition(!serialized.includes(tokenFile), "token-file path disclosure blocked");
    const nowUtc = new Date(options.now?.() ?? Date.now()).toISOString();
    const completed = {
      ...attempting,
      status: "completed",
      updated_at_utc: nowUtc,
      completed_at_utc: nowUtc,
      accepted_for_review: true,
      duplicate: interpretation.duplicate,
      conflicting_duplicate: false,
      receipt_id: interpretation.receipt_id,
      client_http_status: interpretation.client_http_status,
      hold_reason: null,
    };
    updateState(context.stateDirectory, completed);
    const receipt = {
      marker: COMPLETION_RECEIPT_MARKER,
      version: 1,
      operation_id: context.operationId,
      canary_id: context.input.canary_id,
      repo_head: context.repoHead,
      source_contract_sha256: context.sourceContract.aggregate_sha256,
      prepared,
      accepted_for_review: true,
      duplicate: interpretation.duplicate,
      conflicting_duplicate: false,
      receipt_id: interpretation.receipt_id,
      client_http_status: interpretation.client_http_status,
      network_submission_performed: true,
      maximum_submission_attempt_count: 1,
      submission_attempt_count: 1,
      automatic_retry: false,
      payment_executed: false,
      paid_work_execution_started: false,
      work_dispatched: false,
      work_credit_awarded: false,
      work_credit_ledger_written: false,
      void_settled: false,
      wallet_or_signer_access: false,
      transaction_broadcast: false,
      runtime_mutation: false,
      deployment: false,
      authority_all_false: true,
    };
    assertCondition(!canonicalJson(receipt).includes(tokenFile), "completion receipt disclosed token-file path");
    writeExclusiveJson(path.join(context.stateDirectory, COMPLETION_RECEIPT_FILE), receipt);
    return { context, state: completed, receipt, result };
  } catch (error) {
    const held = {
      ...attempting,
      status: "held",
      updated_at_utc: new Date(options.now?.() ?? Date.now()).toISOString(),
      hold_reason: safeError(error, [tokenFile]),
    };
    updateState(context.stateDirectory, held);
    throw error;
  } finally {
    await closeSessionBestEffort(session);
  }
}

export function parseCli(argv) {
  const items = [...argv];
  const command = items.shift() ?? "";
  const output = {
    command,
    repoRoot: "",
    baseUrl: "",
    inputPath: "",
    stateDirectory: "",
    tokenFile: "",
    confirmation: "",
    allowLiveSubmit: false,
    help: false,
  };
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === "--help" || item === "-h") { output.help = true; continue; }
    if (item === "--allow-live-submit") { output.allowLiveSubmit = true; continue; }
    const next = items[index + 1] ?? "";
    if (item === "--repo-root") output.repoRoot = next;
    else if (item === "--base-url") output.baseUrl = next;
    else if (item === "--input") output.inputPath = next;
    else if (item === "--state-dir") output.stateDirectory = next;
    else if (item === "--token-file") output.tokenFile = next;
    else if (item === "--confirm") output.confirmation = next;
    else fail(`unknown argument: ${item}`);
    index += 1;
  }
  return output;
}

function usage() {
  return [
    "VOID Agent MCP Authenticated Submission Live Canary V1",
    "",
    "Prepare without POST:",
    "  node tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs prepare \\",
    "    --repo-root /path/to/void-node --base-url https://agent-gateway.example \\",
    "    --input /private/canary-input.json --state-dir /private/canary-state",
    "",
    "Execute exactly one authenticated MCP submission:",
    "  node tools/void-agent-mcp-authenticated-submission-live-canary-v1.mjs execute \\",
    "    --repo-root /path/to/void-node --base-url https://agent-gateway.example \\",
    "    --input /private/canary-input.json --state-dir /private/canary-state \\",
    "    --token-file /private/submit.token --allow-live-submit \\",
    `    --confirm ${CONFIRMATION}`,
    "",
    "Execution means accepted_for_review only. It does not execute payment, work, WC, VOID settlement, wallet, signing, broadcast, runtime, or deployment authority.",
  ].join("\n");
}

export async function runCli(argv) {
  const parsed = parseCli(argv);
  if (parsed.help) return { output: `${usage()}\n`, exitCode: 0 };
  assertCondition(parsed.command === "prepare" || parsed.command === "execute", "first argument must be prepare or execute");
  assertCondition(parsed.repoRoot && parsed.baseUrl && parsed.inputPath && parsed.stateDirectory, "repo-root, base-url, input, and state-dir are required");
  if (parsed.command === "prepare") {
    assertCondition(!parsed.tokenFile && !parsed.confirmation && !parsed.allowLiveSubmit, "prepare forbids token, confirmation, and live-submit gate");
    const result = await prepareCanary(parsed);
    return {
      output: [
        `${MARKER}=PREPARED`,
        `operation_id=${result.state.operation_id}`,
        `work_order_id=${result.state.prepared.work_order_id}`,
        `submission_id=${result.state.prepared.submission_id}`,
        `request_sha256=${result.state.prepared.request_sha256}`,
        "submit_tool_registered=false",
        "network_submission_performed=false",
        `state_dir=${path.resolve(parsed.stateDirectory)}`,
        "",
      ].join("\n"),
      exitCode: 0,
    };
  }
  assertCondition(parsed.tokenFile, "execute requires --token-file");
  const result = await executeCanary(parsed);
  return {
    output: [
      `${MARKER}=PASS`,
      `operation_id=${result.state.operation_id}`,
      `work_order_id=${result.state.prepared.work_order_id}`,
      `submission_id=${result.state.prepared.submission_id}`,
      `request_sha256=${result.state.prepared.request_sha256}`,
      "accepted_for_review=true",
      `duplicate=${result.state.duplicate}`,
      "conflicting_duplicate=false",
      "submission_attempt_count=1",
      "automatic_retry=false",
      "payment_execution=false",
      "paid_work_execution=false",
      "wc_ledger_write=false",
      "void_settlement=false",
      "wallet_or_signer_access=false",
      "transaction_broadcast=false",
      "runtime_mutation=false",
      "deployment=false",
      `state_dir=${path.resolve(parsed.stateDirectory)}`,
      "",
    ].join("\n"),
    exitCode: 0,
  };
}

const invoked = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invoked === import.meta.url) {
  runCli(process.argv.slice(2)).then((result) => {
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  }).catch((error) => {
    process.stderr.write(`HOLD: ${safeError(error)}\n`);
    process.exitCode = 2;
  });
}
