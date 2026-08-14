import assert from "node:assert/strict";
import fs from "node:fs";
import * as http from "node:http";
import os from "node:os";
import path from "node:path";
import { Interface } from "ethers";
import {
  VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1,
  createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1,
} from "../src/economic/buy_void_erc20_chain2050_broadcaster_v1.js";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1,
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1,
  createBuyVoidErc20DeliveryDependencyBootstrapV1,
} from "../src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.js";

const walletAddress =
  "0x1111111111111111111111111111111111111111";
const tokenAddress =
  "0x3333333333333333333333333333333333333333";
const recipient =
  "0x2222222222222222222222222222222222222222";
const transferInterface = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);
const transferData = transferInterface.encodeFunctionData(
  "transfer",
  [recipient, 2_500_000_000_000_000_000_000n],
);

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-erc20-dependency-bootstrap-v1-"),
);
const credentialsDirectory = path.join(tmp, "credentials");
const submissionGuardRoot = path.join(tmp, "submission-guard");
const unusedRpcUrl = "http://127.0.0.1:65534/";

const composition =
  createBuyVoidErc20DeliveryDependencyBootstrapV1({
    enabled: true,
    credentials_directory: credentialsDirectory,
    fulfillment_wallet_address: walletAddress,
    void_token_address: tokenAddress,
    submission_guard_root_dir: submissionGuardRoot,
    rpc_url: unusedRpcUrl,
    request_timeout_ms: 1_000,
    max_response_bytes: 65_536,
  });

assert.equal(composition.ok, true);
if ("reason" in composition) throw new Error(String(composition.reason));
assert.equal(
  composition.marker,
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1,
);
assert.equal(composition.chain_id, "2050");
assert.equal(composition.fulfillment_wallet_address, walletAddress);
assert.equal(composition.void_token_address, tokenAddress);
assert.equal(composition.credential_read_performed, false);
assert.equal(composition.rpc_call_performed, false);
assert.equal(composition.signing_performed, false);
assert.equal(composition.transaction_broadcast_performed, false);
assert.equal(composition.money_movement_performed, false);
assert.equal(fs.existsSync(credentialsDirectory), false);
assert.equal(fs.existsSync(submissionGuardRoot), false);

assert.equal(
  await composition.dependencies.signer.get_address(),
  walletAddress,
);
assert.equal(fs.existsSync(credentialsDirectory), false);
assert.equal(fs.existsSync(submissionGuardRoot), false);

const unsigned = {
  type: 2 as const,
  chainId: 2050n,
  nonce: 7,
  gasLimit: 60_000n,
  maxFeePerGas: 150n,
  maxPriorityFeePerGas: 10n,
  to: tokenAddress,
  value: 0n as const,
  data: transferData,
};

// The malformed transaction must fail before the credential factory is touched.
// This intentionally proves the pre-credential wall without performing signing.
await assert.rejects(
  () =>
    composition.dependencies.signer.sign_transaction({
      ...unsigned,
      value: 1n as any,
    }),
  /erc20_dependency_unsigned_transaction_invalid/,
);
assert.equal(fs.existsSync(credentialsDirectory), false);
assert.equal(fs.existsSync(submissionGuardRoot), false);

const invalidBroadcast =
  await composition.dependencies.broadcaster.broadcast_signed_transaction(
    "0xdeadbeef",
  );
assert.equal(invalidBroadcast.accepted, false);
assert.equal(invalidBroadcast.submission_may_have_occurred, false);
assert.equal(
  invalidBroadcast.provider_submission_id,
  "erc20-chain2050-local-transaction-invalid",
);

const disabled =
  createBuyVoidErc20DeliveryDependencyBootstrapV1({
    enabled: false,
    credentials_directory: credentialsDirectory,
    fulfillment_wallet_address: walletAddress,
    void_token_address: tokenAddress,
    submission_guard_root_dir: submissionGuardRoot,
    rpc_url: unusedRpcUrl,
  });
assert.equal(disabled.ok, false);
assert.equal(
  "reason" in disabled ? disabled.reason : "",
  "erc20_delivery_dependency_bootstrap_disabled",
);

let slowDripChunks = 0;
const slowDripServer = http.createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    response.writeHead(200, { "content-type": "application/json" });
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: 91,
      result: "0x802",
    });
    let offset = 0;
    const interval = setInterval(() => {
      if (offset >= payload.length) {
        clearInterval(interval);
        response.end();
        return;
      }
      response.write(payload.slice(offset, offset + 1));
      offset += 1;
      slowDripChunks += 1;
    }, 20);
    response.on("close", () => clearInterval(interval));
  });
});

await new Promise<void>((resolve, reject) => {
  slowDripServer.once("error", reject);
  slowDripServer.listen(0, "127.0.0.1", resolve);
});
try {
  const address = slowDripServer.address();
  assert.ok(address && typeof address === "object");
  const transport =
    createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1();
  const timeoutMs = 120;
  const started = Date.now();
  const result = await transport.call({
    rpc_url: `http://127.0.0.1:${address.port}/`,
    method: "eth_chainId",
    params: [],
    request_id: 91,
    request_timeout_ms: timeoutMs,
    max_response_bytes: 65_536,
  });
  const elapsed = Date.now() - started;
  assert.equal(result.ok, false);
  assert.equal(
    "error_code" in result ? result.error_code : "",
    "erc20_chain2050_transport_total_deadline_exceeded",
  );
  assert.ok(slowDripChunks >= 2);
  assert.ok(elapsed >= timeoutMs - 40);
  assert.ok(elapsed < timeoutMs + 1_000);
} finally {
  await new Promise<void>((resolve, reject) => {
    slowDripServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const parentSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src",
    "economic",
    "buy_void_runtime_integration_v1.ts",
  ),
  "utf8",
);
assert.match(
  parentSource,
  /canonical_delivery_dependency_bootstrap_ready:\s*false/,
);
assert.doesNotMatch(
  parentSource,
  /from "\.\/buy_void_erc20_delivery_dependency_bootstrap_v1\.js"/,
);
assert.doesNotMatch(
  parentSource,
  /import "\.\/buy_void_erc20_delivery_dependency_bootstrap_v1\.js";/,
);

assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1
    .composition_time_credential_read,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1
    .composition_time_rpc_call,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1
    .composition_time_signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1
    .composition_time_transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1
    .total_wall_clock_deadline,
  true,
);

fs.rmSync(tmp, { recursive: true, force: true });

console.log(
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1_PROOF_GREEN",
);
console.log("canonical_chain_id=2050");
console.log("canonical_asset=void_token_erc20");
console.log("composition_time_credential_read=false");
console.log("composition_time_rpc_call=false");
console.log("composition_time_signing=false");
console.log("composition_time_transaction_broadcast=false");
console.log("composition_time_money_movement=false");
console.log("precredential_erc20_validation=true");
console.log("rpc_total_deadline_enforced=true");
console.log("valid_sign_transaction_invoked=false");
console.log("valid_broadcast_dependency_invoked=false");
console.log("real_transaction_broadcast=false");
console.log("canonical_parent_mount=false");
console.log("canonical_dependency_bootstrap_readiness_flipped=false");
