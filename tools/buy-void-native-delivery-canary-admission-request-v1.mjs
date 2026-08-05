import crypto from "node:crypto";

export const SCHEMA =
  "void_buy_void_native_delivery_canary_admission_request_v1";
export const MARKER =
  "VOID_BUY_VOID_NATIVE_DELIVERY_CANARY_ADMISSION_REQUEST_V1";
export const ID_PREFIX = "voidbvndcar1_";

export const DECISION_SYNTHETIC =
  "HOLD_PENDING_LIVE_RUNTIME_EVIDENCE_WALLET_FUNDING_BOUNDARY_AND_ZOSO_CANARY_AUTHORIZATION";
export const DECISION_RUNTIME =
  "HOLD_PENDING_WALLET_FUNDING_BOUNDARY_AND_ZOSO_CANARY_AUTHORIZATION";

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA = /^[0-9a-f]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{3,160}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const FORBIDDEN_KEYS = new Set([
  "private_key",
  "privatekey",
  "mnemonic",
  "seed",
  "seed_phrase",
  "raw_transaction",
  "raw_signed_transaction",
  "signed_transaction",
  "authorization_header",
  "credential_content",
  "rpc_url",
  "wallet_address",
  "signer",
  "secret",
  "token",
  "password",
  "__proto__",
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

function string(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
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

function gitSha(value, label) {
  if (!GIT_SHA.test(String(value || ""))) fail(`${label} must be git sha`);
}

function safeId(value, label) {
  if (!SAFE_ID.test(String(value || ""))) fail(`${label} must be a safe id`);
}

function decimal(value, label, { positive = false } = {}) {
  const text = String(value ?? "");
  if (!DECIMAL.test(text)) fail(`${label} must be an unsigned decimal string`);
  if (positive && BigInt(text) <= 0n) fail(`${label} must be positive`);
  return BigInt(text);
}

function normalizeKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/gu, "");
}

function assertNoSecretMaterial(value, path = "request", depth = 0) {
  if (depth > 20) fail(`${path} exceeds maximum depth`);
  if (typeof value === "string") {
    if (value.includes("://")) fail(`${path} contains a raw URL`);
    if (/^0x[0-9a-fA-F]{40}$/u.test(value)) fail(`${path} contains a raw address`);
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
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
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
  exactKeys(
    source,
    [
      "main_commit",
      "candidate_readiness_schema_path",
      "candidate_readiness_schema_blob",
      "dependency_readiness_source_path",
      "dependency_readiness_source_blob",
      "native_execution_runtime_source_path",
      "native_execution_runtime_source_blob",
      "native_execution_idempotency_commit",
    ],
    "source",
  );
  gitSha(source.main_commit, "source.main_commit");
  gitSha(source.candidate_readiness_schema_blob, "source.candidate_readiness_schema_blob");
  gitSha(source.dependency_readiness_source_blob, "source.dependency_readiness_source_blob");
  gitSha(source.native_execution_runtime_source_blob, "source.native_execution_runtime_source_blob");
  gitSha(source.native_execution_idempotency_commit, "source.native_execution_idempotency_commit");
  exact(
    source.candidate_readiness_schema_path,
    "schemas/buy-void-observe-and-claim-candidate-readiness-v1.schema.json",
    "source.candidate_readiness_schema_path",
  );
  exact(
    source.dependency_readiness_source_path,
    "src/economic/buy_void_native_delivery_dependency_readiness_v1.ts",
    "source.dependency_readiness_source_path",
  );
  exact(
    source.native_execution_runtime_source_path,
    "src/economic/buy_void_native_execution_runtime_v1.ts",
    "source.native_execution_runtime_source_path",
  );
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
  safeId(candidate.recommended_request_id, "candidate_evidence.recommended_request_id");
  sha256(
    candidate.recommended_plan_fingerprint_sha256,
    "candidate_evidence.recommended_plan_fingerprint_sha256",
  );
  boolTrue(
    candidate.canonical_request_record_present,
    "candidate_evidence.canonical_request_record_present",
  );
  boolFalse(candidate.orphan_operator_event_only, "candidate_evidence.orphan_operator_event_only");
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
  boolTrue(dependencies.credential_read_performed, "dependency_evidence.credential_read_performed");
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
  safeId(dryRun.attempt_id, "native_execution_dry_run_evidence.attempt_id");
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
  decimal(dryRun.native_value_wei, "native_execution_dry_run_evidence.native_value_wei", { positive: true });
  decimal(dryRun.gas_limit, "native_execution_dry_run_evidence.gas_limit", { positive: true });
  decimal(dryRun.max_fee_per_gas_wei, "native_execution_dry_run_evidence.max_fee_per_gas_wei", { positive: true });
  decimal(
    dryRun.max_priority_fee_per_gas_wei,
    "native_execution_dry_run_evidence.max_priority_fee_per_gas_wei",
  );
  if (BigInt(dryRun.max_priority_fee_per_gas_wei) > BigInt(dryRun.max_fee_per_gas_wei)) {
    fail("native execution priority fee exceeds max fee");
  }
  for (const key of [
    "mutation_performed",
    "signing_performed",
    "transaction_broadcast_performed",
    "money_movement",
  ]) {
    boolFalse(dryRun[key], `native_execution_dry_run_evidence.${key}`);
  }
}

function validateLimits(limits, dryRun) {
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
      "automatic_retry_allowed",
    ],
    "canary_limits",
  );
  exact(limits.maximum_request_count, 1, "canary_limits.maximum_request_count");
  exact(limits.maximum_attempt_count, 1, "canary_limits.maximum_attempt_count");
  const maxValue = decimal(limits.maximum_native_value_wei, "canary_limits.maximum_native_value_wei", { positive: true });
  const maxGas = decimal(limits.maximum_gas_limit, "canary_limits.maximum_gas_limit", { positive: true });
  const maxFee = decimal(limits.maximum_fee_per_gas_wei, "canary_limits.maximum_fee_per_gas_wei", { positive: true });
  const maxPriority = decimal(limits.maximum_priority_fee_per_gas_wei, "canary_limits.maximum_priority_fee_per_gas_wei");
  const maxTotalFee = decimal(limits.maximum_total_fee_wei, "canary_limits.maximum_total_fee_wei", { positive: true });
  if (maxPriority > maxFee) fail("canary priority fee exceeds max fee");
  if (maxTotalFee !== maxGas * maxFee) fail("canary maximum_total_fee_wei mismatch");
  if (BigInt(dryRun.native_value_wei) > maxValue) fail("dry-run native value exceeds canary limit");
  if (BigInt(dryRun.gas_limit) > maxGas) fail("dry-run gas limit exceeds canary limit");
  if (BigInt(dryRun.max_fee_per_gas_wei) > maxFee) fail("dry-run max fee exceeds canary limit");
  if (BigInt(dryRun.max_priority_fee_per_gas_wei) > maxPriority) {
    fail("dry-run priority fee exceeds canary limit");
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
  if (!["synthetic_example", "runtime_sanitized"].includes(request.evidence_class)) {
    fail("evidence_class mismatch");
  }
  validateSource(request.source);
  validateCandidate(request.candidate_evidence);
  validateDependencies(request.dependency_evidence);
  validateDryRun(
    request.native_execution_dry_run_evidence,
    request.candidate_evidence,
    request.dependency_evidence,
  );
  validateLimits(request.canary_limits, request.native_execution_dry_run_evidence);
  validatePosture(request.runtime_posture);
  validateReview(request.review);
  validateAuthority(request.authority);

  const liveExpected = request.evidence_class === "runtime_sanitized";
  exact(
    request.review.live_runtime_evidence_established,
    liveExpected,
    "review.live_runtime_evidence_established",
  );
  exact(
    request.decision,
    liveExpected ? DECISION_RUNTIME : DECISION_SYNTHETIC,
    "decision",
  );
  const expectedId = computeRequestId(request);
  exact(request.request_id, expectedId, "request_id");
  return request;
}

export function buildBuyVoidNativeDeliveryCanaryAdmissionRequestV1(input) {
  const request = {
    schema: SCHEMA,
    marker: MARKER,
    version: 1,
    request_id: null,
    ...structuredClone(object(input, "input")),
  };
  request.request_id = computeRequestId(request);
  return validateBuyVoidNativeDeliveryCanaryAdmissionRequestV1(request);
}
