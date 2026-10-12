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
const NEW_BLOB="8198912a70c8db0c81dad5d341cb4a779906c851";
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
// Public URL/amount/chain is NOT caller authentication. The predecessor's
// pre-lock fast return exposed full buyer metadata and bypassed strict history.
const oldPost=take(original,'app.post("/__void/buy-void/request"',
  '    // VOID_PUBLIC_BUY_VOID_ROUTE_V1');
assert.match(oldPost,/request:\s*activeForDestination/u);
assert.match(oldPost,/existing_request_id/u);
assert.doesNotMatch(currentPost,/existing_request_id|existing_status|request:\s*activeForDestination|request:\s*persisted\.reused_request/u);
assert.doesNotMatch(currentPost,/const existingRequests\s*=\s*await __voidReadBuyVoidRequestsV1\(/u);
assert.doesNotMatch(currentPost,/const existingEvents\s*=\s*await __voidReadBuyVoidOperatorEventsV1\(/u);
assert.doesNotMatch(currentPost,/idempotent:true/u);
assert.match(currentPost,/if\(persisted\.reused_request\)\s*\{\s*return res\.status\(409\)\.json\(/u);
assert.match(currentPost,/conflict\?"one_active_request_per_void_destination"/u);

// Execute the exact compiled-safe current route response branch with a
// stranger's same-intent request; no prior ID, account, note or payment
// metadata may enter the public wire result.
const reuseBranch=take(currentPost,"if(persisted.reused_request){",
  "requestObj.persisted =");
const emitReuse=new Function("persisted","res",reuseBranch);
const storedSecrets=Object.freeze({
  request_id:"SECRET_PRIOR_REQUEST_ID",
  account:"SECRET_PRIVATE_ACCOUNT",
  note:"SECRET_PRIVATE_NOTE",
  payment_metadata:"SECRET_PRIVATE_PAYMENT",
});
const observedReuse={
  status_code:0,body:null,
  status(code){this.status_code=code;return this;},
  json(body){this.body=body;return this;},
};
emitReuse({reused_request:storedSecrets},observedReuse);
assert.equal(observedReuse.status_code,409);
assert.equal(observedReuse.body?.ok,false);
assert.equal(observedReuse.body?.error,"one_active_request_per_void_destination");
const reuseWire=JSON.stringify(observedReuse.body);
for(const value of Object.values(storedSecrets)){
  assert.equal(reuseWire.includes(value),false,"private prior request leaked");
}

// The old public exception handler also reflected arbitrary internal
// filesystem/customer error strings. Execute the exact source catch body
// (old negative control, current positive) under inert response objects.
function extractPublicCatch(post){
  const marker="}catch(e:any){";
  const begin=post.lastIndexOf(marker),end=post.lastIndexOf("}" + String.fromCharCode(10) + "    });");
  assert.ok(begin>=0&&end>begin,"missing mounted POST catch");
  return new Function("e","res",post.slice(begin+marker.length,end));
}
function runPublicCatch(handler,errorText){
  const captured={status_code:0,body:null,
    status(v){this.status_code=v;return this;},
    json(v){this.body=v;return this;}};
  handler(new Error(errorText),captured);
  return captured;
}
const previousCatch=extractPublicCatch(oldPost);
const currentCatch=extractPublicCatch(currentPost);
const exceptionSecret="SECRET_SOURCE_PATH_AND_CUSTOMER_METADATA";
const previousError=runPublicCatch(previousCatch,exceptionSecret);
assert.equal(JSON.stringify(previousError.body).includes(exceptionSecret),true,
  "historical public raw-error reflection negative control");
const currentError=runPublicCatch(currentCatch,exceptionSecret);
assert.equal(currentError.status_code,500);
assert.equal(currentError.body?.error,"buy_void_checkout_request_failed");
assert.equal(JSON.stringify(currentError.body).includes(exceptionSecret),false);
assert.equal(Object.hasOwn(currentError.body,"message"),false);
for(const [reason,expected] of [
  ["request_launch_authority_expired_or_superseded",
    "request_launch_authority_expired_or_superseded"],
  ["buy_void_request_active_destination_changed_during_lock",
    "one_active_request_per_void_destination"],
]){
  const response=runPublicCatch(currentCatch,reason);
  assert.equal(response.status_code,409);
  assert.equal(response.body?.error,expected);
  assert.equal(Object.hasOwn(response.body,"message"),false);
}

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
     /buy_void_request_history_under_lock_duplicate_id_transition_unqualified/u,
     "same-ID filtered conflicting obligation must HOLD");
   assert.equal(fs.readFileSync(path.join(root,"requests.jsonl"),"utf8"),
     conflict,"same-ID omission cannot append or replace a durable row");
   assert.equal(fs.existsSync(path.join(root,"candidate-new-request.json")),false);

   // Positive-control hostile string framing: the previous parser used
   // text.slice(0, -1).split("\n"), so a same-process split replacement
   // could erase one valid active obligation. The hardened helper must
   // derive both frames from actual octets and never invoke this hook.
   const originalSplit=String.prototype.split;
   const framedText=conflict.slice(0,-1);
   assert.ok(framedText.includes("\n"),"positive-control fixture must contain real LF");
   let splitPoisonCalls=0;
   try {
     String.prototype.split=function(separator,...args){
       if(separator==="\n" && String(this)===framedText){
         splitPoisonCalls++;
         return [JSON.stringify(sameIdFirst)];
       }
       return originalSplit.call(this,separator,...args);
     };
     assert.deepEqual(framedText.split("\n"),[JSON.stringify(sameIdFirst)],
       "split adversary positive control must actually erase one row");
     assert.equal(splitPoisonCalls,1);
     splitPoisonCalls=0;
     await assert.rejects(()=>mutate(async()=>[sameIdFirst]),
       /buy_void_request_history_under_lock_duplicate_id_transition_unqualified/u,
       "all raw durable rows must survive ambient String.split replacement");
     assert.equal(splitPoisonCalls,0,
       "the strict reader must not invoke poisoned String.prototype.split");
   }finally{
     String.prototype.split=originalSplit;
   }
   assert.equal(fs.readFileSync(path.join(root,"requests.jsonl"),"utf8"),
     conflict,"poisoned framing must not rewrite durable history");

   // A disappeared or zero-byte request journal is not authenticated first
   // genesis if operator history or an original per-request sidecar survives.
   fs.unlinkSync(path.join(root,"requests.jsonl"));
   const operatorHistory=path.join(root,"operator-events.jsonl");
   fs.writeFileSync(operatorHistory,
     JSON.stringify({request_id:"legacy-existing-a",
       operator_status:"reviewed"})+"\\n",{mode:0o600});
   await assert.rejects(()=>mutate(async()=>[]),
     /buy_void_request_history_under_lock_missing_or_empty_with_surviving_history/u,
     "missing ledger with surviving operator history must HOLD");
   fs.unlinkSync(operatorHistory);
   const orphanSidecar=path.join(root,"legacy-existing-a.json");
   fs.writeFileSync(orphanSidecar,"{}\\n",{mode:0o600});
   await assert.rejects(()=>mutate(async()=>[]),
     /buy_void_request_history_under_lock_missing_or_empty_with_surviving_history/u,
     "missing ledger with surviving request sidecar must HOLD");
   fs.writeFileSync(path.join(root,"requests.jsonl"),"",{mode:0o600});
   await assert.rejects(()=>mutate(async()=>[]),
     /buy_void_request_history_under_lock_missing_or_empty_with_surviving_history/u,
     "zero-byte ledger with surviving sidecar must HOLD");
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
// Actual compiled-helper operator revision: binding must write a new
// canonical same-ID journal row, not return public creation reuse.
// All inputs, lock callbacks and ledgers are disposable synthetic data.
{
  const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
  const hash="0x"+"a".repeat(64), other="0x"+"b".repeat(64);
  try {
    process.env.VOID_BUY_REQUEST_DIR=root;
    const readers=factory(oldPersist,root);
    const persist=(requested)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      requested,[
        readers.withLock,readers.readRequests,readers.readEvents,
        readers.applyEvents,readers.terminalStatus,()=>true,
      ]);
    const original=request("buyvoid_revision_aaaaaaaa","3","base","5");
    const created=await persist(original);
    assert.equal(created.reused_request,null);
    const revised={...original,
      status:"payment_submitted_pending_manual_review",
      tx_hash:hash,payment_submitted_at_ms:1800000000400};
    const result=await persist(revised);
    assert.equal(result.reused_request,null);
    assert.ok(result.file?.endsWith(original.request_id+".json"));
    assert.equal(lines(root).length,2,"revision must append to durable JSONL");
    assert.equal(lines(root)[1].tx_hash,hash);
    assert.equal((await readers.readRequests())[0].tx_hash,hash);
    const sidecar=JSON.parse(fs.readFileSync(result.file,"utf8"));
    assert.equal(sidecar.status,revised.status);
    assert.equal(sidecar.tx_hash,hash);
    // Same-ID rebind and second-tx-hash attempts may not rewrite history.
    await assert.rejects(()=>persist({...revised,tx_hash:other}),
      /buy_void_request_history_under_lock_operator_revision_not_authorized_by_original/u);
    await assert.rejects(()=>persist({...revised,note:"unreviewed-change"}),
      /buy_void_request_history_under_lock_operator_revision_not_authorized_by_original/u);
    assert.equal(lines(root).length,2);
    const repeat=await persist(request("buyvoid_duplicate_bbbbbbbb","3","base","5"));
    assert.equal(repeat.reused_request?.request_id,original.request_id);
    assert.equal(lines(root).length,2);
    // Duplicate payment hash across different request IDs must HOLD.
    const otherDestination=request("buyvoid_different_cccccccc","3","base","6");
    await persist(otherDestination);
    await assert.rejects(()=>persist({...otherDestination,
      status:"payment_submitted_pending_manual_review",
      tx_hash:hash,payment_submitted_at_ms:1800000000555}),
      /buy_void_request_history_under_lock_operator_revision_duplicate_tx_hash/u);
    assert.equal(lines(root).length,3);
    // Conflicting durable economics behind a repeated ID remain HOLD,
    // even if a legacy reader would filter one row by request_id.
    const forged={...original,
      void_destination_address:"0x"+"7".repeat(40),
      delivery_address:"0x"+"7".repeat(40)};
    fs.writeFileSync(path.join(root,"requests.jsonl"),
      [original,forged].map(row=>JSON.stringify(row)).join("\n")+"\n",
      {mode:0o600});
    await assert.rejects(
      ()=>persist(request("buyvoid_new_dddddddd","3","base","8")),
      /buy_void_request_history_under_lock_duplicate_id_transition_unqualified/u);
    assert.equal(lines(root).length,2);
  } finally {
    if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
    else process.env.VOID_BUY_REQUEST_DIR=saved;
    fs.rmSync(root,{recursive:true,force:true});
  }
}
// Buyer records must not inherit umask 022 world-readable defaults.
// The actual compiled helper runs exclusively against disposable directories.
{
  const root=temp(), savedDir=process.env.VOID_BUY_REQUEST_DIR;
  const savedMask=process.umask(0o022);
  const privateDir=path.join(root,"new-private-requests");
  try {
    process.env.VOID_BUY_REQUEST_DIR=privateDir;
    const prior=factory(oldPersist,privateDir);
    const persist=(v)=>persistBuyVoidPublicRequestUnderLaunchLockV1(v,[
      prior.withLock,prior.readRequests,prior.readEvents,
      prior.applyEvents,prior.terminalStatus,()=>true,
    ]);
    const owner=request("buyvoid_privacy_aaaaaaaa","3","base","4");
    await persist(owner);
    const ledger=path.join(privateDir,"requests.jsonl");
    const sidecar=path.join(privateDir,owner.request_id+".json");
    const mode=(name)=>fs.lstatSync(name).mode&0o7777;
    assert.equal(mode(privateDir),0o700,"customer directory must be private");
    assert.equal(mode(ledger),0o600,"request history must be private");
    assert.equal(mode(sidecar),0o600,"customer sidecar must be private");
    const immutable=fs.readFileSync(ledger);
    fs.chmodSync(privateDir,0o755);
    await assert.rejects(()=>persist(request("buyvoid_private_bbbbbbbb",
      "3","base","5")),
      /buy_void_request_history_under_lock_private_directory_owner_or_mode/u);
    assert.deepEqual(fs.readFileSync(ledger),immutable);
    fs.chmodSync(privateDir,0o700);
    fs.chmodSync(ledger,0o644);
    await assert.rejects(()=>persist(request("buyvoid_private_bbbbbbbb",
      "3","base","5")),
      /buy_void_request_history_under_lock_private_existing_leaf_owner_or_mode/u);
    assert.deepEqual(fs.readFileSync(ledger),immutable);
    fs.chmodSync(ledger,0o600);
    fs.chmodSync(sidecar,0o644);
    const revision={...owner,
      status:"payment_submitted_pending_manual_review",
      tx_hash:"0x"+"a".repeat(64),
      payment_submitted_at_ms:1800000000400};
    await assert.rejects(()=>persist(revision),
      /buy_void_request_history_under_lock_private_existing_leaf_owner_or_mode/u);
    assert.deepEqual(fs.readFileSync(ledger),immutable,
      "insecure pre-existing sidecar must HOLD before journal append");
    fs.chmodSync(sidecar,0o600);
    const stored=sidecar+".held";
    fs.renameSync(sidecar,stored);
    fs.symlinkSync(stored,sidecar);
    await assert.rejects(()=>persist(revision),
      /buy_void_request_history_under_lock_private_existing_leaf_owner_or_mode/u);
    assert.deepEqual(fs.readFileSync(ledger),immutable,
      "symlinked sidecar must HOLD before journal append");
    fs.unlinkSync(sidecar);
    fs.renameSync(stored,sidecar);
    await persist(revision);
    assert.equal(mode(ledger),0o600);
    assert.equal(mode(sidecar),0o600);
    assert.equal(lines(privateDir).length,2,
      "qualified update retains private request history");
  } finally {
    process.umask(savedMask);
    if(savedDir===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
    else process.env.VOID_BUY_REQUEST_DIR=savedDir;
    fs.rmSync(root,{recursive:true,force:true});
  }
}
// Source-only fsync ordering and directory rebind adversaries. All files
// are disposable; no real buyer ledger, payment, network or wallet access.
{
  const root=temp(), originalDir=process.env.VOID_BUY_REQUEST_DIR;
  const originalFsync=fs.fsyncSync;
  try {
    const build=(suffix)=>{
      const dir=path.join(root,suffix);
      process.env.VOID_BUY_REQUEST_DIR=dir;
      const legacy=factory(oldPersist,dir);
      return {dir,persist:(row)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
        row,[legacy.withLock,legacy.readRequests,legacy.readEvents,
          legacy.applyEvents,legacy.terminalStatus,()=>true])};
    };
    const good=build("durable-positive");
    const order=[];
    fs.fsyncSync=(fd)=>{
      order.push(fs.fstatSync(fd).isDirectory()?"directory":"file");
      return originalFsync(fd);
    };
    const happy=request("buyvoid_durable_aaaaaaaa","3","base","9");
    const accepted=await good.persist(happy);
    fs.fsyncSync=originalFsync;
    assert.deepEqual(order,["file","file","directory"],
      "journal, sidecar and directory must fsync before success");
    assert.equal(lines(good.dir).length,1);
    assert.equal(JSON.parse(fs.readFileSync(accepted.file,"utf8")).request_id,
      happy.request_id);

    const failLedger=build("fsync-ledger-fault");
    fs.fsyncSync=(fd)=>{
      if (fs.fstatSync(fd).isFile()) {
        throw new Error("synthetic_first_journal_fsync_failure");
      }
      return originalFsync(fd);
    };
    const beforeLedger=request("buyvoid_fsync_a_bbbbbbbb","3","base","8");
    await assert.rejects(()=>failLedger.persist(beforeLedger),
      /synthetic_first_journal_fsync_failure/u);
    fs.fsyncSync=originalFsync;
    assert.equal(fs.existsSync(path.join(failLedger.dir,
      beforeLedger.request_id+".json")),false,
      "ledger fsync failure cannot claim a sidecar");

    const failSidecar=build("fsync-sidecar-fault");
    let syncedFiles=0;
    fs.fsyncSync=(fd)=>{
      if (fs.fstatSync(fd).isFile() && ++syncedFiles===2) {
        throw new Error("synthetic_sidecar_fsync_failure");
      }
      return originalFsync(fd);
    };
    const beforeSidecar=request("buyvoid_fsync_b_cccccccc","3","base","7");
    await assert.rejects(()=>failSidecar.persist(beforeSidecar),
      /synthetic_sidecar_fsync_failure/u);
    fs.fsyncSync=originalFsync;
    assert.equal(syncedFiles,2);
    assert.equal(lines(failSidecar.dir).length,1,
      "journal may persist after sidecar fsync failure; recovery stays HOLD");

    const failParent=build("fsync-parent-fault");
    fs.fsyncSync=(fd)=>{
      if (fs.fstatSync(fd).isDirectory()) {
        throw new Error("synthetic_directory_fsync_failure");
      }
      return originalFsync(fd);
    };
    await assert.rejects(
      ()=>failParent.persist(request("buyvoid_fsync_c_dddddddd","3","base","6")),
      /synthetic_directory_fsync_failure/u);
    fs.fsyncSync=originalFsync;

    const displaced=build("directory-rebind-fault");
    let swapped=false;
    const heldPath=displaced.dir+"-held";
    fs.fsyncSync=(fd)=>{
      if (!swapped && fs.fstatSync(fd).isFile()) {
        fs.renameSync(displaced.dir,heldPath);
        fs.mkdirSync(displaced.dir,{mode:0o700});
        swapped=true;
      }
      return originalFsync(fd);
    };
    await assert.rejects(
      ()=>displaced.persist(request("buyvoid_fsync_d_eeeeeeee","3","base","5")),
      /buy_void_request_history_under_lock_pinned_directory_rebound/u,
      "replacement path must never receive an accepted request");
    fs.fsyncSync=originalFsync;
    assert.equal(swapped,true);
    assert.equal(fs.existsSync(path.join(displaced.dir,"requests.jsonl")),false,
      "pinned write must not be redirected into substituted directory");
    assert.equal(lines(heldPath).length,1,
      "ambiguous hidden partial publication remains a HOLD");
  } finally {
    fs.fsyncSync=originalFsync;
    if(originalDir===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
    else process.env.VOID_BUY_REQUEST_DIR=originalDir;
    fs.rmSync(root,{recursive:true,force:true});
  }
}
// Sidecar inode-binding security regression. Each attack is timed AFTER
// the lock-held preflight but BEFORE open, or AFTER fsync but BEFORE success.
// A failed write can leave a partial journal append: no false success is the
// bounded claim, not cross-file crash atomicity or installed-host acceptance.
{
  const nativeOpen = fs.openSync;
  const nativeFsync = fs.fsyncSync;
  function seed(root, suffix) {
    const base = request("buyvoid_"+suffix,"3","base","8");
    const old = factory(oldPersist,root);
    const persist=(row)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      row,[old.withLock,old.readRequests,old.readEvents,
        old.applyEvents,old.terminalStatus,()=>true]);
    return {base,persist};
  }
  function substitute(sidecar, payload) {
    const fd=nativeOpen(sidecar,
      fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);
    try { fs.writeSync(fd,payload); nativeFsync(fd); }
    finally { fs.closeSync(fd); }
  }

  // An already qualified sidecar can be replaced with another private
  // regular inode between lstat and the now-readable O_RDWR open. The replacement must never
  // be truncated, even though its mode and owner look acceptable.
  {
    const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
    const {base,persist}=seed(root,"existing_aaaaaaaa");
    const sidecar=path.join(root,base.request_id+".json");
    let replaced=false;
    try {
      process.env.VOID_BUY_REQUEST_DIR=root;
      await persist(base);
      const updated={...base,
        status:"payment_submitted_pending_manual_review",
        tx_hash:"0x"+"a".repeat(64),
        payment_submitted_at_ms:1800000000400};
      fs.openSync=function(file,flags,mode){
        if (!replaced && String(file).endsWith("/"+base.request_id+".json") &&
            ((flags & fs.constants.O_RDWR)===fs.constants.O_RDWR ||
             (flags & fs.constants.O_WRONLY)===fs.constants.O_WRONLY)) {
          fs.renameSync(sidecar,sidecar+".held");
          substitute(sidecar,"OPAQUE_SUBSTITUTE_EXISTING");
          replaced=true;
        }
        return nativeOpen(file,flags,mode);
      };
      await assert.rejects(()=>persist(updated),
        /buy_void_request_history_under_lock_sidecar_changed_before_open/u);
      assert.equal(replaced,true);
      assert.equal(fs.readFileSync(sidecar,"utf8"),
        "OPAQUE_SUBSTITUTE_EXISTING","replacement may not be truncated");
    } finally {
      fs.openSync=nativeOpen;
      if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
      else process.env.VOID_BUY_REQUEST_DIR=saved;
      fs.rmSync(root,{recursive:true,force:true});
    }
  }

  // A first creation uses O_EXCL. If a same-UID actor inserts a new
  // secure-looking 0600 leaf after the ENOENT preflight, its contents
  // must be preserved and the purchase request must HOLD.
  {
    const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
    const {base,persist}=seed(root,"absent_bbbbbbbb");
    const sidecar=path.join(root,base.request_id+".json");
    let inserted=false;
    try {
      process.env.VOID_BUY_REQUEST_DIR=root;
      fs.openSync=function(file,flags,mode){
        if(!inserted && String(file).endsWith("/"+base.request_id+".json") &&
            (flags & fs.constants.O_CREAT)!==0 &&
            (flags & fs.constants.O_EXCL)!==0) {
          substitute(sidecar,"OPAQUE_SUBSTITUTE_ABSENT");
          inserted=true;
        }
        return nativeOpen(file,flags,mode);
      };
      await assert.rejects(()=>persist(base),
        /buy_void_request_history_under_lock_sidecar_appeared_before_create/u);
      assert.equal(inserted,true);
      assert.equal(fs.readFileSync(sidecar,"utf8"),
        "OPAQUE_SUBSTITUTE_ABSENT");
    } finally {
      fs.openSync=nativeOpen;
      if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
      else process.env.VOID_BUY_REQUEST_DIR=saved;
      fs.rmSync(root,{recursive:true,force:true});
    }
  }

  // The sidecar can be swapped after the correct FD has been written
  // and fsynced. The late pathname-inode check must refuse success.
  {
    const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
    const {base,persist}=seed(root,"after_ffffffff");
    const sidecar=path.join(root,base.request_id+".json");
    let swapped=false;
    try {
      process.env.VOID_BUY_REQUEST_DIR=root;
      await persist(base);
      const updated={...base,
        status:"payment_submitted_pending_manual_review",
        tx_hash:"0x"+"b".repeat(64),
        payment_submitted_at_ms:1800000000400};
      fs.fsyncSync=function(fd){
        nativeFsync(fd);
        const visible=fs.readlinkSync("/proc/self/fd/"+fd);
        if(!swapped && visible===sidecar){
          fs.renameSync(sidecar,sidecar+".held");
          substitute(sidecar,"OPAQUE_SUBSTITUTE_POSTWRITE");
          swapped=true;
        }
      };
      await assert.rejects(()=>persist(updated),
        /buy_void_request_history_under_lock_sidecar_visible_inode_changed/u);
      assert.equal(swapped,true);
      assert.equal(fs.readFileSync(sidecar,"utf8"),
        "OPAQUE_SUBSTITUTE_POSTWRITE");
    } finally {
      fs.fsyncSync=nativeFsync;
      if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
      else process.env.VOID_BUY_REQUEST_DIR=saved;
      fs.rmSync(root,{recursive:true,force:true});
    }
  }
}
// Strict request-history admission must retain its original journal inode
// THROUGH append and sidecar fsync. All interventions operate only on
// per-test throwaway directories, never on a live customer ledger.
{
  const nativeOpen=fs.openSync, nativeWriteFile=fs.writeFileSync;
  function newFixture(name) {
    const root=temp(),prior=process.env.VOID_BUY_REQUEST_DIR;
    process.env.VOID_BUY_REQUEST_DIR=root;
    const readers=factory(oldPersist,root);
    const persist=(obj)=>persistBuyVoidPublicRequestUnderLaunchLockV1(obj,[
      readers.withLock,readers.readRequests,readers.readEvents,
      readers.applyEvents,readers.terminalStatus,()=>true,
    ]);
    return {root,prior,persist,ledger:path.join(root,"requests.jsonl"),
      restore(){
        fs.openSync=nativeOpen;
        fs.writeFileSync=nativeWriteFile;
        if(prior===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
        else process.env.VOID_BUY_REQUEST_DIR=prior;
        fs.rmSync(root,{recursive:true,force:true});
      }};
  }
  function exactSubstitute(name,body){
    const fd=nativeOpen(name,fs.constants.O_CREAT|
      fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);
    try { fs.writeSync(fd,body); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
  }
  // A nonempty previously validated journal is opened exactly ONCE for
  // strict read and append, not closed then reopened as a pathname.
  {
    const f=newFixture("stable");
    try {
      await f.persist(request("buyvoid_journal_first_aaaaaaaa","3","base","1"));
      let journalOpens=0;
      fs.openSync=function(file,flags,mode){
        if(String(file).endsWith("/requests.jsonl")){
          journalOpens++;
          assert.ok((flags & fs.constants.O_RDWR)!==0,
            "strict read must pin the append-capable existing FD");
          assert.ok((flags & fs.constants.O_APPEND)!==0);
        }
        return nativeOpen(file,flags,mode);
      };
      await f.persist(request("buyvoid_journal_next_bbbbbbbb","3","base","2"));
      assert.equal(journalOpens,1,"existing journal must not reopen to append");
      assert.equal(lines(f.root).length,2);
    }finally{f.restore();}
  }

  // The old pathname writer could append to a substituted visible journal.
  // Swap its name just before the actual FD write: new source must append
  // only the held inode and HOLD when the pathname no longer names it.
  {
    const f=newFixture("swap");
    let replaced=false;
    const sentinel="OPAQUE_UNQUALIFIED_REPLACEMENT_LEDGER";
    try {
      await f.persist(request("buyvoid_journal_swap_aaaaaaaa","3","base","3"));
      fs.writeFileSync=function(target,bytes,options){
        if(!replaced && typeof target==="number" &&
            fs.readlinkSync("/proc/self/fd/"+target)===f.ledger &&
            String(bytes).endsWith("\n")){
          fs.renameSync(f.ledger,f.ledger+".held");
          exactSubstitute(f.ledger,sentinel);
          replaced=true;
        }
        return nativeWriteFile(target,bytes,options);
      };
      await assert.rejects(
        ()=>f.persist(request("buyvoid_journal_swap_bbbbbbbb","3","base","4")),
        /buy_void_request_history_under_lock_journal_visible_identity_changed/u,
        "journal name replacement must HOLD, not publish success");
      assert.equal(replaced,true);
      assert.equal(fs.readFileSync(f.ledger,"utf8"),sentinel,
        "replacement ledger must remain byte-for-byte unmodified");
    }finally{f.restore();}
  }

  // A new name introduced after the strict reader saw ENOENT cannot be
  // opened with ordinary O_CREAT: require O_EXCL and leave it untouched.
  {
    const f=newFixture("first-create");
    let introduced=false;
    const sentinel="OPAQUE_FIRST_CREATE_INTERLOPER";
    try {
      fs.openSync=function(file,flags,mode){
        if(!introduced && String(file).endsWith("/requests.jsonl") &&
            (flags & fs.constants.O_CREAT)!==0){
          assert.ok((flags & fs.constants.O_EXCL)!==0,
            "fresh-generation journal publication requires O_EXCL");
          exactSubstitute(f.ledger,sentinel);
          introduced=true;
        }
        return nativeOpen(file,flags,mode);
      };
      await assert.rejects(
        ()=>f.persist(request("buyvoid_journal_new_aaaaaaaa","3","base","5")),
        /buy_void_request_history_under_lock_journal_appeared_before_exclusive_create/u);
      assert.equal(introduced,true);
      assert.equal(fs.readFileSync(f.ledger,"utf8"),sentinel);
    }finally{f.restore();}
  }
}

// Crash-gap repair is deliberately narrow: the original canonical journal
// is authoritative; an entirely absent sidecar may be created EXCLUSIVELY.
// An existing mismatched sidecar or simultaneous new leaf must never be
// truncated, overwritten, or silently reconciled.
{
  const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
  const owner=request("buyvoid_recovery_aaaaaaaa","3","base","9");
  const originalOpen=fs.openSync;
  let injected=false;
  try {
    process.env.VOID_BUY_REQUEST_DIR=root;
    const readers=factory(oldPersist,root);
    const persist=(candidate)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      candidate,[readers.withLock,readers.readRequests,readers.readEvents,
        readers.applyEvents,readers.terminalStatus,()=>true]);
    await persist(owner);
    const ledger=path.join(root,"requests.jsonl");
    const sidecar=path.join(root,owner.request_id+".json");
    const originalBytes=fs.readFileSync(ledger);
    const originalSidecar=fs.readFileSync(sidecar,"utf8");
    fs.unlinkSync(sidecar); // simulates crash AFTER durable journal fsync
    assert.equal(fs.existsSync(sidecar),false);
    const retry=await persist(request("buyvoid_retry_bbbbbbbb","3","base","9"));
    assert.equal(retry.reused_request?.request_id,owner.request_id);
    assert.equal(retry.file,null);
    assert.deepEqual(fs.readFileSync(ledger),originalBytes,
      "recovery must never append another economic obligation");
    assert.equal(fs.readFileSync(sidecar,"utf8"),originalSidecar);
    assert.equal(fs.statSync(sidecar).mode&0o7777,0o600);
    // Existing sidecar contents are not a write-repair target.
    fs.writeFileSync(sidecar,"OPAQUE_CORRUPTED_EXISTING_SIDECAR");
    await assert.rejects(
      ()=>persist(request("buyvoid_retry_cccccccc","3","base","9")),
      /buy_void_request_history_under_lock_reused_sidecar_content_mismatch/u);
    assert.equal(fs.readFileSync(sidecar,"utf8"),
      "OPAQUE_CORRUPTED_EXISTING_SIDECAR");
    assert.deepEqual(fs.readFileSync(ledger),originalBytes);
    // A same-UID interloper that introduces a leaf between the absent
    // preflight and open must be held by O_CREAT|O_EXCL|O_NOFOLLOW.
    fs.unlinkSync(sidecar);
    fs.openSync=function(file,flags,mode){
      if(!injected&&String(file).endsWith("/"+owner.request_id+".json")&&
          (flags&fs.constants.O_EXCL)!==0){
        const inserted=originalOpen(sidecar,
          fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);
        try{fs.writeSync(inserted,"OPAQUE_INTERLOPER");fs.fsyncSync(inserted);}
        finally{fs.closeSync(inserted);}
        injected=true;
      }
      return originalOpen(file,flags,mode);
    };
    try {
      await assert.rejects(
        ()=>persist(request("buyvoid_retry_dddddddd","3","base","9")),
        /buy_void_request_history_under_lock_recovery_sidecar_interloper/u);
    } finally {fs.openSync=originalOpen;}
    assert.equal(injected,true,"recovery create race must be exercised");
    assert.equal(fs.readFileSync(sidecar,"utf8"),"OPAQUE_INTERLOPER");
    assert.deepEqual(fs.readFileSync(ledger),originalBytes);
    fs.unlinkSync(sidecar);
    const repaired=await persist(request("buyvoid_retry_eeeeeeee","3","base","9"));
    assert.equal(repaired.reused_request?.request_id,owner.request_id);
    assert.equal(fs.readFileSync(sidecar,"utf8"),originalSidecar);
    assert.deepEqual(fs.readFileSync(ledger),originalBytes);
    // Even a full canonical legacy row must not create a sidecar with a
    // traversal-shaped ID outside the verified private request directory.
    const unsafe={...owner,request_id:"../escape-private-history"};
    fs.writeFileSync(ledger,JSON.stringify(unsafe)+"\n",{mode:0o600});
    await assert.rejects(
      ()=>persist(request("buyvoid_retry_ffffffff","3","base","9")),
      /buy_void_request_history_under_lock_unsafe_request_id/u);
    assert.equal(fs.existsSync(path.join(root,"..","escape-private-history.json")),false);
  } finally {
    fs.openSync=originalOpen;
    if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
    else process.env.VOID_BUY_REQUEST_DIR=saved;
    fs.rmSync(root,{recursive:true,force:true});
  }
}

// A same-UID writer can rewrite the *same private inode* after the earlier
// byte comparison (or recovered fsync), while preserving its inode/mode/size.
// Neither path may report an idempotent success using metadata-only checks.
{
  const nativeLstat=fs.lstatSync, nativeOpen=fs.openSync;
  for(const recovered of [false,true]) {
    const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
    const owner=request("buyvoid_finalbyte_aaaaaaaa","3","base","7");
    const retry=request("buyvoid_finalbyte_bbbbbbbb","3","base","7");
    const readers=factory(oldPersist,root);
    const persist=(candidate)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      candidate,[readers.withLock,readers.readRequests,readers.readEvents,
        readers.applyEvents,readers.terminalStatus,()=>true]);
    let injected=false, sidecarStats=0, injectedInode=null;
    try {
      process.env.VOID_BUY_REQUEST_DIR=root;
      await persist(owner);
      const ledger=path.join(root,"requests.jsonl");
      const sidecar=path.join(root,owner.request_id+".json");
      const journalBefore=fs.readFileSync(ledger);
      const pristine=fs.readFileSync(sidecar);
      const originalInode=fs.statSync(sidecar).ino;
      const altered=Buffer.from(pristine);
      const idOffset=altered.indexOf(Buffer.from(owner.request_id,"utf8"));
      assert.ok(idOffset>=0,"expected canonical request_id in sidecar");
      altered[idOffset]=altered[idOffset]===0x62?0x63:0x62;
      assert.equal(altered.length,pristine.length);
      if(recovered)fs.unlinkSync(sidecar);
      // Count successful visible sidecar stats (ENOENT is not one).
      // Both recovery and pre-existing paths reach their final pre-readback
      // visibility check at the third successful sidecar lstat.
      const targetStat=3;
      fs.lstatSync=function(file,options){
        const observed=nativeLstat(file,options);
        if(String(file).endsWith("/"+owner.request_id+".json")) {
          sidecarStats+=1;
          if(!injected&&sidecarStats===targetStat) {
            injectedInode=observed.ino;
            const held=nativeOpen(sidecar,
              fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW);
            try {
              assert.equal(fs.writeSync(held,altered,0,altered.length,0),
                altered.length,"same-inode mutation must complete");
              fs.fsyncSync(held);
            } finally {fs.closeSync(held);}
            injected=true;
          }
        }
        return observed;
      };
      await assert.rejects(()=>persist(retry),
        /buy_void_request_history_under_lock_sidecar_final_/u,
        "equal-length same-inode late rewrite must fail final readback");
      assert.equal(injected,true,"late final-check adversary must fire");
      assert.ok(sidecarStats>=targetStat,"must cross exact final gate");
      assert.equal(fs.statSync(sidecar,{bigint:true}).ino,injectedInode,
        "equal-length adversary must retain the exact visible inode");
      if(!recovered)assert.equal(fs.statSync(sidecar).ino,originalInode);
      assert.equal(fs.readFileSync(sidecar).length,pristine.length);
      assert.deepEqual(fs.readFileSync(ledger),journalBefore,
        "reuse under corruption must never append a second obligation");
    } finally {
      fs.lstatSync=nativeLstat;
      fs.openSync=nativeOpen;
      if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
      else process.env.VOID_BUY_REQUEST_DIR=saved;
      fs.rmSync(root,{recursive:true,force:true});
    }
  }
}

// Separately falsify the *byte-comparison loop itself* without relying on
// mtime/ctime drift: corrupt only the bytes returned by the final pinned FD
// read, leaving the real sidecar inode, metadata and on-disk bytes untouched.
// The first read of a pre-existing sidecar is still canonical; corruption is
// injected solely during the final successful-boundary readback.
{
  const nativeRead=fs.readSync;
  for(const recovered of [false,true]) {
    const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
    const owner=request("buyvoid_readback_aaaaaaaa","3","base","6");
    const retry=request("buyvoid_readback_bbbbbbbb","3","base","6");
    const readers=factory(oldPersist,root);
    const persist=(candidate)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      candidate,[readers.withLock,readers.readRequests,readers.readEvents,
        readers.applyEvents,readers.terminalStatus,()=>true]);
    let sidecarReads=0, injected=false;
    try {
      process.env.VOID_BUY_REQUEST_DIR=root;
      await persist(owner);
      const ledger=path.join(root,"requests.jsonl");
      const sidecar=path.join(root,owner.request_id+".json");
      const journalBefore=fs.readFileSync(ledger);
      const sidecarBefore=fs.readFileSync(sidecar);
      if(recovered)fs.unlinkSync(sidecar);
      fs.readSync=function(fd,buffer,offset,length,position){
        const read=nativeRead(fd,buffer,offset,length,position);
        if(read>0) {
          let fdTarget="";
          try { fdTarget=fs.readlinkSync("/proc/self/fd/"+fd); }
          catch {}
          if(fdTarget===sidecar) {
            sidecarReads+=1;
            if(!injected&&sidecarReads===(recovered?1:2)) {
              buffer[offset]=buffer[offset]===0x42?0x43:0x42;
              injected=true;
            }
          }
        }
        return read;
      };
      await assert.rejects(()=>persist(retry),
        /buy_void_request_history_under_lock_sidecar_final_content_mismatch/u,
        "actual final FD byte mismatch must trigger the canonical-content HOLD");
      assert.equal(injected,true,"final byte-readback must actually execute");
      assert.equal(sidecarReads,recovered?1:2,
        "only the expected initial/final sidecar reads were admitted");
      assert.deepEqual(fs.readFileSync(sidecar),sidecarBefore,
        "byte-read adversary must not mutate the real private sidecar");
      assert.deepEqual(fs.readFileSync(ledger),journalBefore,
        "byte-read HOLD must not append a second purchase");
    } finally {
      fs.readSync=nativeRead;
      if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
      else process.env.VOID_BUY_REQUEST_DIR=saved;
      fs.rmSync(root,{recursive:true,force:true});
    }
  }
}

// New checkout and operator tx-hash revision must retain their sidecar FD
// through final success. Inject a corrupted *read buffer* at the exact last
// descriptor read without changing any real disk bytes or inode timestamps;
// the byte-verifier must reject before reporting a successful persistence.
{
  const nativeRead=fs.readSync;
  for (const isRevision of [false,true]) {
    const root=temp(), saved=process.env.VOID_BUY_REQUEST_DIR;
    const owner=request("buyvoid_publish_readback_aaaaaaaa","3","base","4");
    const readers=factory(oldPersist,root);
    const persist=(candidate)=>persistBuyVoidPublicRequestUnderLaunchLockV1(
      candidate,[readers.withLock,readers.readRequests,readers.readEvents,
        readers.applyEvents,readers.terminalStatus,()=>true]);
    let injected=false, readCalls=0;
    try {
      process.env.VOID_BUY_REQUEST_DIR=root;
      if (isRevision) await persist(owner);
      const sidecar=path.join(root,owner.request_id+".json");
      const intended=isRevision ? {
        ...owner,
        status:"payment_submitted_pending_manual_review",
        tx_hash:"0x"+"a".repeat(64),
        payment_submitted_at_ms:1800000000400,
      } : owner;
      fs.readSync=function(fd,buffer,offset,length,position){
        const read=nativeRead(fd,buffer,offset,length,position);
        if(read>0) {
          let resolved="";
          try { resolved=fs.readlinkSync("/proc/self/fd/"+fd); }catch{}
          if(resolved===sidecar) {
            readCalls+=1;
            buffer[offset]=buffer[offset]===0x42?0x43:0x42;
            injected=true;
          }
        }
        return read;
      };
      await assert.rejects(()=>persist(intended),
        /buy_void_request_history_under_lock_sidecar_final_content_mismatch/u,
        "first create and revision must reject corrupted final FD readback");
      assert.equal(injected,true,"must exercise final sidecar byte read");
      assert.equal(readCalls,1,"new or revised sidecar final read occurs once");
      assert.equal(fs.readFileSync(sidecar,"utf8"),
        JSON.stringify(intended,null,2),
        "read buffer adversary must not mutate original disk sidecar");
      assert.deepEqual(lines(root).map(row=>row.request_id),
        Array(isRevision?2:1).fill(owner.request_id),
        "failure can leave durable journal append; must not claim no write");
    }finally{
      fs.readSync=nativeRead;
      if(saved===undefined)delete process.env.VOID_BUY_REQUEST_DIR;
      else process.env.VOID_BUY_REQUEST_DIR=saved;
      fs.rmSync(root,{recursive:true,force:true});
    }
  }
}

console.log("VOID_BUY_VOID_REQUEST_LOCK_REVALIDATION_SOURCE_V1_GREEN");
console.log("negative_predecessor_duplicate_append_observed=true");
console.log("current_concurrent_same_intent_exactly_one_append=true");
console.log("expired_launch_lease_after_history_read_holds=true");
console.log("expired_launch_lease_before_reused_response_holds=true");
console.log("missing_under_lock_revalidator_holds=true");
console.log("current_same_intent_returns_existing_request=true");
console.log("public_unauthenticated_reuse_private_conflict=true");
console.log("public_prelock_fast_return_removed=true");
console.log("public_unknown_internal_exception_details_redacted=true");
console.log("public_safe_known_conflicts_preserved=true");
console.log("operator_same_id_tx_hash_revision_appended=true");
console.log("operator_revision_conflicting_history_holds=true");
console.log("private_customer_directory_and_files_0700_0600=true");
console.log("journal_sidecar_and_directory_fsync_order=true");
console.log("fsync_failures_reject_without_false_success=true");
console.log("directory_rebind_during_fsync_holds=true");
console.log("legacy_insecure_and_symlink_sidecars_hold_before_append=true");
console.log("sidecar_preopen_inode_replacement_holds=true");
console.log("sidecar_first_create_exclusive_holds=true");
console.log("sidecar_postwrite_rebind_holds=true");
console.log("journal_existing_fd_pinned_from_read_through_append=true");
console.log("journal_leaf_substitution_holds_without_visible_append=true");
console.log("journal_first_create_exclusive_holds=true");
console.log("missing_sidecar_recovered_only_from_fsynced_journal=true");
console.log("same_inode_equal_length_final_sidecar_rewrite_holds=true");
console.log("final_sidecar_byte_readback_mismatch_holds=true");
console.log("first_create_and_operator_revision_final_bytes_verified=true");
console.log("mismatched_or_interloped_sidecar_never_rewritten=true");
console.log("unsafe_legacy_request_id_sidecar_path_holds=true");
console.log("prior_multi_active_destination_never_idempotent=true");
console.log("prior_multi_active_conflicting_rail_and_amount_holds=true");
console.log("malformed_durable_request_history_holds=true");
console.log("silently_omitted_durable_request_holds=true");
console.log("same_id_partial_history_never_authoritative=true");
console.log("hostile_string_split_cannot_drop_durable_rows=true");
console.log("missing_ledger_with_surviving_history_holds=true");
console.log("empty_ledger_with_surviving_sidecar_holds=true");
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
