#!/usr/bin/env node
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import {
  EXAMPLE_SOURCE_V1,
  canonical,
  materializeOrderStatus,
  sha256Canonical,
} from "./void-public-agent-service-order-status-readonly-v1.mjs";

export const ROUTE_SOURCE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_SOURCE_V1";
export const ROUTE_RESPONSE_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_RESPONSE_V1";
export const ROUTE_TEMPLATE =
  "/public-agent/services/v1/orders/:submission_id/status.json";

const SOURCE_KEYS = [
  "marker",
  "method",
  "observed_at_utc",
  "order_status_source",
  "path",
  "version",
];
const SAFE_IDENTIFIER = /^[A-Za-z0-9._:-]{1,256}$/;
const UTC =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PATH_PATTERN =
  /^\/public-agent\/services\/v1\/orders\/([A-Za-z0-9._:-]{1,256})\/status\.json$/;

function fail(message) {
  throw new Error(message);
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonical(actual) !== canonical(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function exactUtc(value, label) {
  if (
    typeof value !== "string"
    || !UTC.test(value)
    || Number.isNaN(Date.parse(value))
  ) {
    fail(`${label} must be an exact UTC timestamp`);
  }
  return value;
}

export function orderStatusRoutePath(submissionId) {
  if (
    typeof submissionId !== "string"
    || !SAFE_IDENTIFIER.test(submissionId)
  ) {
    fail("submission_id must be a safe identifier");
  }
  return `/public-agent/services/v1/orders/${submissionId}/status.json`;
}

export function parseOrderStatusRoutePath(path) {
  if (typeof path !== "string") fail("path must be a string");
  if (path.includes("?") || path.includes("#")) {
    fail("query and fragment are forbidden");
  }
  if (path.includes("%")) fail("percent encoding is forbidden");
  const match = PATH_PATTERN.exec(path);
  if (!match) fail("path does not match the order-status route");
  return {
    submission_id: match[1],
  };
}

export const EXAMPLE_ROUTE_SOURCE_V1 = Object.freeze({
  marker: ROUTE_SOURCE_MARKER,
  version: 1,
  method: "GET",
  path: orderStatusRoutePath(EXAMPLE_SOURCE_V1.submission_id),
  observed_at_utc: EXAMPLE_SOURCE_V1.observed_at_utc,
  order_status_source: EXAMPLE_SOURCE_V1,
});

export function validateOrderStatusRouteSource(input) {
  const source = record(input, "route source");
  exactKeys(source, SOURCE_KEYS, "route source");
  if (source.marker !== ROUTE_SOURCE_MARKER) {
    fail("route source marker mismatch");
  }
  if (source.version !== 1) fail("route source version mismatch");
  if (source.method !== "GET") fail("only GET is supported");

  const parsed = parseOrderStatusRoutePath(source.path);
  exactUtc(source.observed_at_utc, "observed_at_utc");

  if (source.order_status_source !== null) {
    const statusSource = record(
      source.order_status_source,
      "order_status_source",
    );
    if (statusSource.submission_id !== parsed.submission_id) {
      fail("path submission_id does not match order status source");
    }
    if (statusSource.observed_at_utc !== source.observed_at_utc) {
      fail("route and order status observation times must match");
    }
    materializeOrderStatus(statusSource);
  }

  return JSON.parse(JSON.stringify(source));
}

const AUTHORITY = Object.freeze({
  http_route_registration: false,
  server_mount: false,
  persistence_read: false,
  persistence_write: false,
  authenticated_submission_post: false,
  provider_selection: false,
  provider_authentication: false,
  quote_publication: false,
  quote_acceptance: false,
  payment_authorization: false,
  payment_execution: false,
  work_execution_authorization: false,
  work_dispatch: false,
  work_credit_write: false,
  runtime_mutation: false,
});

export function materializeOrderStatusRouteResponse(input) {
  const source = validateOrderStatusRouteSource(input);
  const parsed = parseOrderStatusRoutePath(source.path);
  const orderStatus =
    source.order_status_source === null
      ? null
      : materializeOrderStatus(source.order_status_source);
  const found = orderStatus !== null;
  const statusCode = found ? 200 : 404;
  const error = found
    ? null
    : {
        code: "order_status_not_found",
        message: "No order status is available for this submission.",
      };

  const basis = {
    marker: ROUTE_RESPONSE_MARKER,
    version: 1,
    observed_at_utc: source.observed_at_utc,
    route: {
      method: "GET",
      template: ROUTE_TEMPLATE,
      path: source.path,
      submission_id: parsed.submission_id,
    },
    http: {
      status_code: statusCode,
      content_type: "application/json; charset=utf-8",
      cache_control: "no-store",
      allow: "GET",
    },
    found,
    order_status_id: orderStatus?.status_id ?? null,
    error,
    route_source_sha256: sha256Canonical(source),
  };

  return {
    marker: ROUTE_RESPONSE_MARKER,
    version: 1,
    response_id: `voidaosr1_${sha256Canonical(basis)}`,
    observed_at_utc: source.observed_at_utc,
    route: basis.route,
    http: basis.http,
    found,
    order_status: orderStatus,
    error,
    route_source_sha256: basis.route_source_sha256,
    authority: { ...AUTHORITY },
  };
}

function atomicWrite(path, value) {
  const output = resolve(path);
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const temporary = `${output}.tmp-${process.pid}`;
  writeFileSync(
    temporary,
    `${JSON.stringify(value, null, 2)}\n`,
    { mode: 0o600 },
  );
  chmodSync(temporary, 0o600);
  renameSync(temporary, output);
  return output;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), "utf8"));
  } catch (error) {
    fail(`${label} could not be read: ${error.message}`);
  }
}

function usage() {
  console.log([
    "VOID public-agent order status readonly route contract V1",
    "",
    "  materialize <route-source.json> <route-response.json>",
    "  verify <route-source.json> <route-response.json>",
    "  example <route-response.json>",
  ].join("\n"));
}

function main(argv) {
  const [command, first, second] = argv;
  if (!command || command === "--help") {
    usage();
    return;
  }

  if (command === "materialize") {
    if (!first || !second) {
      fail("materialize requires source and output paths");
    }
    const response = materializeOrderStatusRouteResponse(
      readJson(first, "route source"),
    );
    const output = atomicWrite(second, response);
    console.log(`status_code=${response.http.status_code}`);
    console.log(`response_id=${response.response_id}`);
    console.log(`output=${output}`);
    console.log("http_route_registered=false");
    console.log("server_mount_modified=false");
    console.log("mutation_performed=false");
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_CONTRACT_V1_COMPLETE=true",
    );
    return;
  }

  if (command === "verify") {
    if (!first || !second) {
      fail("verify requires source and response paths");
    }
    const expected = materializeOrderStatusRouteResponse(
      readJson(first, "route source"),
    );
    const actual = readJson(second, "route response");
    if (canonical(expected) !== canonical(actual)) {
      fail("route response verification mismatch");
    }
    console.log(`status_code=${expected.http.status_code}`);
    console.log("route_response_verified_exact=true");
    console.log("http_route_registered=false");
    console.log("server_mount_modified=false");
    console.log("mutation_performed=false");
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_CONTRACT_V1_COMPLETE=true",
    );
    return;
  }

  if (command === "example") {
    if (!first || second) {
      fail("example requires exactly one output path");
    }
    const response = materializeOrderStatusRouteResponse(
      EXAMPLE_ROUTE_SOURCE_V1,
    );
    const output = atomicWrite(first, response);
    console.log(`status_code=${response.http.status_code}`);
    console.log(`output=${output}`);
    console.log("http_route_registered=false");
    console.log("server_mount_modified=false");
    console.log("mutation_performed=false");
    console.log(
      "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_CONTRACT_V1_COMPLETE=true",
    );
    return;
  }

  fail(`unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  }
}
