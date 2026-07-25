#!/usr/bin/env node
// VOID operator webhook receiver v1.
//
// Loopback-only authenticated intake for candidate notification payloads.
// This receiver stores append-once operator-local receipts. It cannot arm or
// apply any candidate stage, access wallets, sign, broadcast, mutate network
// state, reserve inventory, or move money.

import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const HOST =
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_HOST || "127.0.0.1";
const PORT = Number(
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_PORT || "4186",
);
const TOKEN_FILE =
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_TOKEN_FILE ||
  path.join(
    os.homedir(),
    ".config/void/credentials/operator-webhook-token-v1",
  );
const STATE_DIR =
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_STATE_DIR ||
  path.join(
    os.homedir(),
    ".local/state/void-operator-webhook-receiver-v1",
  );
const HEALTH_OUTPUT =
  process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_HEALTH_OUTPUT ||
  path.join(
    os.homedir(),
    "void-precision-smoke",
    "void-operator-webhook-receiver-health-v1.json",
  );
const MAX_BODY_BYTES = Math.max(
  1024,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_BODY_BYTES ||
      String(64 * 1024),
  ),
);
const REQUEST_TIMEOUT_MS = Math.max(
  1000,
  Number(
    process.env.VOID_OPERATOR_WEBHOOK_RECEIVER_REQUEST_TIMEOUT_MS ||
      "15000",
  ),
);

const MARKER = "VOID_OPERATOR_WEBHOOK_RECEIVER_V1";
const HEALTH_MARKER = "VOID_OPERATOR_WEBHOOK_RECEIVER_HEALTH_V1";
const RECEIPT_MARKER = "VOID_OPERATOR_WEBHOOK_RECEIVER_RECEIPT_V1";
const REQUEST_PATH =
  "/__void/operator-notifications/v1/candidate";
const HEALTH_PATH =
  "/__void/operator-webhook-receiver-v1/health";

const SAFE_SHA256 = /^[0-9a-f]{64}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/;

function canonical(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(value[key])}`,
      )
      .join(",")}}`;
  }
  const rendered = JSON.stringify(value);
  return rendered === undefined ? "null" : rendered;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Canonical(value) {
  return sha256(Buffer.from(canonical(value), "utf8"));
}

function readToken() {
  const stat = fs.lstatSync(TOKEN_FILE);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("token_file_must_be_regular_non_symlink");
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error("token_file_permissions_too_broad");
  }
  if (stat.size < 16 || stat.size > 8192) {
    throw new Error("token_file_size_invalid");
  }
  const token = fs.readFileSync(TOKEN_FILE, "utf8").trim();
  if (!token || /[\r\n]/.test(token)) {
    throw new Error("token_file_empty_or_multiline");
  }
  return token;
}

const TOKEN = readToken();
const TOKEN_DIGEST = crypto
  .createHash("sha256")
  .update(TOKEN)
  .digest();

function authorizationValid(value) {
  if (typeof value !== "string") return false;
  const match = /^Bearer ([^\s]{16,8192})$/.exec(value.trim());
  if (!match) return false;
  const candidateDigest = crypto
    .createHash("sha256")
    .update(match[1])
    .digest();
  return crypto.timingSafeEqual(
    TOKEN_DIGEST,
    candidateDigest,
  );
}

function authorityFailures(authority) {
  const expected = {
    operator_notification_delivery: true,
    external_network_request: true,
    operator_local_state_write: true,
    network_state_write: false,
    runtime_import_mounted: false,
    apply_requested: false,
    activation_performed: false,
    inventory_reservation: false,
    execution_attempt_reservation: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    rpc_mutation: false,
    money_movement: false,
    automatic_retry: false,
    background_loop: false,
    startup_execution: false,
  };
  const failures = [];
  const actual =
    authority && typeof authority === "object"
      ? authority
      : {};
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual[key] !== expectedValue) {
      failures.push(`authority_${key}`);
    }
  }
  return failures;
}

function validatePayload(value) {
  const failures = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return ["payload_object_required"];
  }
  if (
    value.schema !==
    "void_buy_void_candidate_operator_webhook_payload_v1"
  ) {
    failures.push("schema");
  }
  if (
    value.marker !==
    "VOID_BUY_VOID_CANDIDATE_OPERATOR_WEBHOOK_PAYLOAD_V1"
  ) {
    failures.push("marker");
  }
  if (value.version !== 1) failures.push("version");
  if (value.candidate_stage !== "observe_and_claim") {
    failures.push("candidate_stage");
  }
  for (const key of [
    "notification_id_sha256",
    "alert_fingerprint_sha256",
    "plan_fingerprint_sha256",
    "readiness_report_sha256",
    "source_notification_sha256",
  ]) {
    if (!SAFE_SHA256.test(String(value[key] || ""))) {
      failures.push(key);
    }
  }
  if (!SAFE_REQUEST_ID.test(String(value.request_id || ""))) {
    failures.push("request_id");
  }
  for (const key of [
    "required_orchestrator_confirmation",
    "required_delegated_confirmation",
    "required_stage_confirmation",
  ]) {
    if (
      typeof value[key] !== "string" ||
      value[key].length < 1 ||
      value[key].length > 256
    ) {
      failures.push(key);
    }
  }
  if (
    value.required_canary_confirmation !==
    "buyVoidArmExactObserveAndClaimCanary"
  ) {
    failures.push("required_canary_confirmation");
  }
  if (
    value.operator_action !==
    "review_exact_one_candidate_for_separate_arming_lane"
  ) {
    failures.push("operator_action");
  }
  if (
    typeof value.created_at !== "string" ||
    !Number.isFinite(Date.parse(value.created_at))
  ) {
    failures.push("created_at");
  }
  failures.push(...authorityFailures(value.authority));
  return failures;
}

function send(res, status, headers, body, method = "GET") {
  const value = Buffer.isBuffer(body)
    ? body
    : Buffer.from(String(body ?? ""));
  const finalHeaders = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-void-operator-webhook-receiver": "v1",
    ...headers,
  };
  if (method !== "HEAD") {
    finalHeaders["content-length"] = String(value.length);
  }
  res.writeHead(status, finalHeaders);
  if (method === "HEAD") return res.end();
  res.end(value);
}

function sendJson(res, status, value, method = "GET") {
  return send(
    res,
    status,
    { "content-type": "application/json; charset=utf-8" },
    JSON.stringify(value, null, 2) + "\n",
    method,
  );
}

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(
    temporary,
    JSON.stringify(value, null, 2) + "\n",
    { mode: 0o600 },
  );
  fs.renameSync(temporary, file);
}

function writeJsonExclusive(file, value) {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: 0o700,
  });
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(value, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    return true;
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
}

function receiptFiles() {
  const directory = path.join(STATE_DIR, "receipts");
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && entry.name.endsWith(".json"),
    )
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function currentHealth() {
  return {
    schema: "void_operator_webhook_receiver_health_v1",
    marker: HEALTH_MARKER,
    version: 1,
    healthy: true,
    health_status: "healthy",
    host: HOST,
    port: PORT,
    loopback_only: HOST === "127.0.0.1" || HOST === "::1",
    request_path: REQUEST_PATH,
    health_path: HEALTH_PATH,
    authentication_required: true,
    token_content_public: false,
    receipt_count: receiptFiles().length,
    maximum_body_bytes: MAX_BODY_BYTES,
    request_timeout_ms: REQUEST_TIMEOUT_MS,
    authority: {
      operator_notification_receipt: true,
      operator_local_state_write: true,
      network_state_write: false,
      runtime_import_mounted: false,
      apply_requested: false,
      activation_performed: false,
      inventory_reservation: false,
      execution_attempt_reservation: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      rpc_mutation: false,
      money_movement: false,
      automatic_retry: false,
      background_loop: true,
      startup_execution: false,
    },
  };
}

function persistHealth() {
  const health = currentHealth();
  writeJsonAtomic(HEALTH_OUTPUT, {
    ...health,
    health_receipt_sha256: sha256Canonical(health),
  });
}

function readBoundedBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"]);
    if (
      Number.isFinite(declared) &&
      declared > MAX_BODY_BYTES
    ) {
      reject(new Error("request_body_too_large"));
      return;
    }

    const chunks = [];
    let total = 0;
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      req.destroy();
      reject(new Error("request_timeout"));
    }, REQUEST_TIMEOUT_MS);

    req.on("data", (chunk) => {
      if (finished) return;
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        finished = true;
        clearTimeout(timer);
        req.destroy();
        reject(new Error("request_body_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
    req.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function handleCandidate(req, res, url) {
  if (url.search) {
    return sendJson(
      res,
      400,
      { ok: false, error: "query_not_allowed" },
      "POST",
    );
  }

  const contentType = String(
    req.headers["content-type"] || "",
  ).toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return sendJson(
      res,
      415,
      { ok: false, error: "application_json_required" },
      "POST",
    );
  }

  if (!authorizationValid(req.headers.authorization)) {
    res.setHeader(
      "www-authenticate",
      'Bearer realm="void-operator-webhook-receiver-v1"',
    );
    return sendJson(
      res,
      401,
      { ok: false, error: "bearer_authorization_required" },
      "POST",
    );
  }

  let body;
  try {
    body = await readBoundedBody(req);
  } catch (error) {
    const message = String(error?.message || error);
    if (message === "request_body_too_large") {
      return sendJson(
        res,
        413,
        { ok: false, error: "request_body_too_large" },
        "POST",
      );
    }
    if (message === "request_timeout") {
      return sendJson(
        res,
        408,
        { ok: false, error: "request_timeout" },
        "POST",
      );
    }
    throw error;
  }

  const bodySha = sha256(body);
  const declaredSha = String(
    req.headers["x-void-payload-sha256"] || "",
  ).toLowerCase();
  if (!SAFE_SHA256.test(declaredSha)) {
    return sendJson(
      res,
      400,
      { ok: false, error: "payload_sha256_required" },
      "POST",
    );
  }
  if (declaredSha !== bodySha) {
    return sendJson(
      res,
      400,
      { ok: false, error: "payload_sha256_mismatch" },
      "POST",
    );
  }

  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    return sendJson(
      res,
      400,
      { ok: false, error: "invalid_json" },
      "POST",
    );
  }

  const failures = validatePayload(payload);
  if (failures.length > 0) {
    return sendJson(
      res,
      422,
      {
        ok: false,
        error: "invalid_candidate_notification_payload",
        failures,
      },
      "POST",
    );
  }

  const notificationId = payload.notification_id_sha256;
  const receiptPath = path.join(
    STATE_DIR,
    "receipts",
    `${notificationId}.json`,
  );
  const receivedAt = new Date().toISOString();
  const receiptWithoutId = {
    schema: "void_operator_webhook_receiver_receipt_v1",
    marker: RECEIPT_MARKER,
    version: 1,
    candidate_stage: "observe_and_claim",
    notification_id_sha256: notificationId,
    request_id: payload.request_id,
    payload_sha256: bodySha,
    source_notification_sha256:
      payload.source_notification_sha256,
    received_at: receivedAt,
    authorization_verified: true,
    loopback_source:
      req.socket.remoteAddress === "127.0.0.1" ||
      req.socket.remoteAddress === "::1" ||
      req.socket.remoteAddress === "::ffff:127.0.0.1",
    automatic_retry: false,
    operator_action:
      "review_candidate_notification_without_automatic_arming",
    authority: {
      operator_notification_receipt: true,
      operator_local_state_write: true,
      network_state_write: false,
      runtime_import_mounted: false,
      apply_requested: false,
      activation_performed: false,
      inventory_reservation: false,
      execution_attempt_reservation: false,
      wallet_access: false,
      signing: false,
      transaction_broadcast: false,
      rpc_mutation: false,
      money_movement: false,
      automatic_retry: false,
      background_loop: false,
      startup_execution: false,
    },
  };
  const receipt = {
    ...receiptWithoutId,
    receipt_id_sha256: sha256Canonical(receiptWithoutId),
  };

  if (!writeJsonExclusive(receiptPath, receipt)) {
    let existing;
    try {
      existing = JSON.parse(
        fs.readFileSync(receiptPath, "utf8"),
      );
    } catch {
      return sendJson(
        res,
        500,
        { ok: false, error: "existing_receipt_unreadable" },
        "POST",
      );
    }

    if (
      existing.notification_id_sha256 === notificationId &&
      existing.payload_sha256 === bodySha
    ) {
      persistHealth();
      return sendJson(
        res,
        200,
        {
          ok: true,
          marker: MARKER,
          duplicate: true,
          notification_id_sha256: notificationId,
          receipt_id_sha256: existing.receipt_id_sha256,
          automatic_retry: false,
          activation_performed: false,
          money_movement: false,
        },
        "POST",
      );
    }

    return sendJson(
      res,
      409,
      {
        ok: false,
        error: "notification_payload_conflict",
        notification_id_sha256: notificationId,
      },
      "POST",
    );
  }

  persistHealth();
  console.log(
    "VOID_OPERATOR_NOTIFICATION_RECEIVED"
      + ` notification_id=${notificationId}`
      + ` receipt_id=${receipt.receipt_id_sha256}`,
  );

  return sendJson(
    res,
    202,
    {
      ok: true,
      marker: MARKER,
      duplicate: false,
      notification_id_sha256: notificationId,
      receipt_id_sha256: receipt.receipt_id_sha256,
      automatic_retry: false,
      activation_performed: false,
      money_movement: false,
    },
    "POST",
  );
}

const server = http.createServer(async (req, res) => {
  try {
    const method = String(req.method || "GET").toUpperCase();
    const url = new URL(
      req.url || "/",
      "http://void-operator-webhook-receiver.local",
    );

    if (
      req.socket.localAddress !== "127.0.0.1" &&
      req.socket.localAddress !== "::1"
    ) {
      return sendJson(
        res,
        403,
        { ok: false, error: "loopback_listener_required" },
        method,
      );
    }

    if (url.pathname === HEALTH_PATH) {
      if (url.search) {
        return sendJson(
          res,
          400,
          { ok: false, error: "health_query_not_allowed" },
          method,
        );
      }
      if (method !== "GET" && method !== "HEAD") {
        res.setHeader("allow", "GET, HEAD");
        return sendJson(
          res,
          405,
          { ok: false, error: "method_not_allowed" },
          method,
        );
      }
      return sendJson(res, 200, currentHealth(), method);
    }

    if (url.pathname === REQUEST_PATH) {
      if (method !== "POST") {
        res.setHeader("allow", "POST");
        return sendJson(
          res,
          405,
          { ok: false, error: "method_not_allowed" },
          method,
        );
      }
      return await handleCandidate(req, res, url);
    }

    return sendJson(
      res,
      404,
      { ok: false, error: "not_found" },
      method,
    );
  } catch (error) {
    return sendJson(
      res,
      500,
      {
        ok: false,
        marker: MARKER,
        error: "receiver_internal_error",
      },
      req.method || "GET",
    );
  }
});

if (HOST !== "127.0.0.1" && HOST !== "::1") {
  throw new Error("receiver_host_must_be_loopback");
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("receiver_port_invalid");
}

fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
persistHealth();

server.listen(PORT, HOST, () => {
  console.log(
    `${MARKER} host=${HOST} port=${PORT}`
      + ` request_path=${REQUEST_PATH}`
      + ` token_content_public=false`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
