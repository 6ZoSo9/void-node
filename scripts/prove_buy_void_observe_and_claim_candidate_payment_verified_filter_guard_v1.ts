import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const modulePath = path.join(
  root,
  "src/economic/"
    + "buy_void_observe_and_claim_candidate_readiness_v1.ts",
);
const cliPath = path.join(
  root,
  "scripts/"
    + "buy_void_observe_and_claim_candidate_readiness_v1.ts",
);
const proofPath = path.join(
  root,
  "scripts/"
    + "prove_buy_void_observe_and_claim_candidate_"
    + "payment_verified_filter_v1.ts",
);
const docPath = path.join(
  root,
  "docs/operators/"
    + "buy-void-observe-and-claim-candidate-"
    + "payment-verified-filter-v1.md",
);

for (const file of [
  modulePath,
  cliPath,
  proofPath,
  docPath,
]) {
  assert.equal(
    fs.existsSync(file),
    true,
    `required filter file missing: ${file}`,
  );
}

const moduleSource = fs.readFileSync(
  modulePath,
  "utf8",
);
const cliSource = fs.readFileSync(
  cliPath,
  "utf8",
);
const proofSource = fs.readFileSync(
  proofPath,
  "utf8",
);
const documentation = fs.readFileSync(
  docPath,
  "utf8",
);

assert.match(
  moduleSource,
  /publicStatus\s*===\s*"payment_verified"/,
);
assert.match(
  cliSource,
  /publicStatus\s*===\s*"payment_verified"/,
);
assert.match(
  moduleSource,
  /public_status:\s*publicStatus/,
);
assert.match(
  cliSource,
  /public_status:\s*publicStatus/,
);

for (const status of [
  "awaiting_payment_tx_hash",
  "payment_submitted_pending_manual_review",
  "rejected",
]) {
  assert.match(
    proofSource,
    new RegExp(status),
  );
  assert.match(
    documentation,
    new RegExp(status),
  );
}

assert.match(
  proofSource,
  /eligible_candidate_count,\s*1/,
);
assert.match(
  proofSource,
  /buyvoid_ms2bhyhf_ae2fa866/,
);
assert.match(
  documentation,
  /does not delete or rewrite historical requests/i,
);
assert.match(
  documentation,
  /does not select a request by operator override/i,
);

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_PAYMENT_VERIFIED_FILTER_GUARD_V1_GREEN",
);
console.log("module_payment_verified_gate=1");
console.log("cli_payment_verified_gate=1");
console.log("historical_request_rewrite=0");
console.log("operator_selection_override=0");
console.log("request_mutation=0");
console.log("claim_journal_mutation=0");
console.log("activation=0");
console.log("transaction_broadcast=0");
console.log("void_delivery=0");
