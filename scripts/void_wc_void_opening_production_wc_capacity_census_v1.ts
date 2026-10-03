#!/usr/bin/env node
import fs from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { parseArgs } from "node:util";

import {
  AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_MARKER,
  validateAgentPaidWorkWcEarningAdapterReceiptV1,
} from "../src/economic/agent_paid_work_wc_earning_adapter_v1.js";

import {
  readCanonicalWcState,
  VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC,
  VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK,
} from "../src/economic/wc_verified_receipt_acceptance_v1.js";

export const VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1 =
  "VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1";

const RECEIPT_BASENAME = "adapter-execution-receipt-v1.json";
const WC_QUANTA_PER_WC = 1_000_000_000n;
const AWARD_QUANTA =
  BigInt(VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC) * WC_QUANTA_PER_WC;
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
const MAX_LEDGER_BYTES = 256 * 1024 * 1024;
const MAX_FILES_VISITED = 100_000;
const MAX_SCAN_DEPTH = 16;
const SAFE_ACCOUNT = /^[A-Za-z0-9._:@-]{3,128}$/u;
const FORBIDDEN_COMPONENT =
  /(?:^|[\\/])(?:credential|credentials|wallet|wallets|keystore|private[-_]?key|nodekey|token|tokens)(?:[\\/]|$)/iu;

type Json = Record<string, any>;

type AdapterReceiptSummary = Readonly<{
  adapter_receipt_id: string;
  account: string;
  job_id: string;
  receipt_id: string;
}>;

function fail(message: string): never {
  throw new Error(message);
}


function directRegularFile(file: string, maxBytes: number): Buffer {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("direct_regular_file_required");
  if (stat.size < 1 || stat.size > maxBytes) fail("file_size_out_of_range");
  return fs.readFileSync(file);
}

function exactText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function adapterKey(account: string, jobId: string, receiptId: string): string {
  return JSON.stringify([account, jobId, receiptId]);
}

function canonicalLedgerCredit(row: Json, summary: AdapterReceiptSummary): boolean {
  const reward = row?.reward_meta;
  return (
    row?.kind === "credit" &&
    row?.account === summary.account &&
    row?.delta === VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC &&
    row?.reason === "verified_receipt_acceptance_v1" &&
    row?.receipt_kind === VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_TASK &&
    row?.receipt_id === summary.receipt_id &&
    row?.job_id === summary.job_id &&
    reward &&
    typeof reward === "object" &&
    !Array.isArray(reward) &&
    reward.source === "wc_verified_receipt_acceptance_v1" &&
    reward.policy === "useful_verifiable_only" &&
    reward.server_controlled_award === true &&
    reward.fixed_award_wc === VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC &&
    reward.persisted_receipt_verified === true &&
    reward.persisted_job_verified === true &&
    reward.persisted_completion_verified === true &&
    reward.verified_input_hash_match === true
  );
}

function quantaToExact(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / WC_QUANTA_PER_WC;
  const fraction = (absolute % WC_QUANTA_PER_WC)
    .toString()
    .padStart(9, "0")
    .replace(/0+$/u, "");
  return (negative ? "-" : "") + whole.toString() + (fraction ? "." + fraction : "");
}

function bpsCeil(numerator: bigint, denominator: bigint): string | null {
  if (numerator < 0n || denominator <= 0n) return null;
  return ((numerator * 10_000n + denominator - 1n) / denominator).toString();
}

function canonicalReceiptSummary(value: unknown): AdapterReceiptSummary {
  validateAgentPaidWorkWcEarningAdapterReceiptV1(value);
  const receipt = value as Json;
  if (receipt.marker !== AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_MARKER) {
    fail("adapter_receipt_marker_mismatch");
  }
  const account = exactText(receipt?.participant?.account);
  const bindingAccount = exactText(receipt?.binding?.destination_wc_account);
  const jobId = exactText(receipt?.participant?.job_id);
  const receiptId = exactText(receipt?.participant?.receipt_id);
  if (
    !SAFE_ACCOUNT.test(account) ||
    bindingAccount !== account ||
    !jobId ||
    !receiptId ||
    receipt?.submission?.capability_id !== "datanet.fetch_verify" ||
    receipt?.wc?.delta !== VOID_WC_VERIFIED_RECEIPT_ACCEPTANCE_AWARD_WC ||
    receipt?.wc?.credited !== true ||
    receipt?.wc?.duplicate !== false ||
    receipt?.wc?.canonical_redeemable !== true
  ) {
    fail("adapter_receipt_cross_binding_invalid");
  }
  return Object.freeze({
    adapter_receipt_id: exactText(receipt.adapter_receipt_id),
    account,
    job_id: jobId,
    receipt_id: receiptId,
  });
}

function scanReceiptFiles(roots: string[]): {
  summaries: Map<string, AdapterReceiptSummary>;
  files_seen: number;
  invalid_files: number;
  duplicate_copies: number;
  visited_files: number;
  unreadable_directories: number;
  depth_limited_directories: number;
} {
  const summaries = new Map<string, AdapterReceiptSummary>();
  let filesSeen = 0;
  let invalidFiles = 0;
  let duplicateCopies = 0;
  let visitedFiles = 0;
  let unreadableDirectories = 0;
  let depthLimitedDirectories = 0;

  const walk = (dir: string, depth: number): void => {
    if (depth > MAX_SCAN_DEPTH) {
      depthLimitedDirectories += 1;
      return;
    }
    if (FORBIDDEN_COMPONENT.test(dir)) return;
    let entries: Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      unreadableDirectories += 1;
      return;
    }
    for (const entry of entries) {
      const child = path.join(dir, entry.name);
      if (FORBIDDEN_COMPONENT.test(child)) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(child, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      visitedFiles += 1;
      if (visitedFiles > MAX_FILES_VISITED) fail("receipt_scan_file_limit_exceeded");
      if (entry.name !== RECEIPT_BASENAME) continue;
      filesSeen += 1;
      let summary: AdapterReceiptSummary;
      try {
        const bytes = directRegularFile(child, MAX_RECEIPT_BYTES);
        const parsed = JSON.parse(bytes.toString("utf8"));
        summary = canonicalReceiptSummary(parsed);
      } catch {
        invalidFiles += 1;
        continue;
      }
      const prior = summaries.get(summary.adapter_receipt_id);
      if (prior) {
        if (
          prior.account !== summary.account ||
          prior.job_id !== summary.job_id ||
          prior.receipt_id !== summary.receipt_id
        ) {
          fail("adapter_receipt_id_collision_or_drift");
        }
        duplicateCopies += 1;
      } else {
        summaries.set(summary.adapter_receipt_id, summary);
      }
    }
  };

  for (const root of roots) walk(root, 0);
  return {
    summaries,
    files_seen: filesSeen,
    invalid_files: invalidFiles,
    duplicate_copies: duplicateCopies,
    visited_files: visitedFiles,
    unreadable_directories: unreadableDirectories,
    depth_limited_directories: depthLimitedDirectories,
  };
}

async function scanLedger(
  ledger: string,
  targets: Map<string, AdapterReceiptSummary>,
): Promise<{
  malformed_lines: number;
  matching_rows: Map<string, number>;
  invalid_matching_rows: number;
}> {
  const stat = fs.lstatSync(ledger);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("ledger_direct_regular_file_required");
  if (stat.size < 1 || stat.size > MAX_LEDGER_BYTES) fail("ledger_size_out_of_range");

  const matchingRows = new Map<string, number>();
  const targetReceiptIds = new Set(
    [...targets.values()].map((summary) => summary.receipt_id),
  );
  const targetJobIds = new Set(
    [...targets.values()].map((summary) => summary.job_id),
  );
  let malformedLines = 0;
  let invalidMatchingRows = 0;
  const input = fs.createReadStream(ledger, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      let row: Json;
      try {
        row = JSON.parse(line);
      } catch {
        malformedLines += 1;
        continue;
      }
      const account = exactText(row?.account);
      const jobId = exactText(row?.job_id);
      const receiptId = exactText(row?.receipt_id);
      const intersectsTargetIdentity =
        (receiptId !== "" && targetReceiptIds.has(receiptId)) ||
        (jobId !== "" && targetJobIds.has(jobId));
      if (!intersectsTargetIdentity) continue;
      if (!account || !jobId || !receiptId) {
        invalidMatchingRows += 1;
        continue;
      }
      const key = adapterKey(account, jobId, receiptId);
      const target = targets.get(key);
      if (!target || !canonicalLedgerCredit(row, target)) {
        invalidMatchingRows += 1;
        continue;
      }
      matchingRows.set(key, (matchingRows.get(key) || 0) + 1);
    }
  } finally {
    lines.close();
    input.destroy();
  }
  return { malformed_lines: malformedLines, matching_rows: matchingRows, invalid_matching_rows: invalidMatchingRows };
}

async function main(): Promise<void> {
  const parsed = parseArgs({
    options: {
      "data-dir": { type: "string" },
      "receipt-root": { type: "string", multiple: true },
    },
    strict: true,
    allowPositionals: false,
  });
  const dataDirRaw = String(parsed.values["data-dir"] || "").trim();
  const rootArgs = (parsed.values["receipt-root"] || []) as string[];
  if (!path.isAbsolute(dataDirRaw)) fail("absolute_data_dir_required");
  if (rootArgs.length < 1 || rootArgs.length > 8) fail("receipt_root_count_invalid");

  const dataDir = fs.realpathSync(dataDirRaw);
  const dataStat = fs.lstatSync(dataDir);
  if (!dataStat.isDirectory() || dataStat.isSymbolicLink()) fail("data_dir_invalid");

  const roots = rootArgs.map((raw) => {
    if (!path.isAbsolute(raw)) fail("absolute_receipt_root_required");
    const root = fs.realpathSync(raw);
    const stat = fs.lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail("receipt_root_invalid");
    if (FORBIDDEN_COMPONENT.test(root)) fail("receipt_root_secret_class_forbidden");
    return root;
  });

  const receiptScan = scanReceiptFiles(roots);
  const byLedgerKey = new Map<string, AdapterReceiptSummary>();
  const byReceiptId = new Map<string, string>();
  const byJobId = new Map<string, string>();
  let adapterKeyConflicts = 0;
  let adapterDuplicateGuardConflicts = 0;
  for (const summary of receiptScan.summaries.values()) {
    const key = adapterKey(summary.account, summary.job_id, summary.receipt_id);
    const prior = byLedgerKey.get(key);
    if (prior && prior.adapter_receipt_id !== summary.adapter_receipt_id) {
      adapterKeyConflicts += 1;
    } else {
      byLedgerKey.set(key, summary);
    }

    const priorReceiptAdapter = byReceiptId.get(summary.receipt_id);
    if (
      priorReceiptAdapter !== undefined &&
      priorReceiptAdapter !== summary.adapter_receipt_id
    ) {
      adapterDuplicateGuardConflicts += 1;
    } else {
      byReceiptId.set(summary.receipt_id, summary.adapter_receipt_id);
    }

    const priorJobAdapter = byJobId.get(summary.job_id);
    if (
      priorJobAdapter !== undefined &&
      priorJobAdapter !== summary.adapter_receipt_id
    ) {
      adapterDuplicateGuardConflicts += 1;
    } else {
      byJobId.set(summary.job_id, summary.adapter_receipt_id);
    }
  }
  if (adapterKeyConflicts > 0) fail("adapter_receipt_ledger_key_conflict");
  if (adapterDuplicateGuardConflicts > 0) {
    fail("adapter_receipt_duplicate_guard_conflict");
  }

  const ledger = path.join(dataDir, "wc_v1", "ledger.jsonl");
  const redeemed = path.join(dataDir, "wc_v1", "redeemed.jsonl");
  if (!fs.existsSync(ledger)) fail("wc_ledger_missing");

  const ledgerScan = await scanLedger(ledger, byLedgerKey);
  const matched: AdapterReceiptSummary[] = [];
  let receiptsWithoutCredit = 0;
  let duplicateLedgerMatches = 0;
  for (const [key, summary] of byLedgerKey) {
    const count = ledgerScan.matching_rows.get(key) || 0;
    if (count === 1) matched.push(summary);
    else if (count === 0) receiptsWithoutCredit += 1;
    else duplicateLedgerMatches += 1;
  }
  if (ledgerScan.invalid_matching_rows > 0 || duplicateLedgerMatches > 0) {
    fail("matching_ledger_credit_conflict");
  }

  const grossByAccount = new Map<string, bigint>();
  for (const summary of matched) {
    grossByAccount.set(
      summary.account,
      (grossByAccount.get(summary.account) || 0n) + AWARD_QUANTA,
    );
  }

  let totalGross = 0n;
  let totalAllSourceRedeemable = 0n;
  let totalLower = 0n;
  let totalUpper = 0n;
  let largestGross = 0n;
  let largestLower = 0n;
  const accountBounds: Array<{ lower: bigint; upper: bigint }> = [];

  for (const [account, gross] of grossByAccount) {
    const state = await readCanonicalWcState(account, dataDir);
    const debited = BigInt(String(state.debited_quanta || "0"));
    const redeemedQuanta = BigInt(String(state.redeemed_quanta || "0"));
    const allSourceRedeemable = BigInt(String(state.redeemable_quanta || "0"));
    const outflows = debited + redeemedQuanta;
    const lower = gross > outflows ? gross - outflows : 0n;
    const upper = gross < allSourceRedeemable ? gross : allSourceRedeemable;
    if (lower > upper) fail("production_earned_capacity_bounds_invalid");

    totalGross += gross;
    totalAllSourceRedeemable += allSourceRedeemable;
    totalLower += lower;
    totalUpper += upper;
    if (gross > largestGross) largestGross = gross;
    if (lower > largestLower) largestLower = lower;
    accountBounds.push({ lower, upper });
  }

  let maxPossibleShareBps: string | null = null;
  for (const candidate of accountBounds) {
    const othersLower = totalLower - candidate.lower;
    const denominator = candidate.upper + othersLower;
    const share = bpsCeil(candidate.upper, denominator);
    if (share !== null && (maxPossibleShareBps === null || BigInt(share) > BigInt(maxPossibleShareBps))) {
      maxPossibleShareBps = share;
    }
  }

  const cleanScope =
    receiptScan.invalid_files === 0 &&
    receiptsWithoutCredit === 0 &&
    ledgerScan.invalid_matching_rows === 0 &&
    duplicateLedgerMatches === 0 &&
    receiptScan.unreadable_directories === 0 &&
    receiptScan.depth_limited_directories === 0;

  const output = {
    marker: VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1,
    version: 1,
    status: cleanScope
      ? "PRODUCTION_WC_CAPACITY_OBSERVED_SCOPE_CLEAN"
      : "PRODUCTION_WC_CAPACITY_OBSERVED_WITH_DISCOVERY_GAPS",
    read_only: true,
    network_access: false,
    credential_registry_access: false,
    raw_token_access: false,
    wallet_or_signer_access: false,
    wc_ledger_mutation: false,
    receipt_search_scope_authoritative: false,
    current_credential_binding_revalidation_performed: false,
    opening_participant_eligibility_proven: false,
    opening_commitment_amounts_observed: false,
    sybil_related_identity_truth_proven: false,
    policy_selection_authorized: false,
    discovery: {
      receipt_root_count: roots.length,
      visited_file_count: receiptScan.visited_files,
      adapter_receipt_files_seen: receiptScan.files_seen,
      valid_unique_adapter_receipts: receiptScan.summaries.size,
      invalid_adapter_receipt_files: receiptScan.invalid_files,
      duplicate_adapter_receipt_copies: receiptScan.duplicate_copies,
      unreadable_directories: receiptScan.unreadable_directories,
      depth_limited_directories: receiptScan.depth_limited_directories,
      valid_receipts_without_matching_ledger_credit: receiptsWithoutCredit,
      matching_ledger_credit_conflicts:
        ledgerScan.invalid_matching_rows + duplicateLedgerMatches,
      historical_malformed_ledger_lines_observed: ledgerScan.malformed_lines,
      redeemed_file_present: fs.existsSync(redeemed),
    },
    matched: {
      production_earning_receipt_count: matched.length,
      distinct_wc_account_count: grossByAccount.size,
      gross_production_earned_wc: quantaToExact(totalGross),
      gross_production_earned_quanta: totalGross.toString(),
      all_source_redeemable_wc_on_matched_accounts:
        quantaToExact(totalAllSourceRedeemable),
      production_earned_redeemable_lower_bound_wc: quantaToExact(totalLower),
      production_earned_redeemable_lower_bound_quanta: totalLower.toString(),
      production_earned_redeemable_upper_bound_wc: quantaToExact(totalUpper),
      production_earned_redeemable_upper_bound_quanta: totalUpper.toString(),
      production_earned_redeemable_lower_bound_whole_wc:
        (totalLower / WC_QUANTA_PER_WC).toString(),
      largest_account_gross_share_bps_ceiling:
        bpsCeil(largestGross, totalGross),
      largest_account_lower_bound_share_bps_ceiling:
        bpsCeil(largestLower, totalLower),
      maximum_possible_account_share_bps_ceiling_under_attribution_uncertainty:
        maxPossibleShareBps,
    },
    interpretation: {
      lower_bound_rule:
        "charge_all_observed_wc_debits_and_redemptions_against_matched_production_earned_wc_first",
      upper_bound_rule:
        "min_matched_production_earned_gross_and_all_source_current_redeemable",
      account_names_emitted: false,
      identifiers_emitted: false,
      file_paths_emitted: false,
      production_value_recommendation: false,
    },
  };

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

main().catch((error) => {
  process.stderr.write(
    JSON.stringify({
      marker: VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1,
      ok: false,
      error: String(error instanceof Error ? error.message : error),
      read_only: true,
      network_access: false,
      credential_registry_access: false,
      raw_token_access: false,
      wallet_or_signer_access: false,
      wc_ledger_mutation: false,
    }) + "\n",
  );
  process.exitCode = 1;
});
