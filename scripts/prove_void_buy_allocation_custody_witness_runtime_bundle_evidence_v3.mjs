#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_AUTHORITY_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V3,
  collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3,
} from "../tools/void-buy-allocation-custody-witness-runtime-bundle-evidence-v3.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3,
} from "../dist/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v3.js";

const exact = (file) => Object.freeze({
  path: file.installed_path,
  sha256: file.sha256,
  uid: 0,
  gid: 0,
  mode: 0o444,
  nlink: 1,
  regular_file: true,
  symlink: false,
  root_owned_parent_chain: true,
});

const baseline = collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3(
  Object.freeze({ inspect: (file) => exact(file) }),
);
assert.equal(
  baseline.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V3,
);
assert.equal(baseline.version, 3);
assert.equal(
  baseline.candidate_manifest_id,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_MANIFEST_ID_V3,
);
assert.equal(
  baseline.candidate_archive_sha256,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CANDIDATE_ARCHIVE_SHA256_V3,
);
assert.equal(baseline.runtime_file_count, 8);
assert.equal(baseline.double_census_match, true);
assert.match(baseline.runtime_bundle_qualification_id, /^voidwfbq3_[0-9a-f]{64}$/u);
assert.match(baseline.collector_receipt_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(baseline.live_nimo_installed, false);
assert.equal(baseline.verified_payment_to_allocation_mounted, false);
assert.equal(baseline.custody_reserve_or_recover_enabled, false);
assert.equal(baseline.presale_activation, false);
assert.equal(baseline.funds_movement, false);

assert.throws(
  () =>
    collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3(
      Object.freeze({
        inspect(file) {
          const row = { ...exact(file) };
          if (
            file.installed_path.endsWith(
              "/buy_void_allocation_reservation_ledger_v1.js",
            )
          ) {
            row.sha256 =
              "sha256:af497a5b7f62b08b60e90a527ae3365540fd2a13fcd99f6dd4e8253423869c0f";
          }
          return row;
        },
      }),
    ),
  /witness_runtime_bundle_v3_evidence_parent_witness_runtime_bundle_v3_file_invalid/u,
);

let calls = 0;
assert.throws(
  () =>
    collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV3(
      Object.freeze({
        inspect(file) {
          calls += 1;
          const row = { ...exact(file) };
          if (calls > VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V3.length) {
            row.sha256 = "sha256:" + "0".repeat(64);
          }
          return row;
        },
      }),
    ),
  /witness_runtime_bundle_v3_evidence_changed_during_collection/u,
);

for (const key of [
  "filesystem_write",
  "live_evidence_origin_proven",
  "live_nimo_installed",
  "live_ssh_execution_performed",
  "installation_qualification_composed",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "runtime_integration",
  "production_gate_ready",
  "payment_acceptance",
  "verified_payment_to_allocation_mounted",
  "custody_reserve_or_recover_enabled",
  "wallet_or_signer_access",
  "transaction_signing",
  "transaction_broadcast",
  "presale_activation",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_AUTHORITY_V3[key],
    false,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V3_GREEN",
);
console.log("candidate_manifest_id=" + baseline.candidate_manifest_id);
console.log("candidate_archive_sha256=" + baseline.candidate_archive_sha256);
console.log("runtime_bundle_qualification_id=" + baseline.runtime_bundle_qualification_id);
console.log("collector_receipt_sha256=" + baseline.collector_receipt_sha256);
console.log("runtime_file_count=8");
console.log("double_census_match=true");
console.log("predecessor_runtime_hash_rejected=true");
console.log("second_census_drift_rejected=true");
console.log("live_nimo_installed=false");
console.log("verified_payment_to_allocation_mounted=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
