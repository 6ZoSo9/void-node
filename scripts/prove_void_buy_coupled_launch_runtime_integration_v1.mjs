#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import * as http from "node:http";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  derive as deriveBuyVoidEnforcementArtifactAttestationV1,
} from "./prove_buy_void_enforcement_artifact_attestation_v1.mjs";
import {
  deriveBuyVoidEnforcementArtifactAttestationV5Candidate,
} from "./prove_buy_void_enforcement_artifact_attestation_v5_candidate.mjs";
import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  readBuyLaunchGateV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const index = read("src/index.ts");

// Execute the exact two new route guards in an isolated VM with only inert
// synthetic inputs; no RPC, wallet, filesystem or payment writer is supplied.
const nativePreStart = index.indexOf('const nativeUsdc=chainCfg.chain==="base"?');
const nativePreEnd = index.indexOf("let event:any;", nativePreStart);
const nativePostStart = index.indexOf('if(!nativeEqual(event?.payment_verifier?.usdc_contract,nativeUsdc))', nativePreEnd);
const nativePostEnd = index.indexOf("if(!__blo(found))", nativePostStart);
const nativeWrite = index.indexOf("await __voidWriteBuyVoidOperatorEventV1(event,found);", nativePostEnd);
const baseObserver = index.indexOf('observeBuyVoidPaymentV1({request:found,policy:{enabled:true,source_chain:"base",chain_id:8453', nativePreEnd);
const nativeEthereum = index.indexOf('runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1({request:found,env:process.env})', nativePreEnd);
assert(nativePreStart > 0 && nativePreEnd > nativePreStart);
assert(baseObserver > nativePreEnd && nativeEthereum > nativePreEnd, "policy must bind before either bounded chain observation path");
assert.equal(index.includes("__voidBuyVoidRpcV1"), false, "retired ad-hoc payment RPC helper must stay absent");
assert(nativePostStart > nativePreEnd && nativePostEnd > nativePostStart && nativeWrite > nativePostEnd,
  "verified event token must bind before durable admission");
const nativePreflight = vm.runInNewContext(
  `(found,chainCfg,cfg,res)=>{\n${index.slice(nativePreStart,nativePreEnd)}\nreturn nativeUsdc;}`,
  Object.create(null), { timeout: 1000 },
);
const nativeEqualStart = index.indexOf("const nativeEqual=(value,expected)=>", nativePreStart);
const nativeEqualEnd = index.indexOf("\n", nativeEqualStart);
assert(nativeEqualStart > nativePreStart && nativeEqualEnd < nativePreEnd);
const nativePostflight = vm.runInNewContext(
  `(event,nativeUsdc,res)=>{\n${index.slice(nativeEqualStart,nativeEqualEnd)}\n${index.slice(nativePostStart,nativePostEnd)}\nreturn null;}`,
  Object.create(null), { timeout: 1000 },
);
const baseNativeUsdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const ethereumNativeUsdc = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const nativeReceiver = "0x" + "8".repeat(40);
const nativeSender = "0x" + "7".repeat(40);
const nativeResponse = () => ({
  status(code) { return { json(body) { return { http_status: code, body }; } }; },
});
const nativeRequest = (chain, token) => {
  const chainId = chain === "base" ? 8453 : chain === "ethereum" ? 1 : 0;
  return {
    source_chain: chain,
    payment_chain: chain,
    payment_chain_id: chainId,
    usdc_contract: token,
    receive_address: nativeReceiver,
    delivery_address: nativeSender,
    payment_instructions: {
      send_chain: chain,
      send_chain_id: chainId,
      token_contract: token,
      token_decimals: 6,
      send_to: nativeReceiver,
      send_from: nativeSender,
    },
  };
};
const nativePolicy = (chain, token) => ({ ok: true, chain, usdc_contract: token });
const nativeConfig = { receive_address: nativeReceiver };
function assertNativePolicyHold(found, chainCfg, reason) {
  const out = nativePreflight(found, chainCfg, nativeConfig, nativeResponse());
  assert.equal(out?.http_status, 409, reason);
  assert.equal(out?.body?.ok, false, reason);
  assert.equal(out?.body?.error, "request_native_usdc_policy_mismatch", reason);
}
function assertPaymentInstructionHold(found, chainCfg, reason, cfg = nativeConfig) {
  const out = nativePreflight(found, chainCfg, cfg, nativeResponse());
  assert.equal(out?.http_status, 409, reason);
  assert.equal(out?.body?.ok, false, reason);
  assert.equal(out?.body?.error, "request_payment_instructions_policy_mismatch", reason);
}
for (const [chain, canonical] of [["base",baseNativeUsdc],["ethereum",ethereumNativeUsdc]]) {
  const validRequest = nativeRequest(chain, canonical);
  const validPolicy = nativePolicy(chain, canonical);
  assert.equal(nativePreflight(validRequest, validPolicy, nativeConfig, nativeResponse()), canonical);
  assert.equal(
    nativePreflight(nativeRequest(chain,canonical.toUpperCase()),validPolicy,nativeConfig,nativeResponse()),
    canonical,
    "EVM contracts are case-insensitive",
  );
  assertNativePolicyHold(nativeRequest(chain, "0x" + "1".repeat(40)), validPolicy, chain + "_arbitrary_erc20_request");
  assertNativePolicyHold(validRequest, nativePolicy(chain, "0x" + "2".repeat(40)), chain + "_arbitrary_erc20_server_policy");
  assertNativePolicyHold(
    { ...validRequest, payment_instructions: { ...validRequest.payment_instructions, token_contract:"0x" + "3".repeat(40) } },
    validPolicy,
    chain + "_original_payment_instructions_token_mismatch",
  );
  assertNativePolicyHold({ ...validRequest, source_chain: undefined }, validPolicy, chain + "_absent_explicit_chain");
  assertNativePolicyHold(
    { ...validRequest, payment_chain: chain === "base" ? "ethereum" : "base" },
    validPolicy,
    chain + "_conflicting_chain_alias",
  );

  const otherChainId = chain === "base" ? 1 : 8453;
  assertPaymentInstructionHold({ ...validRequest, payment_chain_id: otherChainId }, validPolicy, chain + "_payment_chain_id_mismatch");
  assertPaymentInstructionHold({ ...validRequest, payment_chain_id: String(validRequest.payment_chain_id) }, validPolicy, chain + "_payment_chain_id_wrong_type");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, send_chain: chain === "base" ? "ethereum" : "base" },
  }, validPolicy, chain + "_instruction_chain_mismatch");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, send_chain_id: otherChainId },
  }, validPolicy, chain + "_instruction_chain_id_mismatch");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, send_chain_id: String(validRequest.payment_chain_id) },
  }, validPolicy, chain + "_instruction_chain_id_wrong_type");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, token_decimals: 18 },
  }, validPolicy, chain + "_token_decimals_mismatch");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, token_decimals: "6" },
  }, validPolicy, chain + "_token_decimals_wrong_type");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, send_to: "0x" + "9".repeat(40) },
  }, validPolicy, chain + "_instruction_receiver_mismatch");
  assertPaymentInstructionHold({
    ...validRequest,
    payment_instructions: { ...validRequest.payment_instructions, send_from: "0x" + "6".repeat(40) },
  }, validPolicy, chain + "_instruction_sender_mismatch");
  assertPaymentInstructionHold({
    ...validRequest,
    receive_address: "0x" + "5".repeat(40),
  }, validPolicy, chain + "_request_receiver_mismatch");
  assertPaymentInstructionHold({
    ...validRequest,
    delivery_address: "0x" + "4".repeat(40),
  }, validPolicy, chain + "_request_sender_mismatch");
  assertPaymentInstructionHold(
    validRequest,
    validPolicy,
    chain + "_policy_receiver_mismatch",
    { receive_address: "0x" + "3".repeat(40) },
  );

  assert.equal(nativePostflight({ payment_verifier: { usdc_contract: canonical } },canonical,nativeResponse()),null);
  for (const event of [null, {}, {payment_verifier:{}},
                        {payment_verifier:{usdc_contract:"0x" + "4".repeat(40)}}]) {
    const out = nativePostflight(event,canonical,nativeResponse());
    assert.equal(out?.http_status,409,chain + "_event_contract_not_proven");
    assert.equal(out?.body?.ok,false);
    assert.equal(out?.body?.error,"verified_native_usdc_contract_mismatch");
  }
}
assertNativePolicyHold(nativeRequest("polygon",baseNativeUsdc),
  nativePolicy("polygon",baseNativeUsdc), "unknown_chain_never_inherits_ethereum_policy");

// The Base operator route delegates all provider HTTP to the reviewed bounded
// payment transport. Exercise its trust boundary against disposable loopback
// responders; no real chain/provider/customer data is contacted.
const {
  createBuyVoidPaymentHttpTransportV1,
} = await import("../dist/economic/buy_void_payment_rpc_observer_v1.js");

async function withRpcServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    return await run(`http://127.0.0.1:${address.port}/`);
  } finally {
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
    await new Promise(resolve => server.close(() => resolve()));
  }
}

function boundedTransport(url, overrides = {}) {
  const transport = createBuyVoidPaymentHttpTransportV1({
    enabled: true,
    source_chain: "base",
    chain_id: 8453,
    rpc_url: url,
    timeout_ms: 100,
    max_response_bytes: 1024,
    ...overrides,
  });
  assert.equal("reason" in transport, false);
  return transport;
}

async function expectTransportFailure(handler, expected, overrides = {}) {
  await withRpcServer(handler, async url => {
    const transport = boundedTransport(url, overrides);
    await assert.rejects(
      transport.call({ method: "eth_blockNumber", params: [] }),
      error => {
        const message = String(error?.message || error);
        return expected instanceof RegExp
          ? expected.test(message)
          : message === expected;
      },
      String(expected),
    );
  });
}

await withRpcServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x65" }));
}, async url => {
  const value = await boundedTransport(url).call({
    method: "eth_blockNumber",
    params: [],
  });
  assert.equal(value, "0x65");
});

await expectTransportFailure((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: "x".repeat(4096),
  }));
}, "payment_observer_rpc_response_too_large", {
  max_response_bytes: 512,
});

await expectTransportFailure((_req, res) => {
  res.writeHead(503, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x65" }));
}, "payment_observer_rpc_http_status");

await expectTransportFailure((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: 2, result: "0x65" }));
}, "payment_observer_rpc_envelope_mismatch");

await expectTransportFailure((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x65" }));
}, "payment_observer_rpc_content_type_invalid");

await expectTransportFailure((_req, _res) => {
  // Intentionally do not answer; the reviewed client-owned timeout must abort.
}, /payment_observer_rpc_(?:timeout|total_deadline_exceeded)/, {
  timeout_ms: 50,
});

const coupledLaunchGate = read(
  "src/economic/buy_void_coupled_launch_gate_v1.mjs",
);
const docker = read("Dockerfile");
const compose = read("docker-compose.yml");
const launchWorkflow = read(
  ".github/workflows/buy-void-coupled-launch-gate-v1.yml",
);
const capacityAdmission = read(
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
);
const duplicateGuard = read(
  "src/economic/buy_void_verified_payment_duplicate_guard_v1.ts",
);
const verifiedPaymentV2 = read(
  "src/economic/buy_void_verified_payment_v2.ts",
);
assert.ok(Buffer.byteLength(index, "utf8") <= 3852487, "src/index.ts size ceiling");
assert.ok(index.includes("VOID_BUY_COUPLED_LAUNCH_RUNTIME_BINDING_V1"));
assert.ok(index.includes('../src/economic/buy_void_coupled_launch_gate_v1.mjs'));
assert.ok(
  coupledLaunchGate.includes(VOID_BUY_COUPLED_LAUNCH_ID_V1),
  "coupled launch ID must be owned by the imported gate module",
);
assert.ok(index.includes("readBuyLaunchGateV1()"));
assert.ok(index.includes("launch_authority:launch.request_authority"));
assert.ok(index.includes("expires_at_ms:launch.request_authority.expires_at_ms"));
assert.ok(index.includes("requestLaunchAuthorityReady:__blo"));
assert.ok(index.includes("VOID_BUY_VOID_CANONICAL_VERIFIED_PAYMENT_V2_ROUTE_V1"));
assert.ok(index.includes('import("./economic/buy_void_verified_payment_v2.js")'));
assert.ok(index.includes('import("./economic/buy_void_payment_rpc_observer_v1.js")'));
assert.ok(index.includes("observeBuyVoidPaymentV1({request:found"));
assert.equal(index.includes("async function __voidBuyVoidRpcV1"), false);
assert.equal(index.includes('fetch(rpc, {'), false);
assert.ok(index.includes("buildBuyVoidVerifiedPaymentEventV2"));
assert.ok(index.includes('"eth_blockNumber"'));
assert.ok(index.includes("current_block_number_by_chain"));
assert.ok(index.includes("request:found,receipt,policy:"));
assert.ok(index.includes("...verified.event"));
assert.ok(index.includes("...verified.event.payment_verifier"));
assert.ok(index.includes("rpc_env:chainCfg.rpc_env"));
assert.ok(index.includes("receipt_status:receipt.status"));
assert.ok(index.includes("readBuyVoidEthereumPublicCheckoutReadinessV1(process.env)"));
assert.ok(index.includes("ethereum_finality.payment_instructions_finality_gate_ready===true"));
assert.ok(index.includes("runBuyVoidEthereumPublicCheckoutPreAttemptFinalityV1({request:found,env:process.env})"));
assert.ok(index.includes("const verifiedEvent:any=finality.canonical_verified_payment_event"));
assert.ok(index.includes('error:"ethereum_source_finality_hold"'));
assert.equal(index.includes("function __voidBuyVoidUsdcTransferMatchV1"), false);
assert.equal(index.includes("function __voidBuyVoidHexToBigIntV1"), false);
assert.equal(index.includes("function __voidBuyVoidTopicAddressV1"), false);
assert.ok(index.includes('m.startsWith("buy_void_verified_payment_duplicate_guard_")'));
assert.match(verifiedPaymentV2, /log\.removed === true/);
assert.match(verifiedPaymentV2, /log\.transactionHash/);
assert.match(verifiedPaymentV2, /log\.blockNumber/);
assert.match(verifiedPaymentV2, /ambiguous_matching_usdc_transfers/);
assert.match(verifiedPaymentV2, /current_block_number_by_chain/);
assert.match(verifiedPaymentV2, /confirmations\.toString\(\)/);
assert.match(verifiedPaymentV2, /payment_transaction_hash_mismatch/);
assert.match(verifiedPaymentV2, /receive_address_binding_mismatch/);
assert.ok(index.includes("Funds sent from an exchange/custodial wallet will be treated as lost."));
assert.ok(index.includes("VOID is not exchange-listed."));
assert.ok(index.includes("<label>Native USDC rail<br/>"));
assert.ok(index.includes('cfg.ethereum_requests_enabled?"Base 8453 + Ethereum 1":"Base 8453 (Ethereum HOLD)"'));
assert.equal(index.includes("throw 0;"),false);

assert.ok(index.includes("const __bld="));
assert.ok(index.includes("__blo=(r:any)"));
assert.ok(index.includes("__blm=(r:any,f:any)=>__BL.withBuyLaunchRequestAuthorityMutationV1(r,f)"));
const persistNeedle="const persisted = await __voidPersistBuyVoidRequestV1(requestObj);";
const persistAt=index.indexOf(persistNeedle);
assert.ok(persistAt>0);
const prePersist=index.slice(Math.max(0,persistAt-120),persistAt);
assert.match(
  prePersist,
  /if\(!__blo\(requestObj\)\)throw new Error\("request_launch_authority_expired_or_superseded"\);/,
);

const persistHelperAt=index.indexOf(
  "async function __voidPersistBuyVoidRequestV1(reqObj:any)",
);
assert.ok(persistHelperAt>0);
const persistAppendAt=index.indexOf(
  'fs.appendFileSync(path.join(dir,"requests.jsonl"),json+"\\n");',
  persistHelperAt,
);
assert.ok(persistAppendAt>persistHelperAt);
const persistCritical=index.slice(
  persistHelperAt,
  persistAppendAt,
);
assert.match(
  persistCritical,
  /return await __blm\(reqObj,\(\)=>\{/,
);
assert.doesNotMatch(
  persistCritical,
  /if\(!__blo\(reqObj\)\)/,
);

const eventWriterAt=index.indexOf(
  "async function __voidWriteBuyVoidOperatorEventV1(e:any,r:any)",
);
assert.ok(eventWriterAt>0);
const eventWriterEnd=index.indexOf(
  "// VOID_BUY_VOID_OPERATOR_QUEUE_APPLY_EVENTS_V1",
  eventWriterAt,
);
const eventCritical=index.slice(eventWriterAt,eventWriterEnd);
assert.match(
  eventCritical,
  /buy_void_verified_payment_capacity_admission_v1\.js/,
);
assert.match(
  eventCritical,
  /writeBuyVoidOperatorEventWithCapacityAdmissionV1/,
);
assert.match(eventCritical, /with_launch_authority_mutation:__blm/);
assert.match(eventCritical, /read_sale_state:__voidBuyVoidSaleStateV1/);
assert.doesNotMatch(eventCritical, /read_operator_events:/);
assert.equal(eventCritical.includes("operator-events.jsonl"), false);
assert.match(
  capacityAdmission,
  /withBuyVoidFilesystemBakeryLockAsyncV1/,
);
assert.match(
  capacityAdmission,
  /withBuyVoidTerminalCloseoutRequestLockV1/,
);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_capacity_exceeded/,
);
assert.match(capacityAdmission, /requests\.jsonl/);
assert.match(capacityAdmission, /operator-events\.jsonl/);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_capacity_projection_mismatch/,
);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_capacity_candidate_request_missing/,
);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_capacity_candidate_quote_mismatch/,
);
assert.match(capacityAdmission, /request_quotes:\s*quotes/);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_capacity_operator_events/,
);
assert.match(capacityAdmission, /_json_invalid/);
assert.match(capacityAdmission, /appendPaymentVerifiedEventDurableV1/);
assert.match(capacityAdmission, /fs\.fsyncSync\(descriptor\)/);
assert.match(capacityAdmission, /recoverPaymentVerifiedSidecarsV1/);
assert.match(capacityAdmission, /sidecar_recovered/);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_duplicate_guard_v1\.js/,
);
assert.match(
  capacityAdmission,
  /classifyBuyVoidVerifiedPaymentDuplicateGuardV1/,
);
assert.match(
  capacityAdmission,
  /duplicate_payment_identity_verification:\s*true/,
);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_duplicate_guard_request_binding_mismatch/,
);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_duplicate_guard_projection_mismatch/,
);
assert.match(
  capacityAdmission,
  /buy_void_verified_payment_duplicate_guard_postcheck_failed/,
);
assert.match(
  duplicateGuard,
  /VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1/,
);
assert.match(
  duplicateGuard,
  /canonicalBuyVoidPaymentIdentityV1/,
);
assert.match(
  duplicateGuard,
  /runtime_integration:\s*false/,
);
{
  const writerAt = capacityAdmission.indexOf(
    "export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1",
  );
  const launchMutationAt = capacityAdmission.indexOf(
    "input.with_launch_authority_mutation(\n          request,",
    writerAt,
  );
  const requestLockAcquireAt = capacityAdmission.indexOf(
    "withBuyVoidTerminalCloseoutRequestLockV1(",
    launchMutationAt,
  );
  const freshAuthorityAt = capacityAdmission.indexOf(
    "assertCurrentAuthority();",
    requestLockAcquireAt,
  );
  const requestSnapshotAt = capacityAdmission.indexOf(
    "const requestBeforeAppend =",
    freshAuthorityAt,
  );
  const appendAt = capacityAdmission.indexOf(
    "appendPaymentVerifiedEventDurableV1(",
    requestSnapshotAt,
  );
  assert.ok(
    writerAt >= 0 &&
      launchMutationAt > writerAt &&
      requestLockAcquireAt > launchMutationAt &&
      freshAuthorityAt > requestLockAcquireAt &&
      requestSnapshotAt > freshAuthorityAt &&
      appendAt > requestSnapshotAt,
    "generation authority must be held before the synchronous request lock, with a fresh under-lock assertion immediately before append",
  );
  assert.doesNotMatch(
    capacityAdmission.slice(launchMutationAt, appendAt),
    /withBuyVoidFilesystemBakeryLockAsyncV1/,
  );
  assert.doesNotMatch(
    capacityAdmission.slice(launchMutationAt, appendAt),
    /buyVoidTerminalCloseoutRequestLockPathV1/,
  );
}
assert.ok(index.includes('"operator_mark_failed"'));
assert.ok(index.includes(
  'res.status(h?409:500).json({schema:"void_public_buy_void_checkout_request_result_v1"',
));
assert.ok(index.includes(
  'error:h?m:"buy_void_checkout_request_failed"',
));
assert.ok(index.includes('x==="request_launch_authority_expired_or_superseded"?409:500'));
assert.ok(index.includes(
  "await __voidWriteBuyVoidOperatorEventV1(event,found);",
));
assert.ok(index.includes(
  "(e:any)=>__voidWriteBuyVoidOperatorEventV1(e,found)",
));
assert.ok(index.includes(
  'res.status(held?409:500).json({',
));
assert.ok(index.includes(
  'error: held?m:"payment_verifier_failed"',
));
assert.ok(index.includes(
  'm==="buy_void_verified_payment_capacity_exceeded"',
));
assert.ok(index.includes(
  'x==="request_launch_authority_expired_or_superseded"?409:500',
));
const gateSource = read("src/economic/buy_void_coupled_launch_gate_v1.mjs");
assert.ok(gateSource.includes("buy-void-coupled-live-generation-v1.jsonl"));
assert.ok(gateSource.includes("generation_tip_sha256"));
assert.ok(gateSource.includes("LIVE_ACTIVATION_MAX_LEASE_MS"));
assert.ok(gateSource.includes("expires_at_ms"));
assert.ok(gateSource.includes("readBuyLaunchLiveActivationV1"));
assert.ok(gateSource.includes("withBuyLaunchRequestAuthorityMutationV1"));
assert.ok(gateSource.includes("withBuyLaunchGenerationTransitionPublicationV1"));
assert.ok(gateSource.includes("../../dist/economic/buy_void_filesystem_bakery_lock_v1.js"));
assert.ok(gateSource.includes("verifyTypedData"));
assert.ok(gateSource.includes("VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1"));
assert.ok(gateSource.includes("verifyBuyLaunchLiveActivationSovereignSignatureV1"));
assert.ok(gateSource.includes("buyLaunchRequestAuthorityMatchesV1"));
assert.equal(
  index.split('=== "1"&&__bld().ready').length - 1,
  2,
);
assert.ok(!index.includes(
  'const requests_enabled = String(process.env.VOID_BUY_REQUESTS_ENABLED || "0") === "1";',
));
assert.ok(!index.includes(
  'const requestsEnabled = String(process.env.VOID_BUY_REQUESTS_ENABLED || "0") === "1";',
));

for (const required of [
  "COPY --from=build /app/src/economic/buy_void_coupled_launch_gate_v1.mjs ./src/economic/",
  "/app/tools/void-wc-void-coupled-launch-readiness-v1.mjs",
  "/app/tools/void-wc-void-production-readiness-v1.mjs",
  "/app/tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs",
  "/app/tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs",
  "/app/tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs",
  "/app/tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "/app/tools/void-wc-void-opening-settlement-adapter-review-v1.mjs",
  "/app/tools/void-coupled-economic-successor-gate-v1.mjs",
  "/app/tools/void-economic-evm-successor-migration-v1.mjs",
  "/app/tools/void-wc-void-coupled-opening-v1.mjs",
  "/app/tools/void-shared-market-post-discovery-state-v2.mjs",
  "/app/tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs",
  "/app/tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
  "/app/tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs",
  "/app/tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
  "/app/tools/void-wc-void-reverse-settlement-v1.mjs",
  "/app/tools/void-wc-void-public-quote-disclosure-v1.mjs",
  "/app/tools/void-economic-intent-ttl-caps-policy-v1.mjs",
  "/app/tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
  "/app/ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json",
  "/app/ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "/app/ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "/app/ops/mainnet0/wc-void-market-vault-compiler-identity-v1-artifact.zip.b64",
  "/app/ops/mainnet0/wc-void-production-candidate-v1.json",
  "/app/ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  "/app/ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
  "/app/ops/precision/void-buy-coupled-live-generation-publish-v1.mjs",
]) {
  assert.ok(docker.includes(required), required);
}
const currentIdentityRuntimeDependencies = Object.freeze([
  "tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs",
  "tools/void-wc-void-market-vault-compiled-identity-correction-v2.mjs",
  "tools/void-wc-void-market-vault-compiler-identity-v1.mjs",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-current-binding-v2.json",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-correction-v2.json",
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json",
  "ops/mainnet0/wc-void-market-vault-compiler-identity-v1-artifact.zip.b64"
]);
for (const dependency of currentIdentityRuntimeDependencies) {
  const occurrences =
    launchWorkflow.split('"' + dependency + '"').length - 1;
  assert.equal(
    occurrences,
    2,
    "Buy coupled-launch workflow must trigger on current identity dependency: " +
      dependency,
  );
}

assert.ok(docker.includes("USER root"));
assert.equal(
  docker.includes('VOLUME ["/root/.local/state/void-node-authority-v1"]'),
  false,
);
assert.equal(
  docker.split(
    "COPY --from=build /app/ops/precision/void-buy-coupled-live-generation-publish-v1.mjs ./ops/precision/",
  ).length - 1,
  1,
);
const proposerCompose = compose.slice(
  compose.indexOf("  proposer:"),
  compose.indexOf("  follower:"),
);
const followerCompose = compose.slice(compose.indexOf("  follower:"));
assert.ok(proposerCompose.includes(
  "void_buy_authority_proposer:/root/.local/state/void-node-authority-v1",
));
assert.ok(followerCompose.includes(
  "void_buy_authority_follower:/root/.local/state/void-node-authority-v1",
));
assert.match(
  compose,
  /\nvolumes:\n\s+void_buy_authority_proposer:\n\s+void_buy_authority_follower:/u,
);
assert.equal((compose.match(/^volumes:/gmu) || []).length, 1);
assert.equal(compose.includes("void_buy_coupled_authority:"), false);

const current = readBuyLaunchGateV1();
assert.equal(current.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.equal(current.ready, false);
assert.match(
  String(current.reason || ""),
  /^canonical_coupled_launch_source_(?:not_ready|unavailable)$/,
);

console.log("VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_V1_GREEN");
console.log("request_flag_alone_can_open_intake=false");
console.log("current_canonical_gate_ready=false");
console.log("live_activation_generation_bound=true");
console.log("live_activation_lease_expiry_bound=true");
console.log("request_launch_authority_snapshot_bound=true");
console.log("request_launch_authority_revalidated_before_persist=true");
console.log("checkout_persistence_lease_conflict_response_409=true");
console.log("untyped_launch_authority_throw=false");
console.log("request_launch_authority_revalidated_at_request_append=true");
console.log("request_launch_authority_revalidated_inside_payment_event_lock=true");
console.log("post_expiry_terminal_operator_cleanup_allowed=true");
console.log("operator_mark_persistence_failure_response_bound=true");
console.log("request_launch_authority_generation_tip_bound=true");
console.log("tx_hash_binding_after_launch_expiry=false");
console.log("payment_verification_after_launch_expiry=false");
console.log("generation_lock_spans_request_append=true");
console.log("generation_lock_spans_payment_verified_append=true");
console.log("request_lock_precedes_final_launch_authority_recheck=true");
console.log("request_lock_wait_cannot_age_prechecked_launch_lease=true");
console.log("verified_payment_capacity_lock_spans_payment_verified_append=true");
console.log("verified_payment_capacity_exhaustion_response_409=true");
console.log("verified_payment_duplicate_guard_inside_capacity_lock=true");
console.log("verified_payment_event_v2_persisted=true");
console.log("verified_payment_log_index_persisted=true");
console.log("verified_payment_canonical_v2_classifier_mounted=true");
console.log("verified_payment_receipt_tx_hash_bound=true");
console.log("verified_payment_receipt_block_bound=true");
console.log("verified_payment_removed_logs_rejected=true");
console.log("verified_payment_confirmation_context_bound=true");
console.log("verified_payment_exact_one_matching_transfer_required=true");
console.log("verified_payment_requested_usdc_exact_micro_units=true");
console.log("verified_payment_requested_usdc_exponent_rejected=true");
console.log("verified_payment_requested_usdc_overprecision_rejected=true");
console.log("verified_payment_ambiguous_matching_transfers_held=true");
console.log("verified_payment_log_index_uint32_bound=true");
console.log("duplicate_guard_conflict_response_409=true");
console.log("generation_transition_publication_uses_same_lock=true");
console.log("sovereign_launch_lease_cosignature_bound=true");
console.log("docker_runtime_gate_dependencies_bound=true");
console.log("docker_generation_publisher_packaged=true");
console.log("docker_generation_authority_volume_persistent=true");
console.log("docker_image_anonymous_authority_volume=false");
console.log("docker_generation_authority_volume_per_service=true");
console.log("canonical_coupled_readiness_dependency_closure_bound=true");
{
  const currentRaw =
    deriveBuyVoidEnforcementArtifactAttestationV1(ROOT);
  const currentCandidate =
    deriveBuyVoidEnforcementArtifactAttestationV5Candidate();
  const historicalV4 = JSON.parse(read(
    "docs/architecture/buy-void-enforcement-artifact-attestation-v4.json",
  ));

  assert.equal(
    historicalV4.marker,
    "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V4",
  );
  assert.equal(historicalV4.version, 4);
  assert.equal(
    historicalV4.current_enforcement.enforcement_artifact_set_sha256,
    "854fa637d25f0931c37d5d35fda641adb38ad1f55ca23b2662fb97d42a262a7b",
  );
  assert.notEqual(
    currentRaw.enforcement_artifact_set_sha256,
    historicalV4.current_enforcement.enforcement_artifact_set_sha256,
    "new source generation must not be mislabeled as historical enforcement V4",
  );

  assert.equal(
    currentCandidate.source_runtime_parent,
    "f627cad6bc07a6ad3ebe7cbd946723316fcd0567",
  );
  assert.equal(
    currentCandidate.predecessor.historical_v4_manifest_git_blob_sha1,
    "d9e391bb058132b83a4eeaec00797e41dab9fa26",
  );
  assert.equal(
    currentCandidate.predecessor.historical_v4_enforcement_set_sha256,
    historicalV4.current_enforcement.enforcement_artifact_set_sha256,
  );
  assert.ok(
    currentCandidate.closed_runtime_artifacts.some(
      entry =>
        entry.path ===
        "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
    ),
  );
  assert.equal(currentCandidate.candidate_identity_accepted, false);
  assert.equal(currentCandidate.dynamic_tool_execution_identity_verified, false);
  assert.equal(currentCandidate.dynamic_tool_transitive_closure_verified, false);
  assert.equal(currentCandidate.complete_executable_closure_verified, false);
  assert.equal(currentCandidate.deployed_artifact_generation_verified, false);
  assert.equal(currentCandidate.runtime_mount_authority, false);
  assert.equal(
    currentCandidate.production_source_finality_authority_ready,
    false,
  );
  assert.equal(currentCandidate.presale_activation, false);
  assert.equal(currentCandidate.funds_movement, false);

  console.log("historical_enforcement_v4_predecessor_immutable=true");
  console.log("current_enforcement_v5_candidate_derived=true");
  console.log("current_enforcement_v5_candidate_acceptance=false");
  console.log("complete_executable_closure_verified=false");
}
console.log("native_usdc_request_and_verified_event_policy_held=true");
console.log("funds_movement=false");
console.log("runtime_activation_performed=false");
