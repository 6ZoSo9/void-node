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
  handleOrderStatusReadonlyRequest,
} from "./void-public-agent-service-order-status-readonly-request-handler-v1.mjs";

export const MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_REGISTRAR_V1";
export const VERSION = 1;
export const ROUTE_METHOD = "GET";
export const ROUTE_PATH =
  "/public-agent/services/v1/orders/:submission_id/status.json";

const REGISTRARS = new WeakSet();
const COMPLETED_RESPONDERS = new WeakSet();

const AUTHORITY = Object.freeze({
  abstract_route_registration: true,
  live_http_route_registration: false,
  server_mount: false,
  network_listener: false,
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
});

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

function authorityObject() {
  return { ...AUTHORITY };
}

function maxBytesValue(value) {
  if (
    !Number.isSafeInteger(value)
    || value < 1
    || value > DEFAULT_MAX_BYTES
  ) {
    fail("invalid_max_bytes");
  }
  return value;
}

function requestDescription(request) {
  const value = record(request, "request");
  if (typeof value.method !== "string" || typeof value.path !== "string") {
    fail("invalid_request_interface");
  }
  return {
    method: value.method,
    path: value.path,
  };
}

function responsePacket(routeResponse) {
  const value = record(routeResponse, "route response");
  const http = record(value.http, "route response http");
  if (
    !Number.isSafeInteger(http.status_code)
    || typeof http.content_type !== "string"
    || typeof http.cache_control !== "string"
    || typeof http.allow !== "string"
  ) {
    fail("route_response_http_contract_mismatch");
  }

  return {
    status_code: http.status_code,
    headers: {
      "content-type": http.content_type,
      "cache-control": http.cache_control,
      "allow": http.allow,
    },
    body: value,
  };
}

export function describeOrderStatusReadonlyRouteRegistrarV1() {
  const basis = {
    marker: MARKER,
    version: VERSION,
    route: {
      method: ROUTE_METHOD,
      path: ROUTE_PATH,
    },
    adapter: {
      registrar_method: "get",
      responder_method: "write",
      source_root_bound: true,
      deterministic_clock_injected: true,
      default_max_bytes: DEFAULT_MAX_BYTES,
    },
    authority: authorityObject(),
  };

  return {
    marker: MARKER,
    version: VERSION,
    registration_id: `voidaosreg1_${sha256Canonical(basis)}`,
    route: basis.route,
    adapter: basis.adapter,
    authority: basis.authority,
  };
}

function invocationReceipt(handlerResult) {
  const basis = {
    marker:
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_INVOCATION_V1",
    version: 1,
    handler_id: handlerResult.handler_id,
    response_id: handlerResult.response.response_id,
    request: handlerResult.request,
    status_code: handlerResult.response.http.status_code,
    found: handlerResult.response.found,
  };

  return {
    marker: basis.marker,
    version: 1,
    invocation_id: `voidaosri1_${sha256Canonical(basis)}`,
    request: basis.request,
    handler_id: basis.handler_id,
    response_id: basis.response_id,
    status_code: basis.status_code,
    found: basis.found,
    authority: authorityObject(),
  };
}

export function registerOrderStatusReadonlyRouteV1(options) {
  const value = record(options, "registration options");
  exactKeys(
    value,
    [
      "registrar",
      "sourceRoot",
      "handledAtUtcForRequest",
      "maxBytes",
    ],
    "registration options",
  );

  const registrar = record(value.registrar, "registrar");
  if (typeof registrar.get !== "function") {
    fail("invalid_registrar_interface");
  }
  if (REGISTRARS.has(registrar)) {
    fail("route_already_registered");
  }

  if (
    typeof value.sourceRoot !== "string"
    || value.sourceRoot.length === 0
    || !path.isAbsolute(value.sourceRoot)
  ) {
    fail("source_root_must_be_absolute");
  }
  if (typeof value.handledAtUtcForRequest !== "function") {
    fail("handled_at_provider_required");
  }
  const maxBytes = maxBytesValue(value.maxBytes);

  const routeHandler = async (request, responder) => {
    const requestValue = requestDescription(request);
    const responderValue = record(responder, "responder");
    if (typeof responderValue.write !== "function") {
      fail("invalid_responder_interface");
    }
    if (COMPLETED_RESPONDERS.has(responderValue)) {
      fail("response_already_completed");
    }

    const handledAtUtc = await value.handledAtUtcForRequest(requestValue);
    const handlerResult = await handleOrderStatusReadonlyRequest({
      root: value.sourceRoot,
      method: requestValue.method,
      requestPath: requestValue.path,
      handledAtUtc,
      maxBytes,
    });
    const packet = responsePacket(handlerResult.response);

    await responderValue.write(packet);
    COMPLETED_RESPONDERS.add(responderValue);
    return invocationReceipt(handlerResult);
  };

  registrar.get(ROUTE_PATH, routeHandler);
  REGISTRARS.add(registrar);
  return describeOrderStatusReadonlyRouteRegistrarV1();
}

function parseCli(argv) {
  if (argv.length !== 1 || argv[0] !== "describe") {
    fail("usage", "describe");
  }
}

async function main() {
  parseCli(process.argv.slice(2));
  process.stdout.write(
    canonicalJson(describeOrderStatusReadonlyRouteRegistrarV1()),
  );
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
