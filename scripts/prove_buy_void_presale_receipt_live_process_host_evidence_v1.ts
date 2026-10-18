#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  PARENT_PLAN_ID,
  testOnlyAssertFinalLiveGenerationV1,
  testOnlyAssertReceiptAncestorStableV1,
  testOnlyAssertReceiptCanonicalAncestorStableV1,
  testOnlyReceiptAncestorRevalidationOrderV1,
  testOnlyReceiptLeafCustodyTrustedV1,
  testOnlyAssertSameLiveGenerationV1,
} from "../ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const COLLECTOR_REL=
  "ops/precision/void_buy_void_presale_receipt_live_process_host_evidence_v1.ts";
const COLLECTOR_BLOB="9ee83f171a39d621af607fb9726a220f271a8a55";

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
});

function gitBlob(raw:Buffer):string{
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(raw.length)+"\0","utf8"))
    .update(raw).digest("hex");
}
function pin(relative:string,expected:string):Buffer{
  const file=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(file);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1,relative);
  const raw=fs.readFileSync(file);
  const after=fs.lstatSync(file);
  assert.equal(after.dev,before.dev,relative+":dev");
  assert.equal(after.ino,before.ino,relative+":ino");
  assert.equal(after.size,before.size,relative+":size");
  assert.equal(after.mtimeMs,before.mtimeMs,relative+":mtime");
  assert.equal(after.ctimeMs,before.ctimeMs,relative+":ctime");
  assert.equal(raw.length,before.size,relative+":short");
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
  "collectBuyVoidV2LiveProcessCollectionPlanV1",
  "requalifyBuyVoidV2LiveSourceCustodyV1",
  "buildBuyVoidV2LiveProcessReceiptFromPlanV1",
  "readInstalledLiveReceiptExact(derivedFirstBytes)",
  "readInstalledLiveReceiptExact(derivedSecondBytes)",
  "openRootOwnedReceiptAncestors(target)",
  "fs.constants.O_DIRECTORY",
  "fs.constants.O_NOFOLLOW",
  "const leafViaParent =",
  "revalidateReceiptAncestors(heldDirectories)",
  "host_evidence_receipt_ancestor_changed_during_read",
  "for (let index = heldDirectories.length - 1; index >= 0; index -= 1)",
  "const finalGeneration = await collectBuyVoidV2LiveProcessCollectionPlanV1({",
  "assertSameLiveGeneration(first, finalGeneration)",
  "assertSameLiveGeneration(second, finalGeneration)",
  "assertSameLiveGeneration(first, second)",
  "deployment_receipt_id: deploymentFirst.deployment_receipt_id",
  "live_process_binding_receipt_id: derivedFirst.receipt_id",
  "authenticated_receipt_verified: true",
  "same_live_process_binding_verified: true",
  "installed_live_process_receipt_exact_bytes_match: true",
  "receipt_ancestor_custody_revalidated: true",
  "pre_post_live_generation_stable: true",
  "final_post_validation_generation_revalidated: true",
  "selector_process_execution_performed: true",
  "source_custody_process_execution_performed: true",
  "filesystem_write_performed: false",
  "network_contact_performed: false",
  "receipt_publication_performed: false",
  "receipt_retirement_performed: false",
  "production_host_evidence_authority: false",
])assert.ok(source.includes(required),required);

assert.equal(
  source.split("await collectBuyVoidV2LiveProcessCollectionPlanV1({").length-1,
  3,
  "three_live_collections_required",
);
assert.equal(
  source.split("requalifyBuyVoidV2LiveSourceCustodyV1(").length-1,
  2,
  "two_source_custody_requalifications_required",
);
assert.equal(
  source.split("deploymentDecision(").length-1,
  3,
  "deployment_decision_helper_plus_two_calls_required",
);

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
  "before.uid !== 0",
  "before.gid !== 0",
  "(before.mode & 0o777) !== 0o444",
  "!observed.equals(expected)",
  "path: cursor",
  "fs.lstatSync(held.path)",
  "host_evidence_receipt_ancestor_namespace_changed",
  "current.mode & 0o7777",
  "mode: visible.mode & 0o7777",
  "mode: held.mode & 0o7777",
])assert.ok(source.includes(required),required);

const base:any={
  plan_id:"voidbsv2colplan1_"+"1".repeat(64),
  runtime_uid:995,
  runtime_gid:982,
  manager_pid:101,
  manager_start_time_ticks:"1001",
  manager_cmdline_sha256:"2".repeat(64),
  service_pid:202,
  service_start_time_ticks:"2002",
  service_cmdline_sha256:"3".repeat(64),
  service_cgroup_v2_path:"/user.slice/user-995.slice/user@995.service/app.slice/void-node-live.service",
  process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  process_source_commit:"4".repeat(40),
  process_source_tree:"5".repeat(40),
  process_source_branch:"main",
  systemd_invocation_id:"6".repeat(32),
  cwd_realpath:"/opt/void-source",
  node_options_sha256:"7".repeat(64),
};
testOnlyAssertSameLiveGenerationV1(base,{...base});
for(const [key,value] of [
  ["service_pid",203],
  ["service_start_time_ticks","2003"],
  ["manager_pid",102],
  ["process_source_commit","8".repeat(40)],
  ["systemd_invocation_id","9".repeat(32)],
] as const){
  let rejected=false;
  try{
    testOnlyAssertSameLiveGenerationV1(
      base,
      {...base,[key]:value},
    );
  }catch{
    rejected=true;
  }
  assert.equal(rejected,true,"generation_drift_not_rejected:"+key);
}

let finalPhaseDriftRejected=false;
try{
  testOnlyAssertFinalLiveGenerationV1(
    base,
    {...base},
    {...base,service_start_time_ticks:"2999",systemd_invocation_id:"a".repeat(32)},
  );
}catch{
  finalPhaseDriftRejected=true;
}
assert.equal(finalPhaseDriftRejected,true,"final_phase_generation_drift_not_rejected");
testOnlyAssertFinalLiveGenerationV1(base,{...base},{...base});

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
  uid:0,
  gid:0,
  nlink:1,
  mode:0o444,
  size:128,
  regular:true,
  symlink:false,
});
assert.equal(testOnlyReceiptLeafCustodyTrustedV1(leafBase,128),true);
for(const mode of [0o4444,0o2444,0o1444]){
  assert.equal(
    testOnlyReceiptLeafCustodyTrustedV1({...leafBase,mode},128),
    false,
    "receipt_leaf_special_mode_accepted:"+mode.toString(8),
  );
}
assert.equal(
  testOnlyReceiptLeafCustodyTrustedV1({...leafBase,mode:0o644},128),
  false,
);
assert.equal(
  testOnlyReceiptLeafCustodyTrustedV1({...leafBase,uid:1},128),
  false,
);

const ancestor = Object.freeze({
  dev: 11,
  ino: 22,
  uid: 0,
  mode: 0o755,
});
testOnlyAssertReceiptAncestorStableV1(ancestor, {
  ...ancestor,
  directory: true,
});
for (const [label, current] of [
  ["uid", {...ancestor, uid: 1000, directory: true}],
  ["mode", {...ancestor, mode: 0o777, directory: true}],
  ["setuid", {...ancestor, mode: 0o4755, directory: true}],
  ["setgid", {...ancestor, mode: 0o2755, directory: true}],
  ["sticky", {...ancestor, mode: 0o1755, directory: true}],
  ["inode", {...ancestor, ino: 23, directory: true}],
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
    {...canonicalAncestor, ino: 23},
    {...canonicalAncestor},
    {...canonicalAncestor},
  ],
  [
    "reopened_inode",
    {...canonicalAncestor},
    {...canonicalAncestor, ino: 23},
    {...canonicalAncestor},
  ],
  [
    "after_inode",
    {...canonicalAncestor},
    {...canonicalAncestor},
    {...canonicalAncestor, ino: 23},
  ],
  [
    "reopened_uid",
    {...canonicalAncestor},
    {...canonicalAncestor, uid: 1000},
    {...canonicalAncestor},
  ],
  [
    "reopened_mode",
    {...canonicalAncestor},
    {...canonicalAncestor, mode: 0o777},
    {...canonicalAncestor},
  ],
  [
    "before_setuid",
    {...canonicalAncestor, mode: 0o4755},
    {...canonicalAncestor},
    {...canonicalAncestor},
  ],
  [
    "reopened_setgid",
    {...canonicalAncestor},
    {...canonicalAncestor, mode: 0o2755},
    {...canonicalAncestor},
  ],
  [
    "after_sticky",
    {...canonicalAncestor},
    {...canonicalAncestor},
    {...canonicalAncestor, mode: 0o1755},
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
console.log("four_reviewed_primitive_blobs_bound=true");
console.log("deployment_receipt_verified_against_live_source_identity=true");
console.log("three_live_selector_collections_required=true");
console.log("two_source_custody_requalifications_required=true");
console.log("installed_receipt_exact_bytes_match_required=true");
console.log("receipt_ancestor_descriptor_custody_required=true");
console.log("receipt_ancestor_post_read_revalidation_required=true");
console.log("receipt_canonical_ancestor_namespace_revalidated=true");
console.log("receipt_ancestor_revalidation_root_to_leaf=true");
console.log("receipt_parent_revalidated_last=true");
console.log("receipt_leaf_exact_mode_0444=true");
console.log("receipt_leaf_special_mode_bits_rejected=true");
console.log("receipt_canonical_namespace_drift_rejected=true");
console.log("receipt_ancestor_special_mode_drift_rejected=true");
console.log("receipt_ancestor_drift_rejected=true");
console.log("pre_post_live_generation_drift_rejected=true");
console.log("final_post_validation_generation_revalidated=true");
console.log("restart_during_final_validation_rejected=true");
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
