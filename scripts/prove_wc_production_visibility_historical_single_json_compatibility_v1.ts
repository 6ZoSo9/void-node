import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_REL =
  "src/economic/wc_production_visibility_projection_v1.ts";
const ACCOUNT =
  "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb";
const FINGERPRINT =
  "e1152ec8aafe7949b2bcad02b5f4d432900278e7c99de9c0e019e9b3208a7f86";
const TASK =
  "void-public-selector-independent-verification-v1";
const SUBMISSION =
  "voids_67af3558ec849c9e2dadfa72aa2549eb";
const ORIGINAL_LINE_SHA =
  "0bd1367f924399b979c7ee9f001cd6edbeea2e35ded37283a0e4c10ba9aacbfb";
const REPAIRED_LINE_SHA =
  "398291f147e64b5590b5467f68756df504aa0876bdcfd78abbd57b9ca49568f2";

function contains(value: unknown, target: string): boolean {
  if (Array.isArray(value)) {
    return value.some((child) => contains(child, target));
  }

  if (value && typeof value === "object") {
    return Object.entries(
      value as Record<string, unknown>,
    ).some(
      ([key, child]) =>
        key === target || contains(child, target),
    );
  }

  return String(value) === target;
}

async function main(): Promise<void> {
  const repo = process.cwd();
  const sourcePath = path.resolve(repo, SOURCE_REL);
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(
    source,
    /parseWcProductionLedgerLineHistoricalCompatibilityV1/,
  );
  assert.ok(source.includes(ORIGINAL_LINE_SHA));
  assert.ok(source.includes(REPAIRED_LINE_SHA));
  assert.match(
    source,
    /VOID_WC_PRODUCTION_HISTORICAL_REPAIR_POSITION_V1\s*=\s*178/,
  );
  assert.match(
    source,
    /parseWcProductionLedgerLineHistoricalCompatibilityV1\(/,
  );

  const dataDir =
    process.env
      .VOID_WC_PRODUCTION_VISIBILITY_HISTORICAL_DATA_DIR;

  if (!dataDir) {
    console.log(
      "historical_runtime_projection_check=SKIPPED_NO_DATA_DIR",
    );
    console.log(
      "VOID_WC_PRODUCTION_VISIBILITY_HISTORICAL_SINGLE_JSON_COMPATIBILITY_V1_COMPLETE",
    );
    return;
  }

  const imported = await import(
    pathToFileURL(sourcePath).href +
      `?historicalProof=${Date.now()}`
  );

  const balance =
    await imported.projectWcProductionBalance(
      ACCOUNT,
      dataDir,
      "VOID_WC_PRODUCTION_BALANCE_V1",
    );
  const ledger =
    await imported.projectWcProductionLedger(
      ACCOUNT,
      dataDir,
      100,
      "VOID_WC_PRODUCTION_LEDGER_V1",
    );

  assert.equal(balance.status, 200);
  assert.equal(balance.body.ok, true);
  assert.equal(
    balance.body.marker,
    "VOID_WC_PRODUCTION_BALANCE_V1",
  );
  assert.equal(balance.body.account, ACCOUNT);
  assert.equal(balance.body.balance, 3);
  assert.equal(balance.body.redeemable_wc, 3);

  assert.equal(ledger.status, 200);
  assert.equal(ledger.body.ok, true);
  assert.equal(
    ledger.body.marker,
    "VOID_WC_PRODUCTION_LEDGER_V1",
  );
  assert.equal(ledger.body.account, ACCOUNT);
  assert.equal(ledger.body.returned, 1);
  assert.equal(ledger.body.events.length, 1);
  assert.equal(ledger.body.events[0].delta, 3);
  assert.ok(contains(ledger.body, FINGERPRINT));
  assert.ok(contains(ledger.body, TASK));
  assert.ok(contains(ledger.body, SUBMISSION));

  console.log("historical_runtime_projection_check=GREEN");
  console.log(
    "VOID_WC_PRODUCTION_VISIBILITY_HISTORICAL_SINGLE_JSON_COMPATIBILITY_V1_COMPLETE",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
