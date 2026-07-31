#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  sha256Canonical,
} from "./void-public-agent-service-order-status-readonly-v1.mjs";
import {
  DEFAULT_MAX_BYTES,
  canonicalJson,
} from "./void-public-agent-service-order-status-readonly-source-resolver-v1.mjs";
import {
  ROUTE_METHOD,
  ROUTE_PATH,
  registerOrderStatusReadonlyRouteV1,
} from "./void-public-agent-service-order-status-readonly-route-registrar-v1.mjs";

export const MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1";
export const VERSION = 1;
export const ENABLE_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_ENABLED";
export const SOURCE_ROOT_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_SOURCE_ROOT";
export const MAX_BYTES_ENV =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_MAX_BYTES";

const MOUNTED_APPS = new WeakSet();
const COMPLETED_HTTP_RESPONSES = new WeakSet();

function fail(code, detail = "") {
  const suffix = detail ? `: ${detail}` : "";
  throw new Error(`${code}${suffix}`);
}

function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("invalid_object", label);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(keys) !== JSON.stringify(wanted)) {
    fail("unknown_or_missing_fields", label);
  }
}

function enabledValue(raw) {
  if (raw === undefined || raw === null || raw === "" || raw === "0") {
    return false;
  }
  if (raw === "1") {
    return true;
  }
  fail("invalid_enable_flag");
}

function maxBytesValue(raw) {
  if (raw === undefined || raw === null || raw === "") {
    return DEFAULT_MAX_BYTES;
  }
  if (!/^[1-9][0-9]*$/.test(String(raw))) {
    fail("invalid_max_bytes");
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value)
    || value < 1
    || value > DEFAULT_MAX_BYTES
  ) {
    fail("invalid_max_bytes");
  }
  return value;
}

function sourceRootValue(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    fail("source_root_required");
  }
  if (!path.isAbsolute(raw)) {
    fail("source_root_must_be_absolute");
  }
  return path.resolve(raw);
}

function authority(enabled, mounted) {
  const active = enabled === true && mounted === true;
  return {
    live_http_route_registration: active,
    server_mount: active,
    network_listener: false,
    source_read: active,
    source_write: false,
    authenticated_submission_post: false,
    token_byte_read: false,
    provider_selection: false,
    provider_authentication: false,
    quote_acceptance: false,
    payment_execution: false,
    work_dispatch: false,
    work_credit_write: false,
    runtime_mutation: false,
    service_restart: false,
    deployment: false,
  };
}

export function describeOrderStatusReadonlyHttpIntegrationV1({
  enabled = false,
  mounted = false,
  sourceRootConfigured = false,
  maxBytes = DEFAULT_MAX_BYTES,
} = {}) {
  if (typeof enabled !== "boolean" || typeof mounted !== "boolean") {
    fail("invalid_enabled_or_mounted");
  }
  if (mounted && !enabled) {
    fail("mounted_requires_enabled");
  }
  if (typeof sourceRootConfigured !== "boolean") {
    fail("invalid_source_root_configured");
  }
  const boundedMaxBytes = maxBytesValue(String(maxBytes));

  const basis = {
    marker: MARKER,
    version: VERSION,
    enabled,
    mounted,
    route: {
      method: ROUTE_METHOD,
      path: ROUTE_PATH,
    },
    configuration: {
      disabled_by_default: true,
      enable_env: ENABLE_ENV,
      source_root_env: SOURCE_ROOT_ENV,
      max_bytes_env: MAX_BYTES_ENV,
      source_root_configured: sourceRootConfigured,
      max_bytes: boundedMaxBytes,
    },
    authority: authority(enabled, mounted),
  };

  return {
    marker: MARKER,
    version: VERSION,
    integration_id: `voidaoshi1_${sha256Canonical(basis)}`,
    enabled: basis.enabled,
    mounted: basis.mounted,
    route: basis.route,
    configuration: basis.configuration,
    authority: basis.authority,
  };
}

function requestDescription(request) {
  const value = record(request, "express request");
  const method = String(value.method || "");
  const requestPath = String(
    value.originalUrl
    || value.url
    || value.path
    || "",
  );
  if (!method || !requestPath) {
    fail("invalid_express_request");
  }
  return { method, path: requestPath };
}

function responsePacket(packet) {
  const value = record(packet, "response packet");
  exactKeys(value, ["status_code", "headers", "body"], "response packet");
  const headers = record(value.headers, "response packet headers");
  if (
    !Number.isSafeInteger(value.status_code)
    || value.status_code < 100
    || value.status_code > 599
  ) {
    fail("invalid_response_status");
  }
  for (const [name, headerValue] of Object.entries(headers)) {
    if (typeof name !== "string" || typeof headerValue !== "string") {
      fail("invalid_response_header");
    }
  }
  return value;
}

async function writeExpressPacket(response, packet) {
  const res = record(response, "express response");
  if (
    COMPLETED_HTTP_RESPONSES.has(res)
    || res.headersSent === true
    || res.writableEnded === true
  ) {
    fail("http_response_already_completed");
  }
  if (typeof res.status !== "function" || typeof res.json !== "function") {
    fail("invalid_express_response");
  }

  const value = responsePacket(packet);
  res.status(value.status_code);

  if (typeof res.set === "function") {
    res.set(value.headers);
  } else if (typeof res.setHeader === "function") {
    for (const [name, headerValue] of Object.entries(value.headers)) {
      res.setHeader(name, headerValue);
    }
  } else {
    fail("invalid_express_response_headers");
  }

  await res.json(value.body);
  COMPLETED_HTTP_RESPONSES.add(res);
}

function publicErrorBody() {
  return {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_ERROR_V1",
    version: 1,
    ok: false,
    error: "order_status_unavailable",
    authority: authority(false, false),
  };
}

async function writeSanitizedError(response) {
  const res = record(response, "express response");
  if (
    COMPLETED_HTTP_RESPONSES.has(res)
    || res.headersSent === true
    || res.writableEnded === true
  ) {
    fail("http_response_already_completed");
  }
  if (typeof res.status !== "function" || typeof res.json !== "function") {
    fail("invalid_express_response");
  }

  res.status(500);
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "allow": "GET",
  };
  if (typeof res.set === "function") {
    res.set(headers);
  } else if (typeof res.setHeader === "function") {
    for (const [name, headerValue] of Object.entries(headers)) {
      res.setHeader(name, headerValue);
    }
  } else {
    fail("invalid_express_response_headers");
  }

  await res.json(publicErrorBody());
  COMPLETED_HTTP_RESPONSES.add(res);
}

export function executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1(
  options,
) {
  const value = record(options, "integration options");
  exactKeys(
    value,
    ["env", "appProvider", "handledAtUtcForRequest"],
    "integration options",
  );

  const env = record(value.env, "environment");
  const enabled = enabledValue(env[ENABLE_ENV]);
  const sourceRootConfigured =
    typeof env[SOURCE_ROOT_ENV] === "string"
    && env[SOURCE_ROOT_ENV].length > 0;

  if (!enabled) {
    return describeOrderStatusReadonlyHttpIntegrationV1({
      enabled: false,
      mounted: false,
      sourceRootConfigured,
      maxBytes: DEFAULT_MAX_BYTES,
    });
  }

  if (typeof value.appProvider !== "function") {
    fail("app_provider_required");
  }
  if (typeof value.handledAtUtcForRequest !== "function") {
    fail("handled_at_provider_required");
  }

  const sourceRoot = sourceRootValue(env[SOURCE_ROOT_ENV]);
  const maxBytes = maxBytesValue(env[MAX_BYTES_ENV]);
  const app = record(value.appProvider(), "express app");
  if (typeof app.get !== "function") {
    fail("invalid_express_app");
  }
  if (MOUNTED_APPS.has(app)) {
    fail("http_integration_already_mounted");
  }

  const registrar = {
    get(routePath, abstractHandler) {
      if (routePath !== ROUTE_PATH || typeof abstractHandler !== "function") {
        fail("registrar_contract_mismatch");
      }
      app.get(routePath, async (req, res) => {
        try {
          await abstractHandler(
            requestDescription(req),
            {
              write: async (packet) => {
                await writeExpressPacket(res, packet);
              },
            },
          );
        } catch {
          await writeSanitizedError(res);
        }
      });
    },
  };

  registerOrderStatusReadonlyRouteV1({
    registrar,
    sourceRoot,
    handledAtUtcForRequest: value.handledAtUtcForRequest,
    maxBytes,
  });

  MOUNTED_APPS.add(app);
  return describeOrderStatusReadonlyHttpIntegrationV1({
    enabled: true,
    mounted: true,
    sourceRootConfigured: true,
    maxBytes,
  });
}

function parseCli(argv) {
  if (argv.length !== 1 || argv[0] !== "describe-disabled") {
    fail("usage", "describe-disabled");
  }
}

async function main() {
  parseCli(process.argv.slice(2));
  process.stdout.write(
    canonicalJson(describeOrderStatusReadonlyHttpIntegrationV1()),
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}
`);
    process.exitCode = 1;
  });
}
