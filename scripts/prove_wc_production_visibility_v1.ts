import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "src", "index.ts"),
  "utf8"
);

const fail = (message: string): never => {
  throw new Error(`VOID_WC_PRODUCTION_VISIBILITY_V1_FAIL: ${message}`);
};

const begin = source.indexOf("// === wc-production-visibility-v1 BEGIN ===");
const end = source.indexOf("// === wc-production-visibility-v1 END ===", begin);

if (begin < 0 || end < 0 || end <= begin) {
  fail("visibility block markers missing");
}

const block = source.slice(begin, end);

const required = [
  'app.get("/wc/production/balance"',
  'app.get("/wc/production/ledger"',
  '"VOID_WC_PRODUCTION_BALANCE_V1"',
  '"VOID_WC_PRODUCTION_LEDGER_V1"',
  '"production_wc_ledger_integrity_failure"',
  'ledger_version:"production-canary-v1"',
  'read_only:true',
  'spendable:false',
  'redeemable:false',
  'redeemable_wc:0',
  'transferable:false',
  'included_in_legacy_balance:false',
  'automatic_runner_activation:false',
  'wc_to_void:false',
  'money_movement:false',
  'wcProductionCanaryLedgerState()',
  'wcProductionCanaryLedgerFile()',
];

for (const marker of required) {
  if (!block.includes(marker)) {
    fail(`missing required visibility marker: ${marker}`);
  }
}

const forbidden = [
  "app.post(",
  ".post(",
  "appendJsonl(",
  "appendFileSync(",
  "writeFileSync(",
  "wcProductionCanaryEnabled()",
  'process.env.VOID_WC_PRODUCTION_CANARY_ENABLED',
];

for (const marker of forbidden) {
  if (block.includes(marker)) {
    fail(`visibility block contains forbidden mutation/activation marker: ${marker}`);
  }
}

const legacyBalanceStart = source.indexOf('app.get("/wc/balance"');
const legacyBalanceEnd = source.indexOf('app.get("/wc/ledger"', legacyBalanceStart);
if (legacyBalanceStart < 0 || legacyBalanceEnd < 0) {
  fail("legacy balance route boundaries missing");
}

const legacyBalanceBlock = source.slice(legacyBalanceStart, legacyBalanceEnd);
if (
  legacyBalanceBlock.includes("production-canary-ledger-v1.jsonl") ||
  legacyBalanceBlock.includes("wcProductionCanary")
) {
  fail("legacy balance route imports production canary balance");
}

const redeemableStart = source.indexOf('app.get("/wc/redeemable"');
const redeemableEnd = source.indexOf('app.get("/wc/redeemed"', redeemableStart);
if (redeemableStart < 0 || redeemableEnd < 0) {
  fail("legacy redeemable route boundaries missing");
}

const redeemableBlock = source.slice(redeemableStart, redeemableEnd);
if (
  redeemableBlock.includes("production-canary-ledger-v1.jsonl") ||
  redeemableBlock.includes("wcProductionCanary")
) {
  fail("legacy redeemable route imports production canary balance");
}

if (source.includes('app.post("/wc/credit"')) {
  fail("generic WC credit route was restored");
}

if (!source.includes("VOID_WC_PRODUCTION_CANARY_V1")) {
  fail("production canary implementation missing");
}

console.log("VOID_WC_PRODUCTION_VISIBILITY_V1_GREEN");
