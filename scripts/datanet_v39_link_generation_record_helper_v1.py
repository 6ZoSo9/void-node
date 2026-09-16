#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0,str(SCRIPT_DIR))
import datanet_ext4_inode_generation_v1 as inode_generation

SOURCE = Path(__file__).resolve()
MARKER = "VOID_DATANET_V39_LINK_GENERATION_RECORD_HELPER_V1_GREEN"


def source_sha256(): return hashlib.sha256(SOURCE.read_bytes()).hexdigest()
def ident(st): return f"{st.st_dev}:{st.st_ino}"


def main() -> int:
    p=argparse.ArgumentParser(); p.add_argument("--slot-name",required=True); p.add_argument("--payload-fd",type=int,default=3); p.add_argument("--root-fd",type=int,default=4)
    p.add_argument("--reserved-name"); p.add_argument("--reserved-fd",type=int,default=-1); ns=p.parse_args()
    assert ns.payload_fd>=3 and ns.root_fd>=3 and ns.payload_fd!=ns.root_fd
    assert "/" not in ns.slot_name and ns.slot_name not in ("",".","..")
    pb=os.fstat(ns.payload_fd); rs=os.fstat(ns.root_fd)
    assert stat.S_ISREG(pb.st_mode) and stat.S_ISDIR(rs.st_mode) and pb.st_uid==os.getuid() and pb.st_nlink==0
    os.link(f"/proc/self/fd/{ns.payload_fd}",ns.slot_name,dst_dir_fd=ns.root_fd,follow_symlinks=True)
    pa=os.fstat(ns.payload_fd); visible=os.stat(ns.slot_name,dir_fd=ns.root_fd,follow_symlinks=False)
    assert ident(pa)==ident(visible)==ident(pb) and pa.st_nlink==visible.st_nlink==1
    assert visible.st_uid==os.getuid() and stat.S_IMODE(visible.st_mode)==0o600
    pg=inode_generation.observe_ext4_inode_generation_v1(ns.payload_fd)
    receipt={"marker":MARKER,"status":"GREEN","pid":os.getpid(),"source_sha256":source_sha256(),
             "generation_source_sha256":inode_generation.source_sha256(),"slot_name":ns.slot_name,"payload_identity":ident(pa),
             "generation":pg["generation"],"generation_identity":f"{ident(pa)}:{pg['generation']}","link_create_only":True,
             "payload_fd":ns.payload_fd,"root_fd":ns.root_fd,"payload_generation_ioctl_calls":1,"setversion_issued":False}
    if ns.reserved_fd>=0:
        assert ns.reserved_fd not in (ns.payload_fd,ns.root_fd) and isinstance(ns.reserved_name,str) and "/" not in ns.reserved_name
        rb=os.fstat(ns.reserved_fd); rv=os.stat(ns.reserved_name,dir_fd=ns.root_fd,follow_symlinks=False)
        assert stat.S_ISREG(rb.st_mode) and ident(rb)==ident(rv) and rb.st_uid==os.getuid() and rb.st_nlink==1 and rb.st_size==0
        assert stat.S_IMODE(rb.st_mode)==0o600
        rg=inode_generation.observe_ext4_inode_generation_v1(ns.reserved_fd)
        receipt.update({"reserved_name":ns.reserved_name,"reserved_identity":ident(rb),"reserved_generation":rg["generation"],
                        "reserved_generation_identity":f"{ident(rb)}:{rg['generation']}","reserved_generation_ioctl_calls":1,
                        "reserved_fd":ns.reserved_fd,"reserved_empty_before_finalization":True})
    else:
        receipt.update({"reserved_name":None,"reserved_generation_ioctl_calls":0})
    print(json.dumps(receipt,sort_keys=True,separators=(",",":")),flush=True); return 0

if __name__=="__main__": raise SystemExit(main())
