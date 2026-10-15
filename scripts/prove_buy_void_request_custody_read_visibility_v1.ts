import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  persistBuyVoidPublicRequestUnderLaunchLockV1,
} from "../src/economic/buy_void_public_request_under_launch_lock_v1.js";
import {
  testOnlyReadStrictCapacityCensusV1,
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
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

if (!VOID_BUY_VOID_REQUEST_CUSTODY_READ_ENABLED_V1) {
  assert.equal(
    process.env[VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_ENV_V1],
    undefined,
    "legacy proof requires custody-readable gid env to be absent",
  );
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-buy-legacy-private-request-"),
  );
  const legacyRoot=path.join(root,"requests");
  const legacyRequest=req("buyvoid_legacy_aaaaaaaa","8");
  const readMaybe=(file:string):any[]=>{
    if(!fs.existsSync(file))return [];
    return rows(file);
  };
  let lockCalls=0;
  try {
    process.env.VOID_BUY_REQUEST_DIR=legacyRoot;
    const result=await persistBuyVoidPublicRequestUnderLaunchLockV1(
      legacyRequest,
      [
        async(_request:any,operation:any)=>{
          lockCalls+=1;
          return await operation(()=>({ready:true}));
        },
        async()=>readMaybe(path.join(legacyRoot,REQUESTS)),
        async()=>readMaybe(path.join(legacyRoot,EVENTS)),
        (requests:any[])=>requests,
        ()=>false,
        ()=>true,
      ],
    );
    assert.equal(lockCalls,1);
    assert.equal(result.reused_request,null);
    assert.equal(fs.existsSync(legacyRoot),true);
    assert.equal(mode(legacyRoot),0o700);
    assert.equal(mode(path.join(legacyRoot,REQUESTS)),0o600);
    assert.equal(
      mode(path.join(legacyRoot,legacyRequest.request_id+".json")),
      0o600,
    );
    assert.equal(fs.existsSync(path.join(legacyRoot,EVENTS)),false);
    assert.equal(rows(path.join(legacyRoot,REQUESTS)).length,1);
    console.log(MARKER+"_LEGACY_DEFAULT_GREEN");
    console.log("legacy_request_directory_mode=0700");
    console.log("legacy_request_journal_mode=0600");
    console.log("legacy_customer_sidecar_mode=0600");
    console.log("legacy_mode_create_on_first_request=true");
    console.log("custody_write_authority=false");
    console.log("payment_acceptance=false");
    console.log("public_presale_activation=false");
    console.log("funds_movement=false");
  } finally {
    delete process.env.VOID_BUY_REQUEST_DIR;
    fs.rmSync(root,{recursive:true,force:true});
  }
  process.exit(0);
}

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

  // Shared mode requires both fixed journals to exist before first use.
  // A zero-byte operator journal must not be mistaken for prior history.
  const sharedRequest=req("buyvoid_shared_aaaaaaaa","1");
  const created=await persist(shared,sharedRequest);
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

  // Preserve the original rollback fence: an empty request journal plus
  // nonempty operator history is still surviving history and must HOLD.
  const surviving=path.join(root,"surviving-operator-history");
  fs.mkdirSync(surviving,{mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1});
  fs.chmodSync(surviving,VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1);
  const survivingRequests=path.join(surviving,REQUESTS);
  const survivingEvents=path.join(surviving,EVENTS);
  fs.writeFileSync(survivingRequests,"",{mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1});
  fs.writeFileSync(
    survivingEvents,
    JSON.stringify({schema:"synthetic_surviving_operator_history_v1"})+"\n",
    {mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1},
  );
  fs.chmodSync(survivingRequests,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);
  fs.chmodSync(survivingEvents,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);
  await rejects(
    ()=>persist(surviving,req("buyvoid_shared_survivor","9")),
    /missing_or_empty_with_surviving_history/u,
  );

  const sidecar=path.join(shared,"buyvoid_shared_aaaaaaaa.json");
  assert.equal(mode(sidecar),0o600);
  assert.equal((mode(sidecar)&0o040)!==0,false,"customer sidecar must not become group-readable");

  const reviewedEvent=Object.freeze({
    schema:"void_buy_void_operator_mark_v1",
    ok:true,
    request_id:sharedRequest.request_id,
    operator_status:"reviewed",
    marked_at_ms:1800000000100,
    quoted_void:sharedRequest.quoted_void,
  });
  const terminalResult=await writeBuyVoidOperatorEventWithCapacityAdmissionV1({
    event:reviewedEvent,
    request:sharedRequest,
    request_dir:shared,
    with_launch_authority_mutation:async()=>{
      assert.fail("reviewed status must not invoke payment launch");
    },
    read_sale_state:async()=>{
      assert.fail("reviewed status must not read sale state");
    },
  });
  assert.equal(terminalResult.ok,true);
  assert.equal(rows(events).length,1);
  const operatorSidecar=path.join(
    shared,
    "operator-event-"+sharedRequest.request_id+"-1800000000100.json",
  );
  assert.equal(mode(operatorSidecar),0o600);
  assert.equal(
    (mode(operatorSidecar)&0o040)!==0,
    false,
    "operator sidecar must remain private in custody-readable mode",
  );
  const capacitySource=fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
    ),
    "utf8",
  );
  assert.match(
    capacitySource,
    /function openPinnedPrivateSidecarV1\(/u,
  );
  assert.match(
    capacitySource,
    /const final = openPinnedPrivateSidecarV1\([\s\S]*?sidecarName, code,/u,
  );
  assert.match(
    capacitySource,
    /function validatePrivateSidecarStatV1\([\s\S]*?\(Number\(stat\.mode\) & 0o7777\) !== 0o600/u,
  );

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

  fs.chmodSync(shared,0o700);
  await rejects(
    ()=>persist(shared,req("buyvoid_shared_cccccccc","3")),
    /private_directory_owner_or_mode/u,
  );
  fs.chmodSync(shared,VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1);

  const realParent=path.join(root,"real-parent");
  const realAliasRoot=path.join(realParent,"requests");
  const aliasParent=path.join(root,"alias-parent");
  fs.mkdirSync(realAliasRoot,{recursive:true,mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1});
  fs.chmodSync(realAliasRoot,VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1);
  for(const name of [REQUESTS,EVENTS]){
    const file=path.join(realAliasRoot,name);
    fs.writeFileSync(file,"",{mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1});
    fs.chmodSync(file,VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1);
  }
  fs.symlinkSync(realParent,aliasParent,"dir");
  const aliasedRoot=path.join(aliasParent,"requests");
  await rejects(
    ()=>persist(aliasedRoot,req("buyvoid_shared_ffffffff","6")),
    /custody_readable_directory_alias_forbidden/u,
  );
  assert.throws(
    ()=>testOnlyReadStrictCapacityCensusV1(aliasedRoot,10_000_000n,()=>{}),
    /buy_void_verified_payment_capacity_request_directory_alias_forbidden/u,
  );

  const missingJournalRoot=path.join(root,"missing-journal");
  fs.mkdirSync(missingJournalRoot,{
    mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  });
  fs.chmodSync(
    missingJournalRoot,
    VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  );
  fs.writeFileSync(
    path.join(missingJournalRoot,EVENTS),
    "",
    {mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1},
  );
  fs.chmodSync(
    path.join(missingJournalRoot,EVENTS),
    VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1,
  );
  process.env.VOID_BUY_REQUEST_DIR=missingJournalRoot;
  let missingRequestReaderCalls=0;
  await rejects(
    ()=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      req("buyvoid_shared_eeeeeeee","5"),
      [
        async(_request:any,operation:any)=>await operation(()=>({ready:true})),
        async()=>{missingRequestReaderCalls+=1;assert.fail("request reader must not run before shared journal preflight");},
        async()=>{missingRequestReaderCalls+=1;assert.fail("event reader must not run before shared journal preflight");},
        (requests:any[])=>requests,
        ()=>false,
        ()=>true,
      ],
    ),
    /custody_readable_journal_not_preprovisioned/u,
  );
  assert.equal(missingRequestReaderCalls,0);
  assert.equal(
    fs.existsSync(path.join(missingJournalRoot,REQUESTS)),
    false,
    "shared runtime must not create the fixed request journal",
  );

  const missingEventRoot=path.join(root,"missing-event-journal");
  fs.mkdirSync(missingEventRoot,{
    mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  });
  fs.chmodSync(
    missingEventRoot,
    VOID_BUY_VOID_REQUEST_CUSTODY_READ_DIRECTORY_MODE_V1,
  );
  fs.writeFileSync(
    path.join(missingEventRoot,REQUESTS),
    "",
    {mode:VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1},
  );
  fs.chmodSync(
    path.join(missingEventRoot,REQUESTS),
    VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1,
  );
  process.env.VOID_BUY_REQUEST_DIR=missingEventRoot;
  let missingEventReaderCalls=0;
  await rejects(
    ()=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      req("buyvoid_shared_event_missing","7"),
      [
        async(_request:any,operation:any)=>await operation(()=>({ready:true})),
        async()=>{missingEventReaderCalls+=1;assert.fail("request reader must not run before both shared journals qualify");},
        async()=>{missingEventReaderCalls+=1;assert.fail("event reader must not run before both shared journals qualify");},
        (requests:any[])=>requests,
        ()=>false,
        ()=>true,
      ],
    ),
    /custody_readable_journal_not_preprovisioned/u,
  );
  assert.equal(missingEventReaderCalls,0);

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
    /custody_readable_directory_realpath_unavailable/u,
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
  request_directory_group_read_execute_required:true,
  fixed_journals_preprovisioned_required:true,
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
console.log("request_directory_mode=0750");
console.log("fixed_journal_mode=0640");
console.log("customer_sidecar_mode=0600");
console.log("operator_sidecar_mode=0600");
console.log("operator_sidecar_private_reopen_path=true");
console.log("operator_sidecar_group_readable=false");
console.log("shared_mode_preprovision_required=true");
console.log("shared_journal_preflight_precedes_reader_callbacks=true");
console.log("legacy_mode_default_preserved=true");
console.log("custody_write_authority=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
