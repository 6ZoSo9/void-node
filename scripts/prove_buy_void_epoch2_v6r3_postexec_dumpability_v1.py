#!/usr/bin/env python3
"""Inert Linux fexecve dumpability lifetime proof for V6R3 first entry.

NEVER invokes installed VOID artifacts, keys, services, RPC, or a host plan.
It deliberately demonstrates that pre-exec PR_SET_DUMPABLE(0) does not bind
the dumpability of the next ordinary executable generation.
"""
from __future__ import annotations

import ctypes
import hashlib
import os
from pathlib import Path
import stat
import subprocess
import sys

MARKER="VOID_BUY_VOID_EPOCH2_V6R3_POSTEXEC_DUMPABILITY_V1"
ROOT=Path(__file__).resolve().parents[1]
NATIVE=ROOT/"ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c"
EXPECTED_NATIVE_BLOB="ae26706a117025893496901d4bde8cee87cadfba"
PR_GET_DUMPABLE=3
PR_SET_DUMPABLE=4
CHILD='import ctypes; lib=ctypes.CDLL(None); print("post_fexecve_dumpable="+str(lib.prctl(3,0,0,0,0)),flush=True)'
CLEAN_ENV={
    "PATH":"/usr/bin:/bin", "HOME":"/nonexistent",
    "LANG":"C", "LC_ALL":"C", "TZ":"UTC", "PYTHONNOUSERSITE":"1",
}


def git_blob(data:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(data)).encode("ascii")+b"\0"+data).hexdigest()


def libc():
    lib=ctypes.CDLL(None,use_errno=True)
    lib.prctl.argtypes=[
        ctypes.c_int,ctypes.c_ulong,ctypes.c_ulong,
        ctypes.c_ulong,ctypes.c_ulong,
    ]
    lib.prctl.restype=ctypes.c_int
    return lib


def preexec_fixture()->None:
    if os.execve not in os.supports_fd:
        raise RuntimeError("fexecve_by_fd_unavailable")
    python=Path(os.path.realpath(sys.executable))
    st=python.lstat()
    if (not python.is_absolute() or not stat.S_ISREG(st.st_mode)
            or st.st_mode & (stat.S_ISUID|stat.S_ISGID)):
        raise RuntimeError("ordinary_python_elf_fixture_required")
    flags=os.O_RDONLY|os.O_NOFOLLOW|os.O_CLOEXEC
    fd=os.open(python,flags)
    try:
        opened=os.fstat(fd)
        if (opened.st_dev!=st.st_dev or opened.st_ino!=st.st_ino
                or opened.st_size!=st.st_size):
            raise RuntimeError("fixture_python_fd_mismatch")
        lib=libc()
        if lib.prctl(PR_SET_DUMPABLE,0,0,0,0)!=0:
            raise RuntimeError("fixture_dumpability_set_failed")
        if lib.prctl(PR_GET_DUMPABLE,0,0,0,0)!=0:
            raise RuntimeError("fixture_preexec_dumpability_not_zero")
        print("pre_fexecve_dumpable=0",flush=True)
        # Linux os.execve(fd,...) uses fexecve: run precisely the retained-FD
        # executable transition and remove all editable env influences.
        os.execve(fd,[str(python),"-I","-B","-S","-c",CHILD],CLEAN_ENV)
    finally:
        os.close(fd)


def source_gate()->None:
    native=NATIVE.read_bytes()
    if git_blob(native)!=EXPECTED_NATIVE_BLOB:
        raise RuntimeError("native_source_generation_mismatch")
    source=native.decode("utf-8","strict")
    before=source.index("if(prctl(PR_SET_DUMPABLE,0,0,0,0)!=0)")
    after=source.index("fexecve(python_fd,child_argv,child_env);")
    if before>=after:
        raise RuntimeError("native_preexec_dumpable_sequence_not_bound")
    print("native_source_git_blob="+EXPECTED_NATIVE_BLOB)
    print("dumpability_set_before_fexecve_bound=true")


def self_test()->None:
    source_gate()
    result=subprocess.run(
        [sys.executable,"-I","-B","-S",str(Path(__file__).resolve()),"--preexec-fixture"],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        cwd="/",env=CLEAN_ENV,timeout=8,check=False,
        text=True,encoding="utf-8",errors="strict",
    )
    if result.returncode!=0 or result.stderr:
        raise RuntimeError("ordinary_python_fexecve_fixture_failed")
    if result.stdout.splitlines()!=[
        "pre_fexecve_dumpable=0", "post_fexecve_dumpable=1",
    ]:
        raise RuntimeError("unexpected_kernel_dumpability_semantics")
    print(MARKER+"_PROOF_GREEN")
    print("pre_fexecve_dumpable=0")
    print("post_fexecve_dumpable=1")
    print("native_preexec_zero_does_not_prove_child_zero=true")
    print("production_host_plan_executed=false")
    print("installed_binary_executed=false")
    print("runtime_dumpability_accepted=false")
    print("protected_install_authorized=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")


def main()->None:
    if len(sys.argv)!=2:
        raise SystemExit("mode_required")
    if sys.argv[1]=="--self-test":
        self_test()
    elif sys.argv[1]=="--source-plan":
        source_gate()
        print("mode=source-plan")
        print("host_read=false")
        print("host_write=false")
        print("host_plan_authorized=false")
        print("next_action=INDEPENDENTLY_REVIEW_POSTEXEC_DUMPABILITY_GATE")
    elif sys.argv[1]=="--preexec-fixture":
        preexec_fixture()
    else:
        raise SystemExit("unauthorized_mode")


if __name__=="__main__":
    main()
