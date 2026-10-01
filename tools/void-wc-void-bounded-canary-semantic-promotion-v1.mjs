#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  verifyWcVoidBoundedCanaryEvidenceV1,
} from "./void-wc-void-bounded-canary-evidence-v1.mjs";
import {
  verifyWcVoidMarketVaultAtUseRevalidationV1,
} from "./void-wc-void-market-vault-at-use-revalidation-v1.mjs";
import {
  importWcVoidLedgerPersistenceV1,
} from "./void-wc-void-ledger-persistence-import-v1.mjs";
import {
  deriveWcVoidOpeningClaimBindingV1,
} from "./void-wc-void-opening-claim-binding-v1.mjs";
import {
  deriveWcVoidOpeningReplayTransitionV1,
  initialWcVoidOpeningReplayStateV1,
} from "./void-wc-void-opening-replay-protection-v1.mjs";
import {
  VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
} from "./void-wc-void-opening-replay-persistence-v1.mjs";
import {
  verifyWcVoidOpeningLedgerSettlementsV1,
} from "./void-wc-void-coupled-opening-v1.mjs";
import {
  verifyVoidParticipantPostpurchaseAtUseRevalidationV1,
} from "./void-participant-postpurchase-at-use-revalidation-v1.mjs";

export const VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1 =
  "VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1";

export const VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1 =
  Object.freeze({
    explicit_reviewed_policy_id_required:true,
    exact_evidence_bytes_required:true,
    first_stage_canary_reverification:true,
    market_vault_at_use_reverification:true,
    ledger_persistence_semantic_import:true,
    opening_claim_binding_rederivation:true,
    opening_replay_capsule_rederivation:true,
    participant_at_use_reverification:true,
    source_only_promotion:true,
    filesystem_read:false,
    filesystem_write:false,
    credential_access:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    rpc_call:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    wc_ledger_write:false,
    wc_balance_mutation:false,
    token_movement:false,
    inventory_funding:false,
    liquidity_movement:false,
    production_candidate_update:false,
    coupled_candidate_update:false,
    coupled_activation:false,
    market_activation:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const CURRENT_LAUNCH=
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
const MAX_INPUT_BYTES=64*1024*1024;
const HEX64=/^[0-9a-f]{64}$/u;
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const POLICY_ID=/^voidwcbcp1_[0-9a-f]{64}$/u;
const EVIDENCE_ID=/^voidwcbce1_[0-9a-f]{64}$/u;
const REPLAY_ID=/^voidwcrp1_[0-9a-f]{64}$/u;
const PROMOTION_ID=/^voidwcbcsp1_[0-9a-f]{64}$/u;
const UINT=/^(0|[1-9][0-9]*)$/u;

const INPUT_KEYS=Object.freeze([
  "reviewed_policy_id",
  "evaluation_time_utc",
  "bounded_canary_input_bytes",
  "bounded_canary_input_file_sha256",
  "market_vault_at_use_bytes",
  "market_vault_at_use_file_sha256",
  "ledger_persistence_import_input_bytes",
  "ledger_persistence_import_input_file_sha256",
  "opening_request_bytes",
  "opening_request_file_sha256",
  "opening_claim_binding_bytes",
  "opening_claim_binding_file_sha256",
  "opening_replay_capsule_bytes",
  "opening_replay_capsule_file_sha256",
  "participant_at_use_bytes",
  "participant_at_use_file_sha256",
]);

const OPENING_REQUEST_KEYS=Object.freeze([
  "commitments",
  "coupled_launch_id",
  "data_dir",
  "dispositions",
  "ledger_debits",
  "mode",
]);

function fail(code){throw new Error(code);}

function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function exactObject(value,keys,code){
  if(!plain(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const actual=Reflect.ownKeys(descriptors);
  if(actual.some((key)=>typeof key!=="string")) fail(code);
  const sorted=[...actual].sort();
  const expected=[...keys].sort();
  if(sorted.length!==expected.length||sorted.some((key,i)=>key!==expected[i])){
    fail(code);
  }
  const out=Object.create(null);
  for(const key of keys){
    const descriptor=descriptors[key];
    if(!descriptor||descriptor.enumerable!==true||!Object.hasOwn(descriptor,"value")){
      fail(code);
    }
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function compareText(a,b){return a<b?-1:a>b?1:0;}

function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(plain(value)){
    return "{"+Object.keys(value).sort(compareText).map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("BOUNDED_CANARY_SEMANTIC_CANONICAL_VALUE_INVALID");
}

function sha256(bytes){
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text){
  return createHash("sha256").update(text).digest("hex");
}

function parseJsonBytes(bytes,expectedSha,label){
  if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>MAX_INPUT_BYTES){
    fail(label+"_BYTES_INVALID");
  }
  if(typeof expectedSha!=="string"||!HEX64.test(expectedSha)){
    fail(label+"_SHA256_INVALID");
  }
  if(sha256(bytes)!==expectedSha) fail(label+"_SHA256_MISMATCH");
  let text;
  try{
    text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }catch{
    fail(label+"_UTF8_INVALID");
  }
  let value;
  try{
    value=JSON.parse(text);
  }catch{
    fail(label+"_JSON_INVALID");
  }
  if(!plain(value)) fail(label+"_JSON_NOT_OBJECT");
  return Object.freeze({
    bytes:Buffer.from(bytes),
    sha256:expectedSha,
    value,
  });
}

function uint(value,code,{positive=false}={}){
  if(typeof value!=="string"||value.length>78||!UINT.test(value)) fail(code);
  const out=BigInt(value);
  if(positive&&out<=0n) fail(code);
  return out;
}

function canonicalUtc(value,code){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)){
    fail(code);
  }
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value.replace("Z",".000Z")){
    fail(code);
  }
  return BigInt(ms);
}

function maxUtc(left,right){
  return canonicalUtc(left,"BOUNDED_CANARY_SEMANTIC_TIME_INVALID")>=
    canonicalUtc(right,"BOUNDED_CANARY_SEMANTIC_TIME_INVALID")?left:right;
}

function minUtc(left,right){
  return canonicalUtc(left,"BOUNDED_CANARY_SEMANTIC_TIME_INVALID")<=
    canonicalUtc(right,"BOUNDED_CANARY_SEMANTIC_TIME_INVALID")?left:right;
}

function exactBytesEqual(actual,expected,code){
  if(!actual.equals(expected)) fail(code);
}

function replayCapsuleFor(transition,mode){
  const body=Object.freeze({
    marker:VOID_WC_VOID_OPENING_REPLAY_TERMINAL_CAPSULE_V1,
    version:1,
    coupled_launch_id:transition.coupled_launch_id,
    mode,
    transition_id:transition.transition_id,
    binding_id:transition.binding_id,
    before_state_id:transition.before_state_id,
    after_state_id:transition.after_state_id,
    after_revision:transition.after_revision,
    terminal_state:transition.next_state,
  });
  return Object.freeze({
    ...body,
    capsule_id:"voidwcrp1_"+sha256Text(canonicalJson(body)),
  });
}

function verifyAuthority(){
  return VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_AUTHORITY_V1;
}

export function promoteWcVoidBoundedCanarySemanticV1(input){
  const request=exactObject(
    input,
    INPUT_KEYS,
    "INVALID_WC_VOID_BOUNDED_CANARY_SEMANTIC_INPUT_SHAPE",
  );
  if(
    typeof request.reviewed_policy_id!=="string"||
    !POLICY_ID.test(request.reviewed_policy_id)
  ) fail("BOUNDED_CANARY_REVIEWED_POLICY_ID_INVALID");
  const evaluationMs=canonicalUtc(
    request.evaluation_time_utc,
    "BOUNDED_CANARY_SEMANTIC_EVALUATION_TIME_INVALID",
  );

  const canarySource=parseJsonBytes(
    request.bounded_canary_input_bytes,
    request.bounded_canary_input_file_sha256,
    "BOUNDED_CANARY_INPUT_FILE",
  );
  const vaultSource=parseJsonBytes(
    request.market_vault_at_use_bytes,
    request.market_vault_at_use_file_sha256,
    "BOUNDED_CANARY_VAULT_AT_USE_FILE",
  );
  const ledgerSource=parseJsonBytes(
    request.ledger_persistence_import_input_bytes,
    request.ledger_persistence_import_input_file_sha256,
    "BOUNDED_CANARY_LEDGER_IMPORT_INPUT_FILE",
  );
  const openingRequestSource=parseJsonBytes(
    request.opening_request_bytes,
    request.opening_request_file_sha256,
    "BOUNDED_CANARY_OPENING_REQUEST_FILE",
  );
  const claimSource=parseJsonBytes(
    request.opening_claim_binding_bytes,
    request.opening_claim_binding_file_sha256,
    "BOUNDED_CANARY_OPENING_CLAIM_FILE",
  );
  const replaySource=parseJsonBytes(
    request.opening_replay_capsule_bytes,
    request.opening_replay_capsule_file_sha256,
    "BOUNDED_CANARY_OPENING_REPLAY_FILE",
  );
  const participantSource=parseJsonBytes(
    request.participant_at_use_bytes,
    request.participant_at_use_file_sha256,
    "BOUNDED_CANARY_PARTICIPANT_AT_USE_FILE",
  );

  const canaryInput=canarySource.value;
  if(
    canaryInput.expected_policy_id!==request.reviewed_policy_id||
    canaryInput?.policy?.policy_id!==request.reviewed_policy_id||
    canaryInput.evaluation_time_utc!==request.evaluation_time_utc
  ){
    fail("BOUNDED_CANARY_REVIEWED_POLICY_OR_TIME_MISMATCH");
  }
  const canary=verifyWcVoidBoundedCanaryEvidenceV1(canaryInput);
  if(
    canary?.ok!==true||
    canary?.status!=="EVIDENCE_CANDIDATE_VALID_UPSTREAM_PROOFS_UNVERIFIED"||
    canary?.bounded_canary_evidence_candidate_valid!==true||
    canary?.bounded_canary_green!==false||
    canary?.production_candidate_binding_allowed!==false||
    canary?.coupled_launch_id!==CURRENT_LAUNCH
  ) fail("BOUNDED_CANARY_FIRST_STAGE_INVALID");

  const evidence=canaryInput.evidence;
  if(
    evidence.coupled_launch_id!==CURRENT_LAUNCH||
    evidence.participant_count!=="1"
  ) fail("BOUNDED_CANARY_V1_PARTICIPANT_OR_LAUNCH_MISMATCH");

  const vault=verifyWcVoidMarketVaultAtUseRevalidationV1({
    artifact:vaultSource.value,
    evaluation_time_utc:request.evaluation_time_utc,
  });
  if(
    vault?.ok!==true||
    vault?.status!=="MARKET_VAULT_AT_USE_EVIDENCE_VERIFIED_CURRENT"||
    vault.opening_domain_coupled_launch_id!==CURRENT_LAUNCH||
    vault.market_vault_runtime_verification_evidence_id!==
      evidence.market_vault_runtime_verification_evidence_id||
    vault.inventory_lock_evidence_id!==evidence.inventory_lock_evidence_id||
    vault.market_vault_address!==evidence.market_vault_address||
    vault.market_vault_runtime_code_sha256!==
      evidence.market_vault_runtime_code_sha256
  ) fail("BOUNDED_CANARY_VAULT_EVIDENCE_MISMATCH");

  const participant=verifyVoidParticipantPostpurchaseAtUseRevalidationV1({
    artifact:participantSource.value,
    evaluation_time_utc:request.evaluation_time_utc,
  });
  if(
    participant?.ok!==true||
    participant?.status!=="PARTICIPANT_CONTROL_AT_USE_EVIDENCE_VERIFIED_CURRENT"||
    participant.coupled_launch_id!==CURRENT_LAUNCH||
    participant.participant_count!=="1"||
    participant.participant_control_evidence_id!==evidence.participant_control_evidence_id||
    participant.delivered_token_amount_atoms!==evidence.delivered_void_atoms
  ) fail("BOUNDED_CANARY_PARTICIPANT_EVIDENCE_MISMATCH");

  const ledger=importWcVoidLedgerPersistenceV1(ledgerSource.value);
  if(
    ledger?.ok!==true||
    ledger?.status!=="VERIFIED_LEDGER_PERSISTENCE_IMPORT"||
    ledger.coupled_launch_id!==CURRENT_LAUNCH||
    ledger.wc_ledger_persistence_verified!==true||
    ledger.quote_reserve_custody_verified!==true||
    ledger.market_activation_authorized!==false||
    ledger.public_presale_activation_authorized!==false||
    ledger.funds_movement_authorized!==false||
    "sha256:"+ledgerSource.sha256!==evidence.wc_ledger_custody_evidence_id
  ) fail("BOUNDED_CANARY_LEDGER_EVIDENCE_MISMATCH");

  const openingRequest=exactObject(
    openingRequestSource.value,
    OPENING_REQUEST_KEYS,
    "BOUNDED_CANARY_OPENING_REQUEST_SHAPE_INVALID",
  );
  if(
    openingRequest.coupled_launch_id!==CURRENT_LAUNCH||
    openingRequest.mode!=="finalize"||
    !Array.isArray(openingRequest.commitments)||
    !Array.isArray(openingRequest.ledger_debits)||
    !Array.isArray(openingRequest.dispositions)||
    openingRequest.commitments.length<1||
    openingRequest.ledger_debits.length<1||
    openingRequest.dispositions.length<1
  ) fail("BOUNDED_CANARY_OPENING_REQUEST_V1_MISMATCH");

  const settlementSet=verifyWcVoidOpeningLedgerSettlementsV1(
    CURRENT_LAUNCH,
    openingRequest.commitments,
    openingRequest.ledger_debits,
  );
  if(
    settlementSet.settlement_count!==ledger.expected_settlement_count||
    settlementSet.total_settled_wc_units!==ledger.total_settled_wc_units||
    settlementSet.settlement_set_root!==ledger.settlement_set_root
  ) fail("BOUNDED_CANARY_LEDGER_OPENING_CROSSLINK_MISMATCH");

  const binding=deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id:CURRENT_LAUNCH,
    commitments:openingRequest.commitments,
    ledger_debits:openingRequest.ledger_debits,
    mode:"finalize",
    dispositions:openingRequest.dispositions,
  });
  const expectedClaimBytes=Buffer.from(canonicalJson(binding)+"\n","utf8");
  exactBytesEqual(
    claimSource.bytes,
    expectedClaimBytes,
    "BOUNDED_CANARY_OPENING_CLAIM_BYTES_MISMATCH",
  );
  if(
    binding.binding_id!==evidence.opening_claim_binding_id||
    "sha256:"+claimSource.sha256!==
      evidence.opening_claim_binding_persistence_evidence_id||
    binding.refunded_wc_units!=="0"||
    binding.opening_claim_transfer_or_refund_binding_source_ready!==true||
    binding.runtime_execution_ready!==false
  ) fail("BOUNDED_CANARY_OPENING_CLAIM_SEMANTIC_MISMATCH");

  const participantDispositions=binding.dispositions.filter(
    (row)=>row.void_recipient===participant.participant_address,
  );
  if(participantDispositions.length!==1){
    fail("BOUNDED_CANARY_PARTICIPANT_DISPOSITION_MATCH_INVALID");
  }
  const participantDisposition=participantDispositions[0];
  const participantSettlement=settlementSet.settlements.find(
    (row)=>row.commitment_id===participantDisposition.commitment_id,
  );
  if(
    !participantSettlement||
    participantSettlement.settlement_id!==participantDisposition.settlement_id||
    participantSettlement.amount_wc!==evidence.settled_wc_units||
    participantDisposition.void_atoms!==evidence.delivered_void_atoms
  ) fail("BOUNDED_CANARY_PARTICIPANT_SETTLEMENT_MATCH_INVALID");

  const before=initialWcVoidOpeningReplayStateV1(CURRENT_LAUNCH);
  const transition=deriveWcVoidOpeningReplayTransitionV1({
    before_state:before,
    coupled_launch_id:CURRENT_LAUNCH,
    commitments:openingRequest.commitments,
    ledger_debits:openingRequest.ledger_debits,
    mode:"finalize",
    dispositions:openingRequest.dispositions,
  });
  if(
    transition.duplicate_replay_protection_source_ready!==true||
    transition.after_revision!==1||
    transition.binding_id!==binding.binding_id
  ) fail("BOUNDED_CANARY_REPLAY_TRANSITION_INVALID");
  const capsule=replayCapsuleFor(transition,"finalize");
  const expectedReplayBytes=Buffer.from(canonicalJson(capsule)+"\n","utf8");
  exactBytesEqual(
    replaySource.bytes,
    expectedReplayBytes,
    "BOUNDED_CANARY_REPLAY_CAPSULE_BYTES_MISMATCH",
  );
  if(
    typeof capsule.capsule_id!=="string"||
    !REPLAY_ID.test(capsule.capsule_id)||
    capsule.capsule_id!==evidence.replay_capsule_id||
    replaySource.sha256!==evidence.replay_terminal_capsule_sha256
  ) fail("BOUNDED_CANARY_REPLAY_EVIDENCE_MISMATCH");

  const vaultConfirmations=uint(
    vaultSource.value.observed_confirmation_count,
    "BOUNDED_CANARY_VAULT_CONFIRMATIONS_INVALID",
    {positive:true},
  );
  const participantDeliveryConfirmations=uint(
    participant.current_delivery_confirmation_count,
    "BOUNDED_CANARY_PARTICIPANT_DELIVERY_CONFIRMATIONS_INVALID",
    {positive:true},
  );
  const participantControlConfirmations=uint(
    participant.current_control_confirmation_count,
    "BOUNDED_CANARY_PARTICIPANT_CONTROL_CONFIRMATIONS_INVALID",
    {positive:true},
  );
  const minimumFinality=[
    vaultConfirmations,
    participantDeliveryConfirmations,
    participantControlConfirmations,
  ].reduce((a,b)=>a<b?a:b);
  if(
    uint(
      evidence.observed_finality_confirmations,
      "BOUNDED_CANARY_DECLARED_FINALITY_INVALID",
      {positive:true},
    )!==minimumFinality
  ) fail("BOUNDED_CANARY_FINALITY_COMPOSITION_MISMATCH");

  const observedAt=maxUtc(
    vault.collection_completed_at_utc,
    participant.collection_completed_at_utc,
  );
  const validUntil=minUtc(
    vault.valid_until_utc,
    participant.valid_until_utc,
  );
  if(
    canonicalUtc(validUntil,"BOUNDED_CANARY_COMPOSED_VALID_UNTIL_INVALID")<=
      canonicalUtc(observedAt,"BOUNDED_CANARY_COMPOSED_OBSERVED_AT_INVALID")||
    evidence.observed_at_utc!==observedAt||
    evidence.valid_until_utc!==validUntil||
    evaluationMs<
      canonicalUtc(observedAt,"BOUNDED_CANARY_COMPOSED_OBSERVED_AT_INVALID")||
    evaluationMs>
      canonicalUtc(validUntil,"BOUNDED_CANARY_COMPOSED_VALID_UNTIL_INVALID")
  ) fail("BOUNDED_CANARY_FRESHNESS_COMPOSITION_MISMATCH");

  if(
    canary.market_activation_authorized!==false||
    canary.public_presale_activation_authorized!==false||
    canary.funds_movement_authorized!==false||
    vault.market_activation_authorized!==false||
    vault.public_presale_activation_authorized!==false||
    vault.funds_movement_authorized!==false||
    participant.market_activation_authorized!==false||
    participant.public_presale_activation_authorized!==false||
    participant.funds_movement_authorized!==false
  ) fail("BOUNDED_CANARY_UPSTREAM_AUTHORITY_INVALID");

  const material=Object.freeze({
    marker:VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1,
    version:1,
    status:"BOUNDED_CANARY_SEMANTICALLY_VERIFIED_PROMOTION_READY",
    chain_id:2050,
    execution_epoch:2,
    pair:"WC_VOID",
    coupled_launch_id:CURRENT_LAUNCH,
    reviewed_policy_id:request.reviewed_policy_id,
    canary_evidence_id:canary.evidence_id,
    evaluation_time_utc:request.evaluation_time_utc,
    observed_at_utc:observedAt,
    valid_until_utc:validUntil,
    participant_count:"1",
    settled_wc_units:evidence.settled_wc_units,
    delivered_void_atoms:evidence.delivered_void_atoms,
    observed_finality_confirmations:minimumFinality.toString(),
    market_vault_address:evidence.market_vault_address,
    market_vault_runtime_code_sha256:evidence.market_vault_runtime_code_sha256,
    market_vault_runtime_verification_evidence_id:
      evidence.market_vault_runtime_verification_evidence_id,
    inventory_lock_evidence_id:evidence.inventory_lock_evidence_id,
    wc_ledger_custody_evidence_id:evidence.wc_ledger_custody_evidence_id,
    opening_claim_binding_id:evidence.opening_claim_binding_id,
    opening_claim_binding_persistence_evidence_id:
      evidence.opening_claim_binding_persistence_evidence_id,
    replay_capsule_id:evidence.replay_capsule_id,
    replay_terminal_capsule_sha256:evidence.replay_terminal_capsule_sha256,
    participant_control_evidence_id:evidence.participant_control_evidence_id,
    bounded_canary_input_file_sha256:canarySource.sha256,
    market_vault_at_use_file_sha256:vaultSource.sha256,
    ledger_persistence_import_input_file_sha256:ledgerSource.sha256,
    opening_request_file_sha256:openingRequestSource.sha256,
    opening_claim_binding_file_sha256:claimSource.sha256,
    opening_replay_capsule_file_sha256:replaySource.sha256,
    participant_at_use_file_sha256:participantSource.sha256,
    upstream_evidence_semantically_verified:true,
    live_canary_evidence_verified:true,
    bounded_canary_green:true,
    production_candidate_binding_allowed:true,
    production_candidate_updated:false,
    coupled_candidate_updated:false,
    candidate_promotion_required:true,
    coupled_activation_ready:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:verifyAuthority(),
  });
  const digest=sha256Text(canonicalJson(material));
  return Object.freeze({
    ...material,
    semantic_evidence_id:"sha256:"+digest,
    promotion_id:"voidwcbcsp1_"+digest,
  });
}
