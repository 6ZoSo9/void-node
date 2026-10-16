#!/usr/bin/env node
import crypto from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1,
  verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1,
} from "./void-economic-system-sponsored-observation-time-v1.mjs";
import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1,
} from "./void-economic-system-sponsored-observation-time-store-v1.mjs";
import {
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_ID_PREFIX_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SCHEMA_V1,
  VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1,
} from "./void-economic-sponsored-host-trusted-clock-binding-v1.mjs";
import {
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_ID_PREFIX_V1,
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_SCHEMA_V1,
  VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1,
} from "./void-economic-sponsored-host-observation-time-store-binding-v1.mjs";

export const VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_V1 =
  "VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_V1";
export const VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_SCHEMA_V1 =
  "void_economic_sponsored_observation_restart_bridge_v1";
export const VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_ID_PREFIX_V1 =
  "voidesorb1_";

export const VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    exact_prior_durable_receipt_required: true,
    exact_prior_composition_receipt_required: true,
    exact_prior_host_binding_required: true,
    exact_current_host_binding_required: true,
    exact_store_head_inspection_required: true,
    same_boot_only: true,
    changed_process_generation_required: true,
    boot_relative_time_forward_required: true,
    wall_time_non_regression_required: true,
    cumulative_wall_monotonic_skew_bounded: true,
    caller_supplied_evidence_only: true,
    evidence_origin_custody_proven: false,
    live_store_inspection_origin_proven: false,
    production_cross_process_continuity_may_be_proven: false,
    cross_boot_restart_continuity_proven: false,
    durable_time_store_mutation: false,
    trusted_clock_runtime_authority: false,
    receipt_store_rollback_resistance_proven: false,
    runtime_route_active: false,
    runtime_enforcement_verified: false,
    replay_consume_performed: false,
    gas_sponsorship_performed: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const HOST_BINDING_ID=/^voideshtcb1_[0-9a-f]{64}$/u;
const HOST_EVIDENCE_ID=/^voideshtse1_[0-9a-f]{64}$/u;
const COMPOSITION_ID=/^voideshotsb1_[0-9a-f]{64}$/u;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const DECIMAL=/^(?:0|[1-9][0-9]*)$/u;
const NS_PER_MS=1_000_000n;
const MAX_HOST_CAPTURE_SPAN_NS=2_000_000_000n;

const SAMPLE_KEYS=Object.freeze([
  "boot_id","process_start_ticks","wall_time_ms","monotonic_ns",
]);
const HOST_BINDING_KEYS=Object.freeze([
  "marker","schema","version","host_time_sync_evidence_id","boot_id",
  "process_pid","process_start_ticks","wall_time_ms","boot_uptime_before_ns",
  "boot_uptime_after_ns","boot_uptime_midpoint_ns","midpoint_uncertainty_ns",
  "process_stat_source","production_fixed_sources_observed",
  "test_only_injected_dependencies","observation_sample",
  "trusted_clock_runtime_authority","cross_process_restart_continuity_proven",
  "cross_boot_restart_continuity_proven","durable_time_store_mutation",
  "runtime_execution_authorized","gas_sponsorship_performed",
  "transaction_submission","authoritative_chain2050_write",
  "public_presale_activation","funds_movement","binding_id","authority",
]);
const COMPOSITION_BODY_KEYS=Object.freeze([
  "marker","schema","version","operation","host_trusted_clock_binding_id",
  "host_time_sync_evidence_id","store_marker","durable_head_receipt_sha256",
  "generation","durable_receipt_count","accepted_observed_at_ms",
  "production_fixed_sources_observed","test_only_injected_dependencies",
  "host_binding_capture_count","store_clock_read_count","mutation_performed",
  "durable_time_authority_advanced","durable_result_bound_to_same_host_sample",
  "trusted_clock_source_proven","trusted_clock_host_binding_proven",
  "trusted_clock_runtime_authority","live_durable_receipt_storage_proven",
  "receipt_store_rollback_resistance_proven",
  "cross_process_restart_continuity_proven","cross_boot_restart_continuity_proven",
  "runtime_route_active","runtime_enforcement_verified","replay_consume_performed",
  "gas_sponsorship_performed","wallet_or_signer_access","private_key_access",
  "transaction_construction","transaction_signing","transaction_submission",
  "transaction_broadcast","authoritative_chain2050_write",
  "public_presale_activation","market_activation","funds_movement",
]);
const COMPOSITION_KEYS=Object.freeze([
  "ok","status",...COMPOSITION_BODY_KEYS,"composition_receipt_id","authority",
]);
const STORE_INSPECTION_KEYS=Object.freeze([
  "ok","status","marker","version","mutation_performed","durable_receipt_count",
  "head_receipt_sha256","head_generation","head_observed_at_ms",
  "durable_receipt_store_source_verified","live_durable_receipt_storage_proven",
  "trusted_clock_source_proven","trusted_clock_host_binding_proven",
  "receipt_store_rollback_resistance_proven",
  "cross_process_restart_continuity_proven","cross_boot_restart_continuity_proven",
  "runtime_enforcement_verified","gas_sponsorship_performed",
  "transaction_submission","transaction_broadcast","funds_movement","authority",
]);

function fail(reason){ throw new Error(reason); }
function compareText(a,b){ return a<b?-1:a>b?1:0; }

function exactSnapshot(value,keys,reason){
  if(
    value===null || typeof value!=="object" || utilTypes.isProxy(value) ||
    Array.isArray(value)
  ) fail(reason);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype && proto!==null) fail(reason);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const own=Reflect.ownKeys(descriptors);
  if(own.some((key)=>typeof key!=="string")) fail(reason);
  const actual=own.slice().sort(compareText);
  const expected=[...keys].sort(compareText);
  if(
    actual.length!==expected.length ||
    actual.some((key,index)=>key!==expected[index])
  ) fail(reason);
  const out=Object.create(null);
  for(const key of keys){
    const descriptor=descriptors[key];
    if(
      !descriptor || descriptor.enumerable!==true ||
      !Object.hasOwn(descriptor,"value")
    ) fail(reason);
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function canonicalJson(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number" && Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(value && typeof value==="object"){
    return "{"+Object.keys(value).sort(compareText)
      .map((key)=>JSON.stringify(key)+":"+canonicalJson(value[key])).join(",")+"}";
  }
  fail("sponsored_restart_bridge_noncanonical_value");
}
function sha256Hex(bytes){ return crypto.createHash("sha256").update(bytes).digest("hex"); }
function contentId(prefix,body){
  return prefix+sha256Hex(Buffer.from(canonicalJson(body),"utf8"));
}
function decimal(value,reason){
  if(typeof value!=="string" || !DECIMAL.test(value) || value.length>40) fail(reason);
  return BigInt(value);
}
function safeMs(value,reason){
  if(!Number.isSafeInteger(value) || value<=0) fail(reason);
  return value;
}

function exactAuthority(value,expected,reason){
  const keys=Object.keys(expected);
  const normalized=exactSnapshot(value,keys,reason);
  for(const key of keys){
    if(normalized[key]!==expected[key]) fail(reason);
  }
  return normalized;
}

function hostBindingBody(binding,sample){
  const body={};
  for(const key of HOST_BINDING_KEYS){
    if(key==="binding_id" || key==="authority") continue;
    body[key]=key==="observation_sample"?sample:binding[key];
  }
  return body;
}

function normalizeHostBinding(value,reason){
  const binding=exactSnapshot(value,HOST_BINDING_KEYS,reason);
  const sample=exactSnapshot(binding.observation_sample,SAMPLE_KEYS,reason);
  exactAuthority(
    binding.authority,
    VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_AUTHORITY_V1,
    reason,
  );
  if(
    binding.marker!==VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_V1 ||
    binding.schema!==VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_SCHEMA_V1 ||
    binding.version!==1 ||
    typeof binding.binding_id!=="string" || !HOST_BINDING_ID.test(binding.binding_id) ||
    binding.binding_id!==contentId(
      VOID_ECONOMIC_SPONSORED_HOST_TRUSTED_CLOCK_BINDING_ID_PREFIX_V1,
      hostBindingBody(binding,sample),
    ) ||
    typeof binding.host_time_sync_evidence_id!=="string" ||
    !HOST_EVIDENCE_ID.test(binding.host_time_sync_evidence_id) ||
    typeof binding.boot_id!=="string" || !UUID.test(binding.boot_id) ||
    !Number.isSafeInteger(binding.process_pid) || binding.process_pid<=1 ||
    binding.process_stat_source!=="/proc/self/stat" ||
    binding.trusted_clock_runtime_authority!==false ||
    binding.cross_process_restart_continuity_proven!==false ||
    binding.cross_boot_restart_continuity_proven!==false ||
    binding.durable_time_store_mutation!==false ||
    binding.runtime_execution_authorized!==false ||
    binding.gas_sponsorship_performed!==false ||
    binding.transaction_submission!==false ||
    binding.authoritative_chain2050_write!==false ||
    binding.public_presale_activation!==false ||
    binding.funds_movement!==false ||
    typeof binding.production_fixed_sources_observed!=="boolean" ||
    typeof binding.test_only_injected_dependencies!=="boolean"
  ) fail(reason);

  const before=decimal(binding.boot_uptime_before_ns,reason);
  const after=decimal(binding.boot_uptime_after_ns,reason);
  const midpoint=decimal(binding.boot_uptime_midpoint_ns,reason);
  const uncertainty=decimal(binding.midpoint_uncertainty_ns,reason);
  const processStart=decimal(binding.process_start_ticks,reason);
  if(
    processStart<=0n || after<before || after-before>MAX_HOST_CAPTURE_SPAN_NS ||
    midpoint!==before+(after-before)/2n ||
    uncertainty!==(after-before+1n)/2n
  ) fail(reason);
  if(
    sample.boot_id!==binding.boot_id ||
    sample.process_start_ticks!==binding.process_start_ticks ||
    sample.wall_time_ms!==binding.wall_time_ms ||
    sample.monotonic_ns!==binding.boot_uptime_midpoint_ns
  ) fail(reason);
  safeMs(binding.wall_time_ms,reason);
  decimal(sample.monotonic_ns,reason);

  const production=binding.production_fixed_sources_observed===true;
  if(
    binding.test_only_injected_dependencies!==!production
  ) fail(reason);
  return Object.freeze({binding,sample,production,processStart,midpoint});
}

function compositionBody(composition){
  const body={};
  for(const key of COMPOSITION_BODY_KEYS) body[key]=composition[key];
  return body;
}

function normalizeComposition(value){
  const composition=exactSnapshot(
    value,COMPOSITION_KEYS,"sponsored_restart_bridge_prior_composition_invalid",
  );
  const production=composition.production_fixed_sources_observed===true;
  exactAuthority(
    composition.authority,
    VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_AUTHORITY_V1,
    "sponsored_restart_bridge_prior_composition_invalid",
  );
  if(
    composition.ok!==true || composition.status!=="source_observed_bound" ||
    composition.marker!==VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_V1 ||
    composition.schema!==
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_SCHEMA_V1 ||
    composition.version!==1 || composition.operation!=="observe" ||
    composition.store_marker!==VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1 ||
    composition.test_only_injected_dependencies!==!production ||
    composition.host_binding_capture_count!==1 ||
    composition.store_clock_read_count!==1 ||
    composition.durable_time_authority_advanced!==true ||
    composition.durable_result_bound_to_same_host_sample!==true ||
    composition.trusted_clock_source_proven!==production ||
    composition.trusted_clock_host_binding_proven!==production ||
    composition.trusted_clock_runtime_authority!==false ||
    composition.live_durable_receipt_storage_proven!==false ||
    composition.receipt_store_rollback_resistance_proven!==false ||
    composition.cross_process_restart_continuity_proven!==false ||
    composition.cross_boot_restart_continuity_proven!==false ||
    composition.runtime_route_active!==false ||
    composition.runtime_enforcement_verified!==false ||
    composition.replay_consume_performed!==false ||
    composition.gas_sponsorship_performed!==false ||
    composition.wallet_or_signer_access!==false ||
    composition.private_key_access!==false ||
    composition.transaction_construction!==false ||
    composition.transaction_signing!==false ||
    composition.transaction_submission!==false ||
    composition.transaction_broadcast!==false ||
    composition.authoritative_chain2050_write!==false ||
    composition.public_presale_activation!==false ||
    composition.market_activation!==false ||
    composition.funds_movement!==false ||
    typeof composition.production_fixed_sources_observed!=="boolean" ||
    typeof composition.test_only_injected_dependencies!=="boolean" ||
    typeof composition.mutation_performed!=="boolean" ||
    typeof composition.host_trusted_clock_binding_id!=="string" ||
    !HOST_BINDING_ID.test(composition.host_trusted_clock_binding_id) ||
    typeof composition.host_time_sync_evidence_id!=="string" ||
    !HOST_EVIDENCE_ID.test(composition.host_time_sync_evidence_id) ||
    typeof composition.durable_head_receipt_sha256!=="string" ||
    !SHA256_ID.test(composition.durable_head_receipt_sha256) ||
    typeof composition.generation!=="string" || !DECIMAL.test(composition.generation) ||
    !Number.isSafeInteger(composition.durable_receipt_count) ||
    composition.durable_receipt_count<1 ||
    !Number.isSafeInteger(composition.accepted_observed_at_ms) ||
    composition.accepted_observed_at_ms<=0 ||
    typeof composition.composition_receipt_id!=="string" ||
    !COMPOSITION_ID.test(composition.composition_receipt_id) ||
    composition.composition_receipt_id!==contentId(
      VOID_ECONOMIC_SPONSORED_HOST_OBSERVATION_TIME_STORE_BINDING_ID_PREFIX_V1,
      compositionBody(composition),
    )
  ) fail("sponsored_restart_bridge_prior_composition_invalid");
  return Object.freeze({composition,production});
}

function normalizeStoreInspection(value){
  const inspected=exactSnapshot(
    value,STORE_INSPECTION_KEYS,"sponsored_restart_bridge_store_inspection_invalid",
  );
  exactAuthority(
    inspected.authority,
    VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_AUTHORITY_V1,
    "sponsored_restart_bridge_store_inspection_invalid",
  );
  if(
    inspected.ok!==true || inspected.status!=="source_inspected" ||
    inspected.marker!==VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_STORE_V1 ||
    inspected.version!==1 || inspected.mutation_performed!==false ||
    inspected.durable_receipt_store_source_verified!==true ||
    inspected.live_durable_receipt_storage_proven!==false ||
    inspected.trusted_clock_source_proven!==false ||
    inspected.trusted_clock_host_binding_proven!==false ||
    inspected.receipt_store_rollback_resistance_proven!==false ||
    inspected.cross_process_restart_continuity_proven!==false ||
    inspected.cross_boot_restart_continuity_proven!==false ||
    inspected.runtime_enforcement_verified!==false ||
    inspected.gas_sponsorship_performed!==false ||
    inspected.transaction_submission!==false ||
    inspected.transaction_broadcast!==false ||
    inspected.funds_movement!==false ||
    !Number.isSafeInteger(inspected.durable_receipt_count) ||
    inspected.durable_receipt_count<1 ||
    typeof inspected.head_receipt_sha256!=="string" ||
    !SHA256_ID.test(inspected.head_receipt_sha256) ||
    typeof inspected.head_generation!=="string" ||
    !DECIMAL.test(inspected.head_generation) ||
    !Number.isSafeInteger(inspected.head_observed_at_ms) ||
    inspected.head_observed_at_ms<=0
  ) fail("sponsored_restart_bridge_store_inspection_invalid");
  return inspected;
}

export function qualifyVoidEconomicSponsoredObservationRestartBridgeV1(input){
  const request=exactSnapshot(
    input,
    [
      "prior_durable_receipt",
      "prior_composition_receipt",
      "prior_host_binding",
      "current_host_binding",
      "store_inspection",
    ],
    "sponsored_restart_bridge_input_invalid",
  );

  let priorReceipt;
  try{
    priorReceipt=
      verifyVoidEconomicSystemSponsoredObservationTimeReceiptV1(
        request.prior_durable_receipt,
      );
  }catch{
    fail("sponsored_restart_bridge_prior_receipt_invalid");
  }
  const priorComposition=normalizeComposition(request.prior_composition_receipt);
  const priorHost=normalizeHostBinding(
    request.prior_host_binding,
    "sponsored_restart_bridge_prior_host_binding_invalid",
  );
  const currentHost=normalizeHostBinding(
    request.current_host_binding,
    "sponsored_restart_bridge_current_host_binding_invalid",
  );
  const store=normalizeStoreInspection(request.store_inspection);

  if(
    priorComposition.production!==priorHost.production ||
    priorHost.production!==currentHost.production
  ) fail("sponsored_restart_bridge_evidence_mode_mismatch");

  const composition=priorComposition.composition;
  if(
    composition.host_trusted_clock_binding_id!==priorHost.binding.binding_id ||
    composition.host_time_sync_evidence_id!==
      priorHost.binding.host_time_sync_evidence_id ||
    composition.durable_head_receipt_sha256!==priorReceipt.receipt_sha256 ||
    composition.generation!==priorReceipt.generation ||
    composition.accepted_observed_at_ms!==priorReceipt.observed_at_ms ||
    composition.durable_receipt_count!==store.durable_receipt_count ||
    store.head_receipt_sha256!==priorReceipt.receipt_sha256 ||
    store.head_generation!==priorReceipt.generation ||
    store.head_observed_at_ms!==priorReceipt.observed_at_ms
  ) fail("sponsored_restart_bridge_prior_head_binding_mismatch");

  const expectedCount=BigInt(priorReceipt.generation)+1n;
  if(
    expectedCount>BigInt(Number.MAX_SAFE_INTEGER) ||
    store.durable_receipt_count!==Number(expectedCount)
  ) fail("sponsored_restart_bridge_store_generation_count_mismatch");

  if(
    priorHost.sample.boot_id!==priorReceipt.boot_id ||
    priorHost.sample.process_start_ticks!==priorReceipt.process_start_ticks ||
    priorHost.sample.wall_time_ms!==priorReceipt.observed_at_ms ||
    priorHost.sample.monotonic_ns!==priorReceipt.monotonic_ns
  ) fail("sponsored_restart_bridge_prior_host_receipt_mismatch");

  if(currentHost.sample.boot_id!==priorReceipt.boot_id){
    fail("sponsored_restart_bridge_cross_boot_forbidden");
  }
  if(currentHost.processStart<=priorHost.processStart){
    fail("sponsored_restart_bridge_process_generation_not_newer");
  }
  const currentMono=BigInt(currentHost.sample.monotonic_ns);
  const priorMono=BigInt(priorReceipt.monotonic_ns);
  if(currentMono<=priorMono){
    fail("sponsored_restart_bridge_monotonic_not_forward");
  }
  if(currentHost.sample.wall_time_ms<priorReceipt.observed_at_ms){
    fail("sponsored_restart_bridge_wall_regressed");
  }

  const baselineMono=BigInt(priorReceipt.baseline_monotonic_ns);
  const monotonicElapsedMs=(currentMono-baselineMono)/NS_PER_MS;
  const wallElapsedMs=
    BigInt(currentHost.sample.wall_time_ms)-
    BigInt(priorReceipt.baseline_wall_time_ms);
  const skew=
    wallElapsedMs>=monotonicElapsedMs
      ? wallElapsedMs-monotonicElapsedMs
      : monotonicElapsedMs-wallElapsedMs;
  if(
    skew>
    BigInt(VOID_ECONOMIC_SYSTEM_SPONSORED_OBSERVATION_TIME_MAX_SKEW_MS_V1)
  ) fail("sponsored_restart_bridge_wall_monotonic_skew_exceeded");

  const production=priorComposition.production;
  const body=Object.freeze({
    marker:VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_V1,
    schema:VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_SCHEMA_V1,
    version:1,
    prior_composition_receipt_id:composition.composition_receipt_id,
    prior_durable_receipt_sha256:priorReceipt.receipt_sha256,
    prior_generation:priorReceipt.generation,
    prior_durable_receipt_count:store.durable_receipt_count,
    prior_host_binding_id:priorHost.binding.binding_id,
    current_host_binding_id:currentHost.binding.binding_id,
    current_host_time_sync_evidence_id:
      currentHost.binding.host_time_sync_evidence_id,
    boot_id:priorReceipt.boot_id,
    prior_process_start_ticks:priorReceipt.process_start_ticks,
    current_process_start_ticks:currentHost.sample.process_start_ticks,
    prior_observed_at_ms:priorReceipt.observed_at_ms,
    current_wall_time_ms:currentHost.sample.wall_time_ms,
    prior_monotonic_ns:priorReceipt.monotonic_ns,
    current_monotonic_ns:currentHost.sample.monotonic_ns,
    same_boot_verified:true,
    process_restart_verified:true,
    durable_prior_head_verified:true,
    boot_relative_time_forward_verified:true,
    wall_time_non_regression_verified:true,
    cumulative_wall_monotonic_skew_verified:true,
    input_evidence_production_mode:production,
    input_evidence_test_mode:!production,
    production_fixed_sources_observed:false,
    same_boot_restart_evidence_proven:true,
    evidence_origin_custody_proven:false,
    live_store_inspection_origin_proven:false,
    cross_process_restart_continuity_proven:false,
    cross_boot_restart_continuity_proven:false,
    durable_time_store_mutation:false,
    trusted_clock_runtime_authority:false,
    receipt_store_rollback_resistance_proven:false,
    runtime_route_active:false,
    runtime_enforcement_verified:false,
    replay_consume_performed:false,
    gas_sponsorship_performed:false,
    wallet_or_signer_access:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    public_presale_activation:false,
    market_activation:false,
    funds_movement:false,
  });
  return Object.freeze({
    ok:true,
    status:"source_same_boot_restart_qualified",
    ...body,
    restart_bridge_id:contentId(
      VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_ID_PREFIX_V1,
      body,
    ),
    authority:VOID_ECONOMIC_SPONSORED_OBSERVATION_RESTART_BRIDGE_AUTHORITY_V1,
  });
}
