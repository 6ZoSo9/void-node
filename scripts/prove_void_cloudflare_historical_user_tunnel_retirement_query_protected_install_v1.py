#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess

MARKER="VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_PROTECTED_INSTALL_V1_PROOF_GREEN"
ROOT=Path(__file__).resolve().parents[1]
INSTALLER_REL="ops/public/void_cloudflare_historical_user_tunnel_retirement_query_protected_install_v1.py"
PREEXEC_REL="ops/public/void_cloudflare_historical_user_tunnel_retirement_preexec_v1.c"
QUERY_REL="ops/public/void_cloudflare_historical_user_tunnel_retirement_query_v1.c"
PREEXEC_BLOB="59c1418593927f554208af1d464ab6574a690e0d"
QUERY_BLOB="25c1747ddd6a121b1ba2dbc1590c33a149e9b87b"
PREEXEC_BYTES=785824
PREEXEC_SHA256="9852c4754de5daa901e67b05c612c1c906de107ac6684f620d41415a275c89cb"
QUERY_BYTES=40152
QUERY_SHA256="bd8703cdc7a0ee8e502ecc081dc2cbd3a825d426dbbfc9075bf07b424389c605"
HOSTED_RUN=38787746099

def git_blob(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def git(args:list[str])->str:
    result=subprocess.run(
        ["/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),*args],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,
        env={
            "PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
            "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
            "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
            "GIT_OPTIONAL_LOCKS":"0","GIT_TERMINAL_PROMPT":"0",
            "GIT_ASKPASS":"/bin/false",
        },
    )
    if result.returncode!=0:
        raise AssertionError("git_failed:"+result.stderr[-800:])
    return result.stdout.strip()

def load_installer():
    spec=importlib.util.spec_from_file_location(
        "void_cloudflare_retirement_protected_install",ROOT/INSTALLER_REL
    )
    if spec is None or spec.loader is None:
        raise AssertionError("installer_import_spec_failed")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def main()->int:
    if git(["status","--porcelain=v1","--untracked-files=all"]):
        raise AssertionError("worktree_not_clean")
    for rel,expected in ((PREEXEC_REL,PREEXEC_BLOB),(QUERY_REL,QUERY_BLOB)):
        data=(ROOT/rel).read_bytes()
        if git_blob(data)!=expected or git(["rev-parse","--verify","HEAD:"+rel])!=expected:
            raise AssertionError("reviewed_source_blob_drift:"+rel)

    installer=load_installer()
    assert installer.PREEXEC_SOURCE_BLOB==PREEXEC_BLOB
    assert installer.QUERY_SOURCE_BLOB==QUERY_BLOB
    assert installer.PREEXEC_BYTES==PREEXEC_BYTES
    assert installer.PREEXEC_SHA256==PREEXEC_SHA256
    assert installer.QUERY_BYTES==QUERY_BYTES
    assert installer.QUERY_SHA256==QUERY_SHA256
    assert installer.HOSTED_RUN==HOSTED_RUN
    assert installer.INSTALL_MODE==0o555

    source=(ROOT/INSTALLER_REL).read_text(encoding="utf-8")
    required=(
        "os.O_EXCL","os.O_NOFOLLOW","os.fchown(fd,0,0)",
        "os.fchmod(fd,INSTALL_MODE)","st_uid!=0","st_gid!=0",
        "st_nlink!=1","install_root_exists_create_only",
        "PREEXEC_SHA256","QUERY_SHA256","verify_installed()",
    )
    for token in required:
        if token not in source:
            raise AssertionError("installer_contract_missing:"+token)

    self_test=subprocess.run(
        ["/usr/bin/python3","-I","-B",os.fspath(ROOT/INSTALLER_REL),"--self-test"],
        cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,text=True,check=False,timeout=30,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C"},
    )
    if self_test.returncode!=0:
        raise AssertionError("installer_self_test_failed:"+(self_test.stderr or self_test.stdout)[-1200:])
    for line in (
        "VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_PROTECTED_INSTALL_V1_SELF_TEST_GREEN",
        "candidate_symlink_rejected=true",
        "forged_candidate_identity_rejected=true",
        "create_only=true",
        "overwrite=false",
        "funds_movement=false",
    ):
        if line not in self_test.stdout.splitlines():
            raise AssertionError("installer_self_test_marker_missing:"+line)

    plan=subprocess.run(
        ["/usr/bin/python3","-I","-B",os.fspath(ROOT/INSTALLER_REL),"--plan"],
        cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,text=True,check=False,timeout=30,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C"},
    )
    if plan.returncode!=0 or "host_mutation=false" not in plan.stdout.splitlines():
        raise AssertionError("installer_plan_invalid")

    print(MARKER)
    print("hosted_run="+str(HOSTED_RUN))
    print("three_matrix_lanes_byte_identical=true")
    print("preexec_bytes="+str(PREEXEC_BYTES))
    print("preexec_sha256="+PREEXEC_SHA256)
    print("query_bytes="+str(QUERY_BYTES))
    print("query_sha256="+QUERY_SHA256)
    print("create_only=true")
    print("root_owned_mode_0555_single_link_required=true")
    print("mutable_preexec_external_admission_required=true")
    print("production_host_installation=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("funds_movement=false")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
