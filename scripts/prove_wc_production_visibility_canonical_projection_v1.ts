import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  projectWcProductionBalance,
  projectWcProductionLedger,
} from "../src/economic/wc_production_visibility_projection_v1.js";

const indexSource = fs.readFileSync(path.resolve("src/index.ts"), "utf8");
const moduleSource = fs.readFileSync(
  path.resolve("src/economic/wc_production_visibility_projection_v1.ts"),
  "utf8",
);

assert.match(
  indexSource,
  /from "\.\/economic\/wc_production_visibility_projection_v1\.js"/,
);
assert.doesNotMatch(
  indexSource,
  /from "\.\/economic\/wc_verified_receipt_acceptance_v1(?:\.js)?"/,
);
assert.equal((indexSource.match(/\/wc\/production\/balance/g) ?? []).length, 1);
assert.equal((indexSource.match(/\/wc\/production\/ledger/g) ?? []).length, 1);

const projectionSectionEndMarker =
  "// === wc-production-visibility-v1 END ===";
const balanceRouteStart = indexSource.indexOf(
  "/wc/production/balance",
);
const ledgerRouteStart = indexSource.indexOf(
  "/wc/production/ledger",
);
const projectionSectionEnd = indexSource.indexOf(
  projectionSectionEndMarker,
  ledgerRouteStart,
);

assert.ok(balanceRouteStart >= 0);
assert.ok(ledgerRouteStart > balanceRouteStart);
assert.notEqual(projectionSectionEnd, -1);
assert.equal(
  indexSource.indexOf(
    projectionSectionEndMarker,
    projectionSectionEnd + projectionSectionEndMarker.length,
  ),
  -1,
);

const projectionSection = indexSource.slice(
  balanceRouteStart,
  projectionSectionEnd + projectionSectionEndMarker.length,
);
const balanceRoute = projectionSection.slice(
  0,
  ledgerRouteStart - balanceRouteStart,
);
const ledgerRoute = projectionSection.slice(
  ledgerRouteStart - balanceRouteStart,
);

assert.match(balanceRoute, /missing_account/);
assert.match(balanceRoute, /projectWcProductionBalance/);
assert.match(balanceRoute, /VOID_WC_PRODUCTION_BALANCE_V1/);
assert.match(ledgerRoute, /missing_account/);
assert.match(ledgerRoute, /const limit/);
assert.match(ledgerRoute, /projectWcProductionLedger/);
assert.match(ledgerRoute, /VOID_WC_PRODUCTION_LEDGER_V1/);
assert.doesNotMatch(projectionSection, /wcProductionCanary/);
assert.doesNotMatch(projectionSection, /acceptPaidWorkEntitlementOnce/);

assert.match(
  moduleSource,
  /from "\.\/wc_verified_receipt_acceptance_v1\.js"/,
);
assert.match(moduleSource, /ledger_version: "wc-v1"/);
assert.match(moduleSource, /production_wc_ledger_integrity_failure/);
assert.match(moduleSource, /events: matching\.slice\(-limit\)\.reverse\(\)/);
assert.doesNotMatch(moduleSource, /wcProductionCanary/);
assert.doesNotMatch(moduleSource, /acceptPaidWorkEntitlementOnce/);

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-wc-production-projection-proof-"),
);
fs.mkdirSync(path.join(root, "wc_v1"), { recursive: true });
fs.mkdirSync(path.join(root, "production-canary-v1"), { recursive: true });
const canonical = {"account":"void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb","agent_key_fingerprint_sha256":"e1152ec8aafe7949b2bcad02b5f4d432900278e7c99de9c0e019e9b3208a7f86","delta":3,"entitlement_sha256":"8b7200fee6986bc49a6d7557a577284fd6bb5c54d24d7501cf98508f0373a80d","idempotency_key":"paid-work-entitlement:voids_67af3558ec849c9e2dadfa72aa2549eb:8b7200fee6986bc49a6d7557a577284fd6bb5c54d24d7501cf98508f0373a80d:award-3","kind":"credit","reason":"paid_work_entitlement_acceptance_v1","review_sha256":"1b60caba88173073074312359bb90cd863d4cd2ab50eb18f3fb47b7e176ae982","reward_meta":{"accepted_at_ms":1785340983490,"caller":"void-second-task-live-entitlement-apply-v1","canonical_wc_ledger_credit_automatic":false,"duplicate_guard":["submission_id","entitlement_sha256","idempotency_key"],"entitlement_service_signature_verified":true,"fixed_award_wc":3,"operator_approval_verified":true,"policy":"approved_signed_pilot_entitlement_only","review_service_signature_verified":true,"server_controlled_award":true,"service_key_fingerprint_sha256":"c6e6ce9f6eb0541b3fdbf6e69ad4484950ca45f25ec79c05879806e769eff1fb","source":"void_agent_paid_work_intake_v1","void_settlement_performed":false,"wallet_transaction_payment_performed":false},"submission_id":"voids_67af3558ec849c9e2dadfa72aa2549eb","task_id":"void-public-selector-independent-verification-v1","ts_ms":1785340983490};
const canonicalFile = path.join(root, "wc_v1", "ledger.jsonl");
const canaryFile = path.join(root, "production-canary-v1", "ledger.jsonl");
fs.writeFileSync(canonicalFile, JSON.stringify(canonical) + "\n");
fs.writeFileSync(
  canaryFile,
  JSON.stringify({
    account: "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb",
    delta: 99,
    marker: "LEGACY_PRODUCTION_CANARY_SENTINEL",
  }) + "\n",
);
const before = crypto
  .createHash("sha256")
  .update(fs.readFileSync(canonicalFile))
  .digest("hex");

const balance = await projectWcProductionBalance(
  "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb",
  root,
  "VOID_WC_PRODUCTION_BALANCE_V1",
);
assert.equal(balance.status, 200);
assert.equal(balance.body["balance"], 3);
assert.equal(balance.body["redeemable_wc"], 3);
assert.equal(balance.body["count"], 1);
assert.equal(balance.body["ledger_version"], "wc-v1");

const ledger = await projectWcProductionLedger(
  "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb",
  root,
  50,
  "VOID_WC_PRODUCTION_LEDGER_V1",
);
assert.equal(ledger.status, 200);
assert.equal(ledger.body["count"], 1);
assert.equal(ledger.body["returned"], 1);
assert.equal((ledger.body["events"] as unknown[]).length, 1);
assert.equal(ledger.body["ledger_version"], "wc-v1");

const after = crypto
  .createHash("sha256")
  .update(fs.readFileSync(canonicalFile))
  .digest("hex");
assert.equal(after, before);
assert.match(fs.readFileSync(canaryFile, "utf8"), /99/);

fs.appendFileSync(canonicalFile, "{malformed-json\n");
const integrity = await projectWcProductionBalance(
  "void-second-task-quote-canary-v1-20260729T000512Z-e37627dda9eb",
  root,
  "VOID_WC_PRODUCTION_BALANCE_V1",
);
assert.equal(integrity.status, 500);
assert.equal(
  integrity.body["error"],
  "production_wc_ledger_integrity_failure",
);
assert.equal(integrity.body["mutation"], false);

console.log("VOID_WC_PRODUCTION_VISIBILITY_CANONICAL_PROJECTION_V1_PROOF_GREEN");
