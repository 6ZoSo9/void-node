#!/usr/bin/env node
// VOID_BUY_VOID_BROWSER_PUBLIC_EDGE_SOURCE_COMPOSITION_V1
// Inert, exact two-Draft-generation browser -> real loopback gateway ->
// synthetic node HTTP integration. NO installed host, real buyer, keys,
// actual economic writer, payment, wallet, network deployment, or funds.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { once } from "node:events";

const BROWSER_COMMIT = "cf0d2f252b2f05b7f1f9730f6b7d8ed43683d3a1";
const BROWSER_BLOB = "5a6e1d55f0e7abbddc0e35f089708331d0f1f935";
const EDGE_COMMIT = "27ba9e2194c1b3e027b50da74142c6983cd3226f";
const EDGE_BLOB = "1fb832bddfb9213241f29570137d9d3c3cc500f4";
const BROWSER_PATH = "public/void-app-wave1-v1/assets/js/buy-live.js";
const EDGE_PATH = "ops/public/void-public-app-composition-gateway-v1.mjs";
const MARKER = "VOID_BUY_VOID_BROWSER_PUBLIC_EDGE_SOURCE_COMPOSITION_V1";
const receiver = "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5";
const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const destination = "0x1111111111111111111111111111111111111111";
const originalEnv = { ...process.env };
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
  try { source = git(["show", commit + ":" + name]); }
  catch { throw new Error("HOLD_missing_pinned_source_commit_" + name); }
  // git() trims only the exec output; use exact untrimmed bytes instead.
  source = execFileSync("git", ["show", commit + ":" + name],
    { cwd: root, encoding: "utf8", maxBuffer: 15 * 1024 * 1024 });
  assert.equal(gitBlob(source), expected, "exact Git source changed: " + name);
  return source;
}
const browserSource = immutableSource(BROWSER_COMMIT, BROWSER_PATH, BROWSER_BLOB);
const gatewaySource = immutableSource(EDGE_COMMIT, EDGE_PATH, EDGE_BLOB);
assert.ok(browserSource.includes("response.status !== 201"));
assert.ok(browserSource.includes("request.persisted"));
assert.ok(gatewaySource.includes("voidBuyVoidPublicEdgePostProxyV1"));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-edge-browser-v1-"));
const edgeRoot = path.join(tmp, "gateway-source");
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
  assert.match(post.requested_amount_usdc, /^(?:1[0-7])$/);
  for (const ack of [
    "ack_self_custody", "ack_native_usdc", "ack_request_before_payment",
    "ack_sender_equals_void_destination", "ack_no_automatic_fulfillment"
  ]) assert.equal(post[ack], true, "actual browser POST " + ack);
  const amount = post.requested_amount_usdc;
  backendRequests.push({ amount, method: req.method, path: req.url });
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
  if (amount === "11") {
    body.request.payment_instructions.send_to =
      "0x2222222222222222222222222222222222222222";
  }
  if (amount === "14") {
    body.request.persisted.file = "SENTINEL_PRIVATE_SERVER_FILE";
  }
  expectedRaw201.set(amount, JSON.stringify(body, null, 2) + "\n");
  reply(res, 201, body);
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
      PATH: originalEnv.PATH || "/usr/bin:/bin", HOME: tmp,
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
    ["14", 502, false, "private_persistence_201"],
    ["15", 502, false, "upstream_500_private"],
    ["16", 400, false, "upstream_400_private"],
    ["17", 503, false, "upstream_503_private"],
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
    if (success) {
      assert.equal(result.wire, expectedRaw201.get(amount),
        "actual gateway must preserve exact canonical original-buyer 201 bytes");
      assert.match(buy.result(), /REQUEST CREATED.*VERIFY BEFORE PAYMENT/u);
      assert.match(buy.result(), /Send exactly: 10 USDC/u);
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
  console.log(MARKER + "_GREEN");
  console.log("source_browser_commit=" + BROWSER_COMMIT);
  console.log("source_browser_blob=" + BROWSER_BLOB);
  console.log("source_gateway_commit=" + EDGE_COMMIT);
  console.log("source_gateway_blob=" + EDGE_BLOB);
  console.log("actual_browser_post_through_actual_gateway=true");
  console.log("upstream_fake_only=true");
  console.log("native_base_201_original_bytes_and_instructions_accepted=true");
  console.log("malformed_201_browser_refuses_funds=true");
  console.log("retired_200_and_409_privacy_leaks_blocked=true");
  console.log("400_503_500_upstream_private_body_never_forwarded=true");
  console.log("all_8_uncertain_intents_fenced_against_repost=true");
  console.log("actual_request_writer_integration=false");
  console.log("production_runtime_or_wallet_access=false");
  console.log("presale_or_wc_void_activation=false");
  console.log("funds_movement=false");
} finally {
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
