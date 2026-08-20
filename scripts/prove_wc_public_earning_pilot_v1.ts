import fs from "node:fs";
import path from "node:path";

function need(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`VOID_WC_PUBLIC_EARNING_PILOT_V1_FAIL: ${message}`);
  }
}

const root = process.cwd();
const indexText = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const moduleText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_public_earning_pilot_v1.ts"),
  "utf8",
);
const capabilityText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_public_capability_v1.ts"),
  "utf8",
);
const acceptanceText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_verified_receipt_acceptance_v1.ts"),
  "utf8",
);
const productionVisibilityText = fs.readFileSync(
  path.join(
    root,
    "src",
    "economic",
    "wc_production_visibility_projection_v1.ts",
  ),
  "utf8",
);
const remoteTruthIndexText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_public_remote_truth_jsonl_index_v1.ts"),
  "utf8",
);
const claimHistoryAuthorityText = fs.readFileSync(
  path.join(
    root,
    "src",
    "economic",
    "wc_public_claim_history_authority_v1.ts",
  ),
  "utf8",
);
const publicStateDirectoryAuthorityText = fs.readFileSync(
  path.join(
    root,
    "src",
    "economic",
    "wc_public_state_directory_authority_v1.ts",
  ),
  "utf8",
);
const noNodeClientText = fs.readFileSync(
  path.join(
    root,
    "tools",
    "void_public_earn_no_node_client_v1.mjs",
  ),
  "utf8",
);

need(
  capabilityText.includes(
    'import "./wc_public_earning_pilot_v1.js"; // VOID_WC_PUBLIC_EARNING_PILOT_V1',
  ),
  "capability bootstrap import missing",
);
need(
  !indexText.includes(
    'import "./economic/wc_public_earning_pilot_v1.js"; // VOID_WC_PUBLIC_EARNING_PILOT_V1',
  ),
  "index import must remain absent",
);

for (const marker of [
  "VOID_WC_PUBLIC_EARNING_PILOT_V1",
  "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
  'VOID_WC_PUBLIC_EARNING_PILOT_TASK =\n  "datanet_fetch_verify"',
  "VOID_WC_PUBLIC_EARNING_PILOT_AWARD_WC = 3",
  '"/wc/public-earning-pilot-v1/operator/issue"',
  '"/wc/public-earning-pilot-v1/execute-local"',
  '"/wc/public-earning-pilot-v1/submit-result"',
  '"/wc/public-earning-pilot-v1/status"',
  '"/wc/public-earning-pilot-v1/claim-ticket"',
  '"/wc/public-earning-pilot-v1/sign-claim"',
  "publicTicketClaimSigningObject",
  "publicTicketClaimSigningBytes",
  "signPublicTicketClaim",
  "verifyPublicTicketClaim",
  "issuePublicTicketClaim",
  "publicTicketClaimPolicySnapshot",
  "proof_of_executor_key_possession_required: true",
  "claim_nonce_replay_protection: true",
  "server_selected_work: true",
  "participant_selected_dataset: false",
  "participant_selected_input_hash: false",
  "executor_node_id",
  "executor_http_base",
  "expected_input_hash",
  "token_sha256",
  "capability_token_returned_once: true",
  "ed25519",
  "nodeIdFromPubPEM",
  ".sign(null",
  "crypto.verify",
  "executor_signature_invalid",
  "remote_health_node_id_mismatch",
  "/health",
  "/jobs/",
  "/receipts",
  "remote_job_verified: true",
  "remote_receipt_verified: true",
  "remote_job_expected_input_hash_mismatch",
  "remote_job_capability_ticket_mismatch",
  "remote_job_executor_node_mismatch",
  "remote_receipt_timestamp_invalid",
  "remote_receipt_timestamp_mismatch",
  "local_receipt_timestamp_invalid",
  "receipt_timestamp_bound_to_ticket_window: true",
  "process_instance_ticket_lock: true",
  "receipt_timestamp_before_ticket",
  "receipt_timestamp_after_ticket",
  "acquireWcProcessInstanceLockV1",
  "acquirePilotTicketLock",
  "releasePilotTicketLock",
  "persistImportedRemoteTruthOnce",
  "remote_executor_provenance",
  "acceptVerifiedReceiptOnce",
  'source: "wc_public_earning_pilot_v1"',
  "accepted_delta_wc",
  "completed_idempotent_retry",
  "capability_result_conflict",
  "ticket_inflight",
  "participant_selected_award: false",
  "automatic_background_loop: false",
  "generic_credit_route: false",
  "wc_to_void: false",
  "wallet_send: false",
  "buy_void_fulfillment: false",
  "money_movement: false",
]) {
  need(moduleText.includes(marker), `missing marker: ${marker}`);
}

need(
  moduleText.includes("VOID_WC_PUBLIC_REMOTE_EVIDENCE_MAX_JSON_BYTES_V1"),
  "inbound executor evidence byte ceiling missing",
);
need(
  moduleText.includes('response.headers.get("content-length")'),
  "declared response length fast reject missing",
);
need(
  moduleText.includes("response.body.getReader()"),
  "streamed response byte accounting missing",
);
need(
  moduleText.includes("total + bytes > maxBodyBytes"),
  "streamed response limit+1 rejection missing",
);
need(
  !moduleText.includes("await response.text()"),
  "unbounded response.text buffering remains",
);
need(
  moduleText.includes('error: "remote_evidence_body_too_large"'),
  "oversize evidence does not use stable participant error",
);

need(
  moduleText.includes(
    '`${localBase}/jobs/submit?dry=0&confirm=jobsSubmit`',
  ),
  "local executor does not use confirmed jobs submit",
);
need(
  moduleText.includes(
    "&dry=0&confirm=jobsWorkerRunOnce",
  ),
  "local executor does not use confirmed worker run-once",
);
need(
  moduleText.includes("executor_node_binding_mismatch"),
  "local executor node binding missing",
);
need(
  moduleText.includes("executor_key_node_binding_mismatch"),
  "local executor key binding missing",
);
need(
  moduleText.includes('["executor_node_id", envelope.executor_node_id, record.executor_node_id]'),
  "coordinator ticket executor binding missing",
);
need(
  moduleText.includes('["dataset_id", envelope.dataset_id, record.dataset_id]'),
  "coordinator ticket dataset binding missing",
);
need(
  moduleText.includes('["expected_input_hash", envelope.expected_input_hash, record.expected_input_hash]'),
  "coordinator ticket input-hash binding missing",
);
need(
  moduleText.includes("const earliestAllowed = Number(record.issued_at_ms || 0) - skewMs"),
  "receipt lower timestamp bound missing",
);
need(
  moduleText.includes("Number(record.expires_at_ms || 0) + skewMs"),
  "receipt upper ticket-expiry timestamp bound missing",
);
need(
  moduleText.includes("acquireWcProcessInstanceLockV1"),
  "process-generation ticket lock missing",
);
const lockText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_process_instance_lock_v1.ts"),
  "utf8",
);
const lockPublishStart = lockText.indexOf(
  "async function durablePublishExclusiveV1(",
);
const lockPublishEnd = lockText.indexOf(
  "async function publishReleaseV1(",
  lockPublishStart,
);
need(
  lockPublishStart >= 0 &&
    lockPublishEnd > lockPublishStart,
  "bounded exclusive lock publication helper missing",
);
const lockPublishBlock = lockText.slice(
  lockPublishStart,
  lockPublishEnd,
);
const lockWrite = lockPublishBlock.indexOf(
  "await handle.write(",
);
const lockDataSync = lockPublishBlock.indexOf(
  "await handle.datasync()",
);
const lockClose = lockPublishBlock.indexOf(
  "await handle.close()",
);
const lockLink = lockPublishBlock.indexOf(
  "await fsp.link(tmp, file)",
);
const lockDirectorySync = lockPublishBlock.indexOf(
  "await dirHandle.sync()",
);
need(
  lockWrite >= 0 &&
    lockDataSync > lockWrite &&
    lockClose > lockDataSync &&
    lockLink > lockClose &&
    lockDirectorySync > lockLink &&
    lockPublishBlock.includes(
      "WcProcessInstanceLockPublicationLinkedError",
    ),
  "lock generation publication is not complete/durable/exclusive",
);
need(
  lockText.includes("process_start_ticks"),
  "lock ownership is not bound to process generation",
);
need(
  moduleText.includes("durable_result_transaction: true"),
  "durable result transaction status missing",
);
need(
  moduleText.includes("writePilotResultTransactionV1"),
  "durable result journal missing",
);
need(
  moduleText.includes("appendAuditBestEffort"),
  "post-terminal audit is not best-effort",
);
const submitStart = moduleText.indexOf(
  "export async function submitRemoteResult(",
);
const submitLock = moduleText.indexOf(
  "await acquirePilotTicketLock(parsed.ticketId)",
  submitStart,
);
const submitConsumed = moduleText.indexOf(
  "const consumedPath = ticketFile(consumedDir(), parsed.ticketId)",
  submitStart,
);
need(
  submitStart >= 0 &&
    submitLock > submitStart &&
    submitConsumed > submitLock,
  "single-use ticket state is still checked before ticket ownership",
);
need(
  !moduleText.includes(
    "const before = await readCanonicalWcState(record.account)",
  ),
  "pilot still derives acceptance delta from external before/after reads",
);
need(
  moduleText.includes("acceptance?.accepted_delta_wc"),
  "pilot does not use acceptance-local delta evidence",
);
need(
  moduleText.includes("export function assertRemoteJobTruth("),
  "remote job truth validator is not proof-callable",
);
need(
  moduleText.includes("export function assertRemoteReceiptTruth("),
  "remote receipt truth validator is not proof-callable",
);
need(
  moduleText.includes("plaintext.capability_ticket_id"),
  "remote job is not bound to capability ticket",
);
need(
  moduleText.includes("plaintext.executor_node_id"),
  "remote job is not bound to executor node",
);
need(
  moduleText.includes("plaintext.expected_input_hash"),
  "remote job is not bound to expected input hash",
);
need(
  acceptanceText.includes("nano_wc_fixed_point_v1"),
  "canonical WC numeric domain is not exact fixed point",
);
need(
  acceptanceText.includes(
    "function wcQuantaToCompatNumberV1(\n  value: bigint,\n): number | null",
  ),
  "WC compatibility projection is not lossless-or-null",
);
need(
  acceptanceText.includes(
    '"wc_compat_number_roundtrip_invalid"',
  ) &&
    acceptanceText.includes("roundTrip === value ? out : null"),
  "WC compatibility projection lacks exact quanta round-trip",
);
need(
  moduleText.includes("function wcCompatProjectionV1("),
  "public earning compatibility null propagation helper missing",
);
for (const forbidden of [
  "Number(\n          acceptance?.canonical_redeemable_before || 0",
  "Number(\n          acceptance?.canonical_redeemable_after_local || 0",
  "Number(\n        acceptance?.canonical_redeemable_after_local || 0",
  "Number(\n            consumed.canonical_redeemable_after_local || 0",
]) {
  need(
    !moduleText.includes(forbidden),
    `lossy WC compatibility coercion remains: ${forbidden}`,
  );
}
need(
  productionVisibilityText.includes(
    'redeemable: redeemableQuanta > 0n',
  ),
  "production WC redeemable boolean still depends on compatibility Number",
);
need(
  productionVisibilityText.includes("balance_exact:") &&
    productionVisibilityText.includes("redeemable_wc_exact:") &&
    productionVisibilityText.includes("numeric_authority:"),
  "production WC exact balance projection missing",
);
need(
  acceptanceText.includes("capabilityTicketIdRaw"),
  "acceptance duplicate authority is not capability-ticket bound",
);
need(
  acceptanceText.includes("accepted_delta_wc"),
  "acceptance-local fixed delta evidence missing",
);
need(
  acceptanceText.includes("redeemable_quanta"),
  "canonical WC exact quanta evidence missing",
);
need(
  acceptanceText.includes("redeemable_exact"),
  "canonical WC exact decimal evidence missing",
);

need(
  moduleText.includes('typeof receiptTsMs !== "number"') &&
    moduleText.includes("!Number.isSafeInteger(receiptTsMs)") &&
    moduleText.includes("receiptTsMs !== envelope.receipt_ts_ms"),
  "persisted remote receipt timestamp is not envelope-bound",
);
need(
  moduleText.includes("proofBundle.version !== 1"),
  "outbound proof-bundle version is not exact-runtime-typed",
);
need(
  !moduleText.includes("Math.trunc(Number(receipt?.ts_ms || 0))") &&
    !moduleText.includes("Math.trunc(Number(receipt.ts_ms || 0))") &&
    !moduleText.includes("Number(receipt.ts_ms || Date.now())"),
  "remote receipt timestamp is still coerced or synthesized",
);

need(
  moduleText.includes("appendWcPublicRemoteTruthJsonlExactOnceV1"),
  "bounded WC remote-truth index import missing",
);
need(
  moduleText.includes("prepareWcPublicRemoteTruthJsonlExactOnceV1"),
  "WC remote-truth preflight helper import missing",
);
need(
  !moduleText.includes('import readline from "node:readline";'),
  "legacy per-import streamed history scanner remains",
);
need(
  !moduleText.includes("async function readJsonlMatches("),
  "legacy per-import JSONL matcher remains",
);
const appendExactStart = moduleText.indexOf(
  "async function appendExactOnce(",
);
const persistImportStart = moduleText.indexOf(
  "let importedRemoteTruthSerialTailV1: Promise<void> = Promise.resolve();",
);
need(appendExactStart >= 0, "async exact-once append wrapper missing");
need(
  persistImportStart > appendExactStart,
  "whole-import serializer does not follow exact-once wrapper",
);
const appendExactBlock = moduleText.slice(appendExactStart, persistImportStart);
need(
  appendExactBlock.includes(
    "await appendWcPublicRemoteTruthJsonlExactOnceV1(",
  ),
  "exact-once wrapper does not use bounded remote-truth index",
);
need(
  moduleText.includes(
    "let importedRemoteTruthSerialTailV1: Promise<void> = Promise.resolve();",
  ),
  "WC imported-truth serializer tail missing",
);
need(
  moduleText.includes("async function serializeImportedRemoteTruthV1<T>("),
  "WC imported-truth serializer helper missing",
);
need(
  moduleText.includes("await previous;"),
  "WC imported-truth serializer does not wait for prior import",
);
need(
  moduleText.includes("return serializeImportedRemoteTruthV1(async () => {"),
  "WC imported-truth persistence is not serialized",
);
need(
  moduleText.includes(
    "const imported = await persistImportedRemoteTruthOnce(",
  ),
  "live coordinator import does not await indexed persistence",
);

need(
  moduleText.includes("prepareImportedRemoteTruthIndexes(dataDir)"),
  "WC imported truth is not preflighted before publication",
);
need(
  moduleText.includes("Promise.allSettled("),
  "WC cold index preflights do not start together",
);
const remoteTruthPreflightIndex = moduleText.indexOf(
  "await prepareImportedRemoteTruthIndexes(dataDir)",
);
const remoteTruthSerializerIndex = moduleText.indexOf(
  "return serializeImportedRemoteTruthV1(async () => {",
);
need(
  remoteTruthPreflightIndex >= 0 &&
    remoteTruthSerializerIndex > remoteTruthPreflightIndex,
  "cold remote-truth warm is still queued behind whole-import serialization",
);
need(
  moduleText.includes("function publicSubmitErrorV1("),
  "bounded participant submit error mapper missing",
);
need(
  moduleText.includes('error: "remote_truth_warming"'),
  "remote-truth warming does not use stable public code",
);
need(
  moduleText.includes('error: "remote_truth_history_invalid"'),
  "malformed remote truth does not use stable public code",
);
need(
  moduleText.includes('error: "remote_truth_unavailable"'),
  "internal remote-truth failures are not sanitized",
);
need(
  remoteTruthIndexText.includes("a.ctimeNs === b.ctimeNs"),
  "remote-truth stable generation omits ctime",
);
need(
  remoteTruthIndexText.includes("acquireRemoteTruthAuthorityV1"),
  "remote-truth cross-process authority missing",
);
const remoteTruthCatchUpStart = remoteTruthIndexText.indexOf(
  "async function catchUpStateV1(",
);
const remoteTruthExistingStart = remoteTruthIndexText.indexOf(
  "function existingResultV1(",
  remoteTruthCatchUpStart,
);
need(
  remoteTruthCatchUpStart >= 0 &&
    remoteTruthExistingStart > remoteTruthCatchUpStart,
  "remote-truth catch-up block missing",
);
const remoteTruthCatchUpBlock = remoteTruthIndexText.slice(
  remoteTruthCatchUpStart,
  remoteTruthExistingStart,
);
need(
  remoteTruthCatchUpBlock.includes(
    "reason=unwitnessed_growth",
  ),
  "remote-truth unwitnessed growth does not force background revalidation",
);
need(
  !remoteTruthCatchUpBlock.includes(
    '"incremental",\n      onMalformed',
  ),
  "remote-truth generic growth still authorizes suffix-only cached-prefix catch-up",
);
const exactOnceAppendStart = remoteTruthIndexText.indexOf(
  "export async function appendWcPublicRemoteTruthJsonlExactOnceV1(",
);
const authorityAcquireIndex = remoteTruthIndexText.indexOf(
  "await acquireRemoteTruthAuthorityV1(absolute)",
  exactOnceAppendStart,
);
const authorityCatchUpIndex = remoteTruthIndexText.indexOf(
  "await catchUpStateV1(state, options.onMalformed)",
  authorityAcquireIndex,
);
const authorityExistingIndex = remoteTruthIndexText.indexOf(
  "const existing = existingResultV1(state, value)",
  authorityCatchUpIndex,
);
const authorityAppendIndex = remoteTruthIndexText.indexOf(
  "appendAgentPick2JsonlCanonicalV1(absolute, line",
  authorityExistingIndex,
);
need(
  exactOnceAppendStart >= 0 &&
    authorityAcquireIndex > exactOnceAppendStart &&
    authorityCatchUpIndex > authorityAcquireIndex &&
    authorityExistingIndex > authorityCatchUpIndex &&
    authorityAppendIndex > authorityExistingIndex,
  "identity revalidation and append are not ordered under cross-process authority",
);

need(
  moduleText.includes(
    "process.env.VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID",
  ),
  "public claim server-selected dataset source missing",
);
need(
  moduleText.includes(
    "process.env.VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH",
  ),
  "public claim server-selected input hash source missing",
);
const publicClaimLegacyBypassStart = moduleText.indexOf(
  "export async function issuePublicTicketClaim(",
);
const publicClaimLegacyBypassEnd = moduleText.indexOf(
  "export function pilotResultSigningObject(",
  publicClaimLegacyBypassStart,
);
need(
  publicClaimLegacyBypassStart >= 0 &&
    publicClaimLegacyBypassEnd >
      publicClaimLegacyBypassStart &&
    !moduleText
      .slice(
        publicClaimLegacyBypassStart,
        publicClaimLegacyBypassEnd,
      )
      .includes("issueTicket("),
  "public claim re-enters legacy lifetime canary issuance path",
);
need(
  moduleText.includes("wcPublicClaimHistorySnapshotV1"),
  "public claim bounded history authority missing",
);
need(
  moduleText.includes("history.active_account"),
  "public claim active account authority missing",
);
need(
  moduleText.includes("history.active_executor"),
  "public claim active executor authority missing",
);
need(
  moduleText.includes("history.global_24h"),
  "public claim global daily authority missing",
);
need(
  moduleText.includes("history.account_24h"),
  "public claim account daily authority missing",
);
need(
  moduleText.includes("history.executor_24h"),
  "public claim executor daily authority missing",
);
need(
  moduleText.includes("history.last_account_at"),
  "public claim account cooldown authority missing",
);
need(
  moduleText.includes("history.last_executor_at"),
  "public claim executor cooldown authority missing",
);
need(
  moduleText.includes("publicClaimCooldownMs()"),
  "public claim cooldown missing",
);
need(
  moduleText.includes("publicClaimMaxPer24h()"),
  "public claim daily account/executor cap missing",
);
need(
  moduleText.includes("publicClaimGlobalMaxPer24h()"),
  "public claim global daily cap missing",
);
need(
  moduleText.includes("acquirePublicClaimIssuanceLockV1"),
  "public claim issuance cross-process authority missing",
);
need(
  moduleText.includes(
    "await acquirePublicClaimIssuanceLockV1(raw)",
  ),
  "public claim cap revalidation is not under issuance authority",
);
need(
  /await\s+releasePublicClaimIssuanceLockV1\(\s*issuanceLock,\s*\)/.test(
    moduleText,
  ),
  "public claim issuance authority is not released",
);
need(
  moduleText.includes(
    "setPublicClaimBeforeIssuanceLockHookForProofV1",
  ),
  "public claim concurrency proof hook missing",
);
need(
  moduleText.includes(
    'appendAuditBestEffort(\n    {\n      event:\n        issuanceSource === "public_claim"',
  ),
  "ticket issuance audit is not best effort",
);
const claimIssueStart = moduleText.indexOf(
  "export async function issuePublicTicketClaim(",
);
const claimIssueEnd = moduleText.indexOf(
  "export function pilotResultSigningObject(",
  claimIssueStart,
);
need(
  claimIssueStart >= 0 && claimIssueEnd > claimIssueStart,
  "public claim issuance block missing",
);
const claimIssueBlock = moduleText.slice(
  claimIssueStart,
  claimIssueEnd,
);
need(
  moduleText.includes(
    "VOID_WC_PUBLIC_CLAIM_CAPABILITY_SEAL_V1",
  ),
  "public claim recoverable capability seal missing",
);
need(
  moduleText.includes('"aes-256-gcm"'),
  "public claim capability seal is not authenticated encryption",
);
need(
  moduleText.includes(
    "recoverPublicClaimReplayV1(",
  ),
  "public claim exact replay recovery missing",
);
need(
  moduleText.includes(
    "verifyPublicTicketClaimSignatureV1(",
  ) &&
    moduleText.includes(
      "assertPublicTicketClaimFreshV1(",
    ),
  "claim signature validity is not separated from fresh-issuance time policy",
);
need(
  moduleText.includes(
    "await recoverPublicClaimReplayV1(",
  ),
  "claim recovery is not an async authority transaction",
);
need(
  moduleText.includes(
    "await acquirePilotTicketLock(\n      preparedRecord.ticket_id",
  ),
  "claim recovery does not share ticket single-use authority",
);
need(
  moduleText.includes(
    "public_claim_capability_consumed",
  ),
  "claim recovery consumed terminal missing",
);
need(
  moduleText.includes(
    "public_claim_recovery_capacity_conflict",
  ),
  "claim recovery fresh capacity conflict check missing",
);
const recoveryPolicyStart = moduleText.indexOf(
  "function assertPublicClaimRecoveryCapacityV1(",
);
const recoveryPolicyEnd = moduleText.indexOf(
  "function validatePreparedPublicClaimTicketV1(",
  recoveryPolicyStart,
);
need(
  recoveryPolicyStart >= 0 &&
    recoveryPolicyEnd > recoveryPolicyStart,
  "public claim recovery policy helper missing",
);
const recoveryPolicyBlock = moduleText.slice(
  recoveryPolicyStart,
  recoveryPolicyEnd,
);
need(
  recoveryPolicyBlock.includes(
    "if (ownActive === 0) {",
  ) &&
    recoveryPolicyBlock.includes(
      "assertPublicClaimHistoryEligibleV1(",
    ),
  "public claim recovery without an own live ticket does not revalidate full current policy",
);
const recoveryCapacityConflict =
  recoveryPolicyBlock.indexOf(
    "public_claim_recovery_capacity_conflict",
  );
const recoveryNoOwnTicketGate =
  recoveryPolicyBlock.indexOf(
    "if (ownActive === 0) {",
  );
const recoveryFullPolicy =
  recoveryPolicyBlock.indexOf(
    "assertPublicClaimHistoryEligibleV1(",
    recoveryNoOwnTicketGate,
  );
need(
  recoveryCapacityConflict >= 0 &&
    recoveryNoOwnTicketGate > recoveryCapacityConflict &&
    recoveryFullPolicy > recoveryNoOwnTicketGate,
  "public claim recovery active-conflict/full-policy ordering invalid",
);
need(
  moduleText.includes(
    "fsyncDirectoryV1(issuedDir(raw))",
  ),
  "claim recovery does not re-establish issued-directory durability",
);
need(
  moduleText.includes(
    "setPublicClaimRecoveryBeforeTicketLockHookForProofV1",
  ),
  "claim recovery-vs-consumption proof hook missing",
);
need(
  moduleText.includes(
    "public_claim_after_ticket_published",
  ) &&
    moduleText.includes(
      "public_claim_after_claim_issued_before_return",
    ),
  "public claim crash-boundary proof hooks missing",
);
need(
  claimIssueBlock.includes(
    "const existingClaim = readJsonStrict(",
  ),
  "public claim exact replay state is not read under issuance authority",
);
need(
  claimIssueBlock.includes(
    "recoverPublicClaimReplayV1(",
  ),
  "public claim replay does not converge through recovery",
);
need(
  claimIssueBlock.includes(
    "const history = wcPublicClaimHistorySnapshotV1(",
  ),
  "public claim history is not revalidated under issuance authority",
);
const existingClaimRead = claimIssueBlock.indexOf(
  "const existingClaim = readJsonStrict(",
);
const freshIssuanceGate = claimIssueBlock.indexOf(
  "assertPublicTicketClaimFreshV1(claim, now)",
  existingClaimRead,
);
need(
  existingClaimRead >= 0 &&
    freshIssuanceGate > existingClaimRead,
  "fresh timestamp gate still precedes recoverable journal lookup",
);
const replayRecovery = claimIssueBlock.indexOf(
  "recoverPublicClaimReplayV1(",
  existingClaimRead,
);
const issuanceHistoryRecheck = claimIssueBlock.indexOf(
  "const history = wcPublicClaimHistorySnapshotV1(",
  replayRecovery,
);
const claimReservationWrite = claimIssueBlock.indexOf(
  "atomicWriteJson(claimFile, reservation, raw)",
  issuanceHistoryRecheck,
);
const claimPublishingWrite = claimIssueBlock.indexOf(
  "atomicWriteJson(claimFile, publishing, raw)",
  claimReservationWrite,
);
const claimTicketPublish = claimIssueBlock.indexOf(
  "publishPreparedPublicClaimTicketV1(",
  claimPublishingWrite,
);
const claimTerminalWrite = claimIssueBlock.indexOf(
  "atomicWriteJson(claimFile, issuedState, raw)",
  claimTicketPublish,
);
need(
  existingClaimRead >= 0 &&
    replayRecovery > existingClaimRead &&
    issuanceHistoryRecheck > replayRecovery &&
    claimReservationWrite > issuanceHistoryRecheck &&
    claimPublishingWrite > claimReservationWrite &&
    claimTicketPublish > claimPublishingWrite &&
    claimTerminalWrite > claimTicketPublish,
  "claim recovery/history/reservation/publish/terminal ordering invalid",
);
need(
  moduleText.includes(
    "capability_token_seal_v1: seal",
  ) &&
    moduleText.includes(
      "ticket_record: prepared.record",
    ),
  "public claim recovery journal does not bind sealed token to prepared ticket",
);
need(
  claimIssueBlock.includes(
    'event: "public_claim_accepted"',
  ) &&
    claimIssueBlock.includes("appendAuditBestEffort("),
  "public claim terminal audit is not best effort",
);
need(
  !claimIssueBlock.includes("ticketCounts("),
  "public claim still scans ticket history synchronously",
);
need(
  !claimIssueBlock.includes("publicClaimUsage("),
  "public claim still scans claim history synchronously",
);

const publicStatusStart = moduleText.indexOf(
  "export function publicStatusForProofV1(",
);
const mountStart = moduleText.indexOf(
  "function mount(): void {",
  publicStatusStart,
);
need(
  publicStatusStart >= 0 && mountStart > publicStatusStart,
  "bounded public status block missing",
);
const publicStatusBlock = moduleText.slice(
  publicStatusStart,
  mountStart,
);
need(
  publicStatusBlock.includes(
    "wcPublicClaimHistorySnapshotV1",
  ),
  "public status bounded history authority missing",
);
need(
  !publicStatusBlock.includes("ticketCounts("),
  "public status still scans ticket history synchronously",
);
need(
  claimHistoryAuthorityText.includes("await fsp.readdir("),
  "claim history rebuild is not asynchronous",
);
need(
  claimHistoryAuthorityText.includes("setImmediate(resolve)"),
  "claim history rebuild does not yield event loop",
);
need(
  claimHistoryAuthorityText.includes(
    "VOID_WC_PUBLIC_CLAIM_HISTORY_INVALID",
  ),
  "malformed claim/ticket history does not fail closed",
);
need(
  claimHistoryAuthorityText.includes(
    "synchronous_history_files_read: 0",
  ),
  "claim history request-time zero-scan contract missing",
);
const pilotDurableDirStart = moduleText.indexOf(
  "function ensureDurableDirectoryV1(",
);
const pilotDurableDirEnd = moduleText.indexOf(
  "function ensureDirs(",
  pilotDurableDirStart,
);
need(
  pilotDurableDirStart >= 0 &&
    pilotDurableDirEnd > pilotDurableDirStart,
  "public-WC durable directory helper missing",
);
const pilotDurableDirBlock = moduleText.slice(
  pilotDurableDirStart,
  pilotDurableDirEnd,
);
need(
  pilotDurableDirBlock.includes(
    "ensureWcPublicStateDurableDirectoryV1(",
  ),
  "public-WC directory helper does not use shared authority",
);
need(
  moduleText.includes(
    "setWcPublicEarningPilotDirectoryParentFsyncHookForProofV1",
  ),
  "public-WC directory fsync proof hook missing",
);
const historyDurableDirStart =
  claimHistoryAuthorityText.indexOf(
    "function ensureDurableDirectoryV1(",
  );
const historyDurableDirEnd =
  claimHistoryAuthorityText.indexOf(
    "function ensureDirsV1(",
    historyDurableDirStart,
  );
need(
  historyDurableDirStart >= 0 &&
    historyDurableDirEnd > historyDurableDirStart,
  "claim-history durable directory helper missing",
);
const historyDurableDirBlock =
  claimHistoryAuthorityText.slice(
    historyDurableDirStart,
    historyDurableDirEnd,
  );
need(
  historyDurableDirBlock.includes(
    "ensureWcPublicStateDurableDirectoryV1(",
  ),
  "claim-history directory helper does not use shared authority",
);
need(
  claimHistoryAuthorityText.includes(
    "setWcPublicClaimHistoryDirectoryParentFsyncHookForProofV1",
  ),
  "claim-history directory fsync proof hook missing",
);
const sharedExactDirFsyncStart =
  publicStateDirectoryAuthorityText.indexOf(
    "function fsyncExactDirectoryLinkV1(",
  );
const sharedExactDirFsyncEnd =
  publicStateDirectoryAuthorityText.indexOf(
    "\nfunction cachedDirectoryIdentityV1(",
    sharedExactDirFsyncStart,
  );
need(
  sharedExactDirFsyncStart >= 0 &&
    sharedExactDirFsyncEnd > sharedExactDirFsyncStart,
  "shared public-state exact parent-generation fsync helper missing",
);
const sharedExactDirFsyncBlock =
  publicStateDirectoryAuthorityText.slice(
    sharedExactDirFsyncStart,
    sharedExactDirFsyncEnd,
  );
for (const marker of [
  'hook?.("before", parent, child)',
  "O_DIRECTORY",
  "O_NOFOLLOW",
  "fs.fstatSync(",
  "directoryIdentityAtParentFdV1(",
  "sameIdentityV1(expectedParent, openedParent)",
  "sameIdentityV1(expectedChild, linkedBefore)",
  "fs.fsyncSync(fd)",
  'hook?.("after", parent, child)',
  "sameIdentityV1(openedParent, openedParentAfter)",
  "sameIdentityV1(expectedChild, linkedAfter)",
  "sameIdentityV1(expectedParent, parentAfter)",
  "sameIdentityV1(expectedChild, childAfter)",
]) {
  need(
    sharedExactDirFsyncBlock.includes(marker),
    `shared public-state exact parent-generation fsync missing: ${marker}`,
  );
}
need(
  publicStateDirectoryAuthorityText.includes(
    '"/proc/self/fd"',
  ),
  "shared public-state descriptor-relative child identity missing",
);
const sharedDirExactTargetFsync =
  publicStateDirectoryAuthorityText.indexOf(
    "fsyncExactDirectoryLinkV1(\n    parent,\n    target,",
  );
const sharedDirCachePublish =
  publicStateDirectoryAuthorityText.indexOf(
    "durableDirectoryLinksV1.set(",
    sharedDirExactTargetFsync,
  );
need(
  sharedDirExactTargetFsync >= 0 &&
    sharedDirCachePublish > sharedDirExactTargetFsync,
  "shared public-state directory durability is not exact-parent-fsync-before-cache",
);
need(
  !publicStateDirectoryAuthorityText.includes(
    "fsyncDirectoryV1(",
  ),
  "pathname-only public-state directory fsync remains",
);
for (const marker of [
  "fs.lstatSync(dir",
  "stat.isSymbolicLink()",
  "wc_public_state_directory_not_authoritative",
  "wc_public_state_directory_not_private",
  "wc_public_state_directory_generation_changed",
]) {
  need(
    publicStateDirectoryAuthorityText.includes(marker),
    `shared public-state directory authority missing: ${marker}`,
  );
}
need(
  !claimHistoryAuthorityText.includes(
    "Number(record.version || 0)",
  ) &&
    !claimHistoryAuthorityText.includes(
      "Math.trunc(\n    Number(record.expires_at_ms || 0)",
    ) &&
    !claimHistoryAuthorityText.includes(
      "Math.trunc(\n    Number(record.issued_at_ms || 0)",
    ),
  "claim history numeric schema still uses coercive parsing",
);
need(
  claimHistoryAuthorityText.includes(
    "record.version !== 1",
  ) &&
    claimHistoryAuthorityText.includes(
      'typeof expiresAt !== "number"',
    ) &&
    claimHistoryAuthorityText.includes(
      "Number.isSafeInteger(expiresAt)",
    ) &&
    claimHistoryAuthorityText.includes(
      'typeof issuedAt !== "number"',
    ) &&
    claimHistoryAuthorityText.includes(
      "Number.isSafeInteger(issuedAt)",
    ),
  "claim history exact numeric schema contract missing",
);
need(
  !claimHistoryAuthorityText.includes(
    'String(raw || "").trim()',
  ) &&
    claimHistoryAuthorityText.includes(
      'typeof raw === "string" ? raw.trim() : ""',
    ),
  "claim history identity helpers still coerce non-string JSON values",
);
need(
  claimHistoryAuthorityText.includes(
    'record.marker !==\n      "VOID_WC_PUBLIC_EARNING_PILOT_V1"',
  ) &&
    claimHistoryAuthorityText.includes(
      'record.status !== expectedStatus',
    ) &&
    claimHistoryAuthorityText.includes(
      'typeof record.status === "string"',
    ) &&
    claimHistoryAuthorityText.includes(
      'record.marker !==\n      "VOID_WC_PUBLIC_TICKET_CLAIM_V1"',
    ),
  "claim history marker/status exact string schema contract missing",
);
need(
  claimHistoryAuthorityText.includes(
    "record_generations: Map<string, RecordStampV1>",
  ),
  "claim history record-generation manifest missing",
);
need(
  /state\.issued_tickets\.delete\(\s*ticket\.ticket_id\s*\)/.test(
    claimHistoryAuthorityText,
  ),
  "claim history does not let consumed truth dominate same-ticket issued residue",
);
need(
  claimHistoryAuthorityText.includes(
    "setWcPublicClaimHistoryBeforeRecordOpenHookForProofV1",
  ) &&
    claimHistoryAuthorityText.includes(
      'String(error?.code || "") === "ENOENT"',
    ) &&
    claimHistoryAuthorityText.includes(
      "`${label}_generation_changed`",
    ),
  "claim history readdir-to-open removal is not retried as generation churn",
);
need(
  claimHistoryAuthorityText.includes(
    "watch_generation: number",
  ),
  "claim history watch generation missing",
);
need(
  claimHistoryAuthorityText.includes(
    "fs.watch(",
  ),
  "claim history in-place mutation watcher missing",
);
need(
  claimHistoryAuthorityText.includes(
    "revalidateRecordGenerationsV1",
  ),
  "claim history warm does not revalidate record generations",
);
need(
  claimHistoryAuthorityText.includes(
    "fs.constants.O_NOFOLLOW",
  ),
  "claim history record open does not reject symlink substitution",
);
need(
  claimHistoryAuthorityText.includes(
    "sameRecordStampV1(",
  ) &&
    claimHistoryAuthorityText.includes(
      "_generation_changed",
    ),
  "claim history stat/read generation binding missing",
);
need(
  /if\s*\(\s*status\s*===\s*"publishing"\s*\)\s*\{\s*const\s+issuedState\s*=\s*\{/.test(
    moduleText,
  ),
  "claim replay terminal rewrite is not recovery-only",
);
const publicClaimRecoveryStart = moduleText.indexOf(
  "async function recoverPublicClaimReplayV1(",
);
const publicClaimRecoveryEnd = moduleText.indexOf(
  "export async function issuePublicTicketClaim(",
  publicClaimRecoveryStart,
);
need(
  publicClaimRecoveryStart >= 0 &&
    publicClaimRecoveryEnd > publicClaimRecoveryStart,
  "public claim recovery block missing",
);
const publicClaimRecoveryBlock = moduleText.slice(
  publicClaimRecoveryStart,
  publicClaimRecoveryEnd,
);
const recoveryPublishingGate =
  publicClaimRecoveryBlock.indexOf(
    'if (status === "publishing") {',
  );
const recoveryIssuedState =
  publicClaimRecoveryBlock.indexOf(
    "const issuedState = {",
  );
const recoveryClaimTerminalWrite =
  publicClaimRecoveryBlock.indexOf(
    "atomicWriteJson(\n        path.join(claimsDir(raw), `${claimId}.json`),\n        issuedState,",
  );
need(
  recoveryPublishingGate >= 0 &&
    recoveryIssuedState > recoveryPublishingGate &&
    recoveryClaimTerminalWrite > recoveryIssuedState &&
    publicClaimRecoveryBlock.indexOf(
      "const issuedState = {",
      recoveryIssuedState + 1,
    ) === -1,
  "issued claim exact replay read-only contract missing",
);
need(
  moduleText.includes("claim_nonce_sha256"),
  "public claim nonce is not persisted as a hash",
);
need(
  moduleText.includes("claim_signature_sha256"),
  "public claim signature evidence hash missing",
);
need(
  !moduleText.includes("participant_selected_dataset: true"),
  "participant-selected public claim dataset enabled",
);
need(
  !moduleText.includes("participant_selected_input_hash: true"),
  "participant-selected public claim input hash enabled",
);

need(!moduleText.includes("req?.body?.delta"), "participant-selected delta accepted");
need(!moduleText.includes("req.body.delta"), "participant-selected delta accepted");
need(!moduleText.includes("req?.body?.wc_award"), "participant-selected award accepted");
need(!moduleText.includes('app.post("/wc/credit"'), "generic credit route introduced");
need(!moduleText.includes("catch {"), "new module contains empty catch");

need(
  acceptanceText.includes(
    "VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC = 3",
  ),
  "canonical fixed award changed",
);
need(
  acceptanceText.includes('duplicate_guard: ["receipt_id", "job_id"]'),
  "canonical exact-once duplicate guard missing",
);
need(
  acceptanceText.includes("persisted_receipt_verified: true"),
  "canonical persisted receipt verification missing",
);
need(
  acceptanceText.includes("persisted_job_verified: true"),
  "canonical persisted job verification missing",
);
need(
  acceptanceText.includes("persisted_completion_verified: true"),
  "canonical persisted completion verification missing",
);

const signIndex = moduleText.indexOf("const envelope = verifyPilotResultEnvelope(");
const healthIndex = moduleText.indexOf("`${record.executor_http_base}/health`");
const jobIndex = moduleText.indexOf("`${record.executor_http_base}/jobs/");
const receiptIndex = moduleText.indexOf("`${record.executor_http_base}/receipts`");
const importIndex = moduleText.indexOf(
  "const imported = await persistImportedRemoteTruthOnce(",
);
const acceptanceIndex = moduleText.indexOf("const acceptance = await acceptVerifiedReceiptOnce");

need(signIndex >= 0, "signature verification anchor missing");
need(healthIndex > signIndex, "remote health must follow signature verification");
need(jobIndex > healthIndex, "remote job verification must follow health");
need(receiptIndex > jobIndex, "remote receipt verification must follow job");
need(importIndex > receiptIndex, "remote truth import must follow verification");
need(acceptanceIndex > importIndex, "canonical acceptance must follow import");

const historyDecisionStart =
  claimHistoryAuthorityText.indexOf(
    "export async function prepareWcPublicClaimHistoryDecisionV1(",
  );
const historyReadyStateStart =
  claimHistoryAuthorityText.indexOf(
    "function readyStateV1(",
    historyDecisionStart,
  );
need(
  historyDecisionStart >= 0 &&
    historyReadyStateStart > historyDecisionStart,
  "claim history decision gate missing",
);
const historyDecisionBlock =
  claimHistoryAuthorityText.slice(
    historyDecisionStart,
    historyReadyStateStart,
  );
need(
  historyDecisionBlock.includes(
    "await readHistoryMutationGenerationV1(raw)",
  ) &&
    !historyDecisionBlock.includes(
      "revalidateRecordGenerationsV1(state)",
    ) &&
    historyDecisionBlock.includes(
      "mutation_generation_reads_total += 1",
    ),
  "claim history hot decision still performs retained-record generation traversal",
);
need(
  claimHistoryAuthorityText.includes(
    "publishWcPublicClaimHistoryMutationForFileV1",
  ) &&
    moduleText.includes(
      "publishWcPublicClaimHistoryMutationForFileV1(file);",
    ),
  "canonical history mutations do not advance the durable O(1) witness",
);
const atomicHistoryMutationWitness =
  moduleText.indexOf(
    "publishWcPublicClaimHistoryMutationForFileV1(file);",
  );
const atomicHistoryRename =
  moduleText.indexOf(
    "fs.renameSync(tmp, file);",
    atomicHistoryMutationWitness,
  );
need(
  atomicHistoryMutationWitness >= 0 &&
    atomicHistoryRename > atomicHistoryMutationWitness,
  "history mutation witness is not published before canonical pathname replacement",
);
need(
  claimHistoryAuthorityText.includes(
    "await handle.chmod(0o400)",
  ),
  "warm history projections are not sealed against ordinary in-place mutation",
);
need(
  claimHistoryAuthorityText.includes(
    "suppressWcPublicClaimHistoryWatchForProofV1",
  ),
  "watch-suppression authority proof hook missing",
);
const historyDecisionRawGates = (
  moduleText.match(
    /await prepareWcPublicClaimHistoryDecisionV1\(raw\);/g,
  ) || []
).length;
need(
  historyDecisionRawGates >= 3 &&
    moduleText.includes(
      "await prepareWcPublicClaimHistoryDecisionV1();",
    ),
  "participant claim/status paths do not revalidate history generations before decisions",
);

need(
  moduleText.includes(
    "VOID_WC_PUBLIC_DATASET_POSSESSION_HMAC_V1",
  ) &&
    moduleText.includes(
      "readPublicWorkReferenceBytesV1(record)",
    ) &&
    moduleText.includes(
      "public_work_reference_hash_mismatch",
    ) &&
    moduleText.includes(
      "publicWorkPossessionProofV1(",
    ),
  "independent public-work possession verifier missing",
);
const usefulSubmitStart = moduleText.indexOf(
  "export async function submitRemoteResult(",
);
const usefulEvidenceIndex = moduleText.indexOf(
  "const evidence = await verifyPilotSubmissionEvidence(",
  usefulSubmitStart,
);
const usefulIndependentIndex = moduleText.indexOf(
  "await verifyIndependentPublicWorkV1(",
  usefulEvidenceIndex,
);
const usefulIntentIndex = moduleText.indexOf(
  '"prepared"',
  usefulIndependentIndex,
);
const usefulImportIndex = moduleText.indexOf(
  "const imported = await persistImportedRemoteTruthOnce(",
  usefulIndependentIndex,
);
need(
  usefulSubmitStart >= 0 &&
    usefulEvidenceIndex > usefulSubmitStart &&
    usefulIndependentIndex > usefulEvidenceIndex &&
    usefulIntentIndex > usefulIndependentIndex &&
    usefulImportIndex > usefulIntentIndex,
  "independent useful-work verification is not acceptance-critical before intent/import",
);
need(
  moduleText.includes(
    "independent_useful_work_verified:\n        independentWork.verified",
  ) &&
    moduleText.includes(
      '"capability_hmac_over_verified_dataset_bytes_v1"',
    ),
  "independent useful-work participant terminal evidence missing",
);
need(
  noNodeClientText.includes(
    "VOID_WC_PUBLIC_DATASET_POSSESSION_HMAC_V1",
  ) &&
    noNodeClientText.includes(
      ".createHmac(",
    ) &&
    noNodeClientText.includes(
      "dataset.content",
    ) &&
    !noNodeClientText.includes(
      'const outputHash = sha256(Buffer.from(JSON.stringify(output), "utf8"));',
    ),
  "supported no-node client does not prove possession from fetched dataset bytes",
);

need(
  claimHistoryAuthorityText.includes(
    "HISTORY_MUTATION_GENERATION_BYTES_V1 = 65",
  ) &&
    claimHistoryAuthorityText.includes(
      "setWcPublicClaimHistoryMutationGenerationReadHookForProofV1",
    ) &&
    claimHistoryAuthorityText.includes(
      "await fsp.lstat(",
    ),
  "claim-history mutation-generation bounded reader contract missing",
);
const mutationGenerationReaderStart =
  claimHistoryAuthorityText.indexOf(
    "async function readHistoryMutationGenerationV1(",
  );
const mutationGenerationReaderEnd =
  claimHistoryAuthorityText.indexOf(
    "function historyRootForRecordFileV1(",
    mutationGenerationReaderStart,
  );
const mutationGenerationReaderBlock =
  claimHistoryAuthorityText.slice(
    mutationGenerationReaderStart,
    mutationGenerationReaderEnd,
  );
need(
  mutationGenerationReaderStart >= 0 &&
    mutationGenerationReaderEnd >
      mutationGenerationReaderStart &&
    mutationGenerationReaderBlock.includes(
      "fs.constants.O_NOFOLLOW",
    ) &&
    mutationGenerationReaderBlock.includes(
      "!beforeStat.isFile()",
    ) &&
    mutationGenerationReaderBlock.includes(
      "await handle.read(",
    ) &&
    mutationGenerationReaderBlock.includes(
      "sameRecordStampV1(before, after)",
    ) &&
    mutationGenerationReaderBlock.includes(
      "sameRecordStampV1(after, pathAfter)",
    ) &&
    !mutationGenerationReaderBlock.includes(
      "fsp.readFile(",
    ),
  "claim-history mutation-generation reader is not descriptor/path generation bound",
);

const publicWorkReadStart = moduleText.indexOf(
  "async function readPublicWorkReferenceBytesV1(",
);
const publicWorkReadEnd = moduleText.indexOf(
  "export function publicWorkPossessionProofV1(",
  publicWorkReadStart,
);
need(
  publicWorkReadStart >= 0 &&
    publicWorkReadEnd > publicWorkReadStart,
  "public-work reference reader missing",
);
const publicWorkReadBlock = moduleText.slice(
  publicWorkReadStart,
  publicWorkReadEnd,
);
need(
  publicWorkReadBlock.includes("Buffer.alloc(size + 1)") &&
    publicWorkReadBlock.includes("await handle.read(") &&
    publicWorkReadBlock.includes(
      "publicWorkReferenceBytesReadTotalForProofV1",
    ) &&
    !publicWorkReadBlock.includes("handle.readFile("),
  "public-work reference ceiling is not enforced during descriptor read",
);

const claimVerifierSchemaStart = moduleText.indexOf(
  "function verifyPublicTicketClaimSignatureV1(",
);
const claimVerifierSchemaEnd = moduleText.indexOf(
  "function assertPublicTicketClaimFreshV1(",
  claimVerifierSchemaStart,
);
need(
  claimVerifierSchemaStart >= 0 &&
    claimVerifierSchemaEnd > claimVerifierSchemaStart,
  "claim signature verifier block missing",
);
const claimVerifierSchemaBlock = moduleText.slice(
  claimVerifierSchemaStart,
  claimVerifierSchemaEnd,
);
const claimRawSchemaGate =
  claimVerifierSchemaBlock.indexOf(
    "assertExactPublicTicketClaimRawSchemaV1(",
  );
const claimSignatureSchemaGate =
  claimVerifierSchemaBlock.indexOf(
    "assertExactPublicTicketClaimSignatureSchemaV1(",
  );
const claimCanonicalize =
  claimVerifierSchemaBlock.indexOf(
    "const claim = publicTicketClaimSigningObject(claimRaw)",
  );
need(
  claimRawSchemaGate >= 0 &&
    claimSignatureSchemaGate > claimRawSchemaGate &&
    claimCanonicalize > claimSignatureSchemaGate,
  "signed claim raw/signature schema gates do not precede canonicalization",
);
need(
  moduleText.includes(
    'typeof raw.claim_ts_ms !== "number"',
  ) &&
    moduleText.includes(
      "!Number.isSafeInteger(raw.claim_ts_ms)",
    ) &&
    moduleText.includes(
      'typeof raw[field] !== "string"',
    ) &&
    moduleText.includes(
      'throw new Error("invalid_claim_request_schema")',
    ) &&
    moduleText.includes(
      'throw new Error("invalid_claim_signature_schema")',
    ),
  "signed claim exact raw JSON schema contract missing",
);

const resultVerifierSchemaStart = moduleText.indexOf(
  "export function verifyPilotResultEnvelope(",
);
const resultVerifierSchemaEnd = moduleText.indexOf(
  "async function cancelReadableBestEffortV1(",
  resultVerifierSchemaStart,
);
need(
  resultVerifierSchemaStart >= 0 &&
    resultVerifierSchemaEnd >
      resultVerifierSchemaStart,
  "result signature verifier block missing",
);
const resultVerifierSchemaBlock = moduleText.slice(
  resultVerifierSchemaStart,
  resultVerifierSchemaEnd,
);
const resultRawSchemaGate =
  resultVerifierSchemaBlock.indexOf(
    "assertExactPilotResultRawSchemaV1(raw)",
  );
const resultSignatureSchemaGate =
  resultVerifierSchemaBlock.indexOf(
    "assertExactPilotResultSignatureSchemaV1(",
  );
const resultCanonicalize =
  resultVerifierSchemaBlock.indexOf(
    "const envelope = pilotResultSigningObject(raw)",
  );
need(
  resultRawSchemaGate >= 0 &&
    resultSignatureSchemaGate >
      resultRawSchemaGate &&
    resultCanonicalize >
      resultSignatureSchemaGate,
  "signed result raw/signature schema gates do not precede canonicalization",
);
need(
  moduleText.includes(
    'typeof raw.receipt_ts_ms !== "number"',
  ) &&
    moduleText.includes(
      "!Number.isSafeInteger(raw.receipt_ts_ms)",
    ) &&
    moduleText.includes(
      'throw new Error("invalid_result_envelope_schema")',
    ) &&
    moduleText.includes(
      'throw new Error("invalid_result_signature_schema")',
    ),
  "signed result exact raw JSON schema contract missing",
);

const strictStateReadStart = moduleText.indexOf(
  "function readJsonStrict(",
);
const strictStateReadEnd = moduleText.indexOf(
  "function ticketFile(",
  strictStateReadStart,
);
need(
  strictStateReadStart >= 0 &&
    strictStateReadEnd > strictStateReadStart,
  "bounded direct-state reader missing",
);
const strictStateReadBlock = moduleText.slice(
  strictStateReadStart,
  strictStateReadEnd,
);
need(
  strictStateReadBlock.includes(
    "VOID_WC_PUBLIC_STATE_MAX_JSON_BYTES_V1",
  ) &&
    strictStateReadBlock.includes("fs.lstatSync(") &&
    strictStateReadBlock.includes(
      "fs.constants.O_NOFOLLOW",
    ) &&
    strictStateReadBlock.includes("fs.fstatSync(") &&
    strictStateReadBlock.includes("fs.readSync(") &&
    strictStateReadBlock.includes(
      "samePublicStateRecordStampV1(",
    ) &&
    strictStateReadBlock.includes(
      "publicStateRecordBytesReadTotalForProofV1",
    ) &&
    !strictStateReadBlock.includes("fs.existsSync(") &&
    !strictStateReadBlock.includes("fs.readFileSync("),
  "participant-critical direct state is not bounded/no-follow/generation-bound",
);
need(
  moduleText.includes(
    "readWcPublicStateJsonStrictForProofV1",
  ) &&
    moduleText.includes(
      "setWcPublicStateRecordReadHookForProofV1",
    ),
  "direct-state adversarial proof hooks missing",
);
for (const directStateLabel of [
  '"public_claim"',
  '"public_claim_recovery_own_ticket"',
  '"public_claim_issued_ticket"',
  '"public_claim_consumed_ticket"',
  '"pilot_result_transaction"',
  '"consumed_ticket"',
  '"issued_ticket"',
]) {
  need(
    moduleText.includes(directStateLabel),
    `participant-critical direct-state label missing: ${directStateLabel}`,
  );
}
need(
  /function\s+readPilotResultTransactionV1\([\s\S]{0,700}?readJsonStrict\([\s\S]{0,400}?resultTransactionFile\(\s*ticketId,\s*raw\s*\)[\s\S]{0,250}?"pilot_result_transaction"/.test(
    moduleText,
  ),
  "result transaction does not use strict state reader",
);

console.log("VOID_WC_PUBLIC_EARNING_PILOT_V1_GREEN");
