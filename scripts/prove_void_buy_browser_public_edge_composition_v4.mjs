#!/usr/bin/env node
// VOID_BUY_VOID_BROWSER_PUBLIC_EDGE_SOURCE_COMPOSITION_V4
// Inert, exact browser -> real current gateway -> actual immutable request
// persistor with a synthetic node HTTP adapter. NO mounted index.ts route,
// installed host, real buyer, keys, payment, wallet or funds.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { pathToFileURL } from "node:url";
import { once } from "node:events";

const BROWSER_COMMIT = "532ae892a5206caa3899ed624d3311afa1600215";
const BROWSER_BLOB = "111816634a296ad43c2f9cb46bddae87471b52cf";
const EDGE_COMMIT = "d49126c39e298313b1151f1cbd3b4068339c0aaa";
const EDGE_BLOB = "b718c5eccedc8d1ac08d1bd8f2281304ca49e152";
const WRITER_COMMIT = "cfc4a3c388f998bed217001d1ff7eeecaadca6ca";
const WRITER_BLOB = "e738e32601c68b70ebc7cbf922b24f055cc3e91d";
const WRITER_PATH = "src/economic/buy_void_public_request_under_launch_lock_v1.ts";
const BROWSER_PATH = "public/void-app-wave1-v1/assets/js/buy-live.js";
const EDGE_PATH = "ops/public/void-public-app-composition-gateway-v1.mjs";
const MARKER = "VOID_BUY_VOID_BROWSER_PUBLIC_EDGE_SOURCE_COMPOSITION_V4";
const receiver = "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5";
const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const destination = "0x1111111111111111111111111111111111111111";
const safePath = process.env.PATH || "/usr/bin:/bin";
const root = process.cwd();

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8",
    maxBuffer: 15 * 1024 * 1024, ...options }).trimEnd();
}
function gitBlob(text) {
  const bytes = Buffer.from(text);
  return createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0"))
    .update(bytes).digest("hex");
}
function immutableSource(commit, name, expected) {
  let source;
  try {
    source = execFileSync("git", ["show", commit + ":" + name],
      { cwd: root, encoding: "utf8", maxBuffer: 15 * 1024 * 1024 });
  } catch (_error) {
    throw new Error("HOLD_missing_pinned_source_commit_" + name);
  }
  assert.equal(gitBlob(source), expected, "exact Git source changed: " + name);
  return source;
}
const browserSource = immutableSource(BROWSER_COMMIT, BROWSER_PATH, BROWSER_BLOB);
const gatewaySource = immutableSource(EDGE_COMMIT, EDGE_PATH, EDGE_BLOB);
const writerSource = immutableSource(WRITER_COMMIT, WRITER_PATH, WRITER_BLOB);
assert.match(writerSource, /export async function persistBuyVoidPublicRequestUnderLaunchLockV1/);
assert.ok(browserSource.includes("response.status !== 201"));
assert.ok(browserSource.includes("request.persisted"));
const clockBeforeReader = browserSource.indexOf(
  "const bodyStartedMonoMs = receiptMonotonicNow();"
);
const readerAcquire = browserSource.indexOf(
  "const reader = response.body?.getReader?.();"
);
assert.ok(clockBeforeReader >= 0 && readerAcquire > clockBeforeReader,
  "current browser must qualify monotonic clock before acquiring body stream");
assert.ok(gatewaySource.includes("voidBuyVoidPublicEdgePostProxyV1"));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-edge-browser-v3-"));
const edgeRoot = path.join(tmp, "gateway-source");
const writerDir = path.join(tmp, "private-synthetic-request-ledger");
const writerModule = path.join(tmp, "private-writer.mjs");
const savedRequestDir = process.env.VOID_BUY_REQUEST_DIR;
let pinnedWriter = null;
let writerInvocations = 0;
let newRequestSerial = 0;
const privateAccount = "SYNTHETIC_ORIGINAL_BUYER_ACCOUNT";
const privateNote = "SYNTHETIC_ORIGINAL_BUYER_NOTE";
function durableRequests() {
  const journal = path.join(writerDir, "requests.jsonl");
  if (!fs.existsSync(journal)) return [];
  const content = fs.readFileSync(journal, "utf8");
  if (!content) return [];
  assert.ok(content.endsWith("\n"), "actual writer journal must be LF-terminated");
  return content.trimEnd().split("\n").map((line) => JSON.parse(line));
}
const writerCallbacks = [
  async (_request, operation) => {
    writerInvocations++;
    return operation(() => ({ ready: true }));
  },
  async () => durableRequests(),
  async () => [],
  (rows) => rows.map((row) => ({
    ...row,
    effective_status: row.status === "awaiting_payment_tx_hash"
      ? "awaiting_payment" : row.status,
  })),
  (status) => status === "fulfilled" || status === "rejected",
  () => true,
];
let checkoutCreated = false;
let upstream = null;
let gateway = null;
let gatewayExit = false;
const gatewayOutput = [];
const backendRequests = [];
const edgeReplies = [];
const expectedRaw201 = new Map();

async function getFreePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
  return port;
}
async function waitForGateway(port) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline && !gatewayExit) {
    const ready = await new Promise((resolve) => {
      const client = net.connect({ host: "127.0.0.1", port });
      client.once("connect", () => { client.destroy(); resolve(true); });
      client.once("error", () => resolve(false));
      client.setTimeout(500, () => { client.destroy(); resolve(false); });
    });
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 65));
  }
  throw new Error("HOLD_gateway_failed_to_start_in_inert_worktree");
}
function canonicalReceipt(amount, post) {
  const created = Date.now();
  const expires = created + 4 * 60 * 1000;
  const id = "buyvoid_compose_base_" + amount;
  return {
    schema: "void_public_buy_void_checkout_request_result_v1",
    marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
    ok: true, idempotent: false, one_active_request_cap_enforced: true,
    request: {
      schema: "void_public_buy_void_checkout_request_v1",
      marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
      ok: true, persisted: { ok: true }, request_id: id,
      created_at_ms: created,
      launch_authority: { expires_at_ms: expires },
      status: "awaiting_payment_tx_hash", tx_hash: "",
      source_chain: "base", payment_chain: "base", payment_chain_id: 8453,
      asset_in: "USDC", usdc_decimals: 6, usdc_contract: baseUsdc,
      usdc_amount: Number(amount), requested_amount_usdc: Number(amount),
      receive_address: receiver, void_destination_address: destination,
      delivery_address: destination, delivery_wallet: destination,
      delivery_chain: "void", delivery_chain_id: 2050,
      request_contract: {
        request_before_payment_required: true,
        one_active_request_per_void_destination: true,
        payment_sender_must_equal_void_destination: true,
        payment_tx_hash_bound_after_request_by_operator: true,
      },
      safety: { automatic_fulfillment: false, manual_review_required: true },
      payment_instructions: {
        request_id: id, amount: Number(amount), expires_at_ms: expires,
        send_asset: "USDC", send_chain: "base", send_chain_id: 8453,
        token_contract: baseUsdc, token_decimals: 6,
        send_to: receiver, send_from: destination,
        do_not_send_before_request: true, keep_transaction_hash: true,
        do_not_send_from_exchange_or_pooled_custody: true,
      },
    },
  };
}
// Successful HTTP-201 bytes still need browser-side safety qualification.
 // These cases traverse the actual pinned gateway, which forwards them as
 // canonical-shaped 201 replies. The pinned browser must reject each one.
 const unsafe201 = new Map([
   ["18", ["request_first_false", (body) => {
     body.request.request_contract.request_before_payment_required = false;
   }]],
   ["19", ["request_first_missing", (body) => {
     delete body.request.request_contract.request_before_payment_required;
   }]],
   ["20", ["one_active_destination_false", (body) => {
     body.request.request_contract.one_active_request_per_void_destination = false;
   }]],
   ["21", ["sender_destination_binding_false", (body) => {
     body.request.request_contract.payment_sender_must_equal_void_destination = false;
   }]],
   ["22", ["operator_tx_hash_binding_false", (body) => {
     body.request.request_contract.payment_tx_hash_bound_after_request_by_operator = false;
   }]],
   ["23", ["automatic_fulfillment_claim_true", (body) => {
     body.request.safety.automatic_fulfillment = true;
   }]],
   ["24", ["manual_review_false", (body) => {
     body.request.safety.manual_review_required = false;
   }]],
   ["25", ["manual_review_missing", (body) => {
     delete body.request.safety.manual_review_required;
   }]],
   ["26", ["send_before_request_allowed", (body) => {
     body.request.payment_instructions.do_not_send_before_request = false;
   }]],
   ["27", ["no_transaction_hash_retention", (body) => {
     body.request.payment_instructions.keep_transaction_hash = false;
   }]],
   ["28", ["exchange_custody_allowed", (body) => {
     body.request.payment_instructions.do_not_send_from_exchange_or_pooled_custody = false;
   }]],
   ["29", ["exchange_custody_warning_missing", (body) => {
     delete body.request.payment_instructions.do_not_send_from_exchange_or_pooled_custody;
   }]],
 ]);
 assert.equal(unsafe201.size, 12, "all receipt-safety independent negatives mounted");

function reply(res, status, body, extra = {}) {
  const bytes = Buffer.from(JSON.stringify(body, null, 2) + "\n");
  res.writeHead(status, { "content-type": "application/json; charset=utf-8",
    "cache-control": "public,max-age=60", "content-length": String(bytes.length),
    ...extra });
  res.end(bytes);
  return bytes.toString("utf8");
}
async function syntheticNode(req, res) {
  if (req.method !== "POST" || req.url !== "/__void/buy-void/request") {
    return reply(res, 404, { ok: false, error: "synthetic_not_found" });
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    assert.ok(size <= 65536, "bounded test input");
    chunks.push(chunk);
  }
  const post = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  assert.equal(post.source_chain, "base");
  assert.equal(post.void_destination_address, destination);
  assert.match(post.requested_amount_usdc, /^(?:1[0-9]|2[0-9]|3[0-2])$/);
  for (const ack of [
    "ack_self_custody", "ack_native_usdc", "ack_request_before_payment",
    "ack_sender_equals_void_destination", "ack_no_automatic_fulfillment"
  ]) assert.equal(post[ack], true, "actual browser POST " + ack);
  const amount = post.requested_amount_usdc;
  backendRequests.push({ amount, method: req.method, path: req.url });
  if (amount === "10" || amount === "30") {
    // Execute the actual, source-pinned economic request persistor. Its
    // launch-authority callback and network route are synthetic; this is NOT
    // an installed checkout or an exercise of index.ts's mounted HTTP route.
    assert.equal(typeof pinnedWriter?.persistBuyVoidPublicRequestUnderLaunchLockV1,
      "function", "pinned writer exported");
    const receipt = canonicalReceipt(amount, post);
    const request = receipt.request;
    request.request_id = "buyvoid_writer_synthetic_" + amount + "_" + (++newRequestSerial);
    request.payment_instructions.request_id = request.request_id;
    request.account = privateAccount;
    request.note = privateNote;
    delete request.persisted;
    try {
      const persisted = await pinnedWriter.persistBuyVoidPublicRequestUnderLaunchLockV1(
        request, writerCallbacks);
      if (persisted.reused_request) {
        reply(res, 409, {
          schema: "void_public_buy_void_checkout_request_result_v1",
          marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
          ok: false, error: "one_active_request_per_void_destination",
          one_active_request_cap_enforced: true,
        });
        return;
      }
      assert.equal(typeof persisted.file, "string");
      request.persisted = { ok: true };
      expectedRaw201.set(amount, JSON.stringify(receipt, null, 2) + "\n");
      reply(res, 201, receipt);
      return;
    } catch (error) {
      const reason = String(error?.message || "");
      assert.equal(reason, "buy_void_request_active_destination_changed_during_lock",
        "unanticipated actual-writer HOLD " + reason);
      reply(res, 409, {
        schema: "void_public_buy_void_checkout_request_result_v1",
        marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
        ok: false, error: "one_active_request_per_void_destination",
        one_active_request_cap_enforced: true,
      });
      return;
    }
  }
  if (amount === "12") {
    reply(res, 200, { ok: true, idempotent: true, request: {
      request_id: "SENTINEL_OTHER_BUYER_ID",
      note: "SENTINEL_OTHER_BUYER_NOTE",
      tx_hash: "SENTINEL_OTHER_BUYER_HASH",
    }}, { etag: "SENTINEL_OTHER_BUYER_ETAG" });
    return;
  }
  if (amount === "13" || amount === "16" || amount === "17" || amount === "15") {
    const status = { "13": 409, "15": 500, "16": 400, "17": 503 }[amount];
    reply(res, status, { ok: false,
      error: "SENTINEL_OTHER_BUYER_PRIVATE_ERROR",
      existing_request_id: "SENTINEL_OTHER_BUYER_ID"
    }, { etag: "SENTINEL_OTHER_BUYER_ETAG" });
    return;
  }
  const body = canonicalReceipt(amount, post);
  const unsafeVariant = unsafe201.get(amount);
  if (unsafeVariant) unsafeVariant[1](body);
  if (amount === "11") {
    body.request.payment_instructions.send_to =
      "0x2222222222222222222222222222222222222222";
  }
  if (amount === "14") {
    // Current main generation returned a private file path with an otherwise
    // legitimate original-buyer 201. The current gateway must strip that
    // path and upstream ETag while preserving a usable exact receipt.
    body.request.persisted.file = "SENTINEL_PRIVATE_SERVER_FILE";
  }
  if (amount === "31") {
    body.request.persisted.file = 7;
  }
  if (amount === "32") {
    body.request.persisted.file = "SENTINEL_PRIVATE_SERVER_FILE";
    body.request.persisted.internal_proof = "SENTINEL_EXTRA_PRIVATE_METADATA";
  }
  expectedRaw201.set(amount, JSON.stringify(body, null, 2) + "\n");
  reply(res, 201, body,
    amount === "14" ? { etag: "SENTINEL_PRIVATE_UPSTREAM_ETAG" } : {});
}
function field(value) {
  const attrs = new Map();
  return { value, disabled: false,
    setAttribute(key, v) { attrs.set(key, String(v)); },
    removeAttribute(key) { attrs.delete(key); },
    getAttribute(key) { return attrs.get(key) ?? null; },
  };
}
function browserWithGateway(port) {
  const elements = new Map();
  const button = { disabled: true };
  const amount = field("10");
  const address = field(destination);
  const rail = field("base");
  const buyView = {};
  const ackNames = ["self_custody", "native_usdc", "request_before_payment",
    "sender_equals_void_destination", "no_automatic_fulfillment"];
  const acks = ackNames.map((name) => ({
    dataset: { buyAck: name }, checked: true, disabled: false,
  }));
  const one = (selector) => {
    const special = {
      "[data-buy-submit]": button, "[data-buy-amount]": amount,
      "[data-buy-destination]": address, "[data-buy-chain]": rail,
      "[data-buy-view]": buyView,
    };
    if (special[selector]) return special[selector];
    if (!elements.has(selector)) elements.set(selector, { textContent: "",
      className: "" });
    return elements.get(selector);
  };
  const all = (selector) => {
    if (selector === "[data-buy-ack]") return acks;
    if (selector === "[data-buy-chain], [data-buy-amount], [data-buy-destination], [data-buy-ack]") {
      return [rail, amount, address, ...acks];
    }
    return [one(selector)];
  };
  const browser = {
    console, location: { hash: "#/buy" }, performance: globalThis.performance,
    window: { addEventListener() {} },
    document: {
      querySelector: one, querySelectorAll: all, addEventListener() {},
      getElementById() { return null; },
    },
    MutationObserver: class { observe() {} },
    setTimeout(_callback, _time) { return 1; }, clearTimeout() {},
    queueMicrotask() {}, AbortSignal: globalThis.AbortSignal,
    TextDecoder: globalThis.TextDecoder, Uint8Array: globalThis.Uint8Array,
    fetch: async (input, init) => {
      assert.equal(input, "/__void/buy-void/request");
      assert.equal(init.method, "POST");
      assert.equal(init.redirect, "error");
      assert.equal(init.headers["content-type"], "application/json");
      const url = "http://127.0.0.1:" + port + String(input);
      const response = await globalThis.fetch(url, init);
      const copy = response.clone();
      const wire = await copy.text();
      edgeReplies.push({ status: response.status, wire,
        etag: response.headers.get("etag"),
        cache: response.headers.get("cache-control") });
      return response;
    },
  };
  vm.runInNewContext(browserSource + "\n" + [
    "globalThis.__buyComposition = {",
    "  beginBuyViewInstance, validateSnapshot, renderSnapshot,",
    "  updateSubmit, submitBuy,",
    "  setState(value) { currentSnapshot=value;",
    "    readinessPending=false; submitBusy=false; }",
    "};"
  ].join("\n"), browser, { filename: BROWSER_PATH, timeout: 2500 });
  const app = browser.__buyComposition;
  assert.equal(app.beginBuyViewInstance(buyView), true);
  const cfg = {
    marker: "VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1",
    schema: "void_public_buy_void_config_v1",
    receive_address: receiver, usdc_contract: baseUsdc,
    payment_chains: ["base", "ethereum"], payment_chain_id: 8453,
    delivery_chain_id: 2050, price_usdc_per_void: "0.50",
    rate_void_per_usdc: "2", min_usdc: 1, max_usdc: 500,
    request_method: "POST", request_route: "/__void/buy-void/request",
    request_before_payment_required: true,
    payment_sender_must_equal_void_destination: true,
    do_not_send_from_exchange: true, requests_enabled: true,
    ethereum_requests_enabled: false, payment_ready: true,
    receiver_binding_green: true, automatic_fulfillment: false,
  };
  const status = { schema: "void_public_buy_void_status_v1",
    ok: true, request_intake_ready: true };
  const sale = { schema: "void_buy_void_sale_state_v1", ok: true,
    sold_out: false, pool_void_total: 10000000,
    remaining_void: 9999980, raised_usdc_so_far: 10, progress_pct: 0.0002 };
  const snapshot = app.validateSnapshot(cfg, status, sale);
  app.setState(snapshot);
  app.renderSnapshot(snapshot);
  return { app, amount, button,
    result: () => one("[data-buy-result]").textContent };
}

try {
  git(["cat-file", "-e", BROWSER_COMMIT + "^{commit}"]);
  git(["cat-file", "-e", EDGE_COMMIT + "^{commit}"]);
  git(["cat-file", "-e", WRITER_COMMIT + "^{commit}"]);
  fs.mkdirSync(writerDir, { mode: 0o700 });
  process.env.VOID_BUY_REQUEST_DIR = writerDir;
  const compiled = ts.transpileModule(writerSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  const syntaxErrors = (compiled.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error);
  assert.equal(syntaxErrors.length, 0,
    "actual pinned request writer must transpile exactly");
  fs.writeFileSync(writerModule, compiled.outputText, { mode: 0o600 });
  pinnedWriter = await import(pathToFileURL(writerModule).href);
  assert.equal(typeof pinnedWriter.persistBuyVoidPublicRequestUnderLaunchLockV1,
    "function");
  execFileSync("git", ["worktree", "add", "--detach", edgeRoot, EDGE_COMMIT],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  checkoutCreated = true;
  assert.equal(gitBlob(fs.readFileSync(path.join(edgeRoot, EDGE_PATH), "utf8")),
    EDGE_BLOB);
  upstream = http.createServer(syntheticNode);
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const upstreamPort = upstream.address().port;
  const gatewayPort = await getFreePort();
  gateway = spawn(process.execPath, [path.join(edgeRoot, EDGE_PATH)], {
    cwd: edgeRoot,
    env: {
      PATH: safePath, HOME: tmp,
      NODE_ENV: "test", VOID_COMPOSITION_HOST: "127.0.0.1",
      VOID_COMPOSITION_PORT: String(gatewayPort),
      VOID_NODE_UPSTREAM: "http://127.0.0.1:" + upstreamPort,
      VOID_PUBLIC_UPSTREAM: "http://127.0.0.1:" + upstreamPort,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  gateway.stdout.on("data", (b) => gatewayOutput.push(b.toString("utf8")));
  gateway.stderr.on("data", (b) => gatewayOutput.push(b.toString("utf8")));
  gateway.once("exit", () => { gatewayExit = true; });
  await waitForGateway(gatewayPort);
  const buy = browserWithGateway(gatewayPort);
  const outcomes = [
    ["10", 201, true, "new_base_request"],
    ["11", 201, false, "wrong_receiver_receipt"],
    ["12", 502, false, "retired_reused_200_private"],
    ["13", 409, false, "retired_conflict_409_private"],
    ["14", 201, true, "legacy_private_persistence_sanitized_201"],
    ["15", 502, false, "upstream_500_private"],
    ["16", 400, false, "upstream_400_private"],
    ["17", 503, false, "upstream_503_private"],
    ["31", 502, false, "legacy_nonstring_private_file_rejected"],
    ["32", 502, false, "legacy_unexpected_private_metadata_rejected"],
    ...Array.from(unsafe201, ([amount, [label]]) => [amount, 201, false, label]),
  ];
  for (const [amount, expectedStatus, success, label] of outcomes) {
    buy.amount.value = amount;
    buy.app.updateSubmit();
    assert.equal(buy.button.disabled, false, label + ": fresh intent eligible");
    const before = backendRequests.length;
    const priorReplies = edgeReplies.length;
    await buy.app.submitBuy({ preventDefault() {} });
    assert.equal(backendRequests.length, before + 1,
      label + ": exactly one outbound node POST");
    assert.equal(edgeReplies.length, priorReplies + 1,
      label + ": browser received exactly one edge response");
    const result = edgeReplies.at(-1);
    assert.equal(result.status, expectedStatus, label + ": edge status");
    assert.equal(result.cache, "no-store", label + ": browser-facing no-store");
    assert.equal(buy.button.disabled, true, label + ": no repeat POST");
    if (unsafe201.has(amount)) {
      assert.equal(result.status, 201,
        label + ": gateway must have forwarded canonical-shaped unsafe 201");
      assert.equal(result.wire, expectedRaw201.get(amount),
        label + ": actual gateway forwarded original unsafe 201 bytes");
    }
    if (success) {
      if (amount === "14") {
        const forwarded = JSON.parse(result.wire);
        assert.deepEqual(forwarded.request.persisted, { ok: true },
          "gateway must remove only verified legacy private path");
        assert.equal(forwarded.request.request_id, "buyvoid_compose_base_14");
        assert.doesNotMatch(result.wire, /SENTINEL_PRIVATE_/u,
          "private leaf path and upstream metadata cannot reach browser");
        assert.notEqual(result.wire, expectedRaw201.get(amount),
          "private-path 201 cannot be forwarded byte-for-byte");
        assert.equal(result.etag, null,
          "upstream ETag for unsanitized private document must be dropped");
      } else {
        assert.equal(result.wire, expectedRaw201.get(amount),
          "safe current-generation 201 must preserve original exact bytes");
      }
      assert.match(buy.result(), /REQUEST CREATED.*VERIFY BEFORE PAYMENT/u);
      assert.match(buy.result(), new RegExp("Send exactly: " + amount + " USDC", "u"));
      assert.match(buy.result(), /Base Mainnet.*8453/u);
    } else {
      assert.match(buy.result(), /REQUEST OUTCOME UNCONFIRMED/u,
        label + ": never an actionable payment receipt");
      assert.doesNotMatch(buy.result(), /REQUEST CREATED|Send exactly:/u,
        label + ": browser refuses bad/ambiguous outcome");
    }
    if (!success) {
      assert.doesNotMatch(result.wire, /SENTINEL/u,
        label + ": upstream private sentinel cannot reach buyer");
      assert.equal(result.etag, null,
        label + ": private upstream ETag cannot reach buyer");
    }
    await buy.app.submitBuy({ preventDefault() {} });
    assert.equal(backendRequests.length, before + 1,
      label + ": same intent cannot be resubmitted");
  }
  assert.equal(backendRequests.length, outcomes.length);
  assert.equal(edgeReplies.length, outcomes.length);

  // Same buyer destination and exact intention from a DIFFERENT browser is
  // not authority to receive original private data or a second 201 receipt.
  const stranger = browserWithGateway(gatewayPort);
  stranger.amount.value = "10";
  stranger.app.updateSubmit();
  assert.equal(stranger.button.disabled, false);
  const beforeReuse = backendRequests.length;
  await stranger.app.submitBuy({ preventDefault() {} });
  assert.equal(backendRequests.length, beforeReuse + 1);
  const reusedReply = edgeReplies.at(-1);
  assert.equal(reusedReply.status, 409);
  assert.match(stranger.result(), /REQUEST OUTCOME UNCONFIRMED/u);
  assert.doesNotMatch(stranger.result(), /REQUEST CREATED|Send exactly:/u);
  assert.doesNotMatch(reusedReply.wire,
    /SYNTHETIC_ORIGINAL_BUYER|SENTINEL_OTHER_BUYER|buyvoid_writer_synthetic_10_1/u);
  assert.equal(stranger.button.disabled, true);
  await stranger.app.submitBuy({ preventDefault() {} });
  assert.equal(backendRequests.length, beforeReuse + 1,
    "stranger request cannot be silently resubmitted");

  // A changed amount on the same destination is also generic 409; the
  // response may not reveal whether amount/chain matches old buyer intent.
  const changed = browserWithGateway(gatewayPort);
  changed.amount.value = "30";
  changed.app.updateSubmit();
  assert.equal(changed.button.disabled, false);
  await changed.app.submitBuy({ preventDefault() {} });
  const conflictReply = edgeReplies.at(-1);
  assert.equal(conflictReply.status, 409);
  assert.equal(conflictReply.wire, reusedReply.wire,
    "the same and different amount must have indistinguishable public refusal");
  assert.match(changed.result(), /REQUEST OUTCOME UNCONFIRMED/u);
  assert.doesNotMatch(changed.result(), /REQUEST CREATED|Send exactly:/u);
  assert.equal(changed.button.disabled, true);

  // Only disposable, synthetic buyer records are examined.
  const rows = durableRequests();
  assert.equal(rows.length, 1, "one original durable request, no duplicates");
  assert.equal(rows[0].requested_amount_usdc, 10);
  assert.equal(rows[0].note, privateNote);
  assert.equal(rows[0].account, privateAccount);
  const journal = path.join(writerDir, "requests.jsonl");
  const sidecar = path.join(writerDir, rows[0].request_id + ".json");
  assert.equal(fs.statSync(writerDir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(journal).mode & 0o777, 0o600);
  assert.equal(fs.statSync(sidecar).mode & 0o777, 0o600);
  assert.equal(writerInvocations, 3,
    "original create, same-intent reuse, changed-amount denial run actual writer");
  assert.equal(fs.readdirSync(writerDir).length, 2,
    "no other buyer sidecars or durable requests created");
  console.log(MARKER + "_GREEN");
  console.log("source_browser_commit=" + BROWSER_COMMIT);
  console.log("source_browser_blob=" + BROWSER_BLOB);
  console.log("source_gateway_commit=" + EDGE_COMMIT);
  console.log("source_gateway_blob=" + EDGE_BLOB);
  console.log("actual_browser_post_through_actual_gateway=true");
  console.log("current_browser_clock_qualified_before_body_reader=true");
  console.log("upstream_fake_only=true");
  console.log("native_base_201_original_bytes_and_instructions_accepted=true");
  console.log("legacy_private_file_receipt_redacted_and_accepted=true");
  console.log("legacy_etag_not_forwarded=true");
  console.log("malformed_legacy_persistence_stays_uncertain=true");
  console.log("malformed_201_browser_refuses_funds=true");
  console.log("retired_200_and_409_privacy_leaks_blocked=true");
  console.log("400_503_500_upstream_private_body_never_forwarded=true");
  console.log("all_attempted_intents_fenced_against_repost=" + outcomes.length);
  console.log("actual_gateway_forwarded_all_unsafe_201_receipts=" + unsafe201.size);
  console.log("composed_201_request_contract_safety_instruction_negatives=true");
  console.log("actual_pinned_request_writer_helper_exercised=true");
  console.log("same_destination_idempotent_retry_no_duplicate_append=true");
  console.log("same_destination_changed_amount_public_response_indistinguishable=true");
  console.log("synthetic_writer_private_files_0700_0600=true");
  console.log("actual_mounted_index_http_route_exercised=false");
  console.log("production_runtime_or_wallet_access=false");
  console.log("presale_or_wc_void_activation=false");
  console.log("funds_movement=false");
} finally {
  if (savedRequestDir === undefined) delete process.env.VOID_BUY_REQUEST_DIR;
  else process.env.VOID_BUY_REQUEST_DIR = savedRequestDir;
  if (gateway && !gatewayExit) {
    gateway.kill("SIGTERM");
    await Promise.race([once(gateway, "exit").catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500))]);
    if (!gatewayExit) gateway.kill("SIGKILL");
  }
  if (upstream) {
    upstream.closeAllConnections?.();
    await new Promise((resolve) => upstream.close(() => resolve()));
  }
  let worktreeReleaseUncertain = false;
  if (checkoutCreated) {
    try {
      execFileSync("git", ["worktree", "remove", "--force", edgeRoot],
        { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    } catch (_error) {
      // Never silently green a left-behind registered Git worktree.
      worktreeReleaseUncertain = true;
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (worktreeReleaseUncertain) {
    throw new Error("HOLD_detached_gateway_source_worktree_cleanup_uncertain");
  }
}
