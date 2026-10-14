#!/usr/bin/env node
import crypto from "node:crypto";
import {
  VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V1,
  VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
  canonicalApollyonCustodyHostPolicyJsonV1,
  qualifyApollyonCustodyHostPolicyV1,
} from "./apollyon-custody-host-policy-qualification-v1.mjs";

export const VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2 =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2";
export const VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2 =
  "VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2";
export const VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2 = Object.freeze({
  ...VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V1,
  historical_v1_classifier_reused:true,
  socket_parent_retained_ancestor_binding:true,
  socket_parent_training_rename_unlink_denied_required:true,
  explicit_training_pid_service_control_denial_required:true,
  exact_lexically_first_action_id_only_polkit_deny_rule_required:true,
  reviewed_systemd_major_pinned:true,
  running_systemd_manager_version_bound:true,
  running_installed_systemd_version_match_required:true,
  reviewed_systemd_package_version_pinned:true,
  systemd_bus_owner_pid1_required:true,
  all_training_uid_processes_capability_free_required:true,
  all_training_uid_threads_capability_free_required:true,
  training_uid_thread_stability_required:true,
  training_uid_process_identity_stability_required:true,
  training_uid_thread_discovery_required:true,
  actual_system_bus_sender_denial_required:true,
  inherited_system_bus_descriptor_absence_required:true,
  absolute_runtime_service_control_denial_required:true,
});
const MAX_ANCESTORS=128;
const REVIEWED_SYSTEMD_MAJOR=255;
const REVIEWED_SYSTEMD_PACKAGE_VERSION="255.4-1ubuntu8.11";
const SAFE_UNIT=/^[A-Za-z0-9_.@-]+\.service$/u;
const SAFE_RUNTIME_USER=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SYSTEMD_MANAGE_UNIT_VERBS=Object.freeze([
  "start","verify-active","stop","reload","reload-or-start","restart","try-restart",
  "try-reload","nop","reload-or-restart","reload-or-try-restart","kill","clean",
  "set-property","reset-failed","ref","bind-mount","mount-image",
]);
const SYSTEMD_GLOBAL_CONTROL_ACTIONS=Object.freeze([
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
  "org.freedesktop.systemd1.set-environment",
]);
function fail(code){throw new Error(code);}
function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index]))fail(code);
}
function normalizeSocketParentV2(value){
  const code="apollyon_custody_policy_v2_socket_parent_invalid";
  exactKeys(value,[
    "custody_uid_write_allowed","direct","mode","owner_gid","owner_uid",
    "retained_ancestor_count","retained_ancestors_direct",
    "retained_ancestors_group_other_writable","retained_ancestors_root_owned",
    "retained_ancestors_symlink_free","symlink",
    "training_uid_rename_unlink_denied","training_uid_traverse_allowed",
    "training_uid_write_denied",
  ],code);
  if(!Number.isSafeInteger(value.retained_ancestor_count)||
     value.retained_ancestor_count<2||value.retained_ancestor_count>MAX_ANCESTORS||
     value.retained_ancestors_root_owned!==true||
     value.retained_ancestors_direct!==true||
     value.retained_ancestors_symlink_free!==true||
     value.retained_ancestors_group_other_writable!==false||
     value.training_uid_rename_unlink_denied!==true){
    fail(code);
  }
  return Object.freeze({...value});
}
function normalizeIdentitiesV2(value){
  const code="apollyon_custody_policy_v2_identities_invalid";
  exactKeys(value,[
    "custody_gid","custody_supplementary_gids","custody_uid","ipc_gid",
    "training_gid","training_supplementary_gids","training_uid","training_user",
  ],code);
  if(
    typeof value.training_user!=="string"||
    !SAFE_RUNTIME_USER.test(value.training_user)
  )fail(code);
  return Object.freeze({
    ...value,
    custody_supplementary_gids:Object.freeze([...value.custody_supplementary_gids]),
    training_supplementary_gids:Object.freeze([...value.training_supplementary_gids]),
  });
}
function normalizeServiceControl(value,identities){
  const code="apollyon_custody_policy_v2_service_control_invalid";
  exactKeys(value,[
    "absolute_runtime_service_control_denial_proven",
    "actual_system_bus_sender_checks_required",
    "actual_system_bus_sender_count",
    "actual_system_bus_sender_set_stable",
    "actual_system_bus_senders",
    "all_systemd_control_actions_explicitly_denied",
    "all_training_uid_processes_capability_free",
    "all_training_uid_threads_capability_free",
    "checked_actions","inherited_system_bus_descriptor_absence_proven",
    "inherited_system_bus_descriptor_absence_required",
    "installed_systemd_package_version",
    "observed_systemd_version_line","pkcheck_subject","polkit_deny_rule",
    "reviewed_systemd_major","reviewed_systemd_package_version",
    "running_installed_systemd_version_match",
    "running_systemd_manager_major","running_systemd_manager_version",
    "runtime_can_control_service","service_unit","systemd_bus_owner_pid",
    "systemd_bus_owner_pid_is_pid1","training_pid",
    "training_process_capabilities","training_process_start_time_ticks",
    "training_uid","training_uid_process_count",
    "training_uid_process_identity_stable_across_authorization",
    "training_uid_process_set_stable","training_uid_processes",
    "training_uid_thread_count","training_uid_thread_sets_stable",
  ],code);
  if(
    value.reviewed_systemd_major!==REVIEWED_SYSTEMD_MAJOR||
    value.reviewed_systemd_package_version!==REVIEWED_SYSTEMD_PACKAGE_VERSION||
    value.installed_systemd_package_version!==REVIEWED_SYSTEMD_PACKAGE_VERSION||
    value.running_systemd_manager_version!==REVIEWED_SYSTEMD_PACKAGE_VERSION||
    value.running_systemd_manager_major!==REVIEWED_SYSTEMD_MAJOR||
    value.running_installed_systemd_version_match!==true||
    value.systemd_bus_owner_pid!==1||
    value.systemd_bus_owner_pid_is_pid1!==true||
    typeof value.observed_systemd_version_line!=="string"||
    value.observed_systemd_version_line!==
      "systemd 255 ("+REVIEWED_SYSTEMD_PACKAGE_VERSION+")"||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    !Number.isSafeInteger(value.training_uid)||value.training_uid!==identities.training_uid||
    typeof value.training_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.training_process_start_time_ticks)||
    value.pkcheck_subject!==String(value.training_pid)+","+
      value.training_process_start_time_ticks+","+String(value.training_uid)||
    typeof value.service_unit!=="string"||!SAFE_UNIT.test(value.service_unit)||
    value.absolute_runtime_service_control_denial_proven!==true||
    value.inherited_system_bus_descriptor_absence_required!==true||
    value.inherited_system_bus_descriptor_absence_proven!==true||
    value.actual_system_bus_sender_checks_required!==true||
    value.actual_system_bus_sender_set_stable!==true||
    !Number.isSafeInteger(value.actual_system_bus_sender_count)||
    value.actual_system_bus_sender_count<0||
    value.actual_system_bus_sender_count>32||
    !Array.isArray(value.actual_system_bus_senders)||
    value.actual_system_bus_senders.length!==value.actual_system_bus_sender_count||
    value.all_systemd_control_actions_explicitly_denied!==true||
    value.all_training_uid_processes_capability_free!==true||
    value.all_training_uid_threads_capability_free!==true||
    value.training_uid_process_identity_stable_across_authorization!==true||
    value.training_uid_process_set_stable!==true||
    value.training_uid_thread_sets_stable!==true||
    !Number.isSafeInteger(value.training_uid_process_count)||
    value.training_uid_process_count<1||
    !Number.isSafeInteger(value.training_uid_thread_count)||
    value.training_uid_thread_count<value.training_uid_process_count||
    !Array.isArray(value.training_uid_processes)||
    value.training_uid_processes.length!==value.training_uid_process_count||
    value.runtime_can_control_service!==false
  )fail(code);

  exactKeys(value.polkit_deny_rule,[
    "action_id_only","bytes","denied_action_ids","details_can_change_result",
    "group_other_writable","lexically_first","mode","owner_gid","owner_uid",
    "path","retained_ancestors_group_other_writable",
    "retained_ancestors_root_owned","runtime_user","sha256","single_link","symlink",
  ],code);
  const expectedActions=[
    "org.freedesktop.systemd1.manage-units",
    ...SYSTEMD_GLOBAL_CONTROL_ACTIONS,
  ];
  const runtimeUserJson=JSON.stringify(value.polkit_deny_rule.runtime_user);
  const actionExpression=expectedActions
    .map((actionId)=>"      action.id === "+JSON.stringify(actionId))
    .join(" ||\n");
  const expectedPolkitRule=
    "polkit.addRule(function(action, subject) {\n"+
    "  if (\n"+
    "    subject.user === "+runtimeUserJson+" &&\n"+
    "    (\n"+
    actionExpression+"\n"+
    "    )\n"+
    "  ) {\n"+
    "    return polkit.Result.NO;\n"+
    "  }\n"+
    "  return polkit.Result.NOT_HANDLED;\n"+
    "});\n";
  const expectedPolkitRuleBytes=Buffer.from(expectedPolkitRule,"utf8");
  const expectedPolkitRuleSha256=crypto.createHash("sha256")
    .update(expectedPolkitRuleBytes)
    .digest("hex");
  if(
    value.polkit_deny_rule.action_id_only!==true||
    value.polkit_deny_rule.details_can_change_result!==false||
    value.polkit_deny_rule.lexically_first!==true||
    value.polkit_deny_rule.owner_uid!==0||
    value.polkit_deny_rule.owner_gid!==0||
    value.polkit_deny_rule.single_link!==true||
    value.polkit_deny_rule.symlink!==false||
    value.polkit_deny_rule.group_other_writable!==false||
    value.polkit_deny_rule.retained_ancestors_root_owned!==true||
    value.polkit_deny_rule.retained_ancestors_group_other_writable!==false||
    typeof value.polkit_deny_rule.runtime_user!=="string"||
    !SAFE_RUNTIME_USER.test(value.polkit_deny_rule.runtime_user)||
    value.polkit_deny_rule.runtime_user!==identities.training_user||
    value.polkit_deny_rule.path!==
      "/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules"||
    value.polkit_deny_rule.bytes!==expectedPolkitRuleBytes.length||
    value.polkit_deny_rule.sha256!==expectedPolkitRuleSha256||
    typeof value.polkit_deny_rule.mode!=="string"||
    !/^0[0-7]{3}$/u.test(value.polkit_deny_rule.mode)||
    (Number.parseInt(value.polkit_deny_rule.mode,8)&0o022)!==0||
    !Array.isArray(value.polkit_deny_rule.denied_action_ids)||
    canonicalApollyonCustodyHostPolicyJsonV1(value.polkit_deny_rule.denied_action_ids)!==
      canonicalApollyonCustodyHostPolicyJsonV1(expectedActions)
  )fail(code);

  const validateCapabilities=(caps)=>{
    exactKeys(caps,[
      "ambient","effective","inheritable","no_new_privileges","permitted",
    ],code);
    if(
      caps.ambient!=="0"||
      caps.effective!=="0"||
      caps.inheritable!=="0"||
      caps.permitted!=="0"||
      caps.no_new_privileges!==true
    )fail(code);
  };
  validateCapabilities(value.training_process_capabilities);

  let previousPid=0;
  let selected=null;
  let threadTotal=0;
  for(const process of value.training_uid_processes){
    exactKeys(process,[
      "all_threads_capability_free","capabilities","pid","start_time_ticks",
      "thread_count","thread_inventory_sha256","thread_set_stable",
      "uid","uid_slots",
    ],code);
    if(
      !Number.isSafeInteger(process.pid)||process.pid<=previousPid||
      process.uid!==value.training_uid||
      !Array.isArray(process.uid_slots)||process.uid_slots.length!==4||
      process.uid_slots.some((uid)=>uid!==value.training_uid)||
      typeof process.start_time_ticks!=="string"||
      !/^[1-9][0-9]*$/u.test(process.start_time_ticks)||
      !Number.isSafeInteger(process.thread_count)||process.thread_count<1||
      typeof process.thread_inventory_sha256!=="string"||
      !/^[0-9a-f]{64}$/u.test(process.thread_inventory_sha256)||
      process.thread_set_stable!==true||
      process.all_threads_capability_free!==true
    )fail(code);
    validateCapabilities(process.capabilities);
    threadTotal+=process.thread_count;
    if(process.pid===value.training_pid)selected=process;
    previousPid=process.pid;
  }
  if(
    threadTotal!==value.training_uid_thread_count||
    selected===null||
    selected.start_time_ticks!==value.training_process_start_time_ticks||
    canonicalApollyonCustodyHostPolicyJsonV1(selected.capabilities)!==
      canonicalApollyonCustodyHostPolicyJsonV1(value.training_process_capabilities)
  )fail(code);

  const expected=[
    {action_id:"org.freedesktop.systemd1.manage-units",details:[]},
    ...SYSTEMD_MANAGE_UNIT_VERBS.map((verb)=>({
      action_id:"org.freedesktop.systemd1.manage-units",
      details:[{key:"unit",value:value.service_unit},{key:"verb",value:verb}],
    })),
    ...SYSTEMD_GLOBAL_CONTROL_ACTIONS.map((action_id)=>({action_id,details:[]})),
  ];
  const expectedDenied=expected.map((entry)=>({
    action_id:entry.action_id,
    details:entry.details,
    exit_status:1,
    result:"explicitly_denied",
  }));
  const expectedBusDigest=crypto.createHash("sha256")
    .update(canonicalApollyonCustodyHostPolicyJsonV1(expectedDenied))
    .digest("hex");
  const admittedPids=new Set(value.training_uid_processes.map((process)=>process.pid));
  let previousBusName="";
  for(const sender of value.actual_system_bus_senders){
    exactKeys(sender,[
      "all_systemd_control_actions_explicitly_denied","bus_name",
      "checked_action_count","denial_transcript_sha256","pid",
      "subject_type","uid",
    ],code);
    if(
      typeof sender.bus_name!=="string"||
      !/^:[0-9]+\.[0-9]+$/u.test(sender.bus_name)||
      (previousBusName!==""&&sender.bus_name<=previousBusName)||
      !Number.isSafeInteger(sender.pid)||!admittedPids.has(sender.pid)||
      sender.uid!==value.training_uid||
      sender.subject_type!=="system-bus-name"||
      sender.all_systemd_control_actions_explicitly_denied!==true||
      sender.checked_action_count!==expectedDenied.length||
      sender.denial_transcript_sha256!==expectedBusDigest
    )fail(code);
    previousBusName=sender.bus_name;
  }
  if(!Array.isArray(value.checked_actions)||value.checked_actions.length!==expected.length){
    fail(code);
  }
  for(let index=0;index<expected.length;index+=1){
    const actual=value.checked_actions[index];
    exactKeys(actual,["action_id","details","exit_status","result"],code);
    if(
      actual.action_id!==expected[index].action_id||
      actual.exit_status!==1||
      actual.result!=="explicitly_denied"||
      canonicalApollyonCustodyHostPolicyJsonV1(actual.details)!==
        canonicalApollyonCustodyHostPolicyJsonV1(expected[index].details)
    )fail(code);
  }
  return Object.freeze({
    ...value,
    checked_actions:Object.freeze(value.checked_actions.map((entry)=>Object.freeze({
      ...entry,
      details:Object.freeze(entry.details.map((detail)=>Object.freeze({...detail}))),
    }))),
    training_process_capabilities:Object.freeze({...value.training_process_capabilities}),
    actual_system_bus_senders:Object.freeze(
      value.actual_system_bus_senders.map((sender)=>Object.freeze({...sender})),
    ),
    training_uid_processes:Object.freeze(
      value.training_uid_processes.map((process)=>Object.freeze({
        ...process,
        uid_slots:Object.freeze([...process.uid_slots]),
        capabilities:Object.freeze({...process.capabilities}),
      })),
    ),
  });
}
function historicalV1Input(input,sp){
  return Object.freeze({
    consumed_directory:input.consumed_directory,
    evidence_snapshot:input.evidence_snapshot,
    identities:Object.freeze({
      custody_gid:input.identities.custody_gid,
      custody_supplementary_gids:input.identities.custody_supplementary_gids,
      custody_uid:input.identities.custody_uid,
      ipc_gid:input.identities.ipc_gid,
      training_gid:input.identities.training_gid,
      training_supplementary_gids:input.identities.training_supplementary_gids,
      training_uid:input.identities.training_uid,
    }),
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
    service:input.service,
    socket:input.socket,
    socket_parent:Object.freeze({
      custody_uid_write_allowed:sp.custody_uid_write_allowed,
      direct:sp.direct,mode:sp.mode,owner_gid:sp.owner_gid,owner_uid:sp.owner_uid,
      symlink:sp.symlink,
      training_uid_traverse_allowed:sp.training_uid_traverse_allowed,
      training_uid_write_denied:sp.training_uid_write_denied,
    }),
    source_binding:input.source_binding,
    state_root:input.state_root,
    target_host:input.target_host,
    verification_now_ms:input.verification_now_ms,
    version:1,
  });
}
export function qualifyApollyonCustodyHostPolicyV2(input){
  exactKeys(input,[
    "consumed_directory","evidence_snapshot","identities","marker","service",
    "service_control","socket","socket_parent","source_binding","state_root","target_host",
    "verification_now_ms","version",
  ],"apollyon_custody_policy_v2_input_invalid");
  if(input.marker!==VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2||
     input.version!==2||input.target_host!=="Xiphos"){
    fail("apollyon_custody_policy_v2_input_invalid");
  }
  const identities=normalizeIdentitiesV2(input.identities);
  const socketParent=normalizeSocketParentV2(input.socket_parent);
  const serviceControl=normalizeServiceControl(input.service_control,identities);
  if(input.service?.runtime_can_control_service!==serviceControl.runtime_can_control_service){
    fail("apollyon_custody_policy_v2_service_control_mismatch");
  }
  const v1=qualifyApollyonCustodyHostPolicyV1(historicalV1Input(input,socketParent));
  if(v1.ok!==true||v1.status!=="source_policy_qualified"){
    fail("apollyon_custody_policy_v2_historical_v1_reuse_failed");
  }
  const normalized=Object.freeze({
    ...input,identities,socket_parent:socketParent,service_control:serviceControl,
  });
  const qualificationId="apollyon_custody_policy_v2:"+
    crypto.createHash("sha256")
      .update(canonicalApollyonCustodyHostPolicyJsonV1(normalized)).digest("hex");
  return Object.freeze({
    ok:true,marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2,
    version:2,status:"source_policy_qualified",qualification_id:qualificationId,
    historical_v1_qualification_id:v1.qualification_id,target_host:"Xiphos",
    source_binding_verified:true,historical_v1_classifier_reused:true,
    evidence_freshness_checked:true,identity_separation_qualified:true,
    state_root_policy_qualified:true,consumed_directory_policy_qualified:true,
    socket_parent_policy_qualified:true,
    socket_parent_retained_ancestor_policy_qualified:true,
    socket_parent_training_rename_unlink_policy_qualified:true,
    socket_policy_qualified:true,service_hardening_policy_qualified:true,
    service_control_policy_qualified:true,
    custody_uid_process_exclusivity_evidence_qualified:true,
    verification_clock_authority_proven:false,
    evidence_generation_monotonicity_proven:false,
    live_host_qualification_performed:false,independent_custody_proven:false,
    production_gate_ready:false,attempt_claimed:false,
    training_execution_performed:false,wallet_access_performed:false,
    funds_movement_performed:false,
    next_gate:"designated_host_read_only_custody_evidence_collection_v2",
    authority:VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2,
  });
}
