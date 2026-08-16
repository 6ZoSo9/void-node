#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";

const MAX_RESPONSE_BYTES = 64 * 1024;
const TIMEOUT_MS = 1_000;
const SETTLE_LIMIT_MS = 3_000;
const DEFERRED_TEARDOWN_MS = 120;
const MARKER = "VOID_PUBLIC_EARN_COORDINATOR_RESPONSE_BOUNDS_V1_GREEN";

const upstreamSockets = new Set();
let mode = "valid";

function json(res, status, value) {
  const body = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
  });
  res.end(body);
}

const upstream = http.createServer((req, res) => {
  if (req.url !== "/health") {
    json(res, 404, { ok: false, error: "fixture_not_found" });
    return;
  }

  if (mode === "valid") {
    json(res, 200, {
      ok: true,
      nodeId: "0123456789abcdef0123456789abcdef",
      fixture: "bounded-response-v1",
    });
    return;
  }

  if (mode === "declared") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(MAX_RESPONSE_BYTES + 1),
    });
    res.flushHeaders();
    return;
  }

  if (mode === "streamed") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "transfer-encoding": "chunked",
    });
    res.end(Buffer.alloc(MAX_RESPONSE_BYTES + 1, 0x20));
    return;
  }

  if (mode === "stalled") {
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "transfer-encoding": "chunked",
    });
    res.write("{");
    return;
  }

  json(res, 500, { ok: false, error: "fixture_mode_invalid" });
});
upstream.on("connection", (socket) => {
  upstreamSockets.add(socket);
  socket.on("close", () => upstreamSockets.delete(socket));
});

await new Promise((resolve, reject) => {
  upstream.once("error", reject);
  upstream.listen(0, "127.0.0.1", resolve);
});
const upstreamAddress = upstream.address();
assert(upstreamAddress && typeof upstreamAddress === "object");

process.env.VOID_EARN_PRIVATE_COORDINATOR_UPSTREAM =
  `http://127.0.0.1:${upstreamAddress.port}`;
process.env.VOID_PUBLIC_EARN_COMPOSITION_TIMEOUT_MS = String(TIMEOUT_MS);
process.env.VOID_PUBLIC_EARN_COMPOSITION_MAX_RESPONSE_BYTES =
  String(MAX_RESPONSE_BYTES);
process.env.VOID_PUBLIC_EARN_COMPOSITION_HOST = "127.0.0.1";

const nativeFetch = globalThis.fetch;
const { createCompositionServer } = await import(
  "../ops/public/public-earn-coordinator-composition-v1.mjs"
);
const composition = createCompositionServer();
await new Promise((resolve, reject) => {
  composition.once("error", reject);
  composition.listen(0, "127.0.0.1", resolve);
});
const compositionAddress = composition.address();
assert(compositionAddress && typeof compositionAddress === "object");
const base = `http://127.0.0.1:${compositionAddress.port}`;

async function requestHealth(expectedStatus) {
  const started = Date.now();
  const response = await nativeFetch(`${base}/health`, {
    method: "GET",
    redirect: "manual",
  });
  const text = await response.text();
  const elapsed = Date.now() - started;
  assert.equal(response.status, expectedStatus, text);
  return { elapsed, text, json: JSON.parse(text) };
}

async function withSyntheticUpstream(fetchImpl, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = previous;
  }
}

function deferredCleanup(onSettled) {
  return new Promise((resolve) => {
    setTimeout(() => {
      onSettled();
      resolve();
    }, DEFERRED_TEARDOWN_MS);
  });
}

function responseLike({
  status = 200,
  headers = {},
  body,
}) {
  return {
    status,
    headers: new Headers(headers),
    body,
  };
}

try {
  mode = "valid";
  const valid = await requestHealth(200);
  assert.equal(valid.json.ok, true);
  assert.equal(valid.json.fixture, "bounded-response-v1");

  mode = "declared";
  const declared = await requestHealth(502);
  assert.equal(declared.json.error, "upstream_response_too_large");
  assert(
    declared.elapsed < SETTLE_LIMIT_MS,
    `declared oversize took ${declared.elapsed}ms`,
  );

  mode = "streamed";
  const streamed = await requestHealth(502);
  assert.equal(streamed.json.error, "upstream_response_too_large");
  assert(
    streamed.elapsed < SETTLE_LIMIT_MS,
    `streamed oversize took ${streamed.elapsed}ms`,
  );

  mode = "stalled";
  const stalled = await requestHealth(502);
  assert.equal(stalled.json.error, "private_coordinator_timeout");
  assert(
    stalled.elapsed >= TIMEOUT_MS - 200,
    `stalled response timed out too early at ${stalled.elapsed}ms`,
  );
  assert(
    stalled.elapsed < SETTLE_LIMIT_MS,
    `stalled response exceeded total deadline window: ${stalled.elapsed}ms`,
  );

  let declaredCancelCalls = 0;
  let declaredCancelSettled = false;
  const syntheticDeclared = await withSyntheticUpstream(
    async () => responseLike({
      headers: { "content-length": String(MAX_RESPONSE_BYTES + 1) },
      body: {
        cancel() {
          declaredCancelCalls += 1;
          return deferredCleanup(() => {
            declaredCancelSettled = true;
          });
        },
      },
    }),
    () => requestHealth(502),
  );
  assert.equal(syntheticDeclared.json.error, "upstream_response_too_large");
  assert.equal(declaredCancelCalls, 1);
  assert.equal(
    declaredCancelSettled,
    true,
    "declared-overflow operation released before response teardown settled",
  );

  let redirectCancelCalls = 0;
  let redirectCancelSettled = false;
  const syntheticRedirect = await withSyntheticUpstream(
    async () => responseLike({
      status: 302,
      body: {
        cancel() {
          redirectCancelCalls += 1;
          return deferredCleanup(() => {
            redirectCancelSettled = true;
          });
        },
      },
    }),
    () => requestHealth(502),
  );
  assert.equal(
    syntheticRedirect.json.error,
    "private_coordinator_redirect_forbidden",
  );
  assert.equal(redirectCancelCalls, 1);
  assert.equal(
    redirectCancelSettled,
    true,
    "redirect operation released before response teardown settled",
  );

  let unreadableCancelCalls = 0;
  let unreadableCancelSettled = false;
  const syntheticUnreadable = await withSyntheticUpstream(
    async () => responseLike({
      body: {
        cancel() {
          unreadableCancelCalls += 1;
          return deferredCleanup(() => {
            unreadableCancelSettled = true;
          });
        },
      },
    }),
    () => requestHealth(502),
  );
  assert.equal(
    syntheticUnreadable.json.error,
    "upstream_response_body_unavailable",
  );
  assert.equal(unreadableCancelCalls, 1);
  assert.equal(
    unreadableCancelSettled,
    true,
    "unreadable-body operation released before response teardown settled",
  );

  let readFailureCancelCalls = 0;
  let readFailureCancelSettled = false;
  let readCalls = 0;
  const syntheticReadFailure = await withSyntheticUpstream(
    async () => responseLike({
      headers: { "content-type": "application/json" },
      body: {
        getReader() {
          return {
            async read() {
              readCalls += 1;
              if (readCalls === 1) {
                return {
                  done: false,
                  value: new TextEncoder().encode('{"ok":'),
                };
              }
              throw new Error("synthetic admitted read failure");
            },
            cancel() {
              readFailureCancelCalls += 1;
              return deferredCleanup(() => {
                readFailureCancelSettled = true;
              });
            },
            releaseLock() {},
          };
        },
      },
    }),
    () => requestHealth(502),
  );
  assert.equal(
    syntheticReadFailure.json.error,
    "private_coordinator_unreachable",
  );
  assert.equal(readFailureCancelCalls, 1);
  assert.equal(
    readFailureCancelSettled,
    true,
    "admitted read failure released before reader teardown settled",
  );

  console.log("valid_forwarding=true");
  console.log("declared_oversize_prebuffer_rejected=true");
  console.log("streamed_oversize_prebuffer_rejected=true");
  console.log("deadline_held_through_body=true");
  console.log("declared_rejection_teardown_owned=true");
  console.log("redirect_teardown_owned=true");
  console.log("unreadable_body_teardown_owned=true");
  console.log("admitted_read_failure_teardown_owned=true");
  console.log("wc_mutation_performed=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_performed=false");
  console.log("funds_moved=false");
  console.log(MARKER);
} finally {
  globalThis.fetch = nativeFetch;
  for (const socket of upstreamSockets) socket.destroy();
  await new Promise((resolve) => composition.close(resolve));
  await new Promise((resolve) => upstream.close(resolve));
}
