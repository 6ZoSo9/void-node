import * as assert from "node:assert/strict";
import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  classifyExternalOpportunityPaperObservationV1,
  type ExternalOpportunitySanitizedPaperObservationV1,
} from "../src/external_opportunity/paper_risk_classification_adapter_v1.js";
import {
  summarizeExternalOpportunityPaperClassificationJournalDayV1,
} from "../src/external_opportunity/paper_classification_journal_v1.js";
import type {
  ExternalOpportunityProviderRiskRegistryV1,
} from "../src/external_opportunity/provider_risk_registry_v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_AUTHORITY_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
  VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1,
  readExternalOpportunityPaperClassificationJournalFileStoreV1,
  resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1,
  storeExternalOpportunityPaperClassificationJournalFileV1,
  validateExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
  type ExternalOpportunityPaperClassificationJournalFileStoreConfigV1,
} from "../src/external_opportunity/paper_classification_journal_file_store_v1.js";

const root = process.cwd();

const registry = JSON.parse(
  readFileSync(
    join(
      root,
      "fixtures/external-opportunity/provider-risk-registry-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunityProviderRiskRegistryV1;

const observation = JSON.parse(
  readFileSync(
    join(
      root,
      "fixtures/external-opportunity/paper-risk-classification-adapter-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunitySanitizedPaperObservationV1;

const configFixture = JSON.parse(
  readFileSync(
    join(
      root,
      "fixtures/external-opportunity/paper-classification-journal-file-store-v1.example.json",
    ),
    "utf8",
  ),
) as ExternalOpportunityPaperClassificationJournalFileStoreConfigV1;

const source = readFileSync(
  join(
    root,
    "src/external_opportunity/paper_classification_journal_file_store_v1.ts",
  ),
  "utf8",
);

const tempRoot = mkdtempSync(
  join(tmpdir(), "void-paper-classification-journal-file-store-v1-"),
);
const outsideRoot = mkdtempSync(
  join(tmpdir(), "void-paper-classification-journal-file-store-outside-v1-"),
);

try {
  const config: ExternalOpportunityPaperClassificationJournalFileStoreConfigV1 =
    {
      ...configFixture,
      allowed_root: tempRoot,
    };

  assert.deepEqual(
    validateExternalOpportunityPaperClassificationJournalFileStoreConfigV1(
      config,
    ),
    { ok: true, reasons: [] },
  );

  const paths =
    resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
      config,
    );
  assert.equal(paths.allowed_root_realpath, tempRoot);
  assert.equal(
    paths.journal_path,
    join(tempRoot, VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILENAME_V1),
  );
  assert.equal(paths.lock_path, `${paths.journal_path}.lock`);

  const positive = classifyExternalOpportunityPaperObservationV1(
    registry,
    observation,
  );
  assert.equal(positive.status, "classified_paper_positive");

  const missingConfirmation =
    storeExternalOpportunityPaperClassificationJournalFileV1({
      config,
      classification: positive,
      recorded_at: "2026-07-24T19:08:26.000Z",
      confirmation: "",
    });
  assert.equal(missingConfirmation.status, "held");
  assert.equal(missingConfirmation.applied, false);
  assert.equal(missingConfirmation.lock_acquired, false);
  assert.equal(
    missingConfirmation.reason,
    "file_store_confirmation_required:" +
      VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
  );
  assert.equal(missingConfirmation.explicit_local_filesystem_read_performed, false);
  assert.equal(missingConfirmation.explicit_local_filesystem_write_performed, false);

  const applied =
    storeExternalOpportunityPaperClassificationJournalFileV1({
      config,
      classification: positive,
      recorded_at: "2026-07-24T19:08:26.000Z",
      confirmation:
        VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
    });
  assert.equal(applied.status, "applied");
  assert.equal(applied.applied, true);
  assert.equal(applied.duplicate, false);
  assert.equal(applied.lock_acquired, true);
  assert.equal(applied.lock_released, true);
  assert.equal(applied.before_entry_count, 0);
  assert.equal(applied.after_entry_count, 1);
  assert.ok(applied.bytes_appended > 0);
  assert.equal(applied.after_file_bytes, applied.bytes_appended);
  assert.notEqual(applied.after_file_sha256, applied.before_file_sha256);
  assert.equal(applied.file_mode_octal, "0600");
  assert.equal(applied.file_fsync_performed, true);
  assert.equal(applied.directory_fsync_performed, true);
  assert.equal(applied.explicit_local_filesystem_read_performed, true);
  assert.equal(applied.explicit_local_filesystem_write_performed, true);
  assert.equal(applied.live_execution_authorized, false);
  assert.equal((lstatSync(paths.journal_path).mode & 0o777), 0o600);

  const firstBytes = readFileSync(paths.journal_path);
  assert.equal(firstBytes[firstBytes.length - 1], 0x0a);

  const firstSnapshot =
    readExternalOpportunityPaperClassificationJournalFileStoreV1(config);
  assert.equal(firstSnapshot.exists, true);
  assert.equal(firstSnapshot.entry_count, 1);
  assert.equal(firstSnapshot.entries[0]?.classification_id, positive.classification_id);
  assert.equal(firstSnapshot.file_sha256, applied.after_file_sha256);

  const duplicate =
    storeExternalOpportunityPaperClassificationJournalFileV1({
      config,
      classification: positive,
      recorded_at: "2026-07-24T19:08:27.000Z",
      confirmation:
        VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
    });
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.before_entry_count, 1);
  assert.equal(duplicate.after_entry_count, 1);
  assert.equal(duplicate.bytes_appended, 0);
  assert.equal(duplicate.before_file_sha256, duplicate.after_file_sha256);
  assert.equal(readFileSync(paths.journal_path).equals(firstBytes), true);
  assert.equal(duplicate.lock_released, true);

  const negative = classifyExternalOpportunityPaperObservationV1(
    registry,
    {
      ...observation,
      quote_id: "file-store-negative-v1",
      opportunity_id:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      source_record_sha256:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      gross_revenue_usd: 0.01,
    },
  );
  assert.equal(negative.status, "classified_paper_negative");

  writeFileSync(paths.lock_path, "occupied\n", {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  const lockBusy =
    storeExternalOpportunityPaperClassificationJournalFileV1({
      config,
      classification: negative,
      recorded_at: "2026-07-24T19:08:28.000Z",
      confirmation:
        VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
    });
  assert.equal(lockBusy.status, "lock_busy");
  assert.equal(lockBusy.lock_acquired, false);
  assert.equal(lockBusy.reason, "lock_busy");
  assert.equal(lockBusy.applied, false);
  assert.equal(readFileSync(paths.journal_path).equals(firstBytes), true);
  unlinkSync(paths.lock_path);

  const negativeApplied =
    storeExternalOpportunityPaperClassificationJournalFileV1({
      config,
      classification: negative,
      recorded_at: "2026-07-24T19:08:28.000Z",
      confirmation:
        VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
    });
  assert.equal(negativeApplied.status, "applied");
  assert.equal(negativeApplied.before_entry_count, 1);
  assert.equal(negativeApplied.after_entry_count, 2);
  assert.equal(negativeApplied.lock_released, true);

  const twoEntrySnapshot =
    readExternalOpportunityPaperClassificationJournalFileStoreV1(config);
  assert.equal(twoEntrySnapshot.entry_count, 2);
  const summary =
    summarizeExternalOpportunityPaperClassificationJournalDayV1(
      twoEntrySnapshot.entries,
      "2026-07-24",
    );
  assert.equal(summary.entry_count, 2);
  assert.equal(summary.paper_positive_count, 1);
  assert.equal(summary.paper_negative_count, 1);
  assert.equal(summary.total_net_profit_usd, 0.792719);

  const symlinkRoot = mkdtempSync(
    join(tmpdir(), "void-paper-classification-journal-symlink-v1-"),
  );
  try {
    const outsideJournal = join(outsideRoot, "outside.jsonl");
    writeFileSync(outsideJournal, "outside\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    const symlinkConfig = {
      ...config,
      allowed_root: symlinkRoot,
    };
    const symlinkPaths =
      resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
        symlinkConfig,
      );
    symlinkSync(outsideJournal, symlinkPaths.journal_path);

    const symlinkHeld =
      storeExternalOpportunityPaperClassificationJournalFileV1({
        config: symlinkConfig,
        classification: positive,
        recorded_at: "2026-07-24T19:08:29.000Z",
        confirmation:
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
      });
    assert.equal(symlinkHeld.status, "held");
    assert.equal(symlinkHeld.reason, "journal_path_symlink");
    assert.equal(symlinkHeld.lock_acquired, true);
    assert.equal(symlinkHeld.lock_released, true);
    assert.equal(readFileSync(outsideJournal, "utf8"), "outside\n");
  } finally {
    rmSync(symlinkRoot, { recursive: true, force: true });
  }

  const lockSymlinkRoot = mkdtempSync(
    join(tmpdir(), "void-paper-classification-lock-symlink-v1-"),
  );
  try {
    const lockSymlinkConfig = {
      ...config,
      allowed_root: lockSymlinkRoot,
    };
    const lockSymlinkPaths =
      resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
        lockSymlinkConfig,
      );
    const outsideLock = join(outsideRoot, "outside.lock");
    writeFileSync(outsideLock, "outside-lock\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    symlinkSync(outsideLock, lockSymlinkPaths.lock_path);

    const lockSymlinkHeld =
      storeExternalOpportunityPaperClassificationJournalFileV1({
        config: lockSymlinkConfig,
        classification: positive,
        recorded_at: "2026-07-24T19:08:30.000Z",
        confirmation:
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
      });
    assert.equal(lockSymlinkHeld.status, "held");
    assert.equal(lockSymlinkHeld.reason, "lock_path_symlink");
    assert.equal(lockSymlinkHeld.lock_acquired, false);
    assert.equal(readFileSync(outsideLock, "utf8"), "outside-lock\n");
  } finally {
    rmSync(lockSymlinkRoot, { recursive: true, force: true });
  }

  const partialRoot = mkdtempSync(
    join(tmpdir(), "void-paper-classification-partial-v1-"),
  );
  try {
    const partialConfig = {
      ...config,
      allowed_root: partialRoot,
    };
    const partialPaths =
      resolveExternalOpportunityPaperClassificationJournalFileStorePathsV1(
        partialConfig,
      );
    writeFileSync(partialPaths.journal_path, "{}", {
      encoding: "utf8",
      mode: 0o600,
    });
    chmodSync(partialPaths.journal_path, 0o600);

    const partialHeld =
      storeExternalOpportunityPaperClassificationJournalFileV1({
        config: partialConfig,
        classification: positive,
        recorded_at: "2026-07-24T19:08:31.000Z",
        confirmation:
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
      });
    assert.equal(partialHeld.status, "held");
    assert.equal(partialHeld.reason, "journal_trailing_partial_line");
    assert.equal(partialHeld.lock_released, true);
    assert.equal(readFileSync(partialPaths.journal_path, "utf8"), "{}");
  } finally {
    rmSync(partialRoot, { recursive: true, force: true });
  }

  const rootSymlinkTarget = mkdtempSync(
    join(tmpdir(), "void-paper-classification-root-target-v1-"),
  );
  const rootSymlink = `${rootSymlinkTarget}-link`;
  try {
    symlinkSync(rootSymlinkTarget, rootSymlink);
    const rootSymlinkHeld =
      storeExternalOpportunityPaperClassificationJournalFileV1({
        config: {
          ...config,
          allowed_root: rootSymlink,
        },
        classification: positive,
        recorded_at: "2026-07-24T19:08:32.000Z",
        confirmation:
          VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_CONFIRMATION_V1,
      });
    assert.equal(rootSymlinkHeld.status, "held");
    assert.equal(rootSymlinkHeld.reason, "allowed_root_symlink");
    assert.equal(rootSymlinkHeld.lock_acquired, false);
  } finally {
    rmSync(rootSymlink, { force: true });
    rmSync(rootSymlinkTarget, { recursive: true, force: true });
  }

  assert.deepEqual(
    VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_AUTHORITY_V1,
    {
      explicit_local_filesystem_read: true,
      explicit_local_filesystem_write: true,
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

  for (const forbidden of [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bprocess\.env\b/,
    /\bchild_process\b/,
    /\bsystemctl\b/,
    /\bsendTransaction\s*\(/,
    /\beth_sendRawTransaction\b/,
    /\bexecSync\s*\(/,
    /\bspawnSync\s*\(/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ]) {
    assert.equal(
      forbidden.test(source),
      false,
      `forbidden file-store surface matched: ${String(forbidden)}`,
    );
  }

  console.log(
    "VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1_PROOF",
  );
  console.log(`journal_path=${paths.journal_path}`);
  console.log(`first_apply_status=${applied.status}`);
  console.log(`duplicate_status=${duplicate.status}`);
  console.log(`lock_busy_status=${lockBusy.status}`);
  console.log(`negative_apply_status=${negativeApplied.status}`);
  console.log(`journal_entry_count=${twoEntrySnapshot.entry_count}`);
  console.log(`daily_total_net_profit_usd=${summary.total_net_profit_usd}`);
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
    "VOID_EXTERNAL_OPPORTUNITY_PAPER_CLASSIFICATION_JOURNAL_FILE_STORE_V1_PROOF_EXACT_GREEN",
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
  rmSync(outsideRoot, { recursive: true, force: true });
}
