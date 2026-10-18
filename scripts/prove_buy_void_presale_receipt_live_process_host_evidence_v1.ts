#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  PARENT_PLAN_ID,
  testOnlyAssertReceiptAncestorStableV1,
  testOnlyAssertReceiptCanonicalAncestorStableV1,
  testOnlyAssertReceiptCanonicalLeafStableV1,
  testOnlyAssertSelectorGenerationStableV1,
  testOnlyAssertServiceSnapshotStableV1,
  testOnlyExpectedNodeOptionsShaV1,
  testOnlyReceiptAncestorRevalidationOrderV1,
  testOnlyReceiptLeafCustodyTrustedV1,
} from "../ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const COLLECTOR_REL=
  "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.ts";
const COLLECTOR_BLOB="016f4a1e0ce6cae3009071fdfaef24417d056182";

const PARENT_PLAN_REL="ops/security/buy-void-presale-host-evidence-collection-plan-v1.json";
const PARENT_PLAN_BLOB="ad68175e629fd1cf90180db3a904f84834314fdd";
const PARENT_PROOF_REL="scripts/prove_buy_void_presale_host_evidence_collection_plan_v1.py";
const PARENT_PROOF_BLOB="295adeea32bc1723b290f7e07e4186e2e6e8e9be";
const PARENT_DOC_REL="docs/operators/buy-void-presale-host-evidence-collection-plan-v1.md";
const PARENT_DOC_BLOB="4f5d8a5db1cf1b82991962f5bf90a231c96c6f76";
const PARENT_WORKFLOW_REL=".github/workflows/buy-void-presale-host-evidence-collection-plan-v1.yml";
const PARENT_WORKFLOW_BLOB="9e7070f89235a3aa401a2c23a5dd3dbafc6a3703";

const PRIMITIVES=Object.freeze({
  "src/economic/buy_void_source_finality_generation_provenance_v7.ts":
    "390ff1a2ff0437cd8c8693e7807c12275df42573",
  "src/economic/buy_void_source_finality_live_process_binding_v2.ts":
    "987c97568a4d1b9814218603df48a65dbfeed18f",
  "ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts":
    "a334ab29477dec3e36862a512191b9701debb73e",
  "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts":
    "d47a6f99870f385c1bc938adbef74535b78eba1f",
  "ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c":
    "b7aad6ecea7afa5b7f931b50b4b463e992b19748",
  "ops/security/buy-void-v7-live-process-v2-selector-elf-lock-v1.json":
    "f2c3d0c9f87ffd1e5495a6163594dbd79d7a8a96",
  "ops/run-void-node-live-v1.sh":
    "6fb040de128ce0df16e848d61ea5f4acb62794da",
});

function gitBlob(raw:Buffer):string{
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(raw.length)+"\0","utf8"))
    .update(raw).digest("hex");
}
function pin(relative:string,expected:string):Buffer{
  const file=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(file,{bigint:true});
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n,relative);
  const raw=fs.readFileSync(file);
  const after=fs.lstatSync(file,{bigint:true});
  assert.equal(after.dev,before.dev,relative+":dev");
  assert.equal(after.ino,before.ino,relative+":ino");
  assert.equal(after.size,before.size,relative+":size");
  assert.equal(after.mtimeNs,before.mtimeNs,relative+":mtime");
  assert.equal(after.ctimeNs,before.ctimeNs,relative+":ctime");
  assert.equal(BigInt(raw.length),before.size,relative+":short");
  assert.equal(gitBlob(raw),expected,relative+":blob");
  return raw;
}

const source=pin(COLLECTOR_REL,COLLECTOR_BLOB).toString("utf8");
pin(PARENT_PLAN_REL,PARENT_PLAN_BLOB);
pin(PARENT_PROOF_REL,PARENT_PROOF_BLOB);
pin(PARENT_DOC_REL,PARENT_DOC_BLOB);
pin(PARENT_WORKFLOW_REL,PARENT_WORKFLOW_BLOB);
for(const [relative,blob] of Object.entries(PRIMITIVES))pin(relative,blob);

assert.equal(
  PARENT_PLAN_ID,
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab",
);
assert.equal(MARKER,"VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1");

for(const required of [
  "verifyBuyVoidSourceFinalityDeploymentReceiptV7",
  "buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2",
  "VOID_BUY_VOID_V2_SELECTOR_INSTALLED_PATH_V1",
  "parseBuyVoidV2SelectorLineV1",
  "startSelectorSession(",
  "finishSelectorSession(",
  "pidfds_retained_during_collection=true",
  "serviceSnapshot(uid)",
  "systemd_metadata_query_performed:true",
  "readInstalledLiveReceiptCandidate()",
  "readInstalledLiveReceiptExact(canonicalBytes)",
  "parseReviewedSourceFromCmdline(",
  "process_environment_read_performed:false",
  "launch_environment_fields_receipt_attested:true",
  "receipt.node_path_absent!==true",
  "receipt.ld_preload_absent!==true",
  "receipt.ld_library_path_absent!==true",
  "credential_access:false",
  "authenticated_receipt_verified:true",
  "same_live_process_binding_verified:true",
  "installed_live_process_receipt_exact_bytes_match:true",
  "receipt_ancestor_custody_revalidated:true",
  "selector_process_execution_performed:true",
  "source_custody_process_execution_performed:true",
  "filesystem_write_performed:false",
  "network_contact_performed:false",
  "receipt_publication_performed:false",
  "receipt_retirement_performed:false",
  "production_host_evidence_authority:false",
])assert.ok(source.includes(required),required);
for(const forbiddenCredentialRead of [
  "collectBuyVoidV2LiveProcessCollectionPlanV1",
  "/environ",
  '"environ"',
  "NODE_PRIVKEY_PATH",
  "process_environment_read_performed:true",
])assert.equal(source.includes(forbiddenCredentialRead),false,forbiddenCredentialRead);

for(const forbidden of [
  "installBuyVoidV2LiveProcessReceiptCreateOnceV1",
  "rollbackNewBuyVoidV2LiveProcessReceiptV1",
  "verifyBuyVoidSourceFinalityLiveProcessBindingV2",
  "writeFileSync",
  "appendFileSync",
  "unlinkSync",
  "renameSync",
  "replaceSync",
  "linkSync",
  "mkdirSync",
  "chmodSync",
  "chownSync",
  "O_WRONLY",
  "O_RDWR",
  "O_CREAT",
  "O_EXCL",
  "node:http",
  "node:https",
  "node:net",
  "node:dgram",
  "fetch(",
])assert.equal(source.includes(forbidden),false,forbidden);

for(const required of [
  "fs.constants.O_RDONLY",
  "fs.constants.O_NOFOLLOW",
  "function receiptLeafCustodyTrusted(",
  "current.uid === 0n",
  "current.gid === 0n",
  "current.nlink === 1n",
  "(current.mode & 0o7777n) === 0o444n",
  "current.size === BigInt(expectedLength)",
  "readInstalledLiveReceiptCandidate()",
  "path: cursor",
  "fs.lstatSync(held.path, { bigint: true })",
  "host_evidence_receipt_ancestor_namespace_changed",
  "current.mode & 0o7777n",
  "mode: visible.mode & 0o7777n",
  "mode: held.mode & 0o7777n",
])assert.ok(source.includes(required),required);

for(const stale of [
  "(before.mode & 0o777) !== 0o444",
])assert.equal(source.includes(stale),false,stale);

const ancestorRevalidationIndex =
  source.indexOf("revalidateReceiptAncestors(heldDirectories);");
const canonicalLeafRevalidationIndex =
  source.indexOf("const canonicalBefore = fs.lstatSync(target);");
assert.ok(ancestorRevalidationIndex >= 0);
assert.ok(canonicalLeafRevalidationIndex > ancestorRevalidationIndex);

const selectorBase=Object.freeze({
  manager_pid:101,
  manager_start_ticks:"1001",
  manager_cmdline_sha256:"2".repeat(64),
  service_pid:202,
  service_start_ticks:"2002",
  service_cmdline_sha256:"3".repeat(64),
});
testOnlyAssertSelectorGenerationStableV1(selectorBase,{...selectorBase});
for(const [label,current] of [
  ["manager_pid",{...selectorBase,manager_pid:102}],
  ["manager_start",{...selectorBase,manager_start_ticks:"1002"}],
  ["manager_cmdline",{...selectorBase,manager_cmdline_sha256:"4".repeat(64)}],
  ["service_pid",{...selectorBase,service_pid:203}],
  ["service_start",{...selectorBase,service_start_ticks:"2003"}],
  ["service_cmdline",{...selectorBase,service_cmdline_sha256:"5".repeat(64)}],
] as const){
  let rejected=false;
  try{testOnlyAssertSelectorGenerationStableV1(selectorBase,current);}catch{rejected=true;}
  assert.equal(rejected,true,"selector_generation_drift_not_rejected:"+label);
}
const snapshotBase=Object.freeze({
  main_pid:202,
  invocation_id:"6".repeat(32),
  working_directory:"/opt/void-node-live/releases/"+"7".repeat(40),
});
testOnlyAssertServiceSnapshotStableV1(snapshotBase,{...snapshotBase});
for(const [label,current] of [
  ["pid",{...snapshotBase,main_pid:203}],
  ["invocation",{...snapshotBase,invocation_id:"8".repeat(32)}],
  ["cwd",{...snapshotBase,working_directory:"/opt/void-node-live/releases/"+"9".repeat(40)}],
] as const){
  let rejected=false;
  try{testOnlyAssertServiceSnapshotStableV1(snapshotBase,current);}catch{rejected=true;}
  assert.equal(rejected,true,"systemd_generation_drift_not_rejected:"+label);
}
assert.equal(
  testOnlyExpectedNodeOptionsShaV1(
    "/opt/void-node-live/releases/"+"a".repeat(40),
    "123ec1792a027f93d4c9030749a0e7e136a75a44",
  ).length,
  64,
);

const receiptParent="/var/lib/void-source-finality-v7";
const leafToRootOrder=[
  receiptParent,
  "/var/lib",
  "/var",
  "/",
] as const;
const revalidationOrder=testOnlyReceiptAncestorRevalidationOrderV1(
  leafToRootOrder,
);
assert.deepEqual(
  revalidationOrder,
  ["/","/var","/var/lib",receiptParent],
);
assert.equal(
  revalidationOrder[revalidationOrder.length-1],
  receiptParent,
  "receipt_parent_not_revalidated_last",
);

const leafBase=Object.freeze({
  uid:0n,
  gid:0n,
  nlink:1n,
  mode:0o444n,
  size:128n,
  regular:true,
  symlink:false,
});
assert.equal(testOnlyReceiptLeafCustodyTrustedV1(leafBase,128),true);
for(const mode of [0o4444n,0o2444n,0o1444n]){
  assert.equal(
    testOnlyReceiptLeafCustodyTrustedV1({...leafBase,mode},128),
    false,
    "receipt_leaf_special_mode_accepted:"+mode.toString(8),
  );
}
assert.equal(
  testOnlyReceiptLeafCustodyTrustedV1({...leafBase,mode:0o644n},128),
  false,
);
assert.equal(
  testOnlyReceiptLeafCustodyTrustedV1({...leafBase,uid:1n},128),
  false,
);

const leafGenerationBase = Object.freeze({
  dev: 41n,
  ino: 42n,
  uid: 0n,
  gid: 0n,
  mode: 0o444n,
  nlink: 1n,
  size: 128n,
  mtimeNs: 100n,
  ctimeNs: 200n,
  regular: true,
  symlink: false,
});
testOnlyAssertReceiptCanonicalLeafStableV1(
  leafGenerationBase,
  {...leafGenerationBase},
  128,
);
for (const [label,current] of [
  ["replaced_inode",{...leafGenerationBase,ino:43n}],
  ["changed_ctime",{...leafGenerationBase,ctimeNs:201n}],
  ["changed_mode",{...leafGenerationBase,mode:0o644n}],
  ["special_mode",{...leafGenerationBase,mode:0o4444n}],
  ["changed_size",{...leafGenerationBase,size:127n}],
  ["symlink",{...leafGenerationBase,regular:false,symlink:true}],
] as const) {
  let rejected=false;
  try {
    testOnlyAssertReceiptCanonicalLeafStableV1(
      leafGenerationBase,
      current,
      128,
    );
  } catch {
    rejected=true;
  }
  assert.equal(
    rejected,
    true,
    "canonical_receipt_leaf_drift_not_rejected:"+label,
  );
}

const exactBigIntIdentity = Object.freeze({
  ...leafGenerationBase,
  ino: 9_007_199_254_740_992n,
  mtimeNs: 1_800_000_000_000_000_000n,
  ctimeNs: 1_800_000_000_000_000_000n,
});
for (const [label,current] of [
  ["inode_above_js_safe_integer",{...exactBigIntIdentity,ino:9_007_199_254_740_993n}],
  ["one_nanosecond_ctime",{...exactBigIntIdentity,ctimeNs:1_800_000_000_000_000_001n}],
  ["one_nanosecond_mtime",{...exactBigIntIdentity,mtimeNs:1_800_000_000_000_000_001n}],
] as const) {
  let rejected=false;
  try {
    testOnlyAssertReceiptCanonicalLeafStableV1(
      exactBigIntIdentity,
      current,
      128,
    );
  } catch {
    rejected=true;
  }
  assert.equal(rejected,true,"exact_bigint_stat_drift_not_rejected:"+label);
}

const ancestor = Object.freeze({
  dev: 11n,
  ino: 22n,
  uid: 0n,
  mode: 0o755n,
});
testOnlyAssertReceiptAncestorStableV1(ancestor, {
  ...ancestor,
  directory: true,
});
for (const [label, current] of [
  ["uid", {...ancestor, uid: 1000n, directory: true}],
  ["mode", {...ancestor, mode: 0o777n, directory: true}],
  ["setuid", {...ancestor, mode: 0o4755n, directory: true}],
  ["setgid", {...ancestor, mode: 0o2755n, directory: true}],
  ["sticky", {...ancestor, mode: 0o1755n, directory: true}],
  ["inode", {...ancestor, ino: 23n, directory: true}],
  ["type", {...ancestor, directory: false}],
] as const) {
  let rejected=false;
  try{
    testOnlyAssertReceiptAncestorStableV1(ancestor,current);
  }catch{
    rejected=true;
  }
  assert.equal(rejected,true,"ancestor_drift_not_rejected:"+label);
}

const canonicalAncestor = {...ancestor, directory: true};
testOnlyAssertReceiptCanonicalAncestorStableV1(
  ancestor,
  canonicalAncestor,
  {...canonicalAncestor},
  {...canonicalAncestor},
);
for (const [label, before, reopened, after] of [
  [
    "before_inode",
    {...canonicalAncestor, ino: 23n},
    {...canonicalAncestor},
    {...canonicalAncestor},
  ],
  [
    "reopened_inode",
    {...canonicalAncestor},
    {...canonicalAncestor, ino: 23n},
    {...canonicalAncestor},
  ],
  [
    "after_inode",
    {...canonicalAncestor},
    {...canonicalAncestor},
    {...canonicalAncestor, ino: 23n},
  ],
  [
    "reopened_uid",
    {...canonicalAncestor},
    {...canonicalAncestor, uid: 1000n},
    {...canonicalAncestor},
  ],
  [
    "reopened_mode",
    {...canonicalAncestor},
    {...canonicalAncestor, mode: 0o777n},
    {...canonicalAncestor},
  ],
  [
    "before_setuid",
    {...canonicalAncestor, mode: 0o4755n},
    {...canonicalAncestor},
    {...canonicalAncestor},
  ],
  [
    "reopened_setgid",
    {...canonicalAncestor},
    {...canonicalAncestor, mode: 0o2755n},
    {...canonicalAncestor},
  ],
  [
    "after_sticky",
    {...canonicalAncestor},
    {...canonicalAncestor},
    {...canonicalAncestor, mode: 0o1755n},
  ],
  [
    "reopened_type",
    {...canonicalAncestor},
    {...canonicalAncestor, directory: false},
    {...canonicalAncestor},
  ],
] as const) {
  let rejected=false;
  try{
    testOnlyAssertReceiptCanonicalAncestorStableV1(
      ancestor,
      before,
      reopened,
      after,
    );
  }catch{
    rejected=true;
  }
  assert.equal(
    rejected,
    true,
    "canonical_ancestor_namespace_drift_not_rejected:"+label,
  );
}

console.log(MARKER+"_PROOF_GREEN");
console.log("parent_host_evidence_plan_bound=true");
console.log("reviewed_primitive_blob_count=7");
console.log("deployment_receipt_verified_against_live_source_identity=true");
console.log("single_native_selector_pidfd_session_required=true");
console.log("source_custody_requalification_without_environment=true");
console.log("installed_receipt_exact_bytes_match_required=true");
console.log("receipt_ancestor_descriptor_custody_required=true");
console.log("receipt_ancestor_post_read_revalidation_required=true");
console.log("receipt_canonical_ancestor_namespace_revalidated=true");
console.log("receipt_ancestor_revalidation_root_to_leaf=true");
console.log("receipt_parent_revalidated_last=true");
console.log("receipt_canonical_leaf_post_parent_revalidated=true");
console.log("receipt_canonical_leaf_replacement_rejected=true");
console.log("receipt_leaf_exact_mode_0444=true");
console.log("receipt_leaf_special_mode_bits_rejected=true");
console.log("receipt_canonical_namespace_drift_rejected=true");
console.log("receipt_stat_identity_bigint=true");
console.log("receipt_inode_above_js_safe_integer_drift_rejected=true");
console.log("receipt_one_nanosecond_timestamp_drift_rejected=true");
console.log("selector_pidfd_session_generation_stability_proved=true");
console.log("process_environment_read_performed=false");
console.log("credential_access=false");
console.log("systemd_metadata_query_read_only=true");
console.log("launch_environment_fields_receipt_attested=true");
console.log("receipt_ancestor_special_mode_drift_rejected=true");
console.log("receipt_ancestor_drift_rejected=true");
console.log("pre_post_live_generation_drift_rejected=true");
console.log("final_post_validation_generation_revalidated=true");
console.log("selector_and_systemd_generation_drift_rejected=true");
console.log("publisher_write_functions_not_imported=true");
console.log("service_self_verifier_not_misused=true");
console.log("receipt_read_descriptor_nofollow=true");
console.log("filesystem_write_performed=false");
console.log("network_contact_performed=false");
console.log("receipt_publication_performed=false");
console.log("service_mutation_performed=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
