#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
MATERIALIZER=ROOT/"scripts/materialize_buy_void_epoch2_live_composition_native_v4.py"
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v4.json"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_native_candidate_v4.py"
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"

MATERIALIZER_BLOB="5ff70ae18840d8d4cb380960b6d141ffd6d19be4"
LOCK_BLOB="34340b5a8d13b7496bf5cafcf9d2937cb777d45c"
CANDIDATE_BLOB="9d0f3740d12e136e0a47d13451a83ae1c99b112a"
SOURCE_BLOB="2e75b8a6fa5ecc36ce2ca05d920001a16abcf5b7"
RUNNER_BLOB="baab733e43c030d24f8d4abd1644f3c4ae55c3b2"
RUNNER_BYTES=40616
RUNNER_SHA256="f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889"
LOCK_ID="voidbuye2nativecandlock4_3e6f7806914c54c55ee6658616a3a1590dc4ba29c60dc4cc764c60390d517418"
EXPECTED_BYTES=722880
EXPECTED_SHA256="09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4"
MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V4_MATERIALIZER_V1_PROOF"


def git_blob(raw:bytes)->str:
    h=hashlib.sha1()
    h.update(b"blob "+str(len(raw)).encode("ascii")+b"\0")
    h.update(raw)
    return h.hexdigest()


def direct(path:Path,maximum:int)->bytes:
    before=path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink==1 and 0<before.st_size<=maximum
    raw=path.read_bytes()
    after=path.lstat()
    for field in (
        "st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink",
        "st_size","st_mtime_ns","st_ctime_ns",
    ):
        assert getattr(before,field)==getattr(after,field),(path,field)
    assert len(raw)==before.st_size
    return raw


materializer_raw=direct(MATERIALIZER,256*1024)
lock_raw=direct(LOCK,128*1024)
candidate_raw=direct(CANDIDATE,256*1024)
source_raw=direct(SOURCE,1024*1024)
runner_raw=direct(RUNNER,4*1024*1024)

assert git_blob(materializer_raw)==MATERIALIZER_BLOB
assert git_blob(lock_raw)==LOCK_BLOB
assert git_blob(candidate_raw)==CANDIDATE_BLOB
assert git_blob(source_raw)==SOURCE_BLOB
assert git_blob(runner_raw)==RUNNER_BLOB
assert len(runner_raw)==RUNNER_BYTES
assert hashlib.sha256(runner_raw).hexdigest()==RUNNER_SHA256

lock=json.loads(lock_raw)
assert lock["lock_id"]==LOCK_ID
assert lock["candidate_accepted"] is True
assert lock["native_binary_identity_accepted"] is True
assert lock["protected_install_authorized"] is False
assert lock["live_execution_authorized"] is False
report=lock["candidate_report"]
assert report["candidate_script_git_blob_sha1"]==CANDIDATE_BLOB
assert report["native_source_git_blob_sha1"]==SOURCE_BLOB
assert report["native_binary_bytes"]==EXPECTED_BYTES
assert report["native_binary_sha256"]==EXPECTED_SHA256
assert report["runner_source_git_blob_sha1"]==RUNNER_BLOB
assert report["runner_bytes"]==RUNNER_BYTES
assert report["runner_sha256"]==RUNNER_SHA256
assert report["candidate_workflow_git_blob_sha1"]=="8552d69778f3b913862c423ee3afa6822a8e54e7"

source=materializer_raw.decode("utf-8")
for required in (
    'CANDIDATE_BLOB="9d0f3740d12e136e0a47d13451a83ae1c99b112a"',
    'SOURCE_BLOB="2e75b8a6fa5ecc36ce2ca05d920001a16abcf5b7"',
    'EXPECTED_BYTES=722880',
    'EXPECTED_SHA256="09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4"',
    'code=compile(',
    'exec(code,module.__dict__)',
    'compile_one=getattr(module,"compile_one",None)',
    'binary,elf,build=module.compile_one(target)',
    'write_create_only(args.derive,raw)',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fsync(fd)',
    'protected_install_authorized=false',
    'live_execution_authorized=false',
    'treasury_liquidity_action_authorized=false',
    'funds_movement=false',
):
    assert required in source,required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "payment_acceptance=true",
    "public_presale_activation=true",
    "wc_void_market_activation=true",
    "funds_movement=true",
    "INSTALL_ACCEPTED_EPOCH2",
):
    assert forbidden not in source,forbidden

python="/usr/bin/python3"
self_test=subprocess.run(
    [python,"-I","-B",str(MATERIALIZER),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert self_test.returncode==0,self_test.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V4_MATERIALIZER_V1_SELF_TEST_GREEN",
    "accepted_v4_lock_bound=true",
    "candidate_tool_verified_before_execution=true",
    "native_source_blob_bound=true",
    "create_only_output=true",
    "candidate_binary_identity_accepted=true",
    "protected_install_authorized=false",
    "live_execution_authorized=false",
    "treasury_liquidity_action_authorized=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(),line

with tempfile.TemporaryDirectory(
    prefix="void-e2-native-v4-materializer-proof-"
) as td:
    root=Path(td)
    first=root/"native-a"
    second=root/"native-b"

    outputs=[]
    for target in (first,second):
        cp=subprocess.run(
            [python,"-I","-B",str(MATERIALIZER),"--derive",str(target)],
            cwd=ROOT,stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
            check=False,timeout=120,
        )
        assert cp.returncode==0,cp.stderr
        for line in (
            "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V4_MATERIALIZER_V1_DERIVE_GREEN",
            "binary_bytes=722880",
            "binary_sha256="+EXPECTED_SHA256,
            "accepted_lock_id="+LOCK_ID,
            "candidate_binary_identity_accepted=true",
            "protected_install_authorized=false",
            "live_execution_authorized=false",
            "funds_movement=false",
        ):
            assert line in cp.stdout.splitlines(),line
        st=target.lstat()
        assert stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode)
        assert st.st_nlink==1
        assert stat.S_IMODE(st.st_mode)==0o555
        assert st.st_size==EXPECTED_BYTES
        raw=target.read_bytes()
        assert len(raw)==EXPECTED_BYTES
        assert hashlib.sha256(raw).hexdigest()==EXPECTED_SHA256
        outputs.append(raw)

    assert outputs[0]==outputs[1]

    readelf=subprocess.run(
        ["/usr/bin/readelf","-l",str(first)],
        cwd=ROOT,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
        check=False,timeout=20,
    )
    assert readelf.returncode==0,readelf.stderr
    assert " INTERP " not in readelf.stdout

    duplicate=subprocess.run(
        [python,"-I","-B",str(MATERIALIZER),"--derive",str(first)],
        cwd=ROOT,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
        check=False,timeout=30,
    )
    assert duplicate.returncode==2
    assert "reason=output_exists" in duplicate.stdout.splitlines()
    assert "protected_install_authorized=false" in duplicate.stdout.splitlines()

print(MARKER+"_GREEN")
print("materializer_blob_bound=true")
print("accepted_v4_lock_bound=true")
print("candidate_tool_blob_bound=true")
print("native_source_blob_bound=true")
print("runner_source_blob_bound=true")
print("runner_artifact_identity_bound=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=722880")
print("accepted_binary_sha256="+EXPECTED_SHA256)
print("static_no_pt_interp_verified=true")
print("create_only_output_replay_rejected=true")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("treasury_liquidity_action_authorized=false")
print("funds_movement=false")
