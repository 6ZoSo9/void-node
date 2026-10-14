#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import types
import json
import os
from pathlib import Path
import re
import stat
import subprocess

MARKER="VOID_APOLLYON_TRAINING_PREENTRY_BINARY_CANDIDATE_LOCK_V1"
ROOT=Path(__file__).resolve().parents[1]
FIXTURE=ROOT/"fixtures/security/apollyon-training-preentry-binary-candidate-lock-v1.json"
VALIDATOR=ROOT/"scripts/prove_apollyon_training_preentry_binary_candidate_v1.py"
REVIEWED_CANDIDATE_HEAD="e4a43df1e0a174e57d865ef0b6c98c009294062b"
REVIEWED_VALIDATOR_GIT_BLOB_SHA1="89a3260dde63534b3c3e2d04d4054eba430aae4c"
EXPECTED_REPORT_SHA256="de5ce76d334ce498f56fad011a7d9ec8e465b4487b5b61bbc7114a776cecb211"
EXPECTED_CANDIDATE_ID=(
    "apollyon_training_preentry_binary_candidate_v1:"
    "128eb2363781cacbaf9603be185af613e444cef7a40b8894cd491aa6bf8f8a56"
)
EXPECTED_BINARY_SHA256="6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47"
EXPECTED_BINARY_BYTES=17352
EXPECTED_SOURCE_GIT_BLOB_SHA1="9503d19c8bc0b4f073ba117f6a547d339b7623d0"
EXPECTED_LOCK_ID=(
    "apollyon_training_preentry_binary_candidate_lock_v1:"
    "f13fb7c9737defa61e8f883426e5c53dafbc8d5ec70616b86b2b09fdb790c622"
)
MAX_FIXTURE_BYTES=128*1024
HEX40=re.compile(r"^[0-9a-f]{40}$")
HEX64=re.compile(r"^[0-9a-f]{64}$")


def canonical(value)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)


def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def exact_keys(value,expected:tuple[str,...],label:str)->None:
    if not isinstance(value,dict) or set(value)!=set(expected):
        raise AssertionError(label+" schema invalid")


def bounded_bytes(path:Path,maximum:int,label:str)->bytes:
    metadata=path.lstat()
    if (
        not stat.S_ISREG(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode) or
        metadata.st_nlink!=1 or metadata.st_size<2 or
        metadata.st_size>maximum
    ):
        raise AssertionError(label+" metadata invalid")
    data=path.read_bytes()
    if len(data)!=metadata.st_size:
        raise AssertionError(label+" read size drift")
    return data


def load_validator():
    source=bounded_bytes(VALIDATOR,256*1024,"candidate validator")
    if git_blob_sha1(source)!=REVIEWED_VALIDATOR_GIT_BLOB_SHA1:
        raise AssertionError("candidate validator Git blob mismatch")
    module=types.ModuleType("void_apollyon_candidate_validator_v1")
    module.__file__=os.fspath(VALIDATOR)
    code=compile(
        source,
        os.fspath(VALIDATOR),
        "exec",
        dont_inherit=True,
        optimize=0,
    )
    exec(code,module.__dict__)
    if not callable(getattr(module,"validate_report",None)):
        raise AssertionError("candidate validator export missing")
    return module


def require_reviewed_head_ancestry()->None:
    if HEX40.fullmatch(REVIEWED_CANDIDATE_HEAD) is None:
        raise AssertionError("reviewed candidate head malformed")
    result=subprocess.run(
        [
            "/usr/bin/git","merge-base","--is-ancestor",
            REVIEWED_CANDIDATE_HEAD,"HEAD",
        ],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        check=False,
        timeout=10,
        env={
            "PATH":"/usr/bin:/bin",
            "LC_ALL":"C",
            "GIT_CONFIG_NOSYSTEM":"1",
            "HOME":os.fspath(ROOT/".void-no-home"),
        },
    )
    if result.returncode!=0:
        raise AssertionError("reviewed candidate head not in ancestry")


def material_without_lock_id(value:dict)->dict:
    return {key:item for key,item in value.items() if key!="lock_id"}


def validate_lock(value:dict,validator)->None:
    exact_keys(
        value,
        (
            "authority","candidate","lock_id","marker","next_gate",
            "reviewed_candidate_head_sha",
            "reviewed_candidate_validator_git_blob_sha1",
            "status","version",
        ),
        "candidate lock",
    )
    if (
        value["marker"]!=MARKER or value["version"]!=1 or
        value["status"]!="candidate_binary_identity_locked_repository_evidence" or
        value["next_gate"]!="apollyon_training_preentry_installed_binary_custody_v1" or
        value["reviewed_candidate_head_sha"]!=REVIEWED_CANDIDATE_HEAD or
        value["reviewed_candidate_validator_git_blob_sha1"]!=
            REVIEWED_VALIDATOR_GIT_BLOB_SHA1
    ):
        raise AssertionError("candidate lock header invalid")

    exact_keys(
        value["candidate"],
        (
            "binary_bytes","binary_sha256","candidate_id","candidate_report",
            "candidate_report_sha256","source_git_blob_sha1",
        ),
        "locked candidate",
    )
    candidate=value["candidate"]
    validator.validate_report(candidate["candidate_report"])
    report_bytes=(
        canonical(candidate["candidate_report"])+"\n"
    ).encode("utf-8")
    if (
        sha256(report_bytes)!=EXPECTED_REPORT_SHA256 or
        candidate["candidate_report_sha256"]!=EXPECTED_REPORT_SHA256 or
        candidate["candidate_id"]!=EXPECTED_CANDIDATE_ID or
        candidate["candidate_report"]["candidate_id"]!=EXPECTED_CANDIDATE_ID or
        candidate["binary_sha256"]!=EXPECTED_BINARY_SHA256 or
        candidate["candidate_report"]["binary"]["sha256"]!=EXPECTED_BINARY_SHA256 or
        candidate["binary_bytes"]!=EXPECTED_BINARY_BYTES or
        candidate["candidate_report"]["binary"]["bytes"]!=EXPECTED_BINARY_BYTES or
        candidate["source_git_blob_sha1"]!=EXPECTED_SOURCE_GIT_BLOB_SHA1 or
        candidate["candidate_report"]["source"]["git_blob_sha1"]!=
            EXPECTED_SOURCE_GIT_BLOB_SHA1
    ):
        raise AssertionError("locked candidate cross-binding invalid")

    exact_keys(
        value["authority"],
        (
            "attempt_claim","candidate_binary_bytes_committed",
            "candidate_binary_identity_accepted","candidate_report_identity_accepted",
            "funds_movement","host_installation",
            "inherited_system_bus_descriptor_absence_proven",
            "installed_preentry_binary_identity_proven",
            "live_systemd_enforcement_proven","repository_evidence_only",
            "service_action","training_execution","transaction_signing",
            "wallet_access",
        ),
        "candidate lock authority",
    )
    authority=value["authority"]
    for key in (
        "candidate_binary_identity_accepted",
        "candidate_report_identity_accepted",
        "repository_evidence_only",
    ):
        if authority[key] is not True:
            raise AssertionError("candidate lock positive authority invalid: "+key)
    for key in (
        "candidate_binary_bytes_committed",
        "host_installation",
        "installed_preentry_binary_identity_proven",
        "live_systemd_enforcement_proven",
        "inherited_system_bus_descriptor_absence_proven",
        "training_execution",
        "attempt_claim",
        "service_action",
        "wallet_access",
        "transaction_signing",
        "funds_movement",
    ):
        if authority[key] is not False:
            raise AssertionError("candidate lock authority overclaim: "+key)

    lock_id=value["lock_id"]
    if not isinstance(lock_id,str) or not lock_id.startswith(
        "apollyon_training_preentry_binary_candidate_lock_v1:"
    ):
        raise AssertionError("candidate lock id malformed")
    suffix=lock_id.rsplit(":",1)[-1]
    if HEX64.fullmatch(suffix) is None:
        raise AssertionError("candidate lock id malformed")
    expected=(
        "apollyon_training_preentry_binary_candidate_lock_v1:"+
        sha256(canonical(material_without_lock_id(value)).encode("utf-8"))
    )
    if lock_id!=expected or lock_id!=EXPECTED_LOCK_ID:
        raise AssertionError("candidate lock id content binding invalid")


def self_test(value:dict,validator)->None:
    validate_lock(value,validator)

    bad=copy.deepcopy(value)
    bad["candidate"]["binary_sha256"]="0"*64
    try:
        validate_lock(bad,validator)
    except AssertionError as exc:
        if "cross-binding" not in str(exc):
            raise
    else:
        raise AssertionError("binary summary tamper unexpectedly admitted")

    bad=copy.deepcopy(value)
    bad["candidate"]["candidate_report_sha256"]="0"*64
    try:
        validate_lock(bad,validator)
    except AssertionError as exc:
        if "cross-binding" not in str(exc):
            raise
    else:
        raise AssertionError("candidate report digest tamper unexpectedly admitted")

    bad=copy.deepcopy(value)
    bad["authority"]["host_installation"]=True
    try:
        validate_lock(bad,validator)
    except AssertionError as exc:
        if "overclaim" not in str(exc):
            raise
    else:
        raise AssertionError("host installation overclaim unexpectedly admitted")

    bad=copy.deepcopy(value)
    bad["lock_id"]=(
        "apollyon_training_preentry_binary_candidate_lock_v1:"+("0"*64)
    )
    try:
        validate_lock(bad,validator)
    except AssertionError as exc:
        if "content binding" not in str(exc):
            raise
    else:
        raise AssertionError("lock id tamper unexpectedly admitted")

    bad=copy.deepcopy(value)
    bad["extra_claim"]=True
    try:
        validate_lock(bad,validator)
    except AssertionError as exc:
        if "schema invalid" not in str(exc):
            raise
    else:
        raise AssertionError("extra lock claim unexpectedly admitted")


def main()->int:
    require_reviewed_head_ancestry()
    validator=load_validator()
    fixture_bytes=bounded_bytes(FIXTURE,MAX_FIXTURE_BYTES,"candidate lock fixture")
    try:
        value=json.loads(fixture_bytes)
    except json.JSONDecodeError as exc:
        raise AssertionError("candidate lock fixture JSON invalid") from exc
    if canonical(value)+"\n"!=fixture_bytes.decode("utf-8"):
        raise AssertionError("candidate lock fixture is not canonical")
    self_test(value,validator)
    print(MARKER+"_PROOF_GREEN")
    print("validator_executed_from_verified_bytes=true")
    print("reviewed_candidate_head="+REVIEWED_CANDIDATE_HEAD)
    print("candidate_report_sha256="+EXPECTED_REPORT_SHA256)
    print("candidate_id="+EXPECTED_CANDIDATE_ID)
    print("binary_sha256="+EXPECTED_BINARY_SHA256)
    print("binary_bytes="+str(EXPECTED_BINARY_BYTES))
    print("lock_id="+EXPECTED_LOCK_ID)
    print("candidate_binary_identity_accepted=true")
    print("candidate_report_identity_accepted=true")
    print("repository_evidence_only=true")
    print("candidate_binary_bytes_committed=false")
    print("installed_preentry_binary_identity_proven=false")
    print("live_systemd_enforcement_proven=false")
    print("inherited_system_bus_descriptor_absence_proven=false")
    print("host_installation=false")
    print("attempt_claim=false")
    print("training_execution=false")
    print("funds_movement=false")
    return 0


if __name__=="__main__":
    raise SystemExit(main())
