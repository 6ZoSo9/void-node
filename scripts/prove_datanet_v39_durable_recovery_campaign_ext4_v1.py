#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations
import argparse, json, os, signal, sys
from pathlib import Path
SCRIPT_DIR=Path(__file__).resolve().parent; REPO_ROOT=SCRIPT_DIR.parent; sys.path.insert(0,str(SCRIPT_DIR))

import datanet_v39_recovery_record_io_v1 as v39_io
import datanet_v39_exec_claimant_record_v1 as v39_record
import datanet_v39_claimant_capability_v1 as v39_claimant
sys.modules["datanet_v34_recovery_record_io_v1"]=v39_io
sys.modules["datanet_v34_exec_claimant_record_v1"]=v39_record
sys.modules["datanet_v34_claimant_capability_v1"]=v39_claimant

import datanet_v34_campaign_common_v1 as common
import datanet_v34_campaign_modes_v1 as modes
import datanet_v34_campaign_run_v1 as run
import datanet_v34_campaign_acceptance_v1 as acceptance
import prove_datanet_v31_campaign_topology_ext4_v1 as v31

ACCEPTED_V38="bdf244f56b151250cb76a595864cde8e174ea499"
ENTRY=Path(__file__).resolve(); FINAL=SCRIPT_DIR/"prove_datanet_v39_campaign_final_verifier_v1.py"; ADAPTER=SCRIPT_DIR/"prove_datanet_v39_exec_claimant_adapter_v1.mjs"; SUPPORT=SCRIPT_DIR/"datanet_v39_exec_claimant_adapter_support_v1.mjs"; LINK=SCRIPT_DIR/"datanet_v39_link_generation_record_helper_v1.py"; CONTROL=REPO_ROOT/"fixtures/datanet-v39-generation-bound-record-admission-ext4-v1.json"; CENSUS=SCRIPT_DIR/"prove_datanet_v39_syscall_census_v1.py"; STATIC=SCRIPT_DIR/"prove_datanet_v39_static_gate_v1.py"; MUTATION=SCRIPT_DIR/"prove_datanet_v39_record_admission_mutation_control_v1.py"
common.ADAPTER=ADAPTER; common.ADAPTER_SUPPORT=SUPPORT; common.LINK_HELPER=LINK
_original_adapter_env=common.adapter_env

def v39_sources():
    return {
        "v39_control_sha256":common.sha256_path(CONTROL),"v39_record_io_sha256":v39_io.source_sha256(),"v39_record_sha256":v39_record.source_sha256(),
        "v39_claimant_sha256":v39_claimant.source_sha256(),"v39_link_generation_record_helper_sha256":common.sha256_path(LINK),
        "v39_exec_claimant_adapter_sha256":common.sha256_path(ADAPTER),"v39_exec_claimant_adapter_support_sha256":common.sha256_path(SUPPORT),
        "v39_entrypoint_sha256":common.sha256_path(ENTRY),"v39_final_verifier_sha256":common.sha256_path(FINAL),
        "v39_syscall_census_sha256":common.sha256_path(CENSUS),"v39_static_gate_sha256":common.sha256_path(STATIC),
        "v39_mutation_control_sha256":common.sha256_path(MUTATION),
    }

def v39_adapter_env(root,binding,lock_fd,hold_fd,slot,action):
    node,env=_original_adapter_env(root,binding,lock_fd,hold_fd,slot,action); fixture=v31.load_fixture(); env["VOID_V39_PAYLOAD_BYTES"]=str(fixture["payload_bytes"]); env["VOID_V39_PAYLOAD_SHA256"]=fixture["payload_sha256"]
    if action=="close-s1":
        assert v39_claimant.EXEC_ARMED is not None and v39_claimant.EXEC_CLAIMED is not None
        a=v39_claimant.EXEC_ARMED; c=v39_claimant.EXEC_CLAIMED
        for fd in (a["fd"],c["fd"]): assert fd>=3; os.set_inheritable(fd,True)
        env.update({"VOID_V39_ARMED_RECORD_FD":str(a["fd"]),"VOID_V39_ARMED_RECORD_GENERATION":str(a["generation"]),"VOID_V39_CLAIMED_RECORD_FD":str(c["fd"]),"VOID_V39_CLAIMED_RECORD_GENERATION":str(c["generation"])})
    return node,env
common.adapter_env=v39_adapter_env
run.ENTRYPOINT=ENTRY; run.FINAL_SCRIPT=FINAL; run.FINAL_MARKER="VOID_DATANET_V39_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
acceptance.ENTRYPOINT=ENTRY; acceptance.FINAL=FINAL; acceptance.MARKER="VOID_DATANET_V39_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN"

_original_write_evidence=v31.write_evidence
def v39_write_evidence(evidence_dir,files):
    files=json.loads(json.dumps(files))
    manifest=files["manifest.json"]; manifest["format"]="VOID_DATANET_V39_CAMPAIGN_MANIFEST_V1"; manifest["parent_pr"]=1498; manifest["parent_head"]=ACCEPTED_V38; manifest["source_bindings"].update(v39_sources()); manifest["generation_bound_record_admission"]=True
    runtime=files["runtime.json"]; runtime["format"]="VOID_DATANET_V39_CAMPAIGN_RUNTIME_V1"
    observer=files["observer.json"]; observer["format"]="VOID_DATANET_V39_CAMPAIGN_OBSERVER_V1"
    restart=files["restart-census.json"]; restart["format"]="VOID_DATANET_V39_CAMPAIGN_RESTART_CENSUS_V1"; restart["generation_bound_record_admission"]=True; restart["external_getversion_expected"]=17
    aggregate=files["aggregate.json"]; aggregate["format"]="VOID_DATANET_V39_CAMPAIGN_AGGREGATE_V1"; aggregate["durable_recovery"]["generation_observations_expected_by_external_census"]=17; aggregate["durable_recovery"]["generation_bound_record_admission"]=True; aggregate["durable_recovery"]["record_schema"]="V3"; aggregate["external_getversion_expected"]=17
    return _original_write_evidence(evidence_dir,files)
v31.write_evidence=v39_write_evidence

_original_emit=v31.emit
def v39_emit(obj):
    if isinstance(obj,dict) and obj.get("marker")=="VOID_DATANET_V39_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN":
        obj=dict(obj); obj["parent_head"]=ACCEPTED_V38; obj["ext4_getversion_observations_expected"]=17; obj["generation_bound_record_admission"]=True; obj["record_schema"]="V3"; obj["source_bindings"]={**obj.get("source_bindings",{}),**v39_sources()}
    _original_emit(obj)
v31.emit=v39_emit

def parser():
    p=argparse.ArgumentParser(); p.add_argument("--mode",choices=("proof","contender","publisher","classifier","collector"),default="proof"); p.add_argument("--root"); p.add_argument("--root-identity"); p.add_argument("--lock-identity"); p.add_argument("--k"); p.add_argument("--slot",type=int); p.add_argument("--ready-fd",type=int); p.add_argument("--start-fd",type=int); p.add_argument("--event-fd",type=int); p.add_argument("--gate-fd",type=int); p.add_argument("--hold-fd",type=int); p.add_argument("--prior-fd",type=int); p.add_argument("--expected-s0-identity"); p.add_argument("--expected-s0-generation",type=int); p.add_argument("--expected-armed-sha256"); return p

def dispatch(ns):
    if ns.mode=="proof": return acceptance.main_proof()
    for name in ("root","root_identity","lock_identity","k"): assert getattr(ns,name) is not None
    if ns.mode=="contender":
        for name in ("slot","ready_fd","start_fd","event_fd","gate_fd","hold_fd","prior_fd"): assert getattr(ns,name) is not None
        return modes.contender_mode(ns)
    if ns.mode=="publisher": assert ns.hold_fd is not None; return modes.publisher_mode(ns)
    if ns.mode=="classifier": return modes.classifier_mode(ns)
    for name in ("expected_s0_identity","expected_s0_generation","expected_armed_sha256"): assert getattr(ns,name) is not None
    return modes.collector_mode(ns)
def expired(_s,_f): raise TimeoutError("V39 proof exceeded accepted outer wall")
if __name__=="__main__":
    ns=parser().parse_args(); armed=False
    try:
        if ns.mode=="proof": signal.signal(signal.SIGALRM,expired); signal.alarm(v31.load_fixture()["phase_deadlines_seconds"]["outer_wall"]); armed=True
        raise SystemExit(dispatch(ns))
    finally:
        if armed: signal.alarm(0)
        v31.terminate_active()
