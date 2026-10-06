#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
  classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1,
} from "../dist/economic/buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V1,
  collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV1,
  testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV1,
} from "../tools/void-buy-allocation-custody-witness-runtime-bundle-evidence-v1.mjs";

const sha256Id = (bytes) =>
  "sha256:" +
  crypto.createHash("sha256").update(bytes).digest("hex");

function baselineRecord(expected) {
  return {
    path: expected.installed_path,
    sha256: expected.sha256,
    uid: 0,
    gid: 0,
    mode: 0o444,
    nlink: 1,
    regular_file: true,
    symlink: false,
    root_owned_parent_chain: true,
  };
}

function makeIo(mutator = null) {
  let call = 0;
  const width =
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.length;
  return Object.freeze({
    inspect(expected) {
      const pass = Math.floor(call / width);
      const index = call % width;
      call += 1;
      const record = baselineRecord(expected);
      if (mutator) mutator(record, { pass, index, expected });
      return record;
    },
  });
}

const receipt =
  collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV1(
    makeIo(),
  );
assert.equal(
  receipt.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V1,
);
assert.equal(receipt.version, 1);
assert.equal(
  receipt.runtime_bundle_manifest_id,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_ID_V1,
);
assert.equal(
  receipt.runtime_bundle_manifest_sha256,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_MANIFEST_SHA256_V1,
);
assert.equal(
  receipt.runtime_bundle_census_source_commit,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_CENSUS_SOURCE_COMMIT_V1,
);
assert.match(
  receipt.runtime_bundle_qualification_id,
  /^voidwfbq1_[0-9a-f]{64}$/u,
);
assert.match(
  receipt.runtime_bundle_evidence_sha256,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.match(
  receipt.collector_receipt_sha256,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.equal(
  receipt.runtime_file_count,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.length,
);
assert.equal(
  receipt.runtime_bundle_files.length,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.length,
);
const rebound = classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1({
  schema: "void_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1",
  marker: VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1,
  version: 1,
  manifest_id: receipt.runtime_bundle_manifest_id,
  manifest_sha256: receipt.runtime_bundle_manifest_sha256,
  source_commit: receipt.runtime_bundle_census_source_commit,
  files: receipt.runtime_bundle_files,
});
assert.equal(rebound.ok, true);
if (rebound.ok !== true) throw new Error("embedded runtime bundle evidence did not requalify");
assert.equal(rebound.qualification_id, receipt.runtime_bundle_qualification_id);
assert.deepEqual(
  rebound.normalized,
  receipt.normalized_runtime_bundle_qualification,
);
assert.equal(receipt.double_census_match, true);
assert.equal(receipt.operation_performed, false);
assert.equal(receipt.live_evidence_origin_proven, false);
assert.equal(receipt.live_nimo_installed, false);
assert.equal(receipt.live_ssh_execution_performed, false);
assert.equal(receipt.installation_qualification_composed, false);
assert.equal(receipt.external_transport_authenticated, false);
assert.equal(receipt.external_witness_storage_proven, false);
assert.equal(receipt.protected_high_water_custody_proven, false);
assert.equal(receipt.independent_custody_proven, false);
assert.equal(receipt.runtime_integration, false);
assert.equal(receipt.production_gate_ready, false);
assert.equal(receipt.funds_movement, false);

const repeated =
  collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV1(
    makeIo(),
  );
assert.equal(
  repeated.collector_receipt_sha256,
  receipt.collector_receipt_sha256,
);
assert.equal(
  repeated.runtime_bundle_qualification_id,
  receipt.runtime_bundle_qualification_id,
);

assert.throws(
  () =>
    collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV1(
      makeIo((record, context) => {
        if (context.pass === 1 && context.index === 0) {
          record.sha256 = "sha256:" + "0".repeat(64);
        }
      }),
    ),
  /witness_runtime_bundle_evidence_changed_during_collection/u,
);

for (const mutate of [
  (record) => { record.sha256 = "sha256:" + "0".repeat(64); },
  (record) => { record.path = "/tmp/unreviewed-runtime.js"; },
  (record) => { record.uid = 1000; },
  (record) => { record.gid = 1000; },
  (record) => { record.mode = 0o555; },
  (record) => { record.nlink = 2; },
  (record) => { record.regular_file = false; },
  (record) => { record.symlink = true; },
  (record) => { record.root_owned_parent_chain = false; },
]) {
  assert.throws(
    () =>
      collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV1(
        makeIo((record, context) => {
          if (context.index === 0) mutate(record);
        }),
      ),
    /witness_runtime_bundle_evidence_parent_witness_runtime_bundle_file_invalid/u,
  );
}

assert.throws(
  () =>
    collectBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceV1({
      inspect() {
        return null;
      },
    }),
  /witness_runtime_bundle_evidence_observation_invalid/u,
);

const trueKeys = new Set([
  "source_collector",
  "filesystem_read",
  "descriptor_bound_reads",
  "fixed_manifest_paths",
  "exact_sha256_binding",
  "root_owned_parent_chain_observed",
  "double_census",
  "canonical_runtime_bundle_qualifier_required",
  "content_addressed_receipt",
]);
for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_AUTHORITY_V1,
)) {
  assert.equal(value, trueKeys.has(key), key);
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-runtime-bundle-evidence-v1.mjs",
  "utf8",
);
assert.match(source, /fs\.constants\.O_NOFOLLOW/u);
assert.match(source, /fs\.constants\.O_DIRECTORY/u);
assert.match(source, /\/proc\/self\/fd/u);
assert.match(source, /witness_runtime_bundle_evidence_parent_chain_invalid/u);
assert.match(source, /witness_runtime_bundle_evidence_file_grew_after_open/u);
assert.match(source, /witness_runtime_bundle_evidence_changed_during_collection/u);
assert.match(
  source,
  /classifyBuyVoidAllocationCustodyWitnessRuntimeBundleQualificationV1/u,
);
assert.doesNotMatch(source, /child_process|spawnSync|execFile|ssh /u);

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-witness-runtime-bundle-evidence-v1-"),
  );
  try {
    const real = path.join(root, "real");
    const linked = path.join(root, "linked");
    fs.mkdirSync(real, { mode: 0o700 });
    const file = path.join(real, "runtime.js");
    fs.writeFileSync(file, "export const proof = true;\n", {
      mode: 0o600,
    });
    const bytes = fs.readFileSync(file);
    const observed =
      testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV1(
        file,
        {
          expectedSha256: sha256Id(bytes),
          expectedMode: 0o600,
        },
      );
    assert.equal(observed.sha256, sha256Id(bytes));
    assert.equal(observed.regular_file, true);
    assert.equal(observed.symlink, false);

    fs.symlinkSync(real, linked);
    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV1(
          path.join(linked, "runtime.js"),
          {
            expectedSha256: sha256Id(bytes),
            expectedMode: 0o600,
          },
        ),
      /witness_runtime_bundle_evidence_parent_chain_invalid/u,
    );

    const growth = path.join(real, "growth.js");
    fs.writeFileSync(growth, "A".repeat(128), { mode: 0o600 });
    const growthBefore = fs.readFileSync(growth);
    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV1(
          growth,
          {
            expectedSha256: sha256Id(growthBefore),
            expectedMode: 0o600,
            testOnlyAfterOpenBeforeRead() {
              fs.appendFileSync(growth, "B");
            },
          },
        ),
      /witness_runtime_bundle_evidence_file_grew_after_open|witness_runtime_bundle_evidence_file_changed/u,
    );

    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV1(
          path.join(real, "missing.js"),
          {
            expectedSha256: "sha256:" + "0".repeat(64),
            expectedMode: 0o600,
          },
        ),
      /witness_runtime_bundle_evidence_file_invalid/u,
    );

    const target = path.join(real, "target.js");
    const symlink = path.join(real, "symlink.js");
    fs.writeFileSync(target, "target\n", { mode: 0o600 });
    fs.symlinkSync(target, symlink);
    assert.throws(
      () =>
        testOnlyReadBuyVoidAllocationCustodyWitnessRuntimeBundleEvidenceFileV1(
          symlink,
          {
            expectedSha256: sha256Id(fs.readFileSync(target)),
            expectedMode: 0o600,
          },
        ),
      /witness_runtime_bundle_evidence_file_invalid/u,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V1 +
    "_GREEN",
);
console.log(
  "runtime_file_count=" +
    String(
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_FILES_V1.length,
    ),
);
console.log("fixed_manifest_paths=true");
console.log("descriptor_bound_reads=true");
console.log("root_owned_parent_chain_observed=true");
console.log("double_census=true");
console.log("canonical_runtime_bundle_qualifier_required=true");
console.log("installation_qualification_composed=false");
console.log("live_evidence_origin_proven=false");
console.log("live_nimo_installed=false");
console.log("live_ssh_execution_performed=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("protected_high_water_custody_proven=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
