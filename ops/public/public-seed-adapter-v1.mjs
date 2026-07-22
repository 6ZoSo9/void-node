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
const EARN_CLAIM_PATH = "/wc/public-earning-pilot-v1/claim-ticket";
const EARN_GATEWAY_STATUS_PATH = "/__void/public-earn-gateway-v1/status.json";
const EARN_CLI_PATH = "/download/wc-public-earning-participant-v1.sh";
const EARN_CLAIM_CLI_PATH = "/download/wc-public-ticket-claim-v1.sh";
const EARN_CLI_FILE = path.resolve(
  process.env.VOID_EARN_PARTICIPANT_CLI_FILE ||
    path.join(process.cwd(), "ops/mainnet0/wc-public-earning-participant-v1.sh"),
);
const EARN_CLAIM_CLI_FILE = path.resolve(
  process.env.VOID_EARN_CLAIM_CLI_FILE ||
    path.join(process.cwd(), "ops/mainnet0/wc-public-ticket-claim-v1.sh"),
);
const EARN_MAX_BODY_BYTES = boundedInteger(
  process.env.VOID_EARN_GATEWAY_MAX_BODY_BYTES,
  512 * 1024,
  64 * 1024,
  2 * 1024 * 1024,
);
const EARN_CLAIM_MAX_BODY_BYTES = boundedInteger(
  process.env.VOID_EARN_GATEWAY_CLAIM_MAX_BODY_BYTES,
  64 * 1024,
  8 * 1024,
  256 * 1024,
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
const EARN_CLAIM_RATE_LIMIT_PER_MINUTE = boundedInteger(
  process.env.VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE,
  6,
  1,
  60,
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
  EARN_CLAIM_CLI_PATH,
]);

const prefixAllow = [
  "/participant",
  "/public-node",
  "/download",
  "/site/voidchain",
  "/docs/public",
];

// VOID_PUBLIC_EARN_GATEWAY_DATANET_FETCH_V1
const DATANET_FETCH_PATH_V1_RE =
  /^\/datanet\/v1\/fetch\/[A-Za-z0-9._:-]{1,180}$/;
const DATANET_FETCH_WHO_V1_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function publicDataNetFetchAllowed(pathname, search = "") {
  if (!DATANET_FETCH_PATH_V1_RE.test(pathname)) return false;
  if (!search) return true;

  const params = new URLSearchParams(search);
  if ([...params.keys()].some((key) => key !== "who")) return false;

  const whoValues = params.getAll("who");
  if (whoValues.length === 0) return true;
  return (
    whoValues.length === 1 &&
    DATANET_FETCH_WHO_V1_RE.test(whoValues[0] || "")
  );
}


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

const submitRateWindows = new Map();
const claimRateWindows = new Map();

function boundedInteger(raw, fallback, minimum, maximum) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)));
}

function allowed(pathname, search = "") {
  if (blocked.some((value) => pathname === value || pathname.startsWith(`${value}/`))) {
    return false;
  }
  if (exactAllow.has(pathname)) return true;
  if (publicDataNetFetchAllowed(pathname, search)) return true;
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

// VOID_PUBLIC_EARN_GATEWAY_CAPABILITY_FORWARDING_V1
function validatedEarnCapabilityAuthorization(value) {
  if (typeof value !== "string") return null;
  const match =
    /^Bearer (wcep1\.([0-9a-f]{32})\.[A-Za-z0-9_-]{43})$/.exec(
      value.trim(),
    );
  if (!match) return null;
  return {
    header: `Bearer ${match[1]}`,
    ticketId: match[2],
  };
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
      claim_ticket: EARN_CLAIM_PATH,
      participant_cli: EARN_CLI_PATH,
      claim_cli: EARN_CLAIM_CLI_PATH,
    },
    methods: {
      health: ["GET", "HEAD"],
      status: ["GET", "HEAD"],
      balance: ["GET", "HEAD"],
      submit_result: ["POST"],
      claim_ticket: ["POST"],
      participant_cli: ["GET", "HEAD"],
      claim_cli: ["GET", "HEAD"],
    },
    limits: {
      request_body_bytes: EARN_MAX_BODY_BYTES,
      claim_request_body_bytes: EARN_CLAIM_MAX_BODY_BYTES,
      response_body_bytes: EARN_MAX_RESPONSE_BYTES,
      submit_requests_per_minute: EARN_RATE_LIMIT_PER_MINUTE,
      claim_requests_per_minute: EARN_CLAIM_RATE_LIMIT_PER_MINUTE,
    },
    safety: {
      public_ticket_issue: true,
      public_signed_ticket_claim: true,
      public_operator_ticket_issue: false,
      claim_executor_key_possession_required: true,
      claim_server_selected_work: true,
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
  const publicClaim =
    value && typeof value.public_claim === "object" ? value.public_claim : {};
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
      account_limit:
        safeFiniteNumber(caps.account_limit) ??
        safeFiniteNumber(caps.per_account),
      global_limit: safeFiniteNumber(caps.global),
      global_active:
        safeFiniteNumber(caps.global_active) ??
        safeFiniteNumber(caps.active_issued),
      global_consumed:
        safeFiniteNumber(caps.global_consumed) ??
        safeFiniteNumber(caps.consumed),
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
      public_claim_executor_key_possession_required: safeBoolean(
        capability.public_claim_executor_key_possession_required,
      ),
      public_claim_replay_protected: safeBoolean(
        capability.public_claim_replay_protected,
      ),
    },
    public_claim: {
      marker: safeString(publicClaim.marker, 96),
      enabled: safeBoolean(publicClaim.enabled),
      available: safeBoolean(publicClaim.available),
      public_route: gatewayStatus().routes.claim_ticket,
      task_class: safeString(publicClaim.task_class, 96),
      fixed_award_wc: safeFiniteNumber(publicClaim.fixed_award_wc),
      transport_mode: safeString(publicClaim.transport_mode, 32),
      server_selected_work: safeBoolean(publicClaim.server_selected_work),
      proof_of_executor_key_possession_required: safeBoolean(
        publicClaim.proof_of_executor_key_possession_required,
      ),
      signed_claim_timestamp_required: safeBoolean(
        publicClaim.signed_claim_timestamp_required,
      ),
      claim_nonce_replay_protection: safeBoolean(
        publicClaim.claim_nonce_replay_protection,
      ),
      one_active_ticket_per_account: safeBoolean(
        publicClaim.one_active_ticket_per_account,
      ),
      one_active_ticket_per_executor: safeBoolean(
        publicClaim.one_active_ticket_per_executor,
      ),
      ticket_ttl_ms: safeFiniteNumber(publicClaim.ticket_ttl_ms),
      cooldown_ms: safeFiniteNumber(publicClaim.cooldown_ms),
      max_claims_per_account_24h: safeFiniteNumber(
        publicClaim.max_claims_per_account_24h,
      ),
      max_claims_per_executor_24h: safeFiniteNumber(
        publicClaim.max_claims_per_executor_24h,
      ),
      global_active_cap: safeFiniteNumber(publicClaim.global_active_cap),
      global_claims_per_24h: safeFiniteNumber(
        publicClaim.global_claims_per_24h,
      ),
      work_available: safeBoolean(publicClaim.work_available),
      participant_selected_dataset: false,
      participant_selected_input_hash: false,
      participant_selected_award: false,
      money_movement: false,
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

function requestRateAllowed(req, windows, limit, suffix = "") {
  const now = Date.now();
  const key = `${clientKey(req)}${suffix}`;
  const current = windows.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    windows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  if (windows.size > 4096) {
    for (const [entryKey, entry] of windows.entries()) {
      if (now - entry.startedAt >= 120_000) windows.delete(entryKey);
    }
  }
  return current.count <= limit;
}

function submitRateAllowed(req) {
  return requestRateAllowed(
    req,
    submitRateWindows,
    EARN_RATE_LIMIT_PER_MINUTE,
    ":submit",
  );
}

function claimRateAllowed(req) {
  return requestRateAllowed(
    req,
    claimRateWindows,
    EARN_CLAIM_RATE_LIMIT_PER_MINUTE,
    ":claim",
  );
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

function validPublicClaimBody(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(",") !== "claim,signature") return false;
  const claim = value.claim;
  const signature = value.signature;
  if (!claim || typeof claim !== "object" || Array.isArray(claim)) return false;
  if (
    Object.keys(claim).sort().join(",") !==
    [
      "account",
      "claim_nonce",
      "claim_ts_ms",
      "domain",
      "executor_node_id",
      "executor_pubkey",
      "marker",
      "version",
    ].sort().join(",")
  ) {
    return false;
  }
  if (
    !signature ||
    typeof signature !== "object" ||
    Array.isArray(signature) ||
    Object.keys(signature).sort().join(",") !== "alg,key_id,sig"
  ) {
    return false;
  }

  return (
    claim.domain === "void:mainnet-0:wc-public-ticket-claim-v1" &&
    claim.marker === "VOID_WC_PUBLIC_TICKET_CLAIM_V1" &&
    claim.version === 1 &&
    typeof claim.account === "string" &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(claim.account) &&
    typeof claim.executor_node_id === "string" &&
    /^[0-9a-f]{32}$/.test(claim.executor_node_id) &&
    typeof claim.executor_pubkey === "string" &&
    claim.executor_pubkey.length >= 80 &&
    claim.executor_pubkey.length <= 2048 &&
    claim.executor_pubkey.includes("BEGIN PUBLIC KEY") &&
    claim.executor_pubkey.includes("END PUBLIC KEY") &&
    typeof claim.claim_nonce === "string" &&
    /^[0-9a-f]{32}$/.test(claim.claim_nonce) &&
    Number.isSafeInteger(claim.claim_ts_ms) &&
    claim.claim_ts_ms > 0 &&
    signature.alg === "ed25519" &&
    signature.key_id === claim.executor_node_id &&
    typeof signature.sig === "string" &&
    /^[0-9a-f]{128}$/.test(signature.sig)
  );
}

async function proxyEarnClaim(req, res) {
  if (!publicEarnEnabled()) {
    writeJson(req, res, 503, { ok: false, error: "public_earn_gateway_disabled" });
    return;
  }
  if (!claimRateAllowed(req)) {
    writeJson(
      req,
      res,
      429,
      { ok: false, error: "public_earn_claim_rate_limited" },
      { "retry-after": "60" },
    );
    return;
  }
  if (req.headers.authorization) {
    writeJson(req, res, 400, {
      ok: false,
      error: "claim_authorization_header_not_allowed",
    });
    return;
  }
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    writeJson(req, res, 415, { ok: false, error: "application_json_required" });
    return;
  }

  let body;
  try {
    body = await readBoundedBody(req, EARN_CLAIM_MAX_BODY_BYTES);
  } catch (error) {
    if (String(error?.message || "") === "request_body_too_large") {
      writeJson(req, res, 413, { ok: false, error: "request_body_too_large" });
      return;
    }
    throw error;
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body.toString("utf8"));
  } catch {
    writeJson(req, res, 400, { ok: false, error: "invalid_json" });
    return;
  }
  if (!validPublicClaimBody(parsedBody)) {
    writeJson(req, res, 400, { ok: false, error: "invalid_public_claim_request" });
    return;
  }

  const response = await fetchWithTimeout(
    `${EARN_UPSTREAM}${EARN_CLAIM_PATH}`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "content-length": String(body.length),
        "user-agent": "void-public-ticket-claim-gateway-v1",
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
      "x-content-type-options": "nosniff",
      "x-void-public-earn-gateway": "v1",
      "x-void-public-ticket-claim": "v1",
    }),
  );
  res.end(responseBody);
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
  const capability = validatedEarnCapabilityAuthorization(
    req.headers.authorization,
  );
  if (!capability) {
    writeJson(req, res, 401, {
      ok: false,
      error: "earning_capability_authorization_required",
    });
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

  let parsedBody;
  try {
    parsedBody = JSON.parse(body.toString("utf8"));
  } catch {
    writeJson(req, res, 400, { ok: false, error: "invalid_json" });
    return;
  }

  const bodyTicketId = safeString(parsedBody?.envelope?.ticket_id, 64);
  if (bodyTicketId !== capability.ticketId) {
    writeJson(req, res, 401, {
      ok: false,
      error: "earning_capability_ticket_mismatch",
    });
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
        authorization: capability.header,
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

function serveShellScript(req, res, file, filename, unavailable) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    writeText(req, res, 404, `${unavailable}\n`);
    return;
  }
  if (!stat.isFile() || stat.size <= 0 || stat.size > 256 * 1024) {
    writeText(req, res, 404, `${unavailable}\n`);
    return;
  }
  const body = fs.readFileSync(file);
  res.writeHead(200, {
    "content-type": "text/x-shellscript; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-public-seed-adapter": "v1",
    "x-void-public-earn-gateway": "v1",
  });
  if (req.method === "HEAD") return res.end();
  res.end(body);
}

function serveParticipantCli(req, res) {
  serveShellScript(
    req,
    res,
    EARN_CLI_FILE,
    "wc-public-earning-participant-v1.sh",
    "participant_cli_unavailable",
  );
}

function serveClaimCli(req, res) {
  serveShellScript(
    req,
    res,
    EARN_CLAIM_CLI_FILE,
    "wc-public-ticket-claim-v1.sh",
    "claim_cli_unavailable",
  );
}

const server = http.createServer(async (req, res) => {
  // VOID_PUBLIC_EDGE_LANDING_ROOT_V1
  try {
    const url = new URL(req.url || "/", "http://adapter.local");

    if (req.method === "POST") {
      if (url.search) {
        writeText(req, res, 400, "post_query_not_allowed\n");
        return;
      }
      if (url.pathname === EARN_SUBMIT_PATH) {
        await proxyEarnSubmit(req, res);
        return;
      }
      if (url.pathname === EARN_CLAIM_PATH) {
        await proxyEarnClaim(req, res);
        return;
      }
      writeText(req, res, 405, "method_not_allowed\n", { allow: "GET, HEAD" });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      writeText(req, res, 405, "method_not_allowed\n", { allow: "GET, HEAD" });
      return;
    }

    if (!allowed(url.pathname, url.search)) {
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

    if (url.pathname === EARN_CLAIM_CLI_PATH) {
      if (url.search) {
        writeText(req, res, 400, "download_query_not_allowed\n");
        return;
      }
      serveClaimCli(req, res);
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
