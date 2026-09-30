#!/usr/bin/env node
import crypto from "node:crypto";

import {
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1,
} from "./void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";
import {
  validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1,
} from "./void-economic-epoch2-qbft-private-runtime-install-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1";
export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1 =
  "startPrivateEpoch2QbftSuccessorV1";

const ROLE_ORDER=Object.freeze(["precision","nimo","xiphos"]);
const START_ORDER=Object.freeze(["precision","nimo","xiphos"]);
const INSTALL_ID=/^voide2qinst1_[0-9a-f]{64}$/u;
const START_ADMISSION_ID=/^voide2qsad1_[0-9a-f]{64}$/u;
const PRESTART_ID=/^voide2qpre1_[0-9a-f]{64}$/u;
const SHA40=/^[0-9a-f]{40}$/u;
const SHA256=/^[0-9a-f]{64}$/u;

export const EXPECTED_VALIDATORS_V1=Object.freeze([
  "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
  "0x02f967953386188397b992c208239d3a25180db6",
  "0x461bf06270d9d28962f7570182c061b828799b66",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}
function exactKeys(value,keys,label) {
  if(!value||typeof value!=="object"||Array.isArray(value)) {
    throw new Error(label+"_invalid");
  }
  const a=Object.keys(value).sort();
  const b=[...keys].sort();
  if(JSON.stringify(a)!==JSON.stringify(b)) {
    throw new Error(label+"_keys_invalid");
  }
}

function validateInstallReceiptV1(receipt,role,plan,bundleSet) {
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) {
    throw new Error("install_receipt_invalid:"+role);
  }
  const material=structuredClone(receipt);
  const observedId=String(material.install_receipt_id||"");
  delete material.install_receipt_id;
  const expectedId=
    "voide2qinst1_"+sha256(Buffer.from(canonicalJson(material)));
  if(observedId!==expectedId||!INSTALL_ID.test(observedId)) {
    throw new Error("install_receipt_id_mismatch:"+role);
  }

  const row=bundleSet.roles.find((x)=>x.role===role);
  if(
    receipt.marker!=="VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_INSTALL_V1"||
    receipt.version!==1||
    receipt.status!=="HOST_BUNDLE_INSTALLED_DAEMON_RELOAD_AND_START_HOLD"||
    receipt.plan_id!==plan.plan_id||
    receipt.bundle_set_id!==bundleSet.bundle_set_id||
    receipt.materialization_id!==row.materialization_id||
    receipt.role!==role||
    receipt.hostname!==plan.hosts.find((x)=>x.role===role).hostname||
    !SHA40.test(String(receipt.installed_repo_head||""))||
    receipt.runtime_root!==
      "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/"+role||
    receipt.unit_install_path!==
      "/home/zoso/.config/systemd/user/void-economic-epoch2-qbft-validator-v1.service"
  ) {
    throw new Error("install_receipt_contract_mismatch:"+role);
  }

  const expectedHashes={
    genesis_sha256:row.genesis_sha256,
    static_nodes_sha256:row.static_nodes_sha256,
    systemd_unit_sha256:row.systemd_unit_sha256,
    private_plan_file_sha256:row.private_plan_file_sha256,
  };
  exactKeys(
    receipt.installed_hashes,
    Object.keys(expectedHashes),
    "install_hashes_"+role,
  );
  for(const [key,value] of Object.entries(expectedHashes)) {
    if(receipt.installed_hashes[key]!==value) {
      throw new Error("install_hash_mismatch:"+role+":"+key);
    }
  }

  const expectedPost={
    runtime_root_present:true,
    data_directory_empty:true,
    user_unit_file_present:true,
    user_unit_file_mode:"0600",
    unit_enabled:false,
    unit_active:false,
    daemon_reload_performed:false,
    service_start_performed:false,
    docker_mutation:false,
    nodekey_content_read:false,
    plugin_content_mutated:false,
    authoritative_chain2050_write:false,
    funds_movement:false,
  };
  exactKeys(
    receipt.post_install_state,
    Object.keys(expectedPost),
    "install_post_state_"+role,
  );
  for(const [key,value] of Object.entries(expectedPost)) {
    if(receipt.post_install_state[key]!==value) {
      throw new Error("install_post_state_mismatch:"+role+":"+key);
    }
  }

  const expectedAuthority={
    runtime_root_write:true,
    service_unit_installation:true,
    systemd_reload:false,
    service_enable:false,
    service_start:false,
    docker_mutation:false,
    private_key_access:false,
    credential_content_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  };
  exactKeys(
    receipt.authority,
    Object.keys(expectedAuthority),
    "install_authority_"+role,
  );
  for(const [key,value] of Object.entries(expectedAuthority)) {
    if(receipt.authority[key]!==value) {
      throw new Error("install_authority_mismatch:"+role+":"+key);
    }
  }

  if(
    receipt.next_gate!==
      "fresh_three_host_revalidation_then_separate_explicit_validator_start_authorization"
  ) {
    throw new Error("install_next_gate_mismatch:"+role);
  }
  return receipt;
}

function validateStartAdmissionV1(
  admission,
  plan,
  bundleSet,
  installReceipts,
  compiledAtUtc,
) {
  if(!admission||typeof admission!=="object"||Array.isArray(admission)) {
    throw new Error("start_admission_invalid");
  }
  const material=structuredClone(admission);
  const observedId=String(material.start_admission_id||"");
  delete material.start_admission_id;
  const expectedId=
    "voide2qsad1_"+sha256(Buffer.from(canonicalJson(material)));
  if(observedId!==expectedId||!START_ADMISSION_ID.test(observedId)) {
    throw new Error("start_admission_id_mismatch");
  }

  const compiledMs=Date.parse(String(compiledAtUtc||""));
  const evaluatedMs=Date.parse(String(admission.evaluated_at_utc||""));
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(
      String(compiledAtUtc||""),
    )||
    !Number.isFinite(compiledMs)||
    !Number.isFinite(evaluatedMs)
  ) {
    throw new Error("activation_compile_time_invalid");
  }

  if(
    admission.marker!==
      "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1"||
    admission.version!==1||
    admission.status!==
      "THREE_HOST_PRESTART_GREEN_VALIDATOR_START_CONFIRMATION_REQUIRED"||
    admission.plan_id!==plan.plan_id||
    admission.bundle_set_id!==bundleSet.bundle_set_id||
    !SHA40.test(String(admission.observed_repo_head||""))||
    admission.validator_count!==3||
    admission.required_quorum!==2||
    admission.start_authorized!==false||
    admission.required_start_confirmation!==
      VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1||
    admission.automatic_retry!==false||
    admission.next_gate!==
      "separate_explicit_operator_authorization_to_start_private_epoch2_qbft_validators"
  ) {
    throw new Error("start_admission_contract_mismatch");
  }

  const expectedVerification={
    exactly_three_roles:true,
    unique_install_receipts:true,
    common_plan_id:true,
    common_bundle_set_id:true,
    common_repo_head:true,
    all_receipts_fresh_at_common_evaluation_time:true,
    maximum_observation_skew_seconds:120,
    all_validator_private_keys_revalidated_locally:true,
    nodekey_bytes_emitted:false,
    nodekey_bytes_persisted:false,
    all_services_inactive:true,
    all_services_disabled:true,
    all_candidate_ports_vacant:true,
    service_start:false,
    authoritative_chain2050_write:false,
    transaction_submission:false,
    funds_movement:false,
  };
  exactKeys(
    admission.verification,
    Object.keys(expectedVerification),
    "start_admission_verification",
  );
  for(const [key,value] of Object.entries(expectedVerification)) {
    if(admission.verification[key]!==value) {
      throw new Error("start_admission_verification_mismatch:"+key);
    }
  }

  if(
    !Array.isArray(admission.receipts)||
    admission.receipts.length!==3||
    JSON.stringify(admission.receipts.map((x)=>x.role))!==
      JSON.stringify(ROLE_ORDER)
  ) {
    throw new Error("start_admission_receipt_rows_invalid");
  }

  let minimumValidUntil=Number.POSITIVE_INFINITY;
  for(const role of ROLE_ORDER) {
    const row=admission.receipts.find((x)=>x.role===role);
    const host=plan.hosts.find((x)=>x.role===role);
    const bundleRow=bundleSet.roles.find((x)=>x.role===role);
    const install=installReceipts[role];
    if(!row||!host||!bundleRow||!install) {
      throw new Error("start_admission_role_binding_missing:"+role);
    }
    const observedMs=Date.parse(String(row.observed_at_utc||""));
    const validMs=Date.parse(String(row.valid_until_utc||""));
    if(
      !PRESTART_ID.test(String(row.prestart_receipt_id||""))||
      row.install_receipt_id!==install.install_receipt_id||
      row.materialization_id!==bundleRow.materialization_id||
      row.observed_repo_head!==admission.observed_repo_head||
      row.hostname!==host.hostname||
      row.tailscale_ipv4!==host.tailscale_ipv4||
      row.enode!==host.enode||
      row.validator_address!==host.validator_address||
      row.besu_public_key!==host.besu_public_key||
      !Number.isFinite(observedMs)||
      !Number.isFinite(validMs)||
      observedMs>evaluatedMs||
      evaluatedMs>validMs
    ) {
      throw new Error("start_admission_role_row_mismatch:"+role);
    }
    minimumValidUntil=Math.min(minimumValidUntil,validMs);
  }
  if(compiledMs<evaluatedMs||compiledMs>minimumValidUntil) {
    throw new Error("start_admission_expired_at_activation_compile");
  }

  return Object.freeze({
    admission,
    minimum_valid_until_utc:new Date(minimumValidUntil).toISOString(),
  });
}

export function compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(input) {
  const plan=
    validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(
      input?.plan,
    );
  const planFileSha=String(input?.plan_file_sha256||"");
  if(!SHA256.test(planFileSha)) throw new Error("plan_file_sha256_invalid");

  const bundleSet=
    validateVoidEconomicEpoch2QbftPrivateRuntimeBundleSetReceiptV1(
      input?.bundle_set_receipt,
      plan,
      planFileSha,
    ).receipt;

  const installReceipts=input?.install_receipts;
  if(
    !installReceipts||
    typeof installReceipts!=="object"||
    Array.isArray(installReceipts)||
    JSON.stringify(Object.keys(installReceipts).sort())!==
      JSON.stringify([...ROLE_ORDER].sort())
  ) {
    throw new Error("install_receipt_set_invalid");
  }

  const rows=[];
  const seenInstallIds=new Set();
  for(const role of ROLE_ORDER) {
    const receipt=validateInstallReceiptV1(
      installReceipts[role],
      role,
      plan,
      bundleSet,
    );
    if(seenInstallIds.has(receipt.install_receipt_id)) {
      throw new Error("install_receipt_id_duplicate");
    }
    seenInstallIds.add(receipt.install_receipt_id);
    rows.push(Object.freeze({
      role,
      hostname:receipt.hostname,
      install_receipt_id:receipt.install_receipt_id,
      materialization_id:receipt.materialization_id,
      installed_repo_head:receipt.installed_repo_head,
      runtime_root:receipt.runtime_root,
      unit_install_path:receipt.unit_install_path,
      systemd_unit_sha256:receipt.installed_hashes.systemd_unit_sha256,
      genesis_sha256:receipt.installed_hashes.genesis_sha256,
      static_nodes_sha256:receipt.installed_hashes.static_nodes_sha256,
    }));
  }

  const compiledAtUtc=String(input?.compiled_at_utc||"");
  const startAdmission=validateStartAdmissionV1(
    input?.start_admission_receipt,
    plan,
    bundleSet,
    installReceipts,
    compiledAtUtc,
  );

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
    version:1,
    status:"THREE_HOST_PRESTART_ADMISSION_BOUND_VALIDATOR_START_HOLD",
    plan_id:plan.plan_id,
    bundle_set_id:bundleSet.bundle_set_id,
    plan_file_sha256:planFileSha,
    start_admission_id:startAdmission.admission.start_admission_id,
    start_admission_evaluated_at_utc:
      startAdmission.admission.evaluated_at_utc,
    start_admission_valid_until_utc:startAdmission.minimum_valid_until_utc,
    start_admission_observed_repo_head:
      startAdmission.admission.observed_repo_head,
    compiled_at_utc:compiledAtUtc,
    chain:{
      chain_id:2050,
      chain_id_hex:"0x802",
      execution_epoch:2,
      consensus:"QBFT",
      validator_count:3,
      required_quorum:2,
      block_period_seconds:5,
      request_timeout_seconds:10,
      expected_validators:EXPECTED_VALIDATORS_V1,
    },
    rpc:{
      role:"precision",
      url:"http://127.0.0.1:18553/",
      allowed_observation_methods:[
        "eth_chainId",
        "eth_blockNumber",
        "net_peerCount",
        "qbft_getValidatorsByBlockNumber",
      ],
      transaction_methods_forbidden:true,
    },
    install_receipts:rows,
    start_sequence:[
      {
        step:1,
        role:"precision",
        quorum_after_start:false,
        required_postcondition:
          "precision_rpc_chain_identity_and_validator_set_exact_height_stalled_without_quorum",
      },
      {
        step:2,
        role:"nimo",
        quorum_after_start:true,
        required_postcondition:
          "precision_rpc_block_progression_proves_two_of_three_qbft_quorum",
      },
      {
        step:3,
        role:"xiphos",
        quorum_after_start:true,
        required_postcondition:
          "precision_rpc_two_peers_validator_set_exact_and_block_progression",
      },
    ],
    pre_start_revalidation:{
      exact_installed_hashes:true,
      exact_empty_data_directory:true,
      exact_plugin_sha256:true,
      exact_rootless_docker_identity:true,
      exact_tailnet_ipv4_binding:true,
      exact_nodekey_public_identity_required:true,
      nodekey_private_bytes_must_not_be_logged:true,
      service_disabled_required:true,
      service_inactive_required:true,
      unit_restart_no_required:true,
      p2p_port_vacant_required:true,
      precision_rpc_port_vacant_required:true,
      repo_main_clean_and_descendant_required:true,
    },
    activation:{
      authorized:false,
      required_confirmation:
        VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1,
      daemon_reload_per_host:true,
      service_enable:false,
      service_start:true,
      service_restart:false,
      automatic_retry:false,
      rollback_stop_all_started_on_any_failure:true,
      first_possible_authoritative_block_production_step:2,
      third_validator_start_after_quorum_proof:true,
    },
    authority:{
      source_plan_only:true,
      runtime_filesystem_write:false,
      systemd_reload:false,
      service_enable:false,
      service_start:false,
      service_stop:false,
      docker_mutation:false,
      private_key_access:false,
      transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      authoritative_chain2050_write:false,
      validator_set_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
    },
    next_gate:
      "explicit_activation_confirmation_then_final_live_revalidation_and_single_attempt_start_sequence",
  };
  return Object.freeze({
    ...material,
    activation_plan_id:
      "voide2qactp1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}


export function validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(
  activationPlan,
) {
  if(
    !activationPlan||
    typeof activationPlan!=="object"||
    Array.isArray(activationPlan)||
    activationPlan.marker!==VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1||
    activationPlan.version!==1||
    activationPlan.status!==
      "THREE_HOST_PRESTART_ADMISSION_BOUND_VALIDATOR_START_HOLD"||
    !/^voide2qactp1_[0-9a-f]{64}$/u.test(
      String(activationPlan.activation_plan_id||""),
    )
  ) {
    throw new Error("activation_plan_invalid");
  }
  const material=structuredClone(activationPlan);
  const observedPlanId=material.activation_plan_id;
  delete material.activation_plan_id;
  const expectedPlanId=
    "voide2qactp1_"+sha256(Buffer.from(canonicalJson(material)));
  if(observedPlanId!==expectedPlanId) {
    throw new Error("activation_plan_id_mismatch");
  }

  if(
    activationPlan.chain?.chain_id!==2050||
    activationPlan.chain?.chain_id_hex!=="0x802"||
    activationPlan.chain?.execution_epoch!==2||
    activationPlan.chain?.consensus!=="QBFT"||
    activationPlan.chain?.validator_count!==3||
    activationPlan.chain?.required_quorum!==2||
    activationPlan.chain?.block_period_seconds!==5||
    activationPlan.chain?.request_timeout_seconds!==10||
    JSON.stringify(activationPlan.chain?.expected_validators)!==
      JSON.stringify(EXPECTED_VALIDATORS_V1)||
    activationPlan.rpc?.role!=="precision"||
    activationPlan.rpc?.url!=="http://127.0.0.1:18553/"||
    activationPlan.rpc?.transaction_methods_forbidden!==true||
    !START_ADMISSION_ID.test(String(activationPlan.start_admission_id||""))||
    !SHA40.test(String(activationPlan.start_admission_observed_repo_head||""))||
    !Number.isFinite(Date.parse(String(activationPlan.compiled_at_utc||"")))||
    !Number.isFinite(Date.parse(String(activationPlan.start_admission_evaluated_at_utc||"")))||
    !Number.isFinite(Date.parse(String(activationPlan.start_admission_valid_until_utc||"")))||
    Date.parse(activationPlan.compiled_at_utc)<
      Date.parse(activationPlan.start_admission_evaluated_at_utc)||
    Date.parse(activationPlan.compiled_at_utc)>
      Date.parse(activationPlan.start_admission_valid_until_utc)||
    activationPlan.activation?.authorized!==false||
    activationPlan.activation?.required_confirmation!==
      VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_CONFIRMATION_V1||
    activationPlan.activation?.service_enable!==false||
    activationPlan.activation?.service_start!==true||
    activationPlan.activation?.service_restart!==false||
    activationPlan.activation?.automatic_retry!==false||
    activationPlan.activation?.rollback_stop_all_started_on_any_failure!==true||
    activationPlan.activation?.first_possible_authoritative_block_production_step!==2||
    activationPlan.activation?.third_validator_start_after_quorum_proof!==true
  ) {
    throw new Error("activation_plan_contract_mismatch");
  }

  if(
    !Array.isArray(activationPlan.install_receipts)||
    activationPlan.install_receipts.length!==3||
    JSON.stringify(activationPlan.install_receipts.map((x)=>x.role))!==
      JSON.stringify(ROLE_ORDER)||
    !Array.isArray(activationPlan.start_sequence)||
    activationPlan.start_sequence.length!==3||
    JSON.stringify(activationPlan.start_sequence.map((x)=>x.role))!==
      JSON.stringify(START_ORDER)
  ) {
    throw new Error("activation_plan_role_order_invalid");
  }

  const expectedAuthority={
    source_plan_only:true,
    runtime_filesystem_write:false,
    systemd_reload:false,
    service_enable:false,
    service_start:false,
    service_stop:false,
    docker_mutation:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    validator_set_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  };
  exactKeys(
    activationPlan.authority,
    Object.keys(expectedAuthority),
    "activation_plan_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)) {
    if(activationPlan.authority[key]!==value) {
      throw new Error("activation_plan_authority_mismatch:"+key);
    }
  }
  return activationPlan;
}

export function buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1(
  input,
) {
  const activationPlan=
    validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(
      input?.activation_plan,
    );

  const observed=input?.observed;
  if(!observed||typeof observed!=="object"||Array.isArray(observed)) {
    throw new Error("activation_observation_invalid");
  }
  const validators=observed.validators;
  if(
    !Array.isArray(validators)||
    validators.length!==3||
    JSON.stringify([...validators].map((x)=>String(x).toLowerCase()).sort())!==
      JSON.stringify([...EXPECTED_VALIDATORS_V1].sort())
  ) {
    throw new Error("activation_validator_set_mismatch");
  }
  const precisionOnly=BigInt(String(observed.precision_only_block_number));
  const afterNimo=BigInt(String(observed.after_nimo_block_number));
  const afterXiphos=BigInt(String(observed.after_xiphos_block_number));
  if(precisionOnly!==0n) {
    throw new Error("precision_only_unexpected_block_progress");
  }
  if(afterNimo<1n) {
    throw new Error("two_validator_quorum_not_proven");
  }
  if(afterXiphos<=afterNimo) {
    throw new Error("three_validator_progress_not_proven");
  }
  if(Number(observed.after_nimo_peer_count)<1) {
    throw new Error("two_validator_peer_count_not_proven");
  }
  if(Number(observed.after_xiphos_peer_count)<2) {
    throw new Error("three_validator_peer_count_not_proven");
  }
  if(observed.chain_id_hex!=="0x802") {
    throw new Error("activation_chain_id_mismatch");
  }
  if(
    !Array.isArray(observed.started_roles)||
    JSON.stringify(observed.started_roles)!==JSON.stringify(START_ORDER)
  ) {
    throw new Error("activation_start_order_mismatch");
  }

  const activatedAt=String(input?.activated_at_utc||"");
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(
      activatedAt,
    )||
    !Number.isFinite(Date.parse(activatedAt))
  ) {
    throw new Error("activated_at_utc_invalid");
  }

  const receiptMaterial={
    marker:"VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_RECEIPT_V1",
    version:1,
    status:"PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD",
    activation_plan_id:activationPlan.activation_plan_id,
    plan_id:activationPlan.plan_id,
    bundle_set_id:activationPlan.bundle_set_id,
    activated_at_utc:activatedAt,
    chain_id:2050,
    chain_id_hex:"0x802",
    execution_epoch:2,
    consensus:"QBFT",
    validator_count:3,
    required_quorum:2,
    byzantine_fault_tolerance:0,
    validators:EXPECTED_VALIDATORS_V1,
    started_roles:START_ORDER,
    observations:{
      precision_only_block_number:precisionOnly.toString(10),
      after_nimo_block_number:afterNimo.toString(10),
      after_nimo_peer_count:Number(observed.after_nimo_peer_count),
      after_xiphos_block_number:afterXiphos.toString(10),
      after_xiphos_peer_count:Number(observed.after_xiphos_peer_count),
      chain_progression_proven:true,
      exact_validator_set_proven:true,
      two_of_three_quorum_proven:true,
      all_three_validator_services_active:true,
    },
    authority:{
      systemd_reload:true,
      service_enable:false,
      service_start:true,
      service_stop_on_failure_only:true,
      docker_mutation:true,
      private_key_access:true,
      private_key_content_exported:false,
      private_key_stdout:false,
      transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      authoritative_chain2050_write:true,
      validator_set_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
    },
    next_gate:
      "datanet_registry_deployer_live_nonce_balance_and_create_address_vacancy_observation_on_private_successor_rpc",
  };
  return Object.freeze({
    ...receiptMaterial,
    activation_receipt_id:
      "voide2qactr1_"+sha256(Buffer.from(canonicalJson(receiptMaterial))),
  });
}
