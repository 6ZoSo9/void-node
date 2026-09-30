#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json",
);

const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;

const EXPECTED_SOURCE_BLOBS = Object.freeze({
  "src/economic/buy_void_runtime_integration_v1.ts":
    "00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts":
    "1c238ae8dff7e088421eabff93a98d97357d99e7",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts":
    "2db30a0d7f343c5c1264d89ec5c752ade609d843",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts":
    "f74cafa7665be4ac0ea4fd518ec02440d337fa27",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts":
    "27045345cf48cacd2a5f2bc9330812579d0761a4",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.ts":
    "1495c6dd21cfda1608ea29885d98617784a04bb0",
});

const EXPECTED_READINESS = Object.freeze({
  parent_enabled: true,
  root_dir: "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1",
  policy_configured: true,
  signing_dependency_env_configured: true,
  full_runtime_policy_fingerprint_sha256:
    "b56c0abde0ea767711053a15975863ee012758c07907e729ca016f2a3190bd92",
  runtime_policy_fingerprint_sha256:
    "ba23302c2af292e78c07692d58d8bb03090ad695943cdbb15d6b9af394aa7c88",
  preparation_policy_fingerprint_sha256:
    "3f4361d0ac5dac407e4ab1ae3f47b86e497f5af3db481a586c2c3f92b8f85da5",
  receipt_policy_fingerprint_sha256:
    "23fac2c2de846eb99bc3647bfe54a83f704a5bc95a336eb1cc6edf54664390e4",
  history_carrier_authority_id:
    "d4c9e22f0d619e7377ec0388bb8cdc19ef8d3782138ec87c3fe5ef271040af81",
  history_carrier_generation: 1,
  history_carrier_activation_ready: true,
  history_carrier_activation_hold_reason: "",
  postgres_configuration_fingerprint_sha256:
    "8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40",
  postgres_schema_fingerprint_sha256:
    "89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1",
});

const EXPECTED_GATE_STATE = Object.freeze({
  parent_runtime: "1",
  claimed_runtime: "0",
  full_runtime: "0",
  admitted_guarded_runtime: "0",
  full_runtime_apply: "0",
});

const EXPECTED_PHASE_ORDER = Object.freeze([
  "dormant",
  "claimed_exclusive",
  "full_preview",
  "admission_armed",
  "live_apply",
]);

const EXPECTED_TRANSITION_POLICY = Object.freeze({
  adjacent_only: true,
  claimed_selector_first: true,
  full_runtime_preview_second: true,
  admitted_guarded_runtime_third: true,
  full_runtime_apply_last: true,
  rollback_clears_apply_first: true,
  direct_jump_to_live_apply_forbidden: true,
  automatic_retry: false,
});

const EXPECTED_AUTHORITY = Object.freeze({
  source_candidate_only: true,
  activation_authorized: false,
  host_mutation: false,
  service_mutation: false,
  runtime_gate_mutation: false,
  credential_read: false,
  database_mutation: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

function fail(reason) {
  throw new Error(reason);
}

function plain(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function exactObject(value, expected, label) {
  if (!plain(value)) fail(label + "_not_object");
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail(label + "_keys_mismatch");
  }
  for (const key of expectedKeys) {
    if (value[key] !== expected[key]) {
      fail(label + "_value_mismatch:" + key);
    }
  }
}

function gitBlob(relativePath) {
  try {
    return execFileSync(
      "git",
      ["-C", ROOT, "hash-object", path.join(ROOT, relativePath)],
      { encoding: "utf8" },
    ).trim();
  } catch {
    fail("source_blob_hash_failed:" + relativePath);
  }
}

export function verifyVoidBuyVoidPostgresActivationCandidateV1(
  value,
  { verifyFilesystem = true } = {},
) {
  if (!plain(value)) fail("candidate_not_object");
  const topKeys = [
    "marker",
    "version",
    "status",
    "reviewed_source_main_commit",
    "reviewed_source_blobs",
    "observed_readiness",
    "observed_gate_state",
    "activation_phase_order",
    "transition_policy",
    "authority",
  ].sort();
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(topKeys)) {
    fail("candidate_top_level_keys_mismatch");
  }

  if (
    value.marker !==
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1 ||
    value.version !== 1 ||
    value.status !==
      "source_candidate_activation_contract_only_no_gate_change_authorized"
  ) {
    fail("candidate_identity_mismatch");
  }

  if (
    typeof value.reviewed_source_main_commit !== "string" ||
    !HEX40.test(value.reviewed_source_main_commit) ||
    value.reviewed_source_main_commit !==
      "eef17f65a8bd495d581df3b91d9a411a5402cde8"
  ) {
    fail("reviewed_source_main_commit_invalid");
  }

  exactObject(
    value.reviewed_source_blobs,
    EXPECTED_SOURCE_BLOBS,
    "reviewed_source_blobs",
  );
  if (verifyFilesystem) {
    for (const [relativePath, expectedBlob] of
      Object.entries(EXPECTED_SOURCE_BLOBS)) {
      if (gitBlob(relativePath) !== expectedBlob) {
        fail("live_source_blob_mismatch:" + relativePath);
      }
    }
  }

  exactObject(
    value.observed_readiness,
    EXPECTED_READINESS,
    "observed_readiness",
  );
  for (const [key, val] of Object.entries(value.observed_readiness)) {
    if (
      key.endsWith("_sha256") &&
      (typeof val !== "string" || !HEX64.test(val))
    ) {
      fail("readiness_sha256_invalid:" + key);
    }
  }
  if (
    typeof value.observed_readiness.history_carrier_authority_id !== "string" ||
    !HEX64.test(value.observed_readiness.history_carrier_authority_id)
  ) {
    fail("history_carrier_authority_id_invalid");
  }

  exactObject(
    value.observed_gate_state,
    EXPECTED_GATE_STATE,
    "observed_gate_state",
  );

  if (
    !Array.isArray(value.activation_phase_order) ||
    JSON.stringify(value.activation_phase_order) !==
      JSON.stringify(EXPECTED_PHASE_ORDER)
  ) {
    fail("activation_phase_order_mismatch");
  }

  exactObject(
    value.transition_policy,
    EXPECTED_TRANSITION_POLICY,
    "transition_policy",
  );
  exactObject(value.authority, EXPECTED_AUTHORITY, "authority");

  return Object.freeze({
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1,
    version: 1,
    status: "candidate_verified_activation_not_authorized",
    current_phase: "dormant",
    readiness_bound: true,
    source_blobs_bound: true,
    activation_authorized: false,
    runtime_gate_mutation: false,
    service_mutation: false,
    credential_read: false,
    database_mutation: false,
    transaction_broadcast: false,
    funds_movement: false,
  });
}

export function loadAndVerifyVoidBuyVoidPostgresActivationCandidateV1() {
  const value = JSON.parse(fs.readFileSync(CANDIDATE, "utf8"));
  return verifyVoidBuyVoidPostgresActivationCandidateV1(value);
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (direct) {
  try {
    const result = loadAndVerifyVoidBuyVoidPostgresActivationCandidateV1();
    console.log(
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1,
    );
    console.log("status=" + result.status);
    console.log("current_phase=" + result.current_phase);
    console.log("readiness_bound=true");
    console.log("source_blobs_bound=true");
    console.log("activation_authorized=false");
    console.log("runtime_gate_mutation=false");
    console.log("service_mutation=false");
    console.log("credential_read=false");
    console.log("database_mutation=false");
    console.log("transaction_broadcast=false");
    console.log("funds_movement=false");
    console.log(
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1_GREEN",
    );
  } catch (error) {
    console.error(
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1_HOLD",
    );
    console.error(
      "reason=" + (error instanceof Error ? error.message : String(error)),
    );
    process.exitCode = 2;
  }
}
