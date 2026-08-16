#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const MARKER = "VOID_PUBLIC_EARN_COORDINATOR_COMPOSITION_V1";
export const DATASET_MARKER = "VOID_PUBLIC_EARN_FIRST_WORK_PACKET_V1";
export const DEFAULT_DATASET_ID = "void-public-earn-first-work-v1";
export const DEFAULT_DATASET_SHA256 =
  "c12a7a4aec535398d3cb9b3dd7a19894f52daf8a2bf1c11019f81a1f0a0c38ea";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_DATASET_FILE = path.join(
  ROOT,
  "fixtures",
  "public-earning",
  "void-public-earn-first-work-v1.json",
);
const HOST = String(
  process.env.VOID_PUBLIC_EARN_COMPOSITION_HOST || "127.0.0.1",
).trim();
const PORT = boundedInteger(
  process.env.VOID_PUBLIC_EARN_COMPOSITION_PORT,
  4110,
  1024,
  65535,
);
const PRIVATE_UPSTREAM = normalizePrivateOrigin(
  process.env.VOID_EARN_PRIVATE_COORDINATOR_UPSTREAM ||
    "http://127.0.0.1:4100",
);
const DATASET_ID = normalizeDatasetId(
  process.env.VOID_EARN_PUBLIC_DATASET_ID || DEFAULT_DATASET_ID,
);
const DATASET_SHA256 = normalizeSha256(
  process.env.VOID_EARN_PUBLIC_DATASET_SHA256 || DEFAULT_DATASET_SHA256,
);
const DATASET_FILE = path.resolve(
  process.env.VOID_EARN_PUBLIC_DATASET_FILE || DEFAULT_DATASET_FILE,
);
const REQUEST_TIMEOUT_MS = boundedInteger(
  process.env.VOID_PUBLIC_EARN_COMPOSITION_TIMEOUT_MS,
  30_000,
  1_000,
  120_000,
);
const MAX_REQUEST_BYTES = boundedInteger(
  process.env.VOID_PUBLIC_EARN_COMPOSITION_MAX_REQUEST_BYTES,
  512 * 1024,
  8 * 1024,
  2 * 1024 * 1024,
);
const MAX_RESPONSE_BYTES = boundedInteger(
  process.env.VOID_PUBLIC_EARN_COMPOSITION_MAX_RESPONSE_BYTES,
  2 * 1024 * 1024,
  64 * 1024,
  8 * 1024 * 1024,
);

const HEALTH_ROUTE = "/health";
const STATUS_ROUTE = "/wc/public-earning-pilot-v1/status";
const CLAIM_ROUTE = "/wc/public-earning-pilot-v1/claim-ticket";
const SUBMIT_ROUTE = "/wc/public-earning-pilot-v1/submit-result";
const COMPOSITION_STATUS_ROUTE =
  "/__void/public-earn-coordinator-composition-v1/status.json";
const DATASET_ROUTE = `/datanet/v1/fetch/${encodeURIComponent(DATASET_ID)}`;

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function fail(message) {
  throw new Error(`${MARKER}: ${message}`);
}

function boundedInteger(raw, fallback, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

function normalizeDatasetId(raw) {
  const value = String(raw || "").trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(value)) {
    fail("invalid public dataset ID");
  }
  return value;
}

function normalizeSha256(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(value)) fail("invalid public dataset SHA-256");
  return value;
}

function privateHttpHost(rawHostname) {
  const hostname = String(rawHostname || "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".ts.net")
  ) {
    return true;
  }
  const family = net.isIP(hostname);
  if (family === 4) {
    const octets = hostname.split(".").map(Number);
    return (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)
    );
  }
  if (family === 6) {
    return /^(fc|fd|fe8|fe9|fea|feb)/i.test(hostname);
  }
  return false;
}

function normalizePrivateOrigin(raw) {
  const value = String(raw || "").trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail("private coordinator upstream is not a valid URL");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail(
      "private coordinator upstream must not contain credentials, query, or fragment",
    );
  }
  if (parsed.pathname && parsed.pathname !== "/") {
    fail("private coordinator upstream must not contain a path");
  }
  const privateHttp =
    parsed.protocol === "http:" && privateHttpHost(parsed.hostname);
  if (parsed.protocol !== "https:" && !privateHttp) {
    fail(
      "private coordinator upstream must use HTTPS or private/Tailnet HTTP",
    );
  }
  return parsed.origin;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readDataset() {
  let stats;
  try {
    stats = fs.lstatSync(DATASET_FILE);
  } catch {
    fail(`dataset file is missing: ${DATASET_FILE}`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail("dataset file must be a regular non-symlink file");
  }
  if (stats.size <= 0 || stats.size > 64 * 1024) {
    fail("dataset file must be from 1 byte through 64 KiB");
  }
  const bytes = fs.readFileSync(DATASET_FILE);
  const digest = sha256(bytes);
  if (digest !== DATASET_SHA256) {
    fail(
      `dataset SHA-256 mismatch: expected ${DATASET_SHA256}, got ${digest}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("dataset file must contain valid JSON");
  }
  if (
    parsed?.marker !== DATASET_MARKER ||
    parsed?.version !== 1 ||
    parsed?.task_class !== "datanet_fetch_verify" ||
    parsed?.chain_id !== 2050 ||
    parsed?.fixed_award_wc !== 3 ||
    parsed?.server_selected_work !== true ||
    parsed?.participant_selected_dataset !== false ||
    parsed?.participant_selected_input_hash !== false ||
    parsed?.participant_selected_award !== false ||
    parsed?.wallet_or_signer_required !== false ||
    parsed?.money_movement !== false
  ) {
    fail("dataset semantic contract is invalid");
  }
  return { bytes, digest, parsed };
}

function safeWho(searchParams) {
  const keys = [...searchParams.keys()];
  if (keys.some((key) => key !== "who")) return false;
  const values = searchParams.getAll("who");
  if (values.length > 1) return false;
  return (
    values.length === 0 ||
    /^[A-Za-z0-9._:-]{1,128}$/.test(String(values[0] || ""))
  );
}

function writeJson(req, res, status, value, extraHeaders = {}) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-void-public-earn-coordinator-composition": "v1",
    ...extraHeaders,
  });
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

function writeDataset(req, res, dataset) {
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(dataset.bytes.length),
    "cache-control": "public, max-age=300, immutable",
    etag: `"sha256-${dataset.digest}"`,
    "x-content-type-options": "nosniff",
    "x-void-dataset-id": DATASET_ID,
    "x-void-dataset-sha256": dataset.digest,
    "x-void-public-earn-coordinator-composition": "v1",
  });
  if (req.method === "HEAD") return res.end();
  res.end(dataset.bytes);
}

function readBoundedBody(req, maximum) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(declared) && declared > maximum) {
      reject(new Error("request_body_too_large"));
      req.resume();
      return;
    }
    const chunks = [];
    let total = 0;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maximum) {
        finish(reject, new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => finish(resolve, Buffer.concat(chunks)));
    req.on("error", (error) => finish(reject, error));
  });
}

async function settleCleanupWithinDeadline(cleanup, deadlineAt) {
  if (!cleanup || typeof cleanup.then !== "function") return;
  const remaining = Math.max(0, deadlineAt - Date.now());
  if (remaining <= 0) {
    void Promise.resolve(cleanup).catch(() => undefined);
    return;
  }
  let timer;
  try {
    await Promise.race([
      Promise.resolve(cleanup).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function abortAndCancelWithinDeadline(target, controller, deadlineAt) {
  if (!controller.signal.aborted) controller.abort();
  let cleanup;
  try {
    cleanup = target?.cancel?.();
  } catch {
    return;
  }
  await settleCleanupWithinDeadline(cleanup, deadlineAt);
}

async function fetchWithTimeout(url, options, consume) {
  const controller = new AbortController();
  const deadlineAt = Date.now() + REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "manual",
    });
    return await consume(response, { controller, deadlineAt });
  } finally {
    clearTimeout(timer);
  }
}

async function boundedResponseBody(response, request) {
  const contentLengthRaw = response.headers.get("content-length");
  if (contentLengthRaw !== null) {
    if (!/^\d+$/.test(contentLengthRaw)) {
      await abortAndCancelWithinDeadline(
        response.body,
        request.controller,
        request.deadlineAt,
      );
      throw new Error("invalid_upstream_content_length");
    }
    const declared = Number(contentLengthRaw);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      await abortAndCancelWithinDeadline(
        response.body,
        request.controller,
        request.deadlineAt,
      );
      throw new Error("invalid_upstream_content_length");
    }
    if (declared > MAX_RESPONSE_BYTES) {
      await abortAndCancelWithinDeadline(
        response.body,
        request.controller,
        request.deadlineAt,
      );
      throw new Error("upstream_response_too_large");
    }
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    await abortAndCancelWithinDeadline(
      response.body,
      request.controller,
      request.deadlineAt,
    );
    throw new Error("upstream_response_body_unavailable");
  }
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error("upstream_response_invalid_chunk");
      }
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        throw new Error("upstream_response_too_large");
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    await abortAndCancelWithinDeadline(
      reader,
      request.controller,
      request.deadlineAt,
    );
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      void error;
    }
  }
  return Buffer.concat(chunks, total);
}

function filteredResponseHeaders(source) {
  const output = {};
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (
      hopByHopHeaders.has(lower) ||
      lower === "set-cookie" ||
      lower === "location" ||
      lower === "www-authenticate" ||
      lower === "content-length"
    ) {
      continue;
    }
    output[key] = value;
  }
  output["cache-control"] = "no-store";
  output["x-void-public-earn-coordinator-composition"] = "v1";
  return output;
}

function validCapabilityAuthorization(raw) {
  const value = String(raw || "").trim();
  return /^Bearer wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/.test(
    value,
  )
    ? value
    : "";
}

function exactProxyRoute(pathname) {
  if (pathname === HEALTH_ROUTE) return { methods: ["GET", "HEAD"] };
  if (pathname === STATUS_ROUTE) return { methods: ["GET", "HEAD"] };
  if (pathname === CLAIM_ROUTE) return { methods: ["POST"] };
  if (pathname === SUBMIT_ROUTE) return { methods: ["POST"] };
  return null;
}

async function proxy(req, res, url) {
  const route = exactProxyRoute(url.pathname);
  if (!route) {
    writeJson(req, res, 404, { ok: false, error: "not_public" });
    return;
  }
  if (!route.methods.includes(req.method || "")) {
    writeJson(
      req,
      res,
      405,
      { ok: false, error: "method_not_allowed" },
      { allow: route.methods.join(", ") },
    );
    return;
  }
  if (url.pathname !== STATUS_ROUTE && url.search) {
    writeJson(req, res, 400, { ok: false, error: "query_forbidden" });
    return;
  }
  if (
    url.pathname === STATUS_ROUTE &&
    [...url.searchParams.keys()].some((key) => key !== "account")
  ) {
    writeJson(req, res, 400, { ok: false, error: "query_forbidden" });
    return;
  }

  let body = null;
  if (req.method === "POST") {
    const contentType = String(req.headers["content-type"] || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      writeJson(req, res, 415, {
        ok: false,
        error: "content_type_must_be_application_json",
      });
      return;
    }
    try {
      body = await readBoundedBody(req, MAX_REQUEST_BYTES);
    } catch (error) {
      writeJson(req, res, 413, {
        ok: false,
        error: error?.message || "request_body_rejected",
      });
      return;
    }
  }

  const headers = { accept: "application/json" };
  if (body) headers["content-type"] = "application/json";
  if (url.pathname === SUBMIT_ROUTE) {
    const authorization = validCapabilityAuthorization(
      req.headers.authorization,
    );
    if (!authorization) {
      writeJson(req, res, 401, {
        ok: false,
        error: "missing_or_invalid_capability",
      });
      return;
    }
    headers.authorization = authorization;
  } else if (req.headers.authorization) {
    writeJson(req, res, 400, {
      ok: false,
      error: "authorization_forbidden",
    });
    return;
  }

  const upstreamUrl = `${PRIVATE_UPSTREAM}${url.pathname}${url.search}`;
  let upstream;
  try {
    upstream = await fetchWithTimeout(
      upstreamUrl,
      {
        method: req.method,
        headers,
        body,
      },
      async (response, request) => {
        if (response.status >= 300 && response.status < 400) {
          await abortAndCancelWithinDeadline(
            response.body,
            request.controller,
            request.deadlineAt,
          );
          return { kind: "redirect" };
        }
        return {
          kind: "response",
          status: response.status,
          headers: filteredResponseHeaders(response.headers),
          body:
            req.method === "HEAD"
              ? Buffer.alloc(0)
              : await boundedResponseBody(response, request),
        };
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const boundedError = new Set([
      "invalid_upstream_content_length",
      "upstream_response_too_large",
      "upstream_response_body_unavailable",
      "upstream_response_invalid_chunk",
    ]).has(message);
    writeJson(req, res, 502, {
      ok: false,
      error:
        error?.name === "AbortError"
          ? "private_coordinator_timeout"
          : boundedError
            ? message
            : "private_coordinator_unreachable",
    });
    return;
  }
  if (upstream.kind === "redirect") {
    writeJson(req, res, 502, {
      ok: false,
      error: "private_coordinator_redirect_forbidden",
    });
    return;
  }

  res.writeHead(upstream.status, upstream.headers);
  if (req.method === "HEAD") return res.end();
  res.end(upstream.body);
}

export function compositionStatus(dataset) {
  return {
    ok: true,
    marker: MARKER,
    version: 1,
    bind: {
      host: HOST,
      port: PORT,
      loopback_only: HOST === "127.0.0.1",
    },
    dataset: {
      marker: DATASET_MARKER,
      dataset_id: DATASET_ID,
      sha256: dataset.digest,
      bytes: dataset.bytes.length,
      route: DATASET_ROUTE,
      exact_server_selected_packet: true,
    },
    routes: {
      status: COMPOSITION_STATUS_ROUTE,
      health: HEALTH_ROUTE,
      coordinator_status: STATUS_ROUTE,
      claim_ticket: CLAIM_ROUTE,
      submit_result: SUBMIT_ROUTE,
      dataset: DATASET_ROUTE,
    },
    safety: {
      private_upstream_hidden: true,
      loopback_only: true,
      operator_issue_exposed: false,
      local_claim_sign_exposed: false,
      generic_job_submit: false,
      participant_selected_dataset: false,
      participant_selected_input_hash: false,
      participant_selected_award: false,
      wallet_or_signer_access: false,
      wc_to_void: false,
      buy_void_fulfillment: false,
      validator_mutation: false,
      money_movement: false,
    },
  };
}

export function createCompositionServer(dataset = readDataset()) {
  if (HOST !== "127.0.0.1") {
    fail("composition service must bind only to 127.0.0.1");
  }
  return http.createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
    } catch {
      writeJson(req, res, 400, { ok: false, error: "invalid_url" });
      return;
    }

    if (
      url.pathname === COMPOSITION_STATUS_ROUTE &&
      (req.method === "GET" || req.method === "HEAD")
    ) {
      if (url.search) {
        writeJson(req, res, 400, { ok: false, error: "query_forbidden" });
        return;
      }
      writeJson(req, res, 200, compositionStatus(dataset));
      return;
    }

    if (
      url.pathname === DATASET_ROUTE &&
      (req.method === "GET" || req.method === "HEAD")
    ) {
      if (!safeWho(url.searchParams)) {
        writeJson(req, res, 400, {
          ok: false,
          error: "dataset_query_invalid",
        });
        return;
      }
      writeDataset(req, res, dataset);
      return;
    }

    if (url.pathname.startsWith("/datanet/v1/fetch/")) {
      writeJson(req, res, 404, {
        ok: false,
        error: "dataset_not_allowlisted",
      });
      return;
    }

    try {
      await proxy(req, res, url);
    } catch (error) {
      console.error(`${MARKER} visible_failure`, {
        code: String(error?.code || error?.name || "unknown"),
      });
      if (!res.headersSent) {
        writeJson(req, res, 500, {
          ok: false,
          error: "composition_internal_error",
        });
      } else {
        res.destroy();
      }
    }
  });
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const dataset = readDataset();
  const server = createCompositionServer(dataset);
  server.on("error", (error) => {
    console.error(`${MARKER} HOLD code=${error?.code || "server_error"}`);
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(
      JSON.stringify(
        {
          ...compositionStatus(dataset),
          private_coordinator_bound: true,
          private_coordinator_origin_emitted: false,
        },
        null,
        2,
      ),
    );
  });
}
