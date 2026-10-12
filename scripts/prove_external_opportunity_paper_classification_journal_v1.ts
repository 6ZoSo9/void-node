import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  classifyExternalOpportunityPaperObservationV1,
  type ExternalOpportunityPaperRiskClassificationV1,
  type ExternalOpportunitySanitizedPaperObservationV1,
} from "../src/external_opportunity/paper_risk_classification_adapter_v1.js";
import type {
  ExternalOpportunityProviderRiskRegistryV1,
} from "../src/external_opportunity/provider_risk_registry_v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_AUTHORITY_V1,
  buildExternalOpportunityPaperClassificationJournalEntryV1,
  planExternalOpportunityPaperClassificationJournalAppendV1,
  summarizeExternalOpportunityPaperClassificationJournalDayV1,
  validateExternalOpportunityPaperClassificationJournalEntryV1,
  writeExternalOpportunityPaperClassificationJournalV1,
  type ExternalOpportunityPaperClassificationJournalEntryV1,
} from "../src/external_opportunity/paper_classification_journal_v1.js";

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

const exampleEntry = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "fixtures/external-opportunity/paper-classification-journal-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunityPaperClassificationJournalEntryV1;

const source = fs.readFileSync(
  path.join(
    root,
    "src/external_opportunity/paper_classification_journal_v1.ts",
  ),
  "utf8",
);

const positive = classifyExternalOpportunityPaperObservationV1(
  registry,
  observation,
);
assert.equal(positive.status, "classified_paper_positive");

const entry = buildExternalOpportunityPaperClassificationJournalEntryV1(
  positive,
  "2026-07-24T18:34:32.000Z",
);
assert.deepEqual(entry, exampleEntry);

const entryValidation =
  validateExternalOpportunityPaperClassificationJournalEntryV1(entry);
assert.deepEqual(entryValidation, { ok: true, reasons: [] });

const ready = planExternalOpportunityPaperClassificationJournalAppendV1({
  classification: positive,
  existing_entries: [],
  recorded_at: "2026-07-24T18:34:32.000Z",
  policy: {
    allow_held_entries: false,
    max_existing_entries: 10_000,
  },
});
assert.equal(ready.status, "ready");
assert.equal(ready.append_authorized, true);
assert.equal(ready.duplicate, false);
assert.deepEqual(ready.entry, entry);

const duplicate = planExternalOpportunityPaperClassificationJournalAppendV1({
  classification: positive,
  existing_entries: [entry],
  recorded_at: "2026-07-24T18:35:00.000Z",
  policy: {
    allow_held_entries: false,
    max_existing_entries: 10_000,
  },
});
assert.equal(duplicate.status, "duplicate");
assert.equal(duplicate.append_authorized, false);
assert.equal(duplicate.duplicate, true);
assert.deepEqual(
  duplicate.reasons,
  ["classification_already_recorded"],
);

const classificationConflict = {
  ...entry,
  entry_fingerprint_sha256:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};
const conflict = planExternalOpportunityPaperClassificationJournalAppendV1({
  classification: positive,
  existing_entries: [classificationConflict],
  recorded_at: "2026-07-24T18:36:00.000Z",
  policy: {
    allow_held_entries: false,
    max_existing_entries: 10_000,
  },
});
assert.equal(conflict.status, "held");
assert.deepEqual(
  conflict.reasons,
  ["existing_entry_invalid:entry_fingerprint_mismatch"],
);

const alternateClassificationId =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const rebound = buildExternalOpportunityPaperClassificationJournalEntryV1(
  {
    ...positive,
    classification_id: alternateClassificationId,
    source_record_sha256: entry.source_record_sha256,
  },
  "2026-07-24T18:37:00.000Z",
);
const reboundValidation =
  validateExternalOpportunityPaperClassificationJournalEntryV1(rebound);
assert.deepEqual(reboundValidation, { ok: true, reasons: [] });
assert.notEqual(rebound.classification_id, entry.classification_id);
assert.equal(rebound.source_record_sha256, entry.source_record_sha256);
assert.notEqual(
  rebound.entry_fingerprint_sha256,
  entry.entry_fingerprint_sha256,
);

const sourceConflict = planExternalOpportunityPaperClassificationJournalAppendV1({
  classification: positive,
  existing_entries: [rebound],
  recorded_at: "2026-07-24T18:38:00.000Z",
  policy: {
    allow_held_entries: false,
    max_existing_entries: 10_000,
  },
});
assert.equal(sourceConflict.status, "held");
assert.deepEqual(sourceConflict.reasons, ["source_record_already_classified"]);

const stale = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    quote_age_ms: 60_001,
  },
);
assert.equal(stale.status, "risk_held");

const heldDisabled = planExternalOpportunityPaperClassificationJournalAppendV1({
  classification: stale,
  existing_entries: [],
  recorded_at: "2026-07-24T18:39:00.000Z",
  policy: {
    allow_held_entries: false,
    max_existing_entries: 10_000,
  },
});
assert.equal(heldDisabled.status, "held");
assert.deepEqual(heldDisabled.reasons, ["held_entry_policy_disabled"]);

const heldEnabled = planExternalOpportunityPaperClassificationJournalAppendV1({
  classification: stale,
  existing_entries: [],
  recorded_at: "2026-07-24T18:39:00.000Z",
  policy: {
    allow_held_entries: true,
    max_existing_entries: 10_000,
  },
});
assert.equal(heldEnabled.status, "ready");
assert.equal(heldEnabled.entry.classification_status, "risk_held");
assert.equal(heldEnabled.entry.held, true);

let appendCalls = 0;
let appendedLine = "";
const dependency = {
  append_json_line(
    line: string,
    writtenEntry: ExternalOpportunityPaperClassificationJournalEntryV1,
  ) {
    appendCalls += 1;
    appendedLine = line;
    assert.deepEqual(writtenEntry, entry);
    return {
      ok: true as const,
      bytes_written: Buffer.byteLength(line),
    };
  },
};

const missingConfirmation =
  writeExternalOpportunityPaperClassificationJournalV1({
    plan: ready,
    confirmation: "",
    dependencies: dependency,
  });
assert.equal(missingConfirmation.status, "held");
assert.equal(missingConfirmation.applied, false);
assert.equal(missingConfirmation.dependency_append_invoked, false);
assert.equal(appendCalls, 0);

const applied = writeExternalOpportunityPaperClassificationJournalV1({
  plan: ready,
  confirmation:
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1,
  dependencies: dependency,
});
assert.equal(applied.status, "applied");
assert.equal(applied.applied, true);
assert.equal(applied.dependency_append_invoked, true);
assert.equal(appendCalls, 1);
assert.equal(appendedLine, `${JSON.stringify(entry)}\n`);
assert.equal(applied.bytes_written, Buffer.byteLength(appendedLine));

const duplicateWrite =
  writeExternalOpportunityPaperClassificationJournalV1({
    plan: duplicate,
    confirmation:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_APPEND_CONFIRMATION_V1,
    dependencies: dependency,
  });
assert.equal(duplicateWrite.status, "duplicate");
assert.equal(duplicateWrite.dependency_append_invoked, false);
assert.equal(appendCalls, 1);

const negative = classifyExternalOpportunityPaperObservationV1(
  registry,
  {
    ...observation,
    quote_id: "negative-quote-v1",
    opportunity_id:
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    source_record_sha256:
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    gross_revenue_usd: 0.01,
  },
);
assert.equal(negative.status, "classified_paper_negative");
const negativeEntry =
  buildExternalOpportunityPaperClassificationJournalEntryV1(
    negative,
    "2026-07-24T18:40:00.000Z",
  );
const negativeEntryValidation =
  validateExternalOpportunityPaperClassificationJournalEntryV1(
    negativeEntry,
  );
assert.deepEqual(negativeEntryValidation, { ok: true, reasons: [] });
assert.equal(negativeEntry.net_profit_usd, -0.098504);
assert.equal(negativeEntry.net_profit_margin_bps, -985.04);
assert.equal(negativeEntry.projected_loss_usd, 0.098504);

const heldEntry = heldEnabled.entry;
assert.equal(heldEntry.opportunity_id, entry.opportunity_id);
assert.notEqual(negativeEntry.opportunity_id, entry.opportunity_id);

const summary = summarizeExternalOpportunityPaperClassificationJournalDayV1(
  [entry, negativeEntry, heldEntry],
  "2026-07-24",
);
assert.equal(summary.entry_count, 3);
assert.equal(summary.paper_positive_count, 1);
assert.equal(summary.paper_negative_count, 1);
assert.equal(summary.risk_held_count, 1);
assert.equal(summary.source_held_count, 0);
assert.equal(summary.unique_provider_count, 1);
assert.equal(summary.unique_opportunity_count, 2);
assert.equal(summary.total_notional_usd, 3);
assert.equal(summary.total_gross_revenue_usd, 2.009454);
assert.equal(summary.total_cost_usd, 0.325512);
assert.equal(summary.total_net_profit_usd, 1.683942);
assert.equal(summary.total_projected_loss_usd, 0.098504);
assert.equal(summary.live_execution_authorized, false);

assert.deepEqual(
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_AUTHORITY_V1,
  {
    direct_filesystem_read: false,
    direct_filesystem_write: false,
    dependency_injected_append: true,
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

for (const forbidden of [
  /node:fs/,
  /\breadFile/,
  /\bwriteFile/,
  /\bappendFile/,
  /\bfetch\s*\(/,
  /\baxios\b/,
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
    `forbidden journal surface matched: ${String(forbidden)}`,
  );
}

console.log(
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1_PROOF",
);
console.log(`entry_fingerprint_sha256=${entry.entry_fingerprint_sha256}`);
console.log(`entry_validation_exact=${entryValidation.ok}`);
console.log(`ready_status=${ready.status}`);
console.log(`duplicate_status=${duplicate.status}`);
console.log(`source_conflict_status=${sourceConflict.status}`);
console.log(`held_disabled_status=${heldDisabled.status}`);
console.log(`held_enabled_status=${heldEnabled.status}`);
console.log(`append_call_count=${appendCalls}`);
console.log(`daily_entry_count=${summary.entry_count}`);
console.log(
  `daily_total_net_profit_usd=${summary.total_net_profit_usd}`,
);
console.log("direct_filesystem_read_performed=false");
console.log("direct_filesystem_write_performed=false");
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
  "VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_V1_PROOF_EXACT_GREEN",
);
