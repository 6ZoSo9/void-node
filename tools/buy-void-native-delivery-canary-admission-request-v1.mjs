import crypto from "node:crypto";

export const SCHEMA =
  "void_buy_void_native_delivery_canary_admission_request_v1";
export const MARKER =
  "VOID_BUY_VOID_NATIVE_DELIVERY_CANARY_ADMISSION_REQUEST_V1";
export const ID_PREFIX = "voidbvndcar1_";
export const EVIDENCE_CLASS = "synthetic_example";
export const DECISION_SYNTHETIC =
  "HOLD_PENDING_ROOT_SCOPED_RUNTIME_EVIDENCE_WALLET_FUNDING_BOUNDARY_AND_ZOSO_CANARY_AUTHORIZATION";

export const SOURCE_BINDING_V1 = Object.freeze({
  main_commit: "b724cb1bee1418bbfa5f8ad44974bebf4cd81c9e",
  candidate_readiness_schema_path:
    "schemas/buy-void-observe-and-claim-candidate-readiness-v1.schema.json",
  candidate_readiness_schema_blob:
    "2a0fc85b582ce59def204060c803f04c385a4094",
  candidate_readiness_source_path:
    "src/economic/buy_void_observe_and_claim_candidate_readiness_v1.ts",
  candidate_readiness_source_blob:
    "f0f2a49a019e32c961ee96b9823830bfdaf9fe40",
  dependency_readiness_source_path:
    "src/economic/buy_void_native_delivery_dependency_readiness_v1.ts",
  dependency_readiness_source_blob:
    "adc44589068b12644f7a01e37a3503d048ec23da",
  native_execution_runtime_source_path:
    "src/economic/buy_void_native_execution_runtime_v1.ts",
  native_execution_runtime_source_blob:
    "9a04e0a20da2a2eabf8b87713782179138136174",
  native_execution_idempotency_commit:
    "ac3449d113012c0d37a8b5f099e41f9d081d0279",
});

const SHA256 = /^[0-9a-f]{64}$/u;
const REQUEST_ID = /^[A-Za-z0-9._:-]{3,160}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const RAW_ADDRESS = /^0x[0-9a-f]{40}$/iu;
const RAW_URL_SCHEME = /^(?:https?|wss?|ftp|file|data|mailto):/iu;

const FORBIDDEN_KEYS = new Set([
  "privatekey",
  "mnemonic",
  "seed",
  "seedphrase",
  "rawtransaction",
  "rawsignedtransaction",
  "signedtransaction",
  "authorizationheader",
  "credentialcontent",
  "rpcurl",
  "walletaddress",
  "signer",
  "secret",
  "token",
  "password",
  "proto",
  "prototype",
  "constructor",
]);

const AUTHORITY_KEYS = [
  "runtime_enablement",
  "dependency_assignment",
  "credential_access",
  "wallet_funding",
  "wallet_access",
  "inventory_reservation",
  "execution_attempt_reservation",
  "transaction_construction",
  "signing",
  "transaction_broadcast",
  "rpc_mutation",
  "receipt_closeout",
  "inventory_decrement",
  "service_restart",
  "automatic_retry",
  "money_movement",
];

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(object(value, label)).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function exact(value, expected, label) {
  if (value !== expected) fail(`${label} mismatch`);
}

function boolFalse(value, label) {
  if (value !== false) fail(`${label} must be false`);
}

function boolTrue(value, label) {
  if (value !== true) fail(`${label} must be true`);
}

function sha256(value, label) {
  if (!SHA256.test(String(value || ""))) fail(`${label} must be sha256`);
}

function safeRequestId(value, label) {
  const text = String(value || "");
  if (!REQUEST_ID.test(text)) fail(`${label} must be a safe request id`);
}

function decimal(value, label, { positive = false } = {}) {
  const text = String(value ?? "");
  if (!DECIMAL.test(text)) fail(`${label} must be an unsigned decimal string`);
  const result = BigInt(text);
  if (positive && result <= 0n) fail(`${label} must be positive`);
  return result;
}

function normalizeKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/gu, "");
}

function assertNoSecretMaterial(value, path = "request", depth = 0) {
  if (depth > 20) fail(`${path} exceeds maximum depth`);
  if (typeof value === "string") {
    const text = value.trim();
    if (text.includes("://") || RAW_URL_SCHEME.test(text)) {
      fail(`${path} contains a raw URL`);
    }
    if (RAW_ADDRESS.test(text)) fail(`${path} contains a raw address`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoSecretMaterial(entry, `${path}[${index}]`, depth + 1),
    );
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(normalizeKey(key))) {
      fail(`${path}.${key} is forbidden`);
    }
    assertNoSecretMaterial(nested, `${path}.${key}`, depth + 1);
  }
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value !== "object") {
    fail(`canonical JSON rejects ${typeof value}`);
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

export function requestBody(request) {
  const body = structuredClone(object(request, "request"));
  delete body.request_id;
  return body;
}

export function computeRequestId(request) {
  return (
    ID_PREFIX +
    crypto
      .createHash("sha256")
      .update(canonicalJson(requestBody(request)), "utf8")
      .digest("hex")
  );
}

function validateSource(source) {
  exactKeys(source, Object.keys(SOURCE_BINDING_V1), "source");
  for (const [key, expected] of Object.entries(SOURCE_BINDING_V1)) {
    exact(source[key], expected, `source.${key}`);
  }
}

function validateCandidate(candidate) {
  exactKeys(
    candidate,
    [
      "report_marker",
      "report_sha256",
      "readiness_status",
      "eligible_candidate_count",
      "recommended_request_id",
      "recommended_plan_fingerprint_sha256",
      "canonical_request_record_present",
      "orphan_operator_event_only",
      "parse_failure_count",
      "wallet_access_authorized",
      "signing_authorized",
      "transaction_broadcast_authorized",
      "money_movement_authorized",
    ],
    "candidate_evidence",
  );
  exact(
    candidate.report_marker,
    "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
    "candidate_evidence.report_marker",
  );
  sha256(candidate.report_sha256, "candidate_evidence.report_sha256");
  exact(candidate.readiness_status, "exact_one", "candidate_evidence.readiness_status");
  exact(candidate.eligible_candidate_count, 1, "candidate_evidence.eligible_candidate_count");
  safeRequestId(
    candidate.recommended_request_id,
    "candidate_evidence.recommended_request_id",
  );
  sha256(
    candidate.recommended_plan_fingerprint_sha256,
    "candidate_evidence.recommended_plan_fingerprint_sha256",
  );
  boolTrue(
    candidate.canonical_request_record_present,
    "candidate_evidence.canonical_request_record_present",
  );
  boolFalse(
    candidate.orphan_operator_event_only,
    "candidate_evidence.orphan_operator_event_only",
  );
  exact(candidate.parse_failure_count, 0, "candidate_evidence.parse_failure_count");
  for (const key of [
    "wallet_access_authorized",
    "signing_authorized",
    "transaction_broadcast_authorized",
    "money_movement_authorized",
  ]) {
    boolFalse(candidate[key], `candidate_evidence.${key}`);
  }
}

function validateDependencies(dependencies) {
  exactKeys(
    dependencies,
    [
      "report_marker",
      "report_sha256",
      "status",
      "credential_id",
      "chain_id",
      "wallet_address_fingerprint_sha256",
      "rpc_url_fingerprint_sha256",
      "credential_read_performed",
      "chain_identity_probe_performed",
      "signing_performed",
      "transaction_broadcast_performed",
      "dependency_assignment_performed",
      "runtime_enablement_performed",
      "money_movement",
    ],
    "dependency_evidence",
  );
  exact(
    dependencies.report_marker,
    "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1",
    "dependency_evidence.report_marker",
  );
  sha256(dependencies.report_sha256, "dependency_evidence.report_sha256");
  exact(dependencies.status, "ready", "dependency_evidence.status");
  exact(
    dependencies.credential_id,
    "buy-void-native-fulfillment-wallet-v1",
    "dependency_evidence.credential_id",
  );
  exact(dependencies.chain_id, "2050", "dependency_evidence.chain_id");
  sha256(
    dependencies.wallet_address_fingerprint_sha256,
    "dependency_evidence.wallet_address_fingerprint_sha256",
  );
  sha256(
    dependencies.rpc_url_fingerprint_sha256,
    "dependency_evidence.rpc_url_fingerprint_sha256",
  );
  boolTrue(
    dependencies.credential_read_performed,
    "dependency_evidence.credential_read_performed",
  );
  boolTrue(
    dependencies.chain_identity_probe_performed,
    "dependency_evidence.chain_identity_probe_performed",
  );
  for (const key of [
    "signing_performed",
    "transaction_broadcast_performed",
    "dependency_assignment_performed",
    "runtime_enablement_performed",
    "money_movement",
  ]) {
    boolFalse(dependencies[key], `dependency_evidence.${key}`);
  }
}

function validateDryRun(dryRun, candidate, dependencies) {
  exactKeys(
    dryRun,
    [
      "report_marker",
      "report_sha256",
      "status",
      "attempt_id",
      "request_id",
      "reconstructed_from_server_journals",
      "plan_fingerprint_sha256",
      "chain_id",
      "wallet_address_fingerprint_sha256",
      "native_value_wei",
      "gas_limit",
      "max_fee_per_gas_wei",
      "max_priority_fee_per_gas_wei",
      "mutation_performed",
      "signing_performed",
      "transaction_broadcast_performed",
      "money_movement",
    ],
    "native_execution_dry_run_evidence",
  );
  exact(
    dryRun.report_marker,
    "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1",
    "native_execution_dry_run_evidence.report_marker",
  );
  sha256(dryRun.report_sha256, "native_execution_dry_run_evidence.report_sha256");
  exact(dryRun.status, "dry_run", "native_execution_dry_run_evidence.status");
  safeRequestId(dryRun.attempt_id, "native_execution_dry_run_evidence.attempt_id");
  exact(
    dryRun.request_id,
    candidate.recommended_request_id,
    "native_execution_dry_run_evidence.request_id",
  );
  boolTrue(
    dryRun.reconstructed_from_server_journals,
    "native_execution_dry_run_evidence.reconstructed_from_server_journals",
  );
  exact(
    dryRun.plan_fingerprint_sha256,
    candidate.recommended_plan_fingerprint_sha256,
    "native_execution_dry_run_evidence.plan_fingerprint_sha256",
  );
  exact(dryRun.chain_id, "2050", "native_execution_dry_run_evidence.chain_id");
  exact(
    dryRun.wallet_address_fingerprint_sha256,
    dependencies.wallet_address_fingerprint_sha256,
    "native_execution_dry_run_evidence.wallet_address_fingerprint_sha256",
  );
  const nativeValue = decimal(
    dryRun.native_value_wei,
    "native_execution_dry_run_evidence.native_value_wei",
    { positive: true },
  );
  const gasLimit = decimal(
    dryRun.gas_limit,
    "native_execution_dry_run_evidence.gas_limit",
    { positive: true },
  );
  const maxFee = decimal(
    dryRun.max_fee_per_gas_wei,
    "native_execution_dry_run_evidence.max_fee_per_gas_wei",
    { positive: true },
  );
  const maxPriority = decimal(
    dryRun.max_priority_fee_per_gas_wei,
    "native_execution_dry_run_evidence.max_priority_fee_per_gas_wei",
  );
  if (maxPriority > maxFee) fail("native execution priority fee exceeds max fee");
  for (const key of [
    "mutation_performed",
    "signing_performed",
    "transaction_broadcast_performed",
    "money_movement",
  ]) {
    boolFalse(dryRun[key], `native_execution_dry_run_evidence.${key}`);
  }
  return { nativeValue, gasLimit, maxFee, maxPriority };
}

function validateLimits(limits, dryRunValues) {
  exactKeys(
    limits,
    [
      "maximum_request_count",
      "maximum_attempt_count",
      "maximum_native_value_wei",
      "maximum_gas_limit",
      "maximum_fee_per_gas_wei",
      "maximum_priority_fee_per_gas_wei",
      "maximum_total_fee_wei",
      "maximum_total_outlay_wei",
      "automatic_retry_allowed",
    ],
    "canary_limits",
  );
  exact(limits.maximum_request_count, 1, "canary_limits.maximum_request_count");
  exact(limits.maximum_attempt_count, 1, "canary_limits.maximum_attempt_count");
  const maxValue = decimal(
    limits.maximum_native_value_wei,
    "canary_limits.maximum_native_value_wei",
    { positive: true },
  );
  const maxGas = decimal(
    limits.maximum_gas_limit,
    "canary_limits.maximum_gas_limit",
    { positive: true },
  );
  const maxFee = decimal(
    limits.maximum_fee_per_gas_wei,
    "canary_limits.maximum_fee_per_gas_wei",
    { positive: true },
  );
  const maxPriority = decimal(
    limits.maximum_priority_fee_per_gas_wei,
    "canary_limits.maximum_priority_fee_per_gas_wei",
  );
  const maxTotalFee = decimal(
    limits.maximum_total_fee_wei,
    "canary_limits.maximum_total_fee_wei",
    { positive: true },
  );
  const maxTotalOutlay = decimal(
    limits.maximum_total_outlay_wei,
    "canary_limits.maximum_total_outlay_wei",
    { positive: true },
  );
  if (maxPriority > maxFee) fail("canary priority fee exceeds max fee");
  if (maxTotalFee !== maxGas * maxFee) {
    fail("canary maximum_total_fee_wei mismatch");
  }
  if (maxTotalOutlay !== maxValue + maxTotalFee) {
    fail("canary maximum_total_outlay_wei mismatch");
  }
  if (dryRunValues.nativeValue > maxValue) {
    fail("dry-run native value exceeds canary limit");
  }
  if (dryRunValues.gasLimit > maxGas) {
    fail("dry-run gas limit exceeds canary limit");
  }
  if (dryRunValues.maxFee > maxFee) {
    fail("dry-run max fee exceeds canary limit");
  }
  if (dryRunValues.maxPriority > maxPriority) {
    fail("dry-run priority fee exceeds canary limit");
  }
  const dryRunTotalFee = dryRunValues.gasLimit * dryRunValues.maxFee;
  const dryRunTotalOutlay = dryRunValues.nativeValue + dryRunTotalFee;
  if (dryRunTotalFee > maxTotalFee) {
    fail("dry-run total fee exceeds canary limit");
  }
  if (dryRunTotalOutlay > maxTotalOutlay) {
    fail("dry-run total outlay exceeds canary limit");
  }
  boolFalse(limits.automatic_retry_allowed, "canary_limits.automatic_retry_allowed");
}

function validatePosture(posture) {
  exactKeys(
    posture,
    [
      "persistent_dependency_injector_enabled",
      "persistent_native_delivery_runtime_enabled",
      "persistent_native_execution_runtime_enabled",
      "persistent_receipt_runtime_enabled",
      "service_restart_authorized",
      "apply_requested",
    ],
    "runtime_posture",
  );
  for (const key of Object.keys(posture)) {
    boolFalse(posture[key], `runtime_posture.${key}`);
  }
}

function validateReview(review) {
  exactKeys(
    review,
    [
      "root_scoped_candidate_evidence_established",
      "runtime_evidence_materializer_established",
      "live_runtime_evidence_established",
      "dedicated_wallet_funding_boundary_established",
      "dedicated_wallet_funding_authorized",
      "candidate_selected_for_live_execution",
      "zoso_canary_authorized",
      "zoso_authorization_id",
    ],
    "review",
  );
  for (const key of [
    "root_scoped_candidate_evidence_established",
    "runtime_evidence_materializer_established",
    "live_runtime_evidence_established",
    "dedicated_wallet_funding_boundary_established",
    "dedicated_wallet_funding_authorized",
    "candidate_selected_for_live_execution",
    "zoso_canary_authorized",
  ]) {
    boolFalse(review[key], `review.${key}`);
  }
  if (review.zoso_authorization_id !== null) {
    fail("review.zoso_authorization_id must be null");
  }
}

function validateAuthority(authority) {
  exactKeys(authority, AUTHORITY_KEYS, "authority");
  for (const key of AUTHORITY_KEYS) {
    boolFalse(authority[key], `authority.${key}`);
  }
}

export function validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(request) {
  assertNoSecretMaterial(request);
  exactKeys(
    request,
    [
      "schema",
      "marker",
      "version",
      "request_id",
      "evidence_class",
      "source",
      "candidate_evidence",
      "dependency_evidence",
      "native_execution_dry_run_evidence",
      "canary_limits",
      "runtime_posture",
      "review",
      "decision",
      "authority",
    ],
    "request",
  );
  exact(request.schema, SCHEMA, "schema");
  exact(request.marker, MARKER, "marker");
  exact(request.version, 1, "version");
  exact(request.evidence_class, EVIDENCE_CLASS, "evidence_class");
  validateSource(request.source);
  validateCandidate(request.candidate_evidence);
  validateDependencies(request.dependency_evidence);
  const dryRunValues = validateDryRun(
    request.native_execution_dry_run_evidence,
    request.candidate_evidence,
    request.dependency_evidence,
  );
  validateLimits(request.canary_limits, dryRunValues);
  validatePosture(request.runtime_posture);
  validateReview(request.review);
  validateAuthority(request.authority);
  exact(request.decision, DECISION_SYNTHETIC, "decision");
  const expectedId = computeRequestId(request);
  exact(request.request_id, expectedId, "request_id");
  return request;
}

export function buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1(input) {
  const cloned = structuredClone(object(input, "input"));
  for (const fixed of ["schema", "marker", "version", "request_id"]) {
    if (Object.prototype.hasOwnProperty.call(cloned, fixed)) {
      fail(`input.${fixed} must be omitted`);
    }
  }
  const request = {
    schema: SCHEMA,
    marker: MARKER,
    version: 1,
    request_id: null,
    ...cloned,
  };
  request.request_id = computeRequestId(request);
  return validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(request);
}
