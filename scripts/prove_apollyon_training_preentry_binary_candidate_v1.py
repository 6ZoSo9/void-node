#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

MARKER="VOID_APOLLYON_TRAINING_PREENTRY_BINARY_CANDIDATE_V1"
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"
SOURCE_REL="ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"
EXPECTED_SOURCE_GIT_BLOB_SHA1="9503d19c8bc0b4f073ba117f6a547d339b7623d0"
CC=Path("/usr/bin/cc")
COMPILE_FLAGS=(
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-D_FORTIFY_SOURCE=2",
    "-fstack-protector-strong",
    "-Wl,-z,relro,-z,now",
    "-Wl,--build-id=none",
)
EXPECTED_SELF_TEST=(
    "VOID_APOLLYON_TRAINING_BUS_ISOLATION_PREENTRY_V1_SELF_TEST=GREEN\n"
    "close_range_unshare_required=true\n"
    "all_inherited_fds_ge_3_closed=true\n"
    "no_new_privileges_required=true\n"
    "target_root_custody_required=true\n"
    "setuid_setgid_rejected=true\n"
    "training_execution=false\n"
)
ENV={
    "PATH":"/usr/bin:/bin",
    "LC_ALL":"C",
    "TZ":"UTC",
    "SOURCE_DATE_EPOCH":"0",
}


def canonical(value)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)


def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def capture(argv:list[str],*,timeout:int=30)->str:
    result=subprocess.run(
        argv,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=timeout,
        env=ENV,
    )
    if result.returncode!=0:
        raise AssertionError(
            "command failed: "+repr(argv)+" stderr="+result.stderr[-1000:]
        )
    return result.stdout


def compiler_identity()->dict[str,str]:
    if not CC.exists():
        raise AssertionError("/usr/bin/cc missing")
    requested=Path(os.path.abspath(os.fspath(CC)))
    real=Path(os.path.realpath(requested))
    if not real.is_absolute() or not real.is_file():
        raise AssertionError("compiler realpath invalid")
    version_lines=capture([os.fspath(requested),"--version"]).splitlines()
    if not version_lines:
        raise AssertionError("compiler version missing")
    dumpmachine=capture([os.fspath(requested),"-dumpmachine"]).strip()
    dumpversion=capture(
        [os.fspath(requested),"-dumpfullversion","-dumpversion"]
    ).strip()
    if not dumpmachine or not dumpversion:
        raise AssertionError("compiler identity incomplete")
    return {
        "requested_path":os.fspath(requested),
        "realpath":os.fspath(real),
        "version_line":version_lines[0],
        "dumpmachine":dumpmachine,
        "dumpversion":dumpversion,
    }


def compile_one(output:Path)->bytes:
    command=[
        os.fspath(CC),
        *COMPILE_FLAGS,
        "-o",os.fspath(output),
        os.fspath(SOURCE),
    ]
    result=subprocess.run(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=ENV,
    )
    if result.returncode!=0:
        raise AssertionError(
            "compile failed: "+result.stderr.decode("utf-8","replace")[-2000:]
        )
    binary=output.read_bytes()
    if len(binary)<4096 or not binary.startswith(b"\x7fELF"):
        raise AssertionError("compiled candidate is not a bounded ELF binary")
    self_test=subprocess.run(
        [os.fspath(output),"--self-test"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=15,
        env=ENV,
    )
    if self_test.returncode!=0:
        raise AssertionError(
            "pre-entry self-test failed: "+
            self_test.stderr.decode("utf-8","replace")[-1000:]
        )
    stdout=self_test.stdout.decode("utf-8","strict")
    if stdout!=EXPECTED_SELF_TEST:
        raise AssertionError("pre-entry self-test transcript mismatch")
    if self_test.stderr:
        raise AssertionError("pre-entry self-test emitted stderr")
    return binary


def derive()->dict:
    source_bytes=SOURCE.read_bytes()
    source_blob=git_blob_sha1(source_bytes)
    if source_blob!=EXPECTED_SOURCE_GIT_BLOB_SHA1:
        raise AssertionError("pre-entry source Git blob mismatch")

    compiler=compiler_identity()
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-training-preentry-candidate-v1-"
    ) as td:
        root=Path(td)
        first=compile_one(root/"preentry-a")
        second=compile_one(root/"preentry-b")
    if first!=second:
        raise AssertionError("two local builds were not byte-identical")

    self_test_bytes=EXPECTED_SELF_TEST.encode("utf-8")
    material={
        "marker":MARKER,
        "version":1,
        "status":"candidate_only_unaccepted",
        "source":{
            "path":SOURCE_REL,
            "git_blob_sha1":source_blob,
            "sha256":sha256(source_bytes),
        },
        "compiler":compiler,
        "compile_recipe":{
            "argv_prefix":[os.fspath(CC),*COMPILE_FLAGS],
            "source_date_epoch":"0",
            "build_id_disabled":True,
        },
        "binary":{
            "bytes":len(first),
            "sha256":sha256(first),
            "elf_magic_verified":True,
            "two_builds_byte_identical":True,
        },
        "self_test":{
            "stdout_sha256":sha256(self_test_bytes),
            "exact_transcript_verified":True,
            "stderr_empty":True,
        },
        "authority":{
            "source_only_candidate":True,
            "candidate_report_filesystem_write":True,
            "candidate_binary_identity_accepted":False,
            "installed_preentry_binary_identity_proven":False,
            "live_systemd_enforcement_proven":False,
            "inherited_system_bus_descriptor_absence_proven":False,
            "training_execution":False,
            "attempt_claim":False,
            "service_action":False,
            "host_installation":False,
            "wallet_access":False,
            "transaction_signing":False,
            "funds_movement":False,
        },
        "next_gate":"apollyon_training_preentry_binary_candidate_lock_v1",
    }
    candidate_id="apollyon_training_preentry_binary_candidate_v1:"+sha256(
        canonical(material).encode("utf-8")
    )
    return {**material,"candidate_id":candidate_id}


def validate_report(report:dict)->None:
    if report.get("marker")!=MARKER or report.get("version")!=1:
        raise AssertionError("candidate marker/version invalid")
    if report.get("status")!="candidate_only_unaccepted":
        raise AssertionError("candidate status invalid")
    candidate_id=report.get("candidate_id")
    if (
        not isinstance(candidate_id,str) or
        not candidate_id.startswith(
            "apollyon_training_preentry_binary_candidate_v1:"
        ) or len(candidate_id.rsplit(":",1)[-1])!=64
    ):
        raise AssertionError("candidate id invalid")
    binary=report.get("binary")
    if not isinstance(binary,dict):
        raise AssertionError("candidate binary block missing")
    if (
        not isinstance(binary.get("bytes"),int) or binary["bytes"]<4096 or
        not isinstance(binary.get("sha256"),str) or len(binary["sha256"])!=64 or
        binary.get("two_builds_byte_identical") is not True
    ):
        raise AssertionError("candidate binary identity invalid")
    authority=report.get("authority")
    if not isinstance(authority,dict):
        raise AssertionError("candidate authority missing")
    for key in (
        "candidate_binary_identity_accepted",
        "installed_preentry_binary_identity_proven",
        "live_systemd_enforcement_proven",
        "inherited_system_bus_descriptor_absence_proven",
        "training_execution",
        "attempt_claim",
        "service_action",
        "host_installation",
        "wallet_access",
        "transaction_signing",
        "funds_movement",
    ):
        if authority.get(key) is not False:
            raise AssertionError("candidate authority overclaim: "+key)


def derive_to(output:Path)->None:
    report=derive()
    validate_report(report)
    payload=(canonical(report)+"\n").encode("utf-8")
    output=Path(os.path.abspath(os.fspath(output)))
    if output.exists():
        raise AssertionError("candidate output already exists")
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open("xb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    if output.read_bytes()!=payload:
        raise AssertionError("candidate report readback mismatch")
    print(MARKER+"_DERIVE_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_sha256="+report["binary"]["sha256"])
    print("candidate_binary_identity_accepted=false")
    print("installed_preentry_binary_identity_proven=false")
    print("training_execution=false")


def compare_dir(directory:Path)->None:
    root=Path(os.path.abspath(os.fspath(directory)))
    paths=sorted(root.rglob("candidate.json"))
    if len(paths)!=3:
        raise AssertionError(
            "expected exactly three candidate reports, got "+str(len(paths))
        )
    payloads=[path.read_bytes() for path in paths]
    if not all(payload==payloads[0] for payload in payloads[1:]):
        raise AssertionError("hosted candidate reports are not byte-identical")
    report=json.loads(payloads[0])
    validate_report(report)
    if canonical(report)+"\n"!=payloads[0].decode("utf-8"):
        raise AssertionError("candidate report is not canonical")
    print(MARKER+"_THREE_RUN_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_sha256="+report["binary"]["sha256"])
    print("three_run_report_bytes_identical=true")
    print("candidate_binary_identity_accepted=false")
    print("installed_preentry_binary_identity_proven=false")
    print("training_execution=false")


def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--derive",type=Path)
    group.add_argument("--compare-dir",type=Path)
    args=parser.parse_args()
    if args.derive is not None:
        derive_to(args.derive)
    else:
        compare_dir(args.compare_dir)
    return 0


if __name__=="__main__":
    raise SystemExit(main())
