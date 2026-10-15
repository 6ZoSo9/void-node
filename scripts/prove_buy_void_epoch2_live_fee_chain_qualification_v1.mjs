#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MARKER,
  STATUS,
  NEXT_ACTION,
  validateCandidatePolicy,
  observeFeeChainWithTransport,
  requireStableChildRuntimeIdentity,
  buildReceipt,
} from "../ops/precision/void_buy_void_epoch2_live_fee_chain_qualification_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=
  "ops/precision/void_buy_void_epoch2_live_fee_chain_qualification_v1.mjs";
const SOURCE_BLOB="a386e6474996cd06ac40af760deb43e0107de291";
const CHILD=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_signer_control_binding_v1.mjs";
const CHILD_BLOB="6d68b52ec036e422a151239f9c8f3ee7faa28055";
const CANDIDATE=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const CANDIDATE_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1";
const MANIFEST=
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json";

const PRESALE="0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const FULFILLER="0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const TOKEN="0x470075b85352eb86f7d089fb9ba88945f12aad94";
const ACCEPTED_HASH=
  "0x67e0ceaeee70c966271d37ebda1b07ee8d33c9b16bf4016a0d9eaefc3126c942";
const VALIDATORS=[
  "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
  "0x02f967953386188397b992c208239d3a25180db6",
  "0x461bf06270d9d28962f7570182c061b828799b66",
];

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
for(const [relative,expected] of [
  [SOURCE,SOURCE_BLOB],
  [CHILD,CHILD_BLOB],
  [CANDIDATE,CANDIDATE_BLOB],
]){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative,
  );
}

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
for(const required of [
  '"eth_gasPrice"',
  '"eth_getBalance"',
  '"eth_chainId"',
  '"qbft_getValidatorsByBlockNumber"',
  'const computedMaxFee=ceilMulDiv(',
  'policy.fee_multiplier_bps',
  'policy.accepted_max_gas_limit*computedMaxFee',
  'validateObservation(policy,observation);',
  'transaction_calldata_constructed:false',
  'nonce_reserved:false',
  'transaction_constructed:false',
  'transaction_submitted:false',
  'transaction_broadcast:false',
  'customer_payment_record_access:false',
  'customer_safe_to_pay:false',
  'production_host_evidence_authority:false',
  'const childBefore=runChild(expectedHead);',
  'const observation=await observeFeeChainLive(policy);',
  'const childAfter=runChild(expectedHead);',
  'credential_signer_control_generation_stable_across_chain_window:true',
]){
  assert.ok(source.includes(required),required);
}
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "eth_getTransactionCount",
  "eth_estimateGas",
  "personal_",
  "admin_",
  "debug_",
  "Wallet(",
  "signTransaction",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const candidate=JSON.parse(fs.readFileSync(path.join(ROOT,CANDIDATE),"utf8"));
const policy=validateCandidatePolicy(candidate);
assert.equal(policy.rpc_url,"http://127.0.0.1:18553/");
assert.equal(policy.gas_limit_multiplier_bps,15000n);
assert.equal(policy.accepted_max_gas_limit,320000n);
assert.equal(policy.fee_multiplier_bps,20000n);
assert.equal(policy.max_fee_per_gas_wei,3000000000n);
assert.equal(policy.max_priority_fee_per_gas_wei,0n);

const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,MANIFEST),"utf8"));
const presaleCode=manifest.accounts.find(
  (row)=>row.label==="VoidEpoch2PresaleFulfillmentV1",
)?.runtime_code_hex;
const tokenCode=manifest.accounts.find(
  (row)=>row.label==="VoidEpoch2TokenV1",
)?.runtime_code_hex;
assert.match(String(presaleCode||""),/^0x[0-9a-f]+$/u);
assert.match(String(tokenCode||""),/^0x[0-9a-f]+$/u);

function fake(options={}){
  let blockNumberReads=0;
  const calls=[];
  const transport=async({method,params})=>{
    calls.push(structuredClone({method,params}));
    switch(method){
      case "eth_chainId":
        return options.wrongChain?"0x1":"0x802";
      case "eth_getBlockByNumber":{
        const tag=String(params?.[0]||"");
        if(tag==="0xf0e"){
          return {
            number:"0xf0e",
            hash:options.wrongAcceptedHash
              ?"0x"+"0".repeat(64)
              :ACCEPTED_HASH,
          };
        }
        if(tag==="0x16f4e"){
          return {number:tag,hash:"0x"+"5".repeat(64)};
        }
        if(tag==="0x16f50"){
          return {
            number:tag,
            hash:options.finalBlockDrift && calls.filter(
              (row)=>row.method==="eth_getBlockByNumber"&&
                row.params?.[0]==="0x16f50"
            ).length>1
              ?"0x"+"7".repeat(64)
              :"0x"+"6".repeat(64),
          };
        }
        throw new Error("unexpected_block_tag:"+tag);
      }
      case "eth_blockNumber":
        blockNumberReads+=1;
        if(options.stalled)return "0x16f4e";
        return blockNumberReads===1?"0x16f4e":"0x16f50";
      case "qbft_getValidatorsByBlockNumber":
        return options.badRoster
          ? [...VALIDATORS.slice(0,2),"0x"+"d".repeat(40)]
          : VALIDATORS;
      case "net_peerCount":
        return options.lowPeers?"0x1":"0x2";
      case "eth_getCode":{
        const target=String(params?.[0]||"").toLowerCase();
        if(target===PRESALE){
          return options.badPresaleCode?"0x6000":presaleCode;
        }
        if(target===TOKEN){
          return options.badTokenCode?"0x6000":tokenCode;
        }
        throw new Error("unexpected_code_target");
      }
      case "eth_gasPrice":{
        const gasCalls=calls.filter((row)=>row.method==="eth_gasPrice").length;
        const values=options.gasPrices||["0x0","0x0"];
        return values[Math.min(gasCalls-1,values.length-1)];
      }
      case "eth_getBalance":
        return options.balance??"0xde0b6b3a7640000";
      default:
        throw new Error("unexpected_method:"+method);
    }
  };
  return {calls,transport};
}

const noSleep=async()=>{};

const zeroFixture=fake({gasPrices:["0x0","0x0"],balance:"0x0"});
const zero=await observeFeeChainWithTransport(
  policy,zeroFixture.transport,noSleep
);
assert.equal(zero.zero_fee_envelope,true);
assert.equal(zero.nonzero_fee_envelope,false);
assert.equal(zero.computed_max_fee_per_gas_wei,"0");
assert.equal(zero.maximum_gas_cost_wei,"0");
assert.equal(zero.fulfiller_native_balance_wei,"0");
assert.equal(zero.gas_limit_multiplier_bps,"15000");
assert.equal(zero.fee_multiplier_bps,"20000");
assert.equal(zero.accepted_max_gas_limit,"320000");
assert.equal(zero.final_block_hash_revalidated,true);

const nonzeroFixture=fake({
  gasPrices:["0x3b9aca00","0x47868c00"], // 1.0 and 1.2 Gwei
});
const nonzero=await observeFeeChainWithTransport(
  policy,nonzeroFixture.transport,noSleep
);
assert.equal(nonzero.zero_fee_envelope,false);
assert.equal(nonzero.nonzero_fee_envelope,true);
assert.equal(nonzero.conservative_observed_gas_price_wei,"1200000000");
assert.equal(nonzero.computed_max_fee_per_gas_wei,"2400000000");
assert.equal(nonzero.configured_priority_fee_per_gas_wei,"0");
assert.equal(nonzero.maximum_fee_per_gas_wei,"3000000000");
assert.equal(nonzero.maximum_gas_cost_wei,"768000000000000");
assert.equal(nonzero.native_balance_sufficient,true);

await assert.rejects(
  observeFeeChainWithTransport(
    policy,
    fake({gasPrices:["0x5f5e1000","0x5f5e1000"]}).transport, // 1.6 Gwei
    noSleep,
  ),
  /computed_max_fee_exceeds_policy/u,
);
await assert.rejects(
  observeFeeChainWithTransport(
    policy,
    fake({
      gasPrices:["0x3b9aca00","0x47868c00"],
      balance:"0x1",
    }).transport,
    noSleep,
  ),
  /fulfiller_native_balance_insufficient/u,
);
for(const [label,options,pattern] of [
  ["wrong chain",{wrongChain:true},/chain_id_mismatch/u],
  ["accepted history",{wrongAcceptedHash:true},/accepted_history_mismatch/u],
  ["stalled",{stalled:true},/chain_not_progressing/u],
  ["roster",{badRoster:true},/validator_roster_invalid/u],
  ["peers",{lowPeers:true},/peer_quorum_/u],
  ["presale code",{badPresaleCode:true},/contract_code_identity_mismatch/u],
  ["token code",{badTokenCode:true},/contract_code_identity_mismatch/u],
  ["block drift",{finalBlockDrift:true},/final_block_revalidation_mismatch/u],
]){
  await assert.rejects(
    observeFeeChainWithTransport(policy,fake(options).transport,noSleep),
    pattern,
    label,
  );
}

const methods=[...new Set(nonzeroFixture.calls.map((row)=>row.method))].sort();
assert.deepEqual(methods,[
  "eth_blockNumber",
  "eth_chainId",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "net_peerCount",
  "qbft_getValidatorsByBlockNumber",
].sort());

const child={
  marker:"VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V1",
  version:1,
  status:"EPOCH2_AUTHENTICATED_CREDENTIAL_AND_SIGNER_CONTROL_BOUND_REMAINING_GATES_HOLD",
  source_head:"a".repeat(40),
  canonical_chain_id:2050,
  execution_epoch:2,
  epoch2_presale_contract:PRESALE,
  epoch2_fulfiller_public_address:FULFILLER,
  candidate_lineage_crosscheck:true,
  closing_checkout_revalidated_before_receipt:true,
  accepted_signer_control_candidate_git_blob:"c".repeat(40),
  accepted_signer_control_public_evidence_git_blob:"d".repeat(40),
  accepted_signer_control_evidence_id_sha256:"e".repeat(64),
  authenticated_credential_binding_receipt:{
    source_candidate_git_blob:"f".repeat(40),
    authenticated_credential_live_receipt:{
      credential_lock_id:
        "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c",
      runtime_uid:1000,
      manager_pid:2693,
      manager_start_ticks:"1409",
      main_pid:4242,
      service_start_ticks:"998877",
      credential_qualification_sha256:"sha256:"+"9".repeat(64),
      signer_address:FULFILLER,
    },
  },
  signer_credential_state:{
    signer_offchain_control_proven:true,
    launch_operator_signer_control_evidence_bound:true,
    systemd_credential_identity_proven:true,
    active_signing_capability_proven:true,
    runtime_source_generation_bound:true,
    authenticated_private_manager_generation_bound:true,
    current_system_credential_matches_immutable_fulfiller:true,
    transaction_signing_proven:false,
    transaction_broadcast_proven:false,
  },
  customer_safe_to_pay:false,
  authority:{
    candidate_only:true,
    operational_configuration_selected:false,
    credential_or_wallet_access:false,
    service_mutation:false,
    signer_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    automatic_retry:false,
  },
  production_host_evidence_authority:false,
  next_action:"QUALIFY_LIVE_FEE_ENVELOPE_AND_EXACT_CHAIN_RECEIPT",
  receipt_id:"voide2signcred1_"+"b".repeat(64),
};
const childAfter=structuredClone(child);
const stableIdentity=requireStableChildRuntimeIdentity(
  child,childAfter,"a".repeat(40)
);
assert.equal(stableIdentity.manager_pid,2693);
assert.equal(stableIdentity.main_pid,4242);

const receipt=buildReceipt(
  "a".repeat(40),child,childAfter,policy,nonzero
);
assert.equal(receipt.marker,MARKER);
assert.equal(receipt.status,STATUS);
assert.equal(receipt.accepted_fee_policy_bound,true);
assert.equal(receipt.zero_or_nonzero_fee_envelope_qualified,true);
assert.equal(receipt.exact_chain_history_and_contract_identity_qualified,true);
assert.equal(receipt.native_fee_funding_sufficient,true);
assert.equal(
  receipt.credential_signer_control_generation_stable_across_chain_window,
  true,
);
assert.equal(
  receipt.credential_signer_control_stable_identity.main_pid,
  4242,
);
assert.match(
  receipt.credential_signer_control_stable_identity_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.equal(
  receipt.authenticated_credential_signer_control_receipt_before.receipt_id,
  child.receipt_id,
);
assert.equal(
  receipt.authenticated_credential_signer_control_receipt_after.receipt_id,
  childAfter.receipt_id,
);
assert.equal(receipt.transaction_calldata_constructed,false);
assert.equal(receipt.nonce_reserved,false);
assert.equal(receipt.transaction_signing_proven,false);
assert.equal(receipt.transaction_constructed,false);
assert.equal(receipt.transaction_submitted,false);
assert.equal(receipt.transaction_broadcast,false);
assert.equal(receipt.customer_payment_record_access,false);
assert.equal(receipt.customer_safe_to_pay,false);
assert.equal(receipt.payment_acceptance,false);
assert.equal(receipt.public_presale_activation,false);
assert.equal(receipt.wc_void_market_activation,false);
assert.equal(receipt.funds_movement,false);
assert.equal(receipt.production_host_evidence_authority,false);
assert.equal(receipt.next_action,NEXT_ACTION);
assert.match(receipt.receipt_id,/^voide2feeq1_[0-9a-f]{64}$/u);
assert.match(
  receipt.live_fee_chain_receipt.chain_receipt_id,
  /^voide2feechain1_[0-9a-f]{64}$/u,
);

{
  const forged=structuredClone(nonzero);
  forged.computed_max_fee_per_gas_wei="1";
  assert.throws(
    ()=>buildReceipt("a".repeat(40),child,childAfter,policy,forged),
    /fee_chain_computed_envelope_invalid/u,
  );
}
{
  const forged=structuredClone(nonzero);
  forged.maximum_gas_cost_wei="1";
  assert.throws(
    ()=>buildReceipt("a".repeat(40),child,childAfter,policy,forged),
    /fee_chain_maximum_gas_cost_invalid/u,
  );
}
{
  const forged=structuredClone(nonzero);
  forged.zero_fee_envelope=true;
  assert.throws(
    ()=>buildReceipt("a".repeat(40),child,childAfter,policy,forged),
    /fee_envelope_classification_invalid/u,
  );
}

{
  const driftedChild=structuredClone(childAfter);
  driftedChild.authenticated_credential_binding_receipt
    .authenticated_credential_live_receipt.main_pid=4243;
  assert.throws(
    ()=>requireStableChildRuntimeIdentity(
      child,driftedChild,"a".repeat(40)
    ),
    /credential_signer_control_generation_changed_during_fee_window/u,
  );
  assert.throws(
    ()=>buildReceipt(
      "a".repeat(40),child,driftedChild,policy,nonzero
    ),
    /credential_signer_control_generation_changed_during_fee_window/u,
  );
}

console.log("VOID_BUY_VOID_EPOCH2_LIVE_FEE_CHAIN_QUALIFICATION_V1_PROOF_GREEN");
console.log("candidate_v2_fee_policy_bound=true");
console.log("production_eth_gasPrice_semantics_mirrored=true");
console.log("zero_fee_envelope_proven_inert=true");
console.log("bounded_nonzero_fee_envelope_proven_inert=true");
console.log("fee_multiplier_bps=20000");
console.log("accepted_max_gas_limit=320000");
console.log("max_fee_per_gas_wei=3000000000");
console.log("configured_priority_fee_per_gas_wei=0");
console.log("accepted_history_bound=true");
console.log("exact_validator_roster_before_after_required=true");
console.log("contract_code_identity_bound=true");
console.log("chain_progress_required=true");
console.log("final_block_hash_revalidated=true");
console.log("native_fee_funding_required=true");
console.log("credential_signer_control_before_after_chain_window_required=true");
console.log("credential_signer_control_runtime_generation_stability_required=true");
console.log("credential_signer_control_runtime_drift_rejected=true");
console.log("forged_fee_receipt_rejected=true");
console.log("transaction_calldata_constructed=false");
console.log("nonce_reserved=false");
console.log("transaction=false");
console.log("customer_payment_record_access=false");
console.log("customer_safe_to_pay=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
