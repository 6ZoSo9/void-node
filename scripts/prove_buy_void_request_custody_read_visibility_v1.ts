import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  persistBuyVoidPublicRequestUnderLaunchLockV1,
} from "../src/economic/buy_void_public_request_under_launch_lock_v1.js";
import {
  testOnlyReadStrictCapacityCensusV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_ENABLED_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1,
  VOID_BUY_VOID_REQUEST_CUSTODY_READ_POLICY_AUTHORITY_V1,
  parseBuyVoidRequestCustodyReadGidV1,
} from "../src/economic/buy_void_request_custody_read_policy_v1.js";

const MARKER="VOID_BUY_VOID_REQUEST_CUSTODY_READ_VISIBILITY_V1";
const REQUESTS="requests.jsonl";
const EVENTS="operator-events.jsonl";

function mode(file:string):number {
  return fs.lstatSync(file).mode & 0o7777;
}
function rows(file:string):any[] {
  const raw=fs.readFileSync(file,"utf8");
  if(!raw)return [];
  return raw.split("\n").filter(Boolean).map((line)=>JSON.parse(line));
}
function req(id:string,digit:string){
  return Object.freeze({
    schema:"void_public_buy_void_checkout_request_v1",
    request_id:id,
    created_at_ms:1800000000000,
    void_destination_address:"0x"+digit.repeat(40),
    delivery_address:"0x"+digit.repeat(40),
    usdc_amount:3,
    requested_amount_usdc:3,
    quoted_void:"6.000000",
    source_chain:"base",
    payment_chain:"base",
    status:"awaiting_payment_tx_hash",
    tx_hash:"",
    launch_authority:Object.freeze({marker:"synthetic-only"}),
  });
}
async function persist(root:string,input:any){
  process.env.VOID_BUY_REQUEST_DIR=root;
  let lockCalls=0;
  const withLaunchMutation=async(
    _request:any,
    operation:(revalidate:()=>unknown)=>Promise<any>|any,
  )=>{
    lockCalls+=1;
    return await operation(()=>Object.freeze({ready:true}));
  };
  const result=await persistBuyVoidPublicRequestUnderLaunchLockV1(input,[
    withLaunchMutation,
    async()=>rows(path.join(root,REQUESTS)),
    async()=>rows(path.join(root,EVENTS)),
    (requests:any[])=>requests,
    ()=>false,
    ()=>true,
  ]);
  assert.equal(lockCalls,1);
  return result;
}
async function rejects(action:()=>Promise<unknown>|unknown,pattern:RegExp){
  let error:unknown=null;
  try{await action();}catch(caught){error=caught;}
  assert.ok(error instanceof Error,"expected fail-closed exception");
  assert.match(error.message,pattern);
}

assert.equal(process.platform,"linux");
assert.equal(typeof process.getuid,"function");
assert.equal(typeof process.getgid,"function");
const uid=process.getuid!();
const gid=process.getgid!();
assert.equal(
  process.env[VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1],
  String(gid),
  "workflow must bind the proof to its real primary gid",
);
assert.equal(VOID_BUY_VOID_REQUEST_CUSTODY_READ_ENABLED_V1,true);
assert.equal(VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_V1,gid);
assert.equal(parseBuyVoidRequestCustodyReadGidV1(undefined),null);
assert.equal(parseBuyVoidRequestCustodyReadGidV1(""),null);
assert.equal(parseBuyVoidRequestCustodyReadGidV1(String(gid)),gid);
for(const raw of ["0","-1"," 1","1 ","01","abc","2147483648"]){
  assert.throws(
    ()=>parseBuyVoidRequestCustodyReadGidV1(raw),
    /buy_void_request_custody_read_gid_invalid/u,
    raw,
  );
}

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-buy-custody-readable-request-"));
const shared=path.join(root,"requests");
const absent=path.join(root,"absent");
try{
  fs.mkdirSync(shared,{mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1});
  fs.chmodSync(shared,VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1);
  const requests=path.join(shared,REQUESTS);
  const events=path.join(shared,EVENTS);
  fs.writeFileSync(requests,"",{mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1});
  fs.writeFileSync(events,"",{mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1});
  fs.chmodSync(requests,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);
  fs.chmodSync(events,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);

  const created=await persist(shared,req("buyvoid_shared_aaaaaaaa","1"));
  assert.equal(created.reused_request,null);
  assert.equal(created.file!==null,true);
  assert.equal(mode(shared),VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1);
  assert.equal(fs.lstatSync(shared).uid,uid);
  assert.equal(fs.lstatSync(shared).gid,gid);
  assert.equal(mode(requests),VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);
  assert.equal(fs.lstatSync(requests).gid,gid);
  assert.equal(mode(events),VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);
  assert.equal(fs.lstatSync(events).gid,gid);
  assert.equal(rows(requests).length,1);
  const sidecar=path.join(shared,"buyvoid_shared_aaaaaaaa.json");
  assert.equal(mode(sidecar),0o600);
  assert.equal((mode(sidecar)&0o040)!==0,false,"customer sidecar must not become group-readable");

  const census=testOnlyReadStrictCapacityCensusV1(shared,10_000_000n,()=>{});
  assert.equal(census.verified_void_micro,0n);
  assert.equal(census.request_quotes.size,1);

  fs.chmodSync(requests,0o600);
  assert.throws(
    ()=>testOnlyReadStrictCapacityCensusV1(shared,10_000_000n,()=>{}),
    /buy_void_verified_payment_capacity_requests_file_invalid/u,
  );
  await rejects(
    ()=>persist(shared,req("buyvoid_shared_bbbbbbbb","2")),
    /private_existing_leaf_owner_or_mode/u,
  );
  fs.chmodSync(requests,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);

  fs.chmodSync(events,0o660);
  assert.throws(
    ()=>testOnlyReadStrictCapacityCensusV1(shared,10_000_000n,()=>{}),
    /buy_void_verified_payment_capacity_operator_events_file_invalid/u,
  );
  fs.chmodSync(events,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);

  fs.chmodSync(shared,0o750);
  await rejects(
    ()=>persist(shared,req("buyvoid_shared_cccccccc","3")),
    /private_directory_owner_or_mode/u,
  );
  fs.chmodSync(shared,VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1);

  process.env.VOID_BUY_REQUEST_DIR=absent;
  await rejects(
    ()=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      req("buyvoid_shared_dddddddd","4"),
      [
        async(_request:any,operation:any)=>await operation(()=>({ready:true})),
        async()=>[],
        async()=>[],
        (requests:any[])=>requests,
        ()=>false,
        ()=>true,
      ],
    ),
    /private_directory_metadata_unavailable/u,
  );
  assert.equal(fs.existsSync(absent),false,"shared mode must not create an unprovisioned root");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}

for(const [key,expected] of Object.entries({
  opt_in_only:true,
  absolute_preprovisioned_request_root_required:true,
  runtime_uid_remains_owner:true,
  dedicated_ipc_gid_required:true,
  request_directory_setgid_required:true,
  fixed_journals_group_readable_only:true,
  customer_sidecars_group_readable:false,
  operator_sidecars_group_readable:false,
  group_write_authority:false,
  other_read_authority:false,
  custody_write_authority:false,
  service_mutation:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(
    (VOID_BUY_VOID_REQUEST_CUSTODY_READ_POLICY_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

console.log(MARKER+"_GREEN");
console.log("request_directory_mode=2750");
console.log("fixed_journal_mode=0640");
console.log("customer_sidecar_mode=0600");
console.log("operator_sidecar_group_readable=false");
console.log("shared_mode_preprovision_required=true");
console.log("legacy_mode_default_preserved=true");
console.log("custody_write_authority=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
