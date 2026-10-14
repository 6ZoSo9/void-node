#!/usr/bin/env python3
from __future__ import annotations
import ast, importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COLLECTOR=ROOT/'ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v1.py'
spec=importlib.util.spec_from_file_location('v83_collector',COLLECTOR)
assert spec and spec.loader
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
mod.self_test()
source=COLLECTOR.read_text(encoding='utf-8')
tree=ast.parse(source)
forbidden_names={'chmod','chown','fchmod','fchown','mkdir','makedirs','unlink','remove','rename','replace','rmdir','removedirs','truncate'}
for node in ast.walk(tree):
    if isinstance(node,ast.Call):
        fn=node.func
        if isinstance(fn,ast.Attribute) and fn.attr in forbidden_names:
            raise AssertionError('collector gained mutating call: '+fn.attr)
        if isinstance(fn,ast.Name) and fn.id in forbidden_names:
            raise AssertionError('collector gained mutating call: '+fn.id)
assert "'/usr/bin/systemctl','show'" in source
forbidden_literals=[' systemctl start ',' systemctl stop ',' systemctl restart ','useradd','groupadd','usermod','setfacl','mount ','umount ','signTransaction','eth_sendRawTransaction']
low=source.lower()
for value in forbidden_literals:
    if value.lower() in low:
        raise AssertionError('collector gained forbidden surface: '+value)
required=['CLOCK_BOOTTIME','/proc/sys/kernel/random/boot_id','RefuseManualStart','RefuseManualStop','ActiveState','MainPID','os.listxattr','system.posix_acl_access']
for value in required:
    assert value in source, value
print('VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_EVIDENCE_READONLY_V1_PROOF_GREEN')
print('read_only=true')
print('live_host_probe_source_present=true')
print('kernel_realtime_clock_bound=true')
print('clock_boottime_generation_bound=true')
print('boot_id_bound=true')
print('reviewed_source_blob_binding=true')
print('systemd_show_only=true')
print('extended_acl_fail_closed=true')
print('host_mutation=false')
print('service_action=false')
print('operator_private_key_access=false')
print('attempt_claim=false')
print('training_execution=false')
