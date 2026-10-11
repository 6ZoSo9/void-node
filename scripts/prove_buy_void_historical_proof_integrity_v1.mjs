#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const expected = Object.freeze({
  "scripts/prove_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts": "4ef9379ff3130795533a7d2d59b5f737eafa0a00",
  "scripts/prove_buy_void_nimo_combined_v3_unaccepted_source_v1.mjs": "56e581b15e133f751070df1d5cf432ae4568cce8",
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v1.mjs": "1a8db260a134ad438366d5b7660f926768c98a79",
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v2.mjs": "d42148523c44d95d3b87236ade22cfb92dcb5bee",
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v3.mjs": "4c80e34d1c371a6766770b08ae5dc85563d101c8",
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v4.mjs": "3f91404c8f5b6897b0781455564b4ec26b480c03",
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v5.mjs": "5dc2d12e34e648d2dbfb8f1e79584caa2f8abc51",
  "scripts/prove_buy_void_custody_reserve_plan_v1.mjs": "94596835ee781f1dcfd42ab79787787868c31841",
  "scripts/prove_buy_void_custody_reserve_plan_v2.mjs": "ae68f2829c4f1e9ab89ea4f91d290133fab63407",
  "scripts/prove_buy_void_custody_reserve_plan_v3.mjs": "f8bd0351e670be9e9e8b5dc4da3cfe0bb6797fc3",
  "scripts/prove_buy_void_operator_verified_allocation_dispatch_v1.ts": "e58bf39fadc25123771481608fad2a61a8f3133f",
  "scripts/prove_buy_void_operator_verified_allocation_dispatch_v2.ts": "5050498f600efd7d5c83af214f75663a66685d6e",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v2.ts": "9fb39172afa09e49c11d72ff376e9af2d99a4101",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v3.ts": "d31f8cbb85ed17c9937baf3c9725a6fae22cc829",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_dual_rail_v2.ts": "7f33974b448e92be7d62c6f1d21d3fa29d7d5f0b",
  "scripts/prove_buy_void_first_buyer_allocation_composition_v1.mjs": "05402f85983b4a75d0d456615f44feb80f34ba2d"
});

function gitBlobSha(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

for (const [path, sha] of Object.entries(expected)) {
  const bytes=fs.readFileSync(path);
  assert.equal(gitBlobSha(bytes),sha,"historical_proof_blob_changed:"+path);
}
console.log("VOID_BUY_VOID_HISTORICAL_PROOF_INTEGRITY_V1_GREEN");
console.log("historical_proofs_exact="+Object.keys(expected).length);
console.log("historical_proofs_rederived_against_current_source=false");
console.log("production_source_mutation=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
