#!/usr/bin/env node
// SOURCE-ONLY launch HOLD snapshot for the reviewed current-main composition.
// Never run a network service, execute a wallet/signer, or read customer data.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEWED_HEAD = "aa39d97c13f9ee18da19a6c0dda377925ad66dcf";
const SOURCE_BLOBS = Object.freeze({
  "src/index.ts": "f0c1292f26cbe3f9c6bc64dfc824cd616a9a7048",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":
    "f591f7407d9afc2cf77e0f90923aa11b4817fd4e",
  "src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts":
    "56cc3d4089f870868222328d9b56dd91415974a0",
  "tools/void-buy-allocation-custody-service-v1.mjs":
    "a53ed0c6c506b3c30a5d219a72295740b7a6761f",
  "src/economic/buy_void_coupled_launch_gate_v1.mjs":
    "e0402744ae51bb7bda2dc1e2038aae217d868ed9",
});
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
function gitBlobSha1(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes).digest("hex");
}
function sameIdentity(a,b) {
  return a.dev===b.dev && a.ino===b.ino && a.mode===b.mode &&
    a.size===b.size && a.nlink===b.nlink &&
    a.mtimeMs===b.mtimeMs && a.ctimeMs===b.ctimeMs;
}
function readReviewedSource(relative,expected) {
  assert.match(relative,/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/u);
  assert.ok(!relative.split("/").includes(".."));
  const pathname=path.join(ROOT,relative);
  const visible=fs.lstatSync(pathname);
  assert.ok(visible.isFile()&&!visible.isSymbolicLink()&&
    visible.nlink===1&&visible.size>0&&visible.size<=MAX_SOURCE_BYTES,
    "unexpected source file type or size:"+relative);
  assert.ok(typeof fs.constants.O_NOFOLLOW==="number"&&fs.constants.O_NOFOLLOW>0);
  const fd=fs.openSync(pathname,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
    const before=fs.fstatSync(fd);
    assert.ok(sameIdentity(visible,before),"source snapshot changed before read:"+relative);
    const bytes=Buffer.alloc(before.size+1);let filled=0;
    while(filled<bytes.length) {
      const n=fs.readSync(fd,bytes,filled,bytes.length-filled,filled);
      if(n===0)break;
      filled+=n;
    }
    assert.equal(filled,before.size,"source size changed during read:"+relative);
    const after=fs.fstatSync(fd),onPath=fs.lstatSync(pathname);
    assert.ok(sameIdentity(before,after)&&sameIdentity(after,onPath),
      "source path changed after read:"+relative);
    const body=bytes.subarray(0,filled);
    assert.equal(gitBlobSha1(body),expected,"source Git blob drift:"+relative);
    return body.toString("utf8");
  } finally {fs.closeSync(fd);}
}
function held(name,valid){assert.equal(valid,true,"buy_void_release_hold_"+name);}
function inspectSourceHold(source) {
  const index=source["src/index.ts"];
  const capacity=source["src/economic/buy_void_verified_payment_capacity_admission_v1.ts"];
  const dispatcher=source["src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts"];
  const custody=source["tools/void-buy-allocation-custody-service-v1.mjs"];
  const launch=source["src/economic/buy_void_coupled_launch_gate_v1.mjs"];

  held("legacy_writer_still_mounted",
    index.includes("writeBuyVoidOperatorEventWithCapacityAdmissionV1") &&
    index.includes("__voidWriteBuyVoidOperatorEventV1") &&
    !index.includes("buy_void_operator_verified_allocation_dispatch_v1"));
  held("separate_handoff_source_exists",
    capacity.includes("export async function writeBuyVoidVerifiedPaymentAllocationHandoffV1("));
  held("dispatcher_explicitly_unmounted",
    dispatcher.includes("mounted_operator_route_verified: false") &&
    dispatcher.includes("custody_service_composed: false") &&
    dispatcher.includes("verified_payment_must_use_allocation_handoff: true"));
  held("custody_reserve_and_recovery_still_hold",
    custody.includes("reserve_method_enabled: false") &&
    custody.includes("verified_payment_provenance_independently_bound: false") &&
    custody.includes("allocation_custody_service_verified_payment_provenance_not_bound") &&
    custody.includes("allocation_custody_service_verified_payment_recovery_not_bound"));
  held("cross_uid_launch_anchor_not_shared",
    launch.includes("userInfo().homedir") &&
    launch.includes("buyLaunchGenerationExternalAnchorPathV1") &&
    launch.includes("buyLaunchGenerationAuthorityLockPathV1"));

  return Object.freeze({
    marker:"VOID_BUY_VOID_CURRENT_MAIN_PAYMENT_ALLOCATION_LAUNCH_HOLD_V1",
    reviewed_source_head:REVIEWED_HEAD,
    source_files_verified:Object.keys(SOURCE_BLOBS).length,
    canonical_handoff_source_present:true,
    operator_route_uses_legacy_payment_writer:true,
    operator_verified_allocation_dispatch_mounted:false,
    privileged_allocation_reserve_enabled:false,
    privileged_allocation_recover_enabled:false,
    cross_uid_launch_anchor_independently_verified:false,
    independent_custody_payment_provenance_verified:false,
    payment_verified_to_allocation_production_ready:false,
    deployed_artifact_generation_verified:false,
    public_presale_launch_qualified:false,
    wc_void_market_launch_qualified:false,
    wallet_or_signer_action:false,
    chain_mutation:false,
    funds_moved:false,
  });
}
function selfTest(source) {
  const baseline=inspectSourceHold(source);
  const mutate=(key,change,label)=>{
    const input={...source,[key]:change(source[key])};
    assert.throws(()=>inspectSourceHold(input),/buy_void_release_hold_/u,label);
  };
  mutate("src/index.ts",s=>s+'\\n// injected forbidden buy_void_operator_verified_allocation_dispatch_v1\\n',
    "disallowed newly mounted dispatcher must demand renewed review");
  mutate("tools/void-buy-allocation-custody-service-v1.mjs",
    s=>s.replace("reserve_method_enabled: false","reserve_method_enabled: true"),
    "reserve enabled without independent custody review");
  mutate("tools/void-buy-allocation-custody-service-v1.mjs",
    s=>s.replace("verified_payment_provenance_independently_bound: false",
                "verified_payment_provenance_independently_bound: true"),
    "custody payment authority cannot be inferred by changed boolean");
  mutate("src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts",
    s=>s.replace("mounted_operator_route_verified: false",
                "mounted_operator_route_verified: true"),
    "dispatcher mount claim cannot be silently promoted");
  mutate("src/economic/buy_void_coupled_launch_gate_v1.mjs",
    s=>s.replaceAll("userInfo().homedir","process.env.HOME"),
    "OS-account launch-anchor path must remain distinct");
  assert.equal(baseline.payment_verified_to_allocation_production_ready,false);
  console.log("VOID_BUY_VOID_CURRENT_MAIN_PAYMENT_ALLOCATION_LAUNCH_HOLD_V1_GREEN");
  console.log("five_reviewed_exact_git_source_blobs_bound=true");
  console.log("five_synthetic_premature_authority_promotions_rejected=true");
  console.log("custody_reserve_or_recover_enabled=false");
  console.log("operator_verified_allocation_dispatch_mounted=false");
  console.log("cross_uid_launch_anchor_independently_verified=false");
  console.log("payment_verified_to_allocation_production_ready=false");
  console.log("public_presale_launch_qualified=false");
  console.log("funds_moved=false");
}
function checkoutLineage() {
  const git=(args)=>execFileSync("/usr/bin/git",args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",
         GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
         GIT_OPTIONAL_LOCKS:"0"},
    timeout:10_000,maxBuffer:4096,
  });
  const current=git(["rev-parse","HEAD"]).trim();
  assert.match(current,/^[0-9a-f]{40}$/u);
  git(["merge-base","--is-ancestor",REVIEWED_HEAD,current]);
  git(["diff","--quiet",REVIEWED_HEAD,current,"--",...Object.keys(SOURCE_BLOBS)]);
}
const args=process.argv.slice(2);
assert.equal(args.length,1,"explicit --census or --self-test required");
assert.ok(["--census","--self-test"].includes(args[0]),"never an authority mode");
checkoutLineage();
const source=Object.fromEntries(Object.entries(SOURCE_BLOBS).map(
  ([p,hash])=>[p,readReviewedSource(p,hash)]
));
if(args[0]==="--self-test") selfTest(source);
else process.stdout.write(JSON.stringify(inspectSourceHold(source),null,2)+"\n");
