#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  sha256Canonical,
} from "./void-public-agent-service-order-status-readonly-v1.mjs";
import {
  ROUTE_SOURCE_MARKER,
  materializeOrderStatusRouteResponse,
  parseOrderStatusRoutePath,
} from "./void-public-agent-service-order-status-readonly-route-contract-v1.mjs";
import {
  DEFAULT_MAX_BYTES,
  MARKER as SOURCE_RESOLVER_MARKER,
  canonicalJson,
  resolveOrderStatusSource,
} from "./void-public-agent-service-order-status-readonly-source-resolver-v1.mjs";

export const MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_REQUEST_HANDLER_V1";
export const VERSION = 1;

const UTC =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const AUTHORITY = Object.freeze({
  source_write: false,
  http_route_registration: false,
  server_mount: false,
  network_listener: false,
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

function exactUtc(value) {
  if (
    typeof value !== "string"
    || !UTC.test(value)
    || Number.isNaN(Date.parse(value))
  ) {
    fail("invalid_handled_at_utc");
  }
  return value;
}

function authorityObject() {
  return { ...AUTHORITY };
}

function resolutionSummary(resolution) {
  if (
    resolution?.marker !== SOURCE_RESOLVER_MARKER
    || resolution.version !== 1
  ) {
    fail("source_resolver_contract_mismatch");
  }

  return {
    found: resolution.found,
    submission_id: resolution.submission_id,
    source_filename: resolution.source_filename,
    source_sha256: resolution.source_sha256,
    source_size_bytes: resolution.source_size_bytes,
    reason: resolution.reason,
  };
}

export async function handleOrderStatusReadonlyRequest({
  root,
  method,
  requestPath,
  handledAtUtc,
  maxBytes = DEFAULT_MAX_BYTES,
}) {
  if (method !== "GET") {
    fail("method_not_allowed");
  }

  const handledAt = exactUtc(handledAtUtc);
  const parsed = parseOrderStatusRoutePath(requestPath);
  const resolution = await resolveOrderStatusSource({
    root,
    submissionId: parsed.submission_id,
    maxBytes,
  });

  if (resolution.submission_id !== parsed.submission_id) {
    fail("source_resolver_submission_id_mismatch");
  }

  const routeObservedAt = resolution.found
    ? resolution.source?.observed_at_utc
    : handledAt;

  if (typeof routeObservedAt !== "string") {
    fail("resolved_source_observed_at_utc_missing");
  }

  const routeSource = {
    marker: ROUTE_SOURCE_MARKER,
    version: 1,
    method: "GET",
    path: requestPath,
    observed_at_utc: routeObservedAt,
    order_status_source: resolution.found ? resolution.source : null,
  };
  const response = materializeOrderStatusRouteResponse(routeSource);

  if (response.found !== resolution.found) {
    fail("resolver_route_found_mismatch");
  }
  if (response.route.submission_id !== parsed.submission_id) {
    fail("resolver_route_submission_id_mismatch");
  }

  const request = {
    method: "GET",
    path: requestPath,
    submission_id: parsed.submission_id,
  };
  const summary = resolutionSummary(resolution);
  const basis = {
    marker: MARKER,
    version: VERSION,
    handled_at_utc: handledAt,
    request,
    resolution: summary,
    response_id: response.response_id,
  };

  return {
    marker: MARKER,
    version: VERSION,
    handler_id: `voidaosh1_${sha256Canonical(basis)}`,
    handled_at_utc: handledAt,
    request,
    resolution: summary,
    response,
    authority: authorityObject(),
  };
}

function parseCli(argv) {
  if (argv.length === 0 || argv[0] !== "handle") {
    fail(
      "usage",
      "handle --root <directory> --method GET --path <route> --handled-at <utc> [--max-bytes <n>]",
    );
  }

  const values = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (
      ![
        "--root",
        "--method",
        "--path",
        "--handled-at",
        "--max-bytes",
      ].includes(flag)
      || value === undefined
      || values.has(flag)
    ) {
      fail("invalid_cli_arguments");
    }
    values.set(flag, value);
  }

  for (const required of ["--root", "--method", "--path", "--handled-at"]) {
    if (!values.has(required)) {
      fail("invalid_cli_arguments");
    }
  }

  return {
    root: values.get("--root"),
    method: values.get("--method"),
    requestPath: values.get("--path"),
    handledAtUtc: values.get("--handled-at"),
    maxBytes: values.has("--max-bytes")
      ? Number(values.get("--max-bytes"))
      : DEFAULT_MAX_BYTES,
  };
}

async function main() {
  const options = parseCli(process.argv.slice(2));
  const result = await handleOrderStatusReadonlyRequest(options);
  process.stdout.write(canonicalJson(result));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  main().catch((error) => {
    process.stderr.write(`HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
