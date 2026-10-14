#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile

MARKER="VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_BINARY_CANDIDATE_V1"
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/xiphos/apollyon_candidate_training_entrypoint_v1.c"
SOURCE_REL="ops/xiphos/apollyon_candidate_training_entrypoint_v1.c"
EXPECTED_SOURCE_GIT_BLOB_SHA1="73c6f623200b493dce3e1f138df1a1ade81e5350"
CC=Path("/usr/bin/cc")
MIN_BINARY_BYTES=4096
MAX_BINARY_BYTES=1024*1024
MAX_REPORT_BYTES=64*1024
HEX40=re.compile(r"^[0-9a-f]{40}$")
HEX64=re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID=re.compile(
    r"^apollyon_candidate_training_entrypoint_binary_candidate_v1:[0-9a-f]{64}$"
)
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
    "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1_SELF_TEST=GREEN\n"
    "fixed_qualification_window_seconds=300\n"
    "requires_nonroot_stable_identity=true\n"
    "requires_no_new_privileges=true\n"
    "requires_no_inherited_fds_ge_3=true\n"
    "durable_attempt_claim_required=true\n"
    "durable_attempt_claim_proven=false\n"
    "training_execution=false\n"
    "candidate_weight_mutation=false\n"
    "automatic_retry=false\n"
    "automatic_promotion=false\n"
    "deployment=false\n"
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


def exact_keys(value:dict,expected:tuple[str,...],label:str)->None:
    if not isinstance(value,dict) or set(value)!=set(expected):
        raise AssertionError(label+" schema invalid")


def bounded_file_bytes(path:Path,maximum:int,label:str)->bytes:
    metadata=path.lstat()
    if (
        not stat.S_ISREG(metadata.st_mode) or
        stat.S_ISLNK(metadata.st_mode) or
        metadata.st_nlink!=1 or
        metadata.st_size<1 or
        metadata.st_size>maximum
    ):
        raise AssertionError(label+" size/type invalid")
    data=path.read_bytes()
    if len(data)!=metadata.st_size:
        raise AssertionError(label+" read size drift")
    return data


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
    metadata=output.lstat()
    if (
        not stat.S_ISREG(metadata.st_mode) or
        stat.S_ISLNK(metadata.st_mode) or
        metadata.st_nlink!=1 or
        metadata.st_size<MIN_BINARY_BYTES or
        metadata.st_size>MAX_BINARY_BYTES
    ):
        raise AssertionError("compiled candidate ELF size/type outside bound")
    binary=output.read_bytes()
    if len(binary)!=metadata.st_size:
        raise AssertionError("compiled candidate ELF read size drift")
    if not binary.startswith(b"\x7fELF"):
        raise AssertionError("compiled candidate is not an ELF binary")
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
            "training entrypoint self-test failed: "+
            self_test.stderr.decode("utf-8","replace")[-1000:]
        )
    stdout=self_test.stdout.decode("utf-8","strict")
    if stdout!=EXPECTED_SELF_TEST:
        raise AssertionError("training entrypoint self-test transcript mismatch")
    if self_test.stderr:
        raise AssertionError("training entrypoint self-test emitted stderr")
    return binary


def candidate_material(report:dict)->dict:
    return {
        key:value
        for key,value in report.items()
        if key!="candidate_id"
    }


def derive()->dict:
    source_bytes=bounded_file_bytes(
        SOURCE,1024*1024,"training entrypoint source"
    )
    source_blob=git_blob_sha1(source_bytes)
    if source_blob!=EXPECTED_SOURCE_GIT_BLOB_SHA1:
        raise AssertionError("training entrypoint source Git blob mismatch")

    compiler=compiler_identity()
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-candidate-training-entrypoint-candidate-v1-"
    ) as td:
        root=Path(td)
        first=compile_one(root/"entrypoint-a")
        second=compile_one(root/"entrypoint-b")
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
            "installed_training_entrypoint_identity_proven":False,
            "live_systemd_enforcement_proven":False,
            "inherited_system_bus_descriptor_absence_proven":False,
            "durable_attempt_claim_proven":False,
            "candidate_weight_mutation":False,
            "training_execution":False,
            "attempt_claim":False,
            "service_action":False,
            "host_installation":False,
            "wallet_access":False,
            "transaction_signing":False,
            "funds_movement":False,
        },
        "next_gate":"apollyon_candidate_training_entrypoint_binary_candidate_lock_v1",
    }
    candidate_id="apollyon_candidate_training_entrypoint_binary_candidate_v1:"+sha256(
        canonical(material).encode("utf-8")
    )
    return {**material,"candidate_id":candidate_id}


def validate_report(report:dict)->None:
    exact_keys(
        report,
        (
            "authority","binary","candidate_id","compile_recipe","compiler",
            "marker","next_gate","self_test","source","status","version",
        ),
        "candidate report",
    )
    if (
        report["marker"]!=MARKER or
        type(report["version"]) is not int or
        report["version"]!=1
    ):
        raise AssertionError("candidate marker/version invalid")
    if report["status"]!="candidate_only_unaccepted":
        raise AssertionError("candidate status invalid")
    if report["next_gate"]!="apollyon_candidate_training_entrypoint_binary_candidate_lock_v1":
        raise AssertionError("candidate next gate invalid")

    exact_keys(
        report["source"],
        ("git_blob_sha1","path","sha256"),
        "candidate source",
    )
    current_source=bounded_file_bytes(
        SOURCE,1024*1024,"training entrypoint source"
    )
    if (
        report["source"]["path"]!=SOURCE_REL or
        report["source"]["git_blob_sha1"]!=EXPECTED_SOURCE_GIT_BLOB_SHA1 or
        report["source"]["git_blob_sha1"]!=git_blob_sha1(current_source) or
        not isinstance(report["source"]["sha256"],str) or
        HEX64.fullmatch(report["source"]["sha256"]) is None or
        report["source"]["sha256"]!=sha256(current_source)
    ):
        raise AssertionError("candidate source identity invalid")

    exact_keys(
        report["compiler"],
        ("dumpmachine","dumpversion","realpath","requested_path","version_line"),
        "candidate compiler",
    )
    if (
        report["compiler"]["requested_path"]!=os.fspath(CC) or
        not all(
            isinstance(report["compiler"][key],str) and report["compiler"][key]
            for key in ("dumpmachine","dumpversion","realpath","version_line")
        ) or
        not os.path.isabs(report["compiler"]["realpath"]) or
        report["compiler"]!=compiler_identity()
    ):
        raise AssertionError("candidate compiler identity invalid")

    exact_keys(
        report["compile_recipe"],
        ("argv_prefix","build_id_disabled","source_date_epoch"),
        "candidate compile recipe",
    )
    if (
        report["compile_recipe"]["argv_prefix"]!=[os.fspath(CC),*COMPILE_FLAGS] or
        report["compile_recipe"]["source_date_epoch"]!="0" or
        report["compile_recipe"]["build_id_disabled"] is not True
    ):
        raise AssertionError("candidate compile recipe invalid")

    exact_keys(
        report["binary"],
        ("bytes","elf_magic_verified","sha256","two_builds_byte_identical"),
        "candidate binary",
    )
    binary=report["binary"]
    if (
        not isinstance(binary["bytes"],int) or
        binary["bytes"]<MIN_BINARY_BYTES or
        binary["bytes"]>MAX_BINARY_BYTES or
        not isinstance(binary["sha256"],str) or
        HEX64.fullmatch(binary["sha256"]) is None or
        binary["elf_magic_verified"] is not True or
        binary["two_builds_byte_identical"] is not True
    ):
        raise AssertionError("candidate binary identity invalid")

    exact_keys(
        report["self_test"],
        ("exact_transcript_verified","stderr_empty","stdout_sha256"),
        "candidate self-test",
    )
    if (
        report["self_test"]["stdout_sha256"]!=sha256(
            EXPECTED_SELF_TEST.encode("utf-8")
        ) or
        report["self_test"]["exact_transcript_verified"] is not True or
        report["self_test"]["stderr_empty"] is not True
    ):
        raise AssertionError("candidate self-test identity invalid")

    exact_keys(
        report["authority"],
        (
            "attempt_claim","candidate_binary_identity_accepted",
            "candidate_report_filesystem_write","funds_movement",
            "host_installation","inherited_system_bus_descriptor_absence_proven",
            "installed_training_entrypoint_identity_proven",
            "live_systemd_enforcement_proven","durable_attempt_claim_proven",
            "candidate_weight_mutation","service_action",
            "source_only_candidate","training_execution","transaction_signing",
            "wallet_access",
        ),
        "candidate authority",
    )
    authority=report["authority"]
    if (
        authority["source_only_candidate"] is not True or
        authority["candidate_report_filesystem_write"] is not True
    ):
        raise AssertionError("candidate authority positive fields invalid")
    for key in (
        "candidate_binary_identity_accepted",
        "installed_training_entrypoint_identity_proven",
        "live_systemd_enforcement_proven",
        "inherited_system_bus_descriptor_absence_proven",
        "durable_attempt_claim_proven",
        "candidate_weight_mutation",
        "training_execution",
        "attempt_claim",
        "service_action",
        "host_installation",
        "wallet_access",
        "transaction_signing",
        "funds_movement",
    ):
        if authority[key] is not False:
            raise AssertionError("candidate authority overclaim: "+key)

    candidate_id=report["candidate_id"]
    if not isinstance(candidate_id,str) or CANDIDATE_ID.fullmatch(candidate_id) is None:
        raise AssertionError("candidate id invalid")
    expected_id="apollyon_candidate_training_entrypoint_binary_candidate_v1:"+sha256(
        canonical(candidate_material(report)).encode("utf-8")
    )
    if candidate_id!=expected_id:
        raise AssertionError("candidate id content binding invalid")


def derive_to(output:Path)->None:
    report=derive()
    validate_report(report)
    payload=(canonical(report)+"\n").encode("utf-8")
    if len(payload)>MAX_REPORT_BYTES:
        raise AssertionError("candidate report exceeds maximum size")
    output=Path(os.path.abspath(os.fspath(output)))
    if output.exists():
        raise AssertionError("candidate output already exists")
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open("xb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    if bounded_file_bytes(output,MAX_REPORT_BYTES,"candidate report")!=payload:
        raise AssertionError("candidate report readback mismatch")
    print(MARKER+"_DERIVE_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_sha256="+report["binary"]["sha256"])
    print("binary_max_bytes="+str(MAX_BINARY_BYTES))
    print("candidate_binary_identity_accepted=false")
    print("installed_training_entrypoint_identity_proven=false")
    print("training_execution=false")


def compare_dir(directory:Path)->None:
    root=Path(os.path.abspath(os.fspath(directory)))
    paths=sorted(root.rglob("candidate.json"))
    if len(paths)!=3:
        raise AssertionError(
            "expected exactly three candidate reports, got "+str(len(paths))
        )
    payloads=[
        bounded_file_bytes(path,MAX_REPORT_BYTES,"hosted candidate report")
        for path in paths
    ]
    if not all(payload==payloads[0] for payload in payloads[1:]):
        raise AssertionError("hosted candidate reports are not byte-identical")
    report=json.loads(payloads[0])
    validate_report(report)
    if canonical(report)+"\n"!=payloads[0].decode("utf-8"):
        raise AssertionError("candidate report is not canonical")
    print(MARKER+"_THREE_RUN_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_sha256="+report["binary"]["sha256"])
    print("binary_max_bytes="+str(MAX_BINARY_BYTES))
    print("three_run_report_bytes_identical=true")
    print("candidate_binary_identity_accepted=false")
    print("installed_training_entrypoint_identity_proven=false")
    print("training_execution=false")


def self_test()->None:
    valid=derive()
    validate_report(valid)

    for malformed_version in (True,1.0):
        bad=json.loads(canonical(valid))
        bad["version"]=malformed_version
        material=candidate_material(bad)
        bad["candidate_id"]="apollyon_candidate_training_entrypoint_binary_candidate_v1:"+sha256(
            canonical(material).encode("utf-8")
        )
        try:
            validate_report(bad)
        except AssertionError as exc:
            if "marker/version invalid" not in str(exc):
                raise
        else:
            raise AssertionError("non-integer candidate version unexpectedly admitted")

    tampered=json.loads(canonical(valid))
    tampered["candidate_id"]="apollyon_candidate_training_entrypoint_binary_candidate_v1:"+("0"*64)
    try:
        validate_report(tampered)
    except AssertionError as exc:
        if "content binding" not in str(exc):
            raise
    else:
        raise AssertionError("tampered candidate id unexpectedly admitted")

    extra=json.loads(canonical(valid))
    extra["candidate_binary_identity_accepted"]=True
    try:
        validate_report(extra)
    except AssertionError as exc:
        if "schema invalid" not in str(exc):
            raise
    else:
        raise AssertionError("extra top-level authority claim unexpectedly admitted")

    missing=json.loads(canonical(valid))
    del missing["compiler"]
    try:
        validate_report(missing)
    except AssertionError as exc:
        if "schema invalid" not in str(exc):
            raise
    else:
        raise AssertionError("missing compiler block unexpectedly admitted")

    oversized=json.loads(canonical(valid))
    oversized["binary"]["bytes"]=MAX_BINARY_BYTES+1
    material=candidate_material(oversized)
    oversized["candidate_id"]="apollyon_candidate_training_entrypoint_binary_candidate_v1:"+sha256(
        canonical(material).encode("utf-8")
    )
    try:
        validate_report(oversized)
    except AssertionError as exc:
        if "binary identity invalid" not in str(exc):
            raise
    else:
        raise AssertionError("oversized candidate report unexpectedly admitted")

    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-training-entrypoint-size-test-"
    ) as td:
        oversized_file=Path(td)/"oversized-elf"
        with oversized_file.open("wb") as handle:
            handle.truncate(MAX_BINARY_BYTES+1)
        try:
            bounded_file_bytes(
                oversized_file,MAX_BINARY_BYTES,"oversized candidate fixture"
            )
        except AssertionError as exc:
            if "size/type invalid" not in str(exc):
                raise
        else:
            raise AssertionError("oversized candidate file unexpectedly read")

    print(MARKER+"_SELF_TEST=GREEN")
    print("closed_report_schema=true")
    print("candidate_id_recomputed=true")
    print("explicit_integer_version_required=true")
    print("extra_authority_claim_rejected=true")
    print("missing_compiler_block_rejected=true")
    print("binary_max_bytes="+str(MAX_BINARY_BYTES))
    print("oversized_binary_rejected_before_read=true")
    print("report_max_bytes="+str(MAX_REPORT_BYTES))


def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--derive",type=Path)
    group.add_argument("--compare-dir",type=Path)
    group.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.derive is not None:
        derive_to(args.derive)
    elif args.compare_dir is not None:
        compare_dir(args.compare_dir)
    else:
        self_test()
    return 0


if __name__=="__main__":
    raise SystemExit(main())
