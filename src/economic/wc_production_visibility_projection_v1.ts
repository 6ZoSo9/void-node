import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCanonicalWcState } from "./wc_verified_receipt_acceptance_v1.js";
import * as wcProductionVisibilityHistoricalCrypto from "node:crypto";

const VOID_WC_PRODUCTION_HISTORICAL_MALFORMED_LINE_SHA256_V1 =
  "0bd1367f924399b979c7ee9f001cd6edbeea2e35ded37283a0e4c10ba9aacbfb";
const VOID_WC_PRODUCTION_HISTORICAL_REPAIR_POSITION_V1 =
  178;
const VOID_WC_PRODUCTION_HISTORICAL_REPAIRED_LINE_SHA256_V1 =
  "398291f147e64b5590b5467f68756df504aa0876bdcfd78abbd57b9ca49568f2";

function wcProductionVisibilityHistoricalLineSha256V1(
  value: string,
): string {
  return wcProductionVisibilityHistoricalCrypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function wcProductionVisibilityHistoricalLineHashMatchesV1(
  lineRaw: string,
  expectedSha256: string,
): boolean {
  return [
    lineRaw,
    `${lineRaw}\n`,
    `${lineRaw}\r\n`,
  ].some(
    (candidate) =>
      wcProductionVisibilityHistoricalLineSha256V1(candidate) ===
      expectedSha256,
  );
}

function parseWcProductionLedgerLineHistoricalCompatibilityV1(
  lineRaw: string,
) {
  try {
    return JSON.parse(lineRaw);
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    if (
      !wcProductionVisibilityHistoricalLineHashMatchesV1(
        lineRaw,
        VOID_WC_PRODUCTION_HISTORICAL_MALFORMED_LINE_SHA256_V1,
      )
    ) {
      throw error;
    }

    const position =
      VOID_WC_PRODUCTION_HISTORICAL_REPAIR_POSITION_V1;

    if (lineRaw.length <= position) {
      throw error;
    }

    const repaired =
      lineRaw.slice(0, position) +
      ":" +
      lineRaw.slice(position + 1);

    if (
      !wcProductionVisibilityHistoricalLineHashMatchesV1(
        repaired,
        VOID_WC_PRODUCTION_HISTORICAL_REPAIRED_LINE_SHA256_V1,
      )
    ) {
      throw error;
    }

    return JSON.parse(repaired);
  }
}


type JsonRecord = Record<string, unknown>;
type Projection = { status: 200 | 500; body: JsonRecord };

function ledgerFile(dataDir: string): string {
  return join(dataDir, "wc_v1", "ledger.jsonl");
}

function entryAccount(entry: JsonRecord): string {
  const value =
    entry["account"] ??
    entry["agent_id"] ??
    entry["participant_id"] ??
    entry["account_id"];
  return typeof value === "string" ? value : "";
}

function readLedger(dataDir: string): {
  entries: JsonRecord[];
  malformed: number;
  unexpected: number;
  exists: boolean;
} {
  const file = ledgerFile(dataDir);
  if (!existsSync(file)) {
    return { entries: [], malformed: 0, unexpected: 0, exists: false };
  }

  const entries: JsonRecord[] = [];
  let malformed = 0;
  let unexpected = 0;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = parseWcProductionLedgerLineHistoricalCompatibilityV1(line);
    } catch {
      malformed += 1;
      continue;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      unexpected += 1;
      continue;
    }
    entries.push(parsed as JsonRecord);
  }
  return { entries, malformed, unexpected, exists: true };
}

function integrity(
  marker: string,
  state: ReturnType<typeof readLedger>,
): Projection | null {
  if (state.malformed === 0 && state.unexpected === 0) return null;
  return {
    status: 500,
    body: {
      ok: false,
      error: "production_wc_ledger_integrity_failure",
      marker,
      malformed_entries: state.malformed,
      unexpected_entries: state.unexpected,
      read_only: true,
      mutation: false,
    },
  };
}

export async function projectWcProductionBalance(
  account: string,
  dataDir: string,
  marker: "VOID_WC_PRODUCTION_BALANCE_V1",
): Promise<Projection> {
  const canonicalState = await readCanonicalWcState(account, dataDir);
  const state = readLedger(dataDir);
  const failure = integrity(marker, state);
  if (failure) return failure;

  const count = state.entries.filter(
    (entry) => entryAccount(entry) === account,
  ).length;
  return {
    status: 200,
    body: {
      ok: true,
      marker,
      account,
      balance: canonicalState.earned,
      count,
      ledger_version: "wc-v1",
      ledger_exists: state.exists,
      read_only: true,
      spendable: false,
      redeemable: canonicalState.redeemable > 0,
      redeemable_wc: canonicalState.redeemable,
      transferable: false,
      included_in_legacy_balance: false,
      automatic_runner_activation: false,
      wc_to_void: false,
      money_movement: false,
    },
  };
}

export async function projectWcProductionLedger(
  account: string,
  dataDir: string,
  limit: number,
  marker: "VOID_WC_PRODUCTION_LEDGER_V1",
): Promise<Projection> {
  const canonicalState = await readCanonicalWcState(account, dataDir);
  const state = readLedger(dataDir);
  const failure = integrity(marker, state);
  if (failure) return failure;

  const matching = state.entries.filter(
    (entry) => entryAccount(entry) === account,
  );
  return {
    status: 200,
    body: {
      ok: true,
      marker,
      account,
      count: matching.length,
      returned: Math.min(limit, matching.length),
      events: matching.slice(-limit).reverse(),
      ledger_version: "wc-v1",
      ledger_exists: state.exists,
      read_only: true,
      mutation: false,
      spendable: false,
      redeemable: canonicalState.redeemable > 0,
      transferable: false,
      included_in_legacy_balance: false,
      automatic_runner_activation: false,
      wc_to_void: false,
      money_movement: false,
    },
  };
}
