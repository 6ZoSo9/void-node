#!/usr/bin/env node
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  BINDING_REGISTRY_MARKER,
  CREDENTIAL_REGISTRY_MARKER,
  RETIREMENT_CONFIRMATION,
  RETIREMENT_MARKER,
  RETIREMENT_REASON,
  RETIREMENT_RECORD_MARKER,
  RETIREMENT_LOCK_MARKER,
  RETIREMENT_STALE_LOCK_RECOVERY_CONFIRMATION,
  RETIREMENT_REGISTRY_MARKER,
  applyBindingRetirementV1,
  canonicalJsonV1,
  contentIdV1,
  inspectBindingRetirementV1,
  materializeBindingRegistryV1,
  materializeRetirementRegistryV1,
  sha256BytesV1,
  stageBindingRetirementV1,
  validateRetirementRecordV1,
} from "./agent_paid_work_credential_wc_account_binding_retirement_v1.mjs";

function need(condition, message) {
  if (!condition) throw new Error(`VOID_BINDING_RETIREMENT_PROOF_FAIL: ${message}`);
}

function expectThrow(fn, pattern, message) {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    need(pattern.test(text), `${message}: unexpected error ${text}`);
    return;
  }
  throw new Error(`VOID_BINDING_RETIREMENT_PROOF_FAIL: ${message}: expected rejection`);
}

function shaFile(path) {
  return sha256BytesV1(readFileSync(path));
}

function writePrivateJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function makeCredentialRegistry({
  agentId,
  issuedAt,
  expiresAt,
  revokedAt = null,
  tokenByte = "ab",
}) {
  const credentialCore = {
    agent_id: agentId,
    token_sha256: tokenByte.repeat(32),
    scopes: ["agent_paid_work_submit"],
    issued_at_utc: issuedAt,
    expires_at_utc: expiresAt,
  };
  const credential = {
    credential_id: contentIdV1("voidapwc1_", credentialCore),
    ...credentialCore,
    revoked_at_utc: revokedAt,
  };
  const core = {
    marker: CREDENTIAL_REGISTRY_MARKER,
    version: 1,
    created_at_utc: issuedAt,
    credentials: [credential],
  };
  return {
    credential,
    registry: {
      registry_id: contentIdV1("voidapwcr1_", core),
      ...core,
    },
  };
}

function makeBinding({
  credentialId,
  agentId,
  account,
  validFrom,
  validUntil,
  sourceByte = "cd",
}) {
  const core = {
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1",
    credential_id: credentialId,
    agent_id: agentId,
    destination_wc_account: account,
    status: "active",
    valid_from: validFrom,
    valid_until: validUntil,
    revoked_at: null,
    uniqueness_key: `paid-work-credential-wc-account:${credentialId}`,
    source: {
      credential_registry_sha256: sourceByte.repeat(32),
      review_decision_id: "voidreview1_" + "11".repeat(32),
      issuance_preparation_id: "voidissue1_" + "22".repeat(32),
    },
    authority: {
      paid_work_submission_identity: true,
      wc_award_destination: true,
      payment: false,
      wc_ledger_write: false,
      wc_to_void_settlement: false,
      wallet_or_signer: false,
    },
    created_at: validFrom,
  };
  return {
    binding_id: contentIdV1("voidapwcb1_", core),
    ...core,
  };
}

function processStartTicks(pid) {
  const text = readFileSync(`/proc/${pid}/stat`, "utf8");
  const close = text.lastIndexOf(")");
  need(close > 0, "process stat format mismatch");
  const fields = text.slice(close + 1).trim().split(/\s+/);
  need(fields.length > 19, "process stat fields missing");
  return fields[19];
}

function bootId() {
  return readFileSync(
    "/proc/sys/kernel/random/boot_id",
    "utf8",
  ).trim();
}

function activeLockRecord(stagedMutationId, acquiredAt) {
  return {
    marker: RETIREMENT_LOCK_MARKER,
    version: 1,
    pid: process.pid,
    process_start_ticks: processStartTicks(process.pid),
    boot_id: bootId(),
    staged_mutation_id: stagedMutationId,
    acquired_at: acquiredAt,
  };
}

function staleLockRecord(stagedMutationId, acquiredAt) {
  return {
    marker: RETIREMENT_LOCK_MARKER,
    version: 1,
    pid: 999999999,
    process_start_ticks: "1",
    boot_id: "00000000-0000-0000-0000-000000000000",
    staged_mutation_id: stagedMutationId,
    acquired_at: acquiredAt,
  };
}

const root = mkdtempSync(join(tmpdir(), "void-binding-retirement-proof-"));
chmodSync(root, 0o700);

try {
  const agentId = "void-agent-proof-retirement-v1";
  const account = "void-proof-retirement-account-v1";
  // Real credential registries use canonical second-precision UTC.
  const issuedAt = "2026-08-01T00:00:00Z";
  const expiresAt = "2026-08-02T00:00:00Z";
  const retiredAt = "2026-08-02T00:00:01Z";
  const appliedAt = "2026-08-02T00:00:02Z";

  const credentialFixture = makeCredentialRegistry({
    agentId,
    issuedAt,
    expiresAt,
  });
  const credentialRegistry = credentialFixture.registry;
  const credentialId = credentialFixture.credential.credential_id;
  const binding = makeBinding({
    credentialId,
    agentId,
    account,
    validFrom: issuedAt,
    validUntil: expiresAt,
  });
  const bindingId = binding.binding_id;
  const bindingRegistry = materializeBindingRegistryV1([binding], issuedAt);

  const credentialPath = join(root, "credential-registry.json");
  const bindingPath = join(root, "binding-registry.json");
  const retirementPath = join(root, "retirement-registry.json");
  const stagedPath = join(root, "staged.json");
  const receiptPath = join(root, "receipt.json");
  const lockPath = join(root, "apply.lock");
  writePrivateJson(credentialPath, credentialRegistry);
  writePrivateJson(bindingPath, bindingRegistry);

  const inspection = inspectBindingRetirementV1({
    credentialRegistryPath: credentialPath,
    bindingRegistryPath: bindingPath,
    retirementRegistryPath: retirementPath,
    bindingId,
    credentialId,
    agentId,
    destinationWcAccount: account,
    evaluatedAt: retiredAt,
  });
  need(inspection.marker === RETIREMENT_MARKER, "inspection marker mismatch");
  need(inspection.credential_expired_or_revoked === true, "expired credential not recognized");
  need(inspection.binding_valid_window_ended === true, "ended binding window not recognized");
  need(inspection.ready_to_stage_retirement === true, "retirement not ready");
  need(inspection.raw_token_read === false, "inspection read token");
  need(Object.values(inspection.authority).every((value) => value === false), "inspection granted authority");

  const bindingBeforeStage = shaFile(bindingPath);
  const stageResult = stageBindingRetirementV1({
    credentialRegistryPath: credentialPath,
    bindingRegistryPath: bindingPath,
    retirementRegistryPath: retirementPath,
    bindingId,
    credentialId,
    agentId,
    destinationWcAccount: account,
    retiredAt,
    reason: RETIREMENT_REASON,
    outputPath: stagedPath,
  });
  need(stageResult.command === "stage-retire", "stage command mismatch");
  need(stageResult.binding_registry_write === false, "stage mutated binding registry");
  need(stageResult.retirement_registry_write === false, "stage mutated retirement registry");
  need(shaFile(bindingPath) === bindingBeforeStage, "stage changed binding registry bytes");
  need(!readFileSync(stagedPath, "utf8").includes("raw_token"), "stage contains raw_token key");
  const staged = JSON.parse(readFileSync(stagedPath, "utf8"));
  need(staged.live_authority === false, "staged live authority widened");
  need(Object.values(staged.authority).every((value) => value === false), "staged authority widened");
  need(staged.next_binding_registry.bindings.length === 0, "target binding not removed from next registry");
  need(staged.next_retirement_registry.retirements.length === 1, "retirement record not appended");
  const retirementRecord = validateRetirementRecordV1(
    staged.next_retirement_registry.retirements[0],
  );
  need(retirementRecord.marker === RETIREMENT_RECORD_MARKER, "retirement record marker mismatch");
  need(retirementRecord.original_binding.binding_id === bindingId, "original binding not preserved");
  need(retirementRecord.replacement_binding_created === false, "retirement created replacement");
  need(Object.values(retirementRecord.authority).every((value) => value === false), "retirement authority widened");

  const bindingBeforeWrongConfirm = shaFile(bindingPath);
  expectThrow(
    () =>
      applyBindingRetirementV1({
        credentialRegistryPath: credentialPath,
        bindingRegistryPath: bindingPath,
        retirementRegistryPath: retirementPath,
        stagedPath,
        receiptPath,
        lockPath,
        confirmation: "wrong-confirmation",
        appliedAt,
      }),
    /confirmation mismatch/,
    "wrong confirmation accepted",
  );
  need(shaFile(bindingPath) === bindingBeforeWrongConfirm, "wrong confirmation mutated binding registry");
  need(!existsSyncCompat(retirementPath), "wrong confirmation created retirement registry");
  need(!existsSync(lockPath), "wrong confirmation created operation lock");

  writePrivateJson(
    lockPath,
    activeLockRecord(staged.staged_mutation_id, appliedAt),
  );
  expectThrow(
    () =>
      applyBindingRetirementV1({
        credentialRegistryPath: credentialPath,
        bindingRegistryPath: bindingPath,
        retirementRegistryPath: retirementPath,
        stagedPath,
        receiptPath,
        lockPath,
        confirmation: RETIREMENT_CONFIRMATION,
        appliedAt,
      }),
    /active retirement operation lock/,
    "active operation lock was ignored",
  );
  need(shaFile(bindingPath) === bindingBeforeWrongConfirm, "active lock rejection changed binding registry");
  need(!existsSyncCompat(retirementPath), "active lock rejection created retirement registry");
  unlinkSync(lockPath);

  const applied = applyBindingRetirementV1({
    credentialRegistryPath: credentialPath,
    bindingRegistryPath: bindingPath,
    retirementRegistryPath: retirementPath,
    stagedPath,
    receiptPath,
    lockPath,
    confirmation: RETIREMENT_CONFIRMATION,
    appliedAt,
  });
  need(applied.status === "applied", "apply status mismatch");
  need(applied.operation_status === "applied", "apply operation status mismatch");
  need(applied.exact_replay === false, "initial apply marked replay");
  need(applied.retirement_registry_write_performed === true, "retirement registry not written");
  need(applied.binding_registry_write_performed === true, "binding registry not written");
  need(applied.account_binding_slot_freed === true, "account slot not freed");
  need(applied.replacement_binding_created === false, "apply created replacement binding");
  need(applied.raw_token_read === false, "apply read token");
  need(!existsSync(lockPath), "operation lock not released after apply");
  need(Object.values(applied.authority).every((value) => value === false), "apply authority widened");

  const afterBinding = JSON.parse(readFileSync(bindingPath, "utf8"));
  const afterRetirement = JSON.parse(readFileSync(retirementPath, "utf8"));
  need(afterBinding.marker === BINDING_REGISTRY_MARKER, "binding registry marker changed");
  need(afterBinding.bindings.length === 0, "retired binding remains active");
  need(afterRetirement.marker === RETIREMENT_REGISTRY_MARKER, "retirement registry marker mismatch");
  need(afterRetirement.retirements.length === 1, "retirement registry count mismatch");
  need(afterRetirement.retirements[0].binding_id === bindingId, "retirement registry binding mismatch");

  const bindingAfterApplySha = shaFile(bindingPath);
  const retirementAfterApplySha = shaFile(retirementPath);
  const originalReceiptSha = shaFile(receiptPath);

  const samePathReplay = applyBindingRetirementV1({
    credentialRegistryPath: credentialPath,
    bindingRegistryPath: bindingPath,
    retirementRegistryPath: retirementPath,
    stagedPath,
    receiptPath,
    lockPath,
    confirmation: RETIREMENT_CONFIRMATION,
    appliedAt: "2026-08-02T00:00:03Z",
  });
  need(samePathReplay.operation_status === "duplicate", "same-path replay not classified duplicate");
  need(samePathReplay.exact_replay === true, "same-path replay flag false");
  need(samePathReplay.receipt_write_performed === false, "same-path replay rewrote receipt");
  need(shaFile(receiptPath) === originalReceiptSha, "same-path replay changed original receipt");
  need(!existsSync(lockPath), "operation lock not released after same-path replay");

  const duplicateReceipt = join(root, "duplicate-receipt.json");
  const duplicate = applyBindingRetirementV1({
    credentialRegistryPath: credentialPath,
    bindingRegistryPath: bindingPath,
    retirementRegistryPath: retirementPath,
    stagedPath,
    receiptPath: duplicateReceipt,
    lockPath,
    confirmation: RETIREMENT_CONFIRMATION,
    appliedAt: "2026-08-02T00:00:04Z",
  });
  need(duplicate.status === "duplicate", "distinct receipt replay not duplicate");
  need(duplicate.operation_status === "duplicate", "distinct replay operation status mismatch");
  need(duplicate.exact_duplicate === true, "duplicate receipt flag false");
  need(duplicate.exact_replay === true, "distinct replay flag false");
  need(duplicate.binding_registry_write_performed === false, "duplicate rewrote binding registry");
  need(duplicate.retirement_registry_write_performed === false, "duplicate rewrote retirement registry");
  need(shaFile(bindingPath) === bindingAfterApplySha, "duplicate changed binding registry");
  need(shaFile(retirementPath) === retirementAfterApplySha, "duplicate changed retirement registry");
  need(!existsSync(lockPath), "operation lock not released after distinct replay");

  // Recovery proof: retirement evidence durable, active binding still present.
  const recoveryRoot = join(root, "recovery");
  mkdirSync(recoveryRoot, { mode: 0o700 });
  const recoveryCredential = join(recoveryRoot, "credential.json");
  const recoveryBinding = join(recoveryRoot, "binding.json");
  const recoveryRetirement = join(recoveryRoot, "retirement.json");
  const recoveryStaged = join(recoveryRoot, "staged.json");
  const recoveryReceipt = join(recoveryRoot, "receipt.json");
  const recoveryLock = join(recoveryRoot, "apply.lock");
  writePrivateJson(recoveryCredential, credentialRegistry);
  writePrivateJson(recoveryBinding, bindingRegistry);
  stageBindingRetirementV1({
    credentialRegistryPath: recoveryCredential,
    bindingRegistryPath: recoveryBinding,
    retirementRegistryPath: recoveryRetirement,
    bindingId,
    credentialId,
    agentId,
    destinationWcAccount: account,
    retiredAt,
    reason: RETIREMENT_REASON,
    outputPath: recoveryStaged,
  });
  const recoveryStageValue = JSON.parse(readFileSync(recoveryStaged, "utf8"));
  writePrivateJson(
    recoveryRetirement,
    recoveryStageValue.next_retirement_registry,
  );
  writePrivateJson(
    recoveryLock,
    staleLockRecord(
      recoveryStageValue.staged_mutation_id,
      "2026-08-02T00:00:03Z",
    ),
  );
  expectThrow(
    () =>
      applyBindingRetirementV1({
        credentialRegistryPath: recoveryCredential,
        bindingRegistryPath: recoveryBinding,
        retirementRegistryPath: recoveryRetirement,
        stagedPath: recoveryStaged,
        receiptPath: recoveryReceipt,
        lockPath: recoveryLock,
        confirmation: RETIREMENT_CONFIRMATION,
        appliedAt: "2026-08-02T00:00:05Z",
      }),
    /stale retirement operation lock requires exact recovery confirmation/,
    "stale lock recovered without explicit confirmation",
  );
  need(
    JSON.parse(readFileSync(recoveryBinding, "utf8")).bindings.length === 1,
    "stale lock rejection freed binding slot",
  );
  const recovered = applyBindingRetirementV1({
    credentialRegistryPath: recoveryCredential,
    bindingRegistryPath: recoveryBinding,
    retirementRegistryPath: recoveryRetirement,
    stagedPath: recoveryStaged,
    receiptPath: recoveryReceipt,
    lockPath: recoveryLock,
    confirmation: RETIREMENT_CONFIRMATION,
    appliedAt: "2026-08-02T00:00:06Z",
    staleLockRecoveryConfirmation:
      RETIREMENT_STALE_LOCK_RECOVERY_CONFIRMATION,
  });
  need(recovered.status === "recovered", "partial apply did not recover");
  need(recovered.operation_status === "recovered", "recovery operation status mismatch");
  need(recovered.stale_lock_recovered === true, "stale lock recovery flag false");
  need(recovered.recovery_completed === true, "recovery flag false");
  need(recovered.retirement_registry_write_performed === false, "recovery rewrote retirement evidence");
  need(recovered.binding_registry_write_performed === true, "recovery did not free binding slot");
  need(JSON.parse(readFileSync(recoveryBinding, "utf8")).bindings.length === 0, "recovery binding slot still occupied");
  need(!existsSync(recoveryLock), "recovery operation lock not released");

  // Non-expired credentials must never stage.
  const activeRoot = join(root, "active");
  mkdirSync(activeRoot, { mode: 0o700 });
  const activeCredentialPath = join(activeRoot, "credential.json");
  const activeBindingPath = join(activeRoot, "binding.json");
  const activeRetirementPath = join(activeRoot, "retirement.json");
  const activeStagedPath = join(activeRoot, "staged.json");
  const activeCredentialFixture = makeCredentialRegistry({
    agentId,
    issuedAt,
    expiresAt: "2026-08-03T00:00:00Z",
    tokenByte: "ac",
  });
  const activeCredentialRegistry = activeCredentialFixture.registry;
  const activeCredentialId =
    activeCredentialFixture.credential.credential_id;
  const activeBindingRecord = makeBinding({
    credentialId: activeCredentialId,
    agentId,
    account,
    validFrom: issuedAt,
    validUntil: "2026-08-03T00:00:00Z",
    sourceByte: "ce",
  });
  const activeBindingId = activeBindingRecord.binding_id;
  writePrivateJson(activeCredentialPath, activeCredentialRegistry);
  writePrivateJson(
    activeBindingPath,
    materializeBindingRegistryV1([activeBindingRecord], issuedAt),
  );
  expectThrow(
    () =>
      stageBindingRetirementV1({
        credentialRegistryPath: activeCredentialPath,
        bindingRegistryPath: activeBindingPath,
        retirementRegistryPath: activeRetirementPath,
        bindingId: activeBindingId,
        credentialId: activeCredentialId,
        agentId,
        destinationWcAccount: account,
        retiredAt,
        reason: RETIREMENT_REASON,
        outputPath: activeStagedPath,
      }),
    /not expired or revoked/,
    "non-expired credential retirement staged",
  );

  // Registry content-addressing and authority must be validated before mutation.
  const strictRoot = join(root, "strict");
  mkdirSync(strictRoot, { mode: 0o700 });
  const strictCredentialPath = join(strictRoot, "credential.json");
  const strictBindingPath = join(strictRoot, "binding.json");
  const strictRetirementPath = join(strictRoot, "retirement.json");
  const malformedCredential = {
    ...credentialFixture.credential,
    credential_id: `voidapwc1_${"9".repeat(64)}`,
  };
  const malformedCredentialCore = {
    marker: CREDENTIAL_REGISTRY_MARKER,
    version: 1,
    created_at_utc: issuedAt,
    credentials: [malformedCredential],
  };
  writePrivateJson(strictCredentialPath, {
    registry_id: contentIdV1("voidapwcr1_", malformedCredentialCore),
    ...malformedCredentialCore,
  });
  writePrivateJson(strictBindingPath, bindingRegistry);
  expectThrow(
    () =>
      inspectBindingRetirementV1({
        credentialRegistryPath: strictCredentialPath,
        bindingRegistryPath: strictBindingPath,
        retirementRegistryPath: strictRetirementPath,
        bindingId,
        credentialId,
        agentId,
        destinationWcAccount: account,
        evaluatedAt: retiredAt,
      }),
    /credential_id content mismatch/,
    "malformed credential content ID accepted",
  );

  writePrivateJson(strictCredentialPath, credentialRegistry);
  const unsafeBindingCore = {
    ...binding,
    authority: {
      ...binding.authority,
      payment: true,
    },
  };
  delete unsafeBindingCore.binding_id;
  const unsafeBinding = {
    binding_id: contentIdV1("voidapwcb1_", unsafeBindingCore),
    ...unsafeBindingCore,
  };
  writePrivateJson(
    strictBindingPath,
    materializeBindingRegistryV1([unsafeBinding], issuedAt),
  );
  expectThrow(
    () =>
      inspectBindingRetirementV1({
        credentialRegistryPath: strictCredentialPath,
        bindingRegistryPath: strictBindingPath,
        retirementRegistryPath: strictRetirementPath,
        bindingId: unsafeBinding.binding_id,
        credentialId,
        agentId,
        destinationWcAccount: account,
        evaluatedAt: retiredAt,
      }),
    /binding\.authority\.payment must be false/,
    "unsafe binding authority accepted",
  );

  // Stale prestate must reject before either registry changes.
  const staleRoot = join(root, "stale");
  mkdirSync(staleRoot, { mode: 0o700 });
  const staleCredential = join(staleRoot, "credential.json");
  const staleBinding = join(staleRoot, "binding.json");
  const staleRetirement = join(staleRoot, "retirement.json");
  const staleStaged = join(staleRoot, "staged.json");
  const staleReceipt = join(staleRoot, "receipt.json");
  const staleLock = join(staleRoot, "apply.lock");
  writePrivateJson(staleCredential, credentialRegistry);
  writePrivateJson(staleBinding, bindingRegistry);
  stageBindingRetirementV1({
    credentialRegistryPath: staleCredential,
    bindingRegistryPath: staleBinding,
    retirementRegistryPath: staleRetirement,
    bindingId,
    credentialId,
    agentId,
    destinationWcAccount: account,
    retiredAt,
    reason: RETIREMENT_REASON,
    outputPath: staleStaged,
  });
  const unrelatedBinding = makeBinding({
    credentialId: `voidapwc1_${"4".repeat(64)}`,
    agentId: "another-agent-v1",
    account: "another-account-v1",
    validFrom: issuedAt,
    validUntil: expiresAt,
    sourceByte: "ef",
  });
  const staleRegistry = materializeBindingRegistryV1(
    [binding, unrelatedBinding],
    "2026-08-02T00:00:00.500Z",
  );
  writePrivateJson(staleBinding, staleRegistry);
  const staleBindingSha = shaFile(staleBinding);
  expectThrow(
    () =>
      applyBindingRetirementV1({
        credentialRegistryPath: staleCredential,
        bindingRegistryPath: staleBinding,
        retirementRegistryPath: staleRetirement,
        stagedPath: staleStaged,
        receiptPath: staleReceipt,
        lockPath: staleLock,
        confirmation: RETIREMENT_CONFIRMATION,
        appliedAt,
      }),
    /neither staged prestate nor exact final state/,
    "stale binding prestate accepted",
  );
  need(shaFile(staleBinding) === staleBindingSha, "stale rejection changed binding registry");
  need(!existsSyncCompat(staleRetirement), "stale rejection created retirement registry");
  need(!existsSync(staleLock), "stale rejection did not release operation lock");

  const sourceText = readFileSync(
    resolve(
      "scripts/agent_paid_work_credential_wc_account_binding_retirement_v1.mjs",
    ),
    "utf8",
  );
  need(
    sourceText.indexOf("retirement evidence is durable before the active slot is freed")
      < sourceText.indexOf("atomicWriteJson(bindingRegistryPath"),
    "source does not preserve safe retirement-before-binding ordering",
  );
  need(sourceText.includes(RETIREMENT_CONFIRMATION), "confirmation source marker missing");
  need(
    sourceText.includes(RETIREMENT_STALE_LOCK_RECOVERY_CONFIRMATION),
    "stale-lock recovery confirmation missing",
  );
  need(
    sourceText.includes("canonical UTC seconds or milliseconds"),
    "real credential timestamp compatibility missing",
  );
  need(
    sourceText.includes("credential registry content ID mismatch"),
    "strict credential registry validation missing",
  );
  need(
    sourceText.includes("binding registry changed after locked prestate verification"),
    "locked binding prewrite recheck missing",
  );
  need(
    sourceText.includes("active retirement operation lock"),
    "active operation lock rejection missing",
  );
  need(!sourceText.includes("child_process"), "retirement source unexpectedly launches subprocesses");
  need(!sourceText.includes("fetch("), "retirement source unexpectedly performs network fetch");
  need(!sourceText.includes("private_key"), "retirement source mentions private key");
  need(!sourceText.includes("wallet_or_signer_access: true"), "retirement source grants wallet authority");

  const examplePath =
    "examples/agent-paid-work-credential-wc-account-binding-retirement-v1.example.json";
  const schemaPath =
    "schemas/agent-paid-work-credential-wc-account-binding-retirement-v1.schema.json";
  const docsPath =
    "docs/operators/agent-paid-work-credential-wc-account-binding-retirement-v1.md";
  const workflowPath =
    ".github/workflows/agent-paid-work-credential-wc-account-binding-retirement-v1.yml";
  const example = JSON.parse(readFileSync(examplePath, "utf8"));
  validateRetirementRecordV1(example);
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  need(
    schema.properties.marker.const
      === "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_RECORD_V1",
    "schema marker mismatch",
  );
  need(schema.properties.replacement_binding_created.const === false, "schema permits replacement creation");
  need(schema.properties.authority.properties.payment_execution.const === false, "schema permits payment execution");
  const docs = readFileSync(docsPath, "utf8");
  need(docs.includes(RETIREMENT_CONFIRMATION), "documentation confirmation missing");
  need(
    docs.includes(RETIREMENT_STALE_LOCK_RECOVERY_CONFIRMATION),
    "documentation stale-lock recovery confirmation missing",
  );
  need(docs.includes("retirement evidence first"), "documentation safe ordering missing");
  need(docs.includes("receipt_write_performed=false"), "documentation same-path replay boundary missing");
  need(docs.includes("second precision"), "documentation real timestamp compatibility missing");
  const workflow = readFileSync(workflowPath, "utf8");
  need(workflow.includes("node --check"), "workflow syntax check missing");
  need(workflow.includes("Prove retirement contract"), "workflow proof step missing");

  console.log("credential_seconds_timestamp_compatibility_green=true");
  console.log("strict_credential_registry_content_id_green=true");
  console.log("strict_binding_registry_authority_green=true");
  console.log("expired_credential_guard_green=true");
  console.log("exact_binding_identity_guard_green=true");
  console.log("staged_prestate_binding_green=true");
  console.log("wrong_confirmation_rejected_green=true");
  console.log("active_operation_lock_rejected_green=true");
  console.log("stale_operation_lock_explicit_recovery_green=true");
  console.log("retirement_evidence_before_slot_free_green=true");
  console.log("atomic_binding_registry_replacement_green=true");
  console.log("retirement_registry_append_green=true");
  console.log("partial_apply_recovery_green=true");
  console.log("same_receipt_path_replay_idempotent_green=true");
  console.log("distinct_receipt_path_duplicate_green=true");
  console.log("exact_replay_idempotent_green=true");
  console.log("stale_prestate_rejected_green=true");
  console.log("replacement_binding_not_created_green=true");
  console.log("raw_token_not_read_green=true");
  console.log("payment_execution_false_green=true");
  console.log("wc_ledger_write_false_green=true");
  console.log("wallet_or_signer_false_green=true");
  console.log("service_restart_false_green=true");
  console.log("deployment_false_green=true");
  console.log("money_movement_false_green=true");
  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_V1_PROOF_GREEN=true",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}

function existsSyncCompat(path) {
  try {
    readFileSync(path);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}
