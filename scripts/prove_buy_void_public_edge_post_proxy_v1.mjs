#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const gatewayPath = path.join(
  repo,
  "ops/public/void-public-app-composition-gateway-v1.mjs",
);
const source = await readFile(
  gatewayPath,
  "utf8",
);

assert.match(
  source,
  /VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1/,
);
assert.match(
  source,
  /pathname\s*===\s*["']\/__void\/buy-void\/request["']/,
);
assert.match(
  source,
  /toUpperCase\(\)\s*===\s*["']POST["']/,
);
assert.match(
  source,
  /VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_BODY_BYTES\s*=\s*65536/,
);
assert.match(
  source,
  /x-void-public-buy-void-post-proxy/,
);
assert.ok(source.includes(
  "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_RESPONSE_BYTES = 131072"));
assert.ok(source.includes(
  "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_UPSTREAM_TIMEOUT_MS = 8000"));
const postHandlerSource = source.slice(
  source.indexOf("async function voidBuyVoidPublicEdgePostProxyV1("),
  source.indexOf("\n}\n", source.indexOf(
    "async function voidBuyVoidPublicEdgePostProxyV1(")),
);
assert.doesNotMatch(postHandlerSource,
  /await upstreamResponse\.arrayBuffer\(\)/u);
assert.match(postHandlerSource, /AbortSignal\.timeout/u);
assert.match(postHandlerSource, /reader\.read\(\)/u);
assert.match(postHandlerSource, /clearTimeout\(deadlineTimer\)/u);
assert.doesNotMatch(postHandlerSource, /deadlineExpired/u);

// Execute the *actual source handler* in a disposable no-network harness.
// Count deadline timer allocations/releases across thousands of one-byte
// completed reads. A single never-settling shared Promise would register
// unbounded losing reactions; this test requires a per-operation timer that
// is detached at every fulfilled fetch/read, not just a matching code string.
{
  const handlerStart = source.indexOf(
    "async function voidBuyVoidPublicEdgePostProxyV1(",
  );
  const handlerClose = source.indexOf("\n}\n", handlerStart);
  const definitionsStart = source.indexOf(
    "const VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_MAX_BODY_BYTES =",
  );
  assert.ok(definitionsStart > 0 && handlerStart > definitionsStart);
  assert.ok(handlerClose > handlerStart);
  const actualHandlerSource = source.slice(definitionsStart, handlerClose + 2);
  let createdTimers = 0;
  let clearedTimers = 0;
  let peakTimers = 0;
  const outstandingTimers = new Set();
  const scopedSetTimeout = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    createdTimers += 1;
    outstandingTimers.add(timer);
    peakTimers = Math.max(peakTimers, outstandingTimers.size);
    return timer;
  };
  const scopedClearTimeout = (timer) => {
    if (outstandingTimers.delete(timer)) clearedTimers += 1;
    clearTimeout(timer);
  };
  const literal = Buffer.from("{" + " ".repeat(4096) + "}", "utf8");
  let readCalls = 0;
  let fetchCalls = 0;
  // The timing fixture is an arbitrary object response, NOT a
  // checkout-creation receipt; use 200 so the strict 201 schema guard is
  // tested only by the separate canonical-201 acceptance/rejection cases.
  const scopedFetch = async () => {
    fetchCalls += 1;
    return {
      status: 200,
      headers: new Headers({
        "content-type": "application/json; charset=utf-8",
      }),
      body: {
        getReader() {
          return {
            async read() {
              const position = readCalls++;
              if (position >= literal.length) return { done: true };
              return { done: false, value: literal.subarray(position, position + 1) };
            },
            releaseLock() {},
            cancel() { return Promise.resolve(); },
          };
        },
      },
    };
  };
  // A separate callable copies *only* the current handler and adjacent
  // production response ceilings. It cannot bind a real socket or key.
  const evalHandler = new Function(
    "fetch", "setTimeout", "clearTimeout", "process",
    actualHandlerSource +
      "\nreturn voidBuyVoidPublicEdgePostProxyV1;",
  );
  const handle = evalHandler(
    scopedFetch, scopedSetTimeout, scopedClearTimeout,
    { env: { VOID_NODE_UPSTREAM: "http://127.0.0.1:4100" } },
  );
  const syntheticReq = {
    headers: { "content-type": "application/json" },
    async *[Symbol.asyncIterator]() { yield Buffer.from("{}", "utf8"); },
  };
  let output = null;
  const syntheticRes = {
    statusCode: 0,
    writableEnded: false,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(bytes) { output = Buffer.from(bytes); this.writableEnded = true; },
  };
  await handle(syntheticReq, syntheticRes);
  assert.equal(fetchCalls, 1);
  assert.equal(syntheticRes.statusCode, 200,
    "tiny-stream timing fixture is not a canonical 201 checkout receipt");
  assert.deepEqual(output, literal, "one-byte stream must preserve raw JSON");
  assert.equal(readCalls, literal.length + 1, "exercise all 4,098 tiny reads");
  assert.ok(createdTimers >= readCalls + 1,
    "every tiny read must have an independently detachable deadline timer");
  assert.equal(clearedTimers, createdTimers,
    "all settled operations must detach their deadline timer");
  assert.equal(outstandingTimers.size, 0);
  assert.ok(peakTimers <= 1, "no accumulating pending per-read deadlines");

  // A completed upstream response must not claim HTTP 201 if releasing
  // its owned reader is uncertain. Exercise the same actual handler with
  // a synthetic reader whose final releaseLock throws.
  let readCount = 0;
  const uncertainHandle = evalHandler(
    async () => ({
      status: 201,
      headers: new Headers({ "content-type": "application/json" }),
      body: {
        getReader() {
          return {
            async read() {
              readCount += 1;
              return readCount === 1
                ? { done: false, value: Buffer.from("{}", "utf8") }
                : { done: true };
            },
            releaseLock() { throw new Error("synthetic_reader_release_failure"); },
            cancel() { return Promise.resolve(); },
          };
        },
      },
    }),
    scopedSetTimeout, scopedClearTimeout,
    { env: { VOID_NODE_UPSTREAM: "http://127.0.0.1:4100" } },
  );
  let uncertainOutput = null;
  const uncertainRes = {
    statusCode: 0,
    writableEnded: false,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(bytes) { uncertainOutput = Buffer.from(bytes); this.writableEnded = true; },
  };
  await uncertainHandle(syntheticReq, uncertainRes);
  assert.equal(uncertainRes.statusCode, 502);
  assert.deepEqual(JSON.parse(uncertainOutput.toString("utf8")), {
    ok: false, error: "buy_void_request_upstream_unavailable",
  });
  assert.equal(uncertainRes.headers["cache-control"], "no-store");
  assert.equal(outstandingTimers.size, 0);
}

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.equal(
    typeof address,
    "object",
  );
  const port = address.port;
  await new Promise(
    (resolve, reject) => {
      server.close(
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    },
  );
  return port;
}

const upstreamPort = await freePort();
const gatewayPort = await freePort();

const upstreamCalls = [];
let headerRejectedSocketClosed = false;
// Match the *actual* node's 201 creation envelope, not an invented marker.
// Deliberately reverse field ordering and retain whitespace to catch any
// edge that parses and reserializes a successful buyer receipt.
const exactAccepted201Receipt = {
  request: {
    persisted: { ok: true },
    status: "awaiting_payment_tx_hash",
    request_id: "buyvoid_edge_201_aaaaaaaa",
    ok: true,
    marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
    schema: "void_public_buy_void_checkout_request_v1",
  },
  one_active_request_cap_enforced: true,
  idempotent: false,
  ok: true,
  marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
  schema: "void_public_buy_void_checkout_request_result_v1",
};
const exactAccepted201Json = JSON.stringify(exactAccepted201Receipt,null,3)+"\n";

const upstream = http.createServer(
  async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(
        Buffer.from(chunk),
      );
    }

    const body = Buffer.concat(
      chunks,
    ).toString("utf8");

    upstreamCalls.push({
      method: req.method,
      url: req.url,
      body,
      contentType:
        req.headers["content-type"] || "",
    });

    if (
      req.method === "GET"
      && req.url
        === "/__void/buy-void/config.json"
    ) {
      const payload = JSON.stringify({
        ok: true,
        marker:
          "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
        automatic_fulfillment: false,
      });
      res.writeHead(
        200,
        {
          "content-type":
            "application/json; charset=utf-8",
          "content-length":
            Buffer.byteLength(payload),
        },
      );
      res.end(payload);
      return;
    }

    if (
      req.method === "POST"
      && req.url
        === "/__void/buy-void/request"
    ) {
      let proofCase = "";
      try {
        proofCase = JSON.parse(body)?.__edge_proof_case || "";
      } catch {
        // A malformed *synthetic test* request is not an authorized proof
        // case. Route it to the inert baseline fixture; never claim receipt
        // success on the basis of test-only input parsing.
        proofCase = "";
      }
      if (proofCase === "valid_201") {
        res.writeHead(201, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public,max-age=60",
          "content-length": String(Buffer.byteLength(exactAccepted201Json)),
        });
        res.end(exactAccepted201Json);
        return;
      }
      if (proofCase === "empty_object_201" ||
          proofCase === "false_ok_201" ||
          proofCase === "wrong_marker_201" ||
          proofCase === "idempotent_201" ||
          proofCase === "missing_request_201" ||
          proofCase === "wrong_request_status_201" ||
          proofCase === "private_path_201" ||
          proofCase === "wrong_outer_schema_201" ||
          proofCase === "missing_outer_schema_201" ||
          proofCase === "wrong_inner_schema_201" ||
          proofCase === "missing_inner_schema_201" ||
          proofCase === "missing_persisted_201" ||
          proofCase === "false_persisted_ok_201" ||
          proofCase === "nonobject_persisted_201" ||
          proofCase === "missing_request_id_201" ||
          proofCase === "false_request_ok_201" ||
          proofCase === "wrong_inner_marker_201") {
        const mutated = { ...exactAccepted201Receipt };
        if (proofCase === "false_ok_201") mutated.ok = false;
        if (proofCase === "wrong_marker_201") mutated.marker = "UNRELATED_MARKER";
        if (proofCase === "idempotent_201") mutated.idempotent = true;
        if (proofCase === "wrong_outer_schema_201") mutated.schema = "unrelated";
        if (proofCase === "missing_outer_schema_201") delete mutated.schema;
        if (proofCase === "missing_request_201") delete mutated.request;
        if (proofCase === "wrong_inner_schema_201") {
          mutated.request = { ...mutated.request, schema: "unrelated" };
        }
        if (proofCase === "missing_inner_schema_201") {
          mutated.request = { ...mutated.request };
          delete mutated.request.schema;
        }
        if (proofCase === "missing_persisted_201") {
          mutated.request = { ...mutated.request };
          delete mutated.request.persisted;
        }
        if (proofCase === "false_persisted_ok_201") {
          mutated.request = { ...mutated.request, persisted: { ok: false } };
        }
        if (proofCase === "nonobject_persisted_201") {
          mutated.request = { ...mutated.request, persisted: true };
        }
        if (proofCase === "missing_request_id_201") {
          mutated.request = { ...mutated.request };
          delete mutated.request.request_id;
        }
        if (proofCase === "false_request_ok_201") {
          mutated.request = { ...mutated.request, ok: false };
        }
        if (proofCase === "wrong_inner_marker_201") {
          mutated.request = { ...mutated.request, marker: "UNRELATED_MARKER" };
        }
        if (proofCase === "wrong_request_status_201") {
          mutated.request = { ...mutated.request, status: "fulfilled" };
        }
        if (proofCase === "private_path_201") {
          mutated.request = { ...mutated.request, persisted: {
            ok: true,
            file: "/var/lib/void/SENTINEL_PRIVATE_BUY_REQUEST_DIR/request.json",
          } };
        }
        const body = proofCase === "empty_object_201"
          ? "{}" : JSON.stringify(mutated);
        res.writeHead(201, { "content-type": "application/json" });
        res.end(body);
        return;
      }
      if (proofCase === "malformed_json_201") {
        res.writeHead(201, { "content-type": "application/json" });
        res.end('{"ok":');
        return;
      }
      if (proofCase === "primitive_201") {
        res.writeHead(201, { "content-type": "application/json" });
        // Truthy valid JSON primitive specifically falsifies removal of
        // the typeof === object gate; null alone is too weak a negative.
        res.end("true");
        return;
      }
      if (proofCase === "array_201") {
        res.writeHead(201, { "content-type": "application/json" });
        res.end("[1,2]");
        return;
      }
      if (proofCase === "header_nonjson_pending") {
        res.once("close", () => { headerRejectedSocketClosed = true; });
        res.writeHead(200, { "content-type": "text/html" });
        res.write("<html>still-open");
        return;
      }
      if (proofCase === "invalid_utf8_201") {
        res.writeHead(201, { "content-type": "application/json" });
        res.end(Buffer.from([0xc3,0x28]));
        return;
      }
      if (proofCase === "declared_oversize") {
        res.writeHead(400, {
          "content-type": "application/json",
          "content-length": "131073",
        });
        res.end();
        return;
      }
      if (proofCase === "chunked_oversize") {
        res.writeHead(400, {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        });
        res.end("x".repeat(131073));
        return;
      }
      if (proofCase === "non_json") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html>Not a checkout receipt</html>");
        return;
      }
      if (proofCase === "redirect") {
        res.writeHead(302, {
          "content-type": "application/json",
          location: "/__void/buy-void/request",
        });
        res.end("{}");
        return;
      }
      if (proofCase === "hanging_reply") {
        res.writeHead(200, { "content-type": "application/json" });
        res.write('{"ok":');
        return;
      }
      if (proofCase === "max_size_valid") {
        const prefix = '{"ok":false,"padding":"';
        const suffix = '"}';
        const payload = prefix +
          "a".repeat(131072 - Buffer.byteLength(prefix) - Buffer.byteLength(suffix)) +
          suffix;
        assert.equal(Buffer.byteLength(payload), 131072);
        res.writeHead(400, { "content-type": "application/json" });
        res.end(payload);
        return;
      }
      const payload = JSON.stringify({
        ok: false,
        marker:
          "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF",
        error:
          "isolated_upstream_validation_response",
      });
      res.writeHead(
        400,
        {
          "content-type":
            "application/json; charset=utf-8",
          "cache-control":
            "no-store",
          "x-content-type-options":
            "nosniff",
          "content-length":
            Buffer.byteLength(payload),
        },
      );
      res.end(payload);
      return;
    }

    const payload = JSON.stringify({
      ok: false,
      error: "not_found",
    });
    res.writeHead(
      404,
      {
        "content-type":
          "application/json; charset=utf-8",
        "content-length":
          Buffer.byteLength(payload),
      },
    );
    res.end(payload);
  },
);

upstream.listen(
  upstreamPort,
  "127.0.0.1",
);
await once(
  upstream,
  "listening",
);

const gatewayLogs = [];

const child = spawn(
  process.execPath,
  [gatewayPath],
  {
    cwd: repo,
    env: {
      ...process.env,
      VOID_COMPOSITION_PORT:
        String(gatewayPort),
      VOID_NODE_UPSTREAM:
        `http://127.0.0.1:${upstreamPort}`,
    },
    stdio: [
      "ignore",
      "pipe",
      "pipe",
    ],
  },
);

child.stdout.on(
  "data",
  (chunk) => {
    gatewayLogs.push(
      chunk.toString("utf8"),
    );
  },
);
child.stderr.on(
  "data",
  (chunk) => {
    gatewayLogs.push(
      chunk.toString("utf8"),
    );
  },
);

async function waitForListenerReady() {
  let lastError = null;

  for (
    let attempt = 0;
    attempt < 80;
    attempt += 1
  ) {
    if (child.exitCode !== null) {
      throw new Error(
        "composition gateway exited before proof: "
        + gatewayLogs.join(""),
      );
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${gatewayPort}/__void/buy-void/config.json`,
        {
          redirect: "manual",
        },
      );

      // Any HTTP response proves the temporary gateway listener is ready.
      // The fake upstream intentionally does not model the gateway's full
      // GET-composition dependency graph; the proof below is scoped to the
      // exact allowlisted POST route.
      await response.arrayBuffer();
      return response.status;
    } catch (error) {
      lastError = error;
    }

    await new Promise(
      (resolve) => setTimeout(
        resolve,
        100,
      ),
    );
  }

  throw lastError
    || new Error(
      "composition gateway listener did not become ready",
    );
}

try {
  const listenerReadinessStatus =
    await waitForListenerReady();

  assert.ok(
    Number.isInteger(listenerReadinessStatus),
  );
  assert.ok(
    listenerReadinessStatus >= 100
      && listenerReadinessStatus <= 599,
  );

  upstreamCalls.length = 0;

  const requestBody = JSON.stringify({
    requested_amount_usdc: "1",
    void_destination_address:
      "0xfa5637378b986bd368eb5c73a4c0be3b6c934e2d",
    source_chain: "base",
    ack_self_custody: true,
    ack_base_native_usdc: true,
    ack_request_before_payment: true,
    ack_sender_equals_void_destination: true,
    ack_no_automatic_fulfillment: true,
  });

  const postResponse = await fetch(
    `http://127.0.0.1:${gatewayPort}/__void/buy-void/request`,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
      },
      body: requestBody,
      redirect: "manual",
    },
  );

  assert.equal(
    postResponse.status,
    400,
  );
  assert.equal(
    postResponse.headers.get(
      "x-void-public-buy-void-post-proxy",
    ),
    "v1",
  );

  const postBody =
    await postResponse.json();
  assert.equal(
    postBody.marker,
    "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF",
  );
  assert.equal(
    upstreamCalls.length,
    1,
  );
  assert.deepEqual(
    upstreamCalls[0],
    {
      method: "POST",
      url:
        "/__void/buy-void/request",
      body: requestBody,
      contentType:
        "application/json",
    },
  );


  // Everything below is an inert POST to the isolated fake upstream.
  // The public edge must not turn oversized/stalled replies into receipts.
  const edgeUrl = `http://127.0.0.1:${gatewayPort}/__void/buy-void/request`;
  const postProof = async (proofCase, signal) => {
    const before = upstreamCalls.length;
    const response = await fetch(edgeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ __edge_proof_case: proofCase }),
      redirect: "manual",
      ...(signal ? { signal } : {}),
    });
    assert.equal(upstreamCalls.length, before + 1, proofCase);
    assert.equal(response.headers.get(
      "x-void-public-buy-void-post-proxy"), "v1", proofCase);
    assert.equal(response.headers.get("cache-control"), "no-store", proofCase);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", proofCase);
    return response;
  };
  const valid201 = await postProof("valid_201");
  assert.equal(valid201.status, 201, "legitimate checkout HTTP 201 retained");
  assert.equal(valid201.headers.get("content-type"),
    "application/json; charset=utf-8");
  const accepted201Bytes = Buffer.from(await valid201.arrayBuffer());
  assert.deepEqual(accepted201Bytes, Buffer.from(exactAccepted201Json,"utf8"),
    "HTTP 201 byte-for-byte body must not be parsed and reserialized");
  assert.deepEqual(JSON.parse(accepted201Bytes.toString("utf8")),
    exactAccepted201Receipt);

  const maximumValid = await postProof("max_size_valid");
  assert.equal(maximumValid.status, 400);
  const maximumValidBytes = Buffer.from(await maximumValid.arrayBuffer());
  assert.equal(maximumValidBytes.length, 131072);
  assert.equal(JSON.parse(maximumValidBytes.toString("utf8")).ok, false);

  for (const scenario of [
    "declared_oversize",
    "chunked_oversize",
    "non_json",
    "redirect",
    "malformed_json_201",
    "invalid_utf8_201",
    "primitive_201",
    "array_201",
    "empty_object_201",
    "false_ok_201",
    "wrong_marker_201",
    "idempotent_201",
    "missing_request_201",
    "wrong_request_status_201",
    "private_path_201",
    "wrong_outer_schema_201",
    "missing_outer_schema_201",
    "wrong_inner_schema_201",
    "missing_inner_schema_201",
    "missing_persisted_201",
    "false_persisted_ok_201",
    "nonobject_persisted_201",
    "missing_request_id_201",
    "false_request_ok_201",
    "wrong_inner_marker_201",
  ]) {
    const refused = await postProof(scenario);
    assert.equal(refused.status, 502, scenario);
    assert.deepEqual(await refused.json(), {
      ok: false,
      error: "buy_void_request_upstream_unavailable",
    }, scenario);
  }

  const refusedOpenBody = await postProof("header_nonjson_pending");
  assert.equal(refusedOpenBody.status, 502);
  assert.deepEqual(await refusedOpenBody.json(), {
    ok: false, error: "buy_void_request_upstream_unavailable",
  });
  const earlyCloseStartedAt = Date.now();
  for (let attempt=0;attempt<100 && !headerRejectedSocketClosed;attempt++) {
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.equal(headerRejectedSocketClosed, true,
    "header-rejected upstream body must be cancelled before fallback abort");
  assert.ok(Date.now() - earlyCloseStartedAt < 6000,
    "rejected body close cannot rely on the eight-second fallback");

  const stallStartedAt = Date.now();
  const stalled = await postProof(
    "hanging_reply",
    AbortSignal.timeout(14000),
  );
  const stalledElapsedMs = Date.now() - stallStartedAt;
  assert.equal(stalled.status, 502, "stalled upstream body must fail closed");
  assert.deepEqual(await stalled.json(), {
    ok: false,
    error: "buy_void_request_upstream_unavailable",
  });
  assert.ok(stalledElapsedMs >= 5000 && stalledElapsedMs < 13000,
    "upstream response must have a finite total deadline");

  const forwardedBeforeUnrelatedPost = upstreamCalls.length;
  const unrelatedPost =
    await fetch(
      `http://127.0.0.1:${gatewayPort}/__void/buy-void/config.json`,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
        },
        body: "{}",
        redirect: "manual",
      },
    );

  assert.equal(
    unrelatedPost.status,
    405,
  );
  assert.equal(
    upstreamCalls.length,
    forwardedBeforeUnrelatedPost,
    "unrelated POST must not reach upstream after the new edge tests",
  );

  const legacyGet =
    await fetch(
      `http://127.0.0.1:${gatewayPort}/__void/buy-void/request.json`,
      {
        redirect: "manual",
      },
    );

  // The isolated proof intentionally does not model the deployed public
  // seed-adapter composition dependency used by legacy GET routes. The
  // invariant for this lane is narrower: legacy GET must never be claimed
  // by the new exact POST proxy.
  assert.equal(
    legacyGet.headers.get(
      "x-void-public-buy-void-post-proxy",
    ),
    null,
  );

  const upstreamCallsAfterLegacyGet =
    upstreamCalls.length;

  const optionsResponse =
    await fetch(
      `http://127.0.0.1:${gatewayPort}/__void/buy-void/request`,
      {
        method: "OPTIONS",
        redirect: "manual",
      },
    );

  assert.equal(
    optionsResponse.status,
    405,
  );
  assert.equal(
    optionsResponse.headers.get(
      "x-void-public-buy-void-post-proxy",
    ),
    null,
  );
  assert.equal(
    upstreamCalls.length,
    upstreamCallsAfterLegacyGet,
  );

  console.log(
    "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF_BEGIN",
  );
  console.log(
    "listener_readiness_http_response=true",
  );
  console.log(
    "proof_scope_exact_post_route_only=true",
  );
  console.log(
    "exact_post_route_forwarded=true",
  );
  console.log(
    "post_method_preserved=true",
  );
  console.log(
    "post_body_preserved=true",
  );
  console.log(
    "upstream_status_preserved=true",
  );
  console.log("upstream_response_byte_ceiling=131072");
  console.log("upstream_declared_oversize_rejected=true");
  console.log("upstream_streamed_oversize_rejected=true");
  console.log("upstream_redirect_and_nonjson_rejected=true");
  console.log("valid_checkout_201_pass_through=true");
  console.log("canonical_201_schema_marker_idempotent_request_required=true");
  console.log("independent_201_outer_and_inner_schema_mismatch_refused=true");
  console.log("independent_201_missing_false_nonobject_persistence_refused=true");
  console.log("independent_201_request_id_ok_marker_refused=true");
  console.log("public_201_private_persistence_path_refused=true");
  console.log("malformed_json_201_rejected=true");
  console.log("invalid_utf8_201_rejected=true");
  console.log("primitive_and_array_201_refused=true");
  console.log("raw_noncanonical_201_bytes_preserved=true");
  console.log("header_refusal_upstream_socket_closed_early=true");
  console.log("per_read_deadline_timer_detached=true");
  console.log("tiny_chunk_deadline_timer_lifetime_proven=true");
  console.log("completed_reader_release_failure_returns_502=true");
  console.log("truthy_json_primitive_201_refused=true");
  console.log("upstream_total_deadline_bounded=true");
  console.log("max_response_size_boundary_accepted=true");
  console.log(
    "proxy_response_marker_green=true",
  );
  console.log(
    "unrelated_post_still_blocked=true",
  );
  console.log(
    "legacy_get_not_claimed_by_post_proxy=true",
  );
  console.log(
    "options_not_claimed_by_post_proxy=true",
  );
  console.log(
    "options_still_blocked=true",
  );
  console.log(
    "automatic_fulfillment=false",
  );
  console.log(
    "request_created=false",
  );
  console.log(
    "payment_sent=false",
  );
  console.log(
    "transaction_broadcast=false",
  );
  console.log(
    "VOID_BUY_VOID_PUBLIC_EDGE_POST_PROXY_V1_PROOF_GREEN",
  );
} finally {
  child.kill("SIGTERM");

  await Promise.race([
    once(
      child,
      "exit",
    ),
    new Promise(
      (resolve) => setTimeout(
        resolve,
        3000,
      ),
    ),
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }

  // Terminate the deliberate hanging-reply socket even after a failed test.
  upstream.closeAllConnections();
  await new Promise(
    (resolve, reject) => {
      upstream.close(
        (error) => {
          if (error) reject(error);
          else resolve();
        },
      );
    },
  );
}
