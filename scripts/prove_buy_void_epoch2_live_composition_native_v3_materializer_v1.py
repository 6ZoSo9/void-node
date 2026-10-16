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
MATERIALIZER=ROOT/"scripts/materialize_buy_void_epoch2_live_composition_native_v3.py"
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_native_candidate_v3.py"
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c"

MATERIALIZER_BLOB="be564645b31bd49cf1ed08f663eff4bba53cdf99"
LOCK_BLOB="57f965a944031eac90d69b4104b0f8f2473e66cc"
CANDIDATE_BLOB="3b779a27cfd071c2569c438e3319b756b46c85c9"
SOURCE_BLOB="4aa091e7835b32aa5c4e7b8e4059651c69a64eb3"
LOCK_ID="voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659"
EXPECTED_BYTES=726976
EXPECTED_SHA256="78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V3_MATERIALIZER_V1_PROOF"


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

assert git_blob(materializer_raw)==MATERIALIZER_BLOB
assert git_blob(lock_raw)==LOCK_BLOB
assert git_blob(candidate_raw)==CANDIDATE_BLOB
assert git_blob(source_raw)==SOURCE_BLOB

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

source=materializer_raw.decode("utf-8")
for required in (
    'CANDIDATE_BLOB="3b779a27cfd071c2569c438e3319b756b46c85c9"',
    'SOURCE_BLOB="4aa091e7835b32aa5c4e7b8e4059651c69a64eb3"',
    'EXPECTED_BYTES=726976',
    'EXPECTED_SHA256="78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"',
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
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V3_MATERIALIZER_V1_SELF_TEST_GREEN",
    "accepted_v3_lock_bound=true",
    "candidate_tool_verified_before_execution=true",
    "native_source_blob_bound=true",
    "create_only_output=true",
    "candidate_binary_identity_accepted=true",
    "protected_install_authorized=false",
    "live_execution_authorized=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(),line

with tempfile.TemporaryDirectory(
    prefix="void-e2-native-v3-materializer-proof-"
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
            "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V3_MATERIALIZER_V1_DERIVE_GREEN",
            "binary_bytes=726976",
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
print("accepted_v3_lock_bound=true")
print("candidate_tool_blob_bound=true")
print("native_source_blob_bound=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=726976")
print("accepted_binary_sha256="+EXPECTED_SHA256)
print("static_no_pt_interp_verified=true")
print("create_only_output_replay_rejected=true")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("funds_movement=false")
