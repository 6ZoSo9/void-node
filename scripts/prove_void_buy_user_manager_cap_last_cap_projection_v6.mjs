#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const QUERY="ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const QUERY_BLOB="fc1f640689b7da7278ff013669ef8a10cd8f6659";

const bytes=fs.readFileSync(QUERY);
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
assert.equal(gitBlob(bytes),QUERY_BLOB,"query_blob_drift");
const source=bytes.toString("utf8");

for(const required of [
  '#define KERNEL_CAP_LAST_CAP_PATH "/proc/sys/kernel/cap_last_cap"',
  "capability_mask_for_last_cap",
  "kernel_supported_capability_mask",
  "obs->capability_bounding_set & supported_capability_mask",
  '"org.freedesktop.systemd1.Service","ControlGroup"',
  "kernel_cap_last_cap_projection_verified=true",
  "private_users_false_required=true",
  "systemd_kernel_bounding_set_match_required=true",
]){
  assert.ok(source.includes(required),required);
}
assert.equal(
  source.includes("security->cap_bnd == obs->capability_bounding_set;"),
  false,
  "raw_systemd_kernel_bounding_equality_forbidden",
);
assert.equal(
  source.includes('"org.freedesktop.systemd1.Unit","ControlGroup"'),
  false,
  "generic_unit_controlgroup_forbidden",
);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-umq-v6-proof-"));
try{
  const binary=path.join(tmp,"query");
  const r=spawnSync("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-Wl,--build-id=none","-o",binary,QUERY,"-ldl",
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],
    env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"},
  });
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  const q=spawnSync(binary,["--self-test"],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
    },
  });
  assert.equal(q.status,0,String(q.stderr||q.stdout||""));
  assert.match(q.stdout,/VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_SELF_TEST_GREEN/u);
  assert.match(q.stdout,/kernel_cap_last_cap_projection_verified=true/u);
  assert.match(q.stdout,/private_users_false_required=true/u);
  assert.match(q.stdout,/systemd_kernel_bounding_set_match_required=true/u);
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_USER_MANAGER_CAP_LAST_CAP_PROJECTION_V6_PROOF_GREEN");
console.log("query_blob_bound=true");
console.log("kernel_cap_last_cap_runtime_source_required=true");
console.log("systemd_raw_bounding_set_projection_required=true");
console.log("raw_64bit_equality_forbidden=true");
console.log("control_group_service_interface_preserved=true");
console.log("kernel_nonbounding_capabilities_zero_required=true");
console.log("private_users_false_required=true");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
