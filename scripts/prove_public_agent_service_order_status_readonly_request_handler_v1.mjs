#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  chmod,
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
  canonical,
  materializeOrderStatus,
} from "../tools/void-public-agent-service-order-status-readonly-v1.mjs";
import {
  orderStatusRoutePath,
} from "../tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs";
import {
  MARKER,
  VERSION,
  handleOrderStatusReadonlyRequest,
} from "../tools/void-public-agent-service-order-status-readonly-request-handler-v1.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const toolPath = path.join(
  repoRoot,
  "tools/void-public-agent-service-order-status-readonly-request-handler-v1.mjs",
);
const examplePath = path.join(
  repoRoot,
  "examples/public-agent-service-order-status-readonly-request-handler-v1.example.json",
);
const schemaPath = path.join(
  repoRoot,
  "schemas/public-agent-service-order-status-readonly-request-handler-v1.schema.json",
);

const handledAtUtc = "2030-01-01T00:00:05Z";
const sourceText = `${JSON.stringify(EXAMPLE_SOURCE_V1, null, 2)}\n`;
const routePath = orderStatusRoutePath(EXAMPLE_SOURCE_V1.submission_id);

function allAuthorityFalse(value) {
  return (
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.values(value).length === 15
    && Object.values(value).every((entry) => entry === false)
  );
}

function hash(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function expectReject(label, action, pattern) {
  await assert.rejects(action, pattern, label);
}

const root = await mkdtemp(
  path.join(os.tmpdir(), "void-order-status-request-handler-v1-"),
);

try {
  const sourcePath = path.join(
    root,
    `${EXAMPLE_SOURCE_V1.submission_id}.json`,
  );
  await writeFile(sourcePath, sourceText, { mode: 0o600 });
  await chmod(sourcePath, 0o600);
  const before = await readFile(sourcePath);

  const foundA = await handleOrderStatusReadonlyRequest({
    root,
    method: "GET",
    requestPath: routePath,
    handledAtUtc,
  });
  const foundB = await handleOrderStatusReadonlyRequest({
    root,
    method: "GET",
    requestPath: routePath,
    handledAtUtc,
  });

  assert.equal(foundA.marker, MARKER);
  assert.equal(foundA.version, VERSION);
  assert.match(foundA.handler_id, /^voidaosh1_[0-9a-f]{64}$/);
  assert.equal(foundA.handled_at_utc, handledAtUtc);
  assert.deepEqual(foundA.request, {
    method: "GET",
    path: routePath,
    submission_id: EXAMPLE_SOURCE_V1.submission_id,
  });
  assert.equal(foundA.resolution.found, true);
  assert.equal(foundA.resolution.reason, null);
  assert.equal(foundA.response.http.status_code, 200);
  assert.equal(foundA.response.found, true);
  assert.deepEqual(
    foundA.response.order_status,
    materializeOrderStatus(EXAMPLE_SOURCE_V1),
  );
  assert.equal(
    foundA.response.observed_at_utc,
    EXAMPLE_SOURCE_V1.observed_at_utc,
  );
  assert.equal(allAuthorityFalse(foundA.authority), true);
  assert.equal(canonical(foundA), canonical(foundB));
  assert.equal(canonical(foundA).includes(root), false);

  const example = JSON.parse(await readFile(examplePath, "utf8"));
  assert.deepEqual(example, foundA);
  console.log("example_exact_green=true");
  console.log("found_handler_composition_green=true");
  console.log("deterministic_found_handler_green=true");

  const missingId = "voidawsr1_missing_order_status_0001";
  const missingPath = orderStatusRoutePath(missingId);
  const missingA = await handleOrderStatusReadonlyRequest({
    root,
    method: "GET",
    requestPath: missingPath,
    handledAtUtc,
  });
  const missingB = await handleOrderStatusReadonlyRequest({
    root,
    method: "GET",
    requestPath: missingPath,
    handledAtUtc,
  });
  assert.equal(missingA.resolution.found, false);
  assert.equal(
    missingA.resolution.reason,
    "order_status_source_not_found",
  );
  assert.equal(missingA.response.http.status_code, 404);
  assert.equal(missingA.response.found, false);
  assert.equal(missingA.response.order_status, null);
  assert.equal(missingA.response.error.code, "order_status_not_found");
  assert.equal(missingA.response.observed_at_utc, handledAtUtc);
  assert.equal(canonical(missingA), canonical(missingB));
  console.log("deterministic_not_found_handler_green=true");

  await expectReject(
    "non-GET method",
    () => handleOrderStatusReadonlyRequest({
      root,
      method: "POST",
      requestPath: routePath,
      handledAtUtc,
    }),
    /method_not_allowed/,
  );
  for (const invalidPath of [
    `${routePath}?x=1`,
    `${routePath}#fragment`,
    `${routePath}/`,
    routePath.replace(EXAMPLE_SOURCE_V1.submission_id, "%2e%2e"),
    "/public-agent/services/v1/orders/colon:id/status.json",
  ]) {
    await expectReject(
      `invalid path ${invalidPath}`,
      () => handleOrderStatusReadonlyRequest({
        root,
        method: "GET",
        requestPath: invalidPath,
        handledAtUtc,
      }),
      /query and fragment are forbidden|percent encoding is forbidden|path does not match|invalid_submission_id/,
    );
  }
  await expectReject(
    "invalid handled time",
    () => handleOrderStatusReadonlyRequest({
      root,
      method: "GET",
      requestPath: routePath,
      handledAtUtc: "not-a-time",
    }),
    /invalid_handled_at_utc/,
  );
  console.log("strict_request_refusal_green=true");

  const unsafeId = "voidawsr1_unsafe_order_status_0001";
  const unsafeTarget = path.join(root, `${unsafeId}-target.json`);
  const unsafePath = path.join(root, `${unsafeId}.json`);
  await writeFile(
    unsafeTarget,
    `${JSON.stringify({ ...EXAMPLE_SOURCE_V1, submission_id: unsafeId }, null, 2)}\n`,
  );
  await symlink(unsafeTarget, unsafePath);
  await expectReject(
    "symlink source",
    () => handleOrderStatusReadonlyRequest({
      root,
      method: "GET",
      requestPath: orderStatusRoutePath(unsafeId),
      handledAtUtc,
    }),
    /source_symlink_refused/,
  );

  const hardId = "voidawsr1_hardlink_order_status_0001";
  const hardTarget = path.join(root, `${hardId}-target.json`);
  const hardPath = path.join(root, `${hardId}.json`);
  await writeFile(
    hardTarget,
    `${JSON.stringify({ ...EXAMPLE_SOURCE_V1, submission_id: hardId }, null, 2)}\n`,
  );
  await link(hardTarget, hardPath);
  await expectReject(
    "hard-link source",
    () => handleOrderStatusReadonlyRequest({
      root,
      method: "GET",
      requestPath: orderStatusRoutePath(hardId),
      handledAtUtc,
    }),
    /source_hardlink_refused/,
  );
  console.log("unsafe_source_refusal_green=true");

  const cli = spawnSync(
    process.execPath,
    [
      toolPath,
      "handle",
      "--root",
      root,
      "--method",
      "GET",
      "--path",
      routePath,
      "--handled-at",
      handledAtUtc,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), foundA);
  console.log("cli_handle_green=true");

  const after = await readFile(sourcePath);
  assert.equal(hash(after), hash(before));
  console.log("source_bytes_unchanged_green=true");

  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  assert.equal(schema.properties.marker.const, MARKER);
  assert.equal(schema.properties.version.const, VERSION);
  assert.equal(
    schema.properties.authority.properties.network_listener.const,
    false,
  );
  assert.equal(
    schema.properties.resolution.properties.source_size_bytes.maximum,
    1048576,
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
      `prohibited handler capability: ${prohibited}`,
    );
  }
  console.log("pure_handler_capability_surface_green=true");
  console.log("all_authority_false_green=true");
  console.log("http_route_registered=false");
  console.log("server_mount_modified=false");
  console.log("network_listener_created=false");
  console.log("source_write=false");
  console.log(
    "VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_REQUEST_HANDLER_V1_PROOF_GREEN=true",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
