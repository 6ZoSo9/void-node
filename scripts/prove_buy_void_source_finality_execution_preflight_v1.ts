import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  runBuyVoidSourceFinalityExecutionPreflightV1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeSource = fs.readFileSync(
  path.join(ROOT, "src/economic/buy_void_delivery_runtime_integration_v1.ts"),
  "utf8",
);
const preflightSource = fs.readFileSync(
  path.join(ROOT, "src/economic/buy_void_source_finality_execution_preflight_v1.ts"),
  "utf8",
);
const v4Source = fs.readFileSync(
  path.join(ROOT, "src/economic/buy_void_source_finality_generation_provenance_v4.ts"),
  "utf8",
);

assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
  "VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1",
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .signer_access_gate,
  true,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .transaction_broadcast_gate,
  true,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .reconciliation_gate,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1.signing,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_AUTHORITY_V1
    .money_movement,
  false,
);

for (const envName of Object.values(
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_POLICY_ENVS_V1,
)) {
  assert.match(envName, /^VOID_BUY_VOID_SOURCE_FINALITY_/);
}

let observerCalls = 0;
const observer = async () => {
  observerCalls += 1;
  return { ok: true };
};

const invalidAttempt = await runBuyVoidSourceFinalityExecutionPreflightV1(
  {
    root_dir: "/tmp/void-source-finality-preflight-proof-does-not-exist",
    attempt_id: "invalid",
    env: {},
  },
  { observe_source_finality: observer },
);
assert.equal(invalidAttempt.ok, false);
if (invalidAttempt.ok === false) {
  assert.equal(
    invalidAttempt.reason,
    "source_finality_execution_attempt_id_invalid",
  );
  assert.equal(invalidAttempt.wallet_access_performed, false);
  assert.equal(invalidAttempt.signing_performed, false);
  assert.equal(invalidAttempt.transaction_broadcast_performed, false);
  assert.equal(invalidAttempt.money_movement_performed, false);
}
assert.equal(observerCalls, 0);

const validAttemptId = "1".repeat(64);
const missingProcessIdentity =
  await runBuyVoidSourceFinalityExecutionPreflightV1(
    {
      root_dir: "/tmp/void-source-finality-preflight-proof-does-not-exist",
      attempt_id: validAttemptId,
      env: {},
    },
    { observe_source_finality: observer },
  );
assert.equal(missingProcessIdentity.ok, false);
if (missingProcessIdentity.ok === false) {
  assert.equal(
    missingProcessIdentity.reason,
    "source_finality_process_source_identity_unavailable",
  );
  assert.equal(missingProcessIdentity.process_source_identity_verified, false);
}
assert.equal(observerCalls, 0);

const processIdentityEnv: NodeJS.ProcessEnv = {
  VOID_PROCESS_SOURCE_IDENTITY_MARKER: "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  VOID_PROCESS_SOURCE_COMMIT: "2".repeat(40),
  VOID_PROCESS_SOURCE_TREE: "3".repeat(40),
  VOID_PROCESS_SOURCE_BRANCH: "main",
};
const missingPolicy = await runBuyVoidSourceFinalityExecutionPreflightV1(
  {
    root_dir: "/tmp/void-source-finality-preflight-proof-does-not-exist",
    attempt_id: validAttemptId,
    env: processIdentityEnv,
  },
  { observe_source_finality: observer },
);
assert.equal(missingPolicy.ok, false);
if (missingPolicy.ok === false) {
  assert.equal(
    missingPolicy.reason,
    "source_finality_execution_policy_not_configured",
  );
  assert.equal(missingPolicy.process_source_identity_verified, true);
  assert.equal(missingPolicy.wallet_access_performed, false);
  assert.equal(missingPolicy.signing_performed, false);
  assert.equal(missingPolicy.transaction_broadcast_performed, false);
  assert.equal(missingPolicy.money_movement_performed, false);
}
assert.equal(observerCalls, 0);

const guardStart = runtimeSource.indexOf(
  "function sourceFinalityGuardedDependencies(",
);
const guardEnd = runtimeSource.indexOf("function decisionStatus(", guardStart);
assert.ok(guardStart >= 0 && guardEnd > guardStart);
const guardSource = runtimeSource.slice(guardStart, guardEnd);

for (const ordered of [
  ["await requirePreflight();", "return dependencies.signer.get_address();"],
  [
    "await requirePreflight();",
    "return dependencies.signer.sign_transaction(transaction);",
  ],
  [
    "await requirePreflight();",
    "return dependencies.broadcaster.broadcast_signed_transaction(",
  ],
] as const) {
  const delegate = guardSource.indexOf(ordered[1]);
  assert.ok(delegate >= 0, `missing guarded delegate ${ordered[1]}`);
  const prefix = guardSource.slice(0, delegate);
  assert.ok(
    prefix.lastIndexOf(ordered[0]) >= 0,
    `delegate is not preceded by source-finality preflight: ${ordered[1]}`,
  );
}

assert.match(
  guardSource,
  /preflightPromise \|\|= runBuyVoidSourceFinalityExecutionPreflightV1/,
);
assert.match(
  runtimeSource,
  /const guardedExternal = external\s*\? sourceFinalityGuardedDependencies\(rootDir, attemptId, external\)/,
);
assert.match(runtimeSource, /signer: guardedExternal\.signer/);
assert.match(runtimeSource, /broadcaster: guardedExternal\.broadcaster/);
assert.doesNotMatch(
  runtimeSource,
  /dependencies:\s*external\s*\?\s*\{\s*signer: external\.signer/,
);
assert.equal(
  Array.from(
    runtimeSource.matchAll(/runBuyVoidSourceFinalityExecutionPreflightV1\(/g),
  ).length,
  1,
  "preflight must be lazy inside dependency wrappers, not eager in reconciliation",
);
assert.match(
  runtimeSource,
  /reconciliation_without_signer_or_broadcaster_remains_available: true/,
);
assert.match(
  runtimeSource,
  /source_finality_failure_prevents_signer_access: true/,
);
assert.match(
  runtimeSource,
  /source_finality_failure_prevents_broadcast_call: true/,
);

for (const requiredReadyFlag of [
  "reviewed_source_files_verified === true",
  "authenticated_transport_identity_verified === true",
  "total_operation_deadline_verified === true",
  "source_generation_verified === true",
  "deployed_artifact_generation_verified === true",
  "ancestry_verified === true",
  "provider_quorum_verified === true",
  "production_source_finality_authority_ready === true",
]) {
  assert.ok(
    preflightSource.includes(requiredReadyFlag),
    `missing ready boundary ${requiredReadyFlag}`,
  );
}
assert.match(
  preflightSource,
  /observeBuyVoidSourceFinalityGenerationProvenanceV4\(value\)/,
);

for (const currentV4Hold of [
  "source_generation_verified: false",
  "deployed_artifact_generation_verified: false",
  "ancestry_verified: false",
  "provider_quorum_verified: false",
  "production_source_finality_authority_ready: false",
]) {
  assert.ok(
    v4Source.includes(currentV4Hold),
    `V4 truth boundary unexpectedly moved: ${currentV4Hold}`,
  );
}

console.log(
  "VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("lazy_dependency_gate=true");
console.log("signer_access_guarded=true");
console.log("broadcast_call_guarded=true");
console.log("reconciliation_not_eagerly_gated=true");
console.log("current_v4_production_authority_ready=false");
console.log("wallet_or_signer_action_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("chain2050_mutation_performed=false");
console.log("inventory_mutation_performed=false");
console.log("funds_moved=false");
