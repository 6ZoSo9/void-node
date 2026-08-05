#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DECISION_RUNTIME,
  DECISION_SYNTHETIC,
  MARKER,
  buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1,
  computeRequestId,
  validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1,
} from "../tools/buy-void-native-delivery-canary-admission-request-v1.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_PATH = join(
  ROOT,
  "fixtures/economic/buy-void-native-delivery-canary-admission-request-v1.example.json",
);
const SCHEMA_PATH = join(
  ROOT,
  "schemas/buy-void-native-delivery-canary-admission-request-v1.schema.json",
);
const TOOL_PATH = join(
  ROOT,
  "tools/buy-void-native-delivery-canary-admission-request-v1.mjs",
);
const EXPECTED_REQUEST_ID =
  "voidbvndcar1_1cff15d4dd49d548510faf8e0f068f665f76c226c85f34f188ad718dec1acd00";

function clone(value) {
  return structuredClone(value);
}

function reseal(value) {
  value.request_id = computeRequestId(value);
  return value;
}

function reject(label, fixture, mutate, pattern) {
  const changed = clone(fixture);
  mutate(changed);
  reseal(changed);
  assert.throws(
    () => validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(changed),
    pattern,
    label,
  );
}

const fixtureText = readFileSync(FIXTURE_PATH, "utf8");
const fixture = JSON.parse(fixtureText);
const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const toolSource = readFileSync(TOOL_PATH, "utf8");

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(
  schema.$id,
  "void://schemas/buy-void-native-delivery-canary-admission-request-v1",
);
assert.equal(schema.additionalProperties, false);
assert.equal(
  schema.properties.request_id.pattern,
  "^voidbvndcar1_[0-9a-f]{64}$",
);
assert.equal(schema.properties.authority.additionalProperties, false);
assert.equal(schema.properties.runtime_posture.additionalProperties, false);
assert.equal(schema.allOf.length, 2);

for (const required of [
  'import crypto from "node:crypto"',
  "void_buy_void_native_delivery_canary_admission_request_v1",
  MARKER,
  "voidbvndcar1_",
  DECISION_SYNTHETIC,
  DECISION_RUNTIME,
  "canonicalJson",
  "computeRequestId",
  "validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1",
  "buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1",
  "transaction_broadcast",
  "money_movement",
]) {
  assert.equal(toolSource.includes(required), true, `tool missing ${required}`);
}

for (const forbidden of [
  'from "node:fs"',
  'from "node:http"',
  'from "node:https"',
  'from "node:child_process"',
  "fetch(",
  "process.env",
  "systemctl",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "signTransaction(",
  "writeFile",
  "appendFile",
]) {
  assert.equal(
    toolSource.includes(forbidden),
    false,
    `tool contains forbidden ${forbidden}`,
  );
}

for (const forbidden of [
  "://",
  '"private_key"',
  '"mnemonic"',
  '"wallet_address"',
  '"rpc_url"',
  '"raw_signed_transaction"',
]) {
  assert.equal(
    fixtureText.includes(forbidden),
    false,
    `fixture contains forbidden ${forbidden}`,
  );
}

assert.equal(fixture.marker, MARKER);
assert.equal(fixture.request_id, EXPECTED_REQUEST_ID);
assert.equal(computeRequestId(fixture), EXPECTED_REQUEST_ID);
assert.equal(fixture.source.main_commit, "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e");
assert.equal(
  fixture.source.candidate_readiness_schema_blob,
  "2a0fc85b582ce59def204060c803f04c385a4094",
);
assert.equal(
  fixture.source.dependency_readiness_source_blob,
  "adc44589068b12644f7a01e37a3503d048ec23da",
);
assert.equal(
  fixture.source.native_execution_runtime_source_blob,
  "9a04e0a20da2a2eabf8b87713782179138136174",
);
assert.equal(
  fixture.source.native_execution_idempotency_commit,
  "ac3449d113012c0d37a8b5f099e41f9d081d0279",
);
assert.equal(fixture.decision, DECISION_SYNTHETIC);
assert.deepEqual(
  validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(clone(fixture)),
  fixture,
);

const fixtureInput = clone(fixture);
delete fixtureInput.schema;
delete fixtureInput.marker;
delete fixtureInput.version;
delete fixtureInput.request_id;
assert.deepEqual(
  buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1(fixtureInput),
  fixture,
);

const forgedId = clone(fixture);
forgedId.request_id = `voidbvndcar1_${"f".repeat(64)}`;
assert.throws(
  () => validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(forgedId),
  /request_id mismatch/,
);

const harmlessReseal = clone(fixture);
harmlessReseal.candidate_evidence.report_sha256 = "a".repeat(64);
reseal(harmlessReseal);
assert.notEqual(harmlessReseal.request_id, fixture.request_id);
assert.equal(
  validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(harmlessReseal)
    .request_id,
  harmlessReseal.request_id,
);

reject(
  "multiple candidates",
  fixture,
  (value) => {
    value.candidate_evidence.eligible_candidate_count = 2;
  },
  /eligible_candidate_count mismatch/,
);
reject(
  "candidate request mismatch",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.request_id =
      "void-buy-void-other-request-v1";
  },
  /native_execution_dry_run_evidence.request_id mismatch/,
);
reject(
  "candidate plan mismatch",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.plan_fingerprint_sha256 =
      "b".repeat(64);
  },
  /native_execution_dry_run_evidence.plan_fingerprint_sha256 mismatch/,
);
reject(
  "wallet fingerprint mismatch",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.wallet_address_fingerprint_sha256 =
      "c".repeat(64);
  },
  /native_execution_dry_run_evidence.wallet_address_fingerprint_sha256 mismatch/,
);
reject(
  "chain mismatch",
  fixture,
  (value) => {
    value.dependency_evidence.chain_id = "1";
  },
  /dependency_evidence.chain_id mismatch/,
);
reject(
  "orphan-only candidate",
  fixture,
  (value) => {
    value.candidate_evidence.orphan_operator_event_only = true;
  },
  /orphan_operator_event_only must be false/,
);
reject(
  "candidate parse failure",
  fixture,
  (value) => {
    value.candidate_evidence.parse_failure_count = 1;
  },
  /parse_failure_count mismatch/,
);
reject(
  "native value limit",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.native_value_wei =
      "1000000000000000001";
  },
  /dry-run native value exceeds canary limit/,
);
reject(
  "gas limit",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.gas_limit = "21001";
  },
  /dry-run gas limit exceeds canary limit/,
);
reject(
  "fee limit",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.max_fee_per_gas_wei = "1000000001";
  },
  /dry-run max fee exceeds canary limit/,
);
reject(
  "priority fee limit",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.max_priority_fee_per_gas_wei =
      "100000001";
  },
  /dry-run priority fee exceeds canary limit/,
);
reject(
  "total fee arithmetic",
  fixture,
  (value) => {
    value.canary_limits.maximum_total_fee_wei = "1";
  },
  /canary maximum_total_fee_wei mismatch/,
);
reject(
  "automatic retry",
  fixture,
  (value) => {
    value.canary_limits.automatic_retry_allowed = true;
  },
  /automatic_retry_allowed must be false/,
);
reject(
  "persistent runtime enablement",
  fixture,
  (value) => {
    value.runtime_posture.persistent_native_execution_runtime_enabled = true;
  },
  /persistent_native_execution_runtime_enabled must be false/,
);
reject(
  "apply request",
  fixture,
  (value) => {
    value.runtime_posture.apply_requested = true;
  },
  /apply_requested must be false/,
);
reject(
  "dependency signing",
  fixture,
  (value) => {
    value.dependency_evidence.signing_performed = true;
  },
  /dependency_evidence.signing_performed must be false/,
);
reject(
  "dry-run broadcast",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.transaction_broadcast_performed =
      true;
  },
  /transaction_broadcast_performed must be false/,
);
reject(
  "dry-run money movement",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.money_movement = true;
  },
  /money_movement must be false/,
);
reject(
  "ZoSo authorization",
  fixture,
  (value) => {
    value.review.zoso_canary_authorized = true;
  },
  /zoso_canary_authorized must be false/,
);
reject(
  "wallet funding authorization",
  fixture,
  (value) => {
    value.review.dedicated_wallet_funding_authorized = true;
  },
  /dedicated_wallet_funding_authorized must be false/,
);
reject(
  "signing authority",
  fixture,
  (value) => {
    value.authority.signing = true;
  },
  /authority.signing must be false/,
);
reject(
  "broadcast authority",
  fixture,
  (value) => {
    value.authority.transaction_broadcast = true;
  },
  /authority.transaction_broadcast must be false/,
);
reject(
  "money authority",
  fixture,
  (value) => {
    value.authority.money_movement = true;
  },
  /authority.money_movement must be false/,
);
reject(
  "raw URL",
  fixture,
  (value) => {
    value.dependency_evidence.proof_location = "http://127.0.0.1:8545";
  },
  /contains a raw URL/,
);
reject(
  "raw address",
  fixture,
  (value) => {
    value.candidate_evidence.recipient = `0x${"1".repeat(40)}`;
  },
  /contains a raw address/,
);
reject(
  "secret field",
  fixture,
  (value) => {
    value.private_key = "not-a-real-key";
  },
  /private_key is forbidden/,
);
reject(
  "unknown harmless field",
  fixture,
  (value) => {
    value.review.note = "not allowed";
  },
  /review keys mismatch/,
);

const runtimeRequest = clone(fixture);
runtimeRequest.evidence_class = "runtime_sanitized";
runtimeRequest.review.live_runtime_evidence_established = true;
runtimeRequest.decision = DECISION_RUNTIME;
reseal(runtimeRequest);
assert.equal(
  validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(runtimeRequest)
    .decision,
  DECISION_RUNTIME,
);
assert.notEqual(runtimeRequest.request_id, fixture.request_id);

reject(
  "synthetic live-runtime claim",
  fixture,
  (value) => {
    value.review.live_runtime_evidence_established = true;
  },
  /review.live_runtime_evidence_established mismatch/,
);
reject(
  "runtime evidence without live flag",
  runtimeRequest,
  (value) => {
    value.review.live_runtime_evidence_established = false;
  },
  /review.live_runtime_evidence_established mismatch/,
);
reject(
  "runtime evidence with synthetic decision",
  runtimeRequest,
  (value) => {
    value.decision = DECISION_SYNTHETIC;
  },
  /decision mismatch/,
);

console.log(`marker=${MARKER}`);
console.log(`synthetic_request_id=${fixture.request_id}`);
console.log(`runtime_request_id=${runtimeRequest.request_id}`);
console.log("credential_read_performed=false");
console.log("network_request_performed=false");
console.log("runtime_mutation_performed=false");
console.log("wallet_access_performed=false");
console.log("signing_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement=false");
console.log(`${MARKER}_PROOF_GREEN`);
