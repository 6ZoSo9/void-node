#!/usr/bin/env node
import assert from 'node:assert/strict';
import { constants as FS } from 'node:fs';
import { mkdir, mkdtemp, open, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  RESULT_MARKER,contestantRegistryDigestV1,executionModelV1,providerRequestPolicyV1,
} from './apollyon_openrouter_ox_alpha_adapter_v1.mjs';
import {
  ARENA_LOGICAL_OPERATION_INTENT_ENV,arenaContestantLogicalIntentV1,
  runOpenRouterAlignmentArenaV1,selectArenaContestantsV1,
} from './apollyon_openrouter_alignment_arena_v1.mjs';

const PROOF_MARKER='VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1_PROOF_GREEN';
function registry(){
  return {
    marker:'VOID_APOLLYON_OPENROUTER_CONTESTANT_REGISTRY_V1',version:1,
    reviewed_at_utc:'2026-08-24T06:00:00.000Z',default_model:'stealth/ox-alpha',
    contestants:[
      {model:'stealth/ox-alpha',canonical_slug:'stealth/ox-alpha',status:'qualified',scored_trial_eligible:false,
       zero_price_required:true,min_context_length:1048576,max_tokens_cap:32768,retention_class:'retained',
       privacy_class:'retained_public_only',provider_policy:{allow_fallbacks:false,require_parameters:true,data_collection:null,zdr:false,only:[]}},
      {model:'cohere/north-mini-code:free',canonical_slug:'cohere/north-mini-code-20260617',status:'qualification_only',scored_trial_eligible:false,
       zero_price_required:true,min_context_length:256000,max_tokens_cap:32768,retention_class:'retained',
       privacy_class:'retained_public_only',provider_policy:{allow_fallbacks:false,require_parameters:true,data_collection:'allow',zdr:false,only:[]}},
      {model:'other/quarantined:free',canonical_slug:null,status:'quarantined',scored_trial_eligible:false,
       zero_price_required:true,min_context_length:32768,max_tokens_cap:4096,retention_class:'quarantined',
       privacy_class:'zdr_public_or_sanitized',provider_policy:{allow_fallbacks:false,require_parameters:true,data_collection:'deny',zdr:true,only:[]}},
    ],
  };
}
const r=registry(),rsha=contestantRegistryDigestV1(r);
assert.deepEqual(selectArenaContestantsV1(r,'qualification').map(x=>x.model),['stealth/ox-alpha','cohere/north-mini-code:free']);
assert.throws(
  () => selectArenaContestantsV1(r,'scored'),
  /no contestants are eligible for arena mode scored/,
);
assert.equal(ARENA_LOGICAL_OPERATION_INTENT_ENV,'VOID_OPENROUTER_ARENA_LOGICAL_OPERATION_INTENT_SHA256');
const arenaIntent='1'.repeat(64);
const a=arenaContestantLogicalIntentV1({arenaLogicalOperationIntentDigest:arenaIntent,registrySha256:rsha,arenaMode:'qualification',model:r.contestants[0].model});
const b=arenaContestantLogicalIntentV1({arenaLogicalOperationIntentDigest:arenaIntent,registrySha256:rsha,arenaMode:'qualification',model:r.contestants[1].model});
assert.match(a,/^[0-9a-f]{64}$/);assert.match(b,/^[0-9a-f]{64}$/);assert.notEqual(a,b);

const root=await mkdtemp(join(tmpdir(),'void-arena-broker-ci-'));
const out=join(root,'out');await mkdir(out,{mode:0o700});const outHandle=await open(out,FS.O_RDONLY|FS.O_DIRECTORY);
const calls=[];
try{
  const fakeRunner=async(options,hooks)=>{
    assert.equal('OPENROUTER_API_KEY' in hooks.env,false);
    assert.equal('VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD' in hooks.env,false);
    const c=r.contestants.find(x=>x.model===hooks.env.VOID_OPENROUTER_MODEL);assert.ok(c);
    const intent=hooks.env.VOID_OPENROUTER_LOGICAL_OPERATION_INTENT_SHA256;assert.match(intent,/^[0-9a-f]{64}$/);
    calls.push({model:c.model,intent});
    if(c.model.startsWith('cohere/'))throw new Error('synthetic HOLD sk-proofsecret0123456789');
    const exec=executionModelV1(c);
    const result={
      marker:RESULT_MARKER,accepted_recovery_key:'2'.repeat(64),provider:'openrouter',
      broker_operation_id:`apollyon_op_v1:${'3'.repeat(64)}`,broker_result_digest:'4'.repeat(64),
      broker_catalog_sha256:'5'.repeat(64),broker_selected_model_sha256:'6'.repeat(64),
      model_requested:c.model,model_execution_requested:exec,model_canonical_slug:c.canonical_slug,
      model_reported:exec,router_requested_model:exec,router_selected_model:exec,router_selected_provider:'ProofProvider',
      qualification_status:c.status,scored_trial_eligible:false,retention_class:c.retention_class,privacy_class:c.privacy_class,
      provider_policy_acknowledged:true,registry_policy_generation_acknowledged:rsha,public_retention_acknowledged:true,
      scored_provider_allowlist:[],pricing_verified_zero:true,request_time_max_price_zero:true,
      provider_policy:providerRequestPolicyV1(c),tools_exposed:false,registry_sha256:rsha,registry_reviewed_at_utc:r.reviewed_at_utc,
      trial_id:'trial-ci',admission_id:'admission-ci',prompt_sha256:'7'.repeat(64),prompt_bytes:100,max_tokens:4096,
      response_id:'proof',finish_reason:'stop',response_content:'synthetic evidence',response_content_sha256:'8'.repeat(64),
      usage:null,broker_result:{content:'synthetic evidence'},created_at_utc:'2026-08-25T16:00:00.000Z',
    };
    await writeFile(options.outputPath,`${JSON.stringify(result,null,2)}\n`,{flag:'wx',mode:0o600});
    return result;
  };
  const summary=await runOpenRouterAlignmentArenaV1({
    trialPath:'trial.json',stagingRoot:'stage',manifestPath:'manifest.json',outputRoot:out,admissionAtUtc:'2026-08-24T06:00:00.000Z',
  },{
    env:{
      VOID_OPENROUTER_ARENA_ENABLE:'1',VOID_OPENROUTER_ENABLE:'1',VOID_OPENROUTER_ACK_PROVIDER_POLICY:'1',
      VOID_OPENROUTER_ACK_PUBLIC_RETENTION:'1',VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256:'9'.repeat(64),
      VOID_OPENROUTER_ACK_REGISTRY_SHA256:rsha,VOID_OPENROUTER_ARENA_MODE:'qualification',
      VOID_OPENROUTER_ARENA_DELAY_MS:'0',VOID_OPENROUTER_MAX_TOKENS:'4096',
      VOID_OPENROUTER_CHAT_TIMEOUT_MS:'120000',VOID_OPENROUTER_ARENA_LOGICAL_OPERATION_INTENT_SHA256:arenaIntent,
    },
    registry:r,outputRootFd:outHandle.fd,runContestantFn:fakeRunner,sleepFn:async()=>{},emitOutput:false,
  });
  assert.equal(summary.requested_contestants,2);assert.equal(summary.green_contestants,1);assert.equal(summary.held_contestants,1);
  const green=summary.records.find(x=>x.run_status==='GREEN'),held=summary.records.find(x=>x.run_status==='HOLD');
  assert.match(green.broker_operation_id,/^apollyon_op_v1:[0-9a-f]{64}$/);
  assert.match(green.broker_result_digest,/^[0-9a-f]{64}$/);
  assert.match(green.logical_operation_intent_sha256,/^[0-9a-f]{64}$/);
  for(const legacy of ['execution_claim_sha256','execution_claim_semantic_sha256','execution_claim_root_generation_sha256']){
    assert.equal(Object.prototype.hasOwnProperty.call(green,legacy),false);
  }
  assert.equal(held.hold_reason.includes('sk-proofsecret0123456789'),false);
  assert.match(held.hold_reason,/REDACTED/);
  assert.equal(calls.length,2);assert.notEqual(calls[0].intent,calls[1].intent);
  const persisted=JSON.parse(await readFile(join(out,'arena-summary.json'),'utf8'));
  assert.equal(JSON.stringify(persisted).includes('OPENROUTER_API_KEY'),false);
  console.log(`${PROOF_MARKER} passed=22 failed=0`);
}finally{
  await outHandle.close();await rm(root,{recursive:true,force:true});
}
