#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readReviewedNodePackageRuntimeProfileV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-datanet-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW_REL=".github/workflows/void-datanet-registry-exact-single-broadcast-execution-v1.yml";
const EXECUTOR_REL="ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const V1_PROFILE_REL="ops/security/reviewed-node-package-runtime-ethers-v1.json";

const HISTORICAL_PACKAGE_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const HISTORICAL_LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const CURRENT_PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const CURRENT_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";

const PINNED_V1=Object.freeze({
  "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs":
    "570acec1f441f04ad9d16f650220b5682b6b6be1",
  "tools/void-datanet-registry-isolated-parent-support-v1.mjs":
    "bfd46065f1674376ea6ae2809e420adb844ccc1b",
  "ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs":
    "3146d65d39fd680269fa86fb28e58719d9d67515",
  "ops/precision/void-datanet-registry-exact-single-broadcast-isolated-execution-v1.mjs":
    "21dafe14f27e7a3294f5472087ef8a2cbb512800",
  "ops/precision/void-datanet-registry-reviewed-execution-child-v1.mjs":
    "c6923a3c974de165960adf79b9706d439d913a12",
  "scripts/prove_void_datanet_registry_exact_single_broadcast_execution_v1.mjs":
    "c9de2879158de1de9915d4fbe95641bbed70c3cd",
  "scripts/prove_void_datanet_registry_isolated_reviewed_execution_v1.mjs":
    "c59e80e254f2f4a8489eb405cac29976ca7b9c57",
  "tools/void-datanet-reviewed-node-package-runtime-v1.mjs":
    "2732a6e071ba60deef60b52c7d6a1a194a35bc53",
  "ops/security/reviewed-node-package-runtime-ethers-v1.json":
    "87b650e28366acfea3d140ea7778f41f57e5b0c3",
});

const EXPECTED_CLOSURE=Object.freeze([
  "tools/datanet-content-commitment-compiled-identity-acceptance-v1.mjs",
  "tools/datanet-content-commitment-compiler-profile-v1.mjs",
  "tools/datanet-content-commitment-deployment-attestation-v1.mjs",
  "tools/datanet-content-commitment-dual-compiler-identity-v1.mjs",
  "tools/void-datanet-registry-candidate-fresh-revalidation-v1.mjs",
  "tools/void-datanet-registry-consumed-authorization-signing-v1.mjs",
  "tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs",
  "tools/void-datanet-registry-deployer-credential-binding-v1.mjs",
  "tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs",
  "tools/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs",
  "tools/void-datanet-registry-exact-signing-request-v1.mjs",
  "tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs",
  "tools/void-datanet-registry-final-signing-review-v1.mjs",
  "tools/void-datanet-registry-prebroadcast-observer-v1.mjs",
  "tools/void-datanet-registry-signed-verification-broadcast-request-v1.mjs",
  "tools/void-datanet-registry-signing-state-identity-provision-v1.mjs",
  "tools/void-datanet-registry-single-transaction-signing-authorization-v1.mjs",
  "tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs",
  "tools/void-datanet-registry-single-use-signing-authorization-consumption-v1.mjs",
  "tools/void-datanet-registry-transaction-construction-admission-v1.mjs",
  "tools/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs",
  "tools/void-datanet-registry-unsigned-transaction-candidate-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-install-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs",
  "tools/void-economic-epoch2-qbft-private-runtime-plan-v1.mjs",
  "tools/void-economic-epoch2-raw-transaction-domain-v1.mjs"
]);

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes)
    .digest("hex");
}
function bytes(relative){
  return fs.readFileSync(path.join(ROOT,...relative.split("/")));
}
function fileBlob(relative){ return gitBlob(bytes(relative)); }

for(const [relative,expected] of Object.entries(PINNED_V1)){
  assert.equal(fileBlob(relative),expected,"historical_v1_blob_drift:"+relative);
}
assert.equal(fileBlob("package.json"),CURRENT_PACKAGE_BLOB);
assert.equal(fileBlob("package-lock.json"),CURRENT_LOCK_BLOB);

const profileSource=readReviewedNodePackageRuntimeProfileV1({
  relativePath:V1_PROFILE_REL,
});
assert.equal(profileSource.profile_source.git_blob_sha1,PINNED_V1[V1_PROFILE_REL]);
assert.equal(profileSource.profile.package_json_source.git_blob_sha1,HISTORICAL_PACKAGE_BLOB);
assert.equal(profileSource.profile.package_lock_source.git_blob_sha1,HISTORICAL_LOCK_BLOB);
assert.throws(
  ()=>verifyReviewedNodePackageRuntimeV1({profile:profileSource.profile}),
  /reviewed_node_runtime_profile_mismatch/u,
);

const executor=bytes(EXECUTOR_REL).toString("utf8");
const marker="const EXPECTED_REVIEWED_RELATIVE_CLOSURE_V1=Object.freeze([";
const start=executor.indexOf(marker);
assert.ok(start>=0,"reviewed closure marker missing");
const end=executor.indexOf("].sort());",start);
assert.ok(end>start,"reviewed closure terminator missing");
const closureText=executor.slice(start,end);
const parsed=[...closureText.matchAll(/"([^"]+\.mjs)"/gu)].map(match=>match[1]).sort();
assert.deepEqual(parsed,[...EXPECTED_CLOSURE].sort(),"reviewed closure changed");

const workflow=bytes(WORKFLOW_REL).toString("utf8");
for(const relative of EXPECTED_CLOSURE){
  assert.ok(
    workflow.includes(`- "${relative}"`),
    "workflow missing exact reviewed closure trigger: "+relative,
  );
}
for(const broad of [
  "tools/datanet-content-commitment-*.mjs",
  "tools/void-datanet-registry-*.mjs",
  "tools/void-economic-epoch2-*.mjs",
]){
  assert.equal(workflow.includes(broad),false,"broad sibling trigger remains: "+broad);
}
for(const relative of [
  proofPath,
  "package.json",
  "package-lock.json",
  "tools/void-datanet-reviewed-node-package-runtime-v1.mjs",
  V1_PROFILE_REL,
]){
  assert.ok(workflow.includes(`- "${relative}"`),"workflow dependency trigger missing: "+relative);
}
for(const required of [
  "historical_positive",
  "historical_refusal",
  HISTORICAL_PACKAGE_BLOB,
  HISTORICAL_LOCK_BLOB,
  CURRENT_PACKAGE_BLOB,
  CURRENT_LOCK_BLOB,
]){
  assert.ok(workflow.includes(required),"workflow generation marker missing: "+required);
}

console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_V1_HISTORICAL_REFUSAL_V2_GREEN");
console.log("frozen_v1_executor_sources_unchanged=true");
console.log("frozen_v1_profile_refuses_current_package_generation=true");
console.log("reviewed_closure_trigger_exact=true");
console.log("broad_sibling_globs_present=false");
console.log("v2_executor_authority_created=false");
console.log("rpc_call=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
