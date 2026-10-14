#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
V1=ROOT/'ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v1.py'
V2=ROOT/'ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py'

def git_blob(data:bytes)->str:
 h=hashlib.sha1(); h.update(f'blob {len(data)}\0'.encode('ascii')); h.update(data); return h.hexdigest()

assert git_blob(V1.read_bytes())=='899864a8305c54c64bcc2bab6dc1f50b599b0706'
spec=importlib.util.spec_from_file_location('v84_collector',V2)
assert spec and spec.loader
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.self_test()
source=V2.read_text(encoding='utf-8');tree=ast.parse(source)
forbidden={'chmod','chown','fchmod','fchown','mkdir','makedirs','unlink','remove','rename','replace','rmdir','removedirs','truncate','write_text','write_bytes'}
for node in ast.walk(tree):
 if isinstance(node,ast.Call):
  fn=node.func
  if isinstance(fn,ast.Attribute) and fn.attr in forbidden:raise AssertionError('mutating call: '+fn.attr)
  if isinstance(fn,ast.Name) and fn.id in forbidden:raise AssertionError('mutating call: '+fn.id)
for value in [
 "MARKER='VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2'",
 "EVIDENCE_MARKER='VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2'",
 "socket_chain=ancestors(sp)","'retained_ancestor_count':len(sap)",
 "'retained_ancestors_root_owned':all(x.st_uid==0 for x in sap)",
 "'retained_ancestors_group_other_writable':any(stat.S_IMODE(x.st_mode)&0o022 for x in sap)",
 "'training_uid_rename_unlink_denied':not can_write(lstat_direct(sp.parent,'dir'),training.pw_uid,tg)",
 "system.posix_acl_access","CLOCK_BOOTTIME","'/usr/bin/systemctl','show'",
 "'/usr/bin/systemctl','--version'","'/usr/bin/busctl','--system','get-property'",
 "'org.freedesktop.systemd1.Manager','Version'","'/usr/bin/pkcheck'","'--process'",
 "'--system-bus-name'","parse_busctl_unique_names","system_bus_sender_snapshot",
 "system_bus_sender_evidence","actual_system_bus_sender_checks_required",
 "actual_system_bus_sender_set_stable","denial_transcript_sha256",
 "system_bus_credentials_lookup_failed",
 "training_uid_process_identity_stable_across_authorization",
 "absolute_runtime_service_control_denial_proven",
 "inherited_system_bus_descriptor_absence_required",
 "inherited_system_bus_descriptor_absence_proven",
 "'runtime_can_control_service':None",
 "MAX_SYSTEM_BUS_UNIQUE_NAMES=256","system_bus_list_oversize",
 "POLKIT_DENY_RULE_PATH=Path('/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules')",
 "POLKIT_RULE_DIRECTORIES=(Path('/etc/polkit-1/rules.d'),Path('/usr/share/polkit-1/rules.d'))",
 "expected_polkit_deny_rule","'action_id_only':True","'details_can_change_result':False",
 "'lexically_first':True","'retained_ancestors_root_owned':True",
 "'org.freedesktop.systemd1.manage-units'","'org.freedesktop.systemd1.manage-unit-files'",
 "'org.freedesktop.systemd1.reload-daemon'","'org.freedesktop.systemd1.set-environment'",
 "'set-property'","'reset-failed'","'bind-mount'","'mount-image'",
 "training_process_subject","training_process_capabilities","all_systemd_control_actions_explicitly_denied",
 "process_has_training_uid_thread","/task/","collect_training_uid_processes","training_uid_process_inventory",
 "all_training_uid_processes_capability_free",
 "training_thread_subject","training_process_thread_inventory",
 "all_training_uid_threads_capability_free","training_uid_thread_count",
 "training_uid_thread_sets_stable","thread_inventory_sha256",
 "training_uid_process_set_stable","training_uid_processes",
 "REVIEWED_SYSTEMD_PACKAGE_VERSIONS=('255.4-1ubuntu8.11',)",
 "parse_systemd_bus_owner_pid","GetConnectionUnixProcessID",
 "systemd_bus_owner_pid_is_pid1","reviewed_systemd_package_version",
 "runtime_can_control_service':control['runtime_can_control_service']","--training-pid",
]:
 assert value in source,value
low=source.lower()
for value in [' systemctl start ',' systemctl stop ',' systemctl restart ','useradd','groupadd','usermod','setfacl','mount ','umount ','signtransaction','eth_sendrawtransaction']:
 assert value not in low,value
assert mod.EVIDENCE_MARKER=='VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2'
assert mod.MARKER=='VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2'
assert source.count("def parse_installed_systemd_version_line") == 1
assert source.count("def parse_running_systemd_manager_version") == 1
assert source.count("def training_process_subject") == 1
assert source.count("def process_has_training_uid_thread") == 1
assert source.count("def collect_training_uid_processes") == 1
assert source.count("def training_uid_process_inventory") == 1
assert source.count("def system_bus_sender_snapshot") == 1
assert source.count("def system_bus_sender_evidence") == 1
assert source.count("def pkcheck_bus_denial") == 1
assert source.count("def training_thread_subject") == 1
assert source.count("def training_process_thread_inventory") == 1
assert source.count("def zero_capability_credentials") == 1
assert source.count("def parse_systemd_bus_owner_pid") == 1
assert source.count("def service_control_evidence") == 1
assert "process['subject']" not in source
assert source.count("def collect(a)") == 1
assert source.count("if __name__=='__main__':raise SystemExit(main())") == 1
assert source.rstrip().endswith("if __name__=='__main__':raise SystemExit(main())")
assert mod.REVIEWED_SYSTEMD_MAJOR==255
assert mod.classify_pkcheck_status(1)=='denied'
assert mod.classify_pkcheck_status(0)=='authorized'
assert mod.classify_pkcheck_status(2)=='challenge'
assert mod.classify_pkcheck_status(3)=='dismissed'
assert mod.classify_pkcheck_status(127)=='error'
installed=mod.parse_installed_systemd_version_line('systemd 255 (255.4-1ubuntu8.11)')
running=mod.parse_running_systemd_manager_version('s "255.4-1ubuntu8.11"')
owner=mod.parse_systemd_bus_owner_pid('u 1')
assert installed['installed_systemd_major']==255
assert installed['installed_systemd_package_version']=='255.4-1ubuntu8.11'
assert running['running_systemd_manager_major']==255
assert running['running_systemd_manager_version']=='255.4-1ubuntu8.11'
assert owner['systemd_bus_owner_pid']==1
assert owner['systemd_bus_owner_pid_is_pid1'] is True
assert mod.parse_busctl_unique_names(
 ':1.42 4242 python zoso :1.42 user@1000.service - - fixture\n'
 ':1.7  7 dbus root :1.7 dbus.service - - fixture\n'
)==[':1.42',':1.7']
try:
 mod.parse_busctl_unique_names(
  ''.join(f':1.{i} 1 proc user :1.{i} unit - - fixture\n' for i in range(257))
 )
except mod.Hold:
 pass
else:
 raise AssertionError('oversize system-bus census unexpectedly admitted')
class FailedBusCall:
 returncode=1
 stdout=''
 stderr='name vanished'
original_run_status=mod.run_status
try:
 mod.run_status=lambda args:FailedBusCall()
 try:
  mod.dbus_connection_uint32('GetConnectionUnixProcessID',':1.42')
 except mod.Hold:
  pass
 else:
  raise AssertionError('failed bus credential lookup unexpectedly ignored')
finally:
 mod.run_status=original_run_status
synthetic_status='''Name:\tfixture
Uid:\t1000\t1000\t1000\t1000
CapInh:\t0000000000000000
CapPrm:\t0000000000000000
CapEff:\t0000000000000000
CapAmb:\t0000000000000000
NoNewPrivs:\t1
'''
class Training:
 pw_uid=1000
credentials=mod.zero_capability_credentials(synthetic_status,Training())
assert credentials['uid_slots']==[1000,1000,1000,1000]
assert credentials['capabilities']=={
 'ambient':'0','effective':'0','inheritable':'0',
 'no_new_privileges':True,'permitted':'0',
}
try:
 mod.zero_capability_credentials(
  synthetic_status.replace('CapEff:\t0000000000000000','CapEff:\t0000000000000001'),
  Training(),
 )
except mod.Hold:
 pass
else:
 raise AssertionError('privileged synthetic thread unexpectedly admitted')
try:
 mod.zero_capability_credentials(
  synthetic_status.replace('Uid:\t1000\t1000\t1000\t1000','Uid:\t1000\t0\t1000\t1000'),
  Training(),
 )
except mod.Hold:
 pass
else:
 raise AssertionError('mixed-UID synthetic thread unexpectedly admitted')
inventory_calls=0
original_collect_processes=mod.collect_training_uid_processes
def drifting_process_snapshot(training):
 global inventory_calls
 inventory_calls+=1
 start='123456' if inventory_calls==1 else '123457'
 return {
  'processes':[{
   'all_threads_capability_free':True,
   'pid':4242,'start_time_ticks':start,'uid':1000,
   'uid_slots':[1000,1000,1000,1000],
   'capabilities':{
    'ambient':'0','effective':'0','inheritable':'0',
    'no_new_privileges':True,'permitted':'0',
   },
   'thread_count':1,'thread_inventory_sha256':'88'*32,
   'thread_set_stable':True,
  }],
  'thread_count':1,
 }
try:
 mod.collect_training_uid_processes=drifting_process_snapshot
 try:
  mod.training_uid_process_inventory(Training(),4242)
 except mod.Hold:
  pass
 else:
  raise AssertionError('PID-reuse/full-identity drift unexpectedly admitted')
finally:
 mod.collect_training_uid_processes=original_collect_processes
calls=[]
zero_caps={
 'ambient':'0','effective':'0','inheritable':'0',
 'no_new_privileges':True,'permitted':'0',
}
fake_inventory={
 'all_training_uid_processes_capability_free':True,
 'all_training_uid_threads_capability_free':True,
 'training_uid_process_count':1,
 'training_uid_process_identity_stable_across_authorization':True,
 'training_uid_process_set_stable':True,
 'training_uid_processes':[{
  'all_threads_capability_free':True,
  'pid':4242,'start_time_ticks':'123456','uid':1000,
  'uid_slots':[1000,1000,1000,1000],
  'capabilities':zero_caps,
  'thread_count':1,
  'thread_inventory_sha256':'88'*32,
  'thread_set_stable':True,
 }],
 'training_uid_thread_count':1,
 'training_uid_thread_sets_stable':True,
}
fake_versions={
 'installed_systemd_package_version':'255.4-1ubuntu8.11',
 'observed_systemd_version_line':'systemd 255 (255.4-1ubuntu8.11)',
 'reviewed_systemd_package_version':'255.4-1ubuntu8.11',
 'running_installed_systemd_version_match':True,
 'running_systemd_manager_major':255,
 'running_systemd_manager_version':'255.4-1ubuntu8.11',
 'systemd_bus_owner_pid':1,
 'systemd_bus_owner_pid_is_pid1':True,
}
fake_bus={
 'actual_system_bus_sender_checks_required':True,
 'actual_system_bus_sender_count':1,
 'actual_system_bus_sender_set_stable':True,
 'actual_system_bus_senders':[{
  'all_systemd_control_actions_explicitly_denied':True,
  'bus_name':':1.42',
  'checked_action_count':1+len(mod.SYSTEMD_MANAGE_UNIT_VERBS)+len(mod.SYSTEMD_GLOBAL_CONTROL_ACTIONS),
  'denial_transcript_sha256':'aa'*32,
  'pid':4242,'subject_type':'system-bus-name','uid':1000,
 }],
}
originals={
 'systemd_version_evidence':mod.systemd_version_evidence,
 'training_uid_process_inventory':mod.training_uid_process_inventory,
 'polkit_deny_rule_evidence':mod.polkit_deny_rule_evidence,
 'pkcheck_denial':mod.pkcheck_denial,
 'system_bus_sender_evidence':mod.system_bus_sender_evidence,
}
def fake_pkcheck(action_id,subject,details=()):
 calls.append((action_id,subject,details))
 return {
  'action_id':action_id,
  'details':[{'key':k,'value':v} for k,v in details],
  'exit_status':1,
  'result':'explicitly_denied',
 }
try:
 mod.systemd_version_evidence=lambda:fake_versions
 mod.training_uid_process_inventory=lambda training,pid:fake_inventory
 mod.polkit_deny_rule_evidence=lambda training:{'fixture':True}
 mod.pkcheck_denial=fake_pkcheck
 mod.system_bus_sender_evidence=lambda training,inventory,unit:fake_bus
 control=mod.service_control_evidence(Training(),4242,'void-apollyon-test.service')
finally:
 for name,value in originals.items():
  setattr(mod,name,value)
assert control['pkcheck_subject']=='4242,123456,1000'
assert control['actual_system_bus_sender_count']==1
assert control['runtime_can_control_service'] is None
assert control['absolute_runtime_service_control_denial_proven'] is False
assert control['inherited_system_bus_descriptor_absence_required'] is True
assert control['inherited_system_bus_descriptor_absence_proven'] is False
assert control['training_uid_process_identity_stable_across_authorization'] is True
assert control['actual_system_bus_senders'][0]['bus_name']==':1.42'
assert len(calls)==1+len(mod.SYSTEMD_MANAGE_UNIT_VERBS)+len(mod.SYSTEMD_GLOBAL_CONTROL_ACTIONS)
assert all(subject=='4242,123456,1000' for _,subject,_ in calls)
assert any(details and details[0][0]=='unit' for _,_,details in calls)
assert any(action=='org.freedesktop.systemd1.reload-daemon' for action,_,_ in calls)
bus_calls=[]
snapshot_calls=0
original_snapshot=mod.system_bus_sender_snapshot
original_bus_pkcheck=mod.pkcheck_bus_denial
def fake_snapshot(training,process_ids):
 global snapshot_calls
 snapshot_calls+=1
 assert process_ids=={4242}
 return [{'bus_name':':1.42','pid':4242,'uid':1000}]
def fake_bus_pkcheck(action_id,bus_name,details=()):
 bus_calls.append((action_id,bus_name,details))
 return {
  'action_id':action_id,
  'details':[{'key':k,'value':v} for k,v in details],
  'exit_status':1,
  'result':'explicitly_denied',
 }
try:
 mod.system_bus_sender_snapshot=fake_snapshot
 mod.pkcheck_bus_denial=fake_bus_pkcheck
 bus_evidence=mod.system_bus_sender_evidence(
  Training(),fake_inventory,'void-apollyon-test.service',
 )
finally:
 mod.system_bus_sender_snapshot=original_snapshot
 mod.pkcheck_bus_denial=original_bus_pkcheck
assert snapshot_calls==2
assert bus_evidence['actual_system_bus_sender_count']==1
assert bus_evidence['actual_system_bus_sender_set_stable'] is True
assert bus_evidence['actual_system_bus_senders'][0]['subject_type']=='system-bus-name'
assert len(bus_calls)==1+len(mod.SYSTEMD_MANAGE_UNIT_VERBS)+len(mod.SYSTEMD_GLOBAL_CONTROL_ACTIONS)
assert all(name==':1.42' for _,name,_ in bus_calls)
assert mod.REVIEWED_SYSTEMD_PACKAGE_VERSIONS==('255.4-1ubuntu8.11',)
try:
 mod.parse_installed_systemd_version_line('systemd 255 (255.4-1ubuntu8.12)')
except mod.Hold:
 pass
else:
 raise AssertionError('unreviewed systemd package unexpectedly admitted')
try:
 mod.parse_systemd_bus_owner_pid('u 2')
except mod.Hold:
 pass
else:
 raise AssertionError('non-PID1 systemd bus owner unexpectedly admitted')
rule=mod.expected_polkit_deny_rule('zoso').decode('utf-8')
for action in (
 'org.freedesktop.systemd1.manage-units',
 'org.freedesktop.systemd1.manage-unit-files',
 'org.freedesktop.systemd1.reload-daemon',
 'org.freedesktop.systemd1.set-environment',
):
 assert f'action.id === "{action}"' in rule
assert 'polkit.message' not in rule
assert 'polkit.gettext_domain' not in rule
assert 'action.lookup' not in rule
assert 'subject.user === "zoso"' in rule
assert 'return polkit.Result.NO;' in rule
assert [str(x) for x in mod.ancestors(Path('/run/void-apollyon'))]==['/run','/']
print('VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2_PROOF_GREEN')
print('historical_v83_collector_unchanged=true')
print('read_only=true')
print('socket_parent_retained_ancestor_collection=true')
print('socket_parent_additional_acl_checks=true')
print('socket_parent_training_rename_unlink_observed=true')
print('training_pid_starttime_uid_bound=true')
print('explicit_pkcheck_denial_required=true')
print('exact_action_id_only_polkit_deny_rule=true')
print('polkit_message_details_irrelevant_by_rule=true')
print('polkit_deny_rule_lexically_first=true')
print('systemd_control_surface_reviewed_major=255')
print('running_systemd_manager_version_bound=true')
print('running_installed_systemd_version_match_required=true')
print('training_process_capabilities_zero_required=true')
print('training_process_no_new_privileges_required=true')
print('all_training_uid_processes_capability_free_required=true')
print('all_training_uid_threads_capability_free_required=true')
print('training_uid_thread_inventory_double_snapshot=true')
print('training_uid_thread_inventory_digest_bound=true')
print('service_control_bound_subject_execution_test=true')
print('training_uid_discovery_scans_every_thread=true')
print('actual_system_bus_sender_subject_test=true')
print('actual_system_bus_sender_set_stability_required=true')
print('inherited_system_bus_descriptor_absence_required=true')
print('inherited_system_bus_descriptor_absence_proven=false')
print('absolute_runtime_service_control_denial_proven=false')
print('runtime_can_control_service=unknown')
print('system_bus_unique_name_census_bounded=true')
print('training_uid_process_full_identity_double_snapshot=true')
print('system_bus_credential_lookup_fail_closed=true')
print('training_uid_process_set_stability_required=true')
print('systemd_bus_owner_pid_is_pid1_required=true')
print('reviewed_systemd_package_version=255.4-1ubuntu8.11')
print('live_host_qualification_performed=false')
print('host_mutation=false')
print('service_action=false')
print('operator_private_key_access=false')
print('attempt_claim=false')
print('training_execution=false')
