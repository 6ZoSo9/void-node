#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_HISTORICAL_V1_GIT_BLOB_SHA1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_PROPOSED_V2_LOCK_GIT_BLOB_SHA1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
  classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3,
} from "../src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.js";

const V1 =
  "src/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts";
const V2_LOCK =
  "docs/architecture/buy-void-nimo-witness-v2-proposed-lock-v1.json";
const V3_CANDIDATE =
  "scripts/prove_buy_void_nimo_combined_v3_unaccepted_source_v1.mjs";
const V3_BUNDLE = "scripts/prove_buy_void_nimo_v3_inactive_bundle_v1.py";
const V3_STAGE = "scripts/void_nimo_v3_private_stage_v1.py";

const gitBlob = (bytes: Buffer): string =>
  crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
const sha256Id = (bytes: Buffer): string =>
  "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");

assert.equal(
  gitBlob(fs.readFileSync(V1)),
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_HISTORICAL_V1_GIT_BLOB_SHA1,
);
assert.equal(
  gitBlob(fs.readFileSync(V2_LOCK)),
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_PROPOSED_V2_LOCK_GIT_BLOB_SHA1,
);
assert.equal(gitBlob(fs.readFileSync(V3_CANDIDATE)), "56e581b15e133f751070df1d5cf432ae4568cce8");
assert.equal(gitBlob(fs.readFileSync(V3_BUNDLE)), "6f5e40f17d561d1dda7a054250c46363a86fcb30");
assert.equal(gitBlob(fs.readFileSync(V3_STAGE)), "296f8190e26f881cbf3b9e1572c90adf2c4cda64");

for (const file of VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3) {
  const bytes = fs.readFileSync(file.source_path);
  assert.equal(
    sha256Id(bytes),
    file.sha256,
    "actual built/source runtime byte drift: " + file.source_path,
  );
}

function fixture() {
  return {
    schema:
      "void_buy_void_allocation_custody_witness_runtime_bundle_qualification_v3",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3,
    version: 3,
    candidate_manifest_id:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
    candidate_archive_sha256:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
    files:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.map(
        (file) => ({
          path: file.installed_path,
          sha256: file.sha256,
          uid: 0,
          gid: 0,
          mode: 0o444,
          nlink: 1,
          regular_file: true,
          symlink: false,
          root_owned_parent_chain: true,
        }),
      ),
  };
}

function requireOk(value: ReturnType<
  typeof classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3
>) {
  if (value.ok !== true) {
    throw new Error("unexpected V3 HOLD: " + String((value as any).reason || ""));
  }
  return value;
}

function expectHeld(value: unknown, reason: RegExp) {
  const result =
    classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3(value);
  assert.equal(result.ok, false);
  assert.match(String((result as any).reason || ""), reason);
}

const ok = requireOk(
  classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV3(
    fixture(),
  ),
);
assert.match(ok.qualification_id, /^voidwfbq3_[0-9a-f]{64}$/u);
assert.equal(ok.normalized.files.length, 8);
assert.equal(ok.operation_performed, false);
assert.equal(ok.live_nimo_installed, false);
assert.equal(ok.verified_payment_to_allocation_mounted, false);
assert.equal(ok.custody_reserve_or_recover_enabled, false);
assert.equal(ok.presale_activation, false);
assert.equal(ok.funds_movement, false);

{
  const value = fixture();
  value.candidate_manifest_id = "voidwfb3_" + "0".repeat(64);
  expectHeld(value, /witness_runtime_bundle_v3_identity_invalid/u);
}
{
  const value = fixture();
  value.candidate_archive_sha256 = "sha256:" + "0".repeat(64);
  expectHeld(value, /witness_runtime_bundle_v3_identity_invalid/u);
}
{
  const value: any = fixture();
  value.files[4].sha256 =
    "sha256:af497a5b7f62b08b60e90a527ae3365540fd2a13fcd99f6dd4e8253423869c0f";
  expectHeld(value, /witness_runtime_bundle_v3_file_invalid/u);
}
{
  const value: any = fixture();
  value.files[5].sha256 =
    "sha256:ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6";
  expectHeld(value, /witness_runtime_bundle_v3_file_invalid/u);
}
for (const mutate of [
  (v: ReturnType<typeof fixture>) => { v.files[0].uid = 997; },
  (v: ReturnType<typeof fixture>) => { v.files[0].mode = 0o644; },
  (v: ReturnType<typeof fixture>) => { v.files[0].nlink = 2; },
  (v: ReturnType<typeof fixture>) => { v.files[0].symlink = true; },
  (v: ReturnType<typeof fixture>) => {
    v.files[0].root_owned_parent_chain = false;
  },
]) {
  const value = fixture();
  mutate(value);
  expectHeld(value, /witness_runtime_bundle_v3_file_invalid/u);
}

for (const key of [
  "live_evidence_origin_proven",
  "live_nimo_installed",
  "live_ssh_execution_performed",
  "authorized_keys_mutated",
  "sshd_mutated",
  "config_installed",
  "ssh_key_generated",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "runtime_integration",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "payment_acceptance",
  "verified_payment_to_allocation_mounted",
  "custody_reserve_or_recover_enabled",
  "wallet_or_signer_access",
  "transaction_signing",
  "transaction_broadcast",
  "presale_activation",
  "funds_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_AUTHORITY_V3[key],
    false,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3_GREEN",
);
console.log("candidate_manifest_id=" +
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3);
console.log("candidate_archive_sha256=" +
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3);
console.log("qualification_id=" + ok.qualification_id);
console.log("runtime_file_count=8");
console.log("historical_v1_blob_preserved=true");
console.log("proposed_v2_lock_preserved=true");
console.log("unaccepted_candidate_record_rewritten=false");
console.log("predecessor_ledger_hash_rejected=true");
console.log("predecessor_auto_fulfillment_hash_rejected=true");
console.log("live_nimo_installed=false");
console.log("verified_payment_to_allocation_mounted=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
