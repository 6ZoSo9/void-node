#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1,
} from "../src/economic/buy_void_request_custody_read_policy_v1.ts";
import {
  VOID_BUY_VOID_REQUEST_ROOT_HOST_EXPECTED_V1,
  VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_AUTHORITY_V1,
  VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1,
  VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1,
  classifyBuyVoidRequestRootHostProfileV1,
  inspectBuyVoidRequestRootHostProfileV1,
} from "../tools/void-buy-request-root-host-profile-v1.mjs";

const expected=VOID_BUY_VOID_REQUEST_ROOT_HOST_EXPECTED_V1;
assert.equal(
  VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1,
  "VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1",
);
assert.match(
  VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1,
  /^voidbuyreqroot1_[0-9a-f]{64}$/u,
);

assert.equal(
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1,
  "VOID_BUY_REQUEST_CUSTODY_READ_GID",
);
assert.equal(
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  0o750,
);
assert.equal(
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1,
  0o640,
);

assert.equal(expected.request_root,"/var/lib/void-buy-requests-v1");
assert.equal(expected.runtime_user,"zoso");
assert.equal(expected.runtime_uid,1000);
assert.equal(expected.runtime_gid,1000);
assert.equal(expected.ipc_group,"void-buy-custody-ipc");
assert.equal(expected.ipc_gid,980);
assert.equal(expected.request_root_owner_uid,expected.runtime_uid);
assert.equal(expected.request_root_group_gid,expected.ipc_gid);
assert.equal(expected.request_root_mode,"0750");
assert.equal(expected.customer_sidecar_mode,"0600");
assert.equal(expected.operator_sidecar_mode,"0600");
assert.deepEqual(expected.environment,{
  VOID_BUY_REQUEST_DIR:"/var/lib/void-buy-requests-v1",
  VOID_BUY_REQUEST_CUSTODY_READ_GID:"980",
});
assert.deepEqual(
  expected.fixed_journals.map(x=>[x.name,x.owner_uid,x.group_gid,x.mode]),
  [
    ["requests.jsonl",1000,980,"0640"],
    ["operator-events.jsonl",1000,980,"0640"],
  ],
);
for(const forbidden of [
  "/opt/void-node-live",
  "/var/lib/void-allocation-ledger-v1",
  "/var/lib/void-allocation-custody-v1",
]){
  assert.equal(
    expected.request_root===forbidden||
      expected.request_root.startsWith(forbidden+"/")||
      forbidden.startsWith(expected.request_root+"/"),
    false,
    "request_root_overlap:"+forbidden,
  );
}

const positive=classifyBuyVoidRequestRootHostProfileV1(expected);
assert.equal(positive.ok,true);
assert.equal(positive.status,"SOURCE_EXPECTED_REQUEST_ROOT_PROFILE_GREEN");
assert.equal(positive.stable_request_root_path_selected,true);
assert.equal(positive.request_root_provisioned,false);
assert.equal(positive.runtime_environment_installed,false);
assert.equal(positive.historical_request_data_disposition_proven,false);

for(const mutate of [
  x=>{x.request_root="/opt/void-node-live/current/.runtime/public-buy-void-requests-v1";},
  x=>{x.runtime_uid=995;},
  x=>{x.ipc_gid=981;},
  x=>{x.request_root_mode="0770";},
  x=>{x.fixed_journals[0].mode="0660";},
  x=>{x.fixed_journals[1].group_gid=981;},
  x=>{x.customer_sidecar_mode="0640";},
  x=>{x.environment.VOID_BUY_REQUEST_CUSTODY_READ_GID="981";},
  x=>{x.extra=true;},
]){
  const candidate=structuredClone(expected);
  mutate(candidate);
  const result=classifyBuyVoidRequestRootHostProfileV1(candidate);
  assert.equal(result.ok,false);
  assert.equal(result.reason,"buy_void_request_root_host_profile_identity_mismatch");
}

for(const [key,value] of Object.entries({
  source_profile_only:true,
  stable_request_root_path_selected:true,
  immutable_release_tree_forbidden:true,
  runtime_uid_remains_owner:true,
  custody_ipc_gid_read_only_visibility_selected:true,
  fixed_journal_preprovisioning_required:true,
  fixed_journal_group_write_forbidden:true,
  customer_sidecars_remain_private:true,
  operator_sidecars_remain_private:true,
  parent_path_live_reverification_required:true,
  historical_request_data_disposition_proven:false,
  existing_request_data_migration_authorized:false,
  request_root_provisioned:false,
  runtime_environment_installed:false,
  runtime_group_membership_mutation:false,
  service_restart:false,
  host_mutation:false,
  custody_write_authority:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_AUTHORITY_V1[key],value,key);
}

const inspected=inspectBuyVoidRequestRootHostProfileV1();
assert.equal(inspected.expected.request_root,expected.request_root);

const source=fs.readFileSync(
  "tools/void-buy-request-root-host-profile-v1.mjs",
  "utf8",
);
for(const forbidden of [
  "node:fs","node:child_process","systemctl","sudo ","chmod","chown",
  "writeFile","mkdir","rename","unlink","/proc/",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1_GREEN");
console.log("profile_id="+VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_ID_V1);
console.log("request_root=/var/lib/void-buy-requests-v1");
console.log("request_root_mode=0750");
console.log("journal_mode=0640");
console.log("runtime_uid=1000");
console.log("ipc_gid=980");
console.log("request_root_provisioned=false");
console.log("runtime_environment_installed=false");
console.log("historical_request_data_disposition_proven=false");
console.log("host_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
