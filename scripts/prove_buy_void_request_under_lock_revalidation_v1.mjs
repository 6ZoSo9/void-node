// Actual source-extraction regression for Buy VOID public request intake.
// Source-only: isolated temporary files, simulated serialization lock,
// no HTTP listener, network, customer records, payment, signer or funds.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { persistBuyVoidPublicRequestUnderLaunchLockV1 } from "../dist/economic/buy_void_public_request_under_launch_lock_v1.js";

const NEW_SOURCE="src/index.ts";
const OLD_COMMIT="b3681475d8c8aee346db2f2feee6b5e9953ef9c1";
const OLD_BLOB="1fde828c97175560f98ab070af33eefc595f8002";
const NEW_BLOB="133599f4e2279ca0efe633c9f0ed9bd69c6e955c";
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0"))
    .update(bytes).digest("hex");
}
const oldBytes=execFileSync("git",["show",OLD_COMMIT+":"+NEW_SOURCE],{
  maxBuffer:8*1024*1024,encoding:"buffer",stdio:["ignore","pipe","pipe"]
});
const currentBytes=fs.readFileSync(NEW_SOURCE);
assert.equal(gitBlob(oldBytes),OLD_BLOB,"predecessor index bytes changed");
assert.equal(gitBlob(currentBytes),NEW_BLOB,"reviewed new index source drift");
const original=oldBytes.toString("utf8"),current=currentBytes.toString("utf8");
function take(src,start,end){
  const begin=src.indexOf(start);
  assert.ok(begin>=0,"missing source start "+start);
  const stop=src.indexOf(end,begin);
  assert.ok(stop>begin&&stop-begin<15000,"missing source end "+end);
  return src.slice(begin,stop);
}
const parts=[
  ["async function __voidReadBuyVoidRequestsV1(){","    const __boi=require"],
  ["async function __voidReadBuyVoidOperatorEventsV1(){","    async function __voidWriteBuyVoidOperatorEventV1"],
  ["function __voidApplyBuyVoidOperatorEventsV1(requests:any[], events:any[]){","    // VOID_BUY_VOID_OPERATOR_PAGE_V1"],
  ["function __voidBuyVoidTerminalStatusV1(status:any){","    app.get(\"/__void/buy-void/request.json\""],
];
const sources=parts.map(([a,b])=>take(current,a,b));
function persister(src,signature){
  return take(src,signature,"    function __voidBuyVoidReadParamV1");
}
const oldPersist=persister(original,"async function __voidPersistBuyVoidRequestV1(reqObj:any){");
const currentBridge=persister(current,"async function __voidPersistBuyVoidRequestV1(r:any){");
assert.match(oldPersist,/__blm\(reqObj,\(\)=>/u);
assert.doesNotMatch(oldPersist,/__voidReadBuyVoidRequestsV1/u);
assert.match(currentBridge,/import\("\.\/economic\/buy_void_public_request_under_launch_lock_v1[.]js"\)/u);
assert.match(currentBridge,/persistBuyVoidPublicRequestUnderLaunchLockV1\(r,\[__blm,__voidReadBuyVoidRequestsV1,__voidReadBuyVoidOperatorEventsV1,__voidApplyBuyVoidOperatorEventsV1,__voidBuyVoidTerminalStatusV1,__blo\]\)/u);
assert.equal(typeof persistBuyVoidPublicRequestUnderLaunchLockV1,"function");
const currentPost=take(current,'app.post("/__void/buy-void/request"',
  '    // VOID_PUBLIC_BUY_VOID_ROUTE_V1');
assert.match(currentPost,/if\(persisted\.reused_request\)/u);
assert.match(currentPost,/idempotent:true/u);
assert.match(currentPost,/d\?"one_active_request_per_void_destination"/u);

function factory(persistBlock,dir){
  const script=sources.join("\n")+"\n"+persistBlock;
  const transformed=ts.transpileModule(script,{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
    reportDiagnostics:true,
  });
  const errors=(transformed.diagnostics||[])
    .filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("\n"));
  let queue=Promise.resolve();
  let calls=0;
  const withAuthorityLock=async(_request,operation)=>{
    const prior=queue;
    let release=()=>{};
    queue=new Promise(resolve=>{release=resolve;});
    await prior;
    try{calls++;return await operation(()=>({ready:true}));}
    finally{release();}
  };
  const context=new Function("__blm","__blo","process",
    "voidIndexEmptyCatchVisibilityWindow17101_18000V1",
    transformed.outputText+"\nreturn {persist:__voidPersistBuyVoidRequestV1,readRequests:__voidReadBuyVoidRequestsV1,readEvents:__voidReadBuyVoidOperatorEventsV1,applyEvents:__voidApplyBuyVoidOperatorEventsV1,terminalStatus:__voidBuyVoidTerminalStatusV1};");
  const functions=context(withAuthorityLock,()=>true,{env:{VOID_BUY_REQUEST_DIR:dir}},()=>{});
  return { ...functions, withLock:withAuthorityLock, getCalls:()=>calls };
}
function request(id,amt="3.000000",chain="base",dest="1"){
  return Object.freeze({
    schema:"void_public_buy_void_checkout_request_v1",
    request_id:id,created_at_ms:1800000000000,
    void_destination_address:"0x"+dest.repeat(40),
    delivery_address:"0x"+dest.repeat(40),
    usdc_amount:Number(amt),requested_amount_usdc:Number(amt),
    source_chain:chain,payment_chain:chain,
    status:"awaiting_payment_tx_hash",
    tx_hash:"",launch_authority:Object.freeze({marker:"synthetic-only"}),
  });
}
function lines(dir,file="requests.jsonl"){
 const name=path.join(dir,file);
 if(!fs.existsSync(name))return [];
 return fs.readFileSync(name,"utf8").split("\n").filter(Boolean).map(JSON.parse);
}
function temp(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-buy-request-intake-lock-"));
 fs.chmodSync(root,0o700);
 return root;
}
{
 const root=temp();
 try{
   const old=factory(oldPersist,root);
   await Promise.all([old.persist(request("old-1")),old.persist(request("old-2"))]);
   assert.equal(lines(root).length,2,
     "negative control must reproduce duplicate append under sequential launch lock");
   assert.equal(old.getCalls(),2);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
{
 const root=temp();
 const originalDirectory=process.env.VOID_BUY_REQUEST_DIR;
 try{
   const readers=factory(oldPersist,root);
   const fresh={
     persist:(req)=>persistBuyVoidPublicRequestUnderLaunchLockV1(req,[
       readers.withLock,readers.readRequests,readers.readEvents,
       readers.applyEvents,readers.terminalStatus,()=>true,
     ]),
     getCalls:readers.getCalls,
   };
   process.env.VOID_BUY_REQUEST_DIR=root;
   const [first,second]=await Promise.all([
     fresh.persist(request("new-1")),fresh.persist(request("new-2")),
   ]);
   assert.equal(first.reused_request,null);
   assert.equal(second.reused_request?.request_id,"new-1");
   assert.equal(lines(root).length,1,"same request intent may persist only once");
   assert.equal(fresh.getCalls(),2);
   await assert.rejects(
     ()=>fresh.persist(request("mismatch-amount","4")),
     /buy_void_request_active_destination_changed_during_lock/u);
   await assert.rejects(
     ()=>fresh.persist(request("mismatch-chain","3","ethereum")),
     /buy_void_request_active_destination_changed_during_lock/u);
   assert.equal(lines(root).length,1,"rejects must not append");
   const independent=await fresh.persist(request("other-destination","3","base","2"));
   assert.equal(independent.reused_request,null);
   assert.equal(lines(root).length,2);
   fs.writeFileSync(path.join(root,"operator-events.jsonl"),
     JSON.stringify({request_id:"new-1",operator_status:"fulfilled",marked_at_ms:3})+"\n"+
     JSON.stringify({request_id:"other-destination",operator_status:"fulfilled",marked_at_ms:4})+"\n",
     {mode:0o600});
   const replacement=await fresh.persist(request("post-terminal"));
   assert.equal(replacement.reused_request,null);
   assert.equal(lines(root).length,3,
     "terminal old request permits a later distinct request");
 }finally{
   // Restore the real environment; disposable temp files only.
   if(typeof originalDirectory==="undefined")delete process.env.VOID_BUY_REQUEST_DIR;
   else process.env.VOID_BUY_REQUEST_DIR=originalDirectory;
   fs.rmSync(root,{recursive:true,force:true});
 }
}
// A previous writer may have already committed two active obligations for the
// same destination. Even if row one is an exact match, never idempotently
// adopt it while a second active request remains. This test uses the
// *actual* current compiled helper and the same guarded readers/lock.
{
 const root=temp();
 const saved=process.env.VOID_BUY_REQUEST_DIR;
 try {
   const historical=factory(oldPersist,root);
   const fresh={
     persist:(req)=>persistBuyVoidPublicRequestUnderLaunchLockV1(req,[
       historical.withLock,historical.readRequests,historical.readEvents,
       historical.applyEvents,historical.terminalStatus,()=>true,
     ]),
   };
   process.env.VOID_BUY_REQUEST_DIR=root;
   for (const [secondAmount,secondChain] of [
     ["4","ethereum"], // conflicting rail and amount
     ["3","base"], // duplicate identical obligation is still ambiguous
   ]) {
     const priorRows=[
       request("legacy-existing-a","3","base"),
       request("legacy-existing-b",secondAmount,secondChain),
     ];
     fs.writeFileSync(path.join(root,"requests.jsonl"),
       priorRows.map((row)=>JSON.stringify(row)).join("\n")+"\n",
       {mode:0o600});
     const before=fs.readFileSync(path.join(root,"requests.jsonl"));
     await assert.rejects(
       ()=>fresh.persist(request("later-attempt","3","base")),
       /buy_void_request_multiple_active_destination_under_lock/u,
       "preexisting multi-active history must HOLD instead of idempotent reuse",
     );
     assert.deepEqual(fs.readFileSync(path.join(root,"requests.jsonl")),before,
       "multi-active HOLD must not append any additional request");
   }
 } finally {
   if(typeof saved==="undefined")delete process.env.VOID_BUY_REQUEST_DIR;
   else process.env.VOID_BUY_REQUEST_DIR=saved;
   fs.rmSync(root,{recursive:true,force:true});
 }
}
// A tolerant legacy reader can skip a malformed historical JSONL row.
// Even under a correct launch lock, that partial read must not authorize
// another request. A valid on-disk row omitted from the reader also HOLDs.
{
 const root=temp();
 const prior=request("legacy-prior-request");
 const saved=process.env.VOID_BUY_REQUEST_DIR;
 try {
   process.env.VOID_BUY_REQUEST_DIR=root;
   const old=factory(oldPersist,root);
   const mutate=(reader)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
     request("candidate-new-request"),[
       old.withLock,reader,async()=>[],rows=>rows,()=>false,()=>true,
     ]);
   const corrupt=JSON.stringify(prior)+"\n"+"{broken}\n";
   fs.writeFileSync(path.join(root,"requests.jsonl"),corrupt,{mode:0o600});
   await assert.rejects(()=>mutate(async()=>[prior]),
     /buy_void_request_history_under_lock_malformed_row/u,
     "silently skipped malformed JSONL must HOLD");
   assert.equal(fs.readFileSync(path.join(root,"requests.jsonl"),"utf8"),
     corrupt,"malformed history must never be appended");
   assert.equal(fs.existsSync(path.join(root,"candidate-new-request.json")),false);
   const canonical=JSON.stringify(prior)+"\n";
   fs.writeFileSync(path.join(root,"requests.jsonl"),canonical,{mode:0o600});
   await assert.rejects(()=>mutate(async()=>[]),
     /buy_void_request_history_under_lock_noncanonical_or_omitted_row/u,
     "reader omission of a durable canonical row must HOLD");
   assert.equal(fs.readFileSync(path.join(root,"requests.jsonl"),"utf8"),
     canonical,"omitted history must never be appended");
   assert.equal(fs.existsSync(path.join(root,"candidate-new-request.json")),false);
   // A tolerant reader that keeps one row for a duplicated request_id
   // can still hide a second, conflicting durable active obligation.
   // The authoritative lock check must use *all raw canonical rows*.
   const sameIdFirst=request("same-id","3","base","1");
   const sameIdSecond=request("same-id","4","ethereum","1");
   const conflict=[sameIdFirst,sameIdSecond]
     .map(row=>JSON.stringify(row)).join("\n")+"\n";
   fs.writeFileSync(path.join(root,"requests.jsonl"),conflict,{mode:0o600});
   await assert.rejects(()=>mutate(async()=>[sameIdFirst]),
     /buy_void_request_multiple_active_destination_under_lock/u,
     "same-ID filtered conflicting obligation must HOLD");
   assert.equal(fs.readFileSync(path.join(root,"requests.jsonl"),"utf8"),
     conflict,"same-ID omission cannot append or replace a durable row");
   assert.equal(fs.existsSync(path.join(root,"candidate-new-request.json")),false);
 } finally {
   if(typeof saved==="undefined")delete process.env.VOID_BUY_REQUEST_DIR;
   else process.env.VOID_BUY_REQUEST_DIR=saved;
   fs.rmSync(root,{recursive:true,force:true});
 }
}
// The launch authority is checked by the canonical bakery lock *before*
// invoking the operation, but the helper awaits request/event history while
// holding that lock. Expiration during the awaited read must prevent both
// a new request append and a successful reuse of an older request.
for (const existing of [false, true]) {
 const root=temp();
 const saved=process.env.VOID_BUY_REQUEST_DIR;
 let startedRead;
 let releaseRead;
 const reading=new Promise(resolve=>{startedRead=resolve;});
 const released=new Promise(resolve=>{releaseRead=resolve;});
 let leaseValid=true;
 let checks=0;
 const assertCurrentAuthority=()=>{
   checks++;
   if (!leaseValid) {
     throw new Error("request_launch_authority_expired_or_superseded");
   }
   return {ready:true};
 };
 const locked=async (_request,operation)=>{
   // Match the real gate's admission behavior: first check before callback.
   assertCurrentAuthority();
   return operation(assertCurrentAuthority);
 };
 const req=request("expiry-control");
 try {
   process.env.VOID_BUY_REQUEST_DIR=root;
   // Reuse uses a canonical request reader result; this is all synthetic,
   // with no live request, service or operator credential access.
   const pending=persistBuyVoidPublicRequestUnderLaunchLockV1(req,[
     locked,
     async()=>{
       startedRead();
       await released;
       return existing ? [req] : [];
     },
     async()=>[],
     requests=>requests,
     ()=>false,
     ()=>true,
   ]);
   await reading;
   leaseValid=false;
   releaseRead();
   await assert.rejects(pending,
     /request_launch_authority_expired_or_superseded/u);
   assert.equal(checks,2,
     "under-lock authority must be revalidated after async reads");
   assert.equal(fs.existsSync(path.join(root,"requests.jsonl")),false,
     "expired lease must not append even one request");
   assert.equal(fs.existsSync(path.join(root,req.request_id+".json")),false,
     "expired lease must not create a request sidecar");
 } finally {
   leaseValid=false;
   releaseRead();
   if(typeof saved==="undefined")delete process.env.VOID_BUY_REQUEST_DIR;
   else process.env.VOID_BUY_REQUEST_DIR=saved;
   fs.rmSync(root,{recursive:true,force:true});
 }
}
// A mock lock that discards the actual gate revalidation capability may
// never qualify any request byte append or idempotent response.
{
 const root=temp();
 const saved=process.env.VOID_BUY_REQUEST_DIR;
 try {
   process.env.VOID_BUY_REQUEST_DIR=root;
   await assert.rejects(
     ()=>persistBuyVoidPublicRequestUnderLaunchLockV1(request("missing-gate"),[
       async(_request,operation)=>operation(undefined),
       async()=>[],async()=>[],requests=>requests,()=>false,()=>true,
     ]),
     /buy_void_request_launch_revalidator_missing/u,
   );
   assert.equal(fs.existsSync(path.join(root,"requests.jsonl")),false);
 } finally {
   if(typeof saved==="undefined")delete process.env.VOID_BUY_REQUEST_DIR;
   else process.env.VOID_BUY_REQUEST_DIR=saved;
   fs.rmSync(root,{recursive:true,force:true});
 }
}
console.log("VOID_BUY_VOID_REQUEST_LOCK_REVALIDATION_SOURCE_V1_GREEN");
console.log("negative_predecessor_duplicate_append_observed=true");
console.log("current_concurrent_same_intent_exactly_one_append=true");
console.log("expired_launch_lease_after_history_read_holds=true");
console.log("expired_launch_lease_before_reused_response_holds=true");
console.log("missing_under_lock_revalidator_holds=true");
console.log("current_same_intent_returns_existing_request=true");
console.log("prior_multi_active_destination_never_idempotent=true");
console.log("prior_multi_active_conflicting_rail_and_amount_holds=true");
console.log("malformed_durable_request_history_holds=true");
console.log("silently_omitted_durable_request_holds=true");
console.log("same_id_partial_history_never_authoritative=true");
console.log("current_mismatched_amount_and_rail_hold_without_append=true");
console.log("different_destination_allowed=true");
console.log("terminal_status_allows_subsequent_request=true");
console.log("existing_economic_writers_modified=false");
console.log("compiled_public_request_admission_helper_used=true");
console.log("src_index_size_guard_preserved=true");
console.log("production_request_route_deployed=false");
console.log("live_payment_or_allocation_performed=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
