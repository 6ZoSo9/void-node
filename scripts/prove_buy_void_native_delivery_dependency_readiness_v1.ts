import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";
import {
  probeBuyVoidNativeDeliveryDependencyReadinessV1,
  VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1,
} from "../src/economic/buy_void_native_delivery_dependency_readiness_v1.js";
import {
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";

async function listen(
  chainId: string,
): Promise<{
  url: string;
  methods: string[];
  close: () => Promise<void>;
}> {
  const methods: string[] = [];
  const server = http.createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      let body: Record<string, any> = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        body = {};
      }
      methods.push(String(body.method || ""));
      response.writeHead(200, { "content-type": "application/json" });
      if (body.method === "eth_chainId") {
        response.end(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: chainId,
        }));
        return;
      }
      response.end(JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: "method not allowed" },
      }));
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("proof server address unavailable");
  }
  return {
    url: `http://127.0.0.1:${address.port}/`,
    methods,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-native-readiness-v1-"),
);
fs.chmodSync(root, 0o700);
const wallet = Wallet.createRandom();
const credential = path.join(
  root,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
);
fs.writeFileSync(credential, `${wallet.privateKey}\n`, { mode: 0o400 });
fs.chmodSync(credential, 0o400);

const goodRpc = await listen("0x802");
const badRpc = await listen("0x1");

try {
  const disabled =
    await probeBuyVoidNativeDeliveryDependencyReadinessV1({
      probe: false,
      confirmation: "",
      credentials_directory: "/path/that/must/not/be/read",
      expected_wallet_address: "not-an-address",
      rpc_url: "http://not-a-loopback.invalid/",
    });
  assert.equal(disabled.ok, false);
  if (disabled.ok) throw new Error("expected disabled decision");
  assert.equal(disabled.status, "disabled");
  assert.equal(disabled.reason, "readiness_probe_not_requested");
  assert.equal(disabled.credential_read_performed, false);
  assert.equal(disabled.chain_identity_probe_performed, false);

  const unconfirmed =
    await probeBuyVoidNativeDeliveryDependencyReadinessV1({
      probe: true,
      confirmation: "wrong-confirmation",
      credentials_directory: root,
      expected_wallet_address: wallet.address,
      rpc_url: goodRpc.url,
    });
  assert.equal(unconfirmed.ok, false);
  if (unconfirmed.ok) throw new Error("expected confirmation hold");
  assert.equal(
    unconfirmed.reason,
    "readiness_probe_confirmation_mismatch",
  );
  assert.equal(unconfirmed.credential_read_performed, false);
  assert.deepEqual(goodRpc.methods, []);

  const ready =
    await probeBuyVoidNativeDeliveryDependencyReadinessV1({
      probe: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1,
      credentials_directory: root,
      expected_wallet_address: wallet.address,
      rpc_url: goodRpc.url,
    });
  assert.equal(ready.ok, true);
  if ("reason" in ready) throw new Error(String(ready.reason));
  assert.equal(ready.status, "ready");
  assert.equal(ready.chain_id, "2050");
  assert.match(ready.wallet_address_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(ready.rpc_url_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(ready.credential_read_performed, true);
  assert.equal(ready.chain_identity_probe_performed, true);
  assert.equal(ready.signing_performed, false);
  assert.equal(ready.transaction_broadcast_performed, false);
  assert.equal(ready.dependency_assignment_performed, false);
  assert.equal(ready.runtime_enablement_performed, false);
  assert.equal(ready.money_movement, false);
  assert.deepEqual(goodRpc.methods, ["eth_chainId"]);

  const wrongWallet = Wallet.createRandom();
  const mismatch =
    await probeBuyVoidNativeDeliveryDependencyReadinessV1({
      probe: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1,
      credentials_directory: root,
      expected_wallet_address: wrongWallet.address,
      rpc_url: goodRpc.url,
    });
  assert.equal(mismatch.ok, false);
  if (mismatch.ok) throw new Error("expected wallet mismatch hold");
  assert.equal(
    mismatch.reason,
    "signer_credential_wallet_address_mismatch",
  );
  assert.equal(mismatch.credential_read_performed, true);
  assert.equal(mismatch.chain_identity_probe_performed, false);
  assert.deepEqual(goodRpc.methods, ["eth_chainId"]);

  const wrongChain =
    await probeBuyVoidNativeDeliveryDependencyReadinessV1({
      probe: true,
      confirmation:
        VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1,
      credentials_directory: root,
      expected_wallet_address: wallet.address,
      rpc_url: badRpc.url,
    });
  assert.equal(wrongChain.ok, false);
  if (wrongChain.ok) throw new Error("expected chain mismatch hold");
  assert.equal(
    wrongChain.reason,
    "broadcaster_chain_identity_mismatch",
  );
  assert.equal(wrongChain.credential_read_performed, true);
  assert.equal(wrongChain.chain_identity_probe_performed, true);
  assert.deepEqual(badRpc.methods, ["eth_chainId"]);

  assert.equal(
    VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1
      .transaction_signing,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1
      .dependency_assignment,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1
      .money_movement,
    false,
  );

  console.log(
    "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1_GREEN",
  );
  console.log("disabled_zero_read=1");
  console.log("exact_confirmation_required=1");
  console.log("credential_address_match=1");
  console.log("chain2050_identity_read=1");
  console.log("rpc_methods=eth_chainId");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("dependency_assignment=0");
  console.log("runtime_enablement=0");
  console.log("money_movement=0");
} finally {
  await goodRpc.close();
  await badRpc.close();
  fs.rmSync(root, { recursive: true, force: true });
}
