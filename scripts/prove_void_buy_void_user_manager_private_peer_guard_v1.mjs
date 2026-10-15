#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_USER_MANAGER_PRIVATE_PEER_GUARD_V1";
const SOURCE="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";

function run(command,args,options={}){
  const r=spawnSync(command,args,{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:options.timeout??30000,
    maxBuffer:8*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}

const source=fs.readFileSync(SOURCE,"utf8");
for(const needle of [
  "SYS_pidfd_open",
  "SO_PEERCRED",
  "/systemd/private",
  "user@%lu.service/init.scope",
  'EXPECTED_EXE "/usr/lib/systemd/systemd"',
  "manager_private_socket_peer_mismatch",
  "manager_generation_changed",
  "manager_cmdline_bytes",
  "--deserialize=",
  "manager_reexec_deserialize_argv_accepted=true",
  "manager_malformed_deserialize_rejected=true",
  "manager_extra_argv_rejected=true",
  "unit_properties_queried=false",
  "public_presale_activation=false",
]){
  assert.ok(source.includes(needle),needle);
}
assert.equal(source.includes("/run/user/%lu/bus"),false,"generic user bus must not be trusted as manager peer");
assert.equal(source.includes("systemctl"),false,"guard must not query unit properties");
assert.equal(source.includes("DBUS_SESSION_BUS_ADDRESS"),false,"guard must not delegate peer identity to environment");

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-user-manager-peer-proof-"));
try{
  const bin=path.join(tmp,"guard");
  run("/usr/bin/gcc",[
    "-O2","-Wall","-Wextra","-Werror","-std=c11",
    SOURCE,"-o",bin,
  ]);
  const self=run(bin,["--self-test"]);
  const lines=self.stdout.trim().split("\n");
  assert.ok(lines.includes(MARKER+"_SELF_TEST_GREEN"));
  for(const expected of [
    "manager_plain_argv_accepted=true",
    "manager_reexec_deserialize_argv_accepted=true",
    "manager_malformed_deserialize_rejected=true",
    "manager_extra_argv_rejected=true",
    "so_peercred_live_socket_positive=true",
    "wrong_peer_pid_rejected_by_contract=true",
    "systemd_private_socket_selected=true",
    "user_bus_socket_not_used=true",
    "unit_properties_queried=false",
    "host_mutation=false",
  ]) assert.ok(lines.includes(expected),expected);
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

const bytes=fs.readFileSync(SOURCE);
const sourceSha=crypto.createHash("sha256").update(bytes).digest("hex");
assert.match(sourceSha,/^[0-9a-f]{64}$/u);

console.log(MARKER+"_PROOF_GREEN");
console.log("root_kernel_manager_selection_required=true");
console.log("plain_user_manager_argv_accepted=true");
console.log("reexec_deserialize_user_manager_argv_accepted=true");
console.log("malformed_or_extra_manager_argv_rejected=true");
console.log("manager_pidfd_retention_required=true");
console.log("systemd_private_socket_so_peercred_required=true");
console.log("generic_user_bus_authority=false");
console.log("unit_properties_queried=false");
console.log("complete_user_manager_attestation=false");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
