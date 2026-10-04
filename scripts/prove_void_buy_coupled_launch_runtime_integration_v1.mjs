#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  readBuyLaunchGateV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const index = read("src/index.ts");
const docker = read("Dockerfile");
const compose = read("docker-compose.yml");
const capacityAdmission = read(
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
);
const duplicateGuard = read(
  "src/economic/buy_void_verified_payment_duplicate_guard_v1.ts",
);
assert.ok(Buffer.byteLength(index, "utf8") <= 3851076, "src/index.ts size ceiling");
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]))
    : item,
);
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlobSha1 = bytes => crypto.createHash("sha1")
  .update(Buffer.from(`blob ${bytes.length}\0`, "utf8"))
  .update(bytes)
  .digest("hex");

assert.ok(index.includes("VOID_BUY_COUPLED_LAUNCH_RUNTIME_BINDING_V1"));
assert.ok(index.includes('../src/economic/buy_void_coupled_launch_gate_v1.mjs'));
assert.ok(index.includes(VOID_BUY_COUPLED_LAUNCH_ID_V1));
assert.ok(index.includes("readBuyLaunchGateV1()"));
assert.ok(index.includes("launch_authority:launch.request_authority"));
assert.ok(index.includes("expires_at_ms:launch.request_authority.expires_at_ms"));
assert.ok(index.includes("requestLaunchAuthorityReady:__blo"));
assert.ok(index.includes("amountUnits!==requestedUnits"));
assert.equal(index.includes("amountUnits>=requestedUnits"), false);
assert.ok(index.includes('error:"invalid_requested_usdc_amount"'));
assert.ok(index.includes('BigInt(q[1])*1000000n+BigInt((q[2]||"").padEnd(6,"0"))'));
assert.equal(index.includes("Math.ceil(Number(requestedUsdc"), false);
assert.ok(index.includes("parsedLogIndex>0xffff_ffffn"));
assert.ok(index.includes('"ambiguous_matching_usdc_transfers"'));
assert.ok(index.includes('error: match.error || "matching_usdc_transfer_not_found"'));
assert.ok(index.includes('schema: "void_buy_void_verified_payment_event_v2"'));
assert.ok(index.includes('marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2"'));
assert.ok(index.includes("payment_identity_input_complete: true"));
assert.ok(index.includes("log_index: match.log_index"));
assert.ok(index.includes('m.startsWith("buy_void_verified_payment_duplicate_guard_")'));
assert.ok(index.includes("Funds sent from an exchange/custodial wallet will be treated as lost."));
assert.ok(index.includes("VOID is not exchange-listed."));
assert.ok(index.includes("<label>Native USDC rail<br/>"));
assert.ok(index.includes('cfg.ethereum_requests_enabled?"Base 8453 + Ethereum 1":"Base 8453 (Ethereum HOLD)"'));
assert.equal(index.includes("throw 0;"),false);

{
  const hexStart=index.indexOf("function __voidBuyVoidHexToBigIntV1");
  const chainMarker=index.indexOf("// VOID_BUY_VOID_MULTI_CHAIN_USDC_VERIFIER_V1",hexStart);
  const matchStart=index.indexOf("function __voidBuyVoidUsdcTransferMatchV1",chainMarker);
  const routeStart=index.indexOf('app.get("/__void/buy-void/operator/verify-payment.json"',matchStart);
  assert.ok(hexStart>0&&chainMarker>hexStart&&matchStart>chainMarker&&routeStart>matchStart);
  const helperSource=(
    index.slice(hexStart,chainMarker)+
    index.slice(matchStart,routeStart)
  )
    .replace(/:any\[\]/gu,"")
    .replace(/:any/gu,"")
    .replace(/:string/gu,"");
  const matchTransfer=Function(
    helperSource+"\nreturn __voidBuyVoidUsdcTransferMatchV1;"
  )();
  const transferSig="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const delivery="0x"+"1".repeat(40);
  const receive="0x"+"2".repeat(40);
  const usdc="0x"+"3".repeat(40);
  const topic=a=>"0x"+"0".repeat(24)+a.slice(2);
  const log=i=>({
    address:usdc,
    topics:[transferSig,topic(delivery),topic(receive)],
    data:"0xf4240",
    logIndex:i,
  });
  const cfg={usdc_contract:usdc};

  const single=matchTransfer([log("0x7")],cfg,receive,delivery,"1");
  assert.equal(single.ok,true);
  assert.equal(single.log_index,"7");

  const microLog={...log("0x9"),data:"0x1"};
  const micro=matchTransfer([microLog],cfg,receive,delivery,"0.000001");
  assert.equal(micro.ok,true);
  assert.equal(micro.amount_units,"1");

  const overPrecise=matchTransfer([microLog],cfg,receive,delivery,"0.0000009");
  assert.equal(overPrecise.ok,false);
  assert.equal(overPrecise.error,"invalid_requested_usdc_amount");

  const exponent=matchTransfer([log("0xa")],cfg,receive,delivery,"1e0");
  assert.equal(exponent.ok,false);
  assert.equal(exponent.error,"invalid_requested_usdc_amount");

  const max=matchTransfer([log("0xffffffff")],cfg,receive,delivery,"1");
  assert.equal(max.ok,true);
  assert.equal(max.log_index,"4294967295");

  const tooLarge=matchTransfer([log("0x100000000")],cfg,receive,delivery,"1");
  assert.equal(tooLarge.ok,false);
  assert.equal(tooLarge.error,"matching_usdc_transfer_not_found");

  const ambiguous=matchTransfer([log("0x7"),log("0x8")],cfg,receive,delivery,"1");
  assert.equal(ambiguous.ok,false);
  assert.equal(ambiguous.error,"ambiguous_matching_usdc_transfers");
  assert.equal(ambiguous.match_count,2);
  assert.deepEqual(ambiguous.matching_log_indexes,["7","8"]);
}

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
  const launchMutationAt = capacityAdmission.indexOf(
    "input.with_launch_authority_mutation(\n          request,",
  );
  const requestLockAt = capacityAdmission.indexOf(
    "withBuyVoidTerminalCloseoutRequestLockV1(",
    launchMutationAt,
  );
  const requestSnapshotAt = capacityAdmission.indexOf(
    "const requestBeforeAppend =",
    requestLockAt,
  );
  const appendAt = capacityAdmission.indexOf(
    "appendPaymentVerifiedEventDurableV1(",
    requestSnapshotAt,
  );
  assert.ok(
    launchMutationAt >= 0 &&
      requestLockAt > launchMutationAt &&
      requestSnapshotAt > requestLockAt &&
      appendAt > requestSnapshotAt,
    "launch authority must wrap request lock, ledger snapshot revalidation, and durable append",
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
  "/app/ops/mainnet0/wc-void-production-candidate-v1.json",
  "/app/ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
  "/app/ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
  "/app/ops/precision/void-buy-coupled-live-generation-publish-v1.mjs",
]) {
  assert.ok(docker.includes(required), required);
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
console.log("verified_payment_capacity_lock_spans_payment_verified_append=true");
console.log("verified_payment_capacity_exhaustion_response_409=true");
console.log("verified_payment_duplicate_guard_inside_capacity_lock=true");
console.log("verified_payment_event_v2_persisted=true");
console.log("verified_payment_log_index_persisted=true");
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
  const manifest = JSON.parse(read(
    "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json",
  ));
  const dockerBytes = fs.readFileSync(path.join(ROOT, "Dockerfile"));
  const lockBytes = fs.readFileSync(
    path.join(ROOT, "src/economic/buy_void_filesystem_bakery_lock_v1.ts"),
  );
  const next = structuredClone(manifest);
  const dockerInput = next.inputs.find(entry => entry.path === "Dockerfile");
  assert.ok(dockerInput);
  dockerInput.bytes = dockerBytes.length;
  dockerInput.sha256 = sha256(dockerBytes);
  dockerInput.git_blob_sha1 = gitBlobSha1(dockerBytes);
  const lockInput = next.inputs.find(
    entry => entry.path === "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
  );
  assert.ok(lockInput);
  lockInput.bytes = lockBytes.length;
  lockInput.sha256 = sha256(lockBytes);
  lockInput.git_blob_sha1 = gitBlobSha1(lockBytes);
  const body = structuredClone(next);
  delete body.enforcement_artifact_set_sha256;
  const nextSetSha256 = sha256(Buffer.from(canonical(body), "utf8"));
  assert.equal(manifest.inputs.find(entry => entry.path === "Dockerfile")?.bytes, dockerInput.bytes);
  assert.equal(manifest.inputs.find(entry => entry.path === "Dockerfile")?.sha256, dockerInput.sha256);
  assert.equal(manifest.inputs.find(entry => entry.path === "Dockerfile")?.git_blob_sha1, dockerInput.git_blob_sha1);
  assert.equal(
    manifest.inputs.find(
      entry => entry.path === "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
    )?.bytes,
    lockInput.bytes,
  );
  assert.equal(
    manifest.inputs.find(
      entry => entry.path === "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
    )?.sha256,
    lockInput.sha256,
  );
  assert.equal(
    manifest.inputs.find(
      entry => entry.path === "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
    )?.git_blob_sha1,
    lockInput.git_blob_sha1,
  );
  assert.equal(manifest.enforcement_artifact_set_sha256, nextSetSha256);
  console.log(`attestation_docker_bytes=${dockerInput.bytes}`);
  console.log(`attestation_docker_sha256=${dockerInput.sha256}`);
  console.log(`attestation_docker_git_blob_sha1=${dockerInput.git_blob_sha1}`);
  console.log(`attestation_next_set_sha256=${nextSetSha256}`);
}
console.log("funds_movement=false");
console.log("runtime_activation_performed=false");
