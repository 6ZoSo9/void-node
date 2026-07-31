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

import {
  EXAMPLE_SOURCE_V1,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";
import {
  orderStatusRoutePath,
} from "../tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";
import {
  DEFAULT_MAX_BYTES,
} from "../tools/void-public-agent-service-order-status-readonly-source-resolver-v1.mjs";
import {
  ENABLE_ENV,
  MARKER,
  MAX_BYTES_ENV,
  SOURCE_ROOT_ENV,
  VERSION,
  describeOrderStatusReadonlyHttpIntegrationV1,
  executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1,
} from "../tools/void-public-agent-service-order-status-readonly-http-integration-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const indexPath = path.join(repoRoot, "src", "index.ts");
const integrationPath = path.join(
  repoRoot,
  "tools",
  "void-public-agent-service-order-status-readonly-http-integration-v1.mjs",
);
const examplePath = path.join(
  repoRoot,
  "examples",
  "public-agent-service-order-status-readonly-http-integration-v1.example.json",
);

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function expectReject(label, operation, pattern) {
  await assert.rejects(operation, pattern, label);
}

function fakeApp({ throwOnGet = false } = {}) {
  const routes = [];
  return {
    routes,
    get(routePath, handler) {
      if (throwOnGet) {
        throw new Error("fake_registration_failure");
      }
      routes.push({ routePath, handler });
    },
  };
}

function fakeResponse() {
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

const disabled = describeOrderStatusReadonlyHttpIntegrationV1();
const example = JSON.parse(await readFile(examplePath, "utf8"));
assert.deepEqual(example, disabled);
assert.equal(disabled.marker, MARKER);
assert.equal(disabled.version, VERSION);
assert.equal(disabled.enabled, false);
assert.equal(disabled.mounted, false);
assert.equal(disabled.authority.live_http_route_registration, false);
console.log("example_exact_green=true");

let disabledAppProviderCalls = 0;
const disabledResult =
  executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: {},
    appProvider: () => {
      disabledAppProviderCalls += 1;
      throw new Error("disabled_app_provider_must_not_run");
    },
    handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
  });
assert.deepEqual(disabledResult, disabled);
assert.equal(disabledAppProviderCalls, 0);
console.log("disabled_by_default_green=true");

await expectReject(
  "invalid enable flag",
  async () => executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: { [ENABLE_ENV]: "true" },
    appProvider: () => fakeApp(),
    handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
  }),
  /invalid_enable_flag/,
);
await expectReject(
  "missing source root",
  async () => executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: { [ENABLE_ENV]: "1" },
    appProvider: () => fakeApp(),
    handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
  }),
  /source_root_required/,
);
await expectReject(
  "relative source root",
  async () => executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: {
      [ENABLE_ENV]: "1",
      [SOURCE_ROOT_ENV]: "relative/path",
    },
    appProvider: () => fakeApp(),
    handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
  }),
  /source_root_must_be_absolute/,
);
await expectReject(
  "invalid max bytes",
  async () => executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
    env: {
      [ENABLE_ENV]: "1",
      [SOURCE_ROOT_ENV]: path.resolve("/tmp"),
      [MAX_BYTES_ENV]: String(DEFAULT_MAX_BYTES + 1),
    },
    appProvider: () => fakeApp(),
    handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
  }),
  /invalid_max_bytes/,
);
console.log("configuration_refusal_green=true");

const root = await mkdtemp(
  path.join(os.tmpdir(), "void-order-status-http-integration-v1-"),
);
try {
  const submissionId = EXAMPLE_SOURCE_V1.submission_id;
  const sourcePath = path.join(root, `${submissionId}.json`);
  const sourceBytes = Buffer.from(
    `${JSON.stringify(EXAMPLE_SOURCE_V1, null, 2)}
`,
  );
  await writeFile(sourcePath, sourceBytes);
  const beforeHash = hash(await readFile(sourcePath));

  const failingApp = fakeApp({ throwOnGet: true });
  await expectReject(
    "registration failure",
    async () => executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
      env: {
        [ENABLE_ENV]: "1",
        [SOURCE_ROOT_ENV]: root,
      },
      appProvider: () => failingApp,
      handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
    }),
    /fake_registration_failure/,
  );
  failingApp.get = function(routePath, handler) {
    this.routes.push({ routePath, handler });
  };
  const retryResult =
    executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
      env: {
        [ENABLE_ENV]: "1",
        [SOURCE_ROOT_ENV]: root,
      },
      appProvider: () => failingApp,
      handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
    });
  assert.equal(retryResult.mounted, true);
  assert.equal(failingApp.routes.length, 1);
  console.log("registration_failure_rollback_green=true");

  const app = fakeApp();
  let clockCalls = 0;
  const mounted =
    executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
      env: {
        [ENABLE_ENV]: "1",
        [SOURCE_ROOT_ENV]: root,
        [MAX_BYTES_ENV]: String(DEFAULT_MAX_BYTES),
      },
      appProvider: () => app,
      handledAtUtcForRequest: () => {
        clockCalls += 1;
        return "2026-07-31T00:00:00.000Z";
      },
    });

  assert.equal(mounted.enabled, true);
  assert.equal(mounted.mounted, true);
  assert.equal(mounted.authority.live_http_route_registration, true);
  assert.equal(mounted.authority.server_mount, true);
  assert.equal(mounted.authority.network_listener, false);
  assert.equal(app.routes.length, 1);
  console.log("exact_one_fake_get_registration_green=true");

  await expectReject(
    "duplicate mount",
    async () => executeOrderStatusReadonlyHttpIntegrationFromEnvironmentV1({
      env: {
        [ENABLE_ENV]: "1",
        [SOURCE_ROOT_ENV]: root,
      },
      appProvider: () => app,
      handledAtUtcForRequest: () => "2026-07-31T00:00:00.000Z",
    }),
    /http_integration_already_mounted/,
  );
  assert.equal(app.routes.length, 1);
  console.log("duplicate_mount_refusal_green=true");

  const route = app.routes[0];
  const foundResponse = fakeResponse();
  await route.handler(
    {
      method: "GET",
      originalUrl: orderStatusRoutePath(submissionId),
    },
    foundResponse,
  );
  assert.equal(foundResponse.statusCode, 200);
  assert.equal(foundResponse.completions, 1);
  assert.equal(foundResponse.headers["cache-control"], "no-store");
  assert.equal(foundResponse.body.found, true);
  console.log("deterministic_found_http_green=true");

  const missingId = "voidaos1_missing_http_integration_0001";
  const missingResponse = fakeResponse();
  await route.handler(
    {
      method: "GET",
      originalUrl: orderStatusRoutePath(missingId),
    },
    missingResponse,
  );
  assert.equal(missingResponse.statusCode, 404);
  assert.equal(missingResponse.completions, 1);
  assert.equal(missingResponse.body.found, false);
  console.log("deterministic_not_found_http_green=true");

  const invalidResponse = fakeResponse();
  await route.handler(
    {
      method: "GET",
      originalUrl: `${orderStatusRoutePath(submissionId)}?unexpected=1`,
    },
    invalidResponse,
  );
  assert.equal(invalidResponse.statusCode, 500);
  assert.equal(invalidResponse.completions, 1);
  assert.equal(invalidResponse.body.error, "order_status_unavailable");
  assert.equal(
    Object.values(invalidResponse.body.authority).every(
      (value) => value === false,
    ),
    true,
  );
  console.log("sanitized_error_http_green=true");

  await expectReject(
    "response reuse",
    async () => route.handler(
      {
        method: "GET",
        originalUrl: orderStatusRoutePath(submissionId),
      },
      foundResponse,
    ),
    /http_response_already_completed/,
  );
  console.log("single_response_completion_green=true");

  assert.equal(clockCalls, 4);
  const afterHash = hash(await readFile(sourcePath));
  assert.equal(afterHash, beforeHash);
  console.log("source_bytes_unchanged_green=true");
} finally {
  await rm(root, { recursive: true, force: true });
}

const indexText = await readFile(indexPath, "utf8");
for (const marker of [
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_IMPORT",
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_BEGIN",
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_END",
]) {
  assert.equal(indexText.split(marker).length - 1, 1, marker);
}
const acceptanceEnd = indexText.indexOf(
  "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_CALLSITE_INTEGRATION_V1_END",
);
const integrationBegin = indexText.indexOf(
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_BEGIN",
);
const earlyBoot = indexText.indexOf("EARLY MINIMAL BOOT MODE");
assert.ok(acceptanceEnd >= 0);
assert.ok(integrationBegin > acceptanceEnd);
assert.ok(earlyBoot < 0 || integrationBegin < earlyBoot);
assert.equal(indexText.includes(`${ENABLE_ENV}=`), false);
console.log("index_callsite_integration_green=true");

const integrationText = await readFile(integrationPath, "utf8");
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
console.log("live_http_registration_during_proof_only=true");
console.log("configuration_written=false");
console.log("service_restarted=false");
console.log("deployment_performed=false");
console.log(
  "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_PROOF_GREEN=true",
);
