#!/usr/bin/env node
// VOID_BUY_VOID_MOUNTED_CHECKOUT_ROUTE_WRITER_V5
// Source-only / disposable filesystem. Executes the pinned public POST
// handler from src/index.ts and the exact pinned launch-lock writer helper.
// All launch/config/quote/other services are inert explicit test adapters.
// It does NOT execute the whole node, the public gateway, or a real buyer POST.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const REPO = process.cwd();
const INDEX_COMMIT = "e261923cab5f70f5e77bb2b08f3f12946f1ce489";
const INDEX_BLOB = "40239e0f76aa1edce43523d18c1b57691e41e8cf";
const WRITER_COMMIT = INDEX_COMMIT;
const WRITER_BLOB = "e738e32601c68b70ebc7cbf922b24f055cc3e91d";
const INDEX_PATH = "src/index.ts";
const WRITER_PATH = "src/economic/buy_void_public_request_under_launch_lock_v1.ts";
const MARKER = "VOID_BUY_VOID_MOUNTED_CHECKOUT_ROUTE_WRITER_V5";
const DEST = "0x" + "1".repeat(40);
const DEST_OTHER = "0x" + "2".repeat(40);
const RECEIVER = "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const POST_ROUTE = "/__void/buy-void/request";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-mounted-buy-route-v5-"));
const dir = path.join(tmp, "synthetic-private-request-dir");
const writerModule = path.join(tmp, "writer.mjs");
const savedDir = process.env.VOID_BUY_REQUEST_DIR;
let writerCalls = 0;
let postedRequests = 0;
let launchValid = true;
let requestIntakeEnabled = true;
let ethereumIntakeEnabled = false;

function gitBlob(src) {
  const bytes = Buffer.from(src, "utf8");
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0"))
    .update(bytes).digest("hex");
}
function pinnedFile(commit, file, blob) {
  const source = execFileSync("git", ["show", commit + ":" + file], {
    cwd: REPO, encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(gitBlob(source), blob, "immutable source identity mismatch: " + file);
  return source;
}
function oneSlice(source, start, end, name) {
  const begin = source.indexOf(start);
  assert.ok(begin >= 0, name + ": missing opening source marker");
  assert.equal(source.indexOf(start, begin + 1), -1,
    name + ": ambiguous opening marker");
  const stop = source.indexOf(end, begin);
  assert.ok(stop > begin && stop - begin < 15_000, name + ": missing bounded end");
  return source.slice(begin, stop);
}
const config = {
  requests_enabled: true, payment_ready: true,
  receiver_binding_green: true, receiver_binding_conflict: false,
  ethereum_requests_enabled: false, source_chain: "base",
  min_usdc: 1, max_usdc: 500,
  receive_address: RECEIVER, usdc_contract: USDC, usdc_decimals: 6,
  receiver_binding_source: "synthetic_attested_receiver",
  payment_chain_id: 8453, delivery_chain_id: 2050,
  pool_void_total: 10000000, rate_void_per_usdc: "2",
  price_usdc_per_void: "0.50",
};
const sale = {
  sold_out: false, remaining_void: 9999980,
  pool_void_total: 10000000, raised_usdc_so_far: 10,
  progress_pct: 0.0002, schema: "void_buy_void_sale_state_v1", ok: true,
};
const launch = Object.freeze({
  marker: "SYNTHETIC_NONAUTHORITATIVE_LAUNCH",
  expires_at_ms: 1_900_000_000_000,
});
const readRows = () => {
  const journal = path.join(dir, "requests.jsonl");
  if (!fs.existsSync(journal)) return [];
  // Deliberately tolerant observer: the actual STRICT writer still must
  // inspect all bytes independently and refuse malformed durable history.
  const rows = [];
  for (const line of fs.readFileSync(journal, "utf8").split("\n")) {
    if (!line) continue;
    try { rows.push(JSON.parse(line)); } catch (_error) { /* test-only omission */ }
  }
  return rows;
};
const callbacks = [
  async (_request, operation) => {
    writerCalls++;
    assert.equal(launchValid, true, "test-only launch authority revoked");
    return operation(() => {
      if (!launchValid) throw new Error("request_launch_authority_expired_or_superseded");
      return { ready: true };
    });
  },
  async () => readRows(),
  async () => [],
  (rows) => rows.map((row) => ({
    ...row,
    effective_status: row.status === "awaiting_payment_tx_hash"
      ? "awaiting_payment" : row.status,
  })),
  (status) => status === "fulfilled" || status === "rejected",
  () => true,
];
const payload = (amount = "10", dest = DEST) => ({
  requested_amount_usdc: amount, void_destination_address: dest,
  source_chain: "base",
  ack_self_custody: true, ack_native_usdc: true,
  ack_request_before_payment: true,
  ack_sender_equals_void_destination: true,
  ack_no_automatic_fulfillment: true,
});
async function routeCall(handler, posted) {
  postedRequests++;
  const result = { status: 200, body: null };
  const res = {
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
  };
  await handler({ method: "POST", body: posted }, res);
  assert.ok(result.body && typeof result.body === "object");
  return result;
}

try {
  fs.mkdirSync(dir, { mode: 0o700 });
  process.env.VOID_BUY_REQUEST_DIR = dir;
  const index = pinnedFile(INDEX_COMMIT, INDEX_PATH, INDEX_BLOB);
  const writerSource = pinnedFile(WRITER_COMMIT, WRITER_PATH, WRITER_BLOB);
  const compiledWriter = ts.transpileModule(writerSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  assert.equal((compiledWriter.diagnostics || [])
    .filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
  fs.writeFileSync(writerModule, compiledWriter.outputText, { mode: 0o600 });
  const writer = await import(pathToFileURL(writerModule).href);
  assert.equal(typeof writer.persistBuyVoidPublicRequestUnderLaunchLockV1, "function");
  const bridge = oneSlice(index,
    "async function __voidPersistBuyVoidRequestV1(r:any)",
    "function __voidBuyVoidReadParamV1",
    "canonical request-writer bridge");
  assert.match(bridge,
    /persistBuyVoidPublicRequestUnderLaunchLockV1\(r,\[__blm,__voidReadBuyVoidRequestsV1,/);

  const readers = oneSlice(index,
    "function __voidBuyVoidReadBodyV1(req:any, ...names:string[])",
    "function __voidBuyVoidTerminalStatusV1",
    "canonical HTTP body readers");
  const mounted = oneSlice(index,
    'app.post("/__void/buy-void/request", async (req:any,res:any)=>{',
    "// VOID_PUBLIC_BUY_VOID_ROUTE_V1",
    "canonical public POST handler");
  const sourceImport = 'const { quoteBuyVoidFromUsdcV1 } = await import("./economic/buy_void_verified_payment_capacity_admission_v1.js");';
  assert.equal(mounted.split(sourceImport).length, 2,
    "only a known fixed economic quote import may be dependency-injected");
  const handlerSource = mounted.replace(sourceImport,
    "const quoteBuyVoidFromUsdcV1 = __syntheticQuote;");
  const transpiledRoute = ts.transpileModule(readers + "\n" + handlerSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None },
    reportDiagnostics: true,
  });
  assert.equal((transpiledRoute.diagnostics || [])
    .filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
  const routes = new Map();
  const app = { post(route, fn) {
    assert.equal(route, POST_ROUTE, "only the exact mounted route is qualified");
    assert.equal(routes.has(route), false);
    routes.set(route, fn);
  } };
  const quote = (amount, rate) => {
    assert.match(amount, /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/);
    assert.equal(rate, "2");
    return Number(amount) * 2;
  };
  // Only the original HTTP handler and exact original body readers are
  // transpiled. Every unavailable dependency is explicitly inert and supplied
  // to this single lexical scope, with no installed Node runtime import.
  const mount = new Function(
    "app", "__voidBuyVoidConfigV1", "__voidBuyVoidSaleStateV1",
    "__bld", "__blo", "__voidPersistBuyVoidRequestV1", "__syntheticQuote",
    transpiledRoute.outputText,
  );
  mount(app, () => ({ ...config, requests_enabled: requestIntakeEnabled,
    ethereum_requests_enabled: ethereumIntakeEnabled }),
    async () => ({ ...sale }),
    () => ({ request_authority: launchValid ? launch : null }),
    () => launchValid,
    (request) => writer.persistBuyVoidPublicRequestUnderLaunchLockV1(
      request, callbacks),
    quote);
  const handler = routes.get(POST_ROUTE);
  assert.equal(typeof handler, "function");

  // Intent MUST fail closed before any writer side effect if intake is HOLD.
  requestIntakeEnabled = false;
  let outcome = await routeCall(handler, payload());
  assert.equal(outcome.status, 503);
  assert.equal(writerCalls, 0);
  requestIntakeEnabled = true;

  // Execute the real mounted server POST handler against the exact writer.
  const first = await routeCall(handler, payload());
  assert.equal(first.status, 201, "first original request accepted");
  assert.equal(first.body.ok, true);
  assert.equal(first.body.idempotent, false);
  assert.equal(first.body.request.status, "awaiting_payment_tx_hash");
  assert.equal(first.body.request.tx_hash, "");
  assert.deepEqual(first.body.request.persisted, { ok: true });
  assert.equal(first.body.request.request_contract.one_active_request_per_void_destination, true);
  assert.equal(first.body.request.payment_instructions.send_to, RECEIVER);
  assert.equal(first.body.request.payment_instructions.amount, 10);
  assert.equal(first.body.request.payment_instructions.request_id,
    first.body.request.request_id);
  const firstWire = JSON.stringify(first.body);
  assert.equal(firstWire.includes(dir), false,
    "public response MUST NOT disclose private request directory");
  assert.equal(firstWire.includes("file"), false,
    "public response MUST NOT disclose a private persistence file field");

  const journal = path.join(dir, "requests.jsonl");
  const requestId = first.body.request.request_id;
  const sidecar = path.join(dir, requestId + ".json");
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(journal).mode & 0o777, 0o600);
  assert.equal(fs.statSync(sidecar).mode & 0o777, 0o600);
  assert.equal(readRows().length, 1);

  const exactRetry = await routeCall(handler, payload());
  const mismatchedRetry = await routeCall(handler, payload("11"));
  // Temporarily enable synthetic Ethereum request admission so a guessed
  // *different payment rail*, unlike an inadmissible 400, actually reaches
  // the real writer and exercises the private original chain mismatch.
  ethereumIntakeEnabled = true;
  const mismatchedRail = await routeCall(handler, {
    ...payload(), source_chain: "ethereum",
  });
  ethereumIntakeEnabled = false;
  assert.equal(exactRetry.status, 409);
  assert.equal(mismatchedRetry.status, 409);
  assert.equal(mismatchedRail.status, 409);
  assert.deepEqual(exactRetry.body, mismatchedRetry.body,
    "an anonymous caller must not infer prior amount from the 409 body");
  assert.deepEqual(exactRetry.body, mismatchedRail.body,
    "an anonymous caller must not infer the original payment rail");
  for (const denied of [exactRetry, mismatchedRetry, mismatchedRail]) {
    const wire = JSON.stringify(denied.body);
    assert.equal(denied.body.ok, false);
    assert.equal(denied.body.error, "one_active_request_per_void_destination");
    assert.equal(wire.includes(requestId), false);
    assert.equal(wire.includes(dir), false);
    assert.equal(wire.includes("existing_request"), false);
    assert.equal(wire.includes("payment_instructions"), false);
  }
  assert.equal(readRows().length, 1, "duplicates never append a second obligation");
  assert.equal(fs.readdirSync(dir).length, 2, "no second private sidecar");

  // Request-first, rail and acknowledgment policy are tested on the actual
  // route before any request is passed into the writer.
  const beforeRejected = writerCalls;
  for (const altered of [
    { ...payload("12", DEST_OTHER), ack_self_custody: false },
    { ...payload("12", DEST_OTHER), tx_hash: "0x" + "a".repeat(64) },
    { ...payload("12", DEST_OTHER), source_chain: "ethereum" },
  ]) {
    outcome = await routeCall(handler, altered);
    assert.equal(outcome.status, 400, "source HTTP admission must reject invalid request");
    assert.equal(writerCalls, beforeRejected);
  }
  assert.equal(readRows().length, 1);

  // The real compiled writer must refuse a malformed durable history even
  // when a legacy observer tolerantly drops the malformed line.
  fs.appendFileSync(journal, "{not_json}\n");
  outcome = await routeCall(handler, payload("12", DEST_OTHER));
  assert.equal(outcome.status, 500);
  assert.equal(outcome.body.error, "buy_void_checkout_request_failed");
  assert.equal(JSON.stringify(outcome.body).includes(dir), false);
  assert.equal(fs.readdirSync(dir).length, 2,
    "malformed history HOLD creates no new sidecar or obligation");

  assert.equal(writerCalls, 5,
    "first, exact reuse, amount/rail mismatch, and malformed-history rejection reach actual writer");
  assert.equal(postedRequests, 9,
    "all actual mounted POST invocations accounted for");
  console.log(MARKER + "_GREEN");
  console.log("pinned_index_commit=" + INDEX_COMMIT);
  console.log("pinned_index_blob=" + INDEX_BLOB);
  console.log("pinned_writer_blob=" + WRITER_BLOB);
  console.log("actual_src_index_post_handler_executed=true");
  console.log("actual_original_body_readers_executed=true");
  console.log("actual_pinned_private_request_writer_executed=true");
  console.log("browser_gateway_legacy_composition_v4_separate=true");
  console.log("public_201_original_receipt_path_private=true");
  console.log("same_changed_amount_public_409_byte_equivalent=true");
  console.log("same_changed_rail_public_409_byte_equivalent=true");
  console.log("synthetic_sidecar_and_request_journal_0700_0600=true");
  console.log("strict_durable_history_fails_closed=true");
  console.log("real_install_or_full_index_bootstrap_exercised=false");
  console.log("economic_quote_and_launch_authority_synthetic=true");
  console.log("external_network_calls=false");
  console.log("real_buyer_record_access=false");
  console.log("wallet_or_signer_access=false");
  console.log("presale_wc_void_activation=false");
  console.log("funds_moved=false");
} finally {
  if (savedDir === undefined) delete process.env.VOID_BUY_REQUEST_DIR;
  else process.env.VOID_BUY_REQUEST_DIR = savedDir;
  fs.rmSync(tmp, { recursive: true, force: true });
}
