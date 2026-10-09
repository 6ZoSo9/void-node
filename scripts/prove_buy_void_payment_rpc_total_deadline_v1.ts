import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";

import {
  VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1,
  createBuyVoidPaymentHttpTransportV1,
} from "../src/economic/buy_void_payment_rpc_observer_v1.js";

const EXPECTED_SOURCE_BLOB =
  "06e31412e893fd18f5675ea1420f1fa2e6139fba";

function gitBlob(bytes: Buffer): string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

const sourcePath =
  "src/economic/buy_void_payment_rpc_observer_v1.ts";
const sourceBytes = await import("node:fs").then((fs) =>
  fs.readFileSync(sourcePath));
assert.equal(
  gitBlob(sourceBytes),
  EXPECTED_SOURCE_BLOB,
  "exact payment RPC observer source drift",
);

const authority = VOID_BUY_VOID_PAYMENT_RPC_OBSERVER_AUTHORITY_V1;
assert.equal(authority.rpc_read, true);
assert.equal(authority.rpc_write, false);
assert.equal(authority.inactivity_timeout_bounded, true);
assert.equal(authority.total_request_deadline_bounded, true);
assert.equal(authority.strict_json_content_type_required, true);
assert.equal(authority.wallet_access, false);
assert.equal(authority.signing, false);
assert.equal(authority.transaction_broadcast, false);
assert.equal(authority.filesystem_write, false);
assert.equal(authority.runtime_route_mount, false);
assert.equal(authority.money_movement, false);

type Mode = "valid" | "jsonp" | "wrong-id" | "oversize" | "aborted" | "drip";
let mode: Mode = "valid";
let requestCount = 0;
let dripTicks = 0;

const server = http.createServer((req, res) => {
  requestCount += 1;
  let input = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    input += chunk;
  });
  req.on("end", () => {
    let parsed: any;
    try {
      parsed = JSON.parse(input);
    } catch {
      res.writeHead(400, {"content-type": "application/json"});
      res.end("{}");
      return;
    }

    if (mode === "jsonp") {
      res.writeHead(200, {"content-type": "application/jsonp"});
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: parsed.id,
        result: "0x2105",
      }));
      return;
    }

    if (mode === "wrong-id") {
      res.writeHead(200, {"content-type": "application/json"});
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: Number(parsed.id) + 1,
        result: "0x2105",
      }));
      return;
    }

    if (mode === "oversize") {
      res.writeHead(200, {"content-type": "application/json"});
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: parsed.id,
        result: "x".repeat(512),
      }));
      return;
    }

    if (mode === "aborted") {
      res.writeHead(200, {"content-type": "application/json"});
      res.write('{"jsonrpc":"2.0"');
      setTimeout(() => res.destroy(), 20).unref?.();
      return;
    }

    if (mode === "drip") {
      res.writeHead(200, {"content-type": "application/json"});
      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: parsed.id,
        result: "0x2105",
      });
      let index = 0;
      const timer = setInterval(() => {
        if (index >= body.length) {
          clearInterval(timer);
          res.end();
          return;
        }
        dripTicks += 1;
        res.write(body[index]);
        index += 1;
      }, 20);
      timer.unref?.();
      res.once("close", () => clearInterval(timer));
      return;
    }

    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      id: parsed.id,
      result: "0x2105",
    }));
  });
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve());
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = "http://127.0.0.1:" + String(address.port) + "/rpc";

  const transport = createBuyVoidPaymentHttpTransportV1({
    enabled: true,
    source_chain: "base",
    chain_id: 8453,
    rpc_url: url,
    timeout_ms: 300,
    max_response_bytes: 128,
  });
  assert.equal("reason" in transport, false);
  if ("reason" in transport) {
    throw new Error("loopback transport unexpectedly held");
  }

  mode = "valid";
  assert.equal(
    await transport.call({method: "eth_chainId", params: []}),
    "0x2105",
  );

  mode = "jsonp";
  await assert.rejects(
    () => transport.call({method: "eth_chainId", params: []}),
    /payment_observer_rpc_content_type_invalid/u,
  );

  mode = "wrong-id";
  await assert.rejects(
    () => transport.call({method: "eth_chainId", params: []}),
    /payment_observer_rpc_envelope_mismatch/u,
  );

  mode = "oversize";
  await assert.rejects(
    () => transport.call({method: "eth_chainId", params: []}),
    /payment_observer_rpc_response_too_large/u,
  );

  mode = "aborted";
  await assert.rejects(
    () => transport.call({method: "eth_chainId", params: []}),
    /payment_observer_rpc_response_aborted/u,
  );

  mode = "drip";
  const started = Date.now();
  await assert.rejects(
    () => transport.call({method: "eth_chainId", params: []}),
    /payment_observer_rpc_deadline_exceeded/u,
  );
  const elapsed = Date.now() - started;
  assert.ok(
    elapsed < 2_000,
    "total deadline failed to bound drip-feed RPC",
  );
  assert.ok(
    dripTicks >= 2,
    "drip fixture did not exercise active response traffic",
  );

  assert.equal(requestCount, 6);

  console.log("VOID_BUY_VOID_PAYMENT_RPC_TOTAL_DEADLINE_V1_GREEN");
  console.log("observer_source_blob=" + EXPECTED_SOURCE_BLOB);
  console.log("valid_json_rpc_response_preserved=true");
  console.log("application_jsonp_rejected=true");
  console.log("wrong_json_rpc_id_rejected=true");
  console.log("oversize_response_rejected=true");
  console.log("premature_response_abort_rejected=true");
  console.log("drip_feed_total_deadline_enforced=true");
  console.log("inactivity_timeout_only=false");
  console.log("external_rpc_contact=false");
  console.log("loopback_fixture_only=true");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_broadcast=false");
  console.log("runtime_service_mutation=false");
  console.log("funds_moved=false");
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
