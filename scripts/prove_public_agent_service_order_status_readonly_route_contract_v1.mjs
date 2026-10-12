#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  EXAMPLE_ROUTE_SOURCE_V1,
  ROUTE_RESPONSE_MARKER,
  ROUTE_SOURCE_MARKER,
  ROUTE_TEMPLATE,
  materializeOrderStatusRouteResponse,
  orderStatusRoutePath,
  parseOrderStatusRoutePath,
} from "../tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";
import {
  EXAMPLE_SOURCE_V1,
  canonical,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";

const EXAMPLE_PATH =
  "examples/public-agent-service-order-status-readonly-route-contract-v1.example.json";
const SCHEMA_PATH =
  "schemas/public-agent-service-order-status-readonly-route-contract-v1.schema.json";
const DOC_PATH =
  "docs/public-agent/public-agent-service-order-status-readonly-route-contract-v1.md";
const WORKFLOW_PATH =
  ".github/workflows/public-agent-service-order-status-readonly-route-contract-v1.yml";
const TOOL_PATH =
  "tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (options.check !== false && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${
        (result.stderr || result.stdout || "").trim()
      }`,
    );
  }
  return result;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const example = JSON.parse(readFileSync(EXAMPLE_PATH, "utf8"));
const expected = materializeOrderStatusRouteResponse(
  EXAMPLE_ROUTE_SOURCE_V1,
);

assert.equal(ROUTE_SOURCE_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_SOURCE_V1");
assert.equal(ROUTE_RESPONSE_MARKER,
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_RESPONSE_V1");
assert.equal(
  ROUTE_TEMPLATE,
  "/public-agent/services/v1/orders/:submission_id/status.json",
);
assert.equal(canonical(example), canonical(expected));
assert.equal(expected.http.status_code, 200);
assert.equal(expected.http.cache_control, "no-store");
assert.equal(expected.http.allow, "GET");
assert.equal(expected.found, true);
assert.equal(
  expected.route.path,
  orderStatusRoutePath(EXAMPLE_SOURCE_V1.submission_id),
);
assert.equal(
  expected.route.submission_id,
  EXAMPLE_SOURCE_V1.submission_id,
);
assert.equal(
  expected.order_status.phase,
  "provider_authentication_required",
);
assert.equal(
  expected.order_status.next_action,
  "capture_real_provider_selection_and_authentication_prerequisite",
);
assert.equal(expected.error, null);
assert.equal(
  canonical(materializeOrderStatusRouteResponse(EXAMPLE_ROUTE_SOURCE_V1)),
  canonical(expected),
);

const missingSource = {
  marker: ROUTE_SOURCE_MARKER,
  version: 1,
  method: "GET",
  path: orderStatusRoutePath("voidawsr1_missing_order_status_0001"),
  observed_at_utc: "2030-01-01T00:00:05Z",
  order_status_source: null,
};
const missing = materializeOrderStatusRouteResponse(missingSource);
assert.equal(missing.http.status_code, 404);
assert.equal(missing.found, false);
assert.equal(missing.order_status, null);
assert.equal(missing.error.code, "order_status_not_found");
assert.equal(
  canonical(materializeOrderStatusRouteResponse(missingSource)),
  canonical(missing),
);

assert.deepEqual(
  parseOrderStatusRoutePath(expected.route.path),
  { submission_id: EXAMPLE_SOURCE_V1.submission_id },
);
assert.throws(
  () => parseOrderStatusRoutePath(`${expected.route.path}?x=1`),
  /query and fragment are forbidden/,
);
assert.throws(
  () => parseOrderStatusRoutePath(`${expected.route.path}#fragment`),
  /query and fragment are forbidden/,
);
assert.throws(
  () => parseOrderStatusRoutePath(
    "/public-agent/services/v1/orders/void%2Fbad/status.json",
  ),
  /percent encoding is forbidden/,
);
assert.throws(
  () => parseOrderStatusRoutePath(
    "/public-agent/services/v1/orders/void-good/status.json/",
  ),
  /does not match/,
);

const post = clone(EXAMPLE_ROUTE_SOURCE_V1);
post.method = "POST";
assert.throws(
  () => materializeOrderStatusRouteResponse(post),
  /only GET is supported/,
);

const mismatch = clone(EXAMPLE_ROUTE_SOURCE_V1);
mismatch.path = orderStatusRoutePath("voidawsr1_other");
assert.throws(
  () => materializeOrderStatusRouteResponse(mismatch),
  /does not match order status source/,
);

const timeMismatch = clone(EXAMPLE_ROUTE_SOURCE_V1);
timeMismatch.observed_at_utc = "2030-01-01T00:00:06Z";
assert.throws(
  () => materializeOrderStatusRouteResponse(timeMismatch),
  /observation times must match/,
);

const unknown = clone(EXAMPLE_ROUTE_SOURCE_V1);
unknown.unexpected = true;
assert.throws(
  () => materializeOrderStatusRouteResponse(unknown),
  /keys mismatch/,
);

assert.ok(
  Object.values(expected.authority).every((value) => value === false),
);
assert.equal(expected.authority.http_route_registration, false);
assert.equal(expected.authority.server_mount, false);
assert.equal(expected.authority.persistence_read, false);
assert.equal(expected.authority.persistence_write, false);

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
assert.equal(
  schema.properties.marker.const,
  ROUTE_RESPONSE_MARKER,
);
assert.equal(
  schema.properties.route.properties.template.const,
  ROUTE_TEMPLATE,
);
assert.deepEqual(
  schema.properties.http.properties.status_code.enum,
  [200, 404],
);

const docs = readFileSync(DOC_PATH, "utf8");
assert.ok(docs.includes(ROUTE_TEMPLATE));
assert.ok(docs.includes("contract only"));
assert.ok(docs.includes("does not register"));
assert.ok(docs.includes("404"));

const workflow = readFileSync(WORKFLOW_PATH, "utf8");
assert.ok(workflow.includes(
  "prove_public_agent_service_order_status_readonly_route_contract_v1.mjs",
));
assert.ok(workflow.includes(TOOL_PATH));

const root = mkdtempSync(join(tmpdir(), "void-order-status-route-proof-"));
try {
  const sourcePath = join(root, "source.json");
  const responsePath = join(root, "response.json");
  writeFileSync(
    sourcePath,
    `${JSON.stringify(EXAMPLE_ROUTE_SOURCE_V1, null, 2)}\n`,
  );

  const materialize = run(
    "node",
    [TOOL_PATH, "materialize", sourcePath, responsePath],
  );
  assert.ok(materialize.stdout.includes("status_code=200"));
  assert.ok(materialize.stdout.includes("http_route_registered=false"));
  assert.ok(materialize.stdout.includes("server_mount_modified=false"));

  const verify = run(
    "node",
    [TOOL_PATH, "verify", sourcePath, responsePath],
  );
  assert.ok(verify.stdout.includes("route_response_verified_exact=true"));

  const cliResponse = JSON.parse(readFileSync(responsePath, "utf8"));
  assert.equal(canonical(cliResponse), canonical(expected));
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("example_exact_green=true");
console.log("found_200_contract_green=true");
console.log("not_found_404_contract_green=true");
console.log("strict_get_and_path_green=true");
console.log("source_binding_green=true");
console.log("deterministic_response_green=true");
console.log("schema_contract_green=true");
console.log("cli_materialize_verify_green=true");
console.log("all_authority_false_green=true");
console.log("http_route_registered=false");
console.log("server_mount_modified=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_CONTRACT_V1_PROOF_GREEN=true",
);
