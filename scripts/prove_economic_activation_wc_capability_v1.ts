import fs from "node:fs";
import path from "node:path";

const fail = (message: string): never => {
  throw new Error(`VOID_ECONOMIC_ACTIVATION_WC_CAPABILITY_V1_FAIL: ${message}`);
};

const need = (condition: unknown, message: string): void => {
  if (!condition) fail(message);
};

const root = process.cwd();
const indexText = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const moduleText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_public_capability_v1.ts"),
  "utf8",
);
const acceptanceText = fs.readFileSync(
  path.join(root, "src", "economic", "wc_verified_receipt_acceptance_v1.ts"),
  "utf8",
);
const recoveryText = fs.readFileSync(
  path.join(root, "scripts", "recover_wc_capability_failed_receipt_v1.ts"),
  "utf8",
);
const containmentText = fs.readFileSync(
  path.join(root, "scripts", "prove_wc_mutation_containment_v1.ts"),
  "utf8",
);
const canaryProofText = fs.readFileSync(
  path.join(root, "scripts", "prove_wc_production_canary_v1.ts"),
  "utf8",
);

need(
  indexText.includes('import "./economic/wc_public_capability_v1.js"; // VOID_WC_PUBLIC_CAPABILITY_V1'),
  "missing side-effect capability module import",
);
need(
  indexText.includes('"/__void/operator/wc-public-capability-v1/issue": "wcPublicCapabilityIssue"'),
  "missing operator issue containment rule",
);
need(
  containmentText.includes('"/__void/operator/wc-public-capability-v1/issue": "wcPublicCapabilityIssue"'),
  "containment proof missing operator issue rule",
);
need(
  !indexText.includes('"/wc/scan-receipts": "wcScanReceipts"'),
  "retired phantom scanner remains in mutation containment",
);
need(
  !containmentText.includes('"/wc/scan-receipts": "wcScanReceipts"'),
  "containment proof still claims retired scanner route",
);

need(
  indexText.includes('const runnerSubmitBase = `http://127.0.0.1:${port}`;'),
  "runner protected mutation base is not forced to loopback",
);
need(
  indexText.includes('/jobs/submit?dry=0&confirm=jobsSubmit'),
  "internal jobs submit lacks exact confirmation",
);
need(
  indexText.includes('&dry=0&confirm=jobsWorkerRunOnce'),
  "internal worker run-once lacks exact confirmation",
);
need(
  canaryProofText.includes('/jobs/submit?dry=0&confirm=jobsSubmit'),
  "canary proof does not track confirmed jobs submit",
);
need(
  canaryProofText.includes('&dry=0&confirm=jobsWorkerRunOnce'),
  "canary proof does not track confirmed worker run-once",
);

for (const marker of [
  "VOID_WC_PUBLIC_CAPABILITY_V1",
  'const TASK_CLASS = "datanet_fetch_verify"',
  'const OPERATOR_ISSUE_ROUTE = "/__void/operator/wc-public-capability-v1/issue"',
  'const PUBLIC_RUN_ROUTE = "/wc/public-capability-v1/run-once"',
  'const PUBLIC_STATUS_ROUTE = "/wc/public-capability-v1/status"',
  'import { acceptVerifiedReceiptOnce } from "./wc_verified_receipt_acceptance_v1.js"',
  "token_sha256: sha256Hex(token)",
  "fs.renameSync(issuedPath, consumedPath)",
  "capability_account_mismatch",
  "capability_task_mismatch",
  "capability_expired",
  "capability_already_used",
  "runner_loop_not_disabled",
  "runner_already_enabled",
  "runner_disable_failed",
  "/wc/runner/config?dry=0&confirm=wcRunnerConfig",
  "/wc/runner/set?dry=0&confirm=wcRunnerSet",
  "/wc/runner/tick?dry=0&confirm=wcRunnerTick",
  "const acceptance = await acceptVerifiedReceiptOnce",
  "verified_receipt_acceptance_failed",
  "canonical_wc_delta_mismatch",
  'receipt_acceptance: "in_process_verified_receipt_acceptance_v1"',
  "participant_selected_award: false",
  "generic_credit_route: false",
  "wc_to_void: false",
  "wallet_send: false",
  "buy_void_fulfillment: false",
  "money_movement: false",
]) {
  need(moduleText.includes(marker), `missing capability marker: ${marker}`);
}

need(!moduleText.includes("/wc/scan-receipts"), "capability still calls retired scanner route");
need(!moduleText.includes("req?.body?.wc_award"), "participant-selected wc_award is accepted");
need(!moduleText.includes("req?.body?.delta"), "participant-selected delta is accepted");
need(!moduleText.includes('app.post("/wc/credit"'), "generic WC credit route was introduced");

for (const marker of [
  "VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_V1",
  'VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK =\n  "datanet_fetch_verify"',
  "VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC = 3",
  'reason: "verified_receipt_acceptance_v1"',
  'source: "wc_verified_receipt_acceptance_v1"',
  "server_controlled_award: true",
  'duplicate_guard: ["receipt_id", "job_id"]',
  "persistedReceiptById",
  "persistedCompletedState",
  "persistedJob",
  "verified_input_hash_mismatch",
  "duplicate_credit_conflict",
  "ambiguous_malformed_ledger_line",
  "historical_malformed_ledger_lines",
  "acceptVerifiedReceiptOnce",
  "recoverFailedCapabilityReceiptOnce",
  '"wcCapabilityFailedReceiptRecovery"',
]) {
  need(acceptanceText.includes(marker), `missing acceptance marker: ${marker}`);
}

need(!acceptanceText.includes("wc_award ||"), "acceptance trusts a receipt-supplied award");
need(!acceptanceText.includes("options.award"), "acceptance exposes a caller-selected award");
need(
  recoveryText.includes("recoverFailedCapabilityReceiptOnce"),
  "recovery CLI does not use the verified acceptance module",
);
need(
  recoveryText.includes('apply: process.argv.includes("--apply")'),
  "recovery CLI does not default to dry mode",
);
need(
  recoveryText.includes("VOID_WC_CAPABILITY_FAILED_RECEIPT_RECOVERY_V1_DRY_GREEN"),
  "recovery CLI lacks dry marker",
);

const issuedRecordStart = moduleText.indexOf("  const record = {");
const issuedRecordEnd = moduleText.indexOf("\n  };", issuedRecordStart);
need(issuedRecordStart >= 0 && issuedRecordEnd > issuedRecordStart, "cannot isolate issued record");
const issuedRecord = moduleText.slice(issuedRecordStart, issuedRecordEnd);
need(issuedRecord.includes("token_sha256"), "issued record lacks token hash");
need(!issuedRecord.includes("capability_token"), "raw capability token is persisted");

const runnerPreflightIndex = moduleText.indexOf("/wc/runner/status?account=${encodedAccount}");
const consumeIndex = moduleText.indexOf("fs.renameSync(issuedPath, consumedPath)");
const configIndex = moduleText.indexOf("/wc/runner/config?dry=0&confirm=wcRunnerConfig");
const tickIndex = moduleText.indexOf("/wc/runner/tick?dry=0&confirm=wcRunnerTick");
const acceptanceIndex = moduleText.indexOf("const acceptance = await acceptVerifiedReceiptOnce");
need(
  runnerPreflightIndex >= 0 && consumeIndex > runnerPreflightIndex,
  "runner safety preflight must happen before ticket consumption",
);
need(consumeIndex >= 0 && configIndex > consumeIndex, "ticket is not consumed before execution");
need(tickIndex > configIndex, "protected work tick must follow configuration");
need(acceptanceIndex > tickIndex, "receipt acceptance must follow verified work execution");

const runnerSetConfirmedCount =
  moduleText.split("/wc/runner/set?dry=0&confirm=wcRunnerSet").length - 1;
need(
  runnerSetConfirmedCount === 2,
  `expected confirmed runner enable and disable calls, found ${runnerSetConfirmedCount}`,
);
need(
  moduleText.includes("runner_disabled: disableResult?.enabled === false"),
  "success response does not prove runner cleanup",
);
need(
  moduleText.includes("runner_disabled: !runnerEnabledByCapability"),
  "failure response does not report cleanup state",
);

console.log("VOID_ECONOMIC_ACTIVATION_WC_CAPABILITY_V1_GREEN");
