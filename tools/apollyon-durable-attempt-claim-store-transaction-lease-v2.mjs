// VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_TRANSACTION_LEASE_V2
// Linux advisory serialization for cooperating operations on one retained store inode.
// Import and construction do not start a process or mutate the store. Each valid operation
// runs only the fixed flock descriptor helper, then retains its private open-file description
// through the core's final rereads and descriptor cleanup. Installed origin, exclusion of
// nonparticipating writers, root replacement/migration and privileged revalidation are unproven.
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {types} from "node:util";

import {
  createApollyonDurableAttemptClaimStoreServiceCoreV2,
} from "./apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_TRANSACTION_LEASE_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_TRANSACTION_LEASE_V2";

const RUN_FLOCK=spawnSync;
const FLOCK_PATH="/usr/bin/flock";
const FLOCK_ARGS=Object.freeze([
  "--exclusive","--nonblock","--conflict-exit-code","75","3",
]);
const HELPER_ENV=Object.freeze(Object.assign(Object.create(null),{
  PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
}));
const CONFIG_KEYS=Object.freeze([
  "root_fd","claim_uid","claim_gid","session_binding_id","revalidate",
]);
const CONTEXT_KEYS=Object.freeze([
  "root_identity_sha256","session_binding_id","store_generation_id",
  "store_generation_record_id","authorization_slot_id","claim_record_id",
  "publish_request_sha256",
]);
const IDENTITY_KEYS=Object.freeze(["dev","ino","mode","uid","gid","nlink","size"]);

function leaseError(code,cause){
  const error=new Error(code,cause===undefined?undefined:{cause});
  error.code=code;
  return error;
}
function fail(code){throw leaseError(code);}
function exactDataInput(input,keys,code){
  if(!input||typeof input!=="object"||types.isProxy(input)||Array.isArray(input))fail(code);
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  // Reject oversized or unexpected own-key sets before materializing every
  // property descriptor of a caller-owned object. The core uses the same
  // bounded pre-snapshot convention for untrusted records.
  const own=Reflect.ownKeys(input);
  if(
    own.length!==keys.length||
    own.some(key=>typeof key!=="string"||!keys.includes(key))
  )fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(input);
  const snapshot={};
  for(const key of keys){
    const descriptor=descriptors[key];
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
    snapshot[key]=descriptor.value;
  }
  return Object.freeze(snapshot);
}
function rootSnapshot(fd,config,code){
  let st;
  try{st=fs.fstatSync(fd,{bigint:true});}
  catch(error){throw leaseError(code,error);}
  for(const key of [...IDENTITY_KEYS,"mtimeNs","ctimeNs"]){
    if(typeof st[key]!=="bigint")fail(code);
  }
  for(const key of IDENTITY_KEYS){
    if(st[key]<0n)fail(code);
  }
  for(const key of ["uid","gid","nlink","size"]){
    if(st[key]>BigInt(Number.MAX_SAFE_INTEGER))fail(code);
  }
  if(!st.isDirectory()||st.uid!==BigInt(config.claim_uid)||
     st.gid!==BigInt(config.claim_gid)||(st.mode&0o7777n)!==0o700n)fail(code);
  return Object.freeze({
    dev:String(st.dev),ino:String(st.ino),mode:Number(st.mode&0o7777n),
    uid:Number(st.uid),gid:Number(st.gid),nlink:Number(st.nlink),size:Number(st.size),
    mtime_ns:String(st.mtimeNs),ctime_ns:String(st.ctimeNs),
  });
}
function sameIdentity(left,right){
  return IDENTITY_KEYS.every(key=>left[key]===right[key]);
}
function requireSnapshot(fd,config,expected,code){
  const actual=rootSnapshot(fd,config,code);
  if(!sameIdentity(actual,expected)||actual.mtime_ns!==expected.mtime_ns||
     actual.ctime_ns!==expected.ctime_ns)fail(code);
}
function closeOnce(fd){
  // A failing close can already have released/recycled the descriptor. Never retry it.
  try{fs.closeSync(fd);}
  catch(error){throw leaseError("apollyon_claim_store_lease_v2_descriptor_close_failed",error);}
}
function closeAfterFailure(fd,primaryError){
  try{closeOnce(fd);}
  catch(closeError){
    const error=leaseError("apollyon_claim_store_lease_v2_acquisition_cleanup_failed",primaryError);
    error.cleanup_errors=Object.freeze([Object.freeze({
      code:closeError.code,role:"transaction_lock_descriptor",cause:closeError,
    })]);
    throw error;
  }
  throw primaryError;
}
function acquireFlock(fd){
  let result;
  try{
    result=RUN_FLOCK(FLOCK_PATH,FLOCK_ARGS,{
      stdio:["ignore","ignore","pipe",fd],
      cwd:"/",
      env:HELPER_ENV,
      shell:false,
      windowsHide:true,
      timeout:5000,
      killSignal:"SIGKILL",
      maxBuffer:8*1024,
      encoding:"utf8",
    });
  }catch(error){throw leaseError("apollyon_claim_store_lease_v2_helper_failed",error);}
  // Neither helper output nor an ambiguous exit is evidence of lock acquisition.
  if(result.error||result.signal!==null){
    throw leaseError("apollyon_claim_store_lease_v2_helper_failed",result.error);
  }
  if(result.status===75)fail("apollyon_claim_store_lease_v2_busy");
  if(result.status!==0)fail("apollyon_claim_store_lease_v2_helper_failed");
}

export function createApollyonDurableAttemptClaimStoreServiceWithLinuxTransactionV2(config){
  const cfg=exactDataInput(config,CONFIG_KEYS,"apollyon_claim_store_lease_v2_config_invalid");
  let core;
  let unusable=false;
  let active=false;

  function acquireExclusiveStoreTransaction(context){
    if(unusable)fail("apollyon_claim_store_lease_v2_provider_unusable");
    if(active)fail("apollyon_claim_store_lease_v2_reentry");
    active=true;
    let privateFd=-1;
    let before;
    try{
      const binding=exactDataInput(context,CONTEXT_KEYS,
        "apollyon_claim_store_lease_v2_context_invalid");
      if(CONTEXT_KEYS.some(key=>typeof binding[key]!=="string")||
         binding.root_identity_sha256!==core.root_identity_sha256||
         binding.session_binding_id!==cfg.session_binding_id){
        fail("apollyon_claim_store_lease_v2_context_invalid");
      }
      const code="apollyon_claim_store_lease_v2_root_changed";
      before=rootSnapshot(cfg.root_fd,cfg,code);
      if(!sameIdentity(before,core.root_identity))fail(code);
      // This is a new open-file description, not dup(). The intentional procfs symlink
      // traversal is bracketed by exact borrowed/private descriptor identity checks.
      privateFd=fs.openSync("/proc/self/fd/"+String(cfg.root_fd),
        fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NONBLOCK|
        (fs.constants.O_CLOEXEC??0));
      requireSnapshot(privateFd,cfg,before,code);
      requireSnapshot(cfg.root_fd,cfg,before,code);
      acquireFlock(privateFd);
      requireSnapshot(privateFd,cfg,before,code);
      requireSnapshot(cfg.root_fd,cfg,before,code);
    }catch(error){
      unusable=true;
      active=false;
      if(privateFd!==-1)closeAfterFailure(privateFd,error);
      throw error;
    }

    const ownedFd=privateFd;
    let released=false;
    const lease=Object.freeze({
      release(){
        if(released||this!==lease||arguments.length!==0){
          unusable=true;
          fail("apollyon_claim_store_lease_v2_release_invalid");
        }
        released=true;
        let verificationError;
        try{
          // The borrowed descriptor may now be closed/reused; only our retained owner
          // is relevant to releasing this lock. Its root must remain unchanged.
          requireSnapshot(ownedFd,cfg,before,"apollyon_claim_store_lease_v2_root_changed");
        }catch(error){verificationError=error;}
        let closeError;
        try{closeOnce(ownedFd);}
        catch(error){closeError=error;}
        active=false;
        if(verificationError||closeError){
          unusable=true;
          const error=leaseError("apollyon_claim_store_lease_v2_release_failed",
            verificationError??closeError);
          if(verificationError&&closeError){
            error.cleanup_errors=Object.freeze([Object.freeze({
              code:closeError.code,role:"transaction_lock_descriptor",cause:closeError,
            })]);
          }
          throw error;
        }
        return undefined;
      },
    });
    return lease;
  }

  // The core validates non-root UID/GID, session, callback and Linux backend before
  // any acquisition. The private adapter and the core capture exactly the same config.
  core=createApollyonDurableAttemptClaimStoreServiceCoreV2({
    ...cfg,acquireExclusiveStoreTransaction,
  });
  return core;
}
