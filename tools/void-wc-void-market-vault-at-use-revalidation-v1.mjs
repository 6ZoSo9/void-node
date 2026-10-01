#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  EXPECTED as COMPILED_IDENTITY_EXPECTED,
} from "./void-wc-void-market-vault-compiled-identity-acceptance-v1.mjs";
import {
  attestWcVoidMarketVaultRuntimeV1,
  reconstructWcVoidMarketVaultRuntimeV1,
} from "./void-wc-void-market-vault-runtime-attestation-v1.mjs";
import {
  importWcVoidMarketVaultRuntimeAttestationV1,
} from "./void-wc-void-market-vault-runtime-attestation-import-v1.mjs";

export const VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1 =
  "VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1";

export const VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_OPENING_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
export const VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1 =
  "0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

export const VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1 = 600;
export const VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_COLLECTION_SECONDS_V1 = 30;
export const VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_FUTURE_SKEW_SECONDS_V1 = 30;

export const VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1 =
  Object.freeze({
    read_only_rpc_collection: true,
    injected_transport_required: true,
    collector_wall_clock_read: true,
    chain_head_timestamp_bound: true,
    source_only_reverification: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    inventory_movement: false,
    market_activation: false,
    public_presale_activation: false,
    candidate_mutation: false,
    funds_movement: false,
  });

const COLLECT_KEYS = Object.freeze([
  "compiled_identity_acceptance",
  "deployment",
  "min_confirmations",
  "transport",
]);
const VERIFY_KEYS = Object.freeze([
  "artifact",
  "evaluation_time_utc",
]);
const EXPECTED_KEYS = Object.freeze([
  "market_vault_address",
  "deployment_transaction_hash",
  "deployment_deployer",
  "launch_controller",
  "settlement_executor",
  "closeout_controller",
  "coupled_launch_id",
  "minimum_observed_head_block_number",
  "minimum_confirmation_count",
]);
const ARTIFACT_KEYS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "execution_epoch",
  "pair",
  "opening_domain_coupled_launch_id",
  "vault_coupled_launch_id",
  "compiled_identity_id",
  "compiled_identity_acceptance",
  "market_vault_address",
  "market_vault_runtime_code_sha256",
  "deployment_transaction_hash",
  "deployment_block_number",
  "observed_head_block_number",
  "observed_head_block_hash",
  "observed_confirmation_count",
  "head_block_timestamp_utc",
  "collection_started_at_utc",
  "collection_completed_at_utc",
  "collection_duration_ms",
  "max_evidence_age_seconds",
  "valid_until_utc",
  "expected_binding",
  "runtime_attestation",
  "runtime_attestation_evidence_id",
  "runtime_attestation_import_id",
  "runtime_attestation_binding_id",
  "market_vault_independently_verified",
  "inventory_funded",
  "inventory_lock_proven",
  "preactivation_state_verified",
  "fresh_at_collection",
  "production_candidate_updated",
  "market_activation_authorized",
  "public_presale_activation_authorized",
  "funds_movement_authorized",
  "authority",
  "at_use_evidence_sha256",
  "market_vault_runtime_verification_evidence_id",
  "inventory_lock_evidence_id",
  "revalidation_id",
]);

const HASH = /^0x[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const AT_USE_ID = /^voidwcmvau1_[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}

function exactObject(value,keys,code) {
  if(!plain(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const actual=Reflect.ownKeys(descriptors);
  if(actual.some((key)=>typeof key!=="string")) fail(code);
  const sorted=[...actual].sort();
  const expected=[...keys].sort();
  if(
    sorted.length!==expected.length||
    sorted.some((key,index)=>key!==expected[index])
  ) {
    fail(code);
  }
  const out=Object.create(null);
  for(const key of keys) {
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.hasOwn(descriptor,"value")
    ) {
      fail(code);
    }
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function dataField(value,key,code) {
  if(!plain(value)) fail(code);
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,"value")) fail(code);
  return descriptor.value;
}

function compareText(left,right) {
  return left<right?-1:left>right?1:0;
}

function canonicalJson(value) {
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) {
    return "["+value.map(canonicalJson).join(",")+"]";
  }
  if(plain(value)) {
    return "{"+Object.keys(value).sort(compareText).map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("AT_USE_CANONICAL_VALUE_INVALID");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function uint(value,code,{positive=false}={}) {
  if(
    typeof value!=="string"||
    value.length>78||
    !UINT.test(value)
  ) {
    fail(code);
  }
  const parsed=BigInt(value);
  if(positive&&parsed<=0n) fail(code);
  return parsed;
}

function hexQuantity(value,code) {
  if(typeof value!=="string"||!/^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(value)) {
    fail(code);
  }
  return BigInt(value);
}

function canonicalUtc(value,code) {
  if(
    typeof value!=="string"||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)
  ) {
    fail(code);
  }
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value.replace("Z",".000Z")) {
    fail(code);
  }
  return BigInt(ms);
}

function utcFromSeconds(seconds,code) {
  if(
    typeof seconds!=="bigint"||
    seconds<0n||
    seconds>BigInt(Math.floor(Number.MAX_SAFE_INTEGER/1000))
  ) {
    fail(code);
  }
  return new Date(Number(seconds*1000n)).toISOString().replace(".000Z","Z");
}

function utcFromMs(ms,code) {
  if(!Number.isSafeInteger(ms)||ms<0) fail(code);
  return new Date(Math.floor(ms/1000)*1000).toISOString().replace(".000Z","Z");
}

function normalizeHash(value,code) {
  if(typeof value!=="string") fail(code);
  const out=value.toLowerCase();
  if(!HASH.test(out)) fail(code);
  return out;
}

function normalizeAddress(value,code) {
  if(typeof value!=="string") fail(code);
  const out=value.toLowerCase();
  if(!ADDRESS.test(out)||out==="0x0000000000000000000000000000000000000000") {
    fail(code);
  }
  return out;
}

function materialFromArtifact(artifact) {
  const out=Object.create(null);
  for(const key of ARTIFACT_KEYS) {
    if([
      "at_use_evidence_sha256",
      "market_vault_runtime_verification_evidence_id",
      "inventory_lock_evidence_id",
      "revalidation_id",
    ].includes(key)) continue;
    out[key]=artifact[key];
  }
  return out;
}

function digestMaterial(material) {
  return sha256Text(canonicalJson(material));
}

function expectedBindingFromAttestation(attestation,minConfirmations) {
  return Object.freeze({
    market_vault_address:attestation.market_vault_address,
    deployment_transaction_hash:attestation.deployment_transaction_hash,
    deployment_deployer:attestation.deployment_deployer,
    launch_controller:attestation.launch_controller,
    settlement_executor:attestation.settlement_executor,
    closeout_controller:attestation.closeout_controller,
    coupled_launch_id:attestation.coupled_launch_id,
    minimum_observed_head_block_number:attestation.observed_head_block_number,
    minimum_confirmation_count:minConfirmations,
  });
}

function requireCurrentLaunch(attestation) {
  if(
    attestation.coupled_launch_id!==
      VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1
  ) {
    fail("AT_USE_COUPLED_LAUNCH_ID_MISMATCH");
  }
}

function reconstructAndVerifyRuntime(artifact) {
  const attestation=artifact.runtime_attestation;
  const expected=artifact.expected_binding;
  const deployment=Object.freeze({
    market_vault_address:expected.market_vault_address,
    deployment_transaction_hash:expected.deployment_transaction_hash,
    deployment_deployer:expected.deployment_deployer,
    void_token:attestation.void_token,
    launch_controller:expected.launch_controller,
    settlement_executor:expected.settlement_executor,
    closeout_controller:expected.closeout_controller,
    coupled_launch_id:expected.coupled_launch_id,
  });
  const reconstructed=reconstructWcVoidMarketVaultRuntimeV1(
    artifact.compiled_identity_acceptance,
    deployment,
  );
  if(
    reconstructed.runtime_bytes!==attestation.runtime_code_bytes||
    reconstructed.runtime_sha256!==attestation.runtime_code_sha256||
    reconstructed.runtime_keccak256!==attestation.runtime_code_keccak256||
    reconstructed.runtime_sha256!==artifact.market_vault_runtime_code_sha256
  ) {
    fail("AT_USE_DEPLOYED_RUNTIME_RECONSTRUCTION_MISMATCH");
  }
  return reconstructed;
}

function semanticImport(attestation,expected) {
  const imported=importWcVoidMarketVaultRuntimeAttestationV1({
    expected,
    evidence:attestation,
  });
  if(
    imported?.ok!==true||
    imported?.status!=="VERIFIED_RUNTIME_ATTESTATION_IMPORT"||
    imported?.chain_id!==2050||
    imported?.execution_epoch!==2||
    imported?.coupled_launch_id!==
      VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1||
    imported?.market_vault_compiled_identity_id!==
      COMPILED_IDENTITY_EXPECTED.identity_id||
    imported?.candidate_fields?.market_vault_independently_verified!==true||
    imported?.candidate_fields?.inventory_funded!==true||
    imported?.candidate_fields?.inventory_lock_proven!==true||
    imported?.production_candidate_binding_ready!==false||
    imported?.freshness_revalidation_required!==true||
    imported?.market_activation_authorized!==false||
    imported?.public_presale_activation_authorized!==false||
    imported?.funds_movement_authorized!==false
  ) {
    fail("AT_USE_RUNTIME_ATTESTATION_SEMANTIC_IMPORT_INVALID");
  }
  return imported;
}

function blockTimingSnapshot(raw) {
  const number=dataField(raw,"number","AT_USE_BLOCK_NUMBER_MISSING");
  const hash=dataField(raw,"hash","AT_USE_BLOCK_HASH_MISSING");
  const timestamp=dataField(raw,"timestamp","AT_USE_BLOCK_TIMESTAMP_MISSING");
  return Object.freeze({
    number:hexQuantity(String(number).toLowerCase(),"AT_USE_BLOCK_NUMBER_INVALID"),
    hash:normalizeHash(hash,"AT_USE_BLOCK_HASH_INVALID"),
    timestamp:hexQuantity(
      String(timestamp).toLowerCase(),
      "AT_USE_BLOCK_TIMESTAMP_INVALID",
    ),
  });
}

function verifyAuthority(authority) {
  exactObject(
    authority,
    Object.keys(VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1),
    "AT_USE_AUTHORITY_SHAPE_INVALID",
  );
  if(
    canonicalJson(authority)!==
      canonicalJson(VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1)
  ) {
    fail("AT_USE_AUTHORITY_MISMATCH");
  }
}

export async function collectWcVoidMarketVaultAtUseRevalidationV1(input) {
  const request=exactObject(
    input,
    COLLECT_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_AT_USE_COLLECTION_INPUT_SHAPE",
  );
  if(typeof request.transport!=="function") {
    fail("AT_USE_INJECTED_TRANSPORT_REQUIRED");
  }
  const minimum=uint(
    String(request.min_confirmations),
    "AT_USE_MIN_CONFIRMATIONS_INVALID",
    {positive:true},
  );
  if(minimum>1000n) fail("AT_USE_MIN_CONFIRMATIONS_TOO_LARGE");

  const blockTimings=[];
  const wrappedTransport=async (rpcRequest)=>{
    const raw=await request.transport(rpcRequest);
    if(rpcRequest?.method==="eth_getBlockByNumber"&&raw!==null) {
      blockTimings.push(blockTimingSnapshot(raw));
    }
    return raw;
  };

  const startedMs=Date.now();
  const attestation=await attestWcVoidMarketVaultRuntimeV1({
    compiled_identity_acceptance:request.compiled_identity_acceptance,
    deployment:request.deployment,
    min_confirmations:minimum.toString(),
    transport:wrappedTransport,
  });
  const completedMs=Date.now();

  if(
    completedMs<startedMs||
    completedMs-startedMs>
      VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_COLLECTION_SECONDS_V1*1000
  ) {
    fail("AT_USE_COLLECTION_DURATION_INVALID");
  }

  requireCurrentLaunch(attestation);

  const headNumber=uint(
    attestation.observed_head_block_number,
    "AT_USE_ATTESTED_HEAD_NUMBER_INVALID",
    {positive:true},
  );
  const headHash=normalizeHash(
    attestation.observed_head_block_hash,
    "AT_USE_ATTESTED_HEAD_HASH_INVALID",
  );
  const matchingHead=blockTimings.filter(
    (row)=>row.number===headNumber&&row.hash===headHash,
  );
  if(matchingHead.length<2) {
    fail("AT_USE_HEAD_TIMESTAMP_BINDING_MISSING");
  }
  const headTimestamp=matchingHead[0].timestamp;
  if(matchingHead.some((row)=>row.timestamp!==headTimestamp)) {
    fail("AT_USE_HEAD_TIMESTAMP_CHANGED_DURING_COLLECTION");
  }

  const completedSeconds=BigInt(Math.floor(completedMs/1000));
  const maxAge=BigInt(
    VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1,
  );
  const futureSkew=BigInt(
    VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_FUTURE_SKEW_SECONDS_V1,
  );
  if(headTimestamp>completedSeconds+futureSkew) {
    fail("AT_USE_HEAD_TIMESTAMP_TOO_FAR_IN_FUTURE");
  }
  if(completedSeconds>headTimestamp+maxAge) {
    fail("AT_USE_HEAD_TIMESTAMP_STALE_AT_COLLECTION");
  }

  const expected=expectedBindingFromAttestation(
    attestation,
    minimum.toString(),
  );
  const imported=semanticImport(attestation,expected);

  const validUntil=headTimestamp+maxAge;
  const material=Object.freeze({
    marker:VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1,
    version:1,
    status:"MARKET_VAULT_PREACTIVATION_AT_USE_REVALIDATED_FRESH",
    chain_id:2050,
    execution_epoch:2,
    pair:"WC_VOID",
    opening_domain_coupled_launch_id:
      VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_OPENING_ID_V1,
    vault_coupled_launch_id:
      VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1,
    compiled_identity_id:COMPILED_IDENTITY_EXPECTED.identity_id,
    compiled_identity_acceptance:request.compiled_identity_acceptance,
    market_vault_address:attestation.market_vault_address,
    market_vault_runtime_code_sha256:attestation.runtime_code_sha256,
    deployment_transaction_hash:attestation.deployment_transaction_hash,
    deployment_block_number:attestation.deployment_block_number,
    observed_head_block_number:attestation.observed_head_block_number,
    observed_head_block_hash:attestation.observed_head_block_hash,
    observed_confirmation_count:attestation.observed_confirmation_count,
    head_block_timestamp_utc:
      utcFromSeconds(headTimestamp,"AT_USE_HEAD_TIMESTAMP_RANGE_INVALID"),
    collection_started_at_utc:
      utcFromMs(startedMs,"AT_USE_COLLECTION_START_INVALID"),
    collection_completed_at_utc:
      utcFromMs(completedMs,"AT_USE_COLLECTION_COMPLETION_INVALID"),
    collection_duration_ms:String(completedMs-startedMs),
    max_evidence_age_seconds:String(
      VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1,
    ),
    valid_until_utc:
      utcFromSeconds(validUntil,"AT_USE_VALID_UNTIL_RANGE_INVALID"),
    expected_binding:expected,
    runtime_attestation:attestation,
    runtime_attestation_evidence_id:attestation.evidence_id,
    runtime_attestation_import_id:imported.import_id,
    runtime_attestation_binding_id:imported.binding_id,
    market_vault_independently_verified:true,
    inventory_funded:true,
    inventory_lock_proven:true,
    preactivation_state_verified:true,
    fresh_at_collection:true,
    production_candidate_updated:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:
      VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1,
  });

  const digest=digestMaterial(material);
  const shaId="sha256:"+digest;
  return Object.freeze({
    ...material,
    at_use_evidence_sha256:shaId,
    market_vault_runtime_verification_evidence_id:shaId,
    inventory_lock_evidence_id:shaId,
    revalidation_id:"voidwcmvau1_"+digest,
  });
}

export function verifyWcVoidMarketVaultAtUseRevalidationV1(input) {
  const request=exactObject(
    input,
    VERIFY_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_AT_USE_VERIFY_INPUT_SHAPE",
  );
  const artifact=exactObject(
    request.artifact,
    ARTIFACT_KEYS,
    "INVALID_WC_VOID_MARKET_VAULT_AT_USE_ARTIFACT_SHAPE",
  );
  if(
    artifact.marker!==VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1||
    artifact.version!==1||
    artifact.status!=="MARKET_VAULT_PREACTIVATION_AT_USE_REVALIDATED_FRESH"||
    artifact.chain_id!==2050||
    artifact.execution_epoch!==2||
    artifact.pair!=="WC_VOID"||
    artifact.opening_domain_coupled_launch_id!==
      VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_OPENING_ID_V1||
    artifact.vault_coupled_launch_id!==
      VOID_WC_VOID_CURRENT_COUPLED_LAUNCH_VAULT_ID_V1||
    artifact.compiled_identity_id!==COMPILED_IDENTITY_EXPECTED.identity_id
  ) {
    fail("AT_USE_ARTIFACT_IDENTITY_MISMATCH");
  }

  if(
    typeof artifact.market_vault_runtime_code_sha256!=="string"||
    !SHA256_HEX.test(artifact.market_vault_runtime_code_sha256)||
    normalizeAddress(
      artifact.market_vault_address,
      "AT_USE_ARTIFACT_VAULT_INVALID",
    )!==artifact.market_vault_address||
    normalizeHash(
      artifact.deployment_transaction_hash,
      "AT_USE_ARTIFACT_DEPLOYMENT_HASH_INVALID",
    )!==artifact.deployment_transaction_hash
  ) {
    fail("AT_USE_ARTIFACT_DEPLOYMENT_BINDING_INVALID");
  }

  exactObject(
    artifact.expected_binding,
    EXPECTED_KEYS,
    "AT_USE_EXPECTED_BINDING_SHAPE_INVALID",
  );
  reconstructAndVerifyRuntime(artifact);
  requireCurrentLaunch(artifact.runtime_attestation);
  const imported=semanticImport(
    artifact.runtime_attestation,
    artifact.expected_binding,
  );
  if(
    artifact.runtime_attestation_evidence_id!==
      artifact.runtime_attestation.evidence_id||
    artifact.runtime_attestation_import_id!==imported.import_id||
    artifact.runtime_attestation_binding_id!==imported.binding_id||
    artifact.market_vault_address!==imported.market_vault_address||
    artifact.market_vault_runtime_code_sha256!==
      imported.market_vault_runtime_code_sha256||
    artifact.deployment_transaction_hash!==
      imported.deployment_transaction_hash||
    artifact.deployment_block_number!==imported.deployment_block_number||
    artifact.observed_head_block_number!==imported.observed_head_block_number||
    artifact.observed_head_block_hash!==imported.observed_head_block_hash||
    artifact.observed_confirmation_count!==imported.observed_confirmation_count
  ) {
    fail("AT_USE_ARTIFACT_SEMANTIC_BINDING_MISMATCH");
  }

  const started=canonicalUtc(
    artifact.collection_started_at_utc,
    "AT_USE_COLLECTION_START_UTC_INVALID",
  );
  const completed=canonicalUtc(
    artifact.collection_completed_at_utc,
    "AT_USE_COLLECTION_COMPLETION_UTC_INVALID",
  );
  const headTimestamp=canonicalUtc(
    artifact.head_block_timestamp_utc,
    "AT_USE_HEAD_TIMESTAMP_UTC_INVALID",
  );
  const validUntil=canonicalUtc(
    artifact.valid_until_utc,
    "AT_USE_VALID_UNTIL_UTC_INVALID",
  );
  const duration=uint(
    artifact.collection_duration_ms,
    "AT_USE_COLLECTION_DURATION_MS_INVALID",
  );
  const maxAge=uint(
    artifact.max_evidence_age_seconds,
    "AT_USE_MAX_AGE_INVALID",
    {positive:true},
  );
  if(
    maxAge!==BigInt(VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_AGE_SECONDS_V1)||
    completed<started||
    completed-started>
      BigInt(VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_COLLECTION_SECONDS_V1*1000)||
    duration>
      BigInt(VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_COLLECTION_SECONDS_V1*1000)||
    duration+999n<completed-started||
    duration>completed-started+999n||
    validUntil!==headTimestamp+maxAge*1000n||
    completed>validUntil||
    headTimestamp>
      completed+
        BigInt(VOID_WC_VOID_MARKET_VAULT_AT_USE_MAX_FUTURE_SKEW_SECONDS_V1*1000)
  ) {
    fail("AT_USE_ARTIFACT_FRESHNESS_BINDING_INVALID");
  }

  for(const key of [
    "market_vault_independently_verified",
    "inventory_funded",
    "inventory_lock_proven",
    "preactivation_state_verified",
    "fresh_at_collection",
  ]) {
    if(artifact[key]!==true) fail("AT_USE_REQUIRED_VERIFICATION_MISSING");
  }
  for(const key of [
    "production_candidate_updated",
    "market_activation_authorized",
    "public_presale_activation_authorized",
    "funds_movement_authorized",
  ]) {
    if(artifact[key]!==false) fail("AT_USE_AUTHORITY_MUST_REMAIN_FALSE");
  }
  verifyAuthority(artifact.authority);

  const digest=digestMaterial(materialFromArtifact(artifact));
  const shaId="sha256:"+digest;
  if(
    typeof artifact.at_use_evidence_sha256!=="string"||
    !SHA256_ID.test(artifact.at_use_evidence_sha256)||
    artifact.at_use_evidence_sha256!==shaId||
    artifact.market_vault_runtime_verification_evidence_id!==shaId||
    artifact.inventory_lock_evidence_id!==shaId||
    typeof artifact.revalidation_id!=="string"||
    !AT_USE_ID.test(artifact.revalidation_id)||
    artifact.revalidation_id!=="voidwcmvau1_"+digest
  ) {
    fail("AT_USE_ARTIFACT_CONTENT_ID_MISMATCH");
  }

  const evaluation=canonicalUtc(
    request.evaluation_time_utc,
    "AT_USE_EVALUATION_TIME_INVALID",
  );
  if(evaluation<completed||evaluation>validUntil) {
    fail("AT_USE_EVIDENCE_NOT_CURRENT");
  }

  return Object.freeze({
    ok:true,
    status:"MARKET_VAULT_AT_USE_EVIDENCE_VERIFIED_CURRENT",
    marker:VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1,
    revalidation_id:artifact.revalidation_id,
    at_use_evidence_sha256:artifact.at_use_evidence_sha256,
    market_vault_runtime_verification_evidence_id:
      artifact.market_vault_runtime_verification_evidence_id,
    inventory_lock_evidence_id:artifact.inventory_lock_evidence_id,
    opening_domain_coupled_launch_id:
      artifact.opening_domain_coupled_launch_id,
    vault_coupled_launch_id:artifact.vault_coupled_launch_id,
    market_vault_address:artifact.market_vault_address,
    market_vault_runtime_code_sha256:
      artifact.market_vault_runtime_code_sha256,
    observed_head_block_number:artifact.observed_head_block_number,
    observed_head_block_hash:artifact.observed_head_block_hash,
    head_block_timestamp_utc:artifact.head_block_timestamp_utc,
    collection_completed_at_utc:artifact.collection_completed_at_utc,
    valid_until_utc:artifact.valid_until_utc,
    market_vault_independently_verified:true,
    inventory_funded:true,
    inventory_lock_proven:true,
    preactivation_state_verified:true,
    evidence_current_at_evaluation:true,
    production_candidate_binding_allowed:false,
    market_activation_authorized:false,
    public_presale_activation_authorized:false,
    funds_movement_authorized:false,
    authority:
      VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_AUTHORITY_V1,
  });
}
