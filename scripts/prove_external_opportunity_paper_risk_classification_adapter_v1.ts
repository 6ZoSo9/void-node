import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_AUTHORITY_V1,
  classifyExternalOpportunityPaperObservationV1,
  validateExternalOpportunitySanitizedPaperObservationV1,
  type ExternalOpportunitySanitizedPaperObservationV1,
} from "../src/external_opportunity/paper_risk_classification_adapter_v1.js";
import type {
  ExternalOpportunityProviderRiskRegistryV1,
} from "../src/external_opportunity/provider_risk_registry_v1.js";

const root = process.cwd();

const registry = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "fixtures/external-opportunity/provider-risk-registry-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunityProviderRiskRegistryV1;

const observation = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "fixtures/external-opportunity/paper-risk-classification-adapter-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunitySanitizedPaperObservationV1;

const source = fs.readFileSync(
  path.join(
    root,
    "src/external_opportunity/paper_risk_classification_adapter_v1.ts",
  ),
  "utf8",
);

const validation =
  validateExternalOpportunitySanitizedPaperObservationV1(observation);
assert.deepEqual(validation, { ok: true, reasons: [] });

const positive = classifyExternalOpportunityPaperObservationV1(
  registry,
  observation,
);
const positiveAgain = classifyExternalOpportunityPaperObservationV1(
  registry,
  observation,
);

assert.equal(
  positive.marker,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1,
);
assert.equal(positive.status, "classified_paper_positive");
assert.equal(positive.source_validation_status, "accepted");
assert.deepEqual(positive.source_validation_reasons, []);
assert.equal(positive.classification_append_authorized, true);
assert.equal(positive.paper_positive, true);
assert.equal(positive.paper_negative, false);
assert.equal(positive.held, false);
assert.match(positive.classification_id, /^[0-9a-f]{64}$/);
assert.equal(positive.classification_id, positiveAgain.classification_id);
assert.equal(positive.source_record_sha256, observation.source_record_sha256);
assert.equal(
  positive.normalized_observation?.simulation_status,
  "not_run",
);
assert.equal(
  positive.normalized_observation?.operator_approved,
  false,
);
assert.equal(
  positive.risk_decision?.status,
  "recordable_paper_positive",
);
assert.equal(
  positive.risk_decision?.metrics.net_profit_usd,
  0.891223,
);
assert.equal(
  positive.risk_decision?.metrics.net_profit_margin_bps,
  8912.23,
);
assert.equal(
  positive.risk_decision?.live_execution_authorized,
  false,
);

const negative = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    gross_revenue_usd: 0.01,
  },
);
assert.equal(negative.status, "classified_paper_negative");
assert.equal(negative.classification_append_authorized, true);
assert.equal(negative.paper_positive, false);
assert.equal(negative.paper_negative, true);
assert.equal(negative.held, false);
assert.ok(
  negative.risk_decision?.reasons.includes(
    "minimum_net_profit_not_met",
  ),
);

const stale = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    quote_age_ms: 60_001,
  },
);
assert.equal(stale.status, "risk_held");
assert.equal(stale.classification_append_authorized, false);
assert.equal(stale.held, true);
assert.deepEqual(stale.risk_decision?.reasons, ["quote_too_old"]);

const unknownProvider = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    provider_id: "unknown",
  },
);
assert.equal(unknownProvider.status, "risk_held");
assert.equal(unknownProvider.classification_append_authorized, false);
assert.deepEqual(
  unknownProvider.risk_decision?.reasons,
  ["provider_not_registered"],
);

const duplicate = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    duplicate_fields: ["quote_id"],
  },
);
assert.equal(duplicate.status, "source_held");
assert.equal(duplicate.source_validation_status, "held");
assert.equal(duplicate.classification_append_authorized, false);
assert.deepEqual(
  duplicate.source_validation_reasons,
  ["duplicate_fields_not_empty"],
);
assert.equal(duplicate.risk_decision, null);

const retainedRaw = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    source_flags: {
      ...observation.source_flags,
      raw_response_retention: true,
    },
  },
);
assert.equal(retainedRaw.status, "source_held");
assert.deepEqual(
  retainedRaw.source_validation_reasons,
  ["source_flags_raw_response_retention_must_be_false"],
);

const wrongPhase = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    phase: "live_candidate",
  },
);
assert.equal(wrongPhase.status, "source_held");
assert.deepEqual(
  wrongPhase.source_validation_reasons,
  ["phase_must_be_paper_only"],
);

const secretInput = {
  ...observation,
  api_key: "DO_NOT_COPY_THIS_SECRET",
};
const secretHeld = classifyExternalOpportunityPaperObservationV1(
  registry,
  secretInput,
);
assert.equal(secretHeld.status, "source_held");
assert.equal(secretHeld.classification_append_authorized, false);
assert.deepEqual(
  secretHeld.source_validation_reasons,
  ["forbidden_input_key:$.api_key"],
);
assert.equal(
  JSON.stringify(secretHeld).includes("DO_NOT_COPY_THIS_SECRET"),
  false,
);

assert.deepEqual(
  VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_AUTHORITY_V1,
  {
    filesystem_read: false,
    filesystem_write: false,
    network_request: false,
    credential_access: false,
    wallet_or_key_access: false,
    transaction_construction: false,
    transaction_submission: false,
    runtime_mutation: false,
    service_mutation: false,
    scheduler_mutation: false,
    live_execution: false,
  },
);

for (const decision of [
  positive,
  negative,
  stale,
  unknownProvider,
  duplicate,
  retainedRaw,
  wrongPhase,
  secretHeld,
]) {
  assert.equal(decision.sanitized_output, true);
  assert.equal(decision.credential_value_present, false);
  assert.equal(decision.raw_response_present, false);
  assert.equal(decision.transaction_payload_present, false);
  assert.equal(decision.filesystem_read_performed, false);
  assert.equal(decision.filesystem_write_performed, false);
  assert.equal(decision.network_request_performed, false);
  assert.equal(decision.credential_access_performed, false);
  assert.equal(decision.wallet_or_key_access_performed, false);
  assert.equal(decision.transaction_construction_performed, false);
  assert.equal(decision.transaction_submission_performed, false);
  assert.equal(decision.runtime_mutation_performed, false);
  assert.equal(decision.service_mutation_performed, false);
  assert.equal(decision.scheduler_mutation_performed, false);
  assert.equal(decision.live_execution_authorized, false);
  assert.equal(decision.execution_authorized, false);
}

for (const forbidden of [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /node:fs/,
  /\breadFile/,
  /\bwriteFile/,
  /\bprocess\.env\b/,
  /\bchild_process\b/,
  /\bsystemctl\b/,
  /\bsendTransaction\s*\(/,
  /\beth_sendRawTransaction\b/,
  /\bexecSync\s*\(/,
  /\bspawnSync\s*\(/,
]) {
  assert.equal(
    forbidden.test(source),
    false,
    `forbidden adapter surface matched: ${String(forbidden)}`,
  );
}

console.log(
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1_PROOF",
);
console.log(`source_validation_exact=${validation.ok}`);
console.log(`classification_id=${positive.classification_id}`);
console.log(
  `paper_positive_net_profit_usd=${positive.risk_decision?.metrics.net_profit_usd}`,
);
console.log(
  `paper_negative_reason_count=${negative.risk_decision?.reasons.length}`,
);
console.log(`stale_quote_status=${stale.status}`);
console.log(`unknown_provider_status=${unknownProvider.status}`);
console.log(`duplicate_source_status=${duplicate.status}`);
console.log(`retained_raw_source_status=${retainedRaw.status}`);
console.log(`secret_input_status=${secretHeld.status}`);
console.log("filesystem_read_performed=false");
console.log("filesystem_write_performed=false");
console.log("network_request_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_construction_performed=false");
console.log("transaction_submission_performed=false");
console.log("runtime_mutation_performed=false");
console.log("service_mutation_performed=false");
console.log("scheduler_mutation_performed=false");
console.log("live_execution_authorized=false");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1_PROOF_EXACT_GREEN",
);
