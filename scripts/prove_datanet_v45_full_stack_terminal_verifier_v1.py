#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Independent, generation-bound terminal verifier for one V45 node artifact."""
from __future__ import annotations

import argparse
import ast
import copy
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import stat
import subprocess
import sys
import types
import time

REPO = (Path(os.environ["VOID_V45_SOURCE_ROOT"]) if "VOID_V45_SOURCE_ROOT" in os.environ else Path(__file__).resolve().parents[1])
FIXTURE = REPO / "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
PARENT_HEAD = "d73512174afd4f1f0f2591b11ae6bb9955e203ba"
CANDIDATE_MARKER = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CANDIDATE_V1_GREEN"
CONTROLS_MARKER = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CONTROLS_V1_GREEN"
AGGREGATE_MARKER = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_AGGREGATE_V2_GREEN"
PRODUCER_CONTROL_MARKER = "VOID_DATANET_V45_PRODUCER_SUBSTITUTION_CONTROL_V1_GREEN"
TERMINAL_ABA_MARKER = "VOID_DATANET_V45_TERMINAL_ABA_CONTROL_V1_GREEN"
RUNTIME_MARKER = "VOID_DATANET_V45_RUNTIME_INVENTORY_V1_GREEN"
STATIC_MARKER = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_COMPOSITION_STATIC_V1_GREEN"
SOURCE_EXECUTION_MARKER = "VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN"
SOURCE_ABA_MARKER = "VOID_DATANET_V45_SOURCE_GENERATION_ABA_CONTROL_V1_GREEN"
SOURCE_SUPERVISOR = "scripts/prove_datanet_v45_source_execution_v1.py"
PHASE_CONTROL_MARKER = "VOID_DATANET_V45_PHASE_OUTPUT_CONTROL_V1_GREEN"
PHASE_CONTRACT_ID = "VOID_DATANET_V45_EXACT_PHASE_ARGV_AND_OUTPUT_CONTRACT_V1"



_CUSTODY_ACCESS = None

def custody_access():
    global _CUSTODY_ACCESS
    if _CUSTODY_ACCESS is None:
        path = REPO / "scripts/datanet_v45_custody_session_v1.py"
        module = types.ModuleType("void_v45_custody_inputs")
        module.__file__ = str(path)
        exec(compile(path.read_bytes(),str(path),"exec"),module.__dict__)
        _CUSTODY_ACCESS = module
    return _CUSTODY_ACCESS


def custody_artifact_open(path: Path, *, control_snapshot: bool=False) -> int:
    return custody_access().borrowed_open(path,control_snapshot=control_snapshot)


def custody_artifact_read(path: Path) -> bytes:
    fd=custody_artifact_open(path)
    try:return custody_access().read_fd(fd)
    finally:os.close(fd)


class TerminalHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def demand(condition: bool, code: str) -> None:
    if not condition:
        raise TerminalHold(code)


def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()



def verify_owned_resource_ledger(ledger: dict) -> None:
    """Recompute recorded scoped totals; never promote samples to a full census."""
    code = 'HOLD_V45_RESOURCE_LEDGER_INVALID'
    def check(ok):
        if not ok: raise ValueError(code)
    def integer(v):return type(v) is int and v >= 0
    check(type(ledger) is dict)
    expected_keys = {'format','scope','capture_complete_for_scope','whole_case_complete',
        'full_job_process_census','exact_peak_live_processes','exact_peak_live_fds',
        'scm_rights_descriptor_transfers','whole_case_retry_count','whole_case_syscalls',
        'syscall_arch','tasks','totals','syscall_histogram','limits','refusal','elapsed_ns',
        'ordered_event_count','ordered_event_sha256','stream_bindings','excluded',
        'fd_measurement','byte_measurement','ledger_sha256'}
    check(set(ledger) == expected_keys)
    check(ledger['format']=='VOID_V45_OWNED_SYSCALL_LEDGER_V1'
        and ledger['scope']=='owned_tree_from_initial_exec_stop_to_terminal_wait'
        and ledger['syscall_arch']=='linux-x86_64'
        and type(ledger['capture_complete_for_scope']) is bool
        and ledger['whole_case_complete'] is False and ledger['full_job_process_census'] is False)
    check(all(ledger[k] is None for k in ('exact_peak_live_processes','exact_peak_live_fds',
        'scm_rights_descriptor_transfers','whole_case_retry_count','whole_case_syscalls')))
    check(ledger['excluded']==['pre-initial-exec setup','observer/custodian','supervisor',
        'test driver and consumers','external stream holders','cleanup after refusal'])
    check(ledger['fd_measurement']=='per_task_stopped_samples_not_global_peak'
        and ledger['byte_measurement']=='successful_scalar_io_syscall_return_bytes_not_unique_bytes_or_storage_io')
    def h(value):return hashlib.sha256((json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()).hexdigest()
    body=dict(ledger);seal=body.pop('ledger_sha256');check(type(seal) is str and seal==h(body))
    check(integer(ledger['elapsed_ns']) and integer(ledger['ordered_event_count'])
        and type(ledger['ordered_event_sha256']) is str
        and len(ledger['ordered_event_sha256'])==64
        and all(ch in '0123456789abcdef' for ch in ledger['ordered_event_sha256']))
    tasks=ledger['tasks'];totals=ledger['totals'];limits=ledger['limits'];streams=ledger['stream_bindings']
    check(type(tasks) is list and len(tasks)<=64 and type(totals) is dict
        and type(limits) is dict and type(streams) is dict)
    maximum={'syscall_stops':200000,'tasks':64,'fd_sample':4096,'returned_io_bytes':1073741824}
    check(set(limits)==set(maximum) and all(type(v) is int and 1<=v<=maximum[k] for k,v in limits.items()))
    histogram={};pids=set();root=0
    fields=('syscall_entries','syscall_exits','entry_without_exit_at_termination',
            'inherited_return_stops','successful_execs')
    sums={k:0 for k in fields}
    pending=0
    for row in tasks:
        check(type(row) is dict)
        core={'pid','starttime_ticks','parent_pid','initial_root','exited','successful_execs',
            'syscall_entries','syscall_exits','entry_without_exit_at_termination','inherited_return_stops',
            'fd_samples','fd_sample_peak','syscalls','allow_initial_return'}
        check(type(row.get('exited')) is bool)
        check(set(row)==core|({'wait_status','pending_at_exit'} if row['exited'] else {'pending'}))
        check(type(row['pid']) is int and row['pid']>0 and row['pid'] not in pids
            and type(row['starttime_ticks']) is int and row['starttime_ticks']>0
            and type(row['parent_pid']) is int and row['parent_pid']>0)
        check(type(row['initial_root']) is bool and type(row['allow_initial_return']) is bool)
        root+=row['initial_root'];pids.add(row['pid'])
        check(all(integer(row[k]) for k in (*fields,'fd_samples','fd_sample_peak')))
        check(row['inherited_return_stops']<=1)
        check(type(row['syscalls']) is dict)
        local_entries=local_exits=0
        for nr,bucket in row['syscalls'].items():
            check(type(nr) is str and nr.isdecimal() and str(int(nr))==nr and int(nr)<0x40000000)
            check(type(bucket) is dict and set(bucket)=={'entries','exits','errors','read_return_bytes','write_return_bytes'}
                and all(integer(x) for x in bucket.values())
                and bucket['errors']<=bucket['exits']<=bucket['entries'])
            local_entries+=bucket['entries'];local_exits+=bucket['exits']
            target=histogram.setdefault(nr,{k:0 for k in bucket})
            for k,v in bucket.items():target[k]+=v
        check(local_entries==row['syscall_entries'] and local_exits==row['syscall_exits'])
        open_nr=row['pending_at_exit'] if row['exited'] else row['pending']
        check(open_nr is None or integer(open_nr))
        check(row['syscall_entries']==row['syscall_exits']+int(open_nr is not None))
        check(row['entry_without_exit_at_termination']==(int(open_nr is not None) if row['exited'] else 0))
        if not row['exited']:pending+=int(open_nr is not None)
        if row['exited']:check(integer(row['wait_status']))
        for k in fields:sums[k]+=row[k]
    check(root==int(bool(tasks)))
    check(all(r['initial_root'] or r['parent_pid'] in pids for r in tasks))
    check(histogram==ledger['syscall_histogram'])
    for stream,binding in streams.items():
        check(type(stream) is str and type(binding) is dict and set(binding)=={'bytes','sha256'} and integer(binding['bytes']))
        check(binding['sha256'] is None or (type(binding['sha256']) is str and len(binding['sha256'])==64
            and all(ch in '0123456789abcdef' for ch in binding['sha256'])))
    derived={**sums,'task_lifetimes':len(tasks),'task_exits':sum(r['exited'] for r in tasks),
        'read_return_bytes':sum(b['read_return_bytes'] for b in histogram.values()),
        'write_return_bytes':sum(b['write_return_bytes'] for b in histogram.values()),
        'captured_stream_bytes':sum(b['bytes'] for b in streams.values()),
        'max_task_fd_sample':max((r['fd_sample_peak'] for r in tasks),default=0)}
    check(set(totals)==set(derived)|{'syscall_stops','task_event_outstanding_peak'}
        and all(integer(v) for v in totals.values()) and all(totals[k]==v for k,v in derived.items()))
    check(int(bool(tasks))<=totals['task_event_outstanding_peak']<=len(tasks))
    accounted=sums['syscall_entries']+sums['syscall_exits']+sums['inherited_return_stops']
    refusal=ledger['refusal']
    check(refusal is None or type(refusal) is dict)
    # A limit-triggering syscall stop is counted before its detailed bucket is
    # processed. It is explicit partial telemetry, not a silently lost event.
    check(totals['syscall_stops']==accounted+int(refusal is not None and refusal.get('metric')=='syscall_stops'))
    if refusal is not None:
        check(type(refusal) is dict and set(refusal)=={'metric','observed','limit'}
            and refusal['metric'] in limits and type(refusal['observed']) is int
            and refusal['observed']>refusal['limit']==limits[refusal['metric']])
    if ledger['capture_complete_for_scope']:
        check(refusal is None and all(r['exited'] for r in tasks) and bool(tasks)
            and all(b['sha256'] is not None for b in streams.values()))
        check(totals['syscall_stops']<=limits['syscall_stops'] and len(tasks)<=limits['tasks']
            and totals['max_task_fd_sample']<=limits['fd_sample']
            and totals['read_return_bytes']+totals['write_return_bytes']<=limits['returned_io_bytes'])


def verify_observed_producer_receipt(obj: dict) -> None:
    """Check observed evidence consistency; require the caller's live/log custody too."""
    code = 'HOLD_V45_SOURCE_OBSERVED_PRODUCER'
    obs = obj.get('producer_observation')
    demand(type(obs) is dict and obs.get('status') == 'VERIFIED', code)
    if 'resource_ledger' in obs:
        ledger = obs['resource_ledger']
        try:
            verify_owned_resource_ledger(ledger)
        except (ValueError, TypeError, KeyError):
            demand(False, 'HOLD_V45_RESOURCE_LEDGER_INVALID')
        demand(ledger['capture_complete_for_scope'] is True
            and ledger['stream_bindings'] == obs.get('stream_bindings')
            and ledger['totals']['task_lifetimes'] == obs.get('observed_task_count')
            and ledger['totals']['task_exits'] == obs.get('observed_task_exits')
            and ledger['totals']['successful_execs'] == obs.get('observed_subtree_exec_count')
            and ledger['tasks'][0]['pid'] == obs.get('producer',{}).get('pid')
            and ledger['tasks'][0]['starttime_ticks'] == obs.get('producer',{}).get('starttime_ticks'),
            'HOLD_V45_RESOURCE_LEDGER_BINDING')
    helper_profile = obs.get('trace_policy') == 'OWNED_TREE_READONLY_HELPERS_V1'
    retained_static_profile = obs.get('trace_policy') == 'OWNED_TREE_RETAINED_SNAPSHOT_SINGLE_EXEC_V1'
    selftest_profile = obs.get('trace_policy') == 'OWNED_ROOT_SELFTEST_SUBREAPER_V1'
    runner_profile = obs.get('trace_policy') == 'OWNED_ROOT_PRIVILEGED_RUNNER_SUBREAPER_V1'
    demand(helper_profile == (obj.get('phase') in ('v45-static','runtime','candidate-aba','candidate')), code)
    demand(retained_static_profile == (obj.get('phase') in ('v41-static','v42-static','v43-static','v44-static')), code)
    demand(selftest_profile == (obj.get('phase') == 'custody-selftest'), code)
    demand(runner_profile == (obj.get('phase') == 'runner'), code)
    demand(sum((helper_profile, retained_static_profile, selftest_profile, runner_profile)) <= 1, code)
    if helper_profile:
        verify_readonly_helper_observation(obs)
    if retained_static_profile:
        demand(obs.get('source_profile') == 'retained-static', code)
    elif selftest_profile:
        demand(obs.get('source_profile') == 'retained-selftest', code)
    elif runner_profile:
        demand(obs.get('source_profile') == 'sealed-stdin-runner', code)
    else:
        demand(obs.get('source_profile') == 'sealed-copy', code)
    if selftest_profile or runner_profile:
        demand(obs.get('descendant_execs_observed_by_outer_custodian') is False
              and obs.get('terminal_subreaper_retirement_required') is True
              and obs.get('terminal_subreaper_empty') is True
              and obs.get('observed_subtree_exec_count_scope') == 'outer_owned_root_only', code)
    if runner_profile:
        root_exec=obs.get('root_executable')
        wrappers=obs.get('prebound_wrapper_executables')
        demand(obs.get('inherited_foreground_process_group') is True
              and obs.get('isolated_process_group_same_session') is False
              and type(obs.get('controlling_tty_foreground_group_verified')) is bool
              and obs.get('preauth_before_inner_strace_source_bound') is True
              and obs.get('preauth_same_sudo_created_pty_required') is True
              and obs.get('nested_storage_sudo_noninteractive_source_bound') is True
              and type(root_exec) is dict and root_exec.get('path') == '/usr/bin/timeout'
              and type(root_exec.get('identity')) is list and len(root_exec['identity']) == 9
              and type(root_exec.get('sha256')) is str and re.fullmatch(r'[0-9a-f]{64}',root_exec['sha256'])
              and type(wrappers) is list
              and [row.get('path') for row in wrappers] == ['/usr/bin/sudo','/usr/bin/bash','/usr/bin/setpriv','/usr/bin/strace','/usr/bin/env']
              and all(type(row.get('identity')) is list and len(row['identity']) == 9
                      and type(row.get('sha256')) is str and re.fullmatch(r'[0-9a-f]{64}',row['sha256'])
                      and type(row.get('setid_bits')) is int and 0 <= row['setid_bits'] <= 0o6000
                      for row in wrappers), code)
    flags = ('producer_identity_independently_verified', 'producer_exec_observed',
             'producer_output_capability_coupled', 'producer_subtree_retired')
    expected_scope = ('direct_v45_python_readonly_helpers_owned_tree_and_stream_retirement'
        if helper_profile else 'custody_selftest_owned_root_and_terminal_subreaper_retirement'
        if selftest_profile else 'privileged_runner_owned_root_and_terminal_subreaper_retirement'
        if runner_profile else 'inherited_v41_v44_static_retained_snapshot_owned_tree_and_stream_retirement'
        if retained_static_profile else 'direct_v45_python_single_exec_owned_tree_and_stream_retirement')
    demand(all(obs.get(k) is True and obj.get(k) is True for k in flags)
          and obs.get('output_streams_retired') is True and obs.get('cleanup_complete') is True
          and obs.get('producer_returncode') == 0
          and obj.get('supervisor_reported_producer_metadata') is None
          and 'supervisor_reported_producer_metadata' in obj
          and obj.get('producer_observation_scope') == expected_scope
          and obj.get('stdout_captured_by_supervisor') is False
          and obj.get('stdout_captured_by_custodian') is True, code)
    expected_exec_observation = ('PTRACE_OWNED_TREE_UNTIL_EXIT_READONLY_HELPERS_V1'
        if helper_profile else 'PTRACE_OWNED_ROOT_SELFTEST_WITH_SUBREAPER_RETIREMENT_V1'
        if selftest_profile else 'PTRACE_OWNED_ROOT_RUNNER_WITH_SUBREAPER_RETIREMENT_V1'
        if runner_profile else 'PTRACE_OWNED_TREE_UNTIL_EXIT_RETAINED_SNAPSHOT_SINGLE_EXEC_V1'
        if retained_static_profile else 'PTRACE_OWNED_TREE_UNTIL_EXIT_SINGLE_EXEC_V1')
    expected_trace_policy = ('OWNED_TREE_READONLY_HELPERS_V1'
        if helper_profile else 'OWNED_ROOT_SELFTEST_SUBREAPER_V1'
        if selftest_profile else 'OWNED_ROOT_PRIVILEGED_RUNNER_SUBREAPER_V1'
        if runner_profile else 'OWNED_TREE_RETAINED_SNAPSHOT_SINGLE_EXEC_V1'
        if retained_static_profile else 'OWNED_TREE_SINGLE_EXEC_V1')
    demand(obs.get('context') == {k: obj.get(k) for k in ('head','tree','node_major','run_id','run_attempt')}
          and obs.get('phase') == obj.get('phase')
          and obs.get('exec_observation') == expected_exec_observation
          and all(obs.get(k) is False for k in ('full_job_process_census',
                   'nested_producer_prebinding_proved','full_campaign_accepted','workflow_integration_complete')), code)
    demand(obs.get('producer_exec_lifetime_verified') is True
          and obs.get('trace_policy') == expected_trace_policy
          and type(obs.get('unadmitted_exec_count')) is int and obs['unadmitted_exec_count'] == 0
          and type(obs.get('observed_subtree_exec_count')) is int
          and obs['observed_subtree_exec_count'] == ({'v45-static':6,'runtime':6,'candidate-aba':2,'candidate':9}.get(obj.get('phase'),1) if helper_profile else 1)
          and type(obs.get('observed_task_count')) is int
          and ((obs['observed_task_count'] == 1) if (selftest_profile or runner_profile)
               else (1 <= obs['observed_task_count'] <= 64))
          and type(obs.get('observed_task_exits')) is int and obs['observed_task_exits'] == obs['observed_task_count']
          and type(obs.get('trace_wait_events')) is int and 1 <= obs['trace_wait_events'] <= 4096, code)
    process = obs.get('producer'); reported = obj.get('producer')
    demand(type(process) is dict and type(reported) is dict, code)
    demand(type(process.get('pid')) is int and process['pid'] > 0
          and type(process.get('starttime_ticks')) is int and process['starttime_ticks'] > 0
          and type(obs.get('custodian_pid')) is int and obs['custodian_pid'] > 0
          and process.get('ppid') == obs['custodian_pid'] == obj.get('custody_verifier_pid')
          and process['pid'] == reported.get('pid') and process['pid'] != obs['custodian_pid']
          and reported.get('returncode') == 0, code)
    argv = obs.get('executed_argv')
    demand(type(argv) is list and all(type(a) is str for a in argv)
          and obs.get('argv_sha256') == sha256(canonical({'argv': argv}))
          == obj.get('resolved_argv_sha256') == reported.get('argv_sha256')
          and obs.get('source_sha256') == obj.get('entrypoint',{}).get('sha256')
          == reported.get('source_sha256'), code)
    outputs = obj.get('created_output_bindings'); roles = obs.get('role_streams'); streams = obs.get('stream_bindings')
    demand(type(outputs) is list and type(roles) is dict and type(streams) is dict
          and all(type(row) is dict and type(row.get('role')) is str for row in outputs)
          and set(roles) == {row['role'] for row in outputs}, code)
    for row in outputs:
        demand(roles[row['role']] in streams
              and streams[roles[row['role']]] == {k: row.get(k) for k in ('bytes','sha256')}, code)
    demand(streams.get('stdout') == {k:obj.get('stdout_binding',{}).get(k) for k in ('bytes','sha256')}, code)


def verify_readonly_helper_observation(obs: dict) -> None:
    """Internal plan/trace consistency; the caller must also require live/log custody."""
    code = 'HOLD_V45_SOURCE_OBSERVED_PRODUCER'
    demand(type(obs.get('producer')) is dict and type(obs['producer'].get('pid')) is int, code)
    plan = obs.get('helper_plan'); records = obs.get('helper_execs')
    demand(type(plan) is dict and set(plan) == {'format','phase','rows'}
         and plan['format'] == 'VOID_V45_READONLY_HELPER_PLAN_V1'
         and plan['phase'] == obs.get('phase')
         and obs.get('helper_plan_sha256') == sha256(canonical(plan))
         and obs.get('readonly_helper_plan_completed') is True, code)
    rows = plan['rows']
    queries = [['git','rev-parse','HEAD'], ['git','rev-parse','HEAD^{tree}'],
               ['git','ls-tree','-r','--full-tree','HEAD']]
    control = ['git','rev-parse','HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json']
    if obs['phase'] == 'runtime':
        requests = [control, ['node','--version'], *queries]
    elif obs['phase'] == 'candidate-aba':
        requests = [control]
    elif obs['phase'] == 'candidate':
        requests = [control, ['node','--version'], *queries, *queries]
    else:
        demand(obs['phase'] == 'v45-static' and type(rows[-1]) is dict, code)
        request = rows[-1].get('requested_argv')
        demand(type(request) is list and len(request) == 3 and type(request[2]) is str
             and Path(request[2]).is_absolute() and '..' not in Path(request[2]).parts
             and request[2].endswith('/scripts/run_datanet_v45_full_stack_ext4_v1.sh'), code)
        requests = [control, *queries, ['bash','-n',request[2]]]
    demand(type(rows) is list and len(rows) == len(requests)
         and type(records) is list and len(records) == len(requests), code)
    pids = set(); executable_bindings = {}
    for i, (row, record, expected) in enumerate(zip(rows, records, requests)):
        demand(type(row) is dict and set(row) == {'index','requested_argv','executed_argv',
            'executable_fd','executable_identity','executable_sha256','input_bindings','pass_fds'}
            and type(row['index']) is int and row['index'] == i and row['requested_argv'] == expected
            and type(row['executable_fd']) is int and row['executable_fd'] >= 3, code)
        fd = row['executable_fd']; argv = [f'/proc/self/fd/{fd}', *expected[1:]]
        bindings = row['input_bindings']; passes = [fd]
        demand(type(bindings) is list, code)
        if expected[0] == 'bash':
            demand(len(bindings) == 1 and type(bindings[0]) is dict, code)
            inp = bindings[0]
            demand(set(inp) == {'fd','sha256','bytes','identity','seals'} and type(inp['seals']) is int and inp['seals'] == 15 and type(inp['fd']) is int
                 and inp['fd'] >= 3 and inp['fd'] != fd and type(inp['bytes']) is int
                 and inp['bytes'] > 0
                 and inp['sha256'] == sha256((REPO/'scripts/run_datanet_v45_full_stack_ext4_v1.sh').read_bytes()), code)
            demand(type(inp['identity']) is list and len(inp['identity']) == 9
                 and all(type(v) is int for v in inp['identity']) and inp['identity'][3] == 0
                 and inp['identity'][6] == inp['bytes'] and stat.S_ISREG(inp['identity'][2]), code)
            argv[2] = f'/proc/self/fd/{inp["fd"]}'; passes.append(inp['fd'])
        else:
            demand(bindings == [], code)
        demand(row['executed_argv'] == argv and row['pass_fds'] == passes
             and type(row['executable_identity']) is list and len(row['executable_identity']) == 9
             and all(type(v) is int for v in row['executable_identity'])
             and stat.S_ISREG(row['executable_identity'][2]) and not row['executable_identity'][2] & 0o6000
             and 0 < row['executable_identity'][6] <= 256*1024*1024
             and type(row['executable_sha256']) is str
             and re.fullmatch(r'[0-9a-f]{64}',row['executable_sha256']) is not None, code)
        demand(type(record) is dict and set(record) == {'index','pid','parent_pid','starttime_ticks',
             'executable_sha256','argv_sha256','environment_sha256','returncode'}
             and type(record['index']) is int and record['index'] == i
             and type(record['pid']) is int and record['pid'] > 0 and record['pid'] not in pids
             and record['pid'] != obs['producer']['pid']
             and record['parent_pid'] == obs['producer']['pid']
             and type(record['starttime_ticks']) is int and record['starttime_ticks'] > 0
             and record['executable_sha256'] == row['executable_sha256']
             and record['argv_sha256'] == sha256(canonical({'argv':argv}))
             and type(record['environment_sha256']) is str
             and re.fullmatch(r'[0-9a-f]{64}',record['environment_sha256']) is not None
             and type(record['returncode']) is int and record['returncode'] == 0, code)
        binding = (fd,row['executable_identity'],row['executable_sha256'])
        demand(expected[0] not in executable_bindings or executable_bindings[expected[0]] == binding, code)
        executable_bindings[expected[0]] = binding
        pids.add(record['pid'])
    demand(obs.get('observed_subtree_exec_count') == len(requests)+1 and obs.get('observed_task_count') == len(requests)+1, code)
    events = obs.get('events')
    demand(type(events) is list and all(type(e) is dict for e in events)
         and [e.get('sequence') for e in events] == list(range(1,len(events)+1)), code)
    execs = [e for e in events if e.get('event') == 'READONLY_HELPER_EXEC_OBSERVED']
    demand(execs == [{'sequence': e['sequence'], 'event':'READONLY_HELPER_EXEC_OBSERVED',
                   **{k:v for k,v in record.items() if k != 'returncode'}}
                   for e,record in zip(execs,records)] and len(execs) == len(requests), code)


def verify_owned_control_result(obj: dict) -> None:
    """Require the canonical COMMIT controls; not process attestation by self-hash."""
    code = 'HOLD_V45_REQUIRED_OWNED_CONTROLS'
    expected = ['normal', 'waited-child', 'fake-pid', 'dead-pid', 'foreign-pid', 'forged-launch-observation', 'duplicate-role', 'invalid-kind', 'nonzero-exit', 'surviving-writer', 'detached-surviving-writer', 'surviving-no-writer', 'scm-rights-held', 'scm-rights-queued', 'scm-rights-closed', 'forged-receipt-observation', 'unobserved-output', 'same-pid-reexec', 'child-fork-exec', 'grandchild-exec', 'thread-clone', 'closed-stream-reexec']
    refusals = {'fake-pid': 'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN', 'dead-pid': 'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN', 'foreign-pid': 'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN', 'forged-launch-observation': 'HOLD_V45_CUSTODY_LAUNCH_SCHEMA', 'duplicate-role': 'HOLD_V45_CUSTODY_DUPLICATE_MEMBER', 'invalid-kind': 'HOLD_V45_CUSTODY_PREPARE_SCHEMA', 'nonzero-exit': 'HOLD_V45_OBSERVED_NONZERO_EXIT', 'surviving-writer': 'HOLD_V45_OBSERVED_LIVE_DESCENDANT', 'detached-surviving-writer': 'HOLD_V45_OBSERVED_LIVE_DESCENDANT', 'surviving-no-writer': 'HOLD_V45_OBSERVED_LIVE_DESCENDANT', 'scm-rights-held': 'HOLD_V45_OBSERVED_WRITABLE_STREAM_RETAINED', 'scm-rights-queued': 'HOLD_V45_OBSERVED_WRITABLE_STREAM_RETAINED', 'forged-receipt-observation': 'HOLD_V45_CUSTODY_RECEIPT_OBSERVATION', 'unobserved-output': 'HOLD_V45_CUSTODY_UNOBSERVED_OUTPUT', 'same-pid-reexec': 'HOLD_V45_OBSERVED_UNADMITTED_EXEC', 'child-fork-exec': 'HOLD_V45_OBSERVED_UNADMITTED_EXEC', 'grandchild-exec': 'HOLD_V45_OBSERVED_UNADMITTED_EXEC', 'thread-clone': 'HOLD_V45_OBSERVED_CLONE_PROFILE', 'closed-stream-reexec': 'HOLD_V45_OBSERVED_UNADMITTED_EXEC'}
    demand(type(obj) is dict and obj.get('marker') == 'VOID_V45_OWNED_PRODUCER_COMMIT_CONTROLS_V1_GREEN'
          and obj.get('status') == 'GREEN' and obj.get('actual_custodian_state_machine') is True
          and obj.get('synthetic_context') is True and obj.get('full_campaign_accepted') is False
          and obj.get('full_workflow_integration_complete') is False
          and obj.get('harness_fd_baseline_restored') is True
          and type(obj.get('case_count')) is int and obj['case_count'] == len(expected)
          and obj.get('positive_cases') == 3 and obj.get('rejection_cases') == len(refusals), code)
    rows = obj.get('cases')
    demand(type(rows) is list and all(type(row) is dict for row in rows)
          and [row.get('case') for row in rows] == expected, code)
    for row in rows:
        name = row['case']
        demand(row.get('status') == 'PASS' and row.get('cleanup_complete') is True, code)
        if name in refusals:
            demand(row.get('rejection') == refusals[name]
                  and row.get('canonical_custodian_commit') is False
                  and row.get('canonical_custodian_export') is False
                  and row.get('canonical_consumers') == {key: 'HOLD_V45_CUSTODY_REQUIRED'
                       for key in ('candidate_mode','finalize','aggregate')}, code)
            if name not in ('forged-receipt-observation','unobserved-output'):
                demand(row.get('regular_outputs_still_empty') is True, code)
            if name in ('same-pid-reexec','child-fork-exec','grandchild-exec','closed-stream-reexec'):
                observation = row.get('observation')
                demand(row.get('kernel_exec_stop_before_replacement_execution') is True
                      and type(observation) is dict
                      and observation.get('producer_exec_lifetime_verified') is False
                      and observation.get('unadmitted_exec_count') == 1, code)
        else:
            demand(row.get('canonical_custodian_commit') is True
                  and row.get('canonical_custodian_export') is True, code)
    rpc = obj.get('rpc_identity_cases')
    demand(type(rpc) is list and len(rpc) == 3 and all(type(row) is dict for row in rpc)
          and [row.get('case') for row in rpc] == ['fake-pid','dead-pid','foreign-pid'], code)
    for row in rpc:
        demand(row.get('status') == 'PASS' and row.get('actual_serve_client_protocol') is True
              and row.get('rejection') == 'HOLD_V45_CUSTODY_CALLER_PRODUCER_FORBIDDEN'
              and row.get('custodian_session_terminated') is True
              and row.get('output_published') is False and row.get('capsule_emitted') is False, code)


def verify_readonly_helper_controls(obj: dict) -> None:
    code = 'HOLD_V45_REQUIRED_READONLY_HELPERS'
    expected = ['normal-static','normal-runtime','normal-candidate-aba','normal-candidate',
                'wrong-argv','wrong-executable','out-of-order','duplicate-helper','missing-helper',
                'extra-helper','root-helper-reexec','grandchild-helper','changed-environment',
                'changed-cwd','substituted-input']
    refusals = {'wrong-argv':'HOLD_V45_HELPER_ARGV_MISMATCH',
        'wrong-executable':'HOLD_V45_HELPER_EXECUTABLE_MISMATCH',
        'out-of-order':'HOLD_V45_HELPER_ARGV_MISMATCH',
        'duplicate-helper':'HOLD_V45_HELPER_ARGV_MISMATCH',
        'missing-helper':'HOLD_V45_HELPER_PLAN_INCOMPLETE','extra-helper':'HOLD_V45_HELPER_EXEC_COUNT',
        'root-helper-reexec':'HOLD_V45_OBSERVED_UNADMITTED_EXEC','grandchild-helper':'HOLD_V45_OBSERVED_UNADMITTED_EXEC',
        'changed-environment':'HOLD_V45_HELPER_ENVIRONMENT','changed-cwd':'HOLD_V45_HELPER_CWD_MISMATCH',
        'substituted-input':'HOLD_V45_HELPER_INPUT_MISMATCH'}
    demand(type(obj) is dict and obj.get('marker') == 'VOID_V45_READONLY_HELPER_CONTROLS_V1_GREEN'
         and obj.get('status') == 'GREEN' and type(obj.get('case_count')) is int and obj['case_count'] == len(expected)
         and obj.get('positive_cases') == 4 and obj.get('rejection_cases') == len(refusals)
         and obj.get('actual_custodian_state_machine') is True and obj.get('synthetic_context') is True
         and obj.get('full_campaign_accepted') is False and obj.get('full_workflow_integration_complete') is False, code)
    rows = obj.get('cases')
    demand(type(rows) is list and all(type(row) is dict for row in rows)
         and [row.get('case') for row in rows] == expected, code)
    for row in rows:
        demand(row.get('status') == 'PASS' and row.get('synthetic_root_writer') is True
             and row.get('actual_readonly_executables') is True and row.get('full_campaign_accepted') is False
             and type(row.get('observation')) is dict and row['observation'].get('cleanup_complete') is True, code)
        if row['case'] in refusals:
            demand(row.get('rejection') == refusals[row['case']]
                 and row.get('canonical_custodian_commit') is False and row.get('canonical_custodian_export') is False
                 and row.get('regular_outputs_still_empty') is True
                 and row.get('canonical_consumers') == {name:'HOLD_V45_CUSTODY_REQUIRED'
                     for name in ('candidate_mode','finalize','aggregate')}, code)
        else:
            demand(row.get('canonical_custodian_commit') is True and row.get('canonical_custodian_export') is True
                 and row.get('positive_consumers') == 3 and type(row.get('source_receipt')) is dict, code)
            verify_observed_producer_receipt(row['source_receipt'])


def verify_custody_control_result(obj: dict) -> None:
    verify_owned_control_result(obj.get("owned_producer_controls"))
    verify_readonly_helper_controls(obj.get("readonly_helper_controls"))
    expected = ("normal","third-role-distinct","third-role-identical","unsupported-publication",
                "paired-substitution","identical-substitution","inplace-paired-change","manifest-substitution",
                "parent-replacement","after-lend-substitution","unsealed-input","missing-custody",
                "capsule-replacement","duplicate-log-commitment","stale-attempt")
    demand(obj.get("marker")=="VOID_DATANET_V45_CUSTODY_INTEGRATION_V1_GREEN" and obj.get("status")=="GREEN"
          and obj.get("real_supervisor_run_exercised") is True and obj.get("synthetic_inputs") is True
          and obj.get("storage_campaign_executed") is False and obj.get("full_campaign_accepted") is False,
          "HOLD_V45_CUSTODY_CONTROL_RESULT")
    rows=obj.get("cases")
    demand(type(rows) is list and [r.get("case") for r in rows]==list(expected)
          and all(r.get("status")=="PASS" for r in rows),"HOLD_V45_CUSTODY_CONTROL_CASES")
    by_name={r["case"]:r for r in rows}
    for name in ("third-role-distinct","third-role-identical"):
        row=by_name[name]
        demand(row.get("rejection")=="HOLD_V45_OUTPUT_PREEXISTING" and row.get("success_receipt") is False
              and row.get("published_provisional_outputs")==2 and row.get("sentinel_preserved") is True,
              "HOLD_V45_CUSTODY_THIRD_ROLE_CONTROL")
    for name in ("third-role-distinct","third-role-identical","paired-substitution"):
        demand(by_name[name].get("canonical_consumers")=={k:"HOLD_V45_CUSTODY_REQUIRED" for k in ("candidate_mode","finalize","aggregate")},
              "HOLD_V45_CUSTODY_CONSUMER_CONTROL")


def phase_contract(phase: str, node: int) -> dict:
    py = ["python3", "-I", "-S", "-B", "@ENTRYPOINT@"]
    n, head, tree = "@NODE_MAJOR@", "@EXPECTED_HEAD@", "@EXPECTED_TREE@"
    specs = {
        "custody-selftest": {"entrypoint": "scripts/prove_datanet_v45_custody_integration_v1.py",
                             "argv": py + ["--output", "@OUTPUT@"], "stdout_suffix_equals": "OUTPUT"},
        "source-generation-aba-control": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
            "argv": ["/usr/bin/bash", "@ENTRYPOINT@"], "owned": [], "bind": [],
        },
        "v41-static": {"entrypoint": "scripts/prove_datanet_v41_static_gate_v1.py", "argv": py},
        "v42-static": {"entrypoint": "scripts/prove_datanet_v42_fsverity_clean_remount_v1.py", "argv": py + ["static"]},
        "v43-static": {"entrypoint": "scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", "argv": py + ["static"]},
        "v44-static": {"entrypoint": "scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", "argv": py + ["static"]},
        "v45-static": {"entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", "argv": py + ["static"]},
        "matrix-selftest": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "argv": py + ["selftest"], "owned": [], "bind": [], "pipe": True,
        },
        "runtime": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "argv": py + ["runtime", "--node-major", n, "--output", "@OUTPUT@"],
        },
        "runner": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh", "stdin": True,
            "owned": ["RUNNER_STDOUT", "TRACE"], "bind": ["RUNNER_STDOUT", "TRACE"],
            "stdout": "RUNNER_STDOUT", "stderr": "TRACE", "paths": ["EVIDENCE_ROOT"],
            "argv": [
                "/usr/bin/timeout", "--foreground", "--signal=TERM", "--kill-after=60s", "70m",
                "/usr/bin/sudo", "-n", "/usr/bin/bash", "-c",
                'set -euo pipefail; runner_user=$1; test "${SUDO_USER:?}" = "$runner_user"; test "${SUDO_UID:?}" != 0; test "${SUDO_GID:?}" != 0; if /usr/bin/setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups /usr/bin/sudo -n true 2>/dev/null; then   printf \'VOID_V45_PREAUTH_ALREADY_VALID=1\\n\' >&2; else   test -r /dev/tty && test -w /dev/tty;   printf \'VOID_V45_PREAUTH_REFRESH_REQUIRED=1\\n\' >/dev/tty;   printf \'Enter sudo password for the traced operator context.\\n\' >/dev/tty;   /usr/bin/setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups /usr/bin/sudo -v </dev/tty >/dev/tty 2>/dev/tty; fi; /usr/bin/setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups /usr/bin/sudo -n true; printf \'VOID_V45_PREAUTH_BEFORE_STRACE_V1_GREEN\\n\' >&2; exec /usr/bin/strace -f -q -ttt -s 4096 -e trace=process,mount,umount2 -o /dev/stderr -u "$runner_user" /usr/bin/env -i PATH=@ENV_PATH@ LANG=C.UTF-8 GIT_DIR=@REPO_ROOT@/.git GIT_WORK_TREE=@REPO_ROOT@ VOID_V45_NODE_MAJOR=@NODE_MAJOR@ VOID_V45_RUN_ID=@RUN_ID@ VOID_V45_RUN_ATTEMPT=@RUN_ATTEMPT@ VOID_V45_EXPECTED_HEAD=@EXPECTED_HEAD@ VOID_V45_OUT_DIR=@EVIDENCE_ROOT@ /usr/bin/bash -s',
                "void-v45-runner-preauth", "@RUNNER_USER@",
            ],
        },
        "candidate-aba": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "paths": ["EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"],
            "argv": py + [
                "candidate-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--generation-control-ready", "@GENERATION_READY@",
                "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@",
            ],
        },
        "candidate": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "paths": ["EVIDENCE_ROOT"],
            "argv": py + ["candidate", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@"],
        },
        "controls": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py",
            "owned": ["OUTPUT", "SUBSTITUTE_CANDIDATE", "SUBSTITUTE_CONTROLS"], "bind": ["OUTPUT"],
            "paths": ["CANDIDATE", "CANDIDATE_ABA_RECEIPT"],
            "argv": py + [
                "--candidate", "@CANDIDATE@", "--candidate-generation-control-receipt", "@CANDIDATE_ABA_RECEIPT@",
                "--expected-head", head, "--expected-tree", tree,
                "--substitute-candidate-output", "@SUBSTITUTE_CANDIDATE@",
                "--substitute-controls-output", "@SUBSTITUTE_CONTROLS@", "--output", "@OUTPUT@",
            ],
        },
        "producer-control": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            "paths": ["EVIDENCE_ROOT", "SUBSTITUTE_CANDIDATE", "SUBSTITUTE_CONTROLS"],
            "argv": py + [
                "producer-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--substitute-candidate", "@SUBSTITUTE_CANDIDATE@", "--substitute-controls", "@SUBSTITUTE_CONTROLS@",
                "--output", "@OUTPUT@",
            ],
        },
        "terminal-aba": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            "paths": ["EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"],
            "argv": py + [
                "terminal-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--generation-control-ready", "@GENERATION_READY@",
                "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@",
            ],
        },
        "finalizer": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            "paths": ["EVIDENCE_ROOT"],
            "argv": py + ["finalize", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@"],
        },
    }
    spec = copy.deepcopy(specs[phase])
    spec.setdefault("owned", ["OUTPUT"])
    spec.setdefault("bind", ["OUTPUT"])
    spec.setdefault("stdout", None)
    spec.setdefault("stderr", None)
    spec.setdefault("paths", [])
    spec.setdefault("stdin", False)
    spec.setdefault("stdout_suffix_equals", None)
    spec.setdefault("pipe", phase not in ("source-generation-aba-control", "v41-static", "v42-static", "v43-static", "v44-static", "v45-static", "runner"))
    if phase in ("v41-static", "v42-static", "v43-static", "v44-static", "v45-static"):
        spec["stdout"] = "OUTPUT"
    return spec


def expected_phase_contract(spec: dict, argv_allowlisted: bool = True) -> dict:
    return {
        "id": PHASE_CONTRACT_ID,
        "argv_allowlisted": argv_allowlisted,
        "expected_argv_sha256": sha256(canonical({"argv": spec["argv"]})),
        "owned_output_roles": spec["owned"],
        "bound_output_roles": spec["bind"],
        "stdout_output_role": spec["stdout"],
        "stderr_output_role": spec["stderr"],
        "path_token_roles": spec["paths"],
    }


def verify_argument_and_path_bindings(obj: dict, spec: dict, node: int, created: list[dict]) -> None:
    declared_outputs = obj.get("declared_output_paths")
    declared_paths = obj.get("declared_path_tokens")
    demand(
        isinstance(declared_outputs, list) and [item.get("role") for item in declared_outputs] == spec["owned"]
        and isinstance(declared_paths, list) and [item.get("role") for item in declared_paths] == spec["paths"],
        "HOLD_V45_TERMINAL_PHASE_DECLARED_PATHS",
    )
    created_by_role = {item["role"]: item for item in created}
    values: dict[str, str] = {}
    for item in declared_outputs + declared_paths:
        demand(set(item) == {"role", "path", "name", "path_sha256"}, "HOLD_V45_TERMINAL_PHASE_DECLARED_PATHS")
        path = Path(item["path"])
        demand(
            path.is_absolute() and path.name == item["name"] and sha256(item["path"].encode("utf-8")) == item["path_sha256"],
            "HOLD_V45_TERMINAL_PHASE_DECLARED_PATHS",
        )
        values[f"@{item['role']}@"] = item["path"]
        if item["role"] in created_by_role:
            demand(created_by_role[item["role"]]["name"] == item["name"], "HOLD_V45_TERMINAL_PHASE_OUTPUT_IDENTITY")
    outputs_by_role = {item["role"]: item for item in declared_outputs}
    paths_by_role = {item["role"]: item for item in declared_paths}
    if "EVIDENCE_ROOT" in paths_by_role and obj.get("phase") not in ("candidate-aba", "terminal-aba"):
        evidence_root = Path(paths_by_role["EVIDENCE_ROOT"]["path"])
        for role in ("OUTPUT", "RUNNER_STDOUT", "TRACE"):
            if role in outputs_by_role:
                demand(Path(outputs_by_role[role]["path"]).parent == evidence_root, "HOLD_V45_TERMINAL_PHASE_OUTPUT_IDENTITY")
    if "CANDIDATE" in paths_by_role:
        demand(
            Path(outputs_by_role["OUTPUT"]["path"]).parent == Path(paths_by_role["CANDIDATE"]["path"]).parent
            and paths_by_role["CANDIDATE"]["name"] == f"datanet-v45-candidate-{node}.json"
            and paths_by_role["CANDIDATE_ABA_RECEIPT"]["name"] == f"datanet-v45-candidate-aba-control-{node}.json",
            "HOLD_V45_TERMINAL_PHASE_OUTPUT_IDENTITY",
        )
    if "SUBSTITUTE_CANDIDATE" in paths_by_role:
        demand(
            paths_by_role["SUBSTITUTE_CANDIDATE"]["name"] == "substitute-candidate.json"
            and paths_by_role["SUBSTITUTE_CONTROLS"]["name"] == "substitute-controls.json"
            and Path(paths_by_role["SUBSTITUTE_CANDIDATE"]["path"]).parent
            == Path(paths_by_role["SUBSTITUTE_CONTROLS"]["path"]).parent,
            "HOLD_V45_TERMINAL_PHASE_OUTPUT_IDENTITY",
        )
    bindings = obj.get("argument_token_bindings")
    expected_tokens = sorted({token for arg in spec["argv"] for token in re.findall(r"@[A-Z_]+@", arg)})
    demand(isinstance(bindings, dict) and sorted(bindings) == expected_tokens, "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    demand(bindings.get("@NODE_MAJOR@", str(node)) == str(node), "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    demand(bindings.get("@EXPECTED_HEAD@", obj["head"]) == obj["head"], "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    demand(bindings.get("@EXPECTED_TREE@", obj["tree"]) == obj["tree"], "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    demand(bindings.get("@RUN_ID@", str(obj["run_id"])) == str(obj["run_id"]), "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    demand(
        bindings.get("@RUN_ATTEMPT@", str(obj["run_attempt"])) == str(obj["run_attempt"]),
        "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS",
    )
    for token, value in values.items():
        if token in expected_tokens:
            demand(bindings.get(token) == value, "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    if "@ENTRYPOINT@" in bindings:
        demand(re.fullmatch(r"/proc/self/fd/[0-9]+", bindings["@ENTRYPOINT@"]) is not None, "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    for token in ("@REPO_ROOT@", "@SOURCE_ROOT@"):
        if token in bindings:
            demand(Path(bindings[token]).is_absolute(), "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    if "@ENV_PATH@" in bindings:
        demand(bool(bindings["@ENV_PATH@"]) and "@" not in bindings["@ENV_PATH@"], "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    if "@RUNNER_USER@" in bindings:
        demand(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*\$?", bindings["@RUNNER_USER@"]) is not None, "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
    resolved = []
    for raw in spec["argv"]:
        arg = raw
        for token, value in bindings.items():
            arg = arg.replace(token, value)
        demand("@" not in arg, "HOLD_V45_TERMINAL_PHASE_ARGUMENT_BINDINGS")
        resolved.append(arg)
    demand(
        obj.get("resolved_argv_sha256") == sha256(canonical({"argv": resolved}))
        and obj.get("resolved_argv_reconstructed_from_exact_template_and_bindings") is True,
        "HOLD_V45_TERMINAL_PHASE_RESOLVED_ARGV",
    )


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def fingerprint(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_nlink, st.st_uid, st.st_gid,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def receipt(st: os.stat_result, data: bytes) -> dict:
    return {
        "bytes": st.st_size,
        "sha256": sha256(data),
    }


def read_fd_fully(fd: int, expected: int) -> bytes:
    pieces = []
    left = expected
    while left > 0:
        piece = os.read(fd, min(left, 1024 * 1024))
        demand(bool(piece), "HOLD_V45_TERMINAL_SHORT_READ")
        pieces.append(piece)
        left -= len(piece)
    demand(os.read(fd, 1) == b"", "HOLD_V45_TERMINAL_SIZE_GROWTH")
    return b"".join(pieces)


def read_one_generation_record(
    path: Path, *, require_single_link: bool = True,
) -> tuple[bytes, os.stat_result]:
    demand(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_TERMINAL_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_key = fingerprint(os.fstat(parent))
        visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = os.open(path.name, fflags, dir_fd=parent)
        before = os.fstat(fd)
        demand(
            stat.S_ISREG(before.st_mode) and before.st_nlink >= 1
            and (not require_single_link or before.st_nlink == 1),
            "HOLD_V45_TERMINAL_INPUT_REGULAR",
        )
        demand(fingerprint(visible) == fingerprint(before), "HOLD_V45_TERMINAL_INPUT_GENERATION")
        data = read_fd_fully(fd, before.st_size)
        after = os.fstat(fd)
        demand(fingerprint(after) == fingerprint(before), "HOLD_V45_TERMINAL_INPUT_CHANGED")
        demand(fingerprint(os.stat(path.name, dir_fd=parent, follow_symlinks=False)) == fingerprint(after), "HOLD_V45_TERMINAL_INPUT_REPLACED")
        demand(fingerprint(os.fstat(parent)) == parent_key, "HOLD_V45_TERMINAL_INPUT_ABA")
        return data, after
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


def read_one_generation(path: Path, *, require_single_link: bool = True) -> bytes:
    return read_one_generation_record(path, require_single_link=require_single_link)[0]


class BoundEvidence:
    def __init__(self, root: Path, expected: set[str]):
        demand(root.is_absolute() and root.name not in ("", ".", ".."), "HOLD_V45_TERMINAL_EVIDENCE_ROOT")
        demand(all(len(Path(name).parts) in (1, 2) and ".." not in Path(name).parts for name in expected), "HOLD_V45_TERMINAL_MEMBER_NAME")
        self.root = root
        self.expected = set(expected)
        self.parent_fd = -1
        self.root_fd = -1
        self.directories: dict[str, int] = {}
        self.files: dict[str, int] = {}
        self.dir_keys: dict[str, tuple[int, ...]] = {}
        self.file_keys: dict[str, tuple[int, ...]] = {}
        self.payloads: dict[str, bytes] = {}
        self.inventory: dict[str, dict] = {}
        try:
            self._bind()
        except BaseException:
            self.close()
            raise

    @staticmethod
    def dir_flags() -> int:
        return os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)

    def _bind(self) -> None:
        self.parent_fd = os.open(self.root.parent, self.dir_flags())
        parent_initial = os.fstat(self.parent_fd)
        root_named = os.stat(self.root.name, dir_fd=self.parent_fd, follow_symlinks=False)
        self.root_fd = os.open(self.root.name, self.dir_flags(), dir_fd=self.parent_fd)
        root_initial = os.fstat(self.root_fd)
        demand(stat.S_ISDIR(root_named.st_mode) and fingerprint(root_named) == fingerprint(root_initial), "HOLD_V45_TERMINAL_ROOT_GENERATION")

        top_files = {name for name in self.expected if len(Path(name).parts) == 1}
        child_dirs = {Path(name).parts[0] for name in self.expected if len(Path(name).parts) == 2}
        demand(set(os.listdir(self.root_fd)) == top_files | child_dirs, "HOLD_V45_TERMINAL_MEMBERSHIP")

        for dirname in sorted(child_dirs):
            named = os.stat(dirname, dir_fd=self.root_fd, follow_symlinks=False)
            fd = os.open(dirname, self.dir_flags(), dir_fd=self.root_fd)
            opened = os.fstat(fd)
            demand(stat.S_ISDIR(opened.st_mode) and fingerprint(named) == fingerprint(opened), "HOLD_V45_TERMINAL_DIRECTORY_GENERATION")
            wanted = {Path(name).parts[1] for name in self.expected if Path(name).parts[0] == dirname}
            demand(set(os.listdir(fd)) == wanted, "HOLD_V45_TERMINAL_MEMBERSHIP")
            self.directories[dirname] = fd

        flags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
        for name in sorted(self.expected):
            parts = Path(name).parts
            parent = self.root_fd if len(parts) == 1 else self.directories[parts[0]]
            named = os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)
            fd = custody_artifact_open(self.root / name, control_snapshot="terminal-aba-control" in sys.argv)
            opened = os.fstat(fd)
            demand(stat.S_ISREG(opened.st_mode) and opened.st_nlink == 1, "HOLD_V45_TERMINAL_MEMBER_REGULAR")
            demand(fingerprint(named) == fingerprint(opened), "HOLD_V45_TERMINAL_MEMBER_GENERATION")
            data = read_fd_fully(fd, opened.st_size)
            final = os.fstat(fd)
            demand(fingerprint(opened) == fingerprint(final), "HOLD_V45_TERMINAL_MEMBER_CHANGED")
            self.files[name] = fd
            self.file_keys[name] = fingerprint(final)
            self.payloads[name] = data
            self.inventory[name] = receipt(final, data)

        self.dir_keys[".."] = fingerprint(parent_initial)
        self.dir_keys["."] = fingerprint(os.fstat(self.root_fd))
        for name, fd in self.directories.items():
            self.dir_keys[name] = fingerprint(os.fstat(fd))

    def raw(self, name: str) -> bytes:
        demand(name in self.payloads, "HOLD_V45_TERMINAL_MEMBER_LOOKUP")
        return self.payloads[name]

    def text(self, name: str) -> str:
        try:
            return self.raw(name).decode("utf-8", errors="strict")
        except UnicodeDecodeError as exc:
            raise TerminalHold("HOLD_V45_TERMINAL_UTF8") from exc

    def object(self, name: str) -> dict:
        try:
            value = json.loads(self.text(name))
        except json.JSONDecodeError as exc:
            raise TerminalHold("HOLD_V45_TERMINAL_JSON") from exc
        demand(isinstance(value, dict), "HOLD_V45_TERMINAL_JSON_OBJECT")
        return value

    def assert_current(self) -> None:
        demand(fingerprint(os.fstat(self.parent_fd)) == self.dir_keys[".."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        demand(fingerprint(os.stat(self.root.name, dir_fd=self.parent_fd, follow_symlinks=False)) == self.dir_keys["."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        demand(fingerprint(os.fstat(self.root_fd)) == self.dir_keys["."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        top_files = {name for name in self.expected if len(Path(name).parts) == 1}
        child_dirs = {Path(name).parts[0] for name in self.expected if len(Path(name).parts) == 2}
        demand(set(os.listdir(self.root_fd)) == top_files | child_dirs, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        for dirname, fd in self.directories.items():
            demand(fingerprint(os.fstat(fd)) == self.dir_keys[dirname], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            demand(fingerprint(os.stat(dirname, dir_fd=self.root_fd, follow_symlinks=False)) == self.dir_keys[dirname], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            wanted = {Path(name).parts[1] for name in self.expected if Path(name).parts[0] == dirname}
            demand(set(os.listdir(fd)) == wanted, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        for name, fd in self.files.items():
            parts = Path(name).parts
            parent = self.root_fd if len(parts) == 1 else self.directories[parts[0]]
            demand(fingerprint(os.fstat(fd)) == self.file_keys[name], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            demand(fingerprint(os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)) == self.file_keys[name], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")

    def close(self) -> None:
        for fd in self.files.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for fd in self.directories.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for fd in (self.root_fd, self.parent_fd):
            if fd >= 0:
                try:
                    os.close(fd)
                except OSError:
                    pass
        self.files.clear()
        self.directories.clear()
        self.root_fd = self.parent_fd = -1


def base_names(node: int) -> set[str]:
    n = str(node)
    names = {
        f"datanet-v45-custody-controls-{n}.json",
        f"datanet-v45-source-execution-custody-selftest-{n}.json",
        f"v41-static-{n}.jsonl", f"v42-static-{n}.jsonl", f"v43-static-{n}.jsonl",
        f"v44-static-{n}.jsonl", f"v45-static-{n}.jsonl", f"datanet-v45-runtime-{n}.json",
        f"datanet-v45-process-{n}.trace", f"datanet-v45-runner-{n}.stdout.log",
        f"datanet-v45-phase-argv-control-matrix-selftest-{n}.json",
        f"datanet-v43-v41-{n}.stdout.log",
        f"datanet-v43-v41-{n}.stderr.log", f"datanet-v43-pre-{n}.json",
        f"datanet-v43-post-{n}.json", f"datanet-v43-pre-{n}.jsonl",
        f"datanet-v43-post-{n}.jsonl", f"datanet-v43-final-{n}.json",
        f"datanet-v43-final-{n}.jsonl", f"datanet-v43-e0-pre-{n}.txt",
        f"datanet-v43-r0-pre-{n}.txt", f"datanet-v43-e0-post-{n}.txt",
        f"datanet-v43-r0-post-{n}.txt", f"datanet-v43-crash-copy-{n}.txt",
        f"datanet-v43-sources-{n}.txt", f"datanet-v45-v44-capture-{n}.json",
        f"datanet-v45-v44-capture-{n}.jsonl", f"datanet-v45-v44-corruption-{n}.json",
        f"datanet-v45-v44-corruption-{n}.jsonl", f"datanet-v45-v44-final-{n}.json",
        f"datanet-v45-v44-final-{n}.jsonl", f"datanet-v45-v44-raw-diff-{n}.txt",
        f"datanet-v45-v44-super-after-{n}.txt", f"datanet-v45-v44-loop-{n}.txt",
        f"datanet-v45-capability-release-{n}.json",
        f"datanet-v45-candidate-aba-control-{n}.json",
        f"datanet-v45-source-generation-aba-control-{n}.json",
    }
    for phase in (
        "v41-static", "v42-static", "v43-static", "v44-static", "v45-static",
        "matrix-selftest", "runtime", "runner", "candidate-aba",
    ):
        names.add(f"datanet-v45-source-execution-{phase}-{n}.json")
    for leaf in ("aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"):
        names.add(f"datanet-v43-v41-evidence-{n}/{leaf}")
    return names


def source_execution_phases(node: int) -> dict[str, tuple[str, tuple[str, ...]]]:
    n = str(node)
    return {
        "custody-selftest": ("scripts/prove_datanet_v45_custody_integration_v1.py", (f"datanet-v45-custody-controls-{n}.json",)),
        "v41-static": ("scripts/prove_datanet_v41_static_gate_v1.py", (f"v41-static-{n}.jsonl",)),
        "v42-static": ("scripts/prove_datanet_v42_fsverity_clean_remount_v1.py", (f"v42-static-{n}.jsonl",)),
        "v43-static": ("scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", (f"v43-static-{n}.jsonl",)),
        "v44-static": ("scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", (f"v44-static-{n}.jsonl",)),
        "v45-static": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"v45-static-{n}.jsonl",)),
        "matrix-selftest": ("scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py", ()),
        "runtime": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-runtime-{n}.json",)),
        "runner": ("scripts/run_datanet_v45_full_stack_ext4_v1.sh", (f"datanet-v45-runner-{n}.stdout.log", f"datanet-v45-process-{n}.trace")),
        "candidate-aba": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-candidate-aba-control-{n}.json",)),
    }


def source_execution_late_phases(node: int, stage: str) -> dict[str, tuple[str, tuple[str, ...]]]:
    n = str(node)
    phases = {
        "candidate": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-candidate-{n}.json",)),
        "controls": ("scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py", (f"datanet-v45-controls-{n}.json",)),
    }
    if stage in ("terminal-aba", "final"):
        phases["producer-control"] = (
            "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            (f"datanet-v45-producer-substitution-control-{n}.json",),
        )
    if stage == "final":
        phases["terminal-aba"] = (
            "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            (f"datanet-v45-terminal-aba-control-{n}.json",),
        )
    return phases


def verify_source_execution_stdout_binding(
    obj: dict, spec: dict, created: list[dict], output_names: tuple[str, ...],
) -> None:
    code = "HOLD_V45_TERMINAL_SOURCE_EXECUTION_STDOUT"
    by_role = {item["role"]: item for item in created}
    if spec["stdout"] is not None:
        demand(obj.get("stdout_binding") == by_role[spec["stdout"]], code)
    elif spec.get("stdout_suffix_equals") is not None:
        role = spec["stdout_suffix_equals"]
        observed = obj.get("producer_observation", {}).get("stream_bindings", {}).get("stdout")
        authoritative = by_role.get(role)
        demand(
            bool(output_names) and role in spec["bind"]
            and isinstance(authoritative, dict)
            and isinstance(observed, dict) and set(observed) == {"bytes", "sha256"}
            and type(observed.get("bytes")) is int
            and observed["bytes"] >= authoritative["bytes"]
            and re.fullmatch(r"[0-9a-f]{64}", observed.get("sha256", "")) is not None
            and obj.get("stdout_binding") == {"role": "CUSTODIAN_PIPE", **observed},
            code,
        )
    elif output_names:
        demand(bool(spec["bind"]) and spec["bind"][0] in by_role, code)
        primary = by_role[spec["bind"][0]]
        demand(
            obj.get("stdout_binding") == {
                "role": "CUSTODIAN_PIPE",
                "bytes": primary["bytes"],
                "sha256": primary["sha256"],
            },
            code,
        )
    else:
        stdout = obj.get("stdout_binding")
        demand(
            isinstance(stdout, dict) and stdout.get("role") == "CUSTODIAN_PIPE"
            and isinstance(stdout.get("bytes"), int) and stdout["bytes"] > 0
            and re.fullmatch(r"[0-9a-f]{64}", stdout.get("sha256", "")) is not None,
            code,
        )


def verify_source_execution_receipt(
    ev: BoundEvidence,
    receipt_name: str,
    phase: str,
    entrypoint: str,
    output_names: tuple[str, ...],
    node: int,
    source: dict,
) -> tuple[str, int, int]:
    obj = ev.object(receipt_name)
    verify_seal(obj, "receipt_sha256", "HOLD_V45_TERMINAL_SOURCE_EXECUTION_SEAL")
    wall = source["source_wall_entries"]
    supervisor = wall[SOURCE_SUPERVISOR]
    admitted = wall[entrypoint]
    spec = phase_contract(phase, node)
    output_data = {name: ev.raw(name) for name in output_names}
    bound = [
        {"name": name, "bytes": len(output_data[name]), "sha256": sha256(output_data[name])}
        for name in output_names
    ]
    created = obj.get("created_output_bindings")
    demand(isinstance(created, list) and [item.get("role") for item in created] == spec["owned"], "HOLD_V45_TERMINAL_SOURCE_OUTPUT_CUSTODY")
    created_by_role = {item["role"]: item for item in created}
    for role, item in zip(spec["bind"], bound):
        demand(
            created_by_role[role] == {**item, "role": role, "mode": 0o400, "created_empty_before_child": True},
            "HOLD_V45_TERMINAL_SOURCE_OUTPUT_CUSTODY",
        )
    if phase == "controls":
        for role, name in (("SUBSTITUTE_CANDIDATE", "substitute-candidate.json"), ("SUBSTITUTE_CONTROLS", "substitute-controls.json")):
            item = created_by_role[role]
            demand(
                item.get("name") == name and item.get("mode") == 0o400
                and item.get("created_empty_before_child") is True
                and isinstance(item.get("bytes"), int) and item["bytes"] > 0
                and re.fullmatch(r"[0-9a-f]{64}", item.get("sha256", "")) is not None,
                "HOLD_V45_TERMINAL_SOURCE_OUTPUT_CUSTODY",
            )
    verify_observed_producer_receipt(obj)
    verify_argument_and_path_bindings(obj, spec, node, created)
    demand(
        obj.get("marker") == SOURCE_EXECUTION_MARKER
        and obj.get("status") == "GREEN"
        and obj.get("phase") == phase
        and obj.get("node_major") == node
        and isinstance(obj.get("run_id"), int) and obj["run_id"] > 0
        and isinstance(obj.get("run_attempt"), int) and obj["run_attempt"] > 0
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == sha256(canonical(source))
        and obj.get("source_wall_paths_sha256") == source["source_wall_paths_sha256"]
        and obj.get("source_wall_entry_count") == source["source_wall_entry_count"]
        and obj.get("supervisor", {}).get("path") == SOURCE_SUPERVISOR
        and obj.get("supervisor", {}).get("git_blob") == supervisor["git_blob"]
        and obj.get("supervisor", {}).get("sha256") == supervisor["sha256"]
        and obj.get("supervisor", {}).get("git_blob_preverified_before_interpreter") is True
        and obj.get("supervisor", {}).get("bootstrap_sealed_memfd") is True
        and obj.get("supervisor", {}).get("write_grow_shrink_and_seal_seals_verified") is True
        and obj.get("entrypoint", {}).get("path") == entrypoint
        and obj.get("entrypoint", {}).get("git_blob") == admitted["git_blob"]
        and obj.get("entrypoint", {}).get("sha256") == admitted["sha256"]
        and obj.get("entrypoint", {}).get("executed_from_retained_fd") is (not spec["stdin"])
        and obj.get("entrypoint", {}).get("executed_from_sealed_stdin") is spec["stdin"]
        and obj.get("entrypoint", {}).get("stdin_fd_handoff") is spec["stdin"]
        and obj.get("entrypoint", {}).get("proc_fd_handoff") is (not spec["stdin"])
        and obj.get("source_snapshot_from_exact_git_blobs") is True
        and obj.get("source_files_opened_nofollow") is True
        and obj.get("source_file_and_directory_fds_retained") is True
        and obj.get("source_membership_and_metadata_rechecked") is True
        and obj.get("interpreter_local_source_root_is_snapshot") is True
        and obj.get("command_entrypoint_is_retained_fd") is (phase != "runner")
        and obj.get("command_entrypoint_is_sealed_stdin") is (phase == "runner")
        and obj.get("command_template") == spec["argv"]
        and obj.get("phase_contract") == expected_phase_contract(spec)
        and obj.get("child_started_after_source_admission") is True
        and obj.get("child_returncode") == 0
        and obj.get("source_generation_stable_through_child") is True
        and obj.get("output_paths_absent_before_supervisor_create") is True
        and obj.get("output_files_supervisor_create_only") is True
        and obj.get("output_fds_retained_through_child") is True
        and obj.get("output_generation_stable_through_child") is True
        and obj.get("output_bindings") == bound
        and obj.get("stdout_captured_by_supervisor") is False
        and obj.get("stdout_captured_by_custodian") is True
        and obj.get("stderr_captured_by_supervisor") is (spec["stderr"] is not None)
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_TERMINAL_SOURCE_EXECUTION_RECEIPT",
    )
    verify_source_execution_stdout_binding(obj, spec, created, output_names)
    if spec["stderr"] is not None:
        demand(obj.get("stderr_binding") == created_by_role[spec["stderr"]], "HOLD_V45_TERMINAL_SOURCE_EXECUTION_STDERR")
    else:
        demand(obj.get("stderr_binding") is None, "HOLD_V45_TERMINAL_SOURCE_EXECUTION_STDERR")
    return obj["receipt_sha256"], obj["run_id"], obj["run_attempt"]


def verify_phase_control(
    ev: BoundEvidence, name: str, phase: str, kind: str, node: int, source: dict,
) -> tuple[str, int, int]:
    obj = ev.object(name)
    verify_seal(obj, "receipt_sha256", "HOLD_V45_TERMINAL_PHASE_CONTROL_SEAL")
    spec = phase_contract(phase, node)
    if kind == "relabeled-help":
        presented = ["python3", "-I", "-S", "-B", "@ENTRYPOINT@", "--help"]
        rejection = "HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED"
        flag = "phase_argv_mismatch_rejected_before_output_create"
        allowlisted = False
    else:
        presented = spec["argv"]
        rejection = "HOLD_V45_OUTPUT_PREEXISTING"
        flag = "preexisting_output_rejected_before_child"
        allowlisted = True
    wall = source["source_wall_entries"]
    entrypoint = spec["entrypoint"]
    declared_outputs = obj.get("declared_output_paths")
    declared_paths = obj.get("declared_path_tokens")
    demand(
        isinstance(declared_outputs, list) and [item.get("role") for item in declared_outputs] == spec["owned"]
        and isinstance(declared_paths, list) and [item.get("role") for item in declared_paths] == spec["paths"],
        "HOLD_V45_TERMINAL_PHASE_CONTROL_PATHS",
    )
    for item in declared_outputs + declared_paths:
        demand(
            set(item) == {"role", "path", "name", "path_sha256"}
            and Path(item["path"]).is_absolute() and Path(item["path"]).name == item["name"]
            and sha256(item["path"].encode("utf-8")) == item["path_sha256"],
            "HOLD_V45_TERMINAL_PHASE_CONTROL_PATHS",
        )
    if phase == "finalizer":
        outputs_by_role = {item["role"]: item for item in declared_outputs}
        paths_by_role = {item["role"]: item for item in declared_paths}
        demand(
            outputs_by_role["OUTPUT"]["name"] == f"datanet-v45-aggregate-{node}.json"
            and Path(outputs_by_role["OUTPUT"]["path"]).parent == Path(paths_by_role["EVIDENCE_ROOT"]["path"]),
            "HOLD_V45_TERMINAL_PHASE_CONTROL_OUTPUT",
        )
    demand(
        obj.get("marker") == PHASE_CONTROL_MARKER
        and obj.get("status") == "GREEN"
        and obj.get("control_kind") == kind
        and obj.get("rejection") == rejection
        and obj.get("phase") == phase
        and obj.get("node_major") == node
        and isinstance(obj.get("run_id"), int) and obj["run_id"] > 0
        and isinstance(obj.get("run_attempt"), int) and obj["run_attempt"] > 0
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == sha256(canonical(source))
        and obj.get("supervisor", {}).get("git_blob") == wall[SOURCE_SUPERVISOR]["git_blob"]
        and obj.get("entrypoint", {}).get("path") == entrypoint
        and obj.get("entrypoint", {}).get("git_blob") == wall[entrypoint]["git_blob"]
        and obj.get("command_template") == presented
        and obj.get("presented_argv_sha256") == sha256(canonical({"argv": presented}))
        and obj.get("phase_contract") == expected_phase_contract(spec, allowlisted)
        and obj.get(flag) is True
        and obj.get("child_started") is False
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_TERMINAL_PHASE_CONTROL_RECEIPT",
    )
    return obj["receipt_sha256"], obj["run_id"], obj["run_attempt"]


def verify_source_execution(ev: BoundEvidence, node: int, source: dict, stage: str) -> dict:
    n = str(node)
    receipt_hashes = {}
    run_ids: set[int] = set()
    run_attempts: set[int] = set()
    for phase, (entrypoint, output_names) in source_execution_phases(node).items():
        name = f"datanet-v45-source-execution-{phase}-{n}.json"
        receipt_hashes[phase], receipt_run_id, receipt_run_attempt = verify_source_execution_receipt(
            ev, name, phase, entrypoint, output_names, node, source,
        )
        run_ids.add(receipt_run_id)
        run_attempts.add(receipt_run_attempt)
    late_hashes = {}
    for phase, (entrypoint, output_names) in source_execution_late_phases(node, stage).items():
        name = f"datanet-v45-source-execution-{phase}-{n}.json"
        late_hashes[phase], receipt_run_id, receipt_run_attempt = verify_source_execution_receipt(
            ev, name, phase, entrypoint, output_names, node, source,
        )
        run_ids.add(receipt_run_id)
        run_attempts.add(receipt_run_attempt)
    control = ev.object(f"datanet-v45-source-generation-aba-control-{n}.json")
    verify_seal(control, "receipt_sha256", "HOLD_V45_TERMINAL_SOURCE_ABA_SEAL")
    wall = source["source_wall_entries"]
    demand(
        control.get("marker") == SOURCE_ABA_MARKER
        and control.get("status") == "GREEN"
        and control.get("phase") == "source-generation-aba-control"
        and control.get("node_major") == node
        and isinstance(control.get("run_id"), int) and control["run_id"] > 0
        and isinstance(control.get("run_attempt"), int) and control["run_attempt"] > 0
        and control.get("head") == source["head"]
        and control.get("tree") == source["tree"]
        and control.get("source_inventory_sha256") == sha256(canonical(source))
        and control.get("supervisor", {}).get("path") == SOURCE_SUPERVISOR
        and control.get("supervisor", {}).get("git_blob") == wall[SOURCE_SUPERVISOR]["git_blob"]
        and control.get("supervisor", {}).get("sha256") == wall[SOURCE_SUPERVISOR]["sha256"]
        and control.get("supervisor", {}).get("git_blob_preverified_before_interpreter") is True
        and control.get("supervisor", {}).get("bootstrap_sealed_memfd") is True
        and control.get("supervisor", {}).get("write_grow_shrink_and_seal_seals_verified") is True
        and control.get("entrypoint", {}).get("path") == "scripts/run_datanet_v45_full_stack_ext4_v1.sh"
        and control.get("entrypoint", {}).get("git_blob") == wall["scripts/run_datanet_v45_full_stack_ext4_v1.sh"]["git_blob"]
        and control.get("entrypoint", {}).get("executed_from_retained_fd") is True
        and control.get("command_template") == phase_contract("source-generation-aba-control", node)["argv"]
        and control.get("phase_contract") == expected_phase_contract(
            phase_contract("source-generation-aba-control", node)
        )
        and control.get("declared_output_paths") == []
        and control.get("declared_path_tokens") == []
        and control.get("source_snapshot_from_exact_git_blobs") is True
        and control.get("source_files_opened_nofollow") is True
        and control.get("source_file_and_directory_fds_retained") is True
        and control.get("control_target") == "scripts/run_datanet_v45_full_stack_ext4_v1.sh"
        and control.get("rejection") == "HOLD_V45_SOURCE_GENERATION_CHANGED"
        and control.get("external_a_to_b_to_a_control") is True
        and control.get("child_started") is False
        and control.get("production_runtime_touched") is False,
        "HOLD_V45_TERMINAL_SOURCE_ABA_RECEIPT",
    )
    run_ids.add(control["run_id"])
    run_attempts.add(control["run_attempt"])
    matrix_control_hash, matrix_control_run_id, matrix_control_run_attempt = verify_phase_control(
            ev,
            f"datanet-v45-phase-argv-control-matrix-selftest-{n}.json",
            "matrix-selftest",
            "relabeled-help",
            node,
            source,
        )
    run_ids.add(matrix_control_run_id)
    run_attempts.add(matrix_control_run_attempt)
    phase_controls = {
        "matrix-selftest-relabeled-help": matrix_control_hash,
    }
    result = {
        "source_inventory_sha256": sha256(canonical(source)),
        "source_execution_receipt_sha256": receipt_hashes,
        "source_generation_aba_control_sha256": control["receipt_sha256"],
        "phase_argv_control_sha256": phase_controls,
        "exact_phase_argv_allowlisted": True,
        "supervisor_owned_create_only_outputs": True,
        "relabeled_help_controls": True,
        "source_inventory_and_execution_generation_bound": True,
        "external_source_generation_aba_control": True,
    }
    if late_hashes:
        result["post_candidate_source_execution_receipt_sha256"] = late_hashes
    if stage == "final":
        finalizer_control_hash, finalizer_control_run_id, finalizer_control_run_attempt = verify_phase_control(
            ev,
            f"datanet-v45-phase-argv-control-finalizer-{n}.json",
            "finalizer",
            "relabeled-help",
            node,
            source,
        )
        run_ids.add(finalizer_control_run_id)
        run_attempts.add(finalizer_control_run_attempt)
        phase_controls["finalizer-relabeled-help"] = finalizer_control_hash
        preexisting_control_hash, preexisting_control_run_id, preexisting_control_run_attempt = verify_phase_control(
                ev,
                f"datanet-v45-preexisting-output-control-finalizer-{n}.json",
                "finalizer",
                "preexisting-output",
                node,
                source,
            )
        run_ids.add(preexisting_control_run_id)
        run_attempts.add(preexisting_control_run_attempt)
        result["preexisting_output_control_sha256"] = {"finalizer": preexisting_control_hash}
        result["preexisting_output_controls"] = True
    demand(len(run_ids) == 1, "HOLD_V45_TERMINAL_PHASE_RUN_ID_MISMATCH")
    demand(len(run_attempts) == 1, "HOLD_V45_TERMINAL_PHASE_RUN_ATTEMPT_MISMATCH")
    result["run_id"] = next(iter(run_ids))
    result["run_attempt"] = next(iter(run_attempts))
    return result


def candidate_source_execution_view(value: dict) -> dict:
    out = copy.deepcopy(value)
    out.pop("post_candidate_source_execution_receipt_sha256", None)
    out.pop("preexisting_output_control_sha256", None)
    out.pop("preexisting_output_controls", None)
    if "phase_argv_control_sha256" in out:
        out["phase_argv_control_sha256"] = {
            "matrix-selftest-relabeled-help": out["phase_argv_control_sha256"]["matrix-selftest-relabeled-help"]
        }
    return out


def decode_object(data: bytes, code: str) -> dict:
    try:
        value = json.loads(data.decode("utf-8", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise TerminalHold(code) from exc
    demand(isinstance(value, dict), code)
    return value


def verify_seal(value: dict, field: str, code: str) -> None:
    claimed = value.get(field)
    body = copy.deepcopy(value)
    body.pop(field, None)
    demand(isinstance(claimed, str) and len(claimed) == 64 and sha256(canonical(body)) == claimed, code)


def seal(value: dict, field: str) -> dict:
    out = copy.deepcopy(value)
    out.pop(field, None)
    out[field] = sha256(canonical(out))
    return out


def config() -> dict:
    fixture_bytes = read_one_generation(FIXTURE)
    expected_blob = subprocess.run(
        ["git", "rev-parse", "HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout.strip()
    demand(git_blob(fixture_bytes) == expected_blob, "HOLD_V45_TERMINAL_FIXTURE_HEAD_DRIFT")
    cfg = decode_object(fixture_bytes, "HOLD_V45_TERMINAL_FIXTURE_JSON")
    demand(cfg.get("v") == 1 and cfg.get("parent_head") == PARENT_HEAD, "HOLD_V45_TERMINAL_FIXTURE")
    for rel, wanted in cfg.get("accepted_v44_blobs", {}).items():
        demand(git_blob(read_one_generation(REPO / rel)) == wanted, "HOLD_V45_TERMINAL_PARENT_BLOB")
    return cfg


def verify_dependency_closure(cfg: dict) -> None:
    wall = set(cfg.get("source_wall_paths", []))
    roots = cfg.get("source_wall_entrypoints")
    demand(isinstance(roots, list) and roots == sorted(set(roots)), "HOLD_V45_TERMINAL_ENTRYPOINTS")
    demand(set(roots) <= wall, "HOLD_V45_TERMINAL_ENTRYPOINT_WALL")
    queue = list(roots)
    data_queue: list[str] = []
    seen: set[str] = set()
    leaves: set[str] = set()

    def enqueue(rel: str) -> None:
        candidate = REPO / rel
        if not candidate.is_file():
            return
        if rel.startswith("scripts/"):
            if rel not in seen:
                queue.append(rel)
        elif rel not in leaves:
            leaves.add(rel)
            data_queue.append(rel)

    explicit_pattern = r"(?:\.github/workflows|docs|fixtures|scripts)/[A-Za-z0-9_.-]+\.(?:py|mjs|json|yml|md|sh)"
    while queue or data_queue:
        if not queue:
            rel = data_queue.pop(0)
            path = REPO / rel
            if path.suffix in (".json", ".yml", ".yaml"):
                text = read_one_generation(path).decode("utf-8", errors="strict")
                for item in re.findall(explicit_pattern, text):
                    enqueue(item)
            continue
        rel = queue.pop(0)
        if rel in seen:
            continue
        path = REPO / rel
        demand(path.is_file(), "HOLD_V45_TERMINAL_DEPENDENCY_MISSING")
        seen.add(rel)
        text = read_one_generation(path).decode("utf-8", errors="strict")
        if path.suffix == ".py":
            try:
                parsed = ast.parse(text, filename=rel)
            except SyntaxError as exc:
                raise TerminalHold("HOLD_V45_TERMINAL_DEPENDENCY_PARSE") from exc
            for node in ast.walk(parsed):
                if isinstance(node, ast.Import):
                    modules = [item.name.partition(".")[0] for item in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module:
                    modules = [node.module.partition(".")[0]]
                else:
                    modules = []
                for module in modules:
                    enqueue(f"scripts/{module}.py")
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    literal = node.value
                    for item in re.findall(explicit_pattern, literal):
                        enqueue(item)
                    for item in re.findall(r"[A-Za-z0-9_.-]+\.(?:py|mjs)", literal):
                        enqueue(f"scripts/{item}")
                    for item in re.findall(r"datanet-[A-Za-z0-9_.-]+\.json", literal):
                        enqueue(f"fixtures/{item}")
        elif path.suffix in (".mjs", ".js"):
            for item in re.findall(r"[\"'](\.\.?/[A-Za-z0-9_./-]+\.(?:mjs|js|json))[\"']", text):
                resolved = (path.parent / item).resolve()
                try:
                    enqueue(str(resolved.relative_to(REPO)))
                except ValueError as exc:
                    raise TerminalHold("HOLD_V45_TERMINAL_DEPENDENCY_ESCAPE") from exc
        else:
            for item in re.findall(explicit_pattern, text):
                enqueue(item)
    demand(seen | leaves <= wall, "HOLD_V45_TERMINAL_TRANSITIVE_WALL")


def command(*args: str) -> str:
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def source_wall(cfg: dict) -> dict:
    verify_dependency_closure(cfg)
    head = command("git", "rev-parse", "HEAD")
    tree = command("git", "rev-parse", "HEAD^{tree}")
    listing = subprocess.run(["git", "ls-tree", "-r", "--full-tree", "HEAD"], check=True, stdout=subprocess.PIPE).stdout
    tracked = {}
    for line in listing.decode("utf-8", errors="strict").splitlines():
        left, rel = line.split("\t", 1)
        mode, kind, blob = left.split()
        tracked[rel] = {"mode": mode, "type": kind, "git_blob": blob}
    paths = cfg.get("source_wall_paths")
    demand(isinstance(paths, list) and paths == sorted(set(paths)), "HOLD_V45_TERMINAL_SOURCE_WALL_CANONICAL")
    entries = {}
    for rel in paths:
        item = tracked.get(rel)
        demand(item is not None and item["type"] == "blob", "HOLD_V45_TERMINAL_SOURCE_WALL_MEMBER")
        source_path = REPO / rel
        data, source_stat = read_one_generation_record(source_path)
        demand(git_blob(data) == item["git_blob"], "HOLD_V45_TERMINAL_SOURCE_DRIFT")
        worktree_mode = stat.S_IMODE(source_stat.st_mode)
        worktree_git_mode = "100755" if worktree_mode & 0o111 else "100644"
        demand(worktree_git_mode == item["mode"], "HOLD_V45_TERMINAL_SOURCE_MODE_DRIFT")
        entries[rel] = {**item, "worktree_mode": worktree_mode, "bytes": len(data), "sha256": sha256(data)}
    return {
        "head": head,
        "tree": tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": sha256(listing),
        "source_wall_paths_sha256": sha256(canonical({"paths": paths})),
        "source_wall_entry_count": len(entries),
        "source_wall_entries": entries,
        "transitive_source_wall_verified": True,
    }


RUNTIME_COMMANDS = [
    "git", "bash", "python3", "node", "sudo", "strace", "dd", "mkfs.ext4", "tune2fs",
    "losetup", "blockdev", "dmsetup", "mount", "umount", "cp", "cmp", "sha256sum",
    "sync", "grep", "awk", "findmnt", "mountpoint", "jq", "fallocate", "ln",
]


def runtime_identity(node: int, cfg: dict) -> dict:
    version = command("node", "--version")
    demand(version.lstrip("v").split(".", 1)[0] == str(node), "HOLD_V45_TERMINAL_NODE_MAJOR")
    executables = {}
    for name in RUNTIME_COMMANDS:
        found = shutil.which(name)
        demand(found is not None, "HOLD_V45_TERMINAL_EXECUTABLE")
        path = Path(found).resolve()
        st = path.stat()
        demand(stat.S_ISREG(st.st_mode), "HOLD_V45_TERMINAL_EXECUTABLE_REGULAR")
        executables[name] = {
            "requested": name,
            "path": str(path),
            "bytes": st.st_size,
            "mode": stat.S_IMODE(st.st_mode),
            "uid": st.st_uid,
            "sha256": sha256(read_one_generation(path, require_single_link=False)),
        }
    return {
        "marker": RUNTIME_MARKER,
        "status": "GREEN",
        "node_major": node,
        "node_version": version,
        "python_version": platform.python_version(),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "system": platform.system(),
        "source": source_wall(cfg),
        "executables": executables,
        "production_runtime_touched": False,
    }


def last_json(text: str) -> dict:
    rows = [row for row in text.splitlines() if row]
    demand(bool(rows), "HOLD_V45_TERMINAL_EMPTY_LOG")
    try:
        obj = json.loads(rows[-1])
    except json.JSONDecodeError as exc:
        raise TerminalHold("HOLD_V45_TERMINAL_LOG_JSON") from exc
    demand(isinstance(obj, dict), "HOLD_V45_TERMINAL_LOG_OBJECT")
    return obj


def key_values(text: str) -> dict[str, str]:
    result = {}
    for row in text.splitlines():
        if not row:
            continue
        pieces = row.split("=", 1)
        demand(len(pieces) == 2 and pieces[0] not in result, "HOLD_V45_TERMINAL_KV")
        result[pieces[0]] = pieces[1]
    return result


def superblock(text: str) -> dict:
    feature_line = next((line for line in text.splitlines() if line.startswith("Filesystem features:")), "")
    return {
        "sha256": sha256(text.encode("utf-8")),
        "needs_recovery": "needs_recovery" in text,
        "verity": "verity" in feature_line.split(),
    }


def tier_receipt(ev: BoundEvidence, node: int, cfg: dict) -> dict:
    verify_custody_control_result(ev.object(f"datanet-v45-custody-controls-{node}.json"))
    static_markers = {
        "v41": "VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_STATIC_V1_GREEN",
        "v42": "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_STATIC_V1_GREEN",
        "v43": "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_STATIC_V1_GREEN",
        "v44": "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_STATIC_V1_GREEN",
        "v45": STATIC_MARKER,
    }
    for version, marker in static_markers.items():
        row = last_json(ev.text(f"{version}-static-{node}.jsonl"))
        demand(row.get("marker") == marker and row.get("status") == "GREEN", "HOLD_V45_TERMINAL_STATIC_CHILD")

    demand(ev.raw(f"datanet-v43-v41-{node}.stderr.log") == b"", "HOLD_V45_TERMINAL_STDERR")
    campaign = last_json(ev.text(f"datanet-v43-v41-{node}.stdout.log"))
    runner = last_json(ev.text(f"datanet-v45-runner-{node}.stdout.log"))
    demand(campaign.get("marker") == "VOID_DATANET_V41_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN", "HOLD_V45_TERMINAL_V41_MARKER")
    demand(campaign.get("payload_ledger", {}).get("calls") == 15372 and campaign.get("payload_ledger", {}).get("completed_mib") == 960, "HOLD_V45_TERMINAL_V41_LEDGER")
    demand(campaign.get("process_topology", {}).get("total_lifetimes") == 27 and campaign.get("process_topology", {}).get("peak_live") == 9, "HOLD_V45_TERMINAL_V41_TOPOLOGY")
    demand(campaign.get("fsverity_record_immutability") is True and campaign.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_V41_STATUS")
    demand(
        runner.get("marker") == "VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN"
        and runner.get("node_major") == node
        and isinstance(runner.get("run_id"), int) and runner["run_id"] > 0
        and isinstance(runner.get("run_attempt"), int) and runner["run_attempt"] > 0,
        "HOLD_V45_TERMINAL_RUNNER",
    )

    prefix = f"datanet-v43-v41-evidence-{node}"
    manifest = ev.object(f"{prefix}/manifest.json")
    restart = ev.object(f"{prefix}/restart-census.json")
    demand(len(restart.get("e0", {}).get("entries", [])) == cfg["ceilings"]["e0_namespace_entries"], "HOLD_V45_TERMINAL_E0_ENTRIES")
    demand(len(restart.get("r0", {}).get("entries", [])) == cfg["ceilings"]["r0_namespace_entries"], "HOLD_V45_TERMINAL_R0_ENTRIES")

    pre = f"datanet-v43-pre-{node}.json"
    post = f"datanet-v43-post-{node}.json"
    demand(ev.raw(pre) == ev.raw(post), "HOLD_V45_TERMINAL_PRE_POST")
    snapshot = ev.object(post)
    demand(snapshot.get("marker") == "VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN", "HOLD_V45_TERMINAL_V42_MARKER")
    demand(snapshot.get("payload_leaves_verified") == 3 and snapshot.get("recovery_records_verified") == 3, "HOLD_V45_TERMINAL_V42_COUNTS")
    demand(set(snapshot.get("records", {})) == {"armed", "claimed", "closed"}, "HOLD_V45_TERMINAL_RECORD_SET")
    for record in snapshot["records"].values():
        demand(record.get("bytes", cfg["ceilings"]["recovery_record_max_bytes"] + 1) <= cfg["ceilings"]["recovery_record_max_bytes"], "HOLD_V45_TERMINAL_RECORD_SIZE")

    v43_name = f"datanet-v43-final-{node}.json"
    demand(ev.raw(v43_name) == ev.raw(f"datanet-v43-final-{node}.jsonl"), "HOLD_V45_TERMINAL_V43_DUPLICATE")
    v43 = ev.object(v43_name)
    v43_true = (
        "simulated_sudden_device_loss_proved", "device_mapper_suspend_noflush",
        "snapshot_before_clean_unmount", "crash_image_needs_recovery_pre_replay",
        "same_mapper_device_identity_recreated", "journal_replay_recovery_completed",
        "pre_post_v42_snapshot_equal", "record_inode_generation_stable",
        "record_fsverity_digest_stable", "fresh_v41_admission_after_recovery",
        "same_uid_inplace_mutation_denied_after_recovery",
    )
    demand(all(v43.get(key) is True for key in v43_true), "HOLD_V45_TERMINAL_V43_CLAIM")
    demand(v43.get("physical_power_loss_proved") is False and v43.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_V43_NONCLAIM")
    pre_states = [superblock(ev.text(f"datanet-v43-{side}-pre-{node}.txt")) for side in ("e0", "r0")]
    post_states = [superblock(ev.text(f"datanet-v43-{side}-post-{node}.txt")) for side in ("e0", "r0")]
    demand(all(item["needs_recovery"] and item["verity"] for item in pre_states), "HOLD_V45_TERMINAL_PRE_SUPER")
    demand(all(not item["needs_recovery"] and item["verity"] for item in post_states), "HOLD_V45_TERMINAL_POST_SUPER")
    crash = key_values(ev.text(f"datanet-v43-crash-copy-{node}.txt"))
    demand(crash.get("e0_source_sha256") == crash.get("e0_crash_sha256") and crash.get("r0_source_sha256") == crash.get("r0_crash_sha256"), "HOLD_V45_TERMINAL_CRASH_COPY")
    sources = key_values(ev.text(f"datanet-v43-sources-{node}.txt"))
    demand(sources.get("e0_before") == sources.get("e0_after") and sources.get("r0_before") == sources.get("r0_after"), "HOLD_V45_TERMINAL_MAPPER_SOURCE")
    demand(sources.get("e0_dm_before") == sources.get("e0_dm_after") and sources.get("r0_dm_before") == sources.get("r0_dm_after"), "HOLD_V45_TERMINAL_MAPPER_IDENTITY")

    capture = ev.object(f"datanet-v45-v44-capture-{node}.json")
    verify_seal(capture, "manifest_sha256", "HOLD_V45_TERMINAL_CAPTURE_SEAL")
    demand(capture.get("marker") == "VOID_DATANET_V44_FSVERITY_RAW_PREIMAGE_CAPTURE_V1_GREEN", "HOLD_V45_TERMINAL_CAPTURE_MARKER")
    demand(capture.get("raw_preimage_matches_sealed_record") is True and capture.get("fiemap_sync_flag_used") is False, "HOLD_V45_TERMINAL_PREIMAGE")
    closed = snapshot["records"]["closed"]
    demand(capture.get("record_identity") == closed.get("identity"), "HOLD_V45_TERMINAL_RECORD_IDENTITY")
    demand(capture.get("record_generation") == closed.get("generation"), "HOLD_V45_TERMINAL_RECORD_GENERATION")
    demand(capture.get("record_sha256") == closed.get("sha256") and capture.get("fsverity") == closed.get("fsverity"), "HOLD_V45_TERMINAL_RECORD_BINDING")

    corrupt_name = f"datanet-v45-v44-corruption-{node}.json"
    demand(ev.raw(corrupt_name) == ev.raw(f"datanet-v45-v44-corruption-{node}.jsonl"), "HOLD_V45_TERMINAL_CORRUPTION_DUPLICATE")
    corrupt = ev.object(corrupt_name)
    demand(corrupt.get("manifest_sha256") == capture.get("manifest_sha256"), "HOLD_V45_TERMINAL_CORRUPTION_BINDING")
    demand(corrupt.get("bytes_written") == cfg["ceilings"]["raw_corruption_bytes"], "HOLD_V45_TERMINAL_CORRUPTION_BYTES")
    demand((corrupt.get("before_hex"), corrupt.get("after_hex"), corrupt.get("xor_mask")) == ("7b", "7a", 1), "HOLD_V45_TERMINAL_CORRUPTION_VALUE")
    diff = ev.text(f"datanet-v45-v44-raw-diff-{node}.txt").split()
    demand(len(diff) == 3 and int(diff[0]) == corrupt["physical_offset"] + 1, "HOLD_V45_TERMINAL_RAW_DIFF")
    demand(int(diff[1], 8) == int(corrupt["before_hex"], 16) and int(diff[2], 8) == int(corrupt["after_hex"], 16), "HOLD_V45_TERMINAL_RAW_DIFF_VALUE")

    v44_name = f"datanet-v45-v44-final-{node}.json"
    demand(ev.raw(v44_name) == ev.raw(f"datanet-v45-v44-final-{node}.jsonl"), "HOLD_V45_TERMINAL_V44_DUPLICATE")
    v44 = ev.object(v44_name)
    v44_true = (
        "record_identity_stable", "record_generation_stable", "record_metadata_stable",
        "fsverity_root_digest_stable", "fsverity_data_read_eio",
        "actual_v41_admission_fails_on_corrupted_record", "same_uid_write_denied",
        "same_uid_rdwr_denied", "same_uid_truncate_denied",
    )
    demand(all(v44.get(key) is True for key in v44_true), "HOLD_V45_TERMINAL_V44_CLAIM")
    demand(v44.get("fsverity_data_read_errno") == 5 and v44.get("actual_v41_admission_errno") == 5, "HOLD_V45_TERMINAL_V44_EIO")
    demand(v44.get("physical_power_loss_proved") is False and v44.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_V44_NONCLAIM")
    v44_super = superblock(ev.text(f"datanet-v45-v44-super-after-{node}.txt"))
    demand(v44_super["verity"] and not v44_super["needs_recovery"], "HOLD_V45_TERMINAL_V44_SUPER")
    loop = key_values(ev.text(f"datanet-v45-v44-loop-{node}.txt"))
    fields = loop.get("dm_table", "").split()
    demand(loop.get("offset") == "0" and loop.get("sizelimit") == "0", "HOLD_V45_TERMINAL_LOOP")
    demand(loop.get("dm_name", "").startswith(f"void-v43-r0-{node}-") and len(fields) >= 5 and fields[0] == "0" and fields[2] == "linear" and fields[4] == "0", "HOLD_V45_TERMINAL_DM")

    return {
        "ordered_markers": [
            campaign["marker"], snapshot["marker"], v43["marker"], capture["marker"],
            corrupt["marker"], v44["marker"],
        ],
        "v41": {
            "total_lifetimes": 27, "peak_live": 9, "payload_calls": 15372,
            "completed_mib": 960, "source_bindings": manifest["source_bindings"],
        },
        "v43": {
            "snapshot_sha256": v43["snapshot_sha256"],
            "journal_replay_recovery_completed": True,
            "record_fsverity_digest_stable": True,
        },
        "v44": {
            "manifest_sha256": capture["manifest_sha256"],
            "record_identity": capture["record_identity"],
            "record_generation": capture["record_generation"],
            "record_sha256": capture["record_sha256"],
            "fsverity": capture["fsverity"],
            "raw_mutation_bytes": 1,
            "direct_read_errno": 5,
            "v41_admission_errno": 5,
        },
        "same_recovered_r0_record_composed": True,
        "run_identity": {"run_id": runner["run_id"], "run_attempt": runner["run_attempt"]},
    }


def trace_records(data: bytes) -> list[tuple[int, float, int, str]]:
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise TerminalHold("HOLD_V45_TERMINAL_TRACE_UTF8") from exc
    incomplete: dict[tuple[int, str], tuple[int, float, str]] = {}
    complete = []
    order = 0
    line_pattern = re.compile(r"^(\d+)\s+([0-9]+(?:\.[0-9]+)?)\s+(.*)$")
    resumed_pattern = re.compile(r"^<\.\.\.\s+([A-Za-z0-9_]+) resumed>(.*)$")
    for line in text.splitlines():
        found = line_pattern.match(line)
        demand(found is not None, "HOLD_V45_TERMINAL_TRACE_LINE")
        pid, timestamp, body = int(found.group(1)), float(found.group(2)), found.group(3)
        if body.endswith("<unfinished ...>"):
            call = body.split("(", 1)[0].strip()
            demand((pid, call) not in incomplete, "HOLD_V45_TERMINAL_TRACE_PENDING")
            incomplete[(pid, call)] = (order, timestamp, body[:-len("<unfinished ...>")].rstrip())
        else:
            resumed = resumed_pattern.match(body)
            if resumed:
                prior = incomplete.pop((pid, resumed.group(1)), None)
                demand(prior is not None, "HOLD_V45_TERMINAL_TRACE_RESUME")
                prior_order, prior_time, prefix = prior
                complete.append((prior_order, prior_time, pid, prefix + resumed.group(2)))
            else:
                complete.append((order, timestamp, pid, body))
        order += 1
    demand(not incomplete and bool(complete), "HOLD_V45_TERMINAL_TRACE_INCOMPLETE")
    return sorted(complete, key=lambda row: (row[1], row[0]))


def result_number(body: str) -> int | None:
    found = re.search(r"\)\s+=\s+(-?\d+)\s*$", body)
    return int(found.group(1)) if found else None


def runner_census(data: bytes, ceilings: dict) -> dict:
    records = trace_records(data)
    root_pid = records[0][2]
    owner = {root_pid: root_pid}
    live = {root_pid}
    lifetimes = {root_pid}
    peak = 1
    paths: dict[str, int] = {}
    basenames: dict[str, int] = {}
    exec_rows = []
    mounts = unmounts = 0
    for _, _, pid, body in records:
        result = result_number(body)
        if body.startswith("execve(") and result == 0:
            found = re.match(r'execve\("([^"]+)"', body)
            demand(found is not None, "HOLD_V45_TERMINAL_EXEC_PATH")
            path = found.group(1)
            paths[path] = paths.get(path, 0) + 1
            base = Path(path).name
            basenames[base] = basenames.get(base, 0) + 1
            exec_rows.append(body)
        if body.startswith("mount(") and result == 0:
            mounts += 1
        if body.startswith("umount2(") and result == 0:
            unmounts += 1
        if body.startswith(("fork(", "vfork(", "clone(", "clone3(")) and result is not None and result > 0:
            threaded = body.startswith(("clone(", "clone3(")) and "CLONE_THREAD" in body
            owner[result] = owner.get(pid, pid) if threaded else result
            if not threaded:
                lifetimes.add(result)
                live.add(result)
                peak = max(peak, len(live))
        if body.startswith("exit_group(") or body.startswith("+++ exited with") or body.startswith("+++ killed by"):
            live.discard(owner.get(pid, pid))

    def count(*needles: str) -> int:
        return sum(1 for row in exec_rows if all(needle in row for needle in needles))

    v41_rows = [row for row in exec_rows if "prove_datanet_v41_durable_recovery_campaign_ext4_v1.py" in row]
    demand(not live, "HOLD_V45_TERMINAL_RUNNER_LIFETIME")
    demand(len(lifetimes) <= ceilings["process_lifetimes_max"] and peak <= ceilings["peak_processes_max"], "HOLD_V45_TERMINAL_RUNNER_PROCESS_CEILING")
    demand(len(exec_rows) <= ceilings["successful_execve_max"], "HOLD_V45_TERMINAL_RUNNER_EXEC_CEILING")
    demand(sum(1 for row in v41_rows if '"--mode"' not in row) == 1, "HOLD_V45_TERMINAL_V41_EXEC")
    demand(count("prove_datanet_v42_fsverity_clean_remount_v1.py", '"capture"') == 2, "HOLD_V45_TERMINAL_V42_EXEC")
    demand(count("prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", '"verify"') == 1, "HOLD_V45_TERMINAL_V43_EXEC")
    demand(count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"capture"') == 1, "HOLD_V45_TERMINAL_V44_CAPTURE")
    demand(count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"corrupt"') == 1, "HOLD_V45_TERMINAL_V44_CORRUPT")
    demand(count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"verify"') == 1, "HOLD_V45_TERMINAL_V44_VERIFY")
    demand(count('execve("/usr/sbin/dmsetup"', '"suspend"', '"--noflush"') == 2, "HOLD_V45_TERMINAL_DM_SUSPEND")
    demand(mounts >= 7 and unmounts >= 7, "HOLD_V45_TERMINAL_MOUNT_CENSUS")
    return {
        "trace_sha256": sha256(data),
        "trace_bytes": len(data),
        "root_pid": root_pid,
        "runner_subgraph_process_lifetimes": len(lifetimes),
        "runner_subgraph_peak_processes": peak,
        "successful_execve": len(exec_rows),
        "exec_paths": dict(sorted(paths.items())),
        "exec_basenames": dict(sorted(basenames.items())),
        "mount_syscalls_success": mounts,
        "umount2_syscalls_success": unmounts,
        "all_runner_subgraph_process_lifetimes_closed": True,
        "full_job_process_census": False,
        "v41_campaign_entry_execs": 1,
        "v41_campaign_role_execs": len(v41_rows),
        "v42_capture_execs": 2,
        "v43_verify_execs": 1,
        "v44_capture_execs": 1,
        "v44_corrupt_execs": 1,
        "v44_verify_execs": 1,
        "dm_suspend_noflush_execs": 2,
    }


def released(receipt_obj: dict, node: int) -> dict:
    release_keys = ("all_images_removed", "all_loops_released", "all_mappers_released", "all_mounts_released")
    demand(all(receipt_obj.get(key) is True for key in release_keys), "HOLD_V45_TERMINAL_RELEASE_RECEIPT")
    demand(receipt_obj.get("marker") == "VOID_DATANET_V45_CAPABILITY_RELEASE_V1_GREEN", "HOLD_V45_TERMINAL_RELEASE_MARKER")
    demand(receipt_obj.get("status") == "GREEN" and receipt_obj.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_RELEASE_STATUS")
    demand(
        isinstance(receipt_obj.get("run_id"), int) and receipt_obj["run_id"] > 0
        and isinstance(receipt_obj.get("run_attempt"), int) and receipt_obj["run_attempt"] > 0,
        "HOLD_V45_TERMINAL_RELEASE_RUN_IDENTITY",
    )
    token = receipt_obj.get("resource_token")
    expected_token = f"void-v43-{node}-{receipt_obj['run_id']}-{receipt_obj['run_attempt']}"
    demand(
        receipt_obj.get("node_major") == node and token == expected_token,
        "HOLD_V45_TERMINAL_RESOURCE_TOKEN",
    )
    live = Path("/proc/self/mountinfo").read_text(encoding="utf-8", errors="strict")
    for pattern in ("loop*/loop/backing_file", "dm-*/dm/name"):
        for path in Path("/sys/block").glob(pattern):
            try:
                live += "\n" + path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                pass
    demand(token not in live, "HOLD_V45_TERMINAL_LIVE_CAPABILITY")
    return {
        "resource_token": token,
        "run_id": receipt_obj["run_id"],
        "run_attempt": receipt_obj["run_attempt"],
        "kernel_scan_clear": True,
        **{key: True for key in release_keys},
    }


def reconstructed(ev: BoundEvidence, node: int, cfg: dict, head: str, tree: str) -> dict:
    source = source_wall(cfg)
    demand(source["head"] == head and source["tree"] == tree, "HOLD_V45_TERMINAL_SOURCE_BINDING")
    runtime = runtime_identity(node, cfg)
    recorded_runtime = ev.object(f"datanet-v45-runtime-{node}.json")
    demand(recorded_runtime == runtime, "HOLD_V45_TERMINAL_RUNTIME_RECONSTRUCTION")
    tiers = tier_receipt(ev, node, cfg)
    process = runner_census(ev.raw(f"datanet-v45-process-{node}.trace"), cfg["ceilings"])
    capability = released(ev.object(f"datanet-v45-capability-release-{node}.json"), node)
    return {"source": source, "runtime": runtime, "tiers": tiers, "process": process, "capability": capability}


EXPECTED_REJECTIONS = {
    "missing": "HOLD_V45_ARTIFACT_MEMBERSHIP",
    "substituted": "HOLD_V45_ARTIFACT_DIGEST",
    "mixed_head": "HOLD_V45_MIXED_HEAD",
    "mixed_tree": "HOLD_V45_MIXED_TREE",
    "premature": "HOLD_V45_PREMATURE_AGGREGATE",
}


def validate_candidate(candidate: dict, evidence_inventory: dict, rebuilt: dict, head: str, tree: str) -> None:
    verify_seal(candidate, "candidate_sha256", "HOLD_V45_TERMINAL_CANDIDATE_SEAL")
    demand(candidate.get("marker") == CANDIDATE_MARKER and candidate.get("status") == "GREEN", "HOLD_V45_TERMINAL_CANDIDATE_MARKER")
    demand(candidate.get("head") == head and candidate.get("source", {}).get("head") == head, "HOLD_V45_TERMINAL_MIXED_HEAD")
    demand(candidate.get("tree") == tree and candidate.get("source", {}).get("tree") == tree, "HOLD_V45_TERMINAL_MIXED_TREE")
    demand(candidate.get("parent_head") == PARENT_HEAD, "HOLD_V45_TERMINAL_PARENT_HEAD")
    demand(candidate.get("input_inventory") == evidence_inventory, "HOLD_V45_TERMINAL_ARTIFACT_RECONSTRUCTION")
    demand(candidate.get("source") == rebuilt["source"], "HOLD_V45_TERMINAL_SOURCE_RECONSTRUCTION")
    demand(candidate.get("run_id") == candidate.get("source_execution", {}).get("run_id"), "HOLD_V45_TERMINAL_RUN_ID")
    demand(
        candidate.get("run_attempt") == candidate.get("source_execution", {}).get("run_attempt"),
        "HOLD_V45_TERMINAL_RUN_ATTEMPT",
    )
    demand(
        candidate.get("source_execution") == candidate_source_execution_view(rebuilt["source_execution"]),
        "HOLD_V45_TERMINAL_SOURCE_EXECUTION_RECONSTRUCTION",
    )
    demand(candidate.get("runtime") == rebuilt["runtime"], "HOLD_V45_TERMINAL_RUNTIME_RECONSTRUCTION")
    demand(candidate.get("tiers") == rebuilt["tiers"], "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION")
    demand(candidate.get("runner_subgraph_process_census") == rebuilt["process"], "HOLD_V45_TERMINAL_PROCESS_RECONSTRUCTION")
    demand(candidate.get("capability_release") == rebuilt["capability"], "HOLD_V45_TERMINAL_CAPABILITY_RECONSTRUCTION")
    accounting = candidate.get("process_accounting", {})
    untraced = accounting.get("untraced_phases", {})
    demand(
        accounting.get("scope") == "runner_subgraph_only"
        and accounting.get("runner_subgraph", {}).get("trace_complete_within_subgraph") is True
        and accounting.get("runner_subgraph", {}).get("process_lifetimes") == rebuilt["process"]["runner_subgraph_process_lifetimes"]
        and accounting.get("runner_subgraph", {}).get("successful_execve") == rebuilt["process"]["successful_execve"]
        and accounting.get("runner_subgraph", {}).get("peak_processes") == rebuilt["process"]["runner_subgraph_peak_processes"]
        and accounting.get("full_job_process_census") is False
        and set(untraced) == {
            "preallocation_static_runtime", "candidate_aba_control", "candidate",
            "candidate_controls", "producer_substitution_control", "terminal_aba_control",
            "terminal_verifier", "source_execution_supervision", "artifact_upload",
            "cross_runtime_stale_attempt_control", "cross_runtime_aggregate",
            "custody_session", "custody_controls", "capsule_export",
        }
        and all(
            row == {"trace_complete": False, "process_lifetimes": None, "successful_execve": None}
            for row in untraced.values()
        ),
        "HOLD_V45_TERMINAL_PROCESS_SCOPE",
    )
    demand(candidate.get("artifact_generation_bound") is True, "HOLD_V45_TERMINAL_CANDIDATE_GENERATION")
    demand(
        candidate.get("source_inventory_and_execution_generation_bound") is True
        and candidate.get("external_source_generation_aba_control") is True
        and candidate.get("exact_phase_argv_allowlisted") is True
        and candidate.get("supervisor_owned_create_only_outputs") is True
        and candidate.get("relabeled_help_controls") is True
        and candidate.get("workflow_run_attempt_bound") is True,
        "HOLD_V45_TERMINAL_SOURCE_EXECUTION_BINDING",
    )
    demand(candidate.get("mutators_retired") is True and candidate.get("capabilities_released") is True, "HOLD_V45_TERMINAL_PREMATURE")
    demand(candidate.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_PRODUCTION_TOUCH")


def validate_controls(controls: dict, candidate: dict, *, substituted: bool = False) -> None:
    verify_seal(controls, "controls_sha256", "HOLD_V45_TERMINAL_CONTROLS_SEAL")
    demand(controls.get("marker") == CONTROLS_MARKER and controls.get("status") == "GREEN", "HOLD_V45_TERMINAL_CONTROLS_MARKER")
    demand(controls.get("candidate_sha256") == candidate.get("candidate_sha256"), "HOLD_V45_TERMINAL_CONTROLS_BINDING")
    demand(
        controls.get("run_id") == candidate.get("run_id")
        and controls.get("run_attempt") == candidate.get("run_attempt"),
        "HOLD_V45_TERMINAL_CONTROLS_RUN_IDENTITY",
    )
    demand(controls.get("rejections") == EXPECTED_REJECTIONS and controls.get("all_rejected") is True, "HOLD_V45_TERMINAL_CONTROLS_RESULT")
    demand(controls.get("control_implementation_imports_candidate") is False, "HOLD_V45_TERMINAL_CONTROL_COUPLING")
    aba = controls.get("candidate_generation_aba_control", {})
    demand(isinstance(aba, dict), "HOLD_V45_TERMINAL_CANDIDATE_ABA_CONTROL")
    verify_seal(aba, "receipt_sha256", "HOLD_V45_TERMINAL_CANDIDATE_ABA_SEAL")
    demand(aba.get("marker") == "VOID_DATANET_V45_CANDIDATE_ABA_CONTROL_V1_GREEN" and aba.get("rejection") == "HOLD_V45_ARTIFACT_GENERATION_CHANGED", "HOLD_V45_TERMINAL_CANDIDATE_ABA_CONTROL")
    producer = controls.get("producer_substitution_fixture", {})
    demand(
        isinstance(producer, dict)
        and producer.get("changed_predicate") == "tiers.v44.direct_read_errno"
        and producer.get("original") == 5
        and producer.get("substituted") == 0
        and isinstance(producer.get("candidate_sha256"), str)
        and len(producer["candidate_sha256"]) == 64
        and ((producer["candidate_sha256"] == candidate.get("candidate_sha256")) is substituted),
        "HOLD_V45_TERMINAL_PRODUCER_FIXTURE_BINDING",
    )
    demand(controls.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_PRODUCTION_TOUCH")


def validate_control_receipt(obj: dict, marker: str, rejection: str) -> None:
    verify_seal(obj, "receipt_sha256", "HOLD_V45_TERMINAL_CONTROL_RECEIPT_SEAL")
    demand(obj.get("marker") == marker and obj.get("status") == "GREEN", "HOLD_V45_TERMINAL_CONTROL_RECEIPT_MARKER")
    demand(obj.get("rejection") == rejection and obj.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_CONTROL_RECEIPT_RESULT")


def pause_for_aba(ns: argparse.Namespace) -> None:
    ready = getattr(ns, "generation_control_ready", None)
    proceed = getattr(ns, "generation_control_continue", None)
    demand(isinstance(ready, str) and isinstance(proceed, str), "HOLD_V45_TERMINAL_ABA_ARGUMENTS")
    ready_path = Path(ready)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(ready_path, flags, 0o600)
    try:
        os.write(fd, b"terminal-snapshot-retained\n")
        os.fsync(fd)
    finally:
        os.close(fd)
    deadline = time.monotonic() + 30
    while not Path(proceed).exists():
        demand(time.monotonic() < deadline, "HOLD_V45_TERMINAL_ABA_TIMEOUT")
        time.sleep(0.02)


def write_exclusive(path: Path, obj: dict) -> None:
    if os.environ.get("VOID_V45_OUTPUT_STREAMS_V1") == "1":
        custody_access().write_stream_output(path, canonical(obj))
        return
    data = canonical(obj)
    if os.environ.get("VOID_V45_OUTPUT_CUSTODY_V1") == "1":
        try:
            mapping = json.loads(os.environ["VOID_V45_OUTPUT_FDS"])
            fd = mapping[str(path)]
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise TerminalHold("HOLD_V45_TERMINAL_OUTPUT_FD_CONTRACT") from exc
        demand(isinstance(fd, int) and fd >= 3, "HOLD_V45_TERMINAL_OUTPUT_FD_CONTRACT")
        before = os.fstat(fd)
        demand(
            stat.S_ISREG(before.st_mode)
            and before.st_nlink == 1
            and stat.S_IMODE(before.st_mode) == 0o400
            and before.st_size == 0,
            "HOLD_V45_TERMINAL_OUTPUT_FD_SHAPE",
        )
        offset = 0
        while offset < len(data):
            count = os.write(fd, data[offset:])
            demand(count > 0, "HOLD_V45_TERMINAL_OUTPUT_FD_WRITE")
            offset += count
        os.fsync(fd)
        after = os.fstat(fd)
        demand(
            (before.st_dev, before.st_ino, before.st_mode, before.st_nlink, before.st_uid, before.st_gid)
            == (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_uid, after.st_gid)
            and after.st_size == len(data),
            "HOLD_V45_TERMINAL_OUTPUT_FD_CHANGED",
        )
        return
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600)
    try:
        offset = 0
        while offset < len(data):
            count = os.write(fd, data[offset:])
            demand(count > 0, "HOLD_V45_TERMINAL_OUTPUT_WRITE")
            offset += count
        os.fsync(fd)
    finally:
        os.close(fd)


def normal_names(node: int, stage: str) -> set[str]:
    names = base_names(node) | {
        f"datanet-v45-candidate-{node}.json",
        f"datanet-v45-controls-{node}.json",
        f"datanet-v45-source-execution-candidate-{node}.json",
        f"datanet-v45-source-execution-controls-{node}.json",
    }
    if stage in ("terminal-aba", "final"):
        names.add(f"datanet-v45-producer-substitution-control-{node}.json")
        names.add(f"datanet-v45-source-execution-producer-control-{node}.json")
    if stage == "final":
        names.add(f"datanet-v45-terminal-aba-control-{node}.json")
        names.add(f"datanet-v45-source-execution-terminal-aba-{node}.json")
        names.add(f"datanet-v45-phase-argv-control-finalizer-{node}.json")
        names.add(f"datanet-v45-preexisting-output-control-finalizer-{node}.json")
    return names


def verify_stage(ns: argparse.Namespace, stage: str) -> tuple[BoundEvidence, dict, dict, dict]:
    cfg = config()
    ev = BoundEvidence(Path(ns.evidence_root), normal_names(ns.node_major, stage))
    try:
        if stage == "terminal-aba":
            pause_for_aba(ns)
            ev.assert_current()
        rebuilt = reconstructed(ev, ns.node_major, cfg, ns.expected_head, ns.expected_tree)
        source_execution = verify_source_execution(ev, ns.node_major, rebuilt["source"], stage)
        rebuilt["source_execution"] = source_execution
        demand(
            rebuilt["tiers"]["run_identity"]
            == {"run_id": source_execution["run_id"], "run_attempt": source_execution["run_attempt"]}
            == {"run_id": rebuilt["capability"]["run_id"], "run_attempt": rebuilt["capability"]["run_attempt"]},
            "HOLD_V45_TERMINAL_RUN_IDENTITY_MISMATCH",
        )
        base_inventory = {name: ev.inventory[name] for name in base_names(ns.node_major)}
        candidate = ev.object(f"datanet-v45-candidate-{ns.node_major}.json")
        controls = ev.object(f"datanet-v45-controls-{ns.node_major}.json")
        validate_candidate(candidate, base_inventory, rebuilt, ns.expected_head, ns.expected_tree)
        validate_controls(controls, candidate)
        if stage in ("terminal-aba", "final"):
            producer = ev.object(f"datanet-v45-producer-substitution-control-{ns.node_major}.json")
            validate_control_receipt(producer, PRODUCER_CONTROL_MARKER, "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION")
        if stage == "final":
            terminal_aba = ev.object(f"datanet-v45-terminal-aba-control-{ns.node_major}.json")
            validate_control_receipt(terminal_aba, TERMINAL_ABA_MARKER, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        ev.assert_current()
        return ev, rebuilt, candidate, controls
    except BaseException:
        ev.close()
        raise


def producer_control(ns: argparse.Namespace) -> int:
    cfg = config()
    ev = BoundEvidence(Path(ns.evidence_root), normal_names(ns.node_major, "producer"))
    try:
        rebuilt = reconstructed(ev, ns.node_major, cfg, ns.expected_head, ns.expected_tree)
        rebuilt["source_execution"] = verify_source_execution(ev, ns.node_major, rebuilt["source"], "producer")
        demand(
            rebuilt["tiers"]["run_identity"]
            == {
                "run_id": rebuilt["source_execution"]["run_id"],
                "run_attempt": rebuilt["source_execution"]["run_attempt"],
            }
            == {
                "run_id": rebuilt["capability"]["run_id"],
                "run_attempt": rebuilt["capability"]["run_attempt"],
            },
            "HOLD_V45_TERMINAL_RUN_IDENTITY_MISMATCH",
        )
        base_inventory = {name: ev.inventory[name] for name in base_names(ns.node_major)}
        fake_candidate = decode_object(custody_artifact_read(Path(ns.substitute_candidate)), "HOLD_V45_TERMINAL_FAKE_CANDIDATE_JSON")
        fake_controls = decode_object(custody_artifact_read(Path(ns.substitute_controls)), "HOLD_V45_TERMINAL_FAKE_CONTROLS_JSON")
        validate_controls(fake_controls, fake_candidate, substituted=True)
        try:
            validate_candidate(fake_candidate, base_inventory, rebuilt, ns.expected_head, ns.expected_tree)
        except TerminalHold as exc:
            demand(exc.code == "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION", "HOLD_V45_TERMINAL_PRODUCER_WRONG_REJECTION")
        else:
            raise TerminalHold("HOLD_V45_TERMINAL_PRODUCER_ACCEPTED")
        ev.assert_current()
    finally:
        ev.close()
    out = seal({
        "marker": PRODUCER_CONTROL_MARKER,
        "status": "GREEN",
        "rejection": "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION",
        "substitute_candidate_sha256": fake_candidate["candidate_sha256"],
        "substitute_controls_sha256": fake_controls["controls_sha256"],
        "production_runtime_touched": False,
    }, "receipt_sha256")
    write_exclusive(Path(ns.output), out)
    print(canonical(out).decode(), end="")
    return 0


def terminal_aba_control(ns: argparse.Namespace) -> int:
    try:
        ev, _, _, _ = verify_stage(ns, "terminal-aba")
    except TerminalHold as exc:
        demand(exc.code == "HOLD_V45_ARTIFACT_GENERATION_CHANGED", "HOLD_V45_TERMINAL_ABA_WRONG_REJECTION")
    else:
        ev.close()
        raise TerminalHold("HOLD_V45_TERMINAL_ABA_ACCEPTED")
    out = seal({
        "marker": TERMINAL_ABA_MARKER,
        "status": "GREEN",
        "rejection": "HOLD_V45_ARTIFACT_GENERATION_CHANGED",
        "production_runtime_touched": False,
    }, "receipt_sha256")
    write_exclusive(Path(ns.output), out)
    print(canonical(out).decode(), end="")
    return 0


def finalize(ns: argparse.Namespace) -> int:
    custody_access().input_envelope()
    ev, rebuilt, candidate, controls = verify_stage(ns, "final")
    try:
        inventory = copy.deepcopy(ev.inventory)
    finally:
        ev.close()
    process_accounting = copy.deepcopy(candidate["process_accounting"])
    output_name = Path(ns.output).name
    out = {
        "marker": AGGREGATE_MARKER,
        "status": "GREEN",
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "run_id": rebuilt["source_execution"]["run_id"],
        "run_attempt": rebuilt["source_execution"]["run_attempt"],
        "parent_head": PARENT_HEAD,
        "node_major": ns.node_major,
        "candidate_sha256": candidate["candidate_sha256"],
        "controls_sha256": controls["controls_sha256"],
        "source": rebuilt["source"],
        "source_execution": rebuilt["source_execution"],
        "runtime": rebuilt["runtime"],
        "tiers": rebuilt["tiers"],
        "runner_subgraph_process_census": rebuilt["process"],
        "process_accounting": process_accounting,
        "capability_release": rebuilt["capability"],
        "artifact_inventory": inventory,
        "expected_archive_members": sorted(
            set(inventory)
            | {output_name, f"datanet-v45-source-execution-finalizer-{ns.node_major}.json"}
        ),
        "artifact_generation_bound": True,
        "supervisor_to_verifier_custody": True,
        "nested_producer_prebinding_proved": False,
        "candidate_generation_aba_control": True,
        "terminal_generation_aba_control": True,
        "producer_substitution_control": True,
        "source_distinct_terminal_verifier": True,
        "terminal_verifier_imports_candidate_or_controls": False,
        "transitive_source_wall_verified": True,
        "source_inventory_and_execution_generation_bound": True,
        "external_source_generation_aba_control": True,
        "exact_phase_argv_allowlisted": True,
        "supervisor_owned_create_only_outputs": True,
        "relabeled_help_controls": True,
        "preexisting_output_controls": True,
        "workflow_run_attempt_bound": True,
        "full_job_process_census": False,
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_proved": False,
        "full_campaign_evidence_accepted": False,
        "datanet_availability_proved": False,
        "production_runtime_touched": False,
    }
    out = seal(out, "aggregate_sha256")
    write_exclusive(Path(ns.output), out)
    print(canonical(out).decode(), end="")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    modes = p.add_subparsers(dest="mode", required=True)
    for name in ("producer-control", "terminal-aba-control", "finalize"):
        child = modes.add_parser(name)
        child.add_argument("--node-major", type=int, choices=(22, 24, 26), required=True)
        child.add_argument("--evidence-root", required=True)
        child.add_argument("--expected-head", required=True)
        child.add_argument("--expected-tree", required=True)
        child.add_argument("--output", required=True)
        if name == "producer-control":
            child.add_argument("--substitute-candidate", required=True)
            child.add_argument("--substitute-controls", required=True)
        if name == "terminal-aba-control":
            child.add_argument("--generation-control-ready", required=True)
            child.add_argument("--generation-control-continue", required=True)
    return p


def main() -> int:
    ns = parser().parse_args()
    if ns.mode == "producer-control":
        return producer_control(ns)
    if ns.mode == "terminal-aba-control":
        return terminal_aba_control(ns)
    return finalize(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except TerminalHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_TERMINAL_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise
