#!/usr/bin/env node
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const PROFILE_MARKER = 'VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_TRANSPORT_PROFILE_V1';
export const STATE_MARKER = 'VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_TRANSPORT_ADAPTER_STATE_V1';
export const RECEIPT_MARKER = 'VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_TRANSPORT_ADAPTER_RECEIPT_V1';
export const RESULT_MARKER = 'VOID_EXTERNAL_AGENT_PAID_WORK_FRESH_CANARY_CREDENTIAL_LIVE_TRANSPORT_ADAPTER_RESULT_V1';
export const FRESH_ACCOUNT = 'void-external-agent-e2e-fulfillment-canary-v1';
export const PHASES = ['request','review','activate','bind','duplicate_probe'] as const;
export type Phase = typeof PHASES[number];
export type HostRole = 'precision' | 'nimo';
export const CONFIRM: Record<Phase,string> = {
  request:'confirmFreshCanaryCredentialTransportRequest',
  review:'confirmFreshCanaryCredentialTransportReview',
  activate:'confirmFreshCanaryCredentialTransportActivation',
  bind:'confirmFreshCanaryCredentialTransportBinding',
  duplicate_probe:'confirmFreshCanaryCredentialTransportDuplicateProbe',
};
export const RECOVER: Record<Phase,string> = {
  request:'recoverFreshCanaryCredentialTransportRequest',
  review:'recoverFreshCanaryCredentialTransportReview',
  activate:'recoverFreshCanaryCredentialTransportActivation',
  bind:'recoverFreshCanaryCredentialTransportBinding',
  duplicate_probe:'recoverFreshCanaryCredentialTransportDuplicateProbe',
};

const SHA=/^[0-9a-f]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,180}$/;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const CAP=/wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/i;
const CRED=/voidapwc[A-Za-z0-9_.:-]{32,}/i;
const BAD_KEYS=new Set(['token','raw_token','rawtoken','credential_token','credentialtoken','bearer_token','bearertoken','secret','private_key','privatekey','signing_key','signingkey','api_key','apikey']);

export interface StageProfile {
  phase: Phase; host: HostRole; mode: 'mock'|'live'; command: string[];
  command_profile_sha256: string; command_source_path: string; command_source_sha256: string;
  expected_result_marker: string; timeout_ms: number; maximum_attempt_count: 1;
  raw_token_policy: 'never_return_raw_token'|'persist_raw_token_on_nimo_private_storage_only';
}
export interface TransportProfile {
  marker: typeof PROFILE_MARKER; version:1; fresh_wc_account:typeof FRESH_ACCOUNT;
  precision:{tailscale_ip:'100.122.245.125';node_id:'9d89483769e469e0473b489dc50dba96'};
  nimo:{tailscale_ip:'100.122.198.38';node_id:'befd84d4fe47341af81b1a8aef8bcb97'};
  stages:Record<Phase,StageProfile>;
  source_contract:{receipt_sha256:string;checkpoint_commit:string;controller_sha256:string};
}
export interface AdapterRequest {
  operation_id:string; phase:Phase; request_id:string; fresh_wc_account:typeof FRESH_ACCOUNT;
  credential_id:string; agent_id:string; requested_scopes:['submit']; expires_at_utc:string;
  prior_receipt_sha256:string|null;
}
export interface AdapterState {
  marker:typeof STATE_MARKER; version:1; adapter_operation_id:string; phase:Phase;
  status:'prepared'|'attempting'|'held'|'completed'; attempt_count:0|1;
  created_at_utc:string; updated_at_utc:string; profile_path:string; profile_sha256:string;
  request_path:string; request_sha256:string; host:HostRole; command_profile_sha256:string;
  command_source_sha256:string; attempted_at_utc:string|null; completed_at_utc:string|null;
  raw_result_path:string|null; raw_result_sha256:string|null; receipt_path:string|null;
  receipt_sha256:string|null; hold_reason:string|null;
}
export type AdapterTransport=(phase:Phase,request:AdapterRequest,stage:StageProfile)=>Promise<Record<string,unknown>>;

function now():string{return new Date().toISOString().replace(/\.\d{3}Z$/,'Z');}
function hash(v:Buffer|string):string{return createHash('sha256').update(v).digest('hex');}
function stable(v:unknown):string{if(Array.isArray(v))return `[${v.map(stable).join(',')}]`;if(v&&typeof v==='object'){const r=v as Record<string,unknown>;return `{${Object.keys(r).sort().map(k=>`${JSON.stringify(k)}:${stable(r[k])}`).join(',')}}`;}return JSON.stringify(v);}
function contentId(prefix:string,v:unknown):string{return `${prefix}_${hash(stable(v))}`;}
function ensureDir(p:string):void{if(!existsSync(p))mkdirSync(p,{recursive:true,mode:0o700});chmodSync(p,0o700);}
function writeJson(p:string,v:unknown):void{ensureDir(dirname(p));const t=`${p}.tmp-${process.pid}-${Date.now()}`;const fd=openSync(t,'wx',0o600);try{writeFileSync(fd,`${JSON.stringify(v,null,2)}\n`,'utf8');}finally{closeSync(fd);}chmodSync(t,0o600);renameSync(t,p);chmodSync(p,0o600);}
function readJson(p:string):Record<string,unknown>{if(!statSync(p).isFile())throw new Error(`not a regular file: ${p}`);return JSON.parse(readFileSync(p,'utf8')) as Record<string,unknown>;}
function clean(v:unknown,label:string):void{const walk=(n:unknown,p='$'):void=>{if(typeof n==='string'){if(CAP.test(n))throw new Error(`${label} raw capability token at ${p}`);return;}if(Array.isArray(n)){n.forEach((x,i)=>walk(x,`${p}[${i}]`));return;}if(!n||typeof n!=='object')return;for(const [k,x] of Object.entries(n as Record<string,unknown>)){if(BAD_KEYS.has(k.toLowerCase().replace(/[^a-z0-9_]/g,'')))throw new Error(`${label} prohibited key ${p}.${k}`);walk(x,`${p}.${k}`);}};walk(v);}
function s(v:unknown,label:string,pat=ID):string{if(typeof v!=='string'||!pat.test(v))throw new Error(`${label} format mismatch`);return v;}
function hostFor(_phase:Phase):HostRole{return 'precision';}
function policyFor(p:Phase):StageProfile['raw_token_policy']{return p==='request'?'persist_raw_token_on_nimo_private_storage_only':'never_return_raw_token';}
export function profileDigest(stage:Omit<StageProfile,'command_profile_sha256'>):string{return hash(stable(stage));}

export function validateProfile(v:Record<string,unknown>):TransportProfile{
  clean(v,'profile');
  if(v.marker!==PROFILE_MARKER||v.version!==1||v.fresh_wc_account!==FRESH_ACCOUNT)throw new Error('profile identity mismatch');
  const precision=v.precision as Record<string,unknown>,nimo=v.nimo as Record<string,unknown>;
  if(precision?.tailscale_ip!=='100.122.245.125'||precision?.node_id!=='9d89483769e469e0473b489dc50dba96')throw new Error('Precision profile mismatch');
  if(nimo?.tailscale_ip!=='100.122.198.38'||nimo?.node_id!=='befd84d4fe47341af81b1a8aef8bcb97')throw new Error('Nimo profile mismatch');
  const stages=v.stages as Record<string,unknown>;
  for(const phase of PHASES){const st=stages?.[phase] as Record<string,unknown>;if(!st||st.phase!==phase||st.host!==hostFor(phase)||(st.mode!=='mock'&&st.mode!=='live'))throw new Error(`${phase} stage identity mismatch`);if(!Array.isArray(st.command)||st.command.length===0||!st.command.every(x=>typeof x==='string'&&x.length>0))throw new Error(`${phase} command mismatch`);s(st.command_profile_sha256,`${phase}.command_profile_sha256`,SHA);s(st.command_source_sha256,`${phase}.command_source_sha256`,SHA);s(st.expected_result_marker,`${phase}.expected_result_marker`,/^[A-Z0-9_]{12,220}$/);if(typeof st.command_source_path!=='string'||!st.command_source_path)throw new Error(`${phase} source path mismatch`);if(typeof st.timeout_ms!=='number'||!Number.isInteger(st.timeout_ms)||st.timeout_ms<1000||st.timeout_ms>300000)throw new Error(`${phase} timeout mismatch`);if(st.maximum_attempt_count!==1||st.raw_token_policy!==policyFor(phase))throw new Error(`${phase} authority mismatch`);const noDigest={phase:st.phase,host:st.host,mode:st.mode,command:st.command,command_source_path:st.command_source_path,command_source_sha256:st.command_source_sha256,expected_result_marker:st.expected_result_marker,timeout_ms:st.timeout_ms,maximum_attempt_count:st.maximum_attempt_count,raw_token_policy:st.raw_token_policy} as Omit<StageProfile,'command_profile_sha256'>;if(profileDigest(noDigest)!==st.command_profile_sha256)throw new Error(`${phase} command profile SHA mismatch`);}
  const src=v.source_contract as Record<string,unknown>;if(!src||typeof src.receipt_sha256!=='string'||!SHA.test(src.receipt_sha256)||typeof src.checkpoint_commit!=='string'||!/^[0-9a-f]{40}$/.test(src.checkpoint_commit)||typeof src.controller_sha256!=='string'||!SHA.test(src.controller_sha256))throw new Error('source contract mismatch');
  return v as unknown as TransportProfile;
}
export function validateRequest(v:Record<string,unknown>,phase:Phase):AdapterRequest{clean(v,'request');if(v.phase!==phase||v.fresh_wc_account!==FRESH_ACCOUNT)throw new Error('request identity mismatch');s(v.operation_id,'operation_id');s(v.request_id,'request_id');s(v.credential_id,'credential_id');s(v.agent_id,'agent_id');if(typeof v.expires_at_utc!=='string'||!UTC.test(v.expires_at_utc))throw new Error('expiry mismatch');if(!Array.isArray(v.requested_scopes)||v.requested_scopes.length!==1||v.requested_scopes[0]!=='submit')throw new Error('scope mismatch');if(v.prior_receipt_sha256!==null&&(typeof v.prior_receipt_sha256!=='string'||!SHA.test(v.prior_receipt_sha256)))throw new Error('prior receipt mismatch');return v as unknown as AdapterRequest;}
function verifySource(st:StageProfile):void{const p=resolve(st.command_source_path);if(!statSync(p).isFile())throw new Error('command source is not a file');if(hash(readFileSync(p))!==st.command_source_sha256)throw new Error(`${st.phase} command source SHA mismatch`);}
function statePath(dir:string):string{return join(dir,'adapter-state-v1.json');}
function loadState(dir:string):AdapterState{const v=readJson(statePath(dir));if(v.marker!==STATE_MARKER||v.version!==1)throw new Error('state identity mismatch');return v as unknown as AdapterState;}
function saveState(dir:string,v:AdapterState):void{v.updated_at_utc=now();writeJson(statePath(dir),v);}
function prepare(profilePath:string,requestPath:string,stateRoot:string,phase:Phase,host:HostRole){const pp=resolve(profilePath),rp=resolve(requestPath);const profile=validateProfile(readJson(pp));const request=validateRequest(readJson(rp),phase);const stage=profile.stages[phase];if(host!==hostFor(phase))throw new Error(`${phase} must run on ${hostFor(phase)}`);verifySource(stage);const ps=hash(readFileSync(pp)),rs=hash(readFileSync(rp));const id=contentId('voidapwcredliveadapter1',{phase,profile_sha256:ps,request_sha256:rs,host});const dir=join(resolve(stateRoot),id);ensureDir(dir);if(existsSync(statePath(dir))){const state=loadState(dir);if(state.profile_sha256!==ps||state.request_sha256!==rs||state.phase!==phase||state.host!==host)throw new Error('existing state mismatch');return {dir,state,profile,request,stage};}const created=now();const state:AdapterState={marker:STATE_MARKER,version:1,adapter_operation_id:id,phase,status:'prepared',attempt_count:0,created_at_utc:created,updated_at_utc:created,profile_path:pp,profile_sha256:ps,request_path:rp,request_sha256:rs,host,command_profile_sha256:stage.command_profile_sha256,command_source_sha256:stage.command_source_sha256,attempted_at_utc:null,completed_at_utc:null,raw_result_path:null,raw_result_sha256:null,receipt_path:null,receipt_sha256:null,hold_reason:null};writeJson(statePath(dir),state);return {dir,state,profile,request,stage};}
function commandTransport(phase:Phase,request:AdapterRequest,stage:StageProfile):Promise<Record<string,unknown>>{const c=spawnSync(stage.command[0],stage.command.slice(1),{input:`${JSON.stringify(request)}\n`,encoding:'utf8',maxBuffer:4*1024*1024,timeout:stage.timeout_ms,env:{...process.env,VOID_FRESH_CREDENTIAL_TRANSPORT_PHASE:phase,VOID_FRESH_CREDENTIAL_TRANSPORT_HOST:stage.host,VOID_FRESH_CREDENTIAL_TRANSPORT_PROFILE_SHA256:stage.command_profile_sha256}});if(c.error)throw c.error;if(c.status!==0)throw new Error(`${phase} command failed with exit ${c.status}: ${c.stderr}`);return Promise.resolve(JSON.parse(c.stdout) as Record<string,unknown>);}
function validateResult(phase:Phase,r:Record<string,unknown>,st:StageProfile,q:AdapterRequest):Record<string,unknown>{clean(r,`${phase} result`);if(r.marker!==st.expected_result_marker||r.version!==1||r.ok!==true||r.phase!==phase||r.operation_id!==q.operation_id||r.request_id!==q.request_id||r.credential_id!==q.credential_id||r.agent_id!==q.agent_id)throw new Error(`${phase} result identity mismatch`);s(r.token_hash,`${phase}.token_hash`,SHA);if(phase==='request'){if(r.request_status!=='created'||r.private_token_persisted_on_nimo!==true||r.raw_token_returned!==false||typeof r.private_token_path_sha256!=='string'||!SHA.test(r.private_token_path_sha256))throw new Error('request result mismatch');}else if(phase==='review'){if(r.review_decision!=='approved'||r.scope!=='submit'||r.destination_wc_account!==FRESH_ACCOUNT)throw new Error('review result mismatch');}else if(phase==='activate'){if(r.activation_status!=='active'||r.scope!=='submit'||r.expires_at_utc!==q.expires_at_utc)throw new Error('activate result mismatch');}else if(phase==='bind'){if(r.binding_status!=='active'||r.destination_wc_account!==FRESH_ACCOUNT||r.active_binding_count_after!==1||typeof r.binding_id!=='string'||!ID.test(r.binding_id)||typeof r.registry_sha256_after!=='string'||!SHA.test(r.registry_sha256_after))throw new Error('bind result mismatch');}else{if(r.duplicate_probe_verified!==true||r.second_binding_created!==false||r.active_binding_count_after!==1||typeof r.binding_id!=='string'||!ID.test(r.binding_id))throw new Error('duplicate probe result mismatch');}return r;}
function finish(dir:string,state:AdapterState,st:StageProfile,q:AdapterRequest,r:Record<string,unknown>):AdapterState{const raw=join(dir,'raw-result-private-v1.json');writeJson(raw,r);const rawSha=hash(readFileSync(raw));const done=now();const receipt={marker:RECEIPT_MARKER,version:1,adapter_operation_id:state.adapter_operation_id,phase:state.phase,host:state.host,completed_at_utc:done,profile_sha256:state.profile_sha256,request_sha256:state.request_sha256,command_profile_sha256:st.command_profile_sha256,command_source_sha256:st.command_source_sha256,raw_result_sha256:rawSha,result_marker:r.marker,operation_id:q.operation_id,request_id:q.request_id,credential_id:q.credential_id,agent_id:q.agent_id,token_hash:r.token_hash,fresh_wc_account:FRESH_ACCOUNT,raw_token_present:false,maximum_attempt_count:1,live_mutation:st.mode==='live'&&state.phase!=='duplicate_probe'};clean(receipt,'receipt');const rp=join(dir,'sanitized-adapter-receipt-v1.json');writeJson(rp,receipt);const updated:AdapterState={...state,status:'completed',completed_at_utc:done,raw_result_path:raw,raw_result_sha256:rawSha,receipt_path:rp,receipt_sha256:hash(readFileSync(rp)),hold_reason:null};saveState(dir,updated);return updated;}
export async function executeAdapter(args:{profilePath:string;requestPath:string;stateRoot:string;phase:Phase;actualHost:HostRole;confirmation:string;allowLive:boolean;transport?:AdapterTransport;}):Promise<AdapterState>{if(args.confirmation!==CONFIRM[args.phase])throw new Error('confirmation mismatch');const p=prepare(args.profilePath,args.requestPath,args.stateRoot,args.phase,args.actualHost);if(p.stage.mode==='live'&&args.allowLive!==true)throw new Error('live stage requires --allow-live');if(p.state.status==='completed')return p.state;if(p.state.status==='attempting'||p.state.status==='held')throw new Error('ambiguous/held stage requires recovery');if(p.state.attempt_count!==0)throw new Error('attempt count nonzero');const attempting={...p.state,status:'attempting' as const,attempt_count:1 as const,attempted_at_utc:now()};saveState(p.dir,attempting);try{const raw=await (args.transport??commandTransport)(args.phase,p.request,p.stage);return finish(p.dir,attempting,p.stage,p.request,validateResult(args.phase,raw,p.stage,p.request));}catch(e){const held=loadState(p.dir);held.status='held';held.hold_reason=e instanceof Error?e.message:String(e);saveState(p.dir,held);throw e;}}
export async function recoverAdapter(args:{profilePath:string;requestPath:string;stateRoot:string;phase:Phase;actualHost:HostRole;confirmation:string;rawResultPath:string;}):Promise<AdapterState>{if(args.confirmation!==RECOVER[args.phase])throw new Error('recovery confirmation mismatch');const p=prepare(args.profilePath,args.requestPath,args.stateRoot,args.phase,args.actualHost);if(p.state.status==='completed')return p.state;if((p.state.status!=='held'&&p.state.status!=='attempting')||p.state.attempt_count!==1)throw new Error('stage not recoverable');const raw=readJson(resolve(args.rawResultPath));return finish(p.dir,p.state,p.stage,p.request,validateResult(args.phase,raw,p.stage,p.request));}
export function inspectAdapter(profilePath:string,requestPath:string,stateRoot:string,phase:Phase,host:HostRole):Record<string,unknown>{const p=prepare(profilePath,requestPath,stateRoot,phase,host);return {marker:RESULT_MARKER,version:1,adapter_operation_id:p.state.adapter_operation_id,phase,host,status:p.state.status,attempt_count:p.state.attempt_count,profile_sha256:p.state.profile_sha256,request_sha256:p.state.request_sha256,command_profile_sha256:p.state.command_profile_sha256,command_source_sha256:p.state.command_source_sha256,receipt_sha256:p.state.receipt_sha256,raw_token_present:false};}
function arg(name:string):string|undefined{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;}
async function cli():Promise<void>{const cmd=process.argv[2],profile=arg('--profile'),request=arg('--request'),root=arg('--state-root'),phase=arg('--phase') as Phase|undefined,host=arg('--host') as HostRole|undefined;if(!profile||!request||!root||!phase||!host||!PHASES.includes(phase)||!['precision','nimo'].includes(host))throw new Error('requires --profile --request --state-root --phase --host');if(cmd==='inspect'){console.log(JSON.stringify(inspectAdapter(profile,request,root,phase,host),null,2));return;}if(cmd==='run-stage'){const confirmation=arg('--confirm');if(!confirmation)throw new Error('run-stage requires --confirm');console.log(JSON.stringify(await executeAdapter({profilePath:profile,requestPath:request,stateRoot:root,phase,actualHost:host,confirmation,allowLive:arg('--allow-live')==='true'}),null,2));return;}if(cmd==='recover-stage'){const confirmation=arg('--confirm'),raw=arg('--raw-result');if(!confirmation||!raw)throw new Error('recover-stage requires --confirm and --raw-result');console.log(JSON.stringify(await recoverAdapter({profilePath:profile,requestPath:request,stateRoot:root,phase,actualHost:host,confirmation,rawResultPath:raw}),null,2));return;}throw new Error('usage: inspect | run-stage | recover-stage');}
if(process.argv[1]&&basename(process.argv[1])==='external_agent_paid_work_fresh_canary_credential_live_transport_adapters_v1.ts'){cli().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});}
