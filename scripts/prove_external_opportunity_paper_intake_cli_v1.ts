import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_AUTHORITY_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RECORD_CONFIRMATION_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_REQUEST_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1,
  executeExternalOpportunityPaperIntakeCliRequestV1,
  runExternalOpportunityPaperIntakeCliV1,
  validateExternalOpportunityPaperIntakeCliRequestV1,
  type ExternalOpportunityPaperIntakeCliRequestV1,
} from "../src/external_opportunity/paper_intake_cli_v1.js";
import type {
  ExternalOpportunitySanitizedPaperObservationV1,
} from "../src/external_opportunity/paper_risk_classification_adapter_v1.js";
import type {
  ExternalOpportunityProviderRiskRegistryV1,
} from "../src/external_opportunity/provider_risk_registry_v1.js";

const root = process.cwd();
const sourcePath = path.join(
  root,
  "src/external_opportunity/paper_intake_cli_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts/prove_external_opportunity_paper_intake_cli_v1.ts",
);
const source = fs.readFileSync(sourcePath, "utf8");
const proofSource = fs.readFileSync(proofPath, "utf8");
const rawEmptyCatch = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/m;

assert.equal(rawEmptyCatch.test(source), false);
assert.equal(rawEmptyCatch.test(proofSource), false);
for (const forbidden of [
  "fetch(",
  "process.env",
  "node:child_process",
  "setInterval(",
  "setTimeout(",
  "systemctl",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `forbidden source surface present: ${forbidden}`,
  );
}

assert.deepEqual(
  VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_AUTHORITY_V1,
  {
    explicit_local_request_read: true,
    explicit_local_registry_read: true,
    explicit_local_observation_read: true,
    explicit_local_journal_read: true,
    explicit_local_journal_write_with_confirmation: true,
    implicit_or_scheduled_access: false,
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

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "fixtures/external-opportunity/paper-intake-cli-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunityPaperIntakeCliRequestV1;

function writeJsonV1(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
}

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-paper-intake-cli-v1-"),
);
let symlinkCreated = false;

try {
  const registryPath = path.join(temporaryRoot, "registry.json");
  const observationPath = path.join(temporaryRoot, "observation.json");
  writeJsonV1(registryPath, registry);
  writeJsonV1(observationPath, observation);

  const baseRequest: ExternalOpportunityPaperIntakeCliRequestV1 = {
    ...fixture,
    schema: VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_REQUEST_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1,
    version: 1,
    registry_path: registryPath,
    observation_path: observationPath,
    allowed_root: temporaryRoot,
    recorded_at: "2026-07-24T20:50:00.000Z",
  };
  delete baseRequest.mode;
  delete baseRequest.confirmation;

  assert.deepEqual(
    validateExternalOpportunityPaperIntakeCliRequestV1(baseRequest),
    { ok: true, reasons: [] },
  );

  const dryRequestPath = path.join(temporaryRoot, "request-dry.json");
  writeJsonV1(dryRequestPath, baseRequest);

  const dry = executeExternalOpportunityPaperIntakeCliRequestV1(
    dryRequestPath,
  );
  assert.equal(dry.status, "dry_run_ready");
  assert.equal(dry.exit_code, 0);
  assert.equal(dry.mode, "dry_run");
  assert.equal(dry.registry_validation_ok, true);
  assert.equal(dry.classification?.status, "classified_paper_positive");
  assert.equal(
    dry.classification?.risk_decision?.metrics.net_profit_usd,
    0.891223,
  );
  assert.equal(dry.journal?.exists_before, false);
  assert.equal(dry.journal?.entry_count_before, 0);
  assert.equal(dry.journal?.plan_status, "ready");
  assert.equal(dry.journal?.plan_append_authorized, true);
  assert.equal(dry.record, null);
  assert.equal(dry.explicit_local_request_read_performed, true);
  assert.equal(dry.explicit_local_registry_read_performed, true);
  assert.equal(dry.explicit_local_observation_read_performed, true);
  assert.equal(dry.explicit_local_journal_read_performed, true);
  assert.equal(dry.explicit_local_journal_write_performed, false);
  assert.equal(
    fs.existsSync(
      path.join(
        temporaryRoot,
        "paper-classification-journal-v1.jsonl",
      ),
    ),
    false,
  );

  let cliStdout = "";
  let cliStderr = "";
  const cliDryExit = runExternalOpportunityPaperIntakeCliV1(
    ["--request", dryRequestPath],
    {
      stdout_write(value) {
        cliStdout += value;
      },
      stderr_write(value) {
        cliStderr += value;
      },
    },
  );
  assert.equal(cliDryExit, 0);
  assert.equal(cliStderr, "");
  assert.equal(
    JSON.parse(cliStdout).status,
    "dry_run_ready",
  );

  const wrongConfirmationRequest = {
    ...baseRequest,
    mode: "record" as const,
    confirmation: "wrong",
  };
  const wrongConfirmationPath = path.join(
    temporaryRoot,
    "request-wrong-confirmation.json",
  );
  writeJsonV1(wrongConfirmationPath, wrongConfirmationRequest);
  const wrongConfirmation =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      wrongConfirmationPath,
    );
  assert.equal(wrongConfirmation.status, "input_held");
  assert.equal(wrongConfirmation.exit_code, 65);
  assert.deepEqual(wrongConfirmation.reasons, [
    "record_confirmation_required:recordPaperOpportunityV1",
  ]);
  assert.equal(
    wrongConfirmation.explicit_local_registry_read_performed,
    false,
  );

  const recordRequest: ExternalOpportunityPaperIntakeCliRequestV1 = {
    ...baseRequest,
    mode: "record",
    confirmation:
      VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_RECORD_CONFIRMATION_V1,
  };
  const recordRequestPath = path.join(
    temporaryRoot,
    "request-record.json",
  );
  writeJsonV1(recordRequestPath, recordRequest);

  const recorded =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      recordRequestPath,
    );
  assert.equal(recorded.status, "record_applied");
  assert.equal(recorded.exit_code, 0);
  assert.equal(recorded.record?.status, "applied");
  assert.equal(recorded.record?.after_entry_count, 1);
  assert.equal(recorded.record?.file_mode_octal, "0600");
  assert.equal(recorded.record?.file_fsync_performed, true);
  assert.equal(recorded.record?.directory_fsync_performed, true);
  assert.equal(recorded.record?.lock_released, true);
  assert.equal(
    recorded.explicit_local_journal_write_performed,
    true,
  );

  const journalPath = path.join(
    temporaryRoot,
    "paper-classification-journal-v1.jsonl",
  );
  assert.equal(fs.existsSync(journalPath), true);
  assert.equal((fs.statSync(journalPath).mode & 0o777), 0o600);
  assert.equal(
    fs.readFileSync(journalPath, "utf8").trim().split("\n").length,
    1,
  );

  const duplicate =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      recordRequestPath,
    );
  assert.equal(duplicate.status, "record_duplicate");
  assert.equal(duplicate.exit_code, 10);
  assert.equal(duplicate.record?.status, "duplicate");
  assert.equal(duplicate.record?.after_entry_count, 1);
  assert.equal(
    fs.readFileSync(journalPath, "utf8").trim().split("\n").length,
    1,
  );

  const negativeObservation: ExternalOpportunitySanitizedPaperObservationV1 = {
    ...observation,
    quote_id: "negative-quote-1",
    opportunity_id: "d".repeat(64),
    source_record_sha256: "e".repeat(64),
    gross_revenue_usd: 0.01,
  };
  const negativeObservationPath = path.join(
    temporaryRoot,
    "observation-negative.json",
  );
  writeJsonV1(negativeObservationPath, negativeObservation);
  const negativeRequestPath = path.join(
    temporaryRoot,
    "request-negative-record.json",
  );
  writeJsonV1(negativeRequestPath, {
    ...recordRequest,
    observation_path: negativeObservationPath,
    recorded_at: "2026-07-24T20:51:00.000Z",
  });

  const negative =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      negativeRequestPath,
    );
  assert.equal(negative.status, "record_applied");
  assert.equal(
    negative.classification?.status,
    "classified_paper_negative",
  );
  assert.equal(negative.record?.after_entry_count, 2);

  const heldObservationPath = path.join(
    temporaryRoot,
    "observation-held.json",
  );
  writeJsonV1(heldObservationPath, {
    ...observation,
    quote_id: "held-quote-1",
    opportunity_id: "a".repeat(64),
    source_record_sha256: "b".repeat(64),
    duplicate_fields: ["quote_id"],
  });
  const heldRequestPath = path.join(
    temporaryRoot,
    "request-held-dry.json",
  );
  writeJsonV1(heldRequestPath, {
    ...baseRequest,
    mode: "dry_run",
    observation_path: heldObservationPath,
    recorded_at: "2026-07-24T20:52:00.000Z",
  });

  const held =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      heldRequestPath,
    );
  assert.equal(held.status, "dry_run_held");
  assert.equal(held.exit_code, 20);
  assert.equal(held.classification?.status, "source_held");
  assert.deepEqual(held.journal?.plan_reasons, [
    "held_entry_policy_disabled",
  ]);

  const secretRequestPath = path.join(
    temporaryRoot,
    "request-secret-key.json",
  );
  writeJsonV1(secretRequestPath, {
    ...baseRequest,
    api_key: "DO_NOT_ECHO_THIS_SECRET",
  });
  const secretHeld =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      secretRequestPath,
    );
  assert.equal(secretHeld.status, "input_held");
  assert.deepEqual(secretHeld.reasons, [
    "unknown_request_key:api_key",
  ]);
  assert.equal(
    JSON.stringify(secretHeld).includes("DO_NOT_ECHO_THIS_SECRET"),
    false,
  );

  const symlinkRequestPath = path.join(
    temporaryRoot,
    "request-symlink.json",
  );
  fs.symlinkSync(dryRequestPath, symlinkRequestPath);
  symlinkCreated = true;
  const symlinkHeld =
    executeExternalOpportunityPaperIntakeCliRequestV1(
      symlinkRequestPath,
    );
  assert.equal(symlinkHeld.status, "input_held");
  assert.equal(symlinkHeld.reason, "request_path_symlink");

  cliStdout = "";
  cliStderr = "";
  const relativeExit = runExternalOpportunityPaperIntakeCliV1(
    ["--request", "relative.json"],
    {
      stdout_write(value) {
        cliStdout += value;
      },
      stderr_write(value) {
        cliStderr += value;
      },
    },
  );
  assert.equal(relativeExit, 64);
  assert.equal(JSON.parse(cliStdout).status, "usage_held");
  assert.equal(cliStderr, "");

  cliStdout = "";
  cliStderr = "";
  const helpExit = runExternalOpportunityPaperIntakeCliV1(
    ["--help"],
    {
      stdout_write(value) {
        cliStdout += value;
      },
      stderr_write(value) {
        cliStderr += value;
      },
    },
  );
  assert.equal(helpExit, 0);
  assert.equal(cliStderr, "");
  assert.equal(
    JSON.parse(cliStdout).record_confirmation,
    "recordPaperOpportunityV1",
  );

  console.log("VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1_PROOF");
  console.log(`dry_run_status=${dry.status}`);
  console.log(`record_status=${recorded.status}`);
  console.log(`duplicate_status=${duplicate.status}`);
  console.log(`negative_status=${negative.status}`);
  console.log(`held_status=${held.status}`);
  console.log(
    `journal_entry_count=${negative.record?.after_entry_count}`,
  );
  console.log(
    `paper_positive_net_profit_usd=${dry.classification?.risk_decision?.metrics.net_profit_usd}`,
  );
  console.log("corrected_lane_raw_empty_catch_count=0");
  console.log("temporary_directory_read_performed=true");
  console.log("temporary_directory_write_performed=true");
  console.log("live_journal_file_read_performed=false");
  console.log("live_journal_file_write_performed=false");
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
    "VOID_EXTERNAL_OPPORTUNITY_PAPER_INTAKE_CLI_V1_PROOF_EXACT_GREEN",
  );
} finally {
  if (symlinkCreated) {
    fs.unlinkSync(path.join(temporaryRoot, "request-symlink.json"));
  }
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
