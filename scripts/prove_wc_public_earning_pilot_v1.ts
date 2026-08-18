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
const remoteTruthIndexText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_public_remote_truth_jsonl_index_v1.ts"),
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
need(
  lockText.includes("await fsp.link(temp, file)"),
  "lock generation is published before complete durable content",
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
  moduleText.includes("receiptTsMs !== envelope.receipt_ts_ms"),
  "persisted remote receipt timestamp is not envelope-bound",
);
need(
  moduleText.includes("const receiptTs = Math.trunc(Number(receipt.ts_ms || 0))"),
  "local executor receipt timestamp is not persisted-truth-only",
);
need(
  !moduleText.includes("Number(receipt.ts_ms || Date.now())"),
  "local executor still synthesizes a receipt timestamp",
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
need(
  moduleText.includes("enforceLegacyCaps: false"),
  "public claim does not bypass legacy lifetime canary cap",
);
need(
  moduleText.includes("counts.activeAccountCounts[claim.account]"),
  "public claim active account cap missing",
);
need(
  moduleText.includes(
    "counts.activeExecutorCounts[claim.executor_node_id]",
  ),
  "public claim active executor cap missing",
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

console.log("VOID_WC_PUBLIC_EARNING_PILOT_V1_GREEN");
