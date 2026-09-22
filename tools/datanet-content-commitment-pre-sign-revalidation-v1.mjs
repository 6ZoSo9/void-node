#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";
import {
  observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1,
} from "./datanet-content-commitment-object-preflight-observer-v1.mjs";
import {
  buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1,
} from "./datanet-content-commitment-unsigned-call-plan-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_AUTHORITY_V1 = {
  source_only_dynamic_binding: true,
  exact_unsigned_call_plan_required: true,
  two_fresh_object_preflights_required: true,
  pending_nonce_stability_required: true,
  pending_gas_estimate_required: true,
  pending_native_balance_required: true,
  explicit_bounded_fee_policy_required: true,
  unsigned_transaction_candidate_may_be_materialized: true,
  signing_authorized: false,
  signer_access: false,
  wallet_access: false,
  credential_access: false,
  raw_private_key_access: false,
  transaction_broadcast: false,
  chain2050_mutation: false,
  validator_mutation: false,
  governance_mutation: false,
  runtime_service_action: false,
  work_credit_award: false,
  automatic_retry: false,
  funds_action: false,
};

const HEX_QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const MAX_UINT256=(1n<<256n)-1n;
const DEFAULT_TIMEOUT_MS=5000;
const MAX_TIMEOUT_MS=30000;
const DEFAULT_MAX_RESPONSE_BYTES=1048576;
const MAX_RESPONSE_BYTES=8*1024*1024;
const MAX_REQUEST_BYTES=32768;
const MAX_POLICY_GAS_LIMIT=10_000_000n;
const MAX_POLICY_FEE_WEI=1_000_000_000_000n;
const MAX_POLICY_TOTAL_GAS_COST_WEI=10n**22n;
const BPS=10_000n;

const ALLOWED_METHODS=new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_call",
  "eth_getTransactionCount",
  "eth_gasPrice",
  "eth_estimateGas",
  "eth_getBalance",
]);

function text(value){
  return typeof value==="string"?value.trim():String(value??"").trim();
}

function quantity(value){
  const raw=text(value);
  if(!HEX_QUANTITY.test(raw)) return null;
  try{
    const parsed=BigInt(raw);
    return parsed>=0n&&parsed<=MAX_UINT256?parsed:null;
  }catch(error){
    return null;
  }
}

function decimal(value,{positive=false,max=MAX_UINT256}={}){
  const raw=text(value);
  if(!/^(0|[1-9][0-9]{0,77})$/.test(raw)) return null;
  try{
    const parsed=BigInt(raw);
    if(parsed<0n||(positive&&parsed===0n)||parsed>max) return null;
    return parsed;
  }catch(error){
    return null;
  }
}

function boundedNumber(value,fallback,maximum){
  if(value===undefined||value===null||value==="") return fallback;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>0&&parsed<=maximum
    ?parsed
    :null;
}

function ceilMulDiv(value,multiplier,denominator){
  return (value*multiplier+denominator-1n)/denominator;
}

function normalizePolicy(input){
  if(!input||input.enabled!==true||text(input.chain_id)!=="2050") return null;
  let url;
  try{
    url=new URL(text(input.rpc_url));
  }catch(error){
    return null;
  }
  const host=url.hostname.toLowerCase().replace(/^\[/,"").replace(/\]$/,"");
  const hostname=host==="127.0.0.1"?"127.0.0.1":host==="::1"?"::1":null;
  const port=Number(url.port||0);
  const timeout=boundedNumber(
    input.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes=boundedNumber(
    input.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if(
    !hostname||
    url.protocol!=="http:"||
    url.username||url.password||url.search||url.hash||
    !Number.isInteger(port)||port<=0||port>65535||
    !url.pathname.startsWith("/")||url.pathname.length>256||
    timeout===null||maxBytes===null
  ) return null;

  const gasMultiplier=decimal(
    input.gas_limit_multiplier_bps,
    {positive:true,max:30_000n},
  );
  const maxGas=decimal(
    input.max_gas_limit,
    {positive:true,max:MAX_POLICY_GAS_LIMIT},
  );
  const feeMultiplier=decimal(
    input.fee_multiplier_bps,
    {positive:true,max:50_000n},
  );
  const maxFee=decimal(
    input.max_fee_per_gas_wei,
    {positive:true,max:MAX_POLICY_FEE_WEI},
  );
  const priority=decimal(
    input.max_priority_fee_per_gas_wei,
    {max:MAX_POLICY_FEE_WEI},
  );
  const maxTotal=decimal(
    input.max_total_gas_cost_wei,
    {positive:true,max:MAX_POLICY_TOTAL_GAS_COST_WEI},
  );
  if(
    gasMultiplier===null||gasMultiplier<10_000n||
    maxGas===null||
    feeMultiplier===null||feeMultiplier<10_000n||
    maxFee===null||
    priority===null||priority>maxFee||
    maxTotal===null
  ) return null;

  const rendered=hostname==="::1"?"[::1]":hostname;
  const rpcUrl="http://"+rendered+":"+String(port)+url.pathname;
  const policyMaterial={
    chain_id:"2050",
    rpc_url_fingerprint_sha256:sha256(rpcUrl),
    gas_limit_multiplier_bps:gasMultiplier.toString(),
    max_gas_limit:maxGas.toString(),
    fee_multiplier_bps:feeMultiplier.toString(),
    max_fee_per_gas_wei:maxFee.toString(),
    max_priority_fee_per_gas_wei:priority.toString(),
    max_total_gas_cost_wei:maxTotal.toString(),
    request_timeout_ms:timeout,
    max_response_bytes:maxBytes,
  };

  return {
    rpc_url:rpcUrl,
    rpc_url_fingerprint_sha256:policyMaterial.rpc_url_fingerprint_sha256,
    hostname,
    port,
    path:url.pathname,
    request_timeout_ms:timeout,
    max_response_bytes:maxBytes,
    gas_limit_multiplier_bps:gasMultiplier,
    max_gas_limit:maxGas,
    fee_multiplier_bps:feeMultiplier,
    max_fee_per_gas_wei:maxFee,
    max_priority_fee_per_gas_wei:priority,
    max_total_gas_cost_wei:maxTotal,
    policy_fingerprint_sha256:sha256(canonicalJson(policyMaterial)),
  };
}

function createHttpTransport(policy,methods){
  let nextId=0;
  return async(call)=>{
    if(!ALLOWED_METHODS.has(call?.method)){
      throw new Error("datanet_pre_sign_rpc_method_not_allowed");
    }
    methods.push(call.method);

    const id=++nextId;
    const body=JSON.stringify({
      jsonrpc:"2.0",
      id,
      method:call.method,
      params:call.params,
    });
    if(Buffer.byteLength(body,"utf8")>MAX_REQUEST_BYTES){
      throw new Error("datanet_pre_sign_request_too_large");
    }

    return await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(error,value=undefined)=>{
        if(settled) return;
        settled=true;
        if(error) reject(error);
        else resolve(value);
      };

      const request=http.request({
        protocol:"http:",
        hostname:policy.hostname,
        port:policy.port,
        path:policy.path,
        method:"POST",
        family:policy.hostname==="::1"?6:4,
        agent:false,
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          "Content-Length":String(Buffer.byteLength(body,"utf8")),
          Connection:"close",
          "User-Agent":
            "void-datanet-content-commitment-pre-sign-revalidation-v1",
        },
      },(response)=>{
        const chunks=[];
        let total=0;
        response.on("data",(chunk)=>{
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          total+=buffer.length;
          if(total>policy.max_response_bytes){
            request.destroy(new Error("datanet_pre_sign_response_too_large"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end",()=>{
          if(Number(response.statusCode||0)!==200){
            finish(new Error("datanet_pre_sign_http_status_invalid"));
            return;
          }
          const media=text(response.headers["content-type"])
            .toLowerCase()
            .split(";",1)[0]
            ?.trim()||"";
          if(media!=="application/json"){
            finish(new Error("datanet_pre_sign_response_media_type_invalid"));
            return;
          }
          let payload;
          try{
            payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
          }catch(error){
            finish(new Error("datanet_pre_sign_rpc_json_invalid"));
            return;
          }
          if(
            !payload||
            payload.jsonrpc!=="2.0"||
            payload.id!==id||
            payload.error||
            !Object.prototype.hasOwnProperty.call(payload,"result")
          ){
            finish(new Error("datanet_pre_sign_rpc_envelope_invalid"));
            return;
          }
          finish(null,payload.result);
        });
      });

      request.setTimeout(policy.request_timeout_ms);
      request.on("timeout",()=>{
        request.destroy(new Error("datanet_pre_sign_timeout"));
      });
      request.on("error",(error)=>finish(error));
      request.end(body);
    });
  };
}

function held(reason,options={}){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1,
    version:1,
    reason,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256??null,
    rpc_methods_used:options.rpc_methods_used||[],
    unsigned_transaction_candidate_constructed:false,
    signing_authorized:false,
    signer_access_performed:false,
    wallet_access_performed:false,
    transaction_broadcast_performed:false,
    chain2050_mutation_performed:false,
    funds_action_performed:false,
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_AUTHORITY_V1,
    ...(options.detail?{detail:options.detail}:{}),
  };
}

function exactPlan(expected,actual){
  return canonicalJson(expected)===canonicalJson(actual);
}

export async function runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
  input,
  expectedSovereignFingerprint,
){
  const policy=normalizePolicy(input?.policy);
  if(!policy){
    return held("datanet_pre_sign_policy_invalid");
  }

  const expectedPlan=
    buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
      input,
      expectedSovereignFingerprint,
    );
  if(expectedPlan.ok===false){
    return held(
      "datanet_pre_sign_unsigned_plan_rebuild_held:"+expectedPlan.reason,
      {rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256},
    );
  }

  if(!exactPlan(expectedPlan,input?.unsigned_call_plan)){
    return held(
      "datanet_pre_sign_unsigned_plan_mismatch",
      {rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256},
    );
  }

  const methods=[];
  const baseTransport=input?.transport||createHttpTransport(policy,methods);
  const transport=input?.transport
    ?async(call)=>{
      if(!ALLOWED_METHODS.has(call?.method)){
        throw new Error("datanet_pre_sign_rpc_method_not_allowed");
      }
      methods.push(call.method);
      return await baseTransport(call);
    }
    :baseTransport;

  const observerInput={
    ...input,
    rpc_url:policy.rpc_url,
    request_timeout_ms:policy.request_timeout_ms,
    max_response_bytes:policy.max_response_bytes,
    transport,
  };

  try{
    const first=
      await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
        observerInput,
        expectedSovereignFingerprint,
      );
    if(first.ok===false){
      return held(
        "datanet_pre_sign_first_preflight_held:"+first.reason,
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const publisher=expectedPlan.unsigned_call.from_address;
    const registry=expectedPlan.unsigned_call.to_address;
    const calldata=expectedPlan.unsigned_call.calldata;

    const dynamicObservation=async()=>{
      const nonce=quantity(await transport({
        method:"eth_getTransactionCount",
        params:[publisher,"pending"],
      }));
      const gasPrice=quantity(await transport({
        method:"eth_gasPrice",
        params:[],
      }));
      const estimate=quantity(await transport({
        method:"eth_estimateGas",
        params:[{
          from:publisher,
          to:registry,
          value:"0x0",
          data:calldata,
        },"pending"],
      }));
      const balance=quantity(await transport({
        method:"eth_getBalance",
        params:[publisher,"pending"],
      }));
      if(
        nonce===null||
        gasPrice===null||gasPrice===0n||
        estimate===null||estimate===0n||
        balance===null
      ){
        return null;
      }
      return {nonce,gasPrice,estimate,balance};
    };

    const firstDynamic=await dynamicObservation();
    if(firstDynamic===null){
      return held(
        "datanet_pre_sign_first_dynamic_observation_invalid",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const secondDynamic=await dynamicObservation();
    if(secondDynamic===null){
      return held(
        "datanet_pre_sign_second_dynamic_observation_invalid",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const second=
      await observeDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
        observerInput,
        expectedSovereignFingerprint,
      );
    if(second.ok===false){
      return held(
        "datanet_pre_sign_second_preflight_held:"+second.reason,
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const finalNonce=quantity(await transport({
      method:"eth_getTransactionCount",
      params:[publisher,"pending"],
    }));
    if(finalNonce===null){
      return held(
        "datanet_pre_sign_final_pending_nonce_invalid",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    if(
      firstDynamic.nonce!==secondDynamic.nonce||
      secondDynamic.nonce!==finalNonce
    ){
      return held(
        "datanet_pre_sign_pending_nonce_changed_during_revalidation",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const gasLimit=ceilMulDiv(
      secondDynamic.estimate,
      policy.gas_limit_multiplier_bps,
      BPS,
    );
    if(gasLimit===0n||gasLimit>policy.max_gas_limit){
      return held(
        "datanet_pre_sign_gas_limit_exceeds_policy",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const computedMaxFee=ceilMulDiv(
      secondDynamic.gasPrice,
      policy.fee_multiplier_bps,
      BPS,
    );
    if(
      computedMaxFee===0n||
      computedMaxFee>policy.max_fee_per_gas_wei||
      policy.max_priority_fee_per_gas_wei>computedMaxFee
    ){
      return held(
        "datanet_pre_sign_fee_exceeds_policy",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const maxGasCost=gasLimit*computedMaxFee;
    if(
      maxGasCost>policy.max_total_gas_cost_wei||
      secondDynamic.balance<maxGasCost
    ){
      return held(
        "datanet_pre_sign_native_gas_balance_or_cost_cap_failed",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    const candidate={
      transaction_type:2,
      chain_id:"2050",
      nonce:finalNonce.toString(),
      from_address:publisher,
      to_address:registry,
      value_wei:"0",
      calldata,
      gas_limit:gasLimit.toString(),
      max_fee_per_gas_wei:computedMaxFee.toString(),
      max_priority_fee_per_gas_wei:
        policy.max_priority_fee_per_gas_wei.toString(),
    };

    const bindingBody={
      marker:VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_V1,
      version:1,
      status:
        "fresh_pre_sign_revalidation_green_unsigned_transaction_candidate",
      unsigned_call_plan_id:expectedPlan.unsigned_call_plan_id,
      first_object_preflight_id:first.preflight.object_preflight_id,
      final_object_preflight_id:second.preflight.object_preflight_id,
      final_observation_block_number:
        second.preflight.observation_block_number,
      final_observation_block_hash:
        second.preflight.observation_block_hash,
      policy_fingerprint_sha256:policy.policy_fingerprint_sha256,
      rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
      nonce_stable_across_revalidation:true,
      first_pending_nonce:firstDynamic.nonce.toString(),
      final_pending_nonce:finalNonce.toString(),
      first_gas_price_wei:firstDynamic.gasPrice.toString(),
      final_gas_price_wei:secondDynamic.gasPrice.toString(),
      first_estimated_gas:firstDynamic.estimate.toString(),
      final_estimated_gas:secondDynamic.estimate.toString(),
      first_publisher_balance_wei:firstDynamic.balance.toString(),
      final_publisher_balance_wei:secondDynamic.balance.toString(),
      computed_max_gas_cost_wei:maxGasCost.toString(),
      unsigned_transaction_candidate:candidate,
      freshness:{
        hardened_preflight_before_dynamic_binding:true,
        hardened_preflight_after_dynamic_binding:true,
        object_uncommitted_after_dynamic_binding:true,
        pending_nonce_stable:true,
        pending_nonce_rechecked_after_final_preflight:true,
        prior_observation_authorizes_signing:false,
        signer_gate_must_revalidate_again:true,
      },
      authority:{
        unsigned_transaction_candidate_materialized:true,
        signer_identity_bound:false,
        signer_access_authorized:false,
        wallet_access_authorized:false,
        transaction_signing_authorized:false,
        transaction_broadcast_authorized:false,
        chain2050_write_authorized:false,
        validator_mutation_authorized:false,
        governance_mutation_authorized:false,
        runtime_service_action_authorized:false,
        work_credit_award_authorized:false,
        funds_action_authorized:false,
        automatic_retry_authorized:false,
      },
      next_gate:
        "bind_exact_publisher_signer_identity_then_revalidate_immediately_before_signing",
    };

    const bindingId=
      "voiddccpsr1_"+sha256(canonicalJson(bindingBody));
    if(!/^voiddccpsr1_[0-9a-f]{64}$/.test(bindingId)){
      return held(
        "datanet_pre_sign_binding_id_invalid",
        {
          rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
        },
      );
    }

    return {
      ok:true,
      ...bindingBody,
      pre_sign_revalidation_id:bindingId,
      rpc_methods_used:methods,
      signing_performed:false,
      signer_access_performed:false,
      wallet_access_performed:false,
      transaction_broadcast_performed:false,
      chain2050_mutation_performed:false,
      funds_action_performed:false,
      authority_contract:
        VOID_DATANET_CONTENT_COMMITMENT_PRE_SIGN_REVALIDATION_AUTHORITY_V1,
    };
  }catch(error){
    return held(
      "datanet_pre_sign_rpc_failed",
      {
        rpc_url_fingerprint_sha256:policy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
        detail:{
          error_class:text(error?.name||"Error").slice(0,80),
          message:text(error?.message||error).slice(0,240),
        },
      },
    );
  }
}

export async function runDatanetContentCommitmentPreSignRevalidationV1(input){
  return await runDatanetContentCommitmentPreSignRevalidationAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}
