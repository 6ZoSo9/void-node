#!/usr/bin/env node
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const VOID_AI_AGENT_PAID_WORK_CLIENT_V1 =
  "VOID_AI_AGENT_PAID_WORK_CLIENT_V1";
export const VOID_AI_AGENT_PAID_WORK_CLIENT_RESULT_SCHEMA_V1 =
  "void_ai_agent_paid_work_client_result_v1";

const DISCOVERY_PATH = "/.well-known/void-agent-discovery.json";
const SUBMISSION_PATH = "/__void/agents/paid-work/submissions/v1";
const ROUTE_HEADER = "x-void-agent-paid-work-submission-route";
const REQUEST_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1";
const RECEIPT_MARKER = "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESPONSE_BYTES_LIMIT = 4_194_304;
const MAX_REQUEST_BYTES = 65_536;
const REJECTION_TEARDOWN_MAX_MS = 250;
const RESPONSE_READ_QUARANTINES_V1 = new Map();

function retireResponseGenerationV1(origin, generation) {
  if (RESPONSE_READ_QUARANTINES_V1.get(origin) === generation) {
    RESPONSE_READ_QUARANTINES_V1.delete(origin);
  }
}

function usage() {
  return [
    "VOID AI Agent Paid Work Client V1",
    "",
    "Usage:",
    "  node tools/void-ai-agent-paid-work-client-v1.mjs probe \\",
    "    --base-url https://example.invalid [options]",
    "",
    "  node tools/void-ai-agent-paid-work-client-v1.mjs submit \\",
    "    --base-url https://example.invalid \\",
    "    --request work-order-submission.json \\",
    "    --token-file /secure/path/token [options]",
    "",
    "Options:",
    "  --base-url URL             Required network origin.",
    "  --request PATH             Submit mode request JSON.",
    "  --token-file PATH          Submit mode bearer-token file.",
    "  --output PATH              Optional exclusive mode-0600 JSON output.",
    "  --pretty                   Pretty-print JSON.",
    "  --expect-new               Require HTTP 202, not duplicate HTTP 200.",
    "  --timeout-ms N             Per-request timeout (default 10000).",
    "  --max-response-bytes N     Response maximum (default 1048576).",
    "  --help                     Show this help.",
    "",
    "Security:",
    "  HTTPS or loopback HTTP only; redirects rejected; no automatic retry.",
    "  Token values are read only from an owner-private regular file and",
    "  are never printed, returned, written to output, or placed in argv.",
    "",
    "Authority:",
    "  Submission grants accepted-for-review only. The client has no",
    "  provider selection, quote, payment, execution, dispatch, Work",
    "  Credit, wallet, signing, transaction, or Buy VOID authority.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function assertCondition(condition, message) {
  if (!condition) fail(message);
}

function parsePositiveInteger(raw, label, maximum) {
  const text = String(raw ?? "");
  assertCondition(/^(?:0|[1-9]\d*)$/.test(text), `${label} must be a decimal integer`);
  const value = Number(text);
  assertCondition(
    Number.isSafeInteger(value) && value > 0 && value <= maximum,
    `${label} must be 1..${maximum}`,
  );
  return value;
}

export function parsePaidWorkClientArgsV1(argv) {
  const output = {
    mode: "",
    baseUrl: "",
    requestPath: "",
    tokenFile: "",
    outputPath: "",
    pretty: false,
    expectNew: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxResponseBytes: DEFAULT_MAX_RESPONSE_BYTES,
    help: false,
  };

  const items = [...argv];
  if (items[0] === "probe" || items[0] === "submit") {
    output.mode = items.shift();
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (item === "--help" || item === "-h") {
      output.help = true;
      continue;
    }
    if (item === "--pretty") {
      output.pretty = true;
      continue;
    }
    if (item === "--expect-new") {
      output.expectNew = true;
      continue;
    }
    if (item === "--base-url") {
      output.baseUrl = String(items[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (item === "--request") {
      output.requestPath = String(items[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (item === "--token-file") {
      output.tokenFile = String(items[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (item === "--output") {
      output.outputPath = String(items[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (item === "--timeout-ms") {
      output.timeoutMs = parsePositiveInteger(
        items[index + 1],
        "timeout-ms",
        MAX_TIMEOUT_MS,
      );
      index += 1;
      continue;
    }
    if (item === "--max-response-bytes") {
      output.maxResponseBytes = parsePositiveInteger(
        items[index + 1],
        "max-response-bytes",
        MAX_RESPONSE_BYTES_LIMIT,
      );
      index += 1;
      continue;
    }

    throw new Error(`unknown argument: ${item}`);
  }

  return output;
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname ?? "").trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

export function normalizePaidWorkBaseUrlV1(raw) {
  const value = new URL(String(raw ?? ""));
  assertCondition(!value.username && !value.password, "base URL credentials are forbidden");
  assertCondition(
    value.protocol === "https:" ||
      (value.protocol === "http:" && isLoopbackHostname(value.hostname)),
    "base URL must use HTTPS or loopback HTTP",
  );
  assertCondition(!value.search && !value.hash, "base URL query and fragment are forbidden");
  return new URL("/", value);
}

function sameOriginUrl(base, route) {
  const resolved = new URL(route, base);
  assertCondition(resolved.origin === base.origin, `cross-origin route forbidden: ${resolved.href}`);
  assertCondition(!resolved.username && !resolved.password, "route credentials are forbidden");
  return resolved;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function requireRegularPrivateFile(rawPath, label, maximumBytes) {
  const resolved = path.resolve(process.cwd(), String(rawPath ?? ""));
  const metadata = lstatSync(resolved);
  assertCondition(
    metadata.isFile() && !metadata.isSymbolicLink(),
    `${label} must be a regular non-symlink file`,
  );
  assertCondition(
    metadata.size > 0 && metadata.size <= maximumBytes,
    `${label} size must be 1..${maximumBytes}`,
  );
  if (process.platform !== "win32") {
    assertCondition(
      (metadata.mode & 0o077) === 0,
      `${label} must not grant group or other permissions`,
    );
  }
  return { path: resolved, metadata };
}

export function readPaidWorkTokenFileV1(rawPath) {
  const file = requireRegularPrivateFile(rawPath, "token file", 8193);
  const raw = readFileSync(file.path, "utf8");
  const token = raw.replace(/\r?\n$/, "");
  assertCondition(token.length >= 16 && token.length <= 8192, "token length must be 16..8192");
  assertCondition(!/\s/.test(token), "token must not contain whitespace");
  return token;
}

function requirePlainObject(value, label) {
  assertCondition(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value;
}

export function readPaidWorkSubmissionRequestV1(rawPath) {
  const file = requireRegularPrivateFile(rawPath, "request file", MAX_REQUEST_BYTES);
  const bytes = readFileSync(file.path);
  assertCondition(bytes.byteLength <= MAX_REQUEST_BYTES, `request exceeds ${MAX_REQUEST_BYTES} bytes`);

  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    fail("request file must contain valid UTF-8 JSON");
  }

  requirePlainObject(value, "request");
  assertCondition(value.marker === REQUEST_MARKER, "request marker mismatch");
  assertCondition(value.version === 1, "request version must be 1");
  assertCondition(
    typeof value.submission_id === "string" &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(value.submission_id),
    "submission_id has invalid format",
  );
  const workOrder = requirePlainObject(value.work_order, "work_order");
  assertCondition(
    workOrder.marker === "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    "work_order marker mismatch",
  );
  assertCondition(workOrder.version === 1, "work_order version must be 1");
  assertCondition(
    typeof workOrder.work_order_id === "string" &&
      /^voidawo1_[0-9a-f]{64}$/.test(workOrder.work_order_id),
    "work_order_id has invalid format",
  );

  return {
    bytes,
    value,
    submissionId: value.submission_id,
    workOrderId: workOrder.work_order_id,
    sha256: sha256(bytes),
  };
}

async function settleCancellationBounded(target, controller, onConfirmed = null) {
  // Capture the exact cancellation capability before abort dispatch: an
  // injected synchronous AbortSignal listener can replace a pending cancel
  // with a resolved no-op. Failing capture still aborts but never qualifies
  // cleanup or releases an unresolved origin.
  let cancelMethod;
  let captureFailed = false;
  try {
    cancelMethod = target?.cancel;
  } catch {
    captureFailed = true;
  }
  if (!controller.signal.aborted) {
    controller.abort();
  }
  if (captureFailed || typeof cancelMethod !== "function") return;
  let cancellation;
  try {
    cancellation = Promise.resolve(Reflect.apply(cancelMethod, target, []));
  } catch {
    return;
  }

  // Observe confirmed cancellation even if it settles after the bounded
  // caller teardown wait. Rejection/timeout cannot certify stream closure.
  const witnessedCancellation = cancellation.then(
    () => {
      if (typeof onConfirmed === "function") {
        try { onConfirmed(); } catch { /* remain fail-closed */ }
      }
    },
    () => undefined,
  );
  let timer;
  try {
    await Promise.race([
      witnessedCancellation,
      new Promise((resolve) => {
        timer = setTimeout(resolve, REJECTION_TEARDOWN_MAX_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// An ordinary response rejection can leave its body active. Preserve the
// origin slot until cancellation succeeds; timeout/rejection is not cleanup.
async function cancelBodyWithGenerationV1(body, controller, origin, generation) {
  if (body !== null && body !== undefined) {
    generation.unresolvedOperation = true;
  }
  await settleCancellationBounded(body, controller, () => {
    retireResponseGenerationV1(origin, generation);
  });
}

function releaseReaderLockBestEffortV1(reader) {
  try {
    reader.releaseLock();
    return true;
  } catch {
    // Uncertain reader lock ownership cannot release an unresolved generation.
    return false;
  }
}

// A custom fetch implementation may ignore AbortSignal just as a stream
// reader may. Own the same original request deadline through response headers.
// An unfinished fetch keeps its per-origin slot until its late settlement,
// and a late response with a body keeps the slot through actual cancellation.
async function fetchAgainstOwnedDeadlineV1(
  fetchPromise,
  controller,
  origin,
  generation,
) {
  let deadlineWon = false;
  let rejectDeadline;
  const deadline = new Promise((_, reject) => {
    rejectDeadline = reject;
  });
  const onAbort = () => {
    deadlineWon = true;
    rejectDeadline(new DOMException("response_fetch_timeout", "AbortError"));
  };
  if (controller.signal.aborted) {
    onAbort();
  } else {
    controller.signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    return await Promise.race([fetchPromise, deadline]);
  } catch (error) {
    if (deadlineWon) {
      generation.unresolvedOperation = true;
      const retire = () => retireResponseGenerationV1(origin, generation);
      const onLateResponse = (response) => {
        try {
          const body = response?.body;
          if (!body) {
            retire();
            return;
          }
          // If a late body cannot be cancelled, retain the fail-closed slot;
          // allowing another generation would accumulate abandoned bodies.
          const cancelMethod = body.cancel;
          if (typeof cancelMethod !== "function") return;
          const cancellation = Promise.resolve(
            Reflect.apply(cancelMethod, body, []),
          );
          // A rejecting or permanently pending cancellation cannot prove
          // cleanup. Only the exact successful settlement retires this slot.
          void cancellation.then(retire, () => undefined);
        } catch {
          // Uncertain late body cleanup remains quarantined.
        }
      };
      void fetchPromise.then(onLateResponse, retire);
      // Fetch may reject from its earlier-installed abort listener before
      // Promise.race receives our deadline rejection. Once the owned clock
      // wins, return the deterministic owned AbortError, not fetch's error.
      throw new DOMException("response_fetch_timeout", "AbortError");
    }
    throw error;
  } finally {
    controller.signal.removeEventListener("abort", onAbort);
  }
}

async function readAgainstOwnedDeadlineV1(
  reader,
  controller,
  readScope,
  readGeneration,
  deferRelease,
) {
  const readPromise = Promise.resolve().then(() => reader.read());
  let deadlineWon = false;
  let rejectDeadline;
  const deadline = new Promise((_, reject) => {
    rejectDeadline = reject;
  });
  const onAbort = () => {
    deadlineWon = true;
    rejectDeadline(new DOMException("response_body_read_timeout", "AbortError"));
  };

  if (controller.signal.aborted) {
    onAbort();
  } else {
    controller.signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    return await Promise.race([readPromise, deadline]);
  } catch (error) {
    if (deadlineWon) {
      // This origin was reserved before fetch initiation; retain the same
      // generation while an abort-ignoring reader remains unresolved.
      readGeneration.unresolvedOperation = true;
      deferRelease();
      // A partial late read is not terminal: the old body can remain live
      // even after read() settles. Only terminal done=true, or a *confirmed*
      // cancel together with settled read, permits retiring this origin.
      const cleanup = {
        readSettled: false,
        terminal: false,
        cancellationConfirmed: false,
        retired: false,
        releaseIfSafe() {
          if (this.retired || !this.readSettled ||
              (!this.terminal && !this.cancellationConfirmed)) return;
          if (!releaseReaderLockBestEffortV1(reader)) return;
          this.retired = true;
          retireResponseGenerationV1(readScope, readGeneration);
        },
        confirmCancellation() {
          this.cancellationConfirmed = true;
          this.releaseIfSafe();
        },
      };
      readGeneration.pendingReadCleanup = cleanup;
      void readPromise.then(
        (result) => {
          cleanup.readSettled = true;
          cleanup.terminal = result?.done === true;
          cleanup.releaseIfSafe();
        },
        () => {
          cleanup.readSettled = true;
          cleanup.releaseIfSafe();
        },
      );
      // A reader may register an earlier AbortSignal listener than this
      // deadline race. Preserve the owned result even if that reader's
      // rejection wins the Promise.race scheduling order.
      throw new DOMException("response_body_read_timeout", "AbortError");
    }
    throw error;
  } finally {
    controller.signal.removeEventListener("abort", onAbort);
  }
}

// Capture the admitted body only once. A response.body accessor can change,
// disappear, or throw between reader acquisition and cleanup.
function admittedResponseBodyV1(response, controller, generation) {
  try {
    return response.body;
  } catch (error) {
    generation.unresolvedOperation = true;
    if (!controller.signal.aborted) controller.abort();
    throw error;
  }
}

async function boundedRead(getHeader, responseBody, maximumBytes, controller, readScope, readGeneration) {
  let contentLengthRaw;
  try {
    contentLengthRaw = getHeader("content-length");
  } catch (error) {
    // Headers are untrusted until parsed. A throwing getter must not
    // release a still-live, already admitted body generation.
    await cancelBodyWithGenerationV1(
      responseBody, controller, readScope, readGeneration,
    );
    throw error;
  }
  if (contentLengthRaw !== null) {
    const contentLengthText =
      typeof contentLengthRaw === "string" ? contentLengthRaw.trim() : "";
    if (!/^(?:0|[1-9]\d*)$/.test(contentLengthText)) {
      await cancelBodyWithGenerationV1(
        responseBody, controller, readScope, readGeneration,
      );
      fail(`response_content_length_invalid:${contentLengthText}`);
    }
    const contentLength = Number(contentLengthText);
    if (!Number.isSafeInteger(contentLength) || contentLength > maximumBytes) {
      await cancelBodyWithGenerationV1(
        responseBody, controller, readScope, readGeneration,
      );
      fail(`response_too_large:${contentLengthText}`);
    }
  }

  if (!responseBody) {
    await cancelBodyWithGenerationV1(
      responseBody, controller, readScope, readGeneration,
    );
    fail("response_body_unavailable");
  }
  let reader;
  try {
    const getReader = responseBody.getReader;
    if (typeof getReader !== "function") fail("response_body_unavailable");
    reader = Reflect.apply(getReader, responseBody, []);
  } catch (error) {
    // Even a getReader accessor or an already-locked body can fail.
    // Cancel the original admitted body, never a re-read accessor.
    await cancelBodyWithGenerationV1(
      responseBody, controller, readScope, readGeneration,
    );
    throw error;
  }
  const chunks = [];
  let total = 0;
  let readerReleaseDeferred = false;

  try {
    while (true) {
      const { done, value } = await readAgainstOwnedDeadlineV1(
        reader,
        controller,
        readScope,
        readGeneration,
        () => {
          readerReleaseDeferred = true;
        },
      );
      if (done) break;
      assertCondition(value instanceof Uint8Array, "response_body_invalid_chunk");
      total += value.byteLength;
      if (total > maximumBytes) {
        fail(`response_too_large:${total}`);
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    if (readerReleaseDeferred) {
      // Deadline timeout has a pending read; retire it only after terminal
      // settlement or confirmed cancellation plus actual read settlement.
      await settleCancellationBounded(reader, controller, () => {
        readGeneration.pendingReadCleanup?.confirmCancellation();
      });
    } else {
      // A non-deadline reader/chunk failure can also leave an active body.
      // Keep its lock and origin slot until cancellation really succeeds.
      readGeneration.unresolvedOperation = true;
      readerReleaseDeferred = true;
      await settleCancellationBounded(reader, controller, () => {
        if (releaseReaderLockBestEffortV1(reader)) {
          retireResponseGenerationV1(readScope, readGeneration);
        }
      });
    }
    throw error;
  } finally {
    if (!readerReleaseDeferred) {
      releaseReaderLockBestEffortV1(reader);
    }
  }

  const bytes = Buffer.concat(chunks, total);
  return {
    bytes: bytes.byteLength,
    text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  };
}

function parseJsonObject(text, label) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail(`${label}:invalid_json`);
  }
  return requirePlainObject(value, label);
}

async function fetchBoundedV1({
  url,
  method,
  headers,
  body,
  timeoutMs,
  maximumBytes,
  fetchImpl,
}) {
  const readScope = new URL(url).origin;
  if (RESPONSE_READ_QUARANTINES_V1.has(readScope)) {
    fail("response_body_read_generation_unresolved");
  }
  // Reserve before the first await, rather than only after timeout. Without
  // this slot, simultaneous signal-ignoring reads can accumulate unbounded
  // unresolved generations under the same public origin.
  const readGeneration = { unresolvedOperation: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  RESPONSE_READ_QUARANTINES_V1.set(readScope, readGeneration);

  try {
    const fetchPromise = Promise.resolve(fetchImpl(url, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
    }));
    const response = await fetchAgainstOwnedDeadlineV1(
      fetchPromise, controller, readScope, readGeneration,
    );
    const responseBody = admittedResponseBodyV1(
      response, controller, readGeneration,
    );
    let status;
    let getHeader;
    try {
      // Read each untrusted response accessor exactly once.
      status = response.status;
      const headers = response.headers;
      const headerMethod = headers?.get;
      if (!Number.isInteger(status) || status < 100 || status > 599 ||
          typeof headerMethod !== "function") {
        fail("response_http_envelope_invalid");
      }
      getHeader = (name) => Reflect.apply(headerMethod, headers, [name]);
    } catch (error) {
      await cancelBodyWithGenerationV1(
        responseBody, controller, readScope, readGeneration,
      );
      throw error;
    }
    if (status >= 300 && status < 400) {
      await cancelBodyWithGenerationV1(
        responseBody, controller, readScope, readGeneration,
      );
      fail(`redirect_forbidden:${status}`);
    }
    const raw = await boundedRead(
      getHeader, responseBody,
      maximumBytes, controller, readScope, readGeneration,
    );
    // Callers consume a stable numeric status and one captured Header method,
    // never a second mutable getter on the response-like object.
    return { response: { status, headers: { get: getHeader } }, raw };
  } finally {
    clearTimeout(timer);
    // Normal/error completion retires only its own slot. An unresolved read
    // owns the slot until its *actual* read promise settles and releases.
    if (!readGeneration.unresolvedOperation) {
      retireResponseGenerationV1(readScope, readGeneration);
    }
  }
}

function authorityAllFalse(value) {
  const authority = value?.authority;
  return (
    authority !== null &&
    typeof authority === "object" &&
    !Array.isArray(authority) &&
    Object.keys(authority).length > 0 &&
    Object.values(authority).every((entry) => entry === false)
  );
}

function validateAcceptedReceipt(value) {
  requirePlainObject(value, "receipt");
  assertCondition(value.marker === RECEIPT_MARKER, "receipt marker mismatch");
  assertCondition(value.version === 1, "receipt version must be 1");
  assertCondition(
    typeof value.receipt_id === "string" &&
      /^voidawsi1_[0-9a-f]{64}$/.test(value.receipt_id),
    "receipt_id has invalid format",
  );
  assertCondition(value.authorization_verified === true, "receipt authorization was not verified");
  assertCondition(value.loopback_source === true, "receiver loopback boundary mismatch");
  assertCondition(
    value.admission?.decision === "accepted_for_review",
    "receipt decision is not accepted_for_review",
  );
  assertCondition(authorityAllFalse(value), "receipt granted forbidden authority");
  return value;
}

function baseResult({ mode, base }) {
  return {
    marker: VOID_AI_AGENT_PAID_WORK_CLIENT_V1,
    schema: VOID_AI_AGENT_PAID_WORK_CLIENT_RESULT_SCHEMA_V1,
    version: 1,
    mode,
    base_origin: base.origin,
    route: SUBMISSION_PATH,
    safety: {
      https_or_loopback_http_only: true,
      same_origin_only: true,
      redirects_followed: false,
      automatic_retry: false,
      token_source: mode === "submit" ? "private_file" : null,
      token_output: false,
      token_in_command_arguments: false,
      cookies_sent: false,
      maximum_request_bytes: MAX_REQUEST_BYTES,
    },
    authority: {
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
    },
  };
}

export async function probeVoidAiAgentPaidWorkV1({
  baseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  fetchImpl = globalThis.fetch,
}) {
  assertCondition(typeof fetchImpl === "function", "fetch implementation is unavailable");
  const base = normalizePaidWorkBaseUrlV1(baseUrl);
  const discoveryUrl = sameOriginUrl(base, DISCOVERY_PATH);
  const routeUrl = sameOriginUrl(base, SUBMISSION_PATH);

  const discovery = await fetchBoundedV1({
    url: discoveryUrl,
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "void-ai-agent-paid-work-client-v1",
    },
    body: undefined,
    timeoutMs,
    maximumBytes: maxResponseBytes,
    fetchImpl,
  });
  assertCondition(
    discovery.response.status === 200,
    `discovery_http_status:${discovery.response.status}`,
  );
  const discoveryPayload = parseJsonObject(discovery.raw.text, "discovery");

  const routeProbe = await fetchBoundedV1({
    url: routeUrl,
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": "void-ai-agent-paid-work-client-v1",
    },
    body: undefined,
    timeoutMs,
    maximumBytes: maxResponseBytes,
    fetchImpl,
  });
  assertCondition(
    routeProbe.response.status === 405,
    `submission_route_get_status:${routeProbe.response.status}`,
  );

  return {
    ...baseResult({ mode: "probe", base }),
    discovery: {
      http_status: discovery.response.status,
      marker:
        typeof discoveryPayload.marker === "string"
          ? discoveryPayload.marker
          : null,
      response_bytes: discovery.raw.bytes,
    },
    submission_route: {
      http_status: routeProbe.response.status,
      configured: routeProbe.response.status === 405,
      authentication_required: true,
      request_body_sent: false,
      authorization_header_sent: false,
    },
  };
}

export async function submitVoidAiAgentPaidWorkV1({
  baseUrl,
  requestPath,
  tokenFile,
  expectNew = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
  fetchImpl = globalThis.fetch,
}) {
  assertCondition(typeof fetchImpl === "function", "fetch implementation is unavailable");
  const base = normalizePaidWorkBaseUrlV1(baseUrl);
  const routeUrl = sameOriginUrl(base, SUBMISSION_PATH);
  const request = readPaidWorkSubmissionRequestV1(requestPath);
  const token = readPaidWorkTokenFileV1(tokenFile);

  const result = await fetchBoundedV1({
    url: routeUrl,
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-void-payload-sha256": request.sha256,
      "user-agent": "void-ai-agent-paid-work-client-v1",
    },
    body: request.bytes,
    timeoutMs,
    maximumBytes: maxResponseBytes,
    fetchImpl,
  });

  const routeHeader = result.response.headers.get(ROUTE_HEADER);
  const payload = parseJsonObject(result.raw.text, "submission_response");

  const common = {
    ...baseResult({ mode: "submit", base }),
    submission_id: request.submissionId,
    work_order_id: request.workOrderId,
    request_sha256: request.sha256,
    request_bytes: request.bytes.byteLength,
    http_status: result.response.status,
    route_header: routeHeader,
    successful_authentication: result.response.status !== 401,
    accepted_for_review: false,
    duplicate: false,
    conflicting_duplicate: false,
    receipt_id: null,
    response_bytes: result.raw.bytes,
  };

  if (result.response.status === 202 || result.response.status === 200) {
    assertCondition(routeHeader === "v1", "paid-work route header mismatch");
    assertCondition(
      payload.ok === true && typeof payload.duplicate === "boolean",
      "accepted response shape mismatch",
    );
    const receipt = validateAcceptedReceipt(payload.receipt);
    assertCondition(
      receipt.submission_id === request.submissionId,
      "receipt submission_id mismatch",
    );

    const duplicate = result.response.status === 200;
    assertCondition(payload.duplicate === duplicate, "duplicate status/body mismatch");
    if (expectNew) {
      assertCondition(
        !duplicate,
        "expected a new submission but server returned duplicate",
      );
    }

    return {
      ...common,
      accepted_for_review: true,
      duplicate,
      receipt_id: receipt.receipt_id,
      receipt,
    };
  }

  if (result.response.status === 409) {
    assertCondition(routeHeader === "v1", "conflict route header mismatch");
    assertCondition(
      payload.error === "conflicting_duplicate_submission",
      "conflict response shape mismatch",
    );
    return {
      ...common,
      conflicting_duplicate: true,
      error: "conflicting_duplicate_submission",
    };
  }

  if (result.response.status === 401) {
    fail("unauthorized");
  }

  fail(`unexpected_http_status:${result.response.status}`);
}

function writeOutputFile(rawPath, value, pretty) {
  const resolved = path.resolve(process.cwd(), rawPath);
  const parent = path.dirname(resolved);
  mkdirSync(parent, {
    recursive: true,
    mode: 0o700,
  });

  const content =
    JSON.stringify(value, null, pretty ? 2 : 0) + "\n";
  const descriptor = openSync(resolved, "wx", 0o600);
  closeSync(descriptor);
  writeFileSync(resolved, content, {
    encoding: "utf8",
    mode: 0o600,
    flag: "w",
  });
  chmodSync(resolved, 0o600);
  return resolved;
}

export async function runVoidAiAgentPaidWorkClientV1({
  argv,
  fetchImpl = globalThis.fetch,
}) {
  const parsed = parsePaidWorkClientArgsV1(argv);

  if (parsed.help) {
    return {
      help: usage(),
      exitCode: 0,
    };
  }

  assertCondition(
    parsed.mode === "probe" || parsed.mode === "submit",
    "first argument must be probe or submit",
  );
  assertCondition(parsed.baseUrl, "--base-url is required");

  let value;
  if (parsed.mode === "probe") {
    assertCondition(
      !parsed.requestPath && !parsed.tokenFile && !parsed.expectNew,
      "probe mode forbids request, token, and expect-new options",
    );
    value = await probeVoidAiAgentPaidWorkV1({
      baseUrl: parsed.baseUrl,
      timeoutMs: parsed.timeoutMs,
      maxResponseBytes: parsed.maxResponseBytes,
      fetchImpl,
    });
  } else {
    assertCondition(parsed.requestPath, "--request is required in submit mode");
    assertCondition(parsed.tokenFile, "--token-file is required in submit mode");
    value = await submitVoidAiAgentPaidWorkV1({
      baseUrl: parsed.baseUrl,
      requestPath: parsed.requestPath,
      tokenFile: parsed.tokenFile,
      expectNew: parsed.expectNew,
      timeoutMs: parsed.timeoutMs,
      maxResponseBytes: parsed.maxResponseBytes,
      fetchImpl,
    });
  }

  if (parsed.outputPath) {
    writeOutputFile(parsed.outputPath, value, parsed.pretty);
  }

  return {
    value,
    output:
      JSON.stringify(value, null, parsed.pretty ? 2 : 0) + "\n",
    exitCode: value.conflicting_duplicate ? 3 : 0,
  };
}

async function main() {
  const result = await runVoidAiAgentPaidWorkClientV1({
    argv: process.argv.slice(2),
  });

  if (result.help) {
    process.stdout.write(result.help + "\n");
    return;
  }

  process.stdout.write(result.output);
  process.exitCode = result.exitCode;
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";

if (invokedUrl === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(
      `HOLD: ${
        error instanceof Error
          ? error.message
          : String(error)
      }\n`,
    );
    process.exitCode = 2;
  });
}
