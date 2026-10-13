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
 "POLKIT_DENY_RULE_PATH=Path('/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules')",
 "POLKIT_RULE_DIRECTORIES=(Path('/etc/polkit-1/rules.d'),Path('/usr/share/polkit-1/rules.d'))",
 "expected_polkit_deny_rule","'action_id_only':True","'details_can_change_result':False",
 "'lexically_first':True","'retained_ancestors_root_owned':True",
 "'org.freedesktop.systemd1.manage-units'","'org.freedesktop.systemd1.manage-unit-files'",
 "'org.freedesktop.systemd1.reload-daemon'","'org.freedesktop.systemd1.set-environment'",
 "'set-property'","'reset-failed'","'bind-mount'","'mount-image'",
 "training_process_subject","training_process_capabilities","all_systemd_control_actions_explicitly_denied",
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
assert source.count("def service_control_evidence") == 1
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
assert installed['installed_systemd_major']==255
assert installed['installed_systemd_package_version']=='255.4-1ubuntu8.11'
assert running['running_systemd_manager_major']==255
assert running['running_systemd_manager_version']=='255.4-1ubuntu8.11'
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
print('live_host_qualification_performed=false')
print('host_mutation=false')
print('service_action=false')
print('operator_private_key_access=false')
print('attempt_claim=false')
print('training_execution=false')
