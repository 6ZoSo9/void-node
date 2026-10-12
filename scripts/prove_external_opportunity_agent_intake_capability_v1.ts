import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RECORD_CONFIRMATION_V1,
  canonicalJsonV1,
  computeExternalOpportunityAgentIntakeCapabilityFingerprintV1,
  createExternalOpportunityAgentIntakeCapabilityV1,
  negotiateExternalOpportunityAgentIntakeCapabilityV1,
  validateExternalOpportunityAgentIntakeCapabilityV1,
  validateExternalOpportunityAgentIntakeNegotiationRequestV1,
  type ExternalOpportunityAgentIntakeCapabilityV1,
  type ExternalOpportunityAgentIntakeNegotiationRequestV1,
} from "../src/external_opportunity/agent_intake_capability_v1.js";

function readJsonV1(relativePath: string): unknown {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

const fixture = readJsonV1(
  "../fixtures/external-opportunity/agent-intake-capability-v1.example.json",
);
const schema = readJsonV1(
  "../schemas/external-opportunity-agent-intake-capability-v1.schema.json",
);

const generated = createExternalOpportunityAgentIntakeCapabilityV1();
assert.equal(
  canonicalJsonV1(fixture),
  canonicalJsonV1(generated),
  "published fixture must equal the generated deterministic manifest",
);

const validation =
  validateExternalOpportunityAgentIntakeCapabilityV1(fixture);
assert.equal(validation.ok, true, validation.errors.join(","));
assert.equal(
  validation.fingerprint_sha256,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
);
assert.equal(
  computeExternalOpportunityAgentIntakeCapabilityFingerprintV1(generated),
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
);

assert.equal(
  (schema as Record<string, unknown>)["$schema"],
  "https://json-schema.org/draft/2020-12/schema",
);
assert.equal(
  (schema as Record<string, unknown>)["$id"],
  "urn:void:external-opportunity:agent-intake-capability:v1",
);
assert.equal(
  (schema as Record<string, unknown>).additionalProperties,
  false,
);

const manifest = fixture as ExternalOpportunityAgentIntakeCapabilityV1;

function requestV1(
  overrides: Partial<ExternalOpportunityAgentIntakeNegotiationRequestV1> = {},
): ExternalOpportunityAgentIntakeNegotiationRequestV1 {
  return {
    schema:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_NEGOTIATION_REQUEST_SCHEMA_V1,
    capability_id:
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_ID_V1,
    accepted_versions: [1],
    requested_mode: "dry_run",
    planned_request_bytes: 4096,
    accepts_explicit_confirmation: true,
    required_request_schema_sha256:
      manifest.request_contract.schema_sha256,
    required_manifest_fingerprint_sha256:
      manifest.manifest_fingerprint_sha256,
    required_statuses: ["dry_run_ready", "dry_run_duplicate"],
    accepted_exit_codes: [0, 10, 20, 64, 65, 70],
    ...overrides,
  };
}

const dryRunRequest = requestV1();
const dryRunValidation =
  validateExternalOpportunityAgentIntakeNegotiationRequestV1(
    dryRunRequest,
  );
assert.equal(
  dryRunValidation.ok,
  true,
  dryRunValidation.errors.join(","),
);

const dryRun = negotiateExternalOpportunityAgentIntakeCapabilityV1(
  manifest,
  dryRunRequest,
);
assert.equal(dryRun.status, "accepted");
assert.equal(dryRun.selected_mode, "dry_run");
assert.equal(dryRun.confirmation_required, false);
assert.equal(dryRun.confirmation, "");
assert.equal(dryRun.network_endpoint_available, false);
assert.equal(dryRun.paid_work_submission_available, false);
assert.equal(dryRun.wc_earning_available, false);
assert.equal(dryRun.live_execution_available, false);

const record = negotiateExternalOpportunityAgentIntakeCapabilityV1(
  manifest,
  requestV1({
    requested_mode: "record",
    required_statuses: [
      "record_applied",
      "record_duplicate",
      "record_held",
      "record_lock_busy",
    ],
    accepted_exit_codes: [0, 10, 20, 21, 64, 65, 70],
  }),
);
assert.equal(record.status, "accepted");
assert.equal(record.selected_mode, "record");
assert.equal(record.confirmation_required, true);
assert.equal(
  record.confirmation,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RECORD_CONFIRMATION_V1,
);

const confirmationHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({
      requested_mode: "record",
      accepts_explicit_confirmation: false,
      required_statuses: ["record_applied"],
      accepted_exit_codes: [0, 10, 20, 21, 64, 65, 70],
    }),
  );
assert.equal(confirmationHeld.status, "held");
assert.deepEqual(
  confirmationHeld.reasons,
  ["explicit_confirmation_not_accepted"],
);

const versionHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({ accepted_versions: [2] }),
  );
assert.equal(versionHeld.status, "held");
assert.deepEqual(versionHeld.reasons, ["version_not_accepted"]);

const sizeHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({ planned_request_bytes: 131_073 }),
  );
assert.equal(sizeHeld.status, "held");
assert.deepEqual(
  sizeHeld.reasons,
  ["planned_request_exceeds_capability_limit"],
);

const schemaHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({
      required_request_schema_sha256: "0".repeat(64),
    }),
  );
assert.equal(schemaHeld.status, "held");
assert.deepEqual(schemaHeld.reasons, ["request_schema_hash_mismatch"]);

const fingerprintHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({
      required_manifest_fingerprint_sha256: "1".repeat(64),
    }),
  );
assert.equal(fingerprintHeld.status, "held");
assert.deepEqual(
  fingerprintHeld.reasons,
  ["manifest_fingerprint_mismatch"],
);

const unavailable = negotiateExternalOpportunityAgentIntakeCapabilityV1(
  manifest,
  requestV1({
    requires_network_endpoint: true,
    requires_network_listener: true,
    requires_authentication_secret: true,
    requires_provider_polling: true,
    requires_paid_work_submission: true,
    requires_wc_earning: true,
    requires_wallet_or_key_access: true,
    requires_transaction_construction: true,
    requires_transaction_submission: true,
    requires_runtime_mutation: true,
    requires_service_mutation: true,
    requires_scheduler_mutation: true,
    requires_live_execution: true,
  }),
);
assert.equal(unavailable.status, "held");
assert.deepEqual(unavailable.reasons, [
  "authentication_secret_unavailable",
  "live_execution_unavailable",
  "network_endpoint_unavailable",
  "network_listener_unavailable",
  "paid_work_submission_unavailable",
  "provider_polling_unavailable",
  "runtime_mutation_unavailable",
  "scheduler_mutation_unavailable",
  "service_mutation_unavailable",
  "transaction_construction_unavailable",
  "transaction_submission_unavailable",
  "wallet_or_key_access_unavailable",
  "wc_earning_unavailable",
]);

const statusHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({ required_statuses: ["record_applied"] }),
  );
assert.equal(statusHeld.status, "held");
assert.deepEqual(
  statusHeld.reasons,
  ["status_unavailable:record_applied"],
);

const exitHeld =
  negotiateExternalOpportunityAgentIntakeCapabilityV1(
    manifest,
    requestV1({ accepted_exit_codes: [0, 10, 20] }),
  );
assert.equal(exitHeld.status, "held");
assert.deepEqual(exitHeld.reasons, [
  "exit_code_not_accepted:64",
  "exit_code_not_accepted:65",
  "exit_code_not_accepted:70",
]);

const mutated = JSON.parse(
  JSON.stringify(manifest),
) as ExternalOpportunityAgentIntakeCapabilityV1;
mutated.transport.network_endpoint = true as false;
const mutatedValidation =
  validateExternalOpportunityAgentIntakeCapabilityV1(mutated);
assert.equal(mutatedValidation.ok, false);
assert.equal(
  mutatedValidation.errors.includes("manifest_contract_not_exact"),
  true,
);
assert.equal(
  mutatedValidation.errors.includes("manifest_fingerprint_mismatch"),
  true,
);

const unknownRequest = {
  ...requestV1(),
  token: "must-not-be-accepted",
};
const unknownValidation =
  validateExternalOpportunityAgentIntakeNegotiationRequestV1(
    unknownRequest,
  );
assert.equal(unknownValidation.ok, false);
assert.deepEqual(unknownValidation.errors, ["unknown_key:token"]);

assert.equal(manifest.schema, VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_SCHEMA_V1);
assert.equal(manifest.marker, VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1);
assert.equal(manifest.pipeline_bindings.length, 5);
assert.equal(manifest.modes.length, 2);
assert.equal(manifest.transport.network_endpoint, false);
assert.equal(manifest.transport.network_listener, false);
assert.equal(manifest.authority.network_request, false);
assert.equal(manifest.authority.credential_access, false);
assert.equal(manifest.authority.wallet_or_key_access, false);
assert.equal(manifest.authority.transaction_construction, false);
assert.equal(manifest.authority.transaction_submission, false);
assert.equal(manifest.authority.paid_work_submission, false);
assert.equal(manifest.authority.wc_earning, false);
assert.equal(manifest.authority.live_execution, false);

const sourceText = readFileSync(
  fileURLToPath(
    new URL(
      "../src/external_opportunity/agent_intake_capability_v1.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const proofText = readFileSync(fileURLToPath(import.meta.url), "utf8");
const rawEmptyCatchPattern =
  /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/gm;
assert.equal(
  [...sourceText.matchAll(rawEmptyCatchPattern)].length,
  0,
);
assert.equal(
  [...proofText.matchAll(rawEmptyCatchPattern)].length,
  0,
);

console.log("VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1_PROOF");
console.log(`manifest_fingerprint_sha256=${manifest.manifest_fingerprint_sha256}`);
console.log(`pipeline_binding_count=${manifest.pipeline_bindings.length}`);
console.log(`mode_count=${manifest.modes.length}`);
console.log(`dry_run_negotiation_status=${dryRun.status}`);
console.log(`record_negotiation_status=${record.status}`);
console.log(`confirmation_held_status=${confirmationHeld.status}`);
console.log(`unsupported_requirements_held_status=${unavailable.status}`);
console.log(`unsupported_requirement_count=${unavailable.reasons.length}`);
console.log("repository_fixture_read_performed=true");
console.log("repository_schema_read_performed=true");
console.log("filesystem_write_performed=false");
console.log("journal_file_read_performed=false");
console.log("journal_file_write_performed=false");
console.log("network_listener_created=false");
console.log("network_request_performed=false");
console.log("authentication_secret_accessed=false");
console.log("credential_access_performed=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_construction_performed=false");
console.log("transaction_submission_performed=false");
console.log("paid_work_submission_performed=false");
console.log("wc_earning_performed=false");
console.log("runtime_mutation_performed=false");
console.log("service_mutation_performed=false");
console.log("scheduler_mutation_performed=false");
console.log("live_execution_authorized=false");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1_PROOF_EXACT_GREEN",
);
