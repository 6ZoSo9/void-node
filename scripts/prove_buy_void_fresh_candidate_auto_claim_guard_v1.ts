import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "buyVoidApplyFreshCandidateAutoClaim",
  "VOID_BUY_VOID_AUTO_CLAIM_CONFIRMATION_V1",
  "current_exact_one_readiness_required",
  "exact_request_and_plan_binding",
  "request_journal_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  "alert_filename_fingerprint_binding_required",
  "runBuyVoidAutoClaimWorkerV1",
  "--require-exact-one",
  'flag: "wx"',
];

for (const value of required) {
  assert.equal(
    combined.includes(value),
    true,
    `missing source wall: ${value}`,
  );
}

const forbidden = [
  /from\s+["'][^"']*buy_void_native_execution/i,
  /from\s+["'][^"']*buy_void_native_fulfillment_wallet/i,
  /broadcast_signed_transaction\s*\(/i,
  /sign_transaction\s*\(/i,
  /src\/index[.]ts/,
  /systemctl/,
  /service restart/i,
];

for (const pattern of forbidden) {
  assert.equal(
    pattern.test(combined),
    false,
    `forbidden source pattern: ${pattern}`,
  );
}

assert.equal(
  cliSource.includes("VOID_BUY_VOID_NATIVE_EXECUTION"),
  false,
);
assert.equal(
  cliSource.includes("VOID_BUY_VOID_NATIVE_DELIVERY"),
  false,
);

console.log("VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_GUARD_V1_GREEN");
console.log("native_execution_import=0");
console.log("wallet_credential_import=0");
console.log("request_journal_write=0");
console.log("inventory_reservation=0");
console.log("inventory_decrement=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
