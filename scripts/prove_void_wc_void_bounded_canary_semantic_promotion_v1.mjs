#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface } from "ethers";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
} from "../tools/void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";
import {
  reconstructWcVoidMarketVaultRuntimeV1,
} from "../tools/void-wc-void-market-vault-runtime-attestation-v1.mjs";
import {
  collectWcVoidMarketVaultAtUseRevalidationV1,
} from "../tools/void-wc-void-market-vault-at-use-revalidation-v1.mjs";
import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  deriveWcVoidCoupledOpeningStateV1,
  verifyWcVoidOpeningLedgerSettlementsV1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";
import {
  inspectWcVoidOpeningLedgerPersistenceV1,
} from "../tools/void-wc-void-ledger-persistence-v1.mjs";
import {
  wcVoidLedgerPersistenceReviewBindingIdV1,
} from "../tools/void-wc-void-ledger-persistence-import-v1.mjs";
import {
  VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1,
  VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
  deriveWcVoidOpeningClaimBindingV1,
  wcVoidOpeningTransferDispositionIdV1,
} from "../tools/void-wc-void-opening-claim-binding-v1.mjs";
import {
  deriveWcVoidOpeningReplayTransitionV1,
  initialWcVoidOpeningReplayStateV1,
} from "../tools/void-wc-void-opening-replay-protection-v1.mjs";
import {
  VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
  VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
  inspectWcVoidOpeningReplayTerminalV1,
  persistWcVoidOpeningReplayTerminalV1,
} from "../tools/void-wc-void-opening-replay-persistence-v1.mjs";
import {
  inspectWcVoidOpeningClaimBindingPersistenceV1,
} from "../tools/void-wc-void-opening-claim-binding-persistence-v1.mjs";
import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
  persistWcVoidOpeningClaimBindingV1,
} from "../tools/void-wc-void-opening-claim-binding-publication-v1.mjs";
import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1,
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
} from "../tools/void-participant-postpurchase-finality-v1.mjs";
import {
  buildVoidParticipantPostpurchaseProductionRuntimeBindingV1,
} from "../tools/void-participant-postpurchase-production-runtime-binding-v1.mjs";
import {
  collectVoidParticipantPostpurchaseAtUseRevalidationV1,
} from "../tools/void-participant-postpurchase-at-use-revalidation-v1.mjs";
import {
  VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1,
  VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1,
  wcVoidBoundedCanaryEvidenceIdV1,
  wcVoidBoundedCanaryPolicyIdV1,
} from "../tools/void-wc-void-bounded-canary-evidence-v1.mjs";
import {
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
  promoteWcVoidBoundedCanarySemanticV1,
} from "../tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs";

const LAUNCH=
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const VAULT_LAUNCH=
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const TOKEN="0x470075b85352eb86f7d089fb9ba88945f12aad94";
const PARTICIPANT="0x1111111111111111111111111111111111111111";
const OTHER_PARTICIPANT="0x2222222222222222222222222222222222222222";
const FULFILLMENT="0x3333333333333333333333333333333333333333";
const CONTROL_RECIPIENT="0x4444444444444444444444444444444444444444";
const VAULT="0x5555555555555555555555555555555555555555";
const DEPLOYER="0x6666666666666666666666666666666666666666";
const LAUNCH_CONTROLLER="0x7777777777777777777777777777777777777777";
const SETTLEMENT_EXECUTOR="0x8888888888888888888888888888888888888888";
const CLOSEOUT_CONTROLLER="0x9999999999999999999999999999999999999999";
const DELIVERY_TX="0x"+"a".repeat(64);
const CONTROL_TX="0x"+"b".repeat(64);
const DELIVERY_BLOCK_HASH="0x"+"c".repeat(64);
const CONTROL_BLOCK_HASH="0x"+"d".repeat(64);
const HEAD_BLOCK_HASH="0x"+"e".repeat(64);
const VAULT_DEPLOYMENT_TX="0x"+"f".repeat(64);
const VAULT_DEPLOYMENT_BLOCK_HASH="0x"+"1".repeat(64);
const GENESIS_BLOCK_HASH=
  "0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d";
const GENESIS_STATE_ROOT=
  "0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2";
const RUNTIME_MARKER="VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1";
const PUBLIC_BASE="https://seed.nullfeed.org";
const STATUS_PATH="/public-node/economic/epoch2/read-status-v1.json";
const RECEIPT_PATH="/public-node/economic/epoch2/receipt-v1";

function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort().map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  throw new Error("invalid_canonical_value");
}

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value){
  return Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
}

function canonicalBytes(value){
  return Buffer.from(canonicalJson(value)+"\n","utf8");
}

function hash(digit){return "sha256:"+String(digit).repeat(64);}
function hex(value){return "0x"+BigInt(value).toString(16);}

function commitment(digit,account,wc){
  const value={
    schema:VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id:hash("0"),
    coupled_launch_id:LAUNCH,
    participant_id:hash(digit),
    account,
    wc_units:String(wc),
  };
  value.commitment_id=wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function debit(c,amount,ts){
  const value={
    schema:VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind:"debit",
    account:c.account,
    amount,
    delta:-amount,
    ts_ms:ts,
    reason:"wc_void_opening_settlement_v1",
    settlement_id:hash("0"),
    commitment_id:c.commitment_id,
    coupled_launch_id:LAUNCH,
    pair:"WC_VOID",
    source_domain:"void-work-credit-ledger",
    quote_asset_form:"ledger-credit",
    quote_unit:"wc",
    quote_decimals:0,
    market_meta:{
      adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only:true,
      fixed_price:false,
      protocol_wc_seed_units:"0",
    },
  };
  value.settlement_id=wcVoidOpeningSettlementIdV1(value);
  return value;
}

const first=commitment("1","canary-alpha","25");
const second=commitment("2","canary-beta","75");
const commitments=[first,second];
const ledgerDebits=[
  debit(first,25,1790354000001),
  debit(second,75,1790354000002),
];
const opening=deriveWcVoidCoupledOpeningStateV1({
  coupled_launch_id:LAUNCH,
  commitments,
  ledger_debits:ledgerDebits,
});
const settlements=verifyWcVoidOpeningLedgerSettlementsV1(
  LAUNCH,commitments,ledgerDebits,
);
const allocationByCommitment=new Map(
  opening.participant_allocations.map((row)=>[row.commitment_id,row]),
);
const settlementByCommitment=new Map(
  settlements.settlements.map((row)=>[row.commitment_id,row]),
);

function transferClaim(c,recipient){
  const allocation=allocationByCommitment.get(c.commitment_id);
  const settlement=settlementByCommitment.get(c.commitment_id);
  const value={
    schema:VOID_WC_VOID_OPENING_TRANSFER_CLAIM_SCHEMA_V1,
    disposition_id:hash("0"),
    coupled_launch_id:LAUNCH,
    opening_state_id:opening.opening_state_id,
    chain_id:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.chain_id,
    network_identity:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.network_identity,
    execution_epoch:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.execution_epoch,
    void_token:VOID_WC_VOID_OPENING_EXECUTION_BINDING_V1.void_token,
    commitment_id:c.commitment_id,
    settlement_id:settlement.settlement_id,
    participant_id:c.participant_id,
    account:c.account,
    void_recipient:recipient,
    void_atoms:allocation.void_atoms,
  };
  value.disposition_id=wcVoidOpeningTransferDispositionIdV1(value);
  return value;
}
const dispositions=[
  transferClaim(first,PARTICIPANT),
  transferClaim(second,OTHER_PARTICIPANT),
];
const firstDisposition=dispositions[0];
assert.equal(firstDisposition.void_atoms,"1250000000000000000000000");

function openingRequest(){
  return {
    commitments,
    coupled_launch_id:LAUNCH,
    data_dir:"/synthetic/not-read-by-semantic-proof",
    dispositions,
    ledger_debits:ledgerDebits,
    mode:"finalize",
  };
}

function openingEvidenceBytes(){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),"void-canary-opening-"));
  fs.chmodSync(parent,0o700);
  const dataDir=path.join(parent,"data");
  const wcDir=path.join(dataDir,"wc_v1");
  fs.mkdirSync(wcDir,{recursive:true,mode:0o700});
  fs.chmodSync(dataDir,0o700);
  fs.chmodSync(wcDir,0o700);

  const request={
    commitments,
    coupled_launch_id:LAUNCH,
    data_dir:dataDir,
    dispositions,
    ledger_debits:ledgerDebits,
    mode:"finalize",
  };
  const before=initialWcVoidOpeningReplayStateV1(LAUNCH);

  const persistedReplay=persistWcVoidOpeningReplayTerminalV1({
    data_dir:dataDir,
    recorded_at_utc:"2030-01-01T00:00:00Z",
    confirmation:VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_CONFIRMATION_V1,
    before_state:before,
    coupled_launch_id:LAUNCH,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  assert.equal(persistedReplay.ok,true);

  const persistedClaim=persistWcVoidOpeningClaimBindingV1({
    data_dir:dataDir,
    confirmation:
      VOID_WC_VOID_OPENING_CLAIM_BINDING_PUBLICATION_CONFIRMATION_V1,
    coupled_launch_id:LAUNCH,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  assert.equal(persistedClaim.ok,true);
  assert.equal(persistedClaim.binding_id,persistedReplay.binding_id);

  const claimInspection=inspectWcVoidOpeningClaimBindingPersistenceV1({
    data_dir:dataDir,
    coupled_launch_id:LAUNCH,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  const replayInspection=inspectWcVoidOpeningReplayTerminalV1({
    data_dir:dataDir,
    before_state:before,
    coupled_launch_id:LAUNCH,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });

  const binding=deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id:LAUNCH,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  const transition=deriveWcVoidOpeningReplayTransitionV1({
    before_state:before,
    coupled_launch_id:LAUNCH,
    commitments,
    ledger_debits:ledgerDebits,
    mode:"finalize",
    dispositions,
  });
  const body={
    marker:VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
    version:1,
    coupled_launch_id:transition.coupled_launch_id,
    mode:"finalize",
    transition_id:transition.transition_id,
    binding_id:transition.binding_id,
    before_state_id:transition.before_state_id,
    after_state_id:transition.after_state_id,
    after_revision:transition.after_revision,
    terminal_state:transition.next_state,
  };
  const capsule={
    ...body,
    capsule_id:"voidwcrp1_"+sha256(Buffer.from(canonicalJson(body),"utf8")),
  };

  const bindingPath=path.join(dataDir,claimInspection.persisted_path);
  const replayPath=path.join(dataDir,replayInspection.terminal_path);
  const bindingBytes=fs.readFileSync(bindingPath);
  const capsuleBytes=fs.readFileSync(replayPath);
  assert.equal(sha256(bindingBytes),claimInspection.persisted_file_sha256);
  assert.equal(sha256(capsuleBytes),replayInspection.terminal_capsule_sha256);
  assert.deepEqual(JSON.parse(bindingBytes.toString("utf8")),binding);
  assert.deepEqual(JSON.parse(capsuleBytes.toString("utf8")),capsule);

  return {
    parent,
    request,
    requestBytes:prettyBytes(request),
    binding,
    bindingBytes,
    capsule,
    capsuleBytes,
    claimInspection,
    claimInspectionBytes:prettyBytes(claimInspection),
    replayInspection,
    replayInspectionBytes:prettyBytes(replayInspection),
  };
}

function ledgerImportFixture(){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),"void-canary-ledger-"));
  fs.chmodSync(parent,0o700);
  const dataDir=path.join(parent,"data");
  const wcDir=path.join(dataDir,"wc_v1");
  fs.mkdirSync(wcDir,{recursive:true,mode:0o700});
  fs.chmodSync(dataDir,0o700);
  fs.chmodSync(wcDir,0o700);
  const ledger=path.join(wcDir,"ledger.jsonl");
  fs.writeFileSync(
    ledger,
    ledgerDebits.map((row)=>JSON.stringify(row)).join("\n")+"\n",
    {mode:0o600},
  );
  fs.chmodSync(ledger,0o600);
  const receipt=inspectWcVoidOpeningLedgerPersistenceV1({
    data_dir:dataDir,
    coupled_launch_id:LAUNCH,
    commitments,
    expected_ledger_debits:ledgerDebits,
    prestate_bytes:"0",
  });
  const expected={
    coupled_launch_id:LAUNCH,
    settlement_adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    prestate_bytes:"0",
    settlement_set_root:receipt.settlement_set_root,
    total_settled_wc_units:receipt.total_settled_wc_units,
    expected_settlement_count:receipt.expected_settlement_count,
    binding_id:"voidwclprb1_"+"0".repeat(64),
  };
  expected.binding_id=wcVoidLedgerPersistenceReviewBindingIdV1(expected);
  return {parent,input:{expected,evidence:receipt}};
}

const acceptance=JSON.parse(fs.readFileSync(
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json","utf8",
));
const stateManifest=JSON.parse(fs.readFileSync(
  "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json","utf8",
));
const tokenAccount=stateManifest.accounts.find(
  (row)=>String(row.address).toLowerCase()===TOKEN,
);
assert(tokenAccount);
const tokenRuntime=String(tokenAccount.runtime_code_hex).toLowerCase();

const VAULT_IFACE=new Interface([
  "function voidToken() view returns (address)",
  "function launchController() view returns (address)",
  "function settlementExecutor() view returns (address)",
  "function closeoutController() view returns (address)",
  "function coupledLaunchId() view returns (bytes32)",
  "function openingInventoryAtoms() view returns (uint256)",
  "function currentVoidReserveAtoms() view returns (uint256)",
  "function activated() view returns (bool)",
  "function closing() view returns (bool)",
  "function closed() view returns (bool)",
  "function closeoutApproved() view returns (bool)",
  "function activatedAtBlock() view returns (uint256)",
  "function settlementCount() view returns (uint256)",
  "function lifetimeVoidOutAtoms() view returns (uint256)",
  "function pendingCloseoutId() view returns (bytes32)",
  "function pendingSuccessorVault() view returns (address)",
]);
const TOKEN_IFACE=new Interface(["function balanceOf(address) view returns (uint256)"]);
const openingInventory=10_000_000n*10n**18n;
const vaultDeployment={
  market_vault_address:VAULT,
  deployment_transaction_hash:VAULT_DEPLOYMENT_TX,
  deployment_deployer:DEPLOYER,
  void_token:TOKEN,
  launch_controller:LAUNCH_CONTROLLER,
  settlement_executor:SETTLEMENT_EXECUTOR,
  closeout_controller:CLOSEOUT_CONTROLLER,
  coupled_launch_id:VAULT_LAUNCH,
};
const vaultRuntime=reconstructWcVoidMarketVaultRuntimeV1(
  acceptance,vaultDeployment,
);

function vaultTransport(headTimestamp){
  let receiptReads=0;
  let headReads=0;
  return async({method,params})=>{
    if(method==="eth_chainId") return "0x802";
    if(method==="eth_getTransactionReceipt"){
      receiptReads+=1;
      return {
        transactionHash:VAULT_DEPLOYMENT_TX,
        from:DEPLOYER,
        to:null,
        contractAddress:VAULT,
        status:"0x1",
        blockNumber:"0x64",
        blockHash:VAULT_DEPLOYMENT_BLOCK_HASH,
      };
    }
    if(method==="eth_blockNumber") return "0x78";
    if(method==="eth_getBlockByNumber"){
      const tag=String(params?.[0]||"").toLowerCase();
      if(tag==="0x64") return {
        number:"0x64",
        hash:VAULT_DEPLOYMENT_BLOCK_HASH,
        timestamp:hex(headTimestamp-100n),
      };
      headReads+=1;
      return {number:"0x78",hash:HEAD_BLOCK_HASH,timestamp:hex(headTimestamp)};
    }
    if(method==="eth_getCode"){
      const address=String(params?.[0]||"").toLowerCase();
      if(address===VAULT) return vaultRuntime.runtime_hex;
      if(address===TOKEN) return tokenRuntime;
      throw new Error("unexpected_code_address");
    }
    if(method==="eth_call"){
      const call=params?.[0]||{};
      const to=String(call.to||"").toLowerCase();
      const data=String(call.data||"");
      if(to===TOKEN){
        const parsed=TOKEN_IFACE.parseTransaction({data});
        assert.equal(parsed?.name,"balanceOf");
        return TOKEN_IFACE.encodeFunctionResult("balanceOf",[openingInventory]);
      }
      const parsed=VAULT_IFACE.parseTransaction({data});
      assert(parsed);
      const values={
        voidToken:TOKEN,
        launchController:LAUNCH_CONTROLLER,
        settlementExecutor:SETTLEMENT_EXECUTOR,
        closeoutController:CLOSEOUT_CONTROLLER,
        coupledLaunchId:VAULT_LAUNCH,
        openingInventoryAtoms:openingInventory,
        currentVoidReserveAtoms:openingInventory,
        activated:false,
        closing:false,
        closed:false,
        closeoutApproved:false,
        activatedAtBlock:0n,
        settlementCount:0n,
        lifetimeVoidOutAtoms:0n,
        pendingCloseoutId:"0x"+"00".repeat(32),
        pendingSuccessorVault:"0x0000000000000000000000000000000000000000",
      };
      return VAULT_IFACE.encodeFunctionResult(parsed.name,[values[parsed.name]]);
    }
    throw new Error("unexpected_vault_method:"+method);
  };
}

const FINALITY_PAYLOAD_KEYS=[
  "schema","chain_id","execution_epoch","delivery_transaction_hash",
  "delivery_receipt_evidence_fingerprint_sha256","delivery_fulfillment_wallet",
  "delivered_token_amount_atoms","delivery_transfer_log_index",
  "delivery_receipt_block_number","delivery_receipt_block_hash",
  "delivery_observed_confirmation_count","delivery_current_confirmation_count",
  "transaction_hash","participant_address","void_token","transfer_recipient",
  "transfer_amount_atoms","transfer_log_index","receipt_block_number",
  "receipt_block_hash","observed_confirmation_count","required_confirmation_count",
];
const DELIVERED=firstDisposition.void_atoms;
const CONTROLLED="1000000000000000000";
const deliveryFingerprint=sha256(Buffer.from([
  "chain_id=2050","transaction_hash="+DELIVERY_TX,
  "receipt_block_number=100","receipt_block_hash="+DELIVERY_BLOCK_HASH,
  "void_token_address="+TOKEN,"transfer_from="+FULFILLMENT,
  "transfer_to="+PARTICIPANT,"token_amount_atoms="+DELIVERED,
  "transfer_log_index=0",
].join("\n"),"utf8"));

function finalityEvidence(){
  const value={
    marker:VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
    schema:"void.participant-postpurchase-finality-evidence.v1",
    chain_id:2050,execution_epoch:2,
    delivery_transaction_hash:DELIVERY_TX,
    delivery_receipt_evidence_fingerprint_sha256:deliveryFingerprint,
    delivery_fulfillment_wallet:FULFILLMENT,
    delivered_token_amount_atoms:DELIVERED,
    delivery_transfer_log_index:"0",
    delivery_receipt_block_number:"100",
    delivery_receipt_block_hash:DELIVERY_BLOCK_HASH,
    delivery_observed_confirmation_count:"6",
    delivery_current_confirmation_count:"21",
    transaction_hash:CONTROL_TX,
    participant_address:PARTICIPANT,
    void_token:TOKEN,
    transfer_recipient:CONTROL_RECIPIENT,
    transfer_amount_atoms:CONTROLLED,
    transfer_log_index:"0",
    receipt_block_number:"110",
    receipt_block_hash:CONTROL_BLOCK_HASH,
    observed_confirmation_count:"11",
    required_confirmation_count:"3",
    evidence_id:"sha256:"+"0".repeat(64),
    rpc_methods_used:[
      "eth_chainId","eth_getTransactionReceipt","eth_getTransactionReceipt",
      "eth_blockNumber","eth_getTransactionReceipt","eth_getTransactionReceipt",
    ],
    exact_delivery_receipt_binding_verified:true,
    stable_delivery_receipt_revalidation_verified:true,
    delivery_to_control_participant_binding_verified:true,
    exact_submission_receipt_binding_verified:true,
    exact_voidtoken_transfer_finality_verified:true,
    stable_receipt_revalidation_verified:true,
    participant_postpurchase_voidtoken_control_finality_source_ready:true,
    runtime_or_launch_evidence:false,
    runtime_route_active:false,
    public_submission_open:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    authoritative_chain2050_write_performed:false,
    token_movement_performed_by_this_verifier:false,
    funds_movement_performed_by_this_verifier:false,
    authority:structuredClone(VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1),
  };
  const payload={};
  for(const key of FINALITY_PAYLOAD_KEYS) payload[key]=value[key];
  value.evidence_id="sha256:"+sha256(Buffer.from(canonicalJson(payload),"utf8"));
  return value;
}
function finalityInput(){
  return {
    expected:{
      delivery_transaction_hash:DELIVERY_TX,
      delivery_receipt_evidence_fingerprint_sha256:deliveryFingerprint,
      participant_address:PARTICIPANT,
      delivered_token_amount_atoms:DELIVERED,
      control_transaction_hash:CONTROL_TX,
      control_transfer_recipient:CONTROL_RECIPIENT,
      control_transfer_amount_atoms:CONTROLLED,
      control_receipt_block_number:"110",
      control_receipt_block_hash:CONTROL_BLOCK_HASH,
      control_transfer_log_index:"0",
      minimum_delivery_confirmation_count:"12",
      minimum_control_confirmation_count:"6",
    },
    evidence:finalityEvidence(),
  };
}
function runtimeBoundary(){
  return {
    production_successor_rpc_endpoint_selected:true,
    exact_production_genesis_read_replica:true,p2p_enabled:false,
    discovery_enabled:false,raw_public_rpc_allowed:false,
    transaction_construction:false,transaction_signing:false,
    transaction_submission:false,transaction_broadcast:false,
    authoritative_chain2050_write:false,wallet_access:false,
    private_key_access:false,credential_content_access:false,
    validator_mutation:false,token_movement:false,funds_movement:false,
    migration_authorized:false,public_activation_authorized:false,
  };
}
function publicTransport(body,pathname){
  const bytes=prettyBytes(body);
  return {
    url:new URL(pathname,PUBLIC_BASE).href,
    http_status:200,body,artifact_sha256:sha256(bytes),
  };
}
function statusResult(){
  return publicTransport({
    ok:true,marker:RUNTIME_MARKER,
    status:"INACTIVE_SUCCESSOR_PUBLIC_READ_RUNTIME_READY",
    chain_id:2050,execution_epoch:2,block_number:"0x0",
    block_hash:GENESIS_BLOCK_HASH,state_root:GENESIS_STATE_ROOT,
    query_kinds:["balance","code","receipt"],
    balance_code_block_fixed_to_genesis:true,
    live_receipt_lookup_transport_verified:true,
    successful_receipt_semantics_source_proven:true,
    live_balance_receipt_code_gateway_ready:true,
    runtime_route_active:true,public_gateway_active:false,
    ...runtimeBoundary(),
  },STATUS_PATH);
}
function receiptResult({tx,blockHex,blockHash,stateRoot,from}){
  const core={
    query_kind:"receipt",chain_id:2050,execution_epoch:2,
    block_number:blockHex,block_hash:blockHash,state_root:stateRoot,
    transaction_hash:tx,receipt_status:"0x1",receipt_from:from,receipt_to:TOKEN,
  };
  return publicTransport({
    ok:true,marker:RUNTIME_MARKER,status:"LIVE_SUCCESSOR_RECEIPT_VERIFIED",
    receipt_found:true,
    source_evidence_id:"sha256:"+sha256(Buffer.from(canonicalJson(core),"utf8")),
    transaction_hash:tx,block_number:blockHex,block_hash:blockHash,
    state_root:stateRoot,receipt_status:"0x1",receipt_from:from,receipt_to:TOKEN,
    exact_receipt_identity_revalidated:true,exact_block_identity_revalidated:true,
    live_receipt_lookup_transport_verified:true,
    successful_receipt_semantics_source_proven:true,
    live_balance_receipt_code_gateway_ready:true,
    runtime_route_active:true,public_gateway_active:false,
    ...runtimeBoundary(),
  },RECEIPT_PATH+"?tx="+tx);
}
function participantRuntimeBinding(){
  return buildVoidParticipantPostpurchaseProductionRuntimeBindingV1({
    finalityInput:finalityInput(),
    statusResult:statusResult(),
    deliveryReceiptResult:receiptResult({
      tx:DELIVERY_TX,blockHex:"0x64",blockHash:DELIVERY_BLOCK_HASH,
      stateRoot:"0x"+"2".repeat(64),from:FULFILLMENT,
    }),
    controlReceiptResult:receiptResult({
      tx:CONTROL_TX,blockHex:"0x6e",blockHash:CONTROL_BLOCK_HASH,
      stateRoot:"0x"+"3".repeat(64),from:PARTICIPANT,
    }),
  });
}
function participantHeadTransport(headTimestamp){
  let numberReads=0;
  let headReads=0;
  return async({method,params})=>{
    if(method==="eth_chainId") return "0x802";
    if(method==="eth_blockNumber") return hex(numberReads++===0?120n:120n);
    if(method==="eth_getBlockByNumber"){
      const tag=String(params?.[0]||"").toLowerCase();
      if(tag==="0x64") return {
        number:"0x64",hash:DELIVERY_BLOCK_HASH,timestamp:hex(headTimestamp-100n),
      };
      if(tag==="0x6e") return {
        number:"0x6e",hash:CONTROL_BLOCK_HASH,timestamp:hex(headTimestamp-50n),
      };
      headReads+=1;
      return {number:"0x78",hash:HEAD_BLOCK_HASH,timestamp:hex(headTimestamp)};
    }
    throw new Error("unexpected_participant_method:"+method);
  };
}

async function buildUpstream(){
  const headTimestamp=BigInt(Math.floor(Date.now()/1000)-5);
  const vaultArtifact=await collectWcVoidMarketVaultAtUseRevalidationV1({
    compiled_identity_acceptance:acceptance,
    deployment:vaultDeployment,
    min_confirmations:"3",
    transport:vaultTransport(headTimestamp),
  });

  const fi=finalityInput();
  const rb=participantRuntimeBinding();
  const fiBytes=prettyBytes(fi);
  const rbBytes=prettyBytes(rb);
  const participantArtifact=
    await collectVoidParticipantPostpurchaseAtUseRevalidationV1({
      runtime_binding_bytes:rbBytes,
      runtime_binding_file_sha256:sha256(rbBytes),
      finality_input_bytes:fiBytes,
      finality_input_file_sha256:sha256(fiBytes),
      head_transport:participantHeadTransport(headTimestamp),
    });

  return {vaultArtifact,participantArtifact};
}

function canaryPolicy(vaultArtifact){
  const value={
    marker:VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1,
    version:1,chain_id:2050,execution_epoch:2,pair:"WC_VOID",
    coupled_launch_id:LAUNCH,
    market_vault_address:VAULT,
    market_vault_runtime_code_sha256:vaultArtifact.market_vault_runtime_code_sha256,
    market_vault_compiled_identity_id:COMPILED_IDENTITY_EXPECTED.identity_id,
    wc_settlement_adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    max_participants:"1",
    max_settled_wc_units:"50",
    max_delivered_void_atoms:"2000000000000000000000000",
    min_finality_confirmations:"3",
    max_evidence_age_seconds:"600",
    requires_live_runtime_evidence:true,
    requires_inventory_lock:true,
    requires_wc_ledger_persistence:true,
    requires_quote_reserve_custody:true,
    requires_claim_binding_persistence:true,
    requires_durable_replay_persistence:true,
    requires_participant_control_finality:true,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    policy_id:"voidwcbcp1_"+"0".repeat(64),
  };
  value.policy_id=wcVoidBoundedCanaryPolicyIdV1(value);
  return value;
}

async function fixture(){
  const upstream=await buildUpstream();
  const ledger=ledgerImportFixture();
  const openingEvidence=openingEvidenceBytes();
  const observedAt=
    Date.parse(upstream.vaultArtifact.collection_completed_at_utc)>=
    Date.parse(upstream.participantArtifact.collection_completed_at_utc)
      ?upstream.vaultArtifact.collection_completed_at_utc
      :upstream.participantArtifact.collection_completed_at_utc;
  const validUntil=
    Date.parse(upstream.vaultArtifact.valid_until_utc)<=
    Date.parse(upstream.participantArtifact.valid_until_utc)
      ?upstream.vaultArtifact.valid_until_utc
      :upstream.participantArtifact.valid_until_utc;
  const evaluation=observedAt;
  const policy=canaryPolicy(upstream.vaultArtifact);
  const ledgerBytes=prettyBytes(ledger.input);
  const vaultBytes=prettyBytes(upstream.vaultArtifact);
  const participantBytes=prettyBytes(upstream.participantArtifact);

  const evidence={
    marker:VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1,
    version:1,status:"BOUNDED_CANARY_EVIDENCE_CANDIDATE",
    policy_id:policy.policy_id,coupled_launch_id:LAUNCH,
    chain_id:2050,execution_epoch:2,pair:"WC_VOID",
    market_vault_address:VAULT,
    market_vault_runtime_code_sha256:upstream.vaultArtifact.market_vault_runtime_code_sha256,
    market_vault_compiled_identity_id:COMPILED_IDENTITY_EXPECTED.identity_id,
    market_vault_runtime_verification_evidence_id:
      upstream.vaultArtifact.market_vault_runtime_verification_evidence_id,
    inventory_lock_evidence_id:upstream.vaultArtifact.inventory_lock_evidence_id,
    wc_settlement_adapter_id:VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    wc_ledger_custody_evidence_id:"sha256:"+sha256(ledgerBytes),
    participant_count:"1",
    settled_wc_units:"25",
    delivered_void_atoms:DELIVERED,
    inventory_lock_verified:true,
    wc_ledger_persistence_verified:true,
    quote_reserve_custody_verified:true,
    opening_claim_binding_id:openingEvidence.binding.binding_id,
    opening_claim_binding_persistence_evidence_id:
      "sha256:"+sha256(openingEvidence.bindingBytes),
    opening_claim_binding_persisted:true,
    replay_capsule_id:openingEvidence.capsule.capsule_id,
    replay_terminal_capsule_sha256:sha256(openingEvidence.capsuleBytes),
    durable_replay_state_persistence_verified:true,
    participant_control_evidence_id:
      upstream.participantArtifact.participant_control_evidence_id,
    participant_postpurchase_voidtoken_control_verified:true,
    observed_finality_confirmations:"11",
    runtime_or_launch_evidence:true,
    observed_at_utc:observedAt,valid_until_utc:validUntil,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    evidence_id:"voidwcbce1_"+"0".repeat(64),
  };
  evidence.evidence_id=wcVoidBoundedCanaryEvidenceIdV1(evidence);
  const canaryInput={
    expected_policy_id:policy.policy_id,
    evaluation_time_utc:evaluation,
    policy,evidence,
  };
  const canaryBytes=prettyBytes(canaryInput);
  return {
    cleanup:()=>{
      fs.rmSync(ledger.parent,{recursive:true,force:true});
      fs.rmSync(openingEvidence.parent,{recursive:true,force:true});
    },
    request:{
      reviewed_policy_id:policy.policy_id,
      evaluation_time_utc:evaluation,
      bounded_canary_input_bytes:canaryBytes,
      bounded_canary_input_file_sha256:sha256(canaryBytes),
      market_vault_at_use_bytes:vaultBytes,
      market_vault_at_use_file_sha256:sha256(vaultBytes),
      ledger_persistence_import_input_bytes:ledgerBytes,
      ledger_persistence_import_input_file_sha256:sha256(ledgerBytes),
      opening_request_bytes:openingEvidence.requestBytes,
      opening_request_file_sha256:sha256(openingEvidence.requestBytes),
      opening_claim_binding_bytes:openingEvidence.bindingBytes,
      opening_claim_binding_file_sha256:sha256(openingEvidence.bindingBytes),
      opening_claim_persistence_receipt_bytes:
        openingEvidence.claimInspectionBytes,
      opening_claim_persistence_receipt_file_sha256:
        sha256(openingEvidence.claimInspectionBytes),
      opening_replay_capsule_bytes:openingEvidence.capsuleBytes,
      opening_replay_capsule_file_sha256:sha256(openingEvidence.capsuleBytes),
      opening_replay_inspection_receipt_bytes:
        openingEvidence.replayInspectionBytes,
      opening_replay_inspection_receipt_file_sha256:
        sha256(openingEvidence.replayInspectionBytes),
      participant_at_use_bytes:participantBytes,
      participant_at_use_file_sha256:sha256(participantBytes),
    },
    upstream,ledger,openingEvidence,policy,evidence,
  };
}

const f=await fixture();
try{
  const out=promoteWcVoidBoundedCanarySemanticV1(f.request);
  assert.equal(out.marker,VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1);
  assert.equal(out.status,"BOUNDED_CANARY_SEMANTICALLY_VERIFIED_PROMOTION_READY");
  assert.equal(out.coupled_launch_id,LAUNCH);
  assert.equal(out.reviewed_policy_id,f.policy.policy_id);
  assert.equal(out.canary_evidence_id,f.evidence.evidence_id);
  assert.equal(out.participant_count,"1");
  assert.equal(out.settled_wc_units,"25");
  assert.equal(out.delivered_void_atoms,DELIVERED);
  assert.equal(out.observed_finality_confirmations,"11");
  assert.equal(out.market_vault_address,VAULT);
  assert.equal(
    out.participant_control_evidence_id,
    f.upstream.participantArtifact.participant_control_evidence_id,
  );
  assert.equal(out.opening_claim_persistence_semantically_verified,true);
  assert.equal(out.opening_replay_persistence_semantically_verified,true);
  assert.equal(out.upstream_evidence_semantically_verified,true);
  assert.equal(out.live_canary_evidence_verified,true);
  assert.equal(out.bounded_canary_green,true);
  assert.equal(out.production_candidate_binding_allowed,true);
  assert.equal(out.production_candidate_updated,false);
  assert.equal(out.coupled_candidate_updated,false);
  assert.equal(out.candidate_promotion_required,true);
  assert.equal(out.coupled_activation_ready,false);
  assert.equal(out.market_activation_authorized,false);
  assert.equal(out.public_presale_activation_authorized,false);
  assert.equal(out.funds_movement_authorized,false);
  assert.match(out.semantic_evidence_id,/^sha256:[0-9a-f]{64}$/u);
  assert.match(out.promotion_id,/^voidwcbcsp1_[0-9a-f]{64}$/u);
  assert.equal(
    out.semantic_evidence_id.slice(7),
    out.promotion_id.slice("voidwcbcsp1_".length),
  );

  const repeat=promoteWcVoidBoundedCanarySemanticV1({
    ...f.request,
  });
  assert.equal(repeat.promotion_id,out.promotion_id);

  {
    const bad={...f.request,reviewed_policy_id:"voidwcbcp1_"+"f".repeat(64)};
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1(bad),
      /BOUNDED_CANARY_REVIEWED_POLICY_OR_TIME_MISMATCH/u,
    );
  }
  {
    const badInput=JSON.parse(f.request.bounded_canary_input_bytes.toString("utf8"));
    badInput.evidence.observed_finality_confirmations="12";
    badInput.evidence.evidence_id=wcVoidBoundedCanaryEvidenceIdV1(badInput.evidence);
    const bytes=prettyBytes(badInput);
    const bad={...f.request,
      bounded_canary_input_bytes:bytes,
      bounded_canary_input_file_sha256:sha256(bytes),
    };
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1(bad),
      /BOUNDED_CANARY_FINALITY_COMPOSITION_MISMATCH/u,
    );
  }
  {
    const badInput=JSON.parse(f.request.bounded_canary_input_bytes.toString("utf8"));
    badInput.evidence.wc_ledger_custody_evidence_id="sha256:"+"f".repeat(64);
    badInput.evidence.evidence_id=wcVoidBoundedCanaryEvidenceIdV1(badInput.evidence);
    const bytes=prettyBytes(badInput);
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1({
        ...f.request,
        bounded_canary_input_bytes:bytes,
        bounded_canary_input_file_sha256:sha256(bytes),
      }),
      /BOUNDED_CANARY_LEDGER_EVIDENCE_MISMATCH/u,
    );
  }
  {
    const bad=Buffer.from(f.request.opening_claim_binding_bytes);
    bad[bad.length-2]=bad[bad.length-2]===0x7d?0x20:0x7d;
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1({
        ...f.request,
        opening_claim_binding_bytes:bad,
        opening_claim_binding_file_sha256:sha256(bad),
      }),
      /BOUNDED_CANARY_OPENING_CLAIM_FILE_JSON_INVALID|BOUNDED_CANARY_OPENING_CLAIM_BYTES_MISMATCH/u,
    );
  }
  {
    const badReceipt=structuredClone(f.openingEvidence.claimInspection);
    badReceipt.binding_persistence_verified=false;
    const bytes=prettyBytes(badReceipt);
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1({
        ...f.request,
        opening_claim_persistence_receipt_bytes:bytes,
        opening_claim_persistence_receipt_file_sha256:sha256(bytes),
      }),
      /BOUNDED_CANARY_OPENING_CLAIM_PERSISTENCE_RECEIPT_INVALID/u,
    );
  }
  {
    const badReceipt=structuredClone(f.openingEvidence.replayInspection);
    badReceipt.durable_replay_state_persistence_verified=false;
    const bytes=prettyBytes(badReceipt);
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1({
        ...f.request,
        opening_replay_inspection_receipt_bytes:bytes,
        opening_replay_inspection_receipt_file_sha256:sha256(bytes),
      }),
      /BOUNDED_CANARY_OPENING_REPLAY_PERSISTENCE_RECEIPT_INVALID/u,
    );
  }
  {
    const badInput=JSON.parse(f.request.bounded_canary_input_bytes.toString("utf8"));
    badInput.evidence.valid_until_utc=
      new Date(Date.parse(badInput.evidence.valid_until_utc)-1000)
        .toISOString().replace(".000Z","Z");
    badInput.evidence.evidence_id=wcVoidBoundedCanaryEvidenceIdV1(badInput.evidence);
    const bytes=prettyBytes(badInput);
    assert.throws(
      ()=>promoteWcVoidBoundedCanarySemanticV1({
        ...f.request,
        bounded_canary_input_bytes:bytes,
        bounded_canary_input_file_sha256:sha256(bytes),
      }),
      /BOUNDED_CANARY_FRESHNESS_COMPOSITION_MISMATCH/u,
    );
  }
}finally{
  f.cleanup();
}

for(const [key,value] of Object.entries(
  VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1,
)){
  const allowed=new Set([
    "explicit_reviewed_policy_id_required",
    "exact_evidence_bytes_required",
    "first_stage_canary_reverification",
    "market_vault_at_use_reverification",
    "ledger_persistence_semantic_import",
    "opening_claim_binding_rederivation",
    "opening_claim_persistence_receipt_validation",
    "opening_replay_capsule_rederivation",
    "opening_replay_persistence_receipt_validation",
    "participant_at_use_reverification",
    "source_only_promotion",
  ]);
  assert.equal(value,allowed.has(key),key);
}

const source=fs.readFileSync(
  "tools/void-wc-void-bounded-canary-semantic-promotion-v1.mjs","utf8",
);
for(const forbidden of [
  "writeFileSync","appendFileSync","renameSync","https.request(",
  "eth_sendRawTransaction","eth_sendTransaction","new Wallet(","systemctl",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
for(const required of [
  "verifyWcVoidBoundedCanaryEvidenceV1",
  "verifyWcVoidMarketVaultAtUseRevalidationV1",
  "importWcVoidLedgerPersistenceV1",
  "deriveWcVoidOpeningClaimBindingV1",
  "VOID_WC_VOID_OPENING_CLAIM_BINDING_PERSISTENCE_V1",
  "deriveWcVoidOpeningReplayTransitionV1",
  "VOID_WC_VOID_OPENING_REPLAY_INSPECTION_AUTHORITY_V1",
  "verifyVoidParticipantPostpurchaseAtUseRevalidationV1",
  "BOUNDED_CANARY_FINALITY_COMPOSITION_MISMATCH",
  "BOUNDED_CANARY_FRESHNESS_COMPOSITION_MISMATCH",
  "bounded_canary_green:true",
  "production_candidate_binding_allowed:true",
  "coupled_activation_ready:false",
]){
  assert.equal(source.includes(required),true,required);
}

console.log("VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1_PROOF_GREEN");
console.log("reviewed_policy_id_external_input_required=true");
console.log("exact_upstream_bytes_sha256_bound=true");
console.log("vault_at_use_semantics_reverified=true");
console.log("ledger_persistence_semantics_reimported=true");
console.log("opening_claim_binding_rederived=true");
console.log("opening_claim_persistence_inspection_receipt_verified=true");
console.log("opening_replay_capsule_rederived=true");
console.log("opening_replay_persistence_inspection_receipt_verified=true");
console.log("participant_at_use_semantics_reverified=true");
console.log("one_canary_participant_selected_from_opening_cohort=true");
console.log("canary_finality_minimum_composed=true");
console.log("canary_freshness_window_intersection=true");
console.log("upstream_evidence_semantically_verified=true");
console.log("live_canary_evidence_verified=true");
console.log("bounded_canary_green=true");
console.log("production_candidate_binding_allowed=true");
console.log("production_candidate_updated=false");
console.log("coupled_candidate_updated=false");
console.log("coupled_activation_ready=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
