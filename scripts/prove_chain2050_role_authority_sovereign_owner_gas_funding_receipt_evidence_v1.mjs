#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifyFundingReceiptEvidenceV1 } from "../tools/chain2050-role-authority-sovereign-owner-gas-funding-receipt-evidence-v1.mjs";

const v = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-receipt-evidence-v1.json",
  "utf8"
));
const r = verifyFundingReceiptEvidenceV1(v);
assert.equal(r.ok, true);
assert.equal(r.funding_receipt_evidence_id, "voidcrasgfr1_e9385b102116119b36a6f783451fd4357df4150b9a8813ed98e4ee1f754fba0e");
assert.equal(r.signed_transaction_hash, "0x5eda168d41f96c8841b3b926c34750d02e2b2950aec1ecd0260b9d3c0042cbc9");
assert.equal(r.owner_balance_wei, "500000000000000");
assert.equal(r.registry_entry_count, "0");

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_RECEIPT_EVIDENCE_V1_GREEN");
console.log("funding_receipt_evidence_id=" + r.funding_receipt_evidence_id);
console.log("signed_transaction_hash=" + r.signed_transaction_hash);
console.log("owner_balance_wei=" + r.owner_balance_wei);
console.log("registry_entry_count=0");
console.log("registry_append_performed=false");
