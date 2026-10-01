#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1 =
  "VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1";

export const VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_AUTHORITY_V1 =
  Object.freeze({
    source_reconciliation_plan_only: true,
    canonical_source_read: true,
    git_repository_identity_read: true,
    derived_candidate_copy: true,
    canonical_candidate_file_update: false,
    classifier_source_update: false,
    repository_mutation: false,
    rpc_call: false,
    network_call: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    role_authorization: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");

const IDENTITY_REL=
  "ops/mainnet0/wc-void-market-vault-compiled-identity-acceptance-v1.json";
const PRESALE_REL=
  "src/economic/buy_void_source_finality_authority_v2.ts";
const CANDIDATE_REL=
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const CLASSIFIER_REL=
  "tools/void-coupled-economic-successor-gate-v1.mjs";
const SHARED_STATE_REL=
  "tools/void-shared-market-post-discovery-state-v2.mjs";
const OPENING_REL=
  "tools/void-wc-void-coupled-opening-v1.mjs";
const CLASSIFIER_PROOF_REL=
  "scripts/prove_void_coupled_economic_successor_gate_v1.mjs";
const CLASSIFIER_DOC_REL=
  "docs/operators/coupled-economic-successor-gate-v1.md";

export const VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_EXPECTED_BLOBS_V1=
  Object.freeze({
    [IDENTITY_REL]:"c85b6bc59caac6bc765cb8e969cb980386161d12",
    [PRESALE_REL]:"64953050d74bc0bc6d1e6948ae992d6143edca99",
    [CANDIDATE_REL]:"8e0c6cb2f55e9f15278c3a6f62075219b80e8667",
    [CLASSIFIER_REL]:"20ac73b950dd95c65e29001a1bc5f5555388cf36",
    [SHARED_STATE_REL]:"bcfff9c2981e713a7053ff51a39145eb06b7238b",
    [OPENING_REL]:"886feaef71a228b1e6f49f1106ae8ec2b34c404e",
    [CLASSIFIER_PROOF_REL]:"858e4c41bc5a186ea69354f9e8bbcbc502cccdb2",
    [CLASSIFIER_DOC_REL]:"98bb1dc3e25c48f01136ba192c51574aa266dbb6",
  });

export const VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_APPLIED_BLOBS_V1=
  Object.freeze({
    ...VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_EXPECTED_BLOBS_V1,
    [CANDIDATE_REL]:"d78bc88dd26c47921a54c081a79ceefc0d5abcee",
    [CLASSIFIER_REL]:"ad8706419a233c5d186b9c81c0dfed3afbf2bf8f",
    [CLASSIFIER_PROOF_REL]:"ea606b2276fb0da8ac140263e2cde4040f17075b",
    [CLASSIFIER_DOC_REL]:"513b0ab50c2a26f90db0d5abd7004600335d1f89",
  });

export const VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1=
  "fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";
export const VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1=
  "sha256:"+VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1;
export const VOID_WC_VOID_COUPLED_LAUNCH_VAULT_BYTES32_V1=
  "0x"+VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1;
export const VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1=
  "sha256:fb50857b791a59b1ea87eae348afbfb8e2f587d08596a55350c0ce2faf29b621";
export const VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1=
  "sha256:522ff84c2fff69ef477085a253b666cb450a8dbd89d372633fdfe883e58851ba";

const CURRENT_SOURCE_MODEL_LAUNCH_ID="sha256:"+"a".repeat(64);
const HEX40=/^[0-9a-f]{40}$/u;
const SHA256_HEX=/^[0-9a-f]{64}$/u;
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const BYTES32=/^0x[0-9a-f]{64}$/u;
const MAX_HEAD_OBJECT_BYTES=2*1024*1024;
const OFFLINE_GIT_ENV=Object.freeze({
  ...process.env,
  GIT_OPTIONAL_LOCKS:"0",
  GIT_NO_LAZY_FETCH:"1",
  GIT_TERMINAL_PROMPT:"0",
});

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
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
    return "{"+Object.keys(value).sort().map(
      key=>JSON.stringify(key)+":"+canonicalJson(value[key]),
    ).join(",")+"}";
  }
  fail("canonical_json_value_invalid");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function deepFreeze(value,seen=new WeakSet()) {
  if(value===null||typeof value!=="object") return value;
  if(seen.has(value)) return value;
  seen.add(value);
  for(const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key],seen);
  }
  return Object.freeze(value);
}

function git(args,code) {
  const result=spawnSync(
    "git",
    ["-C",ROOT,...args],
    {
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      env:OFFLINE_GIT_ENV,
    },
  );
  if(result.status!==0) fail(code);
  return String(result.stdout||"").trim();
}

function gitBytes(args,code,maxBytes=MAX_HEAD_OBJECT_BYTES) {
  const result=spawnSync(
    "git",
    ["-C",ROOT,...args],
    {
      encoding:null,
      stdio:["ignore","pipe","pipe"],
      env:OFFLINE_GIT_ENV,
      maxBuffer:maxBytes+1,
      timeout:10_000,
    },
  );
  if(
    result.status!==0||
    !Buffer.isBuffer(result.stdout)||
    result.stdout.length<1||
    result.stdout.length>maxBytes
  ) {
    fail(code);
  }
  return Buffer.from(result.stdout);
}

function headBlobSha1(relativePath) {
  const value=git(
    ["rev-parse","HEAD:"+relativePath],
    "reconciliation_source_blob_identity_failed:"+relativePath,
  );
  if(!HEX40.test(value)) {
    fail("reconciliation_source_blob_identity_invalid:"+relativePath);
  }
  return value;
}

function readHeadBytes(relativePath) {
  return gitBytes(
    ["show","HEAD:"+relativePath],
    "reconciliation_head_object_read_failed:"+relativePath,
  );
}

function readHeadText(relativePath) {
  return readHeadBytes(relativePath).toString("utf8");
}

function readHeadJson(relativePath) {
  try {
    return JSON.parse(readHeadText(relativePath));
  } catch {
    fail("reconciliation_head_json_invalid:"+relativePath);
  }
}

function dataModuleUrl(bytes) {
  if(!Buffer.isBuffer(bytes)||bytes.length<1) {
    fail("reconciliation_module_bytes_invalid");
  }
  return "data:text/javascript;base64,"+bytes.toString("base64");
}

async function loadVerifiedHeadModulesV1() {
  const openingBytes=readHeadBytes(OPENING_REL);
  const sharedBytes=readHeadBytes(SHARED_STATE_REL);
  const openingUrl=dataModuleUrl(openingBytes);

  const sharedSource=sharedBytes.toString("utf8");
  const openingSpecifier='"./void-wc-void-coupled-opening-v1.mjs"';
  if(sharedSource.split(openingSpecifier).length-1!==1) {
    fail("reconciliation_shared_module_opening_import_shape_invalid");
  }
  const rewrittenShared=sharedSource.replace(
    openingSpecifier,
    JSON.stringify(openingUrl),
  );
  const sharedUrl=dataModuleUrl(Buffer.from(rewrittenShared,"utf8"));

  const openingModule=await import(openingUrl);
  const sharedModule=await import(sharedUrl);
  if(
    typeof openingModule.wcVoidOpeningCommitmentIdV1!=="function"||
    typeof openingModule.wcVoidOpeningSettlementIdV1!=="function"||
    typeof sharedModule.reconcileSharedMarketPostDiscoveryStateV2!=="function"
  ) {
    fail("reconciliation_verified_module_exports_invalid");
  }
  return Object.freeze({openingModule,sharedModule});
}

function sameBlobSet(actual,expected) {
  return Object.keys(expected).every(
    (relativePath)=>actual[relativePath]===expected[relativePath],
  );
}

function verifyReviewedSourceGenerationV1() {
  const head=git(["rev-parse","HEAD"],"reconciliation_repository_head_unavailable");
  const tree=git(["rev-parse","HEAD^{tree}"],"reconciliation_repository_tree_unavailable");
  if(!HEX40.test(head)||!HEX40.test(tree)) {
    fail("reconciliation_repository_identity_invalid");
  }
  const status=git(
    ["status","--porcelain=v1","--untracked-files=all"],
    "reconciliation_repository_status_unavailable",
  );
  if(status!=="") fail("reconciliation_repository_must_be_clean");

  const actual={};
  for(const relativePath of Object.keys(
    VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_EXPECTED_BLOBS_V1,
  )) {
    actual[relativePath]=headBlobSha1(relativePath);
  }

  let sourceGeneration;
  if(
    sameBlobSet(
      actual,
      VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_EXPECTED_BLOBS_V1,
    )
  ) {
    sourceGeneration="pre_application";
  } else if(
    sameBlobSet(
      actual,
      VOID_WC_VOID_COUPLED_LAUNCH_RECONCILIATION_APPLIED_BLOBS_V1,
    )
  ) {
    sourceGeneration="applied";
  } else {
    fail("reconciliation_source_generation_unreviewed");
  }

  return Object.freeze({
    repository_head_sha:head,
    repository_tree_sha:tree,
    source_generation:sourceGeneration,
    reviewed_source_blobs:Object.freeze(actual),
  });
}

function assertCandidateCommonBaseline(candidate) {
  const shared=candidate?.shared_post_discovery_reconciliation;
  if(
    candidate?.marker!=="VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1"||
    candidate?.version!==1||
    candidate?.chain_id!==2050||
    candidate?.execution_epoch!==2||
    candidate?.presale_wc_void_coupled_launch_required!==true||
    !plain(candidate?.wc_void_opening)||
    !plain(shared)||
    shared.profile!=="canonical_source_model_fixture_v2"||
    shared.source_model_fixture!==true||
    shared.runtime_or_launch_evidence!==false
  ) {
    fail("reconciliation_candidate_common_baseline_mismatch");
  }
  return shared;
}

function assertCurrentCandidateBaseline(candidate) {
  const shared=assertCandidateCommonBaseline(candidate);
  if(
    shared.coupled_launch_id!==CURRENT_SOURCE_MODEL_LAUNCH_ID||
    shared.reconciliation_id!==
      "sha256:3c543d4b6e0d30e5c65e3a6a9588a71fc0929692cf3278e43933e14f134853c5"||
    shared.wc_opening_state_id!==
      "sha256:93ec2dd83d6b1d57c93c0456056ad0c5fa85f2d7d1188ad1b26aad604d24c88d"
  ) {
    fail("reconciliation_current_candidate_fixture_mismatch");
  }
}

function assertAppliedCandidateBaseline(candidate) {
  const shared=assertCandidateCommonBaseline(candidate);
  if(
    shared.coupled_launch_id!==VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1||
    shared.reconciliation_id!==VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1||
    shared.wc_opening_state_id!==VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1
  ) {
    fail("reconciliation_applied_candidate_identity_mismatch");
  }
}

function buildReviewedCoupledLaunchCommitmentV1(candidate,identity,presaleSource) {
  const opening=candidate.wc_void_opening;
  if(
    identity?.marker!==
      "VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_ACCEPTANCE_PACKET_V1"||
    identity?.status!==
      "COMPILED_IDENTITY_ACCEPTED_HELD_ON_CHAIN2050_DEPLOYMENT_ATTESTATION"||
    identity?.accepted_identity?.identity_id!==
      "voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a"||
    identity?.artifacts?.creation_bytecode_sha256!==
      "9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af"||
    identity?.artifacts?.runtime_template_sha256!==
      "421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409"||
    identity?.artifacts?.immutable_layout_sha256!==
      "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b"||
    identity?.decision?.compiled_identity_accepted!==true||
    identity?.decision?.deployment_attested!==false
  ) {
    fail("reconciliation_market_vault_identity_mismatch");
  }

  for(const required of [
    'marker: "VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1"',
    'canonical_presale_max_void: "10000000"',
    'rate_void_units_numerator: "2"',
    'rate_void_units_denominator: "1"',
  ]) {
    if(!presaleSource.includes(required)) {
      fail("reconciliation_presale_policy_mismatch");
    }
  }

  if(
    opening?.protocol_void_inventory_atoms!=="10000000000000000000000000"||
    opening?.opening_sale_tranche_void_atoms!=="5000000000000000000000000"||
    opening?.post_opening_void_reserve_atoms!=="5000000000000000000000000"||
    opening?.protocol_wc_seed_units!=="0"||
    opening?.fixed_conversion!==false||
    opening?.fixed_opening_price!==false||
    opening?.opening_price_source!=="settled_wc_over_opening_sale_tranche"||
    opening?.opening_allocation_policy!=="pro_rata_largest_remainder_v1"
  ) {
    fail("reconciliation_wc_void_opening_policy_mismatch");
  }

  return Object.freeze({
    schema:"void.presale-wc-void-current-deployment-commitment.v1",
    version:1,
    chain_id:2050,
    presale:Object.freeze({
      policy_marker:"VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_DUAL_RAIL_V1",
      canonical_presale_max_void:"10000000",
      rate_void_units_numerator:"2",
      rate_void_units_denominator:"1",
    }),
    wc_void:Object.freeze({
      pair:"WC_VOID",
      protocol_void_inventory_atoms:opening.protocol_void_inventory_atoms,
      opening_sale_tranche_void_atoms:opening.opening_sale_tranche_void_atoms,
      post_opening_void_reserve_atoms:opening.post_opening_void_reserve_atoms,
      protocol_wc_seed_units:opening.protocol_wc_seed_units,
      fixed_conversion:opening.fixed_conversion,
      fixed_opening_price:opening.fixed_opening_price,
      opening_price_source:opening.opening_price_source,
      opening_allocation_policy:opening.opening_allocation_policy,
    }),
    market_vault:Object.freeze({
      contract_name:"WCVoidMarketVaultV2",
      compiled_identity_id:identity.accepted_identity.identity_id,
      creation_bytecode_sha256:identity.artifacts.creation_bytecode_sha256,
      runtime_template_sha256:identity.artifacts.runtime_template_sha256,
      immutable_layout_sha256:identity.artifacts.immutable_layout_sha256,
    }),
    launch_order:Object.freeze({
      presale_wc_void_simultaneous_launch:true,
      presale_launch_requires_wc_void_activation_ready:true,
      wc_void_launch_requires_presale_activation_ready:true,
    }),
  });
}

export function deriveWcVoidCoupledLaunchIdentityV1(commitment) {
  if(!plain(commitment)) fail("reconciliation_commitment_invalid");
  const digestHex=sha256Text(canonicalJson(commitment));
  if(!SHA256_HEX.test(digestHex)) fail("reconciliation_digest_invalid");
  const openingDomainId="sha256:"+digestHex;
  const vaultBytes32Id="0x"+digestHex;
  if(
    !SHA256_ID.test(openingDomainId)||
    !BYTES32.test(vaultBytes32Id)||
    openingDomainId.slice(7)!==vaultBytes32Id.slice(2)
  ) {
    fail("reconciliation_encoding_bridge_invalid");
  }
  return Object.freeze({
    digest_hex:digestHex,
    opening_domain_id:openingDomainId,
    vault_bytes32_id:vaultBytes32Id,
    encoding_bridge_lossless:true,
  });
}

function sourceModelHash(digit) {
  return "sha256:"+String(digit).repeat(64);
}

function sourceModelCommitment(
  launchId,
  participantDigit,
  account,
  wcUnits,
  openingModule,
) {
  const value={
    schema:openingModule.VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id:sourceModelHash("0"),
    coupled_launch_id:launchId,
    participant_id:sourceModelHash(participantDigit),
    account,
    wc_units:String(wcUnits),
  };
  value.commitment_id=openingModule.wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function sourceModelDebit(
  launchId,
  commitment,
  amount,
  tsMs,
  openingModule,
) {
  const value={
    schema:openingModule.VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind:"debit",
    account:commitment.account,
    amount,
    delta:-amount,
    ts_ms:tsMs,
    reason:"wc_void_opening_settlement_v1",
    settlement_id:sourceModelHash("0"),
    commitment_id:commitment.commitment_id,
    coupled_launch_id:launchId,
    pair:"WC_VOID",
    source_domain:"void-work-credit-ledger",
    quote_asset_form:"ledger-credit",
    quote_unit:"wc",
    quote_decimals:0,
    market_meta:{
      adapter_id:openingModule.VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only:true,
      fixed_price:false,
      protocol_wc_seed_units:"0",
    },
  };
  value.settlement_id=openingModule.wcVoidOpeningSettlementIdV1(value);
  return value;
}

function deriveSharedSourceModelV2(launchId,openingModule,sharedModule) {
  const first=sourceModelCommitment(
    launchId,"1","wc-opening-alpha","250",openingModule,
  );
  const second=sourceModelCommitment(
    launchId,"2","wc-opening-beta","750",openingModule,
  );
  const firstDebit=sourceModelDebit(
    launchId,first,250,1790344000001,openingModule,
  );
  const secondDebit=sourceModelDebit(
    launchId,second,750,1790344000002,openingModule,
  );
  return sharedModule.reconcileSharedMarketPostDiscoveryStateV2({
    coupled_launch_id:launchId,
    commitments:[first,second],
    ledger_debits:[secondDebit,firstDebit],
  });
}

function sharedCandidateSummaryV2(state) {
  return Object.freeze({
    profile:"canonical_source_model_fixture_v2",
    source_model_fixture:true,
    runtime_or_launch_evidence:false,
    coupled_launch_id:state.coupled_launch_id,
    marker:state.marker,
    schema:state.schema,
    reconciliation_id:state.reconciliation_id,
    wc_opening_state_id:state.wc_opening_state_id,
    chain_id:state.chain_id,
    network_identity:state.network_identity,
    execution_epoch:state.execution_epoch,
    void_token:state.void_token,
    void_token_decimals:state.void_token_decimals,
    wc_void_phase:state.market_models.WC_VOID.phase,
    btc_void_phase:state.market_models.BTC_VOID.phase,
    eth_void_phase:state.market_models.ETH_VOID.phase,
    wc_void_settled_quote_reserve_units:
      state.market_models.WC_VOID.settled_quote_reserve_units,
    total_planned_void_inventory_atoms:
      state.total_planned_void_inventory_atoms,
    wc_opening_participant_allocated_void_atoms:
      state.wc_opening_participant_allocated_void_atoms,
    wc_post_opening_retained_void_reserve_atoms:
      state.wc_post_opening_retained_void_reserve_atoms,
    unopened_post_presale_planned_void_inventory_atoms:
      state.unopened_post_presale_planned_void_inventory_atoms,
    modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms:
      state.modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms,
    shared_post_discovery_model_reconciled:
      state.shared_post_discovery_model_reconciled,
    legacy_v1_six_decimal_void_atoms_authoritative:
      state.legacy_v1_six_decimal_void_atoms_authoritative,
    all_markets_share_one_presale_closeout:
      state.all_markets_share_one_presale_closeout,
    wc_void_uses_coupled_launch_id:state.wc_void_uses_coupled_launch_id,
    btc_void_remains_post_presale:state.btc_void_remains_post_presale,
    eth_void_remains_post_presale:state.eth_void_remains_post_presale,
    exact_30m_planned_inventory_conservation:
      state.exact_30m_planned_inventory_conservation,
    quote_reserve_custody_verified:state.quote_reserve_custody_verified,
    void_reserve_custody_verified:state.void_reserve_custody_verified,
    market_activation_authority:state.market_activation_authority,
    public_presale_activation_authority:
      state.public_presale_activation_authority,
    inventory_funding_authority:state.inventory_funding_authority,
    funds_movement_authority:state.funds_movement_authority,
  });
}

function assertAtomicSourceBaseline(
  candidate,
  classifierSource,
  classifierProof,
  classifierDoc,
) {
  if(
    !classifierSource.includes(
      'const SOURCE_MODEL_COUPLED_LAUNCH_ID = "sha256:" + "a".repeat(64);',
    )||
    !classifierSource.includes(
      "coupled_launch_id: SOURCE_MODEL_COUPLED_LAUNCH_ID",
    )||
    !classifierSource.includes(
      "const state = deriveCanonicalSharedPostDiscoverySourceModelV2();",
    )||
    !classifierSource.includes(
      '"shared_post_discovery_reconciliation_mismatch:" + key',
    )
  ) {
    fail("reconciliation_classifier_fixture_binding_missing");
  }
  for(const source of [classifierProof,classifierDoc]) {
    if(
      !source.includes(
        "3c543d4b6e0d30e5c65e3a6a9588a71fc0929692cf3278e43933e14f134853c5",
      )||
      !source.includes(
        "93ec2dd83d6b1d57c93c0456056ad0c5fa85f2d7d1188ad1b26aad604d24c88d",
      )
    ) {
      fail("reconciliation_proof_or_doc_fixture_identity_missing");
    }
  }
  assertCurrentCandidateBaseline(candidate);
}

function assertAppliedSourceBaseline(
  candidate,
  classifierSource,
  classifierProof,
  classifierDoc,
) {
  const launch=VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1;
  if(
    !classifierSource.includes(
      '"sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26"',
    )||
    !classifierSource.includes(
      "coupled_launch_id: SOURCE_MODEL_COUPLED_LAUNCH_ID",
    )||
    classifierSource.includes(
      'const SOURCE_MODEL_COUPLED_LAUNCH_ID = "sha256:" + "a".repeat(64);',
    )
  ) {
    fail("reconciliation_applied_classifier_identity_mismatch");
  }
  for(const source of [classifierProof,classifierDoc]) {
    if(
      !source.includes(launch)||
      !source.includes(VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1)||
      !source.includes(VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1)
    ) {
      fail("reconciliation_applied_proof_or_doc_identity_mismatch");
    }
  }
  assertAppliedCandidateBaseline(candidate);
}

function requiredAtomicSourceUpdatesV1() {
  return Object.freeze([
    Object.freeze({
      path:CANDIDATE_REL,
      purpose:
        "replace_source_model_fixture_with_reviewed_launch_identity_and_rederived_shared_state",
    }),
    Object.freeze({
      path:CLASSIFIER_REL,
      purpose:
        "replace_source_model_launch_id_constant_so_classifier_rederives_same_shared_state",
    }),
    Object.freeze({
      path:CLASSIFIER_PROOF_REL,
      purpose:
        "replace_obsolete_fixture_reconciliation_and_opening_state_expectations",
    }),
    Object.freeze({
      path:CLASSIFIER_DOC_REL,
      purpose:
        "replace_obsolete_documented_fixture_reconciliation_and_opening_state_identities",
    }),
  ]);
}

export async function prepareWcVoidCoupledLaunchIdentityReconciliationV1() {
  const repository=verifyReviewedSourceGenerationV1();
  const candidate=readHeadJson(CANDIDATE_REL);
  const identity=readHeadJson(IDENTITY_REL);
  const presaleSource=readHeadText(PRESALE_REL);
  const classifierSource=readHeadText(CLASSIFIER_REL);
  const classifierProof=readHeadText(CLASSIFIER_PROOF_REL);
  const classifierDoc=readHeadText(CLASSIFIER_DOC_REL);

  if(repository.source_generation==="pre_application") {
    assertAtomicSourceBaseline(
      candidate,
      classifierSource,
      classifierProof,
      classifierDoc,
    );
  } else {
    assertAppliedSourceBaseline(
      candidate,
      classifierSource,
      classifierProof,
      classifierDoc,
    );
  }

  const commitment=buildReviewedCoupledLaunchCommitmentV1(
    candidate,
    identity,
    presaleSource,
  );
  const launchIdentity=deriveWcVoidCoupledLaunchIdentityV1(commitment);
  if(
    launchIdentity.digest_hex!==VOID_WC_VOID_COUPLED_LAUNCH_DIGEST_HEX_V1||
    launchIdentity.opening_domain_id!==
      VOID_WC_VOID_COUPLED_LAUNCH_OPENING_ID_V1||
    launchIdentity.vault_bytes32_id!==
      VOID_WC_VOID_COUPLED_LAUNCH_VAULT_BYTES32_V1
  ) {
    fail("reconciliation_reviewed_launch_identity_mismatch");
  }

  const {openingModule,sharedModule}=await loadVerifiedHeadModulesV1();
  const currentState=deriveSharedSourceModelV2(
    CURRENT_SOURCE_MODEL_LAUNCH_ID,
    openingModule,
    sharedModule,
  );
  const currentShared=sharedCandidateSummaryV2(currentState);

  const reconciledState=deriveSharedSourceModelV2(
    launchIdentity.opening_domain_id,
    openingModule,
    sharedModule,
  );
  const reconciledShared=sharedCandidateSummaryV2(reconciledState);
  if(
    reconciledShared.coupled_launch_id!==
      launchIdentity.opening_domain_id||
    reconciledShared.reconciliation_id!==
      VOID_WC_VOID_RECONCILED_SHARED_STATE_ID_V1||
    reconciledShared.wc_opening_state_id!==
      VOID_WC_VOID_RECONCILED_OPENING_STATE_ID_V1||
    reconciledShared.reconciliation_id===currentShared.reconciliation_id||
    reconciledShared.wc_opening_state_id===currentShared.wc_opening_state_id
  ) {
    fail("reconciliation_rederived_shared_state_invalid");
  }

  let proposedCandidate;
  if(repository.source_generation==="pre_application") {
    if(
      canonicalJson(currentShared)!==
        canonicalJson(candidate.shared_post_discovery_reconciliation)
    ) {
      fail("reconciliation_current_fixture_rederivation_mismatch");
    }
    proposedCandidate=structuredClone(candidate);
    proposedCandidate.shared_post_discovery_reconciliation=
      structuredClone(reconciledShared);

    const scopeCheck=structuredClone(proposedCandidate);
    scopeCheck.shared_post_discovery_reconciliation=
      structuredClone(candidate.shared_post_discovery_reconciliation);
    if(canonicalJson(scopeCheck)!==canonicalJson(candidate)) {
      fail("reconciliation_candidate_change_scope_invalid");
    }
  } else {
    if(
      canonicalJson(reconciledShared)!==
        canonicalJson(candidate.shared_post_discovery_reconciliation)
    ) {
      fail("reconciliation_applied_candidate_rederivation_mismatch");
    }
    proposedCandidate=structuredClone(candidate);
  }

  const frozenProposedCandidate=deepFreeze(proposedCandidate);
  const applied=repository.source_generation==="applied";

  const material=Object.freeze({
    marker:VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1,
    version:1,
    status:applied
      ?"CANONICAL_SOURCE_RECONCILIATION_APPLIED"
      :"ATOMIC_SOURCE_RECONCILIATION_PREPARED_APPLICATION_REQUIRED",
    source_generation:repository.source_generation,
    repository_head_sha:repository.repository_head_sha,
    repository_tree_sha:repository.repository_tree_sha,
    reviewed_source_blobs:repository.reviewed_source_blobs,
    current_source_fixture:Object.freeze({
      opening_domain_id:CURRENT_SOURCE_MODEL_LAUNCH_ID,
      reconciliation_id:currentShared.reconciliation_id,
      wc_opening_state_id:currentShared.wc_opening_state_id,
    }),
    reviewed_coupled_launch_commitment:commitment,
    launch_identity:launchIdentity,
    proposed_shared_post_discovery_reconciliation:reconciledShared,
    proposed_candidate_sha256:
      sha256Text(canonicalJson(frozenProposedCandidate)),
    required_atomic_source_updates:applied
      ?Object.freeze([])
      :requiredAtomicSourceUpdatesV1(),
    downstream_real_evidence_blocked_until_application:applied
      ?Object.freeze([])
      :Object.freeze([
        "opening_ledger_custody_evidence",
        "opening_claim_replay_evidence",
        "bounded_canary_evidence",
        "market_vault_role_authorization",
        "market_vault_deployment_attestation",
        "final_coupled_activation",
      ]),
    verification:Object.freeze({
      reviewed_source_blobs_verified:true,
      canonical_inputs_loaded_from_head_git_objects:true,
      verified_modules_loaded_from_head_git_objects:true,
      working_tree_module_execution:false,
      repository_clean:true,
      pre_application_generation_verified:!applied,
      applied_source_generation_verified:applied,
      current_fixture_rederived:true,
      commitment_digest_rederived:true,
      opening_and_vault_encodings_lossless:true,
      reconciled_shared_state_rederived:true,
      exact_reconciled_reconciliation_id_verified:true,
      exact_reconciled_opening_state_id_verified:true,
      reconciliation_id_rotated:true,
      wc_opening_state_id_rotated:true,
      proposed_candidate_change_scope_shared_reconciliation_only:!applied,
      current_classifier_source_fixture_verified:!applied,
      applied_classifier_source_identity_verified:applied,
      candidate_classifier_atomic_source_update_required:!applied,
      classifier_execution_performed:false,
      canonical_candidate_file_updated:applied,
      classifier_source_updated:applied,
      source_application_required:!applied,
    }),
    authority:
      VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_AUTHORITY_V1,
  });

  const artifact=Object.freeze({
    ...material,
    reconciliation_plan_id:
      "voidwclir1_"+sha256Text(canonicalJson(material)),
  });

  return Object.freeze({
    artifact,
    proposed_candidate:frozenProposedCandidate,
  });
}

const direct=
  process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(direct) {
  try {
    const result=await prepareWcVoidCoupledLaunchIdentityReconciliationV1();
    console.log(VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1);
    console.log("status="+result.artifact.status);
    console.log("source_generation="+result.artifact.source_generation);
    console.log("reconciliation_plan_id="+result.artifact.reconciliation_plan_id);
    console.log("digest_hex="+result.artifact.launch_identity.digest_hex);
    console.log(
      "opening_domain_id="+result.artifact.launch_identity.opening_domain_id,
    );
    console.log(
      "vault_bytes32_id="+result.artifact.launch_identity.vault_bytes32_id,
    );
    console.log(
      "reconciliation_id="+
        result.artifact.proposed_shared_post_discovery_reconciliation
          .reconciliation_id,
    );
    console.log(
      "wc_opening_state_id="+
        result.artifact.proposed_shared_post_discovery_reconciliation
          .wc_opening_state_id,
    );
    console.log(
      "atomic_source_update_required="+
        String(result.artifact.verification.source_application_required),
    );
    console.log(
      "canonical_candidate_file_updated="+
        String(result.artifact.verification.canonical_candidate_file_updated),
    );
    console.log(
      "classifier_source_updated="+
        String(result.artifact.verification.classifier_source_updated),
    );
    console.log("deployment=false");
    console.log("role_authorization=false");
    console.log("funds_movement=false");
    console.log(
      "VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1_GREEN",
    );
  } catch(error) {
    console.error(
      "VOID_WC_VOID_COUPLED_LAUNCH_IDENTITY_RECONCILIATION_V1_HOLD",
    );
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=2;
  }
}
