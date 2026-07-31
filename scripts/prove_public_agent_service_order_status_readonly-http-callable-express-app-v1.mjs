#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import expressModule from "express";

import {
  EXAMPLE_SOURCE_V1,
  materializeOrderStatus,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";
import {
  orderStatusRoutePath,
} from "../tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";
import {
  ENABLE_ENV,
  MAX_BYTES_ENV,
  SOURCE_ROOT_ENV,
  executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1,
} from "../tools/void-public-agent-service-order-status-readonly-http-integration-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const integrationPath = path.join(
  repoRoot,
  "tools",
  "void-public-agent-service-order-status-readonly-http-integration-v1.mjs",
);
const examplePath = path.join(
  repoRoot,
  "examples",
  "public-agent-service-order-status-readonly-http-callable-express-app-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas",
  "public-agent-service-order-status-readonly-http-callable-express-app-v1.schema.json",
);
const docsPath = path.join(
  repoRoot,
  "docs",
  "public-agent",
  "public-agent-service-order-status-readonly-http-callable-express-app-v1.md",
);
const indexPath = path.join(repoRoot, "src", "index.ts");

const MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_CALLABLE_EXPRESS_APP_REPAIR_EXAMPLE_V1";
const PROOF_MARKER =
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_CALLABLE_EXPRESS_APP_REPAIR_V1_PROOF_GREEN=true";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function expectReject(label, operation, pattern) {
  await assert.rejects(operation, pattern, label);
}

function responseObject() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    completions: 0,
    headersSent: false,
    writableEnded: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(headers) {
      Object.assign(this.headers, headers);
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    async json(body) {
      this.body = body;
      this.completions += 1;
      this.headersSent = true;
      this.writableEnded = true;
      return this;
    },
  };
}

function callableFakeApp() {
  const routes = [];
  const app = function callableExpressShape() {
    throw new Error("callable app invocation is outside this proof");
  };
  app.routes = routes;
  app.get = function get(routePath, handler) {
    routes.push({ routePath, handler });
    return app;
  };
  return app;
}

function objectFakeApp() {
  const routes = [];
  return {
    routes,
    get(routePath, handler) {
      routes.push({ routePath, handler });
      return this;
    },
  };
}

const example = JSON.parse(await readFile(examplePath, "utf8"));
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
assert.equal(example.marker, MARKER);
assert.equal(example.version, 1);
assert.equal(
  example.diagnostic.classification,
  "invalid_express_app_provider_result",
);
assert.equal(
  example.root_cause.express_application_runtime_type,
  "function",
);
assert.deepEqual(
  example.repair.accepted_runtime_types,
  ["function", "object"],
);
assert.equal(example.verification.disabled_app_provider_calls, 0);
assert.equal(example.verification.invalid_app_values_rejected, 7);
assert.equal(
  Object.values(example.authority).every((value) => value === false),
  true,
);
assert.equal(example.decision.ready_to_retry_activation, false);
assert.equal(schema.properties.marker.const, MARKER);
assert.equal(schema.properties.version.const, 1);
console.log("example_and_schema_green=true");

let disabledProviderCalls = 0;
const disabled = executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
  env: {},
  appProvider: () => {
    disabledProviderCalls += 1;
    throw new Error("disabled provider must not execute");
  },
  handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
});
assert.equal(disabled.enabled, false);
assert.equal(disabled.mounted, false);
assert.equal(disabledProviderCalls, 0);
console.log("disabled_provider_not_called_green=true");

const express = expressModule?.default ?? expressModule;
const realExpressApp = express();
assert.equal(typeof realExpressApp, "function");
assert.equal(typeof realExpressApp.get, "function");
const realMounted =
  executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: {
      [ENABLE_ENV]: "1",
      [SOURCE_ROOT_ENV]: path.resolve(os.tmpdir()),
      [MAX_BYTES_ENV]: "1048576",
    },
    appProvider: () => realExpressApp,
    handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
  });
assert.equal(realMounted.enabled, true);
assert.equal(realMounted.mounted, true);
assert.equal(realMounted.authority.live_http_route_registration, true);
assert.equal(realMounted.authority.network_listener, false);
assert.equal(realMounted.authority.source_write, false);
assert.equal(realMounted.authority.service_restart, false);
console.log("actual_express_callable_app_accepted_green=true");

const root = await mkdtemp(
  path.join(os.tmpdir(), "void-callable-express-app-repair-v1-"),
);
try {
  const submissionId = EXAMPLE_SOURCE_V1.submission_id;
  const sourcePath = path.join(root, `${submissionId}.json`);
  const sourceBytes = Buffer.from(
    `${JSON.stringify(EXAMPLE_SOURCE_V1, null, 2)}\n`,
  );
  await writeFile(sourcePath, sourceBytes, { mode: 0o600 });
  const beforeHash = hash(await readFile(sourcePath));

  const callableApp = callableFakeApp();
  let callableClockCalls = 0;
  const callableMounted =
    executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
      env: {
        [ENABLE_ENV]: "1",
        [SOURCE_ROOT_ENV]: root,
        [MAX_BYTES_ENV]: "1048576",
      },
      appProvider: () => callableApp,
      handledAtUtcForRequest: () => {
        callableClockCalls += 1;
        return "2026-07-31T00:00:00.000Z";
      },
    });

  assert.equal(callableMounted.enabled, true);
  assert.equal(callableMounted.mounted, true);
  assert.equal(callableApp.routes.length, 1);
  const response = responseObject();
  await callableApp.routes[0].handler(
    {
      method: "GET",
      originalUrl: orderStatusRoutePath(submissionId),
    },
    response,
  );
  assert.equal(response.statusCode, 200);
  assert.equal(response.completions, 1);
  assert.equal(response.body.found, true);
  assert.equal(
    response.body.order_status.status_id,
    materializeOrderStatus(EXAMPLE_SOURCE_V1).status_id,
  );
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(callableClockCalls, 1);
  assert.equal(
    Object.values(response.body.authority).every(
      (value) => value === false,
    ),
    true,
  );
  console.log("callable_fake_app_route_found_green=true");

  const objectApp = objectFakeApp();
  const objectMounted =
    executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
      env: {
        [ENABLE_ENV]: "1",
        [SOURCE_ROOT_ENV]: root,
      },
      appProvider: () => objectApp,
      handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
    });
  assert.equal(objectMounted.mounted, true);
  assert.equal(objectApp.routes.length, 1);
  console.log("object_fake_app_regression_green=true");

  const invalidValues = [
    undefined,
    null,
    0,
    "app",
    true,
    [],
    function callableWithoutGet() {},
  ];
  for (const [index, invalid] of invalidValues.entries()) {
    await expectReject(
      `invalid app ${index}`,
      async () =>
        executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
          env: {
            [ENABLE_ENV]: "1",
            [SOURCE_ROOT_ENV]: root,
          },
          appProvider: () => invalid,
          handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
        }),
      /invalid_express_app/,
    );
  }
  console.log("invalid_app_shapes_rejected_green=true");

  const afterHash = hash(await readFile(sourcePath));
  assert.equal(afterHash, beforeHash);
  console.log("source_bytes_unchanged_green=true");
} finally {
  await rm(root, { recursive: true, force: true });
}

const integrationText = await readFile(integrationPath, "utf8");
assert.equal(
  integrationText.includes("function expressApp(value)"),
  true,
);
assert.equal(
  integrationText.includes(
    '(kind !== "object" && kind !== "function")',
  ),
  true,
);
assert.equal(
  integrationText.includes('typeof value.get !== "function"'),
  true,
);
assert.equal(
  integrationText.includes(
    "const app = expressApp(value.appProvider());",
  ),
  true,
);
assert.equal(
  integrationText.includes(
    'record(value.appProvider(), "express app")',
  ),
  false,
);
assert.equal(
  integrationText.includes(
    'if (value === null || typeof value !== "object" || Array.isArray(value))',
  ),
  true,
);
console.log("dedicated_validator_static_green=true");

const indexText = await readFile(indexPath, "utf8");
assert.equal(
  indexText.split(
    "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_BEGIN",
  ).length - 1,
  1,
);
assert.equal(
  indexText.split(
    "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_END",
  ).length - 1,
  1,
);
console.log("startup_callsite_marker_unchanged_green=true");

const docsText = await readFile(docsPath, "utf8");
for (const phrase of [
  "Express application is a callable JavaScript function",
  "generic `record` validator",
  "`src/index.ts` and its provider binding remain unchanged",
  "ready_to_retry_activation=false",
]) {
  assert.equal(docsText.includes(phrase), true, phrase);
}
console.log("documentation_green=true");

for (const prohibited of [
  "writeFile",
  "appendFile",
  "truncate",
  "rename",
  "unlink",
  "createWriteStream",
  "node:http",
  "node:https",
  ".listen(",
  "createServer",
]) {
  assert.equal(
    integrationText.includes(prohibited),
    false,
    `prohibited integration capability: ${prohibited}`,
  );
}
console.log("no_listener_or_source_write_capability_green=true");
console.log("configuration_written=false");
console.log("daemon_reload_performed=false");
console.log("service_restarted=false");
console.log("deployment_performed=false");
console.log("activation_performed=false");
console.log(PROOF_MARKER);
