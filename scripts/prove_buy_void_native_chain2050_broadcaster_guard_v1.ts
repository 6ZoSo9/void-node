import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const modulePath = path.join(
  root,
  "src/economic/buy_void_native_chain2050_broadcaster_v1.ts",
);
const behaviorProofPath = path.join(
  root,
  "scripts/prove_buy_void_native_chain2050_broadcaster_v1.ts",
);
const docsPath = path.join(
  root,
  "docs/operators/buy-void-native-chain2050-broadcaster-contract-v1.md",
);
const indexPath = path.join(root, "src/index.ts");
const runtimePath = path.join(
  root,
  "src/economic/buy_void_native_delivery_runtime_integration_v1.ts",
);

for (const file of [
  modulePath,
  behaviorProofPath,
  docsPath,
  indexPath,
  runtimePath,
]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleText = fs.readFileSync(modulePath, "utf8");
const behaviorProof = fs.readFileSync(behaviorProofPath, "utf8");
const docs = fs.readFileSync(docsPath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");

for (const marker of [
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_AUTHORITY_V1",
  "expected_chain_id: 2050",
  "loopback_http_only: true",
  "startup_chain_identity_probe_required: true",
  "per_broadcast_chain_identity_probe_required: true",
  "eth_send_raw_transaction_only_mutation: true",
  "transaction_signing: false",
  "wallet_access: false",
  "secret_access: false",
  "environment_read: false",
  "filesystem_read: false",
  "filesystem_write: false",
  "runtime_route_mount: false",
  "dependency_injection: false",
  "automatic_retry: false",
  "receipt_wait: false",
  "raw_signed_transaction_persistence: false",
  "raw_signed_transaction_output: false",
  "redirect_follow: false",
  "proxy_use: false",
  '"eth_chainId"',
  '"eth_sendRawTransaction"',
  'hostname: "127.0.0.1" | "::1"',
  'url.protocol !== "http:"',
  'url.username || url.password',
  'url.search || url.hash',
  "Transaction.from(raw)",
  "transaction.chainId !== policy.expected_chain_id",
  "returnedHash !== expectedHash",
  "normalizeTransportResult",
  '"transport_result_boundary_invalid"',
  "Object.prototype.hasOwnProperty.call",
  "record.ok === true",
  "record.ok === false",
  'input.method === "eth_sendRawTransaction"',
  "providerRaw !== safeProviderSubmissionId(providerRaw)",
  '"reason" in startupProbe',
  '"reason" in liveProbe',
  "agent: false",
  'Connection: "close"',
]) {
  assert.equal(moduleText.includes(marker), true, marker);
}

for (const forbidden of [
  "process.env",
  'from "node:fs"',
  'from "node:child_process"',
  "writeFile",
  "appendFile",
  "createWriteStream",
  "readFile",
  "new Wallet",
  "Wallet.fromPhrase",
  "sendTransaction(",
  "eth_getTransactionReceipt",
  "eth_getTransactionCount",
  "eth_getBalance",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "setInterval(",
  "console.log",
  "console.error",
  "systemctl",
  "app.get(",
  "app.post(",
  "express",
  "NODE_PRIVKEY_PATH",
]) {
  assert.equal(moduleText.includes(forbidden), false, forbidden);
}

assert.equal(
  moduleText.includes("localhost"),
  false,
  "DNS-resolved localhost must not be accepted",
);
assert.equal(
  (moduleText.match(/"eth_sendRawTransaction"/g) || []).length >= 2,
  true,
);
assert.equal(
  (moduleText.match(/"eth_chainId"/g) || []).length >= 2,
  true,
);
assert.equal(
  moduleText.indexOf("const liveProbe") <
    moduleText.indexOf('method: "eth_sendRawTransaction"'),
  true,
  "per-broadcast chain identity must precede mutation",
);
assert.equal(
  moduleText.indexOf("Transaction.from(raw)") <
    moduleText.indexOf("const liveProbe"),
  true,
  "signed transaction validation must precede live probe",
);
assert.equal(
  moduleText.indexOf("returnedHash !== expectedHash") >
    moduleText.indexOf('method: "eth_sendRawTransaction"'),
  true,
  "returned hash binding must follow provider response",
);

assert.equal(
  (moduleText.match(/normalizeTransportResult\(input, response\)/g) || [])
    .length,
  1,
  "all injected transport returns must cross the runtime result validator",
);
assert.equal(
  moduleText.indexOf("const response: unknown = await transport.call(input)") <
    moduleText.indexOf("return normalizeTransportResult(input, response)"),
  true,
  "transport result validation must occur immediately after the injected call",
);
assert.equal(
  moduleText.includes('error_code: "transport_result_boundary_invalid"'),
  true,
  "malformed injected results must become a fail-closed held result",
);
assert.equal(
  moduleText.includes('"reason" in startupProbe'),
  true,
  "startup probe union must narrow to held before returning",
);
assert.equal(
  moduleText.includes('"reason" in liveProbe'),
  true,
  "live probe union must narrow to held before reading held fields",
);

for (const forbiddenMount of [
  "buy_void_native_chain2050_broadcaster_v1",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1",
]) {
  assert.equal(index.includes(forbiddenMount), false, forbiddenMount);
  assert.equal(runtime.includes(forbiddenMount), false, forbiddenMount);
}

for (const marker of [
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_CONTRACT_V1",
  "Uninjected and unmounted",
  "Chain ID 2050",
  "Loopback IP literals only",
  "No signing",
  "No secret access",
  "No automatic retry",
  "No receipt wait",
  "No raw transaction persistence",
  "Exact returned transaction hash",
]) {
  assert.equal(docs.includes(marker), true, marker);
}

assert.equal(
  behaviorProof.includes(
    "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_V1_GREEN",
  ),
  true,
);
assert.equal(
  behaviorProof.includes('"eth_chainId"'),
  true,
);
assert.equal(
  behaviorProof.includes('"eth_sendRawTransaction"'),
  true,
);
assert.equal(
  behaviorProof.includes("submission_may_have_occurred"),
  true,
);
assert.equal(
  behaviorProof.includes("transport_result_boundary_invalid"),
  true,
);
assert.equal(
  behaviorProof.includes("bad provider id!"),
  true,
);
assert.equal(
  behaviorProof.includes("malformed transport result accepted"),
  true,
);

console.log(
  "VOID_BUY_VOID_NATIVE_CHAIN2050_BROADCASTER_GUARD_V1_GREEN",
);
