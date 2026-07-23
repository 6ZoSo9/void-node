import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  Wallet,
} from "ethers";
import {
  configureBuyVoidNativeDeliveryRuntimeDependenciesV1,
  VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1,
} from "../src/economic/buy_void_native_delivery_runtime_dependencies_v1.js";
import {
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
} from "../src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.js";

async function listen(
  chainId: string,
): Promise<{
  url: string;
  close: () => Promise<void>;
  methods: string[];
}> {
  const methods: string[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      let body: any = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {}
      methods.push(String(body?.method || ""));
      res.writeHead(200, { "content-type": "application/json" });
      if (body?.method === "eth_chainId") {
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: chainId,
        }));
        return;
      }
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        id: body?.id,
        error: { code: -32601, message: "method not allowed in proof" },
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
  path.join(os.tmpdir(), "void-buy-native-deps-v1-"),
);
const wallet = Wallet.createRandom();
const credential = path.join(
  root,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
);
fs.writeFileSync(credential, wallet.privateKey, { mode: 0o400 });
fs.chmodSync(credential, 0o400);

const goodRpc = await listen("0x802");
const badRpc = await listen("0x1");

try {
  const disabledTarget: Record<string, any> = {};
  const disabled =
    await configureBuyVoidNativeDeliveryRuntimeDependenciesV1({
      enabled: false,
      credentials_directory: "",
      expected_wallet_address: "",
      rpc_url: "",
      target_global: disabledTarget,
    });
  assert.equal(disabled.ok, false);
  if (!("reason" in disabled)) throw new Error("expected disabled hold");
  assert.equal(disabled.status, "disabled");
  assert.equal(disabled.reason, "dependency_injector_disabled");
  assert.equal(
    disabledTarget[
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1
    ],
    undefined,
  );

  const readyTarget: Record<string, any> = {};
  const ready =
    await configureBuyVoidNativeDeliveryRuntimeDependenciesV1({
      enabled: true,
      credentials_directory: root,
      expected_wallet_address: wallet.address,
      rpc_url: goodRpc.url,
      target_global: readyTarget,
    });
  assert.equal(ready.ok, true);
  if ("reason" in ready) throw new Error(ready.reason);
  assert.equal(
    typeof ready.dependencies.signer.sign_transaction,
    "function",
  );
  assert.equal(
    typeof ready.dependencies.broadcaster.broadcast_signed_transaction,
    "function",
  );
  assert.equal(
    readyTarget[
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1
    ],
    ready.dependencies,
  );
  assert.deepEqual(goodRpc.methods, ["eth_chainId"]);

  const mismatchTarget: Record<string, any> = {};
  const mismatch =
    await configureBuyVoidNativeDeliveryRuntimeDependenciesV1({
      enabled: true,
      credentials_directory: root,
      expected_wallet_address: wallet.address,
      rpc_url: badRpc.url,
      target_global: mismatchTarget,
    });
  assert.equal(mismatch.ok, false);
  if (!("reason" in mismatch)) throw new Error("expected mismatch hold");
  assert.equal(mismatch.reason, "broadcaster_chain_identity_mismatch");
  assert.equal(
    mismatchTarget[
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_GLOBAL_V1
    ],
    undefined,
  );
  assert.deepEqual(badRpc.methods, ["eth_chainId"]);

  console.log(
    "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1_GREEN",
  );
} finally {
  await goodRpc.close();
  await badRpc.close();
  fs.rmSync(root, { recursive: true, force: true });
}
