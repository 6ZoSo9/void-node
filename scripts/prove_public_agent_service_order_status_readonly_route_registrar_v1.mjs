#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  link,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  EXAMPLE_SOURCE_V1,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";
import {
  orderStatusRoutePath,
} from "../tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";
import {
  MARKER,
  ROUTE_METHOD,
  ROUTE_PATH,
  VERSION,
  describeOrderStatusReadonlyRouteRegistrarV1,
  registerOrderStatusReadonlyRouteV1,
} from "../tools/void-public-agent-service-order-status-readonly-route-registrar-v1.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const toolPath = path.join(
  repoRoot,
  "tools",
  "void-public-agent-service-order-status-readonly-route-registrar-v1.mjs",
);
const examplePath = path.join(
  repoRoot,
  "examples",
  "public-agent-service-order-status-readonly-route-registrar-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas",
  "public-agent-service-order-status-readonly-route-registrar-v1.schema.json",
);

function hash(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function expectReject(label, fn, pattern) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `${label}: expected rejection`);
  assert.match(String(caught.message), pattern, label);
}

function fakeRegistrar() {
  const routes = new Map();
  return {
    routes,
    get(routePath, handler) {
      if (routes.has(routePath)) {
        throw new Error("duplicate_fake_route");
      }
      routes.set(routePath, handler);
    },
  };
}

function fakeResponder() {
  const writes = [];
  return {
    writes,
    async write(packet) {
      writes.push(structuredClone(packet));
    },
  };
}

const root = await mkdtemp(
  path.join(os.tmpdir(), "void-order-status-route-registrar-v1-"),
);

try {
  const described = describeOrderStatusReadonlyRouteRegistrarV1();
  const example = JSON.parse(await readFile(examplePath, "utf8"));
  assert.deepEqual(described, example);
  assert.equal(described.marker, MARKER);
  assert.equal(described.version, VERSION);
  assert.equal(described.route.method, ROUTE_METHOD);
  assert.equal(described.route.path, ROUTE_PATH);
  console.log("example_exact_green=true");

  const cli = spawnSync(process.execPath, [toolPath, "describe"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), described);
  console.log("cli_describe_green=true");

  const sourcePath = path.join(
    root,
    `${EXAMPLE_SOURCE_V1.submission_id}.json`,
  );
  await writeFile(
    sourcePath,
    `${JSON.stringify(EXAMPLE_SOURCE_V1, null, 2)}\n`,
  );
  const before = await readFile(sourcePath);

  const handledAtUtc = "2030-01-01T00:00:05Z";
  let clockCalls = 0;
  const registrar = fakeRegistrar();
  const registration = registerOrderStatusReadonlyRouteV1({
    registrar,
    sourceRoot: root,
    handledAtUtcForRequest(request) {
      assert.equal(typeof request.method, "string");
      assert.equal(typeof request.path, "string");
      clockCalls += 1;
      return handledAtUtc;
    },
    maxBytes: 1048576,
  });

  assert.deepEqual(registration, described);
  assert.equal(registrar.routes.size, 1);
  assert.ok(registrar.routes.has(ROUTE_PATH));
  const routeHandler = registrar.routes.get(ROUTE_PATH);
  assert.equal(typeof routeHandler, "function");
  console.log("exact_one_abstract_get_registration_green=true");

  assert.throws(
    () => registerOrderStatusReadonlyRouteV1({
      registrar,
      sourceRoot: root,
      handledAtUtcForRequest() {
        return handledAtUtc;
      },
      maxBytes: 1048576,
    }),
    /route_already_registered/,
  );
  console.log("duplicate_registration_refusal_green=true");

  let failRegistration = true;
  const recoverableRegistrar = {
    routes: new Map(),
    get(routePath, handler) {
      if (failRegistration) {
        throw new Error("forced_registration_failure");
      }
      this.routes.set(routePath, handler);
    },
  };
  assert.throws(
    () => registerOrderStatusReadonlyRouteV1({
      registrar: recoverableRegistrar,
      sourceRoot: root,
      handledAtUtcForRequest() {
        return handledAtUtc;
      },
      maxBytes: 1048576,
    }),
    /forced_registration_failure/,
  );
  failRegistration = false;
  registerOrderStatusReadonlyRouteV1({
    registrar: recoverableRegistrar,
    sourceRoot: root,
    handledAtUtcForRequest() {
      return handledAtUtc;
    },
    maxBytes: 1048576,
  });
  assert.equal(recoverableRegistrar.routes.size, 1);
  console.log("registration_failure_rollback_green=true");

  const foundPath = orderStatusRoutePath(EXAMPLE_SOURCE_V1.submission_id);
  const foundResponderA = fakeResponder();
  const foundReceiptA = await routeHandler(
    { method: "GET", path: foundPath },
    foundResponderA,
  );
  assert.equal(foundResponderA.writes.length, 1);
  assert.equal(foundResponderA.writes[0].status_code, 200);
  assert.equal(
    foundResponderA.writes[0].headers["content-type"],
    "application/json; charset=utf-8",
  );
  assert.equal(foundResponderA.writes[0].headers["cache-control"], "no-store");
  assert.equal(foundResponderA.writes[0].headers.allow, "GET");
  assert.equal(foundResponderA.writes[0].body.found, true);
  assert.equal(foundReceiptA.status_code, 200);
  assert.equal(foundReceiptA.found, true);

  const foundResponderB = fakeResponder();
  const foundReceiptB = await routeHandler(
    { method: "GET", path: foundPath },
    foundResponderB,
  );
  assert.deepEqual(foundResponderA.writes, foundResponderB.writes);
  assert.deepEqual(foundReceiptA, foundReceiptB);
  console.log("deterministic_found_response_write_green=true");

  await expectReject(
    "completed responder reuse",
    () => routeHandler(
      { method: "GET", path: foundPath },
      foundResponderA,
    ),
    /response_already_completed/,
  );
  assert.equal(foundResponderA.writes.length, 1);
  console.log("single_response_completion_green=true");

  const missingId = "voidawsr1_missing_order_status_0001";
  const missingResponder = fakeResponder();
  const missingReceipt = await routeHandler(
    { method: "GET", path: orderStatusRoutePath(missingId) },
    missingResponder,
  );
  assert.equal(missingResponder.writes.length, 1);
  assert.equal(missingResponder.writes[0].status_code, 404);
  assert.equal(missingResponder.writes[0].body.found, false);
  assert.equal(missingReceipt.status_code, 404);
  assert.equal(missingReceipt.found, false);
  console.log("deterministic_not_found_response_write_green=true");

  await expectReject(
    "invalid method",
    () => routeHandler(
      { method: "POST", path: foundPath },
      fakeResponder(),
    ),
    /method_not_allowed/,
  );
  await expectReject(
    "invalid responder",
    () => routeHandler(
      { method: "GET", path: foundPath },
      {},
    ),
    /invalid_responder_interface/,
  );
  console.log("request_and_responder_refusal_green=true");

  const unsafeId = "voidawsr1_unsafe_order_status_0001";
  const unsafeTarget = path.join(root, `${unsafeId}-target.json`);
  const unsafePath = path.join(root, `${unsafeId}.json`);
  await writeFile(
    unsafeTarget,
    `${JSON.stringify(
      { ...EXAMPLE_SOURCE_V1, submission_id: unsafeId },
      null,
      2,
    )}\n`,
  );
  await symlink(unsafeTarget, unsafePath);
  await expectReject(
    "symlink source",
    () => routeHandler(
      { method: "GET", path: orderStatusRoutePath(unsafeId) },
      fakeResponder(),
    ),
    /source_symlink_refused/,
  );

  const hardId = "voidawsr1_hardlink_order_status_0001";
  const hardTarget = path.join(root, `${hardId}-target.json`);
  const hardPath = path.join(root, `${hardId}.json`);
  await writeFile(
    hardTarget,
    `${JSON.stringify(
      { ...EXAMPLE_SOURCE_V1, submission_id: hardId },
      null,
      2,
    )}\n`,
  );
  await link(hardTarget, hardPath);
  await expectReject(
    "hard-link source",
    () => routeHandler(
      { method: "GET", path: orderStatusRoutePath(hardId) },
      fakeResponder(),
    ),
    /source_hardlink_refused/,
  );
  console.log("unsafe_source_refusal_green=true");

  const after = await readFile(sourcePath);
  assert.equal(hash(after), hash(before));
  assert.equal(clockCalls, 6);
  console.log("source_bytes_unchanged_green=true");

  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  assert.equal(schema.properties.marker.const, MARKER);
  assert.equal(schema.properties.version.const, VERSION);
  assert.equal(
    schema.properties.route.properties.path.const,
    ROUTE_PATH,
  );
  assert.equal(
    schema.properties.authority.properties.abstract_route_registration.const,
    true,
  );
  assert.equal(
    schema.properties.authority.properties.live_http_route_registration.const,
    false,
  );
  console.log("schema_contract_green=true");

  const toolText = await readFile(toolPath, "utf8");
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
    "express(",
    "fastify(",
    "Date.now",
    "new Date(",
  ]) {
    assert.equal(
      toolText.includes(prohibited),
      false,
      `prohibited registrar capability: ${prohibited}`,
    );
  }
  console.log("isolated_registrar_capability_surface_green=true");
  console.log("all_live_authority_false_green=true");
  console.log("abstract_route_registration_during_proof_only=true");
  console.log("live_http_route_registered=false");
  console.log("server_mount_modified=false");
  console.log("network_listener_created=false");
  console.log("source_write=false");
  console.log(
    "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_REGISTRAR_V1_PROOF_GREEN=true",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
