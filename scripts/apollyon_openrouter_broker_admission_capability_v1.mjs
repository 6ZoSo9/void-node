// VOID_APOLLYON_OPENROUTER_BROKER_ADMISSION_CAPABILITY_V1
// Exact-work local admission capability. The capability is carried inline over IPC;
// no shared writable admission directory exists. HMAC authority comes from a
// per-unit systemd credential and grants no provider retry/reclaim/resend authority.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { open as fsOpen, lstat as fsLstat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

const MODULE_ID='VOID_APOLLYON_OPENROUTER_BROKER_ADMISSION_CAPABILITY_V1';
const MARKER='VOID_APOLLYON_OPENROUTER_BROKER_ADMISSION_CAPABILITY_V1';
const ID_MARKER='VOID_APOLLYON_OPENROUTER_BROKER_ADMISSION_CAPABILITY_ID_V2';
const MAC_MARKER='VOID_APOLLYON_OPENROUTER_BROKER_ADMISSION_CAPABILITY_MAC_V1';
const REPLAY_MARKER='VOID_APOLLYON_OPENROUTER_BROKER_REPLAY_CAPABILITY_V1';
const REPLAY_ID_MARKER='VOID_APOLLYON_OPENROUTER_BROKER_REPLAY_CAPABILITY_ID_V1';
const REPLAY_MAC_MARKER='VOID_APOLLYON_OPENROUTER_BROKER_REPLAY_CAPABILITY_MAC_V1';
export const BROKER_ADMISSION_CREDENTIAL_ID='apollyon_openrouter_admission_mac_v1';
const HEX64=/^[0-9a-f]{64}$/, OP=/^apollyon_op_v1:[0-9a-f]{64}$/, TRIAL=/^voidat1_[0-9a-f]{64}$/, ADMISSION=/^voidaa1_[0-9a-f]{64}$/, CAP=/^voidobac1_[0-9a-f]{64}$/, REPLAY=/^voidobrc1_[0-9a-f]{64}$/;
const MODEL=/^[a-z0-9._-]+\/[A-Za-z0-9._:-]+$/, CANON=/^[a-z0-9._~-]+\/[A-Za-z0-9._~:-]+$/;
const MAC_KEY_BYTES=32;

function fail(m){throw new Error(`${MODULE_ID}: ${m}`)}
function plain(v){if(v===null||typeof v!=='object'||Array.isArray(v))return false;const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null}
function canonical(v){if(v===null||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))fail('nonfinite');return JSON.stringify(v)}if(typeof v==='string')return JSON.stringify(v);if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`;if(!plain(v))fail('nonplain');return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`}
function sha(b){return createHash('sha256').update(b).digest('hex')}
function binding(raw){if(!plain(raw))fail('binding invalid');const keys=['operationId','logicalOperationIntentDigest','logicalWorkDigest','registrySha256','requestBodySha256'];if(Object.keys(raw).sort().join(',')!==[...keys].sort().join(','))fail('binding fields invalid');if(!OP.test(String(raw.operationId??'')))fail('operationId invalid');for(const k of keys.slice(1))if(!HEX64.test(String(raw[k]??'')))fail(`${k} invalid`);return Object.freeze({...raw})}
function macKey(raw){if(!Buffer.isBuffer(raw)||raw.length!==MAC_KEY_BYTES)fail('authority MAC key must be an exact 32-byte Buffer');return raw}

function provenance(input){
  const b=binding(input.binding);
  if(!TRIAL.test(String(input.trialId??''))||!ADMISSION.test(String(input.admissionId??'')))fail('trial/admission invalid');
  for(const x of [input.admissionReceiptSha256,input.promptSha256])if(!HEX64.test(String(x??'')))fail('provenance digest invalid');
  if(!MODEL.test(String(input.model??''))||!CANON.test(String(input.canonicalSlug??'')))fail('model invalid');
  return Object.freeze({
    binding:b,
    model:input.model,
    canonicalSlug:input.canonicalSlug,
    trialId:input.trialId,
    admissionId:input.admissionId,
    admissionReceiptSha256:input.admissionReceiptSha256,
    promptSha256:input.promptSha256,
  });
}

function unsignedCapability(input){
  const p=provenance(input),b=p.binding;
  const core={
    marker:MARKER,
    version:1,
    operation_id:b.operationId,
    logical_operation_intent_digest:b.logicalOperationIntentDigest,
    logical_work_digest:b.logicalWorkDigest,
    registry_sha256:b.registrySha256,
    request_body_sha256:b.requestBodySha256,
    model:p.model,
    canonical_slug:p.canonicalSlug,
    trial_id:p.trialId,
    admission_id:p.admissionId,
    admission_receipt_sha256:p.admissionReceiptSha256,
    prompt_sha256:p.promptSha256,
  };
  const capabilityId=`voidobac1_${sha(Buffer.concat([
    Buffer.from(`${ID_MARKER}\0`),
    Buffer.from(canonical(core)),
  ]))}`;
  return Object.freeze({
    marker:core.marker,
    version:core.version,
    capability_id:capabilityId,
    operation_id:core.operation_id,
    logical_operation_intent_digest:core.logical_operation_intent_digest,
    logical_work_digest:core.logical_work_digest,
    registry_sha256:core.registry_sha256,
    request_body_sha256:core.request_body_sha256,
    model:core.model,
    canonical_slug:core.canonical_slug,
    trial_id:core.trial_id,
    admission_id:core.admission_id,
    admission_receipt_sha256:core.admission_receipt_sha256,
    prompt_sha256:core.prompt_sha256,
  });
}

function macHex(key,unsigned){
  return createHmac('sha256',macKey(key))
    .update(Buffer.concat([
      Buffer.from(`${MAC_MARKER}\0`),
      Buffer.from(canonical(unsigned)),
    ]))
    .digest('hex');
}

export function brokerAdmissionCapabilityIdV1(input){
  return unsignedCapability(input).capability_id;
}

export function buildBrokerAdmissionCapabilityV1(input,key){
  const unsigned=unsignedCapability(input);
  return Object.freeze({
    ...unsigned,
    authority_mac_sha256:macHex(key,unsigned),
  });
}

export function validateBrokerAdmissionCapabilityV1(raw,expected,key){
  macKey(key);
  const fields=['marker','version','capability_id','operation_id','logical_operation_intent_digest','logical_work_digest','registry_sha256','request_body_sha256','model','canonical_slug','trial_id','admission_id','admission_receipt_sha256','prompt_sha256','authority_mac_sha256'];
  if(!plain(raw))fail('capability must be a plain object');
  const actual=Object.keys(raw).sort(),wanted=[...fields].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index]))fail('capability fields invalid');
  if(raw.marker!==MARKER||raw.version!==1||!CAP.test(String(raw.capability_id??'')))fail('capability marker/id invalid');
  if(!HEX64.test(String(raw.authority_mac_sha256??'')))fail('capability authority MAC invalid');

  const b=binding(expected.binding);
  if(raw.operation_id!==b.operationId
      ||raw.logical_operation_intent_digest!==b.logicalOperationIntentDigest
      ||raw.logical_work_digest!==b.logicalWorkDigest
      ||raw.registry_sha256!==b.registrySha256
      ||raw.request_body_sha256!==b.requestBodySha256
      ||raw.model!==expected.model
      ||raw.canonical_slug!==expected.canonicalSlug)fail('capability work binding mismatch');

  const unsigned=unsignedCapability({
    binding:b,
    model:raw.model,
    canonicalSlug:raw.canonical_slug,
    trialId:raw.trial_id,
    admissionId:raw.admission_id,
    admissionReceiptSha256:raw.admission_receipt_sha256,
    promptSha256:raw.prompt_sha256,
  });
  if(raw.capability_id!==unsigned.capability_id)fail('capability id does not bind full provenance');

  const expectedMac=Buffer.from(macHex(key,unsigned),'hex');
  const actualMac=Buffer.from(raw.authority_mac_sha256,'hex');
  if(expectedMac.length!==actualMac.length||!timingSafeEqual(expectedMac,actualMac))fail('capability authority MAC mismatch');

  return Object.freeze({
    capabilityId:raw.capability_id,
    trialId:raw.trial_id,
    admissionId:raw.admission_id,
    admissionReceiptSha256:raw.admission_receipt_sha256,
    promptSha256:raw.prompt_sha256,
  });
}


function unsignedReplayCapability(input){
  const p=provenance(input),b=p.binding;
  const core={
    marker:REPLAY_MARKER,version:1,scope:'accepted_result_read_only',
    operation_id:b.operationId,logical_operation_intent_digest:b.logicalOperationIntentDigest,
    logical_work_digest:b.logicalWorkDigest,registry_sha256:b.registrySha256,
    request_body_sha256:b.requestBodySha256,model:p.model,canonical_slug:p.canonicalSlug,
    trial_id:p.trialId,admission_id:p.admissionId,
    admission_receipt_sha256:p.admissionReceiptSha256,prompt_sha256:p.promptSha256,
  };
  const capabilityId=`voidobrc1_${sha(Buffer.concat([
    Buffer.from(`${REPLAY_ID_MARKER}\0`),Buffer.from(canonical(core)),
  ]))}`;
  return Object.freeze({...core,capability_id:capabilityId});
}
function replayMacHex(key,unsigned){
  return createHmac('sha256',macKey(key))
    .update(Buffer.concat([Buffer.from(`${REPLAY_MAC_MARKER}\0`),Buffer.from(canonical(unsigned))]))
    .digest('hex');
}
export function buildBrokerReplayCapabilityV1(input,key){
  const unsigned=unsignedReplayCapability(input);
  return Object.freeze({...unsigned,authority_mac_sha256:replayMacHex(key,unsigned)});
}
export function validateBrokerReplayCapabilityV1(raw,expected,key){
  macKey(key);
  const fields=['marker','version','scope','operation_id','logical_operation_intent_digest','logical_work_digest','registry_sha256','request_body_sha256','model','canonical_slug','trial_id','admission_id','admission_receipt_sha256','prompt_sha256','capability_id','authority_mac_sha256'];
  if(!plain(raw))fail('replay capability must be a plain object');
  const actual=Object.keys(raw).sort(),wanted=[...fields].sort();
  if(actual.length!==wanted.length||actual.some((field,index)=>field!==wanted[index]))fail('replay capability fields invalid');
  if(raw.marker!==REPLAY_MARKER||raw.version!==1||raw.scope!=='accepted_result_read_only'||!REPLAY.test(String(raw.capability_id??'')))fail('replay capability marker/id invalid');
  if(!HEX64.test(String(raw.authority_mac_sha256??'')))fail('replay capability authority MAC invalid');
  const b=binding(expected.binding);
  if(raw.operation_id!==b.operationId||raw.logical_operation_intent_digest!==b.logicalOperationIntentDigest
      ||raw.logical_work_digest!==b.logicalWorkDigest||raw.registry_sha256!==b.registrySha256
      ||raw.request_body_sha256!==b.requestBodySha256||raw.model!==expected.model
      ||raw.canonical_slug!==expected.canonicalSlug)fail('replay capability work binding mismatch');
  const unsigned=unsignedReplayCapability({
    binding:b,model:raw.model,canonicalSlug:raw.canonical_slug,trialId:raw.trial_id,
    admissionId:raw.admission_id,admissionReceiptSha256:raw.admission_receipt_sha256,
    promptSha256:raw.prompt_sha256,
  });
  if(raw.capability_id!==unsigned.capability_id)fail('replay capability id does not bind full provenance');
  const expectedMac=Buffer.from(replayMacHex(key,unsigned),'hex');
  const actualMac=Buffer.from(raw.authority_mac_sha256,'hex');
  if(expectedMac.length!==actualMac.length||!timingSafeEqual(expectedMac,actualMac))fail('replay capability authority MAC mismatch');
  return Object.freeze({
    capabilityId:raw.capability_id,trialId:raw.trial_id,admissionId:raw.admission_id,
    admissionReceiptSha256:raw.admission_receipt_sha256,promptSha256:raw.prompt_sha256,
    scope:'accepted_result_read_only',
  });
}

export async function readBrokerAdmissionMacCredentialV1(rawDirectory){
  const directory=String(rawDirectory??'').trim();
  if(!isAbsolute(directory)||directory.length<2||directory.length>4096||directory.includes('\0'))fail('CREDENTIALS_DIRECTORY is invalid');
  const dh=await fsOpen(directory,FS.O_RDONLY|FS.O_DIRECTORY|FS.O_NOFOLLOW);
  try{
    const dst=await dh.stat({bigint:true});
    if(!dst.isDirectory())fail('credential directory is not a directory');
    const path=`/proc/self/fd/${dh.fd}/${BROKER_ADMISSION_CREDENTIAL_ID}`;
    const fh=await fsOpen(path,FS.O_RDONLY|FS.O_NOFOLLOW|FS.O_NONBLOCK);
    try{
      const pre=await fh.stat({bigint:true});
      if(!pre.isFile()||pre.size!==BigInt(MAC_KEY_BYTES))fail(`admission MAC credential must be exactly ${MAC_KEY_BYTES} bytes`);
      const key=Buffer.alloc(MAC_KEY_BYTES);let p=0;
      while(p<key.length){const r=await fh.read(key,p,key.length-p,p);if(r.bytesRead===0)fail('admission MAC credential short read');p+=r.bytesRead}
      const post=await fh.stat({bigint:true});
      for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])if(pre[k]!==post[k])fail('admission MAC credential changed during read');
      const visible=await fsLstat(path,{bigint:true});
      if(!visible.isFile()||visible.dev!==post.dev||visible.ino!==post.ino)fail('admission MAC credential visible generation changed');
      return key;
    }finally{await fh.close().catch(()=>{})}
  }finally{await dh.close().catch(()=>{})}
}
