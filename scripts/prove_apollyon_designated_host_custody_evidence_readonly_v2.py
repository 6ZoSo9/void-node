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
]:
 assert value in source,value
low=source.lower()
for value in [' systemctl start ',' systemctl stop ',' systemctl restart ','useradd','groupadd','usermod','setfacl','mount ','umount ','signtransaction','eth_sendrawtransaction']:
 assert value not in low,value
assert mod.EVIDENCE_MARKER=='VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2'
assert mod.MARKER=='VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2'
assert [str(x) for x in mod.ancestors(Path('/run/void-apollyon'))]==['/run','/']
print('VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V2_PROOF_GREEN')
print('historical_v83_collector_unchanged=true')
print('read_only=true')
print('socket_parent_retained_ancestor_collection=true')
print('socket_parent_additional_acl_checks=true')
print('socket_parent_training_rename_unlink_observed=true')
print('live_host_qualification_performed=false')
print('host_mutation=false')
print('service_action=false')
print('operator_private_key_access=false')
print('attempt_claim=false')
print('training_execution=false')
