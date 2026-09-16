#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations
import argparse, hashlib, json, os, stat, sys
from pathlib import Path
SCRIPT_DIR=Path(__file__).resolve().parent; sys.path.insert(0,str(SCRIPT_DIR))
import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v39_claimant_capability_v1 as claimant_capability
import datanet_v39_exec_claimant_record_v1 as recovery_record
import prove_datanet_posix_admission_capability_v1 as admission
SOURCE=Path(__file__).resolve(); MARKER="VOID_DATANET_V39_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"

def sha256_path(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def identity(st): return f"{st.st_dev}:{st.st_ino}"
def open_root(root,expected):
    flags=os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|(os.O_NOFOLLOW if hasattr(os,"O_NOFOLLOW") else 0); fd=os.open(root,flags); st=os.fstat(fd); assert stat.S_ISDIR(st.st_mode) and identity(st)==expected; return fd

def binding_for(root_fd,root_identity,k):
    cap=admission.capability_name(k); st=os.stat(cap,dir_fd=root_fd,follow_symlinks=False); assert stat.S_ISREG(st.st_mode) and st.st_uid==os.getuid() and st.st_nlink==1 and stat.S_IMODE(st.st_mode)==0o600 and st.st_size==0; return admission.Binding(root_identity=root_identity,lock_identity=identity(st),k=k)
def verify_leaf(root_fd,k,slot,fixture):
    name=f"datanet-{k}-s{slot}.v1"; flags=os.O_RDONLY|os.O_CLOEXEC|(os.O_NOFOLLOW if hasattr(os,"O_NOFOLLOW") else 0); fd=os.open(name,flags,dir_fd=root_fd)
    try:
        before=os.fstat(fd); visible=os.stat(name,dir_fd=root_fd,follow_symlinks=False); assert stat.S_ISREG(before.st_mode) and identity(before)==identity(visible); assert before.st_uid==os.getuid() and before.st_nlink==1 and stat.S_IMODE(before.st_mode)==0o600; assert before.st_size==fixture["payload_bytes"] and before.st_blocks*512>=fixture["payload_bytes"]
        fp=(before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns,before.st_blocks); h=hashlib.sha256(); calls=requested=returned=0; block=fixture["io_block_bytes"]
        for off in range(0,fixture["payload_bytes"],block):
            data=os.pread(fd,block,off); calls+=1; requested+=block; returned+=len(data); assert len(data)==block; h.update(data)
        eof=os.pread(fd,1,fixture["payload_bytes"]); calls+=1; requested+=1; returned+=len(eof); assert eof==b"" and h.hexdigest()==fixture["payload_sha256"]
        gen=inode_generation.observe_ext4_inode_generation_v1(fd); after=os.fstat(fd); assert (after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns,after.st_blocks)==fp
        return {"name":name,"identity":identity(before),"generation":gen["generation"],"generation_identity":f"{identity(before)}:{gen['generation']}","length":before.st_size,"sha256":h.hexdigest(),"ledger":{"read_calls":calls,"read_requested_bytes":requested,"read_returned_bytes":returned,"eof_probes":1}}
    finally: os.close(fd)
def main():
    p=argparse.ArgumentParser(); p.add_argument("--fixture",required=True); p.add_argument("--e0-root",required=True); p.add_argument("--e0-root-identity",required=True); p.add_argument("--r0-root",required=True); p.add_argument("--r0-root-identity",required=True); ns=p.parse_args(); fixture=json.loads(Path(ns.fixture).read_text()); k=fixture["quota_key"]
    efd=open_root(ns.e0_root,ns.e0_root_identity); rfd=open_root(ns.r0_root,ns.r0_root_identity)
    try:
        eb=binding_for(efd,ns.e0_root_identity,k); rb=binding_for(rfd,ns.r0_root_identity,k); eexp={admission.capability_name(k),f"datanet-{k}-s0.v1"}; rexp={admission.capability_name(k),f"datanet-{k}-s0.v1",f"datanet-{k}-s1.v1",recovery_record.armed_name(k),recovery_record.claimed_name(k),recovery_record.closed_name(k)}; assert set(os.listdir(efd))==eexp and set(os.listdir(rfd))==rexp
        e0=verify_leaf(efd,k,0,fixture); r0=verify_leaf(rfd,k,0,fixture); r1=verify_leaf(rfd,k,1,fixture); assert r0["identity"]!=r1["identity"]
        er=recovery_record.read_records(efd,eb); assert er=={"armed":None,"claimed":None,"closed":None}; rr=recovery_record.read_records(rfd,rb); armed,claimed,closed=rr["armed"],rr["claimed"],rr["closed"]; assert armed and claimed and closed
        recovery_record.validate_armed(armed["record"],rb,r0); recovery_record.validate_claimed(claimed["record"],rb,armed["sha256"]); assert claimed["record"]["claimant_source_sha256"]==claimant_capability.source_sha256(); recovery_record.validate_closed_recovery(closed["record"],rb,armed["sha256"],claimed["sha256"],claimed["record"],r1)
        ledger={"read_calls":e0["ledger"]["read_calls"]+r0["ledger"]["read_calls"]+r1["ledger"]["read_calls"],"read_requested_bytes":e0["ledger"]["read_requested_bytes"]+r0["ledger"]["read_requested_bytes"]+r1["ledger"]["read_requested_bytes"],"read_returned_bytes":e0["ledger"]["read_returned_bytes"]+r0["ledger"]["read_returned_bytes"]+r1["ledger"]["read_returned_bytes"],"eof_probes":3}; assert ledger=={**fixture["final_verifier_ledger"],"eof_probes":3}
        out={"marker":MARKER,"status":"GREEN","source_sha256":sha256_path(SOURCE),"record_source_sha256":recovery_record.source_sha256(),"claimant_source_sha256":claimant_capability.source_sha256(),"inode_generation_source_sha256":inode_generation.source_sha256(),"generation_ioctl_calls":3,"record_generation_ioctl_calls":3,"total_generation_ioctl_calls":6,"ledger":ledger,"e0":{"decision":"HOLD_NO_RECOVERY_AUTH","leaves":[e0]},"r0":{"decision":"COMPLETE_RECOVERY_H1","leaves":[r0,r1]},"armed_sha256":armed["sha256"],"claimed_sha256":claimed["sha256"],"closed_sha256":closed["sha256"],"armed_record_generation_identity":armed["generation_identity"],"claimed_record_generation_identity":claimed["generation_identity"],"closed_record_generation_identity":closed["generation_identity"],"generation_bound_record_admission":True,"same_claimant_pid_bound_claimed_closed":claimed["record"]["claimant_pid"]==closed["record"]["claimant_pid"],"source_distinct_from_campaign_supervisor":True,"production_runtime_touched":False}; print(json.dumps(out,sort_keys=True,separators=(",",":"))); return 0
    finally: os.close(rfd); os.close(efd)
if __name__=="__main__": raise SystemExit(main())
