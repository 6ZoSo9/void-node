#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { verifySovereignGenesisAppendReconciliationEvidenceV1 } from "../tools/chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.mjs";

const v = JSON.parse(fs.readFileSync(
  "ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-reconciliation-evidence-v1.json",
  "utf8"
));
const r = verifySovereignGenesisAppendReconciliationEvidenceV1(v);

assert.equal(r.ok, true);
assert.equal(r.reconciliation_evidence_id, "voidcrasgarce1_31f02a7a3da637eab8813ca1224b165575d4608265bed9be0efda0e2a552c162");
assert.equal(r.signed_transaction_hash, "0xd6f2eea882fc9351644072e23c8a5279fbdc085a0ee153d6b9fa73aef247e6e7");
assert.equal(r.registry_entry_count, "1");
assert.equal(r.registry_root_sha256, "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041");
assert.equal(r.owner_nonce_latest, "1");
assert.equal(r.authorization_consumed, true);

console.log("VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_RECONCILIATION_EVIDENCE_V1_GREEN");
console.log("reconciliation_evidence_id=" + r.reconciliation_evidence_id);
console.log("signed_transaction_hash=" + r.signed_transaction_hash);
console.log("registry_entry_count=1");
console.log("registry_root_sha256=" + r.registry_root_sha256);
console.log("owner_nonce_latest=1");
console.log("authorization_consumed=true");
console.log("further_submission_authorized=false");
