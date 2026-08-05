#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DECISION_SYNTHETIC,
  EVIDENCE_CLASS,
  MARKER,
  SOURCE_BINDING_V1,
  buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1,
  canonicalJson,
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
  "voidbvndcar1_23ae1a9ffa5ea501b295d125b027dce940d317e1ca0c28b1c7808514b4cc0761";

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
assert.equal(schema.properties.evidence_class.const, EVIDENCE_CLASS);
assert.equal(schema.properties.decision.const, DECISION_SYNTHETIC);
assert.equal(schema.properties.authority.additionalProperties, false);
assert.equal(schema.properties.runtime_posture.additionalProperties, false);
assert.equal(
  schema.properties.review.properties.live_runtime_evidence_established.const,
  false,
);
assert.equal(
  schema.properties.review.properties
    .root_scoped_candidate_evidence_established.const,
  false,
);
assert.equal(
  schema.properties.review.properties
    .runtime_evidence_materializer_established.const,
  false,
);
assert.equal(Object.hasOwn(schema, "allOf"), false);
assert.deepEqual(
  Object.fromEntries(
    Object.entries(schema.properties.source.properties).map(([key, value]) => [
      key,
      value.const,
    ]),
  ),
  SOURCE_BINDING_V1,
);
assert.equal(
  schema.properties.canary_limits.required.includes(
    "maximum_total_outlay_wei",
  ),
  true,
);

for (const required of [
  'import crypto from "node:crypto"',
  "void_buy_void_native_delivery_canary_admission_request_v1",
  MARKER,
  "voidbvndcar1_",
  EVIDENCE_CLASS,
  DECISION_SYNTHETIC,
  "SOURCE_BINDING_V1",
  "canonicalJson",
  "computeRequestId",
  "validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1",
  "buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1",
  "maximum_total_outlay_wei",
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
  "DECISION_RUNTIME",
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
assert.equal(fixture.evidence_class, EVIDENCE_CLASS);
assert.equal(fixture.request_id, EXPECTED_REQUEST_ID);
assert.equal(computeRequestId(fixture), EXPECTED_REQUEST_ID);
assert.deepEqual(fixture.source, SOURCE_BINDING_V1);
assert.equal(fixture.decision, DECISION_SYNTHETIC);
assert.equal(
  fixture.canary_limits.maximum_total_outlay_wei,
  (
    BigInt(fixture.canary_limits.maximum_native_value_wei) +
    BigInt(fixture.canary_limits.maximum_total_fee_wei)
  ).toString(),
);
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

for (const fixed of ["schema", "marker", "version", "request_id"]) {
  const fixedInput = clone(fixtureInput);
  fixedInput[fixed] = fixed === "version" ? 1 : "unexpected";
  assert.throws(
    () => buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1(fixedInput),
    new RegExp(`input\\.${fixed} must be omitted`),
  );
}

assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
assert.throws(() => canonicalJson(undefined), /canonical JSON rejects undefined/);
assert.throws(() => canonicalJson(Number.NaN), /non-finite numbers/);

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
  "runtime evidence-class laundering",
  fixture,
  (value) => {
    value.evidence_class = "runtime_sanitized";
    value.review.live_runtime_evidence_established = true;
  },
  /evidence_class mismatch/,
);
reject(
  "source main spoof",
  fixture,
  (value) => {
    value.source.main_commit = "f".repeat(40);
  },
  /source\.main_commit mismatch/,
);
reject(
  "candidate source blob spoof",
  fixture,
  (value) => {
    value.source.candidate_readiness_source_blob = "e".repeat(40);
  },
  /source\.candidate_readiness_source_blob mismatch/,
);
reject(
  "native runtime blob spoof",
  fixture,
  (value) => {
    value.source.native_execution_runtime_source_blob = "d".repeat(40);
  },
  /source\.native_execution_runtime_source_blob mismatch/,
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
  /native_execution_dry_run_evidence\.request_id mismatch/,
);
reject(
  "candidate plan mismatch",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.plan_fingerprint_sha256 =
      "b".repeat(64);
  },
  /native_execution_dry_run_evidence\.plan_fingerprint_sha256 mismatch/,
);
reject(
  "wallet fingerprint mismatch",
  fixture,
  (value) => {
    value.native_execution_dry_run_evidence.wallet_address_fingerprint_sha256 =
      "c".repeat(64);
  },
  /native_execution_dry_run_evidence\.wallet_address_fingerprint_sha256 mismatch/,
);
reject(
  "chain mismatch",
  fixture,
  (value) => {
    value.dependency_evidence.chain_id = "1";
  },
  /dependency_evidence\.chain_id mismatch/,
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
  "total outlay arithmetic",
  fixture,
  (value) => {
    value.canary_limits.maximum_total_outlay_wei = "1";
  },
  /canary maximum_total_outlay_wei mismatch/,
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
  /dependency_evidence\.signing_performed must be false/,
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
  "root-scoped evidence claim",
  fixture,
  (value) => {
    value.review.root_scoped_candidate_evidence_established = true;
  },
  /root_scoped_candidate_evidence_established must be false/,
);
reject(
  "runtime materializer claim",
  fixture,
  (value) => {
    value.review.runtime_evidence_materializer_established = true;
  },
  /runtime_evidence_materializer_established must be false/,
);
reject(
  "live runtime claim",
  fixture,
  (value) => {
    value.review.live_runtime_evidence_established = true;
  },
  /live_runtime_evidence_established must be false/,
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
  /authority\.signing must be false/,
);
reject(
  "broadcast authority",
  fixture,
  (value) => {
    value.authority.transaction_broadcast = true;
  },
  /authority\.transaction_broadcast must be false/,
);
reject(
  "money authority",
  fixture,
  (value) => {
    value.authority.money_movement = true;
  },
  /authority\.money_movement must be false/,
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
  "scheme-only raw URL",
  fixture,
  (value) => {
    value.candidate_evidence.note = "mailto:operator@example.invalid";
  },
  /contains a raw URL/,
);
reject(
  "raw address",
  fixture,
  (value) => {
    value.candidate_evidence.recipient = `0X${"1".repeat(40)}`;
  },
  /contains a raw address/,
);
reject(
  "normalized secret field",
  fixture,
  (value) => {
    value["private-key"] = "not-a-real-key";
  },
  /private-key is forbidden/,
);
reject(
  "unknown harmless field",
  fixture,
  (value) => {
    value.review.note = "not allowed";
  },
  /review keys mismatch/,
);

console.log(`marker=${MARKER}`);
console.log(`evidence_class=${fixture.evidence_class}`);
console.log(`synthetic_request_id=${fixture.request_id}`);
console.log("runtime_sanitized_supported=false");
console.log("root_scoped_candidate_evidence_established=false");
console.log("runtime_evidence_materializer_established=false");
console.log("credential_read_performed=false");
console.log("network_request_performed=false");
console.log("runtime_mutation_performed=false");
console.log("wallet_access_performed=false");
console.log("signing_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement=false");
console.log(`${MARKER}_PROOF_GREEN`);
