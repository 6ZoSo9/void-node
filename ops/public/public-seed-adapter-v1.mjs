#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const UPSTREAM = (process.env.VOID_SEED_UPSTREAM || "http://127.0.0.1:4100").replace(/\/+$/, "");
const EARN_UPSTREAM = (process.env.VOID_EARN_COORDINATOR_UPSTREAM || "").replace(/\/+$/, "");
const HOST = process.env.VOID_ADAPTER_HOST || "127.0.0.1";
const PORT = Number(process.env.VOID_ADAPTER_PORT || "4111");
const EARN_HEALTH_PATH = "/health";
const EARN_STATUS_PATH = "/wc/public-earning-pilot-v1/status";
const EARN_BALANCE_PATH = "/wc/redeemable";
const EARN_SUBMIT_PATH = "/wc/public-earning-pilot-v1/submit-result";
const EARN_GATEWAY_STATUS_PATH = "/__void/public-earn-gateway-v1/status.json";
const EARN_CLI_PATH = "/download/wc-public-earning-participant-v1.sh";
const EARN_CLI_FILE = path.resolve(
  process.env.VOID_EARN_PARTICIPANT_CLI_FILE ||
    path.join(process.cwd(), "ops/mainnet0/wc-public-earning-participant-v1.sh"),
);
const EARN_MAX_BODY_BYTES = boundedInteger(
  process.env.VOID_EARN_GATEWAY_MAX_BODY_BYTES,
  512 * 1024,
  64 * 1024,
  2 * 1024 * 1024,
);
const EARN_MAX_RESPONSE_BYTES = boundedInteger(
  process.env.VOID_EARN_GATEWAY_MAX_RESPONSE_BYTES,
  1024 * 1024,
  64 * 1024,
  4 * 1024 * 1024,
);
const PROXY_MAX_RESPONSE_BYTES = boundedInteger(
  process.env.VOID_PUBLIC_ADAPTER_MAX_RESPONSE_BYTES,
  32 * 1024 * 1024,
  1024 * 1024,
  64 * 1024 * 1024,
);
const EARN_RATE_LIMIT_PER_MINUTE = boundedInteger(
  process.env.VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE,
  30,
  1,
  600,
);
const EARN_REQUEST_TIMEOUT_MS = boundedInteger(
  process.env.VOID_EARN_GATEWAY_TIMEOUT_MS,
  30_000,
  1_000,
  120_000,
);

const exactAllow = new Set([
  "/wc-proofs/latest",
  "/",
  "/funding",
  "/buy-void",
  "/__void/ready.json",
  "/__void/public-bootstrap.json",
  "/__void/adapter.json",
  "/__void/funding/status.json",
  "/__void/buy-void/config.json",
  "/__void/buy-void/request.json",
  "/__void/buy-void/status.json",
  "/__void/buy-void/sale-state.json",
  "/__void/public-seed-adapter/status.json",
  "/datanet/materialized-status",
  EARN_HEALTH_PATH,
  EARN_STATUS_PATH,
  EARN_BALANCE_PATH,
  EARN_GATEWAY_STATUS_PATH,
  EARN_CLI_PATH,
]);

const prefixAllow = [
  "/participant",
  "/public-node",
  "/download",
  "/site/voidchain",
  "/docs/public",
];

const blocked = [
  "/rpc",
  "/admin",
  "/operator",
  "/validator/admin",
  "/debug",
  "/.env",
  "/keys",
  "/wallet",
  "/secrets",
];

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

const rateWindows = new Map();

function boundedInteger(raw, fallback, minimum, maximum) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)));
}

function allowed(pathname) {
  if (blocked.some((value) => pathname === value || pathname.startsWith(`${value}/`))) {
    return false;
  }
  if (exactAllow.has(pathname)) return true;
  return prefixAllow.some((value) => pathname === value || pathname.startsWith(`${value}/`));
}

function writeJson(req, res, status, value, extraHeaders = {}) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-void-public-seed-adapter": "v1",
    "x-void-public-earn-gateway": "v1",
    ...extraHeaders,
  });
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

function writeText(req, res, status, text, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    "x-void-public-seed-adapter": "v1",
    ...extraHeaders,
  });
  if (req.method === "HEAD") return res.end();
  res.end(text);
}

function safeString(value, limit = 160) {
  return typeof value === "string" ? value.slice(0, limit) : null;
}

function safeBoolean(value) {
  return value === true;
}

function safeFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function publicEarnEnabled() {
  return /^http:\/\/[^\s/]+(?::\d+)?$/.test(EARN_UPSTREAM);
}

function gatewayStatus() {
  return {
    ok: true,
    marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    enabled: publicEarnEnabled(),
    fixed_award_wc: 3,
    routes: {
      health: EARN_HEALTH_PATH,
      status: EARN_STATUS_PATH,
      balance: EARN_BALANCE_PATH,
      submit_result: EARN_SUBMIT_PATH,
      participant_cli: EARN_CLI_PATH,
    },
    methods: {
      health: ["GET", "HEAD"],
      status: ["GET", "HEAD"],
      balance: ["GET", "HEAD"],
      submit_result: ["POST"],
      participant_cli: ["GET", "HEAD"],
    },
    limits: {
      request_body_bytes: EARN_MAX_BODY_BYTES,
      response_body_bytes: EARN_MAX_RESPONSE_BYTES,
      submit_requests_per_minute: EARN_RATE_LIMIT_PER_MINUTE,
    },
    safety: {
      public_ticket_issue: false,
      generic_job_submit: false,
      participant_selected_award: false,
      wallet_send: false,
      wc_to_void_swap: false,
      buy_void_fulfillment: false,
      validator_mutation: false,
      operator_routes_exposed: false,
    },
  };
}

function filteredHeaders(source, extra = {}) {
  const output = {};
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (
      hopByHopHeaders.has(lower) ||
      lower === "set-cookie" ||
      lower === "content-length" ||
      lower === "location" ||
      lower === "www-authenticate"
    ) {
      continue;
    }
    output[key] = value;
  }
  output["x-void-public-seed-adapter"] = "v1";
  Object.assign(output, extra);
  return output;
}

async function boundedResponseBody(response, maximum) {
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > maximum) throw new Error("upstream_response_too_large");
  return body;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyRead(req, res, url) {
  const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`;
  const response = await fetchWithTimeout(
    upstreamUrl,
    { method: req.method },
    EARN_REQUEST_TIMEOUT_MS,
  );
  const body = req.method === "HEAD" ? Buffer.alloc(0) : await boundedResponseBody(response, PROXY_MAX_RESPONSE_BYTES);
  res.writeHead(response.status, filteredHeaders(response.headers));
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

async function fetchEarnJson(pathname, search = "") {
  if (!publicEarnEnabled()) {
    return { status: 503, body: { ok: false, error: "public_earn_gateway_disabled" } };
  }
  const response = await fetchWithTimeout(
    `${EARN_UPSTREAM}${pathname}${search}`,
    { method: "GET", headers: { accept: "application/json" } },
    EARN_REQUEST_TIMEOUT_MS,
  );
  const raw = await boundedResponseBody(response, EARN_MAX_RESPONSE_BYTES);
  let body;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    body = { ok: false, error: "invalid_coordinator_json" };
  }
  return { status: response.status, body };
}

function sanitizeCoordinatorHealth(value) {
  return {
    ok: value?.ok === true,
    nodeId: safeString(value?.nodeId ?? value?.node_id ?? value?.id, 64),
    head: safeFiniteNumber(value?.head ?? value?.height ?? value?.latest),
    marker: "VOID_PUBLIC_EARN_GATEWAY_HEALTH_V1",
  };
}

function sanitizePilotStatus(value) {
  const capability = value && typeof value.capability === "object" ? value.capability : {};
  const caps = value && typeof value.caps === "object" ? value.caps : {};
  return {
    ok: value?.ok === true,
    marker: safeString(value?.marker, 96),
    gateway_marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    coordinator_enabled: safeBoolean(value?.coordinator_enabled),
    executor_enabled: safeBoolean(value?.executor_enabled),
    task_class: safeString(value?.task_class, 96),
    fixed_award_wc: safeFiniteNumber(value?.fixed_award_wc),
    caps: {
      account_total: safeFiniteNumber(caps.account_total) ?? 0,
      account_limit: safeFiniteNumber(caps.account_limit),
      global_active: safeFiniteNumber(caps.global_active),
      global_consumed: safeFiniteNumber(caps.global_consumed),
    },
    capability: {
      account_bound: safeBoolean(capability.account_bound),
      executor_node_bound: safeBoolean(capability.executor_node_bound),
      outbound_only_supported: safeBoolean(capability.outbound_only_supported),
      dataset_bound: safeBoolean(capability.dataset_bound),
      input_hash_bound: safeBoolean(capability.input_hash_bound),
      expiring: safeBoolean(capability.expiring),
      single_use: safeBoolean(capability.single_use),
      token_stored_as_sha256_only: safeBoolean(capability.token_stored_as_sha256_only),
      ed25519_executor_signature_required: safeBoolean(capability.ed25519_executor_signature_required),
    },
    routes: gatewayStatus().routes,
    safety: gatewayStatus().safety,
  };
}

function validAccount(account) {
  return /^[A-Za-z0-9_.:@-]{1,160}$/.test(account);
}

function sanitizeBalance(value, requestedAccount) {
  return {
    ok: value?.ok === true,
    account: safeString(value?.account, 160) || requestedAccount,
    earned: safeFiniteNumber(value?.earned),
    debited: safeFiniteNumber(value?.debited) ?? 0,
    redeemed: safeFiniteNumber(value?.redeemed) ?? 0,
    redeemable: safeFiniteNumber(value?.redeemable),
    marker: "VOID_PUBLIC_EARN_GATEWAY_BALANCE_V1",
    canonical_coordinator_accounting: true,
  };
}

function clientKey(req) {
  return String(req.socket.remoteAddress || "unknown").slice(0, 128);
}

function submitRateAllowed(req) {
  const now = Date.now();
  const key = clientKey(req);
  const current = rateWindows.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    rateWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  if (rateWindows.size > 4096) {
    for (const [entryKey, entry] of rateWindows.entries()) {
      if (now - entry.startedAt >= 120_000) rateWindows.delete(entryKey);
    }
  }
  return current.count <= EARN_RATE_LIMIT_PER_MINUTE;
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
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maximum) {
        reject(new Error("request_body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function proxyEarnSubmit(req, res) {
  if (!publicEarnEnabled()) {
    writeJson(req, res, 503, { ok: false, error: "public_earn_gateway_disabled" });
    return;
  }
  if (!submitRateAllowed(req)) {
    writeJson(req, res, 429, { ok: false, error: "public_earn_rate_limited" }, { "retry-after": "60" });
    return;
  }
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    writeJson(req, res, 415, { ok: false, error: "application_json_required" });
    return;
  }

  let body;
  try {
    body = await readBoundedBody(req, EARN_MAX_BODY_BYTES);
  } catch (error) {
    if (String(error?.message || "") === "request_body_too_large") {
      writeJson(req, res, 413, { ok: false, error: "request_body_too_large" });
      return;
    }
    throw error;
  }

  try {
    JSON.parse(body.toString("utf8"));
  } catch {
    writeJson(req, res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  const response = await fetchWithTimeout(
    `${EARN_UPSTREAM}${EARN_SUBMIT_PATH}`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "content-length": String(body.length),
        "user-agent": "void-public-earn-gateway-v1",
      },
      body,
    },
    EARN_REQUEST_TIMEOUT_MS,
  );
  const responseBody = await boundedResponseBody(response, EARN_MAX_RESPONSE_BYTES);
  res.writeHead(
    response.status,
    filteredHeaders(response.headers, {
      "cache-control": "no-store",
      "x-void-public-earn-gateway": "v1",
    }),
  );
  res.end(responseBody);
}

function serveParticipantCli(req, res) {
  let stat;
  try {
    stat = fs.statSync(EARN_CLI_FILE);
  } catch {
    writeText(req, res, 404, "participant_cli_unavailable\n");
    return;
  }
  if (!stat.isFile() || stat.size <= 0 || stat.size > 256 * 1024) {
    writeText(req, res, 404, "participant_cli_unavailable\n");
    return;
  }
  const body = fs.readFileSync(EARN_CLI_FILE);
  res.writeHead(200, {
    "content-type": "text/x-shellscript; charset=utf-8",
    "content-disposition": 'attachment; filename="wc-public-earning-participant-v1.sh"',
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-public-seed-adapter": "v1",
    "x-void-public-earn-gateway": "v1",
  });
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  // VOID_PUBLIC_EDGE_LANDING_ROOT_V1
  try {
    const url = new URL(req.url || "/", "http://adapter.local");

    if (req.method === "POST") {
      if (url.pathname !== EARN_SUBMIT_PATH || url.search) {
        writeText(req, res, 405, "method_not_allowed\n", { allow: "GET, HEAD" });
        return;
      }
      await proxyEarnSubmit(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      writeText(req, res, 405, "method_not_allowed\n", { allow: "GET, HEAD" });
      return;
    }

    if (!allowed(url.pathname)) {
      writeText(req, res, 404, "not_public\n");
      return;
    }

    if (url.pathname === "/__void/adapter.json") {
      writeJson(req, res, 200, {
        adapter: "void_public_seed_adapter",
        version: 1,
        mode: "read_only_allowlist_proxy_with_bounded_public_earn_submit",
        upstream_private: true,
        exact_allow: Array.from(exactAllow).sort(),
        prefix_allow: prefixAllow.slice().sort(),
        blocked: blocked.slice().sort(),
        private_rpc_public: false,
        public_earn_gateway: gatewayStatus(),
      });
      return;
    }

    if (url.pathname === EARN_GATEWAY_STATUS_PATH) {
      writeJson(req, res, 200, gatewayStatus());
      return;
    }

    if (url.pathname === EARN_HEALTH_PATH) {
      if (url.search) {
        writeJson(req, res, 400, { ok: false, error: "health_query_not_allowed" });
        return;
      }
      const result = await fetchEarnJson(EARN_HEALTH_PATH);
      writeJson(req, res, result.status, sanitizeCoordinatorHealth(result.body));
      return;
    }

    if (url.pathname === EARN_STATUS_PATH) {
      const keys = Array.from(url.searchParams.keys());
      const account = String(url.searchParams.get("account") || "");
      if (keys.some((key) => key !== "account") || (account && !validAccount(account))) {
        writeJson(req, res, 400, { ok: false, error: "invalid_account" });
        return;
      }
      const search = account ? `?account=${encodeURIComponent(account)}` : "";
      const result = await fetchEarnJson(EARN_STATUS_PATH, search);
      writeJson(req, res, result.status, sanitizePilotStatus(result.body));
      return;
    }

    if (url.pathname === EARN_BALANCE_PATH) {
      const account = String(url.searchParams.get("account") || "");
      if (!validAccount(account) || Array.from(url.searchParams.keys()).some((key) => key !== "account")) {
        writeJson(req, res, 400, { ok: false, error: "invalid_account" });
        return;
      }
      const result = await fetchEarnJson(EARN_BALANCE_PATH, `?account=${encodeURIComponent(account)}`);
      writeJson(req, res, result.status, sanitizeBalance(result.body, account));
      return;
    }

    if (url.pathname === EARN_CLI_PATH) {
      if (url.search) {
        writeText(req, res, 400, "download_query_not_allowed\n");
        return;
      }
      serveParticipantCli(req, res);
      return;
    }

    await proxyRead(req, res, url);
  } catch (error) {
    const message = String(error?.message || "");
    const status = message === "upstream_response_too_large" ? 502 : 502;
    writeText(req, res, status, "adapter_upstream_error\n");
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `void_public_seed_adapter_v1 host=${HOST} port=${PORT} upstream=${UPSTREAM} public_earn_gateway=${publicEarnEnabled()}`,
  );
});
