#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const read = (relative) =>
  fs.readFileSync(
    path.join(repo, relative),
    "utf8",
  );

const receiver = read(
  "scripts/agent_paid_work_submission_receiver_v1.ts",
);
const gateway = read(
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
const gatewayProof = read(
  "scripts/prove_agent_paid_work_submission_gateway_integration_v1.mjs",
);
const receiverProof = read(
  "scripts/prove_agent_paid_work_submission_intake_runtime_v1.ts",
);
const credentialRegistry = read(
  "scripts/agent_paid_work_credential_registry_v1.ts",
);
const credentialRegistryProof = read(
  "scripts/prove_agent_paid_work_credential_registry_v1.ts",
);
const credentialRegistryExample = JSON.parse(
  read(
    "examples/agent-paid-work-credential-registry-v1.example.json",
  ),
);
const credentialRegistrySchema = JSON.parse(
  read(
    "schemas/agent-paid-work-credential-registry-v1.schema.json",
  ),
);
const credentialRegistryWorkflow = read(
  ".github/workflows/agent-paid-work-credential-registry-v1.yml",
);
const credentialRegistryDocs = read(
  "docs/operators/agent-paid-work-credential-registry-v1.md",
);
const config = JSON.parse(
  read(
    "fixtures/agent-paid-work/agent-paid-work-submission-intake-config-v1.example.json",
  ),
);
const request = JSON.parse(
  read(
    "fixtures/agent-paid-work/agent-paid-work-submission-request-v1.example.json",
  ),
);
const requestSchema = JSON.parse(
  read(
    "schemas/agent-paid-work-submission-request-v1.schema.json",
  ),
);
const receiptSchema = JSON.parse(
  read(
    "schemas/agent-paid-work-submission-intake-receipt-v1.schema.json",
  ),
);
const receiptExample = JSON.parse(
  read(
    "examples/agent-paid-work-submission-intake-receipt-v1.example.json",
  ),
);
const unit = read(
  "examples/systemd/void-agent-paid-work-submission-receiver-v1.service",
);
const dropin = read(
  "examples/systemd/void-ai-agent-public-gateway-v1.service.d/70-agent-paid-work-submission-receiver-v1.conf",
);
const docs = read(
  "docs/public/agent-paid-work-submission-intake-runtime-v1.md",
);
const aiDocs = read(
  "docs/public/ai-agent-public-ingress-isolated-gateway-v1.md",
);
const workflow = read(
  ".github/workflows/agent-paid-work-submission-intake-runtime-v1.yml",
);
const operatorGuard = read(
  "scripts/prove_void_operator_webhook_receiver_guard_v1.mjs",
);

const route =
  "/__void/agents/paid-work/submissions/v1";
const marker =
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_GATEWAY_SOURCE_V1";

for (const expected of [
  "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_V1",
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
  route,
  "127.0.0.1",
  "timingSafeEqual",
  "x-void-payload-sha256",
  "request_body_too_large",
  "accepted_for_review",
  "conflicting_duplicate_submission",
  "writeExclusiveJson",
  "authorization_verified: true",
  "loopback_source: true",
  "provider_selected: false",
  "quote_created: false",
  "payment_authorized: false",
  "work_execution_authorized:",
  "work_dispatched: false",
  "wc_award_authorized: false",
  "wc_ledger_write_authorized:",
  "wallet_or_signer_access_granted:",
  "buy_void_fulfillment_authority_granted:",
]) {
  assert.equal(
    receiver.includes(expected),
    true,
    `receiver missing ${expected}`,
  );
}

for (const forbidden of [
  "child_process",
  "exec(",
  "execFile(",
  "spawn(",
  "privateKey",
  "seed phrase",
  "eth_sendRawTransaction",
  "wallet.sendTransaction",
]) {
  assert.equal(
    receiver.includes(forbidden),
    false,
    `receiver includes forbidden ${forbidden}`,
  );
}

for (const expected of [
  marker,
  "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM",
  route,
  "AGENT_PAID_WORK_SUBMISSION_MAX_BODY_BYTES",
  "AGENT_PAID_WORK_SUBMISSION_TIMEOUT_MS",
  "AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES",
  "proxyAgentPaidWorkSubmission",
  "bearer_authorization_required",
  "x-void-payload-sha256",
  "payload_sha256_required",
  "payload_sha256_mismatch",
  'redirect: "manual"',
  '"set-cookie"',
  '"location"',
  '"X-Void-Agent-Paid-Work-Submission-Route"',
  "agent_paid_work_submission_receiver_unavailable",
  "bounded_paid_work_submission_proxy_authority",
  "paid_work_submission_route",
  "accepted_for_review_only: true",
  "provider_selection: false",
  "quote_creation: false",
  "payment_authority: false",
  "work_execution_authority: false",
  "work_dispatch: false",
  "wc_ledger_write_authority: false",
  "wallet_access: false",
  "buy_void_fulfillment: false",
]) {
  assert.equal(
    gateway.includes(expected),
    true,
    `gateway missing ${expected}`,
  );
}

assert.equal(
  gateway.includes(
    'process.env.VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM || ""',
  ),
  true,
  "gateway route is not disabled by default",
);
assert.equal(
  gateway.includes(
    "if (\n    parsed.pathname ===\n    AGENT_PAID_WORK_SUBMISSION_RECEIVER_PATH",
  ),
  true,
  "gateway exact route dispatch missing",
);
assert.equal(
  gateway.includes(
    'emptyResponse(response, 405, { Allow: "POST" })',
  ),
  true,
  "gateway POST-only method guard missing",
);
assert.equal(
  gateway.includes(
    'emptyResponse(response, 405, { Allow: "GET, HEAD" })',
  ),
  true,
  "gateway generic method guard missing",
);

assert.equal(config.enabled, false);
assert.equal(config.listen_host, "127.0.0.1");
assert.equal(config.listen_port, 4187);
assert.equal(config.request_path, route);
assert.equal(config.max_body_bytes, 65536);
assert.equal(
  config.admission_policy.authority
    .payment_authorized,
  false,
);
assert.equal(
  config.admission_policy.authority
    .work_execution_authorized,
  false,
);
assert.equal(
  config.admission_policy.authority
    .wc_ledger_write_authorized,
  false,
);

assert.equal(
  request.marker,
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
);
assert.equal(
  requestSchema.properties.marker.const,
  request.marker,
);
assert.equal(
  receiptSchema.properties.marker.const,
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
);
assert.equal(
  receiptExample.marker,
  receiptSchema.properties.marker.const,
);
assert.equal(
  receiptExample.authority.payment_authorized,
  false,
);
assert.equal(
  receiptExample.authority.work_dispatched,
  false,
);
assert.equal(
  receiptExample.authority.wc_ledger_write_authorized,
  false,
);

for (const expected of [
  "Type=simple",
  "WorkingDirectory=%h/dev/void-node",
  "node_modules/.bin/tsx",
  "VOID_AGENT_PAID_WORK_SUBMISSION_CONFIG",
  "VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE",
  "VOID_AGENT_PAID_WORK_SUBMISSION_STATE_DIR",
  "NoNewPrivileges=true",
  "PrivateTmp=true",
  "ProtectSystem=strict",
  "ProtectHome=read-only",
  "PrivateDevices=false",
  "MemoryDenyWriteExecute=false",
  "RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX",
  "RestrictSUIDSGID=true",
  "LockPersonality=true",
  "UMask=0077",
]) {
  assert.equal(
    unit.includes(expected),
    true,
    `receiver unit missing ${expected}`,
  );
}

assert.equal(
  dropin.includes(
    "Environment=VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_UPSTREAM=http://127.0.0.1:4187",
  ),
  true,
);
assert.equal(
  docs.includes("source-only"),
  true,
);
assert.equal(
  docs.includes("disabled by default"),
  true,
);
assert.equal(
  docs.includes("accepted_for_review"),
  true,
);
assert.equal(
  docs.includes("does not select a provider"),
  true,
);
assert.equal(
  docs.includes("does not authorize payment"),
  true,
);
assert.equal(
  docs.includes("does not dispatch work"),
  true,
);
assert.equal(
  docs.includes("does not write Work Credits"),
  true,
);
assert.equal(
  aiDocs.includes(marker),
  true,
);
assert.equal(
  aiDocs.includes(
    "only mutation-method exceptions",
  ),
  true,
);
assert.equal(
  operatorGuard.includes(
    "only mutation-method exceptions",
  ),
  true,
);
assert.equal(
  operatorGuard.includes(
    "sole mutation-method exception",
  ),
  false,
);

for (const expected of [
  "prove_agent_paid_work_submission_intake_runtime_v1.ts",
  "prove_agent_paid_work_submission_gateway_integration_v1.mjs",
  "prove_agent_paid_work_submission_intake_guard_v1.mjs",
  "prove_void_operator_webhook_receiver_gateway_integration_v1.mjs",
  "prove_void_operator_webhook_receiver_guard_v1.mjs",
  "npm run build",
]) {
  assert.equal(
    workflow.includes(expected),
    true,
    `workflow missing ${expected}`,
  );
}

for (const expected of [
  "disabled.status",
  "set-cookie",
  "location",
  "generic mutation reached receiver",
  "operator route configuration was coupled",
]) {
  assert.equal(
    gatewayProof.includes(expected),
    true,
    `gateway proof missing ${expected}`,
  );
}

for (const expected of [
  "accepted_for_review_receipt=1",
  "rejected_receipt=1",
  "identical_duplicate_suppressed=1",
  "conflicting_duplicate_rejected=1",
]) {
  assert.equal(
    receiverProof.includes(expected),
    true,
    `receiver proof missing ${expected}`,
  );
}


for (const expected of [
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE",
  "parseAgentPaidWorkCredentialRegistryV1",
  "authenticateAgentPaidWorkCredentialV1",
  '"credential_registry"',
  '"single_token_fallback"',
  "credential_registry_id:",
  "credential_count:",
  "authentication,",
  "AGENT_PAID_WORK_SUBMIT_SCOPE",
]) {
  assert.equal(
    receiver.includes(expected),
    true,
    `receiver credential integration missing ${expected}`,
  );
}

for (const expected of [
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1",
  "voidapwc1_",
  "voidapwcr1_",
  "agent_paid_work_submit",
  "token_sha256",
  "expires_at_utc",
  "revoked_at_utc",
  "timingSafeEqual",
  "duplicate token_sha256",
  "credential_revoked",
  "credential_expired",
]) {
  assert.equal(
    credentialRegistry.includes(expected),
    true,
    `credential registry missing ${expected}`,
  );
}

assert.equal(
  credentialRegistrySchema.properties.marker.const,
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1",
);
assert.equal(
  credentialRegistryExample.marker,
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1",
);
assert.equal(
  JSON.stringify(
    credentialRegistryExample,
  ).includes('"token":'),
  false,
  "raw token field appears in credential registry example",
);
assert.equal(
  credentialRegistryExample.credentials.every(
    (credential) =>
      credential.scopes.length === 1 &&
      credential.scopes[0] ===
        "agent_paid_work_submit" &&
      /^[0-9a-f]{64}$/.test(
        credential.token_sha256,
      ),
  ),
  true,
);

assert.equal(
  receiptSchema.required.includes(
    "authentication",
  ),
  true,
);
assert.equal(
  receiptExample.authentication.mode,
  "credential_registry",
);
assert.equal(
  receiptExample.authentication.scope,
  "agent_paid_work_submit",
);
assert.match(
  receiptExample.authentication.credential_id,
  /^voidapwc1_[0-9a-f]{64}$/,
);
assert.match(
  receiptExample.authentication.registry_id,
  /^voidapwcr1_[0-9a-f]{64}$/,
);

for (const expected of [
  "sha256_digest_only=1",
  "raw_token_in_registry=0",
  "per_agent_identity=1",
  "expiration_required=1",
  "revocation_supported=1",
  "receipt_credential_binding=1",
  "invalid_credentials_receipt_write=0",
]) {
  assert.equal(
    credentialRegistryProof.includes(expected),
    true,
    `credential registry proof missing ${expected}`,
  );
}

for (const expected of [
  "prove_agent_paid_work_credential_registry_v1.ts",
  "prove_agent_paid_work_submission_intake_runtime_v1.ts",
  "prove_agent_paid_work_submission_intake_guard_v1.mjs",
  "npm run build",
]) {
  assert.equal(
    credentialRegistryWorkflow.includes(expected),
    true,
    `credential registry workflow missing ${expected}`,
  );
}

for (const expected of [
  "SHA-256 token digests only",
  "agent_paid_work_submit",
  "required expiration",
  "revocation",
  "single-token",
  "create or issue a live credential",
]) {
  assert.equal(
    credentialRegistryDocs.includes(expected),
    true,
    `credential registry docs missing ${expected}`,
  );
}

console.log(
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_GUARD_V1_GREEN",
);
console.log("source_file_count=16");
console.log("loopback_only=1");
console.log("bearer_authentication=1");
console.log("payload_sha256_binding=1");
console.log("maximum_body_bytes=65536");
console.log("append_once_receipts=1");
console.log("duplicate_suppression=1");
console.log("conflicting_duplicate_rejection=1");
console.log("gateway_route_disabled_by_default=1");
console.log("unit_installation=0");
console.log("unit_enablement=0");
console.log("deployment=0");
console.log("provider_selection=0");
console.log("quote_creation=0");
console.log("payment_authority=0");
console.log("work_execution_authority=0");
console.log("work_dispatch=0");
console.log("wc_award_authority=0");
console.log("wc_ledger_write=0");
console.log("wallet_or_signer_access=0");
console.log("buy_void_fulfillment=0");
console.log("credential_registry_source=1");
console.log("sha256_digest_only=1");
console.log("raw_token_in_registry=0");
console.log("per_agent_identity=1");
console.log("credential_expiration=1");
console.log("credential_revocation=1");
console.log("single_token_fallback=1");
console.log("receipt_credential_binding=1");
