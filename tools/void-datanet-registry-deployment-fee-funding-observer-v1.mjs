#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";

import {
  PRIVATE_SUCCESSOR_RPC_V1,
  buildVoidDatanetActivationBoundResolutionPacketV1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "./void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";
import {
  VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1,
} from "./void-economic-epoch2-raw-transaction-domain-v1.mjs";

export const VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1 =
  "VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1";

export const GAS_LIMIT_MULTIPLIER_BPS_V1="12000";
export const MAX_FEE_PER_GAS_WEI_V1="3000000000";
export const MAX_PRIORITY_FEE_PER_GAS_WEI_V1="1000000000";

const ADDRESS=/^0x[0-9a-f]{40}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const HEX_QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/iu;
const MAX_GAS_ESTIMATE=20_000_000n;
const BPS=10_000n;

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function text(value){
  return typeof value==="string"?value.trim():String(value??"").trim();
}
function quantity(value){
  const raw=text(value);
  if(!HEX_QUANTITY.test(raw)) return null;
  try{return BigInt(raw);}catch{return null;}
}
function decimal(value){
  const raw=text(value);
  if(!/^(0|[1-9][0-9]{0,77})$/u.test(raw)) return null;
  try{return BigInt(raw);}catch{return null;}
}
function ceilMulDiv(value,multiplier,denominator){
  return (value*multiplier+denominator-1n)/denominator;
}
function normalizeRpc(input){
  let url;
  try{url=new URL(text(input?.rpc_url));}catch{return null;}
  if(
    url.protocol!=="http:"||
    url.hostname!=="127.0.0.1"||
    url.port!=="18553"||
    url.pathname!=="/"||
    url.username||
    url.password||
    url.search||
    url.hash
  ){
    return null;
  }
  return {
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    rpc_url_fingerprint_sha256:sha256(PRIVATE_SUCCESSOR_RPC_V1),
    timeout_ms:5000,
    max_response_bytes:65536,
  };
}
function createTransport(policy){
  let nextId=0;
  return async({method,params})=>{
    const id=++nextId;
    const body=JSON.stringify({jsonrpc:"2.0",id,method,params});
    return await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(error,value)=>{
        if(settled) return;
        settled=true;
        if(error) reject(error);
        else resolve(value);
      };
      const req=http.request({
        protocol:"http:",
        hostname:"127.0.0.1",
        port:18553,
        path:"/",
        method:"POST",
        family:4,
        agent:false,
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          "Content-Length":String(Buffer.byteLength(body)),
          Connection:"close",
          "User-Agent":"void-datanet-registry-fee-funding-observer-v1",
        },
      },(res)=>{
        const chunks=[];
        let total=0;
        res.on("data",(chunk)=>{
          const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          total+=b.length;
          if(total>policy.max_response_bytes){
            req.destroy(new Error("rpc_response_too_large"));
            return;
          }
          chunks.push(b);
        });
        res.on("end",()=>{
          if(Number(res.statusCode)!==200){
            finish(new Error("rpc_http_status_invalid"));
            return;
          }
          let payload;
          try{
            payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
          }catch{
            finish(new Error("rpc_json_invalid"));
            return;
          }
          if(
            !payload||
            payload.jsonrpc!=="2.0"||
            payload.id!==id||
            payload.error||
            !Object.hasOwn(payload,"result")
          ){
            finish(new Error("rpc_envelope_invalid"));
            return;
          }
          finish(null,payload.result);
        });
      });
      req.setTimeout(policy.timeout_ms);
      req.on("timeout",()=>req.destroy(new Error("rpc_timeout")));
      req.on("error",(error)=>finish(error));
      req.end(body);
    });
  };
}
function held(reason,methods=[],detail=undefined){
  return {
    ok:false,
    marker:VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1,
    version:1,
    status:"held",
    reason,
    rpc_methods_used:methods,
    read_only_observation_complete:false,
    rpc_call_performed:methods.length>0,
    mutation_performed:false,
    credential_access_performed:false,
    wallet_access_performed:false,
    private_key_access_performed:false,
    deployer_funding_performed:false,
    signable_transaction_constructed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_mutation_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
    ...(detail===undefined?{}:{detail}),
  };
}

export async function observeVoidDatanetRegistryDeploymentFeeFundingV1(input){
  const policy=normalizeRpc(input);
  if(!policy){
    return held("fee_funding_rpc_policy_invalid");
  }

  let plan;
  try{
    const rebuilt=buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1({
      activation_plan:input?.activation_plan,
      activation_receipt:input?.activation_receipt,
      resolution_packet:input?.resolution_packet,
      deployer_address:input?.deployer_address,
      publisher_address:input?.publisher_address,
      predecessor_address:input?.predecessor_address,
      compiled_identity:input?.compiled_identity,
    });
    plan=validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
      input?.deployment_input_plan,
    );
    if(JSON.stringify(rebuilt)!==JSON.stringify(plan)){
      return held("fee_funding_deployment_input_plan_rebuild_mismatch");
    }
  }catch(error){
    return held("fee_funding_input_lineage_invalid",[],{
      message:text(error?.message||error).slice(0,240),
    });
  }

  const deployer=plan.deployment_inputs.deployer_address;
  const predicted=plan.deployment_inputs.predicted_registry_contract_address;
  const expectedNonce=decimal(plan.deployment_inputs.deployer_nonce);
  if(
    !ADDRESS.test(deployer)||
    !ADDRESS.test(predicted)||
    expectedNonce===null
  ){
    return held("fee_funding_plan_account_input_invalid");
  }

  const methods=[];
  const transport=input?.transport||createTransport(policy);
  const call=async(method,params)=>{
    methods.push(method);
    return await transport({method,params});
  };

  try{
    if(quantity(await call("eth_chainId",[]))!==2050n){
      return held("fee_funding_chain_id_mismatch",methods);
    }
    const head=quantity(await call("eth_blockNumber",[]));
    if(head===null||head<=0n){
      return held("fee_funding_head_invalid",methods);
    }
    const headTag="0x"+head.toString(16);
    const blockA=await call("eth_getBlockByNumber",[headTag,false]);
    const blockHash=String(blockA?.hash||"").toLowerCase();
    const baseFee=quantity(blockA?.baseFeePerGas);
    if(
      !HASH.test(blockHash)||
      quantity(blockA?.number)!==head||
      baseFee===null
    ){
      return held("fee_funding_block_invalid",methods);
    }

    const pendingA=quantity(
      await call("eth_getTransactionCount",[deployer,"pending"]),
    );
    const balance=quantity(
      await call("eth_getBalance",[deployer,headTag]),
    );
    const predictedNonce=quantity(
      await call("eth_getTransactionCount",[predicted,headTag]),
    );
    const predictedCode=String(
      await call("eth_getCode",[predicted,headTag]),
    ).toLowerCase();
    if(
      pendingA!==expectedNonce||
      balance===null||
      predictedNonce!==0n||
      predictedCode!=="0x"
    ){
      return held("fee_funding_nonce_balance_or_vacancy_drift",methods);
    }

    const marker=
      VOID_ECONOMIC_EPOCH2_RAW_TRANSACTION_DOMAIN_POLICY_V1;
    const estimate=quantity(await call("eth_estimateGas",[
      {
        from:deployer,
        data:plan.deployment_inputs.creation_data,
        value:"0x0",
        accessList:[
          {
            address:marker.marker_address,
            storageKeys:[marker.marker_storage_key],
          },
        ],
      },
      headTag,
    ]));
    if(estimate===null||estimate<=0n||estimate>MAX_GAS_ESTIMATE){
      return held("fee_funding_gas_estimate_invalid",methods);
    }

    const priority=quantity(
      await call("eth_maxPriorityFeePerGas",[]),
    );
    if(priority===null){
      return held("fee_funding_priority_fee_invalid",methods);
    }

    const pendingB=quantity(
      await call("eth_getTransactionCount",[deployer,"pending"]),
    );
    const blockB=await call("eth_getBlockByNumber",[headTag,false]);
    if(
      pendingB!==pendingA||
      String(blockB?.hash||"").toLowerCase()!==blockHash||
      quantity(blockB?.number)!==head||
      quantity(blockB?.baseFeePerGas)!==baseFee
    ){
      return held("fee_funding_revalidation_mismatch",methods);
    }

    const gasMultiplier=BigInt(GAS_LIMIT_MULTIPLIER_BPS_V1);
    const gasLimit=ceilMulDiv(estimate,gasMultiplier,BPS);
    const maxFee=BigInt(MAX_FEE_PER_GAS_WEI_V1);
    const maxPriority=BigInt(MAX_PRIORITY_FEE_PER_GAS_WEI_V1);
    const observedFeeNeed=baseFee*2n+priority;
    const feeCapsSufficient=
      priority<=maxPriority&&observedFeeNeed<=maxFee;
    const requiredBalance=gasLimit*maxFee;
    const deficit=balance>=requiredBalance?0n:requiredBalance-balance;

    const activationFloor=decimal(
      plan.activation_lineage.activation_block_floor,
    );
    if(activationFloor===null||head<activationFloor){
      return held("fee_funding_head_below_activation",methods);
    }

    const observation={
      chain_id:"2050",
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      observation_block_number:head.toString(10),
      observation_block_hash:blockHash,
      activation_block_floor:activationFloor.toString(10),
      activation_height_continuity_verified:true,
      deployer_address:deployer,
      deployer_pending_nonce:pendingA.toString(10),
      deployer_balance_wei:balance.toString(10),
      predicted_registry_contract_address:predicted,
      predicted_registry_address_nonce:"0",
      predicted_registry_address_code:"0x",
      predicted_registry_address_vacant:true,
      deployment_gas_estimate:estimate.toString(10),
      gas_limit_multiplier_bps:GAS_LIMIT_MULTIPLIER_BPS_V1,
      proposed_gas_limit:gasLimit.toString(10),
      base_fee_per_gas_wei:baseFee.toString(10),
      observed_priority_fee_per_gas_wei:priority.toString(10),
      observed_two_x_base_plus_priority_wei:
        observedFeeNeed.toString(10),
      max_fee_per_gas_wei:MAX_FEE_PER_GAS_WEI_V1,
      max_priority_fee_per_gas_wei:
        MAX_PRIORITY_FEE_PER_GAS_WEI_V1,
      fee_caps_sufficient_for_observation:feeCapsSufficient,
      maximum_deployment_gas_cost_wei:
        requiredBalance.toString(10),
      minimum_additional_funding_wei:deficit.toString(10),
      deployer_funding_sufficient:deficit===0n,
      creation_data_keccak256:
        plan.deployment_inputs.creation_data_keccak256,
      exact_creation_data_bound:true,
      pending_nonce_revalidated:true,
      observation_block_hash_revalidated:true,
    };

    return {
      ok:true,
      marker:VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1,
      version:1,
      status:
        feeCapsSufficient&&deficit===0n
          ?"read_only_fee_gas_funding_green"
          :"read_only_fee_gas_funding_hold",
      rpc_url_fingerprint_sha256:
        policy.rpc_url_fingerprint_sha256,
      rpc_methods_used:methods,
      observation,
      read_only_observation_complete:true,
      rpc_call_performed:true,
      mutation_performed:false,
      credential_access_performed:false,
      wallet_access_performed:false,
      private_key_access_performed:false,
      deployer_funding_performed:false,
      signable_transaction_constructed:false,
      transaction_signing_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_mutation_performed:false,
      funds_movement_performed:false,
      automatic_retry_allowed:false,
      next_gate:
        feeCapsSufficient&&deficit===0n
          ?"fresh_read_only_pre_sign_revalidation_before_signable_transaction_construction"
          :"separate_review_of_fee_cap_or_deployer_gas_funding_then_repeat_read_only_observation",
    };
  }catch(error){
    return held("fee_funding_rpc_failed",methods,{
      error_class:text(error?.name||"Error").slice(0,80),
      message:text(error?.message||error).slice(0,240),
    });
  }
}


function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}

export function buildVoidDatanetRegistryDeploymentFeeFundingPacketV1(input){
  const plan=validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
    input?.deployment_input_plan,
  );
  const result=input?.observer_result;
  if(!result||typeof result!=="object"||Array.isArray(result)){
    throw new Error("fee_funding_observer_result_invalid");
  }

  const expectedMethods=[
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_getTransactionCount",
    "eth_getCode",
    "eth_estimateGas",
    "eth_maxPriorityFeePerGas",
    "eth_getTransactionCount",
    "eth_getBlockByNumber",
  ];
  const observation=result.observation;
  if(
    result.marker!==VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1||
    result.version!==1||
    result.ok!==true||
    result.read_only_observation_complete!==true||
    result.rpc_call_performed!==true||
    JSON.stringify(result.rpc_methods_used)!==JSON.stringify(expectedMethods)||
    result.mutation_performed!==false||
    result.credential_access_performed!==false||
    result.wallet_access_performed!==false||
    result.private_key_access_performed!==false||
    result.deployer_funding_performed!==false||
    result.signable_transaction_constructed!==false||
    result.transaction_signing_performed!==false||
    result.transaction_submission_performed!==false||
    result.transaction_broadcast_performed!==false||
    result.deployment_performed!==false||
    result.chain2050_mutation_performed!==false||
    result.funds_movement_performed!==false||
    result.automatic_retry_allowed!==false||
    !observation||
    observation.chain_id!=="2050"||
    observation.rpc_url_fingerprint_sha256!==
      sha256(PRIVATE_SUCCESSOR_RPC_V1)||
    observation.deployer_address!==
      plan.deployment_inputs.deployer_address||
    observation.deployer_pending_nonce!==
      plan.deployment_inputs.deployer_nonce||
    observation.predicted_registry_contract_address!==
      plan.deployment_inputs.predicted_registry_contract_address||
    observation.predicted_registry_address_nonce!=="0"||
    observation.predicted_registry_address_code!=="0x"||
    observation.predicted_registry_address_vacant!==true||
    observation.creation_data_keccak256!==
      plan.deployment_inputs.creation_data_keccak256||
    observation.exact_creation_data_bound!==true||
    observation.pending_nonce_revalidated!==true||
    observation.observation_block_hash_revalidated!==true||
    observation.activation_height_continuity_verified!==true
  ){
    throw new Error("fee_funding_observer_result_contract_mismatch");
  }

  const estimate=decimal(observation.deployment_gas_estimate);
  const gasLimit=decimal(observation.proposed_gas_limit);
  const balance=decimal(observation.deployer_balance_wei);
  const baseFee=decimal(observation.base_fee_per_gas_wei);
  const priority=decimal(observation.observed_priority_fee_per_gas_wei);
  const observedNeed=decimal(
    observation.observed_two_x_base_plus_priority_wei,
  );
  const maxFee=decimal(observation.max_fee_per_gas_wei);
  const maxPriority=decimal(observation.max_priority_fee_per_gas_wei);
  const maximumCost=decimal(observation.maximum_deployment_gas_cost_wei);
  const deficit=decimal(observation.minimum_additional_funding_wei);
  const activationFloor=decimal(observation.activation_block_floor);
  const observedHead=decimal(observation.observation_block_number);

  if(
    estimate===null||
    gasLimit===null||
    balance===null||
    baseFee===null||
    priority===null||
    observedNeed===null||
    maxFee===null||
    maxPriority===null||
    maximumCost===null||
    deficit===null||
    activationFloor===null||
    observedHead===null||
    observedHead<activationFloor
  ){
    throw new Error("fee_funding_observation_numeric_invalid");
  }

  const expectedGas=
    ceilMulDiv(estimate,BigInt(GAS_LIMIT_MULTIPLIER_BPS_V1),BPS);
  const expectedObservedNeed=baseFee*2n+priority;
  const expectedMaximumCost=expectedGas*BigInt(MAX_FEE_PER_GAS_WEI_V1);
  const expectedDeficit=
    balance>=expectedMaximumCost?0n:expectedMaximumCost-balance;
  const expectedFeeCaps=
    priority<=BigInt(MAX_PRIORITY_FEE_PER_GAS_WEI_V1)&&
    expectedObservedNeed<=BigInt(MAX_FEE_PER_GAS_WEI_V1);
  const expectedFunding=expectedDeficit===0n;

  if(
    observation.gas_limit_multiplier_bps!==GAS_LIMIT_MULTIPLIER_BPS_V1||
    gasLimit!==expectedGas||
    observation.max_fee_per_gas_wei!==MAX_FEE_PER_GAS_WEI_V1||
    observation.max_priority_fee_per_gas_wei!==
      MAX_PRIORITY_FEE_PER_GAS_WEI_V1||
    maxFee!==BigInt(MAX_FEE_PER_GAS_WEI_V1)||
    maxPriority!==BigInt(MAX_PRIORITY_FEE_PER_GAS_WEI_V1)||
    observedNeed!==expectedObservedNeed||
    maximumCost!==expectedMaximumCost||
    deficit!==expectedDeficit||
    observation.fee_caps_sufficient_for_observation!==expectedFeeCaps||
    observation.deployer_funding_sufficient!==expectedFunding
  ){
    throw new Error("fee_funding_observation_formula_mismatch");
  }

  const green=expectedFeeCaps&&expectedFunding;
  if(
    result.status!==
      (green
        ?"read_only_fee_gas_funding_green"
        :"read_only_fee_gas_funding_hold")
  ){
    throw new Error("fee_funding_observer_status_mismatch");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1,
    version:1,
    status:green
      ?"READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"
      :"READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_HOLD",
    deployment_input_plan_id:plan.plan_id,
    activation_plan_id:plan.activation_lineage.activation_plan_id,
    activation_receipt_id:plan.activation_lineage.activation_receipt_id,
    resolution_packet_id:plan.resolution_lineage.resolution_packet_id,
    rpc_url_fingerprint_sha256:
      sha256(PRIVATE_SUCCESSOR_RPC_V1),
    observation,
    rpc_methods_used:expectedMethods,
    decision:{
      gas_estimate_observed:true,
      gas_limit_120pct_derived:true,
      fee_caps_source:
        "existing_bounded_mainnet0_fee_envelope_reused_as_candidate_cap",
      fee_caps_sufficient:expectedFeeCaps,
      deployer_balance_sufficient:expectedFunding,
      minimum_additional_funding_wei:expectedDeficit.toString(10),
      signable_transaction_construction_authorized:false,
      deployer_funding_authorized:false,
      transaction_signing_authorized:false,
      transaction_broadcast_authorized:false,
      deployment_authorized:false,
      chain2050_write_authorized:false,
      next_gate:green
        ?"fresh_read_only_pre_sign_revalidation_before_signable_transaction_construction"
        :"separate_fee_cap_or_deployer_gas_funding_review_then_repeat_read_only_observation",
    },
    authority:{
      read_only_rpc:true,
      filesystem_secret_read:false,
      credential_access:false,
      wallet_access:false,
      private_key_access:false,
      deployer_funding:false,
      signable_transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      deployment:false,
      chain2050_mutation:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
  };

  return Object.freeze({
    ...material,
    packet_id:
      "voiddrff1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}
