#!/usr/bin/env node
// Read-only live fee/chain qualification for Buy VOID Epoch-2.
// Live authority requires this reviewed Git object on stdin.
// No transaction calldata is constructed; no signer, nonce reservation,
// transaction submission, broadcast, or customer payment record is touched.
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_LIVE_FEE_CHAIN_QUALIFICATION_V1";
export const CONFIRM =
  "RUN_EPOCH2_LIVE_FEE_CHAIN_READ_ONLY_QUALIFICATION_V1";
export const STATUS =
  "EPOCH2_LIVE_FEE_CHAIN_QUALIFICATION_GREEN_REMAINING_CANARY_AND_ACTIVATION_HOLD";
export const NEXT_ACTION =
  "COMPLETE_CURRENT_CHAIN2050_ONE_PAYMENT_ONE_FULFILLMENT_CANARY";

const ROOT="/home/zoso/dev/void-node";

const CHILD_REL =
  "ops/precision/void_buy_void_epoch2_authenticated_credential_signer_control_binding_v1.mjs";
const CHILD_BLOB="6d68b52ec036e422a151239f9c8f3ee7faa28055";
const CHILD_CONFIRM =
  "RUN_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V1";
const CHILD_MARKER =
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V1";
const CHILD_STATUS =
  "EPOCH2_AUTHENTICATED_CREDENTIAL_AND_SIGNER_CONTROL_BOUND_REMAINING_GATES_HOLD";
const CHILD_NEXT_ACTION =
  "QUALIFY_LIVE_FEE_ENVELOPE_AND_EXACT_CHAIN_RECEIPT";

const CANDIDATE_REL =
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const CANDIDATE_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1";

const CHAIN_ID=2050n;
const RPC_URL="http://127.0.0.1:18553/";
const PRESALE="0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const FULFILLER="0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const TOKEN="0x470075b85352eb86f7d089fb9ba88945f12aad94";

const ACCEPTED_BLOCK_NUMBER=0xf0en;
const ACCEPTED_BLOCK_TAG="0xf0e";
const ACCEPTED_BLOCK_HASH=
  "0x67e0ceaeee70c966271d37ebda1b07ee8d33c9b16bf4016a0d9eaefc3126c942";
const PRESALE_CODE_SHA256=
  "b200e702e07140921813c83a833d4f4abacea61dd5863f08b0d9c1147b8da225";
const TOKEN_CODE_SHA256=
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb";
const EXPECTED_VALIDATORS=Object.freeze([
  "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
  "0x02f967953386188397b992c208239d3a25180db6",
  "0x461bf06270d9d28962f7570182c061b828799b66",
].sort());

const RUNTIME_UID=1000;
const RUNTIME_GID=1000;
const RUNTIME_HOME="/home/zoso";
const GIT="/usr/bin/git";
const NODE="/usr/bin/node";
const SETPRIV="/usr/bin/setpriv";

const OBSERVATION_WINDOW_MS=12_000;
const RPC_DEADLINE_MS=6_000;
const MAX_RPC_RESPONSE_BYTES=65_536;
const MAX_OUTPUT_BYTES=12*1024*1024;
const BPS=10_000n;

const SHA40=/^[0-9a-f]{40}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/u;

const RPC_ALLOWED=Object.freeze(new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "net_peerCount",
  "qbft_getValidatorsByBlockNumber",
  "eth_getCode",
  "eth_gasPrice",
  "eth_getBalance",
]));

function sha256Bytes(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))throw new Error("noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(!value||typeof value!=="object")throw new Error("noncanonical_value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

function safeReason(value){
  const text=String(value??"unknown")
    .replace(/[^A-Za-z0-9_.:-]+/gu,"_")
    .slice(0,240);
  return text||"unknown";
}

function cleanGitEnv(){
  return {
    PATH:"/usr/bin:/bin",
    HOME:RUNTIME_HOME,
    LANG:"C",
    LC_ALL:"C",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  };
}

function cleanRootEnv(){
  return {PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"};
}

function run(command,args,options={}){
  const result=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??cleanRootEnv(),
    input:options.input,
    encoding:"utf8",
    stdio:["pipe","pipe","pipe"],
    timeout:options.timeout??180_000,
    maxBuffer:MAX_OUTPUT_BYTES,
  });
  if(result.error)throw new Error("spawn_error:"+safeReason(result.error.message));
  return result;
}

function assertTrustedExecutable(file){
  const real=fs.realpathSync(file);
  const st=fs.lstatSync(real,{bigint:true});
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||
     (st.mode&0o022n)!==0n){
    throw new Error("trusted_executable_invalid:"+path.basename(file));
  }
}

function runAsRuntimeUser(command,args,options={}){
  return run(SETPRIV,[
    "--no-new-privs",
    "--reuid="+String(RUNTIME_UID),
    "--regid="+String(RUNTIME_GID),
    "--clear-groups",
    command,
    ...args,
  ],{
    cwd:options.cwd??ROOT,
    env:options.env??cleanGitEnv(),
    input:options.input,
    timeout:options.timeout??30_000,
  });
}

function git(args){
  const result=runAsRuntimeUser(GIT,[
    "--no-replace-objects",
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{env:cleanGitEnv(),timeout:20_000});
  if(result.status!==0)throw new Error("git_failed:"+String(args[0]||""));
  if(result.stderr!=="")throw new Error("git_unexpected_stderr:"+String(args[0]||""));
  return result.stdout;
}

function requireExactCheckout(expectedHead){
  if(!SHA40.test(String(expectedHead||"")))throw new Error("expected_head_invalid");
  if(git(["rev-parse","--verify","HEAD"]).trim()!==expectedHead){
    throw new Error("expected_head_mismatch");
  }
  if(git(["branch","--show-current"]).trim()!=="main"){
    throw new Error("branch_not_main");
  }
  if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
    throw new Error("worktree_not_clean");
  }
}

function gitObject(expectedHead,relative,expectedBlob){
  const bytes=Buffer.from(
    git(["cat-file","blob",expectedHead+":"+relative]),
    "utf8",
  );
  if(gitBlob(bytes)!==expectedBlob){
    bytes.fill(0);
    throw new Error("git_object_blob_mismatch:"+relative);
  }
  return bytes;
}

function parseJson(text,reason){
  if(typeof text!=="string"||text.length<2||
     Buffer.byteLength(text,"utf8")>MAX_OUTPUT_BYTES){
    throw new Error(reason);
  }
  try{
    const value=JSON.parse(text);
    if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();
    return value;
  }catch{
    throw new Error(reason);
  }
}

function quantity(value,label){
  const raw=String(value??"").toLowerCase();
  if(!QUANTITY.test(raw))throw new Error("rpc_quantity_invalid:"+label);
  return BigInt(raw);
}

function hash(value,label){
  const raw=String(value??"").toLowerCase();
  if(!HASH.test(raw))throw new Error("rpc_hash_invalid:"+label);
  return raw;
}

function address(value,label){
  const raw=String(value??"").toLowerCase();
  if(!ADDRESS.test(raw))throw new Error("rpc_address_invalid:"+label);
  return raw;
}

function codeSha(value,label){
  const raw=String(value??"").toLowerCase();
  if(!/^0x(?:[0-9a-f]{2})+$/u.test(raw) || raw.length>100_000){
    throw new Error("rpc_code_invalid:"+label);
  }
  return sha256Bytes(Buffer.from(raw.slice(2),"hex"));
}

function exactRoster(value,label){
  if(!Array.isArray(value)||value.length!==EXPECTED_VALIDATORS.length){
    throw new Error("validator_roster_invalid:"+label);
  }
  const normalized=value.map((row)=>address(row,label)).sort();
  for(let i=0;i<normalized.length;i+=1){
    if(normalized[i]!==EXPECTED_VALIDATORS[i]){
      throw new Error("validator_roster_invalid:"+label);
    }
  }
  return normalized;
}

function ceilMulDiv(value,multiplier,denominator){
  return (value*multiplier+denominator-1n)/denominator;
}

export function validateCandidatePolicy(candidate){
  if(candidate?.marker!=="VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2"||
     candidate.version!==2||
     candidate.canonical_chain_id!==2050||
     candidate.execution_epoch!==2||
     String(candidate.epoch2_presale_contract||"").toLowerCase()!==PRESALE||
     String(candidate.epoch2_fulfiller_public_address||"").toLowerCase()!==FULFILLER){
    throw new Error("candidate_header_invalid");
  }
  const c=candidate.candidate_configuration;
  if(!c||typeof c!=="object"||Array.isArray(c)||
     c.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL!==RPC_URL||
     c.VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS!=="15000"||
     c.VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT!=="320000"||
     c.VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS!=="20000"||
     c.VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI!=="3000000000"||
     c.VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI!=="0"||
     String(c.VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS||"").toLowerCase()!==PRESALE||
     String(c.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS||"").toLowerCase()!==FULFILLER){
    throw new Error("candidate_fee_policy_invalid");
  }
  return Object.freeze({
    rpc_url:RPC_URL,
    gas_limit_multiplier_bps:15_000n,
    accepted_max_gas_limit:320_000n,
    fee_multiplier_bps:20_000n,
    max_fee_per_gas_wei:3_000_000_000n,
    max_priority_fee_per_gas_wei:0n,
  });
}

function validateChild(child,expectedHead){
  if(child?.marker!==
      "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V1"||
     child.version!==1||
     child.status!==
      "EPOCH2_AUTHENTICATED_CREDENTIAL_AND_SIGNER_CONTROL_BOUND_REMAINING_GATES_HOLD"||
     child.source_head!==expectedHead||
     child.canonical_chain_id!==2050||
     child.execution_epoch!==2||
     child.epoch2_presale_contract!==PRESALE||
     child.epoch2_fulfiller_public_address!==FULFILLER||
     child.candidate_lineage_crosscheck!==true||
     child.closing_checkout_revalidated_before_receipt!==true||
     child.signer_credential_state?.signer_offchain_control_proven!==true||
     child.signer_credential_state?.launch_operator_signer_control_evidence_bound!==true||
     child.signer_credential_state?.systemd_credential_identity_proven!==true||
     child.signer_credential_state?.active_signing_capability_proven!==true||
     child.signer_credential_state?.runtime_source_generation_bound!==true||
     child.signer_credential_state?.authenticated_private_manager_generation_bound!==true||
     child.signer_credential_state?.current_system_credential_matches_immutable_fulfiller!==true||
     child.signer_credential_state?.transaction_signing_proven!==false||
     child.signer_credential_state?.transaction_broadcast_proven!==false||
     child.customer_safe_to_pay!==false||
     child.production_host_evidence_authority!==false||
     child.next_action!==CHILD_NEXT_ACTION||
     !/^voide2signcred1_[0-9a-f]{64}$/u.test(String(child.receipt_id||""))){
    throw new Error("credential_signer_control_child_invalid");
  }
  const authority=child.authority;
  if(!authority||authority.candidate_only!==true){
    throw new Error("credential_signer_control_child_authority_invalid");
  }
  for(const [key,value] of Object.entries(authority)){
    if(key!=="candidate_only"&&value!==false){
      throw new Error("credential_signer_control_child_authority_overclaim:"+key);
    }
  }
}

function stableChildRuntimeIdentity(child,expectedHead){
  validateChild(child,expectedHead);
  const binding=child.authenticated_credential_binding_receipt;
  const live=binding?.authenticated_credential_live_receipt;
  if(!binding||typeof binding!=="object"||Array.isArray(binding)||
     !live||typeof live!=="object"||Array.isArray(live)){
    throw new Error("credential_signer_control_nested_receipt_missing");
  }
  const identity={
    source_head:child.source_head,
    canonical_chain_id:child.canonical_chain_id,
    execution_epoch:child.execution_epoch,
    epoch2_presale_contract:child.epoch2_presale_contract,
    epoch2_fulfiller_public_address:child.epoch2_fulfiller_public_address,
    accepted_signer_control_candidate_git_blob:
      child.accepted_signer_control_candidate_git_blob,
    accepted_signer_control_public_evidence_git_blob:
      child.accepted_signer_control_public_evidence_git_blob,
    accepted_signer_control_evidence_id_sha256:
      child.accepted_signer_control_evidence_id_sha256,
    source_candidate_git_blob:binding.source_candidate_git_blob,
    credential_lock_id:live.credential_lock_id,
    runtime_uid:live.runtime_uid,
    manager_pid:live.manager_pid,
    manager_start_ticks:live.manager_start_ticks,
    main_pid:live.main_pid,
    service_start_ticks:live.service_start_ticks,
    credential_qualification_sha256:live.credential_qualification_sha256,
    signer_address:live.signer_address,
  };
  if(!SHA40.test(String(identity.source_candidate_git_blob||""))||
     identity.credential_lock_id!==
       "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"||
     identity.runtime_uid!==1000||
     !Number.isSafeInteger(identity.manager_pid)||identity.manager_pid<=1||
     !Number.isSafeInteger(identity.main_pid)||identity.main_pid<=1||
     typeof identity.manager_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(identity.manager_start_ticks)||
     typeof identity.service_start_ticks!=="string"||
     !/^[1-9][0-9]*$/u.test(identity.service_start_ticks)||
     !/^sha256:[0-9a-f]{64}$/u.test(
       String(identity.credential_qualification_sha256||"")
     )||
     identity.signer_address!==FULFILLER){
    throw new Error("credential_signer_control_stable_identity_invalid");
  }
  return Object.freeze(identity);
}

export function requireStableChildRuntimeIdentity(
  before,after,expectedHead
){
  const first=stableChildRuntimeIdentity(before,expectedHead);
  const second=stableChildRuntimeIdentity(after,expectedHead);
  if(canonical(first)!==canonical(second)){
    throw new Error(
      "credential_signer_control_generation_changed_during_fee_window"
    );
  }
  return first;
}

function loadCandidate(expectedHead){
  const raw=gitObject(expectedHead,CANDIDATE_REL,CANDIDATE_BLOB);
  try{
    const candidate=parseJson(raw.toString("utf8"),"candidate_json_invalid");
    const policy=validateCandidatePolicy(candidate);
    return {candidate,policy};
  }finally{
    raw.fill(0);
  }
}

function runChild(expectedHead){
  const source=gitObject(expectedHead,CHILD_REL,CHILD_BLOB);
  try{
    const result=run(NODE,[
      "--input-type=module",
      "-",
      "--run",
      "--confirm",
      CHILD_CONFIRM,
      "--expected-head",
      expectedHead,
    ],{
      env:cleanRootEnv(),
      input:source,
      timeout:240_000,
    });
    if(result.status!==0){
      let reason="credential_signer_control_child_failed:"+String(result.status);
      try{
        const held=JSON.parse(String(result.stderr||""));
        if(held&&typeof held.reason==="string")reason=held.reason;
      }catch(parseError){
        if(parseError instanceof Error)void parseError.message;
      }
      throw new Error(reason);
    }
    if(result.stderr!=="")throw new Error("credential_signer_control_child_unexpected_stderr");
    const child=parseJson(result.stdout,"credential_signer_control_child_json_invalid");
    validateChild(child,expectedHead);
    return child;
  }finally{
    source.fill(0);
  }
}

function createHttpTransport(){
  let nextId=0;
  return async ({method,params})=>{
    if(!RPC_ALLOWED.has(method))throw new Error("rpc_method_not_read_only");
    const id=++nextId;
    const body=Buffer.from(JSON.stringify({
      jsonrpc:"2.0",id,method,params,
    }),"utf8");
    if(body.length>16_384)throw new Error("rpc_request_too_large");

    return await new Promise((resolve,reject)=>{
      let settled=false;
      let timer=null;
      let request=null;
      const finish=(error,value)=>{
        if(settled)return;
        settled=true;
        if(timer!==null)clearTimeout(timer);
        if(error){
          request?.destroy();
          reject(error);
        }else{
          resolve(value);
        }
      };
      timer=setTimeout(
        ()=>finish(new Error("rpc_total_deadline_exceeded")),
        RPC_DEADLINE_MS,
      );
      timer.unref?.();
      request=http.request({
        protocol:"http:",
        hostname:"127.0.0.1",
        port:18553,
        path:"/",
        method:"POST",
        family:4,
        agent:false,
        timeout:RPC_DEADLINE_MS,
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          "Content-Length":String(body.length),
          Connection:"close",
          "User-Agent":"void-buy-void-e2-fee-chain-qualification-v1",
        },
      },(response)=>{
        if(response.statusCode!==200||
           !String(response.headers["content-type"]||"").toLowerCase()
             .startsWith("application/json")){
          response.resume();
          finish(new Error("rpc_http_or_content_type_invalid"));
          return;
        }
        const chunks=[];
        let size=0;
        response.on("data",(chunk)=>{
          if(settled)return;
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          size+=buffer.length;
          if(size>MAX_RPC_RESPONSE_BYTES){
            finish(new Error("rpc_response_oversize"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("aborted",()=>finish(new Error("rpc_response_aborted")));
        response.on("error",(error)=>finish(error));
        response.on("end",()=>{
          if(settled)return;
          try{
            const payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if(payload?.jsonrpc!=="2.0"||payload.id!==id||
               payload.error!==undefined||payload.result===undefined||
               payload.result===null){
              throw new Error("rpc_envelope_invalid");
            }
            finish(null,payload.result);
          }catch(error){
            finish(error);
          }
        });
      });
      request.on("timeout",()=>finish(new Error("rpc_inactivity_timeout")));
      request.on("error",(error)=>finish(error));
      request.end(body);
    });
  };
}

export async function observeFeeChainWithTransport(policy,transport,sleepFn){
  if(!policy||typeof policy!=="object"||
     typeof transport!=="function"||typeof sleepFn!=="function"){
    throw new Error("observer_dependencies_invalid");
  }
  const methods=[];
  const call=async(method,params)=>{
    if(!RPC_ALLOWED.has(method))throw new Error("rpc_method_not_read_only");
    methods.push(method);
    return await transport({method,params});
  };

  const chain=quantity(await call("eth_chainId",[]),"chain_id");
  if(chain!==CHAIN_ID)throw new Error("chain_id_mismatch");

  const accepted=await call("eth_getBlockByNumber",[ACCEPTED_BLOCK_TAG,false]);
  if(quantity(accepted?.number,"accepted_block_number")!==ACCEPTED_BLOCK_NUMBER||
     hash(accepted?.hash,"accepted_block_hash")!==ACCEPTED_BLOCK_HASH){
    throw new Error("accepted_history_mismatch");
  }

  const before=quantity(await call("eth_blockNumber",[]),"head_before");
  if(before<ACCEPTED_BLOCK_NUMBER)throw new Error("head_before_history_invalid");
  const beforeTag="0x"+before.toString(16);
  const beforeBlock=await call("eth_getBlockByNumber",[beforeTag,false]);
  const beforeHash=hash(beforeBlock?.hash,"head_before_hash");
  if(quantity(beforeBlock?.number,"head_before_number")!==before){
    throw new Error("head_before_block_mismatch");
  }
  exactRoster(
    await call("qbft_getValidatorsByBlockNumber",[beforeTag]),
    "validators_before",
  );
  const peersBefore=quantity(await call("net_peerCount",[]),"peers_before");
  if(peersBefore<2n)throw new Error("peer_quorum_before_invalid");

  const gasPriceFirst=quantity(await call("eth_gasPrice",[]),"gas_price_first");

  await sleepFn(OBSERVATION_WINDOW_MS);

  const after=quantity(await call("eth_blockNumber",[]),"head_after");
  if(after<=before)throw new Error("chain_not_progressing");
  const afterTag="0x"+after.toString(16);
  const afterBlock=await call("eth_getBlockByNumber",[afterTag,false]);
  const afterHash=hash(afterBlock?.hash,"head_after_hash");
  if(quantity(afterBlock?.number,"head_after_number")!==after){
    throw new Error("head_after_block_mismatch");
  }
  exactRoster(
    await call("qbft_getValidatorsByBlockNumber",[afterTag]),
    "validators_after",
  );
  const peersAfter=quantity(await call("net_peerCount",[]),"peers_after");
  if(peersAfter<2n)throw new Error("peer_quorum_after_invalid");

  const presaleCode=await call("eth_getCode",[PRESALE,afterTag]);
  const tokenCode=await call("eth_getCode",[TOKEN,afterTag]);
  if(codeSha(presaleCode,"presale")!==PRESALE_CODE_SHA256||
     codeSha(tokenCode,"token")!==TOKEN_CODE_SHA256){
    throw new Error("contract_code_identity_mismatch");
  }

  const gasPriceSecond=quantity(await call("eth_gasPrice",[]),"gas_price_second");
  const conservativeGasPrice=
    gasPriceFirst>gasPriceSecond?gasPriceFirst:gasPriceSecond;
  const computedMaxFee=ceilMulDiv(
    conservativeGasPrice,
    policy.fee_multiplier_bps,
    BPS,
  );
  if(computedMaxFee>policy.max_fee_per_gas_wei){
    throw new Error("computed_max_fee_exceeds_policy");
  }
  if(policy.max_priority_fee_per_gas_wei>computedMaxFee){
    throw new Error("priority_fee_exceeds_computed_max_fee");
  }

  const maxGasCost=policy.accepted_max_gas_limit*computedMaxFee;
  const nativeBalance=quantity(
    await call("eth_getBalance",[FULFILLER,"pending"]),
    "fulfiller_native_balance",
  );
  if(nativeBalance<maxGasCost){
    throw new Error("fulfiller_native_balance_insufficient");
  }

  const afterBlockRecheck=await call(
    "eth_getBlockByNumber",[afterTag,false]
  );
  if(quantity(afterBlockRecheck?.number,"head_after_recheck_number")!==after||
     hash(afterBlockRecheck?.hash,"head_after_recheck_hash")!==afterHash){
    throw new Error("final_block_revalidation_mismatch");
  }

  return Object.freeze({
    chain_id:"2050",
    accepted_history_block:ACCEPTED_BLOCK_NUMBER.toString(),
    accepted_history_hash:ACCEPTED_BLOCK_HASH,
    head_before:before.toString(),
    head_before_hash:beforeHash,
    head_after:after.toString(),
    head_after_hash:afterHash,
    blocks_produced:(after-before).toString(),
    validators_before_exact:true,
    validators_after_exact:true,
    peer_count_before:peersBefore.toString(),
    peer_count_after:peersAfter.toString(),
    presale_code_sha256:PRESALE_CODE_SHA256,
    token_code_sha256:TOKEN_CODE_SHA256,
    gas_price_wei_first:gasPriceFirst.toString(),
    gas_price_wei_second:gasPriceSecond.toString(),
    conservative_observed_gas_price_wei:conservativeGasPrice.toString(),
    gas_limit_multiplier_bps:policy.gas_limit_multiplier_bps.toString(),
    fee_multiplier_bps:policy.fee_multiplier_bps.toString(),
    accepted_max_gas_limit:policy.accepted_max_gas_limit.toString(),
    computed_max_fee_per_gas_wei:computedMaxFee.toString(),
    configured_priority_fee_per_gas_wei:
      policy.max_priority_fee_per_gas_wei.toString(),
    maximum_fee_per_gas_wei:policy.max_fee_per_gas_wei.toString(),
    maximum_gas_cost_wei:maxGasCost.toString(),
    fulfiller_native_balance_wei:nativeBalance.toString(),
    native_balance_sufficient:true,
    zero_fee_envelope:computedMaxFee===0n,
    nonzero_fee_envelope:computedMaxFee>0n,
    final_block_hash_revalidated:true,
    rpc_methods_used:Object.freeze([...methods]),
  });
}

async function observeFeeChainLive(policy){
  return await observeFeeChainWithTransport(
    policy,
    createHttpTransport(),
    async(ms)=>await new Promise((resolve)=>setTimeout(resolve,ms)),
  );
}

function decimalBigInt(value,label){
  const raw=String(value??"");
  if(!/^(?:0|[1-9][0-9]*)$/u.test(raw)){
    throw new Error("receipt_decimal_invalid:"+label);
  }
  return BigInt(raw);
}

function validateObservation(policy,observation){
  if(!observation||typeof observation!=="object"){
    throw new Error("fee_chain_observation_invalid");
  }
  if(observation.chain_id!=="2050"||
     observation.accepted_history_block!==ACCEPTED_BLOCK_NUMBER.toString()||
     observation.accepted_history_hash!==ACCEPTED_BLOCK_HASH||
     observation.presale_code_sha256!==PRESALE_CODE_SHA256||
     observation.token_code_sha256!==TOKEN_CODE_SHA256||
     observation.validators_before_exact!==true||
     observation.validators_after_exact!==true||
     observation.native_balance_sufficient!==true||
     observation.final_block_hash_revalidated!==true){
    throw new Error("fee_chain_observation_not_green");
  }
  const before=decimalBigInt(observation.head_before,"head_before");
  const after=decimalBigInt(observation.head_after,"head_after");
  if(after<=before)throw new Error("fee_chain_head_progress_invalid");

  const first=decimalBigInt(observation.gas_price_wei_first,"gas_price_first");
  const second=decimalBigInt(observation.gas_price_wei_second,"gas_price_second");
  const conservative=decimalBigInt(
    observation.conservative_observed_gas_price_wei,
    "gas_price_conservative",
  );
  const expectedConservative=first>second?first:second;
  if(conservative!==expectedConservative){
    throw new Error("fee_chain_conservative_gas_price_invalid");
  }

  if(decimalBigInt(observation.gas_limit_multiplier_bps,"gas_multiplier")!==
       policy.gas_limit_multiplier_bps||
     decimalBigInt(observation.fee_multiplier_bps,"fee_multiplier")!==
       policy.fee_multiplier_bps||
     decimalBigInt(observation.accepted_max_gas_limit,"gas_limit")!==
       policy.accepted_max_gas_limit||
     decimalBigInt(observation.maximum_fee_per_gas_wei,"max_fee_policy")!==
       policy.max_fee_per_gas_wei||
     decimalBigInt(
       observation.configured_priority_fee_per_gas_wei,
       "priority_fee_policy",
     )!==policy.max_priority_fee_per_gas_wei){
    throw new Error("fee_chain_policy_projection_invalid");
  }

  const computed=decimalBigInt(
    observation.computed_max_fee_per_gas_wei,
    "computed_max_fee",
  );
  const expectedComputed=ceilMulDiv(
    conservative,policy.fee_multiplier_bps,BPS
  );
  if(computed!==expectedComputed||computed>policy.max_fee_per_gas_wei||
     policy.max_priority_fee_per_gas_wei>computed){
    throw new Error("fee_chain_computed_envelope_invalid");
  }

  const cost=decimalBigInt(observation.maximum_gas_cost_wei,"maximum_gas_cost");
  if(cost!==policy.accepted_max_gas_limit*computed){
    throw new Error("fee_chain_maximum_gas_cost_invalid");
  }
  const balance=decimalBigInt(
    observation.fulfiller_native_balance_wei,
    "fulfiller_balance",
  );
  if(balance<cost)throw new Error("fee_chain_native_balance_invalid");

  const zero=observation.zero_fee_envelope===true;
  const nonzero=observation.nonzero_fee_envelope===true;
  if(zero===nonzero||zero!==(computed===0n)||nonzero!==(computed>0n)){
    throw new Error("fee_envelope_classification_invalid");
  }
}

export function buildReceipt(
  expectedHead,childBefore,childAfter,policy,observation
){
  const stableChildIdentity=requireStableChildRuntimeIdentity(
    childBefore,childAfter,expectedHead
  );
  validateObservation(policy,observation);
  const zero=observation.zero_fee_envelope===true;
  const nonzero=observation.nonzero_fee_envelope===true;

  const chainReceiptBody={
    marker:"VOID_BUY_VOID_EPOCH2_LIVE_FEE_CHAIN_RECEIPT_V1",
    version:1,
    rpc_url:policy.rpc_url,
    ...observation,
    rpc_read_only:true,
    transaction_calldata_constructed:false,
    nonce_reserved:false,
    signing_performed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    chain_mutation:false,
    payment_record_access:false,
    funds_movement:false,
  };
  const chainReceipt=Object.freeze({
    ...chainReceiptBody,
    chain_receipt_id:
      "voide2feechain1_"+
      sha256Bytes(Buffer.from(canonical(chainReceiptBody),"utf8")),
  });

  const body={
    marker:MARKER,
    version:1,
    status:STATUS,
    source_head:expectedHead,
    authenticated_credential_signer_control_receipt_before:childBefore,
    authenticated_credential_signer_control_receipt_before_id:
      childBefore.receipt_id,
    authenticated_credential_signer_control_receipt_before_sha256:
      sha256Bytes(Buffer.from(canonical(childBefore),"utf8")),
    authenticated_credential_signer_control_receipt_after:childAfter,
    authenticated_credential_signer_control_receipt_after_id:
      childAfter.receipt_id,
    authenticated_credential_signer_control_receipt_after_sha256:
      sha256Bytes(Buffer.from(canonical(childAfter),"utf8")),
    credential_signer_control_generation_stable_across_chain_window:true,
    credential_signer_control_stable_identity:stableChildIdentity,
    credential_signer_control_stable_identity_sha256:
      sha256Bytes(Buffer.from(canonical(stableChildIdentity),"utf8")),
    live_fee_chain_receipt:chainReceipt,
    live_fee_chain_receipt_id:chainReceipt.chain_receipt_id,
    canonical_chain_id:2050,
    epoch2_presale_contract:PRESALE,
    epoch2_fulfiller_public_address:FULFILLER,
    accepted_fee_policy_bound:true,
    zero_or_nonzero_fee_envelope_qualified:true,
    exact_chain_history_and_contract_identity_qualified:true,
    accepted_gas_ceiling_bound:true,
    native_fee_funding_sufficient:true,
    descendant_nontransaction_signature_performed:true,
    transaction_calldata_constructed:false,
    nonce_reserved:false,
    transaction_signing_proven:false,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    customer_payment_record_access:false,
    customer_safe_to_pay:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    chain2050_mutation:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    filesystem_write:false,
    funds_movement:false,
    production_host_evidence_authority:false,
    next_action:NEXT_ACTION,
  };
  return Object.freeze({
    ...body,
    receipt_id:
      "voide2feeq1_"+sha256Bytes(Buffer.from(canonical(body),"utf8")),
  });
}

function plan(){
  console.log(MARKER);
  console.log("mode=plan");
  console.log("git_object_stdin_required_for_live=true");
  console.log("root_required_for_run=true");
  console.log("exact_credential_signer_control_child_required=true");
  console.log("credential_signer_control_before_after_chain_window_required=true");
  console.log("credential_signer_control_runtime_generation_stability_required=true");
  console.log("arbitrary_child_receipt_input_accepted=false");
  console.log("exact_candidate_v2_fee_policy_required=true");
  console.log("fixed_loopback_rpc=http://127.0.0.1:18553/");
  console.log("live_eth_gasPrice_required=true");
  console.log("accepted_gas_ceiling=320000");
  console.log("fee_multiplier_bps=20000");
  console.log("max_fee_per_gas_wei=3000000000");
  console.log("configured_priority_fee_per_gas_wei=0");
  console.log("chain_progress_and_exact_validator_roster_required=true");
  console.log("accepted_history_and_contract_code_identity_required=true");
  console.log("pending_fulfiller_native_balance_required=true");
  console.log("transaction_calldata_constructed=false");
  console.log("nonce_reserved=false");
  console.log("transaction=false");
  console.log("rpc_call=false");
  console.log("filesystem_write=false");
  console.log("host_mutation=false");
  console.log("service_mutation=false");
  console.log("systemd_mutation=false");
  console.log("customer_payment_record_access=false");
  console.log("payment_acceptance=false");
  console.log("customer_safe_to_pay=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
  console.log("next_action=SEPARATELY_AUTHORIZE_EPOCH2_LIVE_FEE_CHAIN_READ_ONLY_QUALIFICATION");
}

function selfTest(){
  const candidate={
    marker:"VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2",
    version:2,
    canonical_chain_id:2050,
    execution_epoch:2,
    epoch2_presale_contract:PRESALE,
    epoch2_fulfiller_public_address:FULFILLER,
    candidate_configuration:{
      VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL:RPC_URL,
      VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS:"15000",
      VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT:"320000",
      VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS:"20000",
      VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI:"3000000000",
      VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI:"0",
      VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:PRESALE,
      VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:FULFILLER,
    },
  };
  const policy=validateCandidatePolicy(candidate);
  if(policy.accepted_max_gas_limit!==320000n||
     policy.fee_multiplier_bps!==20000n||
     policy.max_priority_fee_per_gas_wei!==0n){
    throw new Error("policy_self_test_failed");
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("candidate_v2_fee_policy_bound=true");
  console.log("credential_signer_control_before_after_chain_window_required=true");
  console.log("credential_signer_control_runtime_generation_stability_required=true");
  console.log("zero_fee_envelope_supported_for_exact_e2_presale=true");
  console.log("nonzero_fee_envelope_bounded_by_runtime_policy=true");
  console.log("transaction_calldata_constructed=false");
  console.log("nonce_reserved=false");
  console.log("transaction=false");
  console.log("funds_movement=false");
}

async function live(expectedHead,confirm){
  if(confirm!==CONFIRM)throw new Error("explicit_live_confirmation_required");
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    throw new Error("root_required_for_live_qualification");
  }
  if(process.argv[1]!=="-")throw new Error("runner_git_object_stdin_required");

  assertTrustedExecutable(GIT);
  assertTrustedExecutable(NODE);
  assertTrustedExecutable(SETPRIV);
  requireExactCheckout(expectedHead);

  const {policy}=loadCandidate(expectedHead);
  const childBefore=runChild(expectedHead);
  requireExactCheckout(expectedHead);

  const observation=await observeFeeChainLive(policy);
  requireExactCheckout(expectedHead);

  const childAfter=runChild(expectedHead);
  requireExactCheckout(expectedHead);

  const receipt=buildReceipt(
    expectedHead,childBefore,childAfter,policy,observation
  );
  console.log(JSON.stringify(receipt,null,2));
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){
    selfTest();
    return;
  }
  if(args.length===1&&args[0]==="--plan"){
    plan();
    return;
  }
  if(args[0]==="--run"){
    const confirmAt=args.indexOf("--confirm");
    const headAt=args.indexOf("--expected-head");
    const confirm=confirmAt>=0?args[confirmAt+1]:"";
    const expectedHead=headAt>=0?args[headAt+1]:"";
    if(!expectedHead)throw new Error("expected_head_required");
    await live(expectedHead,confirm);
    return;
  }
  throw new Error(
    "usage: runner --self-test | --plan | --run --confirm <token> --expected-head <sha>"
  );
}

function printHold(error){
  console.error(JSON.stringify({
    marker:MARKER+"_HOLD",
    status:"HOLD",
    reason:safeReason(error?.message||error),
    descendant_sensitive_operation_state:"unknown_or_partial_if_live_started",
    rpc_read_state:"unknown_or_partial_if_live_started",
    private_key_output:false,
    transaction_calldata_constructed:false,
    nonce_reserved:false,
    transaction_constructed:false,
    transaction_submitted:false,
    transaction_broadcast:false,
    customer_payment_record_access:false,
    filesystem_write:false,
    host_mutation:false,
    service_mutation:false,
    systemd_mutation:false,
    payment_acceptance:false,
    customer_safe_to_pay:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    chain2050_mutation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
  },null,2));
}

const directFileExecution=process.argv[1]&&process.argv[1]!=="-"&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(process.argv[1]==="-"){
  main().catch((error)=>{printHold(error);process.exitCode=2;});
}else if(directFileExecution){
  printHold(new Error("runner_git_object_stdin_required"));
  process.exitCode=2;
}
