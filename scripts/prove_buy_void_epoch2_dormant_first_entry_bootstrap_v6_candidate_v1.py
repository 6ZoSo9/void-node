#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CANDIDATE_V1"
ROOT = Path(__file__).resolve().parents[1]

SOURCE_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c"
SOURCE_BLOB = "560726bcae6ea0738502cb5e74b65f9116bd447d"
SOURCE_BYTES = 106792
SOURCE_SHA256 = "ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145"

MANIFEST_REL = "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MANIFEST_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"
MANIFEST_BYTES = 2382
MANIFEST_SHA256 = "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
SOURCE_GENERATION_ID = "voidbuye2dormantsourcegen3_" + MANIFEST_SHA256

MAX_BINARY_BYTES = 2 * 1024 * 1024
MIN_BINARY_BYTES = 100_000
HEX64 = re.compile(r"^[0-9a-f]{64}$")
CID = re.compile(r"^voidbuye2dormantbootstrapcand3_[0-9a-f]{64}$")

F_ADD_SEALS = getattr(fcntl, "F_ADD_SEALS", 1033)
F_GET_SEALS = getattr(fcntl, "F_GET_SEALS", 1034)
F_SEAL_SEAL = getattr(fcntl, "F_SEAL_SEAL", 0x0001)
F_SEAL_SHRINK = getattr(fcntl, "F_SEAL_SHRINK", 0x0002)
F_SEAL_GROW = getattr(fcntl, "F_SEAL_GROW", 0x0004)
F_SEAL_WRITE = getattr(fcntl, "F_SEAL_WRITE", 0x0008)
REQUIRED_SEALS = F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE

ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/tmp",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
}


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


def read_exact(path: Path, *, size: int, digest: str, blob: str) -> bytes:
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink != 1:
        raise AssertionError("source metadata invalid: " + str(path))
    if before.st_size != size:
        raise AssertionError("source size mismatch: " + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (opened.st_dev,opened.st_ino,opened.st_size,opened.st_mtime_ns,opened.st_ctime_ns) != (
            before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns
        ):
            raise AssertionError("source rebound: " + str(path))
        out=bytearray()
        while len(out)<size:
            chunk=os.read(fd,min(1024*1024,size-len(out)))
            if not chunk:
                raise AssertionError("source short read: "+str(path))
            out.extend(chunk)
        if os.read(fd,1):
            raise AssertionError("source grew: "+str(path))
        after=os.fstat(fd); visible=path.lstat()
        for field in ("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns"):
            if getattr(opened,field)!=getattr(after,field) or getattr(after,field)!=getattr(visible,field):
                raise AssertionError("source changed: "+str(path))
    finally:
        os.close(fd)
    raw=bytes(out)
    if sha256(raw)!=digest or git_blob(raw)!=blob:
        raise AssertionError("source identity mismatch: "+str(path))
    return raw


def create_sealed(raw: bytes) -> int:
    if not hasattr(os,"memfd_create"):
        raise AssertionError("memfd_create unavailable")
    fd=os.memfd_create("void-e2-bootstrap-v6-source", os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
    view=memoryview(raw); off=0
    while off<len(view):
        n=os.write(fd,view[off:])
        if n<=0: raise AssertionError("sealed source write failed")
        off+=n
    os.fsync(fd)
    fcntl.fcntl(fd,F_ADD_SEALS,REQUIRED_SEALS)
    actual=int(fcntl.fcntl(fd,F_GET_SEALS))
    if actual & REQUIRED_SEALS != REQUIRED_SEALS:
        raise AssertionError("source seals missing")
    try:
        os.pwrite(fd,b"X",0)
    except OSError as exc:
        if exc.errno not in (errno.EPERM,errno.EBUSY):
            raise
    else:
        raise AssertionError("sealed source remained writable")
    os.lseek(fd,0,os.SEEK_SET)
    if os.read(fd,len(raw)+1)!=raw:
        raise AssertionError("sealed source changed")
    os.lseek(fd,0,os.SEEK_SET)
    return fd


def tool_identity(path: str) -> dict:
    real=Path(path).resolve()
    st=real.stat()
    if not stat.S_ISREG(st.st_mode) or st.st_uid!=0 or st.st_mode & 0o022:
        raise AssertionError("tool custody invalid: "+str(real))
    raw=real.read_bytes()
    return {"path":str(real),"bytes":len(raw),"sha256":sha256(raw),"mode":stat.S_IMODE(st.st_mode),"uid":st.st_uid,"gid":st.st_gid}


def run(
    argv: list[str],
    *,
    pass_fds: tuple[int,...]=(),
    stdin_fd: int | None=None,
    timeout: int=60,
) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        argv,
        stdin=subprocess.DEVNULL if stdin_fd is None else stdin_fd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
        env=ENV,
        pass_fds=pass_fds,
    )


def compile_args(cc: str, output: Path) -> list[str]:
    return [
        cc,"-std=c11","-O2","-Wall","-Wextra","-Werror","-Wformat=2","-Wshadow",
        "-fstack-protector-strong","-D_FORTIFY_SOURCE=2","-static",
        "-Wl,-z,relro,-z,now,-z,noexecstack",
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_SHA256="' + MANIFEST_SHA256 + '"',
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MANIFEST_BYTES=" + str(MANIFEST_BYTES),
        "-x","c","-","-o",str(output),
    ]


def compile_from_sealed_stdin(cc: str, source_fd: int, output: Path) -> None:
    os.lseek(source_fd,0,os.SEEK_SET)
    cp=run(compile_args(cc,output),stdin_fd=source_fd)
    if cp.returncode or cp.stdout or cp.stderr:
        raise AssertionError("candidate compile failed")


def derive() -> tuple[dict,bytes]:
    source=read_exact(ROOT/SOURCE_REL,size=SOURCE_BYTES,digest=SOURCE_SHA256,blob=SOURCE_BLOB)
    manifest=read_exact(ROOT/MANIFEST_REL,size=MANIFEST_BYTES,digest=MANIFEST_SHA256,blob=MANIFEST_BLOB)
    if sha256(manifest)!=MANIFEST_SHA256:
        raise AssertionError("manifest generation mismatch")
    cc=shutil.which("gcc") or shutil.which("cc")
    readelf=shutil.which("readelf")
    if not cc or not readelf:
        raise AssertionError("required tool unavailable")
    tools_before={"compiler":tool_identity(cc),"readelf":tool_identity(readelf)}
    version=run([cc,"--version"])
    if version.returncode or version.stderr:
        raise AssertionError("compiler version failed")
    compiler_version=version.stdout.decode("utf-8","replace").splitlines()[0]
    dumpmachine=run([cc,"-dumpmachine"])
    dumpversion=run([cc,"-dumpfullversion","-dumpversion"])
    if dumpmachine.returncode or dumpversion.returncode or dumpmachine.stderr or dumpversion.stderr:
        raise AssertionError("compiler identity query failed")

    fd_a=create_sealed(source)
    fd_b=create_sealed(source)
    try:
        if fd_a == fd_b:
            raise AssertionError("distinct sealed source descriptors required")
        with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v6-candidate-") as td:
            td=Path(td)
            a=td/"bootstrap-a"; b=td/"bootstrap-b"
            compile_from_sealed_stdin(cc,fd_a,a)
            compile_from_sealed_stdin(cc,fd_b,b)
            ba=a.read_bytes(); bb=b.read_bytes()
            if ba!=bb:
                raise AssertionError("candidate builds differ across distinct source descriptors")
            if len(ba)<MIN_BINARY_BYTES or len(ba)>MAX_BINARY_BYTES or not ba.startswith(b"\x7fELF"):
                raise AssertionError("candidate ELF invalid")
            ph=run([readelf,"-lW",str(a)])
            dyn=run([readelf,"-dW",str(a)])
            if ph.returncode or dyn.returncode or ph.stderr or dyn.stderr:
                raise AssertionError("readelf failed")
            if re.search(rb"\bINTERP\b",ph.stdout) is not None or b"NEEDED" in dyn.stdout:
                raise AssertionError("candidate not static")
            st=run([str(a),"--self-test"])
            if st.returncode or st.stderr:
                raise AssertionError("candidate self-test failed")
            if b"VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V6_SELF_TEST_GREEN" not in st.stdout:
                raise AssertionError("candidate self-test marker missing")
            if MANIFEST_SHA256.encode() not in st.stdout or str(MANIFEST_BYTES).encode() not in st.stdout:
                raise AssertionError("candidate self-test manifest binding missing")
            binary=ba
            self_test_sha=sha256(st.stdout)
    finally:
        os.close(fd_b)
        os.close(fd_a)

    tools_after={"compiler":tool_identity(cc),"readelf":tool_identity(readelf)}
    if tools_after!=tools_before:
        raise AssertionError("toolchain changed during build")
    if read_exact(ROOT/SOURCE_REL,size=SOURCE_BYTES,digest=SOURCE_SHA256,blob=SOURCE_BLOB)!=source:
        raise AssertionError("source changed during build")
    if read_exact(ROOT/MANIFEST_REL,size=MANIFEST_BYTES,digest=MANIFEST_SHA256,blob=MANIFEST_BLOB)!=manifest:
        raise AssertionError("manifest changed during build")

    report={
        "marker":MARKER,
        "version":1,
        "source_generation_id":SOURCE_GENERATION_ID,
        "bootstrap_source":{"path":SOURCE_REL,"git_blob_sha1":SOURCE_BLOB,"bytes":SOURCE_BYTES,"sha256":SOURCE_SHA256},
        "manifest":{"path":MANIFEST_REL,"git_blob_sha1":MANIFEST_BLOB,"bytes":MANIFEST_BYTES,"sha256":MANIFEST_SHA256},
        "build_input":{
            "kind":"sealed_memfd",
            "required_seal_mask":REQUIRED_SEALS,
            "checkout_path_is_not_build_authority":True,
            "compiler_logical_source_name":"stdin",
            "distinct_source_fd_numbers_exercised":True,
            "descriptor_number_not_candidate_identity":True,
        },
        "toolchain":{
            **tools_before,
            "compiler_version_line":compiler_version,
            "compiler_dumpmachine":dumpmachine.stdout.decode("ascii").strip(),
            "compiler_dumpversion":dumpversion.stdout.decode("ascii").strip(),
            "revalidated_after_build":True,
        },
        "compile_contract":{
            "std":"c11","optimization":"O2","static":True,
            "manifest_sha256_macro":MANIFEST_SHA256,"manifest_bytes_macro":MANIFEST_BYTES,
            "fortify_source":2,"stack_protector_strong":True,
            "relro_now_noexecstack":True,
        },
        "binary":{
            "bytes":len(binary),"sha256":sha256(binary),"elf_magic_verified":True,
            "static_no_interp":True,
            "two_builds_byte_identical":True,
            "distinct_source_fd_builds_byte_identical":True,
        },
        "self_test":{"green":True,"stdout_sha256":self_test_sha,"stderr_empty":True},
        "authority":{
            "source_only_candidate":True,"candidate_report_filesystem_write":True,
            "candidate_accepted":False,"binary_identity_accepted":False,
            "protected_install_authorized":False,"live_execution_authorized":False,
            "credential_access":False,"private_key_access":False,"signing_authorized":False,
            "transaction":False,"payment_acceptance":False,"public_presale_activation":False,
            "wc_void_market_activation":False,"treasury_liquidity_action":False,
            "funds_movement":False,"production_host_evidence_authority":False,
        },
    }
    material=dict(report)
    report["candidate_id"]="voidbuye2dormantbootstrapcand3_"+sha256(canonical(material))
    validate(report)
    return report,binary


def validate(report: dict) -> None:
    if report.get("marker")!=MARKER or report.get("version")!=1:
        raise AssertionError("report marker/version invalid")
    cid=report.get("candidate_id","")
    if not isinstance(cid,str) or CID.fullmatch(cid) is None:
        raise AssertionError("candidate id invalid")
    material=dict(report); material.pop("candidate_id",None)
    if cid!="voidbuye2dormantbootstrapcand3_"+sha256(canonical(material)):
        raise AssertionError("candidate id binding invalid")
    if report["source_generation_id"]!=SOURCE_GENERATION_ID:
        raise AssertionError("source generation invalid")
    build_input=report.get("build_input",{})
    if (
        build_input.get("kind")!="sealed_memfd"
        or build_input.get("required_seal_mask")!=REQUIRED_SEALS
        or build_input.get("checkout_path_is_not_build_authority") is not True
        or build_input.get("compiler_logical_source_name")!="stdin"
        or build_input.get("distinct_source_fd_numbers_exercised") is not True
        or build_input.get("descriptor_number_not_candidate_identity") is not True
    ):
        raise AssertionError("build input identity claim invalid")
    binary=report.get("binary",{})
    if (
        binary.get("bytes",0)<MIN_BINARY_BYTES
        or not HEX64.fullmatch(str(binary.get("sha256","")))
        or binary.get("two_builds_byte_identical") is not True
        or binary.get("distinct_source_fd_builds_byte_identical") is not True
    ):
        raise AssertionError("binary identity invalid")
    for key,val in report["authority"].items():
        if key in ("source_only_candidate","candidate_report_filesystem_write"):
            if val is not True: raise AssertionError("candidate truth invalid:"+key)
        elif val is not False:
            raise AssertionError("authority overclaim:"+key)


def derive_dir(out: Path) -> None:
    out.mkdir(parents=True,exist_ok=False)
    report,binary=derive()
    (out/"candidate-v1.json").write_bytes(canonical(report)+b"\n")
    p=out/"bootstrap-v6"; p.write_bytes(binary); p.chmod(0o555)
    print(MARKER+"_DERIVE_GREEN")
    print("source_generation_id="+report["source_generation_id"])
    print("candidate_id="+report["candidate_id"])
    print("native_binary_sha256="+report["binary"]["sha256"])
    print("native_binary_bytes="+str(report["binary"]["bytes"]))
    print("sealed_source_snapshot=true")
    print("checkout_path_is_not_build_authority=true")
    print("compiler_logical_source_name=stdin")
    print("distinct_source_fd_numbers_exercised=true")
    print("distinct_source_fd_builds_byte_identical=true")
    print("descriptor_number_not_candidate_identity=true")
    print("toolchain_revalidated_after_build=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports=sorted(root.glob("**/candidate-v1.json"))
    bins=sorted(root.glob("**/bootstrap-v6"))
    if len(reports)!=3 or len(bins)!=3:
        raise AssertionError("exactly three hosted derivations required")
    rb=[p.read_bytes() for p in reports]; bb=[p.read_bytes() for p in bins]
    if not (rb[0]==rb[1]==rb[2]) or not (bb[0]==bb[1]==bb[2]):
        raise AssertionError("hosted candidate mismatch")
    hosted=json.loads(rb[0])
    validate(hosted)
    fresh_report,fresh_binary=derive()
    if canonical(fresh_report)+b"\n"!=rb[0] or fresh_binary!=bb[0]:
        raise AssertionError("independent rederivation mismatch")
    if sha256(bb[0])!=hosted["binary"]["sha256"] or len(bb[0])!=hosted["binary"]["bytes"]:
        raise AssertionError("binary receipt mismatch")
    print(MARKER+"_THREE_RUN_GREEN")
    print("three_report_bytes_identical=true")
    print("three_binary_bytes_identical=true")
    print("independent_rederivation_verified=true")
    print("checkout_path_is_not_build_authority=true")
    print("compiler_logical_source_name=stdin")
    print("distinct_source_fd_numbers_exercised=true")
    print("distinct_source_fd_builds_byte_identical=true")
    print("descriptor_number_not_candidate_identity=true")
    print("candidate_id="+hosted["candidate_id"])
    print("native_binary_sha256="+hosted["binary"]["sha256"])
    print("native_binary_bytes="+str(hosted["binary"]["bytes"]))
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("funds_movement=false")


def self_test() -> None:
    source=read_exact(ROOT/SOURCE_REL,size=SOURCE_BYTES,digest=SOURCE_SHA256,blob=SOURCE_BLOB)
    manifest=read_exact(ROOT/MANIFEST_REL,size=MANIFEST_BYTES,digest=MANIFEST_SHA256,blob=MANIFEST_BLOB)
    fd_a=create_sealed(source)
    fd_b=create_sealed(source)
    try:
        if fd_a == fd_b:
            raise AssertionError("distinct descriptor self-test failed")
        if fcntl.fcntl(fd_a,F_GET_SEALS)&REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("seal self-test failed")
        if fcntl.fcntl(fd_b,F_GET_SEALS)&REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("second seal self-test failed")
    finally:
        os.close(fd_b)
        os.close(fd_a)
    if sha256(manifest)!=MANIFEST_SHA256:
        raise AssertionError("manifest self-test failed")
    print(MARKER+"_SELF_TEST_GREEN")
    print("exact_source_generation_bound=true")
    print("sealed_source_snapshot_required=true")
    print("checkout_path_is_not_build_authority=true")
    print("compiler_logical_source_name=stdin")
    print("distinct_source_fd_numbers_required=true")
    print("descriptor_number_not_candidate_identity=true")
    print("three_hosted_derivations_required=true")
    print("independent_rederivation_required=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--derive-dir")
    g.add_argument("--compare-dir")
    args=ap.parse_args()
    if args.self_test:
        self_test()
    elif args.derive_dir:
        derive_dir(Path(args.derive_dir))
    else:
        compare_dir(Path(args.compare_dir))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
